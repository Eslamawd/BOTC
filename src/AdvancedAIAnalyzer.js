/**
 * 🧠 Advanced AI Analyzer - المحلل الذكي الشامل
 *
 * يجمع كل الميزات:
 * - EMA, RSI, Volume (الأساسيات)
 * - Order Book Analysis (تحليل سطح الأوامر)
 * - Whale Tracking (رصد الحيتان)
 * - Volume Profile (توزيع الأحجام)
 * - Symbolic AI (الذكاء الرياضي)
 *
 * يعطي قرار نهائي: BUY, SELL, أو HOLD
 */

const SymbolicAI = require("./ai/SymbolicAI");
const VolumeProfileAnalyzer = require("./modules/VolumeProfileAnalyzer");
const WhaleTracker = require("./modules/WhaleTracker");
const { SIGNALS } = require("./constants/signals");

class AdvancedAIAnalyzer {
  constructor(config, exchange, orderBookProvider = null, database = null) {
    this.config = config;
    this.exchange = exchange;
    this.orderBookProvider = orderBookProvider;
    this.database = database;

    // تهيئة المحللات
    this.symbolicAI = new SymbolicAI(
      {
        MIN_PATTERN_STRENGTH: 0.5,
        MIN_CORRELATION: 0.5,
        MIN_PROBABILITY: this.config.MIN_SUCCESS_PROBABILITY || 0.18,
        ACTION_MIN_CONFIDENCE: this.config.ACTION_MIN_CONFIDENCE || 20,
        MIN_DIRECTIONAL_FACTORS: this.config.MIN_DIRECTIONAL_FACTORS || 2,
        ORDERBOOK_AS_REFERENCE: this.config.ORDERBOOK_AS_REFERENCE !== false,
        ORDERBOOK_REFERENCE_WEIGHT:
          this.config.ORDERBOOK_REFERENCE_WEIGHT || 0.08,
        ORDERBOOK_BOOST: this.config.ORDERBOOK_BOOST || 4,
        ORDERBOOK_PENALTY: this.config.ORDERBOOK_PENALTY || 6,
        LOOKBACK_PERIOD: 100,
        PREDICTION_HORIZON: 5,
      },
      database,
    ); // تمرير database للـ AI

    this.volumeAnalyzer = new VolumeProfileAnalyzer();
    // ✅ إصلاح: تمرير database للـ WhaleTracker
    this.whaleTracker = new WhaleTracker(database);
  }

