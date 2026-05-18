# UI Completion Backlog — Grass ERP

> قائمة مهام إكمال الواجهة الأمامية مرتبة حسب الأولوية مع قواعد تنفيذ صارمة.
> آخر تحديث: 2026-05-18

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
**Commit Hash:**

---

#### Task UI-011
**Title:** Stock Movements Create UI  
**Status:** `TODO`  
**Priority:** HIGH  
**Related APIs:**
- `POST /api/stock-movements`
- `GET /api/warehouses`
- `GET /api/products`
**Target UI Pages:**
- `/dashboard/stock-movements/new/page.tsx`
**Scope:**
- إنشاء حركة مخزن جديدة (دخول/خروج)
- اختيار مخزن ومادة وكمية ونوع حركة
**Forbidden:**
- تعديل backend stock logic
**Acceptance Criteria:**
- إنشاء حركة مخزن
- اختيار المخزن والمادة
- إدخال الكمية ونوع الحركة (IN/OUT)
- حفظ كمسودة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-012
**Title:** Stock Movements Post UI  
**Status:** `TODO`  
**Priority:** HIGH  
**Related APIs:**
- `POST /api/stock-movements/{id}/post`
- `GET /api/stock-movements/{id}`
**Target UI Pages:**
- `/dashboard/stock-movements/[id]/page.tsx` (زر ترحيل)
**Scope:**
- زر ترحيل حركة مخزن
- فقط للمسودات
**Forbidden:**
- تعديل backend post logic
**Acceptance Criteria:**
- زر "ترحيل" للمسودات
- تأكيد قبل الترحيل
- عرض رسالة نجاح
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

### المرحلة 3 — MEDIUM (بعد إكمال HIGH)

---

