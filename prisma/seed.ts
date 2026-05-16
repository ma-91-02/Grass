import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] })
const prisma = new PrismaClient({ adapter })

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
  { key: "customerCategories.view", name: "عرض أقسام العملاء", module: "customers" },
  { key: "customerCategories.create", name: "إنشاء قسم عميل", module: "customers" },
  { key: "customerCategories.edit", name: "تعديل قسم عميل", module: "customers" },
  { key: "customerCategories.delete", name: "حذف قسم عميل", module: "customers" },
  { key: "suppliers.view", name: "عرض الموردين", module: "suppliers" },
  { key: "suppliers.create", name: "إنشاء مورد", module: "suppliers" },
  { key: "suppliers.edit", name: "تعديل مورد", module: "suppliers" },
  { key: "suppliers.delete", name: "حذف مورد", module: "suppliers" },
  { key: "products.view", name: "عرض المواد", module: "products" },
  { key: "products.create", name: "إنشاء مادة", module: "products" },
  { key: "products.edit", name: "تعديل مادة", module: "products" },
  { key: "products.delete", name: "حذف مادة", module: "products" },
  { key: "products.viewPurchasePrice", name: "عرض سعر الشراء", module: "products" },
  { key: "products.editPrice", name: "تعديل الأسعار", module: "products" },
  { key: "warehouses.view", name: "عرض المخازن", module: "warehouses" },
  { key: "warehouses.manage", name: "إدارة المخازن", module: "warehouses" },
  { key: "exchangeRates.view", name: "عرض سعر الصرف", module: "exchangeRates" },
  { key: "exchangeRates.manage", name: "إدارة سعر الصرف", module: "exchangeRates" },
  { key: "invoices.view", name: "عرض الفواتير", module: "invoices" },
  { key: "invoices.create", name: "إنشاء فاتورة", module: "invoices" },
  { key: "invoices.edit", name: "تعديل فاتورة", module: "invoices" },
  { key: "invoices.delete", name: "حذف فاتورة", module: "invoices" },
  { key: "auditLogs.view", name: "عرض سجل النشاطات", module: "audit" },
  { key: "reports.view", name: "عرض التقارير", module: "reports" },
  { key: "settings.view", name: "عرض الإعدادات", module: "settings" },
  { key: "settings.manage", name: "إدارة الإعدادات", module: "settings" },
  { key: "accounts.view", name: "عرض الحسابات", module: "accounts" },
  { key: "accounts.manage", name: "إدارة الحسابات", module: "accounts" },
  { key: "purchases.view", name: "عرض المشتريات", module: "purchases" },
  { key: "purchases.create", name: "إنشاء فاتورة مشتريات", module: "purchases" },
  { key: "purchases.edit", name: "تعديل فاتورة مشتريات", module: "purchases" },
  { key: "purchases.delete", name: "حذف فاتورة مشتريات", module: "purchases" },
  { key: "purchases.print", name: "طباعة فاتورة مشتريات", module: "purchases" },
  { key: "paymentAccounts.view", name: "عرض حسابات التسديد", module: "purchases" },
  { key: "paymentAccounts.manage", name: "إدارة حسابات التسديد", module: "purchases" },
]

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
      "customers.view", "customers.create", "customers.edit",
      "products.view", "products.viewPurchasePrice",
      "warehouses.view",
      "exchangeRates.view", "exchangeRates.manage",
      "invoices.view", "invoices.create", "invoices.edit",
      "accounts.view", "accounts.manage",
      "purchases.view", "purchases.create",
      "paymentAccounts.view", "paymentAccounts.manage",
      "reports.view",
    ],
  },
  {
    name: "موظف مبيعات",
    description: "إنشاء الفواتير وعرض العملاء (ممنوع رؤية سعر الشراء) (ممنوع تعديل الأسعار)",
    permissions: [
      "customers.view", "customers.create",
      "products.view",
      "invoices.view", "invoices.create",
    ],
  },
  {
    name: "موظف مخزن",
    description: "إدارة المخازن والمواد",
    permissions: [
      "products.view", "products.create", "products.edit",
      "warehouses.view", "warehouses.manage",
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
]

async function main() {
  console.log("Seeding database...")

  const permissionRecords: Record<string, string> = {}
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, module: perm.module },
      create: { key: perm.key, name: perm.name, module: perm.module },
    })
    permissionRecords[perm.key] = created.id
  }
  console.log(`Created ${PERMISSIONS.length} permissions`)

  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description, isSystem: true },
      create: {
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
      },
    })

    for (const permKey of roleData.permissions) {
      const permId = permissionRecords[permKey]
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        })
      }
    }
    console.log(`Role "${roleData.name}" created/updated`)
  }

  const adminPasswordHash = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@grass.com" },
    update: { name: "مدير النظام", passwordHash: adminPasswordHash, isActive: true },
    create: {
      name: "مدير النظام",
      email: "admin@grass.com",
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  })

  const adminRole = await prisma.role.findUnique({ where: { name: "مدير النظام" } })
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    })
  }

  await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: { name: "المخزن الرئيسي", address: "بغداد" },
    create: {
      name: "المخزن الرئيسي",
      code: "WH-MAIN",
      address: "بغداد",
    },
  })

  await prisma.paymentAccount.upsert({
    where: { name: "صندوق IQD" },
    update: { type: "CASH", currency: "IQD", balance: 0 },
    create: { name: "صندوق IQD", type: "CASH", currency: "IQD", balance: 0 },
  })

  await prisma.paymentAccount.upsert({
    where: { name: "صندوق USD" },
    update: { type: "CASH", currency: "USD", balance: 0 },
    create: { name: "صندوق USD", type: "CASH", currency: "USD", balance: 0 },
  })

  await prisma.paymentAccount.upsert({
    where: { name: "مصرف الرافدين" },
    update: { type: "BANK", currency: "IQD", balance: 0 },
    create: { name: "مصرف الرافدين", type: "BANK", currency: "IQD", balance: 0 },
  })

  const قطعةPackaging = await prisma.productPackaging.upsert({
    where: { name: "قطعة" },
    update: { piecesPerCarton: 0 },
    create: { name: "قطعة", piecesPerCarton: 0 },
  })

  const كارتونPackaging = await prisma.productPackaging.upsert({
    where: { name: "كارتون" },
    update: { piecesPerCarton: 12 },
    create: { name: "كارتون", piecesPerCarton: 12 },
  })

  console.log(`Packaging created: ${قطعةPackaging.name}, ${كارتونPackaging.name}`)
  console.log("Admin user created: admin@grass.com / admin123")
  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
