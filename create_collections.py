# -*- coding: utf-8 -*-
"""
DSpace API - Create Collections for King Fahd National Library Communities
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

# Communities with their Collections
COMMUNITIES_COLLECTIONS = {
    "8c53c763-59a2-4bc5-b32a-f31338e384c6": {  # مكتبة الملك فهد الوطنية - المجموعة الرئيسية
        "name": "مكتبة الملك فهد الوطنية - المجموعة الرئيسية",
        "collections": [
            {"name": "الإصدارات الرسمية للمكتبة", "description": "المطبوعات والإصدارات الرسمية الصادرة عن مكتبة الملك فهد الوطنية"},
            {"name": "الفهارس والأدلة البحثية", "description": "فهارس المكتبة وأدلة البحث والمراجع"},
            {"name": "التقارير السنوية", "description": "التقارير السنوية لأنشطة وإنجازات المكتبة"},
            {"name": "النشرات الإخبارية", "description": "النشرات الدورية والأخبار المتعلقة بالمكتبة"},
            {"name": "الببليوغرافيا الوطنية", "description": "الببليوغرافيا الوطنية السعودية"},
            {"name": "أرشيف المعارض والفعاليات", "description": "توثيق المعارض والفعاليات الثقافية"},
            {"name": "مشاريع الرقمنة", "description": "مخرجات مشاريع الرقمنة والحفظ الرقمي"},
            {"name": "الشراكات والتعاون الدولي", "description": "اتفاقيات ومشاريع التعاون مع المؤسسات الدولية"},
            {"name": "البحوث والدراسات المكتبية", "description": "البحوث والدراسات في علم المكتبات والمعلومات"},
            {"name": "الوثائق التأسيسية", "description": "الأنظمة واللوائح والوثائق التأسيسية للمكتبة"}
        ]
    },
    "2befa169-a99a-4a35-a273-cc438a1ada0e": {  # قسم المخطوطات والوثائق النادرة
        "name": "قسم المخطوطات والوثائق النادرة",
        "collections": [
            {"name": "المخطوطات الإسلامية", "description": "المخطوطات الإسلامية في الفقه والعقيدة والتفسير"},
            {"name": "المخطوطات الأدبية", "description": "مخطوطات الشعر والنثر والأدب العربي"},
            {"name": "المخطوطات العلمية", "description": "مخطوطات الطب والفلك والرياضيات والعلوم"},
            {"name": "المخطوطات التاريخية", "description": "مخطوطات التاريخ والسير والتراجم"},
            {"name": "الوثائق العثمانية", "description": "الوثائق والمراسلات من العهد العثماني"},
            {"name": "الوثائق السعودية القديمة", "description": "وثائق الدولة السعودية الأولى والثانية"},
            {"name": "المصاحف النادرة", "description": "نسخ المصاحف القديمة والنادرة"},
            {"name": "الخطوط والزخارف", "description": "نماذج الخط العربي والفنون الإسلامية"},
            {"name": "المجاميع والكشاكيل", "description": "المجاميع المخطوطة والكشاكيل العلمية"},
            {"name": "الإجازات العلمية", "description": "إجازات العلماء وأسانيد الرواية"}
        ]
    },
    "d5bb3623-02e2-42bd-bcb6-7c972fd48d6c": {  # قسم الكتب العربية
        "name": "قسم الكتب العربية",
        "collections": [
            {"name": "العلوم الشرعية", "description": "كتب الفقه والتفسير والحديث والعقيدة"},
            {"name": "اللغة العربية وآدابها", "description": "كتب النحو والصرف والبلاغة والأدب"},
            {"name": "التاريخ والجغرافيا", "description": "كتب التاريخ الإسلامي والعربي والجغرافيا"},
            {"name": "العلوم الاجتماعية", "description": "كتب علم الاجتماع والتربية والإعلام"},
            {"name": "العلوم التطبيقية", "description": "كتب الطب والهندسة والزراعة"},
            {"name": "الفنون والعمارة", "description": "كتب الفنون الإسلامية والعمارة"},
            {"name": "الفلسفة وعلم النفس", "description": "كتب الفلسفة والمنطق وعلم النفس"},
            {"name": "القانون والسياسة", "description": "كتب القانون والعلوم السياسية"},
            {"name": "الاقتصاد والإدارة", "description": "كتب الاقتصاد وإدارة الأعمال"},
            {"name": "المعارف العامة والموسوعات", "description": "الموسوعات والمعاجم والمراجع العامة"}
        ]
    },
    "fd63776a-8339-45d4-89b2-60bd7910086f": {  # قسم الكتب الأجنبية
        "name": "قسم الكتب الأجنبية",
        "collections": [
            {"name": "الدراسات الإسلامية بالإنجليزية", "description": "كتب الدراسات الإسلامية باللغة الإنجليزية"},
            {"name": "الدراسات العربية بالإنجليزية", "description": "كتب الدراسات العربية والشرق أوسطية"},
            {"name": "العلوم والتقنية", "description": "كتب العلوم والتكنولوجيا بالإنجليزية"},
            {"name": "الأدب الإنجليزي", "description": "روائع الأدب الإنجليزي والأمريكي"},
            {"name": "الكتب الفرنسية", "description": "المجموعة الفرنسية في مختلف المجالات"},
            {"name": "الكتب الألمانية", "description": "المجموعة الألمانية العلمية والثقافية"},
            {"name": "المستشرقون ودراساتهم", "description": "كتب المستشرقين عن الحضارة الإسلامية"},
            {"name": "الترجمات العالمية", "description": "ترجمات الكتب العربية إلى اللغات الأجنبية"},
            {"name": "المراجع والموسوعات الأجنبية", "description": "الموسوعات والمعاجم باللغات الأجنبية"},
            {"name": "الدوريات العلمية الأجنبية", "description": "المجلات والدوريات العلمية المحكمة"}
        ]
    },
    "73796b35-d2f4-4462-a95b-13aa7d9b919c": {  # قسم الدوريات والمجلات
        "name": "قسم الدوريات والمجلات",
        "collections": [
            {"name": "المجلات العلمية المحكمة", "description": "المجلات الأكاديمية والبحثية المحكمة"},
            {"name": "المجلات الثقافية", "description": "المجلات الثقافية والفكرية العربية"},
            {"name": "المجلات الأدبية", "description": "مجلات الأدب والشعر والنقد"},
            {"name": "الصحف والجرائد", "description": "أرشيف الصحف السعودية والعربية"},
            {"name": "المجلات التاريخية", "description": "مجلات التاريخ والآثار والتراث"},
            {"name": "مجلات الأطفال", "description": "مجلات الأطفال والناشئة"},
            {"name": "النشرات الحكومية", "description": "الجريدة الرسمية والنشرات الحكومية"},
            {"name": "المجلات المتخصصة", "description": "مجلات التخصصات المهنية والفنية"},
            {"name": "الدوريات الإلكترونية", "description": "المجلات والدوريات الرقمية"},
            {"name": "أرشيف الدوريات القديمة", "description": "الدوريات التاريخية والنادرة"}
        ]
    },
    "16bc498b-d384-44be-b3c4-04a4ecd9ced7": {  # قسم الرسائل الجامعية
        "name": "قسم الرسائل الجامعية",
        "collections": [
            {"name": "رسائل الدراسات الإسلامية", "description": "رسائل الماجستير والدكتوراه في الدراسات الإسلامية"},
            {"name": "رسائل اللغة العربية", "description": "رسائل اللغة العربية وآدابها واللسانيات"},
            {"name": "رسائل التاريخ", "description": "رسائل التاريخ والحضارة الإسلامية"},
            {"name": "رسائل العلوم الاجتماعية", "description": "رسائل التربية وعلم الاجتماع والإعلام"},
            {"name": "رسائل العلوم الطبيعية", "description": "رسائل الفيزياء والكيمياء والأحياء"},
            {"name": "رسائل الهندسة والتقنية", "description": "رسائل الهندسة وعلوم الحاسب"},
            {"name": "رسائل الطب والصحة", "description": "رسائل الطب والعلوم الصحية"},
            {"name": "رسائل الاقتصاد والإدارة", "description": "رسائل إدارة الأعمال والاقتصاد"},
            {"name": "رسائل القانون", "description": "رسائل الحقوق والقانون والأنظمة"},
            {"name": "رسائل الجامعات السعودية", "description": "رسائل جامعات المملكة العربية السعودية"}
        ]
    },
    "ddd7abb0-051c-4d63-8c04-aa82a53030a0": {  # قسم المواد السمعية والبصرية
        "name": "قسم المواد السمعية والبصرية",
        "collections": [
            {"name": "التسجيلات القرآنية", "description": "تلاوات القرآن الكريم للقراء المشهورين"},
            {"name": "المحاضرات العلمية", "description": "تسجيلات المحاضرات والندوات العلمية"},
            {"name": "الأفلام الوثائقية", "description": "الأفلام الوثائقية عن التاريخ والتراث السعودي"},
            {"name": "التسجيلات التاريخية", "description": "تسجيلات صوتية تاريخية نادرة"},
            {"name": "الشعر والأدب المسموع", "description": "تسجيلات الشعر والأمسيات الأدبية"},
            {"name": "الموسيقى والفنون", "description": "تسجيلات الموسيقى والفنون الشعبية"},
            {"name": "البرامج التعليمية", "description": "المواد التعليمية السمعية والبصرية"},
            {"name": "أرشيف التلفزيون", "description": "برامج ولقاءات تلفزيونية مؤرشفة"},
            {"name": "أرشيف الإذاعة", "description": "برامج إذاعية تاريخية وثقافية"},
            {"name": "الصور الفوتوغرافية", "description": "أرشيف الصور التاريخية والوثائقية"}
        ]
    },
    "2654942e-bfc1-46a6-bb11-7d26b27c5550": {  # قسم الخرائط والأطالس
        "name": "قسم الخرائط والأطالس",
        "collections": [
            {"name": "خرائط الجزيرة العربية", "description": "خرائط تاريخية وحديثة للجزيرة العربية"},
            {"name": "خرائط المملكة العربية السعودية", "description": "خرائط المملكة الطبوغرافية والإدارية"},
            {"name": "خرائط مكة والمدينة", "description": "خرائط الحرمين الشريفين عبر التاريخ"},
            {"name": "الخرائط الإسلامية القديمة", "description": "خرائط العالم الإسلامي التاريخية"},
            {"name": "خرائط طرق الحج", "description": "خرائط دروب الحج والقوافل التاريخية"},
            {"name": "الأطالس الجغرافية", "description": "الأطالس العربية والعالمية"},
            {"name": "الخرائط الجوية والفضائية", "description": "صور الأقمار الصناعية والتصوير الجوي"},
            {"name": "خرائط المدن السعودية", "description": "خرائط تفصيلية للمدن السعودية"},
            {"name": "الخرائط البحرية", "description": "خرائط السواحل والملاحة البحرية"},
            {"name": "الخرائط الجيولوجية", "description": "خرائط التضاريس والموارد الطبيعية"}
        ]
    },
    "7ac0232b-10e5-485f-9135-7e1041797f8d": {  # قسم التراث السعودي
        "name": "قسم التراث السعودي",
        "collections": [
            {"name": "تاريخ الدولة السعودية", "description": "وثائق ومراجع تاريخ الدولة السعودية"},
            {"name": "التراث الشعبي", "description": "الفنون الشعبية والعادات والتقاليد"},
            {"name": "الشعر النبطي", "description": "دواوين ومختارات الشعر النبطي"},
            {"name": "العمارة التقليدية", "description": "توثيق العمارة التراثية السعودية"},
            {"name": "الحرف والصناعات التقليدية", "description": "الحرف اليدوية والصناعات الشعبية"},
            {"name": "الأزياء والمنسوجات", "description": "الملابس والمنسوجات التراثية"},
            {"name": "الموروث الشفهي", "description": "الأمثال والحكايات والسير الشعبية"},
            {"name": "الأنساب والقبائل", "description": "كتب الأنساب وتاريخ القبائل"},
            {"name": "المناطق والمدن السعودية", "description": "تاريخ وتراث مناطق المملكة"},
            {"name": "الرحلات والاستكشاف", "description": "رحلات المستكشفين إلى الجزيرة العربية"}
        ]
    },
    "6b09f049-e50f-4485-81e9-7c1db6225997": {  # قسم المصادر الرقمية
        "name": "قسم المصادر الرقمية",
        "collections": [
            {"name": "الكتب الإلكترونية", "description": "مكتبة الكتب الإلكترونية المتاحة"},
            {"name": "قواعد البيانات", "description": "قواعد البيانات البحثية والعلمية"},
            {"name": "المخطوطات الرقمية", "description": "المخطوطات المرقمنة عالية الدقة"},
            {"name": "الصحف الرقمية", "description": "أرشيف الصحف والمجلات الرقمي"},
            {"name": "الوسائط المتعددة", "description": "المحتوى التفاعلي والوسائط المتعددة"},
            {"name": "المستودعات المؤسسية", "description": "مخرجات البحث العلمي المؤسسي"},
            {"name": "البيانات المفتوحة", "description": "مجموعات البيانات المفتوحة"},
            {"name": "التطبيقات التعليمية", "description": "التطبيقات والمنصات التعليمية"},
            {"name": "الأرشيف الرقمي", "description": "المحتوى المؤرشف رقمياً"},
            {"name": "المصادر التفاعلية", "description": "الخرائط والمحتوى التفاعلي"}
        ]
    }
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
    print("Getting CSRF token...")

    # Make initial request to trigger CSRF token generation
    response = session.post(
        f"{BASE_URL}/authn/login",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=""
    )

    csrf_token = get_csrf_token_from_response(response)
    print(f"CSRF Token: {csrf_token}")

    if not csrf_token:
        print("Warning: No CSRF token obtained!")
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
        print(f"Login successful!")
        return auth_token
    else:
        print(f"Login failed! Status: {response.status_code}")
        print(f"Response: {response.text}")
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


def create_collection(session, auth_token, community_uuid, collection_data):
    """Create a single collection under a community"""
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
        "name": collection_data["name"],
        "metadata": {
            "dc.title": [
                {
                    "value": collection_data["name"],
                    "language": "ar"
                }
            ],
            "dc.description": [
                {
                    "value": collection_data["description"],
                    "language": "ar"
                }
            ],
            "dc.description.abstract": [
                {
                    "value": collection_data["description"],
                    "language": "ar"
                }
            ]
        }
    }

    response = session.post(
        f"{BASE_URL}/core/collections?parent={community_uuid}",
        headers=headers,
        json=payload
    )

    return response


def main():
    print("=" * 70)
    print("DSpace API - Create Collections for King Fahd National Library")
    print("=" * 70)

    session = requests.Session()

    # Step 1: Login
    print("\n[1] Logging in...")
    auth_token = login(session)

    if not auth_token:
        print("Failed to authenticate. Exiting.")
        return

    # Step 2: Create collections for each community
    print("\n[2] Creating collections...")
    print("=" * 70)

    total_created = 0
    total_failed = 0

    for community_uuid, community_data in COMMUNITIES_COLLECTIONS.items():
        community_name = community_data["name"]
        collections = community_data["collections"]

        print(f"\n📁 المجتمع: {community_name}")
        print("-" * 60)

        for i, collection in enumerate(collections, 1):
            response = create_collection(session, auth_token, community_uuid, collection)

            if response.status_code in [200, 201]:
                result = response.json()
                uuid = result.get('uuid', 'N/A')
                total_created += 1
                print(f"   ✓ [{i}/10] {collection['name']}")
                print(f"           UUID: {uuid}")
            else:
                total_failed += 1
                print(f"   ✗ [{i}/10] {collection['name']} - فشل!")
                print(f"           Status: {response.status_code}")

    # Summary
    print("\n" + "=" * 70)
    print("ملخص العملية")
    print("=" * 70)
    print(f"إجمالي الحاويات المُنشأة: {total_created}")
    print(f"إجمالي الفشل: {total_failed}")
    print(f"النسبة المئوية للنجاح: {(total_created / (total_created + total_failed)) * 100:.1f}%")
    print("\nتم الانتهاء!")


if __name__ == "__main__":
    main()
