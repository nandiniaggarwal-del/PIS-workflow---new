from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import os
import json
import time
import secrets
import hmac
import hashlib
import base64
import anyio
from collections import defaultdict
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import models
from database import engine, get_db, SessionLocal
from services.email_service import send_email

# Load environment configurations
load_dotenv()

# Resolve absolute paths dynamically
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

# Bind models and create tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payroll Workflow Backend", version="1.0.0")

# Helper to get workflow config
def load_workflow_config():
    config_path = os.path.join(BASE_DATA_DIR, "workflow_config.json")
    if not os.path.exists(config_path):
        return {"users": [], "earning_heads": []}
    with open(config_path, "r") as f:
        return json.load(f)

# Helper to save workflow config
def save_workflow_config(config_data):
    config_path = os.path.join(BASE_DATA_DIR, "workflow_config.json")
    with open(config_path, "w") as f:
        json.dump(config_data, f, indent=2)

def get_user_allowed_modules(email: str, role: str, employee_id: str, config: dict) -> list:
    role_lower = role.lower().strip()
    email_lower = email.lower().strip()
    
    if role_lower in ("admin", "payroll"):
        return ["*"]
        
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email_lower), None)
    if config_user and "allowed_modules" in config_user:
        if config_user["allowed_modules"] == ["*"]:
            return ["*"]
        return config_user["allowed_modules"]
        
    allowed = []
    for head in config.get("earning_heads", []):
        head_name = head.get("name")
        if role_lower == "maker":
            initiators = head.get("initiators", [])
            if employee_id in initiators:
                allowed.append(head_name)
        elif role_lower == "hrbp":
            hrbp_list = head.get("hrbp", [])
            if isinstance(hrbp_list, list) and employee_id in hrbp_list:
                allowed.append(head_name)
        elif role_lower == "hod":
            if head.get("approver") == employee_id:
                allowed.append(head_name)
                continue
            for rule in head.get("routing_rules", []):
                if rule.get("approver") == employee_id:
                    allowed.append(head_name)
                    break
    return allowed


# Helper to create notification
def create_notification(db: Session, email: str, text: str):
    timestamp = datetime.now().strftime("%d/%m/%Y, %I:%M:%S %p")
    db_notif = models.Notification(
        userEmail=email.lower().strip(),
        text=text,
        timestamp=timestamp,
        isRead=0
    )
    db.add(db_notif)
    db.commit()

