import type { MetadataRoute } from "next";

// PWA manifest — spec סעיף 12. אייקונים אמיתיים (192/512 + maskable)
// חסרים עדיין תחת public/icons — TODO לפני שלב 4.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Bucket List",
    short_name: "Bucket List",
    start_url: "/",
    display: "standalone",
    lang: "he",
    dir: "rtl",
    background_color: "#fffaf5",
    theme_color: "#b5573c",
    icons: [
      // TODO: להוסיף public/icons/icon-192.png ו-icon-512.png (כולל maskable)
    ],
  };
}
