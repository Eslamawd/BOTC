/**
 * ≡ƒºá Advanced AI Analyzer - ╪º┘ä┘à╪¡┘ä┘ä ╪º┘ä╪░┘â┘è ╪º┘ä╪┤╪º┘à┘ä
 *
 * ┘è╪¼┘à╪╣ ┘â┘ä ╪º┘ä┘à┘è╪▓╪º╪¬:
 * - EMA, RSI, Volume (╪º┘ä╪ú╪│╪º╪│┘è╪º╪¬)
 * - Order Book Analysis (╪¬╪¡┘ä┘è┘ä ╪│╪╖╪¡ ╪º┘ä╪ú┘ê╪º┘à╪▒)
 * - Whale Tracking (╪▒╪╡╪» ╪º┘ä╪¡┘è╪¬╪º┘å)
 * - Volume Profile (╪¬┘ê╪▓┘è╪╣ ╪º┘ä╪ú╪¡╪¼╪º┘à)
 * - Symbolic AI (╪º┘ä╪░┘â╪º╪í ╪º┘ä╪▒┘è╪º╪╢┘è)
 *
 * ┘è╪╣╪╖┘è ┘é╪▒╪º╪▒ ┘å┘ç╪º╪ª┘è: BUY, SELL, ╪ú┘ê HOLD
 */

const SymbolicAI = require("./ai/SymbolicAI");
const VolumeProfileAnalyzer = require("./modules/VolumeProfileAnalyzer");
const OrderBookAnalyzer = require("./modules/OrderBookAnalyzer");
const WhaleTracker = require("./modules/WhaleTracker");

class AdvancedAIAnalyzer {
  constructor(config, exchange, orderBookProvider = null, database = null) {
    this.config = config;
    this.exchange = exchange;
    this.orderBookProvider = orderBookProvider;
    this.database = database;

    // ╪¬┘ç┘è╪ª╪⌐ ╪º┘ä┘à╪¡┘ä┘ä╪º╪¬
    this.symbolicAI = new SymbolicAI(
      {
        MIN_PATTERN_STRENGTH: 0.5,
        MIN_CORRELATION: 0.5,
        MIN_PROBABILITY: this.config.MIN_CONFIDENCE / 100 || 0.65,
        LOOKBACK_PERIOD: 100,
        PREDICTION_HORIZON: 5,
      },
      database,
    ); // ╪¬┘à╪▒┘è╪▒ database ┘ä┘ä┘Ç AI

    this.volumeAnalyzer = new VolumeProfileAnalyzer();
    this.orderBookAnalyzer = new OrderBookAnalyzer(exchange);
    // Γ£à ╪Ñ╪╡┘ä╪º╪¡: ╪¬┘à╪▒┘è╪▒ database ┘ä┘ä┘Ç WhaleTracker
    this.whaleTracker = new WhaleTracker(database);
  }

