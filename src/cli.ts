#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { loadConfig } from './config.js';
import { generateDailyReport } from './report/index.js';
import type { Locale } from './report/i18n.js';

const REPORTS_DIR = join(homedir(), '.defi-radar', 'reports');

function printUsage(): void {
  console.log(`Usage: defi-radar report [options]

Generate a daily DeFi market intelligence report in Markdown format.

Options:
  --locale, -l <en|zh>    Report language (default: en)
  --chain, -c <chain>     Chain to focus on (default: all configured)
  --output, -o <path>     Output directory (default: ~/.defi-radar/reports/)
  --stdout                Print to stdout instead of writing to file
  --both                  Generate both English and Chinese reports
  --help, -h              Show this help message

Environment variables (for CI):
  ETH_RPC_URL             Ethereum RPC endpoint
  ARB_RPC_URL             Arbitrum RPC endpoint
  BASE_RPC_URL            Base RPC endpoint
  COINGECKO_API_KEY       CoinGecko API key
`);
}

function parseArgs(args: string[]): {
  locale: Locale;
  chain?: string;
  outputDir: string;
  stdout: boolean;
  both: boolean;
  help: boolean;
} {
  const result = {
    locale: 'en' as Locale,
    chain: undefined as string | undefined,
    outputDir: REPORTS_DIR,
    stdout: false,
    both: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--locale':
      case '-l':
        result.locale = (args[++i] as Locale) ?? 'en';
        break;
      case '--chain':
      case '-c':
        result.chain = args[++i];
        break;
      case '--output':
      case '-o':
        result.outputDir = args[++i] ?? REPORTS_DIR;
        break;
      case '--stdout':
        result.stdout = true;
        break;
      case '--both':
        result.both = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

async function writeReport(
  locale: Locale,
  chain: string | undefined,
  outputDir: string,
  stdout: boolean,
): Promise<string> {
  const config = loadConfig();
  const report = await generateDailyReport(config, locale, chain);

  if (stdout) {
    console.log(report);
    return report;
  }

  mkdirSync(outputDir, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const filename = `report-${date}-${locale}.md`;
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, report, 'utf-8');
  console.error(`Report saved: ${filepath}`);
  return report;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // If no subcommand or not "report", fall back to MCP server
  if (args[0] !== 'report') {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const { registerTools } = await import('./tools/index.js');

    const config = loadConfig();
    const server = new McpServer({ name: 'defi-radar', version: '0.1.0' });
    registerTools(server, config);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  const opts = parseArgs(args.slice(1));

  if (opts.help) {
    printUsage();
    return;
  }

  if (opts.both) {
    await writeReport('en', opts.chain, opts.outputDir, opts.stdout);
    await writeReport('zh', opts.chain, opts.outputDir, opts.stdout);
  } else {
    await writeReport(opts.locale, opts.chain, opts.outputDir, opts.stdout);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
