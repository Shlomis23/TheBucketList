import { BottomNav } from "@/components/BottomNav";
import { AppLifecycle } from "@/components/AppLifecycle";
import { MatchCelebration } from "@/components/MatchCelebration";
import { getMatchCelebrationState } from "@/lib/dal/matches";
import { getMyProfile } from "@/lib/dal/profile";
import { ThemeSync } from "@/components/ThemeSync";
import { NavMemory } from "@/components/NavMemory";
import { UndoToast } from "@/components/UndoToast";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/themes";

// עטיפה משותפת למסכי האפליקציה המחוברת (בית/רעיונות/בחירה/תוכניות/זיכרונות/הגדרות).
// מסכי Auth/onboarding/invite/offline/space-closed נשארים מחוץ לקבוצה הזו בכוונה —
// אין להם ניווט תחתון.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // מאצ'ים שעוד לא נחגגו אצלי (0030). ה-layout מתרנדר מחדש גם ב-router.refresh
  // (AppLifecycle) — כך בן/בת הזוג רואים את החגיגה כשחוזרים לאפליקציה.
  const [match, profile, cookieStore] = await Promise.all([getMatchCelebrationState(), getMyProfile(), cookies()]);
  // ערכת הצבע בפרופיל שונה מהעוגייה — מסנכרנים (ThemeSync).
  const themeMismatch =
    profile !== null && profile.colorTheme !== parseTheme(cookieStore.get(THEME_COOKIE)?.value);
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
      {/* useSearchParams — בתוך Suspense לפי כללי Next. */}
      <Suspense fallback={null}>
        <NavMemory />
      </Suspense>
      {themeMismatch && profile && <ThemeSync theme={profile.colorTheme} />}
      {match && <MatchCelebration me={match.me} partner={match.partner} unseen={match.unseen} />}
    </div>
  );
}
