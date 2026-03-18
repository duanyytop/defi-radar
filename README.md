# DeFi Radar

AI-powered daily DeFi market intelligence report. Collects data from DeFiLlama + CoinGecko, then uses Claude to produce deep, actionable analysis for crypto investors.

Reports are automatically generated via GitHub Actions and posted as GitHub Issues at **8:00 AM Beijing time** daily.

## How It Works

```
DeFiLlama API ─┐
                ├─→ Structured Data ─→ Claude AI ─→ Market Intelligence Report
CoinGecko API ──┘
```

1. **Data collection** — Fetches protocol TVL, stablecoin supply, DEX volumes, and market prices from free APIs
2. **AI analysis** — Claude analyzes correlations, identifies signals, and generates actionable insights
3. **Report delivery** — Posted as a GitHub Issue with full Markdown formatting

> Without an Anthropic API key, falls back to a rule-based report with the same data.

## What's in the Report

| Section | What It Tells You |
|---------|-------------------|
| **Market Overview** | BTC/ETH prices, market cap trend, trading volume |
| **DeFi Protocol Analysis** | Where capital is flowing — TVL gainers and losers |
| **Stablecoin Dynamics** | New money entering or leaving the crypto market |
| **Trading Activity** | DEX volume spikes and what they signal |
| **Risk Assessment** | Key risks to watch |
| **Actionable Suggestions** | Recommendations by investor profile (conservative / moderate / aggressive) |

## Setup

### Automated (GitHub Actions)

1. Fork or clone this repo
2. Create a `daily-report` label: `gh label create daily-report`
3. Add `ANTHROPIC_API_KEY` to repo secrets (`Settings → Secrets → Actions`)
4. (Optional) Add `COINGECKO_API_KEY` for better rate limits
5. The workflow runs daily. Trigger manually: `Actions → Daily DeFi Report → Run workflow`

### Local Usage

```bash
pnpm install
export ANTHROPIC_API_KEY=sk-ant-...     # Required for AI analysis
pnpm report -- --stdout                 # Print to terminal
pnpm report -- --locale zh              # Chinese report
pnpm report                             # Save to ~/.defi-radar/reports/
```

## Configuration

Optional config file at `~/.defi-radar/config.json`:

```json
{
  "anthropic": {
    "apiKey": "sk-ant-...",
    "model": "claude-sonnet-4-5-20250514"
  },
  "coingecko": {
    "apiKey": "YOUR_OPTIONAL_KEY"
  }
}
```

Or use environment variables (recommended for CI):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Recommended | Enables AI-powered analysis. Without it, uses rule-based fallback |
| `COINGECKO_API_KEY` | No | CoinGecko API key for higher rate limits |

## Development

```bash
git clone https://github.com/duanyytop/defi-radar.git
cd defi-radar
pnpm install
pnpm build        # Compile TypeScript
pnpm typecheck    # Type check
pnpm test         # Run tests
pnpm report       # Generate report locally
```

## License

MIT
