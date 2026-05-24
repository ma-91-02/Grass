# API Registry — Grass ERP

> مصدر الحقيقة لكل نقاط النهاية API في المشروع.
> آخر تحديث: 2026-05-18

---

## Executive Summary

| المقياس | العدد |
|---------|-------|
| إجمالي الملفات (route.ts) | 68 |
| إجمالي نقاط النهاية (methods) | 128 |
| CONNECTED | 62 |
| PARTIAL | 31 |
| NO_UI | 25 |
| BACKEND_ONLY | 10 |

---

## Auth Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Auth | POST | `/api/auth/login` | مصادقة المستخدم وإرجاع JWT | DONE | CONNECTED | `/auth/login` | CRITICAL | 0 | Public endpoint |
| Auth | POST | `/api/auth/logout` | تسجيل الخروج وحذف الجلسة | DONE | CONNECTED | Sidebar | CRITICAL | 0 | يستخدم في كل صفحة |
| Auth | GET | `/api/auth/me` | جلب بيانات المستخدم الحالي والصلاحيات | DONE | CONNECTED | Layout + كل الصفحات | CRITICAL | 0 | يُستخدم لجلب companyId |

---

## Users Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Users | GET | `/api/users` | قائمة المستخدمين | DONE | CONNECTED | `/dashboard/users` | CRITICAL | 1.1 | — |
| Users | POST | `/api/users` | إنشاء مستخدم | DONE | CONNECTED | `/dashboard/users/new` | CRITICAL | 1.1 | — |
| Users | GET | `/api/users/{id}` | تفاصيل مستخدم | DONE | NO_UI | — | LOW | 4.2 | لا يوجد detail page |
| Users | PATCH | `/api/users/{id}` | تحديث مستخدم | DONE | PARTIAL | `/dashboard/users` | CRITICAL | 1.1 | toggle فقط، لا يوجد edit page كامل |
| Users | DELETE | `/api/users/{id}` | حذف مستخدم | DONE | NO_UI | — | LOW | 4.2 | لا يوجد زر حذف |

---

## Roles & Permissions Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Roles | GET | `/api/roles` | قائمة الأدوار مع الصلاحيات | DONE | CONNECTED | `/dashboard/roles`, `/dashboard/users/new` | HIGH | 1.2 | — |
| Permissions | GET | `/api/permissions` | قائمة كل الصلاحيات | DONE | BACKEND_ONLY | — | LOW | 4.4 | مصدر بيانات للـ Roles API فقط |

---

## Companies Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Companies | GET | `/api/companies` | قائمة الشركات | DONE | NO_UI | — | LOW | 4.1 | لا توجد صفحة شركات |
| Companies | POST | `/api/companies` | إنشاء شركة | DONE | NO_UI | — | LOW | 4.1 | — |
| Companies | GET | `/api/companies/{id}` | تفاصيل شركة | DONE | NO_UI | — | LOW | 4.1 | — |
| Companies | PATCH | `/api/companies/{id}` | تحديث شركة | DONE | NO_UI | — | LOW | 4.1 | — |
| Companies | DELETE | `/api/companies/{id}` | حذف شركة | DONE | NO_UI | — | LOW | 4.1 | — |

---

## Branches Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Branches | GET | `/api/branches` | قائمة الفروع | DONE | NO_UI | — | LOW | 4.1 | لا توجد صفحة فروع |
| Branches | POST | `/api/branches` | إنشاء فرع | DONE | NO_UI | — | LOW | 4.1 | — |
| Branches | GET | `/api/branches/{id}` | تفاصيل فرع | DONE | NO_UI | — | LOW | 4.1 | — |
| Branches | PATCH | `/api/branches/{id}` | تحديث فرع | DONE | NO_UI | — | LOW | 4.1 | — |
| Branches | DELETE | `/api/branches/{id}` | حذف فرع | DONE | NO_UI | — | LOW | 4.1 | — |

---

