# P1: Exchange Fund Flow Monitoring — Implementation Plan

## Overview

Add exchange fund flow monitoring to defi-radar by:
1. Creating a CEX/DEX address label library
2. Adding on-chain Transfer event log querying
3. Exposing a `get_exchange_flows` MCP tool

## New Files

### 1. `src/exchanges/constants.ts` — Exchange Address Labels

A `Record<ChainName, ExchangeAddress[]>` mapping containing known hot/deposit wallet addresses for major CEXs and DEX router contracts.

**CEX coverage** (Ethereum/Arbitrum/Base where applicable):
- Binance (multiple hot wallets)
- Coinbase
- OKX
- Kraken
- Bybit

**DEX coverage**:
- Uniswap V2/V3 Routers
- 1inch Router
- Curve Router

Each entry:
```ts
interface ExchangeAddress {
  address: `0x${string}`;
  label: string;        // e.g. "Binance Hot Wallet 1"
  type: 'cex' | 'dex';
  exchange: string;     // e.g. "Binance"
}
```

### 2. `src/exchanges/index.ts` — Public Exports

Re-export constants and the flow tracker, following existing `src/chains/index.ts` pattern.

### 3. `src/exchanges/flow-tracker.ts` — Transfer Event Log Reader

Core logic:
- Use Viem's `client.getLogs()` to query ERC-20 Transfer events within a block range
- Also query native ETH transfers via internal transaction analysis (or limit to ERC-20 for P1 simplicity)
- Filter logs where `from` or `to` matches a known exchange address
- Classify each transfer as `inflow` (to exchange) or `outflow` (from exchange)
- Aggregate by exchange and token

Key function:
```ts
async function getExchangeFlows(
  client: PublicClient,
  chain: ChainName,
  options: {
    token?: `0x${string}`;       // specific token, or all known tokens
    exchange?: string;            // filter by exchange name
    blocks?: number;              // lookback range (default: 1000)
  }
): Promise<ExchangeFlowResult>
```

Returns:
```ts
interface ExchangeFlowResult {
  chain: ChainName;
  blockRange: { from: bigint; to: bigint };
  flows: ExchangeFlow[];
  summary: {
    totalInflowUsd: number;
    totalOutflowUsd: number;
    netFlowUsd: number;          // positive = net inflow
  };
}

interface ExchangeFlow {
  exchange: string;
  type: 'cex' | 'dex';
  token: string;
  inflow: string;                // formatted amount
  outflow: string;
  netFlow: string;
  inflowUsd?: number;
  outflowUsd?: number;
}
```

**RPC safeguards**:
- Default to 1000 blocks lookback (~3.3 hours on Ethereum)
- Cap maximum at 5000 blocks
- Use ERC-20 Transfer event topic filter to minimize log volume

### 4. `src/tools/exchange-flows.ts` — MCP Tool Handler

Following existing tool patterns (wallet-balances.ts as template):
- Resolve wallet/chain from config
- Call `getExchangeFlows()` for each requested chain
- Optionally fetch USD prices via existing `getTokenPrices()`
- Format output as text

Tool registration in `src/tools/index.ts`:
```ts
server.tool(
  'get_exchange_flows',
  'Monitor token inflows and outflows to/from centralized and decentralized exchanges',
  {
    chain: z.enum(['ethereum', 'arbitrum', 'base', 'all']).optional()
      .describe('Chain to query (default: ethereum)'),
    token: z.string().optional()
      .describe('Token symbol to filter (e.g. USDC, WETH). Default: all known tokens'),
    exchange: z.string().optional()
      .describe('Exchange name to filter (e.g. Binance, Uniswap)'),
    blocks: z.number().optional()
      .describe('Number of recent blocks to scan (default: 1000, max: 5000)'),
    include_prices: z.boolean().optional()
      .describe('Include USD values (default: true)'),
  },
  handler
);
```

### 5. `src/types.ts` — Type Additions

Add:
- `ExchangeAddress` interface
- `ExchangeFlow` interface
- `ExchangeFlowResult` interface

No changes to existing types. The `Alert` type union does NOT need to change in P1.

## Modified Files

### 1. `src/tools/index.ts`
- Import and register the new `get_exchange_flows` tool

### 2. `src/chains/constants.ts`
- No changes needed — exchange addresses live in their own module

## Tests

### `src/__tests__/exchange-constants.test.ts`
- All exchange addresses are valid Ethereum addresses
- Each chain has at least one CEX and one DEX entry
- No duplicate addresses within a chain
- Labels are non-empty

### `src/__tests__/flow-tracker.test.ts`
- Test log parsing and flow classification logic with mocked Viem client
- Test aggregation math (inflow/outflow/net)
- Test block range capping (max 5000)
- Test exchange name filtering
- Test token filtering

## Implementation Order

1. Add types to `src/types.ts`
2. Create `src/exchanges/constants.ts` with address labels
3. Create `src/exchanges/index.ts` exports
4. Create `src/exchanges/flow-tracker.ts` with core logic
5. Create `src/tools/exchange-flows.ts` tool handler
6. Register tool in `src/tools/index.ts`
7. Add tests
8. Run `npm run typecheck && npm run test && npm run lint`

## Technical Notes

- **ERC-20 Transfer event signature**: `Transfer(address,address,uint256)` = topic `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`
- **Block range**: Use `client.getBlockNumber()` to get latest, then `latest - blocks` as fromBlock
- **Token resolution**: Map user-provided symbol to address via existing `KNOWN_TOKENS` constant
- **Price integration**: Reuse `getTokenPrices()` from `src/pricing/coingecko.ts`
- **No config changes needed**: This feature doesn't require user configuration in P1
