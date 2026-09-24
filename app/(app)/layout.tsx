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
      <main style={{ flex: 1, paddingBottom: 8 }}>{children}</main>
      <BottomNav />
    </div>
  );
}