## Customers Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Customers | GET | `/api/customers` | قائمة العملاء | DONE | CONNECTED | `/dashboard/customers` | CRITICAL | 0 | — |
| Customers | POST | `/api/customers` | إنشاء عميل | DONE | CONNECTED | `/dashboard/customers` | CRITICAL | 0 | — |
| Customers | GET | `/api/customers/{id}` | تفاصيل عميل | DONE | CONNECTED | `/dashboard/customers/[id]` | CRITICAL | 0 | — |
| Customers | PATCH | `/api/customers/{id}` | تحديث عميل | DONE | CONNECTED | `/dashboard/customers` | CRITICAL | 0 | — |
| Customers | DELETE | `/api/customers/{id}` | حذف عميل | DONE | CONNECTED | `/dashboard/customers` | CRITICAL | 0 | — |
| Customers | GET | `/api/customers/{id}/receivables` | مستحقات العميل | DONE | CONNECTED | `/dashboard/customers/[id]` (receivables tab) | CRITICAL | 0 | — |
| Customers | GET | `/api/customers/{id}/statement` | كشف حساب العميل | DONE | CONNECTED | `/dashboard/customers/[id]` (statement tab) | CRITICAL | 0 | تم إصلاح parsing (items→transactions) |

---

## Suppliers Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Suppliers | GET | `/api/suppliers` | قائمة الموردين | DONE | CONNECTED | `/dashboard/customers` (suppliers tab) | HIGH | 0 | — |
| Suppliers | POST | `/api/suppliers` | إنشاء مورد | DONE | CONNECTED | `/dashboard/customers` (suppliers tab) | HIGH | 0 | — |
| Suppliers | GET | `/api/suppliers/{id}` | تفاصيل مورد | DONE | NO_UI | — | MEDIUM | 3.0 | لا يوجد detail page منفصل |
| Suppliers | PATCH | `/api/suppliers/{id}` | تحديث مورد | DONE | CONNECTED | `/dashboard/customers` (suppliers tab) | HIGH | 0 | — |
| Suppliers | DELETE | `/api/suppliers/{id}` | حذف مورد | DONE | CONNECTED | `/dashboard/customers` (suppliers tab) | HIGH | 0 | — |

---

## Customer Categories Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| CustomerCategories | GET | `/api/customer-categories` | قائمة أقسام العملاء | DONE | CONNECTED | `/dashboard/customers` (categories tab) | HIGH | 0 | — |
| CustomerCategories | POST | `/api/customer-categories` | إنشاء قسم | DONE | CONNECTED | `/dashboard/customers` (categories tab) | HIGH | 0 | — |
| CustomerCategories | GET | `/api/customer-categories/{id}` | تفاصيل قسم | DONE | NO_UI | — | LOW | 4.4 | — |
| CustomerCategories | PATCH | `/api/customer-categories/{id}` | تحديث قسم | DONE | CONNECTED | `/dashboard/customers` (categories tab) | HIGH | 0 | — |
| CustomerCategories | DELETE | `/api/customer-categories/{id}` | حذف قسم | DONE | CONNECTED | `/dashboard/customers` (categories tab) | HIGH | 0 | — |

---

## Products Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Products | GET | `/api/products` | قائمة المواد | DONE | CONNECTED | `/dashboard/products` | CRITICAL | 0 | — |
| Products | POST | `/api/products` | إنشاء مادة | DONE | CONNECTED | `/dashboard/products` | CRITICAL | 0 | تم إصلاح companyId و unitId |
| Products | GET | `/api/products/{id}` | تفاصيل مادة | DONE | NO_UI | — | MEDIUM | 2.0 | لا يوجد detail page |
| Products | PATCH | `/api/products/{id}` | تحديث مادة | DONE | CONNECTED | `/dashboard/products` | CRITICAL | 0 | تم إصلاح companyId و unitId |
| Products | DELETE | `/api/products/{id}` | حذف مادة | DONE | CONNECTED | `/dashboard/products` | CRITICAL | 0 | — |

---

## Product Categories Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| ProductCategories | GET | `/api/categories` | قائمة تصنيفات المواد | DONE | CONNECTED | `/dashboard/categories`, `/dashboard/products` | HIGH | 0 | — |
| ProductCategories | POST | `/api/categories` | إنشاء تصنيف | DONE | CONNECTED | `/components/forms/product-form.tsx` (inline) | HIGH | 0 | — |
| ProductCategories | GET | `/api/categories/{id}` | تفاصيل تصنيف | DONE | NO_UI | — | LOW | 4.4 | — |
| ProductCategories | PATCH | `/api/categories/{id}` | تحديث تصنيف | DONE | CONNECTED | `/dashboard/categories` | HIGH | 0 | — |
| ProductCategories | DELETE | `/api/categories/{id}` | حذف تصنيف | DONE | CONNECTED | `/components/forms/product-form.tsx` (inline) | HIGH | 0 | — |

