#!/usr/bin/env node

/**
 * 🚀 LIVE TRADER AI - ADVANCED VERSION (SIMPLIFIED & MODULAR)
 *
 * Features:
 * ✅ Trailing Stop Loss (يتحرك مع السعر)
 * ✅ Trailing Take Profit (يتابع الأرباح للأعلى)
 * ✅ Multi-Symbol Trading (عملات متعددة)
 * ✅ Realistic Returns (مع الرسوم والعمولات)
 * ✅ Works for LIVE TRADING (simulation or real execution)
 */

require("dotenv").config();
let ccxt;
try {
  // Prefer ccxt.pro for WebSocket support if installed
  ccxt = require("ccxt.pro");
  console.log("🔗 ccxt.pro detected (WebSocket managed by BinanceOrderBookWS)");
} catch (e) {
  ccxt = require("ccxt");
  console.log("ℹ️ Using ccxt (WebSocket managed by BinanceOrderBookWS)");
}
const AdvancedAIAnalyzer = require("./src/AdvancedAIAnalyzer");
const BinanceOrderBookWS = require("./src/modules/BinanceOrderBookWS");
const TradeManager = require("./src/TradeManager");
const PortfolioManager = require("./src/PortfolioManager");
const TelegramBotManager = require("./src/modules/TelegramBot");
const DatabaseManager = require("./src/database/DatabaseManager");
const {
  CLOSE_REASON_LABELS,
  normalizeCloseReason: normalizeCloseReasonKey,
} = require("./src/constants/closeReasons");
const {
  SIGNALS,
  ORDER_ACTIONS,
  toPositionSide,
  toOrderAction,
  isAligned,
} = require("./src/constants/signals");

const parseSymbols = (value) => {
  if (!value || typeof value !== "string") return null;
  const parsed = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .map((item) => (item.includes("/") ? item : `${item}/USDT`));
  return parsed.length > 0 ? parsed : null;
};

const envSymbols = parseSymbols(process.env.SYMBOLS);

const CONFIG = {
  // 💼 Portfolio Settings
  SYMBOLS: envSymbols || [
    "BTC/USDT",
    "ETH/USDT",
    "SOL/USDT",
    "XRP/USDT",
    "BNB/USDT",
    "DOGE/USDT",
    "ADA/USDT",
  ],
  INITIAL_BALANCE: 100,
  RISK_PER_TRADE: 0.1,

  // 🎯 Trading Type & Leverage
  TRADING_TYPE: process.env.TRADING_TYPE || "futures", // 'spot' or 'futures'
  LEVERAGE: parseInt(process.env.LEVERAGE) || 5, // رافعة مالية (Futures فقط)

  // 📊 HYPER SCALPING MODE - ربح سريع 0.5-1% ثم طلع فوراً!
  TRAILING_STOP_LOSS: 0.97, // -3% (مساحة تنفّس أكبر للسعر)
  TRAILING_TAKE_PROFIT: 1.02, // +2% (هدف الربح الأساسي)
  TRAILING_STEP: 0.001,
  ATR_MIN_PCT: parseFloat(process.env.ATR_MIN_PCT) || 0.005, // ✅ أقل ATR = 0.5% من السعر
  MIN_STOP_DISTANCE_PCT: parseFloat(process.env.MIN_STOP_DISTANCE_PCT) || 0.006, // ✅ أقل مسافة SL = 0.6%
  TRAILING_MIN_DISTANCE_PCT:
    parseFloat(process.env.TRAILING_MIN_DISTANCE_PCT) || 0.005, // ✅ أقل مسافة Trailing = 0.5%
  USE_UNLIMITED_PROFIT: false, // ❌ بدون unlimited! TP ثابت = إغلاق فوري

  // 🎯 خيارات إضافية للـ Advanced AI
  USE_ORDER_BOOK_ANALYSIS: true, // ✅ استخدم Order Book
  USE_WHALE_TRACKER: true, // ✅ استخدم Whale Tracker
  USE_VOLUME_PROFILE: true, // ✅ استخدم Volume Profile
  USE_SYMBOLIC_AI: true, // ✅ استخدم Symbolic AI الكامل
  USE_WEBSOCKET: true, // ✅ استخدم WebSocket للبيانات الحية

  // ⏱️ Trade Management - Hyper Scalping
  TIMEOUT_HOURS: 4, // ⏱️ 4 ساعات قبل الإغلاق بالـ Timeout
  TIMEOUT_MIN_HOURS: 2,
  TIMEOUT_MAX_HOURS: 8,
  MAX_CONCURRENT_TRADES_PER_SYMBOL: 1,

  // 📊 Multi-Timeframe Analysis
  TIMEFRAME_TREND: "1h", // ⏰ الساعة - تحديد الاتجاه العام
  TIMEFRAME_ENTRY: "15m", // ⏰ الربع ساعة - توقيت الدخول
  TIMEFRAME_TRIGGER: process.env.TIMEFRAME_TRIGGER || "5m", // ⏰ 5 دقائق - trigger للدخول
  USE_TRIGGER_TIMEFRAME: process.env.USE_TRIGGER_TIMEFRAME !== "false",
  ALLOW_TRIGGER_OVERRIDE_AGAINST_TREND:
    process.env.ALLOW_TRIGGER_OVERRIDE_AGAINST_TREND !== "false",
  ALLOW_TRIGGER_ONLY_ENTRIES:
    process.env.ALLOW_TRIGGER_ONLY_ENTRIES !== "false",
  TRIGGER_ONLY_MIN_CONFIDENCE:
    parseFloat(process.env.TRIGGER_ONLY_MIN_CONFIDENCE) || 18,
  TRIGGER_CONFIDENCE_WEIGHT:
    parseFloat(process.env.TRIGGER_CONFIDENCE_WEIGHT) || 0.4,
  REQUIRE_TREND_CONFIRMATION: true, // يجب توافق الاتجاهين
  REPORT_INTERVAL_HOURS: 3, // تقرير لايف على التليجرام كل 3 ساعات

  // 🧠 AI Settings - معايير معقولة للـ Scalping
  MIN_CONFIDENCE: parseFloat(process.env.MIN_CONFIDENCE) || 50, // 🔒 رفع فلتر الثقة لتقليل الدخول الضعيف
  MIN_TREND_CONFIDENCE: parseFloat(process.env.MIN_TREND_CONFIDENCE) || 45,
  MIN_SUCCESS_PROBABILITY:
    parseFloat(process.env.MIN_SUCCESS_PROBABILITY) || 0.18,
  ACTION_MIN_CONFIDENCE: parseFloat(process.env.ACTION_MIN_CONFIDENCE) || 20,
  MIN_DIRECTIONAL_FACTORS: parseInt(process.env.MIN_DIRECTIONAL_FACTORS) || 2,
  ENABLE_MARKET_REGIME_ADAPTATION:
    process.env.ENABLE_MARKET_REGIME_ADAPTATION !== "false",
  TRENDING_MIN_CONFIDENCE:
    parseFloat(process.env.TRENDING_MIN_CONFIDENCE) || 38,
  RANGING_MIN_CONFIDENCE: parseFloat(process.env.RANGING_MIN_CONFIDENCE) || 46,
  CHOPPY_MIN_CONFIDENCE: parseFloat(process.env.CHOPPY_MIN_CONFIDENCE) || 44,
  TRENDING_MIN_TREND_CONFIDENCE:
    parseFloat(process.env.TRENDING_MIN_TREND_CONFIDENCE) || 30,
  RANGING_MIN_TREND_CONFIDENCE:
    parseFloat(process.env.RANGING_MIN_TREND_CONFIDENCE) || 42,
  CHOPPY_MIN_TREND_CONFIDENCE:
    parseFloat(process.env.CHOPPY_MIN_TREND_CONFIDENCE) || 40,
  ORDERBOOK_AS_REFERENCE: process.env.ORDERBOOK_AS_REFERENCE !== "false",
  ORDERBOOK_REFERENCE_WEIGHT:
    parseFloat(process.env.ORDERBOOK_REFERENCE_WEIGHT) || 0.08,
  ORDERBOOK_BOOST: parseFloat(process.env.ORDERBOOK_BOOST) || 4,
  ORDERBOOK_PENALTY: parseFloat(process.env.ORDERBOOK_PENALTY) || 6,
  REQUIRE_ORDERBOOK_CONFIRMATION:
    process.env.REQUIRE_ORDERBOOK_CONFIRMATION !== "false",
  ALLOW_LONGS: process.env.ALLOW_LONGS !== "false",
  ALLOW_SHORTS: process.env.ALLOW_SHORTS !== "false",
  VOLUME_RATIO_MIN: 1.5, // 🔧 فوليوم قوي مطلوب

  // 🛡️ Risk Governor
  ENABLE_RISK_GOVERNOR: process.env.ENABLE_RISK_GOVERNOR !== "false",
  MAX_DAILY_LOSS_USD: parseFloat(process.env.MAX_DAILY_LOSS_USD) || 3,
  MAX_CONSECUTIVE_LOSSES: parseInt(process.env.MAX_CONSECUTIVE_LOSSES) || 3,
  LOSS_COOLDOWN_MINUTES: parseInt(process.env.LOSS_COOLDOWN_MINUTES) || 90,
  RISK_REDUCTION_STEP: parseFloat(process.env.RISK_REDUCTION_STEP) || 0.2,
  MIN_RISK_MULTIPLIER: parseFloat(process.env.MIN_RISK_MULTIPLIER) || 0.4,

  // 🔍 Explainability
  ENABLE_EXPLAINABILITY_LOG: process.env.ENABLE_EXPLAINABILITY_LOG !== "false",

  // 🎛️ Trade Pacing (Target trades/day)
  ENABLE_TRADE_PACING: process.env.ENABLE_TRADE_PACING !== "false",
  TARGET_MAX_TRADES_PER_DAY:
    parseInt(process.env.TARGET_MAX_TRADES_PER_DAY) || 10,
  MIN_MINUTES_BETWEEN_ENTRIES_PER_SYMBOL:
    parseInt(process.env.MIN_MINUTES_BETWEEN_ENTRIES_PER_SYMBOL) || 15,

  // 🎯 Mode (يتم قراءته من environment variable اللي بيروح من pm2)
  // PAPER/LIVE_PAPER = تداول تجريبي بأسعار حقيقية (real-time)
  // REAL = تداول حقيقي بأوامر فعلية
  MODE: process.env.MODE || "LIVE_PAPER", // Default = LIVE_PAPER (آمن + حقيقي)

  // ⏱️ فترة التحديث للوضع Live (بالثواني)
  LIVE_UPDATE_INTERVAL: 30, // 🚀 30 ثانية فقط - ردود فعل سريعة للـ Scalping!

  // 💾 Database
  DATA_DIR: process.env.DATA_DIR || "data",
  DATA_RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS) || 20,
  ENABLE_DATA_CLEANUP: process.env.ENABLE_DATA_CLEANUP === "true",

  // 📲 Telegram
  ENABLE_TELEGRAM: true,
};

