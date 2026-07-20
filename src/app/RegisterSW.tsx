"use client";

import { useEffect } from "react";

/** Регистрация service worker — только в проде, дев не кэшируем. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* офлайн-режим — прогрессивное улучшение, падение не критично */
    });
  }, []);
  return null;
}