  /**
   * 🔍 التحليل الشامل - يستخدم كل الميزات (ASYNC لجلب البيانات الحقيقية)
   */
  async analyze(candles, symbol) {
    if (!candles || candles.length < 100) {
      return null;
    }

    try {
      // ========== 1. البيانات الأساسية ==========
      const closes = candles.map((c) => c[4]);
      const volumes = candles.map((c) => c[5]);
      const currentPrice = closes[closes.length - 1];
      const avgVolume =
        volumes.length > 0
          ? volumes.reduce((a, b) => a + b, 0) / volumes.length
          : 0;

      // ========== 2. حساب المؤشرات ==========
      const indicators = this.calculateIndicators(candles);

      // ========== 3. Order Book (WebSocket ONLY) ==========
      let orderBook = null;
      try {
        if (
          this.config.USE_ORDER_BOOK_ANALYSIS &&
          this.config.USE_WEBSOCKET &&
          this.orderBookProvider
        ) {
          // 🔌 استخدام WebSocket فقط - لا REST ولا محاكاة
          if (this.orderBookProvider.isReady(symbol)) {
            orderBook = this.orderBookProvider.getOrderBook(symbol);
            if (orderBook) {
              orderBook.simulated = false;
              orderBook.source = "websocket";
            }
          } else {
            // ⏳ WebSocket مش جاهز - نكمل بدون Order Book
          }
        }
      } catch (e) {
        console.warn(
          `⚠️ خطأ في WebSocket Order Book لـ ${symbol}: ${e.message}`,
        );
      }

      // ========== 4. تحليل Volume Profile ==========
      let volumeProfile = null;
      try {
        if (this.config.USE_VOLUME_PROFILE !== false) {
          volumeProfile = this.volumeAnalyzer.calculateVolumeProfile(candles);
        }
      } catch (e) {
        // تجاهل إذا فشل Volume Profile
        volumeProfile = null;
      }

      // ========== 5. رصد الحيتان (whale tracking) ==========
      let whaleActivity = [];
      try {
        if (this.config.USE_WHALE_TRACKER && orderBook) {
          const whaleResult = this.whaleTracker.analyzeWhales(
            symbol,
            orderBook,
            {
              avgVolume,
              close: currentPrice,
            },
          );
          whaleActivity = whaleResult?.whales || [];
        }
      } catch (e) {
        // تجاهل أخطاء whale tracking
      }

      // ========== 6. التحليل الشامل بواسطة Symbolic AI ==========
      const aiAnalysis = this.symbolicAI.comprehensiveAnalysis({
        symbol,
        candles,
        indicators,
        volumeProfile,
        orderBook,
        whaleActivity,
        currentPrice,
      });

      // ========== 7. بناء النتيجة النهائية ==========
      const decision = aiAnalysis; // SymbolicAI يعطي قرار شامل

      // تحويل لصيغة متوافقة مع الكود الحالي
      const analysisResult = {
        symbol,
        timestamp: Date.now(),
        close: currentPrice,
        rsi: indicators.rsi,
        ema20: indicators.ema20,
        ema50: indicators.ema50,
        ema200: indicators.ema200,
        volumeRatio:
          volumes[volumes.length - 1] /
          (volumes.slice(-20).reduce((a, b) => a + b, 0) / 20),

        // القرار من Symbolic AI
        side: decision.action, // "LONG", "SHORT", أو "HOLD"
        confidence: decision.confidence.toFixed(1),
        aiScore: decision.confidence,
        signals: decision.supportingFactors,
        learnedPattern: decision.learnedPattern || null,
        failingPenaltyApplied: decision.learnedPattern?.category === "failing",
        marketRegime: decision.marketRegime || null,
        explainability: {
          reasoning: decision.reasoning || [],
          warnings: decision.warnings || [],
          supportingFactors: decision.supportingFactors || [],
          opposingFactors: decision.opposingFactors || [],
          decisionMetrics: decision.decisionMetrics || null,
        },

        // للتوافق مع الكود القديم
        shouldBuy: decision.action === SIGNALS.LONG,
        shouldSell: decision.action === SIGNALS.SHORT,

        // معلومات إضافية
        analysis: {
          orderBook:
            !orderBook && this.config.USE_WEBSOCKET
              ? "⏳ بانتظار WebSocket"
              : orderBook?.simulated
                ? "✅ محاكى (Backtest)"
                : `✅ حقيقي (${orderBook?.source || "rest"})`,
          whales:
            whaleActivity.length > 0
              ? `✅ ${whaleActivity.length} اكتُشف`
              : "❌ لا يوجد",
          volumeProfile: volumeProfile ? "✅ محلّل" : "❌ غير متاح",
          reasoning: decision.reasoning,
          warnings: decision.warnings,
        },

        // 💾 بيانات للحفظ في Database
        _rawData: {
          indicators,
          orderBook: orderBook
            ? {
                bidLevel: orderBook.bids?.[0]?.[0],
                askLevel: orderBook.asks?.[0]?.[0],
                spread: orderBook.asks?.[0]?.[0] - orderBook.bids?.[0]?.[0],
              }
            : null,
          whale: whaleActivity.length > 0,
          volume: volumeProfile,
          symbolicAI: {
            decision: decision.action,
            confidence: decision.confidence,
            learnedPattern: decision.learnedPattern || null,
            marketRegime: decision.marketRegime || null,
            decisionMetrics: decision.decisionMetrics || null,
            reasoning: (decision.reasoning || []).slice(0, 4),
            warnings: (decision.warnings || []).slice(0, 4),
            supportingFactors: (decision.supportingFactors || []).slice(0, 6),
            opposingFactors: (decision.opposingFactors || []).slice(0, 6),
          },
        },
      };

      // 💾 حفظ التحليل في Database
      if (this.database && this.database.initialized) {
        try {
          const analysisId = await this.database.saveAnalysis({
            symbol: analysisResult.symbol,
            signal: analysisResult.side,
            confidence: parseFloat(analysisResult.confidence),
            currentPrice,
            indicators: analysisResult._rawData.indicators,
            orderBook: analysisResult._rawData.orderBook,
            whale: analysisResult._rawData.whale,
            volume: analysisResult._rawData.volume,
            symbolicAI: analysisResult._rawData.symbolicAI,
          });
          // ✅ إصلاح: التحقق من analysisId قبل الإسناد
          if (analysisId) {
            analysisResult.analysisId = analysisId; // لربط الصفقة لاحقاً
          }
        } catch (dbError) {
          console.warn(`⚠️ Database save error: ${dbError.message}`);
        }
      }

      return analysisResult;
    } catch (error) {
      console.error(
        `❌ [AdvancedAIAnalyzer] Error analyzing ${symbol}:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * حساب المؤشرات الأساسية
   */
  calculateIndicators(candles) {
    const closes = candles.map((c) => c[4]);
    const highs = candles.map((c) => c[2]);
    const lows = candles.map((c) => c[3]);

    const macd = this.calculateMACD(closes);
    const macdSignal = this.calculateMACDSignal(closes);

    return {
      rsi: this.calculateRSI(closes, 14),
      ema20: this.calculateEMA(closes, 20),
      ema50: this.calculateEMA(closes, 50),
      ema200: this.calculateEMA(closes, 200),
      macd: macd,
      macdSignal: macdSignal,
      stochastic: this.calculateStochastic(highs, lows, closes, 14),
      atr: this.calculateATR(highs, lows, closes, 14),
    };
  }

  calculateRSI(closes, period = 14) {
    let ups = 0,
      downs = 0;
    for (let i = closes.length - period; i < closes.length - 1; i++) {
      const change = closes[i + 1] - closes[i];
      if (change > 0) ups += change;
      else downs += Math.abs(change);
    }
    const rs = ups / (downs || 1);
    return 100 - 100 / (1 + rs);
  }

  calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  calculateMACD(closes) {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    return ema12 - ema26;
  }

  calculateMACDSignal(closes) {
    // ✅ إضافة: حساب MACD Signal Line (EMA 9 من MACD)
    if (closes.length < 35) return 0;

    const macdValues = [];
    for (let i = 26; i < closes.length; i++) {
      const slice = closes.slice(0, i + 1);
      const ema12 = this.calculateEMA(slice, 12);
      const ema26 = this.calculateEMA(slice, 26);
      macdValues.push(ema12 - ema26);
    }

    return this.calculateEMA(macdValues, 9);
  }

  calculateStochastic(highs, lows, closes, period = 14) {
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];

    const highest = Math.max(...recentHighs);
    const lowest = Math.min(...recentLows);

    if (highest === lowest) return 50;
    return ((currentClose - lowest) / (highest - lowest)) * 100;
  }

  calculateATR(highs, lows, closes, period = 14) {
    const trs = [];
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
      trs.push(tr);
    }

    const recentTRs = trs.slice(-period);
    return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
  }
}

module.exports = AdvancedAIAnalyzer;
