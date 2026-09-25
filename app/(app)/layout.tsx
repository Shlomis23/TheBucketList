import { BottomNav } from "@/components/BottomNav";
import { AppLifecycle } from "@/components/AppLifecycle";
import { MatchCelebration } from "@/components/MatchCelebration";
import { getMatchCelebrationState } from "@/lib/dal/matches";

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
  const match = await getMatchCelebrationState();
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* ריווח תחתון בגובה הניווט הקבוע (BottomNav הוא position: fixed). */}
      <main
        style={{
          flex: 1,
          paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 8px)",
        }}
      >
        {children}
      </main>
      <BottomNav />
      <AppLifecycle />
      {match && <MatchCelebration me={match.me} partner={match.partner} unseen={match.unseen} />}
    </div>
  );
}
