# PH-00 Foundation Core — Phase Gate Verification

## تاريخ التحقق

- تاريخ التحقق: 2026-05-28
- نوع المهمة: PH00-GATE-VERIFY-001
- النطاق: تدقيق واعتماد فقط، بدون تنفيذ Features جديدة.
- القرار النهائي: `PH-00 NOT APPROVED`

## نطاق التحقق

يشمل هذا التحقق PH-00 فقط:

- FND-001 — Auth login/logout/me
- FND-002 — Company model + APIs
- FND-003 — Branch model + APIs
- FND-004 — Fiscal periods
- FND-005 — Chart of Accounts foundation
- FND-006 — JournalEntry / JournalLine
- FND-007 — PostingService foundation
- FND-008 — Audit baseline

لا يشمل هذا التحقق:

- Purchases
- Sales
- Inventory source document posting
- Reports
- HR
- Coolify
- Backup scripts
- MFA / device trust
- advanced financial closing
- append-only/hash-chain audit storage

## مصادر التحقق

| المصدر | الحالة | الملاحظات |
| ------ | ------ | ---------- |
| `docs/PROJECT_PROGRESS_TRACKER_AR.md` | مقروء | استخدم لتحديد حالة PH-00 قبل Gate. |
| `docs/MASTER_PROJECT_MAP_AR.md` | مقروء | استخدم كمرجع ledger-first، audit، transaction safety، immutability. |
| `docs/api/API_REGISTRY.md` | مقروء | استخدم لمطابقة endpoints الخاصة بـ PH-00. |
| `docs/api/UI_COMPLETION_BACKLOG.md` | مقروء | استخدم لسجل PH00-COMPLETE-001 وتحديث المهمة الحالية. |
| `prisma/schema.prisma` | مقروء | استخدم للتحقق من `AuditLog`, `JournalEntry`, `FiscalPeriod`, `Company`, `Branch`, `Account`. |
| `package.json` | مقروء | استخدم لتحديد scripts والاختبارات. |
| ملفات `src/app/api/auth/**` | مقروءة | تدقيق login/logout/me وauth audit. |
| ملفات `src/app/api/companies/**` | مقروءة | تدقيق APIs الأساسية للشركات. |
| ملفات `src/app/api/branches/**` | مقروءة | تدقيق APIs الأساسية للفروع. |
| ملفات `src/app/api/fiscal-periods/**` | مقروءة | تدقيق APIs وحالات الفترات. |
| ملفات `src/app/api/accounts/**` و `accounts/tree` | مقروءة | تدقيق COA وعزل الشركة. |
| ملفات `src/app/api/journal-entries/**` | مقروءة | تدقيق القيود، الترحيل، العكس، audit داخل transaction. |
| ملفات `src/app/api/audit-logs/**` | مقروءة | تدقيق قراءة سجلات التدقيق. |
| `src/lib/auth.ts`, `src/lib/auth/audit.ts`, `src/lib/auth/session.ts` | مقروءة | تدقيق الصلاحيات والجلسات وauth audit. |
| `src/lib/services/period-guard.ts` | مقروء | تدقيق منع الترحيل في الفترات غير المسموحة. |
| `src/lib/services/posting-service.ts` | مقروء | تدقيق foundation posting. |
| `src/lib/__tests__/*` الخاصة بـ PH-00 | مشغلة | 274 اختبار PH-00 نجح. |
| `docs/qa/PHASE_COMPLETION_GATE_AR.md` | غير موجود | الملف المطلوب قراءته غير موجود في المستودع عند التحقق. |
| `docs/qa/ERP_DATA_INTEGRITY_REVIEW_AR.md` | غير موجود | الملف المطلوب قراءته غير موجود في المستودع عند التحقق. |
| `docs/qa/UI_RUNTIME_REVIEW_AR.md` | غير موجود | الملف المطلوب قراءته غير موجود في المستودع عند التحقق. |
| `docs/qa/TEST_FIXTURES_STRATEGY_AR.md` | غير موجود | الملف المطلوب قراءته غير موجود في المستودع عند التحقق. |
| `docs/qa/PHASE_GATE_CHECKLIST_TEMPLATE_AR.md` | غير موجود | الملف المطلوب قراءته غير موجود في المستودع عند التحقق. |