---

## Units Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Units | GET | `/api/units` | قائمة وحدات القياس | DONE | PARTIAL | `/dashboard/products` (dropdown) | MEDIUM | 2.3 | لا يوجد صفحة إدارة وحدات |
| Units | POST | `/api/units` | إنشاء وحدة | DONE | NO_UI | — | MEDIUM | 2.3 | — |
| Units | GET | `/api/units/{id}` | تفاصيل وحدة | DONE | NO_UI | — | MEDIUM | 2.3 | — |
| Units | PATCH | `/api/units/{id}` | تحديث وحدة | DONE | NO_UI | — | MEDIUM | 2.3 | — |
| Units | DELETE | `/api/units/{id}` | حذف وحدة | DONE | NO_UI | — | MEDIUM | 2.3 | — |

---

## Warehouses Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Warehouses | GET | `/api/warehouses` | قائمة المخازن | DONE | CONNECTED | `/dashboard/warehouses`, `/dashboard/sales-invoices/new` | CRITICAL | 0 | تم إصلاح companyId في GET |
| Warehouses | POST | `/api/warehouses` | إنشاء مخزن | DONE | CONNECTED | `/dashboard/warehouses` | CRITICAL | 0 | تم إصلاح companyId و code field |
| Warehouses | GET | `/api/warehouses/{id}` | تفاصيل مخزن | DONE | NO_UI | — | MEDIUM | 2.0 | لا يوجد detail page |
| Warehouses | PATCH | `/api/warehouses/{id}` | تحديث مخزن | DONE | CONNECTED | `/dashboard/warehouses` | CRITICAL | 0 | تم إصلاح companyId و code field |
| Warehouses | DELETE | `/api/warehouses/{id}` | حذف مخزن | DONE | CONNECTED | `/dashboard/warehouses` | CRITICAL | 0 | — |

---

## Stock Movements Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| StockMovements | GET | `/api/stock-movements` | قائمة حركات المخزن | DONE | CONNECTED | `/dashboard/stock-movements` | MEDIUM | 2.2 | قائمة مع فلترة حسب المخزن/النوع/الحالة + بحث |
| StockMovements | POST | `/api/stock-movements` | إنشاء حركة مخزن | DONE | CONNECTED | `/dashboard/stock-movements/new` | MEDIUM | 2.2 | form إنشاء تسوية (ADJUSTMENT_IN/OUT + IN/OUT) |
| StockMovements | GET | `/api/stock-movements/{id}` | تفاصيل حركة | DONE | CONNECTED | `/dashboard/stock-movements/[id]` | MEDIUM | 2.2 | عرض معلومات الحركة + المادة + المخزن + المرجع |
| StockMovements | PATCH | `/api/stock-movements/{id}` | تحديث حركة | DONE | NO_UI | — | MEDIUM | 2.2 | — |
| StockMovements | DELETE | `/api/stock-movements/{id}` | حذف حركة | DONE | NO_UI | — | MEDIUM | 2.2 | — |
| StockMovements | POST | `/api/stock-movements/{id}/post` | ترحيل حركة | DONE | NO_UI | — | MEDIUM | 2.2 | — |

---

## Stock Transfers Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| StockTransfers | GET | `/api/stock-transfers` | قائمة تحويلات المخزن | DONE | NO_UI | — | MEDIUM | 2.1 | placeholder فقط |
| StockTransfers | POST | `/api/stock-transfers` | إنشاء تحويل | DONE | CONNECTED | `/dashboard/warehouse-transfers/new` | MEDIUM | 2.1 | form إنشاء تحويل مخزن (مصدر/هدف/مادة/كمية) |
| StockTransfers | GET | `/api/stock-transfers/{id}` | تفاصيل تحويل | DONE | CONNECTED | `/dashboard/warehouse-transfers/[id]` | MEDIUM | 2.1 | عرض معلومات + بنود + ملخص |
| StockTransfers | PATCH | `/api/stock-transfers/{id}` | تحديث تحويل | DONE | NO_UI | — | MEDIUM | 2.1 | — |
| StockTransfers | DELETE | `/api/stock-transfers/{id}` | حذف تحويل | DONE | CONNECTED | `/dashboard/warehouse-transfers/[id]` | MEDIUM | 2.1 | ConfirmDialog + فقط للمسودات |
| StockTransfers | POST | `/api/stock-transfers/{id}/post` | ترحيل تحويل | DONE | CONNECTED | `/dashboard/warehouse-transfers/[id]` | MEDIUM | 2.1 | ConfirmDialog + فقط للمسودات |

