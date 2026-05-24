import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

const PERMISSIONS = [
  { key: "users.view", name: "عرض المستخدمين", module: "users" },
  { key: "users.create", name: "إنشاء مستخدم", module: "users" },
  { key: "users.edit", name: "تعديل مستخدم", module: "users" },
  { key: "users.delete", name: "حذف مستخدم", module: "users" },
  { key: "roles.view", name: "عرض الأدوار", module: "roles" },
  { key: "roles.manage", name: "إدارة الأدوار", module: "roles" },
  { key: "customers.view", name: "عرض العملاء", module: "customers" },
  { key: "customers.create", name: "إنشاء عميل", module: "customers" },
  { key: "customers.edit", name: "تعديل عميل", module: "customers" },
  { key: "customers.delete", name: "حذف عميل", module: "customers" },
  {
    key: "customers.receivables.view",
    name: "عرض مستحقات العميل",
    module: "customers",
  },
  {
    key: "customers.statement.view",
    name: "عرض كشف حساب العميل",
    module: "customers",
  },
  {
    key: "collections.view",
    name: "عرض التحصيلات",
    module: "collections",
  },
  {
    key: "collections.create",
    name: "إنشاء تحصيل",
    module: "collections",
  },
  {
    key: "customerCategories.view",
    name: "عرض أقسام العملاء",
    module: "customers",
  },
  {
    key: "customerCategories.create",
    name: "إنشاء قسم عميل",
    module: "customers",
  },
  {
    key: "customerCategories.edit",
    name: "تعديل قسم عميل",
    module: "customers",
  },
  {
    key: "customerCategories.delete",
    name: "حذف قسم عميل",
    module: "customers",
  },
  { key: "suppliers.view", name: "عرض الموردين", module: "suppliers" },
  { key: "suppliers.create", name: "إنشاء مورد", module: "suppliers" },
  { key: "suppliers.edit", name: "تعديل مورد", module: "suppliers" },
  { key: "suppliers.delete", name: "حذف مورد", module: "suppliers" },
  { key: "products.view", name: "عرض المواد", module: "products" },
  { key: "products.create", name: "إنشاء مادة", module: "products" },
  { key: "products.edit", name: "تعديل مادة", module: "products" },
  { key: "products.delete", name: "حذف مادة", module: "products" },
  {
    key: "products.viewPurchasePrice",
    name: "عرض سعر الشراء",
    module: "products",
  },
  { key: "products.editPrice", name: "تعديل الأسعار", module: "products" },
  { key: "warehouses.view", name: "عرض المخازن", module: "warehouses" },
  { key: "warehouses.create", name: "إنشاء مخزن", module: "warehouses" },
  { key: "warehouses.edit", name: "تعديل مخزن", module: "warehouses" },
  { key: "warehouses.delete", name: "حذف مخزن", module: "warehouses" },
  { key: "warehouses.manage", name: "إدارة المخازن", module: "warehouses" },
  {
    key: "stockMovements.view",
    name: "عرض حركات المخزون",
    module: "inventory",
  },
  {
    key: "stockMovements.create",
    name: "إنشاء حركة مخزون",
    module: "inventory",
  },
  {
    key: "stockMovements.edit",
    name: "تعديل حركة مخزون",
    module: "inventory",
  },
  {
    key: "stockMovements.delete",
    name: "حذف حركة مخزون",
    module: "inventory",
  },
  {
    key: "stockMovements.post",
    name: "ترحيل حركة مخزون",
    module: "inventory",
  },
  {
    key: "stockTransfers.view",
    name: "عرض تحويلات المخزون",
    module: "inventory",
  },
  {
    key: "stockTransfers.create",
    name: "إنشاء تحويل مخزون",
    module: "inventory",
  },
  {
    key: "stockTransfers.edit",
    name: "تعديل تحويل مخزون",
    module: "inventory",
  },
  {
    key: "stockTransfers.delete",
    name: "حذف تحويل مخزون",
    module: "inventory",
  },
  {
    key: "stockTransfers.post",
    name: "ترحيل تحويل مخزون",
    module: "inventory",
  },
  {
    key: "stockAdjustments.view",
    name: "عرض تسويات المخزون",
    module: "inventory",
  },
  {
    key: "stockAdjustments.create",
    name: "إنشاء تسوية مخزون",
    module: "inventory",
  },
  {
    key: "stockAdjustments.edit",
    name: "تعديل تسوية مخزون",
    module: "inventory",
  },
  {
    key: "stockAdjustments.delete",
    name: "حذف تسوية مخزون",
    module: "inventory",
  },
  {
    key: "stockAdjustments.post",
    name: "ترحيل تسوية مخزون",
    module: "inventory",
  },
  {
    key: "inventoryValuation.view",
    name: "عرض تقييم المخزون",
    module: "inventory",
  },
  {
    key: "inventoryAudit.view",
    name: "عرض تدقيق المخزون",
    module: "inventory",
  },
  {
    key: "stockBalances.view",
    name: "عرض أرصدة المخزون",
    module: "inventory",
  },
  { key: "exchangeRates.view", name: "عرض سعر الصرف", module: "exchangeRates" },
  {
    key: "exchangeRates.manage",
    name: "إدارة سعر الصرف",
    module: "exchangeRates",
  },
  { key: "invoices.view", name: "عرض الفواتير", module: "invoices" },
  { key: "invoices.create", name: "إنشاء فاتورة", module: "invoices" },
  { key: "invoices.edit", name: "تعديل فاتورة", module: "invoices" },
  { key: "invoices.delete", name: "حذف فاتورة", module: "invoices" },
  { key: "sales.view", name: "عرض فواتير البيع", module: "sales" },
  { key: "sales.create", name: "إنشاء فاتورة بيع", module: "sales" },
  { key: "sales.edit", name: "تعديل فاتورة بيع", module: "sales" },
  { key: "sales.delete", name: "حذف فاتورة بيع", module: "sales" },
  { key: "sales.post", name: "ترحيل فاتورة بيع", module: "sales" },
  { key: "salesReturns.view", name: "عرض مرتجعات المبيعات", module: "sales" },
  { key: "salesReturns.create", name: "إنشاء مرتجع بيع", module: "sales" },
  { key: "salesReturns.post", name: "ترحيل مرتجع بيع", module: "sales" },
  { key: "auditLogs.view", name: "عرض سجل النشاطات", module: "audit" },
  { key: "reports.view", name: "عرض التقارير", module: "reports" },
  { key: "settings.view", name: "عرض الإعدادات", module: "settings" },
  { key: "settings.manage", name: "إدارة الإعدادات", module: "settings" },
  { key: "accounts.view", name: "عرض الحسابات", module: "accounts" },
  { key: "accounts.manage", name: "إدارة الحسابات", module: "accounts" },
  { key: "purchases.view", name: "عرض المشتريات", module: "purchases" },
  {
    key: "purchases.create",
    name: "إنشاء فاتورة مشتريات",
    module: "purchases",
  },
  { key: "purchases.edit", name: "تعديل فاتورة مشتريات", module: "purchases" },
  { key: "purchases.delete", name: "حذف فاتورة مشتريات", module: "purchases" },
  { key: "purchases.print", name: "طباعة فاتورة مشتريات", module: "purchases" },
  {
    key: "paymentAccounts.view",
    name: "عرض حسابات التسديد",
    module: "purchases",
  },
  {
    key: "paymentAccounts.manage",
    name: "إدارة حسابات التسديد",
    module: "purchases",
  },

  // Phase 1 — Foundation Core
  { key: "accounts.create", name: "إنشاء حساب", module: "accounts" },
  { key: "accounts.edit", name: "تعديل حساب", module: "accounts" },
  { key: "accounts.delete", name: "حذف حساب", module: "accounts" },
  { key: "accounts.statement", name: "كشف حساب", module: "accounts" },
  { key: "accounts.tree", name: "شجرة الحسابات", module: "accounts" },
  { key: "companies.view", name: "عرض الشركات", module: "companies" },
  { key: "companies.create", name: "إنشاء شركة", module: "companies" },
  { key: "companies.edit", name: "تعديل شركة", module: "companies" },
  { key: "branches.view", name: "عرض الفروع", module: "branches" },
  { key: "branches.create", name: "إنشاء فرع", module: "branches" },
  { key: "branches.edit", name: "تعديل فرع", module: "branches" },
  {
    key: "fiscalPeriods.view",
    name: "عرض الفترات المالية",
    module: "fiscalPeriods",
  },
  {
    key: "fiscalPeriods.manage",
    name: "إدارة الفترات المالية",
    module: "fiscalPeriods",
  },
  { key: "journals.create", name: "إنشاء قيد يومي", module: "journals" },
  { key: "journals.post", name: "ترحيل قيد يومي", module: "journals" },
  { key: "journals.reverse", name: "عكس قيد يومي", module: "journals" },
];

