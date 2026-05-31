# بوابة تخطيط المرحلة العاشرة — PH-10: Internal Project Management

- **تاريخ التحقق:** 2026-05-28
- **آخر تحديث:** 2026-05-31 (AUTH-OWNER-LOGIN-GATE-001)
- **Task:** PH10-PLAN-001 + OWNER-PERM-FIX-001 + PM10-DATA-001 + PM10-DATA-002 + AUTH-OWNER-LOGIN-GATE-001
- **نوع التحقق:** Planning Gate + Auth/Login Verification.
- **القرار:** PH-10 NOT APPROVED FOR PH-11 حتى تنفيذ المهام واجتياز `PH10-GATE-VERIFY-001`.

## 1. Gate Summary

| Gate                   | النتيجة        | الدليل                                                 | القرار                      |
| ---------------------- | -------------- | ------------------------------------------------------ | --------------------------- |
| Scope Gate             | PASS           | `PH10_REPORT_AR.md` يحدد النطاق                        | PLAN_APPROVED               |
| No Payroll Gate        | PASS           | الحضور والرواتب خارج النطاق صراحة                      | APPROVED                    |
| Architecture Gate      | PASS_PLANNED   | فصل API/UI/Data/Security موثق                          | IMPLEMENTATION_REQUIRED     |
| Data Model Gate        | PARTIAL        | ProjectTask model منفذ، TaskAssignment و WorkLog باقيان | BLOCKS_PHASE_COMPLETION     |
| Project Model Gate     | PASS           | `Project` model + migration                            | PM10-DATA-001_DONE          |
| ProjectTask Model Gate | PASS           | `ProjectTask` model + migration + tests                | PM10-DATA-002_DONE          |
| Backend/API Gate       | NOT_STARTED    | endpoints مخططة فقط                                    | BLOCKS_PHASE_COMPLETION     |
| UI Gate                | NOT_STARTED    | الصفحات مخططة فقط                                      | BLOCKS_PHASE_COMPLETION     |
| Navigation Gate        | NOT_STARTED    | Sidebar link مخطط فقط                                  | BLOCKS_PHASE_COMPLETION     |
| Permission Gate        | PARTIAL_PASS   | System Owner bypass + internal project permission keys | FULL_PM10_SECURITY_REQUIRED |
| Testing Gate           | NOT_STARTED    | tests مخططة فقط                                        | BLOCKS_PHASE_COMPLETION     |
| Documentation Gate     | PASS           | tracker/report/gate/backlog/roadmap محدثة              | PLAN_APPROVED               |
| Coolify Readiness Gate | NOT_APPLICABLE | لا deployment في PH10-PLAN-001                         | NOT_APPLICABLE              |
| Auth/Login Gate        | PASS           | مالك النظام يسجل دخول بنجاح؛ الخطأ 500 اختفى بعد إصلاح schema و seed | AUTH-OWNER-LOGIN-GATE-001_DONE |
| System Owner Full Access Gate | PASS    | `/api/auth/me` يرجع ALL_PERMISSION_KEYS للمالك؛ Sidebar يعرض كل الأقسام | AUTH-OWNER-LOGIN-GATE-001_DONE |
| Normal User Restriction Gate  | PASS    | المستخدم العادي بدون صلاحية ممنوع؛ مع صلاحية مسموح (اختبارات + كود) | AUTH-OWNER-LOGIN-GATE-001_DONE |
| Sidebar Visibility Gate | EXISTING_SCOPE | الـ Sidebar لا يخفي أي عناصر حسب الصلاحية (سلوك قائم). جميع العناصر مرئية للجميع. | OUT_OF_SCOPE |
| Runtime Verification Gate | PASS      | تحقق curl: login ناجح، /api/auth/me ناجح، جميع الصلاحيات موجودة | AUTH-OWNER-LOGIN-GATE-001_DONE |

## 2. Task Gate Matrix