---

## Stock Adjustments Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| StockAdjustments | GET | `/api/stock-adjustments` | قائمة تسويات المخزن | DONE | CONNECTED | `/dashboard/stock-adjustments` | MEDIUM | 2.2 | قائمة مع فلترة + بحث + badges |
| StockAdjustments | POST | `/api/stock-adjustments` | إنشاء تسوية | DONE | NO_UI | — | MEDIUM | 2.2 | — |
| StockAdjustments | GET | `/api/stock-adjustments/{id}` | تفاصيل تسوية | DONE | NO_UI | — | MEDIUM | 2.2 | — |
| StockAdjustments | PATCH | `/api/stock-adjustments/{id}` | تحديث تسوية | DONE | NO_UI | — | MEDIUM | 2.2 | — |
| StockAdjustments | DELETE | `/api/stock-adjustments/{id}` | حذف تسوية | DONE | NO_UI | — | MEDIUM | 2.2 | — |
| StockAdjustments | POST | `/api/stock-adjustments/{id}/post` | ترحيل تسوية | DONE | NO_UI | — | MEDIUM | 2.2 | — |

---

## Stock Balances Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| StockBalances | GET | `/api/stock-balances` | أرصدة المخزن | DONE | CONNECTED | `/dashboard/stock-balances` | HIGH | 0 | summary cards + filters + stock status badges + search |

---

## Inventory Valuation Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| InventoryValuation | GET | `/api/inventory/valuation` | تقييم المخزون | DONE | NO_UI | — | LOW | 3.3 | — |

---

## Inventory Audit Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| InventoryAudit | GET | `/api/inventory/audit/issues` | كشف مشاكل المخزون | DONE | NO_UI | — | LOW | 3.3 | — |
| InventoryAudit | GET | `/api/inventory/audit/reconciliation` | تسوية المخزون | DONE | NO_UI | — | LOW | 3.3 | — |
| InventoryAudit | GET | `/api/inventory/audit/stock-card` | بطاقة مخزن | DONE | NO_UI | — | LOW | 3.3 | — |

---

## Sales Invoices Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| SalesInvoices | GET | `/api/sales-invoices` | قائمة فواتير البيع | DONE | CONNECTED | `/dashboard/sales-invoices` | CRITICAL | 0 | — |
| SalesInvoices | POST | `/api/sales-invoices` | إنشاء فاتورة بيع | DONE | CONNECTED | `/dashboard/sales-invoices/new` | CRITICAL | 0 | تم إصلاح warehouses query |
| SalesInvoices | GET | `/api/sales-invoices/{id}` | تفاصيل فاتورة | DONE | CONNECTED | `/dashboard/sales-invoices/[id]` | CRITICAL | 0 | — |
| SalesInvoices | PATCH | `/api/sales-invoices/{id}` | تحديث مسودة | DONE | CONNECTED | `/dashboard/sales-invoices/[id]/edit` | HIGH | 1.2 | تم إنشاء edit page |
| SalesInvoices | DELETE | `/api/sales-invoices/{id}` | حذف مسودة | DONE | CONNECTED | `/dashboard/sales-invoices/[id]` | CRITICAL | 0 | — |
| SalesInvoices | POST | `/api/sales-invoices/{id}/post` | ترحيل فاتورة | DONE | CONNECTED | `/dashboard/sales-invoices/[id]` | CRITICAL | 0 | — |
| SalesInvoices | GET | `/api/sales-invoices/{id}/print` | طباعة فاتورة | DONE | CONNECTED | `/dashboard/sales-invoices/[id]` | CRITICAL | 0 | — |

---

