import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { I18nProvider } from "@/shared/lib/i18n";
import { RegisterSW } from "./RegisterSW";
import "./globals.scss";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
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
    { media: "(prefers-color-scheme: dark)", color: "#14130f" },
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
  ],
};

/** До гидрации: тема из localStorage → системная. Инлайном, чтобы не мигало. */
const THEME_INIT = `(function(){try{var s=localStorage.getItem("ts-theme");var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" className={manrope.variable} suppressHydrationWarning>
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
