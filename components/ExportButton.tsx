"use client";

import { useState } from "react";
import { strToU8, zipSync, type Zippable } from "fflate";

// הורדת הזיכרונות כקובץ ZIP (החלטת שלומי, 25.9): לפני סגירת מרחב, וגם לבן/בת
// הזוג שלא סגר/ה — בכל תקופת החרטה. זמין תמיד גם מההגדרות.
//
// הקובץ נבנה בדפדפן: השרת נותן JSON אחד (/api/export/data) ואת התמונות
// אחת-אחת (/api/export/photos/[id]). כך אין מגבלת גודל/זמן של פונקציית שרת,
// והמשתמש רואה התקדמות. בתוך ה-ZIP:
//   הזיכרונות שלנו.html  — דף קריא (נפתח בכל דפדפן, גם בלי אינטרנט)
//   זיכרונות/<תאריך> <כותרת>/1.jpg …
//   data.json             — אותו תוכן, למקרה שתרצו אותו במקום אחר

type ExportData = {
  members: string[];
  memories: {
    id: string;
    title: string;
    happenedOn: string;
    story: string;
    createdBy: string | null;
    photos: { id: string; uploadedBy: string | null }[];
  }[];
  ideas: {
    title: string;
    category: string;
    description: string;
    location: string | null;
    link: string | null;
    status: string;
    createdAt: string;
    createdBy: string | null;
  }[];
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().slice(0, 60) || "זיכרון";
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

function buildHtml(data: ExportData, photoPaths: Map<string, string>) {
  const names = data.members.filter(Boolean).join(" ו");
  const memories = data.memories
    .map((m) => {
      const photos = m.photos
        .map((p) => photoPaths.get(p.id))
        .filter((p): p is string => Boolean(p))
        .map((p) => `<a href="${encodeURI(p)}"><img src="${encodeURI(p)}" alt="" loading="lazy"></a>`)
        .join("");
      return `<article>
  <p class="date">${esc(formatDate(m.happenedOn))}</p>
  <h2>${esc(m.title)}</h2>
  ${m.story ? `<p class="story">${esc(m.story)}</p>` : ""}
  ${photos ? `<div class="grid">${photos}</div>` : ""}
</article>`;
    })
    .join("\n");
  const ideas = data.ideas
    .map(
      (i) =>
        `<li><strong>${esc(i.title)}</strong>${i.location ? ` · ${esc(i.location)}` : ""}${
          i.status === "archived" ? " · בארכיון" : ""
        }${i.description ? `<br><span>${esc(i.description)}</span>` : ""}${
          i.link ? `<br><a href="${esc(i.link)}" dir="ltr">${esc(i.link)}</a>` : ""
        }</li>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>הזיכרונות שלנו</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:#faf8ff;color:#241b3a;margin:0;padding:24px 16px;line-height:1.6}
main{max-width:760px;margin:0 auto}
h1{margin:0 0 4px}.sub{color:#6e6584;margin:0 0 28px}
article{background:#fff;border:1px solid #e6e0f2;border-radius:18px;padding:18px;margin-bottom:16px}
.date{color:#5b3e9e;font-weight:700;font-size:13px;margin:0}h2{margin:2px 0 8px;font-size:20px}
.story{white-space:pre-wrap;margin:0 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;display:block}
ul{padding-inline-start:20px}li{margin-bottom:10px}li span{color:#6e6584}
</style></head><body><main>
<h1>הזיכרונות שלנו</h1>
<p class="sub">${names ? `${esc(names)} · ` : ""}The Bucket List · ירד ב-${esc(new Date().toLocaleDateString("he-IL"))}</p>
${memories || "<p>עוד לא היו זיכרונות.</p>"}
${ideas ? `<h1 style="margin-top:32px">הרעיונות שלנו</h1><ul>${ideas}</ul>` : ""}
</main></body></html>`;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function ExportButton({ label = "הורדת הזיכרונות (ZIP)" }: { label?: string }) {
  const [phase, setPhase] = useState<"idle" | "working" | "ready" | "error">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(0);

  async function build() {
    setPhase("working");
    setError("");
    setMissing(0);
    try {
      const res = await fetch("/api/export/data", { cache: "no-store" });
      if (!res.ok) throw new Error("data");
      const { data } = (await res.json()) as { data: ExportData };

      const jobs: { id: string; path: string }[] = [];
      const usedFolders = new Set<string>();
      for (const m of data.memories) {
        let folder = `זיכרונות/${m.happenedOn} ${safeName(m.title)}`;
        for (let n = 2; usedFolders.has(folder); n++) folder = `זיכרונות/${m.happenedOn} ${safeName(m.title)} (${n})`;
        usedFolders.add(folder);
        m.photos.forEach((p, i) => jobs.push({ id: p.id, path: `${folder}/${i + 1}.jpg` }));
      }
      setProgress({ done: 0, total: jobs.length });

      const files: Zippable = {};
      const photoPaths = new Map<string, string>();
      let failed = 0;
      let done = 0;
      // 3 במקביל — מהיר, בלי להציף את הרשת בטלפון.
      const queue = [...jobs];
      await Promise.all(
        Array.from({ length: Math.min(3, queue.length) }, async () => {
          for (let job = queue.shift(); job; job = queue.shift()) {
            try {
              const r = await fetch(`/api/export/photos/${job.id}`, { cache: "no-store" });
              if (!r.ok) throw new Error();
              // JPEG כבר דחוס — שמירה בלי דחיסה נוספת (level 0) חוסכת זמן.
              files[job.path] = [new Uint8Array(await r.arrayBuffer()), { level: 0 }];
              photoPaths.set(job.id, job.path);
            } catch {
              failed++;
            }
            done++;
            setProgress({ done, total: jobs.length });
          }
        }),
      );

      files["הזיכרונות שלנו.html"] = strToU8(buildHtml(data, photoPaths));
      files["data.json"] = strToU8(JSON.stringify(data, null, 2));

      const zipped = zipSync(files, { level: 6 });
      const stamp = new Date().toISOString().slice(0, 10);
      setFile(new File([zipped], `bucket-list-${stamp}.zip`, { type: "application/zip" }));
      setMissing(failed);
      setPhase("ready");
    } catch {
      setPhase("error");
      setError("ההורדה נכשלה. בדקו את החיבור ונסו שוב.");
    }
  }

  // שמירה בלחיצה נפרדת: שיתוף/הורדה חייבים לקרות מתוך לחיצה "טרייה" של
  // המשתמש, וההכנה (הורדת תמונות) לוקחת כמה שניות.
  async function save() {
    if (!file) return;
    if (isIOS() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] }); // "שמירה בקבצים" בגיליון השיתוף
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div>
      {phase === "ready" && file ? (
        <>
          <button type="button" className="btn btn-primary btn-block" onClick={save}>
            שמירת הקובץ ({file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))}KB` : `${(file.size / 1024 / 1024).toFixed(1)}MB`})
          </button>
          <p className="status-msg m-0 mt-8 text-xs">
            {isIOS() ? "באייפון: בחלון השיתוף בוחרים \"שמירה בקבצים\"." : "הקובץ יישמר בתיקיית ההורדות."}
            {missing > 0 && (missing === 1 ? " תמונה אחת לא ירדה — אפשר לנסות שוב." : ` ${missing} תמונות לא ירדו — אפשר לנסות שוב.`)}
          </p>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-block bg-soft c-primary"
          onClick={build}
          disabled={phase === "working"}
        >
          {phase === "working"
            ? progress.total > 0
              ? `מכין… ${progress.done} מתוך ${progress.total} תמונות`
              : "מכין…"
            : label}
        </button>
      )}
      {error && (
        <p role="alert" className="alert-error mt-8">
          {error}
        </p>
      )}
    </div>
  );
}
