/**
 * Модель фильтров: состояние, движок применения, сериализация в URL.
 *
 * Движок работает по колонкам без промежуточных объектов: один проход по n
 * строкам, результат — Uint32Array индексов. На 50k строк это <5 мс, поэтому
 * веб-воркер не нужен (замерено; порог пересмотра — ~200k строк).
 *
 * В URL пишем имена, а не индексы словарей: ссылки переживают пересборку
 * датасета (индексы городов меняются от снапшота к снапшоту, имена — нет).
 */
import type { Dataset } from "@/entities/vacancy/types";
import { GRADES, ROLES, WORK_MODES, EXPERIENCES } from "@/entities/vacancy/types";

export interface Filters {
  /** индексы в ROLES; пусто = все */
  roles: number[];
  /** индексы в GRADES */
  grades: number[];
  /** индексы в EXPERIENCES */
  exps: number[];
  /** индексы в WORK_MODES */
  modes: number[];
  /** индексы в ds.dicts.cities */
  cities: number[];
  /** индексы в ds.dicts.skills */
  skills: number[];
  /** ₸/мес; 0 = не задано */
  salaryMin: number;
  salaryMax: number;
  q: string;
  withSalaryOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  roles: [],
  grades: [],
  exps: [],
  modes: [],
  cities: [],
  skills: [],
  salaryMin: 0,
  salaryMax: 0,
  q: "",
  withSalaryOnly: false,
};

export function isEmpty(f: Filters): boolean {
  return (
    f.roles.length === 0 &&
    f.grades.length === 0 &&
    f.exps.length === 0 &&
    f.modes.length === 0 &&
    f.cities.length === 0 &&
    f.skills.length === 0 &&
    f.salaryMin === 0 &&
    f.salaryMax === 0 &&
    f.q === "" &&
    !f.withSalaryOnly
  );
}

/** Иммутабельный toggle значения в мультиселекте. */
export function toggleValue(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function applyFilters(ds: Dataset, searchIndex: string[], f: Filters): Uint32Array {
  const { cols } = ds;
  const roles = f.roles.length ? new Set(f.roles) : null;
  const grades = f.grades.length ? new Set(f.grades) : null;
  const exps = f.exps.length ? new Set(f.exps) : null;
  const modes = f.modes.length ? new Set(f.modes) : null;
  const cities = f.cities.length ? new Set(f.cities) : null;
  const q = f.q.trim().toLowerCase();
  const needSkills = f.skills;

  const out: number[] = [];
  for (let i = 0; i < ds.n; i += 1) {
    if (roles && !roles.has(cols.roleIdx[i]!)) continue;
    if (grades && !grades.has(cols.gradeIdx[i]!)) continue;
    if (exps && !exps.has(cols.expIdx[i]!)) continue;
    if (modes && !modes.has(cols.workModeIdx[i]!)) continue;
    if (cities && !cities.has(cols.cityIdx[i]!)) continue;

    const mid = cols.salaryMid[i]!;
    if (f.withSalaryOnly && mid === 0) continue;
    // Зарплатный диапазон отфильтровывает и вакансии без зарплаты:
    // пользователь явно сузил денежный срез.
    if ((f.salaryMin || f.salaryMax) && mid === 0) continue;
    if (f.salaryMin && mid < f.salaryMin) continue;
    if (f.salaryMax && mid > f.salaryMax) continue;

    if (q && !searchIndex[i]!.includes(q)) continue;

    if (needSkills.length) {
      const start = cols.skillsOff[i]!;
      const end = cols.skillsOff[i + 1]!;
      let ok = true;
      for (const need of needSkills) {
        let found = false;
        for (let k = start; k < end; k += 1) {
          if (cols.skillsIdx[k] === need) {
            found = true;
            break;
          }
        }
        if (!found) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
    }
    out.push(i);
  }
  return Uint32Array.from(out);
}

/* ---------------- URL ⇄ Filters ---------------- */

function csv(list: string[]): string {
  return list.join(",");
}

export function serializeFilters(f: Filters, ds: Dataset): string {
  const p = new URLSearchParams();
  if (f.roles.length) p.set("r", csv(f.roles.map((i) => ROLES[i]!)));
  if (f.grades.length) p.set("g", csv(f.grades.map((i) => GRADES[i]!)));
  if (f.exps.length) p.set("e", csv(f.exps.map((i) => EXPERIENCES[i]!)));
  if (f.modes.length) p.set("m", csv(f.modes.map((i) => WORK_MODES[i]!)));
  if (f.cities.length) p.set("c", csv(f.cities.map((i) => ds.dicts.cities[i]!)));
  if (f.skills.length) p.set("s", csv(f.skills.map((i) => ds.dicts.skills[i]!)));
  if (f.salaryMin) p.set("smin", String(Math.round(f.salaryMin / 1000)));
  if (f.salaryMax) p.set("smax", String(Math.round(f.salaryMax / 1000)));
  if (f.q) p.set("q", f.q);
  if (f.withSalaryOnly) p.set("ws", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function parseFilters(search: string, ds: Dataset): Filters {
  const p = new URLSearchParams(search);
  const idxIn = (list: readonly string[] | string[], names: string | null): number[] => {
    if (!names) return [];
    const out: number[] = [];
    for (const name of names.split(",")) {
      const i = list.indexOf(name);
      if (i >= 0) out.push(i);
    }
    return out;
  };
  return {
    roles: idxIn(ROLES, p.get("r")),
    grades: idxIn(GRADES, p.get("g")),
    exps: idxIn(EXPERIENCES, p.get("e")),
    modes: idxIn(WORK_MODES, p.get("m")),
    cities: idxIn(ds.dicts.cities, p.get("c")),
    skills: idxIn(ds.dicts.skills, p.get("s")),
    salaryMin: (Number(p.get("smin")) || 0) * 1000,
    salaryMax: (Number(p.get("smax")) || 0) * 1000,
    q: p.get("q") ?? "",
    withSalaryOnly: p.get("ws") === "1",
  };
}
