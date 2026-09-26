import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { nextPathKind, safeNextPath } from "@/lib/validation/nextPath";

// /open?next=/plans/<id> — נחיתה מקישור חיצוני (יומן, וואטסאפ) כשהדפדפן לא
// מחובר (26.9). באייפון קישורים מאפליקציות אחרות נפתחים תמיד ב-Safari ולא
// באפליקציה שבמסך הבית (מגבלה של אפל), ו-Safari לא חולק איתה את ההתחברות.
// במקום "לא מצאנו" — הסבר איפה זה מחכה, ואפשרות להתחבר גם כאן. בלי פרטי
// התוכנית (הדף פתוח לכל מי שמחזיק את הקישור). מחובר — ישר ליעד.
const COPY = {
  plan: { what: "התוכנית", tab: "תוכניות" },
  idea: { what: "הרעיון", tab: "רעיונות" },
  memory: { what: "הזיכרון", tab: "זיכרונות" },
} as const;

export default async function OpenPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (next && (await getVerifiedUserId())) redirect(next);
  const c = COPY[next ? nextPathKind(next) : "plan"];

  return (
    <div className="auth-screen">
      <header className="auth-hero">
        {/* eslint-disable-next-line @next/next/no-img-element -- אייקון האפליקציה (SVG סטטי) */}
        <img src="/icons/icon.svg" alt="" className="auth-logo" width={92} height={92} />
        <h1 className="auth-title" dir="ltr">
          The Bucket List
        </h1>
        <p className="auth-tagline">{c.what} מחכה באפליקציה</p>
      </header>
      <main className="auth-sheet">
        <h2 className="auth-sheet-title">פתחו את האפליקציה ממסך הבית</h2>
        <p className="auth-sheet-sub leading-relaxed">
          באייפון, קישורים מהיומן ומאפליקציות אחרות נפתחים ב-Safari ולא באפליקציה. פתחו את The Bucket List ממסך הבית —{" "}
          {c.what} בלשונית &quot;{c.tab}&quot;.
        </p>
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="btn btn-outline btn-block mt-16">
          או להתחבר כאן, ב-Safari
        </Link>
      </main>
    </div>
  );
}
