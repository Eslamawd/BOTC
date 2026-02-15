/**
 * 📊 Trade Management Module - تحديث وإغلاق الصفقات
 * Extracted from live-trader-ai-advanced.js
 * Handles: Trailing SL/TP, trade updates, P&L calculations
 */

const { CLOSE_REASONS } = require("./constants/closeReasons");
const {
  ORDER_ACTIONS,
  isLongSignal,
  isShortSignal,
} = require("./constants/signals");

class TradeManager {
  constructor(config) {
    this.config = config;
    this.leverage = config.LEVERAGE || 1;
    this.tradingType = config.TRADING_TYPE || "spot";
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  calculateDynamicTimeoutHours(analysis = {}) {
    const baseHours = Number(this.config.TIMEOUT_HOURS || 1);
    const minHours = Number(this.config.TIMEOUT_MIN_HOURS || 0.75);
    const maxHours = Number(this.config.TIMEOUT_MAX_HOURS || 8);

    const volumeRatio = Number(analysis.volumeRatio || 1);
    const trendConfidence = Number(
      analysis.trendConfidence || analysis.trendContext?.confidence || 50,
    );

    const trendAligned =
      analysis.trendAligned !== undefined
        ? Boolean(analysis.trendAligned)
        : (() => {
            const trendSide = analysis.trendContext?.side;
            const side = analysis.side;
            const isLong = isLongSignal(side);
            const isShort = isShortSignal(side);
            return (
              (trendSide === "LONG" && isLong) ||
              (trendSide === "SHORT" && isShort)
            );
          })();

    let factor = 1;

    // Volume-driven timing: حركة أسرع = وقت أقل
    if (volumeRatio >= 2) factor *= 0.7;
    else if (volumeRatio >= 1.3) factor *= 0.85;
    else if (volumeRatio < 0.8) factor *= 1.35;
    else if (volumeRatio < 1) factor *= 1.15;

    // Trend-driven timing: ترند قوي ومتوافق = وقت أطول لترك الصفقة تعمل
    if (trendAligned && trendConfidence >= 70) factor *= 1.25;
    else if (trendAligned && trendConfidence >= 55) factor *= 1.1;
    else if (!trendAligned) factor *= 0.8;

    const dynamicHours = this.clamp(baseHours * factor, minHours, maxHours);
    return Math.round(dynamicHours * 100) / 100;
  }

  getAtrValue(analysis, price) {
    const atr = Number(analysis?.indicators?.atr);
    const baseAtr = Number.isFinite(atr) && atr > 0 ? atr : price * 0.005;
    const atrFloorPct = Number(this.config.ATR_MIN_PCT || 0.005);
    const atrFloor = price * atrFloorPct;
    return Math.max(baseAtr, atrFloor);
  }

  findOrderBookWalls(orderBook, currentPrice) {
    if (!orderBook) return null;

    if (
      Array.isArray(orderBook.bids) &&
      Array.isArray(orderBook.asks) &&
      orderBook.bids.length > 0 &&
      orderBook.asks.length > 0
    ) {
      const normalizeLevel = (level) => [Number(level[0]), Number(level[1])];
      const bids = orderBook.bids.slice(0, 20).map(normalizeLevel);
      const asks = orderBook.asks.slice(0, 20).map(normalizeLevel);

      const findWall = (levels, direction) => {
        if (!levels.length) return null;
        const avgSize =
          levels.reduce((sum, level) => sum + level[1], 0) / levels.length;
        const threshold = avgSize * 2;
        const walls = levels.filter((level) => level[1] >= threshold);
        if (!walls.length) return null;

        if (direction === "above") {
          return walls
            .filter((level) => level[0] >= currentPrice)
            .reduce(
              (closest, level) =>
                !closest || level[0] < closest[0] ? level : closest,
              null,
            );
        }

        return walls
          .filter((level) => level[0] <= currentPrice)
          .reduce(
            (closest, level) =>
              !closest || level[0] > closest[0] ? level : closest,
            null,
          );
      };

      const support = findWall(bids, "below");
      const resistance = findWall(asks, "above");

      return {
        support: support ? support[0] : null,
        resistance: resistance ? resistance[0] : null,
      };
    }

    if (orderBook.bidLevel || orderBook.askLevel) {
      return {
        support: orderBook.bidLevel || null,
        resistance: orderBook.askLevel || null,
      };
    }

    return null;
  }

  calculateSmartLevels(entryPrice, analysis, side) {
    const isLong = isLongSignal(side);
    const atr = this.getAtrValue(analysis, entryPrice);
    const minStopDistancePct = Number(
      this.config.MIN_STOP_DISTANCE_PCT || 0.006,
    );
    const minStopDistance = entryPrice * minStopDistancePct;

    const baseTakeProfit = isLong
      ? entryPrice + atr * 2.5
      : entryPrice - atr * 2.5;
    const baseStopLoss = isLong
      ? entryPrice - atr * 1.2
      : entryPrice + atr * 1.2;

    const orderBook = analysis?.orderBook || analysis?._rawData?.orderBook;
    const walls = this.findOrderBookWalls(orderBook, entryPrice);
    const buffer = 0.001;

    let takeProfit = baseTakeProfit;
    let stopLoss = baseStopLoss;

    if (walls) {
      if (isLong) {
        if (walls.resistance && walls.resistance > entryPrice) {
          takeProfit = Math.min(takeProfit, walls.resistance * (1 - buffer));
        }
        if (walls.support && walls.support < entryPrice) {
          stopLoss = Math.max(stopLoss, walls.support * (1 - buffer));
        }
      } else {
        if (walls.support && walls.support < entryPrice) {
          takeProfit = Math.max(takeProfit, walls.support * (1 + buffer));
        }
        if (walls.resistance && walls.resistance > entryPrice) {
          stopLoss = Math.min(stopLoss, walls.resistance * (1 + buffer));
        }
      }
    }

    if (isLong) {
      if (takeProfit <= entryPrice) takeProfit = entryPrice + atr * 0.5;
      if (stopLoss >= entryPrice) stopLoss = entryPrice - atr * 0.5;

      const maxAllowedStopLoss = entryPrice - minStopDistance;
      if (stopLoss > maxAllowedStopLoss) {
        stopLoss = maxAllowedStopLoss;
      }
    } else {
      if (takeProfit >= entryPrice) takeProfit = entryPrice - atr * 0.5;
      if (stopLoss <= entryPrice) stopLoss = entryPrice + atr * 0.5;

      const minAllowedStopLoss = entryPrice + minStopDistance;
      if (stopLoss < minAllowedStopLoss) {
        stopLoss = minAllowedStopLoss;
      }
    }

    return {
      atr,
      takeProfit,
      stopLoss,
      walls,
      baseTakeProfit,
      baseStopLoss,
    };
  }

  /**
   * فتح صفقة جديدة (LONG أو SHORT)
   */
  openTrade(symbol, price, analysis, balance, activeTradesCount) {
    const maxConcurrent = this.config.MAX_CONCURRENT_TRADES_PER_SYMBOL;
    if (activeTradesCount >= maxConcurrent) return null;

    // حجم الصفقة من الرصيد الأولي
    const riskAmount =
      (this.config.INITIAL_BALANCE * this.config.RISK_PER_TRADE) /
      this.config.SYMBOLS.length;

    // 🎯 Futures: حجم الصفقة = رأس المال × الرافعة
    const positionSize =
      this.tradingType === "futures" ? riskAmount * this.leverage : riskAmount;

    if (positionSize < 0.5 || balance < riskAmount * 0.5) return null;

    const side = analysis.side || ORDER_ACTIONS.BUY; // BUY/LONG للشراء، SELL/SHORT للبيع
    const dynamicTimeoutHours = this.calculateDynamicTimeoutHours(analysis);
    const smartLevels = this.calculateSmartLevels(price, analysis, side);

    // حساب الكمية (quantity) = positionSize / price
    const quantity = positionSize / price;

    return {
      id: `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side, // BUY للشراء (LONG)، SELL للبيع (SHORT)
      entryPrice: price,
      entryTime: Date.now(),
      positionSize,
      quantity, // إضافة quantity للـ database

      // Trailing mechanism
      highestPrice: price, // لـ LONG
      lowestPrice: price, // لـ SHORT

      // ✅ Smart Levels based on ATR + Order Book walls
      stopLoss: smartLevels.stopLoss,
      trailingStopPrice: smartLevels.stopLoss,
      takeProfit: smartLevels.takeProfit,
      trailingTPPrice: smartLevels.takeProfit,
      atr: smartLevels.atr,
      orderBookWalls: smartLevels.walls,
      breakEvenActivated: false,
      aggressiveTrailActivated: false,

      confidence: parseFloat(analysis.confidence),
      analysisId: analysis.analysisId || null,
      learnedPatternCategory: analysis.learnedPattern?.category || null,
      failingPenaltyApplied: analysis.failingPenaltyApplied === true,
      timeoutHours: dynamicTimeoutHours,
      timeoutMs: dynamicTimeoutHours * 60 * 60 * 1000,
      profitLock2Activated: false,
      profitLock3Activated: false,
      signals: analysis.signals,
      status: "OPEN",
      hitMinProfit: false, // 🔥 هل وصل للـ min profit ليدخل unlimited mode?
    };
  }

  /**
   * تحديث الصفقة مع Trailing (يدعم LONG و SHORT) - SCALPING MODE
   */
  updateTradeTrailing(trade, currentPrice, timestamp) {
    let shouldClose = false;
    let exitPrice = currentPrice;
    let reason = "";
    const side = trade.side || ORDER_ACTIONS.BUY;
    const isLong = isLongSignal(side);
    const atr = Number(trade.atr) > 0 ? trade.atr : 0;
    const minTrailDistancePct = Number(
      this.config.TRAILING_MIN_DISTANCE_PCT || 0.005,
    );
    const minTrailDistance = trade.entryPrice * minTrailDistancePct;
    const breakEvenTrigger = atr;
    const standardTrailMultiplier = 1.2;
    const aggressiveTrailMultiplier = 0.6;

    // ========== LONG TRADES (BUY) ==========
    if (isLong) {
      const profitMove = currentPrice - trade.entryPrice;

      if (currentPrice > trade.highestPrice) {
        trade.highestPrice = currentPrice;
      }

      if (atr > 0 && profitMove >= breakEvenTrigger) {
        trade.breakEvenActivated = true;
        trade.aggressiveTrailActivated = true;
        const breakEvenStop = trade.entryPrice - atr * 0.5;
        if (trade.trailingStopPrice < breakEvenStop) {
          trade.trailingStopPrice = breakEvenStop;
        }
      }

      const trailDistance =
        atr > 0
          ? atr *
            (trade.aggressiveTrailActivated
              ? aggressiveTrailMultiplier
              : standardTrailMultiplier)
          : Math.abs(trade.entryPrice - trade.stopLoss);
      const safeTrailDistance = Math.max(trailDistance, minTrailDistance);

      const candidateStop = trade.highestPrice - safeTrailDistance;
      if (candidateStop > trade.trailingStopPrice) {
        trade.trailingStopPrice = candidateStop;
      }

      if (currentPrice <= trade.trailingStopPrice && !shouldClose) {
        shouldClose = true;
        exitPrice = trade.trailingStopPrice;
        reason = CLOSE_REASONS.TRAILING_SL;
      }

      if (currentPrice >= trade.takeProfit && !shouldClose) {
        shouldClose = true;
        exitPrice = trade.takeProfit;
        reason = CLOSE_REASONS.TRAILING_TP;
      }
    }
    // ========== SHORT TRADES (SELL) ==========
    else {
      const profitMove = trade.entryPrice - currentPrice;

      if (currentPrice < trade.lowestPrice) {
        trade.lowestPrice = currentPrice;
      }

      if (atr > 0 && profitMove >= breakEvenTrigger) {
        trade.breakEvenActivated = true;
        trade.aggressiveTrailActivated = true;
        const breakEvenStop = trade.entryPrice + atr * 0.5;
        if (trade.trailingStopPrice > breakEvenStop) {
          trade.trailingStopPrice = breakEvenStop;
        }
      }

      const trailDistance =
        atr > 0
          ? atr *
            (trade.aggressiveTrailActivated
              ? aggressiveTrailMultiplier
              : standardTrailMultiplier)
          : Math.abs(trade.stopLoss - trade.entryPrice);
      const safeTrailDistance = Math.max(trailDistance, minTrailDistance);

      const candidateStop = trade.lowestPrice + safeTrailDistance;
      if (candidateStop < trade.trailingStopPrice) {
        trade.trailingStopPrice = candidateStop;
      }

      if (currentPrice >= trade.trailingStopPrice && !shouldClose) {
        shouldClose = true;
        exitPrice = trade.trailingStopPrice;
        reason = CLOSE_REASONS.TRAILING_SL;
      }

      if (currentPrice <= trade.takeProfit && !shouldClose) {
        shouldClose = true;
        exitPrice = trade.takeProfit;
        reason = CLOSE_REASONS.TRAILING_TP;
      }
    }

    // Timeout ديناميكي حسب الفوليوم + الترند
    const timeoutMs =
      trade.timeoutMs || this.config.TIMEOUT_HOURS * 60 * 60 * 1000;
    if (timestamp - trade.entryTime > timeoutMs) {
      shouldClose = true;
      exitPrice = currentPrice;
      reason = CLOSE_REASONS.TIMEOUT;
    }

    return { shouldClose, exitPrice, reason };
  }

  /**
   * حساب P&L والإغلاق (يدعم LONG و SHORT)
   */
  closeTrade(trade, exitPrice, reason) {
    const side = trade.side || ORDER_ACTIONS.BUY;
    const isLong = isLongSignal(side);
    const isShort = isShortSignal(side);

    // ✅ الرسوم حسب نوع التداول:
    // Futures: 0.02% maker + 0.04% taker = ~0.06% total (نستخدم taker للأمان)
    // Spot: 0.1% maker + 0.1% taker = 0.2% total
    const feeRate = this.tradingType === "futures" ? 0.0006 : 0.002;
    const fees = trade.positionSize * feeRate;

    let profitPercent, effectiveExitPrice;

    // ========== LONG TRADES ==========
    if (isLong) {
      // ✅ الربح = (سعر الخروج - سعر الدخول) * الكمية - الرسوم
      const grossProfit =
        ((exitPrice - trade.entryPrice) / trade.entryPrice) *
        trade.positionSize;
      const netProfit = grossProfit - fees;
      profitPercent = (netProfit / trade.positionSize) * 100;
      effectiveExitPrice = exitPrice;
    }
    // ========== SHORT TRADES ==========
    else {
      // ✅ الربح للـ SHORT = (سعر الدخول - سعر الخروج) * الكمية - الرسوم
      const grossProfit =
        ((trade.entryPrice - exitPrice) / trade.entryPrice) *
        trade.positionSize;
      const netProfit = grossProfit - fees;
      profitPercent = (netProfit / trade.positionSize) * 100;
      effectiveExitPrice = exitPrice;
    }

    const pnl = (profitPercent / 100) * trade.positionSize;

    trade.exitPrice = exitPrice;
    trade.effectiveExitPrice = effectiveExitPrice;
    trade.exitReason = reason;
    trade.profitPercent = profitPercent;
    trade.pnl = pnl;
    trade.feesDeducted = fees;
    trade.status = "CLOSED";
    trade.exitTime = Date.now();
    trade.highestReached = trade.highestPrice;
    trade.lowestReached = trade.lowestPrice;

    return trade;
  }
}

module.exports = TradeManager;
