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
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
  ],
};

/** До гидрации: тема из localStorage → системная. Инлайном, чтобы не мигало. */
const THEME_INIT = `(function(){try{var s=localStorage.getItem("ts-theme");var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <body className={inter.variable}>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        <I18nProvider>{children}</I18nProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