# Database Seeder
def seed_database(db: Session):
    config_path = os.path.join(BASE_DATA_DIR, "workflow_config.json")
    if not os.path.exists(config_path):
        print("workflow_config.json not found. Skipping DB seeding.")
        return
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
        config_users = config.get("users", [])
        
        # Sync database with config
        existing_users = {u.email.lower().strip(): u for u in db.query(models.User).all()}
        config_emails = set()
        
        for u in config_users:
            email = u["email"].strip().lower()
            role = u["role"].strip().lower()
            config_emails.add(email)
            if email in existing_users:
                existing_users[email].role = role
            else:
                db_user = models.User(email=email, role=role)
                db.add(db_user)
        
        # Delete any users in DB that are no longer in the config file
        for email, user_obj in existing_users.items():
            if email not in config_emails:
                db.delete(user_obj)
                
        db.commit()
        print("Database synchronized with workflow_config.json users successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

# 1. CORS & Security Config
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL, 
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://localhost:8080", 
        "http://localhost:8085",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8085"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# 2. File Database Paths
# Resolved dynamically at the top of the file


def get_timestamp_str():
    return datetime.now().strftime("%d/%m/%Y, %I:%M:%S %p")

# Static Payload Data
NOTIFICATIONS_PAYLOAD = [
    {"id": 1, "text": "Overtime sheet pending review", "time": "2 mins ago"},
    {"id": 2, "text": "Holiday payout awaiting approval", "time": "10 mins ago"},
    {"id": 3, "text": "Reviewer returned payroll sheet", "time": "20 mins ago"}
]

PAYROLL_PAYLOAD = [
    {"id": 1, "empCode": "EMP001", "empName": "Rahul Sharma", "type": "Overtime", "amount": "4500"},
    {"id": 2, "empCode": "EMP002", "empName": "Priya Verma", "type": "Holiday Payment", "amount": "3200"}
]

# 3. Security & JWT Engine
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-payroll-key-123456")

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def generate_token(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    
    body = {**payload, "exp": int(time.time() * 1000) + 24 * 60 * 60 * 1000}
    body_b64 = base64url_encode(json.dumps(body).encode('utf-8'))
    
    signature = hmac.new(
        JWT_SECRET.encode('utf-8'),
        f"{header_b64}.{body_b64}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{body_b64}.{signature_b64}"

def verify_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, body_b64, signature_b64 = parts
        
        expected_signature = hmac.new(
            JWT_SECRET.encode('utf-8'),
            f"{header_b64}.{body_b64}".encode('utf-8'),
            hashlib.sha256
        ).digest()
        expected_signature_b64 = base64url_encode(expected_signature)
        
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            return None
            
        payload = json.loads(base64url_decode(body_b64).decode('utf-8'))
        if payload.get("exp", 0) < int(time.time() * 1000):
            return None
            
        return payload
    except Exception:
        return None

# Dependency Injection for Authentication & RBAC
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required")
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

def require_roles(allowed_roles: list):
    async def role_checker(user: dict = Depends(get_current_user)):
        role = user.get("role", "").lower()
        if role not in [r.lower() for r in allowed_roles]:
            raise HTTPException(status_code=403, detail="Forbidden: Access denied")
        return user
    return role_checker

# 4. In-Memory Rate Limiting
rate_limit_store = defaultdict(list)

def enforce_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60):
    now = time.time()
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < window_seconds]
    if len(rate_limit_store[key]) >= max_requests:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    rate_limit_store[key].append(now)

# ================= AUTH ENDPOINTS =================

@app.post("/api/auth/sso-login")
async def sso_login(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    email = email.strip().lower()
    client_ip = request.client.host if request.client else "unknown_ip"
    enforce_rate_limit(f"{client_ip}:sso_login")
    
    # Query SQL database users schema (prevents SQLi automatically)
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Email not authorised")
        
    # Get user details from workflow config
    config = load_workflow_config()
    name = "User"
    employee_id = ""
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    if config_user:
        name = config_user.get("name", "User")
        employee_id = config_user.get("employee_id", "")
    
    allowed_modules = get_user_allowed_modules(email, user.role, employee_id, config)
        
    token = generate_token({"email": user.email, "role": user.role})
    
    return {
        "success": True,
        "email": user.email,
        "role": user.role,
        "name": name,
        "employee_id": employee_id,
        "allowed_modules": allowed_modules,
        "token": token
    }


# ================= CONFIG & ADMIN ENDPOINTS =================

@app.get("/api/workflow/config")
async def get_workflow_configuration(user: dict = Depends(get_current_user)):
    config = load_workflow_config()
    email = user["email"].lower().strip()
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    
    emp_id = config_user.get("employee_id", "") if config_user else ""
    allowed_modules = get_user_allowed_modules(email, user["role"], emp_id, config)
    
    current_user_details = {
        "email": email,
        "role": user["role"],
        "name": config_user.get("name", "User") if config_user else "User",
        "employee_id": emp_id,
        "allowed_modules": allowed_modules
    }
    
    return {
        "earning_heads": config.get("earning_heads", []),
        "currentUser": current_user_details
    }

@app.get("/api/admin/config")
async def get_admin_config(user: dict = Depends(require_roles(["admin"]))):
    return load_workflow_config()

@app.post("/api/admin/config")
async def post_admin_config(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["admin"]))):
    body = await request.json()
    save_workflow_config(body)
    seed_database(db)
    return {"message": "Configuration updated successfully", "config": body}


# ================= NOTIFICATIONS ENDPOINTS =================

@app.get("/api/notifications")
async def get_user_notifications(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    email = user["email"].lower().strip()
    notifs = db.query(models.Notification).filter(models.Notification.userEmail == email).order_by(models.Notification.id.desc()).limit(20).all()
    return [{"id": n.id, "text": n.text, "time": n.timestamp, "isRead": n.isRead} for n in notifs]

@app.post("/api/notifications/mark-read")
async def mark_notifications_read(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    email = user["email"].lower().strip()
    db.query(models.Notification).filter(models.Notification.userEmail == email).update({"isRead": 1})
    db.commit()
    return {"message": "Notifications marked as read"}


# ================= WORKFLOW ENDPOINTS =================

@app.get("/api/workflow/maker")
async def get_maker_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["maker"]))):
    email = user["email"].lower().strip()
    return db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "MAKER",
        models.WorkflowQueue.initiatorEmail == email
    ).all()