| Task ID              | الحالة | Gate Decision | سبب القرار                                                        |
| -------------------- | ------ | ------------- | ----------------------------------------------------------------- |
| PH10-PLAN-001        | DONE   | PASS          | تم توثيق النطاق والمهام والحدود                                   |
| OWNER-PERM-FIX-001   | DONE   | PASS          | مالك النظام يتجاوز الصلاحيات مركزياً والمستخدم العادي يبقى مقيداً |
| PM10-DATA-001        | DONE   | PASS          | Project model منفذ ومربوط بالشركة مع migration                    |
| PM10-DATA-002        | DONE   | PASS          | ProjectTask model + migration + tests                             |
| AUTH-OWNER-LOGIN-GATE-001 | DONE | PASS        | إصلاح login لمالك النظام: schema sync + seed + error logging + 9 اختبارات جديدة |
| PM10-DATA-003        | TODO   | BLOCKS        | Assignment model غير منفذ                                         |
| PM10-DATA-004        | TODO   | BLOCKS        | WorkLog model غير منفذ                                            |
| PM10-API-001         | TODO   | BLOCKS        | Projects API غير منفذ                                             |
| PM10-API-002         | TODO   | BLOCKS        | Tasks API غير منفذ                                                |
| PM10-API-003         | TODO   | BLOCKS        | Assignments API غير منفذ                                          |
| PM10-API-004         | TODO   | BLOCKS        | WorkLogs API غير منفذ                                             |
| PM10-UI-001          | TODO   | BLOCKS        | صفحة المشاريع غير منفذة                                           |
| PM10-UI-002          | TODO   | BLOCKS        | صفحة التفاصيل غير منفذة                                           |
| PM10-UI-003          | TODO   | BLOCKS        | dialogs/drawers غير منفذة                                         |
| PM10-UI-004          | TODO   | BLOCKS        | صفحة مهامي/الفريق غير منفذة                                       |
| PM10-SEED-001        | TODO   | BLOCKS        | Dummy data غير منفذة                                              |
| PM10-SEC-001         | TODO   | BLOCKS        | صلاحيات وAudit غير منفذة                                          |
| PM10-QA-001          | TODO   | BLOCKS        | اختبارات غير منفذة                                                |
| PM10-GATE-VERIFY-001 | TODO   | BLOCKS        | Gate تنفيذ لاحق مطلوب                                             |

## 3. قواعد منع الخلط مع HR/Payroll

- WorkLog في PH-10 هو سجل وقت على مهمة فقط.
- WorkLog لا يمثل حضوراً وانصرافاً.
- WorkLog لا يولد راتباً أو أجر ساعة.
- لا توجد قيود يومية من PH-10.
- لا يسمح بأي direct balance update.
- لا يسمح بأي stock movement.
- ربط الموظف بالمهمة يستخدم Employee foundation فقط.

## 4. Requirements Before Approval

لا يمكن تحويل PH-10 إلى DONE 100% إلا بعد:

- تنفيذ migration للنماذج المخططة.
- تنفيذ APIs مع Zod validation وcompany isolation.
- تنفيذ UI عربية RTL كاملة.
- إضافة صلاحيات seed وbackend checks.
- إضافة audit لكل write.
- إضافة dummy data آمنة.
- نجاح lint/typecheck/build/tests أو توثيق أي pre-existing failures بدقة.
- تحديث هذا الملف من Planning Gate إلى Completion Gate.

## 4.1 تحقق OWNER-PERM-FIX-001

| البند                  | النتيجة | الدليل                                                                  |
| ---------------------- | ------- | ----------------------------------------------------------------------- |
| System Owner source    | PASS    | `SYSTEM_OWNER_EMAIL` فقط، بدون hardcoded email                          |
| Backend bypass         | PASS    | `checkDbPermission` / `requireDbPermission`                             |
| UI permissions payload | PASS    | `/api/auth/me` يعيد صلاحيات كاملة للمالك                                |
| Employees access       | PASS    | `employees.view` مثبت في الاختبارات للمالك، وSidebar يحتوي قسم الموظفين |
| Normal user denied     | PASS    | اختبار مستخدم عادي بدون صلاحية يرجع false                               |
| Normal user allowed    | PASS    | اختبارات DB permission الحالية تثبت السماح عند وجود permission          |

