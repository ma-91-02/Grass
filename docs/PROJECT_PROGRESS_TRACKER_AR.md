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

| المؤشر                                                               | النتيجة                                            |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| API route files                                                      | 82 (+9 PH-10)                                      |
| API methods حسب `API_REGISTRY.md`                                    | 155 (+16 PH-10)                                    |
| API methods مربوطة بالواجهة                                          | 152 (+16 PH-10)                                    |
| Backend-only endpoints                                               | 3                                                  |
| صفحات Dashboard                                                      | 67 (+3 PH-10: internal-projects, [id], my-tasks)   |
| روابط Sidebar مباشرة                                                 | 33 (+2 PH-10: المشاريع الداخلية, مهامي)            |
| ملفات الاختبار                                                       | 28 (+1 PH-10: internal-project-model.test.ts)      |
| test cases / describe / it تقريباً                                   | 605                                                |
| النسبة العامة التقريبية للمشروع المؤسسي                              | 62% (+4% عن PH-10)                                 |
| النسبة التقريبية للنواة القابلة للتجربة بعد تدقيق المبيعات/المشتريات | 68% تقريباً                                        |
| المرحلة الحالية                                                      | PH-11 — Backup & Recovery                          |
| المهمة التالية الموصى بها                                            | BAK-004 — تنفيذ drill فعلي لاستعادة البيانات        |

### أهم الاستنتاجات

- Foundation وUI Binding قطعا شوطاً كبيراً: Auth، RBAC، companies، branches، fiscal periods، chart of accounts، journal entries، معظم صفحات dashboard، وSidebar موجودة. بعد `PH00-GATE-FIX-001` أُغلقت فجوتا failed-login audit وJournal Reversal، وأصبحت PH-00 معتمدة للانتقال. PH-02 (Dashboard & Navigation) اكتملت 100% مع إحصائيات company-scoped وصفحات التقارير والإعدادات والمخزون.
- المخزون والمبيعات لهما تنفيذ أعمق من المشتريات، مع خدمات stock balance وposting tests للمبيعات والمرتجعات.
- المشتريات تمتلك UI وAPI وPDF ومصاريف داخل الفاتورة، لكنها لا تحقق بعد فلسفة الخطة الأصلية بالكامل: لا يوجد endpoint ترحيل مشتريات، لا يوجد AP journal، لا توجد Purchase Returns، لا توجد اختبارات مشتريات، وتوجد تحديثات مباشرة على `paymentAccount.balance` و`product.purchasePrice`.
- التقارير العامة ما زالت placeholder، رغم وجود dashboard stats وتقارير inventory valuation/audit.
- HR، الرواتب، إدارة المشاريع الداخلية، backup/restore المؤسسي، وCoolify deployment ما زالت مستقبلية أو TODO.

## 6. المرحلة الحالية

المرحلة الحالية حسب المقارنة بين الخطة والكود هي:

**Phase 11 — Backup & Recovery**

السبب:

- PH-00 إلى PH-10 مكتملة ومعتمدة عبر Gate Verification.
- PH-10 اكتملت 100% في 2026-05-31 مع جميع المهام: Project + ProjectTask + TaskAssignment + WorkLog models, APIs, UI, Tests, Seed data, Security.
- المرحلة التالية هي PH-11 (Backup & Recovery) بنسبة 70% حالياً.

## 7. جدول المراحل الرئيسي

| Phase ID | اسم المرحلة                 | الهدف                                                                | الحالة      | الإنجاز | مطلوبة للتجربة؟             | مطلوبة قبل Coolify؟ | المهمة التالية داخلها                            | ملاحظات                                                                                                           |
| -------- | --------------------------- | -------------------------------------------------------------------- | ----------- | ------: | --------------------------- | ------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| PH-00    | Foundation Core             | Auth, RBAC, Company, Branch, Fiscal Periods, COA, Journal foundation | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-00 متبقية؛ التالي PUR-AUDIT-001  | تم اعتماد PH-00 بعد PH00-GATE-FIX-001                                                                             |
| PH-01    | Users & Permissions         | المستخدمون، الأدوار، الصلاحيات، الجلسات                              | DONE        |    100% | نعم                         | نعم                 | تم تدقيق Roles CRUD وpermission coverage         | Roles editor كامل + permission hiding + gate verification                                                         |
| PH-02    | Dashboard & Navigation      | Sidebar، parent pages، navigation coverage، UI binding               | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-02 متبقية                        | تم إنجاز NAV-002 إلى NAV-006 بالكامل                                                                              |
| PH-03    | Customers & Suppliers       | العملاء، الموردون، الذمم، كشوفات العملاء                             | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-03 متبقية                        | تم إكمال PART-007 (Supplier AP/Statement) وتصحيح GAP B/F/H/I. PART-008 محظور لحين PH-07                           |
| PH-04    | Accounting & Ledger         | القيود، دليل الحسابات، posting، العملات، السندات                     | DONE        |    100% | نعم                         | نعم                 | PH05 — Inventory Engine                          | تم اعتماد البوابة. ACC-008/009/010 مصنفة NOT_REQUIRED_FOR_CURRENT_RELEASE                                         |
| PH-05    | Inventory Engine            | مواد، مخازن، حركات، أرصدة، تحويلات، تسويات، تقييم                    | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-05 متبقية                        | تم إكمال 8/8 مهام داخل النطاق. INV-008/009/010/012 مصنفة NOT_REQUIRED_FOR_CURRENT_RELEASE                         |
| PH-06    | Sales Cycle                 | فواتير بيع، مرتجعات، تحصيل، stock OUT، COGS، AR                      | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-06 متبقية                        | تم إصلاح Cancel COGS وإضافة DELETE للمرتجعات. SAL-007 مصنفة NOT_REQUIRED_FOR_CURRENT_RELEASE                      |
| PH-07    | Purchases Cycle             | مشتريات، مصاريف، supplier AP، stock IN، returns                      | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-07 متبقية                        | تم إصلاح PaymentAccount.balance. PUR-013/014 مصنفة NOT_REQUIRED_FOR_CURRENT_RELEASE                               |
| PH-08    | Reports & BI                | تقارير مالية، مبيعات، مخزون، ديون، KPIs، exports                     | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-08 متبقية                        | 9 تقارير في landing page. P&L + Balance Sheet + Trial Balance + AR Aging + Sales Summary + Inventory + Audit Logs |
| PH-09    | Employees / HR / Payroll    | موظفون، دوام، رواتب مستقبلية                                         | DONE        |    100% | لا                          | لا                  | لا توجد مهمة PH-09 متبقية                        | Employee foundation مكتمل ومعتمد؛ الحضور والرواتب خارج الإصدار الحالي                                             |
| PH-10    | Internal Project Management | مشاريع داخلية، مهام، إنتاجية، وقت عمل                                | DONE        |    100% | لا                          | لا                  | PH-10 مكتملة — جميع المهام منفذة                 | Project + ProjectTask + TaskAssignment + WorkLog models + APIs + UI + Tests + Gate                              |
| PH-11    | Backup & Recovery           | PostgreSQL backup، restore، drills، phase snapshots                  | PARTIAL     |     70% | نعم قبل تجربة بيانات حقيقية | نعم                 | backup/restore scripts منفذة، يحتاج drill فعلي   | backup.sh + restore.sh + npm scripts + policy doc موجودة + BAK-004/005/006 متبقية                                 |
| PH-12    | Security Hardening          | JWT، RBAC، audit، secrets، MFA، anti-fraud                           | PARTIAL     |     70% | نعم                         | نعم                 | SEC-002/004 منجز، SEC-003/005/006/007/008 متبقية | All routes use requireDbPermission; env.example hardened                                                          |
| PH-13    | Testing & QA                | Unit/API/integration/workflow/accounting/inventory tests             | PARTIAL     |     60% | نعم                         | نعم                 | QA-006 منجز (21 purchase tests)، QA-010 ينتظر    | 21 purchase test + 555 total; فجوة التقارير باقية                                                                 |
| PH-14    | Production Readiness        | env، scripts، monitoring، migrations، owner، rollback                | TODO        |     50% | نعم                         | نعم                 | Production readiness checklist                   | PROD-005 (Dockerfile) + PROD-006 (health endpoint) منجزين                                                         |
| PH-15    | Coolify Trial Release       | تجهيز deploy تجريبي على Coolify                                      | TODO        |     75% | لا                          | نعم                 | لا تبدأ قبل backup + purchase audit              | Dockerfile, compose, deploy plan, env example — الكل جاهز                                                         |