#### Task UI-013
**Title:** Stock Transfers List UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-transfers`
**Target UI Pages:**
- `/dashboard/warehouse-transfers/page.tsx`
**Scope:**
- استبدال placeholder بقائمة حقيقية
- عرض التحويلات بين المخازن
**Forbidden:**
- تعديل backend transfer logic
**Acceptance Criteria:**
- عرض قائمة التحويلات
- عرض المخزن المصدر والهدف
- فلترة حسب الحالة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-014
**Title:** Stock Transfers Create UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `POST /api/stock-transfers`
- `GET /api/warehouses`
- `GET /api/products`
**Target UI Pages:**
- `/dashboard/warehouse-transfers/new/page.tsx`
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
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-015
**Title:** Stock Transfers Detail/Post UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-transfers/{id}`
- `POST /api/stock-transfers/{id}/post`
- `DELETE /api/stock-transfers/{id}`
**Target UI Pages:**
- `/dashboard/warehouse-transfers/[id]/page.tsx`
**Scope:**
- صفحة تفاصيل تحويل
- زر ترحيل للمسودات
- زر حذف للمسودات
**Forbidden:**
- تعديل backend transfer logic
**Acceptance Criteria:**
- عرض تفاصيل التحويل
- زر ترحيل للمسودات
- زر حذف للمسودات
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-016
**Title:** Stock Adjustments List UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-adjustments`
**Target UI Pages:**
- `/dashboard/stock-adjustments/page.tsx`
**Scope:**
- قائمة تسويات المخزن
**Forbidden:**
- تعديل backend adjustment logic
**Acceptance Criteria:**
- عرض قائمة التسويات
- فلترة حسب المخزن
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-017
**Title:** Stock Adjustments Create UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `POST /api/stock-adjustments`
- `GET /api/warehouses`
- `GET /api/products`
**Target UI Pages:**
- `/dashboard/stock-adjustments/new/page.tsx`
**Scope:**
- إنشاء تسوية مخزن (زيادة/نقصان كمية)
**Forbidden:**
- تعديل backend adjustment logic
**Acceptance Criteria:**
- إنشاء تسوية
- اختيار مخزن ومادة
- إدخال الكمية الجديدة أو الفرق
- حفظ كمسودة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ POST endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-018
**Title:** Stock Adjustments Detail/Post UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/stock-adjustments/{id}`
- `POST /api/stock-adjustments/{id}/post`
- `DELETE /api/stock-adjustments/{id}`
**Target UI Pages:**
- `/dashboard/stock-adjustments/[id]/page.tsx`
**Scope:**
- تفاصيل + ترحيل + حذف
**Forbidden:**
- تعديل backend adjustment logic
**Acceptance Criteria:**
- عرض التفاصيل
- زر ترحيل للمسودات
- زر حذف للمسودات
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-019
**Title:** Units Management UI  
**Status:** `TODO`  
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
- حذف وحدة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-020
**Title:** Product Detail UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/products/{id}`
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
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-021
**Title:** User Detail/Edit UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `GET /api/users/{id}`
- `PATCH /api/users/{id}`
- `DELETE /api/users/{id}`
**Target UI Pages:**
- `/dashboard/users/[id]/page.tsx`
**Scope:**
- صفحة تفاصيل مستخدم
- تعديل الصلاحيات والأدوار
- حذف مستخدم
**Forbidden:**
- تعديل backend user logic
**Acceptance Criteria:**
- عرض تفاصيل المستخدم
- تعديل الأدوار
- تعديل الحالة (تفعيل/تعطيل)
- حذف مستخدم
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-022
**Title:** Sales Return Edit UI  
**Status:** `TODO`  
**Priority:** MEDIUM  
**Related APIs:**
- `PATCH /api/sales-returns/{id}`
**Target UI Pages:**
- `/dashboard/sales-returns/[id]/edit/page.tsx`
**Scope:**
- تعديل مسودة مرتجع بيع
**Forbidden:**
- تعديل backend return logic
**Acceptance Criteria:**
- فتح صفحة تعديل للمسودة
- تعديل البنود والكميات
- حفظ التعديلات
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ PATCH endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

### المرحلة 4 — LOW (بعد إكمال MEDIUM)

---

#### Task UI-023
**Title:** Companies UI  
**Status:** `TODO`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/companies`
- `POST /api/companies`
- `PATCH /api/companies/{id}`
- `DELETE /api/companies/{id}`
**Target UI Pages:**
- `/dashboard/companies/page.tsx`
**Scope:**
- صفحة إدارة الشركات
**Forbidden:**
- تعديل backend company logic
**Acceptance Criteria:**
- عرض الشركات
- إنشاء شركة
- تعديل شركة
- حذف شركة
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-024
**Title:** Branches UI  
**Status:** `TODO`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/branches`
- `POST /api/branches`
- `PATCH /api/branches/{id}`
- `DELETE /api/branches/{id}`
**Target UI Pages:**
- `/dashboard/branches/page.tsx`
**Scope:**
- صفحة إدارة الفروع
**Forbidden:**
- تعديل backend branch logic
**Acceptance Criteria:**
- عرض الفروع
- إنشاء فرع
- تعديل فرع
- حذف فرع
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ endpoints
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-025
**Title:** Inventory Valuation UI  
**Status:** `TODO`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/inventory/valuation`
**Target UI Pages:**
- `/dashboard/inventory/valuation/page.tsx`
**Scope:**
- تقرير تقييم المخزون
**Forbidden:**
- تعديل backend valuation logic
**Acceptance Criteria:**
- عرض تقييم المخزون حسب المخزن والمادة
- حساب القيمة الإجمالية
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: UI Status = CONNECTED للـ GET endpoint
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-026
**Title:** Inventory Audit UI  
**Status:** `TODO`  
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
**Commit Hash:**

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
- صفحة تفاصيل سند قبض مع زر طباعة
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
**Title:** Reports Placeholder Cleanup  
**Status:** `TODO`  
**Priority:** LOW  
**Related APIs:**
- `GET /api/dashboard/stats`
**Target UI Pages:**
- `/dashboard/reports/page.tsx`
**Scope:**
- استبدال placeholder بتقرير حقيقي أو حذف الرابط
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- إما: إنشاء صفحة تقارير حقيقية
- أو: إزالة الرابط من Sidebar
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: تحديث UI Status
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-029
**Title:** Settings Placeholder Cleanup  
**Status:** `TODO`  
**Priority:** LOW  
**Related APIs:**
- —
**Target UI Pages:**
- `/dashboard/settings/page.tsx`
**Scope:**
- إما: إنشاء صفحة إعدادات حقيقية
- أو: إزالة الرابط من Sidebar
**Forbidden:**
- تعديل backend
**Acceptance Criteria:**
- صفحة إعدادات تعمل أو إزالة الرابط
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: تحديث UI Status
- UI_BINDING_ROADMAP.md: إزالة المهمة
**Commit Hash:**

---

#### Task UI-030
**Title:** Final UI Coverage Audit  
**Status:** `TODO`  
**Priority:** LOW  
**Related APIs:**
- كل الـ endpoints
**Target UI Pages:**
- كل الصفحات
**Scope:**
- تدقيق شامل لكل الواجهات
- التحقق من عدم وجود APIs غير مربوطة
- التحقق من عدم وجود dead buttons
- التحقق من عدم وجود placeholder pages
**Forbidden:**
- إضافة features جديدة
**Acceptance Criteria:**
- كل API مربوط أو مُوسَّم BACKEND_ONLY/NO_UI
- لا يوجد placeholder pages
- لا يوجد dead buttons
- API_REGISTRY.md محدّث بالكامل
**Required Checks:**
- npm run lint
- npm run typecheck
- npm run build
**Documentation Updates:**
- API_REGISTRY.md: تحديث نهائي
- UI_BINDING_ROADMAP.md: تحديث نهائي
**Commit Hash:**

---

## 8. ملخص العدادات

| الأولوية | العدد |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 6 |
| MEDIUM | 10 |
| LOW | 8 |
| **الإجمالي** | **30** |

---

## 9. سجل التقدم

| Task ID | Status | Commit Hash | Date |
|---------|--------|-------------|------|
| — | — | — | — |

---

**ملاحظة:** هذا الملف يُحدَّث فقط عند إنجاز مهمة (تغيير Status إلى DONE) أو عند حظر مهمة (BLOCKED). لا يجوز تعديله لأي سبب آخر.