## جدول Gates

| Gate | النتيجة | الدليل | الملاحظات | القرار |
| ---- | ------- | ------ | ---------- | ------ |
| Architecture Gate | PASS WITH NOTES | `docs/PROJECT_PROGRESS_TRACKER_AR.md`, `docs/accounting/*`, `docs/architecture/*` | فلسفة ledger-first موجودة، لكن قاعدة Gate الإلزامية لم تكن موثقة قبل هذه المهمة. | مقبول بعد تحديث التوثيق |
| Data Model Gate | FAIL | `prisma/schema.prisma`, `src/lib/auth/audit.ts`, `src/app/api/journal-entries/[id]/reverse/route.ts` | `AuditLog.userId` إلزامي بينما `LOGIN_FAILED` قد لا يملك مستخدماً، وعكس القيد لا يملك علاقة reversal صريحة كافية. | غير معتمد |
| Backend/API Gate | FAIL | `/api/auth/login`, `/api/journal-entries/[id]/reverse`, `/api/accounts/tree` | endpoints موجودة وعزل الشركة موجود في tree، لكن failed-login audit قد لا يُحفظ، وعكس القيد يعلّم الأصل `REVERSED` بينما قيد العكس يبقى `DRAFT`. | غير معتمد |
| Accounting Integrity Gate | FAIL | `journal-entry-reversal.test.ts`, reverse route | القيد الأصلي يصبح `REVERSED` قبل وجود قيد عكس مرحّل فعلياً؛ هذا لا يكفي كتصحيح ledger-first آمن. | غير معتمد |
| Inventory Integrity Gate | NOT_APPLICABLE | PH-00 لا يكتب stock movements | لا يوجد تنفيذ مخزني داخل Foundation Core. | غير مطبق |
| UI Runtime Gate | LIMITED | `/auth/login -> 200`, protected dashboard routes redirect to login, protected APIs return 401 | لم تتوفر جلسة System Owner موثقة لتدقيق الصفحات المحمية end-to-end. لا توجد نتيجة runtime كاملة للصفحات المحمية. | يحتاج Runtime كامل قبل الاعتماد النهائي |
| Navigation Gate | PASS WITH NOTES | `src/components/layout/sidebar.tsx`, صفحات dashboard الخاصة بـ PH-00 | الروابط الأساسية موجودة، والتحويل للحماية يعمل بدون جلسة. | مقبول مع Runtime محدود |
| Permission/Security Gate | PASS WITH GAP | `requireDbPermission`, `canAccessCompany`, protected API smoke | الصلاحيات موجودة عموماً، لكن failed-login audit gap يمنع إغلاق Security/Audit بالكامل. | غير كاف للاعتماد |
| Testing Gate | PASS WITH GAPS | 9 ملفات PH-00 نجحت، full test suite نجح | الاختبارات الحالية تمر، لكنها لا تكشف مشكلة failed-login audit، وتثبت السلوك الحالي لعكس القيد بدل إثبات سلامته المحاسبية. | غير كاف للاعتماد |
| Documentation Gate | PASS WITH NOTES | تم إنشاء هذا الملف وتحديث tracker/backlog | ملفات QA المرجعية الخمسة غير موجودة، لذلك تم توثيق عدم توفرها. | مقبول مع ملاحظة |
| Data Integrity Gate | FAIL | `AuditLog.userId`, reverse source fields | سجلات auth الفاشلة قد تفشل بسبب FK، وعلاقة العكس غير صريحة بما يكفي لإثبات سلامة reversal-only correction. | غير معتمد |
| No Phase Leakage Gate | PASS | git diff الحالي بعد المهمة docs-only، مع وجود تغيير سابق غير تابع لم يتم لمسه | لم يتم تنفيذ Purchases/Sales/Reports/HR/Coolify ولم يتم تعديل Prisma أو الكود. | معتمد |

## جدول Tasks

