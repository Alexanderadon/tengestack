import { describe, expect, it } from "vitest";
import { extractSkills, SKILL_DICT } from "@scripts/lib/skills";

const names = (text: string) => extractSkills(text).map((i) => SKILL_DICT[i]);

describe("extractSkills", () => {
  it("React и React Native различаются", () => {
    expect(names("Опыт с React Native обязателен")).toContain("React Native");
    expect(names("Опыт с React Native обязателен")).not.toContain("React");
    expect(names("Опыт с React и Redux")).toContain("React");
  });

  it("русские формы находятся", () => {
    const found = names("Требуется опыт вёрстки, знание фигмы и питона");
    expect(found).toEqual(expect.arrayContaining(["HTML", "Figma", "Python"]));
  });

  it("1С ловится и латиницей, и кириллицей", () => {
    expect(names("Разработка на 1С:Предприятие")).toContain("1C");
    expect(names("Опыт 1C от 3 лет")).toContain("1C");
  });

  it("go не срабатывает внутри слов", () => {
    expect(names("Working on Django project")).not.toContain("Go");
    expect(names("Разработчик Golang")).toContain("Go");
  });

  it("пустой текст → пусто", () => {
    expect(extractSkills("")).toEqual([]);
  });

  it("дубликатов нет, индексы валидны", () => {
    const idx = extractSkills("React react РЕАКТ и снова React");
    expect(idx.length).toBe(new Set(idx).size);
    for (const i of idx) expect(SKILL_DICT[i]).toBeDefined();
  });
});
