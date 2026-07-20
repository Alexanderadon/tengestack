"use client";

/**
 * Гистограмма зарплат: SVG, один ряд (одна мера → один цвет).
 * Интерактив: ховер-тултип на бин; клик/Enter — фильтр по границам бина
 * (повторный клик по тому же диапазону снимает его).
 */
import { useMemo } from "react";
import { formatInt, formatKzt, shortKzt } from "@/shared/lib/format";
import { useI18n } from "@/shared/lib/i18n";
import type { HistBin } from "@/shared/lib/stats";
import { ChartCard, Tooltip, useTooltip } from "./ChartCard";
import s from "./Charts.module.scss";

const W = 720;
const H = 220;
const PAD = { top: 18, right: 8, bottom: 26, left: 8 };

interface Props {
  bins: HistBin[];
  maxCount: number;
  median: number;
  activeRange: [number, number] | null;
  onBinClick: (x0: number, x1: number) => void;
}

export function Histogram({ bins, maxCount, median, activeRange, onBinClick }: Props) {
  const { t, lang } = useI18n();
  const { containerRef, tooltip, show, hide } = useTooltip();

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const geom = useMemo(() => {
    if (!bins.length || !maxCount) return null;
    const x0 = bins[0]!.x0;
    const x1 = bins[bins.length - 1]!.x1;
    const span = x1 - x0;
    const bw = plotW / bins.length;
    const bars = bins.map((b, i) => {
      const h = Math.round((b.count / maxCount) * plotH);
      return {
        bin: b,
        x: PAD.left + i * bw,
        y: PAD.top + plotH - h,
        w: Math.max(1, bw - 2), // 2px зазор между барами
        h,
      };
    });
    const medianX = PAD.left + ((median - x0) / span) * plotW;
    // тики: 4 «круглых» значения
    const ticks = [0.25, 0.5, 0.75].map((f) => ({
      x: PAD.left + f * plotW,
      value: x0 + f * span,
    }));
    return { bars, medianX, ticks, x0, x1 };
  }, [bins, maxCount, median, plotW, plotH]);

  if (!geom) {
    return (
      <ChartCard title={t("chart.histogram")} hint={t("chart.histogramHint")}>
        <div className={s.chartEmpty}>—</div>
      </ChartCard>
    );
  }

  const isActive = (b: HistBin) =>
    activeRange !== null && activeRange[0] === b.x0 && activeRange[1] === b.x1;
  const hasActive = activeRange !== null;

  return (
    <ChartCard title={t("chart.histogram")} hint={`${t("chart.histogramHint")} · ${t("chart.clickToFilter")}`}>
      <div className={s.chartBox} ref={containerRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label={t("chart.histogram")}>
          {/* сетка — рекессивная, 3 горизонтали */}
          {[0.33, 0.66, 1].map((f) => (
            <line
              key={f}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top + plotH - f * plotH}
              y2={PAD.top + plotH - f * plotH}
              className={s.gridline}
            />
          ))}

          {geom.bars.map(({ bin, x, y, w, h }) => (
            <g key={bin.x0}>
              {h > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={2}
                  className={s.bar}
                  style={{
                    fill: "var(--viz-mark)",
                    opacity: !hasActive || isActive(bin) ? 1 : 0.35,
                  }}
                />
              )}
              {/* невидимая полноростовая мишень: ховер + клик + клавиатура */}
              <rect
                x={x - 1}
                y={PAD.top}
                width={w + 2}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-pressed={isActive(bin)}
                aria-label={`${shortKzt(bin.x0, lang)}–${shortKzt(bin.x1, lang)}: ${formatInt(bin.count)} ${t("chart.vacanciesShort")}`}
                style={{ cursor: "pointer" }}
                onMouseMove={(e) =>
                  show(e, (
                    <>
                      <strong className="tnum">
                        {shortKzt(bin.x0, lang)} – {shortKzt(bin.x1, lang)} ₸
                      </strong>
                      <span>
                        {formatInt(bin.count)} {t("chart.vacanciesShort")}
                      </span>
                    </>
                  ))
                }
                onMouseLeave={hide}
                onClick={() => onBinClick(bin.x0, bin.x1)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onBinClick(bin.x0, bin.x1);
                  }
                }}
              />
            </g>
          ))}

          {/* базовая линия */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            className={s.baseline}
          />

          {/* медиана: риска + подпись (текст — текстовым цветом, не цветом серии) */}
          <line
            x1={geom.medianX}
            x2={geom.medianX}
            y1={PAD.top - 4}
            y2={PAD.top + plotH}
            className={s.medianLine}
          />
          <text
            x={geom.medianX}
            y={PAD.top - 7}
            textAnchor={geom.medianX > W - 130 ? "end" : "middle"}
            className={s.medianLabel}
          >
            {t("kpi.median")}: {formatKzt(median)}
          </text>

          {/* тики оси X */}
          {geom.ticks.map((tk) => (
            <text key={tk.x} x={tk.x} y={H - 8} textAnchor="middle" className={s.tick}>
              {shortKzt(tk.value, lang)}
            </text>
          ))}
          <text x={PAD.left} y={H - 8} textAnchor="start" className={s.tick}>
            {shortKzt(geom.x0, lang)}
          </text>
          <text x={W - PAD.right} y={H - 8} textAnchor="end" className={s.tick}>
            {shortKzt(geom.x1, lang)}
          </text>
        </svg>
        <Tooltip state={tooltip} />
      </div>
    </ChartCard>
  );
}
