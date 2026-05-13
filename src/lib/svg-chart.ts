/**
 * Tiny dependency-free SVG line chart helper. Used by the Polymarket page.
 *
 * Pure function: takes data + dimensions, returns a series of path strings and tick labels.
 * Exported separately so we can unit-test it.
 */
export type ChartSeries = { name: string; color: string; t: number[]; p: number[] };

export type ChartLayout = {
  width: number;
  height: number;
  pad: { top: number; right: number; bottom: number; left: number };
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  paths: { name: string; color: string; d: string; endPoint: { x: number; y: number } | null }[];
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
};

export function layoutChart(
  series: ChartSeries[],
  opts: { width: number; height: number; yMin?: number; yMax?: number } = { width: 800, height: 300 },
): ChartLayout {
  const pad = { top: 20, right: 40, bottom: 30, left: 20 };
  const points = series.flatMap((s) => s.t.map((t, i) => [t, s.p[i]] as const));
  const xMin = points.length ? Math.min(...points.map((p) => p[0])) : 0;
  const xMax = points.length ? Math.max(...points.map((p) => p[0])) : 1;
  const yMin = opts.yMin ?? Math.max(0, Math.floor((Math.min(...points.map((p) => p[1]), 1) - 0.02) * 100) / 100);
  const yMax = opts.yMax ?? Math.min(1, Math.ceil((Math.max(...points.map((p) => p[1]), 0) + 0.02) * 100) / 100);

  const innerW = opts.width - pad.left - pad.right;
  const innerH = opts.height - pad.top - pad.bottom;
  const sx = (x: number) => pad.left + ((x - xMin) / Math.max(1, xMax - xMin)) * innerW;
  const sy = (y: number) => pad.top + (1 - (y - yMin) / Math.max(0.001, yMax - yMin)) * innerH;

  const paths = series.map((s) => {
    if (!s.t.length) return { name: s.name, color: s.color, d: '', endPoint: null };
    const d = s.t.map((t, i) => `${i === 0 ? 'M' : 'L'} ${sx(t).toFixed(1)} ${sy(s.p[i]).toFixed(1)}`).join(' ');
    return { name: s.name, color: s.color, d, endPoint: { x: sx(s.t[s.t.length - 1]), y: sy(s.p[s.p.length - 1]) } };
  });

  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const xTicks: ChartLayout['xTicks'] = [];
  for (let t = Math.ceil(xMin / monthMs) * monthMs; t <= xMax; t += monthMs) {
    xTicks.push({ x: sx(t), label: new Date(t).toLocaleString(undefined, { month: 'short' }) });
  }

  const yStep = (yMax - yMin) / 4;
  const yTicks: ChartLayout['yTicks'] = [];
  for (let y = yMin; y <= yMax + 1e-9; y += yStep) {
    yTicks.push({ y: sy(y), label: `${Math.round(y * 100)}%` });
  }

  return { width: opts.width, height: opts.height, pad, xMin, xMax, yMin, yMax, paths, xTicks, yTicks };
}
