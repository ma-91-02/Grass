# UI Completion Backlog — Grass ERP

> قائمة مهام إكمال الواجهة الأمامية مرتبة حسب الأولوية مع قواعد تنفيذ صارمة.
> آخر تحديث: 2026-05-27 (UI-039 — تفاصيل قسم العميل)

---

## 1. مقدمة

هذا الملف هو مصدر الحقيقة الوحيد لكل مهام إكمال الواجهة الأمامية. لا يجوز البدء بأي مهمة من خارج هذا الملف إلا بموافقة Tech Lead.

كل مهمة تعتمد على المهمة السابقة. لا يوجد تنفيذ موازٍ بدون سبب واضح.

---

## 2. القاعدة الصلبة (Hard Rule)

### لا يجوز بدء أي مهمة جديدة من هذا الملف إلا إذا كانت كل المهام السابقة لها حالتها `DONE` أو `SKIPPED` مع سبب واضح ومكتوب.

أي مهمة UI يجب أن:
1. تنفذ المطلوب فقط (scope محدد)
2. تحدث `API_REGISTRY.md` (UI Status)
3. تحدث `UI_BINDING_ROADMAP.md` إذا تغيّرت الحالة
4. تشغّل `lint` + `typecheck` + `build`
5. تعمل commit مستقل بـ commit message واضح
6. تضع commit hash داخل هذا الملف في حقل `Commit Hash`

### ممنوع أبدًا:
- تعديل backend logic
- تعديل API endpoints
- تعديل prisma schema
- إضافة migration
- refactor خارج scope المهمة
- إضافة features غير مذكورة في Acceptance Criteria

---

## 3. حالات المهام

| الحالة | المعنى | متى تُستخدم |
|--------|--------|------------|
| `TODO` | لم تبدأ بعد | الحالة الافتراضية |
| `IN_PROGRESS` | قيد التنفيذ | عند بدء المهمة |
| `DONE` | مكتملة | بعد merge commit |
| `BLOCKED` | معلقة | محتاجة unblock من مهمة أخرى |
| `SKIPPED` | تم تخطيها | بسبب واضح يُكتب في Notes |

---

## 4. قواعد العمل

