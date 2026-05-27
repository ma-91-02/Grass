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

## 5. ملخص تنفيذي

| المؤشر                                                               | النتيجة                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| API route files                                                      | 68                                                                              |
| API methods حسب `API_REGISTRY.md`                                    | 129                                                                             |
| API methods مربوطة بالواجهة                                          | 126                                                                             |
| Backend-only endpoints                                               | 3                                                                               |
| صفحات Dashboard                                                      | 62                                                                              |
| روابط Sidebar مباشرة                                                 | 27 تقريباً                                                                      |
| ملفات الاختبار                                                       | 22                                                                              |
| test cases / describe / it تقريباً                                   | 621                                                                             |
| النسبة العامة التقريبية للمشروع المؤسسي                              | 46%                                                                             |
| النسبة التقريبية للنواة القابلة للتجربة بعد تدقيق المبيعات/المشتريات | 61% تقريباً                                                                     |
| المرحلة الحالية                                                      | تدقيق المشتريات End-to-End قبل التقارير                                         |
| المهمة التالية الموصى بها                                            | PUR-AUDIT-001 — تدقيق دورة المشتريات كاملة من الإنشاء إلى الأثر المالي والمخزني |

### أهم الاستنتاجات

- Foundation وUI Binding قطعا شوطاً كبيراً: Auth، RBAC، companies، branches، fiscal periods، chart of accounts، journal entries، معظم صفحات dashboard، وSidebar موجودة. بعد PH00-COMPLETE-001 أصبحت فجوات PH-00 العملية مغلقة، وبقي smoke runtime الدوري جزءاً من QA/Release وليس blocker داخل Foundation.
- المخزون والمبيعات لهما تنفيذ أعمق من المشتريات، مع خدمات stock balance وposting tests للمبيعات والمرتجعات.
- المشتريات تمتلك UI وAPI وPDF ومصاريف داخل الفاتورة، لكنها لا تحقق بعد فلسفة الخطة الأصلية بالكامل: لا يوجد endpoint ترحيل مشتريات، لا يوجد AP journal، لا توجد Purchase Returns، لا توجد اختبارات مشتريات، وتوجد تحديثات مباشرة على `paymentAccount.balance` و`product.purchasePrice`.
- التقارير العامة ما زالت placeholder، رغم وجود dashboard stats وتقارير inventory valuation/audit.
- HR، الرواتب، إدارة المشاريع الداخلية، backup/restore المؤسسي، وCoolify deployment ما زالت مستقبلية أو TODO.

## 6. المرحلة الحالية

المرحلة الحالية حسب المقارنة بين الخطة والكود هي:

**Phase 7 — Purchases End-to-End Audit & Posting Hardening**

السبب:

- `docs/api/API_REGISTRY.md` يوضح أن endpoints المشتريات مربوطة بالواجهة.
- توجد صفحات:
  - `/dashboard/purchases`
  - `/dashboard/purchases/new`
  - `/dashboard/purchases/[id]`
  - `/dashboard/purchases/[id]/edit`
- يوجد Prisma model: `PurchaseInvoice`, `PurchaseInvoiceItem`, `PurchaseExpense`.
- يوجد PDF: `/api/purchases/{id}/pdf`.
- لكن الخطة الأصلية تتطلب purchase posting، supplier AP، stock IN posted movement، valuation layers، purchase returns، وimmutability.
- الكود الحالي ينشئ `StockMovement` بحالة افتراضية `DRAFT` ولا يطبق `StockBalanceService.applyPostedMovement`.
- الكود الحالي يحدث `paymentAccount.balance` مباشرة داخل purchase routes.
- لا يوجد `POST /api/purchases/{id}/post`.
- لا يوجد model أو API أو UI لـ `PurchaseReturn`.
- لا توجد اختبارات مشتريات في `src/lib/__tests__`.

لذلك لا يُنصح بالانتقال إلى التقارير المالية قبل تدقيق المشتريات وتحديد فجواتها بدقة.

## 7. جدول المراحل الرئيسي