class AdvancedTradingAI {
  constructor(config) {
    this.config = config;
    // اقرأ MODE من environment variable (يسمح pm2 بتغييره)
    this.mode = process.env.MODE || config.MODE || "LIVE_PAPER";
    console.log(`📋 Operating Mode: ${this.mode}`);

    // Exchange (Binance)
    // في PAPER/LIVE_PAPER: نستخدم API بدون authentication (public endpoints)
    // في REAL mode: نستخدم API keys من .env
    this.exchange = new ccxt.binance({
      apiKey: this.mode === "REAL" ? process.env.BINANCE_API_KEY || "" : "",
      secret: this.mode === "REAL" ? process.env.BINANCE_SECRET_KEY || "" : "",
      enableRateLimit: true,
      timeout: 30000, // 30 ثانية بدلاً من 10 ثواني
      options: {
        defaultType: config.TRADING_TYPE, // 'spot' or 'futures'
        ...(config.TRADING_TYPE === "futures" && {
          defaultMarginMode: "isolated",
        }),
      },
    });

    // ⚙️ إعداد الرافعة المالية للـ Futures
    this.leverage = config.LEVERAGE;
    this.tradingType = config.TRADING_TYPE;
    console.log(`📊 Trading Type: ${this.tradingType.toUpperCase()}`);
    if (this.tradingType === "futures") {
      console.log(`⚡ Leverage: ${this.leverage}x`);
    }

    // WebSocket order book
    this.orderBookWs = null;
    if (config.USE_WEBSOCKET) {
      this.orderBookWs = new BinanceOrderBookWS();
      // ✅ استخدم الطريقة الجديدة: connectWebSockets (مباشر على الـ stream)
      this.orderBookWs.connectWebSockets(config.SYMBOLS);
      console.log(
        `🔗 WebSocket connections initiated for: ${config.SYMBOLS.join(", ")}`,
      );
    }

    // 💾 Database للتعلم
    this.database = new DatabaseManager(config.DATA_DIR);

    // Modules - استخدام المحلل المتقدم الجديد
    this.analyzer = new AdvancedAIAnalyzer(
      config,
      this.exchange,
      this.orderBookWs,
      this.database, // تمرير database
    );
    this.tradeManager = new TradeManager(config);
    this.portfolioManager = new PortfolioManager(config, this.mode);
    this.telegramManager = new TelegramBotManager();
    this.telegramEnabled = config.ENABLE_TELEGRAM;

    // Log telegram status
    console.log(`📲 Telegram: ${this.telegramEnabled ? "✅ مفعل" : "❌ معطل"}`);
    if (this.telegramEnabled && this.telegramManager.enabled) {
      console.log(`📱 Chat ID: ${this.telegramManager.chatId}`);
    }

    // State
    this.balance = config.INITIAL_BALANCE;
    this.allTrades = [];
    this.symbolData = {};
    this.performance = {
      trades: 0,
      wins: 0,
      losses: 0,
      netProfit: 0,
      totalConfidence: 0,
    };

    this.liveStatus = {
      startedAt: Date.now(),
      lastAnalysis: {},
      lastSignal: {},
      lastCleanup: Date.now(), // ⏱️ آخر وقت تنظيف
    };

    this.riskGovernor = {
      dayKey: new Date().toISOString().slice(0, 10),
      dailyPnl: 0,
      consecutiveLosses: 0,
      tradingPausedUntil: 0,
      pauseReason: null,
    };

    this.tradePacing = {
      dayKey: new Date().toISOString().slice(0, 10),
      entriesToday: 0,
      lastEntryAtBySymbol: {},
    };

    config.SYMBOLS.forEach((symbol) => this.ensureSymbolData(symbol));
  }

