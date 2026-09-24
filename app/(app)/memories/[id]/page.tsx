import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemory } from "@/lib/dal/memories";
import { formatMemoryDate } from "@/lib/validation/memory";
import { getIdeaCoverImage } from "@/lib/covers";

// זיכרון `/memories/[id]` — spec סעיף 6. בשלב הזה: תאריך + סיפור משותף
// + עריכה. גלריית תמונות תגיע בשלב נפרד (memory_photos/Storage לא נקראים
// כאן) — בכוונה לא מציגים placeholder שמבטיח משהו שעוד לא קיים.
// זר/חסר: notFound() זהה, כמו /ideas/[id] ו-/plans/[id].
export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = await getMemory(id);
  if (!memory) notFound();

  return (
    <div className="page">
      {memory.category && (
        // eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי
        <img src={getIdeaCoverImage(memory.category)} alt="" className="hero-banner" />
      )}
      <p className="page-eyebrow">{formatMemoryDate(memory.happenedOn)}</p>
      <h1 className="page-title">{memory.title}</h1>
      <p className="status-msg" style={{ margin: "0 0 16px", fontSize: 13 }}>
        מתוך{" "}
        <Link href={`/plans/${memory.planId}`} className="link-plain" style={{ fontSize: 13 }}>
          התוכנית המקורית &larr;
        </Link>
      </p>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p className="page-eyebrow" style={{ margin: 0 }}>
            איך היה
          </p>
          <Link href={`/memories/${memory.id}/edit`} className="link-plain" style={{ fontSize: 13 }}>
            {memory.story ? "עריכה" : "הוספה"}
          </Link>
        </div>
        {memory.story ? (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {memory.story}
          </p>
        ) : (
          <p className="status-msg" style={{ margin: 0 }}>
            עוד לא כתבתם איך היה.{" "}
            <Link href={`/memories/${memory.id}/edit`} className="link-plain" style={{ fontSize: 14 }}>
              לכתוב עכשיו &larr;
            </Link>
          </p>
        )}
        {memory.createdByName && (
          <p className="status-msg" style={{ margin: "10px 0 0", fontSize: 12 }}>
            נשמר ע״י {memory.createdByName}
          </p>
        )}
      </div>
    </div>
  );
}
