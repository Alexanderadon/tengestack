"use client";

/**
 * Мини-i18n без библиотек: типизированный словарь RU/EN + контекст.
 * RU — основной (аудитория — рынок КЗ), EN — для международных рекрутёров.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const DICT = {
  ru: {
    "app.title": "Зарплаты в IT Казахстана",
    "app.tagline": "Живой срез рынка по данным hh.kz",
    "banner.demo":
      "Это демо-данные (синтетика для разработки). Реальный датасет появится после первой выгрузки из HH API.",
    "loading.dataset": "Загружаю датасет…",
    "error.load": "Не удалось загрузить данные",
    "error.retry": "Повторить",

    "kpi.median": "Медиана",
    "kpi.p25p75": "P25–P75",
    "kpi.vacancies": "Вакансий",
    "kpi.withSalary": "с зарплатой",
    "kpi.perMonth": "₸/мес",

    "filters.title": "Фильтры",
    "filters.search": "Поиск: должность или компания",
    "filters.role": "Направление",
    "filters.grade": "Грейд",
    "filters.exp": "Опыт",
    "filters.mode": "Формат",
    "filters.city": "Город",
    "filters.salary": "Зарплата, ₸/мес",
    "filters.reset": "Сбросить всё",
    "filters.withSalaryOnly": "Только с зарплатой",
    "filters.share": "Скопировать ссылку на срез",
    "filters.shared": "Ссылка скопирована",
    "filters.empty": "Под фильтры не попала ни одна вакансия",
    "filters.emptyHint": "Ослабь условия или сбрось фильтры",

    "chart.histogram": "Распределение зарплат",
    "chart.histogramHint": "середины вилок, ₸/мес",
    "chart.byRole": "Медиана по направлениям",
    "chart.byCity": "Медиана по городам",
    "chart.skills": "Востребованные технологии",
    "chart.skillsHint": "доля вакансий с упоминанием",
    "chart.vacanciesShort": "вак.",
    "chart.clickToFilter": "клик — фильтр",

    "table.title": "Вакансии",
    "table.position": "Должность",
    "table.city": "Город",
    "table.grade": "Грейд",
    "table.mode": "Формат",
    "table.salary": "Зарплата",
    "table.date": "Дата",
    "table.gross": "до налогов",
    "table.noSalary": "не указана",
    "table.openHH": "Открыть на hh.kz",
    "table.shown": "показано",

    "grade.junior": "Junior",
    "grade.middle": "Middle",
    "grade.senior": "Senior",
    "grade.lead": "Lead",
    "grade.unknown": "Не указан",

    "exp.noExperience": "Без опыта",
    "exp.between1And3": "1–3 года",
    "exp.between3And6": "3–6 лет",
    "exp.moreThan6": "6+ лет",

    "mode.office": "Офис",
    "mode.remote": "Удалённо",
    "mode.hybrid": "Гибрид",
    "mode.unknown": "Не указан",

    "role.frontend": "Frontend",
    "role.backend": "Backend",
    "role.fullstack": "Fullstack",
    "role.mobile": "Mobile",
    "role.qa": "QA",
    "role.devops": "DevOps / SRE",
    "role.data": "Data / ML",
    "role.analyst": "Аналитика",
    "role.design": "Дизайн",
    "role.pm": "Менеджмент",
    "role.onec": "1С",
    "role.security": "Безопасность",
    "role.support": "Поддержка",
    "role.other": "Другое",

    "nav.methodology": "Методика",
    "nav.about": "О проекте",
    "footer.updated": "Данные обновлены",
    "footer.source": "Источник: открытые вакансии hh.kz",

    "theme.toggle": "Переключить тему",
    "lang.toggle": "Switch to English",
  },
  en: {
    "app.title": "IT Salaries in Kazakhstan",
    "app.tagline": "Live market snapshot from hh.kz data",
    "banner.demo":
      "Demo data (synthetic, for development). Real dataset will appear after the first HH API fetch.",
    "loading.dataset": "Loading dataset…",
    "error.load": "Failed to load data",
    "error.retry": "Retry",

    "kpi.median": "Median",
    "kpi.p25p75": "P25–P75",
    "kpi.vacancies": "Vacancies",
    "kpi.withSalary": "with salary",
    "kpi.perMonth": "₸/mo",

    "filters.title": "Filters",
    "filters.search": "Search: title or company",
    "filters.role": "Field",
    "filters.grade": "Level",
    "filters.exp": "Experience",
    "filters.mode": "Work mode",
    "filters.city": "City",
    "filters.salary": "Salary, ₸/mo",
    "filters.reset": "Reset all",
    "filters.withSalaryOnly": "With salary only",
    "filters.share": "Copy link to this view",
    "filters.shared": "Link copied",
    "filters.empty": "No vacancies match the filters",
    "filters.emptyHint": "Relax the conditions or reset filters",

    "chart.histogram": "Salary distribution",
    "chart.histogramHint": "range midpoints, ₸/mo",
    "chart.byRole": "Median by field",
    "chart.byCity": "Median by city",
    "chart.skills": "In-demand technologies",
    "chart.skillsHint": "share of vacancies mentioning",
    "chart.vacanciesShort": "vac.",
    "chart.clickToFilter": "click to filter",

    "table.title": "Vacancies",
    "table.position": "Position",
    "table.city": "City",
    "table.grade": "Level",
    "table.mode": "Mode",
    "table.salary": "Salary",
    "table.date": "Date",
    "table.gross": "before tax",
    "table.noSalary": "not listed",
    "table.openHH": "Open on hh.kz",
    "table.shown": "shown",

    "grade.junior": "Junior",
    "grade.middle": "Middle",
    "grade.senior": "Senior",
    "grade.lead": "Lead",
    "grade.unknown": "Unspecified",

    "exp.noExperience": "No experience",
    "exp.between1And3": "1–3 years",
    "exp.between3And6": "3–6 years",
    "exp.moreThan6": "6+ years",

    "mode.office": "Office",
    "mode.remote": "Remote",
    "mode.hybrid": "Hybrid",
    "mode.unknown": "Unspecified",

    "role.frontend": "Frontend",
    "role.backend": "Backend",
    "role.fullstack": "Fullstack",
    "role.mobile": "Mobile",
    "role.qa": "QA",
    "role.devops": "DevOps / SRE",
    "role.data": "Data / ML",
    "role.analyst": "Analytics",
    "role.design": "Design",
    "role.pm": "Management",
    "role.onec": "1C",
    "role.security": "Security",
    "role.support": "Support",
    "role.other": "Other",

    "nav.methodology": "Methodology",
    "nav.about": "About",
    "footer.updated": "Data updated",
    "footer.source": "Source: public vacancies on hh.kz",

    "theme.toggle": "Toggle theme",
    "lang.toggle": "Переключить на русский",
  },
} as const;

export type Lang = keyof typeof DICT;
export type MsgKey = keyof (typeof DICT)["ru"];

interface I18nValue {
  lang: Lang;
  t: (key: MsgKey) => string;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nValue>({
  lang: "ru",
  t: (k) => DICT.ru[k],
  toggleLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");

  useEffect(() => {
    const saved = localStorage.getItem("ts-lang");
    if (saved === "en" || saved === "ru") setLang(saved);
  }, []);

  const t = useCallback((key: MsgKey) => DICT[lang][key], [lang]);
  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === "ru" ? "en" : "ru";
      localStorage.setItem("ts-lang", next);
      document.documentElement.lang = next;
      return next;
    });
  }, []);

  return <I18nContext.Provider value={{ lang, t, toggleLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
