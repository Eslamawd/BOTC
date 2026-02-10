/**
 * WhaleTracker: مسؤول عن تتبع الحيتان والطلبات الكبيرة
 * Whale Tracking Module - detects large orders and whale activity
 */
class WhaleTracker {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.volumeHistory = {};
  }

  /**
   * تحليل نشاط الحيتان في Order Book
   * Analyze whale activity from order book data
   */
  analyzeWhales(symbol, orderBook, indicators) {
    const avgVolume = indicators.avgVolume;
    if (!orderBook || !orderBook.bids)
      return {
        score: 0,
        reasons: [],
        warnings: [],
        whales: [],
        dynamicThreshold: 0,
      };

    // تسجيل سجل حجم التداول
    if (!this.volumeHistory) this.volumeHistory = {};
    this.volumeHistory[symbol] = { avgVolume };

    // حساب الحد الديناميكي للحوت (ترتبط بحجم التداول والسعر)
    const dynamicThreshold = Math.min(
      Math.max(indicators.close * avgVolume * 0.001, 20000),
      indicators.close * avgVolume * 0.02,
    );

    let score = 0;
    const reasons = [];
    const warnings = [];
    const whales = [];

    // ابحث عن الطلبات الكبيرة في أعلى 20 طلب (Bid)
    for (let i = 0; i < Math.min(20, orderBook.bids.length); i++) {
      const value = orderBook.bids[i][0] * orderBook.bids[i][1];
      if (value >= dynamicThreshold) {
        whales.push({
          value,
          position: i + 1,
          size: (value / 1000).toFixed(1) + "K",
        });
      }
    }

    // تقييم عدد الحيتان
    if (whales.length >= 10) {
      score += 20;
      reasons.push(`🐋🐋🐋 ${whales.length} حيتان نشطة`);
    } else if (whales.length > 0) {
      score += 2.5 * whales.length;
      reasons.push(`🐋 رصد ${whales.length} حوت`);
    }

    // تقييم الحيتان في الخط الأول (أول 3 طلبات)
    const frontLineWhales = whales.filter((w) => w.position <= 3).length;
    if (frontLineWhales >= 1) {
      score += 5;
      reasons.push("🛡️ حوت هجومي في الخط الأول (دعم مباشر)");
    }

    // حفظ بيانات الحيتان في قاعدة البيانات
    if (this.dbManager?.saveWhaleSighting) {
      this.dbManager
        .saveWhaleSighting(symbol, {
          count: whales.length,
          largestValue: whales.length
            ? Math.max(...whales.map((w) => w.value))
            : 0,
          avgValue: whales.length
            ? whales.reduce((a, b) => a + b.value, 0) / whales.length
            : 0,
          positions: whales.map((w) => w.position),
          powerScore: score,
        })
        .catch(() => {});
    }

    return { score, reasons, warnings, whales, dynamicThreshold };
  }

  // ملاحظة: تم حذف دوال غير مستخدمة لتقليل التعقيد
}

module.exports = WhaleTracker;
