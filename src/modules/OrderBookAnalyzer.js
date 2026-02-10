/**
 * OrderBookAnalyzer: مسؤول عن تحليل Order Book والسيولة
 * Order Book Analysis Module - analyzes liquidity and dynamics
 */
class OrderBookAnalyzer {
  /**
   * تحليل ديناميكيات Order Book
   * Analyze order book dynamics (imbalance, walls, liquidity)
   */
  analyzeOrderBookDynamics(symbol, orderBook) {
    if (!orderBook?.bids || !orderBook?.asks || orderBook.bids.length < 15) {
      return { score: 0, imbalance: 0, reasons: [], strongWall: null };
    }

    // حساب حجم الطلبات والعروض (Bid/Ask Volume)
    const bidVolume = orderBook.bids
      .slice(0, 15)
      .reduce((s, b) => s + b[0] * b[1], 0);
    const askVolume = orderBook.asks
      .slice(0, 15)
      .reduce((s, a) => s + a[0] * a[1], 0);
    const imbalance = askVolume > 0 ? bidVolume / askVolume : 0;

    let score = 0;
    const reasons = [];

    // تقييم عدم التوازن (Imbalance Scoring)
    if (imbalance > 2.5 && imbalance <= 8) {
      score += 20;
      reasons.push(`🌊 سيولة شراء (Imbalance: ${imbalance.toFixed(1)}x)`);
    } else if (imbalance > 8) {
      score += 5;
    }

    // اكتشاف الجدران الكبيرة (Detect Support Walls)
    let wallThreshold = 100000;
    if (symbol.includes("BTC")) wallThreshold = 1500000;
    else if (symbol.includes("ETH")) wallThreshold = 700000;
    else if (symbol.includes("SOL")) wallThreshold = 250000;

    let bestCluster = { price: 0, volume: 0, count: 0 };

    // ابحث عن تجمعات السيولة الكبيرة
    for (let i = 0; i < 10; i++) {
      const price = orderBook.bids[i][0];
      const volume = price * orderBook.bids[i][1];

      if (volume > wallThreshold * 0.7) {
        let clusterVol = 0;
        let clusterCount = 0;

        orderBook.bids.slice(0, 15).forEach((b) => {
          if (Math.abs(b[0] - price) / price < 0.001) {
            clusterVol += b[0] * b[1];
            clusterCount++;
          }
        });

        if (clusterVol > bestCluster.volume) {
          bestCluster = { price, volume: clusterVol, count: clusterCount };
        }
      }
    }

    // تقييم الجدران القوية
    if (bestCluster.volume > wallThreshold) {
      score += 20;
      const formattedVol = (bestCluster.volume / 1000).toFixed(0) + "K";
      reasons.push(
        `🧱 تكتل سيولة (${bestCluster.count} جدران) بقوة $${formattedVol}`,
      );
    }

    return {
      score,
      imbalance,
      reasons,
      strongWall: bestCluster.volume > 0 ? bestCluster : null,
    };
  }

  /**
   * تحليل بسيط للعرض والطلب
   * Simple bid/ask analysis
   */
  getSpread(orderBook) {
    if (!orderBook?.bids?.[0] || !orderBook?.asks?.[0]) return null;

    const bestBid = orderBook.bids[0][0];
    const bestAsk = orderBook.asks[0][0];
    return (bestAsk - bestBid) / bestBid;
  }

  /**
   * احصل على أفضل أسعار العرض والطلب
   * Get best bid/ask prices
   */
  getBestPrices(orderBook) {
    if (!orderBook?.bids?.[0] || !orderBook?.asks?.[0]) return null;

    return {
      bestBid: orderBook.bids[0][0],
      bestAsk: orderBook.asks[0][0],
    };
  }
}

module.exports = OrderBookAnalyzer;
