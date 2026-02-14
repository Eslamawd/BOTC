/**
 * SymbolicAI.js - محرك الذكاء الاصطناعي الرمزي
 * Symbolic AI Engine - Mathematical Intelligence Core
 *
 * نظام ذكاء رياضي بحت يعتمد على:
 * 1. القواعد الرياضية (Mathematical Rules)
 * 2. النمذجة الاحتمالية (Probabilistic Modeling)
 * 3. التعرف على الأنماط (Pattern Recognition)
 * 4. التحليل متعدد الأبعاد (Multi-dimensional Analysis)
 */

const math = require("mathjs");
const regression = require("regression");
const stats = require("simple-statistics");
const { Matrix } = require("ml-matrix");

class SymbolicAI {
  constructor(config = {}, database = null) {
    this.config = {
      // عتبات الثقة الرياضية - محدّثة للباكتيست
      MIN_PATTERN_STRENGTH: 0.3, // 🔧 خفضنا أكثر
      MIN_CORRELATION: 0.3, // 🔧 خفضنا أكثر
      MIN_PROBABILITY: 0.15, // 🔧 خفضنا من 0.35 لـ 15%
      LOOKBACK_PERIOD: 100,
      PREDICTION_HORIZON: 5,
      ...config,
    };

    // 💾 Database للتعلم من البيانات التاريخية
    this.database = database;

    // قاعدة المعرفة (Knowledge Base)
    this.knowledgeBase = {
      patterns: [],
      rules: [],
      statistics: {},
      correlations: {},
    };

    // نتائج التعلم من البيانات التاريخية (ثلاث فئات)
    this.learnedPatterns = {
      successful: [],  // Success Rate > 60% → +20% boost
      neutral: [],     // Success Rate 40-60% → 1.0x multiplier
      failing: []      // Success Rate < 40% → -30% penalty
    };

    // إحصائيات التعلم
    this.learningStats = {
      totalLearned: 0,
      successfulPatterns: 0,
      neutralPatterns: 0,
      failingPatterns: 0,
      totalPatterns: 0,
      winRate: 0,
      lastLearningTime: null,
    };
  }

  /**
   * التحليل الشامل - دمج كل المدخلات في قرار واحد ذكي
   * Comprehensive Analysis - Merge all inputs into one intelligent decision
   */
  comprehensiveAnalysis(marketData) {
    const {
      symbol,
      candles,
      indicators,
      volumeProfile,
      orderBook,
      whaleActivity,
      currentPrice,
    } = marketData;

    // console.log(`🧠 [SymbolicAI] بدء التحليل الذكي لـ ${symbol}...`); // تعطيل للسرعة

    // 1️⃣ التحليل الرياضي للشموع
    const candlePatterns = this.analyzeCandlePatterns(candles);

    // 2️⃣ التحليل الاحتمالي للفوليوم
    const volumeAnalysis = this.analyzeVolumeProbability(
      candles,
      volumeProfile,
    );

    // 3️⃣ نمذجة Order Book رياضياً
    const orderBookModel = this.modelOrderBookMathematically(
      orderBook,
      currentPrice,
    );

    // 4️⃣ كشف أنماط الحيتان
    const whalePatterns = this.detectWhalePatterns(whaleActivity, orderBook);

    // 5️⃣ تحليل الارتباطات بين المؤشرات
    const indicatorCorrelation = this.analyzeIndicatorCorrelations(indicators);

    // 6️⃣ التنبؤ الرياضي بالحركة القادمة
    const pricePrediction = this.predictNextMove(candles, indicators);

    // 7️⃣ حساب احتمالية النجاح الإجمالية
    const successProbability = this.calculateSuccessProbability({
      candlePatterns,
      volumeAnalysis,
      orderBookModel,
      whalePatterns,
      indicatorCorrelation,
      pricePrediction,
    });

    // 8️⃣ تطبيق القواعد الذكية
    const finalDecision = this.applyIntelligentRules({
      successProbability,
      candlePatterns,
      volumeAnalysis,
      orderBookModel,
      whalePatterns,
      pricePrediction,
      indicators,
    });

    // 9️⃣ 🧠 تطبيق الأنماط المتعلمة من قاعدة البيانات
    const learnedBoost = this.applyLearnedPatterns({
      symbol,
      signal: finalDecision.signal,
      confidence: finalDecision.confidence,
      indicators,
      volume: volumeAnalysis,
    });

    if (learnedBoost?.matched) {
      // تعزيز أو خفض الثقة بناءً على الأنماط المتعلمة
      finalDecision.confidence *= learnedBoost.boost;
      finalDecision.learnedPattern = {
        category: learnedBoost.category,
        successRate: learnedBoost.successRate,
        occurrences: learnedBoost.pattern.occurrences,
        avgProfit: learnedBoost.pattern.avgProfit,
      };
      const changePercent = ((learnedBoost.boost - 1) * 100).toFixed(0);
      console.log(
        `${learnedBoost.boostLabel} Pattern matched! Success Rate: ${(learnedBoost.successRate * 100).toFixed(1)}% (${learnedBoost.pattern.occurrences}x) - Confidence change: ${changePercent > 0 ? '+' : ''}${changePercent}%`,
      );
    }

    return finalDecision;
  }