@app.post("/api/workflow/save-maker")
async def save_maker_data(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["maker"]))):
    body = await request.json()
    email = user["email"].lower().strip()
    
    # Resolve initiator employee code
    config = load_workflow_config()
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    emp_code = config_user.get("employee_id", "") if config_user else ""
    
    # Delete existing Maker items for this specific Maker user
    db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "MAKER",
        models.WorkflowQueue.initiatorEmail == email
    ).delete()
    
    # Store new rows into SQL Database
    for item in body:
        db_item = models.WorkflowQueue(
            empCode=item.get("empCode"),
            empName=item.get("empName"),
            grade=item.get("grade"),
            designation=item.get("designation"),
            employeeHome=item.get("employeeHome"),
            type=item.get("type"),
            module=item.get("module"),
            amount=str(item.get("amount", "")),
            overtimeHours=str(item.get("overtimeHours", "")),
            holidayDate=item.get("holidayDate"),
            remarks=item.get("remarks"),
            status="MAKER",
            history=item.get("history", []),
            initiatorEmail=email,
            initiatorEmpCode=emp_code
        )
        db.add(db_item)
    db.commit()
    return {"message": "Saved Successfully"}

@app.get("/api/workflow/submit-hrbp")
async def submit_to_hrbp(db: Session = Depends(get_db), user: dict = Depends(require_roles(["maker"]))):
    email = user["email"].lower().strip()
    
    # Get Maker user details
    config = load_workflow_config()
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    maker_name = config_user.get("name", "Maker User") if config_user else "Maker User"
    
    items = db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "MAKER",
        models.WorkflowQueue.initiatorEmail == email
    ).all()
    
    if not items:
         raise HTTPException(status_code=400, detail="Maker queue is empty")
         
    active_module = items[0].module or "Payroll"
    head_config = next((h for h in config.get("earning_heads", []) if h["name"] == active_module), None)
    
    # Check if HRBP is NA
    has_hrbp = True
    if head_config and head_config.get("hrbp") == "NA":
        has_hrbp = False
        
    timestamp = get_timestamp_str()
    next_status = "HRBP" if has_hrbp else "HOD"
    
    # If routed directly to HOD, resolve the approver ID
    approver_id = None
    if not has_hrbp:
        if head_config and "routing_rules" in head_config:
            maker_emp_code = items[0].initiatorEmpCode
            for rule in head_config["routing_rules"]:
                if maker_emp_code in rule.get("initiator_ids", []):
                    approver_id = rule.get("approver")
                    break
        if not approver_id and head_config:
            approver_id = head_config.get("approver")
            
    for item in items:
        item.status = next_status
        history = list(item.history) if item.history else []
        action_text = "Submitted by Maker" if has_hrbp else "Submitted by Maker (Bypassed HRBP)"
        history.append({
            "action": action_text,
            "user": maker_name,
            "timestamp": timestamp
        })
        item.history = history
        
    audit = models.AuditHistory(
        action=f"Submitted Sheet ({active_module})",
        user=maker_name,
        remarks=f"Pending review/approval in {next_status} stage",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    # Create notifications dynamically
    if has_hrbp:
        hrbp_ids = head_config.get("hrbp", []) if head_config else []
        hrbp_users = [u for u in config.get("users", []) if u["employee_id"] in hrbp_ids]
        for h in hrbp_users:
            create_notification(db, h["email"], f"New {active_module} sheet submitted by {maker_name} is pending review.")
        msg = "Sent to HRBP"
    else:
        # HOD notification
        hod_user = next((u for u in config.get("users", []) if u["employee_id"] == approver_id), None)
        if hod_user:
            create_notification(db, hod_user["email"], f"New {active_module} sheet submitted by {maker_name} is pending your approval.")
        msg = "Sent directly to Approver (HOD)"
        
    return {"message": msg}

@app.get("/api/workflow/hrbp")
async def get_hrbp_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hrbp_id = config_user.get("employee_id", "") if config_user else ""
    
    # Filter earning heads assigned to this HRBP
    assigned_modules = []
    for h in config.get("earning_heads", []):
        if isinstance(h.get("hrbp"), list) and hrbp_id in h["hrbp"]:
            assigned_modules.append(h["name"])
            
    return db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "HRBP",
        models.WorkflowQueue.module.in_(assigned_modules)
    ).all()

