import { loadConfig } from './config.js';
import { generateBilingualReport } from './report/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const { en, zh } = await generateBilingualReport(config);

  console.log(en);
  console.log('\n---\n');
  console.log(zh);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
