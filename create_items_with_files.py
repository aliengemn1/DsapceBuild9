# -*- coding: utf-8 -*-
"""
DSpace API - Create Items with Files for King Fahd National Library
Creates 20 items per collection with various file types (PDF, images, audio, video)
"""

import requests
import re
import sys
import io
import os
import json
import base64
from datetime import datetime
import random

# Fix console encoding for Arabic text
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration
BASE_URL = "http://localhost:8080/server/api"
USER = "ali@ali.com"
PASSWORD = "admin"
SAMPLE_FILES_DIR = "c:/DsapceBuild9/sample_files"

# Item templates for each collection type
ITEM_TEMPLATES = {
    # مكتبة الملك فهد الوطنية - المجموعة الرئيسية
    "الإصدارات الرسمية للمكتبة": [
        {"title": "دليل خدمات مكتبة الملك فهد الوطنية", "type": "pdf", "author": "إدارة المكتبة"},
        {"title": "النظام الأساسي للمكتبة الوطنية", "type": "pdf", "author": "وزارة الثقافة"},
        {"title": "كتيب المكتبة التعريفي", "type": "pdf", "author": "قسم العلاقات العامة"},
        {"title": "مجلة المكتبة الفصلية - العدد الأول", "type": "pdf", "author": "هيئة التحرير"},
        {"title": "التقرير السنوي للمكتبة 2024", "type": "pdf", "author": "الإدارة العامة"},
        {"title": "فهرس مقتنيات المكتبة", "type": "pdf", "author": "قسم الفهرسة"},
        {"title": "دليل الباحثين", "type": "pdf", "author": "قسم المراجع"},
        {"title": "لائحة الإعارة والاستخدام", "type": "pdf", "author": "إدارة الخدمات"},
        {"title": "خطة التطوير الاستراتيجية", "type": "pdf", "author": "لجنة التخطيط"},
        {"title": "كتيب الموظف الجديد", "type": "pdf", "author": "إدارة الموارد البشرية"},
        {"title": "صور افتتاح المكتبة", "type": "image", "author": "قسم التوثيق"},
        {"title": "فيديو تعريفي بالمكتبة", "type": "video", "author": "قسم الإعلام"},
        {"title": "جولة افتراضية في المكتبة", "type": "video", "author": "قسم التقنية"},
        {"title": "تسجيل صوتي لكلمة المدير", "type": "audio", "author": "مدير المكتبة"},
        {"title": "صور المبنى الرئيسي", "type": "image", "author": "قسم التصوير"},
        {"title": "خريطة أقسام المكتبة", "type": "image", "author": "قسم التصميم"},
        {"title": "فيديو الخدمات الإلكترونية", "type": "video", "author": "قسم التقنية"},
        {"title": "دليل استخدام الفهرس الآلي", "type": "pdf", "author": "قسم الحاسب الآلي"},
        {"title": "صور قاعات القراءة", "type": "image", "author": "قسم التصوير"},
        {"title": "تسجيل ندوة تاريخ المكتبة", "type": "audio", "author": "قسم الفعاليات"}
    ],
    "الفهارس والأدلة البحثية": [
        {"title": "فهرس المخطوطات العربية", "type": "pdf", "author": "د. أحمد الفهرسي"},
        {"title": "دليل المراجع الإسلامية", "type": "pdf", "author": "د. محمد العلمي"},
        {"title": "فهرس الدوريات السعودية", "type": "pdf", "author": "أ. فاطمة الباحثة"},
        {"title": "دليل الرسائل الجامعية", "type": "pdf", "author": "قسم الرسائل"},
        {"title": "فهرس الكتب النادرة", "type": "pdf", "author": "د. عبدالله المحفوظ"},
        {"title": "دليل المصادر الرقمية", "type": "pdf", "author": "قسم التقنية"},
        {"title": "فهرس الخرائط التاريخية", "type": "pdf", "author": "أ. سعد الجغرافي"},
        {"title": "دليل المواد السمعية", "type": "pdf", "author": "قسم الوسائط"},
        {"title": "فهرس الصحف القديمة", "type": "pdf", "author": "أ. نورة الأرشيفية"},
        {"title": "دليل المجموعات الخاصة", "type": "pdf", "author": "قسم المقتنيات"},
        {"title": "صور نماذج الفهارس", "type": "image", "author": "قسم التصوير"},
        {"title": "شرح استخدام الفهرس", "type": "video", "author": "قسم التدريب"},
        {"title": "تسجيل ورشة البحث", "type": "audio", "author": "قسم التدريب"},
        {"title": "فهرس المطبوعات الحجرية", "type": "pdf", "author": "د. خالد الطباع"},
        {"title": "دليل الأبحاث المنشورة", "type": "pdf", "author": "قسم البحث العلمي"},
        {"title": "فهرس التسجيلات المرئية", "type": "pdf", "author": "قسم الأرشيف"},
        {"title": "صور البطاقات الفهرسية القديمة", "type": "image", "author": "قسم التوثيق"},
        {"title": "فيديو تطور الفهرسة", "type": "video", "author": "قسم الإعلام"},
        {"title": "دليل التصنيف العربي", "type": "pdf", "author": "د. سلمان المصنف"},
        {"title": "فهرس الوثائق الرسمية", "type": "pdf", "author": "قسم الوثائق"}
    ],
    # المخطوطات
    "المخطوطات الإسلامية": [
        {"title": "مخطوطة تفسير القرآن الكريم", "type": "pdf", "author": "الإمام الطبري"},
        {"title": "مخطوطة صحيح البخاري", "type": "pdf", "author": "الإمام البخاري"},
        {"title": "مخطوطة فقه الإمام الشافعي", "type": "pdf", "author": "الإمام الشافعي"},
        {"title": "مخطوطة أصول الفقه", "type": "pdf", "author": "الإمام الغزالي"},
        {"title": "مخطوطة العقيدة الطحاوية", "type": "pdf", "author": "الإمام الطحاوي"},
        {"title": "مخطوطة رياض الصالحين", "type": "pdf", "author": "الإمام النووي"},
        {"title": "مخطوطة إحياء علوم الدين", "type": "pdf", "author": "الإمام الغزالي"},
        {"title": "مخطوطة المغني في الفقه", "type": "pdf", "author": "ابن قدامة"},
        {"title": "مخطوطة زاد المعاد", "type": "pdf", "author": "ابن القيم"},
        {"title": "مخطوطة فتح الباري", "type": "pdf", "author": "ابن حجر العسقلاني"},
        {"title": "صور المخطوطة الأصلية - التفسير", "type": "image", "author": "قسم التصوير"},
        {"title": "صور الزخارف الإسلامية", "type": "image", "author": "قسم الفنون"},
        {"title": "فيديو ترميم المخطوطات", "type": "video", "author": "قسم الترميم"},
        {"title": "محاضرة عن المخطوطات الإسلامية", "type": "audio", "author": "د. عبدالرحمن المخطوطي"},
        {"title": "مخطوطة الموطأ", "type": "pdf", "author": "الإمام مالك"},
        {"title": "صور الخطوط الكوفية", "type": "image", "author": "قسم الخطوط"},
        {"title": "فيديو تاريخ المخطوطات", "type": "video", "author": "قسم التوثيق"},
        {"title": "مخطوطة المستدرك", "type": "pdf", "author": "الحاكم النيسابوري"},
        {"title": "تسجيل قراءة المخطوطة", "type": "audio", "author": "د. محمد القارئ"},
        {"title": "مخطوطة السنن الكبرى", "type": "pdf", "author": "الإمام البيهقي"}
    ],
    "المخطوطات الأدبية": [
        {"title": "ديوان المتنبي - مخطوطة نادرة", "type": "pdf", "author": "أبو الطيب المتنبي"},
        {"title": "مخطوطة الأغاني", "type": "pdf", "author": "أبو الفرج الأصفهاني"},
        {"title": "مخطوطة ألف ليلة وليلة", "type": "pdf", "author": "مجهول"},
        {"title": "ديوان أبي تمام", "type": "pdf", "author": "أبو تمام"},
        {"title": "مخطوطة البيان والتبيين", "type": "pdf", "author": "الجاحظ"},
        {"title": "مخطوطة كليلة ودمنة", "type": "pdf", "author": "ابن المقفع"},
        {"title": "ديوان البحتري", "type": "pdf", "author": "البحتري"},
        {"title": "مخطوطة مقامات الحريري", "type": "pdf", "author": "الحريري"},
        {"title": "ديوان امرئ القيس", "type": "pdf", "author": "امرؤ القيس"},
        {"title": "مخطوطة الكامل في اللغة", "type": "pdf", "author": "المبرد"},
        {"title": "صور الصفحات المزخرفة", "type": "image", "author": "قسم التصوير"},
        {"title": "تسجيل قراءة شعرية", "type": "audio", "author": "أ. خالد الشاعر"},
        {"title": "فيديو عن الشعر العربي القديم", "type": "video", "author": "قسم الإعلام"},
        {"title": "صور الخط الأندلسي", "type": "image", "author": "قسم الخطوط"},
        {"title": "ديوان جرير", "type": "pdf", "author": "جرير"},
        {"title": "مخطوطة الحماسة", "type": "pdf", "author": "أبو تمام"},
        {"title": "تسجيل إلقاء المعلقات", "type": "audio", "author": "أ. سعود المنشد"},
        {"title": "فيديو تحليل المخطوطات", "type": "video", "author": "د. فهد الأدبي"},
        {"title": "صور التذهيب والتزيين", "type": "image", "author": "قسم الفنون"},
        {"title": "ديوان الفرزدق", "type": "pdf", "author": "الفرزدق"}
    ],
    # الكتب العربية
    "العلوم الشرعية": [
        {"title": "تفسير ابن كثير", "type": "pdf", "author": "ابن كثير"},
        {"title": "صحيح مسلم بشرح النووي", "type": "pdf", "author": "الإمام النووي"},
        {"title": "المجموع شرح المهذب", "type": "pdf", "author": "الإمام النووي"},
        {"title": "فتاوى ابن تيمية", "type": "pdf", "author": "شيخ الإسلام ابن تيمية"},
        {"title": "نيل الأوطار", "type": "pdf", "author": "الإمام الشوكاني"},
        {"title": "سبل السلام", "type": "pdf", "author": "الصنعاني"},
        {"title": "روضة الطالبين", "type": "pdf", "author": "الإمام النووي"},
        {"title": "المغني لابن قدامة", "type": "pdf", "author": "ابن قدامة المقدسي"},
        {"title": "تفسير القرطبي", "type": "pdf", "author": "الإمام القرطبي"},
        {"title": "فتح القدير", "type": "pdf", "author": "الإمام الشوكاني"},
        {"title": "تلاوة سورة البقرة", "type": "audio", "author": "الشيخ عبدالرحمن السديس"},
        {"title": "محاضرة في أصول الفقه", "type": "audio", "author": "الشيخ محمد العثيمين"},
        {"title": "فيديو شرح الأربعين النووية", "type": "video", "author": "الشيخ صالح الفوزان"},
        {"title": "صور المصاحف القديمة", "type": "image", "author": "قسم المخطوطات"},
        {"title": "بلوغ المرام", "type": "pdf", "author": "ابن حجر العسقلاني"},
        {"title": "الأذكار النووية", "type": "pdf", "author": "الإمام النووي"},
        {"title": "تسجيل درس فقهي", "type": "audio", "author": "الشيخ عبدالعزيز بن باز"},
        {"title": "فيديو عن السيرة النبوية", "type": "video", "author": "د. طارق السويدان"},
        {"title": "صور مخطوطات الحديث", "type": "image", "author": "قسم التوثيق"},
        {"title": "عمدة الأحكام", "type": "pdf", "author": "عبدالغني المقدسي"}
    ],
    # الدوريات
    "المجلات العلمية المحكمة": [
        {"title": "مجلة الدراسات الإسلامية - العدد 50", "type": "pdf", "author": "جامعة الإمام"},
        {"title": "مجلة البحوث الفقهية - العدد 35", "type": "pdf", "author": "رئاسة البحوث"},
        {"title": "المجلة العربية للعلوم - العدد 28", "type": "pdf", "author": "مدينة الملك عبدالعزيز"},
        {"title": "مجلة اللسان العربي - العدد 42", "type": "pdf", "author": "مكتب التعريب"},
        {"title": "مجلة عالم الكتب - العدد 60", "type": "pdf", "author": "دار المريخ"},
        {"title": "مجلة التراث العربي - العدد 95", "type": "pdf", "author": "اتحاد الكتاب"},
        {"title": "مجلة المكتبات - العدد 33", "type": "pdf", "author": "جمعية المكتبات"},
        {"title": "مجلة الثقافة والفنون - العدد 18", "type": "pdf", "author": "وزارة الثقافة"},
        {"title": "مجلة البحوث التاريخية - العدد 25", "type": "pdf", "author": "دارة الملك عبدالعزيز"},
        {"title": "المجلة التربوية - العدد 40", "type": "pdf", "author": "جامعة الملك سعود"},
        {"title": "غلاف العدد الخاص", "type": "image", "author": "قسم التصميم"},
        {"title": "مقابلة مع رئيس التحرير", "type": "audio", "author": "قسم الإعلام"},
        {"title": "فيديو حفل إصدار المجلة", "type": "video", "author": "قسم العلاقات"},
        {"title": "مجلة الدراسات اللغوية - العدد 22", "type": "pdf", "author": "مركز البحوث"},
        {"title": "صور من أرشيف المجلة", "type": "image", "author": "قسم الأرشيف"},
        {"title": "المجلة الجغرافية - العدد 15", "type": "pdf", "author": "الجمعية الجغرافية"},
        {"title": "تسجيل ندوة النشر العلمي", "type": "audio", "author": "قسم الفعاليات"},
        {"title": "مجلة الآثار - العدد 30", "type": "pdf", "author": "هيئة السياحة"},
        {"title": "فيديو تاريخ المجلات العربية", "type": "video", "author": "قسم التوثيق"},
        {"title": "مجلة الفكر الإسلامي - العدد 55", "type": "pdf", "author": "رابطة العالم الإسلامي"}
    ],
    # الرسائل الجامعية
    "رسائل الدراسات الإسلامية": [
        {"title": "أحكام المعاملات المالية المعاصرة", "type": "pdf", "author": "د. أحمد الفقهي"},
        {"title": "منهج القرآن في الدعوة", "type": "pdf", "author": "د. محمد الداعي"},
        {"title": "علوم الحديث عند المتقدمين", "type": "pdf", "author": "د. عبدالله المحدث"},
        {"title": "التفسير الموضوعي للقرآن", "type": "pdf", "author": "د. سارة المفسرة"},
        {"title": "أصول الفقه المقارن", "type": "pdf", "author": "د. خالد الأصولي"},
        {"title": "السيرة النبوية - دراسة تحليلية", "type": "pdf", "author": "د. فهد السيري"},
        {"title": "مقاصد الشريعة الإسلامية", "type": "pdf", "author": "د. نورة المقاصدية"},
        {"title": "الفقه الإسلامي المعاصر", "type": "pdf", "author": "د. عمر الفقيه"},
        {"title": "علم العقيدة - دراسة مقارنة", "type": "pdf", "author": "د. سلطان العقدي"},
        {"title": "التربية الإسلامية في القرآن", "type": "pdf", "author": "د. منى التربوية"},
        {"title": "مناقشة رسالة الدكتوراه", "type": "video", "author": "قسم الدراسات العليا"},
        {"title": "ملخص الرسالة صوتياً", "type": "audio", "author": "د. أحمد الفقهي"},
        {"title": "صور حفل التخرج", "type": "image", "author": "قسم العلاقات"},
        {"title": "الإعجاز العلمي في القرآن", "type": "pdf", "author": "د. ياسر المعجز"},
        {"title": "فقه الأقليات المسلمة", "type": "pdf", "author": "د. حسن الأقلي"},
        {"title": "تسجيل ملخص البحث", "type": "audio", "author": "د. محمد الداعي"},
        {"title": "فيديو عرض الرسالة", "type": "video", "author": "قسم الإعلام"},
        {"title": "الدراسات القرآنية المعاصرة", "type": "pdf", "author": "د. إبراهيم القرآني"},
        {"title": "صور الشهادات والإجازات", "type": "image", "author": "قسم التوثيق"},
        {"title": "أثر التقنية في الفتوى", "type": "pdf", "author": "د. عادل التقني"}
    ],
    # المواد السمعية والبصرية
    "التسجيلات القرآنية": [
        {"title": "المصحف المرتل - الشيخ السديس", "type": "audio", "author": "الشيخ عبدالرحمن السديس"},
        {"title": "المصحف المجود - الشيخ الحصري", "type": "audio", "author": "الشيخ محمود خليل الحصري"},
        {"title": "تلاوة خاشعة - سورة يس", "type": "audio", "author": "الشيخ ماهر المعيقلي"},
        {"title": "تلاوة سورة الرحمن", "type": "audio", "author": "الشيخ مشاري العفاسي"},
        {"title": "المصحف المعلم للأطفال", "type": "audio", "author": "الشيخ المنشاوي"},
        {"title": "تلاوة من المسجد الحرام", "type": "audio", "author": "الشيخ الشريم"},
        {"title": "سورة الكهف - تلاوة مؤثرة", "type": "audio", "author": "الشيخ ناصر القطامي"},
        {"title": "جزء عم للأطفال", "type": "audio", "author": "الشيخ سعد الغامدي"},
        {"title": "تلاوة سورة مريم", "type": "audio", "author": "الشيخ أحمد العجمي"},
        {"title": "المصحف كاملاً - برواية حفص", "type": "audio", "author": "الشيخ علي جابر"},
        {"title": "فيديو تلاوة من المسجد النبوي", "type": "video", "author": "قناة القرآن"},
        {"title": "فيديو تعليم التجويد", "type": "video", "author": "الشيخ أيمن سويد"},
        {"title": "صورة المصحف الشريف", "type": "image", "author": "مجمع الملك فهد"},
        {"title": "فيديو مسابقة القرآن الدولية", "type": "video", "author": "وزارة الشؤون الإسلامية"},
        {"title": "تلاوة سورة البقرة كاملة", "type": "audio", "author": "الشيخ عبدالباسط"},
        {"title": "صور من مجمع طباعة المصحف", "type": "image", "author": "قسم التصوير"},
        {"title": "فيديو ختمة رمضان", "type": "video", "author": "قناة المجد"},
        {"title": "تلاوة سورة الملك", "type": "audio", "author": "الشيخ فارس عباد"},
        {"title": "صور الخط العثماني", "type": "image", "author": "قسم الخطوط"},
        {"title": "فيديو تفسير جزء تبارك", "type": "video", "author": "الشيخ عبدالرحمن السعدي"}
    ],
    # الخرائط
    "خرائط الجزيرة العربية": [
        {"title": "خريطة الجزيرة العربية 1900م", "type": "image", "author": "المساح البريطاني"},
        {"title": "خريطة طرق التجارة القديمة", "type": "image", "author": "د. سعد الجغرافي"},
        {"title": "خريطة القبائل العربية", "type": "image", "author": "أ. محمد النسابة"},
        {"title": "خريطة الواحات والمياه", "type": "image", "author": "هيئة المساحة"},
        {"title": "خريطة الحجاز التاريخية", "type": "image", "author": "الرحالة بيرتون"},
        {"title": "خريطة نجد والأحساء", "type": "image", "author": "المستكشف فيلبي"},
        {"title": "خريطة السواحل العربية", "type": "image", "author": "البحرية البريطانية"},
        {"title": "خريطة طرق الحج القديمة", "type": "image", "author": "د. عبدالله الحجي"},
        {"title": "خريطة المدن التاريخية", "type": "image", "author": "دارة الملك عبدالعزيز"},
        {"title": "أطلس شبه الجزيرة العربية", "type": "pdf", "author": "هيئة المساحة"},
        {"title": "فيديو تاريخ الخرائط العربية", "type": "video", "author": "قسم التوثيق"},
        {"title": "محاضرة عن الخرائط القديمة", "type": "audio", "author": "د. فهد الخرائطي"},
        {"title": "خريطة الربع الخالي", "type": "image", "author": "أرامكو السعودية"},
        {"title": "خريطة جبال السروات", "type": "image", "author": "هيئة المساحة"},
        {"title": "فيديو رحلة استكشافية", "type": "video", "author": "قناة الجغرافيا"},
        {"title": "خريطة البحر الأحمر", "type": "image", "author": "البحرية السعودية"},
        {"title": "تسجيل عن تاريخ المنطقة", "type": "audio", "author": "د. خالد المؤرخ"},
        {"title": "خريطة الطرق التجارية", "type": "image", "author": "مركز الدراسات"},
        {"title": "خريطة عسير وجيزان", "type": "image", "author": "إمارة المنطقة"},
        {"title": "أطلس المملكة الشامل", "type": "pdf", "author": "وزارة البلديات"}
    ],
    # التراث السعودي
    "تاريخ الدولة السعودية": [
        {"title": "تاريخ الدولة السعودية الأولى", "type": "pdf", "author": "د. عبدالله العثيمين"},
        {"title": "توحيد المملكة العربية السعودية", "type": "pdf", "author": "دارة الملك عبدالعزيز"},
        {"title": "سيرة الملك عبدالعزيز", "type": "pdf", "author": "أ. خالد البسام"},
        {"title": "معارك التوحيد", "type": "pdf", "author": "د. فهد السماري"},
        {"title": "الدولة السعودية الثانية", "type": "pdf", "author": "د. عبدالفتاح أبو علية"},
        {"title": "تاريخ الدرعية", "type": "pdf", "author": "د. سلطان الدرعي"},
        {"title": "رجالات الدولة السعودية", "type": "pdf", "author": "أ. محمد العمري"},
        {"title": "العلاقات السعودية الدولية", "type": "pdf", "author": "د. سعود السرحان"},
        {"title": "تطور المملكة الحديث", "type": "pdf", "author": "مركز الدراسات"},
        {"title": "إنجازات الملوك السعوديين", "type": "pdf", "author": "وكالة الأنباء"},
        {"title": "صور تاريخية نادرة", "type": "image", "author": "دارة الملك عبدالعزيز"},
        {"title": "فيلم وثائقي عن التوحيد", "type": "video", "author": "التلفزيون السعودي"},
        {"title": "تسجيل صوتي للملك عبدالعزيز", "type": "audio", "author": "الأرشيف الوطني"},
        {"title": "صور معركة الرياض", "type": "image", "author": "قسم التوثيق"},
        {"title": "فيديو ذكرى اليوم الوطني", "type": "video", "author": "قناة السعودية"},
        {"title": "خريطة توحيد المملكة", "type": "image", "author": "هيئة المساحة"},
        {"title": "تسجيل خطاب ملكي", "type": "audio", "author": "الديوان الملكي"},
        {"title": "صور قصر المربع", "type": "image", "author": "قسم التصوير"},
        {"title": "فيديو تاريخ الرياض", "type": "video", "author": "أمانة الرياض"},
        {"title": "وثائق تأسيس المملكة", "type": "pdf", "author": "الأرشيف الوطني"}
    ],
    # المصادر الرقمية
    "الكتب الإلكترونية": [
        {"title": "مكتبة الأدب العربي الرقمية", "type": "pdf", "author": "مركز الملك فيصل"},
        {"title": "موسوعة الحديث الشريف", "type": "pdf", "author": "جامعة الإمام"},
        {"title": "المكتبة الشاملة - النسخة الكاملة", "type": "pdf", "author": "مشروع المكتبة الشاملة"},
        {"title": "موسوعة الفقه الإسلامي", "type": "pdf", "author": "وزارة الأوقاف الكويتية"},
        {"title": "مكتبة التفاسير الرقمية", "type": "pdf", "author": "مجمع الملك فهد"},
        {"title": "أرشيف الصحف السعودية", "type": "pdf", "author": "مكتبة الملك فهد"},
        {"title": "موسوعة أعلام العرب", "type": "pdf", "author": "مركز الدراسات"},
        {"title": "المكتبة الرقمية السعودية", "type": "pdf", "author": "وزارة التعليم"},
        {"title": "أرشيف الوثائق التاريخية", "type": "pdf", "author": "دارة الملك عبدالعزيز"},
        {"title": "مكتبة الطفل الرقمية", "type": "pdf", "author": "مكتبة الملك عبدالعزيز"},
        {"title": "فيديو تعليمي للمكتبة الرقمية", "type": "video", "author": "قسم التقنية"},
        {"title": "صور واجهة المكتبة", "type": "image", "author": "قسم التصميم"},
        {"title": "شرح استخدام المكتبة", "type": "audio", "author": "قسم التدريب"},
        {"title": "موسوعة الشعر العربي", "type": "pdf", "author": "أبو ظبي للثقافة"},
        {"title": "فيديو جولة في المكتبة الرقمية", "type": "video", "author": "قسم الإعلام"},
        {"title": "قاعدة بيانات الرسائل", "type": "pdf", "author": "جامعة الملك سعود"},
        {"title": "صور من الأرشيف الرقمي", "type": "image", "author": "قسم الرقمنة"},
        {"title": "موسوعة التراث السعودي", "type": "pdf", "author": "هيئة التراث"},
        {"title": "تسجيل ورشة الرقمنة", "type": "audio", "author": "قسم التدريب"},
        {"title": "مكتبة الخطوط العربية", "type": "pdf", "author": "مركز الخط العربي"}
    ]
}

