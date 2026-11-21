import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, readColorTokens } from './contrast';

const tokens = readColorTokens(readFileSync('src/app/globals.css', 'utf8'));

describe('contrastRatio', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});

const TEXT_PAIRS: [string, string][] = [
  ['ink', 'stucco'], ['ink', 'chalk'], ['ink', 'sand'], ['ink', 'greige'], ['ink', 'clay'],
  ['ink-soft', 'stucco'], ['ink-soft', 'chalk'], ['clay-ink', 'stucco'], ['clay-ink', 'chalk'],
  ['chalk', 'ink'], ['chalk', 'danger'], ['success', 'stucco'], ['warning', 'stucco'], ['danger', 'stucco'],
];

describe('palette text pairs', () => {
  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(tokens[fg], `missing --color-${fg}`).toBeDefined();
    expect(tokens[bg], `missing --color-${bg}`).toBeDefined();
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

// Chalk/white on clay is ~2.7:1, which fails even the 3:1 large-text bar.
// Text on clay is therefore always ink (covered by the ['ink', 'clay'] pair above).
