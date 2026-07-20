"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import s from "./Charts.module.scss";

export interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Карточка чарта: заголовок + слот. */
export function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className={s.card}>
      <header className={s.cardHeader}>
        <h2 className={s.cardTitle}>{title}</h2>
        {hint && <span className={s.cardHint}>{hint}</span>}
      </header>
      {children}
    </section>
  );
}

/**
 * Тултип-хук: контейнер чарта (position:relative) + состояние.
 * Позиция — от верхнего левого угла контейнера, клампится по ширине в CSS.
 */
export function useTooltip() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const show = useCallback((e: { clientX: number; clientY: number }, content: ReactNode) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 8, content });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);
  return { containerRef, tooltip, show, hide };
}

export function Tooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;
  return (
    <div className={s.tooltip} style={{ left: state.x, top: state.y }} role="presentation">
      {state.content}
    </div>
  );
}
