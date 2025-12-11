# -*- coding: utf-8 -*-
"""
DSpace API - Update Items Access Rights
Add dc.rights.accessRights to all items
"""

import requests
import re
import sys
import io
import random

# Fix console encoding for Arabic text
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

# Configuration
BASE_URL = "http://localhost:8080/server/api"
USER = "ali@ali.com"
PASSWORD = "admin"

# Access Rights types
ACCESS_RIGHTS = [
    {"value": "open access", "label_ar": "وصول مفتوح"},
    {"value": "open access", "label_ar": "وصول مفتوح"},
    {"value": "open access", "label_ar": "وصول مفتوح"},
    {"value": "open access", "label_ar": "وصول مفتوح"},
    {"value": "restricted", "label_ar": "وصول مقيد"},
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
    print("تسجيل الدخول...")

    response = session.post(
        f"{BASE_URL}/authn/login",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=""
    )

    csrf_token = get_csrf_token_from_response(response)

    if not csrf_token:
        print("خطأ: لم يتم الحصول على CSRF token!")
        return None

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-XSRF-TOKEN": csrf_token
    }

    session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    data = f"user={USER}&password={PASSWORD}"

    response = session.post(
        f"{BASE_URL}/authn/login",
        headers=headers,
        data=data
    )

    if response.status_code == 200:
        auth_token = response.headers.get('Authorization')
        print("تم تسجيل الدخول بنجاح!")
        return auth_token
    else:
        print(f"فشل تسجيل الدخول! Status: {response.status_code}")
        return None


def get_fresh_csrf(session, auth_token):
    """Get fresh CSRF token for authenticated requests"""
    headers = {"Authorization": auth_token} if auth_token else {}

    response = session.post(
        f"{BASE_URL}/authn/status",
        headers=headers
    )

    csrf_token = get_csrf_token_from_response(response)

    if not csrf_token:
        response = session.get(f"{BASE_URL}/authn/status", headers=headers)
        csrf_token = get_csrf_token_from_response(response)

    return csrf_token


def get_all_items(session, auth_token):
    """Get all items from DSpace"""
    headers = {"Authorization": auth_token}

    all_items = []
    page = 0
    size = 100

    while True:
        response = session.get(
            f"{BASE_URL}/core/items?page={page}&size={size}",
            headers=headers
        )

        if response.status_code == 200:
            data = response.json()
            items = data.get('_embedded', {}).get('items', [])
            if not items:
                break
            all_items.extend(items)

            page_info = data.get('page', {})
            total_pages = page_info.get('totalPages', 1)
            if page >= total_pages - 1:
                break
            page += 1
        else:
            break

    return all_items


def update_item_access_rights(session, auth_token, item_uuid):
    """Update item with access rights metadata"""

    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    # Select access right (mostly open access)
    access_right = random.choice(ACCESS_RIGHTS)

    # Prepare patch operations
    operations = [
        {
            "op": "add",
            "path": "/metadata/dc.rights.accessRights",
            "value": [{"value": access_right["value"], "language": None}]
        },
        {
            "op": "add",
            "path": "/metadata/dc.rights",
            "value": [{"value": access_right["label_ar"], "language": "ar"}]
        }
    ]

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": auth_token,
    }

    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    response = session.patch(
        f"{BASE_URL}/core/items/{item_uuid}",
        headers=headers,
        json=operations
    )

    return response.status_code in [200, 201, 204]


def main():
    print("=" * 70)
    print("تحديث حقوق الوصول - مكتبة الملك فهد الوطنية")
    print("إضافة: dc.rights.accessRights")
    print("=" * 70)

    session = requests.Session()

    # Login
    print("\n[1] تسجيل الدخول...")
    auth_token = login(session)

    if not auth_token:
        print("فشل تسجيل الدخول!")
        return

    # Get all items
    print("\n[2] جلب العناصر...")
    items = get_all_items(session, auth_token)
    print(f"تم العثور على {len(items)} عنصر")

    # Update items
    print("\n[3] تحديث حقوق الوصول...")
    print("=" * 70)

    updated_count = 0

    for i, item in enumerate(items, 1):
        item_uuid = item.get('uuid')

        if update_item_access_rights(session, auth_token, item_uuid):
            updated_count += 1

        if i % 100 == 0:
            print(f"   تم تحديث {i} من {len(items)} عنصر...")

    # Summary
    print("\n" + "=" * 70)
    print("ملخص العملية")
    print("=" * 70)
    print(f"إجمالي العناصر المحدثة: {updated_count} من {len(items)}")
    print("\nتم الانتهاء!")


if __name__ == "__main__":
    main()