@app.post("/api/workflow/save-hrbp-review")
async def save_hrbp_review(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    body = await request.json()
    comments = body.get("comments", "")
    flagged = body.get("flaggedColumns", [])
    email = user["email"].lower().strip()
    
    config = load_workflow_config()
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hrbp_id = config_user.get("employee_id", "") if config_user else ""
    
    assigned_modules = []
    for h in config.get("earning_heads", []):
        if isinstance(h.get("hrbp"), list) and hrbp_id in h["hrbp"]:
            assigned_modules.append(h["name"])
            
    items = db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "HRBP",
        models.WorkflowQueue.module.in_(assigned_modules)
    ).all()
    
    for item in items:
        item.hrbpComments = comments
        item.flaggedColumns = flagged
    db.commit()
    
    return {"message": "Review Saved"}

@app.get("/api/workflow/submit-hod")
async def submit_to_hod(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hrbp_name = config_user.get("name", "HRBP User") if config_user else "HRBP User"
    hrbp_id = config_user.get("employee_id", "") if config_user else ""
    
    assigned_modules = []
    for h in config.get("earning_heads", []):
        if isinstance(h.get("hrbp"), list) and hrbp_id in h["hrbp"]:
            assigned_modules.append(h["name"])
            
    items = db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "HRBP",
        models.WorkflowQueue.module.in_(assigned_modules)
    ).all()
    
    if not items:
         raise HTTPException(status_code=400, detail="HRBP queue is empty")
         
    timestamp = get_timestamp_str()
    active_module = items[0].module or "Payroll"
    head_config = next((h for h in config.get("earning_heads", []) if h["name"] == active_module), None)
    
    # Resolve Approver ID
    approver_id = None
    if head_config:
        if "routing_rules" in head_config:
            maker_emp_code = items[0].initiatorEmpCode
            for rule in head_config["routing_rules"]:
                if maker_emp_code in rule.get("initiator_ids", []):
                    approver_id = rule.get("approver")
                    break
        if not approver_id:
            approver_id = head_config.get("approver")
            
    for item in items:
        item.status = "HOD"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Approved by HRBP",
            "user": hrbp_name,
            "timestamp": timestamp
        })
        item.history = history
        
    audit = models.AuditHistory(
        action=f"Approved Sheet ({active_module})",
        user=hrbp_name,
        remarks="Pending HOD approval",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    # Notification for HOD
    hod_user = next((u for u in config.get("users", []) if u["employee_id"] == approver_id), None)
    if hod_user:
        create_notification(db, hod_user["email"], f"A {active_module} sheet is pending your approval (approved by HRBP {hrbp_name}).")
        
    return {"message": "Sent to HOD"}

@app.get("/api/workflow/return-maker")
async def return_to_maker(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hrbp_name = config_user.get("name", "HRBP User") if config_user else "HRBP User"
    hrbp_id = config_user.get("employee_id", "") if config_user else ""
    
    assigned_modules = []
    for h in config.get("earning_heads", []):
        if isinstance(h.get("hrbp"), list) and hrbp_id in h["hrbp"]:
            assigned_modules.append(h["name"])
            
    items = db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "HRBP",
        models.WorkflowQueue.module.in_(assigned_modules)
    ).all()
    
    if not items:
         raise HTTPException(status_code=400, detail="HRBP queue is empty")
         
    timestamp = get_timestamp_str()
    comments = items[0].hrbpComments or "No comments"
    active_module = items[0].module or "Payroll"
    
    # Notify dynamic Maker of each item
    notified_makers = set()
    for item in items:
        item.status = "MAKER"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Rejected by HRBP",
            "user": hrbp_name,
            "remarks": comments,
            "timestamp": timestamp
        })
        item.history = history
        if item.initiatorEmail:
            notified_makers.add(item.initiatorEmail.lower().strip())
            
    audit = models.AuditHistory(
        action=f"Returned Sheet to Maker ({active_module})",
        user=hrbp_name,
        remarks=comments,
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    for m_email in notified_makers:
        create_notification(db, m_email, f"Your {active_module} sheet was returned by HRBP {hrbp_name}. Reason: {comments}")
        
    return {"message": "Returned to Maker"}

@app.get("/api/workflow/hod")
async def get_hod_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hod_id = config_user.get("employee_id", "") if config_user else ""
    
    # Load all HOD pending items
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    filtered_items = []
    
    # Resolve dynamic approver for each sheet
    for item in items:
        head_config = next((h for h in config.get("earning_heads", []) if h["name"] == item.module), None)
        approver_id = None
        if head_config:
            if "routing_rules" in head_config:
                maker_emp_code = item.initiatorEmpCode
                for rule in head_config["routing_rules"]:
                    if maker_emp_code in rule.get("initiator_ids", []):
                        approver_id = rule.get("approver")
                        break
            if not approver_id:
                approver_id = head_config.get("approver")
                
        if approver_id == hod_id:
            filtered_items.append(item)
            
    return filtered_items

@app.post("/api/workflow/save-hod-review")
async def save_hod_review(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    body = await request.json()
    comments = body.get("comments", "")
    email = user["email"].lower().strip()
    
    config = load_workflow_config()
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hod_id = config_user.get("employee_id", "") if config_user else ""
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    for item in items:
        head_config = next((h for h in config.get("earning_heads", []) if h["name"] == item.module), None)
        approver_id = None
        if head_config:
            if "routing_rules" in head_config:
                maker_emp_code = item.initiatorEmpCode
                for rule in head_config["routing_rules"]:
                    if maker_emp_code in rule.get("initiator_ids", []):
                        approver_id = rule.get("approver")
                        break
            if not approver_id:
                approver_id = head_config.get("approver")
                
        if approver_id == hod_id:
            item.hodComments = comments
            
    db.commit()
    return {"message": "HOD Review Saved"}

@app.get("/api/workflow/submit-payroll")
async def submit_to_payroll(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hod_name = config_user.get("name", "HOD User") if config_user else "HOD User"
    hod_id = config_user.get("employee_id", "") if config_user else ""
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    filtered_items = []
    
    for item in items:
        head_config = next((h for h in config.get("earning_heads", []) if h["name"] == item.module), None)
        approver_id = None
        if head_config:
            if "routing_rules" in head_config:
                maker_emp_code = item.initiatorEmpCode
                for rule in head_config["routing_rules"]:
                    if maker_emp_code in rule.get("initiator_ids", []):
                        approver_id = rule.get("approver")
                        break
            if not approver_id:
                approver_id = head_config.get("approver")
                
        if approver_id == hod_id:
            filtered_items.append(item)
            
    if not filtered_items:
         raise HTTPException(status_code=400, detail="HOD queue is empty")
         
    timestamp = get_timestamp_str()
    active_module = filtered_items[0].module or "Payroll"
    
    for item in filtered_items:
        item.status = "PAYROLL"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Approved by HOD",
            "user": hod_name,
            "timestamp": timestamp
        })
        item.history = history
        
    audit = models.AuditHistory(
        action=f"Approved & Sent to Payroll ({active_module})",
        user=hod_name,
        remarks="Ready for processing",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    # Notify Payroll users
    payroll_users = [u for u in config.get("users", []) if u["role"] == "payroll"]
    for p in payroll_users:
        create_notification(db, p["email"], f"A {active_module} sheet has been approved by HOD {hod_name} and is ready for export.")
        
    return {"message": "Sent to Payroll"}

@app.get("/api/workflow/return-hrbp")
async def return_to_hrbp(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hod_name = config_user.get("name", "HOD User") if config_user else "HOD User"
    hod_id = config_user.get("employee_id", "") if config_user else ""
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    filtered_items = []
    
    for item in items:
        head_config = next((h for h in config.get("earning_heads", []) if h["name"] == item.module), None)
        approver_id = None
        if head_config:
            if "routing_rules" in head_config:
                maker_emp_code = item.initiatorEmpCode
                for rule in head_config["routing_rules"]:
                    if maker_emp_code in rule.get("initiator_ids", []):
                        approver_id = rule.get("approver")
                        break
            if not approver_id:
                approver_id = head_config.get("approver")
                
        if approver_id == hod_id:
            filtered_items.append(item)
            
    if not filtered_items:
         raise HTTPException(status_code=400, detail="HOD queue is empty")
         
    timestamp = get_timestamp_str()
    comments = filtered_items[0].hodComments or "No comments"
    active_module = filtered_items[0].module or "Payroll"
    
    # Check if HRBP is NA for this module
    head_config = next((h for h in config.get("earning_heads", []) if h["name"] == active_module), None)
    has_hrbp = True
    if head_config and head_config.get("hrbp") == "NA":
        has_hrbp = False
        
    next_status = "HRBP" if has_hrbp else "MAKER"
    
    notified_emails = set()
    for item in filtered_items:
        item.status = next_status
        history = list(item.history) if item.history else []
        action_text = "Rejected by HOD" if has_hrbp else "Rejected by HOD (Returned directly to Maker)"
        history.append({
            "action": action_text,
            "user": hod_name,
            "remarks": comments,
            "timestamp": timestamp
        })
        item.history = history
        
        if has_hrbp:
            # HRBPs to notify
            hrbp_ids = head_config.get("hrbp", []) if head_config else []
            for h_user in [u for u in config.get("users", []) if u["employee_id"] in hrbp_ids]:
                notified_emails.add(h_user["email"])
        else:
            # Maker to notify
            if item.initiatorEmail:
                notified_emails.add(item.initiatorEmail)
                
    audit = models.AuditHistory(
        action=f"Returned Sheet to {next_status} ({active_module})",
        user=hod_name,
        remarks=comments,
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    for notify_email in notified_emails:
        create_notification(db, notify_email, f"A {active_module} sheet was returned by HOD {hod_name}. Reason: {comments}")
        
    return {"message": f"Returned to {next_status}"}

@app.get("/api/workflow/payroll")
async def get_payroll_workflow_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["payroll"]))):
    return db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "PAYROLL").all()