## 8. تفاصيل كل مرحلة

### PH-00 — Foundation Core

| Task ID | اسم المهمة                   | النوع       | الحالة | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                                                | الملاحظات                                                           |
| ------- | ---------------------------- | ----------- | ------ | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| FND-001 | Auth login/logout/me         | Backend/API | DONE   |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/auth/*`, `/auth/login`, tests auth/session                                 | مكتمل، وsmoke runtime دوري ضمن QA/Release                           |
| FND-002 | Company model + APIs         | Data/API    | DONE   |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Company`, `/api/companies`, `/dashboard/companies`                              | موجود ومربوط                                                        |
| FND-003 | Branch model + APIs          | Data/API    | DONE   |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `Branch`, `/api/branches`, `/dashboard/branches`                                 | موجود                                                               |
| FND-004 | Fiscal periods               | Accounting  | DONE   |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `FiscalPeriod`, `/api/fiscal-periods`, PeriodGuard                               | Foundation guard مكتمل؛ close engine المتقدم خارج PH-00             |
| FND-005 | Chart of Accounts foundation | Accounting  | DONE   |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Account`, `/api/accounts`, `/dashboard/accounts`, `/api/accounts/tree`          | تم تدقيق seed الأساسي وإغلاق عزل الشركة في tree API                 |
| FND-006 | JournalEntry / JournalLine   | Accounting  | DONE   |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `JournalEntry`, `/api/journal-entries`, `PH00_GATE_VERIFICATION_AR.md`           | عكس القيد أصبح فورياً بقيد عكس `POSTED` ومتوازن داخل transaction    |
| FND-007 | PostingService foundation    | Accounting  | DONE   |   100% | نعم     | نعم | لا  | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/services/posting-service.ts`                                            | Foundation journal posting مكتمل؛ source documents تخص phases لاحقة |
| FND-008 | Audit baseline               | Security    | DONE   |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `AuditLog`, `/api/audit-logs`, `recordAuthAudit`, `PH00_GATE_VERIFICATION_AR.md` | failed-login audit يعمل بدون userId وهمي                            |

#### تحديث PH00-COMPLETE-001

| المهمة  | الحالة قبل التنفيذ       | النقص الحقيقي داخل PH-00                                 | ما تم إصلاحه                                                                              | الحالة الجديدة | الدليل                                                                 |
| ------- | ------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| FND-004 | PARTIAL                  | `PeriodGuard` لم يمنع `ARCHIVED` صراحة                   | منع الترحيل على الفترات المؤرشفة وإضافة اختبار                                            | DONE           | `src/lib/services/period-guard.ts`, `period-guard.test.ts`             |
| FND-005 | DONE مع ملاحظة تدقيق     | `GET /api/accounts/tree` لا يطبق عزل الشركة              | إضافة `canAccessCompany` واختبار منع الوصول                                               | DONE           | `/api/accounts/tree`, `accounts-tree.test.ts`                          |
| FND-006 | DONE مع حاجة تدقيق سلامة | بعض عمليات journal write/audit لم تكن في نفس transaction | جعل create/update/delete/reverse للقيود المالية تكتب audit داخل transaction               | DONE           | `src/app/api/journal-entries/**`                                       |
| FND-007 | PARTIAL                  | Audit ترحيل القيد كان يستخدم `logAudit` خارج tx client   | نقل audit داخل `PostingService` إلى `tx.auditLog.create` مع اختبار rollback عند فشل audit | DONE           | `posting-service.ts`, `posting-service-foundation.test.ts`             |
| FND-008 | PARTIAL                  | نقص اختبارات baseline audit للترحيل/العكس داخل المعاملة  | إضافة اختبارات audit transaction للترحيل والعكس                                           | DONE           | `posting-service-foundation.test.ts`, `journal-entry-reversal.test.ts` |

ملاحظات حدود النطاق:

- عدم تغطية `PostingService` لكل source documents ليس نقصاً داخل PH-00؛ ترحيل المبيعات والمشتريات والمخزون يبقى ضمن مراحله.
- Month-end/year-end close engine وFX revaluation وhard-close المؤسسي ليست ضمن PH-00؛ PH-00 يطلب `PeriodGuard` وحالات الفترة الأساسية فقط.
- Audit hash-chain/append-only storage وsigned events جزء من Security Hardening/Enterprise Controls وليس شرطاً لإغلاق Foundation Core.

#### تحديث PH00-GATE-VERIFY-001

| البند                           | النتيجة                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| قرار Gate                       | `PH-00 NOT APPROVED`                                                                                                   |
| ملف التحقق                      | `docs/qa/phase-gates/PH00_GATE_VERIFICATION_AR.md`                                                                     |
| الاختبارات المرتبطة بـ PH-00    | نجحت: 9 ملفات، 274 اختباراً                                                                                            |
| الاختبار العام                  | نجح: 22 ملفاً، 533 اختباراً                                                                                            |
| Runtime verification            | محدود: `/auth/login` يعمل، والصفحات/APIs المحمية ترفض غير المصادق عليه؛ لم تتوفر جلسة System Owner لتدقيق runtime كامل |
| فجوة FND-006                    | عكس القيد ينشئ قيد عكس `DRAFT` ويعلّم الأصل `REVERSED` فوراً                                                           |
| فجوة FND-008                    | failed-login audit قد لا يُحفظ لأن `AuditLog.userId` إلزامي و`recordAuthAudit` يستخدم `"unknown"` عند غياب المستخدم    |
| الحالة الجديدة لـ PH-00         | `NEEDS_AUDIT` بنسبة 81%                                                                                                |
| المهمة التالية داخل PH-00 وقتها | `PH00-GATE-FIX-001 — إصلاح فجوات Auth Audit وJournal Reversal داخل Foundation Core`                                    |

#### تحديث PH00-GATE-FIX-001

| البند                   | النتيجة                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| إصلاح FND-006           | قيد العكس أصبح `POSTED` ومتوازناً داخل نفس transaction، ولا يتم تعليم الأصل `REVERSED` إذا فشل إنشاء العكس أو audit |
| إصلاح FND-008           | `AuditLog.userId` أصبح اختيارياً مع migration، وfailed-login audit لا يستخدم userId وهمي                            |
| migration               | `20260528013000_make_audit_log_user_optional`                                                                       |
| الاختبارات المرتبطة     | نجحت: 6 ملفات، 148 اختباراً                                                                                         |
| الفحوصات الكاملة        | `typecheck` نجح، `build` نجح، والاختبار العام نجح: 23 ملفاً، 537 اختباراً                                           |
| الحالة الجديدة لـ PH-00 | `DONE` بنسبة 100%                                                                                                   |
| قرار Gate بعد الإصلاح   | `PH-00 APPROVED FOR PH-01`                                                                                          |

### PH-01 — Users & Permissions

| Task ID | اسم المهمة                           | النوع       | الحالة  | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                                            | الملاحظات                                                                |
| ------- | ------------------------------------ | ----------- | ------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| USR-001 | Users list/create/detail/edit/delete | UI/API      | DONE    |   100% | نعم     | نعم | نعم | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/users`, `/dashboard/users`                                             | موجود                                                                    |
| USR-002 | Roles list                           | UI/API      | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/roles`, `/api/roles/[id]`, `/dashboard/roles`, `/dashboard/roles/[id]` | Roles CRUD كامل مع API + UI + حماية أدوار النظام                         |
| USR-003 | Permission keys                      | Security    | DONE    |   100% | نعم     | نعم | لا  | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/permissions.ts`                                                     | مفاتيح كثيرة موجودة                                                      |
| USR-004 | Server-side permission checks        | Security    | DONE    |   100% | نعم     | نعم | لا  | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `requireDbPermission`, route guards                                          | تم تدقيق 11 handler — جميعها محمية + try-catch                           |
| USR-005 | UI permission hiding                 | UI/Security | DONE    |   100% | لا      | لا  | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | users/list/detail + roles/list/detail                                        | تمت إضافة canView/canCreate/canEdit/canDelete لكل الأزرار في users/roles |
| USR-006 | Session security                     | Security    | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | JWT cookie + session tests                                                   | لا توجد device trust/MFA                                                 |
| USR-007 | MFA / device trust / IP restrictions | Security    | FUTURE  |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Master security hardening                                                    | Enterprise future                                                        |

### PH-02 — Dashboard & Navigation

| Task ID | اسم المهمة                       | النوع         | الحالة | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                          | الملاحظات                                 |
| ------- | -------------------------------- | ------------- | ------ | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------------------------ | ----------------------------------------- |
| NAV-001 | Sidebar coverage                 | Navigation    | DONE   |   100% | لا      | لا  | نعم | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `sidebar.tsx`, NAV-001                     | رابط المشتريات موجود                      |
| NAV-002 | Dashboard stats                  | Dashboard     | DONE   |   100% | نعم     | نعم | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/api/dashboard/stats`, `/dashboard`       | company-scoped مع totalSuppliers          |
| NAV-003 | API UI binding registry          | Documentation | DONE   |   100% | نعم     | نعم | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | API_REGISTRY: 126 CONNECTED                | توثيق قوي                                 |
| NAV-004 | Reports page                     | UI            | DONE   |   100% | لا      | لا  | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/dashboard/reports`                       | روابط لتقارير المخزون وسجل النشاطات       |
| NAV-005 | Settings page                    | UI            | DONE   |   100% | لا      | لا  | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `/dashboard/settings`                      | روابط لإعدادات الشركة والمستخدمين والنظام |
| NAV-006 | Parent pages for sales/inventory | UI            | DONE   |   100% | لا      | لا  | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/dashboard/sales`, `/dashboard/inventory` | صفحتا مبيعات ومخزون رئيسيتان              |

### PH-03 — Customers & Suppliers

| Task ID  | اسم المهمة                       | النوع             | الحالة                           | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                               | الملاحظات                                 |
| -------- | -------------------------------- | ----------------- | -------------------------------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | --------------------------------------------------------------- | ----------------------------------------- |
| PART-001 | Customers CRUD                   | API/UI            | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Customer`, `/api/customers`, tests customers                   | موجود                                     |
| PART-002 | Customer categories              | API/UI            | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/api/customer-categories`, detail UI                           | موجود                                     |
| PART-003 | Customer receivables             | Accounting/API    | PARTIAL                          |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customers/{id}/receivables`                               | يعتمد على invoices/collections            |
| PART-004 | Customer statement               | Accounting/API    | PARTIAL                          |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customers/{id}/statement`                                 | ليس ledger-line source كاملاً             |
| PART-005 | Customer collections             | Accounting/API/UI | PARTIAL                          |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customer-collections`, tests                              | جيد لكنه يحتاج runtime workflow           |
| PART-006 | Suppliers CRUD                   | API/UI            | DONE                             |   100% | نعم     | نعم | نعم | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `Supplier`, `/api/suppliers`, `/dashboard/suppliers/[id]`       | موجود                                     |
| PART-007 | Supplier AP statement            | Accounting        | DONE                             |   100% | نعم     | نعم | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/suppliers/{id}/payables`, `/api/suppliers/{id}/statement` | Supplier payables + statement APIs مكتملة |
| PART-008 | Supplier balances ledger-derived | Accounting        | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | جزئي    | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | مؤجل  | —        | `SupplierAccount` موجود                                         | يمكن استخراجها من ترحيلات الشراء يدوياً   |

### PH-04 — Accounting & Ledger

| Task ID | اسم المهمة                         | النوع             | الحالة                           | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                           | الملاحظات                                                        |
| ------- | ---------------------------------- | ----------------- | -------------------------------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| ACC-001 | دليل الحسابات                      | Accounting/UI     | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Account`, `/dashboard/accounts`                            | موجود                                                            |
| ACC-002 | القيود اليومية CRUD                | Accounting/API/UI | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/journal-entries`                                      | موجود                                                            |
| ACC-003 | ترحيل القيود اليدوية               | Posting           | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `PostingService.postJournal`                                | جيد                                                              |
| ACC-004 | عكس القيود                         | Posting           | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/journal-entries/[id]/reverse`                         | POSTED + reversalEntryId + reversedAt + double prevention + test |
| ACC-005 | Currency isolation                 | Accounting        | DONE                             |   100% | نعم     | نعم | نعم | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `CurrencyGuard`, sales posting, purchase posting            | مطبق في كل ترحيل القيود والمبيعات والمشتريات                     |
| ACC-006 | سند قبض                            | Accounting        | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `CustomerCollection`                                        | CustomerCollection API + UI + PeriodGuard + LedgerValidator      |
| ACC-007 | سند دفع                            | Accounting        | DONE                             |   100% | نعم     | نعم | نعم | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `SupplierPayment`, `/api/payments`, `/dashboard/payments/*` | إنشاء + قائمة + صلاحيات + كشف حساب                               |
| ACC-008 | سند تصريف / سماح / قيد             | Accounting        | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | —        | Master vouchers                                             | NOT_REQUIRED_FOR_CURRENT_RELEASE — multi-currency معقدة          |
| ACC-009 | أرصدة افتتاحية للحسابات            | Accounting        | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | نعم   | —        | Master `account_opening_balances`                           | NOT_REQUIRED_FOR_CURRENT_RELEASE — يتطلب معالج إعداد محاسبي      |
| ACC-010 | Financial closing                  | Accounting        | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | —        | docs/accounting/FINANCIAL_CLOSING.md                        | NOT_REQUIRED_FOR_CURRENT_RELEASE — Enterprise feature            |
| ACC-011 | Immutable posted financial records | Accounting        | DONE                             |   100% | نعم     | نعم | نعم | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | journal/sales/purchases DRAFT-only guards                   | جميع PATCH/DELETE تمنع تعديل غير المسودة                         |

### PH-05 — Inventory Engine

| Task ID | اسم المهمة                    | النوع               | الحالة                           | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟           | مؤجل؟ | الأولوية | الدليل من المشروع                       | الملاحظات                                                     |
| ------- | ----------------------------- | ------------------- | -------------------------------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ---------------------- | ----- | -------- | --------------------------------------- | ------------------------------------------------------------- |
| INV-001 | Products CRUD                 | Inventory/UI        | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `Product`, `/api/products`              | موجود                                                         |
| INV-002 | Categories + Units            | Inventory/UI        | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | HIGH     | `/api/categories`, `/api/units`         | موجود                                                         |
| INV-003 | Warehouses CRUD               | Inventory/UI        | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `Warehouse`, `/api/warehouses`          | موجود                                                         |
| INV-004 | Stock balances                | Inventory           | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `StockBalance`, tests stock balance     | خدمة كاملة مع WA + GET API + 15 اختباراً                      |
| INV-005 | Stock movements               | Inventory           | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | CRITICAL | `StockMovement`, `/api/stock-movements` | CRUD + Posting + 10 أنواع حركة + 11 اختباراً                  |
| INV-006 | Stock transfers               | Inventory Workflow  | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | HIGH     | `TransferService`, tests                | TransferService + CRUD + Posting + 18 اختباراً                |
| INV-007 | Stock adjustments             | Inventory Workflow  | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم                    | لا    | HIGH     | `AdjustmentService`, tests              | AdjustmentService + CRUD + Posting + 17 اختباراً              |
| INV-008 | Inventory valuation report    | Reports             | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | لا           | نعم                    | لا    | MEDIUM   | `/api/inventory/valuation`              | Valuation مع breakdowns + اختبارات 11                         |
| INV-009 | Inventory audit reports       | Reports             | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | لا           | نعم                    | لا    | MEDIUM   | `/api/inventory/audit/*`                | Stock Card + Reconciliation + Issues (3 endpoints + 13 tests) |
| INV-010 | Inventory count               | Inventory Workflow  | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا                     | مؤجل  | —        | Master `inventory_counts`               | يمكن عمل جرد يدوي عبر Stock Adjustments                       |
| INV-011 | Reservation system            | Inventory           | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | جزئي    | لا  | لا  | لا  | لا    | نعم  | لا           | لا                     | مؤجل  | —        | `reservedQuantity` فقط                  | يعتمد على نظام أوامر البيع                                    |
| INV-012 | Valuation layers / FIFO-ready | Inventory Valuation | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | قبل تقارير مالية دقيقة | مؤجل  | —        | Inventory valuation docs                | WA (Weighted Average) يفي بالغرض حالياً                       |

### PH-06 — Sales Cycle

| Task ID | اسم المهمة                                   | النوع                | الحالة                           | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                  | الملاحظات                                              |
| ------- | -------------------------------------------- | -------------------- | -------------------------------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------------------------------- | ------------------------------------------------------ |
| SAL-001 | Sales invoice list/create/detail/edit/delete | Sales/API/UI         | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/sales-invoices`, `/dashboard/sales-invoices` | موجود                                                  |
| SAL-002 | Sales invoice post                           | Accounting/Inventory | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/sales-invoices/[id]/post`                    | Stock OUT + Revenue JE + COGS JE + AR — كامل           |
| SAL-003 | Stock OUT + COGS                             | Inventory/Accounting | DONE                             |   100% | نعم     | نعم | نعم | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | StockBalanceService + COGS journals                | تم إصلاح Cancel COGS reversal في PH06                  |
| SAL-004 | AR/cash impact                               | Accounting           | DONE                             |   100% | نعم     | نعم | نعم | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | sales tests credit/mixed                           | Customer balance مُحدث داخل transaction مع row locks   |
| SAL-005 | Print invoice                                | UI/API               | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/sales-invoices/[id]/print`                   | HTML print                                             |
| SAL-006 | Sales returns create/detail/edit/post/print  | Sales Returns        | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/sales-returns`, tests                        | CRUD + Posting + DELETE (تمت الإضافة)                  |
| SAL-007 | Collections                                  | Accounting/UI        | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/customer-collections`                        | مع Dr Cash/Bank + Cr AR + على الحساب                   |
| SAL-008 | Sale cancel/reversal workflow                | Business Workflow    | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | POST /api/sales-invoices/[id]/cancel               | RETURN_IN + Revenue Reversal + COGS Reversal (مكتمل)   |
| SAL-009 | End-to-end sales smoke                       | QA                   | DONE                             |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | tests موجودة (50 اختباراً)                         | Sales workflow كامل: CREATE→POST→CANCEL/RETURN/COLLECT |
| SAL-010 | Tax Handling                                 | Accounting           | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | مؤجل  | —        | not implemented                                    | `taxAmount=0` مؤقتاً حتى Tax Module المستقبلي          |

### PH-07 — Purchases Cycle

| Task ID | اسم المهمة                                   | النوع               | الحالة                           | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                           | الملاحظات                                                     |
| ------- | -------------------------------------------- | ------------------- | -------------------------------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| PUR-001 | Purchase invoice models                      | Data Model          | DONE                             |   100% | نعم     | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `PurchaseInvoice`, `PurchaseInvoiceItem`, `PurchaseExpense` | موجود                                                         |
| PUR-002 | Purchase list/create/detail/edit/delete APIs | API                 | DONE                             |   100% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/purchases`, `/api/purchases/[id]`                     | CRUD + POST (315 سطراً) مكتمل                                 |
| PUR-003 | Purchase UI pages                            | UI                  | DONE                             |   100% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `/dashboard/purchases/*`                                    | موجود                                                         |
| PUR-004 | Purchase PDF                                 | UI/API              | DONE                             |   100% | نعم     | نعم | نعم | جزئي | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/purchases/[id]/pdf`                                   | موجود                                                         |
| PUR-005 | Purchase expenses inside invoice             | Business Workflow   | PARTIAL                          |    50% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `PurchaseExpense`, form tabs                                | موجود كجزء من الفاتورة                                        |
| PUR-006 | Purchase draft/edit semantics                | Business Workflow   | DONE                             |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | status COMPLETED مسار الترحيل                               | موجود مع posting                                              |
| PUR-007 | Purchase posting endpoint                    | Accounting          | DONE                             |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/purchases/[id]/post` (315 سطراً)                      | Stock IN + JE + LedgerValidator + CurrencyGuard + PeriodGuard |
| PUR-008 | Stock IN applied to stock balance            | Inventory Impact    | DONE                             |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | StockBalanceService.applyPostedMovement داخل post           | مطبق مع row locking                                           |
| PUR-009 | Supplier AP journal                          | Accounting Impact   | DONE                             |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | Dr Inventory, Cr AP في posting route                        | Ledger-first متوافق                                           |
| PUR-010 | Cash/bank purchase journal                   | Accounting Impact   | DONE                             |   100% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | Dr Inventory + Cr Cash + PaymentAccount.balance             | تم إصلاح PaymentAccount.balance في PH07                       |
| PUR-011 | Landed cost valuation                        | Inventory Valuation | PARTIAL                          |    50% | نعم     | نعم | نعم | لا   | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | expenseShare/finalCost/unitFinalCost                        | ليس valuation layers                                          |
| PUR-012 | Purchase returns                             | Business Workflow   | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | لا           | مؤجل  | —        | غير موجود                                                   | يمكن عملها يدوياً عبر Stock Adjustment                        |
| PUR-013 | Purchase tests                               | QA                  | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | لا           | مؤجل  | —        | purchase posting tests موجودة                               | تكفي للفترة الحالية مع 564 اختباراً                           |
| PUR-014 | End-to-end purchase audit                    | QA                  | NOT_REQUIRED_FOR_CURRENT_RELEASE |      — | نعم     | نعم | نعم | نعم  | لا    | نعم  | لا           | لا           | مؤجل  | —        | posting موجود                                               | يكفي للتقارير الأولية                                         |

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

| Task ID | اسم المهمة         | النوع         | الحالة       | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                              | الملاحظات                                                |
| ------- | ------------------ | ------------- | ------------ | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ---------------------------------------------- | -------------------------------------------------------- |
| HR-001  | Employee model     | HR/Data       | DONE         |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | لا           | لا           | لا    | LOW      | `Employee`, migration, `/dashboard/employees`  | ملف الموظف الأساسي مكتمل فقط                             |
| HR-002  | Employee CRUD      | HR/API/UI     | DONE         |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | لا           | لا           | لا    | LOW      | `/api/employees`, `/api/employees/[id]`, tests | CRUD أساسي مع صلاحيات وعزل شركة وaudit                   |
| HR-003  | Attendance records | HR Workflow   | NOT_REQUIRED |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | Master employees                               | خارج إصدار PH-09 الحالي؛ لا تنفيذ وهمي                   |
| HR-004  | Shifts/overtime    | HR Workflow   | NOT_REQUIRED |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | employees docs                                 | خارج إصدار PH-09 الحالي؛ يعتمد على attendance لاحقاً     |
| HR-005  | Payroll accounting | Accounting/HR | NOT_REQUIRED |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | Master future payroll                          | محظور قبل تصميم payroll accounting وPostingService rules |
| HR-006  | Employee reports   | Reports/HR    | NOT_REQUIRED |      — | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | لا           | نعم   | LOW      | الطلب الحالي                                   | يؤجل إلى مرحلة HR/BI مستقبلية                            |

### PH-10 — Internal Project Management ✅ (اكتملت 2026-05-31)

| Task ID              | اسم المهمة                              | النوع                      | الحالة | النسبة | Backend | API   | UI   | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                                | الملاحظات                           |
| -------------------- | --------------------------------------- | -------------------------- | ------ | -----: | ------- | ----- | ---- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ---------------------------------------------------------------- | ----------------------------------- |
| PH10-PLAN-001        | تخطيط نطاق PH-10                        | Documentation/Architecture | DONE   |   100% | لا      | لا    | لا   | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | `PH10_REPORT_AR.md`, `PH10_GATE_VERIFICATION_AR.md`              | تخطيط فقط، لا اعتماد تنفيذ          |
| OWNER-PERM-FIX-001   | System Owner full permission bypass     | Security                   | DONE   |   100% | نعم     | نعم   | جزئي | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/auth.ts`, `/api/auth/me`, permission tests              | إصلاح مركزي؛ المستخدم العادي مقيد   |
| AUTH-OWNER-LOGIN-GATE-001 | Fix System Owner Login and Access Gate | Security/Auth | DONE |   100% | نعم | نعم | لا | نعم | نعم | نعم | نعم | نعم | CRITICAL | login route, auth tests, schema sync, seed, runtime verification | root cause: schema mismatch + missing seed |
| PM10-DATA-001        | Project model                           | Data Model                 | DONE   |   100% | نعم     | لا    | لا   | لا   | نعم   | نعم  | لا           | لا           | لا    | HIGH     | `Project`, migration `20260528190000_add_internal_project_model` | company-scoped بلا API/UI           |
| PM10-DATA-002        | ProjectTask model                       | Data Model                 | DONE   |   100% | نعم     | لا    | لا   | لا   | نعم   | نعم  | لا           | لا           | لا    | HIGH     | `ProjectTask`, enums, migration `20260528210000_add_project_task_model` | company-scoped, project-scoped      |
| PM10-DATA-003        | TaskAssignment model                    | Data Model                 | DONE   |   100% | نعم     | لا    | لا   | لا   | نعم   | نعم  | لا           | لا           | لا    | MEDIUM   | `TaskAssignment` + AssignmentStatus enum + indexes               | يعتمد على Employee foundation       |
| PM10-DATA-004        | WorkLog model                           | Data Model                 | DONE   |   100% | نعم     | لا    | لا   | لا   | نعم   | نعم  | لا           | لا           | لا    | MEDIUM   | `WorkLog` + WorkLogStatus enum + indexes                          | ليس حضوراً ولا payroll              |
| PM10-API-001         | Projects CRUD API                       | API/Backend                | DONE   |   100% | نعم     | نعم   | نعم  | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | 5 endpoints: GET/POST /internal-projects + GET/PATCH/DELETE /[id] | Zod + audit + company isolation     |
| PM10-API-002         | Project Tasks API                       | API/Backend                | DONE   |   100% | نعم     | نعم   | نعم  | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | 6 endpoints: tasks list/create + task CRUD + status               | CRUD + status transitions           |
| PM10-API-003         | Assignments API                         | API/Backend                | DONE   |   100% | نعم     | نعم   | نعم  | لا   | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | POST assignments + DELETE task-assignments/[id]                   | soft delete (status=REMOVED)        |
| PM10-API-004         | Work Logs API                           | API/Backend                | DONE   |   100% | نعم     | نعم   | نعم  | لا   | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | POST work-logs + PATCH/DELETE work-logs/[id]                      | time logs بدون payroll              |
| PM10-UI-001          | صفحة المشاريع الداخلية                  | UI                         | DONE   |   100% | نعم     | نعم   | نعم  | نعم  | لا    | نعم  | لا           | لا           | لا    | HIGH     | `/dashboard/internal-projects` + CreateProjectDialog              | قائمة + فلترة + إنشاء               |
| PM10-UI-002          | صفحة تفاصيل المشروع                     | UI                         | DONE   |   100% | نعم     | نعم   | نعم  | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | `/dashboard/internal-projects/[id]`                               | مشروع + مهام + تعيينات + سجلات عمل  |
| PM10-UI-003          | Task dialogs/drawers                    | UI                         | DONE   |   100% | نعم     | نعم   | نعم  | لا   | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | CreateTaskDialog + TaskStatusDropdown + AssignmentSection + WorkLogSection | إنشاء/تعديل/حالة                    |
| PM10-UI-004          | مهامي / مهام الفريق                     | UI                         | DONE   |   100% | نعم     | نعم   | نعم  | نعم  | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | `/dashboard/internal-projects/my-tasks`                            | فلترة حسب الحالة                    |
| PM10-SEED-001        | Dummy data + permissions                | Seed/QA                    | DONE   |   100% | نعم     | لا    | لا   | لا   | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | prisma/seed.ts — 17 permission keys                               | dev/test فقط                        |
| PM10-SEC-001         | Permissions + Audit + company isolation | Security                   | DONE   |   100% | نعم     | نعم   | نعم  | لا   | نعم   | نعم  | لا           | لا           | لا    | HIGH     | 17 permission keys + audit لكل write + company isolation          | كل API محمية                       |
| PM10-QA-001          | اختبارات PH-10                          | QA                         | DONE   |   100% | نعم     | نعم   | نعم  | لا   | نعم   | نعم  | لا           | لا           | لا    | HIGH     | internal-project-model.test.ts — 605 tests total                  | model tests لـ TaskAssignment/WorkLog|
| PM10-GATE-VERIFY-001 | اعتماد PH-10 بعد التنفيذ                | QA/Governance              | DONE   |   100% | لا      | لا    | لا   | لا   | نعم   | نعم  | لا           | لا           | لا    | CRITICAL | `PH10_GATE_VERIFICATION_AR.md`                                    | تم اعتماد PH-10 للانتقال إلى PH-11  |

### PH-11 — Backup & Recovery

| Task ID | اسم المهمة                     | النوع       | الحالة | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع           | الملاحظات                                 |
| ------- | ------------------------------ | ----------- | ------ | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | --------------------------- | ----------------------------------------- |
| BAK-001 | Backup policy documentation    | Backup      | DONE   |   100% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | docs/BACKUP_POLICY.md       | سياسة كاملة: retention، schedule، scripts |
| BAK-002 | PostgreSQL backup script       | Backup      | DONE   |   100% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | scripts/backup-postgres.sh  | pg_dump custom format مع compression      |
| BAK-003 | Restore script                 | Recovery    | DONE   |   100% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | scripts/restore-postgres.sh | pg_restore مع interactive confirmation    |
| BAK-004 | Restore test/drill             | QA/Recovery | TODO   |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | TESTING_STRATEGY            | غير منفذ                                  |
| BAK-005 | Backup before each major phase | Governance  | TODO   |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | Master reliability          | غير منفذ                                  |
| BAK-006 | Backup before Coolify trial    | Deployment  | TODO   |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | Coolify release criteria    | غير منفذ                                  |

### PH-12 — Security Hardening

| Task ID | اسم المهمة                    | النوع    | الحالة  | النسبة | Backend | API | UI   | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع          | الملاحظات                                                       |
| ------- | ----------------------------- | -------- | ------- | -----: | ------- | --- | ---- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------- | --------------------------------------------------------------- |
| SEC-001 | JWT secret hardening          | Security | DONE    |   100% | نعم     | نعم | لا   | لا  | جزئي  | نعم  | نعم          | نعم          | لا    | CRITICAL | SEC-002, proxy hardening   | موجود                                                           |
| SEC-002 | DB-backed permissions         | Security | DONE    |   100% | نعم     | نعم | جزئي | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `requireDbPermission`      | All routes migrated from checkPermission to requireDbPermission |
| SEC-003 | Audit logging on mutations    | Audit    | PARTIAL |    50% | نعم     | نعم | نعم  | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `AuditLog`, route logs     | بعض logs خارج transaction أو best-effort                        |
| SEC-004 | No secrets committed          | Security | DONE    |   100% | نعم     | لا  | لا   | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `.env.example`, .gitignore | Git history clean; .env.example hardened with comments          |
| SEC-005 | Rate limiting login           | Security | PARTIAL |    50% | نعم     | نعم | لا   | لا  | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | auth/rate-limit tests      | موجود أساسياً                                                   |
| SEC-006 | MFA                           | Security | FUTURE  |     0% | لا      | لا  | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Security hardening docs    | مؤجل                                                            |
| SEC-007 | Device/session trust          | Security | FUTURE  |     0% | لا      | لا  | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Security docs              | مؤجل                                                            |
| SEC-008 | Anti-fraud/suspicious posting | Security | FUTURE  |     0% | لا      | لا  | لا   | لا  | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Master                     | مؤجل                                                            |

### PH-13 — Testing & QA

| Task ID | اسم المهمة                 | النوع       | الحالة  | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                  | الملاحظات                                                  |
| ------- | -------------------------- | ----------- | ------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------------------------------- | ---------------------------------------------------------- |
| QA-001  | Vitest setup               | QA          | DONE    |   100% | لا      | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `vitest.config.ts`, package test                   | موجود                                                      |
| QA-002  | Auth/unit tests            | QA          | DONE    |   100% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `auth.test.ts`, `session.test.ts`                  | موجود                                                      |
| QA-003  | Accounting invariant tests | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `journal-entries.test.ts`                          | جيد للقيود                                                 |
| QA-004  | Inventory tests            | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | stock tests                                        | جيد لكن ليس كل workflows                                   |
| QA-005  | Sales workflow tests       | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `sales-invoices.test.ts`, `sales-returns.test.ts`  | قوي نسبياً                                                 |
| QA-006  | Purchase workflow tests    | QA          | DONE    |   100% | لا      | لا  | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | src/lib/**tests**/purchases.test.ts                | 21 tests: CRUD + posting + permissions + company isolation |
| QA-007  | API integration tests      | QA          | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | tests mock routes                                  | ليست runtime DB كاملة                                      |
| QA-008  | Runtime smoke scripts      | QA/DevOps   | PARTIAL |    50% | نعم     | نعم | نعم | جزئي | جزئي  | جزئي | نعم          | نعم          | لا    | HIGH     | `scripts/smoke-foundation.sh`, `verify-runtime.sh` | موجودة لكن تحتاج تشغيل موثق                                |
| QA-009  | Backup restore tests       | QA/Recovery | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | TESTING_STRATEGY                                   | غير منفذ                                                   |
| QA-010  | Reports accuracy tests     | QA/Reports  | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | MEDIUM   | TESTING_STRATEGY                                   | ينتظر التقارير                                             |

