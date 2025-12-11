# -*- coding: utf-8 -*-
"""
DSpace API - Update Items with Enhanced Features
- Add thumbnails to items
- Add abstracts
- Add Hijri date
- Add language, publisher, item type metadata for filters
- Update collection images
"""

import requests
import re
import sys
import io
import os
import random
from datetime import datetime

# Fix console encoding for Arabic text
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

# Configuration
BASE_URL = "http://localhost:8080/server/api"
USER = "ali@ali.com"
PASSWORD = "admin"
SAMPLE_FILES_DIR = "c:/DsapceBuild9/sample_files"

# Hijri date conversion (simplified)
def gregorian_to_hijri(year, month, day):
    """Simple Gregorian to Hijri conversion"""
    # Using approximate conversion
    jd = int((1461 * (year + 4800 + int((month - 14) / 12))) / 4) + \
         int((367 * (month - 2 - 12 * int((month - 14) / 12))) / 12) - \
         int((3 * int((year + 4900 + int((month - 14) / 12)) / 100)) / 4) + day - 32075

    l = jd - 1948440 + 10632
    n = int((l - 1) / 10631)
    l = l - 10631 * n + 354
    j = int((10985 - l) / 5316) * int((50 * l) / 17719) + int(l / 5670) * int((43 * l) / 15238)
    l = l - int((30 - j) / 15) * int((17719 * j) / 50) - int(j / 16) * int((15238 * j) / 43) + 29
    hijri_month = int((24 * l) / 709)
    hijri_day = l - int((709 * hijri_month) / 24)
    hijri_year = 30 * n + j - 30

    return f"{hijri_year}-{hijri_month:02d}-{hijri_day:02d}"

# Arabic abstracts templates
ABSTRACT_TEMPLATES = [
    "يتناول هذا العمل دراسة معمقة في مجال {subject}، ويقدم تحليلاً شاملاً للموضوع من مختلف جوانبه. يهدف إلى إثراء المحتوى العربي في هذا المجال وتقديم مرجع موثوق للباحثين والمهتمين.",
    "تأتي أهمية هذا المصدر من كونه يمثل إضافة نوعية لمجموعة مكتبة الملك فهد الوطنية في مجال {subject}. يوفر هذا العمل معلومات قيمة ومحتوى ثري يخدم الباحثين والدارسين.",
    "يعد هذا العمل من المصادر المهمة في مجال {subject}، حيث يجمع بين الأصالة والمعاصرة في تقديم محتوى علمي رصين. تم توثيقه وحفظه ضمن مقتنيات مكتبة الملك فهد الوطنية.",
    "مصدر أرشيفي قيم يوثق جانباً مهماً من تراثنا العربي والإسلامي في مجال {subject}. يتميز بأصالته وندرته ويمثل إرثاً ثقافياً مهماً للأجيال القادمة.",
    "محتوى رقمي متميز في مجال {subject}، تم رقمنته وحفظه ضمن المشروع الوطني للحفظ الرقمي لمكتبة الملك فهد الوطنية. يتيح الوصول السهل للباحثين من مختلف أنحاء العالم."
]

# Publishers list
PUBLISHERS = [
    "مكتبة الملك فهد الوطنية",
    "دار الكتب والوثائق الوطنية",
    "مركز الوثائق والمحفوظات",
    "الأرشيف الوطني السعودي",
    "مركز التراث العربي",
    "دار المعارف",
    "مؤسسة الملك فيصل الخيرية",
    "جامعة الملك سعود",
    "جامعة الإمام محمد بن سعود الإسلامية",
    "معهد الإدارة العامة"
]

# Languages
LANGUAGES = ["ar", "en", "fr", "de"]
LANGUAGE_NAMES = {"ar": "العربية", "en": "الإنجليزية", "fr": "الفرنسية", "de": "الألمانية"}

# Item types
ITEM_TYPES = [
    "كتاب", "مقالة", "تقرير", "أطروحة", "مخطوطة",
    "خريطة", "صورة", "تسجيل صوتي", "تسجيل مرئي", "وثيقة"
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


def create_random_thumbnail():
    """Create a random colored thumbnail image (100x100 PNG)"""
    os.makedirs(SAMPLE_FILES_DIR, exist_ok=True)

    # Generate random color
    r = random.randint(50, 200)
    g = random.randint(50, 200)
    b = random.randint(50, 200)

    filename = f"{SAMPLE_FILES_DIR}/thumb_{r}_{g}_{b}.png"

    if not os.path.exists(filename):
        # Create simple PNG with solid color (10x10 for simplicity)
        # PNG header
        png_header = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

        # IHDR chunk (10x10 RGB)
        ihdr_data = bytes([
            0x00, 0x00, 0x00, 0x0A,  # width = 10
            0x00, 0x00, 0x00, 0x0A,  # height = 10
            0x08, 0x02,               # bit depth 8, color type 2 (RGB)
            0x00, 0x00, 0x00          # compression, filter, interlace
        ])

        # Create a simple 1-pixel colored PNG instead
        png_content = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, r, g, b,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])

        with open(filename, 'wb') as f:
            f.write(png_content)

    return filename


