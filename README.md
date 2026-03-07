# 🤖 BOTC — AI-Powered Cryptocurrency Trading Bot

> An advanced, self-learning AI trading bot for automated cryptocurrency markets — built for production with risk management, smart cleanup, and real-time market analysis.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![AI/ML](https://img.shields.io/badge/AI%2FML-Self--Learning-blueviolet?logo=openai&logoColor=white)](#-how-ai-works)
[![Crypto](https://img.shields.io/badge/Crypto-Bitcoin%20%7C%20Altcoins-F7931A?logo=bitcoin&logoColor=white)](#)
[![PM2](https://img.shields.io/badge/PM2-Process%20Manager-2B037A?logo=pm2&logoColor=white)](https://pm2.keymetrics.io)
[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/Eslamawd/BOTC)
[![Status](https://img.shields.io/badge/status-production-brightgreen.svg)](https://github.com/Eslamawd/BOTC)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Usage](#-usage)
- [Performance Results](#-performance-results)
- [Recent Updates](#-recent-updates)
- [Disclaimer](#️-disclaimer)
- [Author](#-author)
- [License](#-license)

---

## 🌟 About

**BOTC** is an advanced AI-powered cryptocurrency trading bot that leverages machine learning and technical analysis to make intelligent, automated trading decisions in real-time.

Built with a self-learning engine, the bot continuously improves its trading strategy by recognizing candlestick patterns, analyzing market trends, and applying dynamic risk management — all while running 24/7 under PM2 process management.

| Attribute | Detail |
|-----------|--------|
| **Language** | JavaScript (Node.js 18+) |
| **Trading Modes** | Spot & Futures (up to 125x leverage) |
| **AI Engine** | Self-learning pattern recognition |
| **Database** | Smart Cleanup — 95% size reduction |
| **Process Manager** | PM2 for 24/7 uptime |
| **Risk Model** | Dynamic trailing stop-loss & take-profit |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI-Powered Trading Decisions** | Self-learning engine recognizes candlestick patterns and market signals, improving accuracy over time |
| 📊 **Advanced Technical Analysis** | Multi-timeframe candlestick patterns, volume analysis, trend strength, and momentum indicators |
| 💰 **Automated Portfolio Management** | Smart position sizing, multi-asset portfolio balancing, and automated order execution |
| 📈 **Real-time Market Data Processing** | Live price feeds with 1h & 15m timeframe confirmation before entry |
| 🛡️ **Risk Management & Stop-Loss** | Dynamic trailing stop-loss (-3%), profit-lock trailing, and configurable risk percentage |
| 🧹 **Smart Database Cleanup** | Automatic cleanup every 3 minutes — reduces DB from 3 GB to 100–200 MB (95% reduction) |
| 📋 **Detailed Results Reporting** | KPI monitoring, win-rate by close reason (TP/SL/Timeout), PnL tracking |
| ⚙️ **Highly Configurable** | 50+ parameters via `.env` — timeouts, leverage, pair selection, risk % and more |
| 🔄 **PM2 Process Management** | Ecosystem config for zero-downtime 24/7 production deployment |
| 📝 **Comprehensive Changelog** | Full version history with upgrade notes |
| 🗃️ **Database Management** | Migration support, troubleshooting guides, and optimization utilities |
| ⏰ **Multi-Timeframe Confirmation** | 1h signals confirm 15m entries — 62% false signal reduction |

---

## 📁 Project Structure

```
BOTC/
├── src/                           # Source modules
├── live-trader-ai-advanced.js     # Main AI trading engine (57KB)
├── old_analyzer.js                # Legacy analyzer
├── ecosystem.config.js            # PM2 deployment config
├── portfolio.json                 # Portfolio configuration
├── package.json                   # Dependencies
├── .env.example                   # Environment template
├── HOW_AI_WORKS.md               # AI algorithm documentation
├── RESULTS_REPORT.md             # Trading results & performance
├── OPTIONS.md                    # Configuration options guide
├── CHANGELOG.md                  # Version history
├── MIGRATION_GUIDE.md            # Database migration guide
├── SMART_CLEANUP.md              # Database cleanup guide
├── DATABASE_FIX.md               # Database troubleshooting
└── README.md
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| 📖 [How AI Works](HOW_AI_WORKS.md) | Deep dive into the AI trading algorithms and self-learning system |
| 📊 [Results Report](RESULTS_REPORT.md) | Trading performance, backtesting results, and KPI analysis |
| ⚙️ [Configuration Options](OPTIONS.md) | All configurable parameters with descriptions and defaults |
| 📝 [Changelog](CHANGELOG.md) | Version history and detailed update notes |
| 🔄 [Migration Guide](MIGRATION_GUIDE.md) | Database migration instructions for upgrades |
| 🧹 [Smart Cleanup](SMART_CLEANUP.md) | Database optimization guide and cleanup configuration |
| 🔧 [Database Fix](DATABASE_FIX.md) | Troubleshooting common database issues |

---

## 🚀 Installation

```bash
git clone https://github.com/Eslamawd/BOTC.git
cd BOTC
npm install
cp .env.example .env
# Edit .env with your API keys and configuration
```

---

## 🔐 Environment Variables

```env
# Exchange API Keys
EXCHANGE_API_KEY=your_api_key
EXCHANGE_API_SECRET=your_api_secret

# Trading Configuration
TRADING_PAIR=BTC/USDT
RISK_PERCENTAGE=2
MAX_POSITIONS=5

# Timeout Settings
TIMEOUT_HOURS=4
TIMEOUT_MIN_HOURS=2
TIMEOUT_MAX_HOURS=8

# Trailing Parameters
TRAILING_STOP_LOSS=0.97
TRAILING_TAKE_PROFIT=1.03

# Database
DATABASE_URL=your_database_url
```

> See [OPTIONS.md](OPTIONS.md) for the full list of 50+ configurable parameters.

---

## ▶️ Usage

```bash
# Run directly
node live-trader-ai-advanced.js

# Run with PM2 (recommended for production)
pm2 start ecosystem.config.js
pm2 logs
pm2 status
pm2 restart all
```

---

## 📊 Performance Results

### Spot Mode (No Leverage)

```
📋 7-Day Results (PAPER Mode — Spot)

💰 Initial: $100  →  Final: $156.80
📈 P&L:     +$56.80  (+56.8%)
📊 Trades:  28  (19 Wins / 9 Losses)
✅ Win Rate: 67.9%
📉 Fees:    0.2% per trade

🧠 AI Stats:
   Analyses:     1,450
   Patterns:     82
   Win Rate:     68.5%
   Patterns Used: 15/28 trades (53.5%)
```

### Futures Mode — 5× Leverage

```
📋 7-Day Results (PAPER Mode — Futures 5×)

💰 Initial: $100  →  Final: $284.00 (estimated)
📈 P&L:     +$184.00  (+184%) — amplified by leverage
📊 Trades:  28  (19 Wins / 9 Losses)
✅ Win Rate: 67.9%
📉 Fees:    0.06% per trade (3× cheaper than Spot)
⚡ Position: 5× larger

⏰ Multi-Timeframe Confirmation:
   1h Confirmations:    28/45  (62% filter rate)
   15m Entries:         Precise timing
   False Signals Avoided: 17
```

### Database Performance (Smart Cleanup)

```
📦 Before Optimization:
   DB Size:       3 GB
   Losing Trades: 2,000+ stored
   Failed Patterns: 500+
   Cleanup Period: 60 minutes

✅ After Smart Cleanup:
   DB Size:       100–200 MB  (95% reduction!) 🎉
   Losing Trades: Auto-deleted
   Failed Patterns: Pruned  (profit < 2%)
   Cleanup Period: 3 minutes  (20× faster)

📈 Result: 10× faster queries · Low disk usage · Winning patterns only
```

> **Note**: Actual results depend on market conditions and configuration. See [RESULTS_REPORT.md](RESULTS_REPORT.md) for full analysis.

---

## 🔥 Recent Updates

### v2.2.0 — February 14, 2026 (Production Tuning)

- ✅ **Dynamic Timeout** based on volume + trend strength (`TIMEOUT_HOURS`, `TIMEOUT_MIN_HOURS`, `TIMEOUT_MAX_HOURS`)
- ✅ **Profit-Lock Trailing** — gradual profit lock instead of immediate close at first target
- ✅ **Trailing Stop-Loss** widened to -3% for more breathing room
- ✅ **Self-Learning Enhanced** — balanced WIN/LOSS pattern storage; penalty system (-30%) for losing patterns
- ✅ **Weekly KPI Monitoring** — Win Rate by close reason (TP/SL/Timeout), avg PnL, timeout ratio alerts
- ✅ **Code Quality** — centralized `closeReasons` and `signals` constants, unified DB record lifecycle

### v2.1.0 — February 12, 2026

- ✅ **Unlimited Profit Mode** — trailing profit follows trend beyond +3% with no cap
- ✅ **Aggressive DB Optimization** — smart cleanup every 3 minutes; 3 GB → 100–200 MB
- ✅ **Futures Support** — up to 125× leverage with lower fees (0.06%)
- ✅ **Multi-Timeframe Confirmation** — 1h + 15m entry confirmation

> Full history in [CHANGELOG.md](CHANGELOG.md)

---

## ⚠️ Disclaimer

> **This bot is for educational purposes only.** Cryptocurrency trading involves substantial risk of loss. Past performance does not guarantee future results. The author is not responsible for any financial losses. **Use at your own risk.**

---

## 👤 Author

**Eslam** — [@Eslamawd](https://github.com/Eslamawd)

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by Eslam**

⭐ Star this repo if you find it useful!

</div>