  /**
   * ≡ƒöì ╪º┘ä╪¬╪¡┘ä┘è┘ä ╪º┘ä╪┤╪º┘à┘ä - ┘è╪│╪¬╪«╪»┘à ┘â┘ä ╪º┘ä┘à┘è╪▓╪º╪¬ (ASYNC ┘ä╪¼┘ä╪¿ ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪¡┘é┘è┘é┘è╪⌐)
   */
  async analyze(candles, symbol) {
    if (!candles || candles.length < 100) {
      return null;
    }

    try {
      // ========== 1. ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐ ==========
      const closes = candles.map((c) => c[4]);
      const volumes = candles.map((c) => c[5]);
      const currentPrice = closes[closes.length - 1];

      // ========== 2. ╪¡╪│╪º╪¿ ╪º┘ä┘à╪ñ╪┤╪▒╪º╪¬ ==========
      const indicators = this.calculateIndicators(candles);

      // ========== 3. Order Book (WebSocket ONLY) ==========
      let orderBook = null;
      try {
        if (
          this.config.USE_ORDER_BOOK_ANALYSIS &&
          this.config.USE_WEBSOCKET &&
          this.orderBookProvider
        ) {
          // ≡ƒöî ╪º╪│╪¬╪«╪»╪º┘à WebSocket ┘ü┘é╪╖ - ┘ä╪º REST ┘ê┘ä╪º ┘à╪¡╪º┘â╪º╪⌐
          if (this.orderBookProvider.isReady(symbol)) {
            orderBook = this.orderBookProvider.getOrderBook(symbol);
            if (orderBook) {
              orderBook.simulated = false;
              orderBook.source = "websocket";
            }
          } else {
            // ΓÅ│ WebSocket ┘à╪┤ ╪¼╪º┘ç╪▓ - ┘å┘â┘à┘ä ╪¿╪»┘ê┘å Order Book
          }
        }
      } catch (e) {
        console.warn(
          `ΓÜá∩╕Å ╪«╪╖╪ú ┘ü┘è WebSocket Order Book ┘ä┘Ç ${symbol}: ${e.message}`,
        );
      }

      // ========== 4. ╪¬╪¡┘ä┘è┘ä Volume Profile ==========
      let volumeProfile = null;
      try {
        if (this.config.USE_VOLUME_PROFILE !== false) {
          volumeProfile = this.volumeAnalyzer.calculateVolumeProfile(candles);
        }
      } catch (e) {
        // ╪¬╪¼╪º┘ç┘ä ╪Ñ╪░╪º ┘ü╪┤┘ä Volume Profile
        volumeProfile = null;
      }

      // ========== 5. ╪▒╪╡╪» ╪º┘ä╪¡┘è╪¬╪º┘å (whale tracking) ==========
      let whaleActivity = [];
      try {
        if (this.config.USE_WHALE_TRACKER && orderBook) {
          whaleActivity = this.whaleTracker.detectWhales(
            orderBook.bids || [],
            orderBook.asks || [],
            currentPrice,
          );
        }
      } catch (e) {
        // ╪¬╪¼╪º┘ç┘ä ╪ú╪«╪╖╪º╪í whale tracking
      }

      // ========== 6. ╪º┘ä╪¬╪¡┘ä┘è┘ä ╪º┘ä╪┤╪º┘à┘ä ╪¿┘ê╪º╪│╪╖╪⌐ Symbolic AI ==========
      const aiAnalysis = this.symbolicAI.comprehensiveAnalysis({
        symbol,
        candles,
        indicators,
        volumeProfile,
        orderBook,
        whaleActivity,
        currentPrice,
      });

      // ========== 7. ╪¿┘å╪º╪í ╪º┘ä┘å╪¬┘è╪¼╪⌐ ╪º┘ä┘å┘ç╪º╪ª┘è╪⌐ ==========
      const decision = aiAnalysis; // SymbolicAI ┘è╪╣╪╖┘è ┘é╪▒╪º╪▒ ╪┤╪º┘à┘ä

      // ╪¬╪¡┘ê┘è┘ä ┘ä╪╡┘è╪║╪⌐ ┘à╪¬┘ê╪º┘ü┘é╪⌐ ┘à╪╣ ╪º┘ä┘â┘ê╪» ╪º┘ä╪¡╪º┘ä┘è
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

        // ╪º┘ä┘é╪▒╪º╪▒ ┘à┘å Symbolic AI
        side: decision.action, // "LONG", "SHORT", ╪ú┘ê "HOLD"
        confidence: decision.confidence.toFixed(1),
        aiScore: decision.confidence,
        signals: decision.supportingFactors,

        // ┘ä┘ä╪¬┘ê╪º┘ü┘é ┘à╪╣ ╪º┘ä┘â┘ê╪» ╪º┘ä┘é╪»┘è┘à
        shouldBuy:
          decision.action === "LONG" &&
          decision.confidence >= this.config.MIN_CONFIDENCE,
        shouldSell:
          decision.action === "SHORT" &&
          decision.confidence >= this.config.MIN_CONFIDENCE,

        // ┘à╪╣┘ä┘ê┘à╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐
        analysis: {
          orderBook:
            !orderBook && this.config.USE_WEBSOCKET
              ? "ΓÅ│ ╪¿╪º┘å╪¬╪╕╪º╪▒ WebSocket"
              : orderBook?.simulated
                ? "Γ£à ┘à╪¡╪º┘â┘ë (Backtest)"
                : `Γ£à ╪¡┘é┘è┘é┘è (${orderBook?.source || "rest"})`,
          whales:
            whaleActivity.length > 0
              ? `Γ£à ${whaleActivity.length} ╪º┘â╪¬┘Å╪┤┘ü`
              : "Γ¥î ┘ä╪º ┘è┘ê╪¼╪»",
          volumeProfile: volumeProfile ? "Γ£à ┘à╪¡┘ä┘æ┘ä" : "Γ¥î ╪║┘è╪▒ ┘à╪¬╪º╪¡",
          reasoning: decision.reasoning,
          warnings: decision.warnings,
        },

        // ≡ƒÆ╛ ╪¿┘è╪º┘å╪º╪¬ ┘ä┘ä╪¡┘ü╪╕ ┘ü┘è Database
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
          symbolicAI: decision.learnedPattern || null,
        },
      };

