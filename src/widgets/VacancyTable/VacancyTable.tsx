"use client";

/**
 * Виртуализированный список вакансий.
 *
 * Виртуализация через @tanstack/react-virtual: в DOM живёт ~20 строк из
 * тысяч. Высота строки фиксирована на брейкпоинт (52px desktop / 84px mobile)
 * — measureElement не нужен, скролл не дёргается.
 */
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import type { Dataset } from "@/entities/vacancy/types";
import { GRADES, WORK_MODES } from "@/entities/vacancy/types";
import { formatDay, formatInt, formatSalaryRange } from "@/shared/lib/format";
import { useI18n, type MsgKey } from "@/shared/lib/i18n";
import { useMediaQuery } from "@/shared/lib/useMediaQuery";
import s from "./VacancyTable.module.scss";

type SortKey = "date" | "salary" | "title";
type SortDir = 1 | -1;

interface Props {
  ds: Dataset;
  indices: Uint32Array;
  synthetic: boolean;
}

export function VacancyTable({ ds, indices, synthetic }: Props) {
  const { t, lang } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  const isMobile = useMediaQuery("(max-width: 720px)");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(() => {
    const { cols } = ds;
    const arr = Array.from(indices);
    const cmp: Record<SortKey, (a: number, b: number) => number> = {
      date: (a, b) => cols.publishedDays[a]! - cols.publishedDays[b]!,
      // Вакансии без зарплаты при сортировке по зарплате всегда в хвосте.
      salary: (a, b) =>
        (cols.salaryMid[a]! || (sortDir === -1 ? -Infinity : Infinity)) -
        (cols.salaryMid[b]! || (sortDir === -1 ? -Infinity : Infinity)),
      title: (a, b) => cols.title[a]!.localeCompare(cols.title[b]!, "ru"),
    };
    const f = cmp[sortKey];
    arr.sort((a, b) => f(a, b) * sortDir);
    return arr;
  }, [ds, indices, sortKey, sortDir]);

  const rowH = isMobile ? 84 : 52;
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowH,
    overscan: 12,
  });

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(key === "title" ? 1 : -1);
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === -1 ? " ↓" : " ↑") : "");
  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
    sortKey !== key ? "none" : sortDir === 1 ? "ascending" : "descending";

  return (
    <section className={s.wrap} aria-label={t("table.title")}>
      <header className={s.head}>
        <h2 className={s.title}>{t("table.title")}</h2>
        <span className={s.count}>
          {t("table.shown")}: <span className="tnum">{formatInt(sorted.length)}</span>
        </span>
      </header>

      {!isMobile && (
        <div className={s.cols} role="row">
          <button type="button" className={s.colBtn} onClick={() => toggleSort("title")} aria-sort={ariaSort("title")}>
            {t("table.position")}
            {arrow("title")}
          </button>
          <span className={s.col}>{t("table.city")}</span>
          <span className={s.col}>{t("table.grade")}</span>
          <span className={s.col}>{t("table.mode")}</span>
          <button type="button" className={s.colBtn} onClick={() => toggleSort("salary")} aria-sort={ariaSort("salary")}>
            {t("table.salary")}
            {arrow("salary")}
          </button>
          <button type="button" className={s.colBtn} onClick={() => toggleSort("date")} aria-sort={ariaSort("date")}>
            {t("table.date")}
            {arrow("date")}
          </button>
        </div>
      )}

      <div className={s.scroll} ref={scrollRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((v) => {
            const i = sorted[v.index]!;
            const { cols, dicts } = ds;
            const grade = GRADES[cols.gradeIdx[i]!]!;
            const mode = WORK_MODES[cols.workModeIdx[i]!]!;
            const salary = formatSalaryRange(cols.salaryFrom[i]!, cols.salaryTo[i]!, lang);
            const inner = (
              <>
                <span className={s.cellMain}>
                  <span className={s.position}>{cols.title[i]}</span>
                  <span className={s.employer}>{dicts.employers[cols.employerIdx[i]!]}</span>
                </span>
                <span className={s.cellCity}>{dicts.cities[cols.cityIdx[i]!]}</span>
                <span className={s.cellGrade}>
                  {grade !== "unknown" && (
                    <span className={`${s.chip} ${s[`chip_${grade}`] ?? ""}`}>{t(`grade.${grade}` as MsgKey)}</span>
                  )}
                </span>
                <span className={s.cellMode}>{mode !== "unknown" ? t(`mode.${mode}` as MsgKey) : ""}</span>
                <span className={`${s.cellSalary} tnum`}>
                  {salary ? (
                    <>
                      {salary}
                      {cols.gross[i] === 1 && <span className={s.gross}> {t("table.gross")}</span>}
                    </>
                  ) : (
                    <span className={s.noSalary}>{t("table.noSalary")}</span>
                  )}
                </span>
                <span className={s.cellDate}>{formatDay(cols.publishedDays[i]!, lang)}</span>
              </>
            );

            const style: React.CSSProperties = {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: v.size,
              transform: `translateY(${v.start}px)`,
            };

            // Синтетика: ссылки вели бы на несуществующие вакансии — рендерим без <a>.
            return synthetic ? (
              <div key={v.key} className={s.row} style={style}>
                {inner}
              </div>
            ) : (
              <a
                key={v.key}
                className={s.row}
                style={style}
                href={`https://hh.kz/vacancy/${ds.cols.id[i]}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t("table.openHH")}
              >
                {inner}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