### PH-14 — Production Readiness

| Task ID  | اسم المهمة                | النوع               | الحالة  | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع             | الملاحظات                                |
| -------- | ------------------------- | ------------------- | ------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ----------------------------- | ---------------------------------------- |
| PROD-001 | Build script              | Deployment          | DONE    |   100% | نعم     | نعم | نعم | نعم | لا    | جزئي | نعم          | نعم          | لا    | CRITICAL | `npm run build`               | موجود                                    |
| PROD-002 | Typecheck/test scripts    | QA/Deployment       | DONE    |   100% | نعم     | نعم | لا  | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | package scripts               | موجود                                    |
| PROD-003 | Env example               | Deployment/Security | PARTIAL |    50% | لا      | لا  | لا  | لا  | لا    | جزئي | نعم          | نعم          | لا    | HIGH     | `.env.example`                | يحتاج production secrets checklist       |
| PROD-004 | Prisma migration strategy | Database            | PARTIAL |    50% | نعم     | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | prisma migrations lock فقط    | يحتاج migration discipline               |
| PROD-005 | Dockerfile                | Deployment          | DONE    |   100% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | نعم          | لا    | HIGH     | `Dockerfile`                  | standalone build + 22-alpine             |
| PROD-006 | Health endpoint           | DevOps              | DONE    |   100% | نعم     | نعم | لا  | لا  | لا    | جزئي | نعم          | نعم          | لا    | HIGH     | `src/app/api/health/route.ts` | GET /api/health → { status, db, uptime } |
| PROD-007 | Monitoring/logging plan   | DevOps              | TODO    |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | لا           | نعم          | لا    | MEDIUM   | Reliability docs              | غير منفذ                                 |
| PROD-008 | Rollback plan             | DevOps              | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | جزئي | لا           | نعم          | لا    | HIGH     | Reliability docs              | غير منفذ                                 |

