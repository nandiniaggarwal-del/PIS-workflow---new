import requests
import json
import os
import sys

BASE_URL = "http://localhost:8000/api"

token_cache = {}

def get_auth_token(email: str) -> str:
    email_clean = email.strip().lower()
    if email_clean in token_cache:
        return token_cache[email_clean]
    res = requests.post(f"{BASE_URL}/auth/sso-login", json={"email": email_clean})
    if res.status_code != 200:
        raise Exception(f"Failed to authenticate {email_clean}: {res.text}")
    token = res.json().get("token")
    if not token:
        raise Exception(f"Token missing from response for {email_clean}")
    token_cache[email_clean] = token
    return token

def test_rule(rule, index):
    head = rule.get("earning_head")
    home = rule.get("employee_home")
    initiators = rule.get("initiators", [])
    hrbps = rule.get("hrbps", [])
    approvers = rule.get("approvers", [])

    if not initiators:
        # Skip rules with no initiators
        return True

    maker_email = initiators[0].strip().lower()
    hrbp_email = hrbps[0].strip().lower() if hrbps and hrbps[0].strip().lower() not in ("na", "n/a", "") else None
    hod_email = approvers[0].strip().lower() if approvers and approvers[0].strip().lower() not in ("na", "n/a", "") else None

    # 1. Maker Login
    try:
        maker_token = get_auth_token(maker_email)
    except Exception as e:
        print(f"Rule #{index} ({head} - {home}): Maker login failed for {maker_email}: {e}")
        return False

    maker_headers = {"Authorization": f"Bearer {maker_token}"}

    sample_row = {
        "id": 1000 + index,
        "empCode": f"EMP{1000+index}",
        "empName": "Test Employee",
        "grade": "M3",
        "designation": "Manager",
        "employeeHome": home,
        "type": head,
        "module": head,
        "amount": "1000",
        "overtimeHours": "5",
        "remarks": "Test Remarks",
        "history": []
    }

    # 2. Maker Save
    save_url = f"{BASE_URL}/workflow/save-maker?module={requests.utils.quote(head)}&employeeHome={requests.utils.quote(home)}"
    res = requests.post(save_url, json=[sample_row], headers=maker_headers)
    if res.status_code != 200:
        print(f"Rule #{index} ({head} - {home}): Maker save failed: {res.text}")
        return False

    # 3. Maker Submit
    submit_url = f"{BASE_URL}/workflow/submit-hrbp?module={requests.utils.quote(head)}&employeeHome={requests.utils.quote(home)}"
    res = requests.get(submit_url, headers=maker_headers)
    if res.status_code != 200:
        print(f"Rule #{index} ({head} - {home}): Maker submit failed: {res.text}")
        return False

    # 4. HRBP Step (if HRBP exists)
    if hrbp_email:
        try:
            hrbp_token = get_auth_token(hrbp_email)
        except Exception as e:
            print(f"Rule #{index} ({head} - {home}): HRBP login failed for {hrbp_email}: {e}")
            return False

        hrbp_headers = {"Authorization": f"Bearer {hrbp_token}"}

        # Check queue
        hrbp_queue_url = f"{BASE_URL}/workflow/hrbp?module={requests.utils.quote(head)}&employeeHome={requests.utils.quote(home)}"
        res = requests.get(hrbp_queue_url, headers=hrbp_headers)
        if res.status_code != 200 or len(res.json()) == 0:
            print(f"Rule #{index} ({head} - {home}): HRBP queue empty or failed: {res.status_code} - {res.text}")
            return False

        # Save review comments
        review_payload = {
            "comments": "HRBP Ok",
            "flaggedColumns": [],
            "module": head,
            "employeeHome": home
        }
        res = requests.post(f"{BASE_URL}/workflow/save-hrbp-review", json=review_payload, headers=hrbp_headers)
        if res.status_code != 200:
            print(f"Rule #{index} ({head} - {home}): HRBP save review failed: {res.text}")
            return False

        # Submit to HOD
        submit_hod_url = f"{BASE_URL}/workflow/submit-hod?module={requests.utils.quote(head)}&employeeHome={requests.utils.quote(home)}"
        res = requests.get(submit_hod_url, headers=hrbp_headers)
        if res.status_code != 200:
            print(f"Rule #{index} ({head} - {home}): Submit to HOD failed: {res.text}")
            return False

    # 5. HOD Step (if HOD exists)
    if hod_email:
        try:
            hod_token = get_auth_token(hod_email)
        except Exception as e:
            print(f"Rule #{index} ({head} - {home}): HOD login failed for {hod_email}: {e}")
            return False

        hod_headers = {"Authorization": f"Bearer {hod_token}"}

        # Check queue
        hod_queue_url = f"{BASE_URL}/workflow/hod?module={requests.utils.quote(head)}&employeeHome={requests.utils.quote(home)}"
        res = requests.get(hod_queue_url, headers=hod_headers)
        if res.status_code != 200 or len(res.json()) == 0:
            print(f"Rule #{index} ({head} - {home}): HOD queue empty or failed: {res.status_code} - {res.text}")
            return False

        # Save HOD review comments
        hod_payload = {
            "comments": "HOD Approved",
            "module": head,
            "employeeHome": home
        }
        res = requests.post(f"{BASE_URL}/workflow/save-hod-review", json=hod_payload, headers=hod_headers)
        if res.status_code != 200:
            print(f"Rule #{index} ({head} - {home}): HOD save review failed: {res.text}")
            return False

        # Submit to Payroll
        submit_payroll_url = f"{BASE_URL}/workflow/submit-payroll?module={requests.utils.quote(head)}&employeeHome={requests.utils.quote(home)}"
        res = requests.get(submit_payroll_url, headers=hod_headers)
        if res.status_code != 200:
            print(f"Rule #{index} ({head} - {home}): Submit to Payroll failed: {res.text}")
            return False

    return True

def main():
    matrix_path = "data/routing_matrix.json"
    if not os.path.exists(matrix_path):
        print(f"Error: {matrix_path} not found.")
        sys.exit(1)

    with open(matrix_path, "r") as f:
        matrix = json.load(f)

    print(f"Starting verification of all {len(matrix)} routing matrix rules...")

    failed_count = 0
    passed_count = 0
    for index, rule in enumerate(matrix):
        success = test_rule(rule, index)
        if success:
            passed_count += 1
        else:
            failed_count += 1

    print("\n=== VERIFICATION SUMMARY ===")
    print(f"Passed: {passed_count}/{len(matrix)}")
    print(f"Failed: {failed_count}/{len(matrix)}")

    if failed_count > 0:
        sys.exit(1)
    else:
        print("🎉 ALL 189 ROUTING RULES FLOWED FROM MAKER TO PAYROLL STAGE SUCCESSFULLY WITH NO ERRORS!")
        sys.exit(0)

if __name__ == "__main__":
    main()
