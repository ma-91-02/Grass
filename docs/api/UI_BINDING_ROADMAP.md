# UI Binding Roadmap — Grass ERP

> خارطة ربط الواجهة الأمامية بالـ APIs حسب الأولوية.
> آخر تحديث: 2026-05-18

---

## Phase 0 — Foundation (مكتمل)

الوحدات الأساسية التي تعمل end-to-end:

- ✅ Auth (login/logout/me)
- ✅ Users (list + create + toggle)
- ✅ Customers (list + create + edit + detail + receivables + statement)
- ✅ Suppliers (list + create + edit)
- ✅ Customer Categories (list + create + edit + delete)
- ✅ Products (list + create + edit + delete)
- ✅ Product Categories (list + create + edit + delete)
- ✅ Warehouses (list + create + edit + delete)
- ✅ Sales Invoices (list + create + detail + post + print + delete)
- ✅ Sales Returns (list + create + detail + post + print)
- ✅ Customer Collections (list + create)
- ✅ Stock Balances (list)
- ✅ Fiscal Periods (list + create + open/close)
- ✅ Payment Accounts (list + create)
- ✅ Exchange Rates (list + create + delete)
- ✅ Audit Logs (list)
- ✅ Reports (dashboard stats)

---

## Phase 1.0 — Critical Gaps (أسبوع 1)

### UI Binding 1.1 — Purchases Full UI
**Endpoints المطلوب ربطها:**
- `GET /api/purchases` — قائمة فواتير الشراء ✅ (موجود)
- `POST /api/purchases` — إنشاء فاتورة شراء ✅ (COMPLETED)
- `GET /api/purchases/{id}` — تفاصيل فاتورة شراء ✅ (COMPLETED)
- `PATCH /api/purchases/{id}` — تحديث فاتورة شراء ❌

**الصفحات المطلوبة:**
- `/dashboard/purchases/new/page.tsx` — صفحة إنشاء فاتورة شراء
- `/dashboard/purchases/[id]/page.tsx` — صفحة تفاصيل فاتورة شراء

**Priority:** CRITICAL
**السبب:** المشتريات عملية أساسية لا يمكن إنشاؤها من الواجهة حاليًا.

---

### ✅ UI Binding 1.2 — Sales Invoice Edit (مكتمل)
**Endpoints المطلوب ربطها:**
- `PATCH /api/sales-invoices/{id}` — تحديث مسودة فاتورة بيع ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/sales-invoices/[id]/edit/page.tsx` — صفحة تعديل مسودة ✅ (COMPLETED)

**Priority:** CRITICAL
**السبب:** المسودات لا يمكن تعديلها، يجب حذفها وإعادة إنشائها.
**تاريخ الإنجاز:** 2026-05-18

---

### UI Binding 1.3 — Journal Entries Create & Post
**Endpoints المطلوب ربطها:**
- `POST /api/journal-entries` — إنشاء قيد يومي ✅ (COMPLETED)
- `POST /api/journal-entries/{id}/post` — ترحيل قيد ✅ (COMPLETED)
- `POST /api/journal-entries/{id}/reverse` — عكس قيد ✅ (COMPLETED)
- `PATCH /api/journal-entries/{id}` — تحديث مسودة قيد ❌

**الصفحات المطلوبة:**
- `/dashboard/journal-entries/new/page.tsx` — صفحة إنشاء قيد
- `/dashboard/journal-entries/[id]/page.tsx` — صفحة تفاصيل قيد مع أزرار post/reverse/edit

**Priority:** CRITICAL
**السبب:** القيود اليومية حجر الزاوية في النظام المحاسبي ولا يمكن إنشاؤها من الواجهة.

---

### UI Binding 1.4 — Accounts Chart & Tree
**Endpoints المطلوب ربطها:**
- `GET /api/accounts` — قائمة الحسابات ✅ (COMPLETED)
- `GET /api/accounts/tree` — شجرة الحسابات ✅ (COMPLETED — UI يبني tree frontend من flat list)
- `POST /api/accounts` — إنشاء حساب ✅ (COMPLETED)
- `PATCH /api/accounts/{id}` — تحديث حساب ✅ (COMPLETED — name/parent/isPosting/description فقط)
- `DELETE /api/accounts/{id}` — حذف حساب ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/accounts/page.tsx` — شجرة الحسابات مع CRUD ✅ (COMPLETED — view + create/edit/delete modals)

