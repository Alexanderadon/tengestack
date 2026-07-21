/**
 * Клиент HH API: app-токен по client_credentials, лимитер, ретраи с бэкоффом.
 *
 * HH закрыл анонимный доступ к /vacancies (403 без токена, проверено 2026-07).
 * Токен приложения живёт долго; получаем его один раз и кэшируем в data/.cache.
 */
import fs from "node:fs";
import path from "node:path";

const API = "https://api.hh.ru";
const CACHE_DIR = path.join(process.cwd(), "data", ".cache");
const TOKEN_CACHE = path.join(CACHE_DIR, "app-token.json");

export interface HHClientOptions {
  clientId?: string;
  clientSecret?: string;
  appToken?: string;
  contactEmail: string;
  /** мс между запросами; HH просит быть вежливыми. */
  minIntervalMs?: number;
}

export class HHClient {
  private token: string | null = null;
  private lastRequestAt = 0;
  private readonly ua: string;

  constructor(private readonly opts: HHClientOptions) {
    this.ua = `TengeStack/1.0 (${opts.contactEmail})`;
  }

  /** app-токен: из opts → из кэша → обмен client_credentials. */
  async ensureToken(): Promise<string> {
    if (this.token) return this.token;
    if (this.opts.appToken) return (this.token = this.opts.appToken);

    if (fs.existsSync(TOKEN_CACHE)) {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE, "utf8")) as { access_token?: string };
      if (cached.access_token) return (this.token = cached.access_token);
    }

    const { clientId, clientSecret } = this.opts;
    if (!clientId || !clientSecret) {
      // Анонимный режим: HH отдаёт /vacancies без токена нестабильно и
      // IP-зависимо (из КЗ — 403, из других сетей может работать).
      // Пробуем — при 403 упадём с понятной ошибкой.
      console.warn("HH-креденшлов нет — пробую анонимный доступ (нестабилен, зависит от IP).");
      return (this.token = "");
    }

    const res = await fetch(`${API}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": this.ua },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      throw new Error(`Обмен client_credentials не удался: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { access_token: string };
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(TOKEN_CACHE, JSON.stringify(json, null, 2));
    return (this.token = json.access_token);
  }

  private async throttle() {
    const interval = this.opts.minIntervalMs ?? 300;
    const wait = this.lastRequestAt + interval - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastRequestAt = Date.now();
  }

  /** GET с ретраями: 429/5xx → экспоненциальный бэкофф; 403 капчи — фатально. */
  async get<T>(pathname: string, params: Record<string, string | number> = {}): Promise<T> {
    const token = await this.ensureToken();
    const url = new URL(API + pathname);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

    let attempt = 0;
    for (;;) {
      await this.throttle();
      const headers: Record<string, string> = { "User-Agent": this.ua };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return (await res.json()) as T;

      attempt += 1;
      const body = await res.text().catch(() => "");
      const retriable = res.status === 429 || res.status >= 500;
      if (!retriable || attempt > 5) {
        const hint =
          res.status === 403 && !token
            ? " (анонимный доступ отклонён с этого IP — нужен токен: заявка на dev.hh.kz, либо запусти из CI)"
            : "";
        throw new Error(`HH ${res.status} на ${url.pathname}: ${body.slice(0, 300)}${hint}`);
      }
      const backoff = Math.min(60_000, 1000 * 2 ** attempt);
      console.warn(`  HH ${res.status}, ретрай ${attempt}/5 через ${backoff / 1000}с`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

/** Сырая вакансия из поисковой выдачи — только нужные нам поля. */
export interface HHVacancyItem {
  id: string;
  name: string;
  area?: { id: string; name: string };
  salary?: {
    from?: number | null;
    to?: number | null;
    currency?: string | null;
    gross?: boolean | null;
  } | null;
  employer?: { name?: string };
  published_at: string;
  experience?: { id?: string };
  schedule?: { id?: string };
  work_format?: Array<{ id?: string }>;
  professional_roles?: Array<{ id?: string }>;
  snippet?: { requirement?: string | null; responsibility?: string | null };
}

export interface HHSearchPage {
  items: HHVacancyItem[];
  found: number;
  pages: number;
  page: number;
}
