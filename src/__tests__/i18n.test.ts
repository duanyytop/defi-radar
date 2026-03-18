import { describe, it, expect } from 'vitest';
import { t } from '../report/i18n.js';

describe('i18n', () => {
  it('returns English translations', () => {
    expect(t('reportTitle', 'en')).toBe('AI Market Radar — Daily Intelligence Report');
    expect(t('sectionMarketOverview', 'en')).toBe('Market Overview');
    expect(t('disclaimer', 'en')).toContain('informational purposes');
  });

  it('returns Chinese translations', () => {
    expect(t('reportTitle', 'zh')).toBe('AI 市场雷达 — 每日情报');
    expect(t('sectionMarketOverview', 'zh')).toBe('市场概览');
    expect(t('disclaimer', 'zh')).toContain('仅供参考');
  });

  it('all keys differ between locales', () => {
    const keys: Array<Parameters<typeof t>[0]> = [
      'reportTitle',
      'sectionMarketOverview',
      'sectionTvlRankings',
      'sectionStablecoinSupply',
      'sectionDexVolume',
      'sectionSuggestions',
      'bullish',
      'bearish',
      'neutral',
    ];
    for (const key of keys) {
      expect(t(key, 'en')).not.toBe(t(key, 'zh'));
    }
  });

  it('covers signal and severity labels', () => {
    expect(t('bullish', 'en')).toBe('BULLISH');
    expect(t('bearish', 'zh')).toBe('看跌');
    expect(t('info', 'en')).toBe('INFO');
    expect(t('notable', 'en')).toBe('NOTABLE');
    expect(t('significant', 'en')).toBe('SIGNIFICANT');
  });

  it('covers all suggestion keys', () => {
    const keys: Array<Parameters<typeof t>[0]> = [
      'suggPriceDrop',
      'suggPriceRise',
      'suggTvlDrop',
      'suggTvlRise',
      'suggStableSupplyUp',
      'suggStableSupplyDown',
      'suggDexVolumeSpike',
      'suggAllCalm',
    ];
    for (const key of keys) {
      expect(t(key, 'en').length).toBeGreaterThan(0);
      expect(t(key, 'zh').length).toBeGreaterThan(0);
    }
  });
});
