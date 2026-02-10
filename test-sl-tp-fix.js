/**
 * 🧪 اختبار إصلاح Stop Loss & Take Profit
 * يتحقق من أن الحسابات صحيحة الآن
 */

const TradeManager = require("./src/TradeManager");

// Config للاختبار
const testConfig = {
  INITIAL_BALANCE: 10000,
  RISK_PER_TRADE: 0.02,
  MAX_CONCURRENT_TRADES_PER_SYMBOL: 2,
  MIN_CONFIDENCE: 65,
  TRAILING_STOP_LOSS: 0.94, // -6%
  TRAILING_TAKE_PROFIT: 1.12, // +12%
  TRAILING_STEP: 0.02,
  TIMEOUT_HOURS: 24,
  SYMBOLS: ["BTC/USDT"],
  LEVERAGE: 5,
  TRADING_TYPE: "futures",
};

const tradeManager = new TradeManager(testConfig);

console.log("🧪 اختبار إصلاح Stop Loss & Take Profit\n");

// ========== اختبار LONG (BUY) ==========
console.log("📊 اختبار LONG Position:");
const longTrade = tradeManager.openTrade(
  "BTC/USDT",
  60000, // سعر الدخول
  { confidence: 75, side: "LONG", signals: {} },
  10000,
  0,
);

if (longTrade) {
  console.log(`✅ سعر الدخول: $${longTrade.entryPrice.toFixed(2)}`);
  console.log(
    `   Stop Loss: $${longTrade.stopLoss.toFixed(2)} (${((longTrade.stopLoss / longTrade.entryPrice - 1) * 100).toFixed(2)}%)`,
  );
  console.log(
    `   Take Profit: $${longTrade.takeProfit.toFixed(2)} (${((longTrade.takeProfit / longTrade.entryPrice - 1) * 100).toFixed(2)}%)`,
  );

  // التحقق
  const slCorrect = longTrade.stopLoss < longTrade.entryPrice; // يجب أن يكون تحت سعر الدخول
  const tpCorrect = longTrade.takeProfit > longTrade.entryPrice; // يجب أن يكون فوق سعر الدخول

  if (slCorrect && tpCorrect) {
    console.log("   ✅ LONG Position صحيحة!\n");
  } else {
    console.log("   ❌ خطأ في LONG Position!\n");
    if (!slCorrect)
      console.log("      ⚠️ Stop Loss يجب أن يكون تحت سعر الدخول!");
    if (!tpCorrect)
      console.log("      ⚠️ Take Profit يجب أن يكون فوق سعر الدخول!");
  }
} else {
  console.log("❌ فشل فتح LONG Trade\n");
}

// ========== اختبار SHORT (SELL) ==========
console.log("📊 اختبار SHORT Position:");
const shortTrade = tradeManager.openTrade(
  "BTC/USDT",
  60000, // سعر الدخول
  { confidence: 75, side: "SHORT", signals: {} },
  10000,
  0,
);

if (shortTrade) {
  console.log(`✅ سعر الدخول: $${shortTrade.entryPrice.toFixed(2)}`);
  console.log(
    `   Stop Loss: $${shortTrade.stopLoss.toFixed(2)} (${((shortTrade.stopLoss / shortTrade.entryPrice - 1) * 100).toFixed(2)}%)`,
  );
  console.log(
    `   Take Profit: $${shortTrade.takeProfit.toFixed(2)} (${((shortTrade.takeProfit / shortTrade.entryPrice - 1) * 100).toFixed(2)}%)`,
  );

  // التحقق
  const slCorrect = shortTrade.stopLoss > shortTrade.entryPrice; // يجب أن يكون فوق سعر الدخول
  const tpCorrect = shortTrade.takeProfit < shortTrade.entryPrice; // يجب أن يكون تحت سعر الدخول

  if (slCorrect && tpCorrect) {
    console.log("   ✅ SHORT Position صحيحة!\n");
  } else {
    console.log("   ❌ خطأ في SHORT Position!\n");
    if (!slCorrect)
      console.log("      ⚠️ Stop Loss يجب أن يكون فوق سعر الدخول!");
    if (!tpCorrect)
      console.log("      ⚠️ Take Profit يجب أن يكون تحت سعر الدخول!");
  }
} else {
  console.log("❌ فشل فتح SHORT Trade\n");
}

// ========== اختبار Trailing Update ==========
console.log("📊 اختبار Trailing Stop Loss (LONG):");
const testTrade = {
  ...longTrade,
  highestPrice: 60000,
  lowestPrice: 60000,
  entryTime: Date.now(),
};

// السعر يرتفع إلى 65000
const update1 = tradeManager.updateTradeTrailing(testTrade, 65000, Date.now());
console.log(
  `   السعر: $65,000 → Trailing SL: $${testTrade.trailingStopPrice.toFixed(2)}`,
);
console.log(`   يجب إغلاق؟ ${update1.shouldClose ? "❌ نعم (خطأ!)" : "✅ لا"}`);

// السعر ينزل إلى 61000 (تحت الـ SL الجديد $61,100)
const update2 = tradeManager.updateTradeTrailing(testTrade, 61000, Date.now());
console.log(
  `   السعر: $61,000 → Trailing SL: $${testTrade.trailingStopPrice.toFixed(2)}`,
);
console.log(
  `   يجب إغلاق؟ ${update2.shouldClose ? "✅ نعم (تحت SL)" : "❌ لا (خطأ!)"}`,
);

// السعر ينزل إلى 60000 (تحت الـ SL الجديد)
const update3 = tradeManager.updateTradeTrailing(testTrade, 60000, Date.now());
console.log(
  `   السعر: $60,000 → Trailing SL: $${testTrade.trailingStopPrice.toFixed(2)}`,
);
console.log(`   يجب إغلاق؟ ${update3.shouldClose ? "✅ نعم" : "❌ لا (خطأ!)"}`);

console.log("\n==========================================");
console.log("✅ الاختبار انتهى - راجع النتائج أعلاه");
console.log("==========================================\n");
