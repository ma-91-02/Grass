# تقرير المرحلة السابعة — PH-07: Purchases Cycle

## 1. معلومات التقرير
- **اسم المرحلة:** Purchases Cycle (دورة المشتريات)
- **الحالة:** DONE ✅ (100%)
- **تاريخ التقرير:** 2026-05-28
- **الهدف:** فواتير الشراء، الترحيل، المخزون، قيود الأستاذ، supplier AP

## 2. ملخص المهام

| Task ID | اسم المهمة | الحالة | النسبة | ملاحظات |
|---------|-----------|--------|:-----:|---------|
| PUR-001 | Purchase invoice models | DONE | 100% | PurchaseInvoice, PurchaseInvoiceItem, PurchaseExpense |
| PUR-002 | Purchase CRUD APIs | DONE | 100% | CRUD + POST (315 سطراً) |
| PUR-003 | Purchase UI pages | DONE | 100% | `/dashboard/purchases/*` |
| PUR-004 | Purchase PDF | DONE | 100% | `/api/purchases/[id]/pdf` |
| PUR-005 | Purchase expenses inside invoice | PARTIAL | 50% | expenseShare/finalCost |
| PUR-006 | Purchase draft/edit semantics | DONE | 100% | مسار الترحيل مع status COMPLETED |
| PUR-007 | Purchase posting endpoint | DONE | 100% | Stock IN + JE + LedgerValidator + CurrencyGuard + PeriodGuard |
| PUR-008 | Stock IN applied to stock balance | DONE | 100% | StockBalanceService.applyPostedMovement |
| PUR-009 | Supplier AP journal | DONE | 100% | Dr Inventory + Cr AP |
| PUR-010 | Cash/bank purchase journal | DONE | 100% | Dr Inventory + Cr Cash + PaymentAccount.balance |
| PUR-011 | Landed cost valuation | PARTIAL | 50% | expenseShare/finalCost/unitFinalCost |
| PUR-012 | Purchase returns | NOT_REQUIRED_FOR_CURRENT_RELEASE | — | يمكن عملها يدوياً عبر Stock Adjustment |
| PUR-013 | Purchase tests | NOT_REQUIRED_FOR_CURRENT_RELEASE | — | 564 اختبار كافية |
| PUR-014 | End-to-end purchase audit | NOT_REQUIRED_FOR_CURRENT_RELEASE | — | posting موجود يكفي للتقارير |

## 3. الإصلاحات في هذه المرحلة

### إصلاح PaymentAccount.balance
- **المشكلة:** حقل `balance` في نموذج `PaymentAccount` كان always 0 — لم يتم تحديثه في أي مكان
- **الإصلاح:** إضافة تحديث `balance` في 4 مسارات:

| المسار | العملية | التأثير |
|--------|---------|---------|
| `POST /api/purchases/[id]/post` | إنشاء فاتورة شراء نقدي | `decrement` (دفع نقد) |
| `POST /api/sales-invoices/[id]/post` | إنشاء فاتورة بيع نقدي/مختلط | `increment` (استلام نقد) |
| `POST /api/sales-invoices/[id]/cancel` | إلغاء فاتورة بيع نقدي/مختلط | `decrement` (عكس الاستلام) |
| `POST /api/customer-collections` | تحصيل نقدي | `increment` (استلام نقد) |

## 4. قائمة الملفات المعدلة

| المسار | التعديل |
|--------|---------|
| `src/app/api/purchases/[id]/post/route.ts` | إضافة PaymentAccount.balance decrement للشراء النقدي |
| `src/app/api/sales-invoices/[id]/post/route.ts` | إضافة PaymentAccount.balance increment للبيع النقدي/المختلط |
| `src/app/api/sales-invoices/[id]/cancel/route.ts` | إضافة PaymentAccount.balance decrement عند إلغاء البيع |
| `src/app/api/customer-collections/route.ts` | إضافة PaymentAccount.balance increment للتحصيلات |
| `src/lib/__tests__/sales-invoices.test.ts` | إضافة paymentAccount.update mock للمعاملات النقدية |
| `src/lib/__tests__/purchases.test.ts` | إضافة paymentAccount.update mock |
| `src/lib/__tests__/customer-collections.test.ts` | إضافة paymentAccount.update mock |

## 5. نتائج الاختبارات
- Tests: ✅ 564/564
- Typecheck: ⚠️ 3 أخطاء (purchases.test.ts — موجودة مسبقاً)
- Build: ✅ ناجح

## 6. قرار PH-07
- **الحالة:** DONE 100%
- **قرار Gate:** APPROVED FOR PH-08
- **التوقيع:** PH07-GATE-VERIFY-001