  /**
   * تحليل أنماط الشموع رياضياً
   * Analyze candle patterns mathematically
   */
  analyzeCandlePatterns(candles) {
    if (!candles || candles.length < 20) return null;

    const recentCandles = candles.slice(-20);
    const patterns = {
      trend: null,
      strength: 0,
      momentum: 0,
      volatility: 0,
      bodyRatios: [],
      consecutiveBullish: 0,
      consecutiveBearish: 0,
    };

    // حساب نسب body للشموع
    recentCandles.forEach((candle, i) => {
      const [time, open, high, low, close] = candle;
      const body = Math.abs(close - open);
      const totalRange = high - low;
      const bodyRatio = totalRange > 0 ? body / totalRange : 0;

      patterns.bodyRatios.push(bodyRatio);

      // عد الشموع المتتالية
      if (close > open) {
        patterns.consecutiveBullish++;
        patterns.consecutiveBearish = 0;
      } else if (close < open) {
        patterns.consecutiveBearish++;
        patterns.consecutiveBullish = 0;
      }
    });

    // حساب متوسط قوة الشموع
    patterns.strength = stats.mean(patterns.bodyRatios);

    // حساب التقلب (Volatility) - الانحراف المعياري للأسعار
    const closes = recentCandles.map((c) => c[4]);
    patterns.volatility = stats.standardDeviation(closes) / stats.mean(closes);

    // حساب الزخم (Momentum) - معدل التغير
    const firstClose = closes[0];
    const lastClose = closes[closes.length - 1];
    patterns.momentum = (lastClose - firstClose) / firstClose;

    // تحديد الاتجاه بناءً على الانحدار الخطي
    const regression_result = this.calculateTrendRegression(closes);
    patterns.trend = regression_result.slope > 0 ? "BULLISH" : "BEARISH";
    patterns.trendStrength = Math.abs(regression_result.r2); // R-squared

    return patterns;
  }

  /**
   * التحليل الاحتمالي للفوليوم
   * Probabilistic volume analysis
   */
  analyzeVolumeProbability(candles, volumeProfile) {
    if (!candles || candles.length < 50) return null;

    const volumes = candles.slice(-50).map((c) => c[5] || 0);
    const currentVolume = volumes[volumes.length - 1];

    // إحصائيات الفوليوم
    const volumeStats = {
      mean: stats.mean(volumes),
      median: stats.median(volumes),
      stdDev: stats.standardDeviation(volumes),
      max: Math.max(...volumes),
      min: Math.min(...volumes),
    };

    // حساب Z-Score للفوليوم الحالي
    const zScore = (currentVolume - volumeStats.mean) / volumeStats.stdDev;

    // احتمالية أن الفوليوم غير عادي (استثنائي)
    const volumeAnomalyProbability = this.normalCDF(Math.abs(zScore));

    // تحليل Volume Profile إذا كان متوفراً
    let profileStrength = 0;
    if (volumeProfile && volumeProfile.poc) {
      const currentPrice = candles[candles.length - 1][4];
      const distanceFromPOC =
        Math.abs(currentPrice - volumeProfile.poc) / currentPrice;

      // كلما كنا أقرب من POC، زادت القوة
      profileStrength = 1 - Math.min(distanceFromPOC * 10, 1);
    }

    return {
      currentVolume,
      volumeStats,
      zScore,
      volumeAnomalyProbability,
      profileStrength,
      isHighVolume: zScore > 2, // فوليوم أعلى بكثير من المتوسط
      volumeRatio: currentVolume / volumeStats.mean,
    };
  }

