"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/entities/vacancy/types";
import { EXPERIENCES, GRADES, ROLES, WORK_MODES } from "@/entities/vacancy/types";
import { useI18n, type MsgKey } from "@/shared/lib/i18n";
import { EMPTY_FILTERS, isEmpty, toggleValue, type Filters } from "./model";
import s from "./FilterPanel.module.scss";

interface Props {
  ds: Dataset;
  filters: Filters;
  onChange: (f: Filters) => void;
  onShare: () => void;
  justShared: boolean;
}

function ChipGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: Array<{ value: number; label: string }>;
  selected: number[];
  onToggle: (value: number) => void;
}) {
  return (
    <fieldset className={s.group}>
      <legend className={s.legend}>{legend}</legend>
      <div className={s.chips} role="group" aria-label={legend}>
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              className={`${s.chip} ${active ? s.chipActive : ""}`}
              aria-pressed={active}
              onClick={() => onToggle(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterPanel({ ds, filters, onChange, onShare, justShared }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  // Топ городов по числу вакансий в датасете (стабильно, не зависит от фильтров).
  const cityOptions = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of ds.cols.cityIdx) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([value]) => ({ value, label: ds.dicts.cities[value]! }));
  }, [ds]);

  const activeCount =
    filters.roles.length +
    filters.grades.length +
    filters.exps.length +
    filters.modes.length +
    filters.cities.length +
    filters.skills.length +
    (filters.salaryMin ? 1 : 0) +
    (filters.salaryMax ? 1 : 0) +
    (filters.q ? 1 : 0) +
    (filters.withSalaryOnly ? 1 : 0);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const body = (
    <>
      <input
        type="search"
        className={s.search}
        placeholder={t("filters.search")}
        aria-label={t("filters.search")}
        value={filters.q}
        onChange={(e) => set({ q: e.target.value })}
      />

      <ChipGroup
        legend={t("filters.role")}
        options={ROLES.map((r, i) => ({ value: i, label: t(`role.${r}` as MsgKey) })).filter(
          (o) => ROLES[o.value] !== "other",
        )}
        selected={filters.roles}
        onToggle={(v) => set({ roles: toggleValue(filters.roles, v) })}
      />

      <ChipGroup
        legend={t("filters.grade")}
        options={GRADES.map((g, i) => ({ value: i, label: t(`grade.${g}` as MsgKey) }))}
        selected={filters.grades}
        onToggle={(v) => set({ grades: toggleValue(filters.grades, v) })}
      />

      <ChipGroup
        legend={t("filters.exp")}
        options={EXPERIENCES.map((e, i) => ({ value: i, label: t(`exp.${e}` as MsgKey) }))}
        selected={filters.exps}
        onToggle={(v) => set({ exps: toggleValue(filters.exps, v) })}
      />

      <ChipGroup
        legend={t("filters.mode")}
        options={WORK_MODES.filter((m) => m !== "unknown").map((m) => ({
          value: WORK_MODES.indexOf(m),
          label: t(`mode.${m}` as MsgKey),
        }))}
        selected={filters.modes}
        onToggle={(v) => set({ modes: toggleValue(filters.modes, v) })}
      />

      <ChipGroup
        legend={t("filters.city")}
        options={cityOptions}
        selected={filters.cities}
        onToggle={(v) => set({ cities: toggleValue(filters.cities, v) })}
      />

      <fieldset className={s.group}>
        <legend className={s.legend}>{t("filters.salary")}</legend>
        <div className={s.salaryRow}>
          <input
            type="number"
            className={s.salaryInput}
            inputMode="numeric"
            min={0}
            step={50}
            placeholder="от, тыс."
            aria-label={`${t("filters.salary")} — min`}
            value={filters.salaryMin ? filters.salaryMin / 1000 : ""}
            onChange={(e) => set({ salaryMin: (Number(e.target.value) || 0) * 1000 })}
          />
          <span className={s.salaryDash} aria-hidden="true">
            –
          </span>
          <input
            type="number"
            className={s.salaryInput}
            inputMode="numeric"
            min={0}
            step={50}
            placeholder="до, тыс."
            aria-label={`${t("filters.salary")} — max`}
            value={filters.salaryMax ? filters.salaryMax / 1000 : ""}
            onChange={(e) => set({ salaryMax: (Number(e.target.value) || 0) * 1000 })}
          />
        </div>
        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={filters.withSalaryOnly}
            onChange={(e) => set({ withSalaryOnly: e.target.checked })}
          />
          {t("filters.withSalaryOnly")}
        </label>
      </fieldset>

      {filters.skills.length > 0 && (
        <div className={s.skillTags}>
          {filters.skills.map((idx) => (
            <button
              key={idx}
              type="button"
              className={`${s.chip} ${s.chipActive}`}
              onClick={() => set({ skills: toggleValue(filters.skills, idx) })}
              title="Убрать фильтр"
            >
              {ds.dicts.skills[idx]} ✕
            </button>
          ))}
        </div>
      )}

      <div className={s.actions}>
        <button
          type="button"
          className={s.reset}
          onClick={() => onChange(EMPTY_FILTERS)}
          disabled={isEmpty(filters)}
        >
          {t("filters.reset")}
        </button>
        <button type="button" className={s.share} onClick={onShare}>
          {justShared ? t("filters.shared") : t("filters.share")}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* мобильный разворачиватель */}
      <button
        type="button"
        className={s.mobileToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t("filters.title")}
        {activeCount > 0 && <span className={s.badge}>{activeCount}</span>}
        <span className={`${s.chevron} ${open ? s.chevronOpen : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      <aside className={`${s.panel} ${open ? s.panelOpen : ""}`} aria-label={t("filters.title")}>
        {body}
      </aside>
    </>
  );
}