def update_item_metadata(session, auth_token, item_uuid, subject):
    """Update item with enhanced metadata"""

    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    # Generate metadata values
    now = datetime.now()
    hijri_date = gregorian_to_hijri(now.year, now.month, now.day)
    abstract = random.choice(ABSTRACT_TEMPLATES).format(subject=subject)
    publisher = random.choice(PUBLISHERS)
    language = random.choice(LANGUAGES)
    item_type = random.choice(ITEM_TYPES)
    horizon_id = f"KFNL-{random.randint(100000, 999999)}"

    # Prepare patch operations
    operations = [
        {
            "op": "add",
            "path": "/metadata/dc.date.issuedhijri",
            "value": [{"value": hijri_date, "language": None}]
        },
        {
            "op": "add",
            "path": "/metadata/dc.description.abstract",
            "value": [{"value": abstract, "language": "ar"}]
        },
        {
            "op": "add",
            "path": "/metadata/dc.publisher",
            "value": [{"value": publisher, "language": "ar"}]
        },
        {
            "op": "add",
            "path": "/metadata/dc.language",
            "value": [{"value": LANGUAGE_NAMES.get(language, "العربية"), "language": "ar"}]
        },
        {
            "op": "add",
            "path": "/metadata/dc.type",
            "value": [{"value": item_type, "language": "ar"}]
        },
        {
            "op": "add",
            "path": "/metadata/local.identifier.horizonid",
            "value": [{"value": horizon_id, "language": None}]
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


def upload_thumbnail(session, auth_token, item_uuid):
    """Upload thumbnail to item"""
    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    # Get bundles
    headers = {"Authorization": auth_token}

    response = session.get(
        f"{BASE_URL}/core/items/{item_uuid}/bundles",
        headers=headers
    )

    thumbnail_bundle_uuid = None
    if response.status_code == 200:
        data = response.json()
        bundles = data.get('_embedded', {}).get('bundles', [])
        for bundle in bundles:
            if bundle.get('name') == 'THUMBNAIL':
                thumbnail_bundle_uuid = bundle.get('uuid')
                break

    # Create THUMBNAIL bundle if not exists
    if not thumbnail_bundle_uuid:
        csrf_token = get_fresh_csrf(session, auth_token)
        if csrf_token:
            session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

        bundle_headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": auth_token,
        }
        if csrf_token:
            bundle_headers["X-XSRF-TOKEN"] = csrf_token

        bundle_data = {"name": "THUMBNAIL", "metadata": {}}

        response = session.post(
            f"{BASE_URL}/core/items/{item_uuid}/bundles",
            headers=bundle_headers,
            json=bundle_data
        )

        if response.status_code in [200, 201]:
            bundle = response.json()
            thumbnail_bundle_uuid = bundle.get('uuid')

    if not thumbnail_bundle_uuid:
        return False

    # Upload thumbnail
    thumb_file = create_random_thumbnail()

    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    upload_headers = {"Authorization": auth_token}
    if csrf_token:
        upload_headers["X-XSRF-TOKEN"] = csrf_token

    with open(thumb_file, 'rb') as f:
        files = {'file': ('thumbnail.png', f, 'image/png')}
        response = session.post(
            f"{BASE_URL}/core/bundles/{thumbnail_bundle_uuid}/bitstreams",
            headers=upload_headers,
            files=files
        )

    return response.status_code in [200, 201]


def upload_collection_logo(session, auth_token, collection_uuid):
    """Upload random logo to collection"""
    csrf_token = get_fresh_csrf(session, auth_token)
    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    # Create random logo
    logo_file = create_random_thumbnail()

    upload_headers = {"Authorization": auth_token}
    if csrf_token:
        upload_headers["X-XSRF-TOKEN"] = csrf_token

    with open(logo_file, 'rb') as f:
        files = {'file': ('logo.png', f, 'image/png')}
        response = session.post(
            f"{BASE_URL}/core/collections/{collection_uuid}/logo",
            headers=upload_headers,
            files=files
        )

    return response.status_code in [200, 201]


def main():
    print("=" * 70)
    print("تحديث العناصر - مكتبة الملك فهد الوطنية")
    print("إضافة: صور مصغرة، ملخصات، تاريخ هجري، فلاتر")
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
    print("\n[3] تحديث العناصر...")
    print("=" * 70)

    updated_count = 0
    thumb_count = 0

    for i, item in enumerate(items, 1):
        item_uuid = item.get('uuid')
        item_name = item.get('name', 'Unknown')[:40]

        # Get subject from metadata
        metadata = item.get('metadata', {})
        subjects = metadata.get('dc.subject', [])
        subject = subjects[0].get('value', 'عام') if subjects else 'عام'

        # Update metadata
        if update_item_metadata(session, auth_token, item_uuid, subject):
            updated_count += 1

        # Upload thumbnail
        if upload_thumbnail(session, auth_token, item_uuid):
            thumb_count += 1

        if i % 50 == 0:
            print(f"   تم تحديث {i} من {len(items)} عنصر...")

    # Update collection logos
    print("\n[4] تحديث صور الحاويات...")
    collections = get_all_collections(session, auth_token)
    logo_count = 0

    for collection in collections:
        collection_uuid = collection.get('uuid')
        if upload_collection_logo(session, auth_token, collection_uuid):
            logo_count += 1

    # Summary
    print("\n" + "=" * 70)
    print("ملخص العملية")
    print("=" * 70)
    print(f"إجمالي العناصر المحدثة: {updated_count}")
    print(f"إجمالي الصور المصغرة: {thumb_count}")
    print(f"إجمالي صور الحاويات: {logo_count}")
    print("\nتم الانتهاء!")


if __name__ == "__main__":
    main()