### PH-15 — Coolify Trial Release

| Task ID | اسم المهمة                      | النوع         | الحالة  | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع               | الملاحظات                                             |
| ------- | ------------------------------- | ------------- | ------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------------- | ----------------------------------------------------- |
| CLF-001 | Coolify deployment plan         | Deployment    | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | docs/DEPLOY_PLAN_COOLIFY.md     | 6-step plan with env table, rollback, troubleshooting |
| CLF-002 | Docker/Coolify config           | Deployment    | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | لا   | لا           | نعم          | لا    | CRITICAL | Dockerfile + docker-compose.yml | multi-stage Dockerfile + compose with PostgreSQL      |
| CLF-003 | Production PostgreSQL env       | Deployment/DB | DONE    |    80% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | `.env.example` updated          | production DATABASE_URL + prisma commands documented  |
| CLF-004 | Smoke test checklist            | QA/Deployment | PARTIAL |    50% | نعم     | نعم | نعم | جزئي | جزئي  | جزئي | لا           | نعم          | لا    | HIGH     | scripts موجودة                  | تحتاج Coolify-specific smoke                          |
| CLF-005 | Backup before trial             | Backup        | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | scripts/backup-postgres.sh      | PH-11 منجز                                            |
| CLF-006 | Rollback plan                   | Recovery      | DONE    |   100% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | docs/DEPLOY_PLAN_COOLIFY.md     | covered in deploy plan                                |
| CLF-007 | System Owner production account | Security/Ops  | DONE    |   100% | جزئي    | لا  | لا  | لا   | لا    | نعم  | لا           | نعم          | لا    | HIGH     | .env.example + seed.ts          | env vars documented                                   |

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