## Sales Returns Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| SalesReturns | GET | `/api/sales-returns` | قائمة مرتجعات البيع | DONE | CONNECTED | `/dashboard/sales-returns` | HIGH | 0 | — |
| SalesReturns | POST | `/api/sales-returns` | إنشاء مرتجع | DONE | CONNECTED | `/dashboard/sales-returns/new` | HIGH | 0 | — |
| SalesReturns | GET | `/api/sales-returns/{id}` | تفاصيل مرتجع | DONE | CONNECTED | `/dashboard/sales-returns/[id]` | HIGH | 0 | — |
| SalesReturns | POST | `/api/sales-returns/{id}/post` | ترحيل مرتجع | DONE | CONNECTED | `/dashboard/sales-returns/[id]` | HIGH | 0 | — |
| SalesReturns | GET | `/api/sales-returns/{id}/print` | طباعة مرتجع | DONE | CONNECTED | `/dashboard/sales-returns/[id]` | HIGH | 0 | — |
| SalesReturns | PATCH | `/api/sales-returns/{id}` | تحديث مرتجع | DONE | NO_UI | — | MEDIUM | 1.3 | لا يوجد edit page |

---

## Customer Collections Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Collections | GET | `/api/customer-collections` | قائطة التحصيلات | DONE | CONNECTED | `/dashboard/collections` | HIGH | 0 | — |
| Collections | POST | `/api/customer-collections` | إنشاء سند قبض | DONE | CONNECTED | `/dashboard/collections/new` | HIGH | 0 | — |
| Collections | GET | `/api/customer-collections/{id}/print` | طباعة سند قبض | DONE | NO_UI | — | LOW | 3.0 | لا يوجد detail page مع زر طباعة |

---

## Journal Entries Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| JournalEntries | GET | `/api/journal-entries` | قائمة القيود اليومية | DONE | CONNECTED | `/dashboard/journal-entries` | CRITICAL | 0 | read-only list |
| JournalEntries | POST | `/api/journal-entries` | إنشاء قيد | DONE | CONNECTED | `/dashboard/journal-entries/new` | CRITICAL | 1.3 | — |
| JournalEntries | GET | `/api/journal-entries/{id}` | تفاصيل قيد | DONE | CONNECTED | `/dashboard/journal-entries/[id]` | CRITICAL | 0 | — |
| JournalEntries | PATCH | `/api/journal-entries/{id}` | تحديث مسودة | DONE | NO_UI | — | CRITICAL | 1.3 | — |
| JournalEntries | DELETE | `/api/journal-entries/{id}` | حذف مسودة | DONE | NO_UI | — | CRITICAL | 1.3 | — |
| JournalEntries | POST | `/api/journal-entries/{id}/post` | ترحيل قيد | DONE | CONNECTED | `/dashboard/journal-entries/[id]` | CRITICAL | 1.3 | — |
| JournalEntries | POST | `/api/journal-entries/{id}/reverse` | عكس قيد | DONE | CONNECTED | `/dashboard/journal-entries/[id]` | CRITICAL | 1.3 | — |

---

## Accounts Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Accounts | GET | `/api/accounts` | قائمة شجرة الحسابات | DONE | CONNECTED | `/dashboard/accounts` | HIGH | 1.4 | شجرة هرمية مع توسيع/طي |
| Accounts | POST | `/api/accounts` | إنشاء حساب | DONE | CONNECTED | `/dashboard/accounts` | HIGH | 1.4 | مودال إنشاء مع parent/type/currency |
| Accounts | GET | `/api/accounts/{id}` | تفاصيل حساب | DONE | NO_UI | — | HIGH | 1.4 | — |
| Accounts | PATCH | `/api/accounts/{id}` | تحديث حساب | DONE | CONNECTED | `/dashboard/accounts` | HIGH | 1.4 | مودال تعديل (name/parent/isPosting/description) |
| Accounts | DELETE | `/api/accounts/{id}` | حذف حساب | DONE | CONNECTED | `/dashboard/accounts` | HIGH | 1.4 | ConfirmDialog + عرض رسالة الرفض من backend |
| Accounts | GET | `/api/accounts/tree` | شجرة الحسابات | DONE | NO_UI | — | HIGH | 1.4 | مستخدمة كمرجع، الـ UI يبني tree من list |

---

