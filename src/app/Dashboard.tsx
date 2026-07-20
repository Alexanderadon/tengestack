"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadDataset, type LoadedData } from "@/entities/vacancy/load";
import { computeStats } from "@/features/dashboard/selectors";
import { FilterPanel } from "@/features/filters/FilterPanel";
import {
  applyFilters,
  EMPTY_FILTERS,
  parseFilters,
  serializeFilters,
  toggleValue,
  type Filters,
} from "@/features/filters/model";
import { formatPercent, shortKzt } from "@/shared/lib/format";
import { useI18n, type MsgKey } from "@/shared/lib/i18n";
import { ChartCard } from "@/widgets/Charts/ChartCard";
import { HBars, type HBarItem } from "@/widgets/Charts/HBars";
import { Histogram } from "@/widgets/Charts/Histogram";
import { Header } from "@/widgets/Header/Header";
import { KpiRow } from "@/widgets/KpiRow/KpiRow";
import { VacancyTable } from "@/widgets/VacancyTable/VacancyTable";
import { ROLES } from "@/entities/vacancy/types";
import { Logo } from "@/shared/ui/Logo";
import s from "./page.module.scss";

type LoadState =
  | { phase: "loading"; progress: number }
  | { phase: "error"; message: string }
  | { phase: "ready"; data: LoadedData };

