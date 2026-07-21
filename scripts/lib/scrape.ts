/**
 * Скрейпер hh.kz: тянет встроенный JSON-стейт из HTML поисковой выдачи.
 *
 * Зачем не API: HH закрыл анонимный доступ к api.hh.ru/vacancies (403), а
 * получение app-токена требует ручной модерации приложения (дни). Публичные
 * HTML-страницы hh.kz при этом отдаются свободно и содержат в теге
 * <template id="HH-Lux-InitialState"> полный JSON состояния страницы —
 * структурированные вакансии с зарплатой (from/to/currency/gross/mode),
 * опытом, форматом работы, ролями. Парсим JSON, а не HTML-теги: устойчивее
 * к косметическим правкам вёрстки.
 *
 * Компромисс: в выдаче нет блока требований (snippet API), поэтому технологии
 * извлекаются только из названия вакансии — доля навыков занижена (см. Методику).
 *
 * Вежливость: один User-Agent как у браузера, пауза между запросами, ретраи
 * с бэкоффом. Анонимно, без логина — аккаунт не участвует.
 */
import type { HHVacancyItem } from "./hh";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Форма вакансии внутри HH-Lux-InitialState (только нужные поля). */
interface LuxVacancy {
  vacancyId: number;
  name: string;
  area?: { "@id"?: number; name?: string };
  company?: { name?: string };
  compensation?: {
    from?: number | null;
    to?: number | null;
    currencyCode?: string | null;
    gross?: boolean | null;
    mode?: string | null;
  } | null;
  publicationTime?: { "@timestamp"?: number; $?: string } | string | null;
  workExperience?: string;
  // hh.kz кладёт форматы вложенно: [{ workFormatsElement: ["ON_SITE","HYBRID"] }]
  workFormats?: Array<{ workFormatsElement?: string[] }> | null;
  "@workSchedule"?: string;
  // роли: [{ professionalRoleId: [96] }]
  professionalRoleIds?: Array<{ professionalRoleId?: number[] }>;
}

interface LuxState {
  vacancySearchResult?: {
    totalResults?: number;
    vacancies?: LuxVacancy[];
  };
}

/** Числовые и именованные HTML-сущности в JSON внутри <template>. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function parseLuxState(html: string): LuxState | null {
  const m = html.match(/<template[^>]*id="HH-Lux-InitialState"[^>]*>([\s\S]*?)<\/template>/);
  if (!m) return null;
  try {
    return JSON.parse(decodeEntities(m[1]!)) as LuxState;
  } catch {
    return null;
  }
}

/** publicationTime у HH может быть объектом с @timestamp (сек) или ISO-строкой. */
function toIso(pt: LuxVacancy["publicationTime"]): string {
  if (pt && typeof pt === "object") {
    if (typeof pt["@timestamp"] === "number") return new Date(pt["@timestamp"] * 1000).toISOString();
    if (typeof pt.$ === "string") return pt.$;
  }
  if (typeof pt === "string") return pt;
  return new Date().toISOString();
}

/** Разворачивает вложенные форматы работы: [{workFormatsElement:[...]}] → ["ON_SITE",...] */
function workFormatList(arr: LuxVacancy["workFormats"]): string[] {
  if (!arr) return [];
  return arr.flatMap((x) => x.workFormatsElement ?? []).filter(Boolean);
}

/** Разворачивает вложенные роли: [{professionalRoleId:[96]}] → [96] */
function roleIdList(arr: LuxVacancy["professionalRoleIds"]): number[] {
  if (!arr) return [];
  return arr.flatMap((x) => x.professionalRoleId ?? []).filter((n) => Number.isFinite(n));
}

/**
 * Приводим вакансию из лакс-стейта к той же форме HHVacancyItem, что отдаёт API,
 * чтобы build-dataset работал с обоими источниками без изменений.
 */
export function luxToItem(v: LuxVacancy): HHVacancyItem {
  const c = v.compensation;
  return {
    id: String(v.vacancyId),
    name: v.name,
    area: { id: String(v.area?.["@id"] ?? ""), name: v.area?.name ?? "Казахстан" },
    salary: c && (c.from || c.to)
      ? { from: c.from ?? null, to: c.to ?? null, currency: c.currencyCode ?? "KZT", gross: c.gross ?? null }
      : null,
    employer: { name: v.company?.name },
    published_at: toIso(v.publicationTime),
    experience: { id: v.workExperience },
    schedule: { id: v["@workSchedule"] },
    work_format: workFormatList(v.workFormats).map((id) => ({ id })),
    professional_roles: roleIdList(v.professionalRoleIds).map((id) => ({ id: String(id) })),
    // Требований в выдаче нет — навыки будут извлечены из названия в build-dataset.
    snippet: { requirement: null, responsibility: null },
  };
}

export interface ScrapeClientOptions {
  /** мс между запросами; hh.kz — быть вежливыми. */
  minIntervalMs?: number;
  host?: string;
}

export class ScrapeClient {
  private lastRequestAt = 0;
  private readonly host: string;
  private readonly interval: number;

  constructor(opts: ScrapeClientOptions = {}) {
    this.host = opts.host ?? "hh.kz";
    this.interval = opts.minIntervalMs ?? 1200;
  }

  private async throttle() {
    const wait = this.lastRequestAt + this.interval - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastRequestAt = Date.now();
  }

  /**
   * Одна страница выдачи. Возвращает вакансии и общее число результатов.
   * params — как в URL hh.kz/search/vacancy (professional_role, experience,
   * area, date_from/date_to, page, items_on_page).
   */
  async searchPage(
    params: Record<string, string | number>,
  ): Promise<{ items: HHVacancyItem[]; total: number }> {
    const url = new URL(`https://${this.host}/search/vacancy`);
    url.searchParams.set("items_on_page", "20"); // hh.kz web отдаёт максимум 20/страницу
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

    let attempt = 0;
    for (;;) {
      await this.throttle();
      let res: Response;
      try {
        res = await fetch(url, {
          headers: {
            "User-Agent": BROWSER_UA,
            "Accept-Language": "ru,en;q=0.9",
            Accept: "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (e) {
        attempt += 1;
        if (attempt > 5) throw e;
        await new Promise((r) => setTimeout(r, Math.min(60_000, 1000 * 2 ** attempt)));
        continue;
      }

      if (res.ok) {
        const html = await res.text();
        const state = parseLuxState(html);
        if (!state?.vacancySearchResult) {
          // капча/антибот-страница либо смена вёрстки
          attempt += 1;
          if (attempt > 3) throw new Error(`hh.kz: не найден HH-Lux-InitialState (антибот или смена вёрстки?) на ${url.pathname}${url.search}`);
          await new Promise((r) => setTimeout(r, 3000 * attempt));
          continue;
        }
        const sr = state.vacancySearchResult;
        return {
          items: (sr.vacancies ?? []).map(luxToItem),
          total: sr.totalResults ?? 0,
        };
      }

      attempt += 1;
      const retriable = res.status === 429 || res.status >= 500 || res.status === 403;
      if (!retriable || attempt > 5) {
        throw new Error(`hh.kz HTTP ${res.status} на ${url.pathname}${url.search}`);
      }
      const backoff = Math.min(90_000, 1500 * 2 ** attempt);
      console.warn(`  hh.kz ${res.status}, ретрай ${attempt}/5 через ${backoff / 1000}с`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