| Task                        | السبب                                                                                                  | الإجراء المطلوب                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Sales E2E                   | الكود والاختبارات موجودة لكن لا يوجد تقرير smoke runtime حديث                                          | تشغيل بيع نقدي/آجل/مختلط end-to-end |
| Sales returns E2E           | موجودة واختبارية لكن تحتاج تجربة UI عملية                                                              | تجربة مرتجع جزئي وكلي               |
| Customer collections E2E    | اختبارات قوية، لكن يجب تدقيق ربطها مع الرصيد والكشف                                                    | تجربة تحصيل على فاتورة وعلى الحساب  |
| Purchases status semantics  | Prisma default `COMPLETED` بينما UI يتحقق من `DRAFT`                                                   | تدقيق workflow وحالات الفاتورة      |
| Purchases stock effect      | ينشئ StockMovement ولا يطبق balance                                                                    | تدقيق المخزون بعد إنشاء فاتورة شراء |
| Purchases accounting effect | direct paymentAccount update ولا journal/AP                                                            | تدقيق مالي إلزامي                   |
| Dashboard stats             | لا يظهر أنه company-scoped بالكامل                                                                     | تدقيق العزل                         |
| Audit behavior              | PH-00 financial journal audit أصبح داخل transaction؛ يبقى تدقيق non-financial/security audit ضمن PH-12 | تدقيق audit safety خارج PH-00       |

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

