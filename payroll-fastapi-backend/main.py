from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Request, Response
from fastapi.responses import JSONResponse
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
from sqlalchemy import text
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

app = FastAPI(title="Payroll Workflow Backend", version="1.0.0")

# Helper to get workflow config with DB persistence and fallback to file
def load_workflow_config(db: Session = None):
    config = None
    # Try reading from SQL database first
    close_db_manually = False
    if db is None:
        try:
            db = SessionLocal()
            close_db_manually = True
        except Exception:
            db = None
            
    if db is not None:
        try:
            db_config = db.query(models.WorkflowConfig).filter(models.WorkflowConfig.key == "active_config").first()
            if db_config:
                config = db_config.config
        except Exception as e:
            print(f"Warning: Database error loading config: {e}. Falling back to file.")
        finally:
            if close_db_manually:
                db.close()

    if config is None:
        # Fallback to local json file
        config_path = os.path.join(BASE_DATA_DIR, "workflow_config.json")
        if not os.path.exists(config_path):
            config = {"users": [], "earning_heads": []}
        else:
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
            except Exception as e:
                print(f"Error reading backup file: {e}")
                config = {"users": [], "earning_heads": []}

    # Merge dynamic users from routing matrix
    dynamic_users_path = os.path.join(BASE_DATA_DIR, "dynamic_users.json")
    if os.path.exists(dynamic_users_path):
        try:
            with open(dynamic_users_path, "r") as f:
                dynamic_users = json.load(f)
            existing_emails = {u["email"].lower().strip() for u in config.get("users", [])}
            for du in dynamic_users:
                if du["email"].lower().strip() not in existing_emails:
                    config.setdefault("users", []).append(du)
        except Exception as e:
            print(f"Warning: Failed to load dynamic_users: {e}")
            
    return config

# Helper to resolve row-level route based on routing matrix json or fallback config defaults
def resolve_route(module_name, initiator_email, employee_home, config):
    if not module_name:
        return "NA", None
    
    initiator_email = initiator_email.strip().lower()
    employee_home = employee_home.strip().lower() if employee_home else "all"
    
    # 1. Load routing matrix json
    matrix_path = os.path.join(BASE_DATA_DIR, "routing_matrix.json")
    if os.path.exists(matrix_path):
        try:
            with open(matrix_path, "r") as f:
                matrix = json.load(f)
            for rule in matrix:
                if rule.get("earning_head", "").strip().lower() != module_name.strip().lower():
                    continue
                
                # Check initiators (can be multiple)
                rule_initiators = [email.strip().lower() for email in rule.get("initiators", [])]
                if initiator_email not in rule_initiators:
                    continue
                
                # Check Employee Home
                rule_home = rule.get("employee_home", "").strip().lower()
                if rule_home != "all" and rule_home != "*" and employee_home != rule_home:
                    continue
                
                # We found a matching rule! Return the first HRBP and first Approver email
                hrbp_emails = rule.get("hrbps", [])
                approver_emails = rule.get("approvers", [])
                
                hrbp_email = hrbp_emails[0] if hrbp_emails else "NA"
                approver_email = approver_emails[0] if approver_emails else None
                return hrbp_email, approver_email
        except Exception as e:
            print(f"Warning: Error reading routing matrix: {e}")

    # 2. Fallback to default earning heads config
    head_config = next((h for h in config.get("earning_heads", []) if h["name"].strip().lower() == module_name.strip().lower()), None)
    if head_config:
        default_hrbp_id = head_config.get("hrbp")
        default_appr_id = head_config.get("approver")
        
        def get_email_by_empid(empid):
            if not empid or empid == "NA":
                return "NA"
            if isinstance(empid, list):
                empid = empid[0] if empid else "NA"
            user_obj = next((u for u in config.get("users", []) if u.get("employee_id") == empid), None)
            return user_obj["email"] if user_obj else None

        hrbp_email = get_email_by_empid(default_hrbp_id)
        approver_email = get_email_by_empid(default_appr_id)
        return hrbp_email, approver_email

    return "NA", None

