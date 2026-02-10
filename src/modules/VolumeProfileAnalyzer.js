/**
 * VolumeProfileAnalyzer.js
 * محلل حجم التداول المتقدم (Volume Profile Analyzer)
 * يحسب مناطق الدعم والمقاومة بناءً على الفوليوم
 */

class VolumeProfileAnalyzer {
  constructor() {
    this.volumeProfile = {};
    this.priceOCArea = null; // Price Of Control - أهم مستوى
    this.valueArea = null; // منطقة القيمة (أين يتكيف 70% من الفوليوم)
  }

  /**
   * حساب Volume Profile من الشموع
   * Calculate volume profile from candles
   */
  calculateVolumeProfile(candles, priceStep = 0.01) {
    if (!candles || candles.length === 0) return null;

    const profile = {};
    let totalVolume = 0;

    // تجميع الفوليوم على مستويات الأسعار المختلفة
    candles.forEach((candle) => {
      const open = candle[1];
      const high = candle[2];
      const low = candle[3];
      const close = candle[4];
      const volume = candle[5] || 0;

      if (volume === 0) return;

      // توزيع الفوليوم على طول الشمعة
      const range = high - low;
      const steps = Math.ceil(range / priceStep);

      for (let i = 0; i <= steps; i++) {
        const price =
          Math.round((low + (i * range) / steps) / priceStep) * priceStep;
        const key = price.toFixed(2);

        // توزيع الفوليوم بناءً على موضع السعر
        const volumeAtLevel = (volume / (steps + 1)) * 1.5; // تركيز أكثر على منطقة الإغلاق

        profile[key] = (profile[key] || 0) + volumeAtLevel;
        totalVolume += volumeAtLevel;
      }
    });

    // إيجاد POC (Price of Control) - السعر ذو أعلى فوليوم
    let pocPrice = null;
    let pocVolume = 0;

    Object.entries(profile).forEach(([price, volume]) => {
      if (volume > pocVolume) {
        pocVolume = volume;
        pocPrice = parseFloat(price);
      }
    });

    // حساب Value Area (70% من الفوليوم)
    const sortedPrices = Object.entries(profile)
      .sort((a, b) => b[1] - a[1])
      .map(([price, volume]) => ({ price: parseFloat(price), volume }));

    let accumulatedVolume = 0;
    const targetVolume = totalVolume * 0.7;
    const valueAreaPrices = [];

    for (const { price, volume } of sortedPrices) {
      valueAreaPrices.push(price);
      accumulatedVolume += volume;
      if (accumulatedVolume >= targetVolume) break;
    }

    const valueAreaHigh =
      valueAreaPrices.length > 0
        ? valueAreaPrices.reduce((max, p) => Math.max(max, p), -Infinity)
        : 0;
    const valueAreaLow =
      valueAreaPrices.length > 0
        ? valueAreaPrices.reduce((min, p) => Math.min(min, p), Infinity)
        : 0;

    this.volumeProfile = profile;
    this.priceOCArea = pocPrice;
    this.valueArea = {
      high: valueAreaHigh,
      low: valueAreaLow,
      poc: pocPrice,
    };

    return {
      profile,
      pocPrice,
      pocVolume,
      valueArea: this.valueArea,
      totalVolume,
    };
  }
}

module.exports = VolumeProfileAnalyzer;
