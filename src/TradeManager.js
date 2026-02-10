/**
 * 📊 Trade Management Module - تحديث وإغلاق الصفقات
 * Extracted from live-trader-ai-advanced.js
 * Handles: Trailing SL/TP, trade updates, P&L calculations
 */

class TradeManager {
  constructor(config) {
    this.config = config;
    this.leverage = config.LEVERAGE || 1;
    this.tradingType = config.TRADING_TYPE || "spot";
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

    const side = analysis.side || "BUY"; // BUY/LONG للشراء، SELL/SHORT للبيع
    const isLong = side === "BUY" || side === "LONG";
    const isShort = side === "SELL" || side === "SHORT";

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
        ? price * this.config.TRAILING_STOP_LOSS // 0.94 = -6%
        : price / this.config.TRAILING_STOP_LOSS, // 1/0.94 = +6%
      trailingStopPrice: isLong
        ? price * this.config.TRAILING_STOP_LOSS
        : price / this.config.TRAILING_STOP_LOSS,

      // ✅ Take Profit: LONG = فوق السعر، SHORT = تحت السعر
      takeProfit: isLong
        ? price * this.config.TRAILING_TAKE_PROFIT // 1.12 = +12%
        : price / this.config.TRAILING_TAKE_PROFIT, // 1/1.12 = -12%
      trailingTPPrice: isLong
        ? price * this.config.TRAILING_TAKE_PROFIT
        : price / this.config.TRAILING_TAKE_PROFIT,

      confidence: parseFloat(analysis.confidence),
      signals: analysis.signals,
      status: "OPEN",
    };
  }

  /**
   * تحديث الصفقة مع Trailing (يدعم LONG و SHORT)
   */
  updateTradeTrailing(trade, currentPrice, timestamp) {
    let shouldClose = false;
    let exitPrice = currentPrice;
    let reason = "";
    const side = trade.side || "BUY";
    const isLong = side === "BUY" || side === "LONG";
    const isShort = side === "SELL" || side === "SHORT";

    // ========== LONG TRADES (BUY) ==========
    if (isLong) {
      // تحديث الأسعار العليا للـ LONG
      if (currentPrice > trade.highestPrice) {
        trade.highestPrice = currentPrice;
      }

      // Trailing Stop Loss - يتحرك للأعلى فقط
      const newTrailingStop =
        trade.highestPrice * this.config.TRAILING_STOP_LOSS;
      if (newTrailingStop > trade.trailingStopPrice) {
        trade.trailingStopPrice = newTrailingStop;
      }

      if (currentPrice <= trade.trailingStopPrice) {
        shouldClose = true;
        exitPrice = trade.trailingStopPrice;
        reason = "TRAILING_SL";
      }

      // Trailing Take Profit
      const profitPercent =
        ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

      if (profitPercent >= 10 && currentPrice > trade.trailingTPPrice * 1.002) {
        trade.trailingTPPrice = currentPrice * (1 - this.config.TRAILING_STEP);
      }

      if (currentPrice >= trade.trailingTPPrice && profitPercent >= 5) {
        shouldClose = true;
        exitPrice = trade.trailingTPPrice;
        reason = "TRAILING_TP";
      }
    }

    // ========== SHORT TRADES (SELL) ==========
    else {
      // تحديث الأسعار الدنيا للـ SHORT
      if (currentPrice < trade.lowestPrice) {
        trade.lowestPrice = currentPrice;
      }

      // Trailing Stop Loss - يتحرك للأسفل فقط
      const newTrailingStop =
        trade.lowestPrice / this.config.TRAILING_STOP_LOSS;
      if (newTrailingStop < trade.trailingStopPrice) {
        trade.trailingStopPrice = newTrailingStop;
      }

      if (currentPrice >= trade.trailingStopPrice) {
        shouldClose = true;
        exitPrice = trade.trailingStopPrice;
        reason = "TRAILING_SL";
      }

      // Trailing Take Profit (للـ SHORT يكون أسفل)
      const profitPercent =
        ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;

      if (profitPercent >= 10 && currentPrice < trade.trailingTPPrice * 0.998) {
        trade.trailingTPPrice = currentPrice * (1 + this.config.TRAILING_STEP);
      }

      if (currentPrice <= trade.trailingTPPrice && profitPercent >= 5) {
        shouldClose = true;
        exitPrice = trade.trailingTPPrice;
        reason = "TRAILING_TP";
      }
    }

    // Timeout (مشترك للـ LONG و SHORT)
    if (
      timestamp - trade.entryTime >
      this.config.TIMEOUT_HOURS * 60 * 60 * 1000
    ) {
      shouldClose = true;
      exitPrice = currentPrice;
      reason = "TIMEOUT";
    }

    return { shouldClose, exitPrice, reason };
  }

  /**
   * حساب P&L والإغلاق (يدعم LONG و SHORT)
   */
  closeTrade(trade, exitPrice, reason) {
    const side = trade.side || "BUY";
    const isLong = side === "BUY" || side === "LONG";
    const isShort = side === "SELL" || side === "SHORT";

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
    trade.highestReached = trade.highestPrice;
    trade.lowestReached = trade.lowestPrice;

    return trade;
  }
}

module.exports = TradeManager;
