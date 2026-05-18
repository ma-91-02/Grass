# API Update Rules — Grass ERP

> قواعد إلزامية لتوثيق وتحديث نقاط النهاية API والواجهات.
> آخر تحديث: 2026-05-18

---

## 1. المبدأ الأساسي

**لا يُعتبر أي feature مكتملًا إذا لم يُحدَّث `API_REGISTRY.md`.**

التوثيق شرط أساسي وليس إضافي. أي endpoint جديد أو UI جديد بدون تحديث الوثائق يُعتبر غير مكتمل.

---

## 2. القواعد الإلزامية

### 2.1 — Endpoint جديد

عند إضافة أي `route.ts` جديد:

1. **يجب** إضافة كل methods في `API_REGISTRY.md`
2. **يجب** تحديد `Backend Status`
3. **يجب** تحديد `UI Status`
4. **يجب** كتابة `Purpose` واضح
5. **يجب** تحديد `Priority`

### 2.2 — UI جديد

عند إضافة أي صفحة أو مكون frontend يستهلك API:

1. **يجب** تحديث `UI Status` في `API_REGISTRY.md` إلى `CONNECTED`
2. **يجب** كتابة `UI Page` المرتبط
3. **يجب** تحديث `UI_BINDING_ROADMAP.md` وإزالة المهمة المكتملة
4. **يجب** التحقق من `API_UPDATE_RULES.md` إذا لزم تحديثه

### 2.3 — Endpoint بدون UI

إذا تم إنشاء API endpoint لكن لا يوجد له واجهة:

1. **يجب** توسيمه `NO_UI`
2. **يجب** توضيح السبب في `Notes`
3. **يجب** تحديد `Phase` المقترح للربط

### 2.4 — Endpoint Backend فقط

إذا تم إنشاء API endpoint يُستخدم كمصدر بيانات داخلي فقط:

1. **يجب** توسيمه `BACKEND_ONLY`
2. **يجب** توضيح الاستخدام الداخلي في `Notes`
3. **يجب** توثيق العلاقة بالـ consumers (أي APIs تستخدمه)

### 2.5 — Endpoint مستخدم جزئيًا

إذا تم ربط endpoint جزئيًا (مثل: toggle فقط بدون edit):

1. **يجب** توسيمه `PARTIAL`
2. **يجب** توضيح ما هو المربوط وما هو الناقص في `Notes`
3. **يجب** تحديد الأولوية لإكمال الربط

### 2.6 — تغيير Endpoint موجود

عند تعديل أي endpoint موجود:

1. **يجب** تحديث `Purpose` إذا تغير
2. **يجب** مراجعة `UI Status` — قد يتغير إلى `BROKEN`
3. **يجب** فحص جميع الصفحات المرتبطة وضمان عدم الكسر
4. **يجب** تحديث `Notes` بتاريخ التغيير

### 2.7 — حذف Endpoint

عند حذف أي endpoint:

1. **يجب** تغيير `Backend Status` إلى `DEPRECATED`
2. **يجب** التحقق من عدم استخدامه في أي UI
3. **يجب** إضافة تاريخ الحذف المتوقع في `Notes`

---

## 3. حالات الـ Status المسموح بها

### Backend Status

| القيمة | المعنى | متى تُستخدم |
|--------|--------|------------|
| `DONE` | مكتمل ويعمل | Endpoint موجود ومُختبر |
| `PARTIAL` | جزئي | بعض methods موجودة، الباقي مخطط |
| `PLANNED` | مخطط | لم يُنفذ بعد |
| `DEPRECATED` | مهمل | سيُحذف قريبًا |
| `UNKNOWN` | غير معروف | لم يتم التحقق |

### UI Status

