/**
 * Таксономия: professional_roles HH + ключевые слова названия → ролевой бакет;
 * название + опыт → грейд; расписание/формат HH → режим работы.
 *
 * Всё — чистые функции без I/O, покрыты юнитами (tests/taxonomy.test.ts).
 */
import type { Experience, Grade, Role, WorkMode } from "@/entities/vacancy/types";

/**
 * Маппинг id professional_roles HH → бакет.
 * Ид-шники из справочника https://api.hh.ru/professional_roles (категория
 * «Информационные технологии» + дизайн/аналитика). Название вакансии может
 * переопределить бакет (см. roleFromTitle) — у HH роли часто проставлены криво.
 */
export const HH_ROLE_TO_BUCKET: Record<number, Role> = {
  96: "backend", // Программист, разработчик — уточняется по названию
  160: "devops", // DevOps-инженер
  124: "qa", // Тестировщик
  112: "support", // Специалист технической поддержки
  113: "devops", // Системный администратор
  114: "other", // Системный инженер
  116: "security", // Специалист по информационной безопасности
  104: "pm", // Руководитель проектов
  107: "pm", // Руководитель группы разработки
  73: "pm", // Менеджер продукта
  165: "data", // Дата-сайентист
  164: "analyst", // Системный аналитик
  156: "analyst", // BI-аналитик, аналитик данных
  150: "analyst", // Бизнес-аналитик
  148: "analyst", // Аналитик
  34: "design", // Дизайнер, художник
  25: "design", // Гейм-дизайнер
  126: "other", // Технический писатель
  36: "other", // Директор по информационным технологиям (CIO)
  121: "other", // Сетевой инженер
  };

/** Пары [regex, бакет] — порядок важен: первое совпадение побеждает. */
const TITLE_ROLE_RULES: Array<[RegExp, Role]> = [
  [/1[сc](?![a-zа-яё])|один[ае]с/i, "onec"],
  [/(fullstack|full[- ]stack|фул+стек)/i, "fullstack"],
  [/(front[- ]?end|фронт[- ]?енд|react|vue|angular|верстальщик|javascript[- ]разработчик|js[- ]разработчик)/i, "frontend"],
  [/(back[- ]?end|бэк[- ]?енд|бекенд|java(?!script)|kotlin(?!.*(android|mobile))|python|golang|(?<![a-z])go[- ](разработчик|developer)|php|ruby|\.net|c#|node\.?js|laravel|django|spring)/i, "backend"],
  [/(mobile|мобильн|android|ios|flutter|react[- ]native|swift)/i, "mobile"],
  [/(qa|тестировщик|тестирован|autotest|автотест|sdet)/i, "qa"],
  [/(devops|sre|системный администратор|sysadmin|инженер по инфраструктуре|platform engineer)/i, "devops"],
  [/(data scientist|data engineer|ml[- ]|machine learning|дата[- ]сайентист|инженер данных|llm|nlp|computer vision)/i, "data"],
  [/(аналитик|analyst|bi[- ]developer|power ?bi|tableau)/i, "analyst"],
  [/(дизайнер|designer|ux|ui(?![a-z])|продуктовый дизайн)/i, "design"],
  [/(руководитель (проект|разработ)|project manager|product (manager|owner)|скрам|scrum|agile[- ]коуч|delivery manager|продакт|проджект)/i, "pm"],
  [/(безопасност|security|пентест|appsec|devsecops|соц (аналитик|специалист)|soc)/i, "security"],
  [/(поддержк|support|helpdesk|хелпдеск|эникей)/i, "support"],
  [/(разработчик|developer|программист|инженер[- ]программист|software engineer)/i, "backend"],
];

export function inferRole(hhRoleIds: number[], title: string): Role {
  // Название — сильнее справочника: «Frontend-разработчик» с ролью 96 → frontend.
  for (const [re, role] of TITLE_ROLE_RULES) {
    if (re.test(title)) return role;
  }
  for (const id of hhRoleIds) {
    const bucket = HH_ROLE_TO_BUCKET[id];
    if (bucket && bucket !== "backend") return bucket;
  }
  if (hhRoleIds.some((id) => HH_ROLE_TO_BUCKET[id] === "backend")) return "backend";
  return "other";
}

const SENIOR_RE = /(senior|сеньор|синьор|ведущий|старший|ст\.\s|sr\.?(?![a-z]))/i;
const LEAD_RE = /(lead|лид(?![а-яё])|тимлид|техлид|team ?lead|tech ?lead|head of|руководитель (отдела|группы|направления)|архитектор|architect|principal|staff)/i;
const JUNIOR_RE = /(junior|джуниор|джун|младший|начинающий|стажер|стажёр|intern|trainee|jr\.?(?![a-z]))/i;
const MIDDLE_RE = /(middle|миддл|мидл|mid[- ]level)/i;

/**
 * Грейд: явное слово в названии сильнее опыта; иначе — маппинг опыта HH.
 * Опыт 1–3 без слова в названии оставляем unknown между junior/middle —
 * это честнее, чем произвольно записывать всех в джуны (вносит меньше шума
 * в медианы по грейдам; в UI такие строки попадают в «грейд не указан»).
 */
export function inferGrade(title: string, experience: Experience): Grade {
  if (LEAD_RE.test(title)) return "lead";
  if (SENIOR_RE.test(title)) return "senior";
  if (JUNIOR_RE.test(title)) return "junior";
  if (MIDDLE_RE.test(title)) return "middle";
  switch (experience) {
    case "noExperience":
      return "junior";
    case "between1And3":
      return "unknown";
    case "between3And6":
      return "middle";
    case "moreThan6":
      return "senior";
  }
}

/**
 * Режим работы. HH с 2024 отдаёт work_format[] (REMOTE / ON_SITE / HYBRID /
 * FIELD_WORK); старый schedule.id = remote|flexible|... оставляем как фолбэк.
 */
export function inferWorkMode(
  workFormats: string[] | undefined,
  scheduleId: string | undefined,
): WorkMode {
  const f = new Set((workFormats ?? []).map((x) => x.toUpperCase()));
  const hasRemote = f.has("REMOTE");
  const hasOffice = f.has("ON_SITE") || f.has("FIELD_WORK");
  if (f.has("HYBRID") || (hasRemote && hasOffice)) return "hybrid";
  if (hasRemote) return "remote";
  if (hasOffice) return "office";
  if (scheduleId === "remote") return "remote";
  if (scheduleId) return "office";
  return "unknown";
}

export function experienceFromHH(id: string | undefined): Experience {
  switch (id) {
    case "noExperience":
    case "between1And3":
    case "between3And6":
    case "moreThan6":
      return id;
    default:
      return "between1And3";
  }
}
