# DeFi Radar

AI-powered daily DeFi market intelligence report. Collects data from DeFiLlama + CoinGecko, then uses LLM to produce bilingual (EN/ZH) analysis for crypto investors.

Reports are automatically generated via GitHub Actions and posted as GitHub Issues at **8:00 AM Beijing time** daily.

## How It Works

```
DeFiLlama API ─┐                    ┌─→ English Report ─┐
                ├─→ Structured Data ─┤                   ├─→ GitHub Issue
CoinGecko API ──┘                    └─→ 中文报告 ────────┘
```

1. **Data collection** — Fetches protocol TVL, stablecoin supply, DEX volumes, and market prices
2. **AI analysis** — LLM generates English and Chinese reports from the same data (fetched once)
3. **Report delivery** — Both reports combined into one GitHub Issue

> Without an LLM API key, falls back to rule-based reports.

## Setup

1. Fork or clone this repo
2. Create a `daily-report` label: `gh label create daily-report`
3. Add secrets to your repo (`Settings → Secrets → Actions`):

### Kimi Code Plan (recommended)

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | Your Kimi Code key |
| `ANTHROPIC_BASE_URL` | `https://api.kimi.com/coding/` |

### Claude

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

### OpenAI-compatible (Kimi 2.5, OpenRouter, etc.)

| Secret | Value |
|--------|-------|
| `LLM_PROVIDER` | `openai` |
| `LLM_API_KEY` | Your API key |
| `LLM_MODEL` | `kimi-2.5` |
| `LLM_BASE_URL` | `https://api.kimi.com/v1` |

4. Trigger manually: `Actions → Daily DeFi Report → Run workflow`

## Development

```bash
git clone https://github.com/duanyytop/defi-radar.git
cd defi-radar
pnpm install
pnpm build        # Compile TypeScript
pnpm typecheck    # Type check
pnpm test         # Run tests
pnpm dev          # Generate report locally
```

## License

MIT
