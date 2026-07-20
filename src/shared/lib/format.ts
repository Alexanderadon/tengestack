/** Форматирование чисел и денег. Узкий неразрывный пробел — разделитель тысяч. */

const NNBSP = " ";

export function formatInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/** 650000 → «650 000 ₸» */
export function formatKzt(n: number): string {
  return `${formatInt(n)}${NNBSP}₸`;
}

/** Короткая форма для осей/чипов: 650000 → «650к», 1250000 → «1,25М» */
export function shortKzt(n: number, lang: "ru" | "en" = "ru"): string {
  const k = lang === "ru" ? "к" : "k";
  const m = lang === "ru" ? "М" : "M";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    const s = v >= 10 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "");
    return `${lang === "ru" ? s.replace(".", ",") : s}${m}`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}${k}`;
  return String(Math.round(n));
}

/** Вилка: from/to могут быть нулями. */
export function formatSalaryRange(from: number, to: number, lang: "ru" | "en" = "ru"): string {
  if (!from && !to) return "";
  if (from && to) return `${formatInt(from)}${NNBSP}–${NNBSP}${formatKzt(to)}`;
  if (from) return lang === "ru" ? `от${NNBSP}${formatKzt(from)}` : `from${NNBSP}${formatKzt(from)}`;
  return lang === "ru" ? `до${NNBSP}${formatKzt(to)}` : `up to${NNBSP}${formatKzt(to)}`;
}

/** Дни с эпохи → «12 июл» / «Jul 12». */
export function formatDay(days: number, lang: "ru" | "en" = "ru"): string {
  const d = new Date(days * 86_400_000);
  return d.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
}

export function formatPercent(x: number): string {
  return `${Math.round(x * 100)}%`;
}