| Task ID | المهمة | الحالة قبل التحقق | نتيجة Backend/API | نتيجة Data Integrity | نتيجة Accounting | نتيجة UI | نتيجة Navigation | نتيجة Security | نتيجة Tests | نتيجة Docs | القرار النهائي |
| ------- | ------ | ------------------ | ----------------- | -------------------- | ---------------- | -------- | ---------------- | -------------- | ------------ | --------- | -------------- |
| FND-001 | Auth login/logout/me | DONE | APIs موجودة، و`/api/auth/me` محمي | session payload يعمل؛ failed-login audit مرتبط بـ FND-008 | لا ينطبق مباشرة | `/auth/login` يرجع 200 | login route موجود | لا default JWT secret مثبت في الكود؛ يحتاج env في التشغيل | auth/session tests ناجحة | موثق | APPROVED WITH AUDIT GAP |
| FND-002 | Company model + APIs | DONE | `/api/companies` موجود | `Company` مرتبط بالكيانات الأساسية | لا ينطبق مباشرة | صفحة الشركات موجودة | رابط موجود | APIs محمية | coverage ضمن foundation/company binding | موثق | APPROVED |
| FND-003 | Branch model + APIs | DONE | `/api/branches` موجود | branch scoped بالشركة | لا ينطبق مباشرة | صفحة الفروع موجودة | رابط موجود | APIs محمية | coverage ضمن foundation | موثق | APPROVED |
| FND-004 | Fiscal periods | DONE | `/api/fiscal-periods` و`PeriodGuard` موجودان | periods scoped بالشركة والفرع عند الحاجة | يمنع `HARD_CLOSED`, `ARCHIVED`, `CLOSING_IN_PROGRESS`, `FUTURE`, `SOFT_CLOSED` | صفحة الفترات موجودة | رابط موجود | APIs محمية | period guard tests ناجحة | موثق | APPROVED |
| FND-005 | Chart of Accounts foundation | DONE | `/api/accounts`, `/api/accounts/tree` موجودة | tree API يطبق `canAccessCompany` | COA foundation موجود مع currency/account rules | صفحات الحسابات موجودة | رابط موجود | محمي بالصلاحيات | accounts-tree tests ناجحة | موثق | APPROVED |
| FND-006 | JournalEntry / JournalLine | DONE | create/update/delete/post/reverse موجودة | relation العكس غير كافية؛ قيد العكس DRAFT | FAIL بسبب عكس القيد: الأصل `REVERSED` وقيد العكس `DRAFT` | صفحات القيود موجودة، runtime محمي غير مكتمل | روابط موجودة | permissions موجودة | tests ناجحة لكنها لا تثبت السلامة المطلوبة | موثق | NOT APPROVED |
| FND-007 | PostingService foundation | DONE | PostingService موجود ويستخدم transaction | idempotency/operation tracking موجود | القيد المتوازن والترحيل الأساسي يعملان للقيود اليدوية | لا UI مباشر | لا ينطبق | يستقبل userId ويكتب audit داخل transaction | posting tests ناجحة | موثق | APPROVED FOR FOUNDATION ONLY |
| FND-008 | Audit baseline | DONE | audit logs API موجود، وfinancial audit داخل transaction | FAIL بسبب `AuditLog.userId` الإلزامي مع `recordAuthAudit` بدون userId | financial audit للقيود موجود؛ auth audit ناقص | صفحة audit موجودة | رابط موجود | failed-login audit قد لا يُحفظ | لا يوجد test يثبت حفظ failed-login audit بلا مستخدم | موثق | NOT APPROVED |

## FND-001 — Auth login/logout/me

### النتيجة

`APPROVED WITH AUDIT GAP`