# Helper to save workflow config to DB and local backup file
def save_workflow_config(config_data, db: Session = None):
    # Save local json backup first
    try:
        config_path = os.path.join(BASE_DATA_DIR, "workflow_config.json")
        with open(config_path, "w") as f:
            json.dump(config_data, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save config backup file: {e}")

    # Save to database for persistence
    close_db_manually = False
    if db is None:
        try:
            db = SessionLocal()
            close_db_manually = True
        except Exception:
            db = None
            
    if db is not None:
        try:
            db_config = db.query(models.WorkflowConfig).filter(models.WorkflowConfig.key == "active_config").first()
            if db_config:
                db_config.config = config_data
            else:
                db_config = models.WorkflowConfig(key="active_config", config=config_data)
                db.add(db_config)
            db.commit()
            print("Configuration saved to database and backup file successfully.")
        except Exception as e:
            db.rollback()
            print(f"Error saving config to database: {e}")
        finally:
            if close_db_manually:
                db.close()


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
    try:
        # 1. Check if config exists in DB
        db_config = db.query(models.WorkflowConfig).filter(models.WorkflowConfig.key == "active_config").first()
        config = None
        
        if db_config:
            config = db_config.config
            print("Database: Active configuration loaded from workflow_config table.")
        else:
            # First time setup: read from local file and migrate to DB
            config_path = os.path.join(BASE_DATA_DIR, "workflow_config.json")
            if os.path.exists(config_path):
                with open(config_path, "r") as f:
                    config = json.load(f)
                # Save to database
                db_config = models.WorkflowConfig(key="active_config", config=config)
                db.add(db_config)
                db.commit()
                print("Database: Dynamic config table initialized from workflow_config.json.")
            else:
                print("Warning: Neither active_config entry nor workflow_config.json exists.")
                return

        config_users = config.get("users", [])
        
        # Sync database users roster with configuration
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
        
        # Clean up database users that are no longer in config
        for email, user_obj in existing_users.items():
            if email not in config_emails:
                db.delete(user_obj)
                
        db.commit()
        print("Database: User roster successfully synchronized with configuration.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding/synchronizing database: {e}")

@app.on_event("startup")
def startup_event():
    # Attempt to generate database tables with exponential retry logic (helps with slower-starting PostgreSQL servers)
    max_retries = 5
    retry_interval = 3
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Database: Connection attempt {attempt} of {max_retries}...")
            models.Base.metadata.create_all(bind=engine)
            print("Database: Connection established and tables verified.")
            break
        except Exception as e:
            print(f"Database: Connection attempt {attempt} failed: {e}")
            if attempt == max_retries:
                print("CRITICAL: Failed to connect to database after all retries.")
            else:
                time.sleep(retry_interval)

    # Run database seed synchronization
    try:
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Error starting database seeder: {e}")


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

# 1.5. Global Exception Handler & Health check
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"UNHANDLED EXCEPTION: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. Please try again later."}
    )

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    health_status = {"status": "healthy", "database": "connected", "config": "loaded"}
    
    # 1. Check Database connection
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["database"] = f"error: {str(e)}"
        
    # 2. Check Config loading
    try:
        cfg = load_workflow_config(db)
        if not cfg or not cfg.get("earning_heads"):
            health_status["config"] = "warning: no earning heads configured"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["config"] = f"error: {str(e)}"
        
    status_code = 200 if health_status["status"] == "healthy" else 500
    return JSONResponse(status_code=status_code, content=health_status)

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
    timestamp = get_timestamp_str()
    
    sent_to_hrbp = False
    sent_to_hod = False
    
    for item in items:
        # Resolve route for each row dynamically
        hrbp_email, approver_email = resolve_route(item.module, email, item.employeeHome, config)
        has_hrbp = hrbp_email and hrbp_email != "NA"
        
        next_status = "HRBP" if has_hrbp else "HOD"
        item.status = next_status
        
        action_text = "Submitted by Maker" if has_hrbp else "Submitted by Maker (Bypassed HRBP)"
        history = list(item.history) if item.history else []
        history.append({
            "action": action_text,
            "user": maker_name,
            "timestamp": timestamp
        })
        item.history = history
        
        if has_hrbp:
            create_notification(db, hrbp_email, f"New {item.module} sheet submitted by {maker_name} is pending review.")
            sent_to_hrbp = True
        else:
            if approver_email:
                create_notification(db, approver_email, f"New {item.module} sheet submitted by {maker_name} is pending your approval.")
                sent_to_hod = True
                
    audit = models.AuditHistory(
        action=f"Submitted Sheet ({active_module})",
        user=maker_name,
        remarks="Pending review/approval",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    if sent_to_hrbp and sent_to_hod:
        msg = "Sent to HRBP & HOD (Row-level Split)"
    elif sent_to_hrbp:
        msg = "Sent to HRBP"
    else:
        msg = "Sent directly to Approver (HOD)"
        
    return {"message": msg}

@app.get("/api/workflow/hrbp")
async def get_hrbp_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()
    filtered_items = []
    for item in items:
        hrbp_email, _ = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if hrbp_email and hrbp_email.lower().strip() == email:
            filtered_items.append(item)
    return filtered_items

@app.post("/api/workflow/save-hrbp-review")
async def save_hrbp_review(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    body = await request.json()
    comments = body.get("comments", "")
    flagged = body.get("flaggedColumns", [])
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()
    for item in items:
        hrbp_email, _ = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if hrbp_email and hrbp_email.lower().strip() == email:
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
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()
    filtered_items = []
    for item in items:
        hrbp_email, _ = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if hrbp_email and hrbp_email.lower().strip() == email:
            filtered_items.append(item)
            
    if not filtered_items:
         raise HTTPException(status_code=400, detail="HRBP queue is empty")
         
    timestamp = get_timestamp_str()
    active_module = filtered_items[0].module or "Payroll"
    
    for item in filtered_items:
        item.status = "HOD"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Approved by HRBP",
            "user": hrbp_name,
            "timestamp": timestamp
        })
        item.history = history
        
        _, approver_email = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if approver_email:
            create_notification(db, approver_email, f"A {item.module} sheet is pending your approval (approved by HRBP {hrbp_name}).")
        
    audit = models.AuditHistory(
        action=f"Approved Sheet ({active_module})",
        user=hrbp_name,
        remarks="Pending HOD approval",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Sent to HOD"}

@app.get("/api/workflow/return-maker")
async def return_to_maker(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hrbp_name = config_user.get("name", "HRBP User") if config_user else "HRBP User"
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()
    filtered_items = []
    for item in items:
        hrbp_email, _ = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if hrbp_email and hrbp_email.lower().strip() == email:
            filtered_items.append(item)
            
    if not filtered_items:
         raise HTTPException(status_code=400, detail="HRBP queue is empty")
         
    timestamp = get_timestamp_str()
    comments = filtered_items[0].hrbpComments or "No comments"
    active_module = filtered_items[0].module or "Payroll"
    
    # Notify dynamic Maker of each item
    notified_makers = set()
    for item in filtered_items:
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
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    filtered_items = []
    for item in items:
        _, approver_email = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if approver_email and approver_email.lower().strip() == email:
            filtered_items.append(item)
    return filtered_items

@app.post("/api/workflow/save-hod-review")
async def save_hod_review(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    body = await request.json()
    comments = body.get("comments", "")
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    for item in items:
        _, approver_email = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if approver_email and approver_email.lower().strip() == email:
            item.hodComments = comments
    db.commit()
    return {"message": "HOD Review Saved"}

@app.get("/api/workflow/submit-payroll")
async def submit_to_payroll(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    email = user["email"].lower().strip()
    config = load_workflow_config()
    
    config_user = next((u for u in config.get("users", []) if u["email"].strip().lower() == email), None)
    hod_name = config_user.get("name", "HOD User") if config_user else "HOD User"
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    filtered_items = []
    for item in items:
        _, approver_email = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if approver_email and approver_email.lower().strip() == email:
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
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    filtered_items = []
    for item in items:
        _, approver_email = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        if approver_email and approver_email.lower().strip() == email:
            filtered_items.append(item)
            
    if not filtered_items:
         raise HTTPException(status_code=400, detail="HOD queue is empty")
         
    timestamp = get_timestamp_str()
    comments = filtered_items[0].hodComments or "No comments"
    active_module = filtered_items[0].module or "Payroll"
    
    notified_emails = set()
    for item in filtered_items:
        hrbp_email, _ = resolve_route(item.module, item.initiatorEmail, item.employeeHome, config)
        has_hrbp = hrbp_email and hrbp_email != "NA"
        
        next_status = "HRBP" if has_hrbp else "MAKER"
        item.status = next_status
        
        action_text = "Rejected by HOD" if has_hrbp else "Rejected by HOD (Returned directly to Maker)"
        history = list(item.history) if item.history else []
        history.append({
            "action": action_text,
            "user": hod_name,
            "remarks": comments,
            "timestamp": timestamp
        })
        item.history = history
        
        if has_hrbp:
            notified_emails.add(hrbp_email)
        else:
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
        create_notification(db, notify_email, f"A {active_module} item was returned by HOD {hod_name}. Reason: {comments}")
        
    return {"message": f"Returned to {next_status}"}

@app.get("/api/workflow/payroll")
async def get_payroll_workflow_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["payroll"]))):
    return db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "PAYROLL").all()

