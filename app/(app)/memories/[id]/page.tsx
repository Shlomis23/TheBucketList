import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemory } from "@/lib/dal/memories";
import { listPhotos } from "@/lib/dal/photos";
import { MemoryPhotos } from "@/components/MemoryPhotos";
import { MemoryHero } from "@/components/MemoryHero";
import { formatMemoryDate } from "@/lib/validation/memory";
import { getIdeaCoverImage } from "@/lib/covers";

// זיכרון `/memories/[id]` — spec סעיף 6: תאריך, תמונות (עד 10, שניהם
// מוסיפים ומוחקים — זיכרון משותף, 0029) וסיפור משותף. למעלה באנר מקצה לקצה
// (MemoryHero, 26.9): התמונות בהחלקה, או איור הקטגוריה כשאין תמונות.
// זר/חסר: notFound() זהה, כמו /ideas/[id] ו-/plans/[id].
export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [memory, photos] = await Promise.all([getMemory(id), listPhotos(id)]);
  if (!memory) notFound();

  return (
    <div className="page">
      {/* 26.9: התמונה היא הגיבורה — באנר מקצה לקצה עם הכותרת והתאריך. */}
      <MemoryHero
        photoIds={photos.map((p) => p.id)}
        fallbackSrc={memory.category ? getIdeaCoverImage(memory.category) : null}
        title={memory.title}
        dateLabel={formatMemoryDate(memory.happenedOn)}
      />
      <p className="status-msg" style={{ margin: "0 0 14px", fontSize: 13 }}>
        מתוך{" "}
        <Link href={`/plans/${memory.planId}`} className="link-plain" style={{ fontSize: 13 }}>
          התוכנית המקורית &larr;
        </Link>
      </p>

      {/* "איך היה" לפני התמונות (25.9): עם הרבה תמונות הסיפור נדחף רחוק למטה. */}
      <div className="card" style={{ marginBottom: 16 }}>
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

      <MemoryPhotos memoryId={memory.id} photos={photos} />
    </div>
  );
}
