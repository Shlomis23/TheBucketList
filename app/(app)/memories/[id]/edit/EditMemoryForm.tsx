"use client";

import { useState } from "react";
import Link from "next/link";
import { updateMemoryAction } from "../../actions";
import { MemoryCategoryChips } from "@/components/MemoryCategoryChips";
import { MEMORY_STORY_MAX } from "@/lib/validation/memory";
import type { IdeaCategory } from "@/lib/validation/idea";
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
  const [title, setTitle] = useState(memory.title);
  const [category, setCategory] = useState<IdeaCategory | null>(memory.category);
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
      title,
      category,
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
      <div className="field mb-16">
        <label htmlFor="title">שם</label>
        <input
          id="title"
          className="input"
          maxLength={120}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title && <p className="alert-error">{fieldErrors.title[0]}</p>}
      </div>

      <div className="field mb-16">
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

      <div className="field mb-16">
        <label>קטגוריה (אופציונלי)</label>
        <MemoryCategoryChips value={category} onChange={setCategory} />
      </div>

      <div className="field mb-4">
        <label htmlFor="story">איך היה</label>
        <textarea
          id="story"
          className="textarea leading-loose"
          style={{ minHeight: 180 }}
          placeholder="מה עשיתם, מה הכי זכור, מה הייתם עושים אחרת..."
          value={story}
          onChange={(e) => setStory(e.target.value)}
          aria-invalid={over || Boolean(fieldErrors.story)}
          aria-describedby="story-count"
        />
      </div>
      <p
        id="story-count"
        className="status-msg m-0 mb-16 text-xs text-left"
        style={{ color: over ? "var(--color-danger)" : undefined }}
      >
        {story.length.toLocaleString("he-IL")} / {MEMORY_STORY_MAX.toLocaleString("he-IL")}
      </p>

      {errorMsg && (
        <p role="alert" className="alert-error mb-12">
          {errorMsg}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={status === "busy" || over || title.trim() === ""}>
        {status === "busy" ? "שומרים…" : "שמירה"}
      </button>
      <p className="text-center m-0 mt-12">
        <Link href={`/memories/${memory.id}`} className="link-plain">
          ביטול
        </Link>
      </p>
    </form>
  );
}
