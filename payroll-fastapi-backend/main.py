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

# Bind models and create tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payroll Workflow Backend", version="1.0.0")

# Database Seeder
def seed_database(db: Session):
    if db.query(models.User).count() == 0:
        initial_users = [
            models.User(email="nandini.aggarwal@1mg.com", role="maker"),
            models.User(email="mukul.vaibhav@1mg.com", role="hrbp"),
            models.User(email="hod@company.com", role="hod"),
            models.User(email="payroll@company.com", role="payroll"),
            models.User(email="amit.khatri@1mg.com", role="admin"),
            models.User(email="vipul.jain@1mg.com", role="hod")
        ]
        db.add_all(initial_users)
        db.commit()
        print("Database seeded with default users.")

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
BASE_DATA_DIR = "/Users/Hp/Payroll/PIS-workflow---new/payroll-fastapi-backend/data"
UPLOADS_DIR = "/Users/Hp/Payroll/PIS-workflow---new/payroll-fastapi-backend/uploads"


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
        
    token = generate_token({"email": user.email, "role": user.role})
    
    return {
        "success": True,
        "email": user.email,
        "role": user.role,
        "token": token
    }


# ================= WORKFLOW ENDPOINTS =================

@app.get("/api/workflow/maker")
async def get_maker_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["maker"]))):
    return db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "MAKER").all()

@app.post("/api/workflow/save-maker")
async def save_maker_data(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["maker"]))):
    body = await request.json()
    # Delete existing Maker items
    db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "MAKER").delete()
    
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
            history=item.get("history", [])
        )
        db.add(db_item)
    db.commit()
    return {"message": "Saved Successfully"}

