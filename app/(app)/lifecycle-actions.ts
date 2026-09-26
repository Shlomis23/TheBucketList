"use server";

import { revalidatePath } from "next/cache";

// חזרה לאפליקציה מהרקע / חזרת רשת (AppLifecycle). router.refresh() מנקה
// רק את המסך הנוכחי מהמטמון בטלפון; מאז שהלשוניות נשמרות בטלפון לזמן קצר
// (staleTimes ב-next.config.ts, 26.9) צריך לנקות את כולן — אחרת לשונית
// שנטענה מראש לפני שהאפליקציה ירדה לרקע הייתה מוצגת עם נתונים ישנים.
// revalidatePath בתוך Server Action מנקה את כל המטמון בטלפון ומחזיר באותה
// תשובה את המסך הנוכחי מעודכן. לא נוגע בשום נתון, לכן בלי בדיקת משתמש.
export async function refreshAllAction(): Promise<void> {
  revalidatePath("/", "layout");
}