  /**
   * نمذجة Order Book رياضياً
   * Mathematical Order Book Modeling
   */
  modelOrderBookMathematically(orderBook, currentPrice) {
    if (!orderBook || !orderBook.bids || !orderBook.asks) return null;

    const bids = orderBook.bids.slice(0, 20);
    const asks = orderBook.asks.slice(0, 20);

    // حساب عمق السيولة على الجانبين
    const bidLiquidity = bids.reduce(
      (sum, [price, amount]) => sum + price * amount,
      0,
    );
    const askLiquidity = asks.reduce(
      (sum, [price, amount]) => sum + price * amount,
      0,
    );

    // نسبة عدم التوازن (Imbalance Ratio)
    const imbalanceRatio =
      (bidLiquidity - askLiquidity) / (bidLiquidity + askLiquidity);

    // حساب السبريد
    const bestBid = bids[0][0];
    const bestAsk = asks[0][0];
    const spread = (bestAsk - bestBid) / currentPrice;

    // حساب "جدار الطلبات" (Order Walls)
    const bidWalls = this.detectOrderWalls(bids, "bid");
    const askWalls = this.detectOrderWalls(asks, "ask");

    // قوة الضغط الشرائي/البيعي
    const buyingPressure = bidLiquidity / (bidLiquidity + askLiquidity);
    const sellingPressure = askLiquidity / (bidLiquidity + askLiquidity);

    return {
      bidLiquidity,
      askLiquidity,
      imbalanceRatio,
      spread,
      bidWalls,
      askWalls,
      buyingPressure,
      sellingPressure,
      signal:
        imbalanceRatio > 0.2
          ? "BULLISH"
          : imbalanceRatio < -0.2
            ? "BEARISH"
            : "NEUTRAL",
    };
  }

  /**
   * كشف جدران الطلبات (Order Walls)
   */
  detectOrderWalls(orders, side) {
    if (!orders || orders.length < 5) return [];

    const amounts = orders.map((o) => o[1]);
    const meanAmount = stats.mean(amounts);
    const stdDev = stats.standardDeviation(amounts);
    const threshold = meanAmount + 2 * stdDev; // جدار = 2 sigma فوق المتوسط

    const walls = orders
      .filter(([price, amount]) => amount > threshold)
      .map(([price, amount]) => ({
        price,
        amount,
        strength: amount / meanAmount,
        side,
      }));

    return walls;
  }

  /**
   * كشف أنماط الحيتان
   * Detect Whale Patterns
   */
  detectWhalePatterns(whaleActivity, orderBook) {
    if (!whaleActivity || whaleActivity.length === 0) {
      return { detected: false, pattern: null, risk: 0 };
    }

    const recentWhales = whaleActivity.slice(-10); // آخر 10 نشاطات حيتان

    // تحليل نوع نشاط الحيتان
    const buyWhales = recentWhales.filter((w) => w.type === "buy");
    const sellWhales = recentWhales.filter((w) => w.type === "sell");

    const whaleBuyVolume = buyWhales.reduce((sum, w) => sum + w.amount, 0);
    const whaleSellVolume = sellWhales.reduce((sum, w) => sum + w.amount, 0);

    const whaleDirection =
      whaleBuyVolume > whaleSellVolume ? "ACCUMULATION" : "DISTRIBUTION";
    const whaleStrength =
      Math.abs(whaleBuyVolume - whaleSellVolume) /
      (whaleBuyVolume + whaleSellVolume + 1);

    // أنماط خطيرة - تلاعب محتمل
    const suspiciousPattern = this.detectSuspiciousWhaleActivity(
      recentWhales,
      orderBook,
    );

    return {
      detected: true,
      pattern: whaleDirection,
      strength: whaleStrength,
      buyVolume: whaleBuyVolume,
      sellVolume: whaleSellVolume,
      suspicious: suspiciousPattern,
      signal: whaleDirection === "ACCUMULATION" ? "BULLISH" : "BEARISH",
    };
  }

  /**
   * كشف نشاط حيتان مشبوه
   */
  detectSuspiciousWhaleActivity(whales, orderBook) {
    // نمط: حيتان يضعون أوامر كبيرة ثم يسحبونها (Spoofing)
    // نمط: تنسيق بين حيتان متعددين
    // TODO: تطوير هذا لاحقاً مع البيانات الفعلية
    return false;
  }