const ROLES = [
  {
    name: "مدير النظام",
    description: "صلاحية كاملة على جميع أقسام النظام",
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    name: "محاسب",
    description: "عرض وإدارة الحسابات والفواتير والعملاء والمواد",
    permissions: [
      "customers.view",
      "customers.create",
      "customers.edit",
      "products.view",
      "products.viewPurchasePrice",
      "warehouses.view",
      "warehouses.create",
      "warehouses.edit",
      "stockMovements.view",
      "stockMovements.create",
      "stockMovements.edit",
      "stockBalances.view",
      "exchangeRates.view",
      "exchangeRates.manage",
      "invoices.view",
      "invoices.create",
      "invoices.edit",
      "sales.view",
      "sales.create",
      "sales.edit",
      "sales.delete",
      "sales.post",
      "salesReturns.view",
      "salesReturns.create",
      "salesReturns.post",
      "customers.receivables.view",
      "customers.statement.view",
      "collections.view",
      "collections.create",
      "accounts.view",
      "accounts.manage",
      "purchases.view",
      "purchases.create",
      "paymentAccounts.view",
      "paymentAccounts.manage",
      "reports.view",
    ],
  },
  {
    name: "موظف مبيعات",
    description:
      "إنشاء الفواتير وعرض العملاء (ممنوع رؤية سعر الشراء) (ممنوع تعديل الأسعار)",
    permissions: [
      "customers.view",
      "customers.create",
      "customers.receivables.view",
      "customers.statement.view",
      "collections.view",
      "collections.create",
      "products.view",
      "invoices.view",
      "invoices.create",
      "sales.view",
      "sales.create",
      "salesReturns.view",
      "salesReturns.create",
    ],
  },
  {
    name: "موظف مخزن",
    description: "إدارة المخازن والمواد",
    permissions: [
      "products.view",
      "products.create",
      "products.edit",
      "warehouses.view",
      "warehouses.create",
      "warehouses.edit",
      "warehouses.delete",
      "stockMovements.view",
      "stockMovements.create",
      "stockMovements.edit",
      "stockMovements.delete",
      "stockMovements.post",
      "stockTransfers.view",
      "stockTransfers.create",
      "stockTransfers.edit",
      "stockTransfers.delete",
      "stockTransfers.post",
      "stockAdjustments.view",
      "stockAdjustments.create",
      "stockAdjustments.edit",
      "stockAdjustments.delete",
      "stockAdjustments.post",
      "inventoryValuation.view",
      "inventoryAudit.view",
      "stockBalances.view",
    ],
  },
  {
    name: "مراقب",
    description: "عرض التقارير فقط",
    permissions: [
      "reports.view",
      "customers.view",
      "products.view",
      "invoices.view",
      "auditLogs.view",
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  const permissionRecords: Record<string, string> = {};
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, module: perm.module },
      create: { key: perm.key, name: perm.name, module: perm.module },
    });
    permissionRecords[perm.key] = created.id;
  }
  console.log(`Created ${PERMISSIONS.length} permissions`);

  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description, isSystem: true },
      create: {
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
      },
    });

    for (const permKey of roleData.permissions) {
      const permId = permissionRecords[permKey];
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: permId },
          },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
    console.log(`Role "${roleData.name}" created/updated`);
  }

  const adminPasswordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@grass.com" },
    update: {
      name: "مدير النظام",
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    create: {
      name: "مدير النظام",
      email: "admin@grass.com",
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  const adminRole = await prisma.role.findUnique({
    where: { name: "مدير النظام" },
  });
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }

  await prisma.paymentAccount.upsert({
    where: { name: "صندوق IQD" },
    update: { type: "CASH", currency: "IQD", balance: 0 },
    create: { name: "صندوق IQD", type: "CASH", currency: "IQD", balance: 0 },
  });

  await prisma.paymentAccount.upsert({
    where: { name: "صندوق USD" },
    update: { type: "CASH", currency: "USD", balance: 0 },
    create: { name: "صندوق USD", type: "CASH", currency: "USD", balance: 0 },
  });

  await prisma.paymentAccount.upsert({
    where: { name: "مصرف الرافدين" },
    update: { type: "BANK", currency: "IQD", balance: 0 },
    create: {
      name: "مصرف الرافدين",
      type: "BANK",
      currency: "IQD",
      balance: 0,
    },
  });

  const قطعةPackaging = await prisma.productPackaging.upsert({
    where: { name: "قطعة" },
    update: { piecesPerCarton: 0 },
    create: { name: "قطعة", piecesPerCarton: 0 },
  });

  const كارتونPackaging = await prisma.productPackaging.upsert({
    where: { name: "كارتون" },
    update: { piecesPerCarton: 12 },
    create: { name: "كارتون", piecesPerCarton: 12 },
  });

  // Phase 1 — Seed Foundation Core Data

  const company = await prisma.company.upsert({
    where: { code: "GRASS" },
    update: {
      name: "شركة GRASS للتوزيع",
      taxId: null,
      address: "بغداد",
      phone: null,
      email: "info@grass.com",
    },
    create: {
      code: "GRASS",
      name: "شركة GRASS للتوزيع",
      taxId: null,
      address: "بغداد",
      phone: null,
      email: "info@grass.com",
    },
  });
  console.log(`Company created: ${company.name}`);

  // Bind admin user to company for company access enforcement
  await prisma.user.update({
    where: { id: admin.id },
    data: { companyId: company.id },
  });

  // ── System owner from environment variables ──────────────
  const ownerEmail = process.env["SYSTEM_OWNER_EMAIL"];
  const ownerPassword = process.env["SYSTEM_OWNER_PASSWORD"];
  const ownerName = process.env["SYSTEM_OWNER_NAME"] || "System Owner";

  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "SYSTEM_OWNER_EMAIL and SYSTEM_OWNER_PASSWORD are required. Add them to your .env file.",
    );
  }

  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 12);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      name: ownerName,
      passwordHash: ownerPasswordHash,
      isActive: true,
      companyId: company.id,
    },
    create: {
      name: ownerName,
      email: ownerEmail,
      passwordHash: ownerPasswordHash,
      isActive: true,
      companyId: company.id,
    },
  });

  const ownerRole = await prisma.role.findUnique({
    where: { name: "مدير النظام" },
  });
  if (ownerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
      update: {},
      create: { userId: owner.id, roleId: ownerRole.id },
    });
  }
  console.log(`System owner configured: ${owner.email}`);

  const branch = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: "MAIN" } },
    update: { name: "الفرع الرئيسي", address: "بغداد" },
    create: {
      companyId: company.id,
      code: "MAIN",
      name: "الفرع الرئيسي",
      address: "بغداد",
    },
  });
  console.log(`Branch created: ${branch.name}`);

  // Seed warehouse linked to company and branch
  await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "WH-MAIN" } },
    update: { name: "المخزن الرئيسي", address: "بغداد", branchId: branch.id },
    create: {
      companyId: company.id,
      branchId: branch.id,
      name: "المخزن الرئيسي",
      code: "WH-MAIN",
      address: "بغداد",
    },
  });

  const fiscalYear = new Date().getFullYear();
  const periodName = `${fiscalYear}`;
  const existingPeriod = await prisma.fiscalPeriod.findFirst({
    where: { companyId: company.id, branchId: branch.id, name: periodName },
  });
  if (!existingPeriod) {
    await prisma.fiscalPeriod.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        name: periodName,
        startDate: new Date(fiscalYear, 0, 1),
        endDate: new Date(fiscalYear, 11, 31),
        status: "OPEN",
      },
    });
  }
  console.log(`Fiscal period ready: ${periodName}`);

  const chartOfAccounts: {
    code: string;
    name: string;
    type: string;
    currency: string;
    normalBalance: string;
    isPosting: boolean;
    parentCode?: string;
    isSystem?: boolean;
    isProtected?: boolean;
  }[] = [
    {
      code: "1",
      name: "الأصول",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: false,
    },
    {
      code: "1.1",
      name: "الأصول المتداولة",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: false,
      parentCode: "1",
    },
    {
      code: "1.1.1",
      name: "الصندوق - دينار",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "1.1.2",
      name: "الصندوق - دولار",
      type: "ASSET",
      currency: "USD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "1.1.3",
      name: "المصرف - جاري",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "1.1.4",
      name: "المصرف - دولار",
      type: "ASSET",
      currency: "USD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "1.1.5",
      name: "المخزون",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "1.1.6",
      name: "الذمم المدينة - دينار",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "1.1.7",
      name: "الذمم المدينة - دولار",
      type: "ASSET",
      currency: "USD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "1.2",
      name: "الأصول الثابتة",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: false,
      parentCode: "1",
    },
    {
      code: "1.2.1",
      name: "الأثاث والتجهيزات",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.2",
    },
    {
      code: "1.2.2",
      name: "السيارات",
      type: "ASSET",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "1.2",
    },
    {
      code: "2",
      name: "الخصوم",
      type: "LIABILITY",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: false,
    },
    {
      code: "2.1",
      name: "الخصوم المتداولة",
      type: "LIABILITY",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: false,
      parentCode: "2",
    },
    {
      code: "2.1.1",
      name: "الذمم الدائنة - دينار",
      type: "LIABILITY",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: true,
      parentCode: "2.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "2.1.2",
      name: "الذمم الدائنة - دولار",
      type: "LIABILITY",
      currency: "USD",
      normalBalance: "CREDIT",
      isPosting: true,
      parentCode: "2.1",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "2.1.3",
      name: "الرواتب والأجور المستحقة",
      type: "LIABILITY",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: true,
      parentCode: "2.1",
    },
    {
      code: "3",
      name: "حقوق الملكية",
      type: "EQUITY",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: false,
    },
    {
      code: "3.1",
      name: "رأس المال",
      type: "EQUITY",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: true,
      parentCode: "3",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "3.2",
      name: "الأرباح المحتجزة",
      type: "EQUITY",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: true,
      parentCode: "3",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "4",
      name: "الإيرادات",
      type: "INCOME",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: false,
    },
    {
      code: "4.1",
      name: "إيرادات المبيعات",
      type: "INCOME",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: true,
      parentCode: "4",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "4.2",
      name: "إيرادات أخرى",
      type: "INCOME",
      currency: "IQD",
      normalBalance: "CREDIT",
      isPosting: true,
      parentCode: "4",
    },
    {
      code: "5",
      name: "المصروفات",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: false,
    },
    {
      code: "5.1",
      name: "تكلفة البضاعة المباعة",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "5",
      isSystem: true,
      isProtected: true,
    },
    {
      code: "5.2",
      name: "المصروفات العمومية والإدارية",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: false,
      parentCode: "5",
    },
    {
      code: "5.2.1",
      name: "الرواتب",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "5.2",
    },
    {
      code: "5.2.2",
      name: "الإيجار",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "5.2",
    },
    {
      code: "5.2.3",
      name: "الكهرباء والماء",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "5.2",
    },
    {
      code: "5.2.4",
      name: "الاتصالات",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "5.2",
    },
    {
      code: "5.2.5",
      name: "المواصلات",
      type: "EXPENSE",
      currency: "IQD",
      normalBalance: "DEBIT",
      isPosting: true,
      parentCode: "5.2",
    },
  ];

  // Build account tree by resolving parent codes
  const codeToId: Record<string, string> = {};
  for (const acct of chartOfAccounts) {
    const existing = await prisma.account.findFirst({
      where: { companyId: company.id, code: acct.code },
    });
    if (existing) {
      codeToId[acct.code] = existing.id;
    }
  }

  for (const acct of chartOfAccounts) {
    const parentId = acct.parentCode ? codeToId[acct.parentCode] : null;
    const level = acct.code.split(".").length;
    const upserted = await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code: acct.code } },
      update: {
        name: acct.name,
        type: acct.type,
        currency: acct.currency as never,
        normalBalance: acct.normalBalance as never,
        isPosting: acct.isPosting,
        isSystem: acct.isSystem || false,
        isProtected: acct.isProtected || false,
        parentId,
        level,
        isActive: true,
        allowManualJournal: true,
      },
      create: {
        companyId: company.id,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        currency: acct.currency as never,
        normalBalance: acct.normalBalance as never,
        isPosting: acct.isPosting,
        isSystem: acct.isSystem || false,
        isProtected: acct.isProtected || false,
        parentId,
        level,
        isActive: true,
        allowManualJournal: true,
      },
    });
    codeToId[acct.code] = upserted.id;
  }
  console.log(`Created ${chartOfAccounts.length} chart of accounts`);

  console.log(
    `Packaging created: ${قطعةPackaging.name}, ${كارتونPackaging.name}`,
  );
  console.log("Admin user created: admin@grass.com / admin123");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
