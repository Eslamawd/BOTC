/**
 * 💾 DatabaseManager - مدير قاعدة البيانات (SQLite)
 *
 * يخزن:
 * 1. التحليلات (analyses) - كل تحليل للسوق
 * 2. الصفقات (trades) - تفاصيل كل صفقة
 * 3. الأداء (performance) - إحصائيات النجاح
 * 4. الأنماط (patterns) - الأنماط الناجحة
 *
 * الهدف: الـ AI يتعلم من البيانات التاريخية
 *
 * ✅ تحسينات:
 * - استخدام SQLite بدلاً من JSON للأداء الأفضل
 * - Error handling محسّن
 * - Thread-safe operations
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class DatabaseManager {
  constructor(dataDir = "data") {
    this.dataDir = path.join(process.cwd(), dataDir);
    this.dbPath = path.join(this.dataDir, "trading_bot.db");
    this.db = null;
    this.initialized = false;
  }

  /**
   * 🚀 تهيئة قاعدة البيانات
   */
  async initialize() {
    try {
      // إنشاء مجلد data إذا لم يكن موجود
      const fs = require("fs");
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // اتصال بقاعدة البيانات
      this.db = await this.openDatabase();

      // إنشاء الجداول
      await this.createTables();

      this.initialized = true;

      // عرض الإحصائيات
      const stats = await this.getStats();
      console.log(`✅ SQLite Database initialized successfully`);
      console.log(
        `   📊 Analyses: ${stats.totalAnalyses}, Trades: ${stats.totalTrades}, Patterns: ${stats.totalPatterns}`,
      );
    } catch (error) {
      console.error("❌ Database initialization error:", error.message);
      throw error;
    }
  }

  /**
   * فتح اتصال بقاعدة البيانات
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🔗 Connected to SQLite database: ${this.dbPath}`);
          resolve(db);
        }
      });
    });
  }

  /**
   * إنشاء الجداول
   */
  async createTables() {
    const createAnalysesTable = `
      CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        symbol TEXT NOT NULL,
        signal TEXT NOT NULL,
        confidence REAL NOT NULL,
        price REAL NOT NULL,
        indicators TEXT,
        orderBook TEXT,
        whale INTEGER DEFAULT 0,
        volume TEXT,
        symbolicAI TEXT,
        actualOutcome TEXT,
        profitLoss REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createTradesTable = `
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        entryPrice REAL NOT NULL,
        exitPrice REAL,
        quantity REAL NOT NULL,
        stopLoss REAL,
        takeProfit REAL,
        confidence REAL,
        analysisId INTEGER,
        status TEXT DEFAULT 'OPEN',
        profitLoss REAL,
        profitLossPercent REAL,
        closedAt TEXT,
        reason TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysisId) REFERENCES analyses(id)
      )
    `;

    const createPatternsTable = `
      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        confidence REAL NOT NULL,
        indicators TEXT,
        profit REAL NOT NULL,
        occurrences INTEGER DEFAULT 1,
        avgProfit REAL NOT NULL,
        lastSeen TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createPerformanceTable = `
      CREATE TABLE IF NOT EXISTS performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        totalTrades INTEGER DEFAULT 0,
        winningTrades INTEGER DEFAULT 0,
        losingTrades INTEGER DEFAULT 0,
        winRate REAL DEFAULT 0,
        totalProfit REAL DEFAULT 0,
        totalLoss REAL DEFAULT 0,
        netProfit REAL DEFAULT 0,
        lastUpdated TEXT NOT NULL,
        UNIQUE(symbol)
      )
    `;

    // إنشاء الجداول
    await this.runQuery(createAnalysesTable);
    await this.runQuery(createTradesTable);
    await this.runQuery(createPatternsTable);
    await this.runQuery(createPerformanceTable);

    // إنشاء Indexes للأداء
    await this.runQuery(
      `CREATE INDEX IF NOT EXISTS idx_analyses_symbol ON analyses(symbol)`,
    );
    await this.runQuery(
      `CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(timestamp)`,
    );
    await this.runQuery(
      `CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)`,
    );
    await this.runQuery(
      `CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)`,
    );
    await this.runQuery(
      `CREATE INDEX IF NOT EXISTS idx_patterns_symbol ON patterns(symbol)`,
    );
  }

  /**
   * تنفيذ استعلام (Query Helper)
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * جلب صف واحد
   */
  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * جلب كل الصفوف
   */
  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * 📊 حفظ تحليل جديد
   */
  async saveAnalysis(analysis) {
    if (!this.initialized) {
      console.warn("⚠️ Database not initialized, skipping saveAnalysis");
      return null;
    }

    try {
      const sql = `
        INSERT INTO analyses (timestamp, symbol, signal, confidence, price, indicators, orderBook, whale, volume, symbolicAI)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // COMPACT: Keep only essential fields (reduce from 100+ KB to <5 KB per record)
      const compactOB = analysis.orderBook
        ? {
            spread: analysis.orderBook.spread,
            imbalance: analysis.orderBook.imbalance,
          }
        : null;

      const compactVol = analysis.volume
        ? {
            ratio: analysis.volume.ratio,
          }
        : null;

      const compactAI = analysis.symbolicAI
        ? {
            decision: analysis.symbolicAI.decision,
            confidence: analysis.symbolicAI.confidence,
          }
        : null;

      const params = [
        new Date().toISOString(),
        analysis.symbol,
        analysis.signal,
        analysis.confidence,
        analysis.currentPrice,
        JSON.stringify(analysis.indicators),
        JSON.stringify(compactOB), // 50KB -> 0.5KB
        analysis.whale ? 1 : 0,
        JSON.stringify(compactVol), // 10KB -> 0.3KB
        JSON.stringify(compactAI), // 50KB -> 1KB
      ];

      const result = await this.runQuery(sql, params);
      return result.lastID;
    } catch (error) {
      console.error("❌ Error saving analysis:", error.message);
      return null;
    }
  }

  /**
   * 💰 حفظ صفقة جديدة
   */
  async saveTrade(trade) {
    if (!this.initialized) {
      console.warn("⚠️ Database not initialized, skipping saveTrade");
      return null;
    }

    try {
      const sql = `
        INSERT INTO trades (timestamp, symbol, side, entryPrice, exitPrice, quantity, stopLoss, takeProfit, confidence, analysisId, status, profitLoss, profitLossPercent, closedAt, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        new Date().toISOString(),
        trade.symbol,
        trade.side,
        trade.entryPrice,
        trade.exitPrice || null,
        trade.quantity,
        trade.stopLoss,
        trade.takeProfit,
        trade.confidence,
        trade.analysisId || null,
        trade.status || "OPEN",
        trade.profitLoss || null,
        trade.profitLossPercent || null,
        trade.closedAt || null,
        trade.reason || null,
      ];

      const result = await this.runQuery(sql, params);

      // تحديث التحليل المرتبط
      if (trade.analysisId && trade.profitLoss !== null) {
        await this.updateAnalysisOutcome(trade.analysisId, trade);
      }

      return result.lastID;
    } catch (error) {
      console.error("❌ Error saving trade:", error.message);
      return null;
    }
  }

  /**
   * ✅ إغلاق صفقة موجودة (UPDATE) بدلاً من إدراج سجل جديد
   */
  async closeTradeRecord(tradeId, closeData) {
    if (!this.initialized || !tradeId) return null;

    try {
      const sql = `
        UPDATE trades
        SET status = 'CLOSED',
            exitPrice = ?,
            profitLoss = ?,
            profitLossPercent = ?,
            closedAt = ?,
            reason = ?
        WHERE id = ? AND status = 'OPEN'
      `;

      const result = await this.runQuery(sql, [
        closeData.exitPrice,
        closeData.profitLoss,
        closeData.profitLossPercent,
        closeData.closedAt || new Date().toISOString(),
        closeData.reason || null,
        tradeId,
      ]);

      // ✅ مهم للتعلّم: تحديث نتيجة التحليل المرتبط حتى مع مسار UPDATE
      if (result.changes > 0 && closeData.profitLoss !== null) {
        let analysisId = closeData.analysisId || null;

        if (!analysisId) {
          const row = await this.getQuery(
            `SELECT analysisId FROM trades WHERE id = ?`,
            [tradeId],
          );
          analysisId = row?.analysisId || null;
        }

        if (analysisId) {
          await this.updateAnalysisOutcome(analysisId, {
            profitLoss: closeData.profitLoss,
          });
        }
      }

      return result.changes > 0;
    } catch (error) {
      console.error("❌ Error closing trade record:", error.message);
      return false;
    }
  }

  /**
   * 🔄 تحديث نتيجة التحليل بعد إغلاق الصفقة
   */
  async updateAnalysisOutcome(analysisId, trade) {
    if (!this.initialized) return;

    try {
      const sql = `
        UPDATE analyses 
        SET actualOutcome = ?, profitLoss = ? 
        WHERE id = ?
      `;

      const outcome = trade.profitLoss > 0 ? "WIN" : "LOSS";
      await this.runQuery(sql, [outcome, trade.profitLoss, analysisId]);
    } catch (error) {
      console.error("❌ Error updating analysis outcome:", error.message);
    }
  }

  /**
   * 📈 تحديث إحصائيات الأداء
   */
  async updatePerformance(trade) {
    if (!this.initialized) return;

    try {
      const symbol = trade.symbol;

      // جلب الإحصائيات الحالية
      const current = await this.getQuery(
        `SELECT * FROM performance WHERE symbol = ?`,
        [symbol],
      );

      if (current) {
        // تحديث موجود
        const totalTrades = current.totalTrades + 1;
        const winningTrades =
          current.winningTrades + (trade.profitLoss > 0 ? 1 : 0);
        const losingTrades =
          current.losingTrades + (trade.profitLoss <= 0 ? 1 : 0);
        const totalProfit =
          current.totalProfit + (trade.profitLoss > 0 ? trade.profitLoss : 0);
        const totalLoss =
          current.totalLoss +
          (trade.profitLoss <= 0 ? Math.abs(trade.profitLoss) : 0);
        const winRate = (winningTrades / totalTrades) * 100;
        const netProfit = totalProfit - totalLoss;

        const sql = `
          UPDATE performance 
          SET totalTrades = ?, winningTrades = ?, losingTrades = ?, winRate = ?, 
              totalProfit = ?, totalLoss = ?, netProfit = ?, lastUpdated = ?
          WHERE symbol = ?
        `;

        await this.runQuery(sql, [
          totalTrades,
          winningTrades,
          losingTrades,
          winRate,
          totalProfit,
          totalLoss,
          netProfit,
          new Date().toISOString(),
          symbol,
        ]);
      } else {
        // إنشاء جديد
        const sql = `
          INSERT INTO performance (symbol, totalTrades, winningTrades, losingTrades, winRate, totalProfit, totalLoss, netProfit, lastUpdated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const isWin = trade.profitLoss > 0;
        await this.runQuery(sql, [
          symbol,
          1,
          isWin ? 1 : 0,
          isWin ? 0 : 1,
          isWin ? 100 : 0,
          isWin ? trade.profitLoss : 0,
          isWin ? 0 : Math.abs(trade.profitLoss),
          trade.profitLoss,
          new Date().toISOString(),
        ]);
      }
    } catch (error) {
      console.error("❌ Error updating performance:", error.message);
    }
  }

  /**
   * 🧠 حفظ نمط ناجح
   */
  async saveSuccessfulPattern(pattern) {
    return this.savePatternOutcome(pattern);
  }

  /**
   * 🧠 حفظ ناتج نمط (ناجح أو خاسر) للتعلم المتوازن
   */
  async savePatternOutcome(pattern) {
    if (!this.initialized) return;

    try {
      if (pattern?.profit === null || pattern?.profit === undefined) {
        return;
      }

      const isLoss = pattern.profit < 0;
      // نحفظ الخسائر دائمًا للتعلم العكسي، والأرباح فقط إذا كانت ذات معنى
      if (!isLoss && pattern.profit < 2) {
        return;
      }

      // البحث عن نمط مشابه
      const sql = `
        SELECT * FROM patterns 
        WHERE symbol = ? AND type = ? AND ABS(confidence - ?) < 5
        LIMIT 1
      `;

      const existing = await this.getQuery(sql, [
        pattern.symbol,
        pattern.type,
        pattern.confidence,
      ]);

      if (existing) {
        const newOccurrences = existing.occurrences + 1;
        const newAvgProfit =
          (existing.avgProfit * existing.occurrences + pattern.profit) /
          newOccurrences;

        const updateSql = `
          UPDATE patterns 
          SET occurrences = ?, avgProfit = ?, lastSeen = ?
          WHERE id = ?
        `;

        await this.runQuery(updateSql, [
          newOccurrences,
          newAvgProfit,
          new Date().toISOString(),
          existing.id,
        ]);
      } else {
        // إضافة نمط جديد (ناجح أو خاسر)
        const insertSql = `
          INSERT INTO patterns (timestamp, symbol, type, confidence, indicators, profit, occurrences, avgProfit, lastSeen)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await this.runQuery(insertSql, [
          new Date().toISOString(),
          pattern.symbol,
          pattern.type,
          pattern.confidence,
          JSON.stringify(pattern.indicators),
          pattern.profit,
          1,
          pattern.profit,
          new Date().toISOString(),
        ]);

        const sign = pattern.profit >= 0 ? "+" : "";
        const label = pattern.profit >= 0 ? "💎" : "⚠️";
        console.log(
          `${label} Pattern saved (${pattern.symbol}): ${sign}${pattern.profit.toFixed(2)}% profit`,
        );
      }
    } catch (error) {
      console.error("❌ Error saving pattern outcome:", error.message);
    }
  }

  /**
   * 📚 الحصول على بيانات التعلم للـ AI
   */
  async getLearningData(symbol = null, limit = 1000) {
    if (!this.initialized) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        analyses: [],
        patterns: [],
        performance: {},
      };
    }

    try {
      let sql = `
        SELECT * FROM analyses 
        WHERE actualOutcome IS NOT NULL
      `;
      const params = [];

      if (symbol) {
        sql += ` AND symbol = ?`;
        params.push(symbol);
      }

      sql += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const analyses = await this.allQuery(sql, params);

      // Parse JSON fields
      const parsedAnalyses = analyses.map((a) => ({
        ...a,
        indicators: JSON.parse(a.indicators || "{}"),
        orderBook: JSON.parse(a.orderBook || "null"),
        volume: JSON.parse(a.volume || "null"),
        symbolicAI: JSON.parse(a.symbolicAI || "null"),
      }));

      // جلب الأنماط
      const patternsSql = symbol
        ? `SELECT * FROM patterns WHERE symbol = ?`
        : `SELECT * FROM patterns`;
      const patternsParams = symbol ? [symbol] : [];
      const patterns = await this.allQuery(patternsSql, patternsParams);

      const parsedPatterns = patterns.map((p) => ({
        ...p,
        indicators: JSON.parse(p.indicators || "{}"),
      }));

      // حساب الإحصائيات
      const wins = parsedAnalyses.filter(
        (a) => a.actualOutcome === "WIN",
      ).length;
      const losses = parsedAnalyses.filter(
        (a) => a.actualOutcome === "LOSS",
      ).length;

      return {
        total: parsedAnalyses.length,
        wins,
        losses,
        analyses: parsedAnalyses,
        patterns: parsedPatterns,
        performance: await this.getPerformanceStats(),
      };
    } catch (error) {
      console.error("❌ Error getting learning data:", error.message);
      return {
        total: 0,
        wins: 0,
        losses: 0,
        analyses: [],
        patterns: [],
        performance: {},
      };
    }
  }

  /**
   * 📊 إحصائيات سريعة
   */
  async getStats() {
    if (!this.initialized) {
      return {
        totalAnalyses: 0,
        totalTrades: 0,
        totalPatterns: 0,
        performance: {},
      };
    }

    try {
      const analyses = await this.getQuery(
        `SELECT COUNT(*) as count FROM analyses`,
      );
      const trades = await this.getQuery(
        `SELECT COUNT(*) as count FROM trades`,
      );
      const patterns = await this.getQuery(
        `SELECT COUNT(*) as count FROM patterns`,
      );

      return {
        totalAnalyses: analyses?.count || 0,
        totalTrades: trades?.count || 0,
        totalPatterns: patterns?.count || 0,
        performance: await this.getPerformanceStats(),
      };
    } catch (error) {
      console.error("❌ Error getting stats:", error.message);
      return {
        totalAnalyses: 0,
        totalTrades: 0,
        totalPatterns: 0,
        performance: {},
      };
    }
  }

  /**
   * 📈 إحصائيات الأداء
   */
  async getPerformanceStats() {
    if (!this.initialized) return {};

    try {
      const rows = await this.allQuery(`SELECT * FROM performance`);
      const stats = {};

      rows.forEach((row) => {
        stats[row.symbol] = {
          total: row.totalTrades,
          wins: row.winningTrades,
          losses: row.losingTrades,
          winRate: row.winRate,
          profit: row.netProfit,
        };
      });

      return stats;
    } catch (error) {
      console.error("❌ Error getting performance stats:", error.message);
      return {};
    }
  }

  /**
   * 🔥 حذف السجلات الخاسرة فقط (analyses و trades)
   * يبقي الناجحة للتعلم منها
   */
  async deleteLosingRecords() {
    if (!this.initialized) return;

    try {
      console.log(
        "🛡️ deleteLosingRecords disabled: preserving losing + winning data for AI learning and penalty modeling",
      );
    } catch (error) {
      console.error("❌ Error deleting losing records:", error.message);
    }
  }

  /**
   * 📊 تنظيف البيانات القديمة حسب التاريخ
   */
  async cleanOldData(daysToKeep = 20) {
    if (!this.initialized) return;

    if (!Number.isFinite(daysToKeep) || daysToKeep <= 0) {
      console.log("🧹 Data cleanup skipped (daysToKeep <= 0)");
      return;
    }

    try {
      const startTime = Date.now();
      const cutoffModifier = `-${daysToKeep} days`;

      // حذف البيانات القديمة من الجداول الثلاثة
      const analysesResult = await this.runQuery(
        `DELETE FROM analyses WHERE julianday(timestamp) < julianday('now', ?)`,
        [cutoffModifier],
      );

      const tradesResult = await this.runQuery(
        `DELETE FROM trades WHERE julianday(timestamp) < julianday('now', ?)`,
        [cutoffModifier],
      );

      const patternsResult = await this.runQuery(
        `DELETE FROM patterns WHERE julianday(lastSeen) < julianday('now', ?)`,
        [cutoffModifier],
      );

      // VACUUM لتحرير المساحة على القرص
      const vacuumResult = await this.runQuery("VACUUM");

      const duration = Date.now() - startTime;
      const totalDeleted =
        analysesResult.changes + tradesResult.changes + patternsResult.changes;

      console.log(
        `✅ Cleanup complete (${duration}ms) | Deleted ${totalDeleted} records:`,
      );
      console.log(
        `   📊 Analyses: ${analysesResult.changes} | 💼 Trades: ${tradesResult.changes} | 🧠 Patterns: ${patternsResult.changes}`,
      );
      console.log(`   💾 VACUUM: Database compacted for better disk space\n`);
    } catch (error) {
      console.error("❌ Error cleaning old data:", error.message);
    }
  }

  /**
   * 🔒 إغلاق الاتصال بقاعدة البيانات
   */
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else {
            console.log("🔒 Database connection closed");
            resolve();
          }
        });
      });
    }
  }
}

module.exports = DatabaseManager;
