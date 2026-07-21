/**
 * Выгрузка IT-вакансий Казахстана скрейпингом hh.kz → data/raw/YYYY-MM-DD.jsonl
 *
 * Альтернатива fetch.ts (API), не требующая токена: парсит встроенный JSON-стейт
 * публичных страниц поиска. Стратегия обхода лимита глубины (hh.kz, как и API,
 * не отдаёт больше ~2000 вакансий на запрос) та же: дробим по professional_role
 * × experience; если срез всё ещё толстый — режем интервал дат пополам.
 *
 * Вежливость: пауза 1.2с между запросами, один браузерный User-Agent, ретраи.
 * Анонимно, без логина.
 */
import fs from "node:fs";
import path from "node:path";
import type { HHVacancyItem } from "./lib/hh";
import { ScrapeClient } from "./lib/scrape";

const AREA_KAZAKHSTAN = "40";
const PER_PAGE = 20; // hh.kz web отдаёт 20/страницу
const DEPTH_LIMIT = 2000;

/** Роли из категории «Информационные технологии» + дизайн/аналитика (см. taxonomy.ts). */
const ROLE_IDS = [96, 160, 124, 112, 113, 114, 116, 104, 107, 73, 165, 164, 156, 150, 148, 34, 25, 126, 36, 121];
const EXPERIENCES = ["noExperience", "between1And3", "between3And6", "moreThan6"];

async function fetchSlice(
  client: ScrapeClient,
  params: Record<string, string | number>,
  sink: Map<string, HHVacancyItem>,
  label: string,
): Promise<void> {
  const first = await client.searchPage({ ...params, page: 0 });

  if (first.total > DEPTH_LIMIT && params.date_from && params.date_to) {
    const from = Date.parse(String(params.date_from));
    const to = Date.parse(String(params.date_to));
    if (to - from > 3_600_000) {
      const mid = new Date(from + (to - from) / 2).toISOString().slice(0, 19);
      await fetchSlice(client, { ...params, date_to: mid }, sink, `${label}↙`);
      await fetchSlice(client, { ...params, date_from: mid }, sink, `${label}↘`);
      return;
    }
  }

  for (const item of first.items) sink.set(item.id, item);
  const pages = Math.min(Math.ceil(first.total / PER_PAGE), Math.ceil(DEPTH_LIMIT / PER_PAGE));
  for (let p = 1; p < pages; p += 1) {
    const page = await client.searchPage({ ...params, page: p });
    for (const item of page.items) sink.set(item.id, item);
  }
  if (first.total > 0) console.log(`  ${label}: total=${first.total}, страниц=${pages}, накоплено=${sink.size}`);
}

async function main() {
  const client = new ScrapeClient({ host: "hh.kz", minIntervalMs: 1200 });

  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - 30 * 86_400_000);
  const sink = new Map<string, HHVacancyItem>();

  console.log(`TengeStack scrape (hh.kz): ${ROLE_IDS.length} ролей × ${EXPERIENCES.length} грейдов опыта`);
  for (const role of ROLE_IDS) {
    for (const exp of EXPERIENCES) {
      await fetchSlice(
        client,
        {
          area: AREA_KAZAKHSTAN,
          professional_role: role,
          experience: exp,
          date_from: dateFrom.toISOString().slice(0, 19),
          date_to: dateTo.toISOString().slice(0, 19),
        },
        sink,
        `role=${role} exp=${exp}`,
      );
    }
  }

  const outDir = path.join(process.cwd(), "data", "raw");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${dateTo.toISOString().slice(0, 10)}.jsonl`);
  fs.writeFileSync(outPath, [...sink.values()].map((v) => JSON.stringify(v)).join("\n") + "\n");
  console.log(`Готово: ${sink.size} уникальных вакансий → ${path.relative(process.cwd(), outPath)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
