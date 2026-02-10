const TelegramBot = require("node-telegram-bot-api");

/**
 * TelegramBot Module: مسؤول عن التنبيهات والإخطارات
 * Telegram Notifications Module
 */
class TelegramBotManager {
  constructor() {
    if (process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
        polling: false,
      });
      this.chatId = process.env.TELEGRAM_CHAT_ID;
      this.enabled = true;
    } else {
      this.enabled = false;
      console.log(
        "⚠️ Telegram غير مفعل - لم يتم تعيين TELEGRAM_TOKEN أو TELEGRAM_CHAT_ID",
      );
    }
  }

  /**
   * إرسال رسالة تليجرام
   * Send a Telegram message
   */
  async send(message, parseMode = "Markdown") {
    if (!this.enabled) {
      console.log(`[TELEGRAM SIMULATED]: ${message.substring(0, 100)}...`);
      return;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: parseMode,
      });
    } catch (error) {
      console.error("❌ خطأ في إرسال رسالة Telegram:", error.message);
    }
  }

  /**
   * إرسال إشارة دخول جديدة
   * Send entry signal
   */
  async sendEntrySignal(trade, reasons, indicators) {
    const whaleIcons = "🐋".repeat(Math.min(trade.whaleCount || 0, 3));
    const riskRewardRatio = (
      (trade.takeProfit - trade.entryPrice) /
      (trade.entryPrice - trade.stopLoss)
    ).toFixed(2);

    const message =
      `🚀 *دخول جديد: ${trade.symbol}* [15M]\n\n` +
      `💵 *الحجم:* $${trade.size.toFixed(2)}\n` +
      `💰 *السعر:* $${trade.entryPrice.toFixed(4)}\n` +
      `🛡️ *الستوب:* $${trade.stopLoss.toFixed(4)} (${trade.riskPercent.toFixed(2)}%)\n` +
      `🎯 *الهدف:* $${trade.takeProfit.toFixed(4)}\n` +
      `⚖️ *R/R:* ${riskRewardRatio}:1\n` +
      `⚠️ *المخاطرة:* $${trade.riskAmount.toFixed(2)} (${trade.riskToBalancePercent.toFixed(2)}% من الرصيد)\n` +
      `📊 *الرصيد:* $${trade.balance.toFixed(2)}\n` +
      `🔮 *الثقة:* ${trade.confidence}% ${whaleIcons}\n` +
      `📈 *RSI:* ${indicators?.rsi?.toFixed(1) || "N/A"}\n` +
      `💧 *الحجم:* ${indicators?.volumeRatio?.toFixed(1) || "N/A"}x\n` +
      `📝 *الأسباب:*\n${reasons
        .slice(0, 3)
        .map((r) => `• ${r}`)
        .join("\n")}`;

    await this.send(message);
  }

  /**
   * إرسال تنبيه إغلاق صفقة
   * Send trade close alert
   */
  async sendCloseAlert(trade, reason, pnlPercent, pnlUsd) {
    let emoji = "📊";
    if (reason.includes("PROFIT")) emoji = "💰";
    if (reason.includes("STOP_LOSS")) emoji = "🛑";
    if (reason.includes("TAKE_PROFIT")) emoji = "🎯";

    const duration = ((Date.now() - trade.entryTime) / 60000).toFixed(1);
    const stopMovesCount = trade.stopLossHistory?.length - 1 || 0;

    const message =
      `${emoji} *${trade.symbol} - إغلاق*\n\n` +
      `📊 ${pnlPercent > 0 ? "+" : ""}${pnlPercent.toFixed(2)}%\n` +
      `💸 ${pnlUsd > 0 ? "+" : ""}$${pnlUsd.toFixed(2)}\n` +
      `⏱️ ${duration} دقيقة\n` +
      `🛑 ${stopMovesCount} حركة ستوب\n` +
      `📝 ${this.translateReason(reason)}\n` +
      `🎯 الثقة: ${trade.confidence.toFixed(1)}%\n` +
      `🕐 ${new Date().toLocaleTimeString("ar-SA")}`;

    await this.send(message);
  }

  /**
   * إرسال تنبيه عال المخاطرة
   * Send high risk alert
   */
  async sendHighRiskAlert(symbol, riskPercent) {
    const message =
      `⛔ *مخاطرة عالية جداً*\n` +
      `${symbol}: ${riskPercent.toFixed(2)}%\n` +
      `الدخول ملغى للحماية`;

    await this.send(message);
  }

  /**
   * إرسال تنبيه الحيتان
   * Send whale alert
   */
  async sendWhaleAlert(symbol, imbalance, whaleCount) {
    const message =
      `💎 *Super Whale Alert*\n` +
      `${symbol}\n` +
      `Imbalance: ${imbalance.toFixed(1)}x\n` +
      `Whales: ${whaleCount}`;

    await this.send(message);
  }

  /**
   * إرسال تقرير الأداء
   * Send performance report
   */
  async sendPerformanceReport(performance) {
    const message =
      `🏦 *بدء نظام التداول الاحترافي مع قاعدة بيانات*\n\n` +
      `📊 إجمالي الصفقات: ${performance.trades}\n` +
      `💰 الربح الصافي: $${performance.netProfit.toFixed(2)}\n` +
      `🏆 النجاح: ${performance.wins}/${performance.trades}\n` +
      `🎛️ متوسط الثقة: ${(performance.totalConfidence / (performance.trades || 1)).toFixed(1)}%`;

    await this.send(message);
  }

  /**
   * إرسال تقرير الرادار
   * Send radar report
   */
  async sendRadarReport(opportunities) {
    if (opportunities.length === 0) {
      await this.send("⏳ جاري تجميع بيانات كافية للرادار...");
      return;
    }

    let report = "🔍 *تقرير الرادار اللحظي المطور*\n\n";

    opportunities.slice(0, 5).forEach((item, index) => {
      const { symbol, confidence, indicators, imbalance } = item;

      report += `${index + 1}. *${symbol}* (${confidence.toFixed(1)}%)\n`;
      report += `   ⚖️ السيولة: ${imbalance.toFixed(1)}x\n`;
      report += `   • RSI: ${indicators.rsi.toFixed(1)} | حجم: ${indicators.volumeRatio.toFixed(1)}x\n`;
      report += `   • ATR: $${indicators.atr.toFixed(4)}\n`;
      report += `   • الحالة: ${confidence >= 83 ? "🚀 دخول" : "📉 مراقبة"}\n`;
      report += `--------------------------\n`;
    });

    await this.send(report);
  }

  /**
   * ترجمة سبب الإغلاق للعربية
   * Translate close reason to Arabic
   */
  translateReason(englishReason) {
    const reasons = {
      TRAILING_STOP_PROFIT: "تريلينج ستوب مع ربح",
      STOP_LOSS: "وصول للستوب لوز",
      STOP_LOSS_HIT: "وصول للستوب لوز",
      TAKE_PROFIT: "تحقيق الهدف",
      TAKE_PROFIT_REACHED: "تحقيق الهدف",
      MARKET_CONDITION_DETERIORATED: "تدهور ظروف السوق",
      TIME_LIMIT_PROFIT: "انتهاء الوقت مع ربح",
      TIME_LIMIT_LOSS: "انتهاء الوقت",
      WHALES_DISAPPEARED: "اختفاء الحيتان",
      CONFIRMED_SPOOFING_EXIT: "خدعة الحيتان - خروج",
      TRAILED_PROFIT_TAKEN: "تأمين ربح بالتريلينج",
      MOMENTUM_LOST_SECURED: "ضعف الزخم مع تأمين الربح",
      TIME_LIMIT_STAGNANT: "انتهاء الوقت مع ركود",
      PROFIT_PULLBACK: "تراجع عن أعلى ربح",
    };
    return reasons[englishReason] || englishReason;
  }

  /**
   * تفعيل/تعطيل Telegram
   * Enable/Disable Telegram
   */
  setEnabled(enabled) {
    this.enabled = enabled && this.bot;
  }

  /**
   * التحقق من حالة الاتصال
   * Check connection status
   */
  isEnabled() {
    return this.enabled;
  }
}

module.exports = TelegramBotManager;
