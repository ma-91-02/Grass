# التحقق من بوابة المرحلة PH-04: المحاسبة ودفتر الأستاذ

## أهداف المرحلة
- سندات الدفع (Payment Vouchers) — API + UI + صلاحيات
- تعزيز عكس القيود (reversalEntryId, reversedAt)
- تصحيح ربط PaymentAccount بـ Account
- كشف حساب مع رصيد جاري (Account Statement API)
- صلاحيات PAYMENTS_VIEW / PAYMENTS_CREATE
- عزل العملة (CurrencyGuard)
- ثبات السجلات المرحلة (Immutable posted records)

## قائمة التحقق

### 1. وحدات API (Backend)

- [x] **GET /api/payments** — قائمة سندات الدفع مع التصفية حسب الشركة
- [x] **POST /api/payments** — إنشاء سند دفع مع ترحيل قيد محاسبي (Dr AP, Cr Cash) داخل transaction
- [x] **GET /api/account-statement** — كشف حساب مع رصيد جاري، ترقيم، فلترة فترة
- [x] **POST /api/journal-entries/[id]/reverse** — عكس القيد مع تعيين reversalEntryId و reversedAt

### 2. واجهات المستخدم (UI)

- [x] **صفحة سندات الدفع** — `/dashboard/payments` مع DataTable، بحث، حالات التحميل والخطأ
- [x] **صفحة إنشاء سند دفع** — `/dashboard/payments/new` مع نموذج شامل (مورد، فاتورة، حساب دفع، مبلغ، عملة، تاريخ)
- [x] **رابط سندات الدفع** — في الشريط الجانبي (`Wallet`) بعد "التحصيلات"

### 3. الأمان والصلاحيات

- [x] **PAYMENTS_VIEW** — صلاحية عرض سندات الدفع
- [x] **PAYMENTS_CREATE** — صلاحية إنشاء سند دفع
- [x] **requireDbPermission** — جميع وحدات API تستخدم التحقق الحديث من الصلاحيات
- [x] **عزل الشركة (companyId)** — جميع وحدات API تتحقق من صلاحية الوصول للشركة
- [x] **سجل التدقيق (Audit Log)** — إنشاء سند دفع يسجل في سجل التدقيق داخل نفس transaction

### 4. نموذج Prisma والتغيرات في المخطط

- [x] **SupplierPayment** — نموذج جديد لسندات الدفع (companyId, supplierId, purchaseInvoiceId, paymentAccountId, amount, currency, paymentDate, status, journalEntryId)
- [x] **JournalEntry.reversalEntryId** — @unique لربط القيد الأصلي بقيد العكس
- [x] **JournalEntry.reversedAt** — تاريخ ووقت العكس
- [x] **JournalEntry.reversedEntries** — علاقة عكسية للقيود الملغاة
- [x] **PaymentAccount.accountId** — ربط حساب الدفع بدليل الحسابات
- [x] **CustomerCollection.journalEntry** — علاقة مباشرة مع القيد المحاسبي
- [x] **Company.supplierPayments** — علاقة عكسية مع سندات الدفع
- [x] **Account.paymentAccounts** — علاقة عكسية مع حسابات الدفع
- [x] **User.supplierPayments** — علاقة عكسية مع سندات الدفع
- [x] **PurchaseInvoice.supplierPayments** — علاقة عكسية مع سندات الدفع
- [x] **Supplier.supplierPayments** — علاقة عكسية مع سندات الدفع

### 5. الثوابت والمكتبات

- [x] **ACCOUNT_CODES** — ثوابت موحدة لأكواد الحسابات النظامية (CASH_IQD, CASH_USD, AR_IQD, AR_USD, AP_IQD, AP_USD, INVENTORY, SALES_REVENUE, COGS)

### 6. دورة المحاسبة (Accounting Flow)

- [x] **LedgerValidator** — التحقق من صحة القيد قبل الترحيل (توازن، عملة موحدة، مبالغ موجبة)
- [x] **PeriodGuard** — التحقق من الفترة المالية (مفتوحة، غير مؤرشفة)
- [x] **قيد سند الدفع** — Dr حساب المورد (AP) | Cr حساب النقدية (Cash) — داخل transaction
- [x] **تحديد رصيد فاتورة الشراء** — تحديث `paid` و `remaining` في فاتورة الشراء بعد الدفع
- [x] **كشف حساب مع رصيد جاري** — حساب الرصيد التراكمي بناءً على دفتر الأستاذ (غير مخزّن)

## العناصر المتبقية (مؤجلة/محظورة)

- [ ] **ACC-008: سندات تصريف وسماح** — لم تُبنَ بعد — تتطلب multi-currency معقدة
- [ ] **ACC-009: الأرصدة الافتتاحية** — مؤجلة — تتطلب معالج إعداد محاسبي أو آلية استيراد
- [ ] **ACC-010: الإقفال المالي** — مستقبلية — محظورة بنضج FiscalPeriod

## ملاحظات إضافية
- `SupplierPayment.journalEntry` هو `POSTED` فوراً (لا يوجد DRAFT للسندات التلقائية)
- `JournalEntry.reversalEntryId` هو `@unique` (قيد أصلي واحد → قيد عكس واحد)
- كشف الحساب يستخدم رصيد جاري من دفتر الأستاذ، وليس حقل `Account.balance`
- تم إصلاح خطأ missing import (`errorResponse`) في account-statement route
- جميع التغييرات تجتاز typecheck بنجاح

## قرار البوابة

- [ ] معتمد
- [ ] مرفوض

التاريخ: _______________
الموافق: _______________
