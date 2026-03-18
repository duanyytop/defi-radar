export interface SinaIndexQuote {
  code: string;
  name: string;
  market: 'ashare' | 'us' | 'hk';
  price: number;
  change: number;
  changePct: number;
  volume: number;
  amount: number;
}

// --- A-Share indices ---
// Format: var hq_str_s_sh000001="上证指数,3261.12,34.56,1.07,3890562,48765432";
const ASHARE_CODES = ['s_sh000001', 's_sz399001', 's_sz399006'] as const;

// --- US indices ---
// Format: var hq_str_int_dji="...,DOW JONES,...,39869.38,...,-138.25,...,-0.35,...";
// Fields vary but key ones: name, price, change, changePct
const US_CODES = ['int_dji', 'int_nasdaq', 'int_sp500'] as const;

// --- HK indices ---
// Format: var hq_str_rt_hkHSI="恒生指数,...,23601.26,...,-77.88,...,-0.33,...";
const HK_CODES = ['rt_hkHSI', 'rt_hkHSCEI', 'rt_hkHSTECH'] as const;

const INDEX_META: Record<string, { en: string; zh: string; market: SinaIndexQuote['market'] }> = {
  // A-Share
  s_sh000001: { en: 'SSE Composite', zh: '上证指数', market: 'ashare' },
  s_sz399001: { en: 'SZSE Component', zh: '深证成指', market: 'ashare' },
  s_sz399006: { en: 'ChiNext', zh: '创业板指', market: 'ashare' },
  // US
  int_dji: { en: 'Dow Jones', zh: '道琼斯', market: 'us' },
  int_nasdaq: { en: 'NASDAQ', zh: '纳斯达克', market: 'us' },
  int_sp500: { en: 'S&P 500', zh: '标普500', market: 'us' },
  // HK
  rt_hkHSI: { en: 'Hang Seng', zh: '恒生指数', market: 'hk' },
  rt_hkHSCEI: { en: 'HS China Enterprise', zh: '国企指数', market: 'hk' },
  rt_hkHSTECH: { en: 'HS TECH', zh: '恒生科技', market: 'hk' },
};

async function fetchSina(codes: readonly string[]): Promise<string> {
  const url = `https://hq.sinajs.cn/list=${codes.join(',')}`;
  const res = await fetch(url, {
    headers: { Referer: 'https://finance.sina.com.cn' },
  });
  if (!res.ok) {
    throw new Error(`Sina API error: ${res.status}`);
  }
  return res.text();
}

function parseAShareLine(code: string, content: string): SinaIndexQuote | null {
  // Format: "名称,最新价,涨跌额,涨跌幅,成交量(手),成交额(万元)"
  const parts = content.split(',');
  if (parts.length < 6) return null;

  return {
    code,
    name: INDEX_META[code]?.zh ?? parts[0],
    market: 'ashare',
    price: parseFloat(parts[1]),
    change: parseFloat(parts[2]),
    changePct: parseFloat(parts[3]),
    volume: parseFloat(parts[4]),
    amount: parseFloat(parts[5]),
  };
}

function parseUSLine(code: string, content: string): SinaIndexQuote | null {
  // US index format varies but generally comma-separated with these key fields
  const parts = content.split(',');
  if (parts.length < 2) return null;

  // Try to find numeric price, change, changePct from the fields
  const nums = parts.map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
  if (nums.length < 3) return null;

  // Typical pattern: ..., price, ..., change, ..., changePct, ...
  // For int_ indices: field layout is roughly: name, price, time, change, changePct, ...
  return {
    code,
    name: INDEX_META[code]?.zh ?? code,
    market: 'us',
    price: nums[0],
    change: nums.length > 1 ? nums[1] : 0,
    changePct: nums.length > 2 ? nums[2] : 0,
    volume: 0,
    amount: 0,
  };
}

function parseHKLine(code: string, content: string): SinaIndexQuote | null {
  // HK index format: "恒生指数,HSI,23601.26,23679.14,23737.54,23525.68,23601.26,-77.88,-0.33,..."
  const parts = content.split(',');
  if (parts.length < 9) return null;

  return {
    code,
    name: INDEX_META[code]?.zh ?? parts[0],
    market: 'hk',
    price: parseFloat(parts[6]) || parseFloat(parts[2]),
    change: parseFloat(parts[7]),
    changePct: parseFloat(parts[8]),
    volume: 0,
    amount: 0,
  };
}

function extractQuotes(
  text: string,
  codes: readonly string[],
  parser: (code: string, content: string) => SinaIndexQuote | null,
): SinaIndexQuote[] {
  const results: SinaIndexQuote[] = [];
  for (const code of codes) {
    const regex = new RegExp(`hq_str_${code}="([^"]*)"`);
    const match = text.match(regex);
    if (!match || !match[1]) continue;
    const quote = parser(code, match[1]);
    if (quote && quote.price > 0) results.push(quote);
  }
  return results;
}

/**
 * Get A-share indices from Sina Finance.
 */
export async function getSinaIndices(): Promise<SinaIndexQuote[]> {
  const text = await fetchSina(ASHARE_CODES);
  return extractQuotes(text, ASHARE_CODES, parseAShareLine);
}

/**
 * Get US market indices from Sina Finance.
 */
export async function getSinaUSIndices(): Promise<SinaIndexQuote[]> {
  const text = await fetchSina(US_CODES);
  return extractQuotes(text, US_CODES, parseUSLine);
}

/**
 * Get Hong Kong market indices from Sina Finance.
 */
export async function getSinaHKIndices(): Promise<SinaIndexQuote[]> {
  const text = await fetchSina(HK_CODES);
  return extractQuotes(text, HK_CODES, parseHKLine);
}

/**
 * Get all market indices in one call.
 */
export async function getAllIndices(): Promise<{
  ashare: SinaIndexQuote[];
  us: SinaIndexQuote[];
  hk: SinaIndexQuote[];
}> {
  const allCodes = [...ASHARE_CODES, ...US_CODES, ...HK_CODES];
  const text = await fetchSina(allCodes);

  return {
    ashare: extractQuotes(text, ASHARE_CODES, parseAShareLine),
    us: extractQuotes(text, US_CODES, parseUSLine),
    hk: extractQuotes(text, HK_CODES, parseHKLine),
  };
}