  ensureSymbolData(symbol) {
    if (!this.symbolData[symbol]) {
      this.symbolData[symbol] = {
        activeTrades: [],
        completedTrades: [],
        dailyProfit: 0,
        orderBook: null,
      };
    }
  }

  refreshRiskGovernorDay(now = Date.now()) {
    const dayKey = new Date(now).toISOString().slice(0, 10);
    if (this.riskGovernor.dayKey !== dayKey) {
      this.riskGovernor.dayKey = dayKey;
      this.riskGovernor.dailyPnl = 0;
      this.riskGovernor.consecutiveLosses = 0;
      this.riskGovernor.tradingPausedUntil = 0;
      this.riskGovernor.pauseReason = null;
      console.log("🧮 Risk Governor reset for new day");
    }
  }

  refreshTradePacingDay(now = Date.now()) {
    const dayKey = new Date(now).toISOString().slice(0, 10);
    if (this.tradePacing.dayKey !== dayKey) {
      this.tradePacing.dayKey = dayKey;
      this.tradePacing.entriesToday = 0;
      this.tradePacing.lastEntryAtBySymbol = {};
      console.log("🎛️ Trade pacing reset for new day");
    }
  }

  getAdaptiveThresholds(entryAnalysis = {}) {
    const fallback = {
      regimeType: "DEFAULT",
      minEntryConfidence: Number(this.config.MIN_CONFIDENCE || 40),
      minTrendConfidence: Number(this.config.MIN_TREND_CONFIDENCE || 35),
    };

    if (!this.config.ENABLE_MARKET_REGIME_ADAPTATION) {
      return fallback;
    }

    const regimeType = entryAnalysis?.marketRegime?.type || "DEFAULT";
    if (regimeType === "TRENDING") {
      return {
        regimeType,
        minEntryConfidence: Number(this.config.TRENDING_MIN_CONFIDENCE || 38),
        minTrendConfidence: Number(
          this.config.TRENDING_MIN_TREND_CONFIDENCE || 30,
        ),
      };
    }

    if (regimeType === "RANGING") {
      return {
        regimeType,
        minEntryConfidence: Number(this.config.RANGING_MIN_CONFIDENCE || 46),
        minTrendConfidence: Number(
          this.config.RANGING_MIN_TREND_CONFIDENCE || 42,
        ),
      };
    }

    if (regimeType === "CHOPPY") {
      return {
        regimeType,
        minEntryConfidence: Number(this.config.CHOPPY_MIN_CONFIDENCE || 44),
        minTrendConfidence: Number(
          this.config.CHOPPY_MIN_TREND_CONFIDENCE || 40,
        ),
      };
    }

    return fallback;
  }

  getRiskMultiplier() {
    if (!this.config.ENABLE_RISK_GOVERNOR) return 1;
    const losses = Number(this.riskGovernor.consecutiveLosses || 0);
    const reduction = losses * Number(this.config.RISK_REDUCTION_STEP || 0.2);
    return Math.max(
      Number(this.config.MIN_RISK_MULTIPLIER || 0.4),
      1 - reduction,
    );
  }

  canOpenTrade(symbol) {
    if (!this.config.ENABLE_RISK_GOVERNOR) {
      return { allowed: true, reason: null };
    }

    this.refreshRiskGovernorDay();
    this.refreshTradePacingDay();
    const now = Date.now();

    if (this.config.ENABLE_TRADE_PACING) {
      const maxTrades = Number(this.config.TARGET_MAX_TRADES_PER_DAY || 10);
      if (this.tradePacing.entriesToday >= maxTrades) {
        return {
          allowed: false,
          reason: `daily trade target reached (${this.tradePacing.entriesToday}/${maxTrades})`,
        };
      }

      const minGapMs =
        Number(this.config.MIN_MINUTES_BETWEEN_ENTRIES_PER_SYMBOL || 15) *
        60 *
        1000;
      const lastEntryAt = this.tradePacing.lastEntryAtBySymbol[symbol] || 0;
      if (lastEntryAt > 0 && now - lastEntryAt < minGapMs) {
        const leftMin = Math.ceil((minGapMs - (now - lastEntryAt)) / 60000);
        return {
          allowed: false,
          reason: `entry cooldown for ${symbol} (${leftMin}m left)`,
        };
      }
    }

    if (this.riskGovernor.tradingPausedUntil > now) {
      const leftMin = Math.ceil(
        (this.riskGovernor.tradingPausedUntil - now) / 60000,
      );
      return {
        allowed: false,
        reason: `risk pause active (${leftMin}m left)`,
      };
    }

    const maxDailyLoss = Number(this.config.MAX_DAILY_LOSS_USD || 3);
    if (this.riskGovernor.dailyPnl <= -Math.abs(maxDailyLoss)) {
      return { allowed: false, reason: "daily loss limit reached" };
    }

    return { allowed: true, reason: null };
  }

  applyRiskGovernorOnClose(closedTrade) {
    if (!this.config.ENABLE_RISK_GOVERNOR) return;

    this.refreshRiskGovernorDay(closedTrade.exitTime || Date.now());
    const pnl = Number(closedTrade.pnl || 0);
    this.riskGovernor.dailyPnl += pnl;

    if (pnl < 0) {
      this.riskGovernor.consecutiveLosses += 1;
    } else {
      this.riskGovernor.consecutiveLosses = 0;
    }

    const maxDailyLoss = Number(this.config.MAX_DAILY_LOSS_USD || 3);
    const maxConsecutive = Number(this.config.MAX_CONSECUTIVE_LOSSES || 3);
    const cooldownMs =
      Number(this.config.LOSS_COOLDOWN_MINUTES || 90) * 60 * 1000;

    if (this.riskGovernor.dailyPnl <= -Math.abs(maxDailyLoss)) {
      this.riskGovernor.tradingPausedUntil = Date.now() + cooldownMs;
      this.riskGovernor.pauseReason = "daily-loss-limit";
      console.warn(
        `🛡️ Risk Governor: daily loss limit hit (${this.riskGovernor.dailyPnl.toFixed(2)} USD). Trading paused ${this.config.LOSS_COOLDOWN_MINUTES}m`,
      );
      return;
    }

    if (this.riskGovernor.consecutiveLosses >= maxConsecutive) {
      this.riskGovernor.tradingPausedUntil = Date.now() + cooldownMs;
      this.riskGovernor.pauseReason = "consecutive-losses";
      console.warn(
        `🛡️ Risk Governor: ${this.riskGovernor.consecutiveLosses} consecutive losses. Trading paused ${this.config.LOSS_COOLDOWN_MINUTES}m`,
      );
    }
  }

  logDecisionExplainability(symbol, payload = {}) {
    if (!this.config.ENABLE_EXPLAINABILITY_LOG) return;
    try {
      const entry = {
        ts: new Date().toISOString(),
        symbol,
        ...payload,
      };
      console.log(`🧠 Explainability: ${JSON.stringify(entry)}`);
    } catch (error) {
      console.warn(`⚠️ Explainability log error: ${error.message}`);
    }
  }

