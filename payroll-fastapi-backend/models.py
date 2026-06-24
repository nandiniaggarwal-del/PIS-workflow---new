from sqlalchemy import Column, String, Integer, DateTime, JSON, Text
from database import Base

class User(Base):
    __tablename__ = "users"
    
    email = Column(String(255), primary_key=True, index=True, unique=True)
    role = Column(String(50), nullable=False)



class WorkflowQueue(Base):
    __tablename__ = "workflow_queue"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    empCode = Column(String(100), nullable=True)
    empName = Column(String(255), nullable=True)
    grade = Column(String(50), nullable=True)
    designation = Column(String(150), nullable=True)
    employeeHome = Column(String(255), nullable=True)
    type = Column(String(100), nullable=True)
    module = Column(String(100), nullable=True)
    amount = Column(String(100), nullable=True)
    overtimeHours = Column(String(100), nullable=True)
    holidayDate = Column(String(100), nullable=True)
    remarks = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False)  # MAKER, HRBP, HOD, PAYROLL
    hrbpComments = Column(Text, nullable=True)
    hodComments = Column(Text, nullable=True)
    flaggedColumns = Column(JSON, nullable=True)  # Stores list of strings
    history = Column(JSON, nullable=True)         # Stores list of logs dict

class AuditHistory(Base):
    __tablename__ = "audit_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(255), nullable=False)
    user = Column(String(255), nullable=False)
    remarks = Column(Text, nullable=True)
    timestamp = Column(String(100), nullable=False)
