# -*- coding: utf-8 -*-
"""
DSpace API - Create King Fahd National Library Communities
"""

import requests
import re
import sys
import io

# Fix console encoding for Arabic text
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration
BASE_URL = "http://localhost:8080/server/api"
USER = "ali@ali.com"
PASSWORD = "admin"

# Communities data for King Fahd National Library
COMMUNITIES = [
    {
        "name": "مكتبة الملك فهد الوطنية - المجموعة الرئيسية",
        "description": "المجموعة الرئيسية لمكتبة الملك فهد الوطنية في الرياض"
    },
    {
        "name": "قسم المخطوطات والوثائق النادرة",
        "description": "يحتوي على المخطوطات العربية والإسلامية النادرة والوثائق التاريخية"
    },
    {
        "name": "قسم الكتب العربية",
        "description": "مجموعة الكتب العربية المطبوعة في مختلف المجالات"
    },
    {
        "name": "قسم الكتب الأجنبية",
        "description": "مجموعة الكتب بالغات الأجنبية المختلفة"
    },
    {
        "name": "قسم الدوريات والمجلات",
        "description": "الدوريات والمجلات العلمية والثقافية"
    },
    {
        "name": "قسم الرسائل الجامعية",
        "description": "رسائل الماجستير والدكتوراه من الجامعات السعودية والعربية"
    },
    {
        "name": "قسم المواد السمعية والبصرية",
        "description": "الأفلام الوثائقية والتسجيلات الصوتية والمرئية"
    },
    {
        "name": "قسم الخرائط والأطالس",
        "description": "الخرائط الجغرافية والتاريخية والأطالس"
    },
    {
        "name": "قسم التراث السعودي",
        "description": "مجموعة التراث والثقافة السعودية"
    },
    {
        "name": "قسم المصادر الرقمية",
        "description": "الموارد والمصادر الرقمية والإلكترونية"
    }
]


def get_csrf_token_from_response(response):
    """Extract CSRF token from response headers"""
    csrf_token = response.headers.get('DSPACE-XSRF-TOKEN')
    if not csrf_token:
        set_cookie = response.headers.get('Set-Cookie', '')
        if 'DSPACE-XSRF-COOKIE=' in set_cookie:
            match = re.search(r'DSPACE-XSRF-COOKIE=([^;]+)', set_cookie)
            if match:
                csrf_token = match.group(1)
    return csrf_token


def login(session):
    """Login to DSpace and get authentication token"""
    # First, make a POST request to get CSRF token (DSpace sends it on POST requests)
    print("Getting CSRF token...")

    # Make initial request to trigger CSRF token generation
    response = session.post(
        f"{BASE_URL}/authn/login",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=""
    )

    # Get CSRF token from response
    csrf_token = get_csrf_token_from_response(response)
    print(f"CSRF Token: {csrf_token}")

    if not csrf_token:
        print("Warning: No CSRF token obtained!")
        return None

    # Now login with the CSRF token
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-XSRF-TOKEN": csrf_token
    }

    # Set cookie
    session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    data = f"user={USER}&password={PASSWORD}"

    response = session.post(
        f"{BASE_URL}/authn/login",
        headers=headers,
        data=data
    )

    if response.status_code == 200:
        auth_token = response.headers.get('Authorization')
        print(f"Login successful! Auth token obtained.")
        return auth_token
    else:
        print(f"Login failed! Status: {response.status_code}")
        print(f"Response: {response.text}")
        return None


def get_fresh_csrf(session, auth_token):
    """Get fresh CSRF token for authenticated requests"""
    headers = {"Authorization": auth_token} if auth_token else {}

    # Make a POST to get new CSRF
    response = session.post(
        f"{BASE_URL}/authn/status",
        headers=headers
    )

    csrf_token = get_csrf_token_from_response(response)

    if not csrf_token:
        # Try GET request
        response = session.get(f"{BASE_URL}/authn/status", headers=headers)
        csrf_token = get_csrf_token_from_response(response)

    return csrf_token


def create_community(session, auth_token, community_data):
    """Create a single community"""
    # Get fresh CSRF token
    csrf_token = get_fresh_csrf(session, auth_token)

    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": auth_token,
    }

    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    payload = {
        "name": community_data["name"],
        "metadata": {
            "dc.title": [
                {
                    "value": community_data["name"],
                    "language": "ar"
                }
            ],
            "dc.description": [
                {
                    "value": community_data["description"],
                    "language": "ar"
                }
            ],
            "dc.description.abstract": [
                {
                    "value": community_data["description"],
                    "language": "ar"
                }
            ]
        }
    }

    response = session.post(
        f"{BASE_URL}/core/communities",
        headers=headers,
        json=payload
    )

    return response


def main():
    print("=" * 60)
    print("DSpace API - King Fahd National Library Communities Creator")
    print("=" * 60)

    # Create session
    session = requests.Session()

    # Step 1: Login
    print("\n[1] Logging in...")
    auth_token = login(session)

    if not auth_token:
        print("Failed to authenticate. Exiting.")
        return

    # Step 2: Create communities
    print("\n[2] Creating communities...")
    print("-" * 60)

    created_count = 0
    created_communities = []

    for i, community in enumerate(COMMUNITIES, 1):
        print(f"\n[{i}/10] Creating: {community['name']}")

        response = create_community(session, auth_token, community)

        if response.status_code in [200, 201]:
            result = response.json()
            created_count += 1
            uuid = result.get('uuid', 'N/A')
            created_communities.append({
                "name": community["name"],
                "uuid": uuid
            })
            print(f"       Success! UUID: {uuid}")
        else:
            print(f"       Failed! Status: {response.status_code}")
            print(f"       Response: {response.text[:300]}")

    # Summary
    print("\n" + "=" * 60)
    print(f"SUMMARY: Created {created_count} out of 10 communities")
    print("=" * 60)

    if created_communities:
        print("\nCreated Communities:")
        for comm in created_communities:
            print(f"  - {comm['name']}")
            print(f"    UUID: {comm['uuid']}")

    print("\nDone!")


if __name__ == "__main__":
    main()
