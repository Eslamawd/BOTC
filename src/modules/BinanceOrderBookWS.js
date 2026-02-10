const WebSocket = require("ws");

class BinanceOrderBookWS {
  constructor() {
    this.ws = {};
    this.orderBooks = {};
    this.wsHealth = {};
  }

  // ==================== WebSocket ====================
  connectWebSockets(symbols) {
    symbols.forEach((symbol) => {
      this.connectSingleSymbolWS(symbol);
    });
  }

  connectSingleSymbolWS(symbol) {
    const streamName = symbol.replace("/", "").toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}@depth20@100ms`;

    console.log(`🔗 Connecting WebSocket for ${symbol}: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    // حالة صحة الـ WebSocket لكل زوج
    if (!this.wsHealth) this.wsHealth = {};
    this.wsHealth[symbol] = {
      stable: false,
      ticks: 0,
      lastUpdate: 0,
      lastBestBid: null,
    };

    ws.on("open", () => {
      console.log(`✅ WebSocket opened for ${symbol}`);
    });

    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data);

        // ✅ حماية من البيانات الناقصة
        if (
          !parsed.bids ||
          !parsed.asks ||
          parsed.bids.length < 10 ||
          parsed.asks.length < 10
        ) {
          console.warn(`⚠️ Invalid OrderBook data for ${symbol}`);
          return;
        }

        const bids = parsed.bids.map((b) => [Number(b[0]), Number(b[1])]);
        const asks = parsed.asks.map((a) => [Number(a[0]), Number(a[1])]);

        const bestBid = bids[0][0];
        const health = this.wsHealth[symbol];

        // ⛔ تجاهل التحديثات المتجمدة (السعر لم يتغير)
        if (health.lastBestBid === bestBid) return;

        health.lastBestBid = bestBid;
        health.lastUpdate = Date.now();
        health.ticks++;

        console.log(
          `📊 [${symbol}] Tick #${health.ticks} | Best Bid: ${bestBid}`,
        );

        // ✅ نعتبر السوق مستقر بعد 3 تحديثات صحيحة
        if (health.ticks >= 3 && !health.stable) {
          health.stable = true;
          console.log(`✅ WebSocket stable for ${symbol} (3+ ticks received)`);
        }

        this.orderBooks[symbol] = {
          bids,
          asks,
          timestamp: Date.now(),
          simulated: false,
          source: "ws",
        };
      } catch (err) {
        console.error(`❌ Error parsing message for ${symbol}:`, err.message);
      }
    });

    ws.on("error", (err) => {
      console.error(`❌ WS Error for ${symbol}:`, err.message);
      if (this.wsHealth[symbol]) {
        this.wsHealth[symbol].stable = false;
        this.wsHealth[symbol].ticks = 0;
      }
      ws.close();
    });

    ws.on("close", () => {
      console.log(`🔄 Reconnecting WebSocket for ${symbol}...`);
      if (this.wsHealth[symbol]) {
        this.wsHealth[symbol].stable = false;
        this.wsHealth[symbol].ticks = 0;
      }
      setTimeout(() => this.connectSingleSymbolWS(symbol), 5000);
    });

    this.ws[symbol] = ws;
  }

  /**
   * جلب آخر Order Book لرمز معين
   */
  getOrderBook(symbol) {
    return this.orderBooks[symbol] || null;
  }

  /**
   * التحقق من استقرار WebSocket
   */
  isReady(symbol) {
    return this.wsHealth[symbol]?.stable || false;
  }

  /**
   * التحقق من صحة الاتصال
   */
  isHealthy(symbol) {
    const health = this.wsHealth[symbol];
    if (!health) return false;
    const timeSinceUpdate = Date.now() - health.lastUpdate;
    return timeSinceUpdate < 10000; // أقل من 10 ثواني منذ آخر تحديث
  }

  /**
   * Backward compatibility: subscribe() calls connectWebSockets()
   */
  subscribe(symbol) {
    if (!Array.isArray(this._subscribedSymbols)) {
      this._subscribedSymbols = [];
    }
    if (!this._subscribedSymbols.includes(symbol)) {
      this._subscribedSymbols.push(symbol);
    }
    this.connectSingleSymbolWS(symbol);
  }
}

module.exports = BinanceOrderBookWS;
