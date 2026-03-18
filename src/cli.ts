#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { loadConfig } from './config.js';
import { generateDailyReport, generateBilingualReport } from './report/index.js';
import type { Locale } from './report/i18n.js';

const REPORTS_DIR = join(homedir(), '.defi-radar', 'reports');

function printUsage(): void {
  console.log(`Usage: defi-radar report [options]

Generate a daily DeFi market intelligence report.

Options:
  --locale, -l <en|zh>    Report language (default: en)
  --both                  Generate both EN and ZH reports (data fetched once)
  --output, -o <path>     Output directory (default: ~/.defi-radar/reports/)
  --stdout                Print to stdout instead of writing to file
  --help, -h              Show this help message

Environment variables:
  LLM_API_KEY             LLM API key (enables AI-powered analysis)
  LLM_PROVIDER            LLM provider: "anthropic" or "openai" (default: anthropic)
  LLM_MODEL               Model name (default: claude-sonnet-4-5-20250514)
  LLM_BASE_URL            Custom API base URL (required for OpenAI-compatible providers)
  ANTHROPIC_API_KEY       Anthropic/Kimi Code API key (fallback for LLM_API_KEY)
  ANTHROPIC_BASE_URL      Anthropic base URL override (e.g. https://api.kimi.com/coding/)
  COINGECKO_API_KEY       CoinGecko API key (optional, improves rate limits)
`);
}

function parseArgs(args: string[]): {
  locale: Locale;
  both: boolean;
  outputDir: string;
  stdout: boolean;
  help: boolean;
} {
  const result = {
    locale: 'en' as Locale,
    both: false,
    outputDir: REPORTS_DIR,
    stdout: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--locale':
      case '-l':
        result.locale = (args[++i] as Locale) ?? 'en';
        break;
      case '--both':
        result.both = true;
        break;
      case '--output':
      case '-o':
        result.outputDir = args[++i] ?? REPORTS_DIR;
        break;
      case '--stdout':
        result.stdout = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function saveReport(report: string, locale: string, outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const filename = `report-${date}-${locale}.md`;
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, report, 'utf-8');
  console.error(`Report saved: ${filepath}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] !== 'report') {
    printUsage();
    return;
  }

  const opts = parseArgs(args.slice(1));

  if (opts.help) {
    printUsage();
    return;
  }

  const config = loadConfig();

  if (opts.both) {
    const { en, zh } = await generateBilingualReport(config);

    if (opts.stdout) {
      console.log(en);
      console.log('\n---\n');
      console.log(zh);
    } else {
      saveReport(en, 'en', opts.outputDir);
      saveReport(zh, 'zh', opts.outputDir);
    }
  } else {
    const report = await generateDailyReport(config, opts.locale);

    if (opts.stdout) {
      console.log(report);
    } else {
      saveReport(report, opts.locale, opts.outputDir);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
