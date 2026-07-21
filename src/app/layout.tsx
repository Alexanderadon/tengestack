import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { I18nProvider } from "@/shared/lib/i18n";
import { RegisterSW } from "./RegisterSW";
import "./globals.scss";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TengeStack — зарплаты в IT Казахстана",
  description:
    "Живой дашборд зарплат IT-рынка Казахстана по открытым данным hh.kz: медианы по направлениям, грейдам и городам, востребованные технологии.",
  applicationName: "TengeStack",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "TengeStack — зарплаты в IT Казахстана",
    description: "Медианы по направлениям, грейдам и городам. Данные hh.kz, обновляются еженедельно.",
    type: "website",
    locale: "ru_RU",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0b" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f4" },
  ],
};

/** До гидрации: сохранённая тема, иначе — светлая (основная по умолчанию). Инлайном, чтобы не мигало. */
const THEME_INIT = `(function(){try{var s=localStorage.getItem("ts-theme");document.documentElement.dataset.theme=(s==="dark"?"dark":"light")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="light" className={inter.variable} suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        <I18nProvider>{children}</I18nProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
