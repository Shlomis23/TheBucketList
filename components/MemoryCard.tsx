import Link from "next/link";
import type { MemoryDto } from "@/lib/dal/memories";
import { formatMemoryDate } from "@/lib/validation/memory";
import { getIdeaCoverImage } from "@/lib/covers";

// כרטיס זיכרון — בציר הזמן (/memories) ובבית ("הזיכרון האחרון").
// eyebrow מאפשר לבית להציג "הזיכרון האחרון" במקום התאריך.
export function MemoryCard({ memory, eyebrow }: { memory: MemoryDto; eyebrow?: string }) {
  return (
    <Link
      href={`/memories/${memory.id}`}
      className="card block no-underline c-inherit mb-12"
    >
      {memory.coverPhotoId ? (
        // תמונה אמיתית מהיום עצמו גוברת על איור הקטגוריה. ממוזערת (480px).
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת, לא next/image */}
          <img
            src={`/api/photos/${memory.coverPhotoId}/content?v=thumb`}
            alt=""
            loading="lazy"
            decoding="async"
            className="card-cover-img cover-photo"
          />
          {memory.photoCount > 1 && <span className="photo-count-badge">{memory.photoCount} תמונות</span>}
        </div>
      ) : (
        memory.category && (
          // eslint-disable-next-line @next/next/no-img-element -- SVG עיצוב סטטי לפי קטגוריה, לא תוכן דינמי
          <img src={getIdeaCoverImage(memory.category)} alt="" className="card-cover-img cover-sm" />
        )
      )}
      <p className="page-eyebrow m-0 mb-2">
        {eyebrow ?? formatMemoryDate(memory.happenedOn, false)}
      </p>
      <p className="m-0 fw-800 text-base">{memory.title}</p>
      {memory.story ? (
        <p className="memory-excerpt">{memory.story}</p>
      ) : (
        <p className="status-msg m-0 mt-8 text-sm">
          עוד לא כתבתם איך היה ·{" "}
          <span className="c-primary fw-700">להוסיף &larr;</span>
        </p>
      )}
    </Link>
  );
}