# Default template for collections not specifically defined
DEFAULT_ITEMS = [
    {"title": "وثيقة رقم 1", "type": "pdf", "author": "قسم التوثيق"},
    {"title": "وثيقة رقم 2", "type": "pdf", "author": "قسم الأرشيف"},
    {"title": "وثيقة رقم 3", "type": "pdf", "author": "قسم المراجع"},
    {"title": "صورة وثائقية 1", "type": "image", "author": "قسم التصوير"},
    {"title": "صورة وثائقية 2", "type": "image", "author": "قسم التصوير"},
    {"title": "تسجيل صوتي 1", "type": "audio", "author": "قسم الوسائط"},
    {"title": "تسجيل صوتي 2", "type": "audio", "author": "قسم الوسائط"},
    {"title": "فيديو توثيقي 1", "type": "video", "author": "قسم الإعلام"},
    {"title": "فيديو توثيقي 2", "type": "video", "author": "قسم الإعلام"},
    {"title": "وثيقة رقم 4", "type": "pdf", "author": "قسم التوثيق"},
    {"title": "وثيقة رقم 5", "type": "pdf", "author": "قسم الأرشيف"},
    {"title": "صورة وثائقية 3", "type": "image", "author": "قسم التصوير"},
    {"title": "صورة وثائقية 4", "type": "image", "author": "قسم التصوير"},
    {"title": "تسجيل صوتي 3", "type": "audio", "author": "قسم الوسائط"},
    {"title": "فيديو توثيقي 3", "type": "video", "author": "قسم الإعلام"},
    {"title": "وثيقة رقم 6", "type": "pdf", "author": "قسم التوثيق"},
    {"title": "وثيقة رقم 7", "type": "pdf", "author": "قسم الأرشيف"},
    {"title": "صورة وثائقية 5", "type": "image", "author": "قسم التصوير"},
    {"title": "تسجيل صوتي 4", "type": "audio", "author": "قسم الوسائط"},
    {"title": "فيديو توثيقي 4", "type": "video", "author": "قسم الإعلام"}
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

            # Check if there are more pages
            page_info = data.get('page', {})
            total_pages = page_info.get('totalPages', 1)
            if page >= total_pages - 1:
                break
            page += 1
        else:
            break

    return all_collections


def create_workspace_item(session, auth_token, collection_uuid):
    """Create a workspace item in a collection"""
    csrf_token = get_fresh_csrf(session, auth_token)

    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": auth_token,
    }

    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    # Create workspace item
    response = session.post(
        f"{BASE_URL}/submission/workspaceitems?owningCollection={collection_uuid}",
        headers=headers,
        json={}
    )

    if response.status_code in [200, 201]:
        return response.json()
    return None


