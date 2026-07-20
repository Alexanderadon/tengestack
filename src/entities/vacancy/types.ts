/**
 * Схема данных TengeStack.
 *
 * Датасет хранится колоночно (structure-of-arrays) с словарями для повторяющихся
 * строк. Причина: 5–50k вакансий в row-JSON весят 8–40 МБ, в колоночном виде
 * с словарями — в 3–5 раз меньше, а фильтрация по колонкам быстрее и не создаёт
 * мусора в куче. Скиллы храним в CSR-формате (offsets + flat indices), как в
 * разреженных матрицах.
 */

/** Грейд, выведенный эвристикой из названия + опыта. */
export const GRADES = ["junior", "middle", "senior", "lead", "unknown"] as const;
export type Grade = (typeof GRADES)[number];

/** Опыт по классификатору HH. */
export const EXPERIENCES = [
  "noExperience",
  "between1And3",
  "between3And6",
  "moreThan6",
] as const;
export type Experience = (typeof EXPERIENCES)[number];

/** Ролевые бакеты — наша таксономия поверх professional_roles HH. */
export const ROLES = [
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "qa",
  "devops",
  "data",
  "analyst",
  "design",
  "pm",
  "onec", // 1C
  "security",
  "support",
  "other",
] as const;
export type Role = (typeof ROLES)[number];

/** Формат работы. */
export const WORK_MODES = ["office", "remote", "hybrid", "unknown"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

/** Нормализованная вакансия до колоночной упаковки (внутренний формат пайплайна). */
export interface NormalizedVacancy {
  id: number;
  title: string;
  employer: string;
  city: string;
  role: Role;
  grade: Grade;
  experience: Experience;
  /** ₸/мес; 0 = не указано. Приведено к KZT по курсу месяца снапшота. */
  salaryFrom: number;
  salaryTo: number;
  /** Середина вилки (или единственная граница); 0 = зарплата не указана. */
  salaryMid: number;
  /** true — «до вычета налогов» в оригинале вакансии. */
  gross: boolean;
  /** Оригинальная валюта (KZT/USD/RUB/EUR/...). */
  currency: string;
  /** Дни с эпохи Unix (UTC) — компактнее ISO-строк. */
  publishedDays: number;
  workMode: WorkMode;
  /** Индексы скиллов в словаре датасета. */
  skills: number[];
}

/** Колоночный датасет — то, что лежит в public/data/dataset.json. */
export interface Dataset {
  version: 1;
  /** ISO-дата генерации. */
  generatedAt: string;
  /** true — синтетический фикстур для разработки, в UI показываем баннер. */
  synthetic: boolean;
  source: string;
  /** Курсы к KZT на момент сборки: { USD: 512.3, ... } */
  fx: Record<string, number>;
  n: number;
  cols: {
    id: number[];
    title: string[];
    employerIdx: number[];
    cityIdx: number[];
    /** индекс в ROLES */
    roleIdx: number[];
    /** индекс в GRADES */
    gradeIdx: number[];
    /** индекс в EXPERIENCES */
    expIdx: number[];
    salaryFrom: number[];
    salaryTo: number[];
    salaryMid: number[];
    /** 0|1 */
    gross: number[];
    currencyIdx: number[];
    publishedDays: number[];
    /** индекс в WORK_MODES */
    workModeIdx: number[];
    /** CSR: skillsOff.length === n + 1 */
    skillsOff: number[];
    skillsIdx: number[];
  };
  dicts: {
    employers: string[];
    cities: string[];
    currencies: string[];
    skills: string[];
  };
}

/** Метаданные снапшота — маленький файл, грузится до основного датасета. */
export interface DatasetMeta {
  version: 1;
  generatedAt: string;
  synthetic: boolean;
  n: number;
  withSalary: number;
  datasetUrl: string;
  /** размер dataset.json в байтах (для прогресс-бара загрузки) */
  bytes: number;
}
