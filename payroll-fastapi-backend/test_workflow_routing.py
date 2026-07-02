import sys
import os
from fastapi.testclient import TestClient

# Add current folder to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
import models

def test_workflow_routing():
    # Make sure tables are created and seeded in SQLite for the test client
    from database import engine, SessionLocal
    from main import seed_database
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        db.query(models.WorkflowQueue).delete()
        db.query(models.Notification).delete()
        db.commit()
        seed_database(db)
    except Exception as e:
        db.rollback()
    finally:
        db.close()

    client = TestClient(app)

    # 1. Login as Rupali Chaudhary (Maker, ID: 1MG6270)
    login_resp = client.post("/api/auth/sso-login", json={"email": "rupali.chaudhary@1mg.com"})
    assert login_resp.status_code == 200
    rupali_data = login_resp.json()
    assert rupali_data["success"] is True
    assert rupali_data["role"] == "maker"
    assert rupali_data["employee_id"] == "1MG6270"
    rupali_token = rupali_data["token"]
    rupali_headers = {"Authorization": f"Bearer {rupali_token}"}

    # 2. Save rows for REFERRAL BONUS under status MAKER
    save_payload = [
        {
            "empCode": "1MG1234",
            "empName": "Test Employee A",
            "grade": "E1",
            "designation": "Software Engineer",
            "employeeHome": "ALL",
            "type": "REFERRAL BONUS",
            "module": "REFERRAL BONUS",
            "amount": "5000",
            "overtimeHours": "",
            "holidayDate": "",
            "remarks": "Rupali's referral entry",
            "history": []
        }
    ]
    save_resp = client.post("/api/workflow/save-maker?module=REFERRAL%20BONUS&employeeHome=ALL", json=save_payload, headers=rupali_headers)
    assert save_resp.status_code == 200

    # 3. Submit sheet to Approver (should bypass HRBP and route conditionally to Rashi Agarwal - 1MG5998)
    submit_resp = client.get("/api/workflow/submit-hrbp?module=REFERRAL%20BONUS&employeeHome=ALL", headers=rupali_headers)
    assert submit_resp.status_code == 200
    assert "Sent directly to Approver" in submit_resp.json()["message"]

    # 4. Login as Rashi Agarwal (HOD, ID: 1MG5998) and check queue
    rashi_login = client.post("/api/auth/sso-login", json={"email": "rashi.agarwal@1mg.com"})
    assert rashi_login.status_code == 200
    rashi_data = rashi_login.json()
    assert rashi_data["role"] == "hod"
    assert rashi_data["employee_id"] == "1MG5998"
    rashi_token = rashi_data["token"]
    rashi_headers = {"Authorization": f"Bearer {rashi_token}"}

    hod_queue_resp = client.get("/api/workflow/hod?module=REFERRAL%20BONUS&employeeHome=ALL", headers=rashi_headers)
    assert hod_queue_resp.status_code == 200
    hod_queue = hod_queue_resp.json()
    
    # Assert Rupali's submission is in Rashi's HOD queue
    rupali_items_in_rashi_queue = [item for item in hod_queue if item["initiatorEmail"] == "rupali.chaudhary@1mg.com" and item["type"] == "REFERRAL BONUS"]
    assert len(rupali_items_in_rashi_queue) == 1
    assert rupali_items_in_rashi_queue[0]["amount"] == "5000"

    # 5. Check Rashi's notifications list
    notif_resp = client.get("/api/notifications", headers=rashi_headers)
    assert notif_resp.status_code == 200
    notifs = notif_resp.json()
    # Confirm transition notification exists
    notif_texts = [n["text"] for n in notifs]
    assert any("REFERRAL BONUS sheet submitted by Rupali Chaudhary is pending your approval." in text for text in notif_texts)

    # 6. Login as Minakshi Chugh (Maker, ID: 1MG5466)
    minakshi_login = client.post("/api/auth/sso-login", json={"email": "minakshi.chugh@1mg.com"})
    assert minakshi_login.status_code == 200
    minakshi_data = minakshi_login.json()
    assert minakshi_data["employee_id"] == "1MG5466"
    minakshi_token = minakshi_data["token"]
    minakshi_headers = {"Authorization": f"Bearer {minakshi_token}"}

    # Save rows for REFERRAL BONUS under status MAKER
    save_payload_minakshi = [
        {
            "empCode": "1MG5678",
            "empName": "Test Employee B",
            "grade": "E2",
            "designation": "Manager",
            "employeeHome": "ALL",
            "type": "REFERRAL BONUS",
            "module": "REFERRAL BONUS",
            "amount": "10000",
            "overtimeHours": "",
            "holidayDate": "",
            "remarks": "Minakshi's referral entry",
            "history": []
        }
    ]
    save_resp2 = client.post("/api/workflow/save-maker?module=REFERRAL%20BONUS&employeeHome=ALL", json=save_payload_minakshi, headers=minakshi_headers)
    assert save_resp2.status_code == 200

    # Submit sheet to Approver (should bypass HRBP and route conditionally to Khwaja Mohd Azeem - 1MG6318)
    submit_resp2 = client.get("/api/workflow/submit-hrbp?module=REFERRAL%20BONUS&employeeHome=ALL", headers=minakshi_headers)
    assert submit_resp2.status_code == 200
    assert "Sent directly to Approver" in submit_resp2.json()["message"]

    # 7. Login as Khwaja Mohd Azeem (HOD, ID: 1MG6318) and verify
    khwaja_login = client.post("/api/auth/sso-login", json={"email": "khwaja.azeem@1mg.com"})
    assert khwaja_login.status_code == 200
    khwaja_data = khwaja_login.json()
    khwaja_token = khwaja_data["token"]
    khwaja_headers = {"Authorization": f"Bearer {khwaja_token}"}

    hod_queue_resp2 = client.get("/api/workflow/hod?module=REFERRAL%20BONUS&employeeHome=ALL", headers=khwaja_headers)
    assert hod_queue_resp2.status_code == 200
    hod_queue2 = hod_queue_resp2.json()

    # Assert Minakshi's submission is in Khwaja's queue
    minakshi_items_in_khwaja_queue = [item for item in hod_queue2 if item["initiatorEmail"] == "minakshi.chugh@1mg.com" and item["type"] == "REFERRAL BONUS"]
    assert len(minakshi_items_in_khwaja_queue) == 1
    assert minakshi_items_in_khwaja_queue[0]["amount"] == "10000"

    # 8. Approve sheet in Rashi's queue (from step 4) to send it to Payroll stage
    approve_resp = client.get("/api/workflow/submit-payroll?module=REFERRAL%20BONUS&employeeHome=ALL", headers=rashi_headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["message"] == "Sent to Payroll"

    # 9. Login as Payroll Admin
    payroll_login = client.post("/api/auth/sso-login", json={"email": "payroll@1mg.com"})
    assert payroll_login.status_code == 200
    payroll_data = payroll_login.json()
    assert payroll_data["role"] == "payroll"
    payroll_token = payroll_data["token"]
    payroll_headers = {"Authorization": f"Bearer {payroll_token}"}

    # 10. Check Payroll Queue
    payroll_queue_resp = client.get("/api/workflow/payroll", headers=payroll_headers)
    assert payroll_queue_resp.status_code == 200
    payroll_queue = payroll_queue_resp.json()
    assert len(payroll_queue) == 1
    assert payroll_queue[0]["initiatorEmail"] == "rupali.chaudhary@1mg.com"
    assert payroll_queue[0]["amount"] == "5000"

    # 11. Finalize & Close the sheet for REFERRAL BONUS module
    close_resp = client.post("/api/workflow/payroll/close", json={"module": "REFERRAL BONUS"}, headers=payroll_headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["closed_count"] == 1

    # 12. Check that Payroll queue is now empty
    payroll_queue_empty_resp = client.get("/api/workflow/payroll", headers=payroll_headers)
    assert payroll_queue_empty_resp.status_code == 200
    assert len(payroll_queue_empty_resp.json()) == 0

    # 13. Verify Closed/Processed archive grouping
    closed_archive_resp = client.get("/api/workflow/closed", headers=payroll_headers)
    assert closed_archive_resp.status_code == 200
    closed_archive = closed_archive_resp.json()
    assert "months" in closed_archive
    assert len(closed_archive["months"]) > 0
    # The default mock date is fallback since paymentMonth is not set for test row.
    # Verify module details are present.
    modules_in_archive = [m["module"] for m in closed_archive["months"][0]["modules"]]
    assert "REFERRAL BONUS" in modules_in_archive

    # 14. Verify In-Process tracker excludes closed sheet but includes Khwaja's pending HOD sheet
    in_process_resp = client.get("/api/workflow/in-process", headers=payroll_headers)
    assert in_process_resp.status_code == 200
    in_process = in_process_resp.json()
    assert "modules" in in_process
    in_process_modules = [m["module"] for m in in_process["modules"]]
    assert "REFERRAL BONUS" in in_process_modules
    # Khwaja's pending row count for REFERRAL BONUS should be 1
    ref_bonus_in_proc = next(m for m in in_process["modules"] if m["module"] == "REFERRAL BONUS")
    assert ref_bonus_in_proc["totalRows"] == 1
    assert ref_bonus_in_proc["stages"]["HOD"] == 1

    print("🎉 ALL WORKFLOW ROUTING & CLOSURE INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    test_workflow_routing()

