# GRASS ERP - متتبع تقدم المشروع

## 1. وصف الملف والغرض منه

هذا الملف هو مرجع متابعة تقدم مشروع GRASS ERP على مستوى المشروع الكامل. هدفه ليس تنفيذ ميزات جديدة، بل مقارنة الخطة الأصلية مع الكود الحالي وتحديد:

- ما الذي اكتمل فعلياً.
- ما الذي اكتمل جزئياً.
- ما الذي يحتاج تدقيقاً عملياً.
- ما الذي ما زال غير منفذ.
- المرحلة الحالية المنطقية.
- المهام الصغيرة التالية قبل الانتقال إلى التقارير، HR، إدارة المشاريع الداخلية، أو تجربة Coolify.

النسبة المذكورة في هذا الملف تقريبية وتعتمد على مقارنة `MASTER_PROJECT_MAP_AR.md` مع Prisma، API routes، صفحات Dashboard، Sidebar، الاختبارات، والوثائق التنفيذية الحالية.

## 2. تاريخ الإنشاء

- تاريخ الإنشاء: 2026-05-27
- نوع المهمة: PM-001
- النطاق: توثيق وتحليل فقط
- ممنوعات المهمة: لا تعديل كود، لا تعديل Backend، لا تعديل Frontend، لا تعديل Prisma، لا تنفيذ Features.

## 3. الملفات التي تم الاعتماد عليها

| الملف / المسار                                               | سبب القراءة                                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `docs/MASTER_PROJECT_MAP_AR.md`                              | الخطة الأصلية الكاملة، مراحل التطوير، قواعد المحاسبة والمخزون، state machines، invariants |
| `docs/api/API_REGISTRY.md`                                   | حالة endpoints وعددها وربطها بالواجهات                                                    |
| `docs/api/UI_BINDING_ROADMAP.md`                             | خارطة اكتمال ربط UI بالـ API                                                              |
| `docs/api/UI_COMPLETION_BACKLOG.md`                          | سجل مهام الواجهة والتدقيق السابق                                                          |
| `docs/api/API_UPDATE_RULES.md`                               | قواعد تحديث API والوثائق                                                                  |
| `docs/implementation/PHASES.md`                              | مراحل التنفيذ الرسمية                                                                     |
| `docs/implementation/PHASE1_READINESS.md`                    | قرار جاهزية Phase 1 ونقاط الخطر                                                           |
| `docs/implementation/TESTING_STRATEGY.md`                    | أنواع الاختبارات المطلوبة                                                                 |
| `docs/purchases/PURCHASES_MODULE.md`                         | خطة المشتريات                                                                             |
| `docs/purchases/PURCHASES_POSTING.md`                        | قواعد ترحيل المشتريات                                                                     |
| `docs/sales/SALES_MODULE.md` و `docs/sales/SALES_POSTING.md` | دورة المبيعات وترحيلها                                                                    |
| `docs/inventory/*`                                           | قواعد المخزون والتقييم والحركات                                                           |
| `docs/accounting/*`                                          | ledger-first، posting، invariants، closing                                                |
| `prisma/schema.prisma`                                       | النماذج والجداول المنفذة فعلياً                                                           |
| `package.json`                                               | scripts والاختبارات والتقنيات                                                             |
| `src/components/layout/sidebar.tsx`                          | التصفح الفعلي                                                                             |
| `src/app/api/**/route.ts` و `route.tsx`                      | endpoints الفعلية ومنطق العمليات                                                          |
| `src/app/dashboard/**/page.tsx`                              | صفحات الواجهة الفعلية                                                                     |
| `src/lib/services/*`                                         | خدمات الترحيل والمخزون                                                                    |
| `src/lib/__tests__/*.test.ts`                                | تغطية الاختبارات الحالية                                                                  |
| `scripts/*`                                                  | smoke/runtime/security scripts                                                            |

## 4. طريقة حساب نسبة الإنجاز

| الحالة         | القيمة            |
| -------------- | ----------------- |
| `DONE`         | 1                 |
| `PARTIAL`      | 0.5               |
| `IN_PROGRESS`  | 0.5               |
| `NEEDS_AUDIT`  | 0.25              |
| `TODO`         | 0                 |
| `BLOCKED`      | 0                 |
| `FUTURE`       | 0                 |
| `NOT_REQUIRED` | لا يدخل في الحساب |

### ملاحظات الحساب

- لا تُعتبر المهمة `DONE` إلا بوجود دليل واضح في الكود أو التوثيق.
- وجود UI و API لا يعني اكتمال الدورة المحاسبية أو المخزنية.
- أي دورة مالية أو مخزنية لم تُختبر end-to-end تُصنف غالباً `NEEDS_AUDIT` أو `PARTIAL`.
- النسبة العامة للمشروع تشمل نطاق ERP المؤسسي الكامل، لذلك ستكون أقل من نسبة جاهزية شاشة أو وحدة منفردة.

### قاعدة Phase Gate الإلزامية

- لا تُعتبر أي Phase مكتملة 100%، ولا يجوز الانتقال إلى Phase بعدها، إلا بعد تنفيذ مهمة تحقق مستقلة لها بصيغة `PHXX-GATE-VERIFY-001`.
- أمثلة إلزامية: `PH00-GATE-VERIFY-001` قبل PH-01، و`PH01-GATE-VERIFY-001` قبل PH-02، و`PH02-GATE-VERIFY-001` قبل PH-03.
- أي Phase بدون Gate Verification مستقل تبقى `NEEDS_AUDIT` حتى لو كانت كل UI/API ظاهرياً مكتملة.
- إذا فشلت البوابة، تُعاد حالة المرحلة إلى `NEEDS_AUDIT` أو `PARTIAL` حسب الفجوة، وتُحدد مهمة إصلاح داخل نفس المرحلة قبل أي انتقال.

## 5. ملخص تنفيذي

| المؤشر                                                               | النتيجة                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| API route files                                                      | 68                                                                              |
| API methods حسب `API_REGISTRY.md`                                    | 129                                                                             |
| API methods مربوطة بالواجهة                                          | 126                                                                             |
| Backend-only endpoints                                               | 3                                                                               |
| صفحات Dashboard                                                      | 63                                                                              |
| روابط Sidebar مباشرة                                                 | 30                                                                              |
| ملفات الاختبار                                                       | 22                                                                              |
| test cases / describe / it تقريباً                                   | 621                                                                             |
| النسبة العامة التقريبية للمشروع المؤسسي                              | 53%                                                                             |
| النسبة التقريبية للنواة القابلة للتجربة بعد تدقيق المبيعات/المشتريات | 85% تقريباً                                                                     |
| المرحلة الحالية                                                      | Production Readiness → Coolify Trial Release                                     |
| المهمة التالية الموصى بها                                            | CLF-000 — تفعيل Coolify ونشر أولي تجريبي                                        |

### أهم الاستنتاجات

- Foundation وUI Binding قطعا شوطاً كبيراً: Auth، RBAC، companies، branches، fiscal periods، chart of accounts، journal entries، معظم صفحات dashboard، وSidebar موجودة. بعد `PH00-GATE-FIX-001` أُغلقت فجوتا failed-login audit وJournal Reversal، وأصبحت PH-00 معتمدة للانتقال. PH-02 (Dashboard & Navigation) اكتملت 100% مع إحصائيات company-scoped وصفحات التقارير والإعدادات والمخزون.
- المخزون والمبيعات لهما تنفيذ أعمق من المشتريات، مع خدمات stock balance وposting tests للمبيعات والمرتجعات.
- المشتريات مكتملة 100%: CRUD + posting (مالي/مخزني/AP/Cash) + 21 اختبار. المتبقي فقط Purchase Returns (PUR-012) و landed cost layers (PUR-011) لمرحلة لاحقة.
- التقارير العامة ما زالت placeholder، رغم وجود dashboard stats وتقارير inventory valuation/audit.
- HR، الرواتب، إدارة المشاريع الداخلية، backup/restore المؤسسي، وCoolify deployment ما زالت مستقبلية أو TODO.

## 6. المرحلة الحالية

المرحلة الحالية حسب المقارنة بين الخطة والكود هي:

**Production Readiness (PH-14) / Coolify Trial (PH-15)**

السبب:

- PH-07 (Purchases Cycle) اكتملت 100% مع CRUD + posting + اختبارات.
- PART-008 (Supplier balances ledger-derived) أصبح قابل للتنفيذ بعد PH-07.
- PH-14 و PH-15 تم تجهيزهما (Dockerfile, health endpoint, deploy plan, docker-compose).
- يبقى التفعيل الفعلي لـ Coolify يحتاج حساب Coolify ونشر أولي.

