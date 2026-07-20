/**
 * Сборка датасета: data/raw/*.jsonl → public/data/dataset.json + meta.json
 *
 * Склеивает весь накопленный архив выгрузок, дедуплицирует по id (свежая
 * версия вакансии побеждает), нормализует и упаковывает колоночно.
 */
import fs from "node:fs";
import path from "node:path";
import { encodeDataset } from "@/entities/vacancy/codec";
import type { Dataset, DatasetMeta, NormalizedVacancy } from "@/entities/vacancy/types";
import type { HHVacancyItem } from "./lib/hh";
import { daysSinceEpoch, fetchFx, normalizeSalary } from "./lib/salary";
import { SKILL_DICT, extractSkills } from "./lib/skills";
import { experienceFromHH, inferGrade, inferRole, inferWorkMode } from "./lib/taxonomy";

function stripTags(s: string | null | undefined): string {
  // HH подсвечивает совпадения тегами <highlighttext>.
  return (s ?? "").replace(/<[^>]+>/g, " ");
}

export function normalizeItem(item: HHVacancyItem, fx: Record<string, number>): NormalizedVacancy {
  const title = item.name.trim();
  const salary = normalizeSalary(item.salary, fx);
  const experience = experienceFromHH(item.experience?.id);
  const roleIds = (item.professional_roles ?? [])
    .map((r) => Number(r.id))
    .filter((x) => Number.isFinite(x));
  const snippetText = `${title} ${stripTags(item.snippet?.requirement)} ${stripTags(item.snippet?.responsibility)}`;

  return {
    id: Number(item.id),
    title,
    employer: item.employer?.name?.trim() || "—",
    city: item.area?.name ?? "Казахстан",
    role: inferRole(roleIds, title),
    grade: inferGrade(title, experience),
    experience,
    salaryFrom: salary.from,
    salaryTo: salary.to,
    salaryMid: salary.mid,
    gross: salary.gross,
    currency: salary.currency,
    publishedDays: daysSinceEpoch(item.published_at),
    workMode: inferWorkMode(
      (item.work_format ?? []).map((w) => w.id ?? ""),
      item.schedule?.id,
    ),
    skills: extractSkills(snippetText),
  };
}

async function main() {
  const rawDir = path.join(process.cwd(), "data", "raw");
  if (!fs.existsSync(rawDir)) {
    console.error("Нет data/raw — сначала запусти pnpm data:fetch (или data:fixture для dev).");
    process.exit(1);
  }
  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".jsonl")).sort();
  if (files.length === 0) {
    console.error("data/raw пуст — сначала запусти pnpm data:fetch.");
    process.exit(1);
  }

  // Файлы отсортированы по дате → поздние записи перетирают ранние в Map.
  const byId = new Map<string, HHVacancyItem>();
  let syntheticSource = false;
  for (const f of files) {
    if (f.startsWith("synthetic")) syntheticSource = true;
    const lines = fs.readFileSync(path.join(rawDir, f), "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      const item = JSON.parse(line) as HHVacancyItem;
      byId.set(item.id, item);
    }
    console.log(`  ${f}: +${lines.length} строк (уникальных накоплено: ${byId.size})`);
  }
  // Если появились реальные выгрузки — синтетика игнорируется, а не смешивается.
  if (syntheticSource && files.some((f) => !f.startsWith("synthetic"))) {
    byId.clear();
    for (const f of files.filter((x) => !x.startsWith("synthetic"))) {
      for (const line of fs.readFileSync(path.join(rawDir, f), "utf8").split("\n").filter(Boolean)) {
        const item = JSON.parse(line) as HHVacancyItem;
        byId.set(item.id, item);
      }
    }
    syntheticSource = false;
    console.log(`  синтетика отброшена, реальных вакансий: ${byId.size}`);
  }

  const fx = await fetchFx();
  console.log(`FX: источник=${fx.source}, USD→KZT=${fx.rates.USD?.toFixed(1)}`);

  const rows = [...byId.values()]
    .map((item) => normalizeItem(item, fx.rates))
    .sort((a, b) => b.publishedDays - a.publishedDays || b.id - a.id);

  const generatedAt = new Date().toISOString().slice(0, 10);
  const ds: Dataset = encodeDataset(rows, {
    synthetic: syntheticSource,
    source: "api.hh.ru (area=Казахстан)",
    fx: Object.fromEntries(
      Object.entries(fx.rates).filter(([code]) => ["USD", "EUR", "RUB", "KZT"].includes(code)),
    ),
    generatedAt,
  });
  ds.dicts.skills = SKILL_DICT;

  const outDir = path.join(process.cwd(), "public", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const dsPath = path.join(outDir, "dataset.json");
  fs.writeFileSync(dsPath, JSON.stringify(ds));
  const bytes = fs.statSync(dsPath).size;

  const withSalary = rows.filter((r) => r.salaryMid > 0).length;
  const meta: DatasetMeta = {
    version: 1,
    generatedAt,
    synthetic: syntheticSource,
    n: rows.length,
    withSalary,
    datasetUrl: "/data/dataset.json",
    bytes,
  };
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta));

  console.log(
    `Датасет: ${rows.length} вакансий (${withSalary} с зарплатой, ${((withSalary / rows.length) * 100).toFixed(0)}%), ${(bytes / 1024 / 1024).toFixed(2)} МБ${syntheticSource ? " [SYNTHETIC]" : ""}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
