# GRASS ERP - MASTER PROJECT MAP

> نظام ERP عربي RTL لشركات التوزيع، الوكلاء، الجملة، المخازن متعددة الفروع، والحسابات متعددة العملات في العراق والشرق الأوسط.

## 0. مبادئ غير قابلة للتفاوض

### 0.1 هوية النظام

- الاسم: GRASS ERP.
- النوع: ERP Distribution System.
- اللغة: العربية فقط في المرحلة الحالية.
- اتجاه الواجهة: RTL فقط.
- السوق المستهدف: العراق أولاً، ثم الشرق الأوسط.
- العملات: IQD و USD فقط في المرحلة الأولى.
- التقنية: Next.js App Router، PostgreSQL، Prisma، Zod، Tailwind، shadcn/ui.
- التصميم المعماري: Clean Architecture، SOLID، DRY، KISS، Type Safety، Separation of Concerns.

### 0.2 قواعد محاسبية عليا

- كل أثر مالي يجب أن يولد قيداً يومياً متوازناً.
- مجموع المدين يجب أن يساوي مجموع الدائن داخل نفس العملة.
- ممنوع خلط العملات داخل قيد واحد إلا عبر آلية تحويل عملة واضحة بسعر صرف snapshot وقيدين منفصلين أو حساب فروقات عملة.
- السجلات المالية المرحلة immutable: لا تعديل مباشر بعد الترحيل، بل إلغاء عكسي أو قيد تصحيح.
- سعر الصرف يؤخذ snapshot داخل الفاتورة أو السند ولا يتغير بأثر رجعي.
- كشف الحساب والحسابات الختامية تعتمد على دفتر الأستاذ Journal Lines وليس على balances مخزنة فقط.
- balances المخزنة إن وجدت تعد cache/reconciliation values وليست مصدر الحقيقة الوحيد.
- كل عملية مالية داخل database transaction واحدة.
- كل عملية مالية تسجل Audit Log قبل/بعد وتربط بالمستند والقيود الناتجة.

### 0.3 قواعد مخزون عليا

- كل أثر مخزني يجب أن يولد Stock Movement.
- المخزون يحسب من حركات المخزون، لا من رقم قابل للتعديل فقط.
- النقل بين المخازن يولد حركة خروج من مخزن وحركة دخول إلى مخزن مرتبطتين بنفس المستند.
- الجرد والتلف والتسوية لا تحذف الحركة الأصلية بل تنشئ حركة تصحيح.
- السالب إما ممنوع عالمياً أو مسموح بصلاحية خاصة على مستوى المخزن/المستخدم/المادة مع Audit إلزامي.
- تكلفة المخزون يجب أن تحدد بسياسة واضحة: Weighted Average مبدئياً، مع قابلية FIFO مستقبلاً.
- كل فاتورة شراء تحدث طبقات أو متوسط تكلفة قبل بيع المخزون.

### 0.4 قاعدة العملات

- كل حساب له currency إلزامية.
- صندوق IQD وصندوق USD حسابان مستقلان.
- بنك IQD وبنك USD حسابان مستقلان.
- ذمم العملاء والموردين تنقسم حسب العملة.
- لا يسمح بفاتورة أو سند يحتوي أسطر مالية بعملات مختلفة.
- التحويل بين USD و IQD يتم بسند تصريف مخصص:
  - دائن: صندوق/بنك العملة الخارجة.
  - مدين: صندوق/بنك العملة الداخلة.
  - إثبات فرق العملة على حساب ربح/خسارة فروقات عملة عند الحاجة.
- كل مستند يحتوي `currency`, `exchangeRateSnapshot`, `exchangeRateSourceId?`, `baseAmountIQD?`, `foreignAmount?`.

## 1. System Architecture

### 1.1 الهدف

بناء نظام ERP إنتاجي، آمن، قابل للتوسع، يحفظ سلامة المحاسبة والمخزون، ويدعم عمل المحاسبين وموظفي المخازن والمبيعات بسرعة ودقة.

### 1.2 الطبقات

- Presentation Layer:
  - Next.js App Router pages.
  - Server Components للعرض الثقيل.
  - Client Components للنماذج، الجداول، الاختصارات، dialogs، drawers.
  - shadcn/ui كأساس مكونات.
- Application Layer:
  - Use Cases لكل عملية: CreateSalesInvoice, PostVoucher, TransferStock, CloseInventoryPeriod.
  - Orchestrates validation, permission checks, transactions, audit.
- Domain Layer:
  - Accounting domain: Account, Journal, Voucher, Ledger, CurrencyPolicy.
  - Inventory domain: Product, Warehouse, StockMovement, Valuation.
  - Sales/Purchases domain: Invoice, Return, Payment, Pricing.
  - Access domain: User, Role, Permission, Session.
- Infrastructure Layer:
  - Prisma repositories.
  - PostgreSQL transactions.
  - Audit writer.
  - PDF/export services.
  - Caching/report materialization.

### 1.3 قواعد الفصل

- Route handlers لا تحتوي business logic معقد.
- كل route يستدعي use case.
- كل use case يفتح transaction عند وجود أكثر من write.
- Zod schemas في حدود API و forms.
- Prisma types لا تتسرب مباشرة إلى كل الواجهة عند الحاجة إلى DTO واضح.
- القيود المالية لا تنفذ في UI فقط، بل في backend أولاً.

### 1.4 هيكل ملفات مقترح

```text
src/
  app/
    dashboard/
    api/
  modules/
    accounting/
      domain/
      application/
      infrastructure/
      presentation/
    inventory/
    sales/
    purchases/
    partners/
    users/
    reports/
    settings/
  shared/
    auth/
    permissions/
    audit/
    database/
    validation/
    ui/
```

### 1.5 Transaction Boundary

كل عملية من الآتي يجب أن تكون transaction واحدة:

- ترحيل فاتورة بيع.
- ترحيل فاتورة شراء.
- إنشاء سند قبض/دفع/قيد/تصريف/سماح.
- إلغاء مستند مالي.
- تسوية مخزون.
- نقل بين مخازن.
- إدخال أرصدة افتتاحية.
- تغيير صلاحيات مستخدم.

### 1.6 Error Model

- `400 VALIDATION_ERROR`: خطأ Zod أو business validation.
- `401 UNAUTHENTICATED`: لا توجد جلسة.
- `403 FORBIDDEN`: لا يملك الصلاحية.
- `404 NOT_FOUND`: الكيان غير موجود أو خارج scope.
- `409 CONFLICT`: رقم مستند مكرر، فترة مغلقة، مخزون غير كاف.
- `422 ACCOUNTING_INTEGRITY_ERROR`: قيد غير متوازن أو عملات مختلطة.
- `423 PERIOD_LOCKED`: الفترة المالية أو المخزنية مغلقة.
- `500 INTERNAL_ERROR`: خطأ غير متوقع.

## 2. Module Architecture

### 2.1 Modules الأساسية

| Module | الهدف | مصدر الحقيقة |
|---|---|---|
| Dashboard | عرض مؤشرات تنفيذية وتشغيلية | Views وتقارير مجمعة |
| الحسابات | دفتر الأستاذ، السندات، الذمم، الصندوق، البنوك | Journal Entries/Lines |
| المبيعات | فواتير بيع، مرتجعات، تحصيل، ديون | Sales Documents + Journals + Stock |
| المشتريات | فواتير شراء، مصاريف تحميل، ديون موردين | Purchase Documents + Journals + Stock |
| المواد والمخزون | مواد، أسعار، أرصدة، حركات، جرد | Stock Movements |
| المخازن | إدارة مخازن، تحويلات، صلاحيات مخزن | Warehouses + Movements |
| العملاء | بيانات العملاء، حدود الدين، تصنيفات، ذمم | Customers + AR accounts |
| الموردون | بيانات الموردين، ذمم، مشتريات | Suppliers + AP accounts |
| الموظفون | ملفات موظفين، حضور، رواتب مستقبلية | Employees + Attendance |
| المستخدمون والصلاحيات | Auth/RBAC/Direct permissions | Users/Roles/Permissions |
| التقارير | تقارير مالية وتشغيلية | SQL views/materialized views |
| الإعدادات | سياسات النظام، ترقيم، فترات، حسابات ربط | Settings |

### 2.2 Cross-Cutting Modules

- Audit: يسجل كل create/update/delete/post/cancel/login.
- Numbering: أرقام مستندات متسلسلة حسب النوع والسنة/الفرع.
- Approval: موافقات اختيارية حسب المبلغ أو الصلاحية.
- Period Locking: إغلاق مالي ومخزني شهري.
- Attachments: مرفقات فواتير، وصولات، صور تلف.
- Notifications: تنبيهات مخزون منخفض، ديون متأخرة، فترات غير مغلقة.

## 3. Database Architecture

### 3.1 مبادئ عامة

- كل جدول تشغيلي يحتوي:
  - `id`, `createdAt`, `updatedAt`, `createdById`, `updatedById?`, `deletedAt?`, `deletedById?`.
- الجداول المالية المرحلة لا تستخدم hard delete.
- استخدام Decimal للأموال والكميات التكلفية.
- استخدام Int للكميات القطعية فقط إذا كانت المادة لا تدعم كسور؛ الأفضل `Decimal quantity`.
- كل رقم مستند unique ضمن `documentType + fiscalYear + branch/warehouse`.
- كل FK مالي يستخدم restrict عند وجود حركات.
- كل query list يجب أن تدعم pagination و filters.

### 3.2 Core Tables

#### companies

- الهدف: دعم شركة واحدة حالياً مع قابلية multi-company.
- الأعمدة:
  - `id`, `name`, `legalName`, `taxNumber?`, `defaultCurrency=IQD`, `country=IQ`, `isActive`.
- العلاقات:
  - ترتبط بكل الكيانات عبر `companyId`.
- indexes:
  - `idx_companies_active`.
- constraints:
  - شركة افتراضية واحدة نشطة في المرحلة الأولى.

#### fiscal_years

- الهدف: تعريف السنة المالية.
- الأعمدة:
  - `id`, `companyId`, `name`, `startDate`, `endDate`, `status: OPEN|CLOSED|LOCKED`.
- العلاقات:
  - periods, documents, journals.
- constraints:
  - عدم تداخل تواريخ السنوات لنفس الشركة.

#### fiscal_periods

- الهدف: إغلاق شهري مالي/مخزني.
- الأعمدة:
  - `id`, `fiscalYearId`, `month`, `startDate`, `endDate`, `financialStatus`, `inventoryStatus`.
- rules:
  - ممنوع ترحيل مستند بتاريخ داخل period مغلقة.
  - يسمح فقط بقيد افتتاح/تصحيح بصلاحية `periods.override`.

#### system_settings

- الهدف: سياسات عامة.
- الأعمدة:
  - `id`, `key`, `valueJson`, `scope`, `updatedById`.
- أمثلة:
  - `inventory.allowNegativeStock`.
  - `accounting.defaultExchangeRatePolicy`.
  - `sales.requireCustomerForCreditInvoice`.
  - `numbering.salesInvoicePattern`.

### 3.3 Accounting Tables

#### accounts

- الهدف: دليل الحسابات وشجرة الحسابات.
- الأعمدة:
  - `id`.
  - `companyId`.
  - `parentId?`.
  - `code`: مثل 1, 11, 111, 11101.
  - `name`.
  - `type`: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE.
  - `subtype`: CASH, BANK, AR, AP, INVENTORY, COGS, SALES, PURCHASES, TAX, FX_GAIN_LOSS, DISCOUNT.
  - `normalBalance`: DEBIT أو CREDIT.
  - `currency`: IQD أو USD.
  - `level`.
  - `isPosting`: يسمح بالقيود عليه.
  - `isSystem`: حساب نظامي محمي.
  - `isProtected`: لا يمكن حذف/تغيير نوعه.
  - `isActive`.
  - `allowManualJournal`.
  - `partnerType?`: CUSTOMER, SUPPLIER, EMPLOYEE, NONE.
  - `partnerId?`.
  - audit fields.
- العلاقات:
  - self relation parent/children.
  - journal_lines.
  - customer_accounts/supplier_accounts/payment_accounts عند الربط.
- indexes:
  - unique `companyId, code`.
  - `companyId, parentId`.
  - `companyId, type, currency`.
  - `companyId, isPosting, isActive`.
- constraints:
  - حساب parent لا يكون posting إذا لديه أبناء.
  - لا يسمح بتغيير currency إذا عليه journal_lines.
  - لا يسمح بحذف حساب عليه أي حركة.
  - الحساب النظامي لا يغير type/subtype/normalBalance.

#### journal_entries

- الهدف: رأس القيد المحاسبي.
- الأعمدة:
  - `id`, `companyId`, `fiscalYearId`, `periodId`.
  - `entryNumber`.
  - `entryDate`.
  - `sourceType`: SALES_INVOICE, SALES_RETURN, PURCHASE_INVOICE, PURCHASE_RETURN, RECEIPT_VOUCHER, PAYMENT_VOUCHER, EXCHANGE_VOUCHER, ALLOWANCE_VOUCHER, MANUAL_ENTRY, OPENING_BALANCE, STOCK_ADJUSTMENT.
  - `sourceId`.
  - `currency`.
  - `exchangeRateSnapshot`.
  - `description`.
  - `status`: DRAFT, POSTED, CANCELLED, REVERSAL.
  - `postedAt`, `postedById`.
  - `cancelledAt?`, `cancelledById?`, `reversalEntryId?`.
  - audit fields.
- indexes:
  - unique `companyId, entryNumber`.
  - `companyId, entryDate`.
  - `sourceType, sourceId`.
  - `companyId, status, currency`.
- constraints:
  - POSTED immutable.
  - `sum(lines.debit) = sum(lines.credit)`.
  - كل lines بنفس currency رأس القيد.

#### journal_lines

- الهدف: أسطر القيد ومصدر دفتر الأستاذ.
- الأعمدة:
  - `id`, `journalEntryId`, `lineNo`.
  - `accountId`.
  - `partnerType?`, `partnerId?`.
  - `debit`, `credit`.
  - `currency`.
  - `exchangeRateSnapshot`.
  - `amountInBaseCurrency`.
  - `description`.
  - `costCenterId?`, `warehouseId?`, `productId?`.
- indexes:
  - `accountId, currency, journalEntryId`.
  - `accountId, createdAt`.
  - `partnerType, partnerId, currency`.
  - `warehouseId`, `productId`.
- constraints:
  - أحد debit/credit فقط أكبر من صفر.
  - debit و credit لا يكونان كلاهما صفر.
  - line currency = account currency.

#### vouchers

- الهدف: سندات القبض والدفع والتصريف والسماح والقيد.
- الأعمدة:
  - `id`, `companyId`, `number`, `type`.
  - `date`, `currency`, `exchangeRateSnapshot`.
  - `status`: DRAFT, PENDING_APPROVAL, POSTED, CANCELLED.
  - `counterpartyType?`: CUSTOMER, SUPPLIER, ACCOUNT, EMPLOYEE.
  - `counterpartyId?`.
  - `paymentAccountId?`.
  - `amount`.
  - `description`, `notes`.
  - `journalEntryId?`.
  - audit fields.
- indexes:
  - unique `companyId, type, number`.
  - `companyId, date, type`.
  - `journalEntryId`.

#### voucher_lines

- الهدف: تفاصيل السندات متعددة الأسطر.
- الأعمدة:
  - `id`, `voucherId`, `lineNo`, `accountId`, `debit`, `credit`, `description`.
- constraints:
  - نفس قواعد journal_lines قبل الترحيل.

#### account_opening_balances

- الهدف: أرصدة افتتاحية للحسابات.
- الأعمدة:
  - `id`, `companyId`, `fiscalYearId`, `accountId`, `currency`, `debit`, `credit`, `date`, `status`, `journalEntryId?`.
- constraints:
  - unique `fiscalYearId, accountId`.
  - عند الترحيل يولد قيد افتتاح متوازن.
  - لا يسمح بإدخال رصيد افتتاحي لحساب parent.

#### exchange_rates

- الهدف: أسعار صرف USD/IQD.
- الأعمدة:
  - `id`, `companyId`, `date`, `usdToIqd`, `source`, `note`, `createdById`, `createdAt`.
- indexes:
  - unique `companyId, date`.
  - `companyId, createdAt desc`.
- rules:
  - لا حذف لسعر مستخدم في مستند.
  - يسمح بإدخال سعر جديد فقط.

#### payment_accounts

- الهدف: صناديق وبنوك.
- الأعمدة:
  - `id`, `companyId`, `accountId`, `name`, `type: CASH|BANK`, `currency`, `bankName?`, `iban?`, `isActive`.
- constraints:
  - `account.currency = payment_accounts.currency`.
  - لا يسمح بتغيير accountId بعد وجود حركة.

### 3.4 Partners Tables

#### customers

- الهدف: العملاء.
- الأعمدة:
  - `id`, `companyId`, `code`, `name`, `phone`, `whatsapp`, `address`, `governorate`, `area?`, `customerType`, `categoryId?`, `salesAgentId?`, `creditLimitIQD?`, `creditLimitUSD?`, `paymentTermDays?`, `isActive`, `notes`.
- indexes:
  - unique `companyId, code`.
  - `companyId, name`.
  - `companyId, governorate`.
  - `companyId, customerType`.
- rules:
  - العميل المعطل لا يسمح بفاتورة جديدة، لكن يظهر في التقارير القديمة.

#### customer_accounts

- الهدف: ربط ذمة العميل بحساب محاسبي لكل عملة.
- الأعمدة:
  - `id`, `customerId`, `currency`, `accountId`, `creditLimit`, `isDefault`.
- constraints:
  - unique `customerId, currency`.
  - `account.subtype = AR`.

#### suppliers

- الهدف: الموردون.
- الأعمدة:
  - `id`, `companyId`, `code`, `name`, `phone`, `address`, `governorate`, `paymentTermDays?`, `isActive`, `notes`.
- indexes:
  - unique `companyId, code`.

#### supplier_accounts

- الهدف: ربط ذمة المورد بحساب محاسبي لكل عملة.
- الأعمدة:
  - `id`, `supplierId`, `currency`, `accountId`, `creditLimit?`.
- constraints:
  - unique `supplierId, currency`.
  - `account.subtype = AP`.

### 3.5 Inventory Tables

#### product_categories

- الهدف: تصنيف المواد.
- الأعمدة:
  - `id`, `companyId`, `name`, `parentId?`, `isActive`.

#### products

- الهدف: بطاقة المادة.
- الأعمدة:
  - `id`, `companyId`, `code`, `barcode?`, `name`, `categoryId?`.
  - `baseUnitId`, `packageUnitId?`, `piecesPerCarton`.
  - `trackExpiry`, `trackBatch`.
  - `purchaseAccountId?`, `inventoryAccountId`, `salesAccountId`, `cogsAccountId`, `salesReturnAccountId?`.
  - `defaultPurchaseCurrency`.
  - `lastPurchaseCost`, `averageCostIQD`, `averageCostUSD?`.
  - `minStock`, `maxStock`, `isActive`.
- indexes:
  - unique `companyId, code`.
  - unique nullable `companyId, barcode`.
  - `companyId, name`.

#### product_prices

- الهدف: أسعار حسب نوع العميل والعملة.
- الأعمدة:
  - `id`, `productId`, `customerType`, `currency`, `price`, `effectiveFrom`, `effectiveTo?`, `isActive`.
- constraints:
  - لا يوجد أكثر من سعر نشط لنفس product/customerType/currency في نفس الفترة.

#### warehouses

- الهدف: المخازن.
- الأعمدة:
  - `id`, `companyId`, `code`, `name`, `address`, `managerEmployeeId?`, `isActive`, `allowNegativeStock?`.
- indexes:
  - unique `companyId, code`.

#### stock_movements

- الهدف: دفتر حركة المخزون.
- الأعمدة:
  - `id`, `companyId`, `productId`, `warehouseId`.
  - `movementDate`.
  - `type`: IN, OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE, RETURN_IN, RETURN_OUT, OPENING.
  - `quantity`.
  - `unitCost`.
  - `totalCost`.
  - `currency`.
  - `exchangeRateSnapshot`.
  - `sourceType`, `sourceId`, `sourceLineId?`.
  - `batchNo?`, `productionDate?`, `expiryDate?`.
  - `runningQuantity?`, `runningAverageCost?`.
  - `notes`, audit fields.
- indexes:
  - `productId, warehouseId, movementDate`.
  - `sourceType, sourceId`.
  - `warehouseId, movementDate`.
  - `productId, expiryDate`.
- constraints:
  - quantity > 0.
  - movement type يحدد اتجاه الحركة.
  - لا تعديل بعد period lock.

#### stock_balances

- الهدف: cache سريع لأرصدة المخزون.
- الأعمدة:
  - `id`, `productId`, `warehouseId`, `quantity`, `averageCost`, `updatedAt`.
- constraints:
  - unique `productId, warehouseId`.
- rules:
  - يحدث داخل نفس transaction مع stock_movements.
  - يعاد بناؤه من الحركات عند reconciliation.

#### stock_transfers

- الهدف: نقل مواد بين مخازن.
- الأعمدة:
  - `id`, `companyId`, `number`, `fromWarehouseId`, `toWarehouseId`, `date`, `status`, `notes`.
- lines:
  - `productId`, `quantity`, `unitCost`.
- workflow:
  - DRAFT -> POSTED أو DRAFT -> CANCELLED.
  - عند POSTED: OUT من المصدر و IN للهدف.

#### inventory_counts

- الهدف: الجرد.
- الأعمدة:
  - `id`, `companyId`, `number`, `warehouseId`, `date`, `status: DRAFT|COUNTING|REVIEW|POSTED|CANCELLED`.
- lines:
  - `productId`, `systemQty`, `countedQty`, `difference`, `unitCost`, `adjustmentMovementId?`.
- rules:
  - عند POSTED تنشأ حركات تسوية للفرق فقط.

### 3.6 Sales Tables

#### sales_invoices

- الهدف: فاتورة بيع.
- الأعمدة:
  - `id`, `companyId`, `number`, `date`, `customerId?`, `warehouseId`, `currency`, `exchangeRateSnapshot`.
  - `customerTypeSnapshot`.
  - `paymentType`: CASH, CREDIT, MIXED.
  - `paymentAccountId?`.
  - `subtotal`, `discountAmount`, `discountPercent`, `taxAmount`, `total`, `paid`, `remaining`.
  - `status`: DRAFT, POSTED, PARTIALLY_PAID, PAID, CANCELLED, RETURNED_PARTIAL, RETURNED_FULL.
  - `journalEntryId?`.
  - audit fields.
- constraints:
  - credit invoice requires customer.
  - cash invoice requires paymentAccount.
  - paymentAccount.currency = invoice.currency.
  - no posting with empty lines.

#### sales_invoice_lines

- الأعمدة:
  - `id`, `salesInvoiceId`, `lineNo`, `productId`, `productNameSnapshot`, `productCodeSnapshot`, `warehouseId`.
  - `quantity`, `unitPrice`, `discountPercent`, `discountAmount`, `lineTotal`.
  - `averageCostSnapshot`, `cogsAmount`.
  - `stockMovementId?`.
- constraints:
  - quantity > 0.
  - unitPrice >= 0.
  - product active at creation.

#### sales_returns

- الهدف: مرتجع بيع.
- rules:
  - يرتبط بفواتير أصلية أو مرتجع حر بصلاحية خاصة.
  - لا يسمح بإرجاع كمية أكبر من المباعة ناقص المرتجع السابق.
  - يولد دخول مخزون وقيد عكسي للإيراد و COGS.

#### sales_payments

- الهدف: تحصيلات مرتبطة بالفواتير.
- يفضل استخدام vouchers كطبقة مالية موحدة مع reference للفاتورة.

### 3.7 Purchases Tables

#### purchase_invoices

- الهدف: فاتورة شراء.
- الأعمدة:
  - `id`, `companyId`, `number`, `supplierInvoiceNumber?`, `date`, `supplierId?`, `warehouseId`, `currency`, `exchangeRateSnapshot`.
  - `subtotal`, `totalExpenses`, `totalCost`, `paid`, `remaining`.
  - `paymentType`, `paymentAccountId?`.
  - `status`, `journalEntryId?`.
- rules:
  - شراء آجل يتطلب مورد.
  - الشراء النقدي يتطلب paymentAccount.
  - مصاريف الشراء توزع على المواد حسب القيمة أو الكمية حسب policy.

#### purchase_invoice_lines

- الأعمدة:
  - `productId`, `quantity`, `purchasePrice`, `lineTotal`, `expenseShare`, `finalCost`, `unitFinalCost`, `expiryDate?`, `batchNo?`.

#### purchase_expenses

- الهدف: مصاريف تحميل/نقل/كمارك.
- الأعمدة:
  - `name`, `amount`, `currency`, `exchangeRateSnapshot`, `allocationMethod`.
- rules:
  - تحول إلى عملة الفاتورة بسعر snapshot.
  - تدخل ضمن تكلفة المخزون لا كمصروف مباشر إذا كانت مرتبطة بالشراء.

#### purchase_returns

- الهدف: مرتجع شراء.
- rules:
  - يخرج مخزون.
  - يخفض ذمة المورد أو يستلم نقداً.
  - يعكس جزءاً من تكلفة المخزون وفق سياسة valuation.

### 3.8 Users and Security Tables

#### users

- الأعمدة:
  - `id`, `name`, `email`, `passwordHash`, `phone`, `employeeId?`, `isActive`, `lastLoginAt?`, `failedLoginCount`, `lockedUntil?`, `passwordChangedAt`.
- rules:
  - المستخدم المعطل لا يدخل ولا تنفذ باسمه عمليات.

#### roles, permissions, role_permissions, user_permissions

- RBAC مع صلاحيات مباشرة.
- direct permissions تضيف ولا تلغي إلا إذا أضفنا explicit deny مستقبلاً.

#### sessions

- الهدف: جلسات آمنة.
- الأعمدة:
  - `id`, `userId`, `tokenHash`, `ipAddress`, `userAgent`, `expiresAt`, `revokedAt`.
- rules:
  - logout يلغي session.
  - تغيير كلمة المرور يلغي كل الجلسات السابقة.

### 3.9 Audit Tables

#### audit_logs

- الهدف: سجل تدقيق عام.
- الأعمدة:
  - `id`, `companyId`, `userId?`, `action`, `entity`, `entityId`, `beforeJson?`, `afterJson?`, `diffJson?`, `metadataJson?`, `ipAddress`, `userAgent`, `requestId`, `createdAt`.
- indexes:
  - `entity, entityId`.
  - `userId, createdAt desc`.
  - `action, createdAt desc`.
- rules:
  - لا تعديل ولا حذف من الواجهة.
  - retention policy مع أرشفة مستقبلية.

#### financial_event_logs

- الهدف: تدقيق مالي عالي الحساسية.
- يسجل:
  - posting.
  - cancellation.
  - reversal.
  - period lock override.
  - exchange voucher.
  - opening balances.

## 4. Accounting Architecture

### 4.1 دليل الحسابات

#### الهيكل القياسي

- 1 الأصول
  - 11 النقد وما في حكمه
    - 111 صندوق IQD
    - 112 صندوق USD
    - 113 بنك IQD
    - 114 بنك USD
  - 12 الذمم المدينة
    - 121 عملاء IQD
    - 122 عملاء USD
  - 13 المخزون
  - 14 عهد الموظفين
- 2 الخصوم
  - 21 الموردون IQD
  - 22 الموردون USD
  - 23 مصاريف مستحقة
- 3 حقوق الملكية
  - 31 رأس المال
  - 32 أرباح مرحلة
- 4 الإيرادات
  - 41 مبيعات IQD
  - 42 مبيعات USD
  - 43 خصومات مكتسبة
  - 44 فروقات عملة دائنة
- 5 المصروفات والتكاليف
  - 51 تكلفة البضاعة المباعة
  - 52 مصاريف تشغيل
  - 53 خصومات مسموحة
  - 54 تلف وفروقات جرد
  - 55 فروقات عملة مدينة

#### صفحة دليل الحسابات

- المسار: `/dashboard/accounts`.
- Layout:
  - Sidebar شجرة الحسابات.
  - Panel تفاصيل الحساب.
  - Tabs: معلومات، حركة مختصرة، إعدادات الربط، Audit.
- أزرار:
  - `إضافة حساب رئيسي`: يتطلب `accounts.create`.
  - `إضافة حساب فرعي`: يتطلب حساب parent محدد و `accounts.create`.
  - `تعديل`: ممنوع للحسابات المحمية إلا بعض الحقول.
  - `تعطيل`: يمنع استخدامه مستقبلاً ولا يخفيه من التقارير.
  - `حذف`: متاح فقط إذا لا أبناء ولا قيود ولا روابط.
  - `كشف الحساب`: يفتح account statement.
  - `تصدير الشجرة`: Excel/PDF.
- Form fields:
  - الاسم، الكود، النوع، العملة، الرصيد الطبيعي، الحساب الأب، يسمح بالترحيل، ملاحظات.
- Validations:
  - code مطلوب وفريد.
  - name مطلوب.
  - parent type يجب أن يساوي child type أو يسمح بسياسة محددة.
  - currency للفرع يجب أن تتسق مع parent إذا parent posting/عملة محددة.
  - حساب posting لا يمكن أن يكون parent.
  - لا تغيير normalBalance بعد وجود حركة.
- Empty state:
  - "لا توجد حسابات. ابدأ بإنشاء الشجرة القياسية."
- Loading:
  - skeleton للشجرة والبطاقة.
- Error:
  - عرض سبب المنع: حساب عليه قيود، حساب نظامي، فترة مغلقة.
- Success:
  - toast مع رقم الحساب.

#### APIs

- `GET /api/accounts`
  - filters: `q`, `type`, `currency`, `isActive`, `parentId`, `isPosting`.
  - permission: `accounts.view`.
- `POST /api/accounts`
  - body: بيانات الحساب.
  - transaction: create account + audit.
  - permission: `accounts.create`.
- `GET /api/accounts/:id`
  - يرجع التفاصيل، الأبناء، balances summary.
- `PATCH /api/accounts/:id`
  - يمنع تغيير الحقول المحمية عند وجود حركة.
- `DELETE /api/accounts/:id`
  - soft delete أو reject إن وجد journal lines.
- `POST /api/accounts/:id/disable`
  - تعطيل آمن.

### 4.2 القيود اليومية

#### صفحة القيود

- المسار: `/dashboard/accounting/journals`.
- أزرار:
  - `قيد جديد`.
  - `ترحيل`.
  - `إلغاء بقيد عكسي`.
  - `طباعة`.
  - `نسخ كمسودة`.
- جدول:
  - رقم القيد، التاريخ، المصدر، العملة، المدين، الدائن، الحالة، المنشئ، إجراءات.
- filters:
  - التاريخ، العملة، الحساب، المصدر، الحالة، رقم القيد.

#### قيد يدوي

- workflow:
  - إنشاء DRAFT.
  - إضافة أسطر.
  - التحقق من التوازن.
  - POSTED.
- validations:
  - لا ترحيل إذا المدين لا يساوي الدائن.
  - كل الحسابات posting و active.
  - كل الحسابات بنفس العملة.
  - لا قيد بتاريخ داخل period مغلقة.
  - description مطلوب للقيد اليدوي.
- states:
  - DRAFT: قابل للتعديل.
  - POSTED: immutable.
  - CANCELLED: ألغي بقيد عكسي.
  - REVERSAL: قيد عكسي.

#### APIs

- `GET /api/journals`
- `POST /api/journals`
- `PATCH /api/journals/:id`
- `POST /api/journals/:id/post`
- `POST /api/journals/:id/reverse`
- `GET /api/journals/:id/print`

### 4.3 كشف الحساب

#### الحساب

- running balance:
  - الرصيد الافتتاحي = مجموع قيود قبل `fromDate` حسب طبيعة الحساب.
  - لكل line:
    - إذا normalBalance=DEBIT: balance += debit - credit.
    - إذا normalBalance=CREDIT: balance += credit - debit.
- filters:
  - accountId، currency، fromDate، toDate، sourceType، q، partner، warehouse، product.
- pagination:
  - keyset pagination بـ `entryDate, journalLineId`.
- performance:
  - index `journal_lines(accountId, currency, createdAt)`.
  - materialized monthly account balances لتقارير طويلة.
- export:
  - PDF عربي RTL.
  - Excel.
- API:
  - `GET /api/account-statement?accountId=&from=&to=&currency=&cursor=`.
- validations:
  - accountId مطلوب.
  - currency يجب أن تطابق الحساب.
  - toDate >= fromDate.

### 4.4 أرصدة الحسابات والعملاء والموردين

- مصدر الحقيقة: journal_lines.
- account balances:
  - group by accountId/currency.
- customer balances:
  - journal_lines where partnerType=CUSTOMER أو accounts linked AR.
- supplier balances:
  - journal_lines where partnerType=SUPPLIER أو accounts linked AP.
- UI:
  - جدول أرصدة، drilldown لكشف الحساب، aging buckets.
- aging:
  - 0-30، 31-60، 61-90، 90+ يوم.
- permissions:
  - `accounts.balances.view`.
  - `customers.balances.view`.
  - `suppliers.balances.view`.

### 4.5 سند قبض

#### الهدف

إثبات استلام نقد/بنك من عميل أو حساب.

#### workflow

1. اختيار العميل/الحساب.
2. اختيار الصندوق/البنك.
3. اختيار العملة.
4. إدخال المبلغ.
5. ربط بفواتير اختيارياً.
6. حفظ مسودة أو ترحيل.
7. طباعة.

#### journal entry

- عند تحصيل من عميل:
  - Debit: Cash/Bank account.
  - Credit: Customer AR account.
