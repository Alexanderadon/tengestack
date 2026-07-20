/**
 * Синтетический фикстур для разработки UI, пока нет HH-токена.
 *
 * Честность: файл называется synthetic-*.jsonl, датасет получает
 * synthetic=true, UI показывает баннер «демо-данные». Как только появляется
 * реальная выгрузка, build-dataset выбрасывает синтетику автоматически.
 * Работодатели вымышленные — реальным компаниям зарплаты не приписываем.
 *
 * Генератор сидированный (mulberry32) → фикстур воспроизводим бит-в-бит.
 */
import fs from "node:fs";
import path from "node:path";
import type { HHVacancyItem } from "./lib/hh";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0x7e46e);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]!;
const weighted = <T,>(pairs: Array<[T, number]>): T => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let roll = rnd() * total;
  for (const [v, w] of pairs) {
    roll -= w;
    if (roll <= 0) return v;
  }
  return pairs[pairs.length - 1]![0];
};

type RoleKey =
  | "frontend" | "backend" | "fullstack" | "mobile" | "qa" | "devops"
  | "data" | "analyst" | "design" | "pm" | "onec" | "security" | "support";

const ROLE_MIX: Array<[RoleKey, number]> = [
  ["backend", 20], ["frontend", 13], ["fullstack", 7], ["mobile", 6], ["qa", 9],
  ["devops", 7], ["data", 5], ["analyst", 10], ["design", 6], ["pm", 7],
  ["onec", 6], ["security", 2], ["support", 2],
];

const TITLES: Record<RoleKey, string[]> = {
  frontend: ["Frontend-разработчик", "Frontend Developer (React)", "Разработчик Vue.js", "Верстальщик / Frontend", "React-разработчик", "Angular Developer"],
  backend: ["Backend-разработчик", "Java-разработчик", "Python-разработчик", "Разработчик Go", "PHP-разработчик (Laravel)", "C#/.NET Developer", "Node.js Developer", "Kotlin Backend Developer"],
  fullstack: ["Fullstack-разработчик", "Fullstack Developer (React + Node.js)", "Веб-разработчик (fullstack)"],
  mobile: ["Android-разработчик", "iOS-разработчик", "Flutter-разработчик", "Mobile Developer (React Native)"],
  qa: ["QA-инженер", "Тестировщик ПО", "QA Automation Engineer", "Инженер по автоматизации тестирования", "Ручной тестировщик"],
  devops: ["DevOps-инженер", "Системный администратор Linux", "SRE-инженер", "Инженер по инфраструктуре"],
  data: ["Data Scientist", "Data Engineer", "ML-инженер", "Инженер данных"],
  analyst: ["Бизнес-аналитик", "Системный аналитик", "Аналитик данных", "BI-аналитик (Power BI)", "Продуктовый аналитик"],
  design: ["UX/UI-дизайнер", "Продуктовый дизайнер", "Веб-дизайнер", "UI-дизайнер (Figma)"],
  pm: ["Руководитель проектов IT", "Project Manager", "Product Manager", "Product Owner", "Скрам-мастер"],
  onec: ["Программист 1С", "Разработчик 1С", "Консультант-разработчик 1С:ERP"],
  security: ["Специалист по информационной безопасности", "Пентестер", "SOC-аналитик"],
  support: ["Специалист технической поддержки", "Инженер Helpdesk", "Системный инженер поддержки"],
};

