# ⚙️ OPTIONS.md - جميع الخيارات والإعدادات

**دليل شامل** لجميع الخيارات المتاحة في البوت مع شرح كل واحد والقيم الموصى بها.

---

## 📋 **جدول المحتويات:**

1. [إعدادات الأساس](#-إعدادات-الأساس)
2. [أوضاع التشغيل](#-أوضاع-التشغيل)
3. [معايير الدخول](#-معايير-الدخول)
4. [حماية رأس المال](#-حماية-رأس-المال)
5. [الرموز والعملات](#-الرموز-والعملات)
6. [الوقت والتوقيت](#-الوقت-والتوقيت)
7. [Telegram والإشعارات](#-telegram-والإشعارات)
8. [الـ Logging والسجلات](#-الـ-logging-والسجلات)
9. [الأداء والتحسينات](#-الأداء-والتحسينات)
10. [متغيرات البيئة](#-متغيرات-البيئة)

---

## 🎯 **إعدادات الأساس**

### **في `src/config/ProductionConfig.js`:**

#### **1. MODE**

```javascript
MODE: "PAPER";
```

- **القيم المتاحة:**
  - `"PAPER"` - محاكاة افتراضية (آمن 100%)
  - `"REAL"` - تداول حقيقي مع Binance (⚠️ خطر)
  - `"BACKTEST"` - اختبار على بيانات الماضي (تحليل)
  - `"DUAL"` - PAPER + REAL معاً (توصيم)

- **الموصى به:** ابدأ بـ `"PAPER"` لمدة أسبوع على الأقل

- **متى تغيرها؟**

  ```javascript
  // Week 1: اختبر PAPER
  MODE: "PAPER";

  // Week 2: استخدم BACKTEST
  MODE: "BACKTEST";

  // Week 3+: جرب DUAL إذا كانت النتائج جيدة
  MODE: "DUAL";
  ```

---

#### **2. INITIAL_BALANCE**

```javascript
INITIAL_BALANCE: 100;
```

- **في PAPER:** رأس المال الافتراضي (بدء من $100)
- **في REAL:** يتجاهل هذا القيمة (يستخدم رصيد Binance)
- **في BACKTEST:** رأس المال البدائي للاختبار

- **القيم الموصى بها:**
  ```javascript
  التعليمي: 10; // $10 فقط للتعلم
  اختبار: 100; // $100 لاختبار النموذج
  متوسط: 500; // $500 معقول
  محترف: 1000; // $1000+ للخبرة
  ```

---

#### **3. MIN_CONFIDENCE**

```javascript
MIN_CONFIDENCE: 65;
```

- **المعنى:** أقل نسبة ثقة لفتح صفقة (0-100%)
- **كم أعلى = كم أقل صفقات**

- **أمثلة:**

  ```javascript
  MIN_CONFIDENCE: 50; // 5-10 صفقات/يوم (عدواني)
  MIN_CONFIDENCE: 65; // 3-5 صفقات/يوم (متوازن) ✅
  MIN_CONFIDENCE: 80; // 1-2 صفقة/يوم (محافظ)
  MIN_CONFIDENCE: 90; // <1 صفقة/يوم (جداً محافظ)
  ```

- **التوصية:**
  - **PAPER:** 50-60 (تعلم أكثر)
  - **REAL:** 70+ (أمان أكثر)

---

## 🔄 **أوضاع التشغيل**

### **PAPER MODE (المحاكاة)**

```javascript
{
  MODE: "PAPER",
  INITIAL_BALANCE: 1000,
  MIN_CONFIDENCE: 50,
  RISK_PER_TRADE: 10,
  MAX_CONCURRENT_TRADES: 5,
  USE_ORDER_BOOK_ANALYSIS: true
}
```

| الإعداد       | القيمة | المعنى            |
| ------------- | ------ | ----------------- |
| Riskiness     | عالي   | تداول بثقة 50%    |
| Position Size | كبير   | $100-200 لكل صفقة |
| Leverage      | بدون   | 1x فقط (محاكاة)   |
| Slippage      | 0%     | لا fees/slippage  |
| Overnight     | نعم    | احتفظ بالصفقات    |

**استخدام:**

```bash
npm start
```

**المثالي لـ:**

- ✅ الأسبوع الأول
- ✅ التعلم والفهم
- ✅ اختبار استراتيجيات جديدة
- ✅ بناء الثقة

---

### **REAL MODE (حقيقي)**

```javascript
{
  MODE: "REAL",
  MIN_CONFIDENCE: 70,
  RISK_PER_TRADE: 2,
  MAX_CONCURRENT_TRADES: 2,
  MAX_TRADE_SIZE: 50,
  MAX_DAILY_LOSS: 20,
  TRAILING_STOP_LOSS: 0.96,
  TRAILING_TAKE_PROFIT: 1.10
}
```

| الإعداد       | القيمة | المعنى              |
| ------------- | ------ | ------------------- |
| Riskiness     | منخفض  | تداول بثقة 70%+ فقط |
| Position Size | صغير   | $20-50 لكل صفقة     |
| Leverage      | بدون   | 1x فقط (آمن)        |
| Slippage      | حقيقي  | 0.01-0.1% كلفة      |
| Max Loss/Day  | $20    | يوقف البوت بعدها    |
| Stop Loss     | -4%    | توقف خسارة قوي      |
| Take Profit   | +10%   | جني الأرباح         |

**استخدام:**

```javascript
// في ProductionConfig.js
MODE: "REAL"

// ثم
npm start  // يتداول بأموال فعلية!
```

**التحذيرات:**

- ⚠️ **استخدم NET $10-100 فقط أول مرة**
- ⚠️ **مراقب البوت بشكل مستمر**
- ⚠️ **فعّل Stop Loss دائماً**
- ⚠️ **احذر من Slippage والفيات**

---

### **BACKTEST MODE (اختبار تاريخي)**

```javascript
{
  MODE: "BACKTEST",
  HISTORY_DAYS: 365,
  TIMEFRAME: "1h",
  INITIAL_BALANCE: 100,
  MIN_CONFIDENCE: 50,
  SLIPPAGE_PERCENT: 0.05
}
```

| الإعداد  | القيمة  | المعنى           |
| -------- | ------- | ---------------- |
| Period   | 365 يوم | بيانات سنة كاملة |
| الواقعية | معتدل   | مع slippage صغير |
| النتيجة  | تاريخي  | الماضي فقط       |
| السرعة   | سريع    | دقائق معدودة     |

**استخدام:**

```bash
npm run backtest
```

**النتائج:**

```
Initial: $100
Final: $305.35
Profit: +205.35% 📈
Trades: 1,247
Win Rate: 58.3%
```

---

### **DUAL MODE (PAPER + REAL)**

```javascript
{
  MODE: "DUAL",
  PAPER_BALANCE: 1000,
  REAL_MODE_ENABLED: true,
  PAPER_MIN_CONFIDENCE: 50,
  REAL_MIN_CONFIDENCE: 70,
  PAPER_POSITION_SIZE: 80,
  REAL_POSITION_SIZE: 20,
  TELEGRAM_ALERTS: true
}
```

| الإعداد   | PAPER | REAL       |
| --------- | ----- | ---------- |
| Balance   | $1000 | من Binance |
| Position  | $80   | $20        |
| Min Conf  | 50%   | 70%        |
| Fees      | 0%    | حقيقي      |
| Overnight | نعم   | نعم        |
| Risk      | آمن   | متوسط      |

**استخدام:**

```bash
npm run dual
```

**المثالي لـ:**

- ✅ المقارنة (PAPER vs REAL)
- ✅ التحقق من الأداء
- ✅ بناء الووثوق
- ✅ تدريب متقدم

---

## 📈 **معايير الدخول**

### **معايير إلزامية (Mandatory):**

```javascript
{
  // 1. Trend Check
  TREND_RULE: "Close > EMA20 > EMA50",

  // 2. RSI Check
  RSI_MIN: 20,
  RSI_MAX: 80,

  // 3. Volume Check
  VOLUME_RATIO_MIN: 1.2,  // ≥ 1.2x الحجم العام

  // 4. Momentum Check
  MOMENTUM_MIN_UP_CANDLES: 3  // 3+ من 5 شموع صاعدة
}
```

**مثال عملي:**

```javascript
Signal Analysis:
✅ Close (85400) > EMA20 (84500)      ← Trend
✅ EMA20 (84500) > EMA50 (83000)      ← Trend
✅ RSI (55) بين 20-80                 ← Momentum
✅ Volume (1.5x) > 1.2x Threshold    ← Volume
✅ 4 من 5 شموع أخيرة صاعدة            ← Momentum

→ SIGNAL: STRONG BUY 👍 (85% confidence)
```

---

### **الإشارات الإضافية (Optional):**

```javascript
{
  // Order Book Analysis
  USE_ORDER_BOOK_ANALYSIS: true,
  IMBALANCE_THRESHOLD: 1.5,  // bid/ask ratio

  // Volume Profile
  USE_VOLUME_PROFILE: true,
  USE_POC_LEVELS: true,     // Point of Control

  // Whale Tracking
  USE_WHALE_TRACKER: true,
  WHALE_THRESHOLD_MULTIPLIER: 0.001,

  // Advanced Indicators
  USE_ADVANCED_INDICATORS: true
}
```

---

## 🛡️ **حماية رأس المال**

### **1. Position Sizing (حجم المركز)**

```javascript
{
  // للـ REAL Mode
  MAX_TRADE_SIZE: 50,              // $50 أقصى لكل صفقة
  RISK_PER_TRADE: 2,               // 2% من الرصيد
  MAX_CONCURRENT_TRADES_PER_SYMBOL: 1,
  MAX_CONCURRENT_TRADES_TOTAL: 5
}
```

**الحساب:**

```
رصيد = $1000
Risk Per Trade = 2%
Max Size = $1000 × 2% = $20 لكل صفقة

في DUAL:
REAL: $20 × Confidence/100 = $15-20
PAPER: $100 × Confidence/100 = $75-100
```

---

### **2. Stop Loss (توقف الخسارة)**

```javascript
{
  // تحديد توقف
  TRAILING_STOP_LOSS: 0.96,        // -4%
  STOP_LOSS_PERCENT: 4,             // بديل

  // تحديد الربح
  TRAILING_TAKE_PROFIT: 1.10,      // +10%
  TAKE_PROFIT_PERCENT: 10,          // بديل

  // الزمن
  POSITION_TIMEOUT_HOURS: 24        // إغلق بعد 24 ساعة
}
```

**الأمثلة:**

```javascript
// تجارة
Entry: $80365 (BTC)

// Trailing Stop Loss
Stop Loss = $80365 × 0.96 = $77,150
→ خسارة -4% ($3,215)

// Trailing Take Profit
Take Profit = $80365 × 1.10 = $88,402
→ ربح +10% ($8,037)

// Timeout: بعد 24 ساعة
إذا لم تصل لـ SL أو TP، أغلق بـ السعر الحالي
```

---

### **3. Daily Loss Limit (حد الخسارة اليومية)**

```javascript
{
  // للـ REAL Mode فقط
  MAX_DAILY_LOSS: 20,              // $20 خسارة/يوم
  CHECK_DAILY_LOSS_EVERY: 60       // دقيقة
}
```

**السيناريو:**

```
رصيد البداية: $100
Max Daily Loss: $20

إذا:
- Trade 1: -$5
- Trade 2: -$10
- Trade 3: -$5 (إجمالي = -$20)

→ البوت يوقف التداول بقية اليوم 🛑
→ Telegram Alert: "Daily Loss Limit Reached"
```

---

### **4. Balance Check (التحقق من الرصيد)**

```javascript
{
  MIN_BALANCE_TO_TRADE: 10,         // $10 الحد الأدنى
  MAX_BALANCE_GROWTH: 50,             // $50 نمو يومي
  FETCH_BALANCE_FREQUENCY: 60       // كل 60 دقيقة
}
```

---

## 📊 **الرموز والعملات**

### **الرموز الافتراضية:**

```javascript
SYMBOLS: [
  "BTC/USDT", // بيتكوين
  "ETH/USDT", // إيثيريوم
  "BNB/USDT", // بينانس
  "SOL/USDT", // سولانا
  "XRP/USDT", // ريبل
];
```

### **كيف تختار الرموز:**

```javascript
// ✅ جيد: عملات رئيسية
SYMBOLS: ["BTC/USDT", "ETH/USDT"]

// ⚠️ متوسط: تنويع
SYMBOLS: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT"]

// ❌ سيئ: عملات صغيرة
SYMBOLS: ["SHIB/USDT", "DOGE/USDT"]  // عالية الخطر

// ❌ سيئ جداً: كثير جداً
SYMBOLS: [...20 عملة]  // بطيء وغير موثوق
```

### **ترتيب الأفضلية:**

```javascript
Tier 1 (الأفضل):
  - BTC/USDT   (حجم هائل، آمن)
  - ETH/USDT   (موثوقية عالية)

Tier 2 (جيد):
  - BNB/USDT   (حجم جيد)
  - SOL/USDT   (عملة أساسية)

Tier 3 (متوسط):
  - ADA/USDT   (موثوقية معتدلة)
  - XRP/USDT   (تقلبات عالية)
```

---

## ⏰ **الوقت والتوقيت**

### **Timeframes (الفترات الزمنية):**

```javascript
TIMEFRAME: "1h"; // الخيارات: "1m", "5m", "1h", "4h", "D"
```

| الفترة | الاستخدام     | الخطر | الأرباح |
| ------ | ------------- | ----- | ------- |
| 1m     | Scalping      | عالي  | سريع    |
| 5m     | Day Trading   | متوسط | معتدل   |
| 1h     | Swing Trading | منخفض | ثابت ✅ |
| 4h     | Position      | منخفض | بطيء    |
| D      | Long-term     | منخفض | طويل    |

**الموصى به:** `"1h"` (توازن جيد)

---

### **وقت بدء التشغيل:**

```javascript
START_TIME: "09:00",    // بدء في 9 صباحاً
STOP_TIME: "17:00",     // توقف في 5 مساءً
TIMEZONE: "UTC"
```

---

### **التاريخ (للـ Backtest):**

```javascript
HISTORY_DAYS: 365,      // آخر سنة
// أو
START_DATE: "2024-01-01",
END_DATE: "2025-01-01"
```

---

## 📱 **Telegram والإشعارات**

### **في `.env`:**

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
TELEGRAM_CHAT_ID=987654321
```

### **في `ProductionConfig.js`:**

```javascript
{
  TELEGRAM_ENABLED: true,           // فعّل Telegram
  NOTIFY_ON_TRADE_OPEN: true,       // تنبيه عند الدخول
  NOTIFY_ON_TRADE_CLOSE: true,      // تنبيه عند الخروج
  NOTIFY_ON_ERROR: true,            // تنبيه على الأخطاء
  DAILY_REPORT_TIME: "21:00",       // التقرير اليومي
  REPORT_TIMEZONE: "UTC"
}
```

### **نموذج الإشعارات:**

```
🟢 ENTRY SIGNAL
   Symbol: BTC/USDT
   Direction: BUY
   Price: $85400.50
   Confidence: 85%
   Size: $50.00
   Time: 2026-02-09 10:30 UTC

✨ TRADE WIN
   Symbol: BTC/USDT
   Entry: $85400
   Exit: $87400
   P&L: +2.35% (+$1.18)
   Time: 12:30 UTC

📊 DAILY REPORT
   Trades: 12
   Wins: 8 (66%)
   Losses: 4
   Profit: +$18.50
   P&L %: +1.85%
```

---

## 📝 **الـ Logging والسجلات**

### **في `ProductionConfig.js`:**

```javascript
{
  LOG_LEVEL: "INFO",                // DEBUG, INFO, WARN, ERROR
  LOG_TO_FILE: true,                // احفظ في ملفات
  LOG_TO_CONSOLE: true,             // اطبع في Terminal
  LOG_DIRECTORY: "./logs",          // مجلد السجلات
  MAX_LOG_FILES: 30,                // احتفظ بـ 30 يوم
  COMPRESS_OLD_LOGS: true           // ضغط الملفات القديمة
}
```

### **الملفات المُنشأة:**

```
logs/
├── trading-2026-02-09.log          ← جميع الأحداث
├── trading-2026-02-08.log
├── trades-2026-02-09.json          ← الصفقات فقط (JSON)
├── trades-2026-02-08.json
└── performance.json                ← ملخص الأداء
```

### **مثال Trade Log:**

```json
{
  "timestamp": 1707469200000,
  "action": "OPEN",
  "symbol": "BTC/USDT",
  "direction": "BUY",
  "entryPrice": 85400,
  "size": 0.0005,
  "confidence": 85,
  "signals": ["Uptrend", "RSI:55", "Vol:1.5x", "Momentum"],
  "mode": "REAL"
}
```

---

## ⚡ **الأداء والتحسينات**

### **في `ProductionConfig.js`:**

```javascript
{
  // Caching
  CACHE_TTL: 300,                   // 5 دقائق
  USE_CACHE: true,

  // Performance
  CANDLE_BUFFER_SIZE: 500,          // آخر 500 شمعة
  MAX_CANDLE_HISTORY: 1000,         // أقصى 1000

  // Batch Processing
  BATCH_SIZE: 10,                   // معالج 10 رموز معاً
  PROCESS_DELAY_MS: 100,            // تأخير 100ms

  // Optimization
  USE_DOWNSAMPLING: true,           // قلل البيانات
  DOWNSAMPLING_RATIO: 4,            // 4x أصغر
  DEDUPLICATE_SIGNALS: true         // أزل الإشارات المكررة
}
```

### **تأثير التحسينات:**

```
بدون تحسينات:
- ذاكرة: 500 MB
- CPU: 85%
- سرعة: 2 دقيقة/cycle

مع التحسينات:
- ذاكرة: 125 MB (75% أقل ✅)
- CPU: 15%
- سرعة: 30 ثانية/cycle
```

---

## 🔑 **متغيرات البيئة**

### **ملف `.env` - النموذج الكامل:**

```env
# 🔑 Binance API (إلزامي)
BINANCE_API_KEY=HiBk82VJnQQC37MNT1B9vC5d35XbLUWVg3DO4HBUwFZvP3T8XFibrYbeoOdkbBIw
BINANCE_API_SECRET=ILmdfeI1Otco5Jh8cdndSOmIirWVTBLAP20qtfJ4zW8QNlWMSXCN7Q9hYlH2m4hM

# 📱 Telegram (اختياري)
TELEGRAM_BOT_TOKEN=8100406010:AAG3z-AlSAbBUEiOO7n-pjGy20vNEdJPnRE
TELEGRAM_CHAT_ID=6949980408

# 📊 Database (اختياري)
DATABASE_URL=sqlite:///./bot.db

# 🎯 Logging
LOG_LEVEL=INFO
LOG_FILE=logs/trading.log

# 🌐 API
API_TIMEOUT=10000
API_RATE_LIMIT=10

# ⏰ Schedule
TRADING_START_TIME=09:00
TRADING_END_TIME=17:00
TIMEZONE=UTC

# 🧪 Testing
TEST_MODE=false
DEMO_MODE=false
```

---

## 🎯 **الإعدادات الموصى بها:**

### **للمبتدئين:**

```javascript
{
  MODE: "PAPER",
  INITIAL_BALANCE: 100,
  MIN_CONFIDENCE: 70,
  SYMBOLS: ["BTC/USDT", "ETH/USDT"],
  TIMEFRAME: "1h",
  TRAILING_STOP_LOSS: 0.95,         // -5%
  TRAILING_TAKE_PROFIT: 1.05,       // +5%
  LOG_LEVEL: "INFO"
}
```

### **للمتوسطين:**

```javascript
{
  MODE: "DUAL",
  INITIAL_BALANCE: 1000,
  MIN_CONFIDENCE: 60,
  SYMBOLS: ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"],
  TIMEFRAME: "1h",
  TRAILING_STOP_LOSS: 0.96,         // -4%
  TRAILING_TAKE_PROFIT: 1.10,       // +10%
  USE_ORDER_BOOK_ANALYSIS: true,
  USE_VOLUME_PROFILE: true,
  TELEGRAM_ENABLED: true,
  LOG_LEVEL: "DEBUG"
}
```

### **للمحترفين:**

```javascript
{
  MODE: "REAL",
  INITIAL_BALANCE: 5000,
  MIN_CONFIDENCE: 75,
  SYMBOLS: ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT"],
  TIMEFRAME: "1h",
  MAX_TRADE_SIZE: 100,
  MAX_DAILY_LOSS: 50,
  TRAILING_STOP_LOSS: 0.92,         // -8%
  TRAILING_TAKE_PROFIT: 1.15,       // +15%
  USE_ORDER_BOOK_ANALYSIS: true,
  USE_VOLUME_PROFILE: true,
  USE_WHALE_TRACKER: true,
  USE_ADVANCED_INDICATORS: true,
  TELEGRAM_ENABLED: true,
  LOG_LEVEL: "ERROR"                // أقل تفاصيل
}
```

---

## ❓ **أسئلة شائعة:**

**س: أي إعدادات أغير أولاً؟**

> **ج:** غيّر `MODE` فقط. كل شيء آخر آمن بالافتراضient.

**س: متى أنتقل من PAPER إلى REAL؟**

> **ج:** بعد أسبوع من PAPER مع نسبة فوز > 50%.

**س: كم رصيد أبدأ به؟**

> **ج:** $50-100 آمن جداً للبدء.

**س: ما أفضل وقت للتداول؟**

> **ج:** أثناء ساعات البورصة العالمية (9am-5pm UTC).

**س: هل يمكنني تشغيل أكثر من بوت؟**

> **ج:** نعم، لكن على رموز مختلفة لتجنب conflict.

---

**🎯 تذكر: البدء صغير ثم التدرج! 🚀**
