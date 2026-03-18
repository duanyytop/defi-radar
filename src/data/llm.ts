import Anthropic from '@anthropic-ai/sdk';
import type { ReportData } from '../types.js';

const SYSTEM_PROMPT = `You are a senior DeFi market analyst writing a daily intelligence report for crypto investors. Your analysis should be data-driven, actionable, and written in clear Markdown.

Guidelines:
- Base every claim on the provided data. Do not fabricate numbers.
- Identify correlations between different data points (e.g., TVL changes + stablecoin supply + price action).
- Distinguish between noise and meaningful signals. Not every small change matters.
- Provide specific, actionable suggestions — not generic advice.
- Use bullet points and tables for readability.
- Be concise. Investors are busy.
- Include a risk assessment section.
- Write in the language specified by the user.`;

function buildDataContext(data: ReportData): string {
  const lines: string[] = [];

  lines.push('## Raw Market Data');
  lines.push('');
  lines.push('### Prices & Market Cap');
  lines.push(`- BTC: $${data.market.btcPrice.toLocaleString()} (${data.market.btcChange24h >= 0 ? '+' : ''}${data.market.btcChange24h.toFixed(2)}% 24h)`);
  lines.push(`- ETH: $${data.market.ethPrice.toLocaleString()} (${data.market.ethChange24h >= 0 ? '+' : ''}${data.market.ethChange24h.toFixed(2)}% 24h)`);
  lines.push(`- Total Market Cap: $${(data.market.totalMarketCap / 1e9).toFixed(1)}B (${data.market.marketCapChange24h >= 0 ? '+' : ''}${data.market.marketCapChange24h.toFixed(2)}% 24h)`);
  lines.push(`- Total 24h Volume: $${(data.market.totalVolume24h / 1e9).toFixed(1)}B`);
  lines.push('');

  if (data.topTvlGainers.length > 0) {
    lines.push('### Protocol TVL — Top Gainers (24h)');
    for (const p of data.topTvlGainers) {
      lines.push(`- ${p.name} (${p.category}): $${(p.tvl / 1e9).toFixed(2)}B TVL, ${p.tvlChange1d >= 0 ? '+' : ''}${p.tvlChange1d.toFixed(2)}% 1d, ${p.tvlChange7d >= 0 ? '+' : ''}${p.tvlChange7d.toFixed(2)}% 7d`);
    }
    lines.push('');
  }

  if (data.topTvlLosers.length > 0) {
    lines.push('### Protocol TVL — Top Losers (24h)');
    for (const p of data.topTvlLosers) {
      lines.push(`- ${p.name} (${p.category}): $${(p.tvl / 1e9).toFixed(2)}B TVL, ${p.tvlChange1d >= 0 ? '+' : ''}${p.tvlChange1d.toFixed(2)}% 1d, ${p.tvlChange7d >= 0 ? '+' : ''}${p.tvlChange7d.toFixed(2)}% 7d`);
    }
    lines.push('');
  }

  if (data.stablecoins.length > 0) {
    lines.push('### Stablecoin Supply');
    for (const s of data.stablecoins) {
      lines.push(`- ${s.symbol} (${s.name}): $${(s.totalSupply / 1e9).toFixed(2)}B supply, ${s.supplyChange1d >= 0 ? '+' : ''}${s.supplyChange1d.toFixed(3)}% 1d, ${s.supplyChange7d >= 0 ? '+' : ''}${s.supplyChange7d.toFixed(3)}% 7d`);
    }
    lines.push('');
  }

  if (data.dexVolumes.length > 0) {
    lines.push('### DEX Trading Volume (24h)');
    for (const d of data.dexVolumes) {
      lines.push(`- ${d.name}: $${(d.volume24h / 1e6).toFixed(1)}M (${d.volumeChange1d >= 0 ? '+' : ''}${d.volumeChange1d.toFixed(1)}% vs prev day)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function analyzeWithLLM(
  data: ReportData,
  apiKey: string,
  model: string,
  locale: string,
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const dataContext = buildDataContext(data);
  const date = new Date().toISOString().split('T')[0];
  const lang = locale === 'zh' ? 'Chinese (简体中文)' : 'English';

  const userPrompt = `Here is today's (${date}) DeFi market data:

${dataContext}

Please write a comprehensive DeFi market intelligence report in **${lang}** based on this data. The report should include:

1. **Market Overview** — Key price movements and what they indicate
2. **DeFi Protocol Analysis** — Notable TVL changes and what's driving capital flows
3. **Stablecoin Dynamics** — What supply changes tell us about market sentiment
4. **Trading Activity** — DEX volume analysis and what it signals
5. **Risk Assessment** — Key risks investors should watch
6. **Actionable Suggestions** — Specific, data-backed recommendations for different investor profiles (conservative / moderate / aggressive)

Format the report in Markdown with the title: "# DeFi Market Intelligence Report — ${date}"

End with a disclaimer that this is AI-generated analysis based on public data and does not constitute financial advice.`;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}
