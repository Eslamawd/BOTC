const fs = require("fs");
const path = require("path");

class PortfolioManager {
  constructor(config, mode) {
    this.config = config;
    this.mode = mode;
    this.portfolio = {
      balance: config.INITIAL_BALANCE,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      netProfit: 0,
      trades: [],
    };
    this.portfolioFile = path.join(process.cwd(), "portfolio.json");
    this.loadPortfolio();
  }

  loadPortfolio() {
    try {
      if (fs.existsSync(this.portfolioFile)) {
        const data = JSON.parse(fs.readFileSync(this.portfolioFile, "utf8"));
        this.portfolio = { ...this.portfolio, ...data };
      }
    } catch (e) {
      console.log("⚠️ Could not load portfolio file, starting fresh");
    }
  }

  savePortfolio(balance, allTrades, symbolData, performance, initialBalance) {
    this.portfolio.balance = balance;
    this.portfolio.totalTrades = performance.trades || 0;
    this.portfolio.wins = performance.wins || 0;
    this.portfolio.losses = performance.losses || 0;
    this.portfolio.netProfit = balance - initialBalance;
    this.portfolio.trades = allTrades || [];

    try {
      fs.writeFileSync(
        this.portfolioFile,
        JSON.stringify(this.portfolio, null, 2),
      );
      console.log(
        `💼 Portfolio saved: Balance $${balance?.toFixed(2) || "N/A"} | Net P&L: $${this.portfolio.netProfit.toFixed(2)}`,
      );
    } catch (e) {
      console.log(`❌ Error saving portfolio: ${e.message}`);
    }
  }

  displaySummary() {
    console.log(`📊 Portfolio Summary:`);
    console.log(`   Balance: $${this.portfolio.balance.toFixed(2)}`);
    console.log(`   Total Trades: ${this.portfolio.totalTrades}`);
    console.log(
      `   Wins: ${this.portfolio.wins}, Losses: ${this.portfolio.losses}`,
    );
    console.log(
      `   Win Rate: ${((this.portfolio.wins / this.portfolio.totalTrades) * 100).toFixed(1)}%`,
    );
    console.log(`   Net Profit: $${this.portfolio.netProfit.toFixed(2)}`);
  }

  updatePortfolio(tradeResult) {
    this.portfolio.totalTrades++;
    if (tradeResult.profit > 0) {
      this.portfolio.wins++;
    } else {
      this.portfolio.losses++;
    }
    this.portfolio.netProfit += tradeResult.profit;
    this.portfolio.balance += tradeResult.profit;
    this.portfolio.trades.push(tradeResult);
  }
}

module.exports = PortfolioManager;