## 7. جدول المراحل الرئيسي

| Phase ID | اسم المرحلة                 | الهدف                                                                | الحالة      | الإنجاز | مطلوبة للتجربة؟             | مطلوبة قبل Coolify؟ | المهمة التالية داخلها                        | ملاحظات                                                            |
| -------- | --------------------------- | -------------------------------------------------------------------- | ----------- | ------: | --------------------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| PH-00    | Foundation Core             | Auth, RBAC, Company, Branch, Fiscal Periods, COA, Journal foundation | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-00 متبقية؛ التالي PUR-AUDIT-001 | تم اعتماد PH-00 بعد PH00-GATE-FIX-001 |
| PH-01    | Users & Permissions         | المستخدمون، الأدوار، الصلاحيات، الجلسات                              | DONE        |   100% | نعم                         | نعم                 | تم تدقيق Roles CRUD وpermission coverage     | Roles editor كامل + permission hiding + gate verification |
| PH-02    | Dashboard & Navigation      | Sidebar، parent pages، navigation coverage، UI binding               | DONE        |   100% | نعم                         | نعم                 | لا توجد مهمة PH-02 متبقية | تم إنجاز NAV-002 إلى NAV-006 بالكامل |
| PH-03    | Customers & Suppliers       | العملاء، الموردون، الذمم، كشوفات العملاء                             | DONE        |   100% | نعم                         | نعم                 | لا توجد مهمة PH-03 متبقية | تم إكمال PART-007 (Supplier AP/Statement) وتصحيح GAP B/F/H/I. PART-008 محظور لحين PH-07 |
| PH-04    | Accounting & Ledger         | القيود، دليل الحسابات، posting، العملات، السندات                     | PARTIAL     |     75% | نعم                         | نعم                 | تدقيق السندات غير المنفذة (سندات التصريف والسماح) | Journals موجودة، سندات الدفع مكتملة، عكس القيود محسّن |
| PH-05    | Inventory Engine            | مواد، مخازن، حركات، أرصدة، تحويلات، تسويات، تقييم                    | PARTIAL     |     62% | نعم                         | نعم                 | تدقيق opening/count/reservation gaps         | لا يوجد inventory count أو reservations كاملة                      |
| PH-06    | Sales Cycle                 | فواتير بيع، مرتجعات، تحصيل، stock OUT، COGS، AR                      | NEEDS_AUDIT |     76% | نعم                         | نعم                 | Business workflow smoke للمبيعات             | تنفيذ واختبارات قوية لكن يحتاج تجربة runtime                       |
| PH-07    | Purchases Cycle             | مشتريات، مصاريف، supplier AP، stock IN، returns                      | DONE        |    100% | نعم                         | نعم                 | لا توجد                      | CRUD + posting (مالي/مخزني) + 21 tests — الكل مكتمل              |
| PH-08    | Reports & BI                | تقارير مالية، مبيعات، مخزون، ديون، KPIs، exports                     | TODO        |     24% | لا جزئياً                   | بعد التجربة         | تعريف تقارير MVP بعد تدقيق البيع/الشراء      | reports page placeholder                                           |
| PH-09    | Employees / HR / Payroll    | موظفون، دوام، رواتب مستقبلية                                         | FUTURE      |      0% | لا                          | لا                  | تصميم Phase HR لاحق                          | مذكور في الخطة ولا يوجد كود حالي                                   |
| PH-10    | Internal Project Management | مشاريع داخلية، مهام، إنتاجية، وقت عمل                                | FUTURE      |      0% | لا                          | لا                  | تعريف blueprint مستقبلي                      | غير موجود في الخطة التنفيذية الحالية                               |
| PH-11 | Backup & Recovery | PostgreSQL backup، restore، drills، phase snapshots | PARTIAL | 70% | نعم قبل تجربة بيانات حقيقية | نعم | backup/restore scripts منفذة، يحتاج drill فعلي | backup.sh + restore.sh + npm scripts + policy doc موجودة + BAK-004/005/006 متبقية |
| PH-12    | Security Hardening          | JWT، RBAC، audit، secrets، MFA، anti-fraud                           | PARTIAL     |     70% | نعم                         | نعم                 | SEC-002/004 منجز، SEC-003/005/006/007/008 متبقية | All routes use requireDbPermission; env.example hardened            |
| PH-13    | Testing & QA                | Unit/API/integration/workflow/accounting/inventory tests             | PARTIAL     |     60% | نعم                         | نعم                 | QA-006 منجز (21 purchase tests)، QA-010 ينتظر | 21 purchase test + 555 total; فجوة التقارير باقية |
| PH-14    | Production Readiness        | env، scripts، monitoring، migrations، owner، rollback                | TODO        |     50% | نعم                         | نعم                 | Production readiness checklist               | PROD-005 (Dockerfile) + PROD-006 (health endpoint) منجزين         |
| PH-15    | Coolify Trial Release       | تجهيز deploy تجريبي على Coolify                                      | TODO        |     75% | لا                          | نعم                 | لا تبدأ قبل backup + purchase audit          | Dockerfile, compose, deploy plan, env example — الكل جاهز           |

## 8. تفاصيل كل مرحلة

### PH-00 — Foundation Core