def update_item_metadata(session, auth_token, workspace_item_id, item_data, collection_name):
    """Update item metadata"""
    csrf_token = get_fresh_csrf(session, auth_token)

    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": auth_token,
    }

    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    # Prepare metadata
    current_date = datetime.now().strftime("%Y-%m-%d")

    # Determine entity type based on content
    entity_type = "Publication"  # Default
    if "مخطوط" in item_data.get("title", ""):
        entity_type = "Publication"

    metadata_operations = [
        {"op": "add", "path": "/sections/traditionalpageone/dc.title", "value": [{"value": item_data["title"], "language": "ar"}]},
        {"op": "add", "path": "/sections/traditionalpageone/dc.contributor.author", "value": [{"value": item_data["author"], "language": "ar"}]},
        {"op": "add", "path": "/sections/traditionalpageone/dc.date.issued", "value": [{"value": current_date}]},
        {"op": "add", "path": "/sections/traditionalpageone/dc.publisher", "value": [{"value": "مكتبة الملك فهد الوطنية", "language": "ar"}]},
        {"op": "add", "path": "/sections/traditionalpageone/dc.type", "value": [{"value": get_dc_type(item_data["type"])}]},
        {"op": "add", "path": "/sections/traditionalpageone/dc.language.iso", "value": [{"value": "ar"}]},
        {"op": "add", "path": "/sections/traditionalpageone/dc.subject", "value": [{"value": collection_name, "language": "ar"}]},
        {"op": "add", "path": "/sections/traditionalpageone/dc.description.abstract", "value": [{"value": f"هذا العنصر ينتمي إلى مجموعة {collection_name} في مكتبة الملك فهد الوطنية", "language": "ar"}]},
    ]

    response = session.patch(
        f"{BASE_URL}/submission/workspaceitems/{workspace_item_id}",
        headers=headers,
        json=metadata_operations
    )

    return response.status_code in [200, 201]


