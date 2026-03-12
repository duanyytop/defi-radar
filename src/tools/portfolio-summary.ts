import type { DefiRadarConfig, ChainName } from '../types.js';
import { getClient, KNOWN_TOKENS, NATIVE_TOKEN_SYMBOL } from '../chains/index.js';
import { getNativeBalance, getMultipleTokenBalances } from '../protocols/erc20.js';
import { getAavePosition } from '../protocols/aave-v3.js';
import { getUniswapPositions } from '../protocols/uniswap-v3.js';
import { getTokenPrices } from '../pricing/coingecko.js';

export async function getPortfolioSummary(
  config: DefiRadarConfig,
  address?: string,
): Promise<string> {
  const wallet = address
    ? config.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase())
    : config.wallets[0];

  const walletAddress = (address ?? wallet?.address) as `0x${string}`;
  if (!walletAddress) {
    return 'No wallet address provided and no wallets configured.';
  }

  const chains: ChainName[] = wallet?.chains ?? ['ethereum', 'arbitrum', 'base'];
  const threshold = config.alerts?.aaveHealthFactorThreshold ?? 1.5;
  const lines: string[] = [];

  lines.push(`Portfolio Summary — ${walletAddress}`);
  lines.push(`Chains: ${chains.join(', ')}`);
  lines.push('');

  // Collect all token symbols for price fetching
  const allSymbols = new Set<string>();
  chains.forEach((c) => allSymbols.add(NATIVE_TOKEN_SYMBOL[c]));

  let totalPortfolioValue = 0;

  // --- Balances ---
  lines.push('=== TOKEN BALANCES ===');
  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const nativeBalance = await getNativeBalance(client, walletAddress);
      const tokenAddresses = Object.values(KNOWN_TOKENS[chainName] ?? {}) as `0x${string}`[];
      const tokens = await getMultipleTokenBalances(client, tokenAddresses, walletAddress);

      tokens.forEach((t) => allSymbols.add(t.symbol));

      // Fetch prices
      const prices = await getTokenPrices(Array.from(allSymbols), config.coingecko?.apiKey);
      const nativePrice = prices[NATIVE_TOKEN_SYMBOL[chainName].toUpperCase()] ?? 0;
      const nativeValue = parseFloat(nativeBalance) * nativePrice;
      totalPortfolioValue += nativeValue;

      lines.push(`  ${chainName.toUpperCase()}: ${parseFloat(nativeBalance).toFixed(4)} ${NATIVE_TOKEN_SYMBOL[chainName]} ($${nativeValue.toFixed(2)})`);

      for (const t of tokens) {
        const price = prices[t.symbol.toUpperCase()] ?? 0;
        const value = parseFloat(t.balance) * price;
        totalPortfolioValue += value;
        if (value > 1) {
          lines.push(`    ${t.symbol}: ${parseFloat(t.balance).toFixed(4)} ($${value.toFixed(2)})`);
        }
      }
    } catch {
      lines.push(`  ${chainName.toUpperCase()}: [Error fetching balances]`);
    }
  }
  lines.push('');

  // --- Aave ---
  lines.push('=== AAVE V3 POSITIONS ===');
  let hasAave = false;
  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const pos = await getAavePosition(client, chainName, walletAddress, threshold);
      if (pos) {
        hasAave = true;
        const status = pos.isAtRisk ? '[WARNING]' : '[OK]';
        lines.push(`  ${chainName.toUpperCase()} ${status}: HF=${pos.healthFactor.toFixed(2)}, Collateral=$${pos.totalCollateralUsd.toFixed(0)}, Debt=$${pos.totalDebtUsd.toFixed(0)}`);
      }
    } catch {
      // skip
    }
  }
  if (!hasAave) lines.push('  No Aave positions found.');
  lines.push('');

  // --- Uniswap ---
  lines.push('=== UNISWAP V3 LP ===');
  let totalInRange = 0;
  let totalOutOfRange = 0;
  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const positions = await getUniswapPositions(client, chainName, walletAddress);
      if (positions.length > 0) {
        const inRange = positions.filter((p) => p.inRange).length;
        const outOfRange = positions.length - inRange;
        totalInRange += inRange;
        totalOutOfRange += outOfRange;
        lines.push(`  ${chainName.toUpperCase()}: ${positions.length} positions (${inRange} in range, ${outOfRange} out of range)`);
      }
    } catch {
      // skip
    }
  }
  if (totalInRange === 0 && totalOutOfRange === 0) {
    lines.push('  No Uniswap V3 LP positions found.');
  }
  lines.push('');

  lines.push(`=== TOTAL PORTFOLIO VALUE: ~$${totalPortfolioValue.toFixed(2)} ===`);
  lines.push('(Excludes Aave collateral and LP value — token balances only)');

  return lines.join('\n');
}
