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

  /**
   * تحليل ديناميكي للفوليوم - اختبر إذا كان هناك تراكم أو توزيع
   * Dynamic volume analysis - accumulation or distribution
   */
  analyzeVolumeSpread(recentCandles) {
    if (!recentCandles || recentCandles.length < 3) return null;

    const last3Candles = recentCandles.slice(-3);
    const volumes = last3Candles.map((c) => c[5] || 0);
    const closes = last3Candles.map((c) => c[4]);
    const opens = last3Candles.map((c) => c[1]);

    // حساب متوسط الفوليوم
    const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;

    // اختبر الاتجاه
    const priceDirection = closes[2] > opens[2] ? "BULLISH" : "BEARISH";

    // اختبر الفوليوم
    const currentVolume = volumes[2];
    const volumeStrength = currentVolume / avgVolume;

    // اختبر الحجم الحقيقي (Real Range)
    const range = Math.abs(closes[2] - opens[2]);

    // حساب On-Balance Volume المبسط
    let obv = 0;
    for (let i = 1; i < last3Candles.length; i++) {
      const prevClose = last3Candles[i - 1][4];
      const currClose = last3Candles[i][4];
      const currVolume = last3Candles[i][5] || 0;

      if (currClose > prevClose) {
        obv += currVolume;
      } else if (currClose < prevClose) {
        obv -= currVolume;
      }
    }

    // تحديد نوع الحركة
    let type = "NORMAL";
    if (volumeStrength > 1.5 && range > avgVolume * 0.0001) {
      type = priceDirection === "BULLISH" ? "ACCUMULATION" : "DISTRIBUTION";
    } else if (volumeStrength < 0.5) {
      type = "LOW_VOLUME";
    }

    return {
      currentVolume,
      averageVolume: avgVolume,
      volumeStrength,
      priceDirection,
      type,
      obv,
      range,
      isSignificant: volumeStrength > 1.3 && range > 0,
    };
  }

  /**
   * قياس قوة الاتجاه بناءً على الفوليوم والحركة
   * Measure trend strength with volume confirmation
   */
  measureTrendStrength(candles, period = 20) {
    if (!candles || candles.length < period) return null;

    const recentCandles = candles.slice(-period);
    const bullishCandles = recentCandles.filter((c) => c[4] > c[1]);
    const bearishCandles = recentCandles.filter((c) => c[4] < c[1]);

    const bullishVolume = bullishCandles.reduce(
      (sum, c) => sum + (c[5] || 0),
      0,
    );
    const bearishVolume = bearishCandles.reduce(
      (sum, c) => sum + (c[5] || 0),
      0,
    );

    const bullishRatio = bullishVolume / (bullishVolume + bearishVolume);
    const trendStrength = Math.abs(bullishRatio - 0.5) * 200; // 0-100

    return {
      bullishCandles: bullishCandles.length,
      bearishCandles: bearishCandles.length,
      bullishVolume,
      bearishVolume,
      bullishRatio,
      trendStrength: Math.min(trendStrength, 100),
      isBullish: bullishRatio > 0.55,
      isBearish: bullishRatio < 0.45,
      isNeutral: Math.abs(bullishRatio - 0.5) < 0.05,
    };
  }

  /**
   * اختبر إذا كان السعر يتحرك بعيداً عن POC (فرصة انعكاس)
   * Test if price moved far from POC (reversal opportunity)
   */
  detectPOCReversion(currentPrice) {
    if (!this.priceOCArea) return null;

    const distance = Math.abs(currentPrice - this.priceOCArea);
    const percentDistance = (distance / this.priceOCArea) * 100;

    return {
      pocPrice: this.priceOCArea,
      currentPrice,
      distance,
      percentDistance,
      farFromPOC: percentDistance > 0.5, // أبعد من 0.5%
      shouldRevert: percentDistance > 1.0, // يجب انعكاس
    };
  }

  /**
   * حساب مستويات الدعم والمقاومة من Volume Profile
   * Calculate support and resistance from volume profile
   */
  getSupportResistance() {
    if (!this.valueArea) return null;

    return {
      resistance: this.valueArea.high,
      support: this.valueArea.low,
      poc: this.valueArea.poc,
      width: this.valueArea.high - this.valueArea.low,
    };
  }

  /**
   * اختبر إذا كان الفوليوم كافياً للدخول
   * Check if volume is sufficient for entry
   */
  isVolumeSufficientForEntry(recentCandles, minRatio = 2.0) {
    if (!recentCandles || recentCandles.length < 50) return false;

    const last50Candles = recentCandles.slice(-50);
    const currentVolume = recentCandles[recentCandles.length - 1][5] || 0;
    const avgVolume =
      last50Candles.reduce((sum, c) => sum + (c[5] || 0), 0) / 50;

    const volumeRatio = currentVolume / avgVolume;

    return {
      currentVolume,
      averageVolume: avgVolume,
      volumeRatio,
      isSufficient: volumeRatio >= minRatio,
      details: {
        minRequired: avgVolume * minRatio,
        current: currentVolume,
        excess: currentVolume - avgVolume * minRatio,
      },
    };
  }
}

module.exports = VolumeProfileAnalyzer;