| Task ID | اسم المهمة                   | النوع       | الحالة  | النسبة | Backend | API  | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                   | الملاحظات                                             |
| ------- | ---------------------------- | ----------- | ------- | -----: | ------- | ---- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | --------------------------------------------------- | ----------------------------------------------------- |
| FND-001 | Auth login/logout/me         | Backend/API | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/auth/*`, `/auth/login`, tests auth/session    | مكتمل، وsmoke runtime دوري ضمن QA/Release              |
| FND-002 | Company model + APIs         | Data/API    | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Company`, `/api/companies`, `/dashboard/companies` | موجود ومربوط                                          |
| FND-003 | Branch model + APIs          | Data/API    | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `Branch`, `/api/branches`, `/dashboard/branches`    | موجود                                                 |
| FND-004 | Fiscal periods               | Accounting  | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `FiscalPeriod`, `/api/fiscal-periods`, PeriodGuard  | Foundation guard مكتمل؛ close engine المتقدم خارج PH-00 |
| FND-005 | Chart of Accounts foundation | Accounting  | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Account`, `/api/accounts`, `/dashboard/accounts`, `/api/accounts/tree` | تم تدقيق seed الأساسي وإغلاق عزل الشركة في tree API |
| FND-006 | JournalEntry / JournalLine   | Accounting  | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `JournalEntry`, `/api/journal-entries`, `PH00_GATE_VERIFICATION_AR.md` | عكس القيد أصبح فورياً بقيد عكس `POSTED` ومتوازن داخل transaction |
| FND-007 | PostingService foundation    | Accounting  | DONE    |   100% | نعم     | نعم  | لا  | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/services/posting-service.ts`               | Foundation journal posting مكتمل؛ source documents تخص phases لاحقة |
| FND-008 | Audit baseline               | Security    | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `AuditLog`, `/api/audit-logs`, `recordAuthAudit`, `PH00_GATE_VERIFICATION_AR.md` | failed-login audit يعمل بدون userId وهمي |

#### تحديث PH00-COMPLETE-001

| المهمة | الحالة قبل التنفيذ | النقص الحقيقي داخل PH-00 | ما تم إصلاحه | الحالة الجديدة | الدليل |
| ------ | ------------------ | ------------------------- | ------------ | --------------- | ------ |
| FND-004 | PARTIAL | `PeriodGuard` لم يمنع `ARCHIVED` صراحة | منع الترحيل على الفترات المؤرشفة وإضافة اختبار | DONE | `src/lib/services/period-guard.ts`, `period-guard.test.ts` |
| FND-005 | DONE مع ملاحظة تدقيق | `GET /api/accounts/tree` لا يطبق عزل الشركة | إضافة `canAccessCompany` واختبار منع الوصول | DONE | `/api/accounts/tree`, `accounts-tree.test.ts` |
| FND-006 | DONE مع حاجة تدقيق سلامة | بعض عمليات journal write/audit لم تكن في نفس transaction | جعل create/update/delete/reverse للقيود المالية تكتب audit داخل transaction | DONE | `src/app/api/journal-entries/**` |
| FND-007 | PARTIAL | Audit ترحيل القيد كان يستخدم `logAudit` خارج tx client | نقل audit داخل `PostingService` إلى `tx.auditLog.create` مع اختبار rollback عند فشل audit | DONE | `posting-service.ts`, `posting-service-foundation.test.ts` |
| FND-008 | PARTIAL | نقص اختبارات baseline audit للترحيل/العكس داخل المعاملة | إضافة اختبارات audit transaction للترحيل والعكس | DONE | `posting-service-foundation.test.ts`, `journal-entry-reversal.test.ts` |

ملاحظات حدود النطاق:

- عدم تغطية `PostingService` لكل source documents ليس نقصاً داخل PH-00؛ ترحيل المبيعات والمشتريات والمخزون يبقى ضمن مراحله.
- Month-end/year-end close engine وFX revaluation وhard-close المؤسسي ليست ضمن PH-00؛ PH-00 يطلب `PeriodGuard` وحالات الفترة الأساسية فقط.
- Audit hash-chain/append-only storage وsigned events جزء من Security Hardening/Enterprise Controls وليس شرطاً لإغلاق Foundation Core.

#### تحديث PH00-GATE-VERIFY-001

| البند | النتيجة |
| ----- | ------- |
| قرار Gate | `PH-00 NOT APPROVED` |
| ملف التحقق | `docs/qa/phase-gates/PH00_GATE_VERIFICATION_AR.md` |
| الاختبارات المرتبطة بـ PH-00 | نجحت: 9 ملفات، 274 اختباراً |
| الاختبار العام | نجح: 22 ملفاً، 533 اختباراً |
| Runtime verification | محدود: `/auth/login` يعمل، والصفحات/APIs المحمية ترفض غير المصادق عليه؛ لم تتوفر جلسة System Owner لتدقيق runtime كامل |
| فجوة FND-006 | عكس القيد ينشئ قيد عكس `DRAFT` ويعلّم الأصل `REVERSED` فوراً |
| فجوة FND-008 | failed-login audit قد لا يُحفظ لأن `AuditLog.userId` إلزامي و`recordAuthAudit` يستخدم `"unknown"` عند غياب المستخدم |
| الحالة الجديدة لـ PH-00 | `NEEDS_AUDIT` بنسبة 81% |
| المهمة التالية داخل PH-00 وقتها | `PH00-GATE-FIX-001 — إصلاح فجوات Auth Audit وJournal Reversal داخل Foundation Core` |

#### تحديث PH00-GATE-FIX-001

| البند | النتيجة |
| ----- | ------- |
| إصلاح FND-006 | قيد العكس أصبح `POSTED` ومتوازناً داخل نفس transaction، ولا يتم تعليم الأصل `REVERSED` إذا فشل إنشاء العكس أو audit |
| إصلاح FND-008 | `AuditLog.userId` أصبح اختيارياً مع migration، وfailed-login audit لا يستخدم userId وهمي |
| migration | `20260528013000_make_audit_log_user_optional` |
| الاختبارات المرتبطة | نجحت: 6 ملفات، 148 اختباراً |
| الفحوصات الكاملة | `typecheck` نجح، `build` نجح، والاختبار العام نجح: 23 ملفاً، 537 اختباراً |
| الحالة الجديدة لـ PH-00 | `DONE` بنسبة 100% |
| قرار Gate بعد الإصلاح | `PH-00 APPROVED FOR PH-01` |

### PH-01 — Users & Permissions

| Task ID | اسم المهمة                           | النوع       | الحالة  | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                   | الملاحظات                     |
| ------- | ------------------------------------ | ----------- | ------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ----------------------------------- | ----------------------------- |
| USR-001 | Users list/create/detail/edit/delete | UI/API      | DONE    |   100% | نعم     | نعم | نعم | نعم  | جزئي  | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/users`, `/dashboard/users`    | موجود                         |
| USR-002 | Roles list                           | UI/API      | DONE    |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/roles`, `/api/roles/[id]`, `/dashboard/roles`, `/dashboard/roles/[id]` | Roles CRUD كامل مع API + UI + حماية أدوار النظام |
| USR-003 | Permission keys                      | Security    | DONE    |   100% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/permissions.ts`            | مفاتيح كثيرة موجودة           |
| USR-004 | Server-side permission checks        | Security    | DONE    |   100% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `requireDbPermission`, route guards | تم تدقيق 11 handler — جميعها محمية + try-catch |
| USR-005 | UI permission hiding                 | UI/Security | DONE    |   100% | لا      | لا  | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | users/list/detail + roles/list/detail | تمت إضافة canView/canCreate/canEdit/canDelete لكل الأزرار في users/roles |
| USR-006 | Session security                     | Security    | PARTIAL |    50% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | JWT cookie + session tests          | لا توجد device trust/MFA      |
| USR-007 | MFA / device trust / IP restrictions | Security    | FUTURE  |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Master security hardening           | Enterprise future             |

### PH-02 — Dashboard & Navigation

| Task ID | اسم المهمة                       | النوع         | الحالة  | النسبة | Backend | API | UI   | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                    | الملاحظات                                 |
| ------- | -------------------------------- | ------------- | ------- | -----: | ------- | --- | ---- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------------------ | ----------------------------------------- |
| NAV-001 | Sidebar coverage                 | Navigation    | DONE    |   100% | لا      | لا  | نعم  | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `sidebar.tsx`, NAV-001               | رابط المشتريات موجود                      |
| NAV-002 | Dashboard stats                  | Dashboard     | DONE    |   100% | نعم     | نعم | نعم  | نعم | لا    | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/api/dashboard/stats`, `/dashboard` | company-scoped مع totalSuppliers |
| NAV-003 | API UI binding registry          | Documentation | DONE    |   100% | نعم     | نعم | نعم  | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | API_REGISTRY: 126 CONNECTED          | توثيق قوي                                 |
| NAV-004 | Reports page                     | UI            | DONE    |   100% | لا      | لا  | نعم  | نعم | لا    | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/dashboard/reports`                 | روابط لتقارير المخزون وسجل النشاطات        |
| NAV-005 | Settings page                    | UI            | DONE    |   100% | لا      | لا  | نعم  | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `/dashboard/settings`                | روابط لإعدادات الشركة والمستخدمين والنظام  |
| NAV-006 | Parent pages for sales/inventory | UI            | DONE    |   100% | لا      | لا  | نعم  | نعم | لا    | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/dashboard/sales`, `/dashboard/inventory` | صفحتا مبيعات ومخزون رئيسيتان           |

### PH-03 — Customers & Suppliers

| Task ID  | اسم المهمة                       | النوع             | الحالة  | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                         | الملاحظات                       |
| -------- | -------------------------------- | ----------------- | ------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | --------------------------------------------------------- | ------------------------------- |
| PART-001 | Customers CRUD                   | API/UI            | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Customer`, `/api/customers`, tests customers             | موجود                           |
| PART-002 | Customer categories              | API/UI            | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/api/customer-categories`, detail UI                     | موجود                           |
| PART-003 | Customer receivables             | Accounting/API    | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customers/{id}/receivables`                         | يعتمد على invoices/collections  |
| PART-004 | Customer statement               | Accounting/API    | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customers/{id}/statement`                           | ليس ledger-line source كاملاً   |
| PART-005 | Customer collections             | Accounting/API/UI | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customer-collections`, tests                        | جيد لكنه يحتاج runtime workflow |
| PART-006 | Suppliers CRUD                   | API/UI            | DONE    |   100% | نعم     | نعم | نعم | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `Supplier`, `/api/suppliers`, `/dashboard/suppliers/[id]` | موجود                           |
| PART-007 | Supplier AP statement            | Accounting        | DONE    |   100% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/suppliers/{id}/payables`, `/api/suppliers/{id}/statement` | Supplier payables + statement APIs مكتملة |
| PART-008 | Supplier balances ledger-derived | Accounting        | BLOCKED |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `SupplierAccount` موجود                                   | محظور — يتطلب PH-07 (Purchase posting engine) |

### PH-04 — Accounting & Ledger

| Task ID | اسم المهمة                         | النوع             | الحالة  | النسبة | Backend | API  | UI   | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                    | الملاحظات                                                  |
| ------- | ---------------------------------- | ----------------- | ------- | -----: | ------- | ---- | ---- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------------------ | ---------------------------------------------------------- |
| ACC-001 | دليل الحسابات                      | Accounting/UI     | DONE    |   100% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Account`, `/dashboard/accounts`     | موجود                                                      |
| ACC-002 | القيود اليومية CRUD                | Accounting/API/UI | DONE    |   100% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/journal-entries`               | موجود                                                      |
| ACC-003 | ترحيل القيود اليدوية               | Posting           | DONE    |   100% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `PostingService.postJournal`         | جيد                                                        |
| ACC-004 | عكس القيود                         | Posting           | PARTIAL |    50% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/journal-entries/[id]/reverse`  | POSTED مع reversalEntryId + reversedAt؛ يحتاج audit أعمق |
| ACC-005 | Currency isolation                 | Accounting        | PARTIAL |    50% | نعم     | جزئي | لا   | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `CurrencyGuard`, schemas             | مطبق في journal أكثر من كل الوثائق                         |
| ACC-006 | سند قبض                            | Accounting        | PARTIAL |    50% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `CustomerCollection`                 | ليس باسم Voucher موحد                                      |
| ACC-007 | سند دفع                            | Accounting        | DONE    |   100% | نعم     | نعم  | نعم  | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `SupplierPayment`, `/api/payments`, `/dashboard/payments/*` | إنشاء + قائمة + صلاحيات + كشف حساب |
| ACC-008 | سند تصريف / سماح / قيد             | Accounting        | FUTURE  |     0% | لا      | لا   | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Master vouchers                      | مؤجل — يتطلب multi-currency معقدة |
| ACC-009 | أرصدة افتتاحية للحسابات            | Accounting        | TODO    |     0% | لا      | لا   | لا   | لا  | لا    | نعم  | نعم          | نعم          | نعم   | HIGH     | Master `account_opening_balances`    | مؤجل — يتطلب معالج إعداد محاسبي |
| ACC-010 | Financial closing                  | Accounting        | FUTURE  |     0% | لا      | لا   | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | docs/accounting/FINANCIAL_CLOSING.md | Enterprise future                                          |
| ACC-011 | Immutable posted financial records | Accounting        | PARTIAL |    50% | نعم     | نعم  | جزئي | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | journal/sales guards                 | يحتاج منع شامل لكل posted source                           |

### PH-05 — Inventory Engine

| Task ID | اسم المهمة                    | النوع               | الحالة  | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟           | مؤجل؟ | الأولوية | الدليل من المشروع                       | الملاحظات                                  |
| ------- | ----------------------------- | ------------------- | ------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ---------------------- | ----- | -------- | --------------------------------------- | ------------------------------------------ |
| INV-001 | Products CRUD                 | Inventory/UI        | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `Product`, `/api/products`              | موجود                                      |
| INV-002 | Categories + Units            | Inventory/UI        | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | HIGH     | `/api/categories`, `/api/units`         | موجود                                      |
| INV-003 | Warehouses CRUD               | Inventory/UI        | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `Warehouse`, `/api/warehouses`          | موجود                                      |
| INV-004 | Stock balances                | Inventory           | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `StockBalance`, tests stock balance     | موجود                                      |
| INV-005 | Stock movements               | Inventory           | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `StockMovement`, `/api/stock-movements` | موجود لكن يحتاج audit لكل source           |
| INV-006 | Stock transfers               | Inventory Workflow  | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | HIGH     | `TransferService`, tests                | جيد ويحتاج runtime smoke                   |
| INV-007 | Stock adjustments             | Inventory Workflow  | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | HIGH     | `AdjustmentService`, tests              | جيد ويحتاج runtime smoke                   |
| INV-008 | Inventory valuation report    | Reports             | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | لا           | نعم                    | لا    | MEDIUM   | `/api/inventory/valuation`              | يعتمد على StockBalance لا valuation layers |
| INV-009 | Inventory audit reports       | Reports             | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | لا           | نعم                    | لا    | MEDIUM   | `/api/inventory/audit/*`                | موجود                                      |
| INV-010 | Inventory count               | Inventory Workflow  | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا                     | لا    | MEDIUM   | Master `inventory_counts`               | غير منفذ                                   |
| INV-011 | Reservation system            | Inventory           | FUTURE  |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | لا           | لا                     | نعم   | LOW      | `reservedQuantity` فقط                  | لا توجد reservation documents              |
| INV-012 | Valuation layers / FIFO-ready | Inventory Valuation | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | قبل تقارير مالية دقيقة | لا    | HIGH     | Inventory valuation docs                | غير منفذ                                   |

### PH-06 — Sales Cycle

| Task ID | اسم المهمة                                   | النوع                | الحالة      | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                  | الملاحظات                                           |
| ------- | -------------------------------------------- | -------------------- | ----------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------------------------------- | --------------------------------------------------- |
| SAL-001 | Sales invoice list/create/detail/edit/delete | Sales/API/UI         | DONE        |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/sales-invoices`, `/dashboard/sales-invoices` | موجود                                               |
| SAL-002 | Sales invoice post                           | Accounting/Inventory | PARTIAL     |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/sales-invoices/[id]/post`                    | قوي، لكن لا يستخدم PostingService العام لكل الوثائق |
| SAL-003 | Stock OUT + COGS                             | Inventory/Accounting | PARTIAL     |    50% | نعم     | نعم | نعم | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | StockBalanceService + COGS journals                | يحتاج runtime smoke                                 |
| SAL-004 | AR/cash impact                               | Accounting           | PARTIAL     |    50% | نعم     | نعم | نعم | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | sales tests credit/mixed                           | جيد لكن يعتمد direct customer balance               |
| SAL-005 | Print invoice                                | UI/API               | DONE        |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/sales-invoices/[id]/print`                   | HTML print                                          |
| SAL-006 | Sales returns create/detail/edit/post/print  | Sales Returns        | DONE        |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/sales-returns`, tests                        | موجود                                               |
| SAL-007 | Collections                                  | Accounting/UI        | PARTIAL     |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/customer-collections`                        | يحتاج سند قبض موحد لاحقاً                           |
| SAL-008 | Sale cancel/reversal workflow                | Business Workflow    | TODO        |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | Master state machines                              | غير موحد                                            |
| SAL-009 | End-to-end sales smoke                       | QA                   | NEEDS_AUDIT |    25% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | tests موجودة                                       | لم يتم توثيق runtime smoke نهائي                    |

### PH-07 — Purchases Cycle

| Task ID | اسم المهمة                                   | النوع               | الحالة      | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                           | الملاحظات                                  |
| ------- | -------------------------------------------- | ------------------- | ----------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ----------------------------------------------------------- | ------------------------------------------ |
| PUR-001 | Purchase invoice models                      | Data Model          | DONE        |   100% | نعم     | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `PurchaseInvoice`, `PurchaseInvoiceItem`, `PurchaseExpense` | موجود                                      |
| PUR-002 | Purchase list/create/detail/edit/delete APIs | API                 | DONE        |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/purchases`, `/api/purchases/[id]`                     | CRUD + post + tests كاملة                  |
| PUR-003 | Purchase UI pages                            | UI                  | DONE        |   100% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `/dashboard/purchases/*`                                    | موجود                                      |
| PUR-004 | Purchase PDF                                 | UI/API              | DONE        |   100% | نعم     | نعم | نعم | جزئي | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/purchases/[id]/pdf`                                   | موجود                                      |
| PUR-005 | Purchase expenses inside invoice             | Business Workflow   | PARTIAL     |    50% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `PurchaseExpense`, form tabs                                | موجود كجزء من الفاتورة                     |
| PUR-006 | Purchase draft/edit semantics                | Business Workflow   | DONE        |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | create → DRAFT, PATCH/DELETE → DRAFT-only guard            | تم التصحيح: removed side effects from CRUD |
| PUR-007 | Purchase posting endpoint                    | Accounting          | DONE        |   100% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/app/api/purchases/[id]/post/route.ts`                  | period guard + ledger + stock + audit log |
| PUR-008 | Stock IN applied to stock balance            | Inventory Impact    | DONE        |   100% | نعم     | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | StockBalanceService.applyPostedMovement في posting route    | weighted average مع حركة IN               |
| PUR-009 | Supplier AP journal                          | Accounting Impact   | DONE        |   100% | نعم     | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | قيد Dr Inventory → Cr AP في posting route                   | auto-generated في نفس transaction         |
| PUR-010 | Cash/bank purchase journal                   | Accounting Impact   | DONE        |   100% | نعم     | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | قيد Dr Inventory → Cr Cash في posting route                 | بدون direct balance update                 |
| PUR-011 | Landed cost valuation                        | Inventory Valuation | PARTIAL     |    50% | نعم     | نعم | نعم | لا   | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | expenseShare/finalCost/unitFinalCost                        | ليس valuation layers                       |
| PUR-012 | Purchase returns                             | Business Workflow   | TODO        |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | Master + docs purchases                                     | غير موجود                                  |
| PUR-013 | Purchase tests                               | QA                  | DONE        |   100% | لا      | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/__tests__/purchases.test.ts`                       | 21 tests: CRUD + posting + perm + isolation |
| PUR-014 | End-to-end purchase audit                    | QA                  | DONE        |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | PUR-AUDIT-001 في جدول المراجعة                               | تم التدقيق وجدول الفجوات محدث             |

### PH-08 — Reports & BI

| Task ID | اسم المهمة                        | النوع            | الحالة  | النسبة | Backend | API  | UI   | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع        | الملاحظات                     |
| ------- | --------------------------------- | ---------------- | ------- | -----: | ------- | ---- | ---- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------ | ----------------------------- |
| REP-001 | Dashboard stats                   | Reports          | PARTIAL |    50% | نعم     | نعم  | نعم  | نعم  | لا    | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/api/dashboard/stats`   | بسيط وغير كاف                 |
| REP-002 | Reports landing page              | UI               | TODO    |     0% | لا      | لا   | جزئي | نعم  | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | placeholder              | غير جاهز                      |
| REP-003 | Profit & Loss                     | Financial Report | TODO    |     0% | لا      | لا   | لا   | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | Master reporting         | يعتمد على journal lines       |
| REP-004 | Trial balance                     | Financial Report | TODO    |     0% | لا      | لا   | لا   | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | Master reporting         | يعتمد على journal lines       |
| REP-005 | Account statements                | Financial Report | PARTIAL |    50% | جزئي    | جزئي | جزئي | جزئي | نعم   | نعم  | لا           | لا           | لا    | HIGH     | customer statement فقط   | لا يوجد account statement عام |
| REP-006 | Sales reports                     | Reports          | TODO    |     0% | جزئي    | لا   | لا   | لا   | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | sales data موجودة        | يؤجل بعد smoke                |
| REP-007 | Purchase/AP reports               | Reports          | BLOCKED |     0% | لا      | لا   | لا   | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | purchase posting ناقص    | محجوب بـ PUR-AUDIT            |
| REP-008 | Inventory valuation/audit reports | Reports          | PARTIAL |    50% | نعم     | نعم  | نعم  | نعم  | نعم   | نعم  | لا           | نعم          | لا    | MEDIUM   | `/dashboard/inventory/*` | موجود جزئياً                  |
| REP-009 | Async exports / BI warehouse      | BI               | FUTURE  |     0% | لا      | لا   | لا   | لا   | لا    | نعم  | لا           | لا           | نعم   | LOW      | Reporting BI docs        | Enterprise future             |

### PH-09 — Employees / HR / Payroll

| Task ID | اسم المهمة         | النوع         | الحالة | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع       | الملاحظات                 |
| ------- | ------------------ | ------------- | ------ | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ----------------------- | ------------------------- |
| HR-001  | Employee model     | HR/Data       | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | docs/employees + Master | غير موجود في Prisma       |
| HR-002  | Employee CRUD      | HR/API/UI     | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | docs/employees          | غير منفذ                  |
| HR-003  | Attendance records | HR Workflow   | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | Master employees        | غير منفذ                  |
| HR-004  | Shifts/overtime    | HR Workflow   | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | employees docs          | غير منفذ                  |
| HR-005  | Payroll accounting | Accounting/HR | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | Master future payroll   | لا يبدأ قبل تصميم payroll |
| HR-006  | Employee reports   | Reports/HR    | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | الطلب الحالي            | مستقبلي                   |

### PH-10 — Internal Project Management

| Task ID    | اسم المهمة                | النوع                 | الحالة | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع      | الملاحظات |
| ---------- | ------------------------- | --------------------- | ------ | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ---------------------- | --------- |
| PM-INT-001 | Projects model            | Project Management    | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | لا           | نعم   | LOW      | طلب المستخدم المستقبلي | غير منفذ  |
| PM-INT-002 | Tasks model               | Project Management    | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | لا           | نعم   | LOW      | طلب المستخدم المستقبلي | غير منفذ  |
| PM-INT-003 | Assign tasks to employees | Project Management/HR | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | لا           | نعم   | LOW      | يعتمد على HR           | غير منفذ  |
| PM-INT-004 | Work time tracking        | Project Management    | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | لا           | نعم   | LOW      | طلب المستخدم المستقبلي | غير منفذ  |
| PM-INT-005 | Productivity reports      | Reports               | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | لا           | نعم   | LOW      | طلب المستخدم المستقبلي | غير منفذ  |
| PM-INT-006 | Management notes + audit  | Audit/PM              | FUTURE |     0% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | لا           | نعم   | LOW      | طلب المستخدم المستقبلي | غير منفذ  |

### PH-11 — Backup & Recovery

| Task ID | اسم المهمة                     | النوع       | الحالة  | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع        | الملاحظات               |
| ------- | ------------------------------ | ----------- | ------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------ | ----------------------- |
| BAK-001 | Backup policy documentation    | Backup      | DONE    |   100% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | docs/BACKUP_POLICY.md    | سياسة كاملة: retention، schedule، scripts |
| BAK-002 | PostgreSQL backup script       | Backup      | DONE    |   100% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | scripts/backup-postgres.sh | pg_dump custom format مع compression     |
| BAK-003 | Restore script                 | Recovery    | DONE    |   100% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | scripts/restore-postgres.sh | pg_restore مع interactive confirmation  |
| BAK-004 | Restore test/drill             | QA/Recovery | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | TESTING_STRATEGY         | غير منفذ                |
| BAK-005 | Backup before each major phase | Governance  | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | Master reliability       | غير منفذ                |
| BAK-006 | Backup before Coolify trial    | Deployment  | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | Coolify release criteria | غير منفذ                |

### PH-12 — Security Hardening

| Task ID | اسم المهمة                    | النوع    | الحالة  | النسبة | Backend | API | UI   | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع          | الملاحظات                                |
| ------- | ----------------------------- | -------- | ------- | -----: | ------- | --- | ---- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------- | ---------------------------------------- |
| SEC-001 | JWT secret hardening          | Security | DONE    |   100% | نعم     | نعم | لا   | لا  | جزئي  | نعم  | نعم          | نعم          | لا    | CRITICAL | SEC-002, proxy hardening   | موجود                                    |
| SEC-002 | DB-backed permissions         | Security | DONE    |   100% | نعم     | نعم | جزئي | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `requireDbPermission`       | All routes migrated from checkPermission to requireDbPermission     |
| SEC-003 | Audit logging on mutations    | Audit    | PARTIAL |    50% | نعم     | نعم | نعم  | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `AuditLog`, route logs     | بعض logs خارج transaction أو best-effort |
| SEC-004 | No secrets committed          | Security | DONE    |   100% | نعم     | لا  | لا   | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `.env.example`, .gitignore | Git history clean; .env.example hardened with comments              |
| SEC-005 | Rate limiting login           | Security | PARTIAL |    50% | نعم     | نعم | لا   | لا  | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | auth/rate-limit tests      | موجود أساسياً                            |
| SEC-006 | MFA                           | Security | FUTURE  |     0% | لا      | لا  | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Security hardening docs    | مؤجل                                     |
| SEC-007 | Device/session trust          | Security | FUTURE  |     0% | لا      | لا  | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Security docs              | مؤجل                                     |
| SEC-008 | Anti-fraud/suspicious posting | Security | FUTURE  |     0% | لا      | لا  | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Master                     | مؤجل                                     |

### PH-13 — Testing & QA

| Task ID | اسم المهمة                 | النوع       | الحالة  | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                  | الملاحظات                   |
| ------- | -------------------------- | ----------- | ------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------------------------------- | --------------------------- |
| QA-001  | Vitest setup               | QA          | DONE    |   100% | لا      | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `vitest.config.ts`, package test                   | موجود                       |
| QA-002  | Auth/unit tests            | QA          | DONE    |   100% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `auth.test.ts`, `session.test.ts`                  | موجود                       |
| QA-003  | Accounting invariant tests | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `journal-entries.test.ts`                          | جيد للقيود                  |
| QA-004  | Inventory tests            | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | stock tests                                        | جيد لكن ليس كل workflows    |
| QA-005  | Sales workflow tests       | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `sales-invoices.test.ts`, `sales-returns.test.ts`  | قوي نسبياً                  |
| QA-006  | Purchase workflow tests    | QA          | DONE    |   100% | لا      | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | src/lib/__tests__/purchases.test.ts                | 21 tests: CRUD + posting + permissions + company isolation |
| QA-007  | API integration tests      | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | tests mock routes                                  | ليست runtime DB كاملة       |
| QA-008  | Runtime smoke scripts      | QA/DevOps   | PARTIAL |    50% | نعم     | نعم | نعم | جزئي | جزئي  | جزئي | نعم          | نعم          | لا    | HIGH     | `scripts/smoke-foundation.sh`, `verify-runtime.sh` | موجودة لكن تحتاج تشغيل موثق |
| QA-009  | Backup restore tests       | QA/Recovery | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | TESTING_STRATEGY                                   | غير منفذ                    |
| QA-010  | Reports accuracy tests     | QA/Reports  | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | MEDIUM   | TESTING_STRATEGY                                   | ينتظر التقارير              |

### PH-14 — Production Readiness

| Task ID  | اسم المهمة                | النوع               | الحالة  | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع          | الملاحظات                          |
| -------- | ------------------------- | ------------------- | ------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------- | ---------------------------------- |
| PROD-001 | Build script              | Deployment          | DONE    |   100% | نعم     | نعم | نعم | نعم | لا    | جزئي | نعم          | نعم          | لا    | CRITICAL | `npm run build`            | موجود                              |
| PROD-002 | Typecheck/test scripts    | QA/Deployment       | DONE    |   100% | نعم     | نعم | لا  | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | package scripts            | موجود                              |
| PROD-003 | Env example               | Deployment/Security | PARTIAL |    50% | لا      | لا  | لا  | لا  | لا    | جزئي | نعم          | نعم          | لا    | HIGH     | `.env.example`             | يحتاج production secrets checklist |
| PROD-004 | Prisma migration strategy | Database            | PARTIAL |    50% | نعم     | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | prisma migrations lock فقط | يحتاج migration discipline         |
| PROD-005 | Dockerfile                | Deployment          | DONE    |   100% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | نعم          | لا    | HIGH     | `Dockerfile`               | standalone build + 22-alpine        |
| PROD-006 | Health endpoint           | DevOps              | DONE    |   100% | نعم     | نعم  | لا  | لا  | لا    | جزئي | نعم          | نعم          | لا    | HIGH     | `src/app/api/health/route.ts` | GET /api/health → { status, db, uptime } |
| PROD-007 | Monitoring/logging plan   | DevOps              | TODO    |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | لا           | نعم          | لا    | MEDIUM   | Reliability docs           | غير منفذ                           |
| PROD-008 | Rollback plan             | DevOps              | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | جزئي | لا           | نعم          | لا    | HIGH     | Reliability docs           | غير منفذ                           |

### PH-15 — Coolify Trial Release

| Task ID | اسم المهمة                      | النوع         | الحالة  | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع      | الملاحظات                    |
| ------- | ------------------------------- | ------------- | ------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ---------------------- | ---------------------------- |
| CLF-001 | Coolify deployment plan         | Deployment    | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | docs/DEPLOY_PLAN_COOLIFY.md | 6-step plan with env table, rollback, troubleshooting |
| CLF-002 | Docker/Coolify config           | Deployment    | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | لا   | لا           | نعم          | لا    | CRITICAL | Dockerfile + docker-compose.yml | multi-stage Dockerfile + compose with PostgreSQL |
| CLF-003 | Production PostgreSQL env       | Deployment/DB | DONE    |    80% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | `.env.example` updated | production DATABASE_URL + prisma commands documented |
| CLF-004 | Smoke test checklist            | QA/Deployment | PARTIAL |    50% | نعم     | نعم | نعم | جزئي | جزئي  | جزئي | لا           | نعم          | لا    | HIGH     | scripts موجودة         | تحتاج Coolify-specific smoke |
| CLF-005 | Backup before trial             | Backup        | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | scripts/backup-postgres.sh | PH-11 منجز                   |
| CLF-006 | Rollback plan                   | Recovery      | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | docs/DEPLOY_PLAN_COOLIFY.md | covered in deploy plan       |
| CLF-007 | System Owner production account | Security/Ops  | DONE    |   100% | جزئي    | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | HIGH     | .env.example + seed.ts  | env vars documented          |

## 9. جدول المهام المكتملة

| المجال              | أمثلة مهام DONE                                               | الدليل                                               |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Auth                | login/logout/me                                               | `/api/auth/*`, tests                                 |
| Foundation DB       | Company, Branch, FiscalPeriod, Account, JournalEntry          | `prisma/schema.prisma`                               |
| Journals            | create/edit/delete/post/reverse UI/API                        | `/api/journal-entries`, `/dashboard/journal-entries` |
| UI Binding          | Zero NO_UI                                                    | `API_REGISTRY.md`, `UI_BINDING_ROADMAP.md`           |
| Navigation          | Sidebar coverage                                              | `sidebar.tsx`, NAV-001                               |
| Customers           | CRUD + details + categories                                   | `/api/customers`, `/dashboard/customers`             |
| Suppliers           | CRUD + detail                                                 | `/api/suppliers`, `/dashboard/suppliers/[id]`        |
| Products/Warehouses | CRUD + detail                                                 | `/api/products`, `/api/warehouses`                   |
| Sales               | invoice CRUD/post/print, returns, collections                 | `/api/sales-invoices`, `/api/sales-returns`, tests   |
| Inventory           | stock balances, transfers, adjustments, valuation/audit pages | `/api/stock-*`, `/api/inventory/*`, tests            |
| Purchases UI        | list/create/detail/edit/PDF                                   | `/dashboard/purchases/*`, `/api/purchases/*`         |

## 10. جدول المهام غير المكتملة

| المجال      | المهمة                       | الحالة | السبب                                          |
| ----------- | ---------------------------- | ------ | ---------------------------------------------- |
| Purchases   | Purchase posting endpoint    | TODO   | لا يوجد `/api/purchases/{id}/post`             |
| Purchases   | Supplier AP journal          | TODO   | لا توجد قيود مالية للمشتريات                   |
| Purchases   | Stock IN applied to balances | TODO   | الحركات تُنشأ فقط ولا تُطبق على `StockBalance` |
| Purchases   | Purchase returns             | TODO   | لا model/API/UI                                |
| Accounting  | Payment voucher              | TODO   | لا vouchers موحدة                              |
| Accounting  | Account opening balances     | TODO   | غير موجود في Prisma                            |
| Inventory   | Inventory count              | TODO   | غير منفذ                                       |
| Inventory   | Reservation system           | FUTURE | `reservedQuantity` موجود فقط                   |
| Reports     | Financial reports            | TODO   | صفحة التقارير placeholder                      |
| Backup      | backup/restore scripts       | TODO   | غير موجودة                                     |
| Production  | Docker/Coolify config        | TODO   | غير موجود                                      |
| HR          | Employees/attendance/payroll | FUTURE | غير منفذ                                       |
| Internal PM | Projects/tasks board         | FUTURE | غير منفذ                                       |

## 11. جدول المهام التي تحتاج تدقيق

| Task                        | السبب                                                         | الإجراء المطلوب                     |
| --------------------------- | ------------------------------------------------------------- | ----------------------------------- |
| Sales E2E                   | الكود والاختبارات موجودة لكن لا يوجد تقرير smoke runtime حديث | تشغيل بيع نقدي/آجل/مختلط end-to-end |
| Sales returns E2E           | موجودة واختبارية لكن تحتاج تجربة UI عملية                     | تجربة مرتجع جزئي وكلي               |
| Customer collections E2E    | اختبارات قوية، لكن يجب تدقيق ربطها مع الرصيد والكشف           | تجربة تحصيل على فاتورة وعلى الحساب  |
| Purchases status semantics  | Prisma default `COMPLETED` بينما UI يتحقق من `DRAFT`          | تدقيق workflow وحالات الفاتورة      |
| Purchases stock effect      | ينشئ StockMovement ولا يطبق balance                           | تدقيق المخزون بعد إنشاء فاتورة شراء |
| Purchases accounting effect | direct paymentAccount update ولا journal/AP                   | تدقيق مالي إلزامي                   |
| Dashboard stats             | لا يظهر أنه company-scoped بالكامل                            | تدقيق العزل                         |
| Audit behavior              | PH-00 financial journal audit أصبح داخل transaction؛ يبقى تدقيق non-financial/security audit ضمن PH-12 | تدقيق audit safety خارج PH-00      |

## 12. المهام المطلوبة قبل النسخة التجريبية

| Task ID       | المهمة                                                    | الحالة      | لماذا مطلوبة؟                                    |
| ------------- | --------------------------------------------------------- | ----------- | ------------------------------------------------ |
| PUR-AUDIT-001 | تدقيق المشتريات End-to-End                                | TODO        | لا يمكن الوثوق بتدفق الشراء بدون أثر مخزني ومالي |
| PUR-POST-001  | تحديد فجوات purchase posting                              | TODO        | قبل التقارير وقبل بيانات حقيقية                  |
| SAL-AUDIT-001 | تدقيق المبيعات End-to-End                                 | NEEDS_AUDIT | المبيعات جاهزة نسبياً لكن تحتاج runtime smoke    |
| INV-AUDIT-001 | تدقيق stock balance بعد purchase/sale/transfer/adjustment | NEEDS_AUDIT | للتأكد من المخزون                                |
| ACC-AUDIT-001 | تدقيق ledger consistency بعد sales/collections            | NEEDS_AUDIT | لمنع فساد المحاسبة                               |
| BAK-001       | خطة backup قبل إدخال بيانات حقيقية                        | TODO        | حماية البيانات                                   |
| QA-006        | اختبارات مشتريات أساسية                                   | TODO        | لا توجد حالياً                                   |
| PROD-006      | Health check endpoint/strategy                            | TODO        | للبيئة التجريبية                                 |

## 13. المهام المطلوبة قبل Coolify

| Task ID       | المهمة                               | الحالة  | blocker؟                          |
| ------------- | ------------------------------------ | ------- | --------------------------------- |
| BAK-002       | PostgreSQL backup script             | TODO    | نعم                               |
| BAK-003       | Restore script                       | TODO    | نعم                               |
| BAK-004       | Restore drill                        | TODO    | نعم                               |
| PROD-005      | Dockerfile أو Coolify build strategy | TODO    | نعم                               |
| PROD-006      | Health check                         | TODO    | نعم                               |
| SEC-004       | secrets audit                        | PARTIAL | نعم                               |
| CLF-003       | production env mapping               | TODO    | نعم                               |
| CLF-004       | Coolify smoke test checklist         | PARTIAL | نعم                               |
| CLF-006       | rollback plan                        | TODO    | نعم                               |
| PUR-AUDIT-001 | purchase workflow audit              | TODO    | نعم إذا كانت التجربة تشمل مشتريات |

## 14. المهام المستقبلية

| المجال               | المهام                                                   | الحالة      |
| -------------------- | -------------------------------------------------------- | ----------- |
| HR                   | موظفون، دوام، overtime، رواتب                            | FUTURE      |
| Internal PM          | مشاريع، مهام، وقت عمل، إنتاجية، ملاحظات إدارة            | FUTURE      |
| Enterprise approvals | maker/checker، thresholds، delegation                    | FUTURE      |
| Financial closing    | month-end/year-end، retained earnings، reopening         | FUTURE      |
| BI warehouse         | materialized reports، scheduled exports، OLAP readiness  | FUTURE      |
| MFA/device trust     | MFA، trusted devices، IP restrictions                    | FUTURE      |
| Valuation layers     | FIFO-ready، landed cost redistribution، retroactive cost | FUTURE/TODO |

## 15. قسم خاص للمشتريات

### مقارنة الخطة مع الواقع

| سؤال                             | النتيجة                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| هل صفحة قائمة المشتريات موجودة؟  | نعم: `/dashboard/purchases`                                                          |
| هل إنشاء فاتورة شراء موجود؟      | نعم: `/dashboard/purchases/new` وDialog form في القائمة                              |
| هل تفاصيل فاتورة شراء موجودة؟    | نعم: `/dashboard/purchases/[id]`                                                     |
| هل تعديل المسودة موجود؟          | نعم كواجهة وAPI، لكن status يحتاج تدقيق لأن default في Prisma هو `COMPLETED`         |
| هل الترحيل موجود؟                | لا، لا يوجد `POST /api/purchases/{id}/post`                                          |
| هل PDF موجود؟                    | نعم: `/api/purchases/{id}/pdf`                                                       |
| هل مصاريف الشراء موجودة؟         | نعم داخل الفاتورة كـ `PurchaseExpense` مع expenseShare/finalCost                     |
| هل مرتجعات الشراء موجودة؟        | لا                                                                                   |
| هل دخول المخزون بعد الشراء يعمل؟ | غير مؤكد؛ الكود ينشئ `StockMovement` دون تطبيق balance                               |
| هل قيد المورد AP يعمل؟           | لا يوجد قيد AP واضح                                                                  |
| هل دورة الشراء قابلة للتجربة؟    | قابلة لتجربة UI فقط، وليست جاهزة محاسبياً/مخزنياً بدون تدقيق                         |
| ما الذي يجب تدقيقه قبل التقارير؟ | purchase status، stock balance، AP journal، cash/payment account، landed cost، tests |

### مهام المشتريات الصغيرة التالية

| Task ID       | المهمة                                     | الحالة | الأولوية | المخرج المتوقع لاحقاً    |
| ------------- | ------------------------------------------ | ------ | -------- | ------------------------ |
| PUR-AUDIT-001 | تدقيق شراء نقدي End-to-End                 | TODO   | CRITICAL | تقرير فجوات فقط          |
| PUR-AUDIT-002 | تدقيق شراء آجل End-to-End                  | TODO   | CRITICAL | تقرير أثر AP             |
| PUR-AUDIT-003 | تدقيق مصاريف الشراء وتوزيع التكلفة         | TODO   | HIGH     | تقرير مطابقة landed cost |
| PUR-AUDIT-004 | تدقيق stock movements الناتجة من الشراء    | TODO   | CRITICAL | هل تؤثر على balance؟     |
| PUR-AUDIT-005 | تدقيق paymentAccount.balance direct update | TODO   | CRITICAL | توصية منع direct balance |
| PUR-AUDIT-006 | تدقيق status DRAFT/COMPLETED               | TODO   | HIGH     | state machine gap        |
| PUR-AUDIT-007 | تحديد tests المطلوبة للمشتريات             | TODO   | CRITICAL | قائمة اختبارات           |

## 16. قسم خاص بالمبيعات

| المجال          | الحالة       | الدليل                                 | ملاحظات                                 |
| --------------- | ------------ | -------------------------------------- | --------------------------------------- |
| فواتير البيع    | PARTIAL/DONE | `/api/sales-invoices`, UI pages, tests | مكتملة وظيفياً وتحتاج smoke عملي        |
| ترحيل البيع     | PARTIAL      | `/api/sales-invoices/[id]/post`        | ينشئ stock OUT وjournals ويحدث balances |
| COGS            | PARTIAL      | tests + post route                     | يحتاج reconciliation مع valuation       |
| AR              | PARTIAL      | customer balance + journals            | يحتاج ledger-derived review             |
| الطباعة         | DONE         | `/print` endpoint                      | HTML print                              |
| المرتجعات       | DONE/PARTIAL | `/api/sales-returns`, tests            | قوية نسبياً                             |
| cancel/reversal | TODO         | Master state machines                  | غير موحدة                               |

المبيعات جاهزة لتدقيق عملي قبل النسخة التجريبية، لكنها ليست blocker الأول لأن فجوة المشتريات أكبر.

## 17. قسم خاص بالتقارير

| التقرير                 | الحالة  | مصدر البيانات المطلوب          | سبب التأجيل                     |
| ----------------------- | ------- | ------------------------------ | ------------------------------- |
| Dashboard stats         | PARTIAL | counts مباشرة                  | موجود بسيط                      |
| P&L                     | TODO    | JournalLine + accounts         | ينتظر اكتمال posting للمشتريات  |
| Trial Balance           | TODO    | JournalLine                    | يحتاج ledger consistency        |
| Account Statement       | PARTIAL | JournalLine + opening balances | customer statement موجود جزئياً |
| AR Aging                | TODO    | invoices/collections/journal   | يحتاج تثبيت AR                  |
| AP Aging                | BLOCKED | purchase posting/AP            | محجوب بالمشتريات                |
| Stock Card              | PARTIAL | StockMovement                  | موجود في inventory audit        |
| Inventory Valuation     | PARTIAL | StockBalance                   | لا valuation layers             |
| Best Products/Customers | TODO    | sales lines/customers          | بعد sales smoke                 |
| Exports                 | FUTURE  | reporting engine               | يحتاج audit/export security     |

لا يجب بدء التقارير المالية قبل تدقيق المشتريات والمبيعات لأن التقارير ستكشف أرقاماً غير موثوقة إذا كانت مصادر ledger/stock غير مكتملة.

## 18. قسم خاص بالموظفين والدوام والرواتب

الخطة الأصلية والوثائق المقسمة تذكر الموظفين والحضور والرواتب المستقبلية، لكن الكود الحالي لا يحتوي:

- Prisma model للموظفين.
- Prisma model للحضور.
- API للموظفين أو الحضور.
- صفحة dashboard للموظفين.
- payroll posting.

لذلك تصنف مرحلة HR حالياً `FUTURE`. لا يجب تنفيذها قبل تثبيت المبيعات، المشتريات، المخزون، والنسخ الاحتياطي.

## 19. قسم خاص بلوحة إدارة المشاريع والمهام الداخلية

هذه فكرة مستقبلية مطلوبة من المالك وليست منفذة حالياً. المرحلة يجب أن تبقى `FUTURE` وتشمل لاحقاً:

- مشاريع.
- مهام.
- توزيع المهام على الموظفين.
- حالة كل مهمة.
- وقت العمل.
- تقارير لكل موظف.
- إنتاجية الموظف.
- ملاحظات الإدارة.
- صلاحيات.
- Audit.

لا يجب تنفيذها قبل وجود HR foundation أو قبل اكتمال ERP operational core.

## 20. قسم خاص بالاختبارات

| نوع الاختبار               | الحالة  | الموجود                                  | الناقص                              |
| -------------------------- | ------- | ---------------------------------------- | ----------------------------------- |
| Unit Tests                 | PARTIAL | utilities، schemas، guards               | تغطية كل calculators                |
| API Tests                  | PARTIAL | sales/customers/inventory/journals mocks | purchases APIs                      |
| Integration Tests          | PARTIAL | route/service mocks                      | DB integration حقيقي                |
| Business Workflow Tests    | PARTIAL | sales/returns جزئياً                     | purchases E2E                       |
| Accounting Integrity Tests | PARTIAL | journal balance/posting                  | source document posting لكل الوحدات |
| Inventory Integrity Tests  | PARTIAL | stock balance/transfers/adjustments      | purchase IN + inventory count       |
| Permission Tests           | PARTIAL | several modules                          | full endpoint matrix                |
| Runtime Smoke Tests        | PARTIAL | scripts موجودة                           | تشغيل موثق بعد كل release           |
| Production Smoke Tests     | TODO    | لا يوجد                                  | مطلوب قبل Coolify                   |
| Backup Restore Tests       | TODO    | لا يوجد                                  | مطلوب قبل بيانات حقيقية             |
| Reports Accuracy Tests     | TODO    | لا يوجد                                  | بعد بناء التقارير                   |

## 21. قسم خاص بالنسخ الاحتياطي والاستعادة

| المهمة                          | الحالة  | الملاحظات             |
| ------------------------------- | ------- | --------------------- |
| نسخ قاعدة PostgreSQL            | TODO    | لا يوجد script        |
| نسخ ملفات المشروع المهمة        | TODO    | مطلوب قبل مراحل كبيرة |
| نسخ docs                        | PARTIAL | موجودة في git         |
| سكربت restore                   | TODO    | غير موجود             |
| اختبار restore                  | TODO    | غير موجود             |
| backup قبل كل Phase كبيرة       | TODO    | موثق فقط              |
| backup قبل Coolify              | TODO    | blocker               |
| backup قبل migration production | TODO    | blocker               |

لا يجب إدخال بيانات حقيقية أو تجربة Coolify بدون خطة backup/restore واضحة ومجربة.

## 22. قسم خاص بتجهيز Coolify

الانتقال إلى Coolify يجب أن يتم بعد:

- تدقيق المبيعات.
- تدقيق المشتريات.
- وجود backup strategy.
- تدقيق secrets.
- نجاح build.
- وجود System Owner production.
- smoke test.
- rollback plan.

| المهمة                       | الحالة  | ملاحظات                      |
| ---------------------------- | ------- | ---------------------------- |
| Dockerfile / build config    | TODO    | غير موجود                    |
| DATABASE_URL production      | TODO    | موجود كـ example فقط         |
| JWT_SECRET production        | TODO    | يجب توليده وإدارته كـ secret |
| Prisma migration/deploy flow | TODO    | يحتاج خطة                    |
| Health check                 | TODO    | غير موجود                    |
| Smoke tests بعد deploy       | PARTIAL | scripts عامة موجودة          |
| Rollback                     | TODO    | غير موجود                    |

## 23. مخاطر المشروع

| الخطر                         | الشدة          | التأثير                      | التخفيف                           |
| ----------------------------- | -------------- | ---------------------------- | --------------------------------- |
| Purchase posting ناقص         | Critical       | تقارير ومخزون وAP غير موثوقة | PUR-AUDIT-001 ثم تصميم مهمة تصحيح |
| Direct balance updates        | Critical       | كسر ledger-first             | منعها في مهام التصحيح             |
| Direct product cost update    | High           | تكلفة غير auditable          | نقلها إلى valuation flow          |
| Reports قبل تثبيت source data | High           | أرقام خاطئة                  | تأجيل التقارير المالية            |
| Lack of backup/restore        | Critical       | فقدان بيانات                 | تنفيذ خطة backup قبل التجربة      |
| Placeholder reports/settings  | Medium         | تجربة ناقصة                  | تحويلها لمهام لاحقة               |
| Missing HR models             | Low حالياً     | لا يؤثر على التجربة الأساسية | Future phase                      |
| No Coolify config             | High قبل النشر | deploy غير جاهز              | Production readiness phase        |
| Runtime smoke غير موثق        | High           | نجاح tests لا يضمن عمل UI    | smoke scripts + تقرير             |

## 24. المهمة التالية الموصى بها

المهمة التالية المنطقية الآن:

**PUR-AUDIT-001 — تدقيق تنفيذ المشتريات الحالي End-to-End**

### السبب

- تم إغلاق فجوتي `FND-006` و`FND-008` عبر `PH00-GATE-FIX-001`.
- قرار Gate الحالي هو `PH-00 APPROVED FOR PH-01`.
- المشتريات هي آخر فجوة حرجة قبل الاعتماد على التقارير.
- UI/API للمشتريات موجودان، لذلك قد تبدو مكتملة ظاهرياً.
- الخطة الأصلية تطلب purchase posting، AP، stock IN، landed cost، purchase returns.
- الكود الحالي لا يملك post endpoint ولا اختبارات مشتريات.
- توجد مؤشرات خطر: `status` غير متسق، `StockMovement` لا يطبق balance، direct `paymentAccount.balance`، direct `product.purchasePrice`.

### نطاق المهمة التالية المقترح

- لا تنفيذ كود.
- تشغيل/قراءة دورة إنشاء شراء نقدي وآجل من الكود.
- توثيق كل فجوة: status، stock balance، journal/AP، payment account، landed cost، permissions، audit، tests.
- تحديث tracker بنتيجة التدقيق.
- بعد التدقيق فقط يتم إنشاء مهمة تنفيذ صغيرة لتصحيح purchase posting.

## 25. طريقة تحديث هذا الملف مستقبلاً

1. اقرأ `docs/ai/AI_GLOBAL_RULES.md` قبل أي تعديل.
2. اقرأ الملف الخاص بالوحدة التي تغيرت.
3. لا تغير حالة مهمة إلى `DONE` إلا بدليل من الكود أو اختبار أو توثيق واضح.
4. إذا تمت إضافة API أو UI، حدّث `docs/api/API_REGISTRY.md`.
5. إذا تغيرت مرحلة UI، حدّث `docs/api/UI_BINDING_ROADMAP.md`.
6. إذا أنجزت مهمة من backlog، حدّث `docs/api/UI_COMPLETION_BACKLOG.md`.
7. أعد حساب النسب حسب جدول الأوزان أعلاه.
8. أضف المهمة الجديدة أو المنجزة في جدول المرحلة المناسبة.
9. لا تحذف المهام المؤجلة؛ غيّر حالتها فقط عند وجود قرار واضح.
10. أي تعديل في المنطق المحاسبي أو المخزني يجب أن ينعكس على أقسام المخاطر والاختبارات.