const SNIPPETS: Record<RoleKey, string> = {
  frontend: "Опыт с JavaScript, TypeScript, React или Vue. Знание HTML, CSS (SCSS), сборка Webpack/Vite, Redux. Git, REST API, опыт с Jest.",
  backend: "Разработка на Java/Spring, Python (Django/FastAPI), Go или C#/.NET. PostgreSQL, Redis, Kafka, Docker, Kubernetes, микросервисы, REST API, gRPC.",
  fullstack: "React + Node.js (NestJS), TypeScript, PostgreSQL, Docker. Опыт с REST API и GraphQL, CI/CD.",
  mobile: "Разработка под Android (Kotlin) или iOS (Swift), Flutter. Опыт публикации приложений, REST API, Git.",
  qa: "Ручное и автоматизированное тестирование, Selenium/Playwright, Postman, SQL. Составление тест-кейсов, Jira, опыт с CI/CD.",
  devops: "Linux, Docker, Kubernetes, Terraform, Ansible, CI/CD (GitLab CI), мониторинг Grafana/Prometheus, Nginx, AWS.",
  data: "Python, Pandas/NumPy, SQL, машинное обучение, PyTorch. Airflow, Spark, ETL, ClickHouse. Построение ML-моделей.",
  analyst: "SQL, Excel, Power BI/Tableau, BPMN/UML. Сбор и формализация требований, Jira, Confluence, Agile.",
  design: "Figma, прототипирование, UX-исследования, дизайн-системы. Портфолио обязательно. Photoshop, Illustrator.",
  pm: "Управление командой разработки, Scrum/Agile, Jira, Confluence. Планирование релизов, работа со стейкхолдерами.",
  onec: "1С:Предприятие 8.3, БСП, типовые конфигурации (1С:ERP, УТ, БП). SQL, обмены, интеграции по REST API.",
  security: "Анализ защищённости, пентест, Burp Suite, SIEM, SOC. Linux, сети TCP/IP, скрипты Python.",
  support: "Поддержка пользователей, Windows/Linux, Active Directory, сети TCP/IP, Helpdesk-системы, 1С.",
};

/** [junior, middle, senior] базовые вилки, тыс. ₸/мес (gross). Lead = senior × 1.25. */
const SALARY_BANDS: Record<RoleKey, [[number, number], [number, number], [number, number]]> = {
  frontend: [[250, 420], [600, 950], [1100, 1650]],
  backend: [[260, 450], [650, 1050], [1200, 1850]],
  fullstack: [[280, 460], [650, 1050], [1200, 1800]],
  mobile: [[260, 430], [600, 1000], [1150, 1750]],
  qa: [[200, 350], [450, 750], [800, 1250]],
  devops: [[300, 500], [800, 1250], [1400, 2200]],
  data: [[300, 520], [700, 1150], [1300, 2000]],
  analyst: [[250, 420], [500, 850], [900, 1350]],
  design: [[200, 360], [450, 750], [800, 1250]],
  pm: [[300, 480], [600, 950], [1000, 1550]],
  onec: [[250, 420], [500, 850], [850, 1350]],
  security: [[280, 450], [650, 1000], [1100, 1700]],
  support: [[150, 250], [250, 420], [450, 700]],
};

const CITIES: Array<[string, number]> = [
  ["Алматы", 44], ["Астана", 31], ["Шымкент", 5], ["Караганда", 4], ["Актобе", 3],
  ["Атырау", 3], ["Павлодар", 2], ["Усть-Каменогорск", 2], ["Костанай", 2],
  ["Тараз", 1], ["Актау", 2], ["Семей", 1],
];

// Вымышленные работодатели: узнаваемо «казахстанские», но не существующие бренды.
const EMPLOYERS = [
  "TOO QazDigital Group", "AlmaSoft", "Steppe Technologies", "TOO Цифровой Актив",
  "NomadPay", "TOO SilkWay Systems", "Kok-Tobe Labs", "TOO DataOrda", "AqylTech",
  "TOO Байтерек Софт", "IrbisDev", "TOO CaspianCode", "TengriSoft", "TOO Jetisu Digital",
  "SaryArqa IT", "TOO Медеу Системс", "AltynByte", "TOO TumarTech", "BarysTech",
  "TOO Достык Диджитал", "QysStack", "TOO АлатауСофт", "OrdaSoft", "TOO KulanApps",
  "ShanyraqCloud", "TOO Аружан Технолоджис", "BeineTech", "TOO SamgauSoft",
  "ZereData", "TOO Мерей Диджитал", "TulparSoft", "TOO Nur IT Group",
];

const GRADE_WORD: Record<string, string[]> = {
  junior: ["Junior ", "Младший ", ""],
  middle: ["Middle ", "", ""],
  senior: ["Senior ", "Ведущий ", "Старший "],
  lead: ["Lead ", "Тимлид / ", "Руководитель группы — "],
};