  /**
   * تحليل الارتباطات بين المؤشرات
   * Analyze correlations between indicators
   */
  analyzeIndicatorCorrelations(indicators) {
    if (!indicators) return null;

    const signals = {
      rsi: this.interpretRSI(indicators.rsi),
      macd: this.interpretMACD(indicators.macd, indicators.macdSignal),
      ema: this.interpretEMA(
        indicators.ema20,
        indicators.ema50,
        indicators.ema200,
      ),
      stochastic: this.interpretStochastic(indicators.stochastic),
      atr: this.interpretATR(indicators.atr),
    };

    // حساب درجة التوافق بين الإشارات
    const bullishSignals = Object.values(signals).filter(
      (s) => s === "BULLISH",
    ).length;
    const bearishSignals = Object.values(signals).filter(
      (s) => s === "BEARISH",
    ).length;
    const neutralSignals = Object.values(signals).filter(
      (s) => s === "NEUTRAL",
    ).length;

    const totalSignals = bullishSignals + bearishSignals + neutralSignals;
    const agreement = Math.max(bullishSignals, bearishSignals) / totalSignals;

    return {
      signals,
      bullishSignals,
      bearishSignals,
      neutralSignals,
      agreement, // مدى توافق المؤشرات (0-1)
      consensus:
        bullishSignals > bearishSignals
          ? "BULLISH"
          : bearishSignals > bullishSignals
            ? "BEARISH"
            : "NEUTRAL",
    };
  }

  /**
   * تفسير مؤشرات فردية
   */
  interpretRSI(rsi) {
    if (!rsi) return "NEUTRAL";
    if (rsi < 30) return "BEARISH"; // oversold - لكن يمكن انعكاس
    if (rsi > 70) return "BULLISH"; // overbought - لكن يمكن انعكاس
    if (rsi >= 40 && rsi <= 60) return "BULLISH"; // منطقة آمنة للشراء
    return "NEUTRAL";
  }

  interpretMACD(macd, signal) {
    if (!macd || !signal) return "NEUTRAL";
    const diff = macd - signal;
    if (diff > 0 && macd > 0) return "BULLISH";
    if (diff < 0 && macd < 0) return "BEARISH";
    return "NEUTRAL";
  }

  interpretEMA(ema20, ema50, ema200) {
    if (!ema20 || !ema50 || !ema200) return "NEUTRAL";
    if (ema20 > ema50 && ema50 > ema200) return "BULLISH"; // ترتيب صاعد
    if (ema20 < ema50 && ema50 < ema200) return "BEARISH"; // ترتيب هابط
    return "NEUTRAL";
  }

  interpretStochastic(stoch) {
    if (!stoch) return "NEUTRAL";
    if (stoch < 20) return "BEARISH";
    if (stoch > 80) return "BULLISH";
    return "NEUTRAL";
  }

  interpretATR(atr) {
    // ATR يقيس التقلب، ليس الاتجاه
    return "NEUTRAL";
  }

  /**
   * التنبؤ بالحركة القادمة باستخدام الانحدار والنماذج الرياضية
   * Predict next move using regression and mathematical models
   */
  predictNextMove(candles, indicators) {
    if (!candles || candles.length < 30) return null;

    const closes = candles.slice(-30).map((c) => c[4]);
    const timestamps = candles.slice(-30).map((c, i) => i);

    // 1. الانحدار الخطي
    const linearReg = this.calculateTrendRegression(closes);

    // 2. الانحدار الأسي (Exponential Regression)
    const dataPoints = timestamps.map((t, i) => [t, closes[i]]);
    let exponentialReg = null;
    try {
      exponentialReg = regression.exponential(dataPoints);
    } catch (e) {
      exponentialReg = null;
    }

    // 3. التنبؤ بحركة الشموع القادمة (5 شموع)
    const predictions = [];
    for (let i = 1; i <= this.config.PREDICTION_HORIZON; i++) {
      const nextTimestamp = timestamps.length + i;
      const linearPred = linearReg.slope * nextTimestamp + linearReg.intercept;
      const expPred = exponentialReg
        ? exponentialReg.predict(nextTimestamp)[1]
        : linearPred;

      predictions.push({
        step: i,
        linearPrediction: linearPred,
        exponentialPrediction: expPred,
        average: (linearPred + expPred) / 2,
      });
    }

    const currentPrice = closes[closes.length - 1];
    const nextPrediction = predictions[0].average;
    const expectedChange = (nextPrediction - currentPrice) / currentPrice;

    return {
      currentPrice,
      predictions,
      nextPrediction,
      expectedChange,
      direction: expectedChange > 0 ? "UP" : "DOWN",
      confidence: Math.min(linearReg.r2, 1), // R² كمقياس للثقة
    };
  }

