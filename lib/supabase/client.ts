"use client";

// Supabase client עבור רכיבי דפדפן בלבד.
// משתמש במפתח publishable/anon בלבד — לעולם לא בסוד שרת.
// ראו docs/The-Bucket-List-Technical-Spec-HE.md סעיף 9.1.

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
