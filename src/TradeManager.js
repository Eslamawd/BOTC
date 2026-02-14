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
    const isLong = isLongSignal(side);
    const dynamicTimeoutHours = this.calculateDynamicTimeoutHours(analysis);

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

      // ✅ Stop Loss: LONG = تحت السعر، SHORT = فوق السعر
      stopLoss: isLong
        ? price * this.config.TRAILING_STOP_LOSS // 0.98 = -2%
        : price / this.config.TRAILING_STOP_LOSS, // 1/0.98 = +2%
      trailingStopPrice: isLong
        ? price * this.config.TRAILING_STOP_LOSS
        : price / this.config.TRAILING_STOP_LOSS,

      // ✅ Take Profit: LONG = فوق السعر، SHORT = تحت السعر
      takeProfit: isLong
        ? price * this.config.TRAILING_TAKE_PROFIT // 1.03 = +3%
        : price / this.config.TRAILING_TAKE_PROFIT, // 1/1.03 = -3%
      trailingTPPrice: isLong
        ? price * this.config.TRAILING_TAKE_PROFIT
        : price / this.config.TRAILING_TAKE_PROFIT,

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
    const tpTargetPercent = Math.max(
      (Number(this.config.TRAILING_TAKE_PROFIT || 1.02) - 1) * 100,
      0.5,
    );
    const lock1Percent = Math.max(tpTargetPercent - 0.2, 0.2);
    const lock2TriggerPercent = tpTargetPercent + 1;
    const lock2Percent = lock2TriggerPercent - 0.2;

    // ========== LONG TRADES (BUY) ==========
    if (isLong) {
      const profitPercent =
        ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

      // تحديث الأسعار العليا
      if (currentPrice > trade.highestPrice) {
        trade.highestPrice = currentPrice;
      }

      // 🚀 Profit Lock Aggressive:
      // عند الهدف الأساسي لا نغلق فوراً، نرفع الستوب لضمان lock1Percent
      if (profitPercent >= tpTargetPercent) {
        const lockPrice1 = trade.entryPrice * (1 + lock1Percent / 100);
        if (lockPrice1 > trade.trailingStopPrice) {
          trade.trailingStopPrice = lockPrice1;
        }
        trade.profitLock2Activated = true;
      }

      // عند الهدف الثاني نرفع الستوب لضمان lock2Percent
      if (profitPercent >= lock2TriggerPercent) {
        const lockPrice2 = trade.entryPrice * (1 + lock2Percent / 100);
        if (lockPrice2 > trade.trailingStopPrice) {
          trade.trailingStopPrice = lockPrice2;
        }
        trade.profitLock3Activated = true;
      }

      // 🔴 SCALPING: Trailing SL عند -1.5%
      const newTrailingStop =
        trade.highestPrice * this.config.TRAILING_STOP_LOSS;
      if (newTrailingStop > trade.trailingStopPrice) {
        trade.trailingStopPrice = newTrailingStop;
      }

      if (currentPrice <= trade.trailingStopPrice && !shouldClose) {
        shouldClose = true;
        exitPrice = trade.trailingStopPrice;
        reason = CLOSE_REASONS.SL_SCALP;
      }
    }
    // ========== SHORT TRADES (SELL) ==========
    else {
      const profitPercent =
        ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;

      // تحديث الأسعار الدنيا
      if (currentPrice < trade.lowestPrice) {
        trade.lowestPrice = currentPrice;
      }

      // 🚀 Profit Lock Aggressive (SHORT):
      // عند الهدف الأساسي لا نغلق فوراً، نرفع الستوب لضمان lock1Percent
      if (profitPercent >= tpTargetPercent) {
        const lockPrice1 = trade.entryPrice * (1 - lock1Percent / 100);
        if (lockPrice1 < trade.trailingStopPrice) {
          trade.trailingStopPrice = lockPrice1;
        }
        trade.profitLock2Activated = true;
      }

      // عند الهدف الثاني نرفع الستوب لضمان lock2Percent
      if (profitPercent >= lock2TriggerPercent) {
        const lockPrice2 = trade.entryPrice * (1 - lock2Percent / 100);
        if (lockPrice2 < trade.trailingStopPrice) {
          trade.trailingStopPrice = lockPrice2;
        }
        trade.profitLock3Activated = true;
      }

      // 🔴 SCALPING: Trailing SL عند -1.5%
      const newTrailingStop =
        trade.lowestPrice / this.config.TRAILING_STOP_LOSS;
      if (newTrailingStop < trade.trailingStopPrice) {
        trade.trailingStopPrice = newTrailingStop;
      }

      if (currentPrice >= trade.trailingStopPrice && !shouldClose) {
        shouldClose = true;
        exitPrice = trade.trailingStopPrice;
        reason = CLOSE_REASONS.SL_SCALP;
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
