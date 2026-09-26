import Link from "next/link";
import type { MemoryDto } from "@/lib/dal/memories";
import { CoverImg } from "@/components/CoverImg";

// אריח בגריד האלבום של /memories (26.9, אפשרות ב). ריבוע עם תמונת השער,
// ומתחתיו כותרת ותאריך. wide = אריח רחב (הזיכרון החדש בחודש, כשמספר
// הזיכרונות בחודש אי-זוגי — כך שהשורות תמיד מלאות). באריח רחב התמונה
// בגודל מלא (1600px), בריבוע — הממוזערת (480px).
function shortDate(happenedOn: string) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", day: "numeric", month: "long" }).format(
    new Date(`${happenedOn}T12:00:00Z`),
  );
}

export function MemoryTile({ memory, wide = false }: { memory: MemoryDto; wide?: boolean }) {
  const photo = memory.coverPhotoId
    ? `/api/photos/${memory.coverPhotoId}/content${wide ? "" : "?v=thumb"}`
    : null;
  return (
    <Link href={`/memories/${memory.id}`} className={wide ? "album-tile wide" : "album-tile"}>
      <span className="album-img-wrap">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית דרך route מאומת, לא next/image
          <img src={photo} alt="" loading="lazy" decoding="async" className="album-img" />
        ) : memory.category ? (
          <CoverImg category={memory.category} className="album-img" />
        ) : null}
        {memory.photoCount > 1 && <span className="album-count">{memory.photoCount} תמונות</span>}
        {!memory.story && <span className="album-nostory">עוד לא כתבתם איך היה</span>}
      </span>
      <span className="album-cap">
        <span className="album-title">{memory.title}</span>
        <span className="album-date">{shortDate(memory.happenedOn)}</span>
      </span>
    </Link>
  );
}
