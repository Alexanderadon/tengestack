"use client";

import Link from "next/link";
import { useI18n } from "@/shared/lib/i18n";
import { useTheme } from "@/shared/lib/theme";
import { Logo } from "@/shared/ui/Logo";
import s from "./Header.module.scss";

export function Header() {
  const { t, lang, toggleLang } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <Link href="/" className={s.brand}>
          <Logo />
          <span className={s.brandText}>
            <span className={s.name}>TengeStack</span>
            <span className={s.tagline}>{t("app.tagline")}</span>
          </span>
        </Link>

        <nav className={s.nav} aria-label="Основная навигация">
          <Link href="/methodology" className={s.navLink}>
            {t("nav.methodology")}
          </Link>
          <Link href="/about" className={s.navLink}>
            {t("nav.about")}
          </Link>
          <button type="button" className={s.iconBtn} onClick={toggleLang} title={t("lang.toggle")}>
            {lang === "ru" ? "EN" : "RU"}
          </button>
          <button type="button" className={s.iconBtn} onClick={toggle} aria-label={t("theme.toggle")}>
            {theme === "dark" ? (
              /* солнце */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
              </svg>
            ) : (
              /* луна */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
