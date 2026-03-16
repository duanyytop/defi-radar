# DeFi Radar

Multi-chain DeFi market intelligence MCP server for Claude Code / OpenClaw.

Provides on-chain fund flow analysis, whale movement detection, and bilingual (EN/ZH) daily reports to help investors make informed decisions.

**Core principles**: Read-only (no private keys, no signing, no transactions), multi-chain, zero-trust (API keys stay local).

## Features

- **Exchange Fund Flows** — Track CEX/DEX inflows and outflows to detect sell pressure or accumulation
- **Stablecoin Flow Analysis** — Monitor USDC/USDT/DAI movements as market sentiment indicators
- **Whale Movement Detection** — Detect large transfers above configurable USD thresholds
- **Daily Market Report** — Bilingual (English/Chinese) report with signals and actionable suggestions
- **Scheduled Reports** — GitHub Actions workflow posts bilingual reports to Issues daily at 8:00 AM Beijing time

## Quick Start

### 1. Install

```bash
pnpm install -g defi-radar
# or
clawhub install defi-radar
```

### 2. Configure

```bash
mkdir -p ~/.defi-radar
cat > ~/.defi-radar/config.json << 'EOF'
{
  "chains": {
    "ethereum": { "rpcUrl": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY" },
    "arbitrum": { "rpcUrl": "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY" },
    "base": { "rpcUrl": "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY" }
  },
  "coingecko": {
    "apiKey": "YOUR_COINGECKO_KEY"
  },
  "monitoring": {
    "tokens": ["USDC", "USDT", "WETH", "WBTC", "DAI"],
    "chains": ["ethereum", "arbitrum", "base"],
    "whaleThresholdUsd": 100000
  }
}
EOF
```

Get a free Alchemy API key at [alchemy.com](https://www.alchemy.com/). CoinGecko API key is optional but recommended — get one at [coingecko.com/en/api](https://www.coingecko.com/en/api).

### 3. Add to Claude Code

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "defi-radar": {
      "command": "defi-radar"
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "defi-radar": {
      "command": "node",
      "args": ["/path/to/defi-radar/dist/cli.js"]
    }
  }
}
```

### 4. Use

Talk to Claude naturally:

- "What are the exchange fund flows on Ethereum?"
- "Show me stablecoin flows — is there buying demand?"
- "Any whale movements in the last few blocks?"
- "Generate a daily market report in Chinese"
- "What's the overall market sentiment from on-chain data?"

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_exchange_flows` | CEX/DEX token inflows and outflows with USD values |
| `get_stablecoin_flows` | Stablecoin net flows as market demand indicator |
| `get_whale_movements` | Large transfers above USD threshold |
| `generate_daily_report` | Bilingual market intelligence report with signals |

## CLI Usage

```bash
# Generate English report
defi-radar report

# Generate Chinese report
defi-radar report --locale zh

# Generate both EN and ZH reports
defi-radar report --both

# Print to stdout instead of file
defi-radar report --stdout

# Reports are saved to ~/.defi-radar/reports/
```

### Automated Daily Reports (GitHub Actions)

A GitHub Actions workflow generates bilingual reports at **8:00 AM Beijing time** daily and posts them as GitHub Issues.

**Setup:**

1. (Optional) Add secrets to your repo (`Settings → Secrets and variables → Actions`) for better reliability:

   | Secret | Required | Description |
   |--------|----------|-------------|
   | `ETH_RPC_URL` | No | Ethereum RPC endpoint (e.g. Alchemy). Falls back to public RPC |
   | `ARB_RPC_URL` | No | Arbitrum RPC endpoint. Falls back to public RPC |
   | `BASE_RPC_URL` | No | Base RPC endpoint. Falls back to public RPC |
   | `COINGECKO_API_KEY` | No | CoinGecko API key for USD pricing |

   > Without custom RPC URLs, public endpoints are used. They work but may rate-limit under heavy load. Alchemy/Infura free tiers are recommended for reliability.

2. Create a `daily-report` label in your repo (`Issues → Labels → New label`).

3. The workflow runs automatically on schedule. You can also trigger it manually from `Actions → Daily DeFi Report → Run workflow`.

## Configuration

### Config file (`~/.defi-radar/config.json`)

| Field | Required | Description |
|-------|----------|-------------|
| `chains` | No | Custom RPC URLs per chain (falls back to public RPCs) |
| `coingecko.apiKey` | No | CoinGecko API key for USD pricing (free tier has rate limits) |
| `monitoring.tokens` | No | Tokens to monitor (default: USDC, USDT, WETH, WBTC, DAI) |
| `monitoring.chains` | No | Chains to monitor (default: ethereum, arbitrum, base) |
| `monitoring.whaleThresholdUsd` | No | Min USD value for whale alerts (default: 100,000) |

### Environment variables (for CI)

| Variable | Description |
|----------|-------------|
| `ETH_RPC_URL` | Ethereum RPC endpoint |
| `ARB_RPC_URL` | Arbitrum RPC endpoint |
| `BASE_RPC_URL` | Base RPC endpoint |
| `COINGECKO_API_KEY` | CoinGecko API key |
| `DEFI_RADAR_CONFIG` | Custom config file path (overrides default) |

When environment variables are set, they take precedence over the config file.

## Development

```bash
git clone https://github.com/duanyytop/defi-radar.git
cd defi-radar
pnpm install
pnpm dev
```

```bash
pnpm build        # Compile TypeScript
pnpm typecheck    # Type check without emitting
pnpm test         # Run tests
pnpm report       # Generate report (dev mode)
pnpm report:both  # Generate EN + ZH reports
```

## Security

- **No private keys** — This tool only reads public blockchain data
- **No transactions** — Cannot sign or send any transactions
- **Local config** — API keys stored in `~/.defi-radar/`, never transmitted
- **Open source** — All code is auditable

## License

MIT
