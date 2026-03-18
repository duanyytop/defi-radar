import { writeFileSync } from 'node:fs';
import { loadConfig } from './config.js';
import { generateBilingualReport } from './report/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const { en, zh } = await generateBilingualReport(config);

  writeFileSync('report-en.md', en, 'utf-8');
  writeFileSync('report-zh.md', zh, 'utf-8');
  console.error('Reports written: report-en.md, report-zh.md');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
