import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TengeStack — зарплаты в IT Казахстана",
    short_name: "TengeStack",
    description: "Живой дашборд зарплат IT-рынка Казахстана по данным hh.kz",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e14",
    theme_color: "#0b0e14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