## 4.2 تحقق PM10-DATA-001

| البند            | النتيجة    | الدليل                                                      |
| ---------------- | ---------- | ----------------------------------------------------------- |
| Project model    | PASS       | `prisma/schema.prisma`                                      |
| Company scope    | PASS       | `companyId` إلزامي + `@@index([companyId])`                 |
| Safe uniqueness  | PASS       | `@@unique([companyId, code])`                               |
| Delete policy    | PASS       | `onDelete: Restrict` مع Company                             |
| Forbidden models | PASS       | لم يتم إنشاء `ProjectTask` أو `TaskAssignment` أو `WorkLog` |
| APIs/UI          | PASS_SCOPE | لم تُنفذ عمداً لأنها خارج PM10-DATA-001                     |
| Demo data        | PASS_SCOPE | لم تُنشأ بيانات تجريبية؛ مؤجلة إلى `PM10-SEED-001`          |

## 4.3 تحقق PM10-DATA-002

| البند                   | النتيجة    | الدليل                                                       |
| ----------------------- | ---------- | ------------------------------------------------------------ |
| ProjectTask model       | PASS       | `prisma/schema.prisma` يحتوي `model ProjectTask`             |
| Company isolation       | PASS       | `companyId` إلزامي + `@@index([companyId])`                  |
| Project scope           | PASS       | `projectId` إلزامي + `@@unique([projectId, code])`           |
| Task status/priority    | PASS       | `ProjectTaskStatus` + `ProjectTaskPriority` enums            |
| Parent-child tasks      | PASS       | `parentTaskId` + self-relation `TaskHierarchy`               |
| Migration               | PASS       | `20260528210000_add_project_task_model`                      |
| Forbidden models        | PASS       | لم يتم إنشاء `TaskAssignment` أو `WorkLog`                   |
| APIs/UI                 | PASS_SCOPE | لم تُنفذ عمداً — خارج PM10-DATA-002                          |
| Permission keys         | PASS_SCOPE | لم تُضف — ستُضاف مع API                                      |
| Demo data               | PASS_SCOPE | لم تُنشأ — مؤجلة إلى `PM10-SEED-001`                         |
| System Owner regression | PASS       | سلوك مالك النظام لم يتغير — التجاوز باقٍ في `auth.ts`        |
| Tests                   | PASS       | اختبارات `internal-project-model.test.ts` محدثة               |

## 5. القرار النهائي

**PH10-PLAN-001 APPROVED**

**OWNER-PERM-FIX-001 DONE**

**PM10-DATA-001 DONE**

**PM10-DATA-002 DONE**

**PH-10 NOT APPROVED FOR PH-11**

## 6. نتائج الفحوصات

| الفحص     | النتيجة           | القرار                                                                                                    |
| --------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| Format    | PASS              | Markdown formatting ناجح                                                                                  |
| Lint      | FAIL_PRE_EXISTING | 84 مشكلة: 3 أخطاء و81 تحذيراً؛ الخطأ الحاجب المعروف في `src/components/forms/product-form.tsx` خارج PH-10 |
| Typecheck | FAIL_PRE_EXISTING | أخطاء `purchases.test.ts` خارج PH-10                                                                      |
| Build     | PASS              | لا routes جديدة؛ build كامل ناجح                                                                          |
| Tests     | PASS              | 588/588 tests ناجحة                                                                                       |

هذه النتائج لا تعتمد PH-10 للتنفيذ، لكنها تؤكد أن التخطيط لم يضف فشل كود جديد. يجب إغلاق ديون lint/typecheck القديمة ضمن مهمة صيانة منفصلة.