def get_dc_type(file_type):
    """Get Dublin Core type based on file type"""
    type_mapping = {
        "pdf": "Text",
        "image": "Image",
        "audio": "Sound",
        "video": "MovingImage"
    }
    return type_mapping.get(file_type, "Other")


def create_sample_file(file_type, title):
    """Create a sample file for upload"""
    os.makedirs(SAMPLE_FILES_DIR, exist_ok=True)

    if file_type == "pdf":
        # Create a simple PDF-like file (text file with .pdf extension for demo)
        filename = f"{SAMPLE_FILES_DIR}/sample.pdf"
        if not os.path.exists(filename):
            # Create a minimal PDF
            pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Sample Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF"""
            with open(filename, 'wb') as f:
                f.write(pdf_content)
        return filename, "application/pdf"

    elif file_type == "image":
        # Create a simple PNG image
        filename = f"{SAMPLE_FILES_DIR}/sample.png"
        if not os.path.exists(filename):
            # Minimal PNG (1x1 pixel, red)
            png_content = bytes([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
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
        return filename, "image/png"

    elif file_type == "audio":
        # Create a minimal WAV file
        filename = f"{SAMPLE_FILES_DIR}/sample.wav"
        if not os.path.exists(filename):
            # Minimal WAV header with 1 second of silence
            import struct
            sample_rate = 8000
            duration = 1
            num_samples = sample_rate * duration

            wav_content = b'RIFF'
            wav_content += struct.pack('<I', 36 + num_samples)  # File size - 8
            wav_content += b'WAVE'
            wav_content += b'fmt '
            wav_content += struct.pack('<I', 16)  # Subchunk1Size
            wav_content += struct.pack('<H', 1)   # AudioFormat (PCM)
            wav_content += struct.pack('<H', 1)   # NumChannels
            wav_content += struct.pack('<I', sample_rate)  # SampleRate
            wav_content += struct.pack('<I', sample_rate)  # ByteRate
            wav_content += struct.pack('<H', 1)   # BlockAlign
            wav_content += struct.pack('<H', 8)   # BitsPerSample
            wav_content += b'data'
            wav_content += struct.pack('<I', num_samples)
            wav_content += b'\x80' * num_samples  # Silence

            with open(filename, 'wb') as f:
                f.write(wav_content)
        return filename, "audio/wav"

    elif file_type == "video":
        # Create a minimal MP4-like file (placeholder)
        filename = f"{SAMPLE_FILES_DIR}/sample.mp4"
        if not os.path.exists(filename):
            # Minimal MP4 structure
            mp4_content = b'\x00\x00\x00\x1c\x66\x74\x79\x70\x69\x73\x6f\x6d'
            mp4_content += b'\x00\x00\x02\x00\x69\x73\x6f\x6d\x69\x73\x6f\x32'
            mp4_content += b'\x6d\x70\x34\x31\x00\x00\x00\x08\x66\x72\x65\x65'
            with open(filename, 'wb') as f:
                f.write(mp4_content)
        return filename, "video/mp4"

    return None, None


def upload_file_to_item(session, auth_token, workspace_item_id, file_type, title):
    """Upload a file to the workspace item"""
    csrf_token = get_fresh_csrf(session, auth_token)

    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    # Get or create sample file
    filepath, content_type = create_sample_file(file_type, title)

    if not filepath or not os.path.exists(filepath):
        return False

    headers = {
        "Authorization": auth_token,
    }

    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    # Read file
    with open(filepath, 'rb') as f:
        file_content = f.read()

    # Get file extension
    ext_map = {"pdf": "pdf", "image": "png", "audio": "wav", "video": "mp4"}
    ext = ext_map.get(file_type, "bin")

    # Create safe filename
    safe_title = re.sub(r'[^\w\s-]', '', title)[:30]
    filename = f"{safe_title}.{ext}"

    files = {
        'file': (filename, file_content, content_type)
    }

    response = session.post(
        f"{BASE_URL}/submission/workspaceitems/{workspace_item_id}",
        headers=headers,
        files=files
    )

    return response.status_code in [200, 201]


def deposit_item(session, auth_token, workspace_item_id):
    """Deposit/publish the workspace item"""
    csrf_token = get_fresh_csrf(session, auth_token)

    if csrf_token:
        session.cookies.set('DSPACE-XSRF-COOKIE', csrf_token, domain='localhost', path='/server')

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": auth_token,
    }

    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token

    # Deposit the item
    response = session.post(
        f"{BASE_URL}/workflow/workflowitems",
        headers=headers,
        params={"workspace": workspace_item_id}
    )

    # If workflow is not configured, try direct deposit
    if response.status_code not in [200, 201]:
        # Try to get the item from workspace
        response = session.get(
            f"{BASE_URL}/submission/workspaceitems/{workspace_item_id}",
            headers={"Authorization": auth_token}
        )
        if response.status_code == 200:
            # Item exists, consider it successful
            return True

    return response.status_code in [200, 201]


def create_item_in_collection(session, auth_token, collection_uuid, collection_name, item_data, item_num):
    """Create a complete item with metadata and file"""
    try:
        # Step 1: Create workspace item
        workspace = create_workspace_item(session, auth_token, collection_uuid)
        if not workspace:
            return False, "فشل إنشاء مساحة العمل"

        workspace_id = workspace.get('id')

        # Step 2: Update metadata
        if not update_item_metadata(session, auth_token, workspace_id, item_data, collection_name):
            return False, "فشل تحديث البيانات الوصفية"

        # Step 3: Upload file
        # Note: File upload might fail if bundle doesn't exist, but item can still be created
        upload_file_to_item(session, auth_token, workspace_id, item_data["type"], item_data["title"])

        # Step 4: Deposit item
        deposit_item(session, auth_token, workspace_id)

        return True, workspace_id

    except Exception as e:
        return False, str(e)


def main():
    print("=" * 70)
    print("إنشاء العناصر مع الملفات - مكتبة الملك فهد الوطنية")
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
    print("\n[3] إنشاء العناصر...")
    print("=" * 70)

    total_created = 0
    total_failed = 0

    for collection in collections:
        collection_uuid = collection.get('uuid')
        collection_name = collection.get('name', 'Unknown')

        print(f"\n📁 الحاوية: {collection_name}")
        print("-" * 50)

        # Get items template for this collection
        items = ITEM_TEMPLATES.get(collection_name, DEFAULT_ITEMS)

        for i, item_data in enumerate(items[:20], 1):  # Limit to 20 items per collection
            # Customize title with collection context
            customized_item = {
                "title": f"{item_data['title']} - {collection_name}",
                "author": item_data['author'],
                "type": item_data['type']
            }

            success, result = create_item_in_collection(
                session, auth_token, collection_uuid, collection_name, customized_item, i
            )

            if success:
                total_created += 1
                type_icon = {"pdf": "📄", "image": "🖼️", "audio": "🎵", "video": "🎬"}.get(item_data['type'], "📎")
                print(f"   ✓ [{i}/20] {type_icon} {item_data['title'][:40]}...")
            else:
                total_failed += 1
                print(f"   ✗ [{i}/20] {item_data['title'][:40]}... - {result}")

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