| Phase ID | اسم المرحلة                 | الهدف                                                                | الحالة      | الإنجاز | مطلوبة للتجربة؟             | مطلوبة قبل Coolify؟ | المهمة التالية داخلها                        | ملاحظات                                                            |
| -------- | --------------------------- | -------------------------------------------------------------------- | ----------- | ------: | --------------------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| PH-00    | Foundation Core             | Auth, RBAC, Company, Branch, Fiscal Periods, COA, Journal foundation | DONE        |    100% | نعم                         | نعم                 | لا توجد مهمة PH-00 متبقية؛ التالي PUR-AUDIT-001 | اكتملت فجوات Foundation العملية، وsmoke runtime يبقى ضمن QA الدوري |
| PH-01    | Users & Permissions         | المستخدمون، الأدوار، الصلاحيات، الجلسات                              | PARTIAL     |     75% | نعم                         | نعم                 | تدقيق Roles editor وpermission coverage      | يوجد users/roles basic، لكن لا توجد MFA أو role detail editor كامل |
| PH-02    | Dashboard & Navigation      | Sidebar، parent pages، navigation coverage، UI binding               | PARTIAL     |     70% | نعم                         | نعم                 | إصلاح dashboard/settings placeholders لاحقاً | Zero NO_UI موثق، لكن بعض الصفحات placeholder                       |
| PH-03    | Customers & Suppliers       | العملاء، الموردون، الذمم، كشوفات العملاء                             | PARTIAL     |     80% | نعم                         | نعم                 | تدقيق supplier AP مع المشتريات               | العملاء أقوى من الموردين بسبب collections/receivables              |
| PH-04    | Accounting & Ledger         | القيود، دليل الحسابات، posting، العملات، السندات                     | PARTIAL     |     58% | نعم                         | نعم                 | تدقيق السندات غير المنفذة                    | Journals موجودة، vouchers الكاملة غير موجودة                       |
| PH-05    | Inventory Engine            | مواد، مخازن، حركات، أرصدة، تحويلات، تسويات، تقييم                    | PARTIAL     |     62% | نعم                         | نعم                 | تدقيق opening/count/reservation gaps         | لا يوجد inventory count أو reservations كاملة                      |
| PH-06    | Sales Cycle                 | فواتير بيع، مرتجعات، تحصيل، stock OUT، COGS، AR                      | NEEDS_AUDIT |     76% | نعم                         | نعم                 | Business workflow smoke للمبيعات             | تنفيذ واختبارات قوية لكن يحتاج تجربة runtime                       |
| PH-07    | Purchases Cycle             | مشتريات، مصاريف، supplier AP، stock IN، returns                      | PARTIAL     |     38% | نعم                         | نعم                 | PUR-AUDIT-001                                | UI/API موجودان لكن posting المالي والمخزني ناقص                    |
| PH-08    | Reports & BI                | تقارير مالية، مبيعات، مخزون، ديون، KPIs، exports                     | TODO        |     24% | لا جزئياً                   | بعد التجربة         | تعريف تقارير MVP بعد تدقيق البيع/الشراء      | reports page placeholder                                           |
| PH-09    | Employees / HR / Payroll    | موظفون، دوام، رواتب مستقبلية                                         | FUTURE      |      0% | لا                          | لا                  | تصميم Phase HR لاحق                          | مذكور في الخطة ولا يوجد كود حالي                                   |
| PH-10    | Internal Project Management | مشاريع داخلية، مهام، إنتاجية، وقت عمل                                | FUTURE      |      0% | لا                          | لا                  | تعريف blueprint مستقبلي                      | غير موجود في الخطة التنفيذية الحالية                               |
| PH-11    | Backup & Recovery           | PostgreSQL backup، restore، drills، phase snapshots                  | TODO        |      8% | نعم قبل تجربة بيانات حقيقية | نعم                 | كتابة خطة backup بدون سكربت تنفيذ            | لا يوجد script backup/restore                                      |
| PH-12    | Security Hardening          | JWT، RBAC، audit، secrets، MFA، anti-fraud                           | PARTIAL     |     45% | نعم                         | نعم                 | تدقيق secrets وproduction auth               | JWT/RBAC موجود، MFA/device trust مستقبلية                          |
| PH-13    | Testing & QA                | Unit/API/integration/workflow/accounting/inventory tests             | PARTIAL     |     52% | نعم                         | نعم                 | إضافة purchase workflow tests بعد audit      | توجد 18 test files، فجوة المشتريات والتقارير                       |
| PH-14    | Production Readiness        | env، scripts، monitoring، migrations، owner، rollback                | TODO        |     32% | نعم                         | نعم                 | Production readiness checklist               | build/test scripts موجودة، Docker/Coolify غير موجود                |
| PH-15    | Coolify Trial Release       | تجهيز deploy تجريبي على Coolify                                      | TODO        |      7% | لا                          | نعم                 | لا تبدأ قبل backup + purchase audit          | لا يوجد Docker/Coolify config                                      |

