import type { DefiRadarConfig, ChainName, Alert } from '../types.js';
import { getClient } from '../chains/index.js';
import { getAavePosition } from '../protocols/aave-v3.js';

export async function checkAlerts(
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
  const alerts: Alert[] = [];

  // Check Aave health factors
  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const pos = await getAavePosition(client, chainName, walletAddress, threshold);
      if (pos && pos.isAtRisk) {
        alerts.push({
          type: 'aave_health_factor',
          severity: pos.healthFactor < 1.1 ? 'critical' : 'warning',
          chain: chainName,
          message: `Aave V3 health factor is ${pos.healthFactor.toFixed(4)} on ${chainName}`,
          value: pos.healthFactor,
          threshold,
        });
      }
    } catch {
      // Skip chain on error
    }
  }

  return formatAlerts(walletAddress, alerts);
}

function formatAlerts(address: string, alerts: Alert[]): string {
  const lines: string[] = [];
  lines.push(`Alert Check — ${address}`);
  lines.push('');

  if (alerts.length === 0) {
    lines.push('No alerts — all positions healthy.');
    return lines.join('\n');
  }

  const critical = alerts.filter((a) => a.severity === 'critical');
  const warnings = alerts.filter((a) => a.severity === 'warning');

  if (critical.length > 0) {
    lines.push('!!! CRITICAL ALERTS !!!');
    for (const alert of critical) {
      lines.push(`  [CRITICAL] ${alert.message}`);
      lines.push(`    Value: ${alert.value.toFixed(4)}, Threshold: ${alert.threshold}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('WARNINGS:');
    for (const alert of warnings) {
      lines.push(`  [WARNING] ${alert.message}`);
      lines.push(`    Value: ${alert.value.toFixed(4)}, Threshold: ${alert.threshold}`);
    }
    lines.push('');
  }

  lines.push(`Total: ${critical.length} critical, ${warnings.length} warning(s)`);
  return lines.join('\n');
}
