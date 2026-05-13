import { describe, it, expect } from 'vitest';
import { layoutChart } from '@/lib/svg-chart';

describe('layoutChart', () => {
  it('produces an empty path when a series has no data', () => {
    const out = layoutChart([{ name: 'Empty', color: '#fff', t: [], p: [] }]);
    expect(out.paths[0].d).toBe('');
  });

  it('produces a path string with one M and N-1 L commands for N points', () => {
    const t = [1, 2, 3, 4];
    const p = [0.1, 0.2, 0.15, 0.3];
    const out = layoutChart([{ name: 'A', color: '#0f0', t, p }]);
    expect(out.paths[0].d.startsWith('M')).toBe(true);
    expect(out.paths[0].d.match(/L /g) ?? []).toHaveLength(3);
  });

  it('chooses sensible y bounds when prices are tightly clustered', () => {
    const out = layoutChart([{ name: 'A', color: '#0f0', t: [1, 2], p: [0.17, 0.18] }]);
    expect(out.yMin).toBeLessThan(0.17);
    expect(out.yMax).toBeGreaterThan(0.18);
  });

  it('respects an explicit yMin / yMax', () => {
    const out = layoutChart([{ name: 'A', color: '#0f0', t: [1, 2], p: [0.5, 0.5] }], { width: 800, height: 300, yMin: 0, yMax: 1 });
    expect(out.yMin).toBe(0);
    expect(out.yMax).toBe(1);
  });
});
