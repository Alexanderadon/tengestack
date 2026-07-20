import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/widgets/Header/Header";
import s from "../content.module.scss";

export const metadata: Metadata = {
  title: "О проекте — TengeStack",
  description: "Зачем существует TengeStack и кто его сделал.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className={s.page}>
        <Link href="/" className={s.back}>
          ← к дашборду
        </Link>
        <h1>О проекте</h1>
        <p className={s.lead}>
          TengeStack — открытый дашборд зарплат IT-рынка Казахстана. Без регистрации, без продажи
          отчётов, без «оставьте почту». Просто данные.
        </p>

        <h2>Зачем</h2>
        <p>
          Разработчики в КЗ торгуются вслепую: зарплатные обзоры выходят раз в год, быстро
          устаревают и прячут сырые данные за PDF. Здесь — живой срез открытых вакансий hh.kz,
          обновляемый еженедельно, с фильтрами по направлению, грейду, городу и стеку. Любой срез
          шарится ссылкой.
        </p>

        <h2>Как устроен</h2>
        <ul>
          <li>
            <strong>Без бэкенда.</strong> Пайплайн раз в неделю собирает вакансии из HH API в
            колоночный снапшот (~1 МБ на десятки тысяч строк), а все вычисления — фильтры, медианы,
            перцентили, гистограммы — происходят в браузере за миллисекунды.
          </li>
          <li>
            <strong>PWA.</strong> Дашборд работает офлайн: последний снапшот кэшируется
            service-worker'ом.
          </li>
          <li>
            <strong>Открытая методика.</strong> Все упрощения и смещения данных описаны на странице{" "}
            <Link href="/methodology">«Методика»</Link> — включая то, чему верить нельзя.
          </li>
        </ul>

        <h2>Кто делает</h2>
        <p>
          <strong>Александр Курчаков</strong> — frontend-разработчик и UX/UI-дизайнер, Алматы.
        </p>
        <ul>
          <li>
            GitHub:{" "}
            <a href="https://github.com/Alexanderadon" target="_blank" rel="noopener noreferrer">
              Alexanderadon
            </a>
          </li>
          <li>
            LinkedIn:{" "}
            <a
              href="https://www.linkedin.com/in/alexandr-kurchakov-901a8320b"
              target="_blank"
              rel="noopener noreferrer"
            >
              alexandr-kurchakov
            </a>
          </li>
        </ul>

        <h2>Стек</h2>
        <p>
          Next.js 15 (static export) · TypeScript strict · SCSS Modules · кастомные SVG-чарты ·{" "}
          <code>@tanstack/react-virtual</code> · Node-пайплайн данных · GitHub Actions · Vitest.
          Ни одной чартовой библиотеки и ни одного UI-кита — осознанно.
        </p>
      </main>
    </>
  );
}
