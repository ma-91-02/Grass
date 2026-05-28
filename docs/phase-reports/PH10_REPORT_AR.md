# تقرير تخطيط المرحلة العاشرة — PH-10: Internal Project Management

## 1. معلومات التقرير

- **اسم المرحلة:** Internal Project Management
- **نوع المهمة:** PH10-PLAN-001 — تخطيط نطاق فقط
- **تاريخ التقرير:** 2026-05-28
- **الحالة قبل التخطيط:** FUTURE 0%
- **الحالة بعد التخطيط:** IN_PROGRESS / PLAN_READY بنسبة تقريبية 6%
- **قرار التخطيط:** النطاق واضح وجاهز للتقسيم إلى مهام تنفيذية.
- **قرار التنفيذ:** PH-10 ليست مكتملة ولا تعتمد للانتقال إلى PH-11 حتى تنفيذ المهام واجتياز Gate مستقل.

## 2. حدود المرحلة

PH-10 تهدف إلى بناء لوحة داخلية خفيفة لإدارة مشاريع ومهام فريق العمل داخل GRASS ERP. هذه المرحلة إدارية تشغيلية، ولا تنشئ أي أثر محاسبي أو مخزني.

### داخل النطاق

- مشاريع داخلية.
- مهام داخل المشروع.
- إسناد المهام إلى موظفين من Employee foundation.
- حالات المهام والأولويات.
- سجلات وقت العمل على المهام كـ Work Logs فقط.
- ملاحظات الإدارة والتعليقات الداخلية.
- بيانات تجريبية Dummy Data لاختبار الواجهة.
- تقارير تشغيلية بسيطة عن المهام والإنتاجية.
- صلاحيات وعزل شركة وAudit لكل عمليات الكتابة.

### خارج النطاق

- Attendance / حضور وانصراف.
- Payroll / رواتب.
- Overtime / ساعات إضافية محاسبية.
- أي قيد يومي أو posting مالي.
- أي تعديل على stock أو ledger.
- أي deployment فعلي على Coolify.

## 3. تصميم النطاق الوظيفي

| المجال           | الوصف                              | حدود السلامة                                |
| ---------------- | ---------------------------------- | ------------------------------------------- |
| Projects         | تعريف مشاريع داخلية مرتبطة بالشركة | لا أثر مالي ولا مخزني                       |
| Project Tasks    | مهام قابلة للتوزيع والمتابعة       | لا تعدل employee payroll                    |
| Assignments      | ربط المهمة بموظف واحد أو أكثر      | يعتمد على `Employee` فقط                    |
| Work Logs        | تسجيل وقت عمل على مهمة             | لا يعتبر حضوراً رسمياً ولا يؤثر على الرواتب |
| Management Notes | ملاحظات وتعليقات داخلية            | Audit إلزامي للكتابة والحذف                 |
| Dummy Data       | بيانات تدريب وتجربة                | ممنوع بيانات حقيقية أو أسرار                |

## 4. Task Breakdown الرسمي