1. **التنفيذ التسلسلي:** كل مهمة تبدأ فقط بعد إغلاق السابقة.
2. **لا تخطي:** لا يجوز تخطي مهمة CRITICAL لبدء HIGH إلا بموافقة Tech Lead.
3. **الـ Scope صلب:** لا تخرج عن Scope المكتوب. أي شيء خارج Scope يُسجل كمهمة جديدة.
4. **الـ Checks إلزامية:** لا يُعتبر commit نهائيًا بدون lint + typecheck + build.
5. **التوثيق إلزامي:** لا يُعتبر commit نهائيًا بدون تحديث docs/api/*.

---

## قواعد هندسية صارمة إضافية

### 1. Runtime Verification Rule

أي مهمة UI لا تعتبر DONE إلا إذا تم التحقق فعليًا من التشغيل داخل المتصفح.

يجب التحقق من:

- تشغيل dev server
- فتح الصفحة المستهدفة فعليًا
- تنفيذ الـ flow الأساسي للمهمة
- عدم وجود white page
- عدم وجود runtime errors
- عدم وجود hydration mismatch
- عدم وجود dead buttons
- عدم وجود infinite loading
- عدم وجود silent failures

لا يكفي نجاح lint/typecheck/build وحده لإغلاق مهمة UI.

---

### 2. Company Isolation Rule

أي مهمة UI تتعامل مع بيانات مرتبطة بشركة يجب أن تتحقق من العزل بين الشركات.

يشمل ذلك:

- customers
- suppliers
- products
- warehouses
- invoices
- purchases
- collections
- returns
- stock
- accounts
- journal entries

يجب التأكد من:

- إرسال companyId في كل request يتطلب ذلك
- عدم جلب بيانات كل الشركات بدون سبب
- query keys في React Query تعتمد على companyId عند الحاجة
- dropdowns لا تعرض بيانات شركات أخرى
- عدم كسر canAccessCompany behavior

---

### 3. No Silent Failures Rule

ممنوع وجود فشل صامت داخل الواجهة.

أي fetch أو form يجب أن يحتوي على:

- loading state
- error state
- empty state عند الحاجة
- رسالة واضحة عند الفشل

ممنوع:

- dropdown فارغ بدون تفسير
- button disabled بدون سبب واضح
- catch فارغ يخفي الخطأ
- تجاهل response غير ناجحة
- عرض صفحة فارغة بدل رسالة خطأ

---

### 4. Frontend Scope Enforcement

مهام UI هي Frontend-only إلا إذا ذُكر غير ذلك صراحة.

في مهام UI ممنوع تعديل:

- src/app/api/**
- prisma/**
- src/lib/services/**
- auth/session logic
- permissions backend logic
- posting engines
- accounting logic
- inventory logic
- validation business rules

إذا كان backend ناقصًا:
- يتم تسجيله في Notes
- أو إنشاء Task جديدة
- ولا يتم إصلاحه داخل نفس مهمة UI

---

### 5. Documentation Consistency Rule

أي endpoint يتم ربطه بالواجهة يجب تحديث الوثائق التالية في نفس الـ commit:

- docs/api/API_REGISTRY.md
- docs/api/UI_BINDING_ROADMAP.md
- docs/api/UI_COMPLETION_BACKLOG.md

يجب تحديث:

- UI Status
- UI Page
- Notes
- Task Status
- Commit Hash

لا تعتبر المهمة DONE إذا لم تُحدّث الوثائق.

---

### 6. UX Stability Rule

أي واجهة جديدة أو معدلة يجب أن تلتزم بالاستقرار البصري والتشغيلي.

يجب:

- دعم RTL
- استخدام التصميم الحالي
- استخدام components الموجودة قدر الإمكان
- استخدام router.push بدل window.location.href
- الحفاظ على loading/error/empty states

ممنوع:

- إضافة design system جديد
- إضافة state management جديد
- إضافة UI library جديدة
- إعادة تصميم صفحات خارج scope المهمة
- كسر responsive behavior الأساسي

---

### 7. Forbidden AI Behavior

ممنوع على AI أثناء تنفيذ أي مهمة:

- تنفيذ features غير مطلوبة
- تحسينات خارج scope المهمة
- refactor واسع
- تغيير architecture
- إضافة مكتبات بدون طلب صريح
- تعديل ملفات غير مذكورة في المهمة
- إعادة كتابة صفحات كاملة بدون ضرورة
- تغيير أسماء routes أو APIs
- حذف placeholders بدون توثيق
- اعتبار المهمة مكتملة بدون تحقق فعلي

---

### 8. Production Safety Rule

أي مهمة تمس واجهات مرتبطة بالعمليات المالية أو المخزنية يجب أن تبقى آمنة.

يشمل ذلك:

- posting
- accounting
- stock balances
- receivables
- collections
- returns
- purchases
- journal entries

ممنوع داخل مهام UI:

- تعديل financial logic
- تعديل stock calculation
- تعديل weighted average cost
- تعديل journal posting
- تعديل receivables balance logic
- تعديل audit behavior

أي مشكلة في هذا النوع تُسجل كملاحظة أو task منفصلة.

---

## 5. شروط إغلاق المهمة (Closure Criteria)

قبل وضع حالة `DONE` على أي مهمة، يجب التحقق من:

- [ ] المهمة مُنفذة حسب Scope المكتوب
- [ ] Acceptance Criteria مُلبّاة بالكامل
- [ ] `npm run lint` خالٍ من الأخطاء
- [ ] `npm run typecheck` خالٍ من الأخطاء
- [ ] `npm run build` ناجح
- [ ] تم فتح الصفحة فعليًا في المتصفح
- [ ] تم تنفيذ الـ flow الأساسي للمهمة
- [ ] لا توجد runtime errors
- [ ] لا توجد hydration errors
- [ ] لا توجد silent failures
- [ ] تم التحقق من companyId isolation عند الحاجة
- [ ] `API_REGISTRY.md` مُحدَّث (UI Status)
- [ ] `UI_BINDING_ROADMAP.md` مُحدَّث إذا لزم
- [ ] `UI_COMPLETION_BACKLOG.md` مُحدَّث (Task Status + Commit Hash)
- [ ] commit مستقل مكتوب ومدفوع إلى origin/main
- [ ] commit hash مُسجَّل في هذا الملف

---

## 6. قاعدة تحديث API_REGISTRY.md

بعد كل مهمة UI:

1. افتح `API_REGISTRY.md`
2. ابحث عن الـ endpoints المربوطة في هذه المهمة
3. حدّث `UI Status` إلى:
   - `CONNECTED` إذا كل الـ endpoints مربوطة
   - `PARTIAL` إذا بعضها فقط
   - `BROKEN` إذا هناك مشكلة
4. حدّث `UI Page` إذا تغيّر
5. أضف ملاحظة في `Notes` مع تاريخ الإنجاز

---

## 7. قائمة المهام

---

### المرحلة 1 — CRITICAL (يجب إنجازها أولاً)

---

#### Task UI-001
**Title:** Sales Invoice Edit UI  
**Status:** `DONE`  
**Priority:** CRITICAL  
**Related APIs:**
- `GET /api/sales-invoices/{id}`
- `PATCH /api/sales-invoices/{id}`
**Target UI Pages:**
- `/dashboard/sales-invoices/[id]/edit/page.tsx`
**Scope:**
- صفحة تعديل مسودة فاتورة بيع فقط
- لا يمكن تعديل فاتورة مرحّلة
**Forbidden:**
- تعديل backend
- تعديل posting logic
- تعديل accounting logic
**Acceptance Criteria:**
- فتح صفحة تعديل من صفحة التفاصيل
- تحميل بيانات الفاتورة الموجودة
- تعديل الحقول: عميل، مخزن، عملة، نوع دفع، خصومات، بنود
- حفظ التعديلات
- إظهار خطأ إذا حاول المستخدم تعديل فاتورة مرحّلة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ PATCH endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:** `43da015`
**Date:** 2026-05-18

---

#### Task UI-002
**Title:** Purchases Create UI  
**Status:** `DONE`  
**Priority:** CRITICAL  
**Related APIs:**
- `POST /api/purchases`
- `GET /api/suppliers`
- `GET /api/warehouses`
- `GET /api/products`
- `GET /api/payment-accounts`
**Target UI Pages:**
- `/dashboard/purchases/new/page.tsx`
**Scope:**
- صفحة إنشاء فاتورة شراء جديدة
- مشابهة لـ Sales Invoice Create لكن للمشتريات
**Forbidden:**
- تعديل backend
- تعديل purchase posting logic
**Acceptance Criteria:**
- إنشاء فاتورة شراء مع بنود
- اختيار مورد، مخزن، عملة
- حساب المجاميع frontend-side
- حفظ الفاتورة
- إعادة التوجيه إلى قائمة المشتريات
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:** `f73ab8f`
**Date:** 2026-05-18

---

#### Task UI-003
**Title:** Purchases Detail UI  
**Status:** `DONE`  
**Priority:** CRITICAL  
**Related APIs:**
- `GET /api/purchases/{id}`
- `DELETE /api/purchases/{id}`
- `GET /api/purchases/{id}/pdf`
**Target UI Pages:**
- `/dashboard/purchases/[id]/page.tsx`
**Scope:**
- صفحة عرض تفاصيل فاتورة شراء
- زر حذف للمسودات
- زر تحميل PDF
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- عرض تفاصيل فاتورة الشراء
- عرض البنود والمجاميع
- زر حذف للمسودات فقط
- زر تحميل PDF
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET /api/purchases/{id}
- UI_BINDING_ROADMAP.md: تحديث UI Binding 1.1
**Commit Hash:** `b7e2845`
**Date:** 2026-05-18

---

#### Task UI-004
**Title:** Journal Entries Create UI  
**Status:** `DONE`  
**Priority:** CRITICAL  
**Related APIs:**
- `POST /api/journal-entries`
- `GET /api/accounts`
- `GET /api/fiscal-periods`
**Target UI Pages:**
- `/dashboard/journal-entries/new/page.tsx`
**Scope:**
- صفحة إنشاء قيد يومي جديد
- إدخال بنود مدينة/دائنة مع حسابات
- توازن القيد (مجموع مدين = مجموع دائن)
**Forbidden:**
- تعديل backend posting logic
- تعديل journal validation
**Acceptance Criteria:**
- إنشاء قيد مع بنود متعددة
- اختيار حساب لكل بند
- إدخال مبلغ مدين أو دائن
- التحقق من توازن القيد قبل الحفظ
- حفظ كمسودة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 1.3
**Commit Hash:** `277aa6c`
**Date:** 2026-05-18

---

#### Task UI-005
**Title:** Journal Entries Post UI  
**Status:** `DONE`  
**Priority:** CRITICAL  
**Related APIs:**
- `POST /api/journal-entries/{id}/post`
- `GET /api/journal-entries/{id}`
**Target UI Pages:**
- `/dashboard/journal-entries/[id]/page.tsx` (زر ترحيل)
**Scope:**
- زر ترحيل قيد يومي في صفحة التفاصيل
- فقط للمسودات (DRAFT)
**Forbidden:**
- تعديل backend post logic
**Acceptance Criteria:**
- زر "ترحيل" يظهر فقط للمسودات
- بعد الترحيل تتغير الحالة إلى POSTED
- لا يمكن ترحيل قيد غير متوازن
- عرض رسالة نجاح
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET و POST endpoints
- UI_BINDING_ROADMAP.md: تحديث UI Binding 1.3
**Commit Hash:** `e0ed2bd`
**Date:** 2026-05-18

---

#### Task UI-006
**Title:** Journal Entries Reverse UI  
**Status:** `DONE`  
**Priority:** CRITICAL  
**Related APIs:**
- `POST /api/journal-entries/{id}/reverse`
- `GET /api/journal-entries/{id}`
**Target UI Pages:**
- `/dashboard/journal-entries/[id]/page.tsx` (زر عكس)
**Scope:**
- زر عكس قيد يومي في صفحة التفاصيل
- فقط للمرحّلة (POSTED)
- إظهار القيد العكسي الناتج
**Forbidden:**
- تعديل backend reverse logic
**Acceptance Criteria:**
- زر "عكس" يظهر فقط للمرحّلة
- إنشاء قيد عكسي جديد
- عرض رسالة نجاح مع رقم القيد العكسي
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ REVERSE endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 1.3
**Commit Hash:** `0026d1f`
**Date:** 2026-05-18

---

### المرحلة 2 — HIGH (بعد إكمال CRITICAL)

---

#### Task UI-007
**Title:** Accounts List UI  
**Status:** `DONE`  
**Priority:** HIGH  
**Related APIs:**
- `GET /api/accounts`
**Target UI Pages:**
- `/dashboard/accounts/page.tsx`
**Scope:**
- استبدال placeholder بقائمة حقيقية للحسابات
- عرض: كود، اسم، نوع، رصيد
**Forbidden:**
- تعديل backend accounts logic
**Acceptance Criteria:**
- عرض قائمة الحسابات
- بحث بالاسم أو الكود
- عرض الرصيد الحالي
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 1.4
**Commit Hash:** `a653c69`
**Date:** 2026-05-18

---

#### Task UI-008
**Title:** Accounts Tree UI  
**Status:** `DONE`  
**Priority:** HIGH  
**Related APIs:**
- `GET /api/accounts/tree`
- `POST /api/accounts`
- `PATCH /api/accounts/{id}`
- `DELETE /api/accounts/{id}`
**Target UI Pages:**
- `/dashboard/accounts/page.tsx`
**Scope:**
- عرض شجرة الحسابات هرميًا
- توسيع/طي الفروع
- إنشاء وتعديل وحذف حساب من الواجهة
**Forbidden:**
- تعديل backend tree logic
**Acceptance Criteria:**
- عرض شجرة الحسابات
- عرض الرئيسي + الفرعي
- توسيع/طي العقد
- إنشاء حساب جديد
- تعديل اسم وأب وترحيل
- حذف حساب مع عرض رسالة الرفض
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST/PATCH/DELETE endpoints
- UI_BINDING_ROADMAP.md: تحديث UI Binding 1.4
**Commit Hash:** `78d3294`
**Date:** 2026-05-18

---

#### Task UI-009
**Title:** Accounts Create/Edit UI  
**Status:** `DONE — دُمجت في UI-008`  
**Priority:** HIGH  
**Related APIs:**
- `POST /api/accounts`
- `PATCH /api/accounts/{id}`
- `GET /api/accounts/{id}`
- `DELETE /api/accounts/{id}`
**Target UI Pages:**
- `/dashboard/accounts` (inline create/edit)
**Scope:**
- إنشاء وتحديث وحذف حساب
- اختيار حساب أب (parent)
- تحديد نوع الحساب
**Forbidden:**
- تعديل backend account validation
**Acceptance Criteria:**
- إنشاء حساب جديد
- تعديل اسم ونوع ورصيد
- حذف حساب فارغ (بدون حركات)
- اختيار حساب أب
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST/PATCH/DELETE endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-010
**Title:** Stock Movements List UI  
**Status:** `DONE`  
**Priority:** HIGH  
**Related APIs:**
- `GET /api/stock-movements`
**Target UI Pages:**
- `/dashboard/stock-movements/page.tsx`
**Scope:**
- صفحة قائمة حركات المخزن
- عرض: الرقم، التاريخ، المخزن، النوع، الحالة
**Forbidden:**
- تعديل backend stock movement logic
**Acceptance Criteria:**
- عرض قائمة حركات المخزن
- فلترة حسب المخزن والحالة
- بحث بالاسم والكود
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.2
**Commit Hash:** `c816d70`
**Date:** 2026-05-18

---
#### Task UI-011
**Title:** Stock Movement Detail UI  
**Status:** `DONE`  
**Priority:** HIGH  
**Related APIs:**
- `GET /api/stock-movements/{id}`
**Target UI Pages:**
- `/dashboard/stock-movements/[id]/page.tsx`
**Scope:**
- عرض تفاصيل حركة مخزن
- معلومات المادة والمخزن والكمية والتكلفة
**Forbidden:**
- تعديل backend stock logic
**Acceptance Criteria:**
- عرض تفاصيل الحركة
- حالة الحركة (DRAFT/POSTED/CANCELLED)
- المرجع إن وجد
- زر رجوع للقائمة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET detail endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.2
**Commit Hash:** `8baa1f7`
**Date:** 2026-05-18

---

#### Task UI-012
**Title:** Stock Adjustment Create UI  
**Status:** `DONE`  
**Priority:** HIGH  
**Related APIs:**
- `POST /api/stock-movements`
- `GET /api/warehouses`
- `GET /api/products`
**Target UI Pages:**
- `/dashboard/stock-movements/new/page.tsx`
- `/dashboard/stock-movements/page.tsx` (زر "تسوية جديدة")
**Scope:**
- إنشاء حركة مخزن يدوية (تسوية زيادة/نقص أو وارد/صادر)
- اختيار مخزن ومادة وكمية ونوع حركة
**Forbidden:**
- تعديل backend stock logic
**Acceptance Criteria:**
- form إنشاء حركة مخزن
- validation (مخزن + مادة + كمية > 0)
- redirect إلى تفاصيل الحركة بعد النجاح
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.2
**Commit Hash:** `a2ad8c9`
**Date:** 2026-05-18

---

### المرحلة 3 — MEDIUM (بعد إكمال HIGH)

---

#### Task UI-013
**Title:** Stock Balances Filters & Detail Polish  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-balances`
**Target UI Pages:**
- `/dashboard/stock-balances/page.tsx`
**Scope:**
- تحسين صفحة أرصدة المخزن
- summary cards + فلاتر + badges + search
**Forbidden:**
- تعديل backend stock logic
**Acceptance Criteria:**
- summary cards (مواد/كمية/نفاد/سالب)
- فلاتر (مخزن + حالة مخزون + بحث)
- badges حالة المخزون (متوفر/منخفض/نفاد/سالب)
- row count indicator
- clear filters button
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: تحديث Notes للـ GET endpoint
- UI_BINDING_ROADMAP.md: تحديث
**Commit Hash:** `49c5fb4`
**Date:** 2026-05-18

---

#### Task UI-014
**Title:** Stock Transfers Create UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `POST /api/stock-transfers`
- `GET /api/warehouses`
- `GET /api/products`
**Target UI Pages:**
- `/dashboard/warehouse-transfers/new/page.tsx`
- `/dashboard/warehouse-transfers/page.tsx` (زر "تحويل مخزن جديد")
**Scope:**
- إنشاء تحويل مخزن
- اختيار مخزن مصدر ومخزن هدف ومادة وكمية
**Forbidden:**
- تعديل backend transfer logic
**Acceptance Criteria:**
- إنشاء تحويل
- اختيار مخزن مصدر وهدف
- اختيار مادة وكمية
- حفظ كمسودة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.1
**Commit Hash:** `acde6cc`
**Date:** 2026-05-18

---

#### Task UI-015
**Title:** Stock Transfers Detail/Post UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-transfers/{id}`
- `POST /api/stock-transfers/{id}/post`
- `DELETE /api/stock-transfers/{id}`
**Target UI Pages:**
- `/dashboard/warehouse-transfers/[id]/page.tsx`
- `/dashboard/warehouse-transfers/new/page.tsx` (redirect إلى detail)
**Scope:**
- صفحة تفاصيل تحويل مع بنود وملخص
- زر ترحيل للمسودات فقط (ConfirmDialog)
- زر حذف للمسودات فقط (ConfirmDialog)
- redirect من صفحة الإنشاء إلى التفاصيل
**Forbidden:**
- تعديل backend transfer logic
**Acceptance Criteria:**
- عرض تفاصيل التحويل + البنود + ملخص
- زر ترحيل للمسودات فقط
- زر حذف للمسودات فقط
- refetch بعد post/delete
- redirect آمن بعد create/delete
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET/POST/DELETE endpoints
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.1
**Commit Hash:** `5e77f95`
**Date:** 2026-05-18

---

#### Task UI-016
**Title:** Stock Adjustments List UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-adjustments`
**Target UI Pages:**
- `/dashboard/stock-adjustments/page.tsx`
**Scope:**
- قائمة تسويات المخزن
- فلترة + بحث + badges
**Forbidden:**
- تعديل backend adjustment logic
**Acceptance Criteria:**
- عرض قائمة التسويات
- فلترة حسب المخزن والحالة
- بحث برقم التسوية أو المخزن
- row count indicator
- لا أزرار تؤدي إلى 404
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.2
**Commit Hash:** `c18458c`
**Date:** 2026-05-18

---

#### Task UI-017
**Title:** Stock Adjustments Create UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `POST /api/stock-adjustments`
- `GET /api/warehouses`
- `GET /api/products`
**Target UI Pages:**
- `/dashboard/stock-adjustments/new/page.tsx`
- `/dashboard/stock-adjustments/page.tsx` (زر "تسوية جديدة")
**Scope:**
- إنشاء تسوية مخزن (زيادة/نقصان كمية)
- بنود متعددة بسيطة (إضافة/حذف)
**Forbidden:**
- تعديل backend adjustment logic
**Acceptance Criteria:**
- إنشاء تسوية
- اختيار مخزن ومادة
- إدخال الكمية الجديدة أو الفرق
- حفظ كمسودة
- redirect آمن إلى القائمة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.2
**Commit Hash:** `67af620`
**Date:** 2026-05-18

---

#### Task UI-018
**Title:** Stock Adjustments Detail/Post UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-adjustments/{id}`
- `POST /api/stock-adjustments/{id}/post`
- `DELETE /api/stock-adjustments/{id}`
**Target UI Pages:**
- `/dashboard/stock-adjustments/[id]/page.tsx`
- `/dashboard/stock-adjustments/new/page.tsx` (redirect إلى detail)
- `/dashboard/stock-adjustments/page.tsx` (زر عرض تفاصيل)
**Scope:**
- صفحة تفاصيل تسوية مع بنود وملخص
- زر ترحيل للمسودات فقط (ConfirmDialog)
- زر حذف للمسودات فقط (ConfirmDialog)
- redirect آمن من الإنشاء إلى التفاصيل
**Forbidden:**
- تعديل backend adjustment logic
**Acceptance Criteria:**
- عرض التفاصيل + البنود + ملخص
- زر ترحيل للمسودات فقط
- زر حذف للمسودات فقط
- refetch بعد post/delete
- زر عرض تفاصيل في القائمة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET/POST/DELETE endpoints
- UI_BINDING_ROADMAP.md: تحديث UI Binding 2.2
**Commit Hash:** `c31ca8d`
**Date:** 2026-05-18

---

#### Task UI-019
**Title:** Units Management UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/units`
- `POST /api/units`
- `PATCH /api/units/{id}`
- `DELETE /api/units/{id}`
**Target UI Pages:**
- `/dashboard/units/page.tsx`
**Scope:**
- صفحة إدارة وحدات القياس
- CRUD كامل
**Forbidden:**
- تعديل backend units logic
**Acceptance Criteria:**
- عرض الوحدات
- إنشاء وحدة جديدة
- تعديل وحدة
- حذف وحدة (مع تعطيل تلقائي إذا مستخدمة في مواد)
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:** `88b2636`

---

#### Task UI-020
**Title:** Product Detail UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/products/{id}`
- `GET /api/stock-balances?productId=...`
- `GET /api/stock-movements?productId=...`
**Target UI Pages:**
- `/dashboard/products/[id]/page.tsx`
**Scope:**
- صفحة تفاصيل منتج
- عرض الأسعار، المخزون، الحركات
**Forbidden:**
- تعديل backend product logic
**Acceptance Criteria:**
- عرض تفاصيل المنتج
- عرض أسعار البيع لكل نوع عميل
- عرض رصيد المخزون
- عرض حركات المخزون (إن وجدت)
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: تحديث UI Binding 3.1
**Commit Hash:**

---

#### Task UI-026
**Title:** Inventory Audit UI  
**Status:** `DONE`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/inventory/audit/issues`
- `GET /api/inventory/audit/reconciliation`
- `GET /api/inventory/audit/stock-card`
**Target UI Pages:**
- `/dashboard/inventory/audit/page.tsx`
**Scope:**
- تقارير تدقيق المخزون
**Forbidden:**
- تعديل backend audit logic
**Acceptance Criteria:**
- عرض مشاكل المخزون
- عرض تسوية المخزون
- عرض بطاقة مخزن
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:** `7b77262`

---

#### Task UI-027
**Title:** Collection Detail/Print UI  
**Status:** `TODO`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/customer-collections/{id}/print`
**Target UI Pages:**
- `/dashboard/collections/[id]/page.tsx`
**Scope:**
- إنشاء صفحة تفاصيل سند قبض مع زر طباعة (الـ print endpoint مربوط من صفحة القائمة)
**Forbidden:**
- تعديل backend print logic
**Acceptance Criteria:**
- عرض تفاصيل التحصيل
- زر طباعة (يفتح `/api/customer-collections/{id}/print`)
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-028
**Title:** Stock Transfer Edit UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `PATCH /api/stock-transfers/{id}`
**Target UI Pages:**
- `/dashboard/warehouse-transfers/[id]/edit/page.tsx`
**Scope:**
- تعديل مسودة تحويل مخزن (fromWarehouseId, toWarehouseId, transferDate, notes)
- إضافة زر تعديل في صفحة التفاصيل للمسودات فقط
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- صفحة تعديل تعرض بيانات التحويل الحالية
- تعديل المخزن المصدر والوجهة والتاريخ والملاحظات
- حفظ التعديلات عبر PATCH والعودة للتفاصيل
- زر تعديل يظهر فقط للمسودات وللمستخدم الحاصل على صلاحية
- منع تعديل المسودة غير DRAFT برسالة واضحة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: تحديث UI Status (NO_UI → CONNECTED)
- UI_BINDING_ROADMAP.md: تحديث حالة PATCH
**Commit Hash:** `1953a81`

---

#### Task UI-029
**Title:** Journal Entry Edit/Delete UI  
**Status:** `DONE`  
**Priority:** CRITICAL  
**Related APIs:**
- `PATCH /api/journal-entries/{id}`
- `DELETE /api/journal-entries/{id}`
**Target UI Pages:**
- `/dashboard/journal-entries/[id]/edit/page.tsx`
- `/dashboard/journal-entries/[id]/page.tsx`
**Scope:**
- إنشاء صفحة تعديل مسودة قيد (date, currency, description, lines) مع إضافة/حذف بنود
- إضافة زر تعديل في صفحة التفاصيل للمسودات فقط (permission: journals.create)
- إضافة زر حذف مع ConfirmDialog في صفحة التفاصيل للمسودات فقط (permission: journals.create)
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- صفحة تعديل تعرض بيانات القيد الحالية
- تعديل التاريخ والعملة والوصف والبنود
- حفظ التعديلات عبر PATCH والعودة للتفاصيل
- حذف المسودة عبر DELETE والعودة للقائمة
- أزرار تعديل/حذف تظهر فقط للمسودات وللمستخدم الحاصل على صلاحية
- منع تعديل/حذف غير DRAFT برسالة واضحة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: تحديث UI Status (PATCH: NO_UI→CONNECTED, DELETE: NO_UI→CONNECTED)
- UI_BINDING_ROADMAP.md: تحديث PATCH ← ✅, إضافة DELETE
**Commit Hash:** `ce81810`

---

#### Task UI-030
**Title:** Stock Movement Detail Actions UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `PATCH /api/stock-movements/{id}`
- `DELETE /api/stock-movements/{id}`
- `POST /api/stock-movements/{id}/post`
**Target UI Pages:**
- `/dashboard/stock-movements/[id]/page.tsx`
- `/dashboard/stock-movements/[id]/edit/page.tsx`
**Scope:**
- إضافة أزرار ترحيل/حذف/تعديل في صفحة تفاصيل حركة المخزن للمسودات فقط
- إنشاء صفحة تعديل لمسودة حركة المخزن (مادة/مخزن/نوع/كمية/تكلفة/تاريخ/ملاحظات)
- ربط PATCH و DELETE و POST/post
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- أزرار ترحيل/حذف/تعديل تظهر فقط للمسودات وللمستخدم الحاصل على صلاحية
- صفحة تعديل تعرض بيانات الحركة الحالية وتعديلها عبر PATCH
- ترحيل المسودة عبر POST/post مع ConfirmDialog
- حذف المسودة عبر DELETE مع ConfirmDialog
- منع تعديل/حذف/ترحيل غير DRAFT
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: PATCH/DELETE/POST: NO_UI → CONNECTED
- UI_BINDING_ROADMAP.md: 2.2 → COMPLETED بالكامل
**Commit Hash:** `8904c52`

---

#### Task UI-031
**Title:** Stock Adjustment Edit UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `PATCH /api/stock-adjustments/{id}`
**Target UI Pages:**
- `/dashboard/stock-adjustments/[id]/edit/page.tsx`
- `/dashboard/stock-adjustments/[id]/page.tsx`
**Scope:**
- إنشاء صفحة تعديل مسودة تسوية مخزن (مخزن/تاريخ/سبب/ملاحظات)
- إضافة زر تعديل في صفحة التفاصيل للمسودات فقط
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- زر تعديل يظهر فقط للمسودات وللمستخدم الحاصل على صلاحية stockAdjustments.edit
- صفحة تعديل تعرض بيانات التسوية الحالية وتعديلها عبر PATCH
- الحقول المدعومة: warehouseId, adjustmentDate, reason, notes
- بنود التسوية معروضة كـ read-only لأن PATCH لا يدعم تعديل البنود
- منع تعديل غير DRAFT برسالة واضحة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: PATCH: NO_UI → CONNECTED, CONNECTED: 85→86, NO_UI: 3→2
- UI_BINDING_ROADMAP.md: 2.2 إضافة PATCH + edit page
**Commit Hash:** `a605f7f`

---

#### Task UI-032
**Title:** Warehouse Detail UI  
**Status:** `DONE`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/warehouses/{id}`
**Target UI Pages:**
- `/dashboard/warehouses/[id]/page.tsx`
**Scope:**
- إنشاء صفحة تفاصيل مخزن read-only
- إضافة زر عرض التفاصيل من صفحة المخازن
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- صفحة تفاصيل تعرض بيانات المخزن (name/code/address/status/branch)
- زر رجوع إلى /dashboard/warehouses
- زر تفعيل/تعطيل للمستخدم الحاصل على صلاحية
- إضافة زر عرض التفاصيل في صفحة القائمة
- إصلاح .catch(() => {}) silent failure في صفحة القائمة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: GET: NO_UI → CONNECTED, CONNECTED: 86→87, NO_UI: 2→1
- UI_BINDING_ROADMAP.md: إضافة Warehouses Detail
**Commit Hash:** `750658e`

---

#### Task UI-033
**Title:** Supplier Detail UI  
**Status:** `DONE`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/suppliers/{id}`
**Target UI Pages:**
- `/dashboard/suppliers/[id]/page.tsx`
**Scope:**
- إنشاء صفحة تفاصيل مورد read-only
- إضافة زر عرض التفاصيل من تبويب الموردين
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- صفحة تفاصيل تعرض بيانات المورد (name/code/phone/address/notes/status/accounts)
- زر رجوع إلى /dashboard/customers
- إضافة زر عرض التفاصيل في جدول الموردين
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: GET: NO_UI → CONNECTED, CONNECTED: 87→88, NO_UI: 1→0
- UI_BINDING_ROADMAP.md: إضافة Supplier Detail
**Commit Hash:** `bf90430`

---

#### Task UI-035
**Title:** Account Detail UI  
**Status:** `DONE`  
**Priority:** HIGH  
**Related APIs:**
- `GET /api/accounts/{id}`
**Target UI Pages:**
- `/dashboard/accounts/[id]/page.tsx`
- `/dashboard/accounts/page.tsx` (زر عرض)
**Scope:**
- إنشاء صفحة تفاصيل حساب للقراءة فقط
- عرض code/name/type/currency/level/normalBalance/isPosting/isActive/description/subtype/allowManualJournal
- عرض بيانات النظام (id/createdAt/updatedAt/isSystem/isProtected)
- عرض عدد الحسابات الفرعية مع رابط للشجرة
- إضافة زر Eye (عرض التفاصيل) في شجرة الحسابات
- إصلاح silent catch في شجرة الحسابات
**Forbidden:**
- تعديل backend
- تعديل حسابات أو PATCH أو DELETE
**Acceptance Criteria:**
- زر عرض يظهر لكل حساب في الشجرة
- صفحة تفاصيل تعرض جميع معلومات الحساب
- خطأ في التحميل يظهر رسالة واضحة
- زر رجوع للشجرة
- زر تعديل ينقل لشجرة الحسابات
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: GET /api/accounts/{id}: NO_UI → CONNECTED
- UI_BINDING_ROADMAP.md: تحديث 1.4 — accounts/{id} ✅
- UI_COMPLETION_BACKLOG.md: UI-035 → DONE
**Commit Hash:** `e874cfc`

**Date:** 2026-05-27

---

#### Task UI-036
**Title:** Unit Detail UI  
**Status:** `DONE`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/units/{id}`
**Target UI Pages:**
- `/dashboard/units/[id]/page.tsx`
- `/dashboard/units/page.tsx` (زر عرض)
**Scope:**
- إنشاء صفحة تفاصيل وحدة قياس للقراءة فقط
- عرض name/code/symbol/type/isActive/system data
- إضافة زر Eye (عرض التفاصيل) في قائمة الوحدات
**Forbidden:**
- تعديل backend
- تعديل units logic
**Acceptance Criteria:**
- زر عرض يظهر لكل وحدة في القائمة
- صفحة تفاصيل تعرض جميع معلومات الوحدة
- خطأ في التحميل يظهر رسالة واضحة
- زر رجوع لقائمة الوحدات
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: GET /api/units/{id}: NO_UI → CONNECTED
- UI_BINDING_ROADMAP.md: تحديث 2.3 — units/{id} ✅
- UI_COMPLETION_BACKLOG.md: UI-036 → DONE
**Commit Hash:** `0e748f4`

**Date:** 2026-05-27

---

#### Task UI-037
**Title:** Fiscal Period Detail/Delete UI  
**Status:** `DONE`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/fiscal-periods/{id}`
- `DELETE /api/fiscal-periods/{id}`
**Target UI Pages:**
- `/dashboard/fiscal-periods/[id]/page.tsx`
- `/dashboard/fiscal-periods/page.tsx` (زر عرض)
**Scope:**
- إنشاء صفحة تفاصيل فترة مالية للقراءة فقط
- عرض name/startDate/endDate/status/branchId/system data
- إضافة زر Eye (عرض التفاصيل) في قائمة الفترات
- إضافة زر حذف مع ConfirmDialog للفترات المستقبلية فقط (status=FUTURE)
- إصلاح silent catch في قائمة الفترات
**Forbidden:**
- تعديل backend
- تعديل fiscal period logic
**Acceptance Criteria:**
- زر عرض يظهر لكل فترة في القائمة
- زر حذف يظهر فقط للفترات المستقبلية مع صلاحية manage
- ConfirmDialog قبل الحذف
- نجاح الحذف يرجع للقائمة
- فشل الحذف يعرض رسالة الخطأ من backend
- خطأ في التحميل يظهر رسالة واضحة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: GET + DELETE: NO_UI → CONNECTED
- UI_BINDING_ROADMAP.md: تحديث المتبقي NO_UI (4→2)
- UI_COMPLETION_BACKLOG.md: UI-037 → DONE
**Commit Hash:** `6a08f89`
**Date:** 2026-05-27

---

#### Task UI-034
**Title:** Purchases Edit UI  
**Status:** `DONE`  
**Priority:** HIGH  
**Related APIs:**
- `PATCH /api/purchases/{id}`
- `GET /api/purchases/{id}`
**Target UI Pages:**
- `/dashboard/purchases/[id]/edit/page.tsx`
- `/dashboard/purchases/[id]/page.tsx` (زر تعديل)
**Scope:**
- إنشاء صفحة تعديل مسودة فاتورة شراء
- تعديل مورد/مخزن/عملة/خصومات/بنود عبر PATCH
- إضافة زر تعديل في صفحة التفاصيل للمسودات فقط
**Forbidden:**
- تعديل backend
- تعديل purchase posting logic
**Acceptance Criteria:**
- زر تعديل يظهر فقط للمسودات وللمستخدم الحاصل على صلاحية
- صفحة تعديل تعرض بيانات الفاتورة الحالية
- تعديل المورد والمخزن والعملة والخصومات والبنود
- حفظ التعديلات عبر PATCH والعودة للتفاصيل
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: PATCH: NO_UI → CONNECTED
- UI_BINDING_ROADMAP.md: تحديث 1.1 — PATCH ✅
- UI_COMPLETION_BACKLOG.md: UI-034 → DONE
**Commit Hash:** `1c5d530`
**Date:** 2026-05-27

---

#### Task UI-038
**Title:** Product Category Detail UI
**Status:** `DONE`
**Priority:** LOW
**Related APIs:**
- `GET /api/categories/{id}`
**Target UI Pages:**
- `/dashboard/categories/[id]/page.tsx`
- `/dashboard/categories/page.tsx`
**Scope:**
- صفحة تفاصيل تصنيف مادة read-only
- زر Eye من صفحة التصنيفات
- ربط GET /api/categories/{id}
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- زر عرض يظهر لكل تصنيف في القائمة
- صفحة تفاصيل تعرض name/code/description/isActive/system data
- خطأ في التحميل يظهر رسالة واضحة
- زر رجوع لقائمة التصنيفات
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: GET /api/categories/{id}: NO_UI → CONNECTED
- UI_BINDING_ROADMAP.md: تحديث المتبقي NO_UI (2→1)
- UI_COMPLETION_BACKLOG.md: UI-038 → DONE
**Commit Hash:** `20e4673`
**Date:** 2026-05-27

---

#### Task UI-039
**Title:** Customer Category Detail UI
**Status:** `DONE`
**Priority:** LOW
**Related APIs:**
- `GET /api/customer-categories/{id}`
**Target UI Pages:**
- `/dashboard/customer-categories/[id]/page.tsx`
- `/dashboard/customers/page.tsx` (categories tab — زر عرض)
**Scope:**
- صفحة تفاصيل قسم عميل read-only
- زر Eye من تبويب أقسام العملاء
- ربط GET /api/customer-categories/{id}
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- زر عرض يظهر لكل قسم في التبويب
- صفحة تفاصيل تعرض name/description/isActive/customerCount/system data
- خطأ في التحميل يظهر رسالة واضحة
- زر رجوع لقائمة العملاء
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: GET /api/customer-categories/{id}: NO_UI → CONNECTED
- UI_BINDING_ROADMAP.md: تحديث المتبقي NO_UI (1→0)
- UI_COMPLETION_BACKLOG.md: UI-039 → DONE
**Commit Hash:** ``
**Date:** 2026-05-27

---

| الأولوية | العدد |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 7 |
| MEDIUM | 10 |
| LOW | 10 |
| **الإجمالي** | **33** |

---

## 9. سجل التقدم

| Task ID | Status | Commit Hash | Date |
|---------|--------|-------------|------|
| UI-019 | DONE | 88b2636 | 2026-05-24 |
| UI-020 | DONE | 6c5dce4 | 2026-05-24 |
| UI-021 | DONE | e91cc81 | 2026-05-24 |
| UI-022 | DONE | 387f9d2 | 2026-05-24 |
| UI-023 | DONE | b2a86b8 | 2026-05-26 |
| UI-024 | DONE | 7b5315f | 2026-05-26 |
| UI-025 | DONE | c4986ab | 2026-05-27 |
| UI-026 | DONE | 7b77262 | 2026-05-27 |
| UI-027 | DONE | 4d9489a | 2026-05-27 |
| UI-028 | DONE | 1953a81 | 2026-05-27 |
| UI-029 | DONE | ce81810 | 2026-05-27 |
| UI-030 | DONE | 8904c52 | 2026-05-27 |
| UI-031 | DONE | a605f7f | 2026-05-27 |
| UI-032 | DONE | 750658e | 2026-05-27 |
| UI-033 | DONE | bf90430 | 2026-05-27 |
| UI-034 | DONE | 1c5d530 | 2026-05-27 |
| UI-035 | DONE | e874cfc | 2026-05-27 |
| UI-036 | DONE | 0e748f4 | 2026-05-27 |
| UI-037 | DONE | 6a08f89 | 2026-05-27 |
| UI-038 | DONE | 20e4673 | 2026-05-27 |
| UI-039 | DONE |  | 2026-05-27 |

---

**ملاحظة:** هذا الملف يُحدَّث فقط عند إنجاز مهمة (تغيير Status إلى DONE) أو عند حظر مهمة (BLOCKED). لا يجوز تعديله لأي سبب آخر.