@app.get("/api/workflow/history")
async def get_workflow_history(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return db.query(models.AuditHistory).all()


# ================= USER ACCESS ENDPOINTS =================

@app.get("/api/users/me")
async def get_current_user_profile(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_profile = db.query(models.User).filter(models.User.email == user["email"].lower()).first()
    if not user_profile:
        raise HTTPException(status_code=401, detail="User account no longer exists.")
    return user_profile

@app.get("/api/users")
async def get_all_users(db: Session = Depends(get_db), user: dict = Depends(require_roles(["admin"]))):
    return db.query(models.User).all()

@app.post("/api/users")
async def create_or_update_user(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["admin"]))):
    body = await request.json()
    email = body.get("email").strip().lower()
    role = body.get("role").strip().lower()
    if not email or not role:
        raise HTTPException(status_code=400, detail="Email and role are required")
        
    # Write update to config file as well to keep in sync
    config = load_workflow_config()
    users = config.get("users", [])
    config_user = next((u for u in users if u["email"].strip().lower() == email), None)
    if config_user:
        config_user["role"] = role
    else:
        # Default placeholder fields for name/employee_id
        name = email.split("@")[0].replace(".", " ").title()
        employee_id = f"EMP{secrets.token_hex(3).upper()}"
        users.append({
            "email": email,
            "name": name,
            "employee_id": employee_id,
            "role": role
        })
    config["users"] = users
    save_workflow_config(config)
    
    # Sync with SQL Database
    seed_database(db)
    
    return {"message": "User saved successfully", "users": db.query(models.User).all()}

