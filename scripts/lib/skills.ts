/**
 * Извлечение технологий из названия и сниппетов вакансии.
 *
 * Трейдофф: key_skills у HH лежат только в детальной карточке (1 запрос на
 * вакансию, тысячи запросов на выгрузку), а в поисковой выдаче есть
 * snippet.requirement/responsibility. Словарный матчинг по сниппетам покрывает
 * ~85% упоминаний технологий при нулевой цене по запросам — для агрегатов
 * этого достаточно. Ограничение зафиксировано на странице «Методика».
 */

/** Канон → варианты написания. Регистронезависимо; \b учитывает кириллицу отдельно. */
const SKILL_ALIASES: Record<string, string[]> = {
  JavaScript: ["javascript", "джаваскрипт"],
  TypeScript: ["typescript", "\\bts\\b"],
  React: ["react(?!\\s*native)", "реакт"],
  "React Native": ["react\\s*native"],
  Vue: ["vue|vuejs|vue\\.js|nuxt"],
  Angular: ["angular"],
  "Next.js": ["next\\.?js"],
  Svelte: ["svelte"],
  "Node.js": ["node\\.?js|нод[ае]"],
  NestJS: ["nest\\.?js"],
  Express: ["express\\.?js|\\bexpress\\b"],
  Python: ["python|питон"],
  Django: ["django"],
  FastAPI: ["fastapi"],
  Flask: ["flask"],
  Java: ["\\bjava\\b(?!\\s*script)"],
  Spring: ["spring\\b|spring\\s*(boot|framework)"],
  Kotlin: ["kotlin"],
  Swift: ["\\bswift\\b"],
  "C#": ["c#|c-sharp|\\.net|dotnet|asp\\.net"],
  "C++": ["c\\+\\+"],
  Go: ["\\bgolang\\b|\\bgo\\b(?=[^a-z]|$)"],
  PHP: ["\\bphp\\b"],
  Laravel: ["laravel"],
  Symfony: ["symfony"],
  Ruby: ["\\bruby\\b|rails"],
  Rust: ["\\brust\\b"],
  "1C": ["\\b1[сc]\\b|1[сc]:предприятие|1[сc]:erp|бсп"],
  Flutter: ["flutter|dart\\b"],
  Android: ["\\bandroid\\b"],
  iOS: ["\\bios\\b"],
  SQL: ["\\bsql\\b(?!\\s*server)|запросы sql"],
  PostgreSQL: ["postgres(?:ql)?|постгрес"],
  MySQL: ["mysql"],
  "SQL Server": ["sql\\s*server|mssql|t-sql"],
  Oracle: ["\\boracle\\b|pl/sql"],
  MongoDB: ["mongo(?:db)?"],
  Redis: ["redis"],
  ClickHouse: ["clickhouse"],
  Elasticsearch: ["elastic(?:search)?|opensearch"],
  Kafka: ["kafka"],
  RabbitMQ: ["rabbitmq"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes|\\bk8s\\b"],
  Terraform: ["terraform"],
  Ansible: ["ansible"],
  "CI/CD": ["ci/cd|ci\\\\cd|gitlab\\s*ci|github\\s*actions|jenkins|teamcity"],
  Linux: ["linux|линукс|ubuntu|centos|debian"],
  AWS: ["\\baws\\b|amazon web services"],
  GCP: ["\\bgcp\\b|google cloud"],
  Azure: ["azure"],
  Git: ["\\bgit\\b(?!hub|lab)"],
  GraphQL: ["graphql"],
  "REST API": ["rest(?:ful)?\\s*api|\\brest\\b"],
  gRPC: ["grpc"],
  WebSocket: ["websocket|веб-?сокет"],
  HTML: ["html5?|вёрстк|верстк"],
  CSS: ["css3?|sass|scss|less\\b|tailwind|styled-components"],
  Redux: ["redux|mobx|zustand|pinia"],
  Webpack: ["webpack|vite\\b|rollup|esbuild"],
  Jest: ["jest|vitest"],
  Cypress: ["cypress|playwright"],
  Selenium: ["selenium|selenide"],
  Figma: ["figma|фигм"],
  Photoshop: ["photoshop|фотошоп"],
  Illustrator: ["illustrator"],
  "UX-исследования": ["ux[- ]исследован|usability|юзабилити|custdev|касдев"],
  Prototyping: ["прототипирован|wireframe|вайрфрейм"],
  "Power BI": ["power\\s*bi"],
  Tableau: ["tableau"],
  Excel: ["excel|эксель"],
  "Pandas/NumPy": ["pandas|numpy"],
  PyTorch: ["pytorch|torch\\b"],
  TensorFlow: ["tensorflow"],
  "ML/AI": ["machine learning|машинн\\w+ обучен|\\bml\\b|нейросет|llm|genai"],
  Airflow: ["airflow"],
  Spark: ["\\bspark\\b"],
  ETL: ["\\betl\\b|\\belt\\b"],
  "Scrum/Agile": ["scrum|скрам|agile|эджайл|kanban|канбан"],
  Jira: ["jira|джир"],
  Confluence: ["confluence"],
  "BPMN/UML": ["bpmn|\\buml\\b"],
  SOLID: ["\\bsolid\\b|ооп|oop|design patterns|паттерн"],
  Microservices: ["микросервис|microservice"],
  HighLoad: ["highload|высоконагруж"],
  Nginx: ["nginx"],
  Grafana: ["grafana|prometheus|zabbix"],
  "Пентест": ["пентест|penetration|burp|metasploit"],
  SIEM: ["\\bsiem\\b|soc\\b"],
  "Сети/TCP-IP": ["tcp/ip|cisco|маршрутизаци|vlan"],
  "Английский": ["английск|english"],
};

export const SKILL_DICT = Object.keys(SKILL_ALIASES);

const COMPILED: Array<[number, RegExp]> = SKILL_DICT.map((canon, i) => [
  i,
  new RegExp(SKILL_ALIASES[canon]!.join("|"), "i"),
]);

/**
 * Возвращает индексы скиллов из SKILL_DICT, найденные в тексте.
 * Порядок стабилен (по словарю), дубликатов нет.
 */
export function extractSkills(text: string): number[] {
  if (!text) return [];
  const found: number[] = [];
  for (const [idx, re] of COMPILED) {
    if (re.test(text)) found.push(idx);
  }
  return found;
}