## Fiscal Periods Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| FiscalPeriods | GET | `/api/fiscal-periods` | قائمة الفترات المالية | DONE | CONNECTED | `/dashboard/fiscal-periods` | HIGH | 0 | — |
| FiscalPeriods | POST | `/api/fiscal-periods` | إنشاء فترة | DONE | CONNECTED | `/dashboard/fiscal-periods` | HIGH | 0 | — |
| FiscalPeriods | GET | `/api/fiscal-periods/{id}` | تفاصيل فترة | DONE | NO_UI | — | LOW | 4.4 | — |
| FiscalPeriods | PATCH | `/api/fiscal-periods/{id}` | فتح/إغلاق فترة | DONE | CONNECTED | `/dashboard/fiscal-periods` | HIGH | 0 | — |
| FiscalPeriods | DELETE | `/api/fiscal-periods/{id}` | حذف فترة مستقبلية | DONE | NO_UI | — | LOW | 4.4 | — |

---

## Payment Accounts Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| PaymentAccounts | GET | `/api/payment-accounts` | قائمة حسابات الدفع | DONE | CONNECTED | `/dashboard/payment-accounts` | HIGH | 0 | تم إصلاح dead code |
| PaymentAccounts | POST | `/api/payment-accounts` | إنشاء حساب دفع | DONE | CONNECTED | `/dashboard/payment-accounts` | HIGH | 0 | لا يوجد edit/toggle/delete |

---

## Exchange Rates Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| ExchangeRates | GET | `/api/exchange-rates` | قائمة أسعار الصرف | DONE | CONNECTED | `/dashboard/exchange-rates` | HIGH | 0 | — |
| ExchangeRates | POST | `/api/exchange-rates` | إنشاء سعر صرف | DONE | CONNECTED | `/dashboard/exchange-rates` | HIGH | 0 | — |
| ExchangeRates | GET | `/api/exchange-rates/{id}` | تفاصيل سعر صرف | DONE | UNKNOWN | — | LOW | 4.4 | لم يتم التحقق |
| ExchangeRates | DELETE | `/api/exchange-rates/{id}` | حذف سعر صرف | DONE | CONNECTED | `/dashboard/exchange-rates` | HIGH | 0 | — |

---

## Purchases Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Purchases | GET | `/api/purchases` | قائمة فواتير الشراء | DONE | CONNECTED | `/dashboard/purchases` | CRITICAL | 0 | — |
| Purchases | POST | `/api/purchases` | إنشاء فاتورة شراء | DONE | CONNECTED | `/dashboard/purchases/new` | CRITICAL | 1.0 | — |
| Purchases | GET | `/api/purchases/{id}` | تفاصيل فاتورة شراء | DONE | CONNECTED | `/dashboard/purchases/[id]` | HIGH | 1.0 | — |
| Purchases | PATCH | `/api/purchases/{id}` | تحديث فاتورة شراء | DONE | NO_UI | — | HIGH | 1.0 | — |
| Purchases | DELETE | `/api/purchases/{id}` | حذف فاتورة شراء | DONE | CONNECTED | `/dashboard/purchases` | CRITICAL | 0 | — |
| Purchases | GET | `/api/purchases/{id}/pdf` | تحميل PDF فاتورة الشراء | DONE | CONNECTED | `/dashboard/purchases` | HIGH | 0 | — |

---

## Reports Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Reports | GET | `/api/dashboard/stats` | إحصائيات لوحة التحكم | DONE | CONNECTED | `/dashboard` | HIGH | 0 | — |

---

## Audit Logs Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| AuditLogs | GET | `/api/audit-logs` | سجل النشاطات | DONE | CONNECTED | `/dashboard/audit-logs` | HIGH | 0 | — |

---

## Packaging Module

| Module | Method | Endpoint | Purpose | Backend Status | UI Status | UI Page | Priority | Phase | Notes |
|--------|--------|----------|---------|---------------|-----------|---------|----------|-------|-------|
| Packaging | GET | `/api/packaging` | قائمة أنواع التعبئة | DONE | BACKEND_ONLY | — | LOW | 0 | مصدر بيانات ثابت للـ defaults |

---

## Status Summary

| Status | Count |
|--------|-------|
| CONNECTED | 61 |
| PARTIAL | 31 |
| NO_UI | 26 |
| BACKEND_ONLY | 10 |
| UNKNOWN | 0 |
| BROKEN | 0 |
| **Total** | **128** |
