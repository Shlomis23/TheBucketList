"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { goBack } from "@/lib/nav/memory";
import { scheduleIdeaDelete } from "@/components/UndoToast";

// מחיקת רעיון (26.9, 0035) — כל אחד מבני הזוג. אישור בדף, ואז חזרה למסך
// הקודם עם "ביטול" ל-5 שניות (UndoToast). variant="suggest" — הכרטיס "שניכם
// אמרתם לא" בדף הרעיון.
export function DeleteIdeaButton({
  ideaId,
  title,
  version,
  variant = "link",
}: {
  ideaId: string;
  title: string;
  version: number;
  variant?: "link" | "suggest";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    scheduleIdeaDelete({ id: ideaId, title, version });
    goBack(router, "/ideas");
  }

  if (confirming) {
    return (
      <div className="delete-confirm">
        <p className="m-0 text-sm">
          למחוק לצמיתות את &quot;{title}&quot;? התגובות והשיחה עליו יימחקו גם הן.
        </p>
        <div className="flex gap-8 justify-center mt-8">
          <button type="button" className="btn btn-danger" onClick={remove}>
            מחיקה
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)}>
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return variant === "suggest" ? (
    <button type="button" className="btn btn-danger-outline btn-block" onClick={() => setConfirming(true)}>
      מחיקת הרעיון
    </button>
  ) : (
    <button type="button" className="link-plain text-center c-danger" onClick={() => setConfirming(true)}>
      מחיקת הרעיון
    </button>
  );
}
