import { BottomNav } from "@/components/BottomNav";

// עטיפה משותפת למסכי האפליקציה המחוברת (בית/רעיונות/בחירה/תוכניות/זיכרונות/הגדרות).
// מסכי Auth/onboarding/invite/offline/space-closed נשארים מחוץ לקבוצה הזו בכוונה —
// אין להם ניווט תחתון.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    </div>
  );
}