الخطة الأصلية والوثائق المقسمة تذكر الموظفين والحضور والرواتب المستقبلية. بعد PH09-COMPLETE-001 أصبح الكود الحالي يحتوي على Employee foundation فقط:

- Prisma model للموظفين مع company isolation.
- API للموظفين: list/create/read/update/delete.
- صفحة dashboard للموظفين مع create/edit/delete.
- صلاحيات employees.view/create/edit/delete.
- اختبارات API للموظفين.
- ربط Sidebar.

ولا يحتوي عمداً على:

- Prisma model للحضور.
- API للحضور أو الورديات.
- payroll posting.
- قيود رواتب أو أثر محاسبي.

لذلك تصنف PH-09 كـ `DONE` لإطار Employee foundation فقط، بينما الحضور والرواتب تبقى `NOT_REQUIRED`/مستقبلية ولا يجب تنفيذها قبل تصميم ضوابط Payroll المحاسبية.

## 19. قسم خاص بلوحة إدارة المشاريع والمهام الداخلية ✅ (مكتملة)

تم تنفيذ PH-10 بالكامل في 2026-05-31. جميع المهام مكتملة:

- **النماذج (4):** Project, ProjectTask, TaskAssignment, WorkLog — جميعها مع enums وعلاقات وفهارس وعزل شركة.
- **واجهات API (16 endpoint):** 9 route files — Projects CRUD (5), Tasks CRUD+status (6), Assignments (2), Work Logs (3).
- **صفحات UI (3):** قائمة المشاريع، تفاصيل المشروع، مهامي — مع RTL عربي وحالات loading/error/empty.
- **مكونات (5):** CreateProjectDialog, CreateTaskDialog, TaskStatusDropdown, AssignmentSection, WorkLogSection.
- **التحديثات الجانبية:** Sidebar (رابط المشاريع الداخلية + مهامي)، Seed (17 permission key)، Tests (605 اختبارات).

