import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  join(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
);
const seed = readFileSync(join(process.cwd(), "prisma", "seed.ts"), "utf8");

describe("PH-10 Project model foundation", () => {
  it("defines the company-scoped Project model for PM10-DATA-001", () => {
    expect(schema).toContain("model Project");
    expect(schema).toContain("companyId     String");
    expect(schema).toContain("@@unique([companyId, code])");
    expect(schema).toContain("@@index([companyId])");
    expect(schema).toContain("onDelete: Restrict");
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

describe("PH-10 ProjectTask model (PM10-DATA-002)", () => {
  it("defines the ProjectTask model with all required fields", () => {
    expect(schema).toContain("model ProjectTask {");
    expect(schema).toContain("companyId     String");
    expect(schema).toContain("projectId     String");
    expect(schema).toContain("code          String");
    expect(schema).toContain("title         String");
    expect(schema).toContain("description   String?");
    expect(schema).toContain("status        ProjectTaskStatus");
    expect(schema).toContain("priority      ProjectTaskPriority");
    expect(schema).toContain("startDate     DateTime?");
    expect(schema).toContain("dueDate       DateTime?");
    expect(schema).toContain("completedAt   DateTime?");
    expect(schema).toContain("parentTaskId  String?");
    expect(schema).toContain("createdById   String?");
    expect(schema).toContain("updatedById   String?");
    expect(schema).toContain("createdAt     DateTime");
    expect(schema).toContain("updatedAt     DateTime");
  });

  it("defines ProjectTaskStatus enum with all planned states", () => {
    expect(schema).toContain("enum ProjectTaskStatus {");
    expect(schema).toContain("TODO");
    expect(schema).toContain("IN_PROGRESS");
    expect(schema).toContain("REVIEW");
    expect(schema).toContain("BLOCKED");
    expect(schema).toContain("DONE");
    expect(schema).toContain("CANCELLED");
  });

  it("defines ProjectTaskPriority enum with all planned values", () => {
    expect(schema).toContain("enum ProjectTaskPriority {");
    expect(schema).toContain("LOW");
    expect(schema).toContain("MEDIUM");
    expect(schema).toContain("HIGH");
    expect(schema).toContain("URGENT");
  });

  it("ProjectTask is company-scoped and project-scoped", () => {
    expect(schema).toContain("companyId     String");
    expect(schema).toContain("company       Company             @relation(fields: [companyId], references: [id], onDelete: Restrict)");
    expect(schema).toContain("projectId     String");
    expect(schema).toContain("project       Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)");
    expect(schema).toContain("@@unique([projectId, code])");
    expect(schema).toContain("@@index([companyId])");
    expect(schema).toContain("@@index([projectId])");
    expect(schema).toContain("@@index([status])");
    expect(schema).toContain("@@index([dueDate])");
    expect(schema).toContain("@@index([parentTaskId])");
  });

  it("ProjectTask supports optional parent-child hierarchy", () => {
    expect(schema).toContain("parentTaskId  String?");
    expect(schema).toContain("parentTask    ProjectTask?        @relation(\"TaskHierarchy\", fields: [parentTaskId], references: [id])");
    expect(schema).toContain("childTasks    ProjectTask[]       @relation(\"TaskHierarchy\")");
  });

  it("defines TaskAssignment model", () => {
    expect(schema).toContain("model TaskAssignment");
    expect(schema).toContain("assigneeUserId");
    expect(schema).toContain("AssignmentStatus");
  });

  it("defines WorkLog model", () => {
    expect(schema).toContain("model WorkLog");
    expect(schema).toContain("minutes");
    expect(schema).toContain("billable");
  });

  it("has a migration file for the ProjectTask model", () => {
    const migrationDir = join(
      process.cwd(),
      "prisma",
      "migrations",
      "20260528210000_add_project_task_model",
    );
    const migrationSql = readFileSync(
      join(migrationDir, "migration.sql"),
      "utf8",
    );
    expect(migrationSql).toContain("CREATE TABLE \"ProjectTask\"");
    expect(migrationSql).toContain("ProjectTaskStatus");
    expect(migrationSql).toContain("ProjectTaskPriority");
  });
});
