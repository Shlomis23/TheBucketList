import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getMemory } from "@/lib/dal/memories";
import { listPhotos } from "@/lib/dal/photos";
import { MemoryPhotos } from "@/components/MemoryPhotos";
import { MemoryHero } from "@/components/MemoryHero";
import { formatMemoryDate } from "@/lib/validation/memory";
import { PageTransition } from "@/components/PageTransition";

// זיכרון `/memories/[id]` — spec סעיף 6: תאריך, תמונות (עד 10, שניהם
// מוסיפים ומוחקים — זיכרון משותף, 0029) וסיפור משותף. למעלה באנר מקצה לקצה
// (MemoryHero, 26.9): התמונות בהחלקה, או איור הקטגוריה כשאין תמונות.
// זר/חסר: notFound() זהה, כמו /ideas/[id] ו-/plans/[id].
export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [memory, photos, userId] = await Promise.all([getMemory(id), listPhotos(id), getVerifiedUserId()]);
  if (!userId) redirect(`/open?next=/memories/${id}`); // קישור חיצוני ב-Safari
  if (!memory) notFound();

  return (
    <PageTransition kind="detail">
      <div className="page">
        {/* 26.9: התמונה היא הגיבורה — באנר מקצה לקצה עם הכותרת והתאריך. */}
        <MemoryHero
          photoIds={photos.map((p) => p.id)}
          fallbackCategory={memory.category}
          title={memory.title}
          dateLabel={formatMemoryDate(memory.happenedOn)}
        />
        <p className="status-msg m-0 mb-16 text-sm">
          מתוך{" "}
          <Link href={`/plans/${memory.planId}`} className="link-plain text-sm">
            התוכנית המקורית &larr;
          </Link>
        </p>
  
        {/* "איך היה" לפני התמונות (25.9): עם הרבה תמונות הסיפור נדחף רחוק למטה. */}
        <div className="card mb-16">
          <div className="flex justify-between items-center mb-8">
            <p className="page-eyebrow m-0">
              איך היה
            </p>
            <Link href={`/memories/${memory.id}/edit`} className="link-plain text-sm">
              {memory.story ? "עריכה" : "הוספה"}
            </Link>
          </div>
          {memory.story ? (
            <p className="m-0 text-md leading-loose pre-wrap break-anywhere">
              {memory.story}
            </p>
          ) : (
            <p className="status-msg m-0">
              עוד לא כתבתם איך היה.{" "}
              <Link href={`/memories/${memory.id}/edit`} className="link-plain text-md">
                לכתוב עכשיו &larr;
              </Link>
            </p>
          )}
          {memory.createdByName && (
            <p className="status-msg m-0 mt-12 text-xs">
              נשמר ע״י {memory.createdByName}
            </p>
          )}
        </div>
  
        <MemoryPhotos memoryId={memory.id} photos={photos} />
      </div>
    </PageTransition>
  );
}