- عند تحصيل من حساب عام:
  - Debit: Cash/Bank.
  - Credit: Selected account.

#### validations

- amount > 0.
- payment account active.
- payment account currency = voucher currency.
- customer account currency = voucher currency.
- لا ترحيل في period مغلقة.
- لا تحصيل أكبر من الدين عند policy تمنع الرصيد الدائن للعميل.

#### edge cases

- عميل يدفع أكثر من الدين:
  - يسمح كدفعة مقدمة إذا setting يسمح.
  - أو يرفض.
- الدفع بعملة مختلفة عن دين العميل:
  - لا يسمح مباشرة.
  - يجب سند تصريف ثم سند قبض بنفس العملة.

### 4.6 سند دفع

- use cases:
  - دفع لمورد.
  - مصروف عام.
  - عهدة موظف.
- journal:
  - Debit: Supplier AP أو Expense/Asset.
  - Credit: Cash/Bank.
- validations:
  - account selected يسمح بالترحيل.
  - العملة معزولة.
  - لا يدفع من صندوق غير كاف إذا policy يمنع السالب.

### 4.7 سند تصريف

#### الهدف

تحويل بين IQD و USD مع snapshot للسعر.

#### fields

- fromPaymentAccount.
- toPaymentAccount.
- fromCurrency.
- toCurrency.
- fromAmount.
- exchangeRateSnapshot.
- toAmount.
- fxDifferenceAccount.

#### journal architecture

الخيار الآمن:

- قيد خروج العملة الأولى:
  - Debit: Exchange Clearing Account currency A.
  - Credit: Cash/Bank currency A.
- قيد دخول العملة الثانية:
  - Debit: Cash/Bank currency B.
  - Credit: Exchange Clearing Account currency B.
- قيد فرق العملة في العملة الأساسية عند الحاجة ضمن حساب فروقات.

#### validations

- from currency != to currency.
- exchangeRateSnapshot > 0.
- الحسابان مختلفان.
- لا يسمح بخلط line currencies في نفس journal.
- كل قيد داخل transaction واحدة مرتبطة بنفس voucher.

### 4.8 سند سماح

#### الهدف

خصم مسموح للعميل أو خصم مكتسب من المورد دون حركة نقدية.

#### customer allowance

- Debit: Discount Allowed Expense.
- Credit: Customer AR.

#### supplier allowance

- Debit: Supplier AP.
- Credit: Discount Earned Income.

#### validations

- amount > 0.
- account currency = voucher currency.
- ربط السبب إلزامي.
- صلاحية خاصة `vouchers.allowance.create`.

### 4.9 سند قيد

- قيد يدوي مبسط عبر voucher type ENTRY.
- يدعم عدة أسطر.
- نفس قواعد journal integrity.
- يحتاج صلاحية عالية.
- يفضل approval إذا المبلغ فوق threshold.

### 4.10 الأرصدة الافتتاحية

- مالية:
  - تدخل لكل حساب posting.
  - يجب أن تتوازن حسب العملة.
  - تولد قيد Opening Balance.
- مخزنية:
  - تدخل product/warehouse/quantity/cost/currency.
  - تولد stock movement OPENING.
  - تولد قيد:
    - Debit Inventory.
    - Credit Opening Balance Equity.
- states:
  - DRAFT -> POSTED.
  - POSTED immutable.

## 5. Sales Architecture

### 5.1 صفحات المبيعات

- `/dashboard/sales`: قائمة الفواتير.
- `/dashboard/sales/new`: فاتورة جديدة.
- `/dashboard/sales/:id`: عرض/تعديل حسب الحالة.
- `/dashboard/sales/returns`: المرتجعات.
- `/dashboard/sales/collections`: التحصيلات.

### 5.2 جدول الفواتير

- columns:
  - رقم الفاتورة، التاريخ، العميل، المخزن، العملة، الإجمالي، المدفوع، المتبقي، الحالة، المستخدم، إجراءات.
- filters:
  - التاريخ، العميل، المخزن، العملة، الحالة، طريقة الدفع، رقم الفاتورة.
- actions:
  - عرض.
  - تعديل المسودة.
  - ترحيل.
  - طباعة.
  - تحصيل.
  - مرتجع.
  - إلغاء بقيد عكسي.

### 5.3 نموذج الفاتورة

- header:
  - العميل، نوع العميل، المخزن، التاريخ، العملة، سعر الصرف، طريقة الدفع، الصندوق/البنك.
- lines:
  - المادة، الكمية، السعر، الخصم، الإجمالي، الرصيد المتاح.
- footer:
  - subtotal، discount، tax، total، paid، remaining.
- dialogs:
  - اختيار عميل.
  - اختيار مادة مع بحث barcode/code/name.
  - تأكيد ترحيل.
  - تحذير مخزون غير كاف.
  - تحذير تجاوز حد الدين.

### 5.4 Workflow فاتورة البيع

1. إنشاء DRAFT.
2. اختيار عميل أو بيع نقدي.
3. اختيار مخزن.
4. إضافة مواد.
5. احتساب الأسعار حسب نوع العميل.
6. التحقق من المخزون.
7. إدخال خصم/دفع.
8. ترحيل.
9. إنشاء journal + stock movements + balances.
10. طباعة.

### 5.5 أثر الفاتورة

#### نقدية

- Debit: Cash/Bank.
- Credit: Sales Revenue.
- Debit: COGS.
- Credit: Inventory.
- Stock: OUT من المخزن.

#### آجلة

- Debit: Customer AR.
- Credit: Sales Revenue.
- Debit: COGS.
- Credit: Inventory.
- Stock: OUT.

#### مختلطة

- Debit: Cash/Bank بقيمة paid.
- Debit: Customer AR بقيمة remaining.
- Credit: Sales Revenue بقيمة total.
- COGS/Inventory كما أعلاه.

### 5.6 validations

- invoice lines غير فارغة.
- customer required عند CREDIT/MIXED remaining > 0.
- paymentAccount required عند paid > 0.
- currency تطابق paymentAccount و customer account.
- exchangeRate required إذا currency=USD وتحتاج base reporting IQD.
- stock available لكل line إلا إذا permission `inventory.negative.override`.
- customer credit limit لا يتجاوز إلا بصلاحية.
- discountPercent بين 0 و100.
- paid <= total إلا إذا allow overpayment.

### 5.7 returns

- العودة الجزئية:
  - تحدد الفاتورة الأصلية.
  - تحدد الكميات.
  - تدخل المخزون.
  - تعكس الإيراد وتكلفة البضاعة.
- journal:
  - Debit: Sales Returns/Revenue Contra.
  - Credit: Cash/AR.
  - Debit: Inventory.
  - Credit: COGS.

## 6. Purchases Architecture

### 6.1 صفحات المشتريات

- `/dashboard/purchases`.
- `/dashboard/purchases/new`.
- `/dashboard/purchases/:id`.
- `/dashboard/purchases/returns`.
- `/dashboard/purchases/expenses`.

### 6.2 Workflow الشراء

1. اختيار المورد.
2. اختيار المخزن.
3. اختيار العملة وسعر الصرف.
4. إدخال المواد والكميات والسعر.
5. إدخال مصاريف الشراء.
6. توزيع المصاريف على الأسطر.
7. احتساب التكلفة النهائية.
8. ترحيل.
9. إنشاء حركات دخول مخزون.
10. إنشاء قيود محاسبية.

### 6.3 journal

#### شراء نقدي

- Debit: Inventory بقيمة totalCost.
- Credit: Cash/Bank بقيمة paid.

#### شراء آجل

- Debit: Inventory.
- Credit: Supplier AP.

#### مختلط

- Debit: Inventory.
- Credit: Cash/Bank.
- Credit: Supplier AP.

### 6.4 validations

- supplier مطلوب إذا remaining > 0.
- paymentAccount مطلوب إذا paid > 0.
- warehouse مطلوب.
- كل المواد active.
- expiryDate مطلوب إذا product.trackExpiry.
- expenses allocation total = totalExpenses.
- currency isolation.

## 7. Inventory Architecture

### 7.1 صفحات

- `/dashboard/products`: المواد.
- `/dashboard/categories`: التصنيفات.
- `/dashboard/warehouses`: المخازن.
- `/dashboard/inventory/movements`: الحركات.
- `/dashboard/inventory/transfers`: النقل.
- `/dashboard/inventory/adjustments`: التسويات.
- `/dashboard/inventory/damages`: التلف.
- `/dashboard/inventory/opening-balances`: أرصدة افتتاحية.
- `/dashboard/inventory/counts`: الجرد.

### 7.2 بطاقة المادة

- tabs:
  - معلومات عامة.
  - الأسعار.
  - المخزون حسب المخزن.
  - الحركة.
  - التكاليف.
  - Audit.
- buttons:
  - إضافة.
  - تعديل.
  - تعطيل.
  - إدارة الأسعار.
  - طباعة باركود.
  - كشف حركة.

### 7.3 Stock Movement Rules

- البيع: OUT.
- مرتجع البيع: RETURN_IN.
- الشراء: IN.
- مرتجع الشراء: RETURN_OUT.
- النقل: TRANSFER_OUT + TRANSFER_IN.
- التلف: DAMAGE OUT مع قيد مصروف تلف.
- التسوية الموجبة: ADJUSTMENT_IN.
- التسوية السالبة: ADJUSTMENT_OUT.
- الافتتاحي: OPENING.

### 7.4 Inventory Valuation

- السياسة الأولى: Weighted Average.
- عند الشراء:
  - newAvg = (oldQty * oldAvg + incomingQty * incomingUnitCost) / (oldQty + incomingQty).
- عند البيع:
  - COGS = quantity * currentAvgCost.
  - avg لا يتغير.
- عند السالب:
  - مرفوض افتراضياً.
  - إذا سمح: يجب تثبيت cost حسب آخر متوسط وتسجيل risk audit.

### 7.5 Edge Cases

- بيع مادة بلا تكلفة:
  - يرفض إلا بصلاحية `inventory.sellWithoutCost`.
- تعديل فاتورة شراء بعد بيع بضاعتها:
  - لا يسمح بعد الترحيل؛ يستخدم قيد فرق تكلفة أو مستند تصحيح.
- حذف مخزن عليه حركات:
  - ممنوع، يسمح تعطيل.
- نقل إلى نفس المخزن:
  - مرفوض.
- جرد أثناء وجود فواتير مسودة:
  - يسمح، لكن عند الترحيل يعيد التحقق من الرصيد.

## 8. Permissions Architecture

### 8.1 النموذج

- RBAC:
  - User -> Roles -> Permissions.
- Direct User Permissions:
  - صلاحيات إضافية مباشرة.
- مستقبلاً:
  - Explicit Deny.
  - Warehouse-scoped permissions.
  - Amount-limited approvals.

### 8.2 قواعد التطبيق

- Frontend:
  - إخفاء الأزرار والروابط غير المسموحة.
  - منع route client-side للراحة فقط.
- Backend:
  - check إلزامي في كل API.
  - لا ثقة في UI.
- Database:
  - constraints تمنع فساد البيانات حتى لو API أخطأ.

### 8.3 Permission Matrix مختصرة

| Module | صلاحيات |
|---|---|
| Dashboard | `dashboard.view`, `dashboard.financialCards.view`, `dashboard.profit.view` |
| Accounts | `accounts.view`, `accounts.create`, `accounts.edit`, `accounts.delete`, `accounts.statement`, `accounts.balances`, `accounts.openingBalance` |
| Journals | `journals.view`, `journals.create`, `journals.post`, `journals.reverse`, `journals.print` |
| Vouchers | `vouchers.receipt`, `vouchers.payment`, `vouchers.exchange`, `vouchers.allowance`, `vouchers.entry`, `vouchers.cancel`, `vouchers.print` |
| Sales | `sales.view`, `sales.create`, `sales.post`, `sales.cancel`, `sales.return`, `sales.print`, `sales.discount.override`, `sales.creditLimit.override` |
| Purchases | `purchases.view`, `purchases.create`, `purchases.post`, `purchases.cancel`, `purchases.return`, `purchases.print` |
| Inventory | `inventory.view`, `inventory.adjust`, `inventory.damage`, `inventory.transfer`, `inventory.count`, `inventory.negative.override` |
| Products | `products.view`, `products.create`, `products.edit`, `products.disable`, `products.prices.manage`, `products.cost.view` |
| Customers | `customers.view`, `customers.create`, `customers.edit`, `customers.disable`, `customers.balance.view` |
| Suppliers | `suppliers.view`, `suppliers.create`, `suppliers.edit`, `suppliers.disable`, `suppliers.balance.view` |
| Users | `users.view`, `users.create`, `users.edit`, `users.disable`, `users.resetPassword` |
| Roles | `roles.view`, `roles.manage` |
| Reports | `reports.financial`, `reports.sales`, `reports.inventory`, `reports.debts`, `reports.export` |
| Settings | `settings.view`, `settings.manage`, `periods.lock`, `periods.override` |
| Audit | `audit.view`, `audit.financial.view` |

### 8.4 Security Rules

- لا يسمح للمستخدم بمنح صلاحية لا يملكها إلا super admin.
- لا يسمح بحذف آخر admin.
- لا يسمح بتعطيل المستخدم الحالي لنفسه إذا كان آخر admin.
- تغيير roles يسجل before/after.
- العمليات المالية الحساسة تطلب إعادة تحقق كلمة مرور أو MFA مستقبلاً.

## 9. API Architecture

### 9.1 نمط عام

كل API يتبع:

