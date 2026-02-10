# 🔄 Migration Guide - دليل الانتقال من JSON إلى SQLite

## 📌 ما الذي تغير؟

تم تحويل نظام قاعدة البيانات من **JSON Files** إلى **SQLite Database** للأداء الأفضل والموثوقية.

---

## 🚀 خطوات الترقية

### 1️⃣ تثبيت المكتبات (إذا لم تكن مثبتة)

```bash
npm install
```

المكتبة `sqlite3` موجودة بالفعل في `package.json`.

---

### 2️⃣ نقل البيانات القديمة (اختياري)

إذا كنت تستخدم الإصدار القديم وعندك بيانات JSON:

```bash
# احفظ البيانات القديمة (نسخة احتياطية)
mkdir data_backup
cp data/*.json data_backup/
```

**ملاحظة:** SQLite سيبدأ من الصفر. البيانات القديمة JSON لن تنتقل تلقائياً.

---

### 3️⃣ تشغيل البوت

```bash
npm start
```

عند أول تشغيل، سيتم:

- إنشاء `data/trading_bot.db` تلقائياً
- إنشاء 4 جداول: `analyses`, `trades`, `patterns`, `performance`
- إنشاء Indexes للأداء

---

## 📊 الفرق بين JSON و SQLite

| الميزة      | JSON (القديم)          | SQLite (الجديد) |
| ----------- | ---------------------- | --------------- |
| السرعة      | بطيء للبيانات الكبيرة  | ⚡ أسرع 10x     |
| الأمان      | ❌ غير thread-safe     | ✅ Thread-safe  |
| البحث       | بطيء (loop على arrays) | ⚡ SQL indexes  |
| المساحة     | كبيرة (JSON text)      | 💾 مضغوط        |
| الاستعلامات | JavaScript فقط         | 🔍 SQL قوي      |

---

## 🔍 أمثلة SQL للتحليل

### 1️⃣ أفضل 10 صفقات ربحاً

```sql
SELECT * FROM trades
WHERE profitLoss > 0
ORDER BY profitLoss DESC
LIMIT 10;
```

### 2️⃣ معدل النجاح لكل عملة

```sql
SELECT
  symbol,
  COUNT(*) as total,
  SUM(CASE WHEN actualOutcome = 'WIN' THEN 1 ELSE 0 END) as wins,
  ROUND(100.0 * SUM(CASE WHEN actualOutcome = 'WIN' THEN 1 ELSE 0 END) / COUNT(*), 2) as winRate
FROM analyses
WHERE actualOutcome IS NOT NULL
GROUP BY symbol;
```

### 3️⃣ الأنماط الأكثر نجاحاً

```sql
SELECT * FROM patterns
WHERE occurrences >= 5
ORDER BY avgProfit DESC
LIMIT 20;
```

---

## 🛠️ إدارة قاعدة البيانات

### فتح Database في SQLite Browser

```bash
# تثبيت sqlite3 command line
# Windows: تنزيل من https://www.sqlite.org/download.html

# فتح Database
sqlite3 data/trading_bot.db

# استعراض الجداول
.tables

# استعراض schema
.schema analyses

# استعلام
SELECT * FROM trades LIMIT 10;

# خروج
.quit
```

### تنظيف البيانات القديمة

```javascript
// في الكود:
await database.cleanOldData(90); // حذف أقدم من 90 يوم
```

---

## ⚠️ ملاحظات مهمة

1. **لا Rollback للـ JSON**: بعد التحويل لـ SQLite، لا يمكن العودة لـ JSON بسهولة
2. **النسخ الاحتياطي**: احفظ `data/trading_bot.db` بانتظام
3. **الأداء**: SQLite ممتاز حتى لملايين الصفوف

---

## 📞 الدعم

إذا واجهت أي مشكلة:

- راجع logs البوت
- تأكد من صلاحيات الكتابة على مجلد `data/`
- امسح `data/trading_bot.db` وشغل البوت من جديد (fresh start)

---

**Made with ❤️ in Egypt** 🇪🇬
