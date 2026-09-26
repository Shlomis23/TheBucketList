import Link from "next/link";
import type { MemoryDto } from "@/lib/dal/memories";
import { CoverImg } from "@/components/CoverImg";

// "לפני שנה בדיוק" — בראש הבית, רק ביום שיש זיכרון מאותו תאריך בשנה קודמת
// (או "השבוע לפני שנה"). תמונה גדולה, ועליה הכותרת ומשפט מהסיפור.
export function OnThisDayCard({ memory, label }: { memory: MemoryDto; label: string }) {
  const firstLine = memory.story.split("\n").find((l) => l.trim())?.trim() ?? "";
  return (
    <Link href={`/memories/${memory.id}`} className="otd-card" aria-label={`${label}: ${memory.title}`}>
      {memory.coverPhotoId ? (
        // eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת
        <img src={`/api/photos/${memory.coverPhotoId}/content`} alt="" className="otd-img" decoding="async" />
      ) : (
        memory.category && <CoverImg category={memory.category} className="otd-img" />
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