  /**
   * 🔴 LIVE Mode - تداول حقيقي بأسعار live (LIVE_PAPER أو REAL)
   */
  async runLiveMode(executeTrades = false) {
    const modeLabel = executeTrades ? "REAL" : "SIM";
    console.log(`🚀 Starting live trading loop... (${modeLabel})`);
    console.log(`⏱️  Update interval: ${this.config.LIVE_UPDATE_INTERVAL}s\n`);

    let iteration = 0;
    const updateInterval = this.config.LIVE_UPDATE_INTERVAL * 1000; // تحويل لميلي ثانية
    const CLEANUP_INTERVAL_MS = 3 * 60 * 1000; // 🔥 تنظيف كل 3 دقائق (تجاهل الخاسرة فقط!)

    // Loop مستمر للتداول الحقيقي
    while (true) {
      iteration++;
      const timestamp = Date.now();

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(
        `🔄 Iteration #${iteration} | ${new Date().toLocaleString()}`,
      );
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // 🧹 تنظيف دوري كل 3 دقائق (تنظيف زمني فقط للحفاظ على بيانات التعلم)
      if (
        this.config.ENABLE_DATA_CLEANUP &&
        timestamp - this.liveStatus.lastCleanup > CLEANUP_INTERVAL_MS
      ) {
        console.log(`🧹 Scheduled cleanup triggered (3 mins)...`);
        try {
          // 1️⃣ تنظيف البيانات القديمة فقط (كل 20 يوم)
          await this.database.cleanOldData(this.config.DATA_RETENTION_DAYS);

          this.liveStatus.lastCleanup = timestamp;
        } catch (error) {
          console.error("❌ Cleanup error:", error.message);
        }
      }

      // تحليل كل رمز بشكل متوازي
      await Promise.all(
        this.config.SYMBOLS.map((symbol) =>
          this.analyzeLiveSymbol(symbol, timestamp, executeTrades),
        ),
      );

      // عرض ملخص سريع
      console.log(
        `\n💰 Balance: $${this.balance.toFixed(2)} | Active Trades: ${this.allTrades.filter((t) => t.status === "OPEN").length} | RG DailyPnL: $${this.riskGovernor.dailyPnl.toFixed(2)} | RG Losses: ${this.riskGovernor.consecutiveLosses} | Entries Today: ${this.tradePacing.entriesToday}/${this.config.TARGET_MAX_TRADES_PER_DAY}`,
      );

      // انتظار قبل التكرار التالي
      console.log(
        `⏸️  Waiting ${this.config.LIVE_UPDATE_INTERVAL}s until next update...\n`,
      );
      await new Promise((resolve) => setTimeout(resolve, updateInterval));
    }
  }

