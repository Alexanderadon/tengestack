/** Чистая математика без DOM: перцентили, гистограммы, группировки. */

/** Перцентиль на отсортированном массиве (линейная интерполяция). */
export function percentileSorted(sorted: ArrayLike<number>, p: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0]!;
  const pos = (p / 100) * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * frac;
}

export interface HistBin {
  x0: number;
  x1: number;
  count: number;
}

/**
 * Гистограмма с обрезкой хвостов по перцентилям: зарплаты — лог-нормальные,
 * пара выбросов «3×10⁶ ₸» иначе сжимает весь график в один столбик.
 */
export function buildHistogram(
  values: number[],
  binCount = 36,
  clip: [number, number] = [1, 99],
): { bins: HistBin[]; maxCount: number; clipped: [number, number] } {
  if (values.length === 0) return { bins: [], maxCount: 0, clipped: [0, 0] };
  const sorted = [...values].sort((a, b) => a - b);
  let lo = percentileSorted(sorted, clip[0]);
  let hi = percentileSorted(sorted, clip[1]);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  // круглим границы бинов до «красивых» 10 тыс.
  const step = Math.max(10_000, Math.ceil((hi - lo) / binCount / 10_000) * 10_000);
  lo = Math.floor(lo / step) * step;
  const bins: HistBin[] = [];
  for (let x = lo; x < hi; x += step) bins.push({ x0: x, x1: x + step, count: 0 });
  for (const v of values) {
    if (v < lo || v >= lo + step * bins.length) continue;
    bins[Math.floor((v - lo) / step)]!.count += 1;
  }
  const maxCount = bins.reduce((m, b) => Math.max(m, b.count), 0);
  return { bins, maxCount, clipped: [lo, lo + step * bins.length] };
}

export interface GroupStat {
  key: number;
  count: number;
  withSalary: number;
  median: number;
}

/**
 * Медианы по группам: values[i] — зарплата (0 = нет), groups[i] — ключ группы.
 * Возвращает по убыванию медианы; группы без зарплат — в хвосте по count.
 */
export function groupMedians(indices: ArrayLike<number>, groupOf: (i: number) => number, salaryOf: (i: number) => number): GroupStat[] {
  const buckets = new Map<number, number[]>();
  const counts = new Map<number, number>();
  for (let k = 0; k < indices.length; k += 1) {
    const i = indices[k]!;
    const g = groupOf(i);
    counts.set(g, (counts.get(g) ?? 0) + 1);
    const s = salaryOf(i);
    if (s > 0) {
      let arr = buckets.get(g);
      if (!arr) buckets.set(g, (arr = []));
      arr.push(s);
    }
  }
  const out: GroupStat[] = [];
  for (const [key, count] of counts) {
    const arr = (buckets.get(key) ?? []).sort((a, b) => a - b);
    out.push({
      key,
      count,
      withSalary: arr.length,
      median: arr.length ? percentileSorted(arr, 50) : 0,
    });
  }
  out.sort((a, b) => b.median - a.median || b.count - a.count);
  return out;
}
