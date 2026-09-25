import Link from "next/link";
import type { MemoryDto } from "@/lib/dal/memories";
import { getIdeaCoverImage } from "@/lib/covers";

// "לפני שנה בדיוק" — בראש הבית, רק ביום שיש זיכרון מאותו תאריך בשנה קודמת
// (או "השבוע לפני שנה"). תמונה גדולה, ועליה הכותרת ומשפט מהסיפור.
export function OnThisDayCard({ memory, label }: { memory: MemoryDto; label: string }) {
  const firstLine = memory.story.split("\n").find((l) => l.trim())?.trim() ?? "";
  const src = memory.coverPhotoId
    ? `/api/photos/${memory.coverPhotoId}/content`
    : memory.category
      ? getIdeaCoverImage(memory.category)
      : null;
  return (
    <Link href={`/memories/${memory.id}`} className="otd-card" aria-label={`${label}: ${memory.title}`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת / SVG קטגוריה
        <img src={src} alt="" className="otd-img" decoding="async" />
      )}
      <span className="otd-shade" aria-hidden="true" />
      <span className="otd-pill">{label}</span>
      <span className="otd-meta">
        <span className="otd-title">{memory.title}</span>
        {firstLine && <span className="otd-quote">&quot;{firstLine}&quot;</span>}
      </span>
    </Link>
  );
}
