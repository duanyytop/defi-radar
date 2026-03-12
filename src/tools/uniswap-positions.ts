import type { DefiRadarConfig, ChainName, UniswapV3Position } from '../types.js';
import { getClient } from '../chains/index.js';
import { getUniswapPositions } from '../protocols/uniswap-v3.js';

export async function getUniswapPositionsTool(
  config: DefiRadarConfig,
  address?: string,
  chain?: string,
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

  const allPositions: UniswapV3Position[] = [];
  const errors: { chain: ChainName; error: string }[] = [];

  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const positions = await getUniswapPositions(client, chainName, walletAddress);
      allPositions.push(...positions);
    } catch (err) {
      errors.push({ chain: chainName, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return formatUniswapPositions(walletAddress, allPositions, errors);
}

function formatUniswapPositions(
  address: string,
  positions: UniswapV3Position[],
  errors: { chain: ChainName; error: string }[],
): string {
  const lines: string[] = [];
  lines.push(`Uniswap V3 Positions — ${address}`);
  lines.push('');

  if (positions.length === 0 && errors.length === 0) {
    lines.push('No active Uniswap V3 LP positions found.');
    return lines.join('\n');
  }

  const byChain = new Map<ChainName, UniswapV3Position[]>();
  for (const pos of positions) {
    const existing = byChain.get(pos.chain) ?? [];
    existing.push(pos);
    byChain.set(pos.chain, existing);
  }

  for (const [chainName, chainPositions] of byChain) {
    lines.push(`--- ${chainName.toUpperCase()} ---`);
    for (const pos of chainPositions) {
      const rangeStatus = pos.inRange ? '[IN RANGE]' : '[OUT OF RANGE]';
      const feePercent = pos.fee / 10000;
      lines.push(`  Position #${pos.tokenId} ${rangeStatus}`);
      lines.push(`    Pair: ${shortenAddress(pos.token0)}/${shortenAddress(pos.token1)}`);
      lines.push(`    Fee Tier: ${feePercent}%`);
      lines.push(`    Tick Range: ${pos.tickLower} to ${pos.tickUpper} (current: ${pos.currentTick})`);
      lines.push(`    Liquidity: ${pos.liquidity}`);
      lines.push('');
    }
  }

  for (const err of errors) {
    lines.push(`--- ${err.chain.toUpperCase()} [ERROR] ---`);
    lines.push(`  ${err.error}`);
    lines.push('');
  }

  const inRange = positions.filter((p) => p.inRange).length;
  const outOfRange = positions.length - inRange;
  lines.push(`Summary: ${positions.length} position(s) — ${inRange} in range, ${outOfRange} out of range`);

  return lines.join('\n');
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