@app.post("/api/workflow/payroll/close")
async def close_payroll_sheets(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["payroll"]))):
    """Close/finalize sheets for a specific module. Moves them from PAYROLL → CLOSED status."""
    body = await request.json()
    module = body.get("module", "").strip().upper()
    row_ids = body.get("row_ids", [])  # Optional: close specific rows. If empty, close all for that module.
    
    if not module:
        raise HTTPException(status_code=400, detail="Module name is required")
    
    query = db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status == "PAYROLL",
        models.WorkflowQueue.module == module
    )
    
    if row_ids:
        query = query.filter(models.WorkflowQueue.id.in_(row_ids))
    
    rows = query.all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No pending payroll rows found for module: {module}")
    
    closed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    closed_count = 0
    
    for row in rows:
        row.status = "CLOSED"
        row.closedAt = closed_at
        row.closedByEmail = user["email"]
        closed_count += 1
        
        # Notify the original initiator
        if row.initiatorEmail:
            create_notification(
                db, row.initiatorEmail,
                f"Your {module} sheet for {row.empName or row.empCode or 'employee'} has been finalized by Payroll."
            )
    
    db.commit()
    return {"message": f"Closed {closed_count} rows for {module}", "closed_count": closed_count}

@app.get("/api/workflow/closed")
async def get_closed_workflow_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["payroll"]))):
    """Get all closed/processed sheets grouped by payment month."""
    rows = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "CLOSED").all()
    
    # Group by payment month
    months_dict = {}
    for row in rows:
        # Use paymentMonth field, or holidayDate, or fall back to closedAt month
        month_key = None
        month_label = None
        
        if row.paymentMonth:
            month_label = row.paymentMonth
            # Try to create a sortable key from the label
            try:
                parts = row.paymentMonth.strip().split()
                if len(parts) == 2:
                    month_name, year = parts
                    month_num = {
                        "january": "01", "february": "02", "march": "03", "april": "04",
                        "may": "05", "june": "06", "july": "07", "august": "08",
                        "september": "09", "october": "10", "november": "11", "december": "12"
                    }.get(month_name.lower(), "01")
                    month_key = f"{year}-{month_num}"
            except:
                pass
        
        if not month_key and row.closedAt:
            try:
                dt = datetime.strptime(row.closedAt, "%Y-%m-%d %H:%M:%S")
                month_key = dt.strftime("%Y-%m")
                month_label = dt.strftime("%B %Y")
            except:
                month_key = "unknown"
                month_label = "Unknown"
        
        if not month_key:
            month_key = "unknown"
            month_label = "Unknown"
            
        if month_key not in months_dict:
            months_dict[month_key] = {"month": month_label, "monthKey": month_key, "modules": {}}
        
        mod = row.module or "UNKNOWN"
        if mod not in months_dict[month_key]["modules"]:
            months_dict[month_key]["modules"][mod] = {
                "module": mod,
                "rowCount": 0,
                "closedAt": row.closedAt,
                "closedBy": row.closedByEmail,
                "rows": []
            }
        
        months_dict[month_key]["modules"][mod]["rowCount"] += 1
        months_dict[month_key]["modules"][mod]["rows"].append({
            "id": row.id,
            "empCode": row.empCode,
            "empName": row.empName,
            "amount": row.amount,
            "type": row.type,
            "grade": row.grade,
            "designation": row.designation,
            "employeeHome": row.employeeHome,
            "overtimeHours": row.overtimeHours,
            "remarks": row.remarks,
            "holidayDate": row.holidayDate,
            "effectiveFrom": row.effectiveFrom,
            "effectiveTo": row.effectiveTo,
            "paymentMonth": row.paymentMonth,
            "closedAt": row.closedAt,
            "closedBy": row.closedByEmail
        })
    
    # Convert to sorted list
    result = []
    for key in sorted(months_dict.keys(), reverse=True):
        entry = months_dict[key]
        entry["modules"] = list(entry["modules"].values())
        result.append(entry)
    
    return {"months": result}

