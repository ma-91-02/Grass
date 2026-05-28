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

### 7. عزل العملة (CurrencyGuard)

- [x] **ACC-005: CurrencyGuard.validateJournalCurrency** — التحقق من تطابق عملة الحسابات مع عملة القيد
- [x] **دمج في ترحيل المشتريات** — التحقق من عملة حسابات (inventory, AP, cash) قبل الترحيل
- [x] **دمج في ترحيل المبيعات** — التحقق من عملة حسابات (cash, AR, revenue, COGS, inventory) قبل الترحيل
- [x] **إزالة الكود الميت** — دمج `isIsolatedCurrencyPair` داخل `validateJournalCurrency` (تعارض عملات بين الحسابات)
- [x] **اختبارات CurrencyGuard** — ٥ اختبارات (عملة موحدة، عملة مختلفة، حساب غير موجود، دولار، قائمة فارغة)

### 8. منع العكس المزدوج (ACC-004)

- [x] **التحقق من `reversalEntryId`** — منع عكس قيد معكوس مسبقاً قبل التحقق من الحالة
- [x] **اختبار العكس المزدوج** — التحقق من رسالة "القيد معكوس مسبقاً" ومنع `$transaction`

## العناصر المصنفة (غير مطلوبة للإصدار الحالي)

| المهمة | التصنيف | السبب |
|--------|---------|-------|
| ACC-008 (سندات تصريف/سماح) | NOT_REQUIRED_FOR_CURRENT_RELEASE | يتطلب multi-currency معقدة، غير ضروري للإصدار التجريبي |
| ACC-009 (أرصدة افتتاحية) | NOT_REQUIRED_FOR_CURRENT_RELEASE | يتطلب معالج إعداد محاسبي، يمكن إضافته لاحقاً |
| ACC-010 (إقفال مالي) | NOT_REQUIRED_FOR_CURRENT_RELEASE | Enterprise feature، محظور بنضج FiscalPeriod وإدارة الفترات |

## ملاحظات إضافية
- `SupplierPayment.journalEntry` هو `POSTED` فوراً (لا يوجد DRAFT للسندات التلقائية)
- `JournalEntry.reversalEntryId` هو `@unique` (قيد أصلي واحد → قيد عكس واحد)
- كشف الحساب يستخدم رصيد جاري من دفتر الأستاذ، وليس حقل `Account.balance`
- تم إصلاح خطأ missing import (`errorResponse`) في account-statement route
- **ACC-004**: إعادة ترتيب التحقق من `reversalEntryId` قبل `status` لمنع العكس المزدوج حتى للقيد الذي حالته POSTED
- **ACC-005**: دمج `isIsolatedCurrencyPair` في `validateJournalCurrency` وإضافته إلى ترحيل المبيعات
- جميع التغييرات تجتاز typecheck و 564 اختباراً بنجاح

## قرار البوابة

- [x] معتمد
- [ ] مرفوض

التاريخ: 2026-05-28
الموافق: 28 مايو 2026
