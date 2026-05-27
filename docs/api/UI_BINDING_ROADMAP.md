# UI Binding Roadmap — Grass ERP

> خارطة ربط الواجهة الأمامية بالـ APIs حسب الأولوية.
> آخر تحديث: 2026-05-27 (MAINT-002 — التدقيق النهائي)

---

## Phase 0 — Foundation (مكتمل)

الوحدات الأساسية التي تعمل end-to-end:

- ✅ Auth (login/logout/me)
- ✅ Users (list + create + toggle)
- ✅ Customers (list + create + edit + detail + receivables + statement)
- ✅ Suppliers (list + create + edit + detail)
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

### UI Binding 1.3 — Journal Entries Create & Post ✅ (COMPLETED)
**Endpoints المطلوب ربطها:**
- `POST /api/journal-entries` — إنشاء قيد يومي ✅ (COMPLETED)
- `POST /api/journal-entries/{id}/post` — ترحيل قيد ✅ (COMPLETED)
- `POST /api/journal-entries/{id}/reverse` — عكس قيد ✅ (COMPLETED)
- `PATCH /api/journal-entries/{id}` — تحديث مسودة قيد ✅ (COMPLETED)
- `DELETE /api/journal-entries/{id}` — حذف مسودة قيد ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/journal-entries/new/page.tsx` — صفحة إنشاء قيد ✅ (COMPLETED)
- `/dashboard/journal-entries/[id]/page.tsx` — صفحة تفاصيل قيد مع أزرار post/reverse/edit/delete ✅ (COMPLETED)
- `/dashboard/journal-entries/[id]/edit/page.tsx` — صفحة تعديل مسودة قيد ✅ (COMPLETED)

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

### ✅ UI Binding 1.5 — Sales Returns Edit (CONNECTED)
**Endpoints المطلوب ربطها:**
- `PATCH /api/sales-returns/{id}` — تحديث مرتجع ✅ (COMPLETED — تعديل notes, line.quantity, line.notes فقط)

**الصفحات المطلوبة:**
- `/dashboard/sales-returns/[id]/edit/page.tsx` ✅ (COMPLETED)

**Priority:** MEDIUM
**تاريخ الإنجاز:** 2026-05-24

---

## Phase 2.0 — Operations (أسبوع 2)

### UI Binding 2.1 — Stock Transfers ✅ (COMPLETED)
**Endpoints المطلوب ربطها:**
- `GET /api/stock-transfers` — قائمة التحويلات ✅ (CONNECTED)
- `POST /api/stock-transfers` — إنشاء تحويل ✅ (COMPLETED)
- `GET /api/stock-transfers/{id}` — تفاصيل تحويل ✅ (COMPLETED)
- `PATCH /api/stock-transfers/{id}` — تحديث تحويل ✅ (COMPLETED)
- `POST /api/stock-transfers/{id}/post` — ترحيل تحويل ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/warehouse-transfers/page.tsx` — قائمة ✅ (CONNECTED)
- `/dashboard/warehouse-transfers/new/page.tsx` — إنشاء تحويل ✅ (COMPLETED)
- `/dashboard/warehouse-transfers/[id]/page.tsx` — تفاصيل + ترحيل + حذف + تعديل ✅ (COMPLETED)
- `/dashboard/warehouse-transfers/[id]/edit/page.tsx` — تعديل مسودة ✅ (COMPLETED)

**Priority:** MEDIUM
**تاريخ الإنجاز:** 2026-05-27

---