**Priority:** HIGH
**السبب:** المحاسبون يحتاجون لعرض وإدارة شجرة الحسابات.
**تاريخ الإنجاز:** 2026-05-18

---

## Phase 2.0 — Operations (أسبوع 2)

### UI Binding 2.1 — Stock Transfers
**Endpoints المطلوب ربطها:**
- `GET /api/stock-transfers` — قائمة التحويلات ❌
- `POST /api/stock-transfers` — إنشاء تحويل ✅ (COMPLETED)
- `GET /api/stock-transfers/{id}` — تفاصيل تحويل ✅ (COMPLETED)
- `PATCH /api/stock-transfers/{id}` — تحديث تحويل ❌
- `POST /api/stock-transfers/{id}/post` — ترحيل تحويل ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/warehouse-transfers/page.tsx` — قائمة ❌ (placeholder)
- `/dashboard/warehouse-transfers/new/page.tsx` — إنشاء تحويل ✅ (COMPLETED)
- `/dashboard/warehouse-transfers/[id]/page.tsx` — تفاصيل + ترحيل + حذف ✅ (COMPLETED)

**Priority:** MEDIUM

---

### UI Binding 2.2 — Stock Movements & Adjustments
**Endpoints المطلوب ربطها:**
- `GET /api/stock-movements` — قائمة حركات المخزن ✅ (COMPLETED)
- `GET /api/stock-movements/{id}` — تفاصيل حركة ✅ (COMPLETED)
- `POST /api/stock-movements` — إنشاء حركة ✅ (COMPLETED — create form)
- `GET /api/stock-adjustments` — قائمة تسويات المخزن ✅ (COMPLETED)
- `POST /api/stock-adjustments` — إنشاء تسوية ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/stock-movements/page.tsx` — قائمة ✅ (COMPLETED — list + filters)
- `/dashboard/stock-movements/[id]/page.tsx` — تفاصيل ✅ (COMPLETED)
- `/dashboard/stock-movements/new/page.tsx` — إنشاء تسوية ✅ (COMPLETED)
- `/dashboard/stock-adjustments/page.tsx` — قائمة ✅ (COMPLETED)
- `/dashboard/stock-adjustments/new/page.tsx` — إنشاء تسوية ✅ (COMPLETED)
- `/dashboard/stock-adjustments/[id]/page.tsx` — تفاصيل + ترحيل + حذف ✅ (COMPLETED)

**Priority:** MEDIUM

---

