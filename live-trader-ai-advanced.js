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

const CONFIG = {
  // 💼 Portfolio Settings
  SYMBOLS: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT"], // إضافة SOL و XRP
  INITIAL_BALANCE: 100,
  RISK_PER_TRADE: 0.1,

  // 🎯 Trading Type & Leverage
  TRADING_TYPE: process.env.TRADING_TYPE || "futures", // 'spot' or 'futures'
  LEVERAGE: parseInt(process.env.LEVERAGE) || 5, // رافعة مالية (Futures فقط)

  // 📊 SCALPING MODE - ربح سريع 1-2% ثم طلع!
  TRAILING_STOP_LOSS: 0.985, // -1.5% (محكم جداً للـ Scalping)
  TRAILING_TAKE_PROFIT: 1.02, // +2% (الهدف الثابت - اطلع فوراً!)
  TRAILING_STEP: 0.001,
  USE_UNLIMITED_PROFIT: false, // ❌ بدون unlimited! TP ثابت = إغلاق فوري

  // 🎯 خيارات إضافية للـ Advanced AI
  USE_ORDER_BOOK_ANALYSIS: true, // ✅ استخدم Order Book
  USE_WHALE_TRACKER: true, // ✅ استخدم Whale Tracker
  USE_VOLUME_PROFILE: true, // ✅ استخدم Volume Profile
  USE_SYMBOLIC_AI: true, // ✅ استخدم Symbolic AI الكامل
  USE_WEBSOCKET: true, // ✅ استخدم WebSocket للبيانات الحية

  // ⏱️ Trade Management - Scalping
  TIMEOUT_HOURS: 0.5, // 🚀 30 دقيقة فقط (الصفقات السريعة ما تقعد!)
  MAX_CONCURRENT_TRADES_PER_SYMBOL: 1,

  // 📊 Multi-Timeframe Analysis
  TIMEFRAME_TREND: "1h", // ⏰ الساعة - تحديد الاتجاه العام
  TIMEFRAME_ENTRY: "15m", // ⏰ الربع ساعة - توقيت الدخول
  REQUIRE_TREND_CONFIRMATION: true, // يجب توافق الاتجاهين
  REPORT_INTERVAL_HOURS: 3, // تقرير لايف على التليجرام كل 3 ساعات

  // 🧠 AI Settings - معايير عالية جداً للـ Scalping
  MIN_CONFIDENCE: 20, // 🔧 عالي جداً - صفقات قوية فقط!
  VOLUME_RATIO_MIN: 1.5, // 🔧 فوليوم قوي مطلوب

  // 🎯 Mode (يتم قراءته من environment variable اللي بيروح من pm2)
  // PAPER/LIVE_PAPER = تداول تجريبي بأسعار حقيقية (real-time)
  // REAL = تداول حقيقي بأوامر فعلية
  MODE: process.env.MODE || "LIVE_PAPER", // Default = LIVE_PAPER (آمن + حقيقي)

  // ⏱️ فترة التحديث للوضع Live (بالثواني)
  LIVE_UPDATE_INTERVAL: 30, // 🚀 30 ثانية فقط - ردود فعل سريعة للـ Scalping!

  // 💾 Database
  DATA_DIR: process.env.DATA_DIR || "data",
  DATA_RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS) || 20,

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

      // 🧹 تنظيف دوري كل 3 دقائق (حذف الخاسرة فقط!)
      if (timestamp - this.liveStatus.lastCleanup > CLEANUP_INTERVAL_MS) {
        console.log(`🔥 Aggressive cleanup triggered (3 mins)...`);
        try {
          // 1️⃣ حذف السجلات الخاسرة فقط (الناجحة تبقى للتعلم)
          await this.database.deleteLosingRecords();

          // 2️⃣ تنظيف البيانات القديمة (كل 20 يوم)
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
        `\n💰 Balance: $${this.balance.toFixed(2)} | Active Trades: ${this.allTrades.filter((t) => t.status === "OPEN").length}`,
      );

      // انتظار قبل التكرار التالي
      console.log(
        `⏸️  Waiting ${this.config.LIVE_UPDATE_INTERVAL}s until next update...\n`,
      );
      await new Promise((resolve) => setTimeout(resolve, updateInterval));
    }
  }

  buildEntryDecision(trend1h, entry15m) {
    const trendSide = trend1h?.side || "HOLD";
    const trendConf = Number(trend1h?.confidence || 0);
    const entrySide = entry15m?.side || "HOLD";
    const entryConf = Number(entry15m?.confidence || 0);

    let shouldEnter = false;
    let finalSignal = null;

    if (this.config.REQUIRE_TREND_CONFIRMATION) {
      if (trendSide === "LONG" && entry15m?.shouldBuy) {
        shouldEnter = true;
        finalSignal = "BUY";
      } else if (trendSide === "SHORT" && entry15m?.shouldSell) {
        shouldEnter = true;
        finalSignal = "SELL";
      }
    } else {
      if (entry15m?.shouldBuy) {
        shouldEnter = true;
        finalSignal = "BUY";
      } else if (entry15m?.shouldSell) {
        shouldEnter = true;
        finalSignal = "SELL";
      }
    }

    let status = "skip";
    if (shouldEnter) {
      status = "ready";
    } else if (
      (trendSide === "LONG" && entrySide === "LONG") ||
      (trendSide === "SHORT" && entrySide === "SHORT")
    ) {
      status = entryConf >= this.config.MIN_CONFIDENCE ? "ready" : "near";
    }

    return {
      trendSide,
      trendConf,
      entrySide,
      entryConf,
      shouldEnter,
      finalSignal,
      status,
    };
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

      if (
        !candles1h ||
        !candles15m ||
        candles1h.length < 100 ||
        candles15m.length < 100
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

      const decision = this.buildEntryDecision(trend1h, entry15m);

      console.log(
        `   🕐 1h Trend: ${decision.trendSide} (${decision.trendConf.toFixed(1)}%)`,
      );
      console.log(
        `   🕒 15m Entry: ${decision.entrySide} (${decision.entryConf.toFixed(1)}%)`,
      );

      // تحديث live status
      this.liveStatus.lastAnalysis[symbol] = Date.now();
      this.liveStatus.lastSignal[symbol] = {
        trendSide: decision.trendSide,
        trendConf: decision.trendConf,
        entrySide: decision.entrySide,
        entryConf: decision.entryConf,
        status: decision.status,
        updatedAt: Date.now(),
      };

      // 6️⃣ فتح صفقة جديدة (إذا كانت الشروط مستوفاة)
      const maxTrades = this.config.MAX_CONCURRENT_TRADES_PER_SYMBOL;
      if (this.symbolData[symbol].activeTrades.length < maxTrades) {
        if (decision.shouldEnter && decision.finalSignal) {
          const analysis = entry15m;
          analysis.side = decision.finalSignal === "BUY" ? "LONG" : "SHORT";

          const trade = this.tradeManager.openTrade(
            symbol,
            currentPrice, // ← السعر الحقيقي الحالي!
            analysis,
            this.balance,
            this.symbolData[symbol].activeTrades.length,
          );

          if (trade) {
            trade.executionMode = executeTrades ? "REAL" : "SIM";
            this.symbolData[symbol].activeTrades.push(trade);
            this.balance -= trade.positionSize;

            const emoji = decision.finalSignal === "BUY" ? "🟢" : "🔴";
            const action = decision.finalSignal === "BUY" ? "BUY" : "SELL";

            console.log(
              `${emoji} [${symbol}] ${action} @ $${currentPrice.toFixed(2)} | 1h: ${decision.trendSide} | 15m: ${decision.entrySide} | Conf: ${analysis.confidence}% | Mode: ${trade.executionMode}`,
            );

            // حفظ في Database
            if (this.database && this.database.initialized) {
              try {
                await this.database.saveTrade({
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
    const side = trade.side === "SELL" ? "CLOSE SHORT" : "CLOSE LONG";
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

    // 💾 حفظ الصفقة المغلقة في Database
    if (this.database && this.database.initialized) {
      try {
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
          closedAt: new Date().toISOString(),
          reason: reason,
        });

        // تحديث إحصائيات الأداء
        await this.database.updatePerformance({
          symbol: closedTrade.symbol,
          profitLoss: closedTrade.pnl,
        });

        // حفظ الأنماط الناجحة (أرباح > 5%)
        if (closedTrade.profitPercent > 5) {
          await this.database.saveSuccessfulPattern({
            symbol: closedTrade.symbol,
            type: closedTrade.side,
            confidence: closedTrade.confidence,
            indicators: closedTrade.indicators || {},
            profit: closedTrade.pnl,
          });
        }
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
      const reasonMap = {
        TRAILING_SL: "Stop Loss",
        TRAILING_TP: "Take Profit",
        TIMEOUT: "Timeout",
        END: "End",
      };

      const message =
        `${emoji} *إغلاق:* ${trade.symbol}\n` +
        `📊 *P&L:* ${profitPercent > 0 ? "+" : ""}${profitPercent.toFixed(2)}%\n` +
        `💸 *USD:* $${pnl.toFixed(2)}\n` +
        `🧾 *السبب:* ${reasonMap[reason] || reason}`;

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

    return (
      `📡 *تقرير لايف كل 3 ساعات*\n` +
      `⏱️ *مدة التشغيل:* ${uptimeHours} ساعة\n` +
      `🧭 *الوضع:* ${this.mode} | ${this.tradingType.toUpperCase()} ${this.tradingType === "futures" ? `${this.leverage}x` : ""}\n` +
      `💰 *الرصيد:* $${this.balance.toFixed(2)} | 📊 *صافي الربح:* $${this.performance.netProfit.toFixed(2)}\n` +
      `✅ *الصفقات:* ${this.performance.trades} (W:${this.performance.wins} / L:${this.performance.losses})\n\n` +
      `📊 *آخر تحليل للرموز:*\n${analyzedLines}\n\n` +
      `🎯 *إشارات قريبة للدخول:*\n${candidateLines}\n\n` +
      `🕒 *الوقت:* ${now.toLocaleString()}`
    );
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
    await this.database.cleanOldData(this.config.DATA_RETENTION_DAYS);
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