@app.get("/api/workflow/in-process")
async def get_in_process_workflow_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["payroll"]))):
    """Get all in-process sheets with progress tracking, grouped by module."""
    rows = db.query(models.WorkflowQueue).filter(
        models.WorkflowQueue.status.in_(["MAKER", "HRBP", "HOD", "PAYROLL"])
    ).all()
    
    # Progress mapping
    progress_map = {"MAKER": 10, "HRBP": 35, "HOD": 60, "PAYROLL": 85}
    stage_labels = {"MAKER": "With Maker", "HRBP": "With HRBP", "HOD": "With Approver (HOD)", "PAYROLL": "At Payroll"}
    
    # Group by module
    modules_dict = {}
    for row in rows:
        mod = row.module or "UNKNOWN"
        if mod not in modules_dict:
            modules_dict[mod] = {
                "module": mod,
                "totalRows": 0,
                "stages": {"MAKER": 0, "HRBP": 0, "HOD": 0, "PAYROLL": 0},
                "rows": []
            }
        
        modules_dict[mod]["totalRows"] += 1
        status = row.status or "MAKER"
        if status in modules_dict[mod]["stages"]:
            modules_dict[mod]["stages"][status] += 1
        
        modules_dict[mod]["rows"].append({
            "id": row.id,
            "empCode": row.empCode,
            "empName": row.empName,
            "status": row.status,
            "initiatorEmail": row.initiatorEmail,
            "module": mod
        })
    
    # Calculate aggregate progress per module
    result = []
    for mod_name, data in modules_dict.items():
        total = data["totalRows"]
        if total > 0:
            weighted_progress = sum(
                progress_map.get(stage, 0) * count 
                for stage, count in data["stages"].items()
            ) / total
        else:
            weighted_progress = 0
        
        # Find the dominant stage (where most rows are)
        dominant_stage = max(data["stages"], key=data["stages"].get) if any(data["stages"].values()) else "MAKER"
        
        result.append({
            "module": mod_name,
            "totalRows": total,
            "progress": round(weighted_progress),
            "currentStage": stage_labels.get(dominant_stage, dominant_stage),
            "stages": data["stages"],
            "rows": data["rows"]
        })
    
    # Sort by progress ascending (least progress first)
    result.sort(key=lambda x: x["progress"])
    
    return {"modules": result}

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