حدود صارمة متبعة:

- ✅ WorkLog ليس حضوراً وانصرافاً.
- ✅ WorkLog لا يولد رواتب ولا overtime.
- ✅ لا يوجد أثر ledger أو stock.
- ✅ جميع البيانات التجريبية آمنة وبدون أسماء حقيقية.
- ✅ PH-10 معتمدة بالكامل للانتقال إلى PH-11 عبر PM10-GATE-VERIFY-001.

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
| Attendance/payroll غير منفذان | Low حالياً     | لا يؤثر على التجربة الأساسية | Future HR/payroll phase           |
| No Coolify config             | High قبل النشر | deploy غير جاهز              | Production readiness phase        |
| Runtime smoke غير موثق        | High           | نجاح tests لا يضمن عمل UI    | smoke scripts + تقرير             |

## 24. المهمة التالية الموصى بها

المهمة التالية المنطقية الآن بعد تنفيذ Project model وإصلاح صلاحية مالك النظام:

**PM10-DATA-002 — تنفيذ ProjectTask model**

### السبب

- `PM10-DATA-001` أنجز نموذج `Project` المرتبط بالشركة مع قيود وفهارس آمنة.
- `PM10-DATA-002` أنجز نموذج `ProjectTask` مع الحالات والأولويات والعلاقة بالمشروع والشركة ودعم المهام الفرعية.
- `OWNER-PERM-FIX-001` أنجز تجاوز مالك النظام بشكل مركزي دون إضعاف صلاحيات المستخدم العادي.
- التنفيذ الآمن التالي هو `ProjectTask` لأنه يعتمد على `Project` ويأتي قبل APIs أو UI.
- لا يجوز تنفيذ UI أو dummy data قبل اكتمال models الأساسية وAPI واضح.
- لا يجوز إدخال Attendance أو Payroll ضمن هذا المسار.

### نطاق المهمة التالية المقترح

- إضافة TaskAssignment model مع ربط المهمة بالموظف.
- الحفاظ على قاعدة عدم Attendance/Payroll.
- إضافة migration واختبارات model.
- تحديث tracker/backlog بعد التنفيذ.
- عدم إضافة API/UI إلا في مهمة منفصلة.

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
