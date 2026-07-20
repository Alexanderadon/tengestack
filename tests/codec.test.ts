import { describe, expect, it } from "vitest";
import { decodeRow, encodeDataset, skillsOf } from "@/entities/vacancy/codec";
import type { NormalizedVacancy } from "@/entities/vacancy/types";

const row = (over: Partial<NormalizedVacancy>): NormalizedVacancy => ({
  id: 1,
  title: "Frontend-разработчик",
  employer: "AlmaSoft",
  city: "Алматы",
  role: "frontend",
  grade: "middle",
  experience: "between1And3",
  salaryFrom: 600_000,
  salaryTo: 900_000,
  salaryMid: 750_000,
  gross: true,
  currency: "KZT",
  publishedDays: 20_600,
  workMode: "hybrid",
  skills: [0, 3],
  ...over,
});

const OPTS = { synthetic: false, source: "test", fx: { KZT: 1 }, generatedAt: "2026-07-20" };

describe("codec", () => {
  it("encode → decode даёт исходную строку", () => {
    const rows = [
      row({ id: 1 }),
      row({ id: 2, employer: "NomadPay", city: "Астана", skills: [5], workMode: "remote" }),
      row({ id: 3, salaryFrom: 0, salaryTo: 0, salaryMid: 0, skills: [] }),
    ];
    const ds = encodeDataset(rows, OPTS);
    expect(ds.n).toBe(3);
    for (let i = 0; i < rows.length; i += 1) {
      expect(decodeRow(ds, i)).toEqual(rows[i]);
    }
  });

  it("словари интернируются: повторы не раздувают dicts", () => {
    const ds = encodeDataset([row({ id: 1 }), row({ id: 2 }), row({ id: 3 })], OPTS);
    expect(ds.dicts.employers).toEqual(["AlmaSoft"]);
    expect(ds.dicts.cities).toEqual(["Алматы"]);
  });

  it("CSR-скиллы: offsets согласованы", () => {
    const ds = encodeDataset([row({ skills: [1, 2, 3] }), row({ id: 2, skills: [] }), row({ id: 3, skills: [7] })], OPTS);
    expect(ds.cols.skillsOff).toEqual([0, 3, 3, 4]);
    expect(skillsOf(ds, 0)).toEqual([1, 2, 3]);
    expect(skillsOf(ds, 1)).toEqual([]);
    expect(skillsOf(ds, 2)).toEqual([7]);
  });
});
