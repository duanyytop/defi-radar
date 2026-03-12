import type { DefiRadarConfig, ChainName, AavePosition } from '../types.js';
import { getClient } from '../chains/index.js';
import { getAavePosition } from '../protocols/aave-v3.js';

export async function getAaveHealth(
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

  const threshold = config.alerts?.aaveHealthFactorThreshold ?? 1.5;
  const chains: ChainName[] =
    chain && chain !== 'all' ? [chain as ChainName] : (wallet?.chains ?? ['ethereum', 'arbitrum', 'base']);

  const positions: AavePosition[] = [];
  const errors: { chain: ChainName; error: string }[] = [];

  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const pos = await getAavePosition(client, chainName, walletAddress, threshold);
      if (pos) positions.push(pos);
    } catch (err) {
      errors.push({ chain: chainName, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return formatAaveHealth(walletAddress, positions, errors, threshold);
}

function formatAaveHealth(
  address: string,
  positions: AavePosition[],
  errors: { chain: ChainName; error: string }[],
  threshold: number,
): string {
  const lines: string[] = [];
  lines.push(`Aave V3 Health — ${address}`);
  lines.push('');

  if (positions.length === 0 && errors.length === 0) {
    lines.push('No Aave V3 positions found on any chain.');
    return lines.join('\n');
  }

  for (const pos of positions) {
    const statusIcon = pos.isAtRisk ? '[WARNING]' : '[OK]';
    lines.push(`--- ${pos.chain.toUpperCase()} ${statusIcon} ---`);
    lines.push(`  Health Factor: ${pos.healthFactor.toFixed(4)}${pos.isAtRisk ? ` (below ${threshold} threshold!)` : ''}`);
    lines.push(`  Total Collateral: $${pos.totalCollateralUsd.toFixed(2)}`);
    lines.push(`  Total Debt: $${pos.totalDebtUsd.toFixed(2)}`);
    lines.push(`  Available Borrows: $${pos.availableBorrowsUsd.toFixed(2)}`);
    lines.push(`  LTV: ${(pos.ltv * 100).toFixed(2)}%`);
    lines.push(`  Liquidation Threshold: ${(pos.currentLiquidationThreshold * 100).toFixed(2)}%`);
    lines.push('');
  }

  for (const err of errors) {
    lines.push(`--- ${err.chain.toUpperCase()} [ERROR] ---`);
    lines.push(`  ${err.error}`);
    lines.push('');
  }

  const atRisk = positions.filter((p) => p.isAtRisk);
  if (atRisk.length > 0) {
    lines.push(`!!! ${atRisk.length} position(s) at risk — health factor below ${threshold} !!!`);
  } else if (positions.length > 0) {
    lines.push('All Aave positions are healthy.');
  }

  return lines.join('\n');
}