@app.get("/api/workflow/submit-hrbp")
async def submit_to_hrbp(db: Session = Depends(get_db), user: dict = Depends(require_roles(["maker"]))):
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "MAKER").all()
    if not items:
         raise HTTPException(status_code=400, detail="Maker queue is empty")
         
    timestamp = get_timestamp_str()
    for item in items:
        item.status = "HRBP"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Submitted by Maker (Business SPOC)",
            "user": "Maker User",
            "timestamp": timestamp
        })
        item.history = history
        
    active_module = items[-1].module or "Payroll"
    audit = models.AuditHistory(
        action=f"Submitted Sheet ({active_module})",
        user="Maker User",
        remarks="Pending HRBP review",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    hrbp_user = next((u for u in db.query(models.User).all() if u.role == "hrbp"), None)
    if hrbp_user:
        await send_email(
            hrbp_user.email,
            "Payroll Sheet Awaiting Review",
            "A payroll sheet has been submitted by Business SPOC and is awaiting your review."
        )
    return {"message": "Sent to HRBP"}

@app.get("/api/workflow/hrbp")
async def get_hrbp_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    return db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()

@app.post("/api/workflow/save-hrbp-review")
async def save_hrbp_review(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    body = await request.json()
    comments = body.get("comments", "")
    flagged = body.get("flaggedColumns", [])
    
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()
    for item in items:
        item.hrbpComments = comments
        item.flaggedColumns = flagged
    db.commit()
    
    return {"message": "Review Saved"}

@app.get("/api/workflow/submit-hod")
async def submit_to_hod(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()
    if not items:
         raise HTTPException(status_code=400, detail="HRBP queue is empty")
         
    timestamp = get_timestamp_str()
    for item in items:
        item.status = "HOD"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Approved by HRBP",
            "user": "HRBP User",
            "timestamp": timestamp
        })
        item.history = history
        
    active_module = items[-1].module or "Payroll"
    audit = models.AuditHistory(
        action=f"Approved Sheet ({active_module})",
        user="HRBP User",
        remarks="Pending HOD approval",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    hod_user = next((u for u in db.query(models.User).all() if u.role == "hod"), None)
    if hod_user:
        await send_email(
            hod_user.email,
            "Payroll Sheet Awaiting Approval",
            "A payroll sheet is awaiting your approval."
        )
    return {"message": "Sent to HOD"}

@app.get("/api/workflow/return-maker")
async def return_to_maker(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hrbp"]))):
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HRBP").all()
    if not items:
         raise HTTPException(status_code=400, detail="HRBP queue is empty")
         
    timestamp = get_timestamp_str()
    comments = items[0].hrbpComments or "No comments"
    for item in items:
        item.status = "MAKER"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Rejected by HRBP",
            "user": "HRBP User",
            "remarks": comments,
            "timestamp": timestamp
        })
        item.history = history
        
    active_module = items[-1].module or "Payroll"
    audit = models.AuditHistory(
        action=f"Returned Sheet to Maker ({active_module})",
        user="HRBP User",
        remarks=comments,
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    maker_user = next((u for u in db.query(models.User).all() if u.role == "maker"), None)
    if maker_user:
        await send_email(
            maker_user.email,
            "Payroll Sheet Rejected",
            f"The payroll sheet has been returned by HRBP.\n\nComments:\n{comments}"
        )
    return {"message": "Returned to Maker"}

@app.get("/api/workflow/hod")
async def get_hod_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    return db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()

@app.post("/api/workflow/save-hod-review")
async def save_hod_review(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    body = await request.json()
    comments = body.get("comments", "")
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    for item in items:
        item.hodComments = comments
    db.commit()
    return {"message": "HOD Review Saved"}

@app.get("/api/workflow/submit-payroll")
async def submit_to_payroll(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    if not items:
         raise HTTPException(status_code=400, detail="HOD queue is empty")
         
    timestamp = get_timestamp_str()
    for item in items:
        item.status = "PAYROLL"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Approved by HOD",
            "user": "HOD User",
            "timestamp": timestamp
        })
        item.history = history
        
    active_module = items[-1].module or "Payroll"
    audit = models.AuditHistory(
        action=f"Approved & Sent to Payroll ({active_module})",
        user="HOD User",
        remarks="Ready for processing",
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    payroll_user = next((u for u in db.query(models.User).all() if u.role == "payroll"), None)
    if payroll_user:
        await send_email(
            payroll_user.email,
            "Payroll Sheet Ready",
            "A payroll sheet has been approved and is ready for payroll processing."
        )
    return {"message": "Sent to Payroll"}

@app.get("/api/workflow/return-hrbp")
async def return_to_hrbp(db: Session = Depends(get_db), user: dict = Depends(require_roles(["hod"]))):
    items = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "HOD").all()
    if not items:
         raise HTTPException(status_code=400, detail="HOD queue is empty")
         
    timestamp = get_timestamp_str()
    comments = items[0].hodComments or "No comments"
    for item in items:
        item.status = "HRBP"
        history = list(item.history) if item.history else []
        history.append({
            "action": "Rejected by HOD",
            "user": "HOD User",
            "remarks": comments,
            "timestamp": timestamp
        })
        item.history = history
        
    active_module = items[-1].module or "Payroll"
    audit = models.AuditHistory(
        action=f"Returned Sheet to HRBP ({active_module})",
        user="HOD User",
        remarks=comments,
        timestamp=timestamp
    )
    db.add(audit)
    db.commit()
    
    hrbp_user = next((u for u in db.query(models.User).all() if u.role == "hrbp"), None)
    if hrbp_user:
        await send_email(
            hrbp_user.email,
            "Payroll Sheet Returned",
            f"The payroll sheet has been returned by HOD.\n\nComments:\n{comments}"
        )
    return {"message": "Returned to HRBP"}

@app.get("/api/workflow/payroll")
async def get_payroll_workflow_data(db: Session = Depends(get_db), user: dict = Depends(require_roles(["payroll"]))):
    return db.query(models.WorkflowQueue).filter(models.WorkflowQueue.status == "PAYROLL").all()

@app.get("/api/workflow/history")
async def get_workflow_history(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return db.query(models.AuditHistory).all()

# ================= USER ENDPOINTS =================

@app.get("/api/users/me")
async def get_current_user_profile(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_profile = db.query(models.User).filter(models.User.email == user["email"].lower()).first()
    if not user_profile:
        # Patch local fallback security vulnerability
        raise HTTPException(status_code=401, detail="User account no longer exists.")
    return user_profile

@app.get("/api/users")
async def get_all_users(db: Session = Depends(get_db), user: dict = Depends(require_roles(["admin"]))):
    return db.query(models.User).all()

@app.post("/api/users")
async def create_or_update_user(request: Request, db: Session = Depends(get_db), user: dict = Depends(require_roles(["admin"]))):
    body = await request.json()
    email = body.get("email")
    role = body.get("role")
    if not email or not role:
        raise HTTPException(status_code=400, detail="Email and role are required")
        
    db_user = db.query(models.User).filter(models.User.email == email.strip().lower()).first()
    if db_user:
        db_user.role = role.strip().lower()
    else:
        db_user = models.User(email=email.strip().lower(), role=role.strip().lower())
        db.add(db_user)
        
    db.commit()
    return {"message": "User saved successfully", "users": db.query(models.User).all()}

@app.delete("/api/users/{email}")
async def delete_user(email: str, db: Session = Depends(get_db), user: dict = Depends(require_roles(["admin"]))):
    db_user = db.query(models.User).filter(models.User.email == email.strip().lower()).first()
    if db_user:
        db.delete(db_user)
        db.commit()
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
