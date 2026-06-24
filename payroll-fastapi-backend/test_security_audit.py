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
    print("=== STARTING PYTHON SECURITY AND RBAC AUDIT VERIFICATION ===")
    failed = False

    # 1. Test Unauthenticated Access to Admin routes (should be 401)
    try:
        print("\n1. Testing GET /api/users without authentication...")
        res = requests.get(f"{BASE_URL}/users")
        if res.status_code == 401:
            print("✅ PASS: Blocked unauthenticated access with 401 Unauthorized.")
        else:
            print(f"❌ FAIL: Expected 401, got {res.status_code}")
            failed = True
    except Exception as e:
        print("❌ FAIL: Request error:", e)
        failed = True

    # 2. Test Unauthenticated Access to Maker workflow routes (should be 401)
    try:
        print("\n2. Testing GET /api/workflow/maker without authentication...")
        res = requests.get(f"{BASE_URL}/workflow/maker")
        if res.status_code == 401:
            print("✅ PASS: Blocked unauthenticated access with 401 Unauthorized.")
        else:
            print(f"❌ FAIL: Expected 401, got {res.status_code}")
            failed = True
    except Exception as e:
        print("❌ FAIL: Request error:", e)
        failed = True

    # 3. Log in as Admin and get Token
    admin_token = ""
    try:
        print("\n3. Simulating SSO Login for Admin (amit.khatri@1mg.com)...")
        admin_token = get_auth_token("amit.khatri@1mg.com")
        print("✅ PASS: Authenticated successfully. Received Token.")
    except Exception as e:
        print("❌ FAIL: Could not authenticate Admin:", e)
        failed = True


    # 4. Test Authorized Access as Admin (GET /api/users should be 200)
    if admin_token:
        try:
            print("\n4. Testing GET /api/users with Admin token...")
            headers = {"Authorization": f"Bearer {admin_token}"}
            res = requests.get(f"{BASE_URL}/users", headers=headers)
            if res.status_code == 200:
                print(f"✅ PASS: Retrieved users list. Found {len(res.json())} users.")
            else:
                print(f"❌ FAIL: Expected 200, got {res.status_code}")
                failed = True
        except Exception as e:
            print("❌ FAIL: Access denied for Admin:", e)
            failed = True

    # 5. Test Access Restriction (Admin accessing Maker workflow should be 403 Forbidden)
    if admin_token:
        try:
            print("\n5. Testing GET /api/workflow/maker with Admin token (Admin is not Maker)...")
            headers = {"Authorization": f"Bearer {admin_token}"}
            res = requests.get(f"{BASE_URL}/workflow/maker", headers=headers)
            if res.status_code == 403:
                print("✅ PASS: Blocked access with 403 Forbidden.")
            else:
                print(f"❌ FAIL: Expected 403, got {res.status_code}")
                failed = True
        except Exception as e:
            print("❌ FAIL: Request error:", e)
            failed = True

    # 6. Log in as Maker and get Token
    maker_token = ""
    try:
        print("\n6. Simulating SSO Login for Maker (nandini.aggarwal@1mg.com)...")
        maker_token = get_auth_token("nandini.aggarwal@1mg.com")
        print("✅ PASS: Authenticated Maker successfully. Received Token.")
    except Exception as e:
        print("❌ FAIL: Could not authenticate Maker:", e)
        failed = True


    # 7. Test Authorized Access as Maker (GET /api/workflow/maker should be 200)
    if maker_token:
        try:
            print("\n7. Testing GET /api/workflow/maker with Maker token...")
            headers = {"Authorization": f"Bearer {maker_token}"}
            res = requests.get(f"{BASE_URL}/workflow/maker", headers=headers)
            if res.status_code == 200:
                print("✅ PASS: Maker retrieved maker workflow queue successfully.")
            else:
                print(f"❌ FAIL: Expected 200, got {res.status_code}")
                failed = True
        except Exception as e:
            print("❌ FAIL: Access denied for Maker:", e)
            failed = True

    # 8. Test Access Restriction (Maker accessing Admin /api/users should be 403 Forbidden)
    if maker_token:
        try:
            print("\n8. Testing GET /api/users with Maker token (Maker is not Admin)...")
            headers = {"Authorization": f"Bearer {maker_token}"}
            res = requests.get(f"{BASE_URL}/users", headers=headers)
            if res.status_code == 403:
                print("✅ PASS: Blocked access with 403 Forbidden.")
            else:
                print(f"❌ FAIL: Expected 403, got {res.status_code}")
                failed = True
        except Exception as e:
            print("❌ FAIL: Request error:", e)
            failed = True

    # 9. Verify History Route is accessible to any authenticated user
    if maker_token:
        try:
            print("\n9. Testing GET /api/workflow/history with Maker token...")
            headers = {"Authorization": f"Bearer {maker_token}"}
            res = requests.get(f"{BASE_URL}/workflow/history", headers=headers)
            if res.status_code == 200:
                print("✅ PASS: Maker retrieved history successfully.")
            else:
                print(f"❌ FAIL: Expected 200, got {res.status_code}")
                failed = True
        except Exception as e:
            print("❌ FAIL: Access denied for history:", e)
            failed = True

    print("\n=== PYTHON SECURITY AND RBAC AUDIT SUMMARY ===")
    if failed:
        print("❌ SYSTEM AUDIT FAILED: Some access control rules were bypassed or broken!")
        sys.exit(1)
    else:
        print("🎉 ALL TESTS PASSED: JWT authentication, Role-based Access Control (RBAC), and route protection are fully secure and functioning correctly!")
        sys.exit(0)

if __name__ == "__main__":
    main()