  /**
   * حساب احتمالية النجاح الإجمالية
   * Calculate overall success probability
   */
  calculateSuccessProbability(analysis) {
    const {
      candlePatterns,
      volumeAnalysis,
      orderBookModel,
      whalePatterns,
      indicatorCorrelation,
      pricePrediction,
    } = analysis;

    // الأوزان لكل عامل
    const weights = {
      candles: 0.15,
      volume: 0.25, // الفوليوم مهم جداً
      orderBook: 0.2, // Order book مهم
      whales: 0.15, // الحيتان مؤثرة
      indicators: 0.15, // المؤشرات
      prediction: 0.1, // التنبؤ
    };

    let totalScore = 0;

    // 1. نقاط الشموع
    if (candlePatterns) {
      const candleScore =
        candlePatterns.strength * 0.4 +
        candlePatterns.trendStrength * 0.4 +
        Math.min(Math.abs(candlePatterns.momentum) * 10, 1) * 0.2;
      totalScore += candleScore * weights.candles;
    }

    // 2. نقاط الفوليوم
    if (volumeAnalysis) {
      const volumeScore =
        volumeAnalysis.profileStrength * 0.5 +
        (volumeAnalysis.isHighVolume ? 0.5 : 0) +
        Math.min(volumeAnalysis.volumeRatio / 3, 1) * 0.3;
      totalScore += volumeScore * weights.volume;
    }

    // 3. نقاط Order Book
    if (orderBookModel) {
      const obScore =
        Math.abs(orderBookModel.imbalanceRatio) * 0.5 +
        (1 - Math.min(orderBookModel.spread * 100, 1)) * 0.3 +
        Math.max(
          orderBookModel.buyingPressure,
          orderBookModel.sellingPressure,
        ) *
          0.2;
      totalScore += obScore * weights.orderBook;
    }

    // 4. نقاط الحيتان
    if (whalePatterns && whalePatterns.detected) {
      const whaleScore =
        whalePatterns.strength * (whalePatterns.suspicious ? 0.5 : 1);
      totalScore += whaleScore * weights.whales;
    }

    // 5. نقاط المؤشرات
    if (indicatorCorrelation) {
      const indicatorScore = indicatorCorrelation.agreement;
      totalScore += indicatorScore * weights.indicators;
    }

    // 6. نقاط التنبؤ
    if (pricePrediction) {
      const predictionScore = pricePrediction.confidence;
      totalScore += predictionScore * weights.prediction;
    }

    return Math.min(totalScore, 1) * 100; // تحويل إلى نسبة مئوية
  }

