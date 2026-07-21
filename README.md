# MethodMark

**A local-first desktop journal designed to become part of the trading process.**

MethodMark helps you plan, record, and review trades while the decisions are still fresh. It is meant to be used before, during, and directly after a trade, rather than trying to reconstruct everything at the end of the day.

The goal is simple: make consistent journaling easy enough that it becomes part of how you trade.

## The philosophy

MethodMark is manual by design.

It does not connect to a broker, place trades, or automatically import results. You record the important decisions yourself because that small pause creates awareness and accountability.

The app aims to keep this process quick and focused:

- Record the plan before entering.
- Capture the actual entry and risk while trading.
- Complete the exit when the trade ends.
- Review the decision while the reasoning is still clear.
- Use daily, weekly, and monthly recaps to find repeated patterns.

> Journal the decision while it is being made, not only the result after it is over.

## How to use it

### 1. Set up your trading plan

Open **Account** and create:

- A live, demo, or backtesting account.
- One or more strategies with grouped trading instruments, entry rules, stop-loss, take-profit, and invalidation rules.
- A risk plan with trade, daily, and weekly limits and goals.

The selected account and its current plan remain visible in the sidebar while you trade.

### 2. Start the journal before the trade

Open **Trades**, select **New trade**, and record the setup:

- Trading instrument.
- Strategy and planned risk.
- Market bias and setup notes.
- How confident or prepared you feel.
- A pre-trade chart screenshot.

This creates a record of what you believed before the outcome was known.

### 3. Update it at entry

When you enter the trade, add:

- Direction, entry time, and entry price.
- Position size.
- Stop loss and take profit as a price, pips, points, or ticks. MethodMark calculates the other units and saves the actual target price.
- Entry notes and screenshot.

### 4. Complete it at exit

When the trade closes, add the exit time, price, result, profit or loss, notes, and an exit screenshot.

### 5. Review it while it is fresh

Complete the trade recap soon after the trade. Record:

- Mistakes and rules broken.
- What was done well.
- The main lesson.
- What to do next time.
- A simple trade score.

Use **Recaps** at the end of the day, week, or month to review the larger pattern. Use **Dashboard** to study performance, balance, win rates, sessions, times, instruments, directions, and strategies.

## Main features

- Live, demo, and backtesting accounts.
- Reusable strategies and risk-management plans.
- Strategy target plans with fixed values, automatic risk/reward ladders, or custom SL and multiple TPs.
- Strategy-based instrument selectors across normal, System, and Backtesting trades, grouped into Forex Majors, Forex Minors, Forex Exotics, Metals, Indices, Energy, and Crypto.
- Automatic price, pip, point, and tick conversion for stop losses and take profits.
- Pre-trade, entry, exit, and recap workflow.
- Chart screenshots from TradingView, another window, clipboard, or file import.
- Calendar and weekly trade lists.
- Per-trade, daily, weekly, and monthly recaps.
- Dashboard summaries, balance history, statistics, and plan warnings.
- Global search and journal notifications.
- Local backup and restore, including saved screenshots.
- Separate official and development app data.
- Update checks for official desktop releases.

## Install the app

Download the latest installer from [GitHub Releases](https://github.com/michanthhagen-glitch/MethodMark/releases/latest).

- **Windows:** download and run the `.exe` installer.
- **macOS with Apple Silicon:** download and open the `.dmg` file.

After installation, open the app, create your account setup, and keep MethodMark available while you trade.

## Your data

MethodMark stores its journal database and screenshots locally on your computer. There is no cloud account or broker connection.

Use **Settings > Data > Create backup** regularly. A complete backup contains both the journal database and all saved chart screenshots. Restore also lives in **Settings > Data** and replaces the current journal after confirmation.

## Who it is for

MethodMark is best suited to discretionary traders who want to improve their process, discipline, and self-awareness.

It may not be the right tool if you want fully automatic broker imports or a journal that requires no input. The manual interaction is intentional because the journal is meant to influence the trading process, not only report on it later.

## Project status

The project is under active development. The current focus is a calm, fast desktop workflow that is reliable enough to use alongside real trading.

Feedback and bug reports are welcome through [GitHub Issues](https://github.com/michanthhagen-glitch/MethodMark/issues).

## Development

The app uses React, TypeScript, Vite, Tauri, and SQLite.

### Run the separate development app

```powershell
npm install
npm run desktop:dev
```

The development build has its own app identity and database, so it does not share data with the official MethodMark app.

### Useful commands

```powershell
npm run dev                 # Browser preview
npm run check               # Formatting, build, and tests
npm run desktop:build       # Build the official desktop installer
npm run desktop:build:dev-app # Build the separate development app
```

## Disclaimer

MethodMark is a record-keeping and self-review tool. It does not provide financial advice, trading signals, or guarantees. You remain responsible for your own trades and risk decisions.
