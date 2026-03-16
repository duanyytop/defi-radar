import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ConfigSchema, type DefiRadarConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.defi-radar');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
  return process.env.DEFI_RADAR_CONFIG ?? CONFIG_FILE;
}

/**
 * Build config from environment variables (for CI).
 * Returns null if no relevant env vars are set.
 */
function configFromEnv(): DefiRadarConfig | null {
  const ethRpc = process.env.ETH_RPC_URL;
  const arbRpc = process.env.ARB_RPC_URL;
  const baseRpc = process.env.BASE_RPC_URL;

  if (!ethRpc && !arbRpc && !baseRpc) return null;

  const chains: Record<string, { rpcUrl: string }> = {};
  if (ethRpc) chains.ethereum = { rpcUrl: ethRpc };
  if (arbRpc) chains.arbitrum = { rpcUrl: arbRpc };
  if (baseRpc) chains.base = { rpcUrl: baseRpc };

  const raw: Record<string, unknown> = { chains };

  if (process.env.COINGECKO_API_KEY) {
    raw.coingecko = { apiKey: process.env.COINGECKO_API_KEY };
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) return null;

  return result.data;
}

export function loadConfig(): DefiRadarConfig {
  // 1. Prefer environment variables (CI-friendly)
  const envConfig = configFromEnv();
  if (envConfig) return envConfig;

  // 2. Try config file
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON in ${configPath}`);
    }

    const result = ConfigSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Invalid config in ${configPath}:\n${issues}`);
    }

    return result.data;
  }

  // 3. Fall back to defaults (public RPCs, no API keys)
  return ConfigSchema.parse({});
}