### الأدلة

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/lib/auth/session.ts`
- `src/lib/__tests__/auth.test.ts`
- `src/lib/__tests__/session.test.ts`

### الملاحظات

- login/logout/me موجودة ومحمية.
- `/auth/login` يعمل في smoke محدود ويرجع 200.
- `/api/auth/me` بدون جلسة يرجع 401.
- فجوة audit في failed login تخص FND-008 لأنها تتعلق بتخزين سجل التدقيق.

### القرار

مقبول وظيفياً، لكنه لا يغلق PH-00 بسبب فجوة Audit baseline.

## FND-002 — Company model + APIs

### النتيجة

`APPROVED`

### الأدلة

- `Company` في `prisma/schema.prisma`
- `/api/companies`
- `/dashboard/companies`
- `company-binding.test.ts`

### الملاحظات

- النموذج وAPI والواجهة موجودة.
- لا توجد فجوة Gate حرجة ضمن PH-00.

## FND-003 — Branch model + APIs

### النتيجة

`APPROVED`

### الأدلة

- `Branch` في `prisma/schema.prisma`
- `/api/branches`
- `/dashboard/branches`

### الملاحظات

- الفروع موجودة ومربوطة بالشركة.
- لا توجد فجوة Gate حرجة ضمن PH-00.

## FND-004 — Fiscal periods

### النتيجة

`APPROVED`

### الأدلة

- `FiscalPeriod` في `prisma/schema.prisma`
- `/api/fiscal-periods`
- `src/lib/services/period-guard.ts`
- `period-guard.test.ts`

### الملاحظات

- `PeriodGuard` يمنع الفترات `HARD_CLOSED`, `ARCHIVED`, `CLOSING_IN_PROGRESS`, `FUTURE`, `SOFT_CLOSED`.
- closing engine المتقدم خارج PH-00 ولا يجب تنفيذه هنا.

## FND-005 — Chart of Accounts foundation

### النتيجة

`APPROVED`

### الأدلة

- `Account` في `prisma/schema.prisma`
- `/api/accounts`
- `/api/accounts/tree`
- `/dashboard/accounts`
- `accounts-tree.test.ts`

### الملاحظات

- `GET /api/accounts/tree` يطلب `companyId` ويطبق `canAccessCompany`.
- هذا يكفي Foundation Gate؛ currency/accounting rules العميقة تستمر ضمن Accounting phase.

## FND-006 — JournalEntry / JournalLine

### النتيجة

`NOT APPROVED`

### الفجوة الحرجة

عكس القيد الحالي ينشئ قيد عكس بحالة `DRAFT` ثم يحدّث القيد الأصلي إلى `REVERSED` داخل نفس transaction.

### السبب المحاسبي

- سياسة reversal-only correction تتطلب أن يكون أثر العكس واضحاً ومتكاملاً داخل ledger.
- اعتبار القيد الأصلي `REVERSED` قبل ترحيل قيد العكس فعلياً قد يجعل التقارير أو القراءة المحاسبية تعتبر الأصل معكوساً بينما قيد العكس لم يصبح `POSTED`.
- الاختبار الحالي يثبت هذا السلوك، لكنه لا يثبت سلامته المحاسبية.
- العلاقة الحالية تعتمد على `sourceType = "REVERSE"` و`sourceId = original.id`، ولا توجد علاقة reversal صريحة كافية لتدقيق كامل.

### القرار المطلوب لاحقاً

إنشاء مهمة PH-00 صغيرة لاحقة لتحديد سياسة العكس المعتمدة وتنفيذها بأمان، مثل:

- إما إنشاء قيد العكس كـ `POSTED` داخل نفس العملية مع audit واضح.
- أو إبقاء الأصل `POSTED` حتى يتم ترحيل قيد العكس ثم تحديث العلاقة والحالة.
- أو إضافة علاقة reversal صريحة إذا كان ذلك يتطلب تعديل Prisma بعد اعتماد قرار معماري.

## FND-007 — PostingService foundation

### النتيجة

`APPROVED FOR FOUNDATION ONLY`

### الأدلة

- `src/lib/services/posting-service.ts`
- `posting-service-foundation.test.ts`

### الملاحظات

- PostingService يطبق transaction عند ترحيل journal foundation.
- يكتب audit داخل transaction.
- يستخدم idempotency عبر `PostingOperation`.
- عدم تغطية source documents الخاصة بالمبيعات والمشتريات والمخزون خارج PH-00 وليس blocker في هذه البوابة.

## FND-008 — Audit baseline

### النتيجة

`NOT APPROVED`

### الفجوة الحرجة

`recordAuthAudit` يستخدم `userId: params.userId || "unknown"`، بينما `AuditLog.userId` إلزامي ومربوط بـ `User`.

### الأثر

- عند فشل تسجيل الدخول لا يوجد غالباً `userId`.
- محاولة إنشاء AuditLog بقيمة `"unknown"` قد تفشل بسبب foreign key.
- الدالة تلتقط الخطأ وتسجل `console.error` فقط، لذلك قد تضيع محاولة الدخول الفاشلة من audit trail.
- هذا يتعارض مع audit baseline وsecurity accountability داخل PH-00.

### القرار المطلوب لاحقاً

إنشاء مهمة PH-00 صغيرة لاحقة لمعالجة auth audit بدون كسر Prisma عشوائياً، مثل:

- اعتماد userId اختياري في AuditLog مع entity/email/ip عند عدم وجود مستخدم.
- أو إنشاء system/security actor رسمي.
- أو فصل `AuthAuditLog` إذا اعتمدت المعمارية ذلك.
- إضافة test يثبت حفظ failed-login audit بدون مستخدم فعلي.

## الفجوات خارج PH-00

هذه الفجوات تم ملاحظتها أو بقيت ضمن الخطة، لكنها لا يجب تنفيذها في PH00-GATE-VERIFY-001:

| الفجوة | المرحلة اللاحقة | سبب عدم التنفيذ هنا |
| ------ | --------------- | ------------------- |
| Sales source document posting عبر PostingService | PH-06 | تخص دورة المبيعات ولا تدخل Foundation Core. |
| Purchases posting وAP وstock IN | PH-07 | تخص دورة المشتريات ولا تدخل Foundation Core. |
| Inventory source document posting وvaluation layers | PH-05 | تخص محرك المخزون والتقييم. |
| Month-end/year-end close engine | Accounting / Enterprise Controls | خارج Foundation guard الأساسي. |
| FX revaluation | Financial Closing | خارج PH-00. |
| hash-chain / append-only audit storage | Security Hardening | Enterprise security لاحق. |
| MFA / device trust / IP restrictions | Security Hardening | ليست شرط Foundation Core الحالي. |
| Reports and BI | PH-08 | تعتمد على تثبيت source data. |
| Backup/restore scripts | PH-11 | ليست ضمن مهمة الاعتماد الحالية. |
| Coolify deployment | PH-15 | ممنوع في هذه المهمة. |

## اختبارات التحقق

| الفحص | النتيجة | التفاصيل |
| ----- | ------- | -------- |
| PH-00 targeted tests | PASS | 9 ملفات اختبار نجحت، 274 اختباراً نجح. |
| Full test suite | PASS | 22 ملف اختبار نجح، 533 اختباراً نجح. |
| Runtime smoke limited | LIMITED PASS | `/auth/login -> 200`, protected dashboard routes redirect to login, protected APIs return 401. |
| typecheck | NOT_RUN | لم يتم تعديل TypeScript في هذه المهمة. |
| build | NOT_RUN | لم يتم تعديل TypeScript في هذه المهمة. |

## القرار النهائي

`PH-00 NOT APPROVED`

لا يجوز الانتقال إلى PH-01 كمرحلة معتمدة حتى يتم إغلاق فجوتين داخل Foundation Core:

1. إصلاح سياسة Auth Audit عند فشل تسجيل الدخول بدون مستخدم.
2. إصلاح سياسة Journal Reversal بحيث لا يصبح القيد الأصلي `REVERSED` قبل وجود عكس محاسبي مرحّل أو علاقة reversal سليمة ومعتمدة.

## المهمة التالية داخل PH-00

`PH00-FIX-001 — Fix Foundation Gate Findings`

نطاقها المقترح:

- تحليل خيار audit model الآمن بدون كسر ledger-first.
- إصلاح failed-login audit بطريقة قابلة للاختبار.
- اعتماد وتنفيذ سياسة reversal journal الآمنة.
- إضافة اختبارات تثبت:
  - failed-login audit محفوظ أو موثق بشكل auditable.
  - العكس لا يخلق حالة Ledger متناقضة.
- إعادة تشغيل Phase Gate بعد الإصلاح.