  /**
   * تطبيق القواعد الذكية للقرار النهائي
   * Apply intelligent rules for final decision
   */
  applyIntelligentRules(analysisData) {
    const {
      successProbability,
      candlePatterns,
      volumeAnalysis,
      orderBookModel,
      whalePatterns,
      pricePrediction,
      indicators,
    } = analysisData;

    // القرار الأساسي
    let decision = {
      action: "HOLD",
      confidence: successProbability,
      reasoning: [],
      warnings: [],
      supportingFactors: [],
      opposingFactors: [],
    };

    // قاعدة 1: احتمالية النجاح يجب أن تكون أعلى من الحد الأدنى
    // ✅ استخدم نفس الـ MIN_CONFIDENCE (10%) بدلاً من MIN_PROBABILITY (15%)
    const minThreshold = Math.max(this.config.MIN_PROBABILITY * 100, 10);
    if (successProbability < minThreshold) {
      decision.warnings.push(
        `احتمالية منخفضة: ${successProbability.toFixed(1)}% (الحد الأدنى: ${minThreshold}%)`,
      );
      return decision; // HOLD
    }

    // قاعدة 2: الفوليوم يجب أن يكون قوي
    if (volumeAnalysis && !volumeAnalysis.isHighVolume) {
      decision.warnings.push("الفوليوم ليس قوي كفاية");
      decision.confidence -= 10;
    } else if (volumeAnalysis && volumeAnalysis.isHighVolume) {
      decision.supportingFactors.push(
        `فوليوم عالي: ${volumeAnalysis.volumeRatio.toFixed(2)}x`,
      );
    }

    // قاعدة 3: Order Book Imbalance
    if (orderBookModel) {
      if (Math.abs(orderBookModel.imbalanceRatio) > 0.2) {
        const direction = orderBookModel.imbalanceRatio > 0 ? "LONG" : "SHORT";
        decision.supportingFactors.push(`Order Book يميل لـ ${direction}`);
      }

      if (orderBookModel.spread > 0.001) {
        decision.warnings.push(
          `السبريد عالي: ${(orderBookModel.spread * 100).toFixed(3)}%`,
        );
        decision.confidence -= 5;
      }
    }

    // قاعدة 4: نشاط الحيتان
    if (whalePatterns && whalePatterns.detected) {
      if (whalePatterns.suspicious) {
        decision.warnings.push("نشاط حيتان مشبوه - حذر!");
        decision.confidence -= 15;
      } else {
        decision.supportingFactors.push(
          `الحيتان في وضع ${whalePatterns.pattern}`,
        );
      }
    }

    // قاعدة 5: توافق المؤشرات
    if (indicators && indicators.agreement < 0.6) {
      decision.warnings.push("المؤشرات غير متفقة");
      decision.confidence -= 10;
    } else if (indicators && indicators.agreement > 0.8) {
      decision.supportingFactors.push(
        `توافق عالي بين المؤشرات: ${(indicators.agreement * 100).toFixed(0)}%`,
      );
    }

    // قاعدة 6: التنبؤ بالاتجاه
    let predictedDirection = null;
    if (pricePrediction && pricePrediction.confidence > 0.7) {
      predictedDirection = pricePrediction.direction;
      decision.supportingFactors.push(
        `التنبؤ: ${predictedDirection} بثقة ${(pricePrediction.confidence * 100).toFixed(0)}%`,
      );
    }

    // القرار النهائي بناءً على الإجماع
    const bullishFactors = [
      candlePatterns && candlePatterns.trend === "BULLISH",
      orderBookModel && orderBookModel.signal === "BULLISH",
      whalePatterns && whalePatterns.signal === "BULLISH",
      indicators && indicators.consensus === "BULLISH",
      predictedDirection === "UP",
    ].filter(Boolean).length;

    const bearishFactors = [
      candlePatterns && candlePatterns.trend === "BEARISH",
      orderBookModel && orderBookModel.signal === "BEARISH",
      whalePatterns && whalePatterns.signal === "BEARISH",
      indicators && indicators.consensus === "BEARISH",
      predictedDirection === "DOWN",
    ].filter(Boolean).length;

    // تحديد الإجراء - خفضنا العوامل المطلوبة من 3 لـ 2 للbacktest
    if (
      bullishFactors >= 2 &&
      decision.confidence >= minThreshold // استخدم نفس الـ minThreshold
    ) {
      decision.action = "LONG";
      decision.reasoning.push(`${bullishFactors} عوامل صاعدة من أصل 5`);
    } else if (
      bearishFactors >= 2 &&
      decision.confidence >= minThreshold // استخدم نفس الـ minThreshold
    ) {
      decision.action = "SHORT";
      decision.reasoning.push(`${bearishFactors} عوامل هابطة من أصل 5`);
    } else {
      decision.action = "HOLD";
      decision.reasoning.push("عدم توفر إجماع كافي للدخول");
    }

    return decision;
  }

