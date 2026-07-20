/** Производные срезы для KPI и графиков — считаются от отфильтрованных индексов. */
import type { Dataset } from "@/entities/vacancy/types";
import { buildHistogram, groupMedians, percentileSorted, type GroupStat, type HistBin } from "@/shared/lib/stats";

export interface DashboardStats {
  total: number;
  withSalary: number;
  median: number;
  p25: number;
  p75: number;
  histogram: { bins: HistBin[]; maxCount: number; clipped: [number, number] };
  byRole: GroupStat[];
  byCity: GroupStat[];
  /** [skillIdx, count][] по убыванию */
  topSkills: Array<[number, number]>;
}

export function computeStats(ds: Dataset, idx: Uint32Array): DashboardStats {
  const { cols } = ds;

  const salaries: number[] = [];
  const skillCounts = new Map<number, number>();
  for (let k = 0; k < idx.length; k += 1) {
    const i = idx[k]!;
    const s = cols.salaryMid[i]!;
    if (s > 0) salaries.push(s);
    const start = cols.skillsOff[i]!;
    const end = cols.skillsOff[i + 1]!;
    for (let j = start; j < end; j += 1) {
      const sk = cols.skillsIdx[j]!;
      skillCounts.set(sk, (skillCounts.get(sk) ?? 0) + 1);
    }
  }
  salaries.sort((a, b) => a - b);

  const byRole = groupMedians(idx, (i) => cols.roleIdx[i]!, (i) => cols.salaryMid[i]!);
  const byCityAll = groupMedians(idx, (i) => cols.cityIdx[i]!, (i) => cols.salaryMid[i]!);
  // Города с 1–2 вакансиями дают мусорные «медианы» — отрезаем.
  const byCity = byCityAll.filter((g) => g.withSalary >= 5).slice(0, 10);

  const topSkills = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);

  return {
    total: idx.length,
    withSalary: salaries.length,
    median: percentileSorted(salaries, 50),
    p25: percentileSorted(salaries, 25),
    p75: percentileSorted(salaries, 75),
    histogram: buildHistogram(salaries),
    byRole,
    byCity,
    topSkills,
  };
}
