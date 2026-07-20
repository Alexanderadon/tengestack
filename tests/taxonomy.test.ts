import { describe, expect, it } from "vitest";
import { inferGrade, inferRole, inferWorkMode } from "@scripts/lib/taxonomy";

describe("inferRole", () => {
  it("название сильнее справочника HH", () => {
    // роль 96 = «программист», но название говорит frontend
    expect(inferRole([96], "Frontend-разработчик (React)")).toBe("frontend");
    expect(inferRole([96], "Разработчик Vue.js")).toBe("frontend");
  });

  it("fullstack не проглатывается frontend'ом", () => {
    expect(inferRole([96], "Fullstack-разработчик (React + Node.js)")).toBe("fullstack");
  });

  it("1С распознаётся в обоих алфавитах", () => {
    expect(inferRole([96], "Программист 1С")).toBe("onec");
    expect(inferRole([96], "Разработчик 1C:ERP")).toBe("onec");
  });

  it("java не путается с javascript", () => {
    expect(inferRole([96], "Java-разработчик")).toBe("backend");
    expect(inferRole([96], "JavaScript-разработчик")).toBe("frontend");
  });

  it("generic 'разработчик' падает в backend", () => {
    expect(inferRole([96], "Разработчик программного обеспечения")).toBe("backend");
  });

  it("справочник работает, когда название немое", () => {
    expect(inferRole([124], "Специалист")).toBe("qa");
    expect(inferRole([160], "Инженер")).toBe("devops");
  });
});

describe("inferGrade", () => {
  it("слово в названии сильнее опыта", () => {
    expect(inferGrade("Senior QA Engineer", "noExperience")).toBe("senior");
    expect(inferGrade("Младший тестировщик", "moreThan6")).toBe("junior");
  });

  it("lead выигрывает у senior в одном названии", () => {
    expect(inferGrade("Senior Team Lead", "between3And6")).toBe("lead");
  });

  it("опыт 1–3 без слова — честный unknown", () => {
    expect(inferGrade("Разработчик Python", "between1And3")).toBe("unknown");
  });

  it("маппинг опыта в остальных случаях", () => {
    expect(inferGrade("Разработчик", "noExperience")).toBe("junior");
    expect(inferGrade("Разработчик", "between3And6")).toBe("middle");
    expect(inferGrade("Разработчик", "moreThan6")).toBe("senior");
  });
});

describe("inferWorkMode", () => {
  it("новый work_format приоритетен", () => {
    expect(inferWorkMode(["REMOTE"], "fullDay")).toBe("remote");
    expect(inferWorkMode(["HYBRID"], undefined)).toBe("hybrid");
    expect(inferWorkMode(["ON_SITE", "REMOTE"], undefined)).toBe("hybrid");
  });

  it("фолбэк на старый schedule", () => {
    expect(inferWorkMode(undefined, "remote")).toBe("remote");
    expect(inferWorkMode(undefined, "fullDay")).toBe("office");
    expect(inferWorkMode(undefined, undefined)).toBe("unknown");
  });
});