| Task ID              | الوصف                            | النوع                      | الحالة | النسبة | Backend/API | UI      | Nav/Sidebar | Tests | Docs   | Dummy Data | ملاحظات                                             |
| -------------------- | -------------------------------- | -------------------------- | ------ | :----: | ----------- | ------- | ----------- | ----- | ------ | ---------- | --------------------------------------------------- |
| PH10-PLAN-001        | توثيق نطاق PH-10 وخطة التنفيذ    | Documentation/Architecture | DONE   |  100%  | N/A         | N/A     | N/A         | N/A   | DONE   | N/A        | هذه المهمة فقط                                      |
| PM10-DATA-001        | تصميم Project model              | Data Model                 | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | companyId إلزامي                                    |
| PM10-DATA-002        | تصميم ProjectTask model          | Data Model                 | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | status/priority/dueDate                             |
| PM10-DATA-003        | تصميم TaskAssignment model       | Data Model                 | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | employeeId اختياري عند عدم الإسناد                  |
| PM10-DATA-004        | تصميم WorkLog model              | Data Model                 | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | وقت عمل على مهمة فقط وليس attendance                |
| PM10-API-001         | Projects CRUD API                | API/Backend                | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | `/api/internal-projects`                            |
| PM10-API-002         | Project Tasks CRUD/status API    | API/Backend                | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | `/api/internal-project-tasks`                       |
| PM10-API-003         | Assignments API                  | API/Backend                | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | إسناد/إلغاء إسناد                                   |
| PM10-API-004         | Work Logs API                    | API/Backend                | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | تسجيل وقت يدوي                                      |
| PM10-UI-001          | صفحة مشاريع داخلية رئيسية        | UI                         | TODO   |   0%   | DEPENDS_API | PLANNED | PLANNED     | TODO  | LINKED | PLANNED    | `/dashboard/internal-projects`                      |
| PM10-UI-002          | صفحة تفاصيل المشروع              | UI                         | TODO   |   0%   | DEPENDS_API | PLANNED | N/A         | TODO  | LINKED | PLANNED    | `/dashboard/internal-projects/[id]`                 |
| PM10-UI-003          | Drawer/Dialogs إنشاء وتعديل مهمة | UI                         | TODO   |   0%   | DEPENDS_API | PLANNED | N/A         | TODO  | LINKED | PLANNED    | عربية وRTL                                          |
| PM10-UI-004          | صفحة مهامي / مهام الفريق         | UI                         | TODO   |   0%   | DEPENDS_API | PLANNED | PLANNED     | TODO  | LINKED | PLANNED    | فلترة حسب الموظف والحالة                            |
| PM10-SEED-001        | Dummy data آمنة للتجربة          | Seed/QA                    | TODO   |   0%   | PLANNED     | N/A     | N/A         | TODO  | LINKED | PLANNED    | dev-only أو script واضح                             |
| PM10-SEC-001         | صلاحيات وAudit وعزل شركة         | Security                   | TODO   |   0%   | PLANNED     | PLANNED | N/A         | TODO  | LINKED | N/A        | permissions: view/create/edit/delete/assign/logTime |
| PM10-QA-001          | اختبارات API/UI smoke            | QA                         | TODO   |   0%   | PLANNED     | PLANNED | N/A         | TODO  | LINKED | USES_DUMMY | unit + API + smoke                                  |
| PM10-GATE-VERIFY-001 | بوابة اعتماد PH-10 بعد التنفيذ   | QA/Governance              | TODO   |   0%   | N/A         | N/A     | N/A         | TODO  | LINKED | N/A        | لا تعتمد المرحلة بدونه                              |

## 5. API Contracts المخططة

| Method | Endpoint                                                      | الهدف           | Validation                       | Permission                | Audit           |
| ------ | ------------------------------------------------------------- | --------------- | -------------------------------- | ------------------------- | --------------- |
| GET    | `/api/internal-projects`                                      | قائمة المشاريع  | query filters                    | `internalProjects.view`   | لا              |
| POST   | `/api/internal-projects`                                      | إنشاء مشروع     | Zod create schema                | `internalProjects.create` | CREATE          |
| GET    | `/api/internal-projects/{id}`                                 | تفاصيل مشروع    | id params                        | `internalProjects.view`   | لا              |
| PATCH  | `/api/internal-projects/{id}`                                 | تعديل مشروع     | Zod update schema                | `internalProjects.edit`   | UPDATE          |
| DELETE | `/api/internal-projects/{id}`                                 | حذف/تعطيل مشروع | id params                        | `internalProjects.delete` | DELETE          |
| GET    | `/api/internal-project-tasks`                                 | قائمة المهام    | filters: project/status/assignee | `internalTasks.view`      | لا              |
| POST   | `/api/internal-project-tasks`                                 | إنشاء مهمة      | Zod create schema                | `internalTasks.create`    | CREATE          |
| PATCH  | `/api/internal-project-tasks/{id}`                            | تعديل مهمة      | Zod update schema                | `internalTasks.edit`      | UPDATE          |
| POST   | `/api/internal-project-tasks/{id}/status`                     | تغيير الحالة    | status transition schema         | `internalTasks.edit`      | STATUS_CHANGE   |
| POST   | `/api/internal-project-tasks/{id}/assignments`                | إسناد مهمة      | employeeId schema                | `internalTasks.assign`    | ASSIGN          |
| DELETE | `/api/internal-project-tasks/{id}/assignments/{assignmentId}` | إلغاء إسناد     | params                           | `internalTasks.assign`    | UNASSIGN        |
| POST   | `/api/internal-project-tasks/{id}/work-logs`                  | تسجيل وقت عمل   | minutes/date/notes schema        | `internalTasks.logTime`   | CREATE_WORK_LOG |
| DELETE | `/api/internal-project-tasks/{id}/work-logs/{workLogId}`      | حذف سجل وقت     | params                           | `internalTasks.logTime`   | DELETE_WORK_LOG |