  buildEntryDecision(trend1h, entry15m, trigger5m = null) {
    const trendSide = trend1h?.side || SIGNALS.HOLD;
    const trendConf = Number(trend1h?.confidence || 0);
    const entrySide = entry15m?.side || SIGNALS.HOLD;
    const baseEntryConf = Number(entry15m?.confidence || 0);
    const triggerSide = trigger5m?.side || SIGNALS.HOLD;
    const triggerConf = Number(trigger5m?.confidence || 0);
    const useTrigger = this.config.USE_TRIGGER_TIMEFRAME && !!trigger5m;

    const triggerWeight = Math.max(
      0,
      Math.min(1, Number(this.config.TRIGGER_CONFIDENCE_WEIGHT || 0.4)),
    );
    const entryWeight = 1 - triggerWeight;

    const triggerAlignedLong =
      triggerSide === SIGNALS.LONG || trigger5m?.shouldBuy === true;
    const triggerAlignedShort =
      triggerSide === SIGNALS.SHORT || trigger5m?.shouldSell === true;
    const entryLong = entry15m?.shouldBuy === true;
    const entryShort = entry15m?.shouldSell === true;

    const entryConf = useTrigger
      ? baseEntryConf * entryWeight + triggerConf * triggerWeight
      : baseEntryConf;

    let shouldEnter = false;
    let finalSignal = null;
    let mode = "strict";

    if (this.config.REQUIRE_TREND_CONFIRMATION) {
      const longWithTrend =
        trendSide === SIGNALS.LONG &&
        entryLong &&
        (!useTrigger || triggerAlignedLong);
      const shortWithTrend =
        trendSide === SIGNALS.SHORT &&
        entryShort &&
        (!useTrigger || triggerAlignedShort);

      if (longWithTrend) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.BUY;
      } else if (shortWithTrend) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.SELL;
      } else if (
        this.config.ALLOW_TRIGGER_OVERRIDE_AGAINST_TREND &&
        useTrigger &&
        entryLong &&
        triggerAlignedLong
      ) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.BUY;
        mode = "override";
      } else if (
        this.config.ALLOW_TRIGGER_OVERRIDE_AGAINST_TREND &&
        useTrigger &&
        entryShort &&
        triggerAlignedShort
      ) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.SELL;
        mode = "override";
      } else if (
        this.config.ALLOW_TRIGGER_ONLY_ENTRIES &&
        useTrigger &&
        !entryLong &&
        !entryShort &&
        triggerAlignedLong &&
        triggerConf >= this.config.TRIGGER_ONLY_MIN_CONFIDENCE &&
        (trendSide === SIGNALS.HOLD ||
          this.config.ALLOW_TRIGGER_OVERRIDE_AGAINST_TREND)
      ) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.BUY;
        mode = "trigger-only";
      } else if (
        this.config.ALLOW_TRIGGER_ONLY_ENTRIES &&
        useTrigger &&
        !entryLong &&
        !entryShort &&
        triggerAlignedShort &&
        triggerConf >= this.config.TRIGGER_ONLY_MIN_CONFIDENCE &&
        (trendSide === SIGNALS.HOLD ||
          this.config.ALLOW_TRIGGER_OVERRIDE_AGAINST_TREND)
      ) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.SELL;
        mode = "trigger-only";
      }
    } else {
      if (entryLong && (!useTrigger || triggerAlignedLong)) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.BUY;
      } else if (entryShort && (!useTrigger || triggerAlignedShort)) {
        shouldEnter = true;
        finalSignal = ORDER_ACTIONS.SELL;
      }
    }

    let status = "skip";
    if (shouldEnter) {
      status = "ready";
    } else if (isAligned(trendSide, entrySide)) {
      status = entryConf >= this.config.MIN_CONFIDENCE ? "ready" : "near";
    }

    return {
      trendSide,
      trendConf,
      entrySide,
      entryConf,
      baseEntryConf,
      triggerSide,
      triggerConf,
      useTrigger,
      mode,
      shouldEnter,
      finalSignal,
      status,
    };
  }

  hasDirectionalOrderBookSupport(analysis) {
    const side = analysis?.side;
    if (!analysis?._rawData?.orderBook) return false;

    const expectedSignal =
      side === SIGNALS.LONG
        ? "Order Book يميل لـ LONG"
        : side === SIGNALS.SHORT
          ? "Order Book يميل لـ SHORT"
          : null;

    if (!expectedSignal) return false;

    const signals = Array.isArray(analysis?.signals) ? analysis.signals : [];
    return signals.some(
      (signal) => typeof signal === "string" && signal.includes(expectedSignal),
    );
  }

  logModeBanner() {
    if (this.mode === "PAPER") {
      console.log("✅  ======================================");
      console.log(
        "✅  PAPER MODE: تداول تجريبي بأسعار حقيقية (Alias لـ LIVE_PAPER)",
      );
      console.log("✅  الأسعار من Binance مباشرة (real-time)");
      console.log("✅  الصفقات simulation فقط (آمن - لا تنفيذ فعلي)");
      console.log("✅  ======================================\n");
      return;
    }

    if (this.mode === "LIVE_PAPER") {
      console.log("✅  ======================================");
      console.log("✅  LIVE_PAPER MODE: تداول تجريبي بأسعار حقيقية!");
      console.log("✅  الأسعار من Binance مباشرة (real-time)");
      console.log("✅  الصفقات simulation فقط (آمن - لا تنفيذ فعلي)");
      console.log("✅  ======================================\n");
      return;
    }

    if (this.mode === "REAL") {
      console.log("🚨  ======================================");
      console.log("🚨  REAL MODE: تداول حقيقي بأموال فعلية!");
      console.log("🚨  الأوامر تُنفذ على Binance فعلياً");
      console.log("🚨  رصيدك الحقيقي معرض للربح/الخسارة");
      console.log("🚨  ======================================\n");
    }
  }

  /**
   * 🔍 تحليل رمز واحد في LIVE Mode
   */
  async analyzeLiveSymbol(symbol, timestamp, executeTrades = false) {
    try {
      this.ensureSymbolData(symbol);

      // 1️⃣ جلب السعر الحالي (live price)
      const ticker = await this.exchange.fetchTicker(symbol);
      const currentPrice = ticker.last;

      console.log(`📊 [${symbol}] Current Price: $${currentPrice.toFixed(2)}`);

      // 2️⃣ جلب شموع للتحليل (آخر 200 شمعة فقط)
      const candles1h = await this.exchange.fetchOHLCV(
        symbol,
        this.config.TIMEFRAME_TREND,
        undefined,
        200,
      );
      const candles15m = await this.exchange.fetchOHLCV(
        symbol,
        this.config.TIMEFRAME_ENTRY,
        undefined,
        200,
      );
      const candles5m = this.config.USE_TRIGGER_TIMEFRAME
        ? await this.exchange.fetchOHLCV(
            symbol,
            this.config.TIMEFRAME_TRIGGER,
            undefined,
            200,
          )
        : null;

      if (
        !candles1h ||
        !candles15m ||
        (this.config.USE_TRIGGER_TIMEFRAME && !candles5m) ||
        candles1h.length < 100 ||
        candles15m.length < 100 ||
        (this.config.USE_TRIGGER_TIMEFRAME && candles5m.length < 100)
      ) {
        console.log(`⚠️  [${symbol}] Insufficient data, skipping...`);
        return;
      }

      // 3️⃣ Order Book من WebSocket
      const wsOrderBook = this.orderBookWs?.getOrderBook(symbol) || null;
      if (wsOrderBook) {
        this.symbolData[symbol].orderBook = wsOrderBook;
      }

      // 4️⃣ تحديث الصفقات القائمة (Trailing SL/TP)
      const activeTrades = this.symbolData[symbol]?.activeTrades || [];
      const tradesToKeep = [];

      for (const trade of activeTrades) {
        const { shouldClose, exitPrice, reason } =
          this.tradeManager.updateTradeTrailing(trade, currentPrice, timestamp);

        if (shouldClose) {
          await this.closeTrade(symbol, trade, exitPrice, reason);
        } else {
          tradesToKeep.push(trade);
        }
      }

      this.symbolData[symbol].activeTrades = tradesToKeep;

      // 5️⃣ تحليل multi-timeframe
      const trend1h = await this.analyzer.analyze(candles1h, symbol);
      const entry15m = await this.analyzer.analyze(candles15m, symbol);
      const trigger5m = this.config.USE_TRIGGER_TIMEFRAME
        ? await this.analyzer.analyze(candles5m, symbol)
        : null;

      const decision = this.buildEntryDecision(trend1h, entry15m, trigger5m);
      const adaptiveThresholds = this.getAdaptiveThresholds(entry15m);

      console.log(
        `   🕐 1h Trend: ${decision.trendSide} (${decision.trendConf.toFixed(1)}%)`,
      );
      console.log(
        `   🕒 15m Entry: ${decision.entrySide} (${decision.entryConf.toFixed(1)}%)`,
      );
      if (decision.useTrigger) {
        console.log(
          `   🕔 5m Trigger: ${decision.triggerSide} (${decision.triggerConf.toFixed(1)}%) | Mode: ${decision.mode}`,
        );
      }

      // تحديث live status
      this.liveStatus.lastAnalysis[symbol] = Date.now();
      this.liveStatus.lastSignal[symbol] = {
        trendSide: decision.trendSide,
        trendConf: decision.trendConf,
        entrySide: decision.entrySide,
        entryConf: decision.entryConf,
        status: decision.status,
        regime: adaptiveThresholds.regimeType,
        updatedAt: Date.now(),
      };

      this.logDecisionExplainability(symbol, {
        stage: "pre-entry",
        trend: {
          side: decision.trendSide,
          confidence: Number(decision.trendConf.toFixed(1)),
        },
        entry: {
          side: decision.entrySide,
          confidence: Number(decision.baseEntryConf.toFixed(1)),
        },
        trigger: decision.useTrigger
          ? {
              side: decision.triggerSide,
              confidence: Number(decision.triggerConf.toFixed(1)),
            }
          : null,
        mixedConfidence: Number(decision.entryConf.toFixed(1)),
        decisionMode: decision.mode,
        regime: entry15m?.marketRegime || {
          type: adaptiveThresholds.regimeType,
        },
        adaptiveThresholds,
        decisionMetrics: entry15m?.explainability?.decisionMetrics || null,
        shouldEnter: decision.shouldEnter,
      });

      // 6️⃣ فتح صفقة جديدة (إذا كانت الشروط مستوفاة)
      const maxTrades = this.config.MAX_CONCURRENT_TRADES_PER_SYMBOL;
      if (this.symbolData[symbol].activeTrades.length < maxTrades) {
        if (decision.shouldEnter && decision.finalSignal) {
          const riskCheck = this.canOpenTrade(symbol);
          if (!riskCheck.allowed) {
            console.log(`⏭️ [${symbol}] Skip: ${riskCheck.reason}`);
            this.logDecisionExplainability(symbol, {
              stage: "skip",
              reason: riskCheck.reason,
              adaptiveThresholds,
              riskGovernor: this.riskGovernor,
            });
            return;
          }

          const analysis = entry15m;
          analysis.side = toPositionSide(decision.finalSignal);
          analysis.trendConfidence = decision.trendConf;
          analysis.trendContext = {
            side: decision.trendSide,
            confidence: decision.trendConf,
          };
          analysis.trendAligned = isAligned(decision.trendSide, analysis.side);
          analysis.riskMultiplier = this.getRiskMultiplier();

          // 🔒 Quality gates قبل فتح الصفقة
          if (decision.entryConf < adaptiveThresholds.minEntryConfidence) {
            console.log(
              `⏭️ [${symbol}] Skip: low entry confidence ${decision.entryConf.toFixed(1)}% < ${adaptiveThresholds.minEntryConfidence}%`,
            );
            this.logDecisionExplainability(symbol, {
              stage: "skip",
              reason: "low-entry-confidence",
              adaptiveThresholds,
              confidence: Number(decision.entryConf.toFixed(1)),
            });
            return;
          }

          if (decision.trendConf < adaptiveThresholds.minTrendConfidence) {
            console.log(
              `⏭️ [${symbol}] Skip: weak trend confidence ${decision.trendConf.toFixed(1)}% < ${adaptiveThresholds.minTrendConfidence}%`,
            );
            this.logDecisionExplainability(symbol, {
              stage: "skip",
              reason: "weak-trend-confidence",
              adaptiveThresholds,
              trendConfidence: Number(decision.trendConf.toFixed(1)),
            });
            return;
          }

          if (analysis.side === SIGNALS.LONG && !this.config.ALLOW_LONGS) {
            console.log(`⏭️ [${symbol}] Skip: LONG entries disabled`);
            this.logDecisionExplainability(symbol, {
              stage: "skip",
              reason: "long-disabled",
            });
            return;
          }

          if (analysis.side === SIGNALS.SHORT && !this.config.ALLOW_SHORTS) {
            console.log(`⏭️ [${symbol}] Skip: SHORT entries disabled`);
            this.logDecisionExplainability(symbol, {
              stage: "skip",
              reason: "short-disabled",
            });
            return;
          }

          if (
            this.config.REQUIRE_ORDERBOOK_CONFIRMATION &&
            !this.hasDirectionalOrderBookSupport(analysis)
          ) {
            console.log(
              `⏭️ [${symbol}] Skip: no directional Order Book confirmation for ${analysis.side}`,
            );
            this.logDecisionExplainability(symbol, {
              stage: "skip",
              reason: "missing-orderbook-confirmation",
            });
            return;
          }

          const trade = this.tradeManager.openTrade(
            symbol,
            currentPrice, // ← السعر الحقيقي الحالي!
            analysis,
            this.balance,
            this.symbolData[symbol].activeTrades.length,
          );

          if (trade) {
            trade.executionMode = executeTrades ? "REAL" : "SIM";
            trade.marketRegime = analysis.marketRegime || null;
            trade.entryExplainability = analysis.explainability || null;
            this.symbolData[symbol].activeTrades.push(trade);
            this.balance -= trade.positionSize;
            this.refreshTradePacingDay();
            this.tradePacing.entriesToday += 1;
            this.tradePacing.lastEntryAtBySymbol[symbol] = Date.now();

            const action = toOrderAction(analysis.side) || decision.finalSignal;
            const emoji = action === ORDER_ACTIONS.BUY ? "🟢" : "🔴";

            console.log(
              `${emoji} [${symbol}] ${action} @ $${currentPrice.toFixed(2)} | 1h: ${decision.trendSide} | 15m: ${decision.entrySide} | Conf: ${analysis.confidence}% | Regime: ${adaptiveThresholds.regimeType} | Risk x${analysis.riskMultiplier.toFixed(2)} | Timeout: ${trade.timeoutHours}h | Mode: ${trade.executionMode}`,
            );

            if (decision.mode === "override") {
              console.log(
                `⚡ [${symbol}] 5m+15m override against 1h trend activated`,
              );
            }

            this.logDecisionExplainability(symbol, {
              stage: "entry",
              action,
              confidence: Number(analysis.confidence),
              regime: analysis.marketRegime || {
                type: adaptiveThresholds.regimeType,
              },
              adaptiveThresholds,
              riskMultiplier: analysis.riskMultiplier,
              stopLoss: Number(trade.stopLoss.toFixed(6)),
              takeProfit: Number(trade.takeProfit.toFixed(6)),
              decisionMetrics: analysis.explainability?.decisionMetrics || null,
            });

            // حفظ في Database
            if (this.database && this.database.initialized) {
              try {
                const dbTradeId = await this.database.saveTrade({
                  symbol: trade.symbol,
                  side: trade.side,
                  entryPrice: trade.entryPrice,
                  quantity: trade.quantity,
                  stopLoss: trade.stopLoss,
                  takeProfit: trade.takeProfit,
                  confidence: trade.confidence,
                  analysisId: analysis.analysisId,
                  status: "OPEN",
                });
                if (dbTradeId) {
                  trade.dbTradeId = dbTradeId;
                }
              } catch (dbError) {
                console.warn(`⚠️ Database save error: ${dbError.message}`);
              }
            }

            await this.notifyTelegramEntry(trade, analysis);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [${symbol}] Error in live analysis:`, error.message);
    }
  }

  /**
   * 🏁 إغلاق صفقة
   */
  async closeTrade(symbol, trade, exitPrice, reason) {
    const closedTrade = this.tradeManager.closeTrade(trade, exitPrice, reason);

    this.balance += trade.positionSize + closedTrade.pnl;
    this.symbolData[symbol].dailyProfit += closedTrade.pnl;

    const emoji = closedTrade.profitPercent > 0 ? "✅" : "❌";
    const side =
      trade.side === ORDER_ACTIONS.SELL ? "CLOSE SHORT" : "CLOSE LONG";
    console.log(
      `${emoji} [${symbol}] ${side} @ $${exitPrice.toFixed(2)} | P&L: ${closedTrade.profitPercent.toFixed(2)}% | Balance: $${this.balance.toFixed(2)}`,
    );

    this.symbolData[symbol].completedTrades.push(closedTrade);
    this.allTrades.push(closedTrade);
    this.performance.trades += 1;
    this.performance.netProfit += closedTrade.pnl;
    this.performance.totalConfidence += closedTrade.confidence || 0;
    if (closedTrade.profitPercent > 0) this.performance.wins += 1;
    else this.performance.losses += 1;

    this.applyRiskGovernorOnClose(closedTrade);
    this.logDecisionExplainability(symbol, {
      stage: "close",
      side: closedTrade.side,
      reason,
      profitPercent: Number(closedTrade.profitPercent.toFixed(3)),
      pnlUsd: Number(closedTrade.pnl.toFixed(4)),
      regimeAtEntry: closedTrade.marketRegime || null,
      riskGovernor: {
        dailyPnl: Number(this.riskGovernor.dailyPnl.toFixed(4)),
        consecutiveLosses: this.riskGovernor.consecutiveLosses,
        pausedUntil: this.riskGovernor.tradingPausedUntil || 0,
        pauseReason: this.riskGovernor.pauseReason,
      },
    });

    // 💾 حفظ الصفقة المغلقة في Database
    if (this.database && this.database.initialized) {
      try {
        const closePayload = {
          exitPrice: closedTrade.exitPrice,
          profitLoss: closedTrade.pnl,
          profitLossPercent: closedTrade.profitPercent,
          analysisId: closedTrade.analysisId,
          closedAt: new Date().toISOString(),
          reason: reason,
        };

        if (closedTrade.dbTradeId) {
          await this.database.closeTradeRecord(
            closedTrade.dbTradeId,
            closePayload,
          );
        } else {
          // fallback آمن إذا لم يتوفر trade id
          await this.database.saveTrade({
            symbol: closedTrade.symbol,
            side: closedTrade.side,
            entryPrice: closedTrade.entryPrice,
            exitPrice: closedTrade.exitPrice,
            quantity: closedTrade.quantity,
            stopLoss: closedTrade.stopLoss,
            takeProfit: closedTrade.takeProfit,
            confidence: closedTrade.confidence,
            analysisId: closedTrade.analysisId,
            status: "CLOSED",
            profitLoss: closedTrade.pnl,
            profitLossPercent: closedTrade.profitPercent,
            closedAt: closePayload.closedAt,
            reason: reason,
          });
        }

        // تحديث إحصائيات الأداء
        await this.database.updatePerformance({
          symbol: closedTrade.symbol,
          profitLoss: closedTrade.pnl,
        });

        // حفظ ناتج النمط للتعلم المتوازن (ناجح + خاسر)
        await this.database.savePatternOutcome({
          symbol: closedTrade.symbol,
          type: closedTrade.side,
          confidence: closedTrade.confidence,
          indicators: closedTrade.indicators || {},
          profit: closedTrade.pnl,
        });
      } catch (dbError) {
        console.warn(`⚠️ Database update trade error: ${dbError.message}`);
      }
    }

    await this.notifyTelegramClose(
      closedTrade,
      closedTrade.profitPercent,
      closedTrade.pnl,
      reason,
    );
    this.portfolioManager.savePortfolio(
      this.balance,
      this.allTrades,
      this.symbolData,
      this.performance,
      this.config.INITIAL_BALANCE,
    );
  }

  /**
   * 📲 Telegram Notifications
   */
  async notifyTelegramEntry(trade, analysis) {
    if (!this.telegramEnabled || !this.telegramManager.enabled) {
      console.log(
        `[TELEGRAM DISABLED] Entry: ${trade.symbol} @ $${trade.entryPrice.toFixed(2)}`,
      );
      return;
    }

    try {
      const signals = (analysis.signals || []).slice(0, 4).join(" | ");
      const message =
        `🚀 *دخول جديد:* ${trade.symbol}\n` +
        `💰 *السعر:* $${trade.entryPrice.toFixed(2)}\n` +
        `📦 *الحجم:* $${trade.positionSize.toFixed(2)}\n` +
        `🎯 *الثقة:* ${analysis.confidence}%\n` +
        `🧭 *إشارات:* ${signals || "-"}\n` +
        `🛑 *SL:* $${trade.trailingStopPrice.toFixed(2)}\n` +
        `🎯 *TP:* $${trade.trailingTPPrice.toFixed(2)}`;

      await this.telegramManager.send(message);
      console.log(
        `📲 [Entry Alert Sent] ${trade.symbol} @ $${trade.entryPrice.toFixed(2)}`,
      );
    } catch (error) {
      console.error(`❌ [Telegram Entry Error]: ${error.message}`);
    }
  }

  async notifyTelegramClose(trade, profitPercent, pnl, reason) {
    if (!this.telegramEnabled || !this.telegramManager.enabled) {
      console.log(
        `[TELEGRAM DISABLED] Close: ${trade.symbol} | P&L: ${profitPercent.toFixed(2)}%`,
      );
      return;
    }

    try {
      const emoji = profitPercent > 0 ? "✅" : "❌";
      const message =
        `${emoji} *إغلاق:* ${trade.symbol}\n` +
        `📊 *P&L:* ${profitPercent > 0 ? "+" : ""}${profitPercent.toFixed(2)}%\n` +
        `💸 *USD:* $${pnl.toFixed(2)}\n` +
        `🧾 *السبب:* ${CLOSE_REASON_LABELS[reason] || reason}`;

      await this.telegramManager.send(message);
      console.log(
        `📲 [Close Alert Sent] ${trade.symbol} | P&L: ${profitPercent > 0 ? "+" : ""}${profitPercent.toFixed(2)}%`,
      );
    } catch (error) {
      console.error(`❌ [Telegram Close Error]: ${error.message}`);
    }
  }

  buildLiveReportMessage() {
    const now = new Date();
    const uptimeHours = (
      (Date.now() - this.liveStatus.startedAt) /
      3600000
    ).toFixed(1);
    const weeklyKpis = this.calculateWeeklyKpis();

    const analyzedLines = this.config.SYMBOLS.map((symbol) => {
      const lastTs = this.liveStatus.lastAnalysis[symbol];
      if (!lastTs) return `• ${symbol}: لم يتم بعد`;
      const minutes = Math.floor((Date.now() - lastTs) / 60000);
      return `• ${symbol}: منذ ${minutes} دقيقة`;
    }).join("\n");

    const candidates = Object.entries(this.liveStatus.lastSignal)
      .filter(
        ([, data]) =>
          data && (data.status === "ready" || data.status === "near"),
      )
      .sort((a, b) => (b[1]?.entryConf || 0) - (a[1]?.entryConf || 0))
      .slice(0, 4);

    const candidateLines = candidates.length
      ? candidates
          .map(([symbol, data]) => {
            const statusLabel = data.status === "ready" ? "جاهز" : "قريب";
            return `• ${symbol}: ${statusLabel} | 1h ${data.trendSide} ${data.trendConf.toFixed(1)}% | 15m ${data.entrySide} ${data.entryConf.toFixed(1)}%`;
          })
          .join("\n")
      : "• لا توجد إشارات قريبة حاليا";

    const reasonLines = Object.entries(weeklyKpis.byReason)
      .map(([reason, stats]) => {
        return `• ${reason}: Win ${stats.winRate.toFixed(1)}% | AvgPnL $${stats.avgPnl.toFixed(2)} | Count ${stats.total}`;
      })
      .join("\n");

    const timeoutAlert =
      weeklyKpis.timeoutCloseRatio >= 35
        ? "⚠️ نسبة TIMEOUT مرتفعة - يفضّل تشديد جودة الدخول"
        : "✅ نسبة TIMEOUT ضمن النطاق المقبول";

    const penaltyImpactLine =
      weeklyKpis.failingPenalty.applied > 0
        ? `• failing penalty: Applied ${weeklyKpis.failingPenalty.rate.toFixed(1)}% | Win(with) ${weeklyKpis.failingPenalty.winRateWithPenalty.toFixed(1)}% vs Win(without) ${weeklyKpis.failingPenalty.winRateWithoutPenalty.toFixed(1)}%`
        : "• failing penalty: لا توجد حالات مطبقة هذا الأسبوع";

    return (
      `📡 *تقرير لايف كل 3 ساعات*\n` +
      `⏱️ *مدة التشغيل:* ${uptimeHours} ساعة\n` +
      `🧭 *الوضع:* ${this.mode} | ${this.tradingType.toUpperCase()} ${this.tradingType === "futures" ? `${this.leverage}x` : ""}\n` +
      `💰 *الرصيد:* $${this.balance.toFixed(2)} | 📊 *صافي الربح:* $${this.performance.netProfit.toFixed(2)}\n` +
      `✅ *الصفقات:* ${this.performance.trades} (W:${this.performance.wins} / L:${this.performance.losses})\n\n` +
      `📊 *آخر تحليل للرموز:*\n${analyzedLines}\n\n` +
      `🎯 *إشارات قريبة للدخول:*\n${candidateLines}\n\n` +
      `📈 *KPI أسبوعي (7 أيام):*\n` +
      `• Timeout Ratio: ${weeklyKpis.timeoutCloseRatio.toFixed(1)}%\n` +
      `${reasonLines || "• لا توجد صفقات مغلقة هذا الأسبوع"}\n` +
      `${penaltyImpactLine}\n` +
      `${timeoutAlert}\n\n` +
      `🕒 *الوقت:* ${now.toLocaleString()}`
    );
  }

  normalizeCloseReason(reason) {
    return normalizeCloseReasonKey(reason);
  }

  calculateWeeklyKpis() {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const since = Date.now() - WEEK_MS;

    const closedTrades = this.allTrades.filter((trade) => {
      const closedAt =
        trade.exitTime ||
        (trade.closedAt ? new Date(trade.closedAt).getTime() : null) ||
        trade.entryTime;
      return trade.status === "CLOSED" && closedAt >= since;
    });

    const byReason = {};
    let timeoutCount = 0;

    for (const trade of closedTrades) {
      const reason = this.normalizeCloseReason(trade.exitReason);
      if (!byReason[reason]) {
        byReason[reason] = {
          total: 0,
          wins: 0,
          pnlSum: 0,
          winRate: 0,
          avgPnl: 0,
        };
      }

      byReason[reason].total += 1;
      if (trade.profitPercent > 0) byReason[reason].wins += 1;
      byReason[reason].pnlSum += Number(trade.pnl || 0);

      if (reason === "TIMEOUT") timeoutCount += 1;
    }

    Object.values(byReason).forEach((item) => {
      item.winRate = item.total > 0 ? (item.wins / item.total) * 100 : 0;
      item.avgPnl = item.total > 0 ? item.pnlSum / item.total : 0;
    });

    const withPenalty = closedTrades.filter((t) => t.failingPenaltyApplied);
    const withoutPenalty = closedTrades.filter((t) => !t.failingPenaltyApplied);

    const withPenaltyWins = withPenalty.filter(
      (t) => t.profitPercent > 0,
    ).length;
    const withoutPenaltyWins = withoutPenalty.filter(
      (t) => t.profitPercent > 0,
    ).length;

    const totalClosed = closedTrades.length;

    return {
      totalClosed,
      timeoutCloseRatio:
        totalClosed > 0 ? (timeoutCount / totalClosed) * 100 : 0,
      byReason,
      failingPenalty: {
        applied: withPenalty.length,
        rate: totalClosed > 0 ? (withPenalty.length / totalClosed) * 100 : 0,
        winRateWithPenalty:
          withPenalty.length > 0
            ? (withPenaltyWins / withPenalty.length) * 100
            : 0,
        winRateWithoutPenalty:
          withoutPenalty.length > 0
            ? (withoutPenaltyWins / withoutPenalty.length) * 100
            : 0,
      },
    };
  }

  async sendLiveReport() {
    if (!this.telegramEnabled || !this.telegramManager.enabled) return;

    try {
      const message = this.buildLiveReportMessage();
      await this.telegramManager.send(message);
      console.log("📲 [Live Report Sent] Telegram report sent successfully");
    } catch (error) {
      console.error(`❌ [Telegram Live Report Error]: ${error.message}`);
    }
  }

  /**
   * 🚀 Run الكامل
   */
  async run() {
    console.log("\n🚀 ADVANCED TRADING AI - Modular & Fast\n");
    console.log(`📊 Symbols: ${this.config.SYMBOLS.join(", ")}`);
    console.log(`💰 Initial Balance: $${this.config.INITIAL_BALANCE}`);
    console.log(`🎯 Mode: ${this.mode}`);
    console.log(`📈 Min Confidence: ${this.config.MIN_CONFIDENCE}%\n`);

    this.logModeBanner();

    // 💾 تهيئة Database
    console.log("💾 Initializing Database...");
    await this.database.initialize();
    if (this.config.ENABLE_DATA_CLEANUP) {
      await this.database.cleanOldData(this.config.DATA_RETENTION_DAYS);
    } else {
      console.log(
        "🛡️ Data cleanup disabled (ENABLE_DATA_CLEANUP=false) - preserving full learning history",
      );
    }
    // ✅ إصلاح: await للـ getStats لأنه async الآن (SQLite)
    const dbStats = await this.database.getStats();
    console.log(
      `📊 Database: ${dbStats.totalAnalyses} analyses, ${dbStats.totalTrades} trades, ${dbStats.totalPatterns} patterns\n`,
    );

    // 🧠 التعلم من البيانات التاريخية
    console.log("🧠 Loading historical patterns for AI...");
    await this.analyzer.symbolicAI.learnFromHistory(null); // لكل الرموز
    console.log(`✅ AI ready with learned patterns\n`);

    // 🔌 انتظار WebSocket حتى يصل لحالة مستقرة (3+ ticks لكل رمز)
    console.log("🔌 Waiting for WebSocket stability...");
    let wsReady = false;
    let waitTime = 0;
    const maxWait = 10000; // 10 ثواني أقصى

    while (!wsReady && waitTime < maxWait) {
      wsReady = this.config.SYMBOLS.every((symbol) => {
        const isReady = this.orderBookWs?.isReady?.(symbol);
        if (isReady) {
          const health = this.orderBookWs?.wsHealth?.[symbol];
          console.log(`  ✅ ${symbol}: Ready (${health?.ticks || 0} ticks)`);
        }
        return isReady;
      });

      if (!wsReady) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        waitTime += 500;
      }
    }

    if (wsReady) {
      console.log("✅ All WebSocket connections stable!\n");
    } else {
      console.warn(
        "⚠️ WebSocket timeout - proceeding anyway (may use cached data)\n",
      );
    }

    // تحليل وتداول
    console.log("⚙️  بدء التحليل والتداول...\n");

    if (this.telegramEnabled && this.telegramManager.enabled) {
      const reportIntervalMs =
        this.config.REPORT_INTERVAL_HOURS * 60 * 60 * 1000;
      setInterval(() => this.sendLiveReport(), reportIntervalMs);
      await this.sendLiveReport();
    }

    // 🔴 LIVE Mode: أسعار حقيقية لكل الأوضاع
    const executeTrades = this.mode === "REAL";
    console.log("🔴 Starting LIVE Trading Mode (real-time prices)...\n");
    await this.runLiveMode(executeTrades);

    // عرض النتائج
    this.portfolioManager.displaySummary(
      this.balance,
      this.allTrades,
      this.symbolData,
      this.config.INITIAL_BALANCE,
    );

    // 📊 عرض إحصائيات التعلم
    console.log("\n🧠 AI Learning Stats:");
    // ✅ إصلاح: التحقق من وجود learningStats قبل الوصول
    const stats = this.analyzer.symbolicAI.learningStats || {};
    console.log(`  Learned Patterns: ${stats.totalLearned || 0}`);
    console.log(`  Winning Patterns: ${stats.winningPatterns || 0}`);
    console.log(`  Win Rate: ${((stats.winRate || 0) * 100).toFixed(2)}%`);
  }
}

if (require.main === module) {
  new AdvancedTradingAI(CONFIG).run().catch((e) => console.error(e));
}

module.exports = { AdvancedTradingAI, CONFIG };
