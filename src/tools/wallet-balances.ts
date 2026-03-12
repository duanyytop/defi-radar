import type { DefiRadarConfig, ChainName, WalletBalances } from '../types.js';
import { getClient, KNOWN_TOKENS, NATIVE_TOKEN_SYMBOL } from '../chains/index.js';
import { getNativeBalance, getMultipleTokenBalances } from '../protocols/erc20.js';
import { getTokenPrices } from '../pricing/coingecko.js';

export async function getWalletBalances(
  config: DefiRadarConfig,
  address?: string,
  chain?: string,
  includePrices: boolean = true,
): Promise<string> {
  const wallet = address
    ? config.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase())
    : config.wallets[0];

  const walletAddress = (address ?? wallet?.address) as `0x${string}`;
  if (!walletAddress) {
    return 'No wallet address provided and no wallets configured.';
  }

  const chains: ChainName[] =
    chain && chain !== 'all' ? [chain as ChainName] : (wallet?.chains ?? ['ethereum', 'arbitrum', 'base']);

  const results: WalletBalances[] = [];

  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const nativeBalance = await getNativeBalance(client, walletAddress);

      // Get configured tokens or use known defaults
      const tokenAddresses =
        config.tokens?.[chainName]?.map((sym) => KNOWN_TOKENS[chainName]?.[sym]).filter(Boolean) as `0x${string}`[] ??
        (Object.values(KNOWN_TOKENS[chainName] ?? {}) as `0x${string}`[]);

      const tokens = await getMultipleTokenBalances(client, tokenAddresses, walletAddress);

      results.push({
        chain: chainName,
        nativeBalance,
        tokens,
      });
    } catch (err) {
      results.push({
        chain: chainName,
        nativeBalance: 'Error',
        tokens: [],
      });
    }
  }

  // Fetch prices if requested
  if (includePrices) {
    const allSymbols = new Set<string>();
    for (const r of results) {
      allSymbols.add(NATIVE_TOKEN_SYMBOL[r.chain]);
      for (const t of r.tokens) allSymbols.add(t.symbol);
    }

    try {
      const prices = await getTokenPrices(Array.from(allSymbols), config.coingecko?.apiKey);

      for (const r of results) {
        const nativePrice = prices[NATIVE_TOKEN_SYMBOL[r.chain].toUpperCase()] ?? 0;
        r.nativeUsdValue = parseFloat(r.nativeBalance) * nativePrice;
        let total = r.nativeUsdValue;

        for (const t of r.tokens) {
          const price = prices[t.symbol.toUpperCase()] ?? 0;
          t.usdValue = parseFloat(t.balance) * price;
          total += t.usdValue;
        }
        r.totalUsdValue = total;
      }
    } catch {
      // Price fetch failed, continue without prices
    }
  }

  return formatBalances(walletAddress, results);
}

function formatBalances(address: string, results: WalletBalances[]): string {
  const lines: string[] = [];
  lines.push(`Wallet: ${address}`);
  lines.push('');

  let grandTotal = 0;

  for (const r of results) {
    lines.push(`--- ${r.chain.toUpperCase()} ---`);

    const nativeSymbol = NATIVE_TOKEN_SYMBOL[r.chain];
    if (r.nativeUsdValue !== undefined) {
      lines.push(`  ${nativeSymbol}: ${formatAmount(r.nativeBalance)} ($${r.nativeUsdValue.toFixed(2)})`);
    } else {
      lines.push(`  ${nativeSymbol}: ${formatAmount(r.nativeBalance)}`);
    }

    for (const t of r.tokens) {
      if (t.usdValue !== undefined) {
        lines.push(`  ${t.symbol}: ${formatAmount(t.balance)} ($${t.usdValue.toFixed(2)})`);
      } else {
        lines.push(`  ${t.symbol}: ${formatAmount(t.balance)}`);
      }
    }

    if (r.totalUsdValue !== undefined) {
      lines.push(`  Chain Total: $${r.totalUsdValue.toFixed(2)}`);
      grandTotal += r.totalUsdValue;
    }
    lines.push('');
  }

  if (grandTotal > 0) {
    lines.push(`=== Portfolio Total: $${grandTotal.toFixed(2)} ===`);
  }

  return lines.join('\n');
}

function formatAmount(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