  /**
   * حساب الانحدار الخطي للاتجاه
   */
  calculateTrendRegression(prices) {
    const n = prices.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = prices.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * prices[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // حساب R-squared
    const yMean = sumY / n;
    const ssTotal = prices.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = prices.reduce((sum, y, i) => {
      const yPred = slope * i + intercept;
      return sum + Math.pow(y - yPred, 2);
    }, 0);
    const r2 = 1 - ssResidual / ssTotal;

    return { slope, intercept, r2 };
  }

  /**
   * حساب توزيع طبيعي تراكمي (Normal CDF)
   */
  normalCDF(z) {
    return (1 + math.erf(z / Math.sqrt(2))) / 2;
  }

  /**
   * 🧠 التعلم من قاعدة البيانات التاريخية
   * Learn from historical database
   */
  async learnFromHistory(symbol = null) {
    if (!this.database || !this.database.initialized) {
      console.log("⚠️ Database not initialized - skipping learning");
      return;
    }

    try {
      // ✅ استنى await لأن getLearningData async الآن (SQLite)
      const learningData = await this.database.getLearningData(symbol, 1000);

      if (learningData.total < 10) {
        console.log(
          `📚 Not enough data to learn (${learningData.total} analyses)`,
        );
        return;
      }

      console.log(
        `📚 Learning from ${learningData.total} historical analyses...`,
      );

      // تحليل الأنماط الناجحة
      const wins = learningData.analyses.filter(
        (a) => a.actualOutcome === "WIN",
      );
      const losses = learningData.analyses.filter(
        (a) => a.actualOutcome === "LOSS",
      );

      // استخراج الأنماط المشتركة من جميع الصفقات
      const allPatterns = this.extractPatterns(learningData.analyses);

      // حفظ جميع الأنماط الثلاثة (ناجح + محايد + خاسر)
      // سيتم تطبيق الـ boost/penalty بناءً على صنفها في applyLearnedPatterns
      this.learnedPatterns = {
        successful: allPatterns.successful || [], // Success Rate > 60% → +20% boost
        neutral: allPatterns.neutral || [],       // Success Rate 40-60% → 1.0x multiplier
        failing: allPatterns.failing || []        // Success Rate < 40% → -30% penalty
      };

      // حساب إحصائيات التعلم
      const totalPatterns = 
        this.learnedPatterns.successful.length + 
        this.learnedPatterns.neutral.length + 
        this.learnedPatterns.failing.length;

      // تحديث إحصائيات التعلم
      this.learningStats = {
        totalLearned: learningData.total,
        successfulPatterns: this.learnedPatterns.successful.length,
        neutralPatterns: this.learnedPatterns.neutral.length,
        failingPatterns: this.learnedPatterns.failing.length,
        totalPatterns: totalPatterns,
        winRate: learningData.wins / learningData.total,
        lastLearningTime: new Date().toISOString(),
      };

      console.log(
        `✅ Learned ${totalPatterns} patterns: ${this.learnedPatterns.successful.length} successful (+20%), ${this.learnedPatterns.neutral.length} neutral (1.0x), ${this.learnedPatterns.failing.length} failing (-30%)`,
      );
      console.log(
        `📈 Overall Win Rate: ${(this.learningStats.winRate * 100).toFixed(2)}%`,
      );
    } catch (error) {
      console.error("❌ Error learning from history:", error.message);
    }
  }

  /**
   * 🔍 استخراج الأنماط المشتركة (الناجح + الخاسر + المحايد)
   * Extract common patterns - weighted by success
   */
  extractPatterns(analyses) {
    const patterns = {
      successful: [],  // Success Rate > 60%
      neutral: [],     // Success Rate 40-60%
      failing: []      // Success Rate < 40%
    };

    // تجميع الأنماط المتشابهة
    const grouped = {};

    analyses.forEach((analysis) => {
      const key = this.getPatternKey(analysis);
      if (!grouped[key]) {
        grouped[key] = {
          count: 0,
          successes: 0,
          failures: 0,
          avgConfidence: 0,
          avgProfit: 0,
          indicators: analysis.indicators,
          signal: analysis.signal,
        };
      }

      grouped[key].count++;
      if (analysis.actualOutcome === "WIN") {
        grouped[key].successes++;
        grouped[key].avgProfit += analysis.profitLoss || 0;
      } else if (analysis.actualOutcome === "LOSS") {
        grouped[key].failures++;
      }
      grouped[key].avgConfidence += analysis.confidence || 0;
    });

    // تصنيف الأنماط حسب معدل النجاح
    Object.keys(grouped).forEach((key) => {
      const group = grouped[key];
      if (group.count >= 3) { // على الأقل 3 مرات

        const successRate = group.successes / group.count;
        const pattern = {
          key,
          signal: group.signal,
          occurrences: group.count,
          successes: group.successes,
          failures: group.failures,
          successRate,
          avgConfidence: group.avgConfidence / group.count,
          avgProfit: group.successes > 0 ? group.avgProfit / group.successes : 0,
          indicators: group.indicators,
        };

        // تصنيف النمط
        if (successRate > 0.6) {
          patterns.successful.push(pattern);
        } else if (successRate >= 0.4) {
          patterns.neutral.push(pattern);
        } else {
          patterns.failing.push(pattern);
        }
      }
    });

    // ترتيب بناءً على معدل النجاح (تنازلي)
    patterns.successful.sort((a, b) => b.successRate - a.successRate);
    patterns.failing.sort((a, b) => a.successRate - b.successRate); // من الأسوأ للأفضل

    console.log(
      `📊 Pattern Analysis: ${patterns.successful.length} successful, ${patterns.neutral.length} neutral, ${patterns.failing.length} failing`
    );

    return patterns;
  }

  /**
   * 🔑 إنشاء مفتاح للنمط (Pattern Key)
   */
  getPatternKey(analysis) {
    const ind = analysis.indicators || {};

    // تقريب المؤشرات لتجميع الأنماط المتشابهة
    const rsiRange = Math.floor((ind.rsi || 50) / 10) * 10; // 0, 10, 20, ..., 90
    // ✅ إصلاح: استخدام ema20 و ema50 بدلاً من short/long
    const emaSignal = (ind.ema20 || 0) > (ind.ema50 || 0) ? "BULL" : "BEAR";
    const volumeLevel = analysis.volume?.volumeRatio > 1.5 ? "high" : "normal";

    return `${analysis.signal}_RSI${rsiRange}_${emaSignal}_VOL${volumeLevel}`;
  }

  /**
   * ✨ تطبيق الأنماط المتعلمة على التحليل الحالي
   * Apply learned patterns to current analysis with boost/penalty system
   * 
   * Successful (>60%): +20% confidence boost 🚀
   * Neutral (40-60%): 1.0x multiplier (no change) ➡️
   * Failing (<40%): -30% confidence penalty ⛔
   */
  applyLearnedPatterns(currentAnalysis) {
    if (!this.learnedPatterns || 
        (this.learnedPatterns.successful?.length === 0 &&
         this.learnedPatterns.neutral?.length === 0 &&
         this.learnedPatterns.failing?.length === 0)) {
      return null; // لا توجد أنماط متعلمة
    }

    const currentKey = this.getPatternKey(currentAnalysis);

    // البحث عن نمط مطابق في جميع الفئات الثلاثة
    
    // 1. البحث في الأنماط الناجحة (> 60%)
    let matchedPattern = this.learnedPatterns.successful?.find((pattern) => {
      return (
        pattern.key === currentKey ||
        this.isSimilarPattern(pattern, currentAnalysis)
      );
    });

    if (matchedPattern) {
      return {
        matched: true,
        category: 'successful',
        pattern: matchedPattern,
        confidence: matchedPattern.avgConfidence,
        successRate: matchedPattern.successRate,
        boost: 1.2, // +20% boost للأنماط الناجحة
        boostLabel: '🚀 +20% BOOST',
      };
    }

    // 2. البحث في الأنماط المحايدة (40-60%)
    matchedPattern = this.learnedPatterns.neutral?.find((pattern) => {
      return (
        pattern.key === currentKey ||
        this.isSimilarPattern(pattern, currentAnalysis)
      );
    });

    if (matchedPattern) {
      return {
        matched: true,
        category: 'neutral',
        pattern: matchedPattern,
        confidence: matchedPattern.avgConfidence,
        successRate: matchedPattern.successRate,
        boost: 1.0, // لا تغيير للأنماط المحايدة
        boostLabel: '➡️ 1.0x NEUTRAL',
      };
    }

    // 3. البحث في الأنماط الخاسرة (< 40%)
    matchedPattern = this.learnedPatterns.failing?.find((pattern) => {
      return (
        pattern.key === currentKey ||
        this.isSimilarPattern(pattern, currentAnalysis)
      );
    });

    if (matchedPattern) {
      console.log(
        `⚠️ Pattern PENALTY: "${matchedPattern.key}" is failing (${(matchedPattern.successRate * 100).toFixed(1)}% < 40% threshold)`
      );
      return {
        matched: true,
        category: 'failing',
        pattern: matchedPattern,
        confidence: matchedPattern.avgConfidence,
        successRate: matchedPattern.successRate,
        boost: 0.7, // -30% penalty للأنماط الخاسرة
        boostLabel: '⛔ -30% PENALTY',
      };
    }

    return null;
  }

  /**
   * 🔄 مقارنة الأنماط المتشابهة
   */
  isSimilarPattern(pattern, analysis) {
    const patternInd = pattern.indicators || {};
    const currentInd = analysis.indicators || {};

    // مقارنة RSI (ضمن نطاق ±10)
    const rsiSimilar =
      Math.abs((patternInd.rsi || 50) - (currentInd.rsi || 50)) < 10;

    // ✅ إصلاح: مقارنة EMA signal باستخدام ema20/ema50
    const patternEmaSignal =
      (patternInd.ema20 || 0) > (patternInd.ema50 || 0) ? "BULL" : "BEAR";
    const currentEmaSignal =
      (currentInd.ema20 || 0) > (currentInd.ema50 || 0) ? "BULL" : "BEAR";
    const emaSimilar = patternEmaSignal === currentEmaSignal;

    // نفس Signal
    const signalSame = pattern.signal === analysis.signal;

    return rsiSimilar && emaSimilar && signalSame;
  }

  /**
   * تعلم من نتائج الصفقات السابقة
   * Learn from previous trade results
   */
  learnFromTrade(tradeData, isSuccessful) {
    // TODO: تطوير آلية التعلم
    // حفظ الأنماط الناجحة والفاشلة
    // تحديث الأوزان والقواعد بناءً على النتائج

    if (isSuccessful) {
      this.successfulRules.push(tradeData);
    }

    // إبقاء آخر 100 صفقة فقط
    if (this.successfulRules.length > 100) {
      this.successfulRules.shift();
    }
  }
}

module.exports = SymbolicAI;
