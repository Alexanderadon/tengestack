import { describe, expect, it } from "vitest";
import { encodeDataset } from "@/entities/vacancy/codec";
import { ROLES, type NormalizedVacancy } from "@/entities/vacancy/types";
import {
  applyFilters,
  EMPTY_FILTERS,
  parseFilters,
  serializeFilters,
  type Filters,
} from "@/features/filters/model";

const mk = (over: Partial<NormalizedVacancy>): NormalizedVacancy => ({
  id: Math.floor(Math.random() * 1e6),
  title: "Разработчик",
  employer: "X",
  city: "Алматы",
  role: "backend",
  grade: "middle",
  experience: "between3And6",
  salaryFrom: 0,
  salaryTo: 0,
  salaryMid: 0,
  gross: false,
  currency: "KZT",
  publishedDays: 20_000,
  workMode: "office",
  skills: [],
  ...over,
});

const rows: NormalizedVacancy[] = [
  mk({ title: "Frontend React", role: "frontend", salaryMid: 700_000, salaryFrom: 700_000, salaryTo: 0, skills: [1, 2] }),
  mk({ title: "Backend Go", role: "backend", salaryMid: 900_000, salaryFrom: 800_000, salaryTo: 1_000_000, skills: [2] }),
  mk({ title: "QA Engineer", role: "qa", employer: "NomadPay", city: "Астана" }),
  mk({ title: "Senior Frontend", role: "frontend", grade: "senior", salaryMid: 1_400_000, salaryFrom: 1_400_000, salaryTo: 0 }),
];

const ds = encodeDataset(rows, { synthetic: true, source: "t", fx: { KZT: 1 }, generatedAt: "2026-07-20" });
ds.dicts.skills = ["SQL", "React", "TypeScript"];
const search = rows.map((r) => `${r.title} ${r.employer}`.toLowerCase());

const run = (f: Partial<Filters>) => Array.from(applyFilters(ds, search, { ...EMPTY_FILTERS, ...f }));

describe("applyFilters", () => {
  it("пустые фильтры возвращают всё", () => {
    expect(run({})).toEqual([0, 1, 2, 3]);
  });

  it("роль: multi-select", () => {
    expect(run({ roles: [ROLES.indexOf("frontend")] })).toEqual([0, 3]);
    expect(run({ roles: [ROLES.indexOf("frontend"), ROLES.indexOf("qa")] })).toEqual([0, 2, 3]);
  });

  it("зарплатный диапазон выкидывает вакансии без зарплаты", () => {
    expect(run({ salaryMin: 600_000 })).toEqual([0, 1, 3]);
    expect(run({ salaryMin: 800_000, salaryMax: 1_000_000 })).toEqual([1]);
  });

  it("withSalaryOnly", () => {
    expect(run({ withSalaryOnly: true })).toEqual([0, 1, 3]);
  });

  it("поиск по названию и работодателю, регистронезависимый", () => {
    expect(run({ q: "react" })).toEqual([0]);
    expect(run({ q: "nomadpay" })).toEqual([2]);
  });

  it("скиллы — AND-логика", () => {
    expect(run({ skills: [2] })).toEqual([0, 1]);
    expect(run({ skills: [1, 2] })).toEqual([0]);
  });
});

describe("URL round-trip", () => {
  it("serialize → parse восстанавливает фильтры", () => {
    const f: Filters = {
      ...EMPTY_FILTERS,
      roles: [ROLES.indexOf("frontend"), ROLES.indexOf("qa")],
      grades: [1],
      cities: [1],
      skills: [1],
      salaryMin: 500_000,
      salaryMax: 900_000,
      q: "react dev",
      withSalaryOnly: true,
    };
    const qs = serializeFilters(f, ds);
    const back = parseFilters(qs, ds);
    expect(back).toEqual(f);
  });

  it("мусор в URL игнорируется, а не роняет", () => {
    const back = parseFilters("?r=frontend,nonsense&smin=abc&c=Марс", ds);
    expect(back.roles).toEqual([ROLES.indexOf("frontend")]);
    expect(back.salaryMin).toBe(0);
    expect(back.cities).toEqual([]);
  });

  it("пустые фильтры → пустая строка", () => {
    expect(serializeFilters(EMPTY_FILTERS, ds)).toBe("");
  });
});