@app.delete("/api/users/{email}")
async def delete_user(email: str, db: Session = Depends(get_db), user: dict = Depends(require_roles(["admin"]))):
    email = email.strip().lower()
    
    # Remove from config file
    config = load_workflow_config()
    users = config.get("users", [])
    config["users"] = [u for u in users if u["email"].strip().lower() != email]
    save_workflow_config(config)
    
    # Sync database
    seed_database(db)
    
    return {"message": "User deleted successfully", "users": db.query(models.User).all()}


# ================= PAYROLL & OTHER ROUTES =================

@app.get("/api/payroll")
async def get_payroll_static(user: dict = Depends(get_current_user)):
    return PAYROLL_PAYLOAD

@app.post("/api/payroll/upload")
async def upload_payroll_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    # 1. Enforce file extensions (security requirement)
    filename = file.filename
    if not filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Only Excel/CSV files are allowed")
        
    # 2. Enforce file size limit (5MB max)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 5MB")
        
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    # Save the file securely to uploads folder
    safe_name = f"{int(time.time())}_{secrets.token_hex(4)}_{os.path.basename(filename)}"
    dest_path = os.path.join(UPLOADS_DIR, safe_name)
    
    with open(dest_path, "wb") as f:
        f.write(content)
        
    return {
        "message": "File uploaded successfully",
        "file": safe_name
    }

@app.get("/api/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    return NOTIFICATIONS_PAYLOAD
