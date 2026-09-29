import { BottomNav } from "@/components/BottomNav";
import { AppLifecycle } from "@/components/AppLifecycle";
import { MatchCelebration } from "@/components/MatchCelebration";
import { getMatchCelebrationState } from "@/lib/dal/matches";
import { getMyProfile } from "@/lib/dal/profile";
import { ThemeSync } from "@/components/ThemeSync";
import { NavMemory } from "@/components/NavMemory";
import { UndoToast } from "@/components/UndoToast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/themes";

// עטיפה משותפת למסכי האפליקציה המחוברת (בית/רעיונות/בחירה/תוכניות/זיכרונות/הגדרות).
// מסכי Auth/onboarding/invite/offline/space-closed נשארים מחוץ לקבוצה הזו בכוונה —
// אין להם ניווט תחתון.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      {/* ריווח תחתון בגובה הניווט הקבוע (BottomNav הוא position: fixed). */}
      <main className="flex-1"
        style={{ paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 8px)" }}
      >
        {children}
      </main>
      <BottomNav />
      <AppLifecycle />
      <UndoToast />
      <PullToRefresh />
      {/* useSearchParams — בתוך Suspense לפי כללי Next. */}
      <Suspense fallback={null}>
        <NavMemory />
      </Suspense>
      {/* הבדיקות האלה אינן מעכבות יותר את תוכן המסך והניווט. כל אחת זורמת
          בנפרד כשהקריאה שלה מסתיימת. */}
      <Suspense fallback={null}>
        <ThemeSyncSlot />
      </Suspense>
      <Suspense fallback={null}>
        <MatchCelebrationSlot />
      </Suspense>
    </div>
  );
}

async function ThemeSyncSlot() {
  const [profile, cookieStore] = await Promise.all([getMyProfile(), cookies()]);
  if (!profile || profile.colorTheme === parseTheme(cookieStore.get(THEME_COOKIE)?.value)) return null;
  return <ThemeSync theme={profile.colorTheme} />;
}

async function MatchCelebrationSlot() {
  // ה-layout מתרנדר מחדש גם ב-router.refresh (AppLifecycle), לכן החגיגה עדיין
  // מופיעה כשבן/בת הזוג חוזרים לאפליקציה — רק בלי לחסום את המסך בדרך.
  const match = await getMatchCelebrationState();
  return match ? <MatchCelebration me={match.me} partner={match.partner} unseen={match.unseen} /> : null;
}