- Auth check.
- Permission check.
- Zod validation.
- Business validation.
- Prisma transaction عند write.
- Audit log.
- Response موحد:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "pageSize": 50, "total": 200 }
}
```

### 9.2 Accounting APIs

| Method | Endpoint | الهدف | صلاحية | Transaction |
|---|---|---|---|---|
| GET | `/api/accounts` | قائمة الحسابات | `accounts.view` | لا |
| POST | `/api/accounts` | إنشاء حساب | `accounts.create` | نعم |
| PATCH | `/api/accounts/:id` | تعديل حساب | `accounts.edit` | نعم |
| DELETE | `/api/accounts/:id` | حذف/تعطيل | `accounts.delete` | نعم |
| GET | `/api/account-statement` | كشف حساب | `accounts.statement` | لا |
| GET | `/api/account-balances` | أرصدة | `accounts.balances` | لا |
| POST | `/api/journals` | قيد مسودة | `journals.create` | نعم |
| POST | `/api/journals/:id/post` | ترحيل | `journals.post` | نعم |
| POST | `/api/journals/:id/reverse` | عكس | `journals.reverse` | نعم |
| GET | `/api/vouchers` | سندات | `vouchers.view` | لا |
| POST | `/api/vouchers` | إنشاء سند | حسب type | نعم |
| POST | `/api/vouchers/:id/post` | ترحيل سند | حسب type | نعم |
| POST | `/api/vouchers/:id/cancel` | إلغاء سند | `vouchers.cancel` | نعم |

### 9.3 Sales APIs

| Method | Endpoint | الهدف |
|---|---|---|
| GET | `/api/sales-invoices` | قائمة مع filters |
| POST | `/api/sales-invoices` | إنشاء مسودة |
| PATCH | `/api/sales-invoices/:id` | تعديل مسودة |
| POST | `/api/sales-invoices/:id/post` | ترحيل مالي ومخزني |
| POST | `/api/sales-invoices/:id/cancel` | إلغاء بقيد عكسي وحركة عكسية |
| POST | `/api/sales-returns` | مرتجع بيع |
| POST | `/api/sales-invoices/:id/print` | توليد PDF |

### 9.4 Purchases APIs

- `GET /api/purchase-invoices`.
- `POST /api/purchase-invoices`.
- `PATCH /api/purchase-invoices/:id`.
- `POST /api/purchase-invoices/:id/post`.
- `POST /api/purchase-invoices/:id/cancel`.
- `POST /api/purchase-returns`.
- `GET /api/purchase-invoices/:id/pdf`.

### 9.5 Inventory APIs

- `GET /api/products`.
- `POST /api/products`.
- `PATCH /api/products/:id`.
- `POST /api/products/:id/disable`.
- `GET /api/stock-movements`.
- `GET /api/stock-balances`.
- `POST /api/stock-transfers`.
- `POST /api/stock-transfers/:id/post`.
- `POST /api/stock-adjustments`.
- `POST /api/damages`.
- `POST /api/inventory-counts`.
- `POST /api/inventory-counts/:id/post`.

### 9.6 API validations مثال فاتورة بيع

- request:
  - `customerId?`, `warehouseId`, `currency`, `exchangeRateSnapshot`, `paymentType`, `paymentAccountId?`, `lines[]`.
- Zod:
  - required fields.
  - decimal positive.
  - enum validation.
- Business:
  - customer active.
  - warehouse active.
  - product active.
  - stock available.
  - account mappings exist.
  - period open.
  - currency matches payment and AR.
- transaction:
  - create invoice.
  - create lines.
  - create stock movements.
  - update stock balances.
  - create journal.
  - create audit.
- response:
  - invoice DTO مع journalEntryId و printUrl.

## 10. UX Architecture

### 10.1 المبادئ

- كثافة معلومات عالية تناسب المحاسب.
- أقل عدد clicks للعمليات اليومية.
- الجداول قابلة للفرز والتصفية والحفظ.
- RTL حقيقي: sidebar يمين، الإجراءات يسار/حسب نمط عربي واضح.
- اختصارات لوحة مفاتيح.
- لا زخرفة زائدة؛ واجهة عملية هادئة.

### 10.2 Layout

- Sidebar:
  - لوحة التحكم.
  - الحسابات.
  - المبيعات.
  - المشتريات.
  - المواد والمخزون.
  - المخازن.
  - العملاء.
  - الموردون.
  - الموظفون.
  - المستخدمون والصلاحيات.
  - التقارير.
  - الإعدادات.
- Topbar:
  - بحث عام.
  - زر إنشاء سريع.
  - سعر الصرف الحالي.
  - المستخدم والجلسة.
  - تنبيهات.
- Breadcrumbs:
  - تظهر داخل كل صفحة تفاصيل.

### 10.3 Tables

- Features:
  - sticky header.
  - column visibility.
  - density toggle.
  - server pagination.
  - saved filters.
  - bulk actions حيث آمن.
  - row actions menu.
- Loading:
  - skeleton rows.
- Empty:
  - رسالة موجهة وزر إنشاء إذا لديه صلاحية.
- Error:
  - inline retry.
- Success:
  - toast غير مزعج.

### 10.4 Forms

- قواعد:
  - validation مباشر + server validation.
  - dirty state warning عند الخروج.
  - autosave للمسودات الكبيرة مستقبلاً.
  - أرقام مالية بمحاذاة يسار داخل input رغم RTL.
  - currency badge واضح.
- Dialogs:
  - تأكيد الترحيل.
  - تأكيد الإلغاء.
  - سبب الإلغاء إلزامي.
  - اختيار مواد/عملاء في command dialog.

### 10.5 Keyboard Shortcuts

- `Ctrl+K`: البحث العام.
- `Ctrl+N`: إنشاء حسب الصفحة.
- `Ctrl+S`: حفظ مسودة.
- `Ctrl+Enter`: ترحيل بعد تأكيد.
- `F4`: اختيار عميل/مورد.
- `F8`: اختيار مادة.
- `Esc`: إغلاق dialog.

## 11. Navigation Architecture

### 11.1 Sitemap

```text
/dashboard
/dashboard/accounts
/dashboard/accounts/tree
/dashboard/accounts/statement
/dashboard/accounting/journals
/dashboard/accounting/vouchers
/dashboard/accounting/opening-balances
/dashboard/exchange-rates
/dashboard/sales
/dashboard/sales/new
/dashboard/sales/returns
/dashboard/purchases
/dashboard/purchases/new
/dashboard/purchases/returns
/dashboard/products
/dashboard/inventory/movements
/dashboard/inventory/transfers
/dashboard/inventory/adjustments
/dashboard/warehouses
/dashboard/customers
/dashboard/suppliers
/dashboard/employees
/dashboard/users
/dashboard/roles
/dashboard/reports
/dashboard/settings
/dashboard/audit-logs
```

### 11.2 Route Protection

- middleware/proxy:
  - يمنع `/dashboard/*` دون session.
- layout:
  - يجلب permissions.
  - sidebar يخفي غير المسموح.
- page:
  - server check permission.
- api:
  - final enforcement.

## 12. Audit Architecture

### 12.1 ماذا يسجل

- Login success/failure.
- Logout.
- إنشاء/تعديل/تعطيل مستخدم.
- تغيير صلاحيات.
- إنشاء/تعديل/تعطيل master data.
- إنشاء مسودة مالية.
- ترحيل مالي.
- إلغاء مالي.
- أي override:
  - مخزون سالب.
  - حد دين.
  - period locked.
  - خصم فوق الحد.
- تصدير تقارير حساسة.

### 12.2 محتوى السجل

- userId.
- action.
- entity.
- entityId.
- before.
- after.
- diff.
- IP.
- userAgent.
- requestId.
- timestamp.
- source route.

### 12.3 UI

- `/dashboard/audit-logs`.
- filters:
  - المستخدم، التاريخ، الكيان، action، IP.
- row details:
  - before/after JSON diff.
  - رابط الكيان.
- permissions:
  - `audit.view`.
  - `audit.financial.view` للعمليات المالية.

## 13. Reporting Architecture

### 13.1 تقارير مالية

#### الأرباح والخسائر

- data source:
  - journal_lines grouped by accounts type REVENUE/EXPENSE/COGS.
- calculations:
  - صافي المبيعات = المبيعات - مردودات - خصومات.
  - مجمل الربح = صافي المبيعات - COGS.
  - صافي الربح = مجمل الربح - المصاريف + الإيرادات الأخرى.
- filters:
  - التاريخ، العملة، المخزن، مركز تكلفة.
- permissions:
  - `reports.financial`.

#### ميزان المراجعة

- مصدره journal_lines.
- يعرض opening debit/credit, movement debit/credit, closing debit/credit.
- يجب أن يتوازن.

#### حركة الصندوق والبنوك

- مصدرها journal_lines لحسابات subtype CASH/BANK.
- running balance.
- filters حسب العملة والحساب.

### 13.2 تقارير المبيعات

- إجمالي المبيعات حسب التاريخ.
- المبيعات حسب العميل.
- أفضل المنتجات.
- أفضل العملاء.
- المبيعات حسب المحافظة.
- المبيعات حسب الوكيل/المندوب.
- الديون المستحقة.
- هامش الربح لكل فاتورة/مادة.

### 13.3 تقارير المخزون

- رصيد المخزون.
- حركة مادة.
- كارت مادة.
- مواد تحت الحد الأدنى.
- مواد راكدة.
- مواد قريبة الانتهاء.
- تقرير التلف.
- فروقات الجرد.

### 13.4 Performance

- تقارير يومية مباشرة من indexes.
- تقارير ثقيلة:
  - materialized views.
  - scheduled refresh.
  - cache by filter hash.
- exports:
  - async job للتقارير الكبيرة.

## 14. Dashboard

### 14.1 الهدف

عرض نبض الشركة اليومي للمحاسب والمدير دون الإخلال بالصلاحيات.

### 14.2 widgets

- مبيعات اليوم.
- قبض اليوم.
- دفع اليوم.
- مشتريات اليوم.
- أرباح تقريبية اليوم.
- ديون العملاء.
- ديون الموردين.
- رصيد الصناديق حسب العملة.
- مواد منخفضة.
- فواتير غير مرحلة.
- تنبيهات فترات مفتوحة.

### 14.3 rules

- لا تعرض أرباح لمن لا يملك `dashboard.profit.view`.
- لا تعرض أرصدة نقدية لمن لا يملك `accounts.balances`.
- كل widget له loading/error/empty state.

## 15. Customers Architecture

### 15.1 صفحات

- قائمة العملاء.
- بطاقة عميل.
- كشف حساب عميل.
- أرصدة وديون.
- فواتير العميل.
- تحصيلات العميل.

### 15.2 Customer Form

- fields:
  - code، name، phone، whatsapp، governorate، area، customerType، category، creditLimitIQD، creditLimitUSD، paymentTermDays، notes.
- validations:
  - code unique.
  - phone صيغة مقبولة عراقياً مع مرونة.
  - credit limits >= 0.
- buttons:
  - إضافة.
  - حفظ.
  - تعطيل.
  - كشف الحساب.
  - فاتورة جديدة.
  - سند قبض.

### 15.3 Business Rules

- لا بيع آجل لعميل معطل.
- لا تجاوز حد الدين إلا بصلاحية.
- العميل يمكن أن يملك حسابين IQD/USD مستقلين.
- حذف العميل ممنوع عند وجود فواتير أو قيود؛ التعطيل فقط.

## 16. Suppliers Architecture

- مشابه العملاء مع AP بدلاً من AR.
- أزرار:
  - فاتورة شراء.
  - سند دفع.
  - كشف حساب.
- rules:
  - لا شراء آجل من مورد معطل.
  - رصيد المورد حسب العملة.

## 17. Employees Architecture

### 17.1 الموظفون

- fields:
  - الاسم، الهاتف، العنوان، الوظيفة، الراتب الشهري، أيام العمل، ساعات اليوم، وقت البداية، وقت النهاية، hourlyRate، notes.
- relations:
  - user optional.
  - attendance records.

### 17.2 الحضور والانصراف

- workflow:
  - اختيار موظف.
  - تسجيل دخول.
  - تسجيل خروج.
  - احتساب totalHours.
- calculations:
  - totalHours = checkout - checkin.
  - lateMinutes = checkin - shiftStart إذا موجب.
  - overtime = totalHours - dailyHours إذا موجب.
- validations:
  - لا سجلين لنفس الموظف واليوم.
  - checkOut بعد checkIn.
- future payroll:
  - gross salary.
  - deductions.
  - overtime.
  - advances.
  - payroll journal.

## 18. Users, Auth, Sessions

### 18.1 تسجيل الدخول

- email + password.
- rate limiting حسب IP/user.
- failed attempts:
  - بعد 5 محاولات قفل 15 دقيقة.
- session:
  - httpOnly cookie.
  - secure في production.
  - sameSite=Lax أو Strict حسب UX.

### 18.2 إدارة المستخدم

- إنشاء مستخدم.
- ربط موظف.
- تعيين roles.
- صلاحيات مباشرة.
- تعطيل.
- reset password.
- عرض الجلسات النشطة.

### 18.3 security

- password hashing: Argon2 أو bcrypt cost قوي.
- CSRF للـ mutations إذا cookie auth.
- لا تعرض password hash أبداً.
- audit لكل تغيير.

## 19. Settings Architecture

### 19.1 صفحات

- إعدادات الشركة.
- العملات وسعر الصرف.
- ترقيم المستندات.
- الحسابات النظامية.
- سياسات المخزون.
- سياسات البيع.
- الفترات المالية.
- النسخ الاحتياطي مستقبلاً.

### 19.2 System Account Mapping

- required mappings:
  - defaultCashIQDAccount.
  - defaultCashUSDAccount.
  - defaultBankIQDAccount.
  - defaultBankUSDAccount.
  - defaultAR_IQD, defaultAR_USD.
  - defaultAP_IQD, defaultAP_USD.
  - inventoryAccount.
  - salesRevenueIQD/USD.
  - cogsAccount.
  - discountAllowed.
  - discountEarned.
  - fxGain.
  - fxLoss.
  - openingBalanceEquity.
- validation:
  - لا يمكن ترحيل مستند إذا mapping ناقص.

## 20. Security Architecture

### 20.1 Threats

- تغيير مبلغ فاتورة بعد الترحيل.
- حذف قيد أو حركة مخزون.
- منح صلاحية غير مسموحة.
- تلاعب بسعر صرف قديم.
- bypass للواجهة عبر API.
- session theft.

### 20.2 Controls

- immutable POSTED records.
- reversal-only cancellation.
- audit append-only.
- permission checks backend.
- database constraints.
- transaction isolation.
- period locking.
- secure cookies.
- rate limiting.
- input validation.
- server-side recalculation of totals.

### 20.3 Anti-Tampering

- لا يقبل backend totals من client كمصدر حقيقة؛ يعيد الاحتساب.
- أي اختلاف بين client total و server total يرفض أو يرجع recalculated preview.
- journal hash مستقبلي:
  - hash لكل قيد يعتمد على previousHash لمنع التلاعب.

## 21. Performance Architecture

### 21.1 Indexing

- journal_lines:
  - `(accountId, currency, createdAt)`.
  - `(partnerType, partnerId, currency, createdAt)`.
  - `(sourceType, sourceId)`.
- stock_movements:
  - `(productId, warehouseId, movementDate)`.
  - `(warehouseId, movementDate)`.
  - `(sourceType, sourceId)`.
- invoices:
  - `(date, status)`.
  - `(customerId, date)`.
  - `(warehouseId, date)`.
- audit_logs:
  - `(entity, entityId)`.
  - `(userId, createdAt)`.

### 21.2 Pagination

- الجداول التشغيلية: page/pageSize مع total.
- كشف الحساب والحركات الكبيرة: keyset cursor.
- exports الكبيرة: background job.

### 21.3 Query Optimization

- لا aggregate ضخم في dashboard دون cache.
- monthly snapshots للأرصدة.
- materialized views للتقارير الثقيلة.
- select محدد لا include كامل.

## 22. Module-by-Module Page Map

### 22.1 Dashboard

- Page: لوحة التحكم.
- Buttons:
  - تحديث.
  - تغيير الفترة.
  - تصدير مختصر.
- Tables:
  - آخر الفواتير.
  - آخر السندات.
  - تنبيهات مخزون.
- states:
  - loading widgets.
  - empty new company.
  - partial permission hidden widgets.

### 22.2 الحسابات

- Pages:
  - دليل الحسابات.
  - كشف الحساب.
  - أرصدة الحسابات.
  - أرصدة العملاء.
  - أرصدة الموردين.
  - القيود اليومية.
  - السندات.
  - الأرصدة الافتتاحية.
  - سعر الصرف.
  - حركة الصندوق.
  - حركة البنوك.
- Shared buttons:
  - جديد، تعديل، ترحيل، عكس، طباعة، تصدير، فلاتر.

### 22.3 المبيعات

- Pages:
  - الفواتير.
  - فاتورة جديدة.
  - المرتجعات.
  - التحصيلات.
  - أسعار العملاء.
- Buttons:
  - فاتورة جديدة.
  - تحصيل.
  - مرتجع.
  - طباعة.
  - إلغاء.

### 22.4 المشتريات

- Pages:
  - فواتير شراء.
  - فاتورة جديدة.
  - مرتجعات شراء.
  - مصاريف شراء.
- Buttons:
  - فاتورة شراء.
  - دفع.
  - طباعة.
  - إلغاء.

### 22.5 المواد والمخزون

- Pages:
  - المواد.
  - التصنيفات.
  - الأسعار.
  - الحركات.
  - التسويات.
  - التلف.
  - الجرد.
- Buttons:
  - مادة جديدة.
  - تعديل سعر.
  - تسوية.
  - تسجيل تلف.
  - جرد جديد.

### 22.6 المخازن

- Pages:
  - المخازن.
  - النقل بين المخازن.
  - أرصدة المخزن.
- Buttons:
  - مخزن جديد.
  - نقل جديد.
  - كشف مخزن.

### 22.7 التقارير

- Pages grouped:
  - مالية.
  - مبيعات.
  - مشتريات.
  - مخزون.
  - ديون.
  - عملاء/موردون.
- Buttons:
  - تشغيل التقرير.
  - حفظ فلتر.
  - تصدير Excel.
  - تصدير PDF.

## 23. Current Codebase Gap Map

### 23.1 ما هو موجود حالياً

- Prisma schema يحتوي نواة:
  - Users/Roles/Permissions.
  - Customers/Suppliers.
  - Products/Categories/Packaging/Prices.
  - Warehouses.
  - Sales Invoice و Purchase Invoice.
  - PaymentAccount.
  - StockMovement.
  - Account/Voucher/VoucherLine.
  - AccountOpeningBalance.
  - MaterialOpeningBalance.
  - ExchangeRate.
  - Employees/Attendance.
  - AuditLog.
- API routes موجودة لمعظم الكيانات التشغيلية.
- Dashboard pages موجودة للحسابات، المبيعات، المشتريات، المنتجات، المخازن، العملاء، المستخدمين، التقارير، الإعدادات.

### 23.2 الفجوة المحاسبية الحرجة

- لا يوجد `JournalEntry` و `JournalLine` منفصلان كمصدر حقيقة كامل؛ `VoucherLine` لا يكفي لكل الفواتير والمخزون.
- `Account.balance` و `CustomerAccount.balance` و `SupplierAccount.balance` و `PaymentAccount.balance` يجب اعتبارها cache أو تزال لصالح ledger-derived balances.
- القيود الحالية تحتاج:
  - immutable posting.
  - reversal entries.
  - period locking.
  - source linking لكل فاتورة/سند.
  - validation يمنع journal imbalance.
- الحسابات تحتاج:
  - parentId/tree.
  - normalBalance.
  - subtype.
  - isPosting/isSystem/isProtected.
  - account mapping.

### 23.3 الفجوة في العملات

- Currency enum موجود.
- المطلوب إضافته:
  - فرض line currency = account currency.
  - منع voucher/facture mixed currencies.
  - snapshot exchange rate في كل مستند مالي.
  - Exchange voucher architecture لحسابات clearing وفروقات العملة.
  - تقارير حسب العملة لا تجمع IQD و USD دون تحويل معلن.

### 23.4 الفجوة المخزنية

- `StockMovement` موجود لكنه يحتاج:
  - movementDate.
  - unitCost/totalCost/currency/exchangeRateSnapshot.
  - sourceLineId.
  - running quantity/cost أو stock_balances.
  - movement type enum مضبوط بدلاً من String.
- لا يوجد stock_balances cache.
- لا يوجد transfer document كامل.
- لا يوجد inventory count workflow.
- لا يوجد valuation service.

### 23.5 الفجوة في الفواتير

- الفواتير الحالية تحتوي totals و status، لكنها تحتاج:
  - DRAFT/POSTED immutable transition.
  - journalEntryId.
  - cancellation/reversal.
  - stock movement references per line.
  - server-side total recalculation.
  - credit limit validation.
  - period open validation.
  - proper return documents.

### 23.6 الفجوة الأمنية

- permissions موجودة كبذرة جيدة.
- المطلوب:
  - backend enforcement موحد لكل route.
  - session table أو session hardening.
  - login rate limiting.
  - CSRF إذا الاعتماد على cookies.
  - audit before/after لا details فقط.
  - منع permission escalation.

### 23.7 Migration Strategy

1. إضافة الجداول الجديدة دون حذف الجداول الحالية.
2. إنشاء JournalEntry/JournalLine وربط vouchers بها.
3. تحويل posting للفواتير ليولد journal و stock movements.
4. جعل balances الحالية مشتقة/reconciled.
5. إضافة constraints تدريجياً بعد تنظيف البيانات.
6. إضافة period locking بعد استقرار posting.
7. إضافة reports من ledger الجديد.

## 24. Development Phases

### Phase 1 - Foundation Hardening

- إضافة company/fiscal periods/settings.
- ترقية accounts إلى شجرة كاملة.
- بناء JournalEntry/JournalLine كمصدر حقيقة.
- توحيد vouchers فوق journals.
- تثبيت permission checks.
- audit before/after.

### Phase 2 - Inventory Ledger

- stock_balances.
- stock transfers.
- stock adjustments/damages.
- opening balances posting.
- weighted average valuation.

### Phase 3 - Sales Posting

- sales invoices DRAFT/POSTED.
- journal generation.
- stock out + COGS.
- customer debt.
- returns.

### Phase 4 - Purchases Posting

- purchase invoices.
- landed cost allocation.
- stock in + inventory valuation.
- supplier debt.
- purchase returns.

### Phase 5 - Reporting

- statements.
- trial balance.
- P&L.
- sales/inventory/debt reports.
- exports.

### Phase 6 - UX and Controls

- advanced tables.
- shortcuts.
- saved filters.
- approval flows.
- period locks.
- session management.

## 25. AI Agent Task Breakdown

### Accounting Agent

- تصميم وتنفيذ JournalEntry/JournalLine.
- تحويل vouchers والفواتير إلى posting services.
- بناء كشف الحساب والأرصدة.
- ضمان currency isolation.

### Inventory Agent

- stock movements/balances.
- weighted average.
- transfers/adjustments/counts.
- negative stock policy.

### Sales Agent

- sales invoice workflow.
- pricing by customer type.
- returns and collections.
- PDF invoice.

### Purchases Agent

- purchase workflow.
- landed costs.
- supplier AP.
- purchase returns.

### Security Agent

- RBAC hardening.
- sessions.
- rate limiting.
- CSRF.
- audit logs.

### UX Agent

- RTL layout.
- tables and filters.
- forms/dialogs.
- keyboard shortcuts.

### Reporting Agent

- trial balance.
- P&L.
- debt aging.
- stock reports.
- export jobs.

## 26. Acceptance Criteria

- لا يمكن ترحيل أي مستند مالي دون قيد متوازن.
- لا يمكن خلط عملات في حساب أو قيد.
- لا تتغير العمليات القديمة بعد تغيير سعر الصرف.
- لا يمكن تعديل مستند POSTED مباشرة.
- إلغاء المستند يولد أثر عكسي قابل للتدقيق.
- كشف الحساب يطابق journal lines.
- أرصدة المخزون تطابق stock movements.
- كل API حساس يطبق permission backend.
- كل write مهم يسجل audit.
- كل جدول كبير يدعم pagination و indexes.
- كل واجهة لها loading/empty/error/success states.

## 27. Financial Posting Engine Architecture

### 27.1 الهدف

محرك الترحيل المالي هو الطبقة التي تمنع تحول النظام إلى مجرد CRUD. هذه الطبقة مسؤولة عن تحويل كل مستند تشغيلي إلى أثر مالي صحيح، متوازن، قابل للتدقيق، غير قابل للتلاعب، وآمن عند التزامن والفشل.

### 27.2 المبادئ

- لا يوجد ترحيل مالي مباشر من route handler.
- كل مستند يمر عبر Posting Pipeline موحد.
- كل قيد يمر عبر LedgerValidator قبل الحفظ وبعد الحفظ.
- كل posting operation idempotent.
- كل source document ينتج journal entry واحداً أو أكثر بعلاقة واضحة.
- لا يسمح بحالة مالية نصف مرحلة.
- لا يسمح بوجود stock movement دون journal عند العملية ذات أثر مالي، ولا journal دون source عند المستندات التشغيلية.
- كل failure يجب أن يترك النظام في حالة آمنة: إما لا شيء تغير، أو مستند marked as FAILED_POSTING مع rollback مكتمل وسجل تدقيق.

### 27.3 الخدمات الأساسية

| Service | الهدف | مسؤوليات ممنوعة |
|---|---|---|
| `PostingService` | نقطة الدخول لترحيل أي مستند | لا يبني SQL يدوي ولا يتجاوز validators |
| `JournalBuilder` | بناء قيود من source document | لا يحفظ في قاعدة البيانات مباشرة |
| `LedgerValidator` | التحقق من توازن القيود والعملات والحسابات | لا يغير بيانات |
| `PostingTransactionManager` | إدارة transaction boundary | لا يحتوي business mapping |
| `PostingLockManager` | منع الترحيل المتزامن لنفس المستند/الفترة | لا يستبدل database constraints |
| `ReversalService` | إنشاء قيود عكسية للإلغاء | لا يعدل القيد الأصلي |
| `IntegrityGuard` | حراس مالية قبل وبعد الترحيل | لا يسمح override صامت |
| `PostingAuditService` | كتابة audit مالي تفصيلي | لا يقرر صحة القيد |
| `PostingEventPublisher` | نشر أحداث بعد commit | لا ينشر قبل نجاح commit |
| `ReconciliationService` | مطابقة ledger مع المستندات والأرصدة | لا يصحح دون سياسة واضحة |

### 27.4 Interfaces مقترحة

```ts
interface PostingSource {
  sourceType: PostingSourceType;
  sourceId: string;
  companyId: string;
  branchId?: string;
  documentDate: Date;
  currency: Currency;
  exchangeRateSnapshot: Decimal;
}

interface PostingRequest {
  source: PostingSource;
  requestedById: string;
  idempotencyKey: string;
  postingMode: "POST" | "SIMULATE" | "REVERSE";
  reason?: string;
}

interface JournalDraft {
  header: JournalHeaderDraft;
  lines: JournalLineDraft[];
  inventoryEffects?: InventoryEffectDraft[];
  links: PostingLinkDraft[];
}

interface PostingResult {
  status: "POSTED" | "SIMULATED" | "FAILED" | "ALREADY_POSTED";
  journalEntryIds: string[];
  sourceId: string;
  auditLogId: string;
}
```

### 27.5 Posting Pipeline

1. Receive request.
2. Authenticate user.
3. Authorize permission by source type.
4. Validate idempotency key.
5. Acquire posting lock.
6. Load source document with stable snapshot.
7. Validate source state.
8. Validate fiscal period and branch period.
9. Validate approval status if required.
10. Validate currency isolation.
11. Validate account mappings.
12. Build journal draft.
13. Build inventory effects if applicable.
14. Run pre-posting integrity guards.
15. Open database transaction.
16. Re-check lock/state inside transaction.
17. Persist journal entry and lines.
18. Persist stock movements and stock balance updates.
19. Update source status to POSTED.
20. Persist posting links.
21. Persist audit logs.
22. Run post-persist ledger validation inside transaction.
23. Commit.
24. Publish after-commit events.
25. Return result.

### 27.6 ترتيب التحقق

- User/session validation.
- Permission validation.
- Idempotency validation.
- Document existence validation.
- Document state validation.
- Period validation.
- Approval validation.
- Currency validation.
- Account mapping validation.
- Amount recalculation validation.
- Inventory availability validation.
- Journal balance validation.
- Database constraints validation.
- Post-commit reconciliation signal.

### 27.7 Posting State Machine

| State | الوصف | يسمح بالانتقال إلى | ملاحظات |
|---|---|---|---|
| DRAFT | مستند قابل للتعديل | PENDING_APPROVAL, POSTING, CANCELLED | لا أثر مالي نهائي |
| PENDING_APPROVAL | ينتظر موافقة | APPROVED, REJECTED, CANCELLED | ممنوع الترحيل |
| APPROVED | جاهز للترحيل | POSTING, CANCELLED | approval snapshot محفوظ |
| POSTING | قيد التنفيذ | POSTED, POSTING_FAILED | lock نشط |
| POSTED | مرحل | REVERSING | immutable |
| POSTING_FAILED | فشل آمن | DRAFT, POSTING | يتطلب سبب وسجل |
| REVERSING | إلغاء قيد التنفيذ | REVERSED, REVERSAL_FAILED | lock نشط |
| REVERSED | ملغى بأثر عكسي | لا شيء | immutable |
| CANCELLED | ملغى قبل الترحيل | لا شيء | لا قيد مالي |

### 27.8 Database Design

#### posting_operations

- الهدف: تتبع كل محاولة ترحيل.
- الأعمدة:
  - `id`, `companyId`, `branchId?`, `sourceType`, `sourceId`.
  - `operationType`: POST, REVERSE, SIMULATE.
  - `idempotencyKey`.
  - `status`: STARTED, COMMITTED, ROLLED_BACK, FAILED, ALREADY_APPLIED.
  - `startedAt`, `finishedAt?`, `requestedById`.
  - `errorCode?`, `errorMessage?`.
  - `requestHash`.
  - `resultJson?`.
- indexes:
  - unique `companyId, sourceType, sourceId, operationType, idempotencyKey`.
  - `sourceType, sourceId`.
  - `status, startedAt`.
- constraints:
  - لا يسمح بتكرار operation ناجحة لنفس source/post إلا إذا reversal.

#### posting_locks

- الهدف: lock منطقي بجانب database transaction.
- الأعمدة:
  - `id`, `companyId`, `lockKey`, `ownerId`, `expiresAt`, `createdAt`.
- indexes:
  - unique `lockKey`.
- rules:
  - TTL قصير.
  - release بعد commit/rollback.
  - stale locks تنظفها background job.

#### posting_links

- الهدف: ربط المستندات بالقيود والحركات.
- الأعمدة:
  - `id`, `companyId`, `sourceType`, `sourceId`, `journalEntryId?`, `stockMovementId?`, `postingOperationId`.
- indexes:
  - `sourceType, sourceId`.
  - `journalEntryId`.
  - `stockMovementId`.

#### ledger_integrity_checks

- الهدف: نتائج فحوصات السلامة.
- الأعمدة:
  - `id`, `companyId`, `checkType`, `scopeType`, `scopeId`, `status`, `detailsJson`, `checkedAt`.
- check types:
  - JOURNAL_BALANCE.
  - CURRENCY_ISOLATION.
  - ORPHAN_JOURNAL.
  - ORPHAN_STOCK.
  - SOURCE_LEDGER_MISMATCH.

### 27.9 Journal Builder Engine

#### Sales Invoice Builder

- inputs:
  - invoice header.
  - invoice lines.
  - customer account mapping.
  - payment account mapping.
  - product inventory/sales/COGS accounts.
- output:
  - revenue lines.
  - AR/cash lines.
  - COGS lines.
  - inventory credit lines.
- rules:
  - revenue line حسب عملة الفاتورة.
  - COGS بنفس عملة valuation policy أو العملة الأساسية حسب السياسة.
  - لا يبني قيد إذا product missing account mapping.

#### Purchase Invoice Builder

- inputs:
  - purchase header.
  - landed costs.
  - supplier/payment accounts.
  - inventory accounts.
- output:
  - Debit Inventory.
  - Credit Supplier AP/Cash/Bank.
- rules:
  - landed cost تدخل ضمن Inventory إذا مرتبطة بالبضاعة.
  - expense allocation snapshot محفوظ.

#### Voucher Builder

- receipt:
  - Debit Cash/Bank.
  - Credit AR/selected account.
- payment:
  - Debit AP/expense/selected account.
  - Credit Cash/Bank.
- allowance:
  - حسب customer/supplier allowance rules.
- exchange:
  - يولد قيود منفصلة حسب العملات.
- manual entry:
  - يبني من lines مع validations صارمة.

### 27.10 Ledger Consistency Engine

- يتحقق من:
  - مجموع debit = مجموع credit لكل journal.
  - كل line currency = journal currency.
  - كل line currency = account currency.
  - كل account isPosting=true.
  - كل account active وقت الترحيل.
  - كل source document status يسمح.
  - لا يوجد journal سابق لنفس source إلا reversal policy.
  - fiscal period مفتوحة.
  - branch period مفتوحة.
  - document totals = journal totals.
  - stock valuation = COGS journal.

### 27.11 Currency Isolation Enforcement

- في pre-validation:
  - قراءة عملة source.
  - قراءة عملات الحسابات.
  - رفض أي mismatch.
- في database:
  - تخزين `currency` في journal header و lines.
  - constraint منطقي عبر service و database checks حيث ممكن.
- في reporting:
  - لا aggregation بين IQD و USD إلا بتقرير تحويل واضح باسم "مكافئ IQD".

### 27.12 Atomic Financial Transactions

- transaction boundary تشمل:
  - posting_operation.
  - journal_entries.
  - journal_lines.
  - stock_movements.
  - stock_balances.
  - source status.
  - audit_logs.
- isolation:
  - `READ COMMITTED` مع row locks كاف لمعظم العمليات.
  - `SERIALIZABLE` للعمليات الحساسة مثل period close أو high-volume reconciliation.
- row locks:
  - lock source row.
  - lock affected stock_balances rows.
  - lock period row.
  - lock numbering sequence row.

### 27.13 Posting Locking System

- lock keys:
  - `posting:sourceType:sourceId`.
  - `period:companyId:periodId:close`.
  - `stock:warehouseId:productId`.
  - `numbering:documentType:fiscalYear:branch`.
- rules:
  - acquire locks بترتيب ثابت لمنع deadlocks:
    1. period lock.
    2. source lock.
    3. numbering lock.
    4. account locks.
    5. stock locks sorted by productId/warehouseId.
- timeout:
  - فشل lock يرجع `409 POSTING_LOCKED`.

### 27.14 Concurrency Handling

- سيناريوهات:
  - مستخدمان يحاولان ترحيل نفس الفاتورة.
  - فاتورتان تبيعان آخر كمية من نفس المادة.
  - إغلاق فترة أثناء ترحيل مستند.
  - تعديل صلاحيات أثناء عملية posting.
- controls:
  - row-level locks.
  - idempotency key.
  - optimistic `version` field على source documents.
  - re-check داخل transaction.
  - unique source posting constraint.

### 27.15 Deadlock Prevention

- ترتيب locks ثابت.
- عدم فتح transaction قبل validation غير الضروري.
- عدم استدعاء خدمات خارجية داخل transaction.
- تقليل مدة transaction.
- استخدام retry محدود عند deadlock database:
  - max 3 attempts.
  - exponential backoff.
  - نفس idempotency key.

### 27.16 Reversal Engine

- لا يعدل القيد الأصلي.
- ينشئ journal جديد:
  - debit يصبح credit.
  - credit يصبح debit.
  - يحتفظ بنفس currency و exchangeRateSnapshot.
  - يربط بـ `reversedJournalEntryId`.
- للمخزون:
  - ينشئ حركة عكسية إذا period مفتوحة.
  - إذا period مغلقة، ينشئ مستند تصحيح في period الحالية مع disclosure.
- validations:
  - لا عكس لقيد معكوس مسبقاً.
  - سبب الإلغاء إلزامي.
  - صلاحية `journals.reverse` أو صلاحية المستند.

### 27.17 Retry-safe و Idempotent Posting

- كل client يرسل `idempotencyKey`.
- server يبني `requestHash`.
- إذا تكرر الطلب بنفس key/hash:
  - يرجع نفس النتيجة.
- إذا نفس key و hash مختلف:
  - `409 IDEMPOTENCY_CONFLICT`.
- إذا source POSTED:
  - يرجع `ALREADY_POSTED` مع journal ids.

### 27.18 Rollback Strategy

- فشل قبل transaction:
  - لا تغيير.
  - audit attempt اختياري.
- فشل داخل transaction:
  - rollback كامل.
  - posting_operation يحدث إلى FAILED في transaction منفصلة آمنة.
- فشل بعد commit وقبل event publish:
  - لا rollback مالي.
  - outbox job يعيد نشر الأحداث.
- فشل export/notification:
  - لا يؤثر على posting.

### 27.19 Failure Recovery

- `POSTING_FAILED`:
  - يعرض سبب الفشل.
  - يسمح retry بعد حل السبب.
- orphan detection:
  - journal بلا source link.
  - source POSTED بلا journal.
  - stock movement بلا source.
- recovery APIs:
  - `POST /api/posting/retry`.
  - `POST /api/posting/reconcile`.
  - `GET /api/posting/operations/:id`.

### 27.20 Financial Integrity Guards

- Pre guards:
  - PeriodOpenGuard.
  - ApprovalGuard.
  - CurrencyGuard.
  - AccountMappingGuard.
  - AmountRecalculationGuard.
  - StockAvailabilityGuard.
- Post guards:
  - JournalBalanceGuard.
  - LedgerSourceMatchGuard.
  - StockLedgerMatchGuard.
  - AuditWrittenGuard.

### 27.21 Financial Reconciliation Services

- daily reconciliation:
  - invoices vs journals.
  - vouchers vs journals.
  - stock movements vs COGS/inventory journals.
  - payment accounts vs ledger.
- outputs:
  - PASS.
  - WARNING.
  - FAIL.
- fail actions:
  - alert finance admin.
  - block period close.
  - require correction journal/reversal.

### 27.22 Posting Audit Architecture

- يسجل:
  - requestedBy.
  - source snapshot.
  - validations passed/failed.
  - journal draft hash.
  - persisted journal ids.
  - lock acquisition time.
  - transaction duration.
  - failure reason.
- financial audit لا يقبل تعديل.
- كل posting_operation له audit chain.

### 27.23 Event-driven Financial Architecture

- بعد commit فقط:
  - `financial.posted`.
  - `financial.reversed`.
  - `stock.moved`.
  - `customer.balance.changed`.
  - `supplier.balance.changed`.
  - `period.close.blocker.detected`.
- outbox table:
  - `id`, `eventType`, `aggregateType`, `aggregateId`, `payloadJson`, `status`, `attempts`, `createdAt`, `publishedAt?`.
- consumers:
  - reporting projections.
  - notification jobs.
  - cache invalidation.
  - BI warehouse sync.

### 27.24 APIs

| Method | Endpoint | الهدف | Permission |
|---|---|---|---|
| POST | `/api/posting/simulate` | محاكاة قيد قبل الترحيل | حسب المستند |
| POST | `/api/posting/post` | ترحيل مستند | حسب المستند |
| POST | `/api/posting/reverse` | عكس مستند/قيد | `journals.reverse` |
| GET | `/api/posting/operations` | سجل عمليات الترحيل | `audit.financial.view` |
| GET | `/api/posting/operations/:id` | تفاصيل محاولة ترحيل | `audit.financial.view` |
| POST | `/api/posting/retry` | إعادة محاولة آمنة | صلاحية المستند |
| POST | `/api/posting/reconcile` | فحص مطابقة | `accounts.reconcile` |

### 27.25 UI Behavior

- زر `ترحيل` يعرض preview للقيد قبل التنفيذ عند الصلاحيات العالية.
- أثناء POSTING:
  - الزر disabled.
  - badge "جاري الترحيل".
  - منع تعديل المستند.
- عند الفشل:
  - عرض error code.
  - زر "إعادة المحاولة" إذا الفشل قابل للتصحيح.
  - رابط إلى audit details.
- عند النجاح:
  - عرض رقم القيد.
  - أزرار طباعة وكشف أثر مالي.

### 27.26 Edge Cases

- فاتورة تم ترحيلها ثم retry من المتصفح:
  - يرجع ALREADY_POSTED.
- انقطاع الشبكة بعد commit:
  - client يستعلم operation id.
- deadlock عند بيع مخزون:
  - retry داخلي محدود.
- قيد غير متوازن بسبب rounding:
  - يرفض إلا إذا rounding account مضبوط وسياسة rounding مفعلة.
- سعر صرف مفقود:
  - يرفض قبل بناء القيد.

### 27.27 Performance Rules

- simulation لا يفتح locks ثقيلة إلا عند الحاجة.
- posting يستخدم select محدود.
- stock locks ترتب وتجمع حسب product/warehouse.
- journal lines bulk insert.
- audit payload الكبير يخزن compressed JSON مستقبلاً.
- outbox publishing خارج transaction.

### 27.28 Future Scalability

- دعم multi-company.
- دعم distributed posting workers.
- دعم approval-driven posting queues.
- دعم signed journal chains.
- دعم external accounting export.
- دعم IFRS/local tax layers.

## 28. Financial Period Closing Architecture

### 28.1 الهدف

الإغلاق المالي يحول الفترة من حالة تشغيلية مفتوحة إلى حالة تاريخية مجمدة، مع ضمان أن كل المستندات مرحلة، كل القيود متوازنة، المخزون مطابق، العملات مقيمة، والتقارير قابلة للاعتماد.

### 28.2 أنواع الإغلاق

| النوع | الوصف | أثره |
|---|---|---|
| Soft Close | إغلاق تشغيلي مؤقت | يمنع المستندات العادية ويسمح بتعديلات بصلاحية |
| Hard Close | إغلاق نهائي | يمنع أي تغيير داخل الفترة إلا reopening رسمي |
| Inventory Close | إغلاق مخزني | يمنع حركات المخزون السابقة |
| Financial Close | إغلاق محاسبي | يمنع القيود والمستندات المالية |
| Year Close | إغلاق سنوي | يغلق الحسابات المؤقتة ويرحل الأرباح المحتجزة |

### 28.3 Database Design

#### closing_runs

- الهدف: تشغيلات الإغلاق.
- الأعمدة:
  - `id`, `companyId`, `branchId?`, `periodId`, `type`.
  - `status`: DRAFT, VALIDATING, BLOCKED, READY, APPROVING, CLOSED, FAILED, REOPENED.
  - `startedById`, `startedAt`, `closedById?`, `closedAt?`.
  - `validationSummaryJson`, `notes`.
- indexes:
  - `periodId, type`.
  - `status, startedAt`.

#### closing_check_results

- الهدف: نتائج كل validation.
- الأعمدة:
  - `id`, `closingRunId`, `checkCode`, `severity`, `status`, `entityType?`, `entityId?`, `message`, `detailsJson`.
- severity:
  - INFO.
  - WARNING.
  - BLOCKER.

#### closing_snapshots

- الهدف: snapshot تاريخي للأرصدة.
- الأعمدة:
  - `id`, `companyId`, `branchId?`, `periodId`, `snapshotType`.
  - `accountId?`, `productId?`, `warehouseId?`, `currency`.
  - `openingDebit`, `openingCredit`, `movementDebit`, `movementCredit`, `closingDebit`, `closingCredit`.
  - `quantity?`, `valuationAmount?`.
  - `createdAt`.
- indexes:
  - `periodId, snapshotType`.
  - `accountId, currency`.
  - `productId, warehouseId`.

#### reopening_requests

- الهدف: طلبات إعادة فتح فترة.
- الأعمدة:
  - `id`, `periodId`, `reason`, `requestedById`, `approvedById?`, `status`, `createdAt`, `resolvedAt?`.
- rules:
  - يتطلب approval عالي.
  - يسجل audit مالي خاص.

### 28.4 Month-end Closing Workflow

1. Start closing run.
2. Freeze new posting attempts مؤقتاً للفترة.
3. Detect unposted documents.
4. Validate journal balance.
5. Validate currency isolation.
6. Reconcile AR/AP/payment accounts.
7. Reconcile inventory movements with inventory accounts.
8. Run FX revaluation if configured.
9. Generate adjustment journals if approved.
10. Create closing snapshots.
11. Request approval.
12. Hard/soft close period.
13. Publish reporting snapshot events.

### 28.5 Year-end Closing Workflow

1. إغلاق كل الأشهر.
2. تشغيل ميزان مراجعة نهائي.
3. إغلاق الحسابات المؤقتة:
   - revenues.
   - expenses.
   - COGS.
   - discounts.
   - FX gain/loss.
4. إنشاء closing entries.
5. ترحيل صافي الربح/الخسارة إلى Retained Earnings.
6. إنشاء opening balances للسنة الجديدة.
7. تجميد السنة.

### 28.6 Temporary Accounts Closing

- Revenue accounts:
  - Debit Revenue.
  - Credit Income Summary.
- Expense accounts:
  - Debit Income Summary.
  - Credit Expense.
- Net income:
  - إذا ربح:
    - Debit Income Summary.
    - Credit Retained Earnings.
  - إذا خسارة:
    - Debit Retained Earnings.
    - Credit Income Summary.

### 28.7 FX Revaluation

- الهدف: إعادة تقييم أرصدة العملة الأجنبية عند نهاية الفترة لأغراض reporting.
- لا تغير المستندات الأصلية.
- تستخدم سعر closing rate.
- الحسابات المشمولة:
  - cash/bank foreign currency.
  - AR/AP foreign currency.
- journal:
  - FX gain أو FX loss مقابل الحساب المعني أو revaluation reserve حسب السياسة.
- validations:
  - closing exchange rate موجود.
  - لا revaluation مكرر لنفس period/currency إلا reversal.

### 28.8 Closing Validation Engine

- checks:
  - unposted sales invoices.
  - unposted purchases.
  - draft vouchers.
  - unbalanced journals.
  - cancelled without reversal.
  - stock negative.
  - inventory account mismatch.
  - missing exchange rates.
  - pending approvals.
  - orphan posting links.
  - unreconciled payment accounts.
- blocker rules:
  - أي unbalanced journal blocker.
  - أي source POSTED بلا journal blocker.
  - أي period approval pending blocker.

### 28.9 Inventory vs Accounting Reconciliation

- حساب inventory ledger:
  - stock value by product/warehouse.
- حساب accounting ledger:
  - journal balance للحسابات inventory.
- الفرق:
  - إذا ضمن tolerance = warning.
  - إذا أكبر = blocker.
- correction:
  - لا تصحيح تلقائي.
  - يطلب مستند تسوية أو قيد فرق مخزون بصلاحية.

### 28.10 Carry-forward Balances

- Balance sheet accounts carry forward:
  - assets.
  - liabilities.
  - equity.
- Temporary accounts reset:
  - revenue.
  - expense.
- opening balances للسنة الجديدة:
  - تنشأ من closing snapshots.
  - تخضع لتوازن العملة.

### 28.11 Locking Strategy

- period row locked أثناء closing.
- posting إلى نفس period يرفض بـ `423 PERIOD_CLOSING`.
- branch period close مستقل إذا multi-branch مفعل.
- hard close يمنع:
  - create/update/delete/post/reverse داخل الفترة.
- reopening:
  - يغير status إلى REOPENED.
  - يسجل reason.
  - لا يحذف snapshots؛ ينشئ snapshot version جديد عند re-close.

### 28.12 APIs

| Method | Endpoint | الهدف | Permission |
|---|---|---|---|
| POST | `/api/periods/:id/closing-runs` | بدء إغلاق | `periods.close.start` |
| GET | `/api/closing-runs/:id` | حالة الإغلاق | `periods.close.view` |
| POST | `/api/closing-runs/:id/validate` | تشغيل الفحوصات | `periods.close.start` |
| POST | `/api/closing-runs/:id/approve` | موافقة الإغلاق | `periods.close.approve` |
| POST | `/api/closing-runs/:id/close` | تنفيذ الإغلاق | `periods.close.execute` |
| POST | `/api/periods/:id/reopen` | طلب إعادة فتح | `periods.reopen.request` |
| POST | `/api/reopening-requests/:id/approve` | موافقة إعادة الفتح | `periods.reopen.approve` |

### 28.13 Permissions

- `periods.close.view`.
- `periods.close.start`.
- `periods.close.approve`.
- `periods.close.execute`.
- `periods.reopen.request`.
- `periods.reopen.approve`.
- `periods.adjustment.post`.
- `periods.fxRevaluation.post`.

### 28.14 UI Behavior

- صفحة إغلاق الفترة تعرض checklist:
  - المستندات غير المرحلة.
  - القيود غير المتوازنة.
  - فروقات المخزون.
  - pending approvals.
  - exchange rates.
- كل blocker قابل للفتح كرابط للكيان.
- زر `إغلاق مبدئي`.
- زر `إغلاق نهائي`.
- زر `طلب إعادة فتح`.
- لا يظهر زر التنفيذ إلا بعد نجاح validations والموافقة.

### 28.15 Audit Protection

- كل close/reopen يسجل financial_event_log.
- snapshots لا تعدل؛ version جديد فقط.
- سبب reopening إلزامي.
- approval chain محفوظة.
- report exports بعد hard close تحمل snapshot version.

### 28.16 Edge Cases

- مستند بتاريخ قديم بعد soft close:
  - يحتاج override.
- اكتشاف خطأ بعد hard close:
  - reopening رسمي أو قيد تصحيح في الفترة الحالية حسب policy.
- FX rate مفقود:
  - blocker.
- إغلاق فرع دون آخر:
  - يسمح إذا branch isolation مفعل، لكن consolidation لا يغلق حتى كل الفروع مغلقة.

### 28.17 Future Scalability

- multi-book accounting.
- tax closing.
- automated accrual suggestions.
- integration مع external auditors portal.
- period close calendar and SLA.

## 29. Multi-Branch Accounting Architecture

### 29.1 الهدف

دعم شركات التوزيع متعددة الفروع والمخازن مع عزل تشغيلي ومحاسبي واضح، مع إمكانية إصدار قوائم مالية على مستوى الفرع أو الشركة الموحدة.

### 29.2 Branch Models

| Model | الوصف | الاستخدام |
|---|---|---|
| Centralized Posting | كل القيود تدار مركزياً مع branchId | شركة بإدارة مالية مركزية |
| Decentralized Posting | كل فرع يرحل مستنداته ضمن صلاحياته | فروع لها محاسبون |
| Hybrid | المستندات تشغيلية في الفرع، الإغلاق مركزي | الأكثر واقعية |

### 29.3 Database Design

#### branches

- الهدف: الفروع.
- الأعمدة:
  - `id`, `companyId`, `code`, `name`, `governorate`, `address`, `managerEmployeeId?`, `isActive`.
- indexes:
  - unique `companyId, code`.

#### branch_users

- الهدف: ربط المستخدمين بالفروع.
- الأعمدة:
  - `userId`, `branchId`, `scope`: VIEW, OPERATE, MANAGE, ACCOUNTING.
- constraints:
  - لا صلاحية تشغيلية خارج الفروع المرتبطة إلا admin مركزي.

#### branch_accounts

- الهدف: حسابات مخصصة للفرع.
- الأعمدة:
  - `id`, `branchId`, `accountId`, `usageType`.
- usage:
  - CASH.
  - BANK.
  - AR.
  - AP.
  - INVENTORY.
  - DUE_TO.
  - DUE_FROM.

#### branch_periods

- الهدف: إغلاق فرعي.
- الأعمدة:
  - `id`, `branchId`, `periodId`, `financialStatus`, `inventoryStatus`, `closedAt?`.

#### inter_branch_transfers

- الهدف: نقل مالي/مخزني بين فروع.
- الأعمدة:
  - `id`, `companyId`, `number`, `fromBranchId`, `toBranchId`, `date`, `type`, `status`, `notes`.
- lines:
  - product/amount حسب type.

### 29.4 Relationships

- branch -> warehouses.
- branch -> payment accounts.
- branch -> users.
- branch -> documents.
- branch -> journal entries.
- branch -> fiscal period status.
- branch -> numbering sequences.

### 29.5 Branch Isolation Rules

- كل مستند تشغيلي يحتوي `branchId`.
- كل مخزن يتبع فرعاً واحداً.
- كل صندوق/بنك يتبع فرعاً أو يكون مركزي.
- مستخدم الفرع لا يرى مستندات فرع آخر إلا بصلاحية.
- الحسابات العامة يمكن أن تكون مشتركة، لكن journal lines تحمل branchId للتحليل.

### 29.6 Branch-Level Ledgers

- journal_entries تحتوي:
  - `branchId`.
  - `postingBranchId`.
  - `owningBranchId?`.
- journal_lines تحتوي:
  - `branchId`.
  - `counterBranchId?` عند العمليات بين الفروع.
- تقارير الفرع تعتمد على lines.branchId.

### 29.7 Branch Cash/Bank Accounts

- لكل فرع:
  - صندوق IQD.
  - صندوق USD.
  - بنوك حسب الحاجة.
- validations:
  - فاتورة فرع A لا تستخدم صندوق فرع B إلا بصلاحية مركزية.
  - paymentAccount.branchId يجب أن يساوي document.branchId أو يكون central.

### 29.8 Branch Warehouses

- warehouse.branchId إلزامي.
- فاتورة بيع من فرع تستخدم مخازن نفس الفرع.
- نقل بين مخزنين من فرعين مختلفين يعتبر inter-branch transfer.

### 29.9 Inter-Branch Accounting

#### Due-To / Due-From

- عند تحويل مخزون من فرع A إلى فرع B:
  - في فرع A:
    - Debit Due From Branch B.
    - Credit Inventory.
  - في فرع B:
    - Debit Inventory.
    - Credit Due To Branch A.
- الحسابات يجب أن تتطابق في consolidation.

#### Cash Transfer

- من صندوق فرع A إلى فرع B:
  - A:
    - Debit Due From B.
    - Credit Cash A.
  - B:
    - Debit Cash B.
    - Credit Due To A.

### 29.10 Consolidation Engine

- يجمع branch ledgers.
- يستبعد due-to/due-from المتبادلة عند تقرير الشركة.
- يتحقق:
  - Due From A to B = Due To B to A.
  - inter-branch transfers posted في الطرفين.
  - branch periods closed قبل consolidation close.
- outputs:
  - consolidated trial balance.
  - consolidated P&L.
  - consolidated balance sheet.
  - branch comparison.

### 29.11 Numbering Architecture

- document number pattern:
  - `{BRANCH_CODE}-{DOC_TYPE}-{YEAR}-{SEQUENCE}`.
- numbering_sequences:
  - `companyId`, `branchId?`, `documentType`, `fiscalYearId`, `currentValue`.
- lock:
  - row lock على sequence.
- rules:
  - يمنع تكرار الرقم داخل الفرع والسنة والنوع.

### 29.12 Branch-Level Period Locking

- branch period can be:
  - OPEN.
  - SOFT_CLOSED.
  - HARD_CLOSED.
- company period لا يغلق hard حتى كل branch periods hard closed.
- central override يحتاج permission خاص.

### 29.13 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| GET | `/api/branches` | قائمة الفروع |
| POST | `/api/branches` | إنشاء فرع |
| PATCH | `/api/branches/:id` | تعديل فرع |
| POST | `/api/branches/:id/disable` | تعطيل فرع |
| GET | `/api/branches/:id/ledger` | دفتر فرع |
| GET | `/api/branches/:id/financial-statements` | قوائم الفرع |
| POST | `/api/inter-branch-transfers` | إنشاء تحويل بين فروع |
| POST | `/api/inter-branch-transfers/:id/post` | ترحيل تحويل |
| GET | `/api/consolidation/trial-balance` | ميزان موحد |
| POST | `/api/consolidation/reconcile` | مطابقة بين الفروع |

### 29.14 Permissions

- `branches.view`.
- `branches.manage`.
- `branches.accounting.view`.
- `branches.accounting.post`.
- `branches.consolidation.view`.
- `branches.consolidation.close`.
- `interBranchTransfers.create`.
- `interBranchTransfers.post`.

### 29.15 UI Behavior

- branch selector في topbar لمن لديه أكثر من فرع.
- badge واضح للفرع في كل مستند.
- منع تغيير branch بعد إنشاء مستند له lines.
- تقارير تعرض filter branch أو "كل الفروع".
- شاشة reconciliation بين الفروع تعرض:
  - Due To.
  - Due From.
  - differences.
  - unmatched transfers.

### 29.16 Edge Cases

- مستخدم لديه فرعان:
  - يجب اختيار branch عند إنشاء المستند.
- مخزن بلا branch:
  - يمنع استخدامه بعد تفعيل multi-branch.
- تحويل بين فروع بعملتين:
  - ممنوع؛ يستخدم exchange workflow منفصل.
- طرف رحل التحويل والطرف الآخر لم يؤكده:
  - يظهر كـ in-transit ويمنع consolidation close.

### 29.17 Future Scalability

- profit centers.
- cost centers per branch.
- legal entities متعددة.
- branch tax registration.
- branch-specific chart of accounts overlay.

## 30. Enterprise Approval Workflow Architecture

### 30.1 الهدف

تطبيق Maker/Checker وضوابط موافقات متعددة المستويات على العمليات الحساسة، بحيث لا يستطيع منشئ المستند ترحيله أو اعتماده وحده عند وجود مخاطر مالية أو حدود مبالغ.

### 30.2 المبادئ

- maker لا يكون checker لنفس المستند إلا بصلاحية emergency override.
- approval snapshot يحفظ عند الموافقة.
- أي تعديل بعد الموافقة يعيد المستند إلى PENDING_APPROVAL.
- الترحيل ممنوع قبل approval عند policy تتطلب ذلك.
- rejection لا يحذف المستند؛ يعيده إلى rework مع سبب.

### 30.3 Database Design

#### approval_policies

- الهدف: تعريف قواعد الموافقة.
- الأعمدة:
  - `id`, `companyId`, `branchId?`, `documentType`, `name`, `isActive`.
  - `conditionsJson`: amount, currency, risk flags, discount percent, negative stock.
  - `priority`.
- indexes:
  - `documentType, branchId, isActive`.

#### approval_steps

- الهدف: خطوات السياسة.
- الأعمدة:
  - `id`, `policyId`, `stepOrder`, `approvalType`.
  - `roleId?`, `userId?`, `permissionKey?`.
  - `minApprovers`, `slaHours`, `allowDelegation`.
- approvalType:
  - ROLE.
  - USER.
  - PERMISSION.
  - BRANCH_MANAGER.
  - FINANCE_MANAGER.

#### approval_requests

- الهدف: طلب موافقة لمستند.
- الأعمدة:
  - `id`, `companyId`, `branchId?`, `documentType`, `documentId`.
  - `policyId`, `status`: PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED.
  - `requestedById`, `requestedAt`, `completedAt?`.
  - `currentStepOrder`.
- indexes:
  - `documentType, documentId`.
  - `status, requestedAt`.

#### approval_actions

- الهدف: سجل قرارات الموافقة.
- الأعمدة:
  - `id`, `approvalRequestId`, `stepId`, `actorUserId`.
  - `action`: APPROVE, REJECT, DELEGATE, ESCALATE, COMMENT.
  - `reason?`, `createdAt`, `metadataJson`.

#### approval_delegations

- الهدف: تفويض مؤقت.
- الأعمدة:
  - `id`, `fromUserId`, `toUserId`, `permissionScope`, `validFrom`, `validTo`, `isActive`.

### 30.4 Approval States

| State | الوصف |
|---|---|
| NOT_REQUIRED | لا تحتاج موافقة |
| PENDING_APPROVAL | تنتظر أول/خطوة حالية |
| PARTIALLY_APPROVED | اجتازت بعض الخطوات |
| APPROVED | جاهزة للترحيل |
| REJECTED | مرفوضة وتحتاج rework |
| REWORK | عاد للمنشئ للتعديل |
| EXPIRED | انتهت مهلة الموافقة |
| OVERRIDDEN | تم تجاوز الموافقة بصلاحية طارئة |

### 30.5 Conditional Approvals

- أمثلة:
  - خصم مبيعات أكبر من 10%.
  - فاتورة آجلة تتجاوز حد الدين.
  - بيع بمخزون سالب.
  - سند دفع أكبر من مبلغ معين.
  - سند قيد يدوي على حسابات محمية.
  - إعادة فتح فترة مالية.
  - إلغاء مستند مرحل.
- conditions يجب تقييمها server-side.

### 30.6 Workflow

1. Maker creates document.
2. System evaluates approval policies.
3. If no policy: document can proceed.
4. If policy: approval_request created.
5. Document state -> PENDING_APPROVAL.
6. Approver receives notification.
7. Approver approves/rejects/comments.
8. If multi-level: move to next step.
9. If final approved: document state -> APPROVED.
10. PostingService allows posting.
11. Audit records all actions.

### 30.7 Rejection/Rework

- reject requires reason.
- document returns to REWORK.
- maker edits.
- system invalidates previous approvals.
- new approval request created.

### 30.8 Escalation and SLA

- approval step has `slaHours`.
- background job detects overdue.
- escalation:
  - notify next-level role.
  - mark step as ESCALATED.
  - optionally add emergency approver.
- expired approvals require resubmission.

### 30.9 Emergency Override

- permission: `approvals.override.emergency`.
- requires:
  - reason.
  - password re-check/MFA.
  - financial audit event.
  - notification to admin/finance manager.
- overridden document remains flagged in reports.

### 30.10 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| GET | `/api/approval-policies` | سياسات الموافقة |
| POST | `/api/approval-policies` | إنشاء سياسة |
| PATCH | `/api/approval-policies/:id` | تعديل سياسة |
| POST | `/api/approval-requests` | إنشاء طلب موافقة |
| GET | `/api/approval-requests/my` | طلبات بانتظار المستخدم |
| POST | `/api/approval-requests/:id/approve` | موافقة |
| POST | `/api/approval-requests/:id/reject` | رفض |
| POST | `/api/approval-requests/:id/delegate` | تفويض |
| POST | `/api/approval-requests/:id/override` | تجاوز طارئ |

### 30.11 Security Rules

- approver لا يوافق على مستند أنشأه إذا policy تمنع self-approval.
- delegated approver يجب أن يملك نطاق التفويض.
- approval action immutable.
- لا يمكن تعديل policy بأثر رجعي على requests قديمة.
- policy version محفوظ داخل approval_request.

### 30.12 Posting Restrictions

- PostingService يتحقق:
  - إذا approval required و status != APPROVED => reject.
  - إذا document changed after approval => reject.
  - إذا approval expired => reject.
- simulation يسمح بعرض القيد لكن لا يرحل.

### 30.13 UI Behavior

- شريط حالة أعلى المستند:
  - يحتاج موافقة.
  - بانتظار فلان/دور.
  - موافق عليه.
  - مرفوض.
- أزرار:
  - إرسال للموافقة.
  - موافقة.
  - رفض.
  - تعليق.
  - تفويض.
  - تجاوز طارئ.
- شاشة "موافقاتي":
  - filter by document type, branch, overdue.
  - preview مالي قبل الموافقة.

### 30.14 Edge Cases

- approver غائب:
  - delegation أو escalation.
- policy تغيرت أثناء request:
  - request يستخدم version القديم.
- document deleted/cancelled:
  - approval request cancelled.
- amount تغير بعد approval:
  - approval invalidated.

### 30.15 Future Scalability

- BPMN-like workflow designer.
- mobile approvals.
- risk scoring engine.
- AI anomaly explanation before approval.
- integration مع email/WhatsApp notifications.

## 31. Reporting & BI Architecture

### 31.1 الهدف

بناء طبقة تقارير مؤسسية تفصل بين قواعد التشغيل اليومية والاستعلامات التحليلية الثقيلة، مع الحفاظ على auditability والتطابق مع دفتر الأستاذ.

### 31.2 Reporting Layers

| Layer | الهدف |
|---|---|
| Operational Reports | تقارير مباشرة من الجداول التشغيلية |
| Ledger Reports | تقارير مالية من journal_lines |
| Reporting Projections | جداول مجمعة محدثة بالأحداث |
| Materialized Views | تقارير ثقيلة قابلة للتحديث |
| Snapshot Reports | تقارير فترة مغلقة ثابتة |
| BI Warehouse | طبقة OLAP مستقبلية |

### 31.3 Database Design

#### report_jobs

- الأعمدة:
  - `id`, `companyId`, `requestedById`, `reportType`, `filtersJson`.
  - `status`: QUEUED, RUNNING, COMPLETED, FAILED, EXPIRED.
  - `resultFileId?`, `errorMessage?`, `createdAt`, `startedAt?`, `finishedAt?`.

#### report_snapshots

- الأعمدة:
  - `id`, `companyId`, `branchId?`, `periodId?`, `reportType`, `filtersHash`.
  - `snapshotVersion`, `dataJson`, `sourceHash`, `createdAt`.
- rules:
  - تقارير hard close تستخدم snapshot ولا تعيد الحساب من بيانات تغيرت.

#### report_cache_entries

- الأعمدة:
  - `id`, `cacheKey`, `scope`, `dataJson`, `expiresAt`, `createdAt`.
- invalidation:
  - عند financial.posted.
  - عند financial.reversed.
  - عند stock.moved.
  - عند period.closed.

#### kpi_definitions

- الأعمدة:
  - `id`, `key`, `name`, `formulaJson`, `permissionKey`, `refreshInterval`.

#### kpi_values

- الأعمدة:
  - `id`, `kpiKey`, `companyId`, `branchId?`, `periodId?`, `value`, `currency?`, `calculatedAt`.

### 31.4 Reporting Pipeline

1. User requests report.
2. Validate permissions.
3. Normalize filters.
4. Build filters hash.
5. Check snapshot if period closed.
6. Check cache if live report.
7. Execute query or enqueue job.
8. Validate totals against ledger.
9. Store cache/snapshot if needed.
10. Return data or job id.

### 31.5 Enterprise Reporting Engine

- components:
  - ReportRegistry.
  - ReportQueryBuilder.
  - ReportPermissionGuard.
  - ReportCacheManager.
  - ReportExportManager.
  - ReportValidationEngine.
- كل report يعرّف:
  - required permissions.
  - source tables.
  - supported filters.
  - max sync rows.
  - export formats.
  - reconciliation checks.

### 31.6 OLAP-ready Architecture

- dimensions:
  - date.
  - branch.
  - warehouse.
  - product.
  - customer.
  - supplier.
  - account.
  - currency.
  - governorate.
  - sales agent.
- facts:
  - fact_sales.
  - fact_purchases.
  - fact_inventory_movements.
  - fact_journal_lines.
  - fact_payments.
- rules:
  - facts append/update via outbox events.
  - closed period facts frozen by snapshot version.

### 31.7 Multi-Currency Reporting

- report modes:
  - Native Currency: يعرض كل عملة منفصلة.
  - Base IQD Equivalent: يحول بسعر snapshot للمستند.
  - Closing Rate Equivalent: للتقارير المالية عند الإغلاق.
- validations:
  - لا جمع مباشر بين IQD و USD دون mode واضح.
  - كل سطر يوضح currency والrate basis.

### 31.8 Branch Consolidation Reports

- prerequisites:
  - branch periods closed.
  - due-to/due-from reconciled.
  - inter-branch in-transit resolved.
- reports:
  - consolidated trial balance.
  - consolidated P&L.
  - branch profitability.
  - branch inventory ownership.

### 31.9 Async Export Architecture

- synchronous:
  - تقارير صغيرة أقل من threshold.
- async:
  - Excel/PDF كبير.
  - report_job queued.
  - notification عند الاكتمال.
- export security:
  - file expires.
  - signed download URL.
  - export audit.
  - watermark للمستخدم والتاريخ في PDF.

### 31.10 Scheduled Reporting Jobs

- أمثلة:
  - تقرير ديون يومي.
  - أرصدة مخزون صباحية.
  - P&L أسبوعي.
  - reconciliation nightly.
- tables:
  - `scheduled_reports`: schedule, filters, recipients, format.
  - `scheduled_report_runs`: status, result, errors.

### 31.11 Reporting Validation Engine

- checks:
  - P&L revenue total = ledger revenue accounts.
  - stock valuation report = inventory accounts after reconciliation policy.
  - AR aging total = AR ledger.
  - AP aging total = AP ledger.
  - cash report = cash accounts ledger.
- أي mismatch يظهر report warning ولا يخفى.

### 31.12 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| POST | `/api/reports/run` | تشغيل تقرير |
| POST | `/api/reports/export` | طلب تصدير |
| GET | `/api/report-jobs/:id` | حالة وظيفة تقرير |
| GET | `/api/reports/kpis` | KPIs |
| POST | `/api/reports/cache/invalidate` | إبطال cache |
| GET | `/api/reports/snapshots` | snapshots |
| POST | `/api/scheduled-reports` | جدولة تقرير |

### 31.13 UI Behavior

- Report builder:
  - filters panel.
  - saved views.
  - columns selector.
  - export menu.
  - validation status badge.
- Heavy report:
  - يظهر "سيتم إرساله عند الانتهاء".
- Snapshot report:
  - badge "نسخة مغلقة".
  - snapshot version.

### 31.14 Performance Rules

- keyset pagination للتقارير التفصيلية.
- materialized views للتجميع الشهري.
- cache per filtersHash + permission scope.
- منع reports غير محددة التاريخ على جداول ضخمة.
- query timeout مع رسالة مفهومة.

### 31.15 Future Scalability

- read replica للتقارير.
- columnar warehouse.
- external BI connector.
- semantic metrics layer.
- row-level security للـ BI.

## 32. Advanced Inventory Valuation Engine

### 32.1 الهدف

تقييم المخزون يجب أن يكون قابلاً للتدقيق، قابلاً لإعادة الحساب، ومتوافقاً مع أثر محاسبي واضح. النظام يبدأ بـ Weighted Average لكنه يبنى بطريقة تسمح بـ FIFO والدفعات والسيريالات لاحقاً.

### 32.2 Valuation Methods

| Method | الحالة | الوصف |
|---|---|---|
| Weighted Average | أساسي | متوسط متحرك حسب المادة/المخزن |
| FIFO | جاهزية مستقبلية | استهلاك طبقات الأقدم أولاً |
| Batch Costing | مستقبل قريب | تكلفة حسب batch |
| Serial Costing | مستقبل | تكلفة لكل serial |

### 32.3 Database Design

#### inventory_valuation_layers

- الهدف: طبقات تكلفة للمخزون.
- الأعمدة:
  - `id`, `companyId`, `branchId?`, `warehouseId`, `productId`.
  - `sourceType`, `sourceId`, `sourceLineId`.
  - `quantityIn`, `quantityRemaining`.
  - `unitCost`, `totalCost`, `currency`, `exchangeRateSnapshot`.
  - `batchNo?`, `serialNo?`, `expiryDate?`.
  - `createdAt`.
- indexes:
  - `productId, warehouseId, createdAt`.
  - `productId, warehouseId, quantityRemaining`.
  - `batchNo`, `expiryDate`.

#### inventory_cost_allocations

- الهدف: ربط حركة خروج بطبقات التكلفة.
- الأعمدة:
  - `id`, `outMovementId`, `valuationLayerId`, `quantity`, `unitCost`, `totalCost`.
- rules:
  - ضروري لـ FIFO.
  - مفيد للتدقيق حتى في weighted average.

#### cost_recalculation_runs

- الهدف: تشغيل إعادة حساب تكلفة.
- الأعمدة:
  - `id`, `companyId`, `scopeType`, `scopeId`, `fromDate`, `status`, `startedById`, `startedAt`, `finishedAt?`, `summaryJson`.

#### cost_adjustment_entries

- الهدف: فروقات تكلفة بأثر محاسبي.
- الأعمدة:
  - `id`, `companyId`, `productId`, `warehouseId`, `reason`, `amount`, `currency`, `journalEntryId?`, `createdAt`.

#### stock_reservations

- الهدف: حجز كميات للمبيعات أو أوامر مستقبلية.
- الأعمدة:
  - `id`, `companyId`, `productId`, `warehouseId`, `sourceType`, `sourceId`, `quantity`, `status`, `expiresAt?`.
- statuses:
  - ACTIVE.
  - CONSUMED.
  - RELEASED.
  - EXPIRED.

### 32.4 Weighted Average Engine

#### Purchase IN Algorithm

```text
oldQty = current balance quantity
oldAvg = current average cost
inQty = purchase quantity
inCost = final unit cost after landed cost
newAvg = ((oldQty * oldAvg) + (inQty * inCost)) / (oldQty + inQty)
```

- يحفظ:
  - stock_movement.unitCost = inCost.
  - stock_balance.averageCost = newAvg.
  - valuation layer للكمية الداخلة.

#### Sales OUT Algorithm

```text
outCost = current averageCost
cogs = quantity * outCost
```

- journal:
  - Debit COGS.
  - Credit Inventory.
- لا يغير averageCost.

### 32.5 FIFO-ready Architecture

- كل دخول ينشئ valuation layer.
- كل خروج يستهلك من أقدم layer حسب:
  - expiry first إذا expiry-aware policy.
  - ثم createdAt.
- cost allocation يحفظ link بين out movement و layers.
- journal COGS = مجموع allocations.

### 32.6 Landed Cost Redistribution

- مصاريف الشراء توزع حسب policy:
  - BY_VALUE.
  - BY_QUANTITY.
  - BY_WEIGHT future.
  - MANUAL.
- validations:
  - مجموع expenseShare = totalExpenses.
  - لا line finalCost سالب.
  - currency conversion snapshot محفوظ.
- إذا أضيفت مصاريف بعد بيع جزء من البضاعة:
  - لا تعديل على فاتورة الشراء المرحلة.
  - إنشاء cost adjustment:
    - جزء للمخزون المتبقي يزيد Inventory.
    - جزء للبضاعة المباعة يزيد COGS.

### 32.7 Retroactive Cost Adjustments

- triggers:
  - فاتورة مصاريف لاحقة.
  - تصحيح تكلفة شراء.
  - خصم مورد بعد الشراء.
- workflow:
  1. إنشاء adjustment request.
  2. تحديد affected layers.
  3. حساب sold vs remaining quantities.
  4. بناء journal adjustment.
  5. تحديث valuation layers بقيم adjustment لا تعديل الأصل.
  6. audit.
- journal:
  - إذا زيادة تكلفة:
    - Debit Inventory للمتبقي.
    - Debit COGS للمباع.
    - Credit AP/Cash/Adjustment Clearing.
  - إذا تخفيض تكلفة:
    - عكس ذلك.

### 32.8 Negative Stock Recovery

- الأصل: السالب ممنوع.
- إذا سمح بسالب:
  - الخروج يستخدم provisional cost.
  - عند دخول لاحق، يحسب فرق التكلفة.
  - ينشئ cost correction journal.
- audit:
  - من سمح بالسالب.
  - المادة والمخزن.
  - provisional cost.
  - recovery cost.

### 32.9 Reservation System

- available stock:

```text
available = onHand - reserved - blocked
```

- reserved:
  - فواتير مبيعات مسودة مؤكدة.
  - أوامر تجهيز مستقبلية.
- rules:
  - reservation expires حسب setting.
  - posting invoice consumes reservation.
  - cancelling draft releases reservation.

### 32.10 Batch/Serial Costing

- batch:
  - كل batch له cost layer.
  - البيع يمكن أن يحدد batch أو يختار FEFO.
- serial:
  - quantity = 1 لكل serial.
  - cost exact.
- validations:
  - serial لا يباع مرتين.
  - expired batch يمنع بيعه أو يحتاج override.

### 32.11 Expiry-aware Costing

- FEFO:
  - First Expiry First Out.
- applicable للمواد ذات expiry.
- UI يعرض:
  - batches المتاحة.
  - expiry dates.
  - تحذير قرب الانتهاء.

### 32.12 Valuation Snapshots

- عند period close:
  - snapshot quantity/value per product/warehouse.
- لا يعاد حساب فترة مغلقة دون reopening.
- تقارير المخزون التاريخية تستخدم snapshot.

### 32.13 Inventory Reconciliation Engine

- checks:
  - stock_balance = sum(stock_movements).
  - valuation layers remaining = stock_balance quantity.
  - inventory ledger value = accounting inventory accounts.
  - negative stock exceptions approved.
- outputs:
  - differences by product/warehouse.
  - suggested correction document.

### 32.14 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| GET | `/api/inventory/valuation` | تقرير تقييم |
| GET | `/api/inventory/layers` | طبقات التكلفة |
| POST | `/api/inventory/cost-adjustments` | إنشاء تعديل تكلفة |
| POST | `/api/inventory/cost-recalculations` | تشغيل إعادة حساب |
| POST | `/api/inventory/reservations` | حجز كمية |
| POST | `/api/inventory/reservations/:id/release` | فك حجز |
| POST | `/api/inventory/reconcile` | مطابقة مخزون |

### 32.15 Locking Rules

- lock stock_balance للمنتج/المخزن قبل أي movement.
- lock valuation layers عند FIFO consumption.
- period closed يمنع recalculation داخلها.
- cost recalculation يمنع posting موازي لنفس product/warehouse scope.

### 32.16 Performance Considerations

- stock_balances لتجنب sum دائم.
- valuation layers indexes.
- batch operations للحركات الكبيرة.
- materialized inventory valuation للـ dashboard.
- archiving لحركات قديمة مع snapshots.

### 32.17 Future Scalability

- multiple valuation books.
- standard cost.
- manufacturing BOM costing.
- landed cost templates.
- warehouse zones and bin-level costing.

## 33. Enterprise Reliability & Recovery Architecture

### 33.1 الهدف

ضمان أن النظام يبقى قابلاً للتشغيل والاستعادة والتحقق حتى عند فشل jobs، انقطاع الشبكة، أخطاء بشرية، أو فساد بيانات جزئي.

### 33.2 Queue System

- queue types:
  - reporting exports.
  - outbox events.
  - reconciliation jobs.
  - scheduled reports.
  - cache refresh.
  - notification jobs.
- job fields:
  - id, type, payloadJson, status, attempts, maxAttempts, nextRunAt, lockedBy, lockedUntil.
- states:
  - QUEUED.
  - RUNNING.
  - RETRYING.
  - FAILED.
  - DEAD_LETTER.
  - COMPLETED.

### 33.3 Retry Engine

- retry فقط للعمليات idempotent.
- exponential backoff.
- max attempts حسب job type.
- dead letter queue بعد الفشل النهائي.
- financial posting لا يعاد تلقائياً إذا كان الفشل business validation.

### 33.4 Distributed Locking

- يستخدم:
  - database advisory locks أو table locks.
  - lock TTL.
  - owner token.
- lock scopes:
  - posting.
  - closing.
  - report snapshot generation.
  - cost recalculation.
  - queue worker.

### 33.5 Integrity Verification Jobs

- nightly:
  - journal balance.
  - source/journal links.
  - stock balances.
  - AR/AP balances.
  - payment account balances.
  - audit gaps.
- weekly:
  - deep ledger scan.
  - old orphan detection.
  - report snapshot hash verification.

### 33.6 Orphan Detection

- types:
  - source POSTED بلا journal.
  - journal sourceType/sourceId غير موجود.
  - stock movement source غير موجود.
  - payment linked to deleted invoice.
  - audit log entity missing.
- action:
  - log FAIL.
  - alert admin.
  - block period close if financial.

### 33.7 Corruption Detection

- checks:
  - negative amounts where impossible.
  - duplicate document numbers.
  - account currency mismatch.
  - journal line without account.
  - stock balance not matching movements.
  - modified posted document updatedAt after postedAt without reversal.

### 33.8 Financial Self-Healing Strategies

- مسموح:
  - rebuild cache balances من journal_lines.
  - rebuild stock_balances من stock_movements.
  - republish outbox events.
  - refresh materialized views.
- ممنوع تلقائياً:
  - إنشاء journal correction دون موافقة.
  - تعديل journal posted.
  - حذف orphan مالي.
- self-healing يحتاج audit خاص.

### 33.9 Backup Strategy

- daily full backups.
- point-in-time recovery عبر WAL.
- backup encryption.
- backup restore drills شهرياً.
- retention:
  - daily 30 days.
  - monthly 12 months.
  - yearly 7 years للبيانات المالية.

### 33.10 Disaster Recovery

- RPO:
  - هدف فقدان بيانات أقل من 15 دقيقة في production.
- RTO:
  - هدف عودة الخدمة أقل من 4 ساعات.
- runbook:
  - identify incident.
  - freeze writes if needed.
  - restore DB.
  - run integrity checks.
  - compare latest posting_operations.
  - resume service.

### 33.11 Structured Logging

- كل log يحتوي:
  - requestId.
  - userId.
  - companyId.
  - branchId.
  - action.
  - entity.
  - durationMs.
  - errorCode.
- لا تسجل:
  - passwords.
  - session tokens.
  - secrets.

### 33.12 Monitoring Architecture

- metrics:
  - posting duration.
  - posting failures.
  - queue depth.
  - report job duration.
  - DB slow queries.
  - deadlocks.
  - login failures.
  - reconciliation failures.
- dashboards:
  - system health.
  - finance integrity.
  - queue health.
  - security events.

### 33.13 Alerting Architecture

- high severity:
  - unbalanced posted journal.
  - source POSTED بلا journal.
  - backup failed.
  - reconciliation fail.
  - suspicious posting spike.
- medium:
  - queue backlog.
  - report failures.
  - high login failures.
- channels:
  - in-app.
  - email future.
  - webhook future.

### 33.14 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| GET | `/api/system/health` | صحة النظام |
| GET | `/api/system/jobs` | jobs |
| POST | `/api/system/jobs/:id/retry` | retry |
| GET | `/api/system/integrity` | نتائج الفحوصات |
| POST | `/api/system/integrity/run` | تشغيل فحص |
| GET | `/api/system/backups` | حالة النسخ |
| POST | `/api/system/cache/rebuild` | إعادة بناء cache بصلاحية |

### 33.15 Security Rules

- system APIs محصورة بـ `system.admin`.
- retry job لا يسمح بتغيير payload.
- integrity failures لا تخفى عن admin.
- backup operations تحتاج privileged approval.

### 33.16 UI Behavior

- صفحة System Health:
  - queue depth.
  - آخر backup.
  - آخر reconciliation.
  - alerts.
- صفحة Integrity:
  - check results.
  - severity.
  - affected entity links.
  - suggested action.

### 33.17 Future Scalability

- separate worker process.
- read replicas.
- external monitoring.
- distributed tracing.
- automated failover.

## 34. Enterprise Security Hardening

### 34.1 الهدف

رفع أمان GRASS ERP من حماية تسجيل دخول وصلاحيات إلى طبقة أمن مؤسسية تمنع الاحتيال، تراقب السلوك المالي، تحمي الصادرات، وتضمن عدم قابلية audit والقيود المالية للتلاعب.

### 34.2 MFA Architecture

- MFA مطلوب للعمليات:
  - login للمستخدمين ذوي الصلاحيات المالية العالية.
  - posting manual journal.
  - period reopening.
  - emergency override.
  - permission changes.
  - large payment vouchers.
- methods:
  - TOTP.
  - recovery codes.
  - email OTP future.
- tables:
  - `user_mfa_factors`: userId, type, secretEncrypted, isActive.
  - `mfa_challenges`: userId, purpose, expiresAt, consumedAt.

### 34.3 Device Trust

- trusted_devices:
  - `id`, `userId`, `deviceFingerprintHash`, `name`, `lastUsedAt`, `trustedUntil`, `revokedAt`.
- rules:
  - جهاز جديد لصلاحيات مالية عالية يحتاج MFA.
  - revoke device من صفحة الأمان.
  - device fingerprint لا يخزن raw.

### 34.4 Session Trust

- session risk score:
  - IP جديد.
  - جهاز جديد.
  - وقت غير معتاد.
  - عمليات مالية كبيرة.
- high risk:
  - step-up verification.
  - read-only until verification.
- session invalidation:
  - password change.
  - role change حساس.
  - account disabled.

### 34.5 IP Restrictions

- company_ip_policies:
  - allowed CIDRs.
  - blocked CIDRs.
  - appliesTo roles/permissions.
- financial operations يمكن حصرها داخل شبكة الشركة.
- override يحتاج emergency approval.

### 34.6 Financial Verification Layers

- طبقات:
  - permission check.
  - approval check.
  - MFA/step-up check.
  - risk score check.
  - period lock check.
  - integrity guard check.
- لا تكفي صلاحية واحدة للعمليات الحساسة.

### 34.7 Privileged Operation Approval

- العمليات:
  - منح admin role.
  - تعديل حساب نظامي.
  - reopening period.
  - حذف/تعطيل مستخدم مالي.
  - export شامل للبيانات المالية.
- workflow:
  - request.
  - approval by separate privileged user.
  - MFA.
  - audit.

### 34.8 Append-only Audit Storage

- audit_logs append-only.
- لا update/delete من application.
- يمكن استخدام database permissions لمنع update/delete.
- audit archive:
  - write-once storage future.
  - hash chain.

### 34.9 Audit Immutability

- signed audit event:
  - event payload.
  - previousHash.
  - currentHash.
  - signedByServiceKeyId.
- verification job:
  - يقرأ السلسلة.
  - يكشف أي تعديل.
- financial events أعلى أولوية.

### 34.10 Anti-Fraud Monitoring

- signals:
  - فواتير ملغاة بكثرة.
  - خصومات عالية متكررة.
  - سندات قيد يدوية خارج أوقات العمل.
  - تجاوزات حد دين.
  - مخزون سالب متكرر.
  - تغيير سعر صرف ثم ترحيل عمليات كبيرة.
  - exports كبيرة من مستخدم غير معتاد.
- output:
  - fraud_alerts.
  - risk score.
  - required review.

### 34.11 Suspicious Posting Detection

- rules:
  - posting بعد منتصف الليل لمبلغ كبير.
  - manual journal على حساب cash/bank.
  - reversal ثم repost بقيمة مختلفة.
  - multiple failed posting attempts.
  - posting بفترة قديمة.
- actions:
  - allow with flag.
  - require approval.
  - block.
  - notify finance admin.

### 34.12 Secure Export Controls

- export permissions تفصيلية:
  - `reports.export.basic`.
  - `reports.export.financial`.
  - `reports.export.personalData`.
  - `reports.export.fullLedger`.
- controls:
  - watermark.
  - expiry.
  - download audit.
  - max rows.
  - approval للـ full ledger.
  - masking لبعض الحقول حسب role.

### 34.13 Encryption Strategy

- at rest:
  - database disk encryption حسب البيئة.
  - secrets encrypted.
  - MFA secrets encrypted على مستوى التطبيق.
- in transit:
  - HTTPS فقط.
- field-level encryption:
  - MFA secrets.
  - recovery codes.
  - sensitive integration tokens.

### 34.14 Secrets Architecture

- لا secrets في الكود.
- env vars في runtime.
- rotation policy.
- service key ids.
- audit عند تغيير secret config.
- production secrets منفصلة عن development.

### 34.15 Internal Service Authorization

- background workers يستخدمون service identity.
- كل service action يسجل actor:
  - user initiated.
  - system initiated.
- service permissions محدودة.
- لا worker يملك permission لتعديل posted journals.

### 34.16 Signed Financial Events

- events:
  - journal.posted.
  - journal.reversed.
  - period.closed.
  - period.reopened.
  - exchange.rate.created.
- signature:
  - payload canonical JSON.
  - hash.
  - service private key.
- verification:
  - عند audit review.
  - ضمن integrity jobs.

### 34.17 Database Design

#### security_events

- الأعمدة:
  - `id`, `companyId`, `userId?`, `eventType`, `riskScore`, `detailsJson`, `ipAddress`, `userAgent`, `createdAt`.

#### fraud_alerts

- الأعمدة:
  - `id`, `companyId`, `branchId?`, `alertType`, `severity`, `entityType`, `entityId`, `status`, `assignedToId?`, `detailsJson`, `createdAt`, `resolvedAt?`.

#### signed_events

- الأعمدة:
  - `id`, `eventType`, `entityType`, `entityId`, `payloadHash`, `previousHash`, `signature`, `keyId`, `createdAt`.

#### export_logs

- الأعمدة:
  - `id`, `companyId`, `userId`, `reportType`, `filtersHash`, `rowCount`, `fileId`, `downloadedAt?`, `ipAddress`, `createdAt`.

### 34.18 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| POST | `/api/security/mfa/setup` | إعداد MFA |
| POST | `/api/security/mfa/verify` | تحقق MFA |
| GET | `/api/security/devices` | الأجهزة الموثوقة |
| POST | `/api/security/devices/:id/revoke` | إلغاء جهاز |
| GET | `/api/security/events` | أحداث أمنية |
| GET | `/api/security/fraud-alerts` | تنبيهات احتيال |
| POST | `/api/security/fraud-alerts/:id/resolve` | معالجة تنبيه |
| POST | `/api/security/step-up` | تحقق إضافي |
| GET | `/api/security/export-logs` | سجل الصادرات |

### 34.19 UI Behavior

- صفحة أمان المستخدم:
  - MFA.
  - الأجهزة.
  - الجلسات.
  - آخر نشاط.
- شاشة تنبيهات أمنية:
  - severity.
  - entity link.
  - recommended action.
- عند عملية حساسة:
  - dialog تحقق إضافي.
  - سبب إلزامي.
  - عرض أثر العملية قبل التنفيذ.

### 34.20 Performance Rules

- risk scoring سريع ومحدود داخل request.
- التحليلات الثقيلة للغش في background jobs.
- indexes على security_events by user/date/type.
- export logs لا تعطل export job.

### 34.21 Future Scalability

- SSO/SAML.
- hardware security keys.
- SIEM integration.
- immutable external audit vault.
- machine learning anomaly scoring.
- fine-grained data masking.

## 35. Financial Closing Engine Architecture

### 35.1 الهدف

هذا القسم يضيف طبقة تنفيذية تفصيلية لمحرك الإغلاق المالي فوق معمارية الفترات والإغلاق السابقة. الهدف هو تحويل Month-End و Year-End Closing إلى workflow محكوم، قابل للتدقيق، قابل للإعادة الآمنة، ويمنع أي أثر مالي أو مخزني غير مكتمل من دخول فترة مغلقة.

### 35.2 Closing Engine Components

| Component | الهدف | المخرجات |
|---|---|---|
| `ClosingOrchestrator` | تنسيق مراحل الإغلاق | closing run state |
| `ClosingValidationEngine` | فحص blockers والتحذيرات | validation results |
| `UnpostedDocumentScanner` | اكتشاف المستندات غير المرحلة | blocker list |
| `LedgerFreezeService` | تجميد balances التاريخية | closing snapshots |
| `ClosingJournalBuilder` | إنشاء قيود الإقفال | journal drafts |
| `FXRevaluationService` | إعادة تقييم العملات | FX journals |
| `CarryForwardService` | ترحيل الأرصدة | opening balances |
| `PeriodLockService` | إدارة soft/hard locks | period statuses |
| `ClosingApprovalService` | ربط الإغلاق بالموافقات | approval request |
| `ClosingRollbackGuard` | منع rollback غير آمن | recovery plan |

### 35.3 Database Impact

#### financial_closing_runs

- الهدف: رأس عملية الإغلاق.
- الأعمدة:
  - `id`, `companyId`, `branchId?`, `fiscalYearId`, `periodId?`.
  - `closingType`: MONTH_END, YEAR_END, ADJUSTMENT_PERIOD.
  - `closeMode`: SOFT_CLOSE, HARD_CLOSE.
  - `status`: DRAFT, VALIDATING, BLOCKED, READY_FOR_APPROVAL, APPROVED, CLOSING, CLOSED, FAILED, REOPEN_REQUESTED, REOPENED.
  - `startedById`, `approvedById?`, `closedById?`.
  - `startedAt`, `approvedAt?`, `closedAt?`.
  - `snapshotVersion`.
  - `failureCode?`, `failureDetailsJson?`.
- indexes:
  - unique `companyId, branchId, periodId, closingType, snapshotVersion`.
  - `status, startedAt`.

#### financial_closing_tasks

- الهدف: مهام الإغلاق التفصيلية.
- الأعمدة:
  - `id`, `closingRunId`, `taskCode`, `taskName`.
  - `status`: PENDING, RUNNING, PASSED, WARNING, BLOCKED, FAILED, SKIPPED.
  - `startedAt?`, `finishedAt?`, `resultJson?`.
- task codes:
  - SCAN_UNPOSTED_DOCUMENTS.
  - VALIDATE_JOURNALS.
  - RECONCILE_INVENTORY.
  - RECONCILE_AR_AP.
  - REVALUE_FX.
  - BUILD_CLOSING_ENTRIES.
  - FREEZE_BALANCES.
  - LOCK_PERIOD.

#### financial_closing_snapshots

- الهدف: تجميد أرصدة تاريخية قابلة للتقرير.
- الأعمدة:
  - `id`, `closingRunId`, `snapshotType`.
  - `companyId`, `branchId?`, `periodId`, `accountId?`, `productId?`, `warehouseId?`, `currency`.
  - `openingAmount`, `debitMovement`, `creditMovement`, `closingAmount`.
  - `quantityOpening?`, `quantityMovementIn?`, `quantityMovementOut?`, `quantityClosing?`.
  - `sourceHash`, `createdAt`.
- rules:
  - append-only.
  - لا تعدل snapshot قديم؛ ينشأ version جديد بعد reopening/re-close.

#### financial_closing_journals

- الهدف: ربط قيود الإغلاق بالتشغيل.
- الأعمدة:
  - `id`, `closingRunId`, `journalEntryId`, `journalType`.
- journalType:
  - TEMPORARY_ACCOUNT_CLOSE.
  - RETAINED_EARNINGS_TRANSFER.
  - FX_REVALUATION.
  - ADJUSTMENT_PERIOD_ENTRY.
  - OPENING_CARRY_FORWARD.

### 35.4 Month-End Closing Workflow

1. إنشاء `financial_closing_run`.
2. وضع الفترة في حالة `CLOSING_IN_PROGRESS`.
3. منع posting جديد داخل نفس الفترة باستثناء مستخدم closing engine.
4. تشغيل UnpostedDocumentScanner.
5. فحص القيود:
   - balanced journals.
   - currency isolation.
   - source links.
6. مطابقة الصناديق والبنوك.
7. مطابقة AR/AP.
8. مطابقة المخزون مع الحسابات.
9. تشغيل FX Revaluation إذا السياسة مفعلة.
10. إنشاء adjustment journals إن وجدت فترة تسويات.
11. إنشاء historical balance snapshots.
12. إرسال close approval.
13. عند الموافقة:
   - Soft Close أو Hard Close.
14. نشر events للتقارير.

### 35.5 Year-End Closing Workflow

1. التأكد أن كل periods في السنة hard closed أو جاهزة للإغلاق النهائي.
2. تشغيل trial balance نهائي.
3. إغلاق الحسابات المؤقتة:
   - REVENUE.
   - EXPENSE.
   - COGS.
   - DISCOUNT.
   - FX_GAIN_LOSS.
4. بناء حساب Income Summary.
5. نقل صافي الربح أو الخسارة إلى Retained Earnings.
6. إنشاء carry-forward balances للسنة الجديدة.
7. فتح السنة الجديدة بحالة OPEN.
8. تجميد السنة السابقة بحالة CLOSED.

### 35.6 Closing Journal Generation

#### Temporary Accounts Closing

- لكل حساب إيراد:
  - Debit: Revenue account.
  - Credit: Income Summary.
- لكل حساب مصروف:
  - Debit: Income Summary.
  - Credit: Expense account.
- يمنع الإقفال إذا الحساب المؤقت يحمل currency مختلفة دون قيد منفصل.

#### Retained Earnings Transfer

- إذا Income Summary credit balance:
  - Debit: Income Summary.
  - Credit: Retained Earnings.
- إذا Income Summary debit balance:
  - Debit: Retained Earnings.
  - Credit: Income Summary.

#### Carry-forward Balances

- Balance sheet accounts فقط.
- كل currency منفصلة.
- opening entry للسنة الجديدة:
  - يحافظ على debit/credit orientation.
  - يربط بـ closingRunId.

### 35.7 Adjustment Periods

- فترة تسوية اختيارية بين نهاية السنة وبداية السنة الجديدة.
- تستخدم لقيود المدقق أو التسويات النهائية.
- rules:
  - لا تقبل فواتير تشغيلية.
  - تقبل فقط manual adjustment journals بصلاحية.
  - لا تؤثر على تواريخ الفواتير الأصلية.
  - تظهر في التقارير كسطر مستقل "تسويات الإقفال".

### 35.8 Period Freeze and Lock Hierarchy

| Level | الوصف | من يتأثر |
|---|---|---|
| Document Freeze | منع تعديل مستندات محددة | source documents |
| Posting Freeze | منع ترحيل جديد | posting engine |
| Inventory Freeze | منع حركات مخزون | inventory engine |
| Soft Close | منع العمليات العادية مع override | users |
| Hard Close | منع كامل إلا reopening | all services |
| Year Freeze | تجميد السنة | reporting and posting |

### 35.9 Validations

- كل journal في الفترة balanced.
- لا توجد مستندات DRAFT/PENDING_APPROVAL/POSTING_FAILED لها تاريخ داخل الفترة.
- لا توجد stock movements بلا journal عند أثر مالي.
- stock valuation يطابق inventory accounts ضمن tolerance.
- AR aging total يطابق AR ledger.
- AP aging total يطابق AP ledger.
- cash/bank ledger يطابق payment account derived balances.
- exchange rate closing موجود لكل currency مطلوبة.
- approval requests الحساسة مكتملة.
- لا توجد jobs حرجة RUNNING للفترة.

### 35.10 APIs

| Method | Endpoint | الهدف | Permission |
|---|---|---|---|
| POST | `/api/financial-closing/month-end/start` | بدء إغلاق شهري | `closing.month.start` |
| POST | `/api/financial-closing/year-end/start` | بدء إغلاق سنوي | `closing.year.start` |
| POST | `/api/financial-closing/:id/validate` | تشغيل validations | `closing.validate` |
| POST | `/api/financial-closing/:id/approve` | موافقة الإغلاق | `closing.approve` |
| POST | `/api/financial-closing/:id/execute` | تنفيذ الإغلاق | `closing.execute` |
| POST | `/api/financial-closing/:id/reopen-request` | طلب إعادة فتح | `closing.reopen.request` |
| POST | `/api/financial-closing/:id/reopen-approve` | موافقة إعادة فتح | `closing.reopen.approve` |
| GET | `/api/financial-closing/:id/snapshots` | snapshots | `closing.view` |
| GET | `/api/financial-closing/:id/blockers` | blockers | `closing.view` |

### 35.11 Rollback Strategy

- قبل إنشاء قيود الإغلاق:
  - يمكن إلغاء run وتحويله إلى FAILED/CANCELLED.
- بعد إنشاء قيود الإغلاق وقبل hard close:
  - تستخدم reversal لقيد الإغلاق.
- بعد hard close:
  - لا rollback مباشر.
  - reopening workflow رسمي.
  - snapshot version جديد.
- فشل أثناء الإغلاق:
  - transaction rollback للمرحلة الحالية.
  - run status = FAILED.
  - period يعود إلى آخر حالة آمنة.

### 35.12 Audit Logging

- يسجل:
  - كل task result.
  - blockers.
  - snapshots hash.
  - القيود الناتجة.
  - approvers.
  - reopening reasons.
  - override actions.
- audit لا يحذف حتى لو أعيد فتح الفترة.

### 35.13 Edge Cases

- قيد يدوي بتاريخ فترة مغلقة:
  - يرفض أو يطلب reopening/adjustment period.
- فاتورة معلقة بسبب approval:
  - blocker.
- فرق مخزون صغير بسبب rounding:
  - warning إذا ضمن tolerance، blocker إذا أعلى.
- إعادة فتح سنة بعد إنشاء سنة جديدة:
  - يتطلب تجميد posting في السنة الجديدة أو carry-forward recalculation.

### 35.14 Performance Notes

- closing validations تعمل كـ background jobs.
- snapshots تعتمد على monthly aggregates حيث متاحة.
- لا يتم full scan للجداول الضخمة دون indexes.
- نتائج checks تخزن incremental حتى لا تعاد كلها عند retry.

### 35.15 Scalability Notes

- دعم branch-level closing.
- دعم multi-book closing.
- دعم auditor review portal.
- دعم close calendar وسلاسل موافقات مختلفة حسب الفرع.

## 36. Multi-Branch Accounting Architecture Deep Dive

### 36.1 الهدف

إضافة تصميم تفصيلي لعزل الفروع محاسبياً وتشغيلياً مع إمكانية consolidation، مع الحفاظ على نفس دفتر الأستاذ ونفس فلسفة عزل العملات والترحيل الآمن.

### 36.2 Branch Entity Architecture

#### branches

- الأعمدة:
  - `id`, `companyId`, `code`, `name`, `legalName?`, `governorate`, `address`.
  - `type`: MAIN, SALES_BRANCH, WAREHOUSE_BRANCH, DISTRIBUTION_CENTER.
  - `isPostingEnabled`, `isInventoryEnabled`, `isActive`.
  - `createdAt`, `updatedAt`.
- relationships:
  - branch has warehouses.
  - branch has users.
  - branch has payment accounts.
  - branch has fiscal period states.
  - branch has numbering sequences.

#### branch_document_scopes

- الهدف: تحديد أنواع المستندات المسموحة للفرع.
- الأعمدة:
  - `branchId`, `documentType`, `isEnabled`, `requiresCentralApproval`.

### 36.3 Branch-Level Ledgers and Journals

- `journal_entries.branchId` يحدد فرع القيد.
- `journal_lines.branchId` يحدد الفرع التحليلي للسطر.
- مستند واحد يمكن أن ينتج قيوداً متعددة لفروع مختلفة فقط في inter-branch workflows.
- كشف حساب الفرع:
  - يستخدم journal_lines.branchId.
- ميزان مراجعة الفرع:
  - يجمع lines الخاصة بالفرع مع استبعاد elimination accounts إذا تقرير محلي.

### 36.4 Branch Users and Permissions

#### branch_user_permissions

- الأعمدة:
  - `userId`, `branchId`, `permissionKey`, `scopeLevel`.
- scopeLevel:
  - VIEW.
  - CREATE.
  - POST.
  - APPROVE.
  - MANAGE.
- rules:
  - صلاحية عامة لا تكفي دون branch scope إذا multi-branch enforced.
  - central finance يمكن أن يملك branchId=null scope.

### 36.5 Branch Document Numbering

#### branch_numbering_sequences

- الأعمدة:
  - `id`, `companyId`, `branchId`, `documentType`, `fiscalYearId`, `prefix`, `currentValue`, `padding`.
- pattern:
  - `BGD-SI-2026-000001`.
- locking:
  - row lock عند إصدار رقم.
  - الرقم يحجز عند POST أو عند DRAFT حسب policy.
- edge:
  - إذا ألغيت مسودة برقم محجوز، لا يعاد استخدام الرقم في financial documents.

### 36.6 Branch Fiscal Periods

#### branch_fiscal_periods

- الأعمدة:
  - `branchId`, `periodId`, `financialStatus`, `inventoryStatus`.
  - `softClosedAt?`, `hardClosedAt?`, `closedById?`.
- hierarchy:
  - company period OPEN إذا أي branch OPEN.
  - company hard close يتطلب كل branch hard closed.
  - branch reopening يمنع consolidated final reports.

### 36.7 Branch Cash/Bank Accounts

- كل payment account يرتبط بـ:
  - `branchId`.
  - `accountId`.
  - `currency`.
- restrictions:
  - فرع لا يستخدم صندوق فرع آخر.
  - الحساب المركزي يستخدم فقط بصلاحية `branches.centralCash.use`.
  - التحويل النقدي بين الفروع لا يتم كسند دفع عادي بل Inter-Branch Transfer.

### 36.8 Inter-Branch Transfers Workflow

1. فرع المصدر ينشئ transfer.
2. النظام يتحقق من الصلاحية والمخزون/الرصيد.
3. transfer state = PENDING_RECEIVER_CONFIRMATION.
4. فرع الوجهة يؤكد الاستلام.
5. PostingService ينشئ قيود due-to/due-from.
6. stock movements تنشأ للفرعين إذا التحويل مخزني.
7. reconciliation marker يحفظ.

### 36.9 Due-To / Due-From Posting Rules

- لكل فرعين حسابان:
  - Due From Branch X.
  - Due To Branch X.
- يجب أن تكون العملة متطابقة.
- consolidation يستبعد الحسابين المتقابلين.
- reconciliation:
  - balance(Due From A->B) = balance(Due To B->A).
- الفرق blocker في إغلاق الشركة.

### 36.10 Consolidation Engine

- input:
  - branch trial balances.
  - inter-branch balances.
  - elimination rules.
- process:
  1. validate branch periods closed.
  2. load branch balances by currency.
  3. eliminate due-to/due-from.
  4. aggregate accounts.
  5. validate consolidated debit=credit.
  6. produce snapshot.
- outputs:
  - consolidated trial balance.
  - consolidated P&L.
  - consolidated balance sheet.
  - branch contribution report.

### 36.11 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| GET | `/api/branches/:id/trial-balance` | ميزان فرع |
| GET | `/api/branches/:id/periods` | فترات الفرع |
| POST | `/api/branches/:id/periods/:periodId/lock` | قفل فترة فرع |
| POST | `/api/inter-branch/transfers/:id/confirm` | تأكيد الاستلام |
| POST | `/api/inter-branch/transfers/:id/post` | ترحيل التحويل |
| GET | `/api/inter-branch/reconciliation` | مطابقة الفروع |
| POST | `/api/consolidation/run` | تشغيل consolidation |

### 36.12 Security Boundaries

- كل query يطبق branch scope.
- التقارير الموحدة تتطلب صلاحية مركزية.
- مستخدم فرع لا يرى due-to/due-from لفرع آخر إلا ضمن transfer مرتبط به.
- تغيير branchId لمستند ممنوع بعد وجود lines.

### 36.13 Edge Cases

- تحويل أرسل ولم يستلم:
  - in-transit.
  - لا يغلق فرع المصدر hard إذا السياسة تمنع in-transit.
- فرع معطل:
  - لا يقبل مستندات جديدة.
  - تبقى تقاريره التاريخية.
- اختلاف العملة بين فرعين:
  - يستخدم exchange workflow قبل inter-branch.

### 36.14 Performance and Scalability

- indexes على `branchId, date, status`.
- materialized branch balances.
- consolidation async للسنوات الكبيرة.
- branch-level cache invalidation عند posting.

## 37. Enterprise Approval Workflow Architecture Deep Dive

### 37.1 الهدف

تثبيت ضوابط Maker/Checker والموافقات متعددة المستويات كطبقة إلزامية قبل الترحيل أو العمليات الحساسة، مع audit trail غير قابل للتلاعب.

### 37.2 State Machine

| State | يسمح بالتعديل | يسمح بالترحيل | الانتقالات |
|---|---|---|---|
| DRAFT | نعم | لا | SUBMITTED, CANCELLED |
| SUBMITTED | لا | لا | PENDING_APPROVAL |
| PENDING_APPROVAL | لا | لا | PARTIALLY_APPROVED, REJECTED, EXPIRED |
| PARTIALLY_APPROVED | لا | لا | APPROVED, REJECTED, ESCALATED |
| APPROVED | لا إلا invalidate | نعم | POSTING, EXPIRED |
| REJECTED | نعم عبر rework | لا | REWORK |
| REWORK | نعم | لا | SUBMITTED |
| EXPIRED | لا | لا | RESUBMITTED |
| OVERRIDDEN | لا | نعم | POSTING |

### 37.3 Tables

#### approval_policy_versions

- الهدف: حفظ نسخة السياسة وقت الطلب.
- الأعمدة:
  - `id`, `policyId`, `versionNo`, `definitionJson`, `createdAt`, `createdById`.

#### approval_sla_events

- الهدف: SLA وتصعيد.
- الأعمدة:
  - `id`, `approvalRequestId`, `stepId`, `eventType`, `dueAt`, `firedAt?`, `status`.

#### approval_notifications

- الهدف: إشعارات الموافقات.
- الأعمدة:
  - `id`, `approvalRequestId`, `userId`, `channel`, `status`, `sentAt?`, `readAt?`.

### 37.4 Conditional Approval Chains

- evaluation inputs:
  - documentType.
  - branchId.
  - amount.
  - currency.
  - discountPercent.
  - creditLimitExceeded.
  - negativeStock.
  - manualJournalProtectedAccount.
  - periodOverride.
- chain selection:
  - أعلى priority policy تطابق.
  - يمكن دمج risk approvals مع amount approvals.

### 37.5 Financial Risk Approvals

- triggers:
  - سند دفع كبير.
  - قيد يدوي على cash/bank.
  - تغيير حساب نظامي.
  - بيع بخسارة إذا margin أقل من threshold.
  - إلغاء فاتورة بعد فترة زمنية.
- restrictions:
  - لا approval ذاتي.
  - لا تفويض لمستخدم دون نفس branch scope.
  - كل override يظهر في risk reports.

### 37.6 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| POST | `/api/approvals/evaluate` | تقييم هل المستند يحتاج موافقة |
| POST | `/api/approvals/:documentType/:documentId/submit` | إرسال للموافقة |
| POST | `/api/approvals/:id/actions/approve` | موافقة |
| POST | `/api/approvals/:id/actions/reject` | رفض |
| POST | `/api/approvals/:id/actions/rework` | إعادة عمل |
| POST | `/api/approvals/:id/actions/escalate` | تصعيد |
| POST | `/api/approvals/:id/actions/override` | تجاوز طارئ |
| GET | `/api/approvals/inbox` | صندوق الموافقات |

### 37.7 Posting Block Until Approval

- PostingService يطلب `ApprovalGuard`.
- ApprovalGuard يفحص:
  - required policy.
  - request status APPROVED أو OVERRIDDEN.
  - document hash لم يتغير.
  - approval not expired.
  - approver ليس maker عند منع self-approval.

### 37.8 Override Protection

- requires:
  - MFA.
  - reason.
  - privileged permission.
  - separate audit event.
  - notification للمدير المالي.
- لا يستخدم override في:
  - unbalanced journal.
  - currency mismatch.
  - hard closed period دون reopening.

### 37.9 Edge Cases

- approver فقد صلاحياته بعد الطلب:
  - step يعاد تقييمه أو يصعد.
- policy disabled:
  - requests القديمة تستخدم version محفوظ.
- مستند تغير:
  - approvals invalidated.
- SLA expired:
  - يمنع approve العادي حتى resubmission أو escalation.

### 37.10 Performance Notes

- approval inbox indexed by approver/role/status.
- policy evaluation cached by documentType/branch لكن conditions تحسب live.
- notifications async.

## 38. Reporting & BI Engine Architecture Deep Dive

### 38.1 الهدف

توسيع طبقة التقارير إلى محرك BI قابل للتشغيل الإنتاجي، يفصل live operations عن analytics، ويضمن أن التقارير المالية تطابق ledger snapshots.

### 38.2 Reporting Warehouse

#### reporting_dimensions

- `dim_date`.
- `dim_branch`.
- `dim_warehouse`.
- `dim_account`.
- `dim_product`.
- `dim_customer`.
- `dim_supplier`.
- `dim_currency`.

#### reporting_facts

- `fact_journal_lines`.
- `fact_sales`.
- `fact_purchase`.
- `fact_inventory`.
- `fact_cash_movement`.
- `fact_ar_ap_aging`.

### 38.3 Pipeline

1. financial/stock event published to outbox.
2. reporting worker consumes event.
3. transforms operational data to fact rows.
4. updates aggregates.
5. invalidates cache keys.
6. marks projection version.
7. validation job compares facts to ledger.

### 38.4 Cache Invalidation

- events:
  - journal.posted.
  - journal.reversed.
  - stock.moved.
  - period.closed.
  - branch.closed.
- cache keys include:
  - companyId.
  - branchId.
  - reportType.
  - filtersHash.
  - permissionScope.
  - snapshotVersion.

### 38.5 KPI Engine

- KPI formula sources:
  - ledger.
  - sales facts.
  - inventory facts.
  - payment facts.
- examples:
  - gross margin.
  - inventory turnover.
  - DSO.
  - overdue debt.
  - stockout risk.
- KPI values تخزن مع:
  - calculation time.
  - source version.
  - currency mode.

### 38.6 Async Export Engine

- export workflow:
  1. validate permission.
  2. create report_job.
  3. worker executes query.
  4. stream to file storage.
  5. write export_log.
  6. notify user.
- controls:
  - max rows.
  - timeout.
  - signed URL.
  - watermark.

### 38.7 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| POST | `/api/bi/reports/query` | تشغيل query تقرير |
| POST | `/api/bi/reports/export` | تصدير async |
| GET | `/api/bi/jobs/:id` | حالة export |
| GET | `/api/bi/kpis` | KPIs |
| POST | `/api/bi/snapshots/create` | إنشاء snapshot |
| POST | `/api/bi/reconcile` | مطابقة BI مع ledger |
| GET | `/api/bi/cache/status` | حالة cache |

### 38.8 Reporting Reconciliation

- AR report total = AR accounts ledger.
- AP report total = AP accounts ledger.
- Sales report total = revenue accounts after returns/discounts.
- Inventory valuation = inventory accounts after accepted tolerance.
- Cash movement = cash/bank ledger.

### 38.9 Security Notes

- report rows respect branch permissions.
- exports المالية تحتاج export permission.
- personal data masking حسب role.
- كل export يسجل audit.

### 38.10 Performance Notes

- heavy reports لا تعمل synchronously.
- materialized views refresh incremental.
- warehouse tables partitioned by period.
- historical closed reports served from snapshots.

## 39. Advanced Inventory Valuation Engine Deep Dive

### 39.1 الهدف

إكمال طبقة تقييم المخزون لتدعم إعادة الحساب، طبقات التكلفة، الحجوزات، الدفعات، والتصحيحات بأثر محاسبي آمن.

### 39.2 Weighted Average Recalculation

- يبدأ من آخر valuation snapshot قبل `fromDate`.
- يعيد تطبيق الحركات بترتيب:
  - movementDate.
  - createdAt.
  - id.
- لكل IN:
  - تحديث average.
- لكل OUT:
  - استخدام average الحالي.
  - حساب COGS.
- إذا تغير COGS لفترة مفتوحة:
  - ينشئ adjustment journal.
- إذا فترة مغلقة:
  - يرحل الفرق في الفترة الحالية مع disclosure.

### 39.3 Valuation Layers Algorithm

- كل purchase/opening/adjustment_in ينشئ layer.
- كل sale/transfer_out/damage يستهلك cost.
- weighted average:
  - layer يستخدم للتدقيق.
- FIFO:
  - layer يستخدم كمصدر التكلفة.
- batch:
  - layer scoped by batchNo.
- serial:
  - layer scoped by serialNo.

### 39.4 Reservation Workflow

1. sales draft requests reservation.
2. system checks available.
3. create ACTIVE reservation.
4. invoice posting consumes reservation.
5. draft cancellation releases reservation.
6. expiration job releases expired reservations.

### 39.5 Available vs Reserved Stock

```text
onHand = stock_balance.quantity
reserved = sum(active reservations)
blocked = expired/damaged/quality hold stock
available = onHand - reserved - blocked
```

### 39.6 Posting Impacts

- sale:
  - OUT movement.
  - COGS journal.
  - inventory credit.
- purchase:
  - IN movement.
  - inventory debit.
  - AP/cash credit.
- damage:
  - OUT movement.
  - damage expense debit.
  - inventory credit.
- cost adjustment:
  - no quantity change.
  - valuation amount change.
  - journal adjustment.

### 39.7 Correction Strategy

- لا تعديل للحركة الأصلية بعد posting.
- correction document:
  - quantity correction.
  - cost correction.
  - batch correction.
- كل correction يحفظ:
  - originalMovementId.
  - reason.
  - approver.
  - journalEntryId.

### 39.8 Locking and Concurrency

- acquire locks:
  - product/warehouse stock_balance.
  - valuation layers sorted.
  - reservation rows.
- concurrent sales:
  - first commit consumes available.
  - second revalidates before commit.
- recalculation:
  - locks product/warehouse scope.
  - posting to same scope waits or fails with retry.

### 39.9 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| POST | `/api/inventory/valuation/recalculate` | إعادة حساب |
| GET | `/api/inventory/valuation/layers` | طبقات |
| POST | `/api/inventory/cost-corrections` | تصحيح تكلفة |
| POST | `/api/inventory/quantity-corrections` | تصحيح كمية |
| GET | `/api/inventory/reservations` | الحجوزات |
| POST | `/api/inventory/reservations/expire` | job انتهاء |

### 39.10 Audit and Performance

- cost audit trail يسجل كل تغير average/layer.
- valuation snapshots تقلل إعادة الحساب.
- partition stock_movements by period مستقبلاً.
- indexes على product/warehouse/date.

## 40. Enterprise Reliability Architecture Deep Dive

### 40.1 الهدف

إضافة تشغيل إنتاجي للـ workers والـ queues والتحقق الدوري والاستعادة، بحيث لا يعتمد النظام على request/response فقط.

### 40.2 Workers

| Worker | الهدف |
|---|---|
| PostingOutboxWorker | نشر أحداث ما بعد الترحيل |
| ReportingWorker | بناء التقارير والصادرات |
| ReconciliationWorker | فحص المطابقات |
| IntegrityWorker | كشف فساد البيانات |
| ReservationExpiryWorker | فك الحجوزات المنتهية |
| ClosingWorker | تشغيل مهام الإغلاق |
| NotificationWorker | إرسال الإشعارات |

### 40.3 Queue Tables

#### background_jobs

- الأعمدة:
  - `id`, `queueName`, `jobType`, `payloadJson`, `status`.
  - `attempts`, `maxAttempts`, `priority`, `runAt`.
  - `lockedBy?`, `lockedUntil?`, `lastError?`.
- indexes:
  - `queueName, status, runAt, priority`.

### 40.4 Failure Handling

- transient errors:
  - retry.
- validation errors:
  - fail no retry.
- deadlocks:
  - retry with backoff.
- repeated failures:
  - DEAD_LETTER.
  - alert.

### 40.5 Integrity Verification

- checks:
  - journal balance.
  - posting links.
  - stock balances.
  - valuation layers.
  - branch due-to/due-from.
  - approval/posting mismatch.
  - audit hash chain.
- results:
  - PASS.
  - WARNING.
  - FAIL.
  - CRITICAL.

### 40.6 Disaster Recovery Workflow

1. declare incident.
2. freeze financial posting.
3. snapshot current database if accessible.
4. restore latest backup/PITR.
5. replay or compare posting_operations after restore point.
6. run integrity jobs.
7. finance signs off.
8. unfreeze posting.

### 40.7 Monitoring Metrics

- posting_success_rate.
- posting_failure_count.
- queue_depth.
- job_dead_letter_count.
- reconciliation_failures.
- backup_age_minutes.
- db_deadlocks.
- slow_queries.
- failed_logins.
- suspicious_postings.

### 40.8 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| GET | `/api/ops/jobs` | عرض jobs |
| POST | `/api/ops/jobs/:id/retry` | إعادة تشغيل |
| POST | `/api/ops/jobs/:id/cancel` | إلغاء |
| GET | `/api/ops/integrity/results` | نتائج الفحص |
| POST | `/api/ops/integrity/run` | تشغيل فحص |
| GET | `/api/ops/metrics` | metrics |

### 40.9 Security and Audit

- ops APIs تتطلب `system.operations.manage`.
- retry لا يغير payload.
- كل job manual action يسجل audit.
- integrity CRITICAL يمنع period close.

## 41. Enterprise Security Hardening Deep Dive

### 41.1 الهدف

إضافة تفاصيل تنفيذية لتأمين الجلسات، الأجهزة، الصادرات، الأحداث المالية، ومراقبة الاحتيال بدون تغيير فلسفة الصلاحيات الحالية.

### 41.2 Authentication Flow

1. user submits credentials.
2. rate limiter checks IP/user.
3. password verified.
4. session risk evaluated.
5. MFA required if:
   - role privileged.
   - device untrusted.
   - IP unusual.
   - operation requires step-up.
6. session issued with trust level.
7. audit login event.

### 41.3 Session Lifecycle

- states:
  - ACTIVE.
  - STEP_UP_REQUIRED.
  - LOCKED.
  - REVOKED.
  - EXPIRED.
- trust levels:
  - LOW: read-only sensitive areas hidden.
  - NORMAL: regular operations.
  - HIGH: financial privileged operations for limited time.

### 41.4 Security Boundaries

- UI hiding ليس control نهائي.
- API permission mandatory.
- financial operation step-up mandatory عند risk.
- service workers operate with service identity.
- branch scope enforced in queries.

### 41.5 Privileged Operations Verification

- operations:
  - manual journal posting.
  - period reopening.
  - emergency approval override.
  - role/permission changes.
  - export full ledger.
  - changing system accounts.
- verification:
  - password recheck أو MFA.
  - reason.
  - approval if policy requires.
  - signed security event.

### 41.6 Append-only Audit and Signed Events

- audit event pipeline:
  1. canonicalize payload.
  2. calculate payloadHash.
  3. load previousHash for company stream.
  4. sign event.
  5. store append-only.
- verification job:
  - recompute hashes.
  - detect gaps.
  - alert on mismatch.

### 41.7 Anti-Fraud and Suspicious Posting

- rules engine evaluates:
  - amount anomaly.
  - time anomaly.
  - user behavior anomaly.
  - repeated reversals.
  - high discount.
  - protected account usage.
  - posting during closing.
- outcomes:
  - ALLOW.
  - ALLOW_WITH_FLAG.
  - REQUIRE_APPROVAL.
  - REQUIRE_STEP_UP.
  - BLOCK.

### 41.8 Secure Export Workflow

1. validate export permission.
2. classify data sensitivity.
3. require approval for high sensitivity.
4. generate export via async job.
5. apply watermark and masking.
6. store encrypted file.
7. issue expiring signed link.
8. log download.

### 41.9 Encryption and Secrets

- application secrets:
  - environment managed.
  - rotation schedule.
  - no logs.
- sensitive fields:
  - MFA secrets encrypted.
  - recovery codes hashed.
  - export files encrypted at rest.
- transport:
  - HTTPS only in production.

### 41.10 APIs

| Method | Endpoint | الهدف |
|---|---|---|
| POST | `/api/security/session/step-up` | رفع trust للجلسة |
| GET | `/api/security/session/current` | حالة الجلسة |
| POST | `/api/security/session/revoke-all` | إلغاء الجلسات |
| POST | `/api/security/privileged/verify` | تحقق عملية حساسة |
| GET | `/api/security/audit-chain/verify` | فحص audit hash |
| POST | `/api/security/export/:id/revoke` | إلغاء رابط export |

### 41.11 Edge Cases

- MFA device lost:
  - recovery codes أو admin reset بموافقة.
- role changed while session active:
  - session trust downgraded.
- export link leaked:
  - revoke link.
  - audit downloads.
- suspicious posting blocked incorrectly:
  - emergency override with audit and approval.

### 41.12 Performance and Scalability

- risk scoring synchronous فقط للقواعد الخفيفة.
- anomaly analytics في background.
- security_events partitioned by date.
- audit hash verification incremental.
- integration future مع SIEM وSSO.

## 42. State Machine Specifications

### 42.1 الهدف

هذا القسم يثبت الحالات والتحولات المسموحة لكل كيان تشغيلي حساس. أي تنفيذ لاحق يجب أن يستخدم هذه الـ State Machines كمرجع إلزامي، ولا يسمح بإضافة transition جديد داخل الكود دون تحديث الوثيقة والموافقات المعمارية.

### 42.2 قواعد عامة لكل State Machine

- كل transition يجب أن ينفذ عبر Use Case واضح.
- ممنوع تغيير الحالة مباشرة من UI أو route handler.
- كل transition يمر عبر:
  - auth.
  - permission.
  - validation.
  - business rules.
  - audit.
  - transaction عند وجود write.
- كل transition مالي أو مخزني يجب أن يكون idempotent عندما يعاد الطلب بنفس idempotency key.
- كل transition من حالة POSTED أو CLOSED أو HARD_CLOSED يجب أن يكون reversal/reopen رسمي، لا update مباشر.

### 42.3 Sales Invoice State Machine

#### States

| State | الوصف | قابل للتعديل | له أثر مالي | له أثر مخزني |
|---|---|---|---|---|
| DRAFT | مسودة أولية | نعم | لا | حجز اختياري فقط |
| RESERVED | مسودة مع حجز مخزون | نعم بضوابط | لا | reservation |
| PENDING_APPROVAL | تنتظر موافقة | لا | لا | reservation مستمر |
| APPROVED | معتمدة للترحيل | لا | لا | reservation مستمر |
| POSTING | جاري الترحيل | لا | قيد التنفيذ | قيد التنفيذ |
| POSTED | مرحّلة | لا | نعم | نعم |
| PARTIALLY_RETURNED | مرتجع جزئي | لا | نعم | نعم |
| FULLY_RETURNED | مرتجع كلي | لا | نعم | نعم |
| CANCELLING | جاري الإلغاء | لا | قيد عكسي | قيد عكسي |
| REVERSED | ملغاة بقيد عكسي | لا | نعم عكسي | نعم عكسي |
| CANCELLED | ملغاة قبل الترحيل | لا | لا | reservation released |
| POSTING_FAILED | فشل ترحيل آمن | محدود | لا إذا rollback كامل | لا إذا rollback كامل |

#### Transitions

| From | To | Trigger | Validations | Permission | Audit |
|---|---|---|---|---|---|
| DRAFT | RESERVED | reserve stock | lines valid, stock available | `sales.create` | reservation created |
| DRAFT | PENDING_APPROVAL | submit | approval required | `sales.create` | submit snapshot |
| DRAFT | POSTING | post without approval | approval not required, stock, period, currency | `sales.post` | posting started |
| RESERVED | PENDING_APPROVAL | submit | reservation active | `sales.create` | submit snapshot |
| PENDING_APPROVAL | APPROVED | approve | approver valid, no self approval | `approvals.approve` | approval action |
| APPROVED | POSTING | post | document hash unchanged | `sales.post` | posting started |
| POSTING | POSTED | commit success | journal balanced, stock moved | system | financial audit |
| POSTING | POSTING_FAILED | commit failure | rollback complete | system | failure audit |
| POSTED | PARTIALLY_RETURNED | return part | return qty <= remaining | `sales.return` | return audit |
| POSTED | FULLY_RETURNED | return all | all qty returned | `sales.return` | return audit |
| POSTED | CANCELLING | cancel posted | period open or reversal policy | `sales.cancel` | cancel reason |
| CANCELLING | REVERSED | reversal success | reversal journal balanced | system | reversal audit |
| DRAFT | CANCELLED | cancel draft | no posting | `sales.cancel` | cancellation |
| RESERVED | CANCELLED | cancel draft | release reservation | `sales.cancel` | cancellation |
| POSTING_FAILED | POSTING | retry | idempotency, cause fixed | `sales.post` | retry audit |

#### Forbidden Actions

- تعديل lines بعد APPROVED إلا بإرجاع الحالة إلى REWORK/PENDING_APPROVAL.
- حذف فاتورة POSTED.
- تغيير currency بعد إضافة lines.
- تغيير warehouse بعد reservation أو posting.
- تغيير customer بعد وجود تحصيل أو posting.
- تحديث customer balance مباشرة.
- تحديث stock مباشرة من sales module.

#### Posting Behavior

- Sales Invoice لا ينشئ journal بنفسه.
- يجب استخدام `PostingService`.
- يجب استخدام `InventoryMovementService` أو effect داخلي ضمن PostingService.
- عند POSTED:
  - journalEntryId محفوظ.
  - stock movements محفوظة.
  - reservation consumed.

#### Reversal Behavior

- cancellation بعد POSTED ينشئ:
  - reversal journal.
  - reversal stock movements.
  - audit reason.
- إذا الفترة مغلقة:
  - يمنع cancellation المباشر.
  - يستخدم correction document في الفترة الحالية أو reopening.

### 42.4 Purchase Invoice State Machine

#### States

| State | الوصف |
|---|---|
| DRAFT | قابلة للتعديل |
| PENDING_APPROVAL | تنتظر موافقة |
| APPROVED | جاهزة للترحيل |
| POSTING | جاري إنشاء أثر مالي ومخزني |
| POSTED | مرحّلة |
| PARTIALLY_RETURNED | مرتجع شراء جزئي |
| FULLY_RETURNED | مرتجع شراء كلي |
| CANCELLING | إلغاء قيد التنفيذ |
| REVERSED | ملغاة بقيد عكسي |
| CANCELLED | ملغاة قبل الترحيل |
| POSTING_FAILED | فشل آمن |

#### Transitions

| From | To | Trigger | Validations | Permission |
|---|---|---|---|---|
| DRAFT | PENDING_APPROVAL | submit | supplier/warehouse/lines valid | `purchases.create` |
| DRAFT | POSTING | post | approval not required, period open | `purchases.post` |
| PENDING_APPROVAL | APPROVED | approve | policy passed | `approvals.approve` |
| APPROVED | POSTING | post | no changes after approval | `purchases.post` |
| POSTING | POSTED | commit | inventory valuation created | system |
| POSTING | POSTING_FAILED | failure | rollback done | system |
| POSTED | PARTIALLY_RETURNED | return | quantity return <= purchased remaining | `purchases.return` |
| POSTED | FULLY_RETURNED | return all | all lines returned | `purchases.return` |
| POSTED | CANCELLING | cancel | no closed-period conflict | `purchases.cancel` |
| CANCELLING | REVERSED | reversal | reversal entries valid | system |
| DRAFT | CANCELLED | cancel | no posting links | `purchases.cancel` |

#### Forbidden Actions

- تعديل landed cost بعد POSTED.
- حذف purchase line له valuation layer مستهلك.
- تغيير supplier بعد approval.
- تغيير exchangeRateSnapshot بعد POSTED.
- تحديث product averageCost مباشرة خارج valuation engine.

#### Posting Behavior

- ينشئ:
  - Debit Inventory.
  - Credit AP/Cash/Bank.
  - stock IN.
  - valuation layers.
- landed cost distribution snapshot يحفظ ولا يعاد حسابه بصمت.

### 42.5 Receipt Voucher State Machine

#### States

| State | الوصف |
|---|---|
| DRAFT | سند قبض غير مرحل |
| PENDING_APPROVAL | يحتاج موافقة |
| APPROVED | جاهز للترحيل |
| POSTING | جاري الترحيل |
| POSTED | مرحل |
| CANCELLING | جاري العكس |
| REVERSED | ملغى بقيد عكسي |
| CANCELLED | ملغى قبل الترحيل |
| POSTING_FAILED | فشل آمن |

#### Transitions

| From | To | Trigger | Validations |
|---|---|---|---|
| DRAFT | PENDING_APPROVAL | submit | amount/payment account/counterparty valid |
| DRAFT | POSTING | post | approval not required, period open |
| PENDING_APPROVAL | APPROVED | approve | maker/checker valid |
| APPROVED | POSTING | post | document hash unchanged |
| POSTING | POSTED | commit | journal balanced |
| POSTED | CANCELLING | reverse | reason required |
| CANCELLING | REVERSED | commit reversal | reversal balanced |
| DRAFT | CANCELLED | cancel | no journal link |

#### Journal Behavior

- Debit Cash/Bank.
- Credit Customer AR أو selected account.
- لا يسمح بعملة مختلفة بين payment account و voucher.

### 42.6 Payment Voucher State Machine

- نفس حالات Receipt Voucher.
- journal:
  - Debit AP/Expense/selected account.
  - Credit Cash/Bank.
- forbidden:
  - الدفع من صندوق عملة مختلفة.
  - الدفع من صندوق غير نشط.
  - الدفع من period مغلقة.
  - دفع يسبب رصيد صندوق سالب إذا policy تمنع.

### 42.7 Journal Entry State Machine

| State | الوصف | allowed actions |
|---|---|---|
| DRAFT | قيد يدوي قابل للتعديل | edit, submit, post, cancel |
| PENDING_APPROVAL | ينتظر موافقة | approve, reject |
| APPROVED | معتمد | post |
| POSTING | جاري الترحيل | none |
| POSTED | مرحل immutable | print, reverse |
| REVERSING | جاري إنشاء قيد عكسي | none |
| REVERSED | معكوس | view |
| CANCELLED | ملغى قبل الترحيل | view |
| POSTING_FAILED | فشل آمن | retry, cancel |

#### Transitions

- DRAFT -> POSTING:
  - requires balanced lines.
  - accounts active/posting.
  - same currency.
- POSTING -> POSTED:
  - journal persisted.
- POSTED -> REVERSING:
  - reason required.
  - permission `journals.reverse`.
- REVERSING -> REVERSED:
  - reversal entry posted.

#### Forbidden Actions

- تعديل debit/credit بعد POSTED.
- حذف line بعد POSTED.
- تغيير accountId بعد POSTED.
- تغيير date إلى period مغلقة.

### 42.8 Stock Transfer State Machine

| State | الوصف |
|---|---|
| DRAFT | تحويل غير مؤكد |
| PENDING_APPROVAL | يحتاج موافقة |
| APPROVED | جاهز للتنفيذ |
| IN_TRANSIT | خرج من المصدر ولم يؤكد الوصول |
| RECEIVED | استلمته الوجهة |
| POSTED | أثر مخزني ومالي مكتمل |
| CANCELLED | ملغى قبل التنفيذ |
| REVERSED | عكس بعد التنفيذ |

#### Transitions

| From | To | Trigger | Validations |
|---|---|---|---|
| DRAFT | PENDING_APPROVAL | submit | warehouses different, lines valid |
| DRAFT | APPROVED | approve skipped | approval not required |
| APPROVED | IN_TRANSIT | dispatch | stock available in source |
| IN_TRANSIT | RECEIVED | receive | received qty <= dispatched |
| RECEIVED | POSTED | post | movements balanced |
| APPROVED | CANCELLED | cancel | no movement |
| POSTED | REVERSED | reverse | period policy |

#### Posting Behavior

- same branch:
  - TRANSFER_OUT + TRANSFER_IN.
- inter-branch:
  - stock movements + due-to/due-from journals.

### 42.9 Stock Adjustment State Machine

| State | الوصف |
|---|---|
| DRAFT | تسوية قيد الإعداد |
| PENDING_APPROVAL | تنتظر موافقة |
| APPROVED | جاهزة |
| POSTING | جاري الترحيل |
| POSTED | مرحّلة |
| REVERSED | معكوسة |
| CANCELLED | ملغاة |

#### Rules

- adjustment positive:
  - stock IN.
  - Debit Inventory.
  - Credit Adjustment Gain/Opening/Correction account حسب السبب.
- adjustment negative:
  - stock OUT.
  - Debit Inventory Loss/Damage.
  - Credit Inventory.
- reason mandatory.
- approval mandatory above threshold or protected products.

### 42.10 Inventory Count State Machine

| State | الوصف |
|---|---|
| DRAFT | جرد مخطط |
| COUNTING | إدخال العد الفعلي |
| REVIEW | مراجعة الفروقات |
| PENDING_APPROVAL | موافقة على الفروقات |
| APPROVED | جاهز للتسوية |
| POSTING | إنشاء التسويات |
| POSTED | تسويات مرحلة |
| CANCELLED | ملغى |

#### Transitions

- DRAFT -> COUNTING:
  - warehouse active.
- COUNTING -> REVIEW:
  - all required lines counted أو marked skipped.
- REVIEW -> PENDING_APPROVAL:
  - differences calculated.
- APPROVED -> POSTING:
  - period open.
- POSTING -> POSTED:
  - adjustment movements created.

#### Forbidden Actions

- تعديل countedQty بعد APPROVED.
- حذف count بعد POSTED.
- posting count على period مغلقة.

### 42.11 Approval Workflow State Machine

- يستخدم القسم 37 كمرجع تفصيلي.
- transitions mandatory:
  - DRAFT -> SUBMITTED.
  - SUBMITTED -> PENDING_APPROVAL.
  - PENDING_APPROVAL -> PARTIALLY_APPROVED.
  - PARTIALLY_APPROVED -> APPROVED.
  - PENDING_APPROVAL/PARTIALLY_APPROVED -> REJECTED.
  - REJECTED -> REWORK.
  - REWORK -> SUBMITTED.
  - PENDING_APPROVAL -> EXPIRED.
  - PENDING_APPROVAL -> OVERRIDDEN.
- forbidden:
  - approve by maker إذا policy تمنع.
  - approve expired step دون escalation.
  - post document while not APPROVED/OVERRIDDEN.

### 42.12 Fiscal Period State Machine

| State | الوصف | allowed actions |
|---|---|---|
| FUTURE | لم تبدأ | configure |
| OPEN | مفتوحة | post, edit drafts |
| CLOSING_IN_PROGRESS | الإغلاق يعمل | view, resolve blockers |
| SOFT_CLOSED | مغلقة مبدئياً | override adjustments |
| HARD_CLOSED | مغلقة نهائياً | view only |
| REOPEN_REQUESTED | طلب إعادة فتح | approve/reject |
| REOPENED | أعيد فتحها | correction posting |
| ARCHIVED | مؤرشفة | reporting only |

#### Transitions

- FUTURE -> OPEN:
  - fiscal year active.
- OPEN -> CLOSING_IN_PROGRESS:
  - close started.
- CLOSING_IN_PROGRESS -> SOFT_CLOSED:
  - soft checks passed.
- SOFT_CLOSED -> HARD_CLOSED:
  - approvals passed, snapshots created.
- HARD_CLOSED -> REOPEN_REQUESTED:
  - reason, permission.
- REOPEN_REQUESTED -> REOPENED:
  - approval.
- REOPENED -> CLOSING_IN_PROGRESS:
  - re-close.
- HARD_CLOSED -> ARCHIVED:
  - retention policy.

### 42.13 User Session State Machine

| State | الوصف |
|---|---|
| ANONYMOUS | لا توجد جلسة |
| AUTHENTICATED_LOW_TRUST | دخل لكن يحتاج تحقق إضافي |
| ACTIVE | جلسة عادية |
| STEP_UP_REQUIRED | عملية حساسة تتطلب تحقق |
| HIGH_TRUST | تحقق إضافي مؤقت |
| LOCKED | مقفلة بسبب خطر |
| REVOKED | ألغيت |
| EXPIRED | انتهت |

#### Transitions

- ANONYMOUS -> ACTIVE:
  - login success, trusted device.
- ANONYMOUS -> AUTHENTICATED_LOW_TRUST:
  - login success, risk detected.
- ACTIVE -> STEP_UP_REQUIRED:
  - privileged operation.
- STEP_UP_REQUIRED -> HIGH_TRUST:
  - MFA/password recheck.
- ACTIVE/HIGH_TRUST -> REVOKED:
  - logout/admin revoke/password change.
- any -> LOCKED:
  - fraud/security event.

### 42.14 Financial Posting State Machine

| State | الوصف |
|---|---|
| REQUESTED | طلب ترحيل |
| LOCK_ACQUIRED | lock مكتسب |
| VALIDATING | فحوصات |
| BUILDING_JOURNAL | بناء القيد |
| PERSISTING | داخل transaction |
| COMMITTED | تم بنجاح |
| FAILED_ROLLED_BACK | فشل مع rollback |
| FAILED_AFTER_COMMIT | فشل بعد commit في event/export |
| RETRY_PENDING | ينتظر retry |
| REVERSED | عكس |

#### Transition Rules

- REQUESTED -> LOCK_ACQUIRED:
  - idempotency key valid.
- LOCK_ACQUIRED -> VALIDATING:
  - source loaded.
- VALIDATING -> BUILDING_JOURNAL:
  - all guards passed.
- BUILDING_JOURNAL -> PERSISTING:
  - draft balanced.
- PERSISTING -> COMMITTED:
  - DB commit success.
- PERSISTING -> FAILED_ROLLED_BACK:
  - DB error, rollback.
- COMMITTED -> FAILED_AFTER_COMMIT:
  - outbox failure only; financial state remains committed.
- FAILED_ROLLED_BACK -> RETRY_PENDING:
  - retryable error.

## 43. Database Constraint Matrix

### 43.1 الهدف

تثبيت قيود قاعدة البيانات كخط دفاع أخير ضد فساد مالي أو مخزني أو أمني. لا يجوز الاعتماد على validation في الواجهة أو الخدمات فقط.

### 43.2 Unique Constraints Matrix

| Table | Constraint | السبب | أثر السلامة | أثر الأداء |
|---|---|---|---|---|
| users | `email` unique | منع حسابين لنفس البريد | يمنع تضارب auth | index login سريع |
| roles | `name` unique | وضوح RBAC | يمنع duplicate roles | سريع lookup |
| permissions | `key` unique | صلاحية واحدة لكل key | يمنع تضارب checks | سريع permission checks |
| accounts | `companyId, code` unique | ترقيم محاسبي ثابت | يمنع تداخل الحسابات | يحسن tree lookup |
| customers | `companyId, code` unique | كود عميل ثابت | يمنع ذمم مختلطة | بحث سريع |
| suppliers | `companyId, code` unique | كود مورد ثابت | يمنع AP مختلط | بحث سريع |
| products | `companyId, code` unique | كود مادة ثابت | يمنع حركة مخزون خاطئة | بحث سريع |
| products | `companyId, barcode` unique nullable | باركود واحد | يمنع بيع مادة خاطئة | barcode lookup |
| warehouses | `companyId, code` unique | كود مخزن ثابت | يمنع خلط أرصدة | filter سريع |
| journal_entries | `companyId, entryNumber` unique | منع تكرار القيود | سلامة ledger | query سريع |
| journal_entries | `sourceType, sourceId, reversalFlag` partial | منع ترحيل مكرر | idempotency مالي | يحسن source lookup |
| vouchers | `companyId, type, number` unique | أرقام سندات | audit واضح | بحث سريع |
| sales_invoices | `companyId, branchId, number` unique | رقم فاتورة | يمنع duplicate posting | query سريع |
| purchase_invoices | `companyId, branchId, number` unique | رقم شراء | يمنع duplicate posting | query سريع |
| stock_balances | `productId, warehouseId` unique | رصيد واحد | يمنع stock split | update سريع |
| customer_accounts | `customerId, currency` unique | ذمة عملة واحدة | عزل العملات | lookup سريع |
| supplier_accounts | `supplierId, currency` unique | ذمة عملة واحدة | عزل العملات | lookup سريع |
| payment_accounts | `companyId, accountId` unique | ربط صندوق/بنك واحد | يمنع double cash | lookup سريع |
| fiscal_periods | `fiscalYearId, month` unique | شهر واحد | إغلاق صحيح | period lookup |

### 43.3 Foreign Key Rules Matrix

| From | To | Rule | السبب |
|---|---|---|---|
| journal_lines.accountId | accounts.id | RESTRICT | لا حذف حساب عليه قيد |
| journal_lines.journalEntryId | journal_entries.id | CASCADE only for DRAFT, otherwise RESTRICT by service | حذف مسودة فقط |
| voucher_lines.voucherId | vouchers.id | CASCADE قبل POSTED | مسودة قابلة للتنظيف |
| sales_invoice_lines.salesInvoiceId | sales_invoices.id | CASCADE قبل POSTED | حذف مسودة |
| stock_movements.productId | products.id | RESTRICT | لا حذف مادة لها حركة |
| stock_movements.warehouseId | warehouses.id | RESTRICT | لا حذف مخزن له حركة |
| customer_accounts.accountId | accounts.id | RESTRICT | حماية ذمم |
| supplier_accounts.accountId | accounts.id | RESTRICT | حماية ذمم |
| payment_accounts.accountId | accounts.id | RESTRICT | حماية صندوق/بنك |
| approval_requests.policyId | approval_policies.id | RESTRICT | حفظ trace |
| audit_logs.userId | users.id | SET NULL أو RESTRICT حسب السياسة | حفظ السجل التاريخي |

### 43.4 Cascade Rules

- يسمح cascade فقط في:
  - join tables مثل user_roles, role_permissions.
  - lines التابعة لمسودات غير مرحلة.
  - permissions المباشرة عند حذف مستخدم غير مالي إذا policy تسمح.
- يمنع cascade في:
  - journal_entries.
  - journal_lines.
  - stock_movements.
  - posted invoices.
  - vouchers posted.
  - audit_logs.
  - closing_snapshots.

### 43.5 Immutable Fields Matrix

| Entity | Fields | متى تصبح immutable |
|---|---|---|
| journal_entries | date, currency, sourceType, sourceId, status after POSTED | عند POSTED |
| journal_lines | accountId, debit, credit, currency | عند POSTED |
| sales_invoices | number, currency, exchangeRateSnapshot, customerId, warehouseId, totals | عند POSTED |
| purchase_invoices | number, supplierId, currency, landed costs, totals | عند POSTED |
| stock_movements | productId, warehouseId, quantity, type, sourceId | دائماً بعد الإنشاء |
| exchange_rates | usdToIqd, date | إذا مستخدم في مستند |
| closing_snapshots | all financial values | دائماً |
| audit_logs | all fields | دائماً |

### 43.6 Soft Delete Rules

- master data:
  - customers, suppliers, products, warehouses, users: soft delete/disable.
- financial data:
  - لا delete.
  - status cancellation/reversal.
- configuration:
  - system accounts لا تحذف.
  - policies versioned.
- soft delete fields:
  - `deletedAt`, `deletedById`, `deleteReason`.

### 43.7 Archival Rules

- posted financial records:
  - retention طويل لا يقل عن 7 سنوات.
- audit logs:
  - archive append-only.
- stock movements:
  - لا أرشفة تؤثر على snapshots.
- reports:
  - closed snapshots تحتفظ بـ sourceHash.

### 43.8 Financial Protection Constraints

- debit >= 0 و credit >= 0.
- ليس كلا debit و credit أكبر من صفر في نفس line.
- ليس كلاهما صفر.
- journal currency = line currency.
- line account currency = line currency.
- POSTED journal لا يعدل.
- source document لا يملك أكثر من active posted journal.

### 43.9 Inventory Integrity Constraints

- stock_movement.quantity > 0.
- movement type يحدد direction.
- stock_balance unique per product/warehouse.
- reservation.quantity > 0.
- reservation لا تتجاوز available عند الإنشاء.
- transfer fromWarehouse != toWarehouse.
- count difference يحسب server-side.

### 43.10 Indexing Strategy Matrix

| Query | Index | السبب |
|---|---|---|
| Account statement | `journal_lines(accountId, currency, createdAt, id)` | keyset pagination |
| Customer balance | `journal_lines(partnerType, partnerId, currency, createdAt)` | AR drilldown |
| Invoice list | `sales_invoices(companyId, branchId, date, status)` | filters |
| Stock card | `stock_movements(productId, warehouseId, movementDate, id)` | حركة مادة |
| Audit lookup | `audit_logs(entity, entityId, createdAt)` | trace |
| Approval inbox | `approval_requests(status, currentStepOrder, branchId)` | inbox |
| Jobs | `background_jobs(queueName, status, runAt, priority)` | workers |
| Branch reports | `journal_lines(branchId, accountId, currency, createdAt)` | branch ledger |

## 44. Non-Negotiable Financial Invariants

### 44.1 الهدف

هذه الـ invariants غير قابلة للتفاوض. أي كود يخالفها يعتبر bug مالي حرج حتى لو نجحت الاختبارات التقنية.

### 44.2 Invariants Matrix

| Invariant | Description | Enforcement Layer | Failure Behavior | Recovery |
|---|---|---|---|---|
| Journal Balance | مجموع المدين يساوي الدائن لكل قيد | LedgerValidator + DB checks | reject posting | fix source/builder ثم retry |
| Currency Isolation | كل قيد بعملة واحدة وكل حساب يطابقها | CurrencyGuard | reject | use exchange voucher |
| Immutable Posted Records | POSTED لا يعدل | service + DB permissions | reject + audit alert | reversal/correction |
| Reversal-only Correction | التصحيح بعكس لا update | ReversalService | reject direct edit | reversal journal |
| Ledger Source Link | كل قيد تشغيلي له source link | PostingService | blocker | reconciliation repair |
| Inventory Movement Link | كل أثر مخزني له source | InventoryService | reject | create correction document |
| AR/AP Derived | أرصدة العملاء/الموردين مشتقة من ledger | Reporting/Ledger services | ignore direct balance | rebuild balances |
| Period Lock | لا posting في hard closed period | PeriodGuard | `423 PERIOD_LOCKED` | reopening/adjustment |
| Audit Completeness | كل write حساس له audit | AuditGuard | fail transaction | retry with audit |
| Posting Idempotency | نفس الطلب لا يرحل مرتين | PostingOperation unique | return existing result | inspect operation |
| Stock Consistency | stock_balance = movements | InventoryReconciliation | alert/block close | rebuild balance/correction |
| Exchange Snapshot | السعر محفوظ في المستند | Zod + business validation | reject | set rate snapshot |

### 44.3 Validation Rules

- journal balance يحسب server-side فقط.
- totals لا تؤخذ من client كمصدر حقيقة.
- كل amount Decimal.
- rounding لا يسمح إلا بحساب rounding مضبوط.
- كل financial document date يجب أن يقع في period موجودة.
- كل posting operation يجب أن ينتج audit أو يفشل.

### 44.4 Failure Behavior

- validation failure:
  - لا transaction أو rollback كامل.
- invariant failure بعد commit:
  - CRITICAL alert.
  - freeze affected period if needed.
  - run integrity scan.
- direct mutation attempt:
  - reject.
  - security event.

### 44.5 Recovery Strategy

- cache mismatch:
  - rebuild from source of truth.
- source posted without journal:
  - block close.
  - create repair posting only after approval.
- unbalanced journal:
  - impossible by design; if detected, freeze system financial posting.
- stock mismatch:
  - rebuild stock_balance.
  - if movement missing, correction document.

## 45. Transaction Ownership & Boundary Architecture

### 45.1 الهدف

منع تداخل transactions العشوائي وضمان atomicity للعمليات المالية والمخزنية.

### 45.2 من يفتح Transaction

| Layer | يسمح؟ | ملاحظات |
|---|---|---|
| Route Handler | لا | يستدعي use case فقط |
| UI Component | لا | ممنوع Prisma أو transaction |
| Repository | لا يبدأ transaction بنفسه | يقبل tx client |
| Use Case | نعم للعمليات البسيطة | مالك العملية |
| PostingTransactionManager | نعم للترحيل المالي | المصدر الرسمي |
| ClosingOrchestrator | نعم لكل task scope | لا transaction طويلة جداً |
| Background Worker | نعم عبر use case | لا يتجاوز services |

### 45.3 Transaction Scope

- sales posting:
  - source lock.
  - journal.
  - stock movements.
  - stock balances.
  - source status.
  - audit.
- purchase posting:
  - journal.
  - stock IN.
  - valuation layers.
  - source status.
- voucher posting:
  - journal.
  - source status.
  - audit.
- approval action:
  - approval action.
  - request state.
  - document state.
  - audit.

### 45.4 Nested Transaction Rules

- ممنوع opening transaction داخل transaction موجودة.
- الخدمات تقبل `tx` اختياري:
  - إذا موجود تستخدمه.
  - إذا غير موجود لا تفتح إلا use case مالك العملية.
- savepoints لا تستخدم إلا لحالات محددة ومع توثيق.

### 45.5 Rollback Hierarchy

1. validation قبل transaction: لا شيء يتغير.
2. failure داخل transaction: rollback كامل.
3. failure بعد commit في events: لا rollback، outbox retry.
4. failure في export/notification: job retry.
5. failure في reconciliation: alert/block close، لا mutation تلقائية.

### 45.6 Concurrency Rules

- lock order ثابت:
  - period.
  - source.
  - numbering.
  - accounts.
  - stock balances.
  - valuation layers.
- أي update يعتمد على version check للمستندات القابلة للتعديل.
- retry deadlock محدود.
- لا external HTTP calls داخل transaction.

### 45.7 Reconciliation Transaction Rules

- read-only reconciliation:
  - لا transaction write.
- rebuild cache:
  - transaction per scope صغير.
- repair financial inconsistency:
  - approval.
  - explicit correction document.
  - transaction عبر PostingService.

## 46. Enterprise API Contract Specification

### 46.1 Response Format

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_...",
    "page": 1,
    "pageSize": 50,
    "total": 100
  }
}
```

### 46.2 Error Format

```json
{
  "success": false,
  "error": {
    "code": "PERIOD_LOCKED",
    "message": "الفترة المالية مغلقة",
    "details": {},
    "requestId": "req_..."
  }
}
```

### 46.3 Validation Order

1. requestId generation.
2. auth.
3. session trust.
4. permission.
5. branch scope.
6. Zod validation.
7. business validation.
8. state machine validation.
9. invariant validation.
10. transaction execution.
11. audit.

### 46.4 Pagination Standards

- default pageSize: 50.
- max pageSize: 200.
- keyset للدفاتر والحركات:
  - `cursor`.
  - `limit`.
- offset مسموح للقوائم الصغيرة فقط.

### 46.5 Filtering and Sorting

- filters يجب أن تكون allowlisted.
- sorting يجب أن يكون allowlisted.
- date filters mandatory للتقارير الثقيلة.
- q search لا يستخدم raw SQL غير آمن.

### 46.6 Mutation Standards

- كل mutation تقبل:
  - `idempotencyKey` للعمليات الحساسة.
  - `version` للتفاؤلية إذا entity editable.
- server يعيد حساب totals.
- client لا يرسل audit fields.
- mutation response يرجع entity state الجديد.

### 46.7 API Versioning

- internal phase:
  - `/api/...` مع contracts مستقرة.
- future external:
  - `/api/v1/...`.
- breaking changes:
  - version جديد.
  - deprecation period.

### 46.8 Idempotency Strategy

- required for:
  - posting.
  - reversal.
  - payments.
  - closing.
  - exports.
- key scoped by:
  - userId.
  - sourceType.
  - sourceId.
  - operation.
- mismatch hash returns `IDEMPOTENCY_CONFLICT`.

### 46.9 Audit Integration

- كل mutation يرسل إلى AuditService:
  - actor.
  - action.
  - entity.
  - before/after.
  - requestId.
- audit failure في operations الحساسة يفشل transaction.

## 47. Module Boundary & Responsibility Contracts

### 47.1 الهدف

منع architecture drift. كل module يملك بياناته وقواعده ولا يتجاوز حدود modules الأخرى.

### 47.2 Contracts Matrix

| Module | Owns | Cannot Modify | Must Use |
|---|---|---|---|
| Sales | sales invoices, returns, pricing selection | balances, journal_lines, stock_balances | PostingService, InventoryReservationService |
| Purchases | purchase invoices, landed costs | product avg cost مباشرة, AP balances | PostingService, ValuationEngine |
| Accounting | accounts, journals, vouchers, ledger | stock quantities مباشرة | PostingService, LedgerValidator |
| Inventory | stock movements, balances, valuation layers | journal entries مباشرة إلا عبر posting effect | InventoryMovementService, ValuationEngine |
| Customers | customer master data | AR ledger مباشرة | AccountLinkService |
| Suppliers | supplier master data | AP ledger مباشرة | AccountLinkService |
| Users | users, roles, permissions | financial documents | PermissionService |
| Approvals | approval policies/requests | posting direct | ApprovalGuard |
| Reporting | projections, snapshots, exports | source operational data | ReportQueryService |
| Closing | period locks, snapshots | source documents مباشرة | ClosingOrchestrator, PostingService |

### 47.3 Forbidden Dependencies

- UI -> Prisma.
- Route -> Prisma for business operations.
- Sales -> direct journal insert.
- Sales -> direct stock balance update.
- Purchases -> direct average cost update.
- Reporting -> mutate operational tables.
- Inventory -> mutate AR/AP.
- Users -> mutate audit logs manually.

### 47.4 Communication Rules

- cross-module write عبر use case/service فقط.
- events بعد commit للتقارير والكاش.
- shared DTOs لا تحتوي Prisma models كاملة.
- domain services لا تعتمد على React/Next request objects.

### 47.5 Service Boundary Rules

- service صغير بملكية واضحة.
- giant service ممنوع.
- orchestration في use case.
- calculations المركزية في calculators مخصصة.
- validations المشتركة في guards.

## 48. Enterprise Error Handling Architecture

### 48.1 Error Categories

| Category | أمثلة | HTTP | Retry |
|---|---|---|---|
| Validation | Zod/business invalid | 400/422 | لا |
| Auth | no session | 401 | بعد login |
| Permission | forbidden | 403 | لا |
| Conflict | version/idempotency/lock | 409 | أحياناً |
| Period | locked/closing | 423 | لا إلا reopen |
| Financial Integrity | unbalanced/mismatch | 422 | بعد إصلاح |
| Concurrency | deadlock/timeout | 409/503 | نعم محدود |
| System | unexpected | 500 | حسب الحالة |

### 48.2 Posting Failures

- pre-validation failure:
  - return clear error.
  - no state change.
- transaction failure:
  - rollback.
  - posting_operation FAILED.
- after commit failure:
  - financial state remains committed.
  - outbox retry.

### 48.3 Retry Strategy

- retry allowed:
  - deadlock.
  - lock timeout if safe.
  - outbox publish.
  - export generation.
- retry forbidden:
  - validation errors.
  - permission errors.
  - unbalanced journal builder output.
  - period locked.

### 48.4 User-Facing Errors

- Arabic message actionable.
- include entity link when possible.
- do not expose stack traces.
- show requestId.
- financial errors should show blocker reason.

### 48.5 Internal Logging

- structured logs.
- requestId.
- userId/companyId/branchId.
- errorCode.
- stack trace internal only.
- no secrets/no passwords/no tokens.

### 48.6 Distributed Lock Recovery

- stale locks cleaned by job.
- lock owner token prevents releasing another owner lock.
- lock timeout returns clear conflict.
- repeated lock conflicts create operational alert.

## 49. Enterprise ERP Testing Architecture

### 49.1 الهدف

ضمان أن النظام آمن محاسبياً وليس فقط ناجحاً تقنياً.

### 49.2 Unit Tests

- calculators:
  - invoice totals.
  - discounts.
  - landed cost allocation.
  - weighted average.
  - running balance.
- validators:
  - currency guard.
  - period guard.
  - approval guard.

### 49.3 Integration Tests

- sales invoice posting creates:
  - journal.
  - stock movements.
  - audit.
- purchase invoice posting creates:
  - valuation layers.
  - inventory debit.
  - supplier credit.
- voucher posting:
  - balanced lines.
  - payment account currency.

### 49.4 Financial Invariant Tests

- reject unbalanced journal.
- reject mixed currency.
- reject posted mutation.
- reversal creates exact opposite.
- account statement equals journal sum.
- AR/AP reports equal ledger.

### 49.5 Inventory Integrity Tests

- stock balance equals movements.
- sale decreases stock.
- purchase increases stock.
- transfer creates out/in.
- negative stock policy enforced.
- valuation recalculation deterministic.

### 49.6 Approval Workflow Tests

- maker cannot approve own document.
- amount threshold triggers policy.
- expired approval blocks posting.
- edit after approval invalidates approval.
- emergency override audited.

### 49.7 Rollback and Concurrency Tests

- failure midway leaves no journal/stock partial.
- two sales for same last stock: only one succeeds.
- duplicate idempotency key returns same result.
- deadlock retry does not duplicate posting.

### 49.8 Performance Tests

- account statement 100k lines.
- stock card 100k movements.
- dashboard aggregates.
- report export large dataset.
- posting throughput with concurrent users.

### 49.9 Security Tests

- API rejects missing permission.
- branch scope enforced.
- MFA required for privileged operation.
- export logs created.
- audit immutable endpoints unavailable.

## 50. Performance & Scalability Specification

### 50.1 Pagination Strategy

- keyset:
  - journal lines.
  - stock movements.
  - audit logs.
- offset:
  - small master data.
- max page enforced.

### 50.2 Heavy Reporting Optimization

- require date range.
- async jobs above threshold.
- materialized monthly aggregates.
- read replicas future.
- snapshots for closed periods.

### 50.3 Materialized Views Strategy

- monthly account balances.
- product warehouse balances.
- customer aging.
- supplier aging.
- branch trial balance.
- refresh:
  - event-driven for current period.
  - scheduled for historical.

### 50.4 Cache Invalidation Rules

- financial.posted:
  - invalidate account/customer/supplier/cash reports.
- stock.moved:
  - invalidate inventory/product/warehouse reports.
- period.closed:
  - freeze snapshot and invalidate live period cache.
- permission changed:
  - invalidate user permission/session cache.

### 50.5 Queue Strategy

- queues:
  - critical financial events.
  - reporting.
  - exports.
  - notifications.
  - integrity.
- priority:
  - financial outbox أعلى من reports.
- dead letter:
  - visible in ops UI.

### 50.6 Large Ledger Optimization

- partition by fiscal year or month future.
- indexes by account/currency/date.
- monthly opening snapshots for statements.
- avoid full ledger scans in request.

### 50.7 Inventory Performance Strategy

- stock_balances as cache.
- movement append-only.
- valuation snapshots.
- product/warehouse lock granularity.
- batch inserts for posting.

### 50.8 Database Indexing Matrix

| Area | Required Indexes |
|---|---|
| Ledger | accountId/currency/date, sourceType/sourceId, branchId/date |
| Sales | customerId/date, branchId/status/date, number |
| Purchases | supplierId/date, branchId/status/date |
| Inventory | productId/warehouseId/date, sourceType/sourceId |
| Approvals | status/currentStep/branch, documentType/documentId |
| Audit | entity/entityId/date, userId/date |
| Jobs | queue/status/runAt/priority |

## 51. AI Implementation Constraints

### 51.1 الهدف

هذه القواعد موجهة لأي AI Agent أو مطور ينفذ النظام. مخالفة أي قاعدة هنا تعني أن التنفيذ غير مقبول حتى لو كان يعمل ظاهرياً.

### 51.2 الممنوع برمجياً

- ممنوع direct balance updates.
- ممنوع direct stock updates.
- ممنوع تعديل posted entries.
- ممنوع duplicated calculations بين UI و backend كمصدرين للحقيقة.
- ممنوع duplicated validation بدون shared schema/guard.
- ممنوع Prisma داخل UI components.
- ممنوع business logic داخل route handlers.
- ممنوع giant services.
- ممنوع cross-module writes.
- ممنوع حذف financial records.
- ممنوع trust في totals القادمة من client.
- ممنوع bypass لـ PostingService.
- ممنوع bypass لـ InventoryMovementService.
- ممنوع bypass لـ ApprovalGuard عند policy مطلوبة.

### 51.3 Required Architectural Patterns

- Use Case لكل عملية business.
- Domain Service للحسابات والقواعد.
- Repository للـ persistence.
- DTO للحدود بين API/UI.
- Zod schemas للمدخلات.
- Guards للقواعد المشتركة:
  - PermissionGuard.
  - PeriodGuard.
  - CurrencyGuard.
  - ApprovalGuard.
  - InventoryGuard.
  - LedgerGuard.
- TransactionManager للعمليات الذرية.

### 51.4 Service Rules

- service لا يقرأ request مباشرة.
- service لا يرجع Prisma model كامل إذا فيه fields حساسة.
- service لا يفتح transaction إذا استلم tx.
- service لا يكتب audit بشكل اختياري في العمليات الحساسة؛ audit إلزامي.
- calculations يجب أن تكون pure حيث يمكن.

### 51.5 Validation Rules

- UI validation للراحة.
- API validation إلزامي.
- business validation في use case.
- invariant validation قبل commit.
- post-condition validation بعد persist للترحيل المالي.

### 51.6 DTO Rules

- DTOs عربية labels في UI، لكن fields تقنية مستقرة.
- لا تمرير passwordHash.
- لا تمرير internal audit payload لغير المصرح.
- money DTO يحتوي:
  - amount.
  - currency.
  - exchangeRateSnapshot إذا مطلوب.

### 51.7 Repository Rules

- repository CRUD فقط.
- لا يحتوي accounting logic.
- لا يحتوي permission checks.
- يقبل tx client.
- لا يستخدم raw SQL إلا للـ reports/optimized queries مع مراجعة.

### 51.8 Use Case Rules

- use case يملك orchestration.
- يحدد transaction boundary.
- يستدعي guards.
- يستدعي services.
- يكتب audit.
- يرجع DTO واضح.

### 51.9 Code Organization Rules

- كل module داخل `src/modules`.
- shared guards داخل `src/shared`.
- route handlers thin.
- tests بجانب module أو داخل test suites واضحة.
- لا circular dependencies.
- لا imports من infrastructure إلى presentation.

### 51.10 AI Agent Work Rules

- قبل تعديل module اقرأ contracts الخاصة به.
- لا تضف balance field logic دون ledger derivation.
- لا تضف status جديد دون تحديث state machine.
- لا تضف API mutation دون audit/permission/validation.
- لا تضف report مالي دون reconciliation rule.
- لا تضف stock operation دون movement and valuation impact.
- لا تضف approval-sensitive operation دون ApprovalGuard.

## 52. Enterprise State Machine Specifications - Final Execution Contracts

### 52.1 الهدف

هذا القسم هو العقد النهائي لتنفيذ الحالات. عند بناء أي شاشة أو API أو Service يجب أن يطابق الـ transition هنا. أي transition غير موجود هنا يعتبر ممنوعاً افتراضياً حتى تتم إضافته صراحة في الوثيقة.

### 52.2 Global State Machine Rules

- كل state transition يجب أن ينفذ داخل Use Case.
- كل transition يجب أن يسجل audit event.
- كل transition مالي يجب أن يمر عبر PostingService.
- كل transition مخزني يجب أن يمر عبر InventoryMovementService أو ValuationEngine حسب الحالة.
- كل transition يحتاج permission check وstate guard.
- كل transition من حالة نهائية لا يسمح إلا عبر reversal/reopen/correction workflow.
- كل transition concurrent يجب أن يستخدم lock واضح على sourceId.

### 52.3 Sales Invoice State Machine

#### Text Diagram

```text
DRAFT
  -> RESERVED
  -> PENDING_APPROVAL
  -> POSTING
RESERVED
  -> PENDING_APPROVAL
  -> POSTING
  -> CANCELLED
PENDING_APPROVAL
  -> APPROVED
  -> REJECTED
  -> CANCELLED
APPROVED
  -> POSTING
  -> CANCELLED
POSTING
  -> POSTED
  -> POSTING_FAILED
POSTED
  -> PARTIALLY_RETURNED
  -> FULLY_RETURNED
  -> CANCELLING
CANCELLING
  -> REVERSED
  -> REVERSAL_FAILED
POSTING_FAILED
  -> POSTING
  -> CANCELLED
```

#### Transition Matrix

| Transition | Allowed Action | Validations | Permission | Lock | Posting/Reversal |
|---|---|---|---|---|---|
| DRAFT -> RESERVED | reserve | lines valid, stock available | `sales.create` | invoice + stock | reservation only |
| DRAFT -> PENDING_APPROVAL | submit | approval policy required | `sales.create` | invoice | no posting |
| DRAFT -> POSTING | post | no approval required, period open, stock available | `sales.post` | invoice + stock + period | create journal/stock OUT |
| RESERVED -> POSTING | post | reservation active, period open | `sales.post` | invoice + reservation | consume reservation |
| PENDING_APPROVAL -> APPROVED | approve | maker/checker, policy version | `approvals.approve` | approval request | no posting |
| APPROVED -> POSTING | post | document hash unchanged | `sales.post` | invoice | create journal |
| POSTING -> POSTED | commit | journal balanced, stock committed | system | DB transaction | final |
| POSTING -> POSTING_FAILED | rollback | rollback complete | system | operation | no partial effect |
| POSTED -> CANCELLING | cancel | reason, period policy | `sales.cancel` | invoice + period | start reversal |
| CANCELLING -> REVERSED | reverse commit | reversal balanced | system | invoice + stock | reversal journal |
| POSTED -> PARTIALLY_RETURNED | create return | qty <= available to return | `sales.return` | invoice + return | return document |
| POSTED -> FULLY_RETURNED | create full return | all remaining qty returned | `sales.return` | invoice + return | return document |

#### Forbidden Transitions

- POSTED -> DRAFT.
- POSTED -> CANCELLED without reversal.
- REVERSED -> POSTED.
- CANCELLED -> POSTING.
- PENDING_APPROVAL -> POSTING without APPROVED/OVERRIDDEN.

#### Rollback and Audit

- POSTING failure rollback كامل.
- cancellation after POSTED requires reversal audit.
- every failed transition writes security/audit event with requestId.

### 52.4 Purchase Invoice State Machine

#### Text Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTED -> PARTIALLY_RETURNED
POSTED -> FULLY_RETURNED
POSTED -> CANCELLING -> REVERSED
DRAFT/APPROVED -> CANCELLED
POSTING -> POSTING_FAILED -> POSTING
```

#### Transition Matrix

| Transition | Validations | Permission | Posting Behavior |
|---|---|---|---|
| DRAFT -> PENDING_APPROVAL | supplier/warehouse/lines valid | `purchases.create` | none |
| DRAFT -> POSTING | approval not required, period open | `purchases.post` | inventory IN + AP/Cash journal |
| APPROVED -> POSTING | approval fresh, hash unchanged | `purchases.post` | valuation layers |
| POSTING -> POSTED | journal + valuation committed | system | final |
| POSTED -> CANCELLING | no hard close conflict | `purchases.cancel` | reversal |
| POSTED -> PARTIALLY_RETURNED | return qty valid | `purchases.return` | purchase return document |
| POSTED -> FULLY_RETURNED | all qty returned | `purchases.return` | purchase return document |

#### Forbidden

- تغيير landed cost بعد POSTED.
- حذف layer مستهلك.
- POSTED -> DRAFT.
- تغيير supplier/currency بعد approval.

### 52.5 Sales Return State Machine

#### Text Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTED -> CANCELLING -> REVERSED
DRAFT -> CANCELLED
POSTING -> POSTING_FAILED -> POSTING
```

#### Rules

- must reference original sales invoice unless permission `salesReturn.freeReturn`.
- returned quantity <= sold quantity - previous returns.
- return currency = original invoice currency.
- posting:
  - Debit Sales Returns/Revenue Contra.
  - Credit Cash/AR.
  - Debit Inventory.
  - Credit COGS.
- lock:
  - original invoice.
  - product/warehouse stock balance.
  - fiscal period.

### 52.6 Purchase Return State Machine

#### Text Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
POSTED -> CANCELLING -> REVERSED
DRAFT -> CANCELLED
POSTING -> POSTING_FAILED
```

#### Rules

- return quantity <= purchased remaining.
- if stock already sold:
  - reject direct return or create cost correction according to policy.
- posting:
  - Debit AP/Cash.
  - Credit Inventory.
  - cost adjustment if valuation affected.
- lock:
  - supplier account.
  - product/warehouse valuation layers.

### 52.7 Voucher State Machine

#### Applies To

- Receipt Voucher.
- Payment Voucher.
- Exchange Voucher.
- Allowance Voucher.
- Entry Voucher.

#### Text Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTED -> CANCELLING -> REVERSED
DRAFT/APPROVED -> CANCELLED
POSTING -> POSTING_FAILED -> POSTING
```

#### Transition Rules

| Voucher Type | Required Validation | Posting Behavior |
|---|---|---|
| RECEIPT | payment account currency, counterparty | Debit cash/bank, Credit AR/account |
| PAYMENT | sufficient cash if enforced | Debit AP/expense, Credit cash/bank |
| EXCHANGE | from/to currencies different | currency-specific journals |
| ALLOWANCE | reason, counterparty | discount allowed/earned |
| ENTRY | balanced lines | manual journal |

#### Forbidden

- POSTED voucher amount edit.
- changing payment account after POSTED.
- deleting voucher with journalEntryId.

### 52.8 Journal Entry State Machine

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTED -> REVERSING -> REVERSED
DRAFT -> CANCELLED
POSTING -> POSTING_FAILED
```

- DRAFT -> POSTING requires:
  - debit = credit.
  - same currency.
  - active posting accounts.
  - open period.
- POSTED is immutable.
- REVERSING creates new journal; original remains unchanged.
- direct delete forbidden after POSTED.

### 52.9 Stock Transfer State Machine

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> DISPATCHING -> IN_TRANSIT -> RECEIVING -> RECEIVED -> POSTED
DRAFT/APPROVED -> CANCELLED
POSTED -> REVERSING -> REVERSED
```

- DISPATCHING locks source stock.
- RECEIVING validates destination warehouse.
- same branch transfer creates stock OUT/IN.
- inter-branch transfer creates due-to/due-from journals.
- partial receive allowed only if policy enabled.

### 52.10 Stock Adjustment State Machine

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> CANCELLED
POSTED -> REVERSING -> REVERSED
```

- positive adjustment:
  - IN movement.
  - Debit Inventory.
- negative adjustment:
  - OUT movement.
  - Credit Inventory.
- approval required for:
  - high value.
  - negative adjustment.
  - protected warehouse.

### 52.11 Inventory Count State Machine

```text
DRAFT -> COUNTING -> REVIEW -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT/COUNTING/REVIEW -> CANCELLED
POSTED -> LOCKED
```

- COUNTING forbids stock posting freeze if policy requires.
- REVIEW computes differences server-side.
- POSTING creates stock adjustments only for differences.
- POSTED count cannot be edited.

### 52.12 Fiscal Period State Machine

```text
FUTURE -> OPEN -> CLOSING_IN_PROGRESS -> SOFT_CLOSED -> HARD_CLOSED -> ARCHIVED
HARD_CLOSED -> REOPEN_REQUESTED -> REOPENED -> CLOSING_IN_PROGRESS
```

- OPEN allows normal posting.
- CLOSING_IN_PROGRESS blocks new posting.
- SOFT_CLOSED allows approved adjustments.
- HARD_CLOSED blocks all posting.
- REOPENED requires approval and audit.

### 52.13 Approval Workflow State Machine

```text
NOT_REQUIRED
DRAFT -> SUBMITTED -> PENDING_APPROVAL -> PARTIALLY_APPROVED -> APPROVED
PENDING_APPROVAL -> REJECTED -> REWORK -> SUBMITTED
PENDING_APPROVAL -> EXPIRED
PENDING_APPROVAL -> OVERRIDDEN
```

- approve requires approver eligibility.
- reject requires reason.
- override requires MFA and privileged permission.
- document hash mismatch invalidates approval.

### 52.14 Financial Posting State Machine

```text
REQUESTED -> LOCK_ACQUIRED -> VALIDATING -> BUILDING_JOURNAL -> PERSISTING -> COMMITTED
PERSISTING -> FAILED_ROLLED_BACK -> RETRY_PENDING
COMMITTED -> EVENT_PUBLISH_PENDING -> EVENTS_PUBLISHED
REQUESTED -> IDEMPOTENT_REPLAY
COMMITTED -> REVERSAL_REQUESTED -> REVERSED
```

- `FAILED_ROLLED_BACK` has no financial effect.
- `EVENT_PUBLISH_PENDING` means financial commit succeeded.
- retry allowed only with same idempotency hash.

### 52.15 User Session State Machine

```text
ANONYMOUS -> AUTHENTICATED_LOW_TRUST -> ACTIVE -> HIGH_TRUST
ACTIVE -> STEP_UP_REQUIRED -> HIGH_TRUST
ACTIVE/HIGH_TRUST -> REVOKED
ACTIVE/HIGH_TRUST -> EXPIRED
ANY -> LOCKED
```

- HIGH_TRUST expires quickly.
- role change downgrades active sessions.
- suspicious event can force LOCKED.

## 53. Non-Negotiable Financial Invariants - Final Specification

### 53.1 الهدف

هذه القواعد هي خط الدفاع النهائي لمنع الفساد المحاسبي. لا يسمح لأي AI Agent أو مطور بتجاوزها بحجة تبسيط التنفيذ أو تحسين السرعة.

### 53.2 Invariants Matrix

| Invariant | Description | Enforcement Layer | Validation Flow | Failure Behavior | Recovery | Audit |
|---|---|---|---|---|---|---|
| Journal Balance | كل قيد debit=credit | JournalBuilder, LedgerValidator | قبل persist وبعد persist | reject/rollback | fix builder/source | financial failure event |
| Immutable Posting | POSTED لا يعدل | Service, DB policy | state guard | reject | reversal | tamper audit |
| Reversal-only Correction | التصحيح بقيد عكسي | ReversalService | source status check | reject direct edit | reversal/correction doc | reversal audit |
| Currency Isolation | لا خلط عملات | CurrencyGuard | account+line+source currency | reject | exchange voucher | currency violation |
| Ledger Consistency | كل source له journal صحيح | PostingLinkGuard | source/journal matching | block close | repair posting approval | reconciliation audit |
| AR/AP Derived | الذمم من ledger | Reporting/Ledger | compare report to ledger | report warning/block close | rebuild cache | reconciliation log |
| Stock Movement Integrity | كل حركة لها source | InventoryGuard | source link exists | reject/block close | correction movement | stock audit |
| Inventory Consistency | balances=sum movements | Reconciliation | periodic check | alert/block close | rebuild stock_balance | integrity event |
| Fiscal Period Lock | لا posting في locked period | PeriodGuard | document date period | 423 reject | reopen/adjustment | lock violation |
| Posting Idempotency | لا duplicate posting | PostingOperation | idempotency key+hash | replay/conflict | inspect operation | operation audit |
| Audit Immutability | audit append-only | DB permission/hash chain | write once | security alert | restore from archive | signed event |
| Reconciliation Integrity | reports match sources | ReconciliationEngine | scheduled/manual | blocker | approved correction | reconciliation report |

### 53.3 Journal Balancing Rules

- كل journal entry يجب أن يحتوي سطرين على الأقل.
- كل line يجب أن يكون debit أو credit فقط.
- لا يسمح بصفر في debit و credit معاً.
- مجموع debit ومجموع credit يحسبان Decimal server-side.
- rounding difference لا يسمح إلا بحساب rounding معرف.

### 53.4 Immutable Posting Rules

- POSTED entities:
  - journal entries.
  - vouchers.
  - invoices.
  - stock movements.
  - closing snapshots.
- fields immutable:
  - amount.
  - currency.
  - date.
  - exchangeRateSnapshot.
  - accountId.
  - productId.
  - warehouseId.

### 53.5 Failure and Rollback Strategy

- invariant failure قبل commit:
  - rollback كامل.
  - no source status change.
- invariant failure بعد commit:
  - critical alert.
  - freeze affected operations if financial.
  - create investigation case.
- recovery لا يتم بصمت:
  - approval.
  - audit.
  - correction/reversal.

## 54. Enterprise Database Constraints Matrix

### 54.1 الهدف

تحويل قواعد السلامة إلى constraints واضحة في قاعدة البيانات والخدمات، بحيث لا يؤدي خطأ في UI أو Service إلى فساد محاسبي.

### 54.2 Constraint Matrix

| Area | Constraint | Type | الهدف | Accounting Impact | Performance Impact |
|---|---|---|---|---|---|
| Accounts | `companyId, code` unique | Unique | منع تكرار الحساب | دليل حسابات مستقر | index مفيد |
| Journal | `entryNumber` unique per company/year | Unique | رقم قيد ثابت | audit واضح | lookup سريع |
| Journal Lines | debit/credit check | Check | منع line غير صالح | توازن قيود | negligible |
| Source Posting | source posted once | Unique partial | منع duplicate posting | يمنع مضاعفة الإيراد | source lookup |
| Currency | line currency matches account | Service/DB trigger future | عزل العملات | يمنع خلط ledger | validation cost |
| Stock Balance | product/warehouse unique | Unique | رصيد واحد | يمنع تضارب مخزون | update سريع |
| Stock Movement | quantity > 0 | Check | حركة صحيحة | valuation صحيح | negligible |
| Payment Account | accountId unique | Unique | حساب صندوق واحد | يمنع double cash | lookup |
| Customer Account | customer/currency unique | Unique | ذمة عملة واحدة | AR صحيح | lookup |
| Supplier Account | supplier/currency unique | Unique | ذمة عملة واحدة | AP صحيح | lookup |
| Period | no overlapping dates | Exclusion/Service | منع تداخل فترات | إغلاق صحيح | validation |
| Audit | append-only | Permission/Policy | منع التلاعب | audit reliable | write only |

### 54.3 Foreign Key Restrictions

- RESTRICT:
  - accounts referenced by journal_lines.
  - products referenced by stock_movements.
  - warehouses referenced by stock_movements.
  - customers referenced by invoices/journal partner lines.
  - suppliers referenced by purchases/journal partner lines.
- CASCADE only:
  - many-to-many permissions.
  - draft child lines قبل posting.
- SET NULL:
  - user reference in historical audit only إذا retention يتطلب بقاء السجل بعد تعطيل المستخدم.

### 54.4 Immutable Fields and Archival

- immutable enforced by:
  - service state guard.
  - update repository allowlist.
  - future DB trigger for financial tables.
- archival:
  - لا ينقل posted records بطريقة تكسر FKs.
  - يعتمد snapshots وpartitioning.
  - archived data remains queryable for audit.

### 54.5 Concurrency-safe Constraints

- optimistic version on editable documents.
- unique idempotency operation.
- sequence row lock for numbering.
- stock_balance row lock.
- valuation layer lock for FIFO.
- approval request unique active per document.

## 55. Transaction Ownership & Boundary Architecture - Final Specification

### 55.1 Transaction Ownership Rules

| Owner | Can Open Transaction | Scope |
|---|---|---|
| PostingTransactionManager | نعم | financial posting |
| ClosingOrchestrator | نعم | closing task unit |
| Use Case | نعم | non-financial business mutation |
| Repository | لا | receives tx only |
| Route Handler | لا | calls use case |
| UI | لا | no DB access |
| Reporting Query | لا للقراءة | read-only |
| Worker | نعم عبر use case | job scope |

### 55.2 Transaction Lifecycle

1. validate outside transaction where safe.
2. acquire logical lock.
3. open DB transaction.
4. re-read source with row lock.
5. re-run critical validations.
6. persist all writes.
7. write audit.
8. run post-condition checks.
9. commit.
10. publish events via outbox.

### 55.3 Atomicity Rules

- invoice posting atomic with journal and stock.
- voucher posting atomic with journal.
- stock adjustment atomic with movement and journal.
- approval action atomic with request state.
- period close tasks split into safe atomic units, not one long transaction.

### 55.4 Distributed Transaction Prevention

- لا distributed transaction بين DB وخدمة خارجية.
- external effects after commit via outbox.
- file export after commit/job.
- notifications async.
- BI sync async.

### 55.5 Deadlock Prevention

- lock ordering mandatory:
  - company/period.
  - branch.
  - source document.
  - numbering.
  - accounts sorted.
  - stock balances sorted.
  - valuation layers sorted.
- no user interaction inside transaction.
- no network calls inside transaction.

### 55.6 Reconciliation Transactions

- read checks are read-only.
- cache rebuild transaction per account/product scope.
- financial repair always new posting transaction.
- no direct mutation to posted records.

## 56. Enterprise Module Boundary Contracts - Final Specification

### 56.1 Module Ownership Matrix

| Module | Owns | Cannot Modify | Required Services |
|---|---|---|---|
| Sales | invoices, sales returns, sales pricing workflow | journal_lines, account balances, stock_balances | PostingService, InventoryReservationService |
| Purchases | purchase invoices, landed cost documents, purchase returns | averageCost directly, AP balances | PostingService, ValuationEngine |
| Accounting | accounts, journals, vouchers, ledger reports | stock quantities directly | LedgerValidator, ReversalService |
| Inventory | stock movements, balances, reservations, valuation layers | AR/AP/cash ledger directly | InventoryMovementService, ValuationEngine |
| Closing | period states, snapshots, close validations | posted source mutation | ClosingOrchestrator, ReconciliationService |
| Approvals | policies, requests, actions | source financial effects | ApprovalGuard |
| Reporting | projections, report jobs, snapshots | operational writes | ReportingEngine |
| Security | sessions, MFA, security events | business documents | AuthService, PermissionService |
| Users | users, roles, direct permissions | financial data | PermissionService |

### 56.2 Forbidden Dependencies

- Sales importing Accounting repositories directly.
- Purchases updating Product cost fields directly.
- Inventory creating journal entries without PostingService coordination.
- Reporting updating operational tables.
- UI importing Prisma client.
- Route handlers implementing business rules.

### 56.3 Communication Contracts

- synchronous:
  - use case calls domain service.
- asynchronous:
  - outbox events for reporting/notifications.
- cross-module data:
  - DTOs only.
  - no leaking Prisma internal model as public contract.

### 56.4 Ledger Restrictions

- ledger writes only through PostingService.
- manual journal only through Accounting use cases.
- reversal only through ReversalService.
- balances are read models, not mutable facts.

## 57. Enterprise API Contract Standards - Final Specification

### 57.1 Request Lifecycle

```text
request
  -> requestId
  -> auth
  -> session trust
  -> permission
  -> branch scope
  -> validation
  -> state guard
  -> invariant guard
  -> use case
  -> audit
  -> response
```

### 57.2 Response Standard

- success response:
  - `success`.
  - `data`.
  - `meta.requestId`.
  - pagination meta when list.
- error response:
  - `success=false`.
  - `error.code`.
  - `error.message` عربي واضح.
  - `error.details`.
  - `error.requestId`.

### 57.3 Mutation Standard

- mutation endpoints must define:
  - permission.
  - idempotency requirement.
  - version requirement.
  - audit action.
  - transaction owner.
  - state transition.
- retry-safe mutations:
  - posting.
  - reversal.
  - close.
  - export.
  - payment.

### 57.4 Error Normalization

| Code | Meaning |
|---|---|
| `VALIDATION_ERROR` | input invalid |
| `STATE_TRANSITION_DENIED` | transition forbidden |
| `PERIOD_LOCKED` | fiscal period blocked |
| `CURRENCY_MISMATCH` | currency isolation violation |
| `JOURNAL_NOT_BALANCED` | ledger invariant failure |
| `STOCK_NOT_AVAILABLE` | insufficient stock |
| `APPROVAL_REQUIRED` | approval missing |
| `IDEMPOTENCY_CONFLICT` | same key different payload |
| `POSTING_LOCKED` | concurrent posting |

### 57.5 Versioning and Compatibility

- internal APIs keep stable DTOs.
- breaking DTO changes require version field or new endpoint.
- deprecated fields documented.
- no silent response shape changes.

## 58. Enterprise Error Handling & Recovery Architecture - Final Specification

### 58.1 Posting Failure Handling

- validation failure:
  - return error.
  - no state mutation.
- lock failure:
  - return `POSTING_LOCKED`.
  - user can retry.
- transaction failure:
  - rollback.
  - operation FAILED.
- after commit failure:
  - financial state committed.
  - outbox retry.

### 58.2 Reconciliation Failure Handling

- warning:
  - report badge.
  - no block.
- blocker:
  - period close blocked.
  - finance admin alert.
- critical:
  - freeze affected posting scope.
  - incident required.

### 58.3 Corruption and Orphan Detection

- orphan types:
  - posted source without journal.
  - journal without source.
  - movement without source.
  - approval approved for changed document.
  - audit chain gap.
- recovery:
  - no automatic financial mutation.
  - create investigation case.
  - approved correction/reversal.

### 58.4 Recovery Orchestration

1. detect.
2. classify severity.
3. freeze scope if needed.
4. notify responsible role.
5. generate evidence report.
6. approve recovery action.
7. execute via safe service.
8. re-run reconciliation.
9. close incident.

### 58.5 Escalation Rules

- financial invariant failure:
  - CFO/admin notification.
- audit immutability failure:
  - security alert.
- backup failure:
  - operations alert.
- repeated deadlocks:
  - engineering alert.

## 59. Enterprise Testing Architecture - Final Specification

### 59.1 Test Boundaries

- unit tests:
  - pure calculations and guards.
- integration tests:
  - DB + use cases.
- end-to-end tests:
  - critical workflows.
- invariant tests:
  - financial safety.
- concurrency tests:
  - locks/idempotency.

### 59.2 Deterministic Financial Fixtures

- fixed exchange rates.
- fixed chart of accounts.
- fixed products and costs.
- fixed fiscal periods.
- no random dates without seed.
- Decimal comparison with explicit scale.

### 59.3 Required Posting Tests

- sales cash invoice.
- sales credit invoice.
- mixed payment sales invoice.
- purchase cash invoice.
- purchase credit invoice.
- receipt voucher.
- payment voucher.
- exchange voucher.
- reversal for every posted type.

### 59.4 Required Invariant Tests

- cannot post unbalanced journal.
- cannot mix currencies.
- cannot mutate posted invoice.
- cannot post locked period.
- cannot sell unavailable stock without override.
- cannot approve own document when forbidden.
- idempotent retry does not duplicate journals.

### 59.5 Concurrency Tests

- two users post same invoice.
- two sales consume same stock.
- close period while posting.
- retry after simulated deadlock.
- duplicate voucher number generation.

### 59.6 Security Tests

- route rejects missing permission.
- branch scope enforced.
- step-up required.
- export logged.
- audit append-only.

## 60. Performance & Scalability Architecture - Final Specification

### 60.1 Pagination and Large Data

- account statement:
  - keyset by `entryDate, journalLineId`.
- stock movements:
  - keyset by `movementDate, id`.
- audit logs:
  - keyset by `createdAt, id`.
- master data:
  - offset allowed with max page.

### 60.2 Large Ledger Optimization

- monthly account balance snapshots.
- fiscal year partitioning future.
- summary tables for dashboard.
- no full ledger aggregation in request.
- account statement starts from nearest snapshot.

### 60.3 Inventory Query Optimization

- stock_balances for current stock.
- stock_movements for audit.
- valuation layers indexed by product/warehouse/date.
- reservation summary per product/warehouse.

### 60.4 Reporting Optimization

- closed period reports from snapshots.
- heavy reports async.
- materialized views for monthly summaries.
- cache by filters hash and permission scope.
- exports stream to storage.

### 60.5 Queue and Async Rules

- financial outbox high priority.
- reports medium priority.
- notifications low priority.
- jobs idempotent.
- dead letter visible.
- no financial posting inside generic report worker.

### 60.6 Database Indexing Matrix

| Table | Index | Purpose |
|---|---|---|
| journal_lines | accountId, currency, createdAt, id | statement |
| journal_lines | branchId, accountId, currency, createdAt | branch reports |
| sales_invoices | companyId, branchId, status, date | list |
| purchase_invoices | companyId, branchId, status, date | list |
| stock_movements | productId, warehouseId, movementDate, id | stock card |
| stock_balances | productId, warehouseId | current stock |
| approval_requests | status, branchId, currentStepOrder | inbox |
| audit_logs | entity, entityId, createdAt | audit trace |
| background_jobs | queueName, status, runAt, priority | workers |

## 61. AI Implementation Constraints - Final Specification

### 61.1 الهدف

هذا القسم هو تعليمات تنفيذ إلزامية لأي AI Agent مثل Big Pickle. الهدف منع الاختراعات العشوائية، التكرار، تحديث الأرصدة مباشرة، أو إدخال business logic في أماكن خاطئة.

### 61.2 ممنوع برمجياً

- direct balance updates.
- direct stock updates.
- mutable posted entries.
- duplicated calculations.
- duplicated validation.
- Prisma inside UI.
- business logic inside routes.
- giant services.
- cross-module violations.
- financial writes outside PostingService.
- stock writes outside InventoryMovementService.
- cost writes outside ValuationEngine.
- approval bypass.
- audit optional writes في العمليات الحساسة.

### 61.3 Required Patterns

- `UseCase` لكل workflow.
- `DomainService` لكل منطق محاسبي/مخزني.
- `Repository` للوصول للبيانات فقط.
- `DTO` لكل API boundary.
- `Guard` لكل rule مشتركة.
- `TransactionManager` للعمليات الذرية.
- `Outbox` للأحداث بعد commit.

### 61.4 Repository Rules

- لا business logic.
- لا permission logic.
- لا transaction ownership.
- يقبل tx client.
- يستخدم select محدود.
- raw SQL فقط للقراءات الثقيلة وبمراجعة.

### 61.5 Service Rules

- service name واضح ومحدد.
- no god service.
- no UI dependency.
- no direct request dependency.
- calculations pure where possible.
- audit through AuditService.

### 61.6 DTO and Validation Rules

- request DTO منفصل عن DB model.
- response DTO لا يكشف secrets.
- Zod schema لكل mutation.
- business validation في use case.
- invariant validation في domain/guard.
- server recalculates financial totals.

### 61.7 Transaction Rules

- route لا يفتح transaction.
- repository لا يفتح transaction.
- use case أو manager يفتح transaction.
- no nested transaction.
- no external calls inside transaction.
- all financial mutations atomic.

### 61.8 Naming Conventions

- Use cases:
  - `PostSalesInvoiceUseCase`.
  - `ReverseVoucherUseCase`.
  - `CloseFiscalPeriodUseCase`.
- Services:
  - `PostingService`.
  - `LedgerValidator`.
  - `InventoryMovementService`.
  - `ValuationEngine`.
- Guards:
  - `PeriodGuard`.
  - `CurrencyGuard`.
  - `ApprovalGuard`.
  - `PermissionGuard`.
- DTOs:
  - `CreateSalesInvoiceRequest`.
  - `SalesInvoiceResponse`.
  - `PostingResult`.

### 61.9 Big Pickle Safe Execution Rules

- قبل تنفيذ أي module:
  - اقرأ state machine.
  - اقرأ module contract.
  - اقرأ invariants.
  - اقرأ transaction boundary.
- عند إضافة mutation:
  - permission.
  - validation.
  - state transition.
  - audit.
  - transaction.
  - tests.
- عند إضافة report:
  - source of truth.
  - reconciliation rule.
  - permission.
  - export control.
- عند إضافة inventory operation:
  - movement.
  - balance effect.
  - valuation effect.
  - accounting effect.
- عند إضافة accounting operation:
  - balanced journal.
  - currency isolation.
  - period guard.
  - immutable posting.

## 62. Enterprise State Machine Layer - AI-safe Final Blueprint

### 62.1 الهدف

هذا القسم يضيف طبقة تنفيذ نهائية للـ State Machines موجهة للـ AI Agents. أي تنفيذ يجب أن يقرأ الحالات هنا كـ source of truth للحركة بين الحالات. إذا احتاجت عملية transition غير موجود، يجب إيقاف التنفيذ وتحديث الوثيقة أولاً.

### 62.2 قواعد تنفيذ عامة

- كل state transition يجب أن يكون function/use case مستقل.
- كل transition يجب أن يعلن:
  - source state.
  - target state.
  - permission.
  - validations.
  - locks.
  - transaction owner.
  - audit action.
- كل transition مالي يجب أن يكون idempotent.
- كل transition مالي أو مخزني يجب أن يمنع partial success.
- كل failure transition يجب أن يترك الكيان في حالة قابلة للفهم والاسترداد.
- recovery transitions لا تنفذ بصمت؛ تحتاج audit واضح.

### 62.3 Sales Invoice

#### State Diagram

```text
DRAFT
  -> RESERVED
  -> PENDING_APPROVAL
  -> POSTING
  -> CANCELLED
RESERVED
  -> PENDING_APPROVAL
  -> POSTING
  -> CANCELLED
PENDING_APPROVAL
  -> APPROVED
  -> REJECTED
  -> EXPIRED
APPROVED
  -> POSTING
  -> CANCELLED
POSTING
  -> POSTED
  -> POSTING_FAILED
POSTING_FAILED
  -> POSTING
  -> CANCELLED
POSTED
  -> PARTIALLY_RETURNED
  -> FULLY_RETURNED
  -> CANCELLING
CANCELLING
  -> REVERSED
  -> REVERSAL_FAILED
REVERSAL_FAILED
  -> CANCELLING
```

#### Transition Contract

| Transition | Permission | Validations | Lock Behavior | Audit | Failure/Recovery |
|---|---|---|---|---|---|
| DRAFT -> RESERVED | `sales.create` | active products, active warehouse, available stock | invoice + stock rows | reservation audit | failure keeps DRAFT |
| DRAFT/RESERVED -> PENDING_APPROVAL | `sales.create` | approval policy matched, document complete | invoice | approval requested | rejection -> REJECTED |
| DRAFT/RESERVED/APPROVED -> POSTING | `sales.post` | period open, currency isolated, totals recalculated, approval valid | invoice + period + stock | posting started | rollback -> POSTING_FAILED |
| POSTING -> POSTED | system | journal balanced, stock movements persisted | DB transaction | posted event | final state |
| POSTED -> CANCELLING | `sales.cancel` | reason, period policy, not already reversed | invoice + period | cancellation requested | failure -> REVERSAL_FAILED |
| CANCELLING -> REVERSED | system | reversal journal balanced, stock reversal valid | invoice + stock | reversal audit | final reversed |
| POSTED -> PARTIALLY_RETURNED | `sales.return` | return qty valid | invoice + return | return audit | creates Sales Return |
| POSTED -> FULLY_RETURNED | `sales.return` | all remaining qty returned | invoice + return | return audit | creates Sales Return |

#### Forbidden Transitions

- POSTED -> DRAFT.
- POSTED -> CANCELLED دون CANCELLING/REVERSED.
- REVERSED -> POSTED.
- PENDING_APPROVAL -> POSTING.
- POSTING_FAILED -> POSTED دون retry كامل عبر PostingService.

#### Edge Cases

- customer disabled after draft:
  - posting يرفض إلا بصلاحية override.
- stock changed after reservation:
  - reservation يحمي الكمية؛ إن انتهت صلاحيته يعاد التحقق.
- approval expired:
  - invoice يعود إلى PENDING_APPROVAL/EXPIRED ولا يرحل.

### 62.4 Purchase Invoice

#### State Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> PARTIALLY_RETURNED
POSTED -> FULLY_RETURNED
POSTED -> CANCELLING -> REVERSED
DRAFT/APPROVED -> CANCELLED
```

#### Transition Contract

- DRAFT -> POSTING:
  - validates supplier if credit.
  - validates warehouse.
  - validates landed cost distribution.
  - locks purchase invoice, period, stock balance rows.
- POSTING -> POSTED:
  - creates inventory IN.
  - creates valuation layers.
  - creates AP/Cash journal.
- POSTED -> CANCELLING:
  - forbidden if valuation layers consumed and policy forbids direct reversal.
  - otherwise creates reversal and cost correction if needed.
- POSTED -> PARTIALLY_RETURNED/FULLY_RETURNED:
  - creates Purchase Return document.

### 62.5 Sales Return

#### State Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> CANCELLING -> REVERSED
DRAFT -> CANCELLED
```

#### Rules

- original sales invoice required unless `salesReturn.freeReturn`.
- return quantity cannot exceed sold remaining quantity.
- posting behavior:
  - reverse revenue portion.
  - restore inventory.
  - reverse COGS.
- lock:
  - original invoice.
  - product/warehouse balance.
  - fiscal period.
- failure:
  - no stock movement without journal.

### 62.6 Purchase Return

#### State Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> CANCELLING -> REVERSED
DRAFT -> CANCELLED
```

#### Rules

- return quantity cannot exceed purchased available quantity.
- if returned stock was sold:
  - use cost adjustment workflow.
- posting behavior:
  - reduce inventory.
  - reduce AP or increase cash receivable from supplier.
- locks:
  - purchase invoice.
  - valuation layers.
  - supplier ledger scope.

### 62.7 Voucher

#### State Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> CANCELLING -> REVERSED
DRAFT/APPROVED -> CANCELLED
```

#### Contract

| Type | Posting Behavior | Critical Validations |
|---|---|---|
| RECEIPT | Debit Cash/Bank, Credit AR/Account | payment account currency |
| PAYMENT | Debit AP/Expense, Credit Cash/Bank | sufficient balance policy |
| EXCHANGE | Separate currency-safe entries | exchange snapshot |
| ALLOWANCE | Discount allowed/earned | reason and counterparty |
| ENTRY | Manual journal | balanced lines |

### 62.8 Journal Entry

#### State Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> REVERSING -> REVERSED
DRAFT -> CANCELLED
```

- POSTED journal is immutable.
- REVERSING creates new entry.
- DRAFT delete allowed only if no audit/legal restriction.
- manual journal on protected accounts requires approval.

### 62.9 Stock Transfer

#### State Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> DISPATCHING -> IN_TRANSIT -> RECEIVING -> RECEIVED -> POSTED
APPROVED -> POSTING -> POSTED
POSTED -> REVERSING -> REVERSED
DRAFT/APPROVED -> CANCELLED
```

- same warehouse transfer forbidden.
- inter-branch transfer requires due-to/due-from.
- partial receive requires policy.
- in-transit transfer blocks branch close if unresolved.

### 62.10 Stock Adjustment

#### State Diagram

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> REVERSING -> REVERSED
DRAFT -> CANCELLED
```

- positive adjustment creates IN movement.
- negative adjustment creates OUT movement.
- high-value adjustments require approval.
- reason mandatory.

### 62.11 Inventory Count

#### State Diagram

```text
DRAFT -> COUNTING -> REVIEW -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED -> LOCKED
COUNTING -> CANCELLED
REVIEW -> CANCELLED
POSTING -> POSTING_FAILED -> POSTING
```

- counted quantities editable only in COUNTING.
- differences calculated server-side.
- POSTED count creates adjustment documents.
- LOCKED count is read-only.

### 62.12 Fiscal Period

#### State Diagram

```text
FUTURE -> OPEN -> CLOSING_IN_PROGRESS -> SOFT_CLOSED -> HARD_CLOSED -> ARCHIVED
HARD_CLOSED -> REOPEN_REQUESTED -> REOPENED -> CLOSING_IN_PROGRESS
CLOSING_IN_PROGRESS -> OPEN
```

- CLOSING_IN_PROGRESS -> OPEN only on failed/aborted close before hard close.
- HARD_CLOSED cannot accept posting.
- REOPENED must create snapshot version on re-close.

### 62.13 Approval Workflow

#### State Diagram

```text
NOT_REQUIRED
DRAFT -> SUBMITTED -> PENDING_APPROVAL -> PARTIALLY_APPROVED -> APPROVED
PENDING_APPROVAL -> REJECTED -> REWORK -> SUBMITTED
PENDING_APPROVAL -> EXPIRED -> SUBMITTED
PENDING_APPROVAL -> OVERRIDDEN
```

- self-approval forbidden when policy says so.
- document edit invalidates approval.
- override requires MFA, reason, privileged permission.

### 62.14 Financial Posting

#### State Diagram

```text
REQUESTED -> LOCK_ACQUIRED -> VALIDATING -> BUILDING_JOURNAL -> PERSISTING -> COMMITTED -> EVENT_PUBLISH_PENDING -> EVENTS_PUBLISHED
REQUESTED -> IDEMPOTENT_REPLAY
VALIDATING -> FAILED_VALIDATION
PERSISTING -> FAILED_ROLLED_BACK -> RETRY_PENDING -> REQUESTED
COMMITTED -> REVERSAL_REQUESTED -> REVERSED
```

- FAILED_VALIDATION has no DB mutation except operation log.
- FAILED_ROLLED_BACK has no financial effect.
- EVENT_PUBLISH_PENDING is financially committed.

### 62.15 User Session

#### State Diagram

```text
ANONYMOUS -> AUTHENTICATED_LOW_TRUST -> ACTIVE
ACTIVE -> STEP_UP_REQUIRED -> HIGH_TRUST -> ACTIVE
ACTIVE -> REVOKED
ACTIVE -> EXPIRED
ANY -> LOCKED
LOCKED -> ACTIVE
```

- LOCKED -> ACTIVE requires admin/security recovery.
- HIGH_TRUST expires by timer.
- role changes downgrade session trust.

## 63. Enterprise Database Constraint Matrix - Unified System Layer

### 63.1 الهدف

توحيد قيود قاعدة البيانات لكل النظام بحيث تكون constraints جزءاً من التصميم لا مجرد تفاصيل Prisma. هذه القيود تمنع فساد ledger والمخزون والصلاحيات حتى لو أخطأ الكود.

### 63.2 Unified Constraint Matrix

| Domain | Constraint | Enforcement Layer | الهدف | Performance Impact | Accounting Impact | Recovery Implications |
|---|---|---|---|---|---|---|
| Users | unique email | DB | منع تكرار login | index سريع | لا مباشر | merge غير مسموح؛ تعطيل أحدهما |
| Permissions | unique key | DB | صلاحية مستقرة | lookup سريع | حماية access | seed repair |
| Accounts | unique company/code | DB | دليل حسابات ثابت | index مفيد | يمنع خلط ledger | create correction account لا rename عشوائي |
| Accounts | posting account cannot have children | Service + DB future | شجرة صحيحة | validation | يمنع posting على parent | move children أو disable |
| Journal | source posted once | DB unique partial | منع duplicate posting | source lookup | يمنع مضاعفة الأثر | idempotent replay |
| Journal Lines | debit/credit check | DB + Validator | line صالح | negligible | يمنع قيد فاسد | reject |
| Currency | account/line/source match | Guard + DB future | عزل عملات | validation cost | يمنع ledger مختلط | exchange voucher |
| Sales | unique branch/number | DB | ترقيم موثوق | index | audit وفواتير | no reuse |
| Purchases | unique branch/number | DB | ترقيم موثوق | index | AP trace | no reuse |
| Stock | product/warehouse balance unique | DB | رصيد واحد | update سريع | valuation صحيح | rebuild from movements |
| Stock Movement | quantity positive | DB | حركة صالحة | negligible | COGS صحيح | correction movement |
| Reservations | active source unique | DB partial | منع حجز مكرر | lookup | مخزون متاح صحيح | release duplicate |
| Fiscal Period | no overlapping periods | Service + DB exclusion future | إغلاق صحيح | validation | يمنع posting تاريخي خاطئ | period repair approval |
| Audit | append-only | DB permission/hash | حماية التدقيق | write-only | دليل قانوني | restore/incident |

### 63.3 Cascade and Restrict Policies

- Cascade مسموح فقط:
  - role_permissions.
  - user_roles.
  - draft lines قبل posting.
  - temporary report cache.
- Restrict إلزامي:
  - accounts with journal_lines.
  - products with stock_movements.
  - warehouses with stock_movements.
  - payment accounts with vouchers/invoices.
  - periods with posted documents.
- Set Null مشروط:
  - historical createdBy/user refs إذا حذف/تعطيل المستخدم لا يجب أن يكسر التاريخ.

### 63.4 Immutable Field Rules

- immutable after POSTED:
  - amounts.
  - currency.
  - exchangeRateSnapshot.
  - document date.
  - accountId.
  - productId.
  - warehouseId.
  - source links.
- immutable always:
  - audit logs.
  - signed events.
  - closing snapshots.
  - stock movements after creation.

### 63.5 Soft Delete and Archival Policies

- master data:
  - disable/soft delete.
- financial documents:
  - no delete.
  - cancel/reverse only.
- inventory movements:
  - no delete.
  - correction movement only.
- archival:
  - partition/snapshot without breaking FK.
  - closed period snapshots remain queryable.

### 63.6 Indexing Strategy

| Area | Index | Notes |
|---|---|---|
| Ledger | `accountId, currency, entryDate, id` | account statement |
| Ledger Source | `sourceType, sourceId` | posting trace |
| Branch Ledger | `branchId, accountId, currency, entryDate` | branch reports |
| Sales | `companyId, branchId, status, date` | operational list |
| Purchases | `supplierId, date, status` | supplier drilldown |
| Inventory | `productId, warehouseId, movementDate, id` | stock card |
| Audit | `entity, entityId, createdAt` | entity history |
| Jobs | `queueName, status, runAt, priority` | worker pickup |

### 63.7 Concurrency-safe Constraints

- document `version` for optimistic updates.
- posting operation unique idempotency.
- numbering sequence row lock.
- stock_balance row lock per product/warehouse.
- approval active request unique per document.
- no two hard close runs for same period.

## 64. Enterprise Financial Invariants

### 64.1 الهدف

هذه الطبقة تشرح invariants كمواصفات تنفيذ، لا كنصائح. كل invariant له validation flow، failure behavior، rollback، reconciliation، وaudit implication.

### 64.2 Invariants Matrix

| Invariant | Description | Validation Flow | Enforcement Layer | Failure Behavior | Rollback | Reconciliation | Audit |
|---|---|---|---|---|---|---|---|
| Journal Balancing | debit equals credit | build -> validate -> persist -> post-check | JournalBuilder/LedgerValidator | reject posting | full rollback | ledger scan | financial failure |
| Immutable Posting | no edits after POSTED | state guard before mutation | Service/Repository allowlist | reject | none | tamper scan | security event |
| Reversal-only Correction | corrections through reversal | source state + reversal guard | ReversalService | reject direct correction | reversal transaction | reversal matching | reversal chain |
| Inventory Consistency | stock balance equals movements | movement write + nightly check | InventoryService | block close | rollback movement transaction | rebuild balance | integrity event |
| Stock Movement Integrity | every movement linked to source | source link check | InventoryMovementService | reject movement | rollback | orphan scan | stock audit |
| Ledger Consistency | every posted source linked to journal | posting link post-check | PostingService | critical if missing | rollback if before commit | source-ledger reconciliation | posting audit |
| AR/AP Derivation | AR/AP from ledger | report compare to ledger | ReportingEngine | report warning/block close | no direct rollback | rebuild read model | reconciliation audit |
| Currency Isolation | no mixed currency ledger | currency guard | CurrencyGuard | reject | rollback | currency mismatch scan | violation audit |
| Fiscal Period Locking | no posting in locked period | period lookup + lock | PeriodGuard | 423 reject | none | period posting scan | lock violation |
| Audit Immutability | audit append-only | hash chain | AuditService/DB | security incident | restore archive | hash verify | signed event |
| Posting Atomicity | source/journal/stock all-or-nothing | transaction post-check | TransactionManager | rollback | full rollback | orphan detection | operation log |

### 64.3 Recovery Strategies

- cache/read model mismatch:
  - rebuild from ledger/movements.
- posted source without journal:
  - freeze source.
  - incident.
  - approved repair posting or reversal.
- unbalanced journal detected:
  - freeze financial posting scope.
  - restore from backup or approved corrective incident plan.
- audit chain mismatch:
  - security incident.
  - compare archive.
  - no silent repair.

## 65. Enterprise Module Responsibility Contracts

### 65.1 الهدف

هذه العقود تمنع cross-module corruption. كل module له ownership واضح، ولا يسمح له بتعديل حقائق مالية أو مخزنية خارج حدوده.

### 65.2 Module Contract Matrix

| Module | Ownership Boundaries | Forbidden Modifications | Allowed Dependencies | Required Services |
|---|---|---|---|---|
| Sales | sales invoices, returns, sales workflow | balances, journal_lines, stock_balances | Customers read, Products read, Pricing | PostingService, InventoryReservationService |
| Purchases | purchase invoices, landed costs, purchase returns | product cost direct, AP balance direct | Suppliers read, Products read | PostingService, ValuationEngine |
| Accounting | accounts, journals, vouchers, ledger | stock quantities direct | Settings, Periods | LedgerValidator, ReversalService |
| Inventory | movements, balances, reservations, counts | AR/AP/cash direct | Products, Warehouses | InventoryMovementService, ValuationEngine |
| Approvals | policies, requests, actions | source amounts or posting state direct | Users/Roles, Documents read | ApprovalGuard |
| Closing | period state, snapshots, close tasks | posted document mutation | Ledger, Inventory, Reporting read | ClosingOrchestrator |
| Reporting | facts, projections, exports | operational writes | Ledger/Inventory read models | ReportingEngine |
| Security | auth, sessions, MFA, security events | business source state | Users/Permissions | AuthService |
| Users | users, roles, permissions | financial records | Security | PermissionService |

### 65.3 Communication Contracts

- writes عبر use cases فقط.
- cross-module effects عبر services أو outbox events.
- no direct repository import across bounded contexts إلا read-only repository مصرح.
- DTO contracts ثابتة.
- module لا يعرف تفاصيل schema الداخلية لموديول آخر إلا عبر interface.

### 65.4 Transaction Boundaries by Module

- Sales does not own posting transaction.
- Purchases does not own valuation transaction alone; it delegates.
- Inventory owns non-financial movement drafts, but financial stock operations go through PostingService.
- Accounting owns manual journal transaction.
- Closing owns close task transactions, not source mutation directly.

## 66. Enterprise Transaction Ownership Rules

### 66.1 Transaction Ownership Matrix

| Operation | Transaction Owner | Included Writes | Forbidden Inside |
|---|---|---|---|
| Sales Posting | PostingTransactionManager | invoice, journal, stock, audit | external calls |
| Purchase Posting | PostingTransactionManager | purchase, journal, valuation, stock, audit | UI prompts |
| Voucher Posting | PostingTransactionManager | voucher, journal, audit | direct balance update |
| Stock Adjustment | PostingTransactionManager if financial, Inventory UseCase if non-financial draft | movement, journal if financial | partial movement |
| Approval Action | ApprovalUseCase | request, action, document approval state | posting |
| Period Close | ClosingOrchestrator | task result, snapshots, period state | long-running full DB lock |
| Report Export | ReportJobUseCase | job, file metadata, audit | ledger mutation |

### 66.2 Transaction Lifecycle

1. normalize request.
2. validate auth/permission outside transaction.
3. acquire logical lock.
4. open transaction.
5. re-read source row with lock.
6. validate state and period again.
7. persist domain writes.
8. write audit.
9. run post-condition checks.
10. commit.
11. publish outbox asynchronously.

### 66.3 Nested Transaction Prevention

- repository cannot call `$transaction`.
- service cannot call `$transaction` if `tx` provided.
- use case owns one transaction boundary.
- nested transaction requires explicit architecture exception.

### 66.4 Rollback Hierarchy

- validation fail:
  - no transaction write.
- domain fail inside transaction:
  - rollback all.
- outbox fail after commit:
  - retry outbox, no rollback.
- reconciliation fail:
  - no mutation, creates incident/blocker.

### 66.5 Idempotent Retry Behavior

- retry with same key/hash returns same result or resumes safe operation.
- retry with same key/different hash rejected.
- retry after rollback creates new attempt under same operation trace.
- retry after commit never creates duplicate journal.

### 66.6 Distributed Transaction Prevention

- no direct dependency on email/file/BI success inside financial transaction.
- all side effects through outbox.
- external integrations receive committed events only.

## 67. Enterprise Testing Architecture - Final Quality Gate

### 67.1 الهدف

تحويل الوثيقة إلى testable blueprint. لا يعتبر أي feature مكتمل دون اختبارات تثبت invariants والترحيل والتراجع والتزامن.

### 67.2 Test Strategy Matrix

| Test Type | Scope | Required For |
|---|---|---|
| Unit | calculators, guards, builders | totals, currency, landed cost |
| Integration | use case + DB | posting, approval, inventory |
| Invariant | financial rules | journal, AR/AP, stock |
| Concurrency | locks/idempotency | posting, stock, numbering |
| Rollback | failure injection | posting and reversal |
| E2E | critical user flows | invoice to ledger |
| Performance | large ledgers/reports | statements, exports |
| Security | permissions/session/MFA | sensitive APIs |

### 67.3 Deterministic Fixture Strategy

- fixed chart of accounts.
- fixed fiscal periods.
- fixed exchange rates.
- fixed product costs.
- fixed customer/supplier accounts.
- deterministic document numbers.
- no random current date in financial tests.

### 67.4 Required Financial Tests

- cash sales invoice balances.
- credit sales invoice AR.
- purchase invoice AP.
- receipt voucher reduces AR.
- payment voucher reduces AP/cash.
- exchange voucher does not mix currencies.
- reversal creates exact inverse.
- period lock prevents posting.

### 67.5 Required Inventory Tests

- purchase increases stock.
- sale decreases stock.
- transfer creates OUT/IN.
- adjustment creates movement and journal.
- inventory count creates adjustments only for differences.
- valuation layer consumed correctly.
- negative stock blocked unless override.

### 67.6 Failure and Concurrency Tests

- duplicate post request creates one journal.
- failure after journal before stock rolls back all.
- two users sell same stock.
- close period during posting.
- deadlock retry does not duplicate.
- approval expires before posting.

### 67.7 Security and Permission Tests

- missing permission denied.
- branch scope denied.
- maker cannot approve if forbidden.
- privileged operation requires step-up.
- export logs audit.
- posted mutation endpoint rejects.

## 68. Enterprise Recovery & Failure Handling Layer

### 68.1 الهدف

تحديد كيفية التعامل مع الفشل دون إفساد ledger أو المخزون. recovery لا يعني تعديل مباشر؛ يعني workflow مضبوط ومراجع.

### 68.2 Failure Classification

| Failure | Severity | Behavior | Recovery |
|---|---|---|---|
| Validation | Low | reject | user correction |
| Lock timeout | Medium | retry possible | retry/backoff |
| Deadlock | Medium | rollback | automatic limited retry |
| Posting partial risk | High | rollback or freeze | incident |
| Reconciliation mismatch | High | block close | approved correction |
| Audit chain gap | Critical | security incident | restore/investigate |
| Unbalanced posted journal | Critical | freeze financial scope | incident/restore |

### 68.3 Recovery Orchestration Workflow

```text
Detect -> Classify -> Isolate Scope -> Notify -> Evidence Snapshot -> Approve Recovery -> Execute Safe Correction -> Reconcile -> Close Incident
```

### 68.4 Orphan Detection

- posted invoice without journal.
- journal without source.
- stock movement without source.
- approval for changed document.
- report snapshot hash mismatch.
- audit event missing previousHash.

### 68.5 Financial Self-Healing Rules

- allowed automatically:
  - rebuild read-model balances.
  - rebuild stock_balances from movements.
  - republish outbox.
  - refresh report cache.
- forbidden automatically:
  - edit posted journal.
  - create correction journal.
  - delete orphan financial record.
  - change exchange snapshot.

### 68.6 Escalation Rules

- critical financial issue:
  - notify finance admin.
  - freeze period or source type.
- security issue:
  - notify security admin.
  - revoke suspicious sessions.
- repeated worker failures:
  - operations alert.

## 69. AI Implementation Constraints - Big Pickle Final Guardrails

### 69.1 الهدف

هذا القسم هو آخر حارس ضد hallucinations وrandom refactors. إذا تعارض اقتراح AI Agent مع هذه القواعد، يجب رفض الاقتراح.

### 69.2 ممنوع برمجياً

- direct balance updates.
- direct stock updates.
- mutable posted entries.
- duplicated calculations.
- duplicated validation.
- Prisma inside UI.
- business logic inside routes.
- giant services.
- cross-module violations.
- financial writes outside PostingService.
- stock writes outside InventoryMovementService.
- cost changes outside ValuationEngine.
- approval bypass.
- audit bypass.
- period guard bypass.
- currency guard bypass.

### 69.3 Required Architectural Patterns

- Use Case per business operation.
- Domain Service per accounting/inventory rule group.
- Repository only for persistence.
- DTO for every boundary.
- Guard for reusable validations.
- TransactionManager for atomic operations.
- Outbox for after-commit events.
- State Machine check before mutation.

### 69.4 Repository Rules

- no accounting logic.
- no permission logic.
- no transaction ownership.
- no UI imports.
- accepts `tx`.
- returns selected fields only.
- raw SQL only for reviewed reporting queries.

### 69.5 Service Rules

- service does one domain responsibility.
- service cannot mutate another module directly.
- service must not open nested transactions.
- service must be testable without UI.
- financial service must return audit metadata.

### 69.6 DTO and Naming Rules

- request DTO != database model.
- response DTO hides sensitive/internal fields.
- money fields always include currency.
- exchange fields always include snapshot basis.
- use case names:
  - `PostSalesInvoiceUseCase`.
  - `PostPurchaseInvoiceUseCase`.
  - `ReverseJournalEntryUseCase`.
  - `CloseFiscalPeriodUseCase`.
- guard names:
  - `CurrencyGuard`.
  - `PeriodGuard`.
  - `ApprovalGuard`.
  - `LedgerInvariantGuard`.

### 69.7 Transaction Rules for AI Agents

- before writing code identify transaction owner.
- never call Prisma transaction in UI/route/repository.
- never do external calls inside transaction.
- every financial mutation must be atomic.
- every retryable mutation must use idempotency key.

### 69.8 Big Pickle Execution Checklist

- هل العملية لها state transition موثق؟
- هل الصلاحية موثقة؟
- هل يوجد Zod schema؟
- هل يوجد business validation؟
- هل يوجد invariant validation؟
- هل يوجد audit؟
- هل يوجد transaction boundary؟
- هل يوجد rollback behavior؟
- هل توجد اختبارات invariant؟
- هل يوجد منع للكتابة المباشرة على balances/stock؟

### 69.9 Final Rule

- إذا لم يكن الأثر المالي مفهوماً، لا تنفذ.
- إذا لم يكن الأثر المخزني مفهوماً، لا تنفذ.
- إذا لم تكن العملة واضحة، لا تنفذ.
- إذا لم تكن الفترة المالية واضحة، لا تنفذ.
- إذا كان المستند POSTED، لا تعدل؛ اعكس أو صحح بمستند رسمي.
