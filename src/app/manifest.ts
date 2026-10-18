import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** PWA: cho phép "Thêm vào Màn hình chính" (iOS/Android) và mở như app độc lập. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Học ngoại ngữ — Trung & Anh",
    short_name: "Học ngoại ngữ",
    description: "Học tiếng Trung HSK và tiếng Anh IELTS cho người Việt.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#c73c27",
    lang: "vi",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${base}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
