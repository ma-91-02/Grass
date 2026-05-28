-- PH-09 Employee foundation.
-- Attendance and payroll remain future modules and are intentionally not modeled here.
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "position" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Employee_companyId_code_key" ON "Employee"("companyId", "code");
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

ALTER TABLE "Employee"
    ADD CONSTRAINT "Employee_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Employee"
    ADD CONSTRAINT "Employee_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
