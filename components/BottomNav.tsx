"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ניווט תחתון — בית / רעיונות / תוכניות / זיכרונות.
// כפתור "מה עושים?" ו-"+" הגלובליים חיים במסך הבית עצמו, לא כאן.
// ראו docs/The-Bucket-List-Technical-Spec-HE.md סעיף 4.
const TABS = [
  { href: "/", label: "בית" },
  { href: "/ideas", label: "רעיונות" },
  { href: "/plans", label: "תוכניות" },
  { href: "/memories", label: "זיכרונות" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט ראשי"
      style={{
        position: "sticky",
        bottom: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        display: "flex",
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg)",
        paddingBottom: "var(--safe-area-bottom)",
      }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              minHeight: "var(--touch-target-min)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 4px",
              textDecoration: "none",
              fontWeight: active ? 700 : 400,
              color: active ? "var(--color-primary)" : "var(--color-text)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
