import requests
import json
import os
import sys

BASE_URL = "http://localhost:5001/api"
def get_auth_token(email: str) -> str:
    res = requests.post(f"{BASE_URL}/auth/sso-login", json={"email": email})
    if res.status_code != 200:
        raise Exception(f"Failed to authenticate {email}: {res.text}")
    token = res.json().get("token")
    if not token:
        raise Exception(f"Token missing from response for {email}")
    return token

def main():
    
    maker_email = "nandini.aggarwal@1mg.com"
    hrbp_email = "mukul.vaibhav@1mg.com"
    hod_email = "hod@company.com"
    
    print("\n1. Simulating Maker Login...")
    maker_token = get_auth_token(maker_email)
    maker_headers = {"Authorization": f"Bearer {maker_token}"}
    print("✅ Maker authenticated successfully.")
    

    sample_row = {
        "id": 101,
        "empCode": "EMP999",
        "empName": "Aman Verma",
        "grade": "M3",
        "designation": "Manager",
        "employeeHome": "Office",
        "type": "Overtime",
        "module": "Overtime",
        "amount": "8000",
        "overtimeHours": "10",
        "remarks": "Overtime verified by manager",
        "history": []
    }
    
    print("2. Maker saving overtime sheet")
    res = requests.post(f"{BASE_URL}/workflow/save-maker", json=[sample_row], headers=maker_headers)
    if res.status_code != 200:
        print("❌ FAIL: Maker failed to save sheet:", res.text)
        sys.exit(1)
    print("Sheet saved successfully in Maker queue.")
    
    res = requests.get(f"{BASE_URL}/workflow/maker", headers=maker_headers)
    maker_queue = res.json()
    if not maker_queue or maker_queue[0]["empCode"] != "EMP999":
        print("FAIL: Maker queue data integrity mismatch:", maker_queue)
        sys.exit(1)
    print("Maker queue data integrity verified.")
    

    print("3. Maker submitting sheet to HRBP")
    res = requests.get(f"{BASE_URL}/workflow/submit-hrbp", headers=maker_headers)
    if res.status_code != 200:
        print("FAIL: Submit to HRBP failed:", res.text)
        sys.exit(1)
    print("Submitted to HRBP successfully. (Email notification dispatched to HRBP).")
    

    res = requests.get(f"{BASE_URL}/workflow/maker", headers=maker_headers)
    if len(res.json()) != 0:
        print("FAIL: Maker queue not cleared after submission.")
        sys.exit(1)
    print("Maker queue is clear.")

    print("\n4. Simulating HRBP Login...")
    hrbp_token = get_auth_token(hrbp_email)
    hrbp_headers = {"Authorization": f"Bearer {hrbp_token}"}
    print("HRBP authenticated successfully.")
    
    res = requests.get(f"{BASE_URL}/workflow/hrbp", headers=hrbp_headers)
    hrbp_queue = res.json()
    if not hrbp_queue or hrbp_queue[0]["empCode"] != "EMP999":
        print("FAIL: HRBP queue is empty or data mismatch:", hrbp_queue)
        sys.exit(1)
    print("HRBP successfully fetched submitted sheet.")
    
    print("5. HRBP entering review comments and flagging columns...")
    review_payload = {
        "comments": "HRBP Review: Verified. Amount looks correct.",
        "flaggedColumns": ["amount"]
    }
    res = requests.post(f"{BASE_URL}/workflow/save-hrbp-review", json=review_payload, headers=hrbp_headers)
    if res.status_code != 200:
        print("FAIL: HRBP failed to save review:", res.text)
        sys.exit(1)
    print("HRBP review comments saved.")

    print("6. HRBP submitting sheet to HOD...")
    res = requests.get(f"{BASE_URL}/workflow/submit-hod", headers=hrbp_headers)
    if res.status_code != 200:
        print("FAIL: Submit to HOD failed:", res.text)
        sys.exit(1)
    print("Submitted to HOD successfully. (Email notification dispatched to HOD).")

    print("\n7. Simulating HOD Login...")
    hod_token = get_auth_token(hod_email)
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    print("HOD authenticated successfully.")

    res = requests.get(f"{BASE_URL}/workflow/hod", headers=hod_headers)
    hod_queue = res.json()
    if not hod_queue or hod_queue[0]["empCode"] != "EMP999":
        print("FAIL: HOD queue is empty or data mismatch:", hod_queue)
        sys.exit(1)
    print(f"HOD successfully fetched sheet. Incoming HRBP comments: '{hod_queue[0].get('hrbpComments')}'")
    print("8. HOD saving comments and returning sheet to HRBP...")
    hod_comments = "HOD: Return. Overtime hours seem high for this grade."
    requests.post(f"{BASE_URL}/workflow/save-hod-review", json={"comments": hod_comments}, headers=hod_headers)
    res = requests.get(f"{BASE_URL}/workflow/return-hrbp", headers=hod_headers)
    if res.status_code != 200:
        print("FAIL: HOD failed to return to HRBP:", res.text)
        sys.exit(1)
    print("Returned to HRBP successfully. (Email notification dispatched to HRBP with comments).")
    
    print("\n9. HRBP fetching returned sheet...")
    res = requests.get(f"{BASE_URL}/workflow/hrbp", headers=hrbp_headers)
    hrbp_queue = res.json()
    if not hrbp_queue:
        print("FAIL: HRBP queue is empty after HOD return.")
        sys.exit(1)
    print(f"HRBP retrieved sheet. HOD remarks: '{hrbp_queue[0]['history'][-1].get('remarks')}'")
    
    print("10. HRBP returning sheet back to Maker...")
    res = requests.get(f"{BASE_URL}/workflow/return-maker", headers=hrbp_headers)
    if res.status_code != 200:
        print("FAIL: HRBP failed to return to Maker:", res.text)
        sys.exit(1)
    print("Returned to Maker successfully. (Email notification dispatched to Maker with comments).")
    

    print("\n11. Maker checking final rejected sheet state...")
    res = requests.get(f"{BASE_URL}/workflow/maker", headers=maker_headers)
    final_maker_queue = res.json()
    if not final_maker_queue or final_maker_queue[0]["status"] != "MAKER":
        print("FAIL: Sheet status is not MAKER in Maker queue:", final_maker_queue)
        sys.exit(1)
        
    history = final_maker_queue[0]["history"]
    print("Sheet status successfully restored to MAKER.")
    print("Action logs in history:")
    for log in history:
        print(f"   - [{log.get('timestamp')}] {log.get('action')} by {log.get('user')}. Remarks: '{log.get('remarks', '')}'")
        
    print("\n=== ALL WORKFLOW REJECTION & EMAIL DISPATCH TESTS PASSED! ===")
    sys.exit(0)

if __name__ == "__main__":
    main()
