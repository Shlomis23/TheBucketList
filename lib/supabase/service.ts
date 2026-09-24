import "server-only";

// Supabase client עם service role — עוקף RLS לגמרי. שימוש אך ורק כדי לקרוא
// ל-RPC שירות צרות (סעיף 13.4), אף פעם לא לקריאה/כתיבה גנרית של טבלאות.
// SUPABASE_SERVICE_ROLE_KEY חי רק ב-Environment Variables של הפריסה —
// לא ב-.env.local, לא ב-repo, לא הודבק בשום צ'אט.
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "חסרים משתני סביבה: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
