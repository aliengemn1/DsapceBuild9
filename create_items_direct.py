# -*- coding: utf-8 -*-
"""
DSpace API - Create Items Directly for King Fahd National Library
Creates items directly using the REST API
"""

import requests
import re
import sys
import io
import os
from datetime import datetime

# Fix console encoding for Arabic text
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

# Configuration
BASE_URL = "http://localhost:8080/server/api"
USER = "ali@ali.com"
PASSWORD = "admin"
SAMPLE_FILES_DIR = "c:/DsapceBuild9/sample_files"

# Sample items for each type
SAMPLE_ITEMS = {
    "pdf": [
        {"title": "كتاب في التراث العربي", "author": "د. أحمد محمد"},
        {"title": "دراسة في المخطوطات", "author": "د. فاطمة علي"},
        {"title": "بحث علمي محكم", "author": "د. خالد عبدالله"},
        {"title": "تقرير سنوي", "author": "إدارة المكتبة"},
        {"title": "دليل المستخدم", "author": "قسم الخدمات"},
    ],
    "image": [
        {"title": "صورة مخطوطة نادرة", "author": "قسم التصوير"},
        {"title": "صورة تاريخية", "author": "الأرشيف الوطني"},
        {"title": "خريطة قديمة", "author": "قسم الخرائط"},
        {"title": "صورة وثائقية", "author": "قسم التوثيق"},
        {"title": "رسم فني", "author": "قسم الفنون"},
    ],
    "audio": [
        {"title": "تسجيل صوتي تاريخي", "author": "الأرشيف الصوتي"},
        {"title": "محاضرة علمية", "author": "د. سعد الفهد"},
        {"title": "تلاوة قرآنية", "author": "الشيخ محمد"},
        {"title": "ندوة ثقافية", "author": "قسم الفعاليات"},
        {"title": "مقابلة موثقة", "author": "قسم الإعلام"},
    ],
    "video": [
        {"title": "فيلم وثائقي", "author": "قسم الإنتاج"},
        {"title": "تسجيل مرئي", "author": "التلفزيون السعودي"},
        {"title": "جولة افتراضية", "author": "قسم التقنية"},
        {"title": "ورشة عمل", "author": "قسم التدريب"},
        {"title": "حفل ثقافي", "author": "قسم الفعاليات"},
    ]
}


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


def get_all_collections(session, auth_token):
    """Get all collections from DSpace"""
    headers = {"Authorization": auth_token}

    all_collections = []
    page = 0
    size = 100

    while True:
        response = session.get(
            f"{BASE_URL}/core/collections?page={page}&size={size}",
            headers=headers
        )

        if response.status_code == 200:
            data = response.json()
            collections = data.get('_embedded', {}).get('collections', [])
            if not collections:
                break
            all_collections.extend(collections)

            page_info = data.get('page', {})
            total_pages = page_info.get('totalPages', 1)
            if page >= total_pages - 1:
                break
            page += 1
        else:
            break

    return all_collections


def create_sample_file(file_type):
    """Create a sample file for upload"""
    os.makedirs(SAMPLE_FILES_DIR, exist_ok=True)

    if file_type == "pdf":
        filename = f"{SAMPLE_FILES_DIR}/sample.pdf"
        if not os.path.exists(filename):
            pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 12 Tf 100 700 Td (Sample) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer << /Size 5 /Root 1 0 R >>
