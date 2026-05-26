import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

const COMPROMISED_ENV_VAR = "COMPROMISED_LEGACY_ADMIN_EMAIL";

async function main() {
  const compromisedEmail = process.env[COMPROMISED_ENV_VAR];
  if (!compromisedEmail) {
    console.log(`[SKIP] ${COMPROMISED_ENV_VAR} is not set. No action taken.`);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: compromisedEmail },
  });

  if (!user) {
    console.log("[INFO] Legacy admin user not found in database. No action needed.");
    return;
  }

  const auditLogCount = await prisma.auditLog.count({
    where: { userId: user.id },
  });

  const hasProductionRecords = auditLogCount > 0;

  if (hasProductionRecords) {
    const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    await prisma.userRole.deleteMany({ where: { userId: user.id } });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: `deleted-legacy-admin-${user.id}@deleted.local`,
        name: "[DELETED] Legacy Admin",
        isActive: false,
        passwordHash: randomHash,
      },
    });

    console.log(
      `[ANONYMIZE] User anonymized (${auditLogCount} audit logs preserved). Identity removed.`
    );
  } else {
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log("[DELETE] User permanently deleted. No production records were linked.");
  }
}

main()
  .catch((e) => {
    console.error("[FAILED]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
