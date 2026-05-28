# تقرير المرحلة السادسة — PH-06: Sales Cycle

## 1. معلومات التقرير
- **اسم المرحلة:** Sales Cycle (دورة المبيعات)
- **الحالة:** DONE ✅ (100%)
- **تاريخ التقرير:** 2026-05-28
- **الهدف:** فواتير البيع، الترحيل، الإلغاء، المرتجعات، التحصيلات، كشوفات العملاء

## 2. ملخص المهام

| Task ID | اسم المهمة | الحالة | النسبة | ملاحظات |
|---------|-----------|--------|:-----:|---------|
| SAL-001 | Sales Invoice CRUD | DONE | 100% | CRUD كامل مع 50+ اختباراً |
| SAL-002 | Sales Invoice Posting | DONE | 100% | Stock OUT + Revenue JE + COGS JE + AR update |
| SAL-003 | Cancel / Reversal | DONE | 100% | RETURN_IN + Revenue Reversal + **COGS Reversal** (تم الإصلاح) |
| SAL-004 | Sales Returns | DONE | 100% | CRUD + Posting + DELETE (تمت الإضافة) + إصلاح صلاحية PATCH |
| SAL-005 | Customer Collections | DONE | 100% | Dr Cash/Bank + Cr AR + على الحساب |
| SAL-006 | Statement & Receivables | DONE | 100% | كشف حساب + قائمة الذمم |
| SAL-007 | Tax Handling | NOT_REQUIRED_FOR_CURRENT_RELEASE | — | `taxAmount=0` مؤقتاً حتى Tax Module |
| SAL-008 | Print Permissions | DONE | 100% | إضافة `SALES_PRINT` و `SALES_RETURNS_PRINT` |
| SAL-009 | State Machine | DONE | 100% | DRAFT→POSTED→CANCELLED مع RETURNED_PARTIAL/FULL |

## 3. الإصلاحات في هذه المرحلة

### SAL-003: إصلاح Cancel COGS
- **المشكلة:** إلغاء فاتورة بيع كان يعكس قيد الإيراد فقط ويُعيد المخزون، لكن قيد COGS (Dr COGS, Cr Inventory) كان يبقى في ledger مسبباً تضخماً في حساب COGS
- **الإصلاح:** إضافة عكس قيد COGS (Dr Inventory, Cr COGS) مع `reversalEntryId` داخل نفس transaction
- **التفاصيل:** تم تغيير `sourceType` لقيد COGS من `"SalesInvoice"` إلى `"SalesInvoiceCOGS"` للتمييز عن قيد الإيراد. في الـ cancel route، يتم البحث عن قيد COGS بـ `sourceType: "SalesInvoiceCOGS"` و `sourceId: id` وإنشاء قيد عكسي

### SAL-004: إصلاحات المرتجعات
- **المشكلة 1:** لا يوجد DELETE handler لمرتجعات المبيعات (لمسح المسودات)
- **الإصلاح:** إضافة `DELETE /api/sales-returns/{id}` مع صلاحية `SALES_RETURNS_DELETE`
- **المشكلة 2:** PATCH كان يستخدم `SALES_RETURNS_CREATE` بدلاً من `SALES_RETURNS_EDIT`
- **الإصلاح:** تغيير الـ permission check إلى `SALES_RETURNS_EDIT`

### SAL-008: صلاحيات الطباعة
- **الإضافة:** `SALES_PRINT` و `SALES_RETURNS_PRINT` في قائمة الصلاحيات

## 4. قائمة الملفات المعدلة

| المسار | التعديل |
|--------|---------|
| `src/app/api/sales-invoices/[id]/post/route.ts` | تغيير sourceType لقيد COGS إلى "SalesInvoiceCOGS" |
| `src/app/api/sales-invoices/[id]/cancel/route.ts` | إضافة عكس قيد COGS عند الإلغاء |
| `src/app/api/sales-returns/[id]/route.ts` | إضافة DELETE handler + إصلاح صلاحية PATCH |
| `src/lib/permissions.ts` | إضافة SALES_RETURNS_DELETE, SALES_RETURNS_PRINT, SALES_PRINT |

## 5. نتائج الاختبارات
- Tests: ✅ 564/564
- Typecheck: ⚠️ 3 أخطاء (purchases.test.ts — موجودة مسبقاً)
- Build: ✅ ناجح

## 6. قرار PH-06
- **الحالة:** DONE 100%
- **قرار Gate:** APPROVED FOR PH-07
- **التوقيع:** PH06-GATE-VERIFY-001