## 6. UI Scope المخطط

| الصفحة                                  | الهدف          | العناصر المطلوبة                             | حالات الواجهة                |
| --------------------------------------- | -------------- | -------------------------------------------- | ---------------------------- |
| `/dashboard/internal-projects`          | قائمة المشاريع | جدول، فلترة حالة، زر إنشاء، summary cards    | loading/error/empty/success  |
| `/dashboard/internal-projects/[id]`     | تفاصيل المشروع | معلومات، جدول مهام، نشاط، تعليقات            | loading/error/not found      |
| `/dashboard/internal-projects/tasks`    | مهام الفريق    | kanban/table toggle، فلترة موظف/حالة/أولوية  | loading/error/empty          |
| `/dashboard/internal-projects/my-tasks` | مهامي          | مهام الموظف الحالي أو المستخدم المرتبط بموظف | permission-aware empty state |

## 7. State Rules المخططة

| الكيان      | الحالات                                               |
| ----------- | ----------------------------------------------------- |
| Project     | DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED, ARCHIVED |
| ProjectTask | TODO, IN_PROGRESS, BLOCKED, REVIEW, DONE, CANCELLED   |
| Assignment  | ACTIVE, REMOVED                                       |
| WorkLog     | DRAFT, APPROVED_OPTIONAL, CANCELLED                   |

## 8. Dummy Data Strategy

- بيانات التجربة يجب أن تكون dev/test فقط.
- ممنوع استخدام أسماء موظفين حقيقية أو بيانات عملاء حقيقية.
- البيانات يجب أن ترتبط بـ companyId تجريبية أو الشركة الافتراضية في seed.
- أمثلة مقترحة:
  - مشروع: "إطلاق نسخة تجريبية داخلية".
  - مهام: "تدقيق صفحة المبيعات"، "تحضير بيانات اختبار"، "مراجعة صلاحيات المستخدمين".
  - WorkLog: 30/45/60 دقيقة كمثال، بدون أثر رواتب.

## 9. Acceptance Criteria لتنفيذ PH-10 لاحقاً

- كل models لديها companyId وفهارس مناسبة.
- كل endpoints محمية بـ auth + permission + company isolation.
- كل writes تسجل Audit.
- لا يوجد Prisma داخل UI.
- لا يوجد Attendance أو Payroll.
- كل forms تستخدم Zod validation أو schema مشتركة.
- UI عربي RTL مع loading/error/empty states.
- tests تغطي CRUD، permissions، company isolation، status transitions، work logs.
- PH10_GATE_VERIFICATION_AR.md يتم تحديثه بعد التنفيذ الحقيقي.

## 10. قرار التقرير

PH10-PLAN-001 مكتملة كخطة. PH-10 نفسها ليست مكتملة ولا تعتمد للانتقال إلى PH-11 حتى تنفيذ المهام أعلاه واجتياز Gate مستقل.

## 11. نتائج الفحوصات

| الفحص     | النتيجة           | ملاحظات                                                                     |
| --------- | ----------------- | --------------------------------------------------------------------------- |
| Format    | PASS              | تم تنسيق ملفات Markdown المستهدفة                                           |
| Lint      | FAIL_PRE_EXISTING | فشل بسبب `src/components/forms/product-form.tsx` وتحذيرات legacy خارج PH-10 |
| Typecheck | FAIL_PRE_EXISTING | 3 أخطاء في `src/lib/__tests__/purchases.test.ts` خارج PH-10                 |
| Build     | PASS              | البناء نجح، ولم تُضف routes فعلية لـ PH-10                                  |
| Tests     | PASS              | 27 files, 582 tests passed                                                  |

لا توجد أخطاء ناتجة عن PH10-PLAN-001 لأنها مهمة توثيق وتخطيط فقط.
