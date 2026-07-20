"use client";

/**
 * Горизонтальные бары: одна мера на категорию → один цвет.
 * Каждая строка — настоящая <button> (клавиатура бесплатно), клик — фильтр.
 * Значения подписаны напрямую (селективные лейблы), текст — текстовыми токенами.
 */
import type { ReactNode } from "react";
import s from "./Charts.module.scss";

export interface HBarItem {
  key: number;
  label: string;
  /** 0..1 — доля от максимума в списке */
  frac: number;
  valueText: string;
  subText?: string;
  active: boolean;
}

interface Props {
  items: HBarItem[];
  hasActive: boolean;
  onItemClick: (key: number) => void;
  ariaLabel: string;
  emptyText?: ReactNode;
}

export function HBars({ items, hasActive, onItemClick, ariaLabel, emptyText }: Props) {
  if (!items.length) return <div className={s.chartEmpty}>{emptyText ?? "—"}</div>;

  return (
    <div role="group" aria-label={ariaLabel} className={s.hbars}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`${s.hbarRow} ${it.active ? s.hbarRowActive : ""}`}
          aria-pressed={it.active}
          onClick={() => onItemClick(it.key)}
        >
          <span className={s.hbarLabel} title={it.label}>
            {it.label}
          </span>
          <span className={s.hbarTrack}>
            <span
              className={s.hbarFill}
              style={{
                width: `${Math.max(1.5, it.frac * 100)}%`,
                opacity: !hasActive || it.active ? 1 : 0.35,
              }}
            />
          </span>
          <span className={`${s.hbarValue} tnum`}>
            {it.valueText}
            {it.subText && <span className={s.hbarSub}>{it.subText}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
