import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Статический экспорт: весь дашборд — клиентский, данные — снапшот в /public/data.
  // Это осознанный трейдофф: нет сервера вообще → бесплатный хостинг, офлайн-PWA,
  // мгновенные фильтры. Динамика достигается еженедельным пересбором датасета в CI.
  output: "export",
  reactStrictMode: true,
  // На статическом экспорте оптимизатор изображений Next недоступен.
  images: { unoptimized: true },
  sassOptions: {
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default nextConfig;