      // ≡ƒÆ╛ ╪¡┘ü╪╕ ╪º┘ä╪¬╪¡┘ä┘è┘ä ┘ü┘è Database
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
          // Γ£à ╪Ñ╪╡┘ä╪º╪¡: ╪º┘ä╪¬╪¡┘é┘é ┘à┘å analysisId ┘é╪¿┘ä ╪º┘ä╪Ñ╪│┘å╪º╪»
          if (analysisId) {
            analysisResult.analysisId = analysisId; // ┘ä╪▒╪¿╪╖ ╪º┘ä╪╡┘ü┘é╪⌐ ┘ä╪º╪¡┘é╪º┘ï
          }
        } catch (dbError) {
          console.warn(`ΓÜá∩╕Å Database save error: ${dbError.message}`);
        }
      }

      return analysisResult;
    } catch (error) {
      console.error(
        `Γ¥î [AdvancedAIAnalyzer] Error analyzing ${symbol}:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * ╪¡╪│╪º╪¿ ╪º┘ä┘à╪ñ╪┤╪▒╪º╪¬ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐
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
      macdSignal: macdSignal, // Γ£à ╪Ñ╪╡┘ä╪º╪¡: ╪¡╪│╪º╪¿ MACD Signal
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
    // Γ£à ╪Ñ╪╢╪º┘ü╪⌐: ╪¡╪│╪º╪¿ MACD Signal Line (EMA 9 ┘à┘å MACD)
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

  /**
   * ≡ƒôè ┘à╪¡╪º┘â╪º╪⌐ Order Book ┘ä┘ä┘Ç Backtest
   * Simulate Order Book for backtesting
   */
  simulateOrderBook(candles, currentPrice) {
    if (!candles || candles.length < 20) return null;

    const recentCandles = candles.slice(-20);
    const volumes = recentCandles.map((c) => c[5]);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    // ╪¡╪│╪º╪¿ ╪º╪¬╪¼╪º┘ç ╪º┘ä╪│╪╣╪▒
    const priceChange =
      recentCandles[recentCandles.length - 1][4] - recentCandles[0][4];
    const trendStrength = Math.abs(priceChange) / recentCandles[0][4];

    // ╪Ñ┘å╪┤╪º╪í Order Book ╪º┘ü╪¬╪▒╪º╪╢┘è
    const spread = currentPrice * 0.0001; // 0.01% spread
    const baseVolume = avgVolume * 0.1; // 10% ┘à┘å ┘à╪¬┘ê╪│╪╖ ╪º┘ä╪¡╪¼┘à

    // ╪Ñ┘å╪┤╪º╪í bids ┘ê asks ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪º┘ä╪º╪¬╪¼╪º┘ç
    const bids = [];
    const asks = [];

    for (let i = 0; i < 20; i++) {
      const bidPrice = currentPrice - spread * (i + 1);
      const askPrice = currentPrice + spread * (i + 1);

      // ╪¡╪¼┘à ╪ú┘â╪¿╪▒ ┘ä┘ä╪ú╪│╪╣╪º╪▒ ╪º┘ä╪ú┘é╪▒╪¿
      let bidVolume = baseVolume * (1 - i * 0.05);
      let askVolume = baseVolume * (1 - i * 0.05);

      // ╪¬╪╣╪»┘è┘ä ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪º┘ä╪º╪¬╪¼╪º┘ç
      if (priceChange > 0) {
        // ╪º╪¬╪¼╪º┘ç ╪╡╪º╪╣╪» - bids ╪ú┘é┘ê┘ë
        bidVolume *= 1.2;
        askVolume *= 0.8;
      } else if (priceChange < 0) {
        // ╪º╪¬╪¼╪º┘ç ┘ç╪º╪¿╪╖ - asks ╪ú┘é┘ê┘ë
        bidVolume *= 0.8;
        askVolume *= 1.2;
      }

      bids.push([bidPrice, bidVolume]);
      asks.push([askPrice, askVolume]);
    }

    return {
      bids,
      asks,
      timestamp: Date.now(),
      simulated: true, // ╪╣┘ä╪º┘à╪⌐ ╪ú┘å┘ç simulated
    };
  }
}

module.exports = AdvancedAIAnalyzer;
