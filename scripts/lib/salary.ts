/**
 * Нормализация зарплат к ₸/мес.
 *
 * Решения (см. «Методика» на сайте):
 * - Валюта → KZT по курсу на момент сборки снапшота (open.er-api.com,
 *   фолбэк — зашитые курсы, дата фолбэка пишется в мету).
 * - gross/net НЕ нормализуем в v1: смешение «до/после налогов» даёт ~10–15%
 *   шума, но налоговая формула КЗ (ОПВ/ВОСМС/ИПН с вычетом МЗП) добавила бы
 *   ложную точность к данным, которые сами по себе вилки. Флаг gross сохраняем
 *   колонкой — можно фильтровать.
 * - salaryMid: середина вилки; если указана одна граница — берём её.
 */

/** Фолбэк-курсы к KZT (обновлены 2026-07). Используются, если API курсов недоступен. */
export const FX_FALLBACK: Record<string, number> = {
  KZT: 1,
  USD: 518,
  EUR: 565,
  RUB: 6.5,
  KGS: 5.9,
  UZS: 0.041,
  BYR: 158,
  UAH: 12.4,
  AZN: 305,
  GEL: 192,
};

export interface FxTable {
  rates: Record<string, number>;
  source: "live" | "fallback";
}

export async function fetchFx(fetchImpl: typeof fetch = fetch): Promise<FxTable> {
  try {
    const res = await fetchImpl("https://open.er-api.com/v6/latest/KZT", {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`fx http ${res.status}`);
    const json = (await res.json()) as { result: string; rates: Record<string, number> };
    if (json.result !== "success" || !json.rates?.USD) throw new Error("fx bad payload");
    // API отдаёт KZT→X, нам нужно X→KZT.
    const rates: Record<string, number> = { KZT: 1 };
    for (const [code, perKzt] of Object.entries(json.rates)) {
      if (perKzt > 0) rates[code] = 1 / perKzt;
    }
    return { rates, source: "live" };
  } catch {
    return { rates: FX_FALLBACK, source: "fallback" };
  }
}

export interface HHSalary {
  from?: number | null;
  to?: number | null;
  currency?: string | null;
  gross?: boolean | null;
}

export interface NormalizedSalary {
  from: number;
  to: number;
  mid: number;
  gross: boolean;
  currency: string;
}

/** HH иногда отдаёт код BYR для белорусского рубля — канонизируем известные коды. */
function canonCurrency(code: string): string {
  const c = code.toUpperCase();
  return c === "BYN" ? "BYR" : c;
}

export function normalizeSalary(s: HHSalary | null | undefined, fx: Record<string, number>): NormalizedSalary {
  if (!s || (!s.from && !s.to)) {
    return { from: 0, to: 0, mid: 0, gross: false, currency: "KZT" };
  }
  const currency = canonCurrency(s.currency ?? "KZT");
  const rate = fx[currency] ?? 0;
  // Неизвестная валюта → считаем зарплату неуказанной, а не врём курсом 1:1.
  if (rate === 0) return { from: 0, to: 0, mid: 0, gross: false, currency };

  const from = s.from ? Math.round(s.from * rate) : 0;
  const to = s.to ? Math.round(s.to * rate) : 0;
  const mid = from && to ? Math.round((from + to) / 2) : from || to;
  return { from, to, mid, gross: s.gross ?? false, currency };
}

/** Дни с эпохи Unix по UTC — компактный формат даты в колонке. */
export function daysSinceEpoch(iso: string): number {
  return Math.floor(Date.parse(iso) / 86_400_000);
}