| القيمة | المعنى | متى تُستخدم |
|--------|--------|------------|
| `CONNECTED` | مربوط كليًا | كل methods له UI تعمل |
| `PARTIAL` | مربوط جزئيًا | بعض methods فقط لها UI |
| `NO_UI` | لا يوجد واجهة | لم يُربط بعد |
| `BACKEND_ONLY` | خلفية فقط | مصدر بيانات داخلي |
| `FUTURE_PHASE` | مرحلة لاحقة | مخطط لاحقًا |
| `BROKEN` | معطل | API أو UI لا يعمل |
| `UNKNOWN` | غير معروف | لم يتم التحقق |

### Priority

| القيمة | المعنى | متى تُستخدم |
|--------|--------|------------|
| `CRITICAL` | حرج | يؤثر على العمليات اليومية |
| `HIGH` | مرتفع | يحسن الإنتاجية بشكل كبير |
| `MEDIUM` | متوسط | يحسن الكفاءة |
| `LOW` | منخفض | إداري أو مستقبلي |

---

## 4. سير عمل التحديث (Workflow)

### عند إنشاء API جديد:

```
1. إنشاء route.ts → 2. كتابة handlers → 3. اختبار backend →
4. تحديث API_REGISTRY.md → 5. تحديد UI Status = NO_UI →
6. تحديد Priority → 7. commit
```

### عند ربط UI جديد:

```
1. إنشاء page.tsx → 2. ربط API → 3. اختبار end-to-end →
4. تحديث API_REGISTRY.md (UI Status → CONNECTED) →
5. تحديث UI_BINDING_ROADMAP.md (إزالة المهمة) →
6. commit
```

### عند إصلاح bug في UI/API:

```
1. إصلاح الكود → 2. اختبار → 3. تحديث API_REGISTRY.md Notes →
4. commit
```

---

## 5. التحقق قبل الـ Commit

قبل أي commit يتعلق بـ API أو UI:

- [ ] `API_REGISTRY.md` محدّث؟
- [ ] `UI_BINDING_ROADMAP.md` محدّث (إذا أنهيت مهمة)؟
- [ ] جميع endpoints الجديدة موثقة؟
- [ ] `Backend Status` صحيح لكل endpoint؟
- [ ] `UI Status` صحيح لكل endpoint؟
- [ ] `UI Page` مكتوب لكل endpoint مربوط؟
- [ ] لا يوجد endpoint جديد بدون توثيق؟

---

## 6. العلاقة بين الملفات

| الملف | الغرض | متى يُحدَّث |
|-------|-------|------------|
| `API_REGISTRY.md` | سجل كل endpoints | عند إنشاء/تعديل/حذف endpoint |
| `UI_BINDING_ROADMAP.md` | خطة ربط الواجهات | عند إنهاء مهمة أو تغيير أولويات |
| `API_UPDATE_RULES.md` | القواعد | عند تغيير العمليات |

---

## 7. مثال: إضافة endpoint جديد

### قبل (غير مسموح):
```
[Commit]
feat: add POST /api/custom-reports
→ لا يوجد تحديث في docs/api/*
```

### بعد (مسموح):
```
[Commit]
feat: add POST /api/custom-reports
→ API_REGISTRY.md: إضافة صف جديد
→ UI Status = NO_UI
→ Phase = 4.0
→ Notes = مخطط لمرحلة لاحقة
```

---

## 8. العقوبات (Consequences)

إذا تم اكتشاف endpoint جديد بدون توثيق:

1. PR مرفوض حتى يتم التوثيق
2. Feature لا يُعتبر مكتملًا
3. يُفضل عدم merge إلى main بدون تحديث docs

---

## 9. المسؤوليات

| الدور | المسؤولية |
|-------|----------|
| Backend Dev | تحديث `API_REGISTRY.md` عند إنشاء API |
| Frontend Dev | تحديث `API_REGISTRY.md` + `UI_BINDING_ROADMAP.md` عند ربط UI |
| Code Reviewer | التحقق من تحديث docs قبل merge |
| Tech Lead | مراجعة `UI_BINDING_ROADMAP.md` أسبوعيًا |

---

**ملاحظة:** هذه القواعد تطبق على كل PR جديد. لا استثناءات.