export function Dashboard() {
  const { t, lang } = useI18n();
  const [load, setLoad] = useState<LoadState>({ phase: "loading", progress: 0 });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [justShared, setJustShared] = useState(false);
  const urlInitDone = useRef(false);

  const start = useCallback(() => {
    setLoad({ phase: "loading", progress: 0 });
    loadDataset((p) => setLoad((prev) => (prev.phase === "loading" ? { phase: "loading", progress: p } : prev)))
      .then((data) => setLoad({ phase: "ready", data }))
      .catch((e: unknown) => setLoad({ phase: "error", message: e instanceof Error ? e.message : String(e) }));
  }, []);

  useEffect(start, [start]);

  const ds = load.phase === "ready" ? load.data.ds : null;

  // URL → фильтры: при первой готовности данных и на back/forward.
  useEffect(() => {
    if (!ds) return;
    if (!urlInitDone.current) {
      urlInitDone.current = true;
      const initial = parseFilters(window.location.search, ds);
      setFilters(initial);
    }
    const onPop = () => setFilters(parseFilters(window.location.search, ds));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [ds]);

  // Фильтры → URL. replaceState вместо router: без ре-рендеров и RSC-запросов.
  useEffect(() => {
    if (!ds || !urlInitDone.current) return;
    const qs = serializeFilters(filters, ds);
    const next = `${window.location.pathname}${qs}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [filters, ds]);

  const filtered = useMemo(() => {
    if (load.phase !== "ready") return new Uint32Array(0);
    return applyFilters(load.data.ds, load.data.searchIndex, filters);
  }, [load, filters]);

  const stats = useMemo(() => {
    if (!ds) return null;
    return computeStats(ds, filtered);
  }, [ds, filtered]);

  const onShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setJustShared(true);
      window.setTimeout(() => setJustShared(false), 1600);
    });
  }, []);

  /* ---------- состояния загрузки ---------- */

  if (load.phase !== "ready" || !stats || !ds) {
    return (
      <>
        <Header />
        <main className={s.stateScreen}>
          <Logo size={44} />
          {load.phase === "error" ? (
            <>
              <p className={s.stateText}>
                {t("error.load")}: {load.message}
              </p>
              <button type="button" className={s.retry} onClick={start}>
                {t("error.retry")}
              </button>
            </>
          ) : (
            <>
              <div
                className={s.progress}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={load.phase === "loading" ? Math.round(load.progress * 100) : 0}
                aria-label={t("loading.dataset")}
              >
                <div
                  className={s.progressFill}
                  style={{ width: `${load.phase === "loading" ? load.progress * 100 : 0}%` }}
                />
              </div>
              <p className={s.stateText}>{t("loading.dataset")}</p>
            </>
          )}
        </main>
      </>
    );
  }

  /* ---------- данные для чартов ---------- */

  const roleItems: HBarItem[] = stats.byRole
    .filter((g) => g.withSalary >= 3)
    .map((g) => {
      const max = stats.byRole[0]?.median || 1;
      return {
        key: g.key,
        label: t(`role.${ROLES[g.key]!}` as MsgKey),
        frac: g.median / max,
        valueText: shortKzt(g.median, lang),
        subText: `${g.count}`,
        active: filters.roles.includes(g.key),
      };
    });

  const cityItems: HBarItem[] = stats.byCity.map((g) => {
    const max = stats.byCity[0]?.median || 1;
    return {
      key: g.key,
      label: ds.dicts.cities[g.key]!,
      frac: g.median / max,
      valueText: shortKzt(g.median, lang),
      subText: `${g.count}`,
      active: filters.cities.includes(g.key),
    };
  });

  const maxSkill = stats.topSkills[0]?.[1] ?? 1;
  const skillItems: HBarItem[] = stats.topSkills.map(([idx, count]) => ({
    key: idx,
    label: ds.dicts.skills[idx]!,
    frac: count / maxSkill,
    valueText: formatPercent(stats.total ? count / stats.total : 0),
    active: filters.skills.includes(idx),
  }));

  const activeSalaryRange: [number, number] | null =
    filters.salaryMin || filters.salaryMax ? [filters.salaryMin, filters.salaryMax] : null;

  return (
    <>
      <Header />
      {ds && load.data.meta.synthetic && (
        <div className={s.demoBanner} role="status">
          {t("banner.demo")}
        </div>
      )}
      <main className={s.main}>
        <FilterPanel
          ds={ds}
          filters={filters}
          onChange={setFilters}
          onShare={onShare}
          justShared={justShared}
        />

        <div className={s.content}>
          <KpiRow stats={stats} />

          {stats.total === 0 ? (
            <div className={s.emptyState}>
              <p className={s.emptyTitle}>{t("filters.empty")}</p>
              <p className={s.emptyHint}>{t("filters.emptyHint")}</p>
            </div>
          ) : (
            <>
              <Histogram
                bins={stats.histogram.bins}
                maxCount={stats.histogram.maxCount}
                median={stats.median}
                activeRange={activeSalaryRange}
                onBinClick={(x0, x1) => {
                  const same = filters.salaryMin === x0 && filters.salaryMax === x1;
                  setFilters({
                    ...filters,
                    salaryMin: same ? 0 : x0,
                    salaryMax: same ? 0 : x1,
                  });
                }}
              />

              <div className={s.chartsGrid}>
                <ChartCard title={t("chart.byRole")} hint={t("chart.clickToFilter")}>
                  <HBars
                    items={roleItems}
                    hasActive={filters.roles.length > 0}
                    ariaLabel={t("chart.byRole")}
                    onItemClick={(key) => setFilters({ ...filters, roles: toggleValue(filters.roles, key) })}
                  />
                </ChartCard>
                <ChartCard title={t("chart.byCity")} hint={t("chart.clickToFilter")}>
                  <HBars
                    items={cityItems}
                    hasActive={filters.cities.length > 0}
                    ariaLabel={t("chart.byCity")}
                    onItemClick={(key) => setFilters({ ...filters, cities: toggleValue(filters.cities, key) })}
                  />
                </ChartCard>
              </div>

              <ChartCard title={t("chart.skills")} hint={`${t("chart.skillsHint")} · ${t("chart.clickToFilter")}`}>
                <div className={s.skillsGrid}>
                  <HBars
                    items={skillItems.slice(0, Math.ceil(skillItems.length / 2))}
                    hasActive={filters.skills.length > 0}
                    ariaLabel={t("chart.skills")}
                    onItemClick={(key) => setFilters({ ...filters, skills: toggleValue(filters.skills, key) })}
                  />
                  <HBars
                    items={skillItems.slice(Math.ceil(skillItems.length / 2))}
                    hasActive={filters.skills.length > 0}
                    ariaLabel={t("chart.skills")}
                    onItemClick={(key) => setFilters({ ...filters, skills: toggleValue(filters.skills, key) })}
                  />
                </div>
              </ChartCard>

              <VacancyTable ds={ds} indices={filtered} synthetic={load.data.meta.synthetic} />
            </>
          )}

          <footer className={s.footer}>
            <span>
              {t("footer.updated")}: {load.data.meta.generatedAt} · {t("footer.source")}
            </span>
            <span>
              TengeStack · Alexander Kurchakov ·{" "}
              <a href="https://github.com/Alexanderadon" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </span>
          </footer>
        </div>
      </main>
    </>
  );
}
