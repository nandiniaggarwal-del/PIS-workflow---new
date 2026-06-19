import sys
import os
from datetime import datetime, timedelta

# Adjust path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
import models

def test_database():
    print("=== STARTING DATABASE PARITY & SCHEMA VERIFICATION ===")
    
    # 1. Print connection details
    db_url = str(engine.url)
    # Mask password for security if present
    if ":" in db_url and "@" in db_url:
        try:
            parts = db_url.split("@")
            prefix = parts[0].split(":")
            # Reconstruct with password masked
            masked_url = f"{prefix[0]}:{prefix[1]}:****@{parts[1]}"
            print(f"Connecting to: {masked_url}")
        except Exception:
            print("Connecting to: [Configured Database URL]")
    else:
        print(f"Connecting to: {db_url}")

    # 2. Check table creation
    print("\n1. Verifying and creating tables if not exist...")
    try:
        models.Base.metadata.create_all(bind=engine)
        print("✅ Tables initialized/verified successfully.")
    except Exception as e:
        print(f"❌ Failed to initialize tables: {e}")
        return False

    db = SessionLocal()
    try:
        # 3. Test CRUD on User table
        print("\n2. Testing User table CRUD operations...")
        test_email = "temp.test.user@company.com"
        # Cleanup if exists
        db.query(models.User).filter(models.User.email == test_email).delete()
        db.commit()
        
        # Create
        new_user = models.User(email=test_email, role="maker")
        db.add(new_user)
        db.commit()
        print("   - Inserted test user.")
        
        # Read & Update
        user = db.query(models.User).filter(models.User.email == test_email).first()
        if not user or user.role != "maker":
            raise Exception("User insertion integrity check failed")
        
        user.role = "admin"
        db.commit()
        print("   - Updated test user role.")
        
        # Verify update
        user = db.query(models.User).filter(models.User.email == test_email).first()
        if not user or user.role != "admin":
            raise Exception("User update integrity check failed")
            
        # Delete
        db.delete(user)
        db.commit()
        print("   - Deleted test user.")
        print("✅ User table verified successfully.")

        # 4. Test CRUD on OTPStore table
        print("\n3. Testing OTPStore table CRUD operations...")
        test_otp_email = "temp.otp.user@company.com"
        db.query(models.OTPStore).filter(models.OTPStore.email == test_otp_email).delete()
        db.commit()
        
        # Create
        new_otp = models.OTPStore(
            email=test_otp_email, 
            hashed_otp="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        db.add(new_otp)
        db.commit()
        print("   - Inserted OTP record.")
        
        # Read
        otp_rec = db.query(models.OTPStore).filter(models.OTPStore.email == test_otp_email).first()
        if not otp_rec or otp_rec.hashed_otp != "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855":
            raise Exception("OTP store read integrity check failed")
            
        # Delete
        db.delete(otp_rec)
        db.commit()
        print("   - Deleted OTP record.")
        print("✅ OTPStore table verified successfully.")

        # 5. Test CRUD on WorkflowQueue table
        print("\n4. Testing WorkflowQueue table CRUD operations...")
        # Create
        new_queue_item = models.WorkflowQueue(
            empCode="TEST_EMP",
            empName="Test Employee",
            grade="M1",
            designation="Software Engineer",
            employeeHome="Remote",
            type="Overtime",
            module="Overtime",
            amount="5000",
            overtimeHours="8",
            remarks="Test Remarks",
            status="MAKER",
            flaggedColumns=["amount"],
            history=[{"action": "Created", "user": "Test Maker", "timestamp": "now"}]
        )
        db.add(new_queue_item)
        db.commit()
        item_id = new_queue_item.id
        print(f"   - Inserted workflow queue item (ID: {item_id}).")
        
        # Read & Verify JSON fields
        item = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.id == item_id).first()
        if not item or item.empCode != "TEST_EMP":
            raise Exception("Workflow queue read integrity check failed")
            
        # Test updating JSON history and flagged columns
        item.flaggedColumns = ["amount", "overtimeHours"]
        item.status = "HRBP"
        db.commit()
        print("   - Updated JSON flagged columns and status.")
        
        # Verify JSON update
        item = db.query(models.WorkflowQueue).filter(models.WorkflowQueue.id == item_id).first()
        if not item or "overtimeHours" not in item.flaggedColumns or item.status != "HRBP":
            raise Exception("Workflow queue update/JSON integrity check failed")
            
        # Delete
        db.delete(item)
        db.commit()
        print("   - Deleted workflow queue item.")
        print("✅ WorkflowQueue table verified successfully.")

        # 6. Test CRUD on AuditHistory table
        print("\n5. Testing AuditHistory table CRUD operations...")
        # Create
        new_audit = models.AuditHistory(
            action="Test Action",
            user="Test User",
            remarks="Test Remarks",
            timestamp="19/06/2026, 12:00:00 PM"
        )
        db.add(new_audit)
        db.commit()
        audit_id = new_audit.id
        print(f"   - Inserted audit history record (ID: {audit_id}).")
        
        # Read
        audit = db.query(models.AuditHistory).filter(models.AuditHistory.id == audit_id).first()
        if not audit or audit.action != "Test Action":
            raise Exception("Audit history read integrity check failed")
            
        # Delete
        db.delete(audit)
        db.commit()
        print("   - Deleted audit history record.")
        print("✅ AuditHistory table verified successfully.")

        print("\n🎉 ALL DATABASE SCHEMA AND FUNCTIONAL VERIFICATIONS PASSED!")
        return True

    except Exception as e:
        db.rollback()
        print(f"\n❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_database()
    sys.exit(0 if success else 1)