### ✅ UI Binding 2.3 — Units Management (مكتمل)
**Endpoints المطلوب ربطها:**
- `GET /api/units` — قائمة الوحدات ✅ (COMPLETED)
- `POST /api/units` — إنشاء وحدة ✅ (COMPLETED)
- `PATCH /api/units/{id}` — تحديث وحدة ✅ (COMPLETED)
- `DELETE /api/units/{id}` — حذف وحدة ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/units/page.tsx` — قائمة + create + edit + delete ✅ (COMPLETED)

**Priority:** MEDIUM
**تاريخ الإنجاز:** 2026-05-24

---

## Phase 3.0 — Inventory Reports (أسبوع 3)

### UI Binding 3.1 — Inventory Valuation
**Endpoints المطلوب ربطها:**
- `GET /api/inventory/valuation` — تقييم المخزون

**الصفحات المطلوبة:**
- `/dashboard/inventory/valuation/page.tsx` — صفحة تقرير تقييم المخزون

**Priority:** LOW

---

### UI Binding 3.2 — Inventory Audit Reports
**Endpoints المطلوب ربطها:**
- `GET /api/inventory/audit/issues` — مشاكل المخزون
- `GET /api/inventory/audit/reconciliation` — تسوية المخزون
- `GET /api/inventory/audit/stock-card` — بطاقة مخزن

**الصفحات المطلوبة:**
- `/dashboard/inventory/audit/page.tsx` — صفحة تقارير تدقيق المخزون

**Priority:** LOW

---

### UI Binding 3.3 — Collections Print
**Endpoints المطلوب ربطها:**
- `GET /api/customer-collections/{id}/print` — طباعة سند قبض

**الصفحات المطلوبة:**
- `/dashboard/collections/[id]/page.tsx` — صفحة تفاصيل سند قبض مع زر طباعة

**Priority:** MEDIUM

---

## Phase 4.0 — Admin & Advanced (أسبوع 4)

### UI Binding 4.1 — Companies & Branches
**Endpoints المطلوب ربطها:**
- `GET /api/companies` — قائمة الشركات
- `POST /api/companies` — إنشاء شركة
- `GET /api/branches` — قائمة الفروع
- `POST /api/branches` — إنشاء فرع

**الصفحات المطلوبة:**
- `/dashboard/companies/page.tsx`
- `/dashboard/branches/page.tsx`

**Priority:** LOW
**السبب:** إداري، غالبًا يُعد مرة واحدة عند الإعداد.

---

### UI Binding 4.2 — Users & Roles Detail
**Endpoints المطلوب ربطها:**
- `GET /api/users/{id}` — تفاصيل مستخدم
- `DELETE /api/users/{id}` — حذف مستخدم
- `GET /api/permissions` — قائمة الصلاحيات (لـ roles editor)

**الصفحات المطلوبة:**
- `/dashboard/users/[id]/page.tsx` — تفاصيل مستخدم
- `/dashboard/roles/[id]/page.tsx` — تفاصيل دور مع صلاحيات

**Priority:** LOW

---

### UI Binding 4.3 — Detail Pages (بقية الوحدات)
**الصفحات المطلوبة:**
- `/dashboard/products/[id]/page.tsx` — تفاصيل منتج
- `/dashboard/warehouses/[id]/page.tsx` — تفاصيل مخزن
- `/dashboard/customers/suppliers/[id]/page.tsx` — تفاصيل مورد منفصل
- `/dashboard/exchange-rates/[id]/page.tsx` — تفاصيل سعر صرف
- `/dashboard/fiscal-periods/[id]/page.tsx` — تفاصيل فترة

**Priority:** LOW

---

## Priority Matrix

### 🔴 Critical (يؤثر على العمليات اليومية)
1. Purchases Create + Detail
2. Sales Invoice Edit
3. Journal Entries Create + Post + Reverse

### 🟠 High (يحسن الإنتاجية بشكل كبير)
4. Accounts Chart & Tree
5. Product Detail
6. Warehouse Detail
7. Collections Print

### 🟡 Medium (يحسن الكفاءة)
8. Stock Transfers
9. Stock Movements
10. Stock Adjustments
11. Units Management

### 🟢 Low (إداري / مستقبلي)
12. Companies & Branches
13. Inventory Valuation & Audit
14. Detail pages بقية الوحدات
15. Roles & Permissions Editor

---

## Completion Criteria

تُعتبر كل مرحلة مكتملة عندما:
- ✅ جميع endpoints المطلوبة مربوطة بـ UI pages
- ✅ جميع mutations تعمل end-to-end
- ✅ تم إجراء smoke test على كل صفحة
- ✅ تم تحديث `API_REGISTRY.md` بـ UI Status = CONNECTED
- ✅ تم تحديث `API_UPDATE_RULES.md` إذا لزم الأمر
