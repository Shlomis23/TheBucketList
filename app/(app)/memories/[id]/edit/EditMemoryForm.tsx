"use client";

import { useState } from "react";
import Link from "next/link";
import { updateMemoryAction } from "../../actions";
import { MEMORY_STORY_MAX } from "@/lib/validation/memory";
import type { MemoryDto } from "@/lib/dal/memories";

function todayDateInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// עריכת זיכרון — תאריך + סיפור משותף. memoryId+version (expectedVersion)
// נלווים לכל שליחה (update_memory, 0016). בהתנגשות (בן/בת הזוג שמרו
// בינתיים) הטקסט שהוקלד נשאר בתיבה — לא מאבדים אותו, ולא דורסים בשקט.
export function EditMemoryForm({ memory }: { memory: MemoryDto }) {
  const [happenedOn, setHappenedOn] = useState(memory.happenedOn);
  const [story, setStory] = useState(memory.story);
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setErrorMsg("");
    setFieldErrors({});

    const result = await updateMemoryAction({
      memoryId: memory.id,
      expectedVersion: memory.version,
      happenedOn,
      story,
    });

    // בהצלחה ה-Server Action כבר עשה redirect ל-/memories/[id].
    if (result && !result.ok) {
      setStatus("error");
      setErrorMsg(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
    }
  }

  const over = story.length > MEMORY_STORY_MAX;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="happenedOn">מתי זה קרה</label>
        <input
          id="happenedOn"
          type="date"
          className="input"
          required
          max={todayDateInput()}
          value={happenedOn}
          onChange={(e) => setHappenedOn(e.target.value)}
          aria-invalid={Boolean(fieldErrors.happenedOn)}
        />
        {fieldErrors.happenedOn && <p className="alert-error">{fieldErrors.happenedOn[0]}</p>}
      </div>

      <div className="field" style={{ marginBottom: 4 }}>
        <label htmlFor="story">איך היה</label>
        <textarea
          id="story"
          className="textarea"
          style={{ minHeight: 180, lineHeight: 1.7 }}
          placeholder="מה עשיתם, מה הכי זכור, מה הייתם עושים אחרת..."
          value={story}
          onChange={(e) => setStory(e.target.value)}
          aria-invalid={over || Boolean(fieldErrors.story)}
          aria-describedby="story-count"
        />
      </div>
      <p
        id="story-count"
        className="status-msg"
        style={{ margin: "0 0 16px", fontSize: 12.5, textAlign: "left", color: over ? "var(--color-danger)" : undefined }}
      >
        {story.length.toLocaleString("he-IL")} / {MEMORY_STORY_MAX.toLocaleString("he-IL")}
      </p>

      {errorMsg && (
        <p role="alert" className="alert-error" style={{ marginBottom: 12 }}>
          {errorMsg}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy" || over}>
        {status === "busy" ? "שומרים…" : "שמירה"}
      </button>
      <p style={{ textAlign: "center", margin: "12px 0 0" }}>
        <Link href={`/memories/${memory.id}`} className="link-plain">
          ביטול
        </Link>
      </p>
    </form>
  );
}
