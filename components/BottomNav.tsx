"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ניווט תחתון — בית / רעיונות / תוכניות / זיכרונות.
// כפתור "מה עושים?" ו-"+" הגלובליים חיים במסך הבית עצמו, לא כאן.
// ראו docs/The-Bucket-List-Technical-Spec-HE.md סעיף 4.
const TABS = [
  { href: "/", label: "בית", icon: HomeIcon },
  { href: "/ideas", label: "רעיונות", icon: IdeaIcon },
  { href: "/plans", label: "תוכניות", icon: PlanIcon },
  { href: "/memories", label: "זיכרונות", icon: MemoryIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      // fixed ולא sticky: overflow-x: hidden על html/body (AC12, globals.css)
      // הופך את body לקונטיינר גלילה, ובמצב הזה sticky לא נצמד ל-viewport
      // (בעיקר ב-iOS Safari) — הבר נגלל עם התוכן. ה-main ב-(app)/layout.tsx
      // שומר ריווח תחתון בגובה --bottom-nav-height כדי שלא יסתיר תוכן.
      style={{
        position: "fixed",
        bottom: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 50,
        minHeight: "var(--bottom-nav-height)",
        display: "flex",
        gap: 4,
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "8px 8px",
        paddingBottom: "calc(8px + var(--safe-area-bottom))",
      }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              minHeight: "var(--touch-target-min)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "6px 4px",
              borderRadius: "var(--radius-pill)",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--color-primary)" : "var(--color-muted)",
              background: active ? "var(--color-primary-soft)" : "transparent",
            }}
          >
            <Icon />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function IdeaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="6" />
      <path d="M9.5 21h5M10 18h4" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="15" rx="4" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  );
}

function MemoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="4" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}
