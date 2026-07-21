"use client";

import type { DashboardStats } from "@/features/dashboard/selectors";
import { formatInt, formatPercent, shortKzt } from "@/shared/lib/format";
import { useI18n } from "@/shared/lib/i18n";
import s from "./KpiRow.module.scss";

export function KpiRow({ stats }: { stats: DashboardStats }) {
  const { t, lang } = useI18n();
  const share = stats.total ? stats.withSalary / stats.total : 0;

  return (
    <section className={s.row} aria-label="Ключевые показатели">
      {/* Медиана — герой строки (выделяется размером карточки и крупной цифрой) */}
      <div className={s.card}>
        <div className={s.label}>{t("kpi.median")}</div>
        <div className={`${s.value} ${s.valueHero} tnum`}>
          {stats.withSalary ? (
            <>
              {formatInt(stats.median)}
              <span className={s.unit}>₸</span>
            </>
          ) : (
            "—"
          )}
        </div>
        <div className={s.hint}>{t("kpi.perMonth")}</div>
      </div>

      <div className={s.card}>
        <div className={s.label}>{t("kpi.p25p75")}</div>
        <div className={`${s.value} tnum`}>
          {stats.withSalary ? (
            <>
              {shortKzt(stats.p25, lang)}
              <span className={s.dash}>–</span>
              {shortKzt(stats.p75, lang)}
            </>
          ) : (
            "—"
          )}
        </div>
        <div className={s.hint}>{t("kpi.perMonth")}</div>
      </div>

      <div className={s.card}>
        <div className={s.label}>{t("kpi.vacancies")}</div>
        <div className={`${s.value} tnum`}>{formatInt(stats.total)}</div>
        <div className={s.hint}>
          {formatPercent(share)} {t("kpi.withSalary")}
        </div>
      </div>
    </section>
  );
}
