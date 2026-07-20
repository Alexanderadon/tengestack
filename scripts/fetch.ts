/**
 * Выгрузка IT-вакансий Казахстана из HH API → data/raw/YYYY-MM-DD.jsonl
 *
 * Стратегия обхода лимита глубины (HH отдаёт максимум 2000 вакансий на запрос):
 * дробим выборку по professional_role × experience; если срез всё ещё >2000 —
 * дополнительно режем по дате публикации пополам (рекурсивно). Так выгружается
 * генеральная совокупность, а не «первые 2000».
 *
 * Сырые ответы храним как JSONL и коммитим в репозиторий: git — наша дешёвая
 * тайм-машина. Еженедельный cron в CI добавляет новый файл; build-dataset
 * склеивает архив с дедупликацией по id (свежая запись побеждает).
 */
import fs from "node:fs";
import path from "node:path";
import { HHClient, type HHSearchPage, type HHVacancyItem } from "./lib/hh";

const AREA_KAZAKHSTAN = "40";
const PER_PAGE = 100;
const DEPTH_LIMIT = 2000;

/** Роли из категории «Информационные технологии» + дизайн/аналитика (см. taxonomy.ts). */
const ROLE_IDS = [96, 160, 124, 112, 113, 114, 116, 104, 107, 73, 165, 164, 156, 150, 148, 34, 25, 126, 36, 121];
const EXPERIENCES = ["noExperience", "between1And3", "between3And6", "moreThan6"];

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.trim();
  }
}

async function fetchSlice(
  client: HHClient,
  params: Record<string, string | number>,
  sink: Map<string, HHVacancyItem>,
  label: string,
): Promise<void> {
  const first = await client.get<HHSearchPage>("/vacancies", { ...params, per_page: PER_PAGE, page: 0 });

  if (first.found > DEPTH_LIMIT && params.date_from && params.date_to) {
    // Срез толще лимита — режем интервал дат пополам.
    const from = Date.parse(String(params.date_from));
    const to = Date.parse(String(params.date_to));
    const midTime = from + (to - from) / 2;
    if (to - from > 3_600_000) {
      const mid = new Date(midTime).toISOString().slice(0, 19);
      await fetchSlice(client, { ...params, date_to: mid }, sink, `${label}↙`);
      await fetchSlice(client, { ...params, date_from: mid }, sink, `${label}↘`);
      return;
    }
  }

  const pages = Math.min(first.pages, Math.ceil(DEPTH_LIMIT / PER_PAGE));
  for (const item of first.items) sink.set(item.id, item);
  for (let p = 1; p < pages; p += 1) {
    const page = await client.get<HHSearchPage>("/vacancies", { ...params, per_page: PER_PAGE, page: p });
    for (const item of page.items) sink.set(item.id, item);
  }
  console.log(`  ${label}: found=${first.found}, забрали=${Math.min(first.found, pages * PER_PAGE)}`);
}

async function main() {
  loadEnv();
  const client = new HHClient({
    clientId: process.env.HH_CLIENT_ID,
    clientSecret: process.env.HH_CLIENT_SECRET,
    appToken: process.env.HH_APP_TOKEN,
    contactEmail: process.env.HH_CONTACT_EMAIL ?? "adamdimert@gmail.com",
  });

  // 30 дней назад — глубина архива поисковой выдачи HH.
  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - 30 * 86_400_000);
  const sink = new Map<string, HHVacancyItem>();

  console.log(`TengeStack fetch: area=KZ, ${ROLE_IDS.length} ролей × ${EXPERIENCES.length} грейдов опыта`);
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
  const stamp = dateTo.toISOString().slice(0, 10);
  const outPath = path.join(outDir, `${stamp}.jsonl`);
  const lines = [...sink.values()].map((v) => JSON.stringify(v));
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`Готово: ${sink.size} уникальных вакансий → ${path.relative(process.cwd(), outPath)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
