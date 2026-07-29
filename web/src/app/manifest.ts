import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TalkLov · 中美语言搭子与交友",
    short_name: "TalkLov",
    description: "你的中美语言搭子与交友平台",
    start_url: "/discover",
    display: "standalone",
    background_color: "#f7f1f6",
    theme_color: "#f7f1f6",
    orientation: "portrait",
    lang: "zh-CN",
    icons: [
      {
        src: "/brand/talklov-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/talklov-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
