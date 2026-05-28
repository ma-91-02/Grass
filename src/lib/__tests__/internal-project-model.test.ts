import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PH-10 Project model foundation", () => {
  const schema = readFileSync(
    join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );
  const seed = readFileSync(join(process.cwd(), "prisma", "seed.ts"), "utf8");

  it("defines only the company-scoped Project model for PM10-DATA-001", () => {
    expect(schema).toContain("model Project");
    expect(schema).toContain("companyId     String");
    expect(schema).toContain("@@unique([companyId, code])");
    expect(schema).toContain("@@index([companyId])");
    expect(schema).toContain("onDelete: Restrict");
    expect(schema).not.toContain("model ProjectTask");
    expect(schema).not.toContain("model TaskAssignment");
    expect(schema).not.toContain("model WorkLog");
  });

  it("defines minimal project status and priority enums", () => {
    expect(schema).toContain("enum ProjectStatus");
    expect(schema).toContain("PLANNED");
    expect(schema).toContain("ACTIVE");
    expect(schema).toContain("PAUSED");
    expect(schema).toContain("COMPLETED");
    expect(schema).toContain("CANCELLED");
    expect(schema).toContain("enum ProjectPriority");
    expect(schema).toContain("LOW");
    expect(schema).toContain("MEDIUM");
    expect(schema).toContain("HIGH");
    expect(schema).toContain("URGENT");
  });

  it("seeds internal project permissions without demo project data", () => {
    expect(seed).toContain("internalProjects.view");
    expect(seed).toContain("internalProjects.create");
    expect(seed).toContain("internalProjects.edit");
    expect(seed).toContain("internalProjects.delete");
    expect(seed).toContain("internalProjects.manage");
    expect(seed).not.toContain("DEMO_INTERNAL_PROJECT");
    expect(seed).not.toContain("مشروع تجريبي داخلي");
  });
});