## 8. تفاصيل كل مرحلة

### PH-00 — Foundation Core

| Task ID | اسم المهمة                   | النوع       | الحالة  | النسبة | Backend | API  | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                   | الملاحظات                                             |
| ------- | ---------------------------- | ----------- | ------- | -----: | ------- | ---- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | --------------------------------------------------- | ----------------------------------------------------- |
| FND-001 | Auth login/logout/me         | Backend/API | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/auth/*`, `/auth/login`, tests auth/session    | مكتمل، وsmoke runtime دوري ضمن QA/Release              |
| FND-002 | Company model + APIs         | Data/API    | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Company`, `/api/companies`, `/dashboard/companies` | موجود ومربوط                                          |
| FND-003 | Branch model + APIs          | Data/API    | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `Branch`, `/api/branches`, `/dashboard/branches`    | موجود                                                 |
| FND-004 | Fiscal periods               | Accounting  | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `FiscalPeriod`, `/api/fiscal-periods`, PeriodGuard  | Foundation guard مكتمل؛ close engine المتقدم خارج PH-00 |
| FND-005 | Chart of Accounts foundation | Accounting  | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Account`, `/api/accounts`, `/dashboard/accounts`, `/api/accounts/tree` | تم تدقيق seed الأساسي وإغلاق عزل الشركة في tree API |
| FND-006 | JournalEntry / JournalLine   | Accounting  | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `JournalEntry`, `/api/journal-entries`              | موجود مع post/reverse ومعاملات audit مالية آمنة       |
| FND-007 | PostingService foundation    | Accounting  | DONE    |   100% | نعم     | نعم  | لا  | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/services/posting-service.ts`               | Foundation journal posting مكتمل؛ source documents تخص phases لاحقة |
| FND-008 | Audit baseline               | Security    | DONE    |   100% | نعم     | نعم  | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `AuditLog`, `/api/audit-logs`, journal audit transaction tests | baseline مكتمل؛ hash-chain/append-only المؤسسي ضمن PH-12 |

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

### PH-01 — Users & Permissions

| Task ID | اسم المهمة                           | النوع       | الحالة  | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                   | الملاحظات                     |
| ------- | ------------------------------------ | ----------- | ------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ----------------------------------- | ----------------------------- |
| USR-001 | Users list/create/detail/edit/delete | UI/API      | DONE    |   100% | نعم     | نعم | نعم | نعم  | جزئي  | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/users`, `/dashboard/users`    | موجود                         |
| USR-002 | Roles list                           | UI/API      | PARTIAL |    50% | نعم     | نعم | نعم | نعم  | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/roles`, `/dashboard/roles`    | صفحة roles read-only تقريباً  |
| USR-003 | Permission keys                      | Security    | DONE    |   100% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `src/lib/permissions.ts`            | مفاتيح كثيرة موجودة           |
| USR-004 | Server-side permission checks        | Security    | PARTIAL |    50% | نعم     | نعم | لا  | لا   | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `requireDbPermission`, route guards | يحتاج audit شامل لكل endpoint |
| USR-005 | UI permission hiding                 | UI/Security | PARTIAL |    50% | لا      | لا  | نعم | جزئي | لا    | جزئي | نعم          | نعم          | لا    | HIGH     | purchases/buttons/users pages       | يحتاج تدقيق موحد              |
| USR-006 | Session security                     | Security    | PARTIAL |    50% | نعم     | نعم | نعم | نعم  | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | JWT cookie + session tests          | لا توجد device trust/MFA      |
| USR-007 | MFA / device trust / IP restrictions | Security    | FUTURE  |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | لا           | نعم   | MEDIUM   | Master security hardening           | Enterprise future             |

### PH-02 — Dashboard & Navigation

| Task ID | اسم المهمة                       | النوع         | الحالة  | النسبة | Backend | API | UI   | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                    | الملاحظات                                 |
| ------- | -------------------------------- | ------------- | ------- | -----: | ------- | --- | ---- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------------------ | ----------------------------------------- |
| NAV-001 | Sidebar coverage                 | Navigation    | DONE    |   100% | لا      | لا  | نعم  | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `sidebar.tsx`, NAV-001               | رابط المشتريات موجود                      |
| NAV-002 | Dashboard stats                  | Dashboard     | PARTIAL |    50% | نعم     | نعم | نعم  | نعم | لا    | جزئي | نعم          | نعم          | لا    | MEDIUM   | `/api/dashboard/stats`, `/dashboard` | stats بسيطة وغير company-scoped بشكل كامل |
| NAV-003 | API UI binding registry          | Documentation | DONE    |   100% | نعم     | نعم | نعم  | نعم | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | API_REGISTRY: 126 CONNECTED          | توثيق قوي                                 |
| NAV-004 | Reports page placeholder         | UI            | TODO    |     0% | لا      | لا  | جزئي | نعم | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | `/dashboard/reports` placeholder     | يؤجل بعد تدقيق البيع/الشراء               |
| NAV-005 | Settings page placeholder        | UI            | TODO    |     0% | لا      | لا  | جزئي | نعم | لا    | نعم  | نعم جزئياً   | نعم          | لا    | HIGH     | `/dashboard/settings` placeholder    | مطلوب لاحقاً للحسابات النظامية            |
| NAV-006 | Parent pages for sales/inventory | UI            | PARTIAL |    50% | لا      | لا  | نعم  | نعم | لا    | جزئي | نعم          | نعم          | لا    | MEDIUM   | `/dashboard/sales`, inventory pages  | بعضها hub بسيط                            |

### PH-03 — Customers & Suppliers

| Task ID  | اسم المهمة                       | النوع             | الحالة  | النسبة | Backend | API | UI  | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                                         | الملاحظات                       |
| -------- | -------------------------------- | ----------------- | ------- | -----: | ------- | --- | --- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | --------------------------------------------------------- | ------------------------------- |
| PART-001 | Customers CRUD                   | API/UI            | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Customer`, `/api/customers`, tests customers             | موجود                           |
| PART-002 | Customer categories              | API/UI            | DONE    |   100% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | MEDIUM   | `/api/customer-categories`, detail UI                     | موجود                           |
| PART-003 | Customer receivables             | Accounting/API    | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customers/{id}/receivables`                         | يعتمد على invoices/collections  |
| PART-004 | Customer statement               | Accounting/API    | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customers/{id}/statement`                           | ليس ledger-line source كاملاً   |
| PART-005 | Customer collections             | Accounting/API/UI | PARTIAL |    50% | نعم     | نعم | نعم | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/customer-collections`, tests                        | جيد لكنه يحتاج runtime workflow |
| PART-006 | Suppliers CRUD                   | API/UI            | DONE    |   100% | نعم     | نعم | نعم | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `Supplier`, `/api/suppliers`, `/dashboard/suppliers/[id]` | موجود                           |
| PART-007 | Supplier AP statement            | Accounting        | TODO    |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | Master + SupplierAccount                                  | لم يوجد API كشف مورد            |
| PART-008 | Supplier balances ledger-derived | Accounting        | TODO    |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `SupplierAccount` موجود                                   | لا يوجد AP posting للمشتريات    |

### PH-04 — Accounting & Ledger

| Task ID | اسم المهمة                         | النوع             | الحالة  | النسبة | Backend | API  | UI   | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع                    | الملاحظات                                                  |
| ------- | ---------------------------------- | ----------------- | ------- | -----: | ------- | ---- | ---- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | ------------------------------------ | ---------------------------------------------------------- |
| ACC-001 | دليل الحسابات                      | Accounting/UI     | DONE    |   100% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `Account`, `/dashboard/accounts`     | موجود                                                      |
| ACC-002 | القيود اليومية CRUD                | Accounting/API/UI | DONE    |   100% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/journal-entries`               | موجود                                                      |
| ACC-003 | ترحيل القيود اليدوية               | Posting           | DONE    |   100% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `PostingService.postJournal`         | جيد                                                        |
| ACC-004 | عكس القيود                         | Posting           | PARTIAL |    50% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/journal-entries/[id]/reverse`  | ينشئ قيد عكسي DRAFT ويعلم الأصل REVERSED؛ يحتاج audit أعمق |
| ACC-005 | Currency isolation                 | Accounting        | PARTIAL |    50% | نعم     | جزئي | لا   | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `CurrencyGuard`, schemas             | مطبق في journal أكثر من كل الوثائق                         |
| ACC-006 | سند قبض                            | Accounting        | PARTIAL |    50% | نعم     | نعم  | نعم  | نعم | نعم   | نعم  | نعم          | نعم          | لا    | HIGH     | `CustomerCollection`                 | ليس باسم Voucher موحد                                      |
| ACC-007 | سند دفع                            | Accounting        | TODO    |     0% | لا      | لا   | لا   | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | Master vouchers                      | غير منفذ                                                   |
| ACC-008 | سند تصريف / سماح / قيد             | Accounting        | TODO    |     0% | لا      | لا   | لا   | لا  | لا    | نعم  | لا           | لا           | لا    | MEDIUM   | Master vouchers                      | مؤجل                                                       |
| ACC-009 | أرصدة افتتاحية للحسابات            | Accounting        | TODO    |     0% | لا      | لا   | لا   | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | Master `account_opening_balances`    | غير موجود في Prisma                                        |
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
| PUR-002 | Purchase list/create/detail/edit/delete APIs | API                 | PARTIAL     |    50% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `/api/purchases`, `/api/purchases/[id]`                     | موجود لكن بدون post/cancel                 |
| PUR-003 | Purchase UI pages                            | UI                  | DONE        |   100% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `/dashboard/purchases/*`                                    | موجود                                      |
| PUR-004 | Purchase PDF                                 | UI/API              | DONE        |   100% | نعم     | نعم | نعم | جزئي | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `/api/purchases/[id]/pdf`                                   | موجود                                      |
| PUR-005 | Purchase expenses inside invoice             | Business Workflow   | PARTIAL     |    50% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | `PurchaseExpense`, form tabs                                | موجود كجزء من الفاتورة                     |
| PUR-006 | Purchase draft/edit semantics                | Business Workflow   | NEEDS_AUDIT |    25% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | status default `COMPLETED`, UI checks `DRAFT`               | عدم اتساق واضح بين status و edit/delete UI |
| PUR-007 | Purchase posting endpoint                    | Accounting          | TODO        |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | لا يوجد `/api/purchases/[id]/post`                          | مطلوب قبل التقارير المالية                 |
| PUR-008 | Stock IN applied to stock balance            | Inventory Impact    | TODO        |     0% | جزئي    | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | purchase route ينشئ StockMovement فقط                       | لا يطبق StockBalanceService                |
| PUR-009 | Supplier AP journal                          | Accounting Impact   | TODO        |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | لا توجد journal entries للمشتريات                           | مخالف للـ ledger-first                     |
| PUR-010 | Cash/bank purchase journal                   | Accounting Impact   | TODO        |     0% | جزئي    | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | direct `paymentAccount.balance` update                      | يحتاج PostingService/journal               |
| PUR-011 | Landed cost valuation                        | Inventory Valuation | PARTIAL     |    50% | نعم     | نعم | نعم | لا   | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | expenseShare/finalCost/unitFinalCost                        | ليس valuation layers                       |
| PUR-012 | Purchase returns                             | Business Workflow   | TODO        |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | لا           | لا           | لا    | HIGH     | Master + docs purchases                                     | غير موجود                                  |
| PUR-013 | Purchase tests                               | QA                  | TODO        |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | لا يوجد `purchases.test.ts`                                 | فجوة مهمة                                  |
| PUR-014 | End-to-end purchase audit                    | QA                  | TODO        |     0% | نعم     | نعم | نعم | نعم  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | هذه المهمة التالية                                          | قبل التقارير                               |

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
| BAK-001 | Backup policy documentation    | Backup      | PARTIAL |    50% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | Reliability docs         | سياسة عامة فقط          |
| BAK-002 | PostgreSQL backup script       | Backup      | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | جزئي | نعم          | نعم          | لا    | CRITICAL | لا يوجد script backup    | مطلوب قبل بيانات حقيقية |
| BAK-003 | Restore script                 | Recovery    | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | جزئي | نعم          | نعم          | لا    | CRITICAL | لا يوجد restore          | مطلوب قبل Coolify       |
| BAK-004 | Restore test/drill             | QA/Recovery | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | TESTING_STRATEGY         | غير منفذ                |
| BAK-005 | Backup before each major phase | Governance  | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | نعم          | نعم          | لا    | HIGH     | Master reliability       | غير منفذ                |
| BAK-006 | Backup before Coolify trial    | Deployment  | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | نعم  | لا           | نعم          | لا    | CRITICAL | Coolify release criteria | غير منفذ                |

### PH-12 — Security Hardening

| Task ID | اسم المهمة                    | النوع    | الحالة  | النسبة | Backend | API | UI   | Nav | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع          | الملاحظات                                |
| ------- | ----------------------------- | -------- | ------- | -----: | ------- | --- | ---- | --- | ----- | ---- | ------------ | ------------ | ----- | -------- | -------------------------- | ---------------------------------------- |
| SEC-001 | JWT secret hardening          | Security | DONE    |   100% | نعم     | نعم | لا   | لا  | جزئي  | نعم  | نعم          | نعم          | لا    | CRITICAL | SEC-002, proxy hardening   | موجود                                    |
| SEC-002 | DB-backed permissions         | Security | PARTIAL |    50% | نعم     | نعم | جزئي | لا  | نعم   | نعم  | نعم          | نعم          | لا    | CRITICAL | `requireDbPermission`      | يحتاج endpoint audit                     |
| SEC-003 | Audit logging on mutations    | Audit    | PARTIAL |    50% | نعم     | نعم | نعم  | نعم | جزئي  | نعم  | نعم          | نعم          | لا    | HIGH     | `AuditLog`, route logs     | بعض logs خارج transaction أو best-effort |
| SEC-004 | No secrets committed          | Security | PARTIAL |    50% | نعم     | لا  | لا   | لا  | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | `.env.example`, .gitignore | يحتاج secrets audit قبل Coolify          |
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
| QA-006  | Purchase workflow tests    | QA          | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | نعم  | نعم          | نعم          | لا    | CRITICAL | لا يوجد purchases test                             | فجوة حالية                  |
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
| PROD-005 | Dockerfile                | Deployment          | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | لا   | لا           | نعم          | لا    | HIGH     | لا يوجد Dockerfile         | مطلوب لـ Coolify غالباً            |
| PROD-006 | Health endpoint           | DevOps              | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | جزئي | نعم          | نعم          | لا    | HIGH     | لا يوجد `/api/health`      | مطلوب قبل deploy                   |
| PROD-007 | Monitoring/logging plan   | DevOps              | TODO    |     0% | جزئي    | لا  | لا  | لا  | لا    | نعم  | لا           | نعم          | لا    | MEDIUM   | Reliability docs           | غير منفذ                           |
| PROD-008 | Rollback plan             | DevOps              | TODO    |     0% | لا      | لا  | لا  | لا  | لا    | جزئي | لا           | نعم          | لا    | HIGH     | Reliability docs           | غير منفذ                           |

### PH-15 — Coolify Trial Release

| Task ID | اسم المهمة                      | النوع         | الحالة  | النسبة | Backend | API | UI  | Nav  | Tests | Docs | قبل التجربة؟ | قبل Coolify؟ | مؤجل؟ | الأولوية | الدليل من المشروع      | الملاحظات                    |
| ------- | ------------------------------- | ------------- | ------- | -----: | ------- | --- | --- | ---- | ----- | ---- | ------------ | ------------ | ----- | -------- | ---------------------- | ---------------------------- |
| CLF-001 | Coolify deployment plan         | Deployment    | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | جزئي | لا           | نعم          | لا    | CRITICAL | لا يوجد Coolify config | لا تنفذ الآن                 |
| CLF-002 | Docker/Coolify config           | Deployment    | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | لا   | لا           | نعم          | لا    | CRITICAL | غير موجود              | بعد backup                   |
| CLF-003 | Production PostgreSQL env       | Deployment/DB | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | جزئي | لا           | نعم          | لا    | CRITICAL | `.env.example` فقط     | يحتاج secrets                |
| CLF-004 | Smoke test checklist            | QA/Deployment | PARTIAL |    50% | نعم     | نعم | نعم | جزئي | جزئي  | جزئي | لا           | نعم          | لا    | HIGH     | scripts موجودة         | تحتاج Coolify-specific smoke |
| CLF-005 | Backup before trial             | Backup        | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | جزئي | لا           | نعم          | لا    | CRITICAL | لا يوجد backup script  | blocker                      |
| CLF-006 | Rollback plan                   | Recovery      | TODO    |     0% | لا      | لا  | لا  | لا   | لا    | جزئي | لا           | نعم          | لا    | CRITICAL | غير منفذ               | blocker                      |
| CLF-007 | System Owner production account | Security/Ops  | TODO    |     0% | جزئي    | لا  | لا  | لا   | لا    | جزئي | لا           | نعم          | لا    | HIGH     | seed env vars          | يحتاج ضبط production         |

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
