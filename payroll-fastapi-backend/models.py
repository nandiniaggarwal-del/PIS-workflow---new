from sqlalchemy import Column, String, Integer, DateTime, JSON, Text
from database import Base

class User(Base):
    __tablename__ = "users"
    
    email = Column(String(255), primary_key=True, index=True, unique=True)
    role = Column(String(50), nullable=False)



class WorkflowQueue(Base):
    __tablename__ = "workflow_queue"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empCode = Column(String(100), nullable=True, index=True)
    empName = Column(String(255), nullable=True)
    grade = Column(String(50), nullable=True)
    designation = Column(String(150), nullable=True)
    employeeHome = Column(String(255), nullable=True)
    type = Column(String(100), nullable=True)
    module = Column(String(100), nullable=True, index=True)
    amount = Column(String(100), nullable=True)
    overtimeHours = Column(String(100), nullable=True)
    holidayDate = Column(String(100), nullable=True)
    remarks = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, index=True)  # MAKER, HRBP, HOD, PAYROLL
    hrbpComments = Column(Text, nullable=True)
    hodComments = Column(Text, nullable=True)
    flaggedColumns = Column(JSON, nullable=True)  # Stores list of strings
    history = Column(JSON, nullable=True)         # Stores list of logs dict
    initiatorEmail = Column(String(255), nullable=True, index=True)
    initiatorEmpCode = Column(String(100), nullable=True)
    effectiveFrom = Column(String(100), nullable=True)
    effectiveTo = Column(String(100), nullable=True)
    paymentMonth = Column(String(50), nullable=True)      # e.g. "June 2026"
    closedAt = Column(String(100), nullable=True)          # ISO timestamp when payroll closed
    closedByEmail = Column(String(255), nullable=True)     # Who clicked the close button

class AuditHistory(Base):
    __tablename__ = "audit_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(255), nullable=False)
    user = Column(String(255), nullable=False)
    remarks = Column(Text, nullable=True)
    timestamp = Column(String(100), nullable=False)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    userEmail = Column(String(255), nullable=False, index=True)
    text = Column(String(500), nullable=False)
    timestamp = Column(String(100), nullable=False)
    isRead = Column(Integer, default=0, index=True) # 0 = unread, 1 = read

class WorkflowConfig(Base):
    __tablename__ = "workflow_config"
    
    key = Column(String(50), primary_key=True) # e.g. "active_config"
    config = Column(JSON, nullable=False)