startxref
300
%%EOF"""
            with open(filename, 'wb') as f:
                f.write(pdf_content)
        return filename, "application/pdf", "document.pdf"

    elif file_type == "image":
        filename = f"{SAMPLE_FILES_DIR}/sample.png"
        if not os.path.exists(filename):
            # 1x1 red PNG
            png_content = bytes([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
                0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
                0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
                0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
                0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
                0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
            ])
            with open(filename, 'wb') as f:
                f.write(png_content)
        return filename, "image/png", "image.png"

    elif file_type == "audio":
        filename = f"{SAMPLE_FILES_DIR}/sample.mp3"
        if not os.path.exists(filename):
            # Minimal MP3 header
            mp3_content = bytes([0xFF, 0xFB, 0x90, 0x00] * 100)
            with open(filename, 'wb') as f:
                f.write(mp3_content)
        return filename, "audio/mpeg", "audio.mp3"

    elif file_type == "video":
        filename = f"{SAMPLE_FILES_DIR}/sample.mp4"
        if not os.path.exists(filename):
            # Minimal MP4
            mp4_content = b'\x00\x00\x00\x1c\x66\x74\x79\x70\x69\x73\x6f\x6d'
            mp4_content += b'\x00\x00\x02\x00\x69\x73\x6f\x6d\x69\x73\x6f\x32'
            mp4_content += b'\x6d\x70\x34\x31\x00\x00\x00\x08\x66\x72\x65\x65'
            with open(filename, 'wb') as f:
                f.write(mp4_content)
        return filename, "video/mp4", "video.mp4"

    return None, None, None


def create_item_with_file(session, auth_token, collection_uuid, title, author, file_type, collection_name, item_num):
    """Create an item with metadata and file in one step"""

    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    # Prepare metadata
    current_date = datetime.now().strftime("%Y-%m-%d")
    dc_type_map = {"pdf": "Text", "image": "Image", "audio": "Sound", "video": "MovingImage"}

    item_data = {
        "name": title,
        "metadata": {
            "dc.title": [{"value": title, "language": "ar"}],
            "dc.contributor.author": [{"value": author, "language": "ar"}],
            "dc.date.issued": [{"value": current_date}],
            "dc.publisher": [{"value": "مكتبة الملك فهد الوطنية", "language": "ar"}],
            "dc.type": [{"value": dc_type_map.get(file_type, "Other")}],
            "dc.language.iso": [{"value": "ar"}],
            "dc.subject": [{"value": collection_name, "language": "ar"}],
            "dc.description.abstract": [{"value": f"عنصر رقم {item_num} من مجموعة {collection_name}", "language": "ar"}]
        },
        "inArchive": True,
        "discoverable": True,
        "withdrawn": False
    }

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": auth_token,
    }

    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    # Create item
    response = session.post(
        f"{BASE_URL}/core/items?owningCollection={collection_uuid}",
        headers=headers,
        json=item_data
    )

    if response.status_code in [200, 201]:
        item = response.json()
        item_uuid = item.get('uuid')

        # Try to upload file (may fail if bundles not configured, but item will still exist)
        try:
            upload_bitstream(session, auth_token, item_uuid, file_type)
        except:
            pass

        return True, item_uuid
    else:
        return False, f"Status: {response.status_code}"


def upload_bitstream(session, auth_token, item_uuid, file_type):
    """Upload a bitstream to an item"""
    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    # First, get or create ORIGINAL bundle
    headers = {
        "Authorization": auth_token,
    }

    # Get bundles
    response = session.get(
        f"{BASE_URL}/core/items/{item_uuid}/bundles",
        headers=headers
    )

    bundle_uuid = None
    if response.status_code == 200:
        data = response.json()
        bundles = data.get('_embedded', {}).get('bundles', [])
        for bundle in bundles:
            if bundle.get('name') == 'ORIGINAL':
                bundle_uuid = bundle.get('uuid')
                break

    # Create bundle if not exists
    if not bundle_uuid:
        csrf_token = get_fresh_csrf(session, auth_token)
        if csrf_token:
            session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

        bundle_headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": auth_token,
        }
        if csrf_token:
            bundle_headers["X-XSRF-TOKEN"] = csrf_token

        bundle_data = {"name": "ORIGINAL", "metadata": {}}

        response = session.post(
            f"{BASE_URL}/core/items/{item_uuid}/bundles",
            headers=bundle_headers,
            json=bundle_data
        )

        if response.status_code in [200, 201]:
            bundle = response.json()
            bundle_uuid = bundle.get('uuid')

    if not bundle_uuid:
        return False

    # Upload file
    filepath, content_type, filename = create_sample_file(file_type)
    if not filepath:
        return False

    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    upload_headers = {
        "Authorization": auth_token,
    }
    if csrf_token:
        upload_headers["X-XSRF-TOKEN"] = csrf_token

    with open(filepath, 'rb') as f:
        files = {'file': (filename, f, content_type)}
        response = session.post(
            f"{BASE_URL}/core/bundles/{bundle_uuid}/bitstreams",
            headers=upload_headers,
            files=files
        )

    return response.status_code in [200, 201]


def main():
    print("=" * 70)
    print("إنشاء العناصر المباشر - مكتبة الملك فهد الوطنية")
    print("=" * 70)

    session = requests.Session()

    # Login
    print("\n[1] تسجيل الدخول...")
    auth_token = login(session)

    if not auth_token:
        print("فشل تسجيل الدخول!")
        return

    # Get all collections
    print("\n[2] جلب الحاويات...")
    collections = get_all_collections(session, auth_token)
    print(f"تم العثور على {len(collections)} حاوية")

    # Create items
    print("\n[3] إنشاء العناصر (20 لكل حاوية)...")
    print("=" * 70)

    total_created = 0
    total_failed = 0

    file_types = ["pdf", "pdf", "pdf", "pdf", "pdf",
                  "image", "image", "image", "image", "image",
                  "audio", "audio", "audio", "audio", "audio",
                  "video", "video", "video", "video", "video"]

    for collection in collections:
        collection_uuid = collection.get('uuid')
        collection_name = collection.get('name', 'Unknown')

        print(f"\n📁 {collection_name}")
        print("-" * 50)

        for i in range(20):
            file_type = file_types[i]
            samples = SAMPLE_ITEMS[file_type]
            sample = samples[i % len(samples)]

            title = f"{sample['title']} - {collection_name} ({i+1})"
            author = sample['author']

            success, result = create_item_with_file(
                session, auth_token, collection_uuid,
                title, author, file_type, collection_name, i+1
            )

            if success:
                total_created += 1
                type_icon = {"pdf": "📄", "image": "🖼️", "audio": "🎵", "video": "🎬"}.get(file_type, "📎")
                print(f"   ✓ [{i+1}/20] {type_icon} {sample['title'][:35]}...")
            else:
                total_failed += 1
                print(f"   ✗ [{i+1}/20] {sample['title'][:35]}... - {result}")

    # Summary
    print("\n" + "=" * 70)
    print("ملخص العملية")
    print("=" * 70)
    print(f"إجمالي العناصر المُنشأة: {total_created}")
    print(f"إجمالي الفشل: {total_failed}")
    if total_created + total_failed > 0:
        print(f"النسبة المئوية للنجاح: {(total_created / (total_created + total_failed)) * 100:.1f}%")
    print("\nتم الانتهاء!")


if __name__ == "__main__":
    main()
