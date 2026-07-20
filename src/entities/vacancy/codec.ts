/**
 * Кодек колоночного датасета: NormalizedVacancy[] ⇄ Dataset.
 * Используется и в пайплайне (encode), и в браузере (decode-хелперы),
 * поэтому здесь нет зависимостей от Node или DOM.
 */
import {
  EXPERIENCES,
  GRADES,
  ROLES,
  WORK_MODES,
  type Dataset,
  type NormalizedVacancy,
} from "./types";

/** Интернер строк: строка → стабильный индекс в словаре. */
export function createInterner() {
  const map = new Map<string, number>();
  const list: string[] = [];
  return {
    intern(s: string): number {
      const hit = map.get(s);
      if (hit !== undefined) return hit;
      const idx = list.length;
      map.set(s, idx);
      list.push(s);
      return idx;
    },
    list,
  };
}

export function encodeDataset(
  rows: NormalizedVacancy[],
  opts: { synthetic: boolean; source: string; fx: Record<string, number>; generatedAt: string },
): Dataset {
  const employers = createInterner();
  const cities = createInterner();
  const currencies = createInterner();

  const n = rows.length;
  const cols: Dataset["cols"] = {
    id: new Array(n),
    title: new Array(n),
    employerIdx: new Array(n),
    cityIdx: new Array(n),
    roleIdx: new Array(n),
    gradeIdx: new Array(n),
    expIdx: new Array(n),
    salaryFrom: new Array(n),
    salaryTo: new Array(n),
    salaryMid: new Array(n),
    gross: new Array(n),
    currencyIdx: new Array(n),
    publishedDays: new Array(n),
    workModeIdx: new Array(n),
    skillsOff: new Array(n + 1),
    skillsIdx: [],
  };

  cols.skillsOff[0] = 0;
  rows.forEach((r, i) => {
    cols.id[i] = r.id;
    cols.title[i] = r.title;
    cols.employerIdx[i] = employers.intern(r.employer);
    cols.cityIdx[i] = cities.intern(r.city);
    cols.roleIdx[i] = ROLES.indexOf(r.role);
    cols.gradeIdx[i] = GRADES.indexOf(r.grade);
    cols.expIdx[i] = EXPERIENCES.indexOf(r.experience);
    cols.salaryFrom[i] = r.salaryFrom;
    cols.salaryTo[i] = r.salaryTo;
    cols.salaryMid[i] = r.salaryMid;
    cols.gross[i] = r.gross ? 1 : 0;
    cols.currencyIdx[i] = currencies.intern(r.currency);
    cols.publishedDays[i] = r.publishedDays;
    cols.workModeIdx[i] = WORK_MODES.indexOf(r.workMode);
    for (const s of r.skills) cols.skillsIdx.push(s);
    cols.skillsOff[i + 1] = cols.skillsIdx.length;
  });

  return {
    version: 1,
    generatedAt: opts.generatedAt,
    synthetic: opts.synthetic,
    source: opts.source,
    fx: opts.fx,
    n,
    cols,
    dicts: {
      employers: employers.list,
      cities: cities.list,
      currencies: currencies.list,
      // словарь скиллов подставляет вызывающая сторона (у пайплайна он глобальный)
      skills: [],
    },
  };
}

/** Скиллы i-й вакансии (индексы словаря) — без аллокации массива на строку в хот-патах. */
export function skillsOf(ds: Dataset, i: number): number[] {
  const start = ds.cols.skillsOff[i]!;
  const end = ds.cols.skillsOff[i + 1]!;
  return ds.cols.skillsIdx.slice(start, end);
}

/** Обратная распаковка одной строки — для таблицы/отладки, не для фильтров. */
export function decodeRow(ds: Dataset, i: number): NormalizedVacancy {
  return {
    id: ds.cols.id[i]!,
    title: ds.cols.title[i]!,
    employer: ds.dicts.employers[ds.cols.employerIdx[i]!]!,
    city: ds.dicts.cities[ds.cols.cityIdx[i]!]!,
    role: ROLES[ds.cols.roleIdx[i]!]!,
    grade: GRADES[ds.cols.gradeIdx[i]!]!,
    experience: EXPERIENCES[ds.cols.expIdx[i]!]!,
    salaryFrom: ds.cols.salaryFrom[i]!,
    salaryTo: ds.cols.salaryTo[i]!,
    salaryMid: ds.cols.salaryMid[i]!,
    gross: ds.cols.gross[i] === 1,
    currency: ds.dicts.currencies[ds.cols.currencyIdx[i]!]!,
    publishedDays: ds.cols.publishedDays[i]!,
    workMode: WORK_MODES[ds.cols.workModeIdx[i]!]!,
    skills: skillsOf(ds, i),
  };
}