### UI Binding 2.2 — Stock Movements & Adjustments ✅ (COMPLETED)
**Endpoints المطلوب ربطها:**
- `GET /api/stock-movements` — قائمة حركات المخزن ✅ (COMPLETED)
- `GET /api/stock-movements/{id}` — تفاصيل حركة ✅ (COMPLETED)
- `POST /api/stock-movements` — إنشاء حركة ✅ (COMPLETED — create form)
- `PATCH /api/stock-movements/{id}` — تحديث حركة ✅ (COMPLETED)
- `DELETE /api/stock-movements/{id}` — حذف حركة ✅ (COMPLETED)
- `POST /api/stock-movements/{id}/post` — ترحيل حركة ✅ (COMPLETED)
- `GET /api/stock-adjustments` — قائمة تسويات المخزن ✅ (COMPLETED)
- `POST /api/stock-adjustments` — إنشاء تسوية ✅ (COMPLETED)
- `PATCH /api/stock-adjustments/{id}` — تحديث تسوية ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/stock-movements/page.tsx` — قائمة ✅ (COMPLETED — list + filters)
- `/dashboard/stock-movements/[id]/page.tsx` — تفاصيل + ترحيل + حذف + تعديل ✅ (COMPLETED)
- `/dashboard/stock-movements/[id]/edit/page.tsx` — تعديل مسودة ✅ (COMPLETED)
- `/dashboard/stock-movements/new/page.tsx` — إنشاء تسوية ✅ (COMPLETED)
- `/dashboard/stock-adjustments/page.tsx` — قائمة ✅ (COMPLETED)
- `/dashboard/stock-adjustments/new/page.tsx` — إنشاء تسوية ✅ (COMPLETED)
- `/dashboard/stock-adjustments/[id]/page.tsx` — تفاصيل + ترحيل + حذف + تعديل ✅ (COMPLETED)
- `/dashboard/stock-adjustments/[id]/edit/page.tsx` — تعديل مسودة ✅ (COMPLETED)

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

### UI Binding 3.1 — Inventory Valuation ✅ (COMPLETED)
**Endpoints المطلوب ربطها:**
- `GET /api/inventory/valuation` — تقييم المخزون ✅ (CONNECTED)

**الصفحات المطلوبة:**
- `/dashboard/inventory/valuation/page.tsx` — صفحة تقرير تقييم المخزون ✅

**Priority:** LOW
**تاريخ الإنجاز:** 2026-05-27

---

### UI Binding 3.2 — Inventory Audit Reports ✅ (COMPLETED)
**Endpoints المطلوب ربطها:**
- `GET /api/inventory/audit/issues` — مشاكل المخزون ✅ (CONNECTED)
- `GET /api/inventory/audit/reconciliation` — تسوية المخزون ✅ (CONNECTED)
- `GET /api/inventory/audit/stock-card` — بطاقة مخزن ✅ (CONNECTED)

**الصفحات المطلوبة:**
- `/dashboard/inventory/audit/page.tsx` — صفحة تقارير تدقيق المخزون ✅

**Priority:** LOW
**تاريخ الإنجاز:** 2026-05-27

---

### UI Binding 3.3 — Collections Print
**Endpoints المطلوب ربطها:**
- `GET /api/customer-collections/{id}/print` — طباعة سند قبض

**الصفحات المطلوبة:**
- `/dashboard/collections/[id]/page.tsx` — صفحة تفاصيل سند قبض مع زر طباعة

**Priority:** MEDIUM

---

## Phase 4.0 — Admin & Advanced (أسبوع 4)

### ✅ UI Binding 4.1 — Companies & Branches (مكتمل)
**Endpoints المطلوب ربطها:**
- `GET /api/companies` — قائمة الشركات ✅ (COMPLETED)
- `POST /api/companies` — إنشاء شركة ✅ (COMPLETED)
- `GET /api/companies/{id}` — تفاصيل شركة ✅ (COMPLETED)
- `PATCH /api/companies/{id}` — تحديث شركة ✅ (COMPLETED)
- `DELETE /api/companies/{id}` — حذف شركة ✅ (COMPLETED)
- `GET /api/branches` — قائمة الفروع ✅ (COMPLETED)
- `POST /api/branches` — إنشاء فرع ✅ (COMPLETED)
- `PATCH /api/branches/{id}` — تحديث فرع ✅ (COMPLETED)
- `DELETE /api/branches/{id}` — حذف فرع ✅ (COMPLETED)

**الصفحات المطلوبة:**
- `/dashboard/companies/page.tsx` ✅ (COMPLETED — list + create + edit + delete dialog)
- `/dashboard/branches/page.tsx` ✅ (COMPLETED — list + create + edit + delete dialog)

**Priority:** LOW
**السبب:** إداري، غالبًا يُعد مرة واحدة عند الإعداد.
**تاريخ الإنجاز:** 2026-05-26

---

### ✅ UI Binding 4.2 — User Detail (مكتمل)
**Endpoints المطلوب ربطها:**
- `GET /api/users/{id}` — تفاصيل مستخدم ✅ (COMPLETED)
- `PATCH /api/users/{id}` — تعديل roles + isActive ✅ (COMPLETED)
- `DELETE /api/users/{id}` — حذف مستخدم ✅ (COMPLETED — مع حماية self-deletion وآخر System Admin)

**الصفحات المطلوبة:**
- `/dashboard/users/[id]/page.tsx` — تفاصيل مستخدم ✅ (COMPLETED — info + roles edit + toggle + delete)

**الباقي (لم يُنفذ):**
- `/dashboard/roles/[id]/page.tsx` — تفاصيل دور مع صلاحيات (لم يُنفذ بعد)

**Priority:** LOW
**تاريخ الإنجاز:** 2026-05-24

---

### ✅ UI Binding 4.3 — Product Detail (مكتمل)
**Endpoints المطلوب ربطها:**
- `GET /api/products/{id}` — تفاصيل مادة ✅ (COMPLETED)
- `GET /api/stock-balances?productId=...` — رصيد المخزون (مستخدم من صفحة التفاصيل)
- `GET /api/stock-movements?productId=...` — حركات المخزون (مستخدم من صفحة التفاصيل)

**الصفحات المطلوبة:**
- `/dashboard/products/[id]/page.tsx` — تفاصيل منتج ✅ (COMPLETED — basic info + prices + stock balance + movements)

**Priority:** LOW
**تاريخ الإنجاز:** 2026-05-24

---

### ✅ UI Binding 4.3 — Detail Pages (Warehouse Detail)
**الصفحات المطلوبة:**
- `/dashboard/warehouses/[id]/page.tsx` — تفاصيل مخزن ✅ (COMPLETED)
- `/dashboard/suppliers/[id]/page.tsx` — تفاصيل مورد منفصل ✅ (COMPLETED — name/code/phone/address/notes/status/accounts)
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
5. ✅ Product Detail (مكتمل)
6. ✅ Warehouse Detail (مكتمل)
7. Collections Print

### 🟡 Medium (يحسن الكفاءة)
8. Stock Transfers
9. Stock Movements
10. Stock Adjustments
11. Units Management

### 🟢 Low (إداري / مستقبلي)
12. Companies & Branches
13. Inventory Valuation & Audit
14. ✅ User Detail (مكتمل)
15. Detail pages بقية الوحدات
16. Roles & Permissions Editor

---

## Completion Criteria

تُعتبر كل مرحلة مكتملة عندما:
- ✅ جميع endpoints المطلوبة مربوطة بـ UI pages
- ✅ جميع mutations تعمل end-to-end
- ✅ تم إجراء smoke test على كل صفحة
- ✅ تم تحديث `API_REGISTRY.md` بـ UI Status = CONNECTED
- ✅ تم تحديث `API_UPDATE_RULES.md` إذا لزم الأمر

---

## MAINT-002 Audit Note (2026-05-27)

تم التدقيق النهائي لـ API_REGISTRY.md:

- **CONNECTED:** 119 (تصحيح من 88 — 31 endpoint لم تكن محدّثة في Executive Summary)
- **NO_UI:** 7 (تصحيح من 0 — 7 detail/action endpoints لا تزال غير مربوطه)
- **BACKEND_ONLY:** 3 (تصحيح من 10 — 8 endpoints لم تكن صحيحة)
- **PARTIAL:** 0 (تصحيح من 30 — لا يوجد endpoints مربوط جزئيًا)

### المتبقي NO_UI (7 endpoints):
1. `GET /api/customer-categories/{id}` — تفاصيل قسم (LOW)
2. `GET /api/categories/{id}` — تفاصيل تصنيف (LOW)
3. `GET /api/units/{id}` — تفاصيل وحدة (LOW)
4. `GET /api/accounts/{id}` — تفاصيل حساب (LOW)
5. `GET /api/fiscal-periods/{id}` — تفاصيل فترة (LOW)
6. `DELETE /api/fiscal-periods/{id}` — حذف فترة (LOW)
7. `PATCH /api/purchases/{id}` — تحديث فاتورة شراء (HIGH) ← مهمة UI-034

### التغييرات:
- `GET /api/customer-collections/{id}/print`: NO_UI → CONNECTED (مستخدم من صفحة القائمة)
- `GET /api/accounts/tree`: NO_UI → BACKEND_ONLY (UI يبني الشجرة من flat list)
- `GET /api/exchange-rates/{id}`: UNKNOWN → CONNECTED (مستخدم في صفحة القائمة)

### التوصية:
- UI-034 (PATCH Purchases) هو أولوية HIGH ويُوصى به كأول مهمة UI تالية.