const HH_ROLE_ID: Record<RoleKey, number> = {
  frontend: 96, backend: 96, fullstack: 96, mobile: 96, qa: 124, devops: 160,
  data: 165, analyst: 148, design: 34, pm: 104, onec: 96, security: 116, support: 112,
};

function makeVacancy(i: number, now: number): HHVacancyItem {
  const role = weighted(ROLE_MIX);
  // Распределение грейдов: рынок мидло-тяжёлый.
  const grade = weighted<keyof typeof GRADE_WORD>([["junior", 18], ["middle", 44], ["senior", 28], ["lead", 10]]);
  const gradeIdx = grade === "lead" ? 2 : grade === "senior" ? 2 : grade === "middle" ? 1 : 0;
  const [lo, hi] = SALARY_BANDS[role][gradeIdx];
  const mult = grade === "lead" ? 1.25 : 1;

  // ~42% вакансий публикуют зарплату (реальная доля на HH по KZ).
  const hasSalary = rnd() < 0.42;
  // Сеньоры/лиды на удалёнке иногда в USD.
  const usd = hasSalary && gradeIdx === 2 && rnd() < 0.12;
  let salary: HHVacancyItem["salary"] = null;
  if (hasSalary) {
    const base = (lo + (hi - lo) * rnd()) * mult * (0.9 + rnd() * 0.2);
    const spread = 0.75 + rnd() * 0.15;
    let from = Math.round((base * spread) / 10) * 10;
    let to = Math.round(base / 10) * 10;
    if (usd) {
      from = Math.round((from * 1000) / 518 / 100) * 100;
      to = Math.round((to * 1000) / 518 / 100) * 100;
    } else {
      from *= 1000;
      to *= 1000;
    }
    const form = rnd();
    salary = {
      from: form < 0.75 ? from : form < 0.9 ? from : null,
      to: form < 0.75 ? to : form < 0.9 ? null : to,
      currency: usd ? "USD" : "KZT",
      gross: rnd() < 0.6,
    };
  }

  const experience =
    grade === "junior" ? (rnd() < 0.5 ? "noExperience" : "between1And3")
    : grade === "middle" ? (rnd() < 0.55 ? "between1And3" : "between3And6")
    : grade === "senior" ? (rnd() < 0.7 ? "between3And6" : "moreThan6")
    : rnd() < 0.5 ? "between3And6" : "moreThan6";

  const workRoll = rnd();
  const workFormat = role === "support" || role === "onec"
    ? (workRoll < 0.8 ? ["ON_SITE"] : ["HYBRID"])
    : workRoll < 0.45 ? ["ON_SITE"] : workRoll < 0.72 ? ["HYBRID"] : ["REMOTE"];

  // Явный грейд в названии — у ~55% вакансий (остальные выводятся из опыта).
  const gradePrefix = rnd() < 0.55 ? pick(GRADE_WORD[grade]!) : "";
  const publishedAt = new Date(now - Math.floor(rnd() * 30 * 86_400_000)).toISOString();

  return {
    id: String(90_000_000 + i),
    name: `${gradePrefix}${pick(TITLES[role])}`,
    area: { id: "160", name: weighted(CITIES) },
    salary,
    employer: { name: pick(EMPLOYERS) },
    published_at: publishedAt,
    experience: { id: experience },
    schedule: { id: workFormat[0] === "REMOTE" ? "remote" : "fullDay" },
    work_format: workFormat.map((id) => ({ id })),
    professional_roles: [{ id: String(HH_ROLE_ID[role]) }],
    snippet: { requirement: SNIPPETS[role], responsibility: null },
  };
}

const N = 6200;
const now = Date.UTC(2026, 6, 20); // фиксированная дата → воспроизводимость
const items = Array.from({ length: N }, (_, i) => makeVacancy(i, now));

const outDir = path.join(process.cwd(), "data", "raw");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "synthetic-2026-07-20.jsonl");
fs.writeFileSync(outPath, items.map((x) => JSON.stringify(x)).join("\n") + "\n");
console.log(`Фикстур: ${N} синтетических вакансий → ${path.relative(process.cwd(), outPath)}`);
