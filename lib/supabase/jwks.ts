import type { SupabaseClient } from "@supabase/supabase-js";
import jwks from "./jwks.json";

// המפתחות הציבוריים לאימות טוקנים, מתוך הבנייה (scripts/fetch-jwks.mjs).
// מועבר ל-getClaims — בלי הורדת JWKS בכל מופע שרת חדש. ריק מקומית / אם
// ההורדה נכשלה, ואז getClaims מוריד בעצמו כמו קודם. גם מפתח שהוחלף מאז
// הבנייה (kid שלא ברשימה) יורד כרגיל.
type Jwks = NonNullable<NonNullable<Parameters<SupabaseClient["auth"]["getClaims"]>[1]>["jwks"]>;
export const STATIC_JWKS: Jwks | undefined = jwks.keys.length > 0 ? ({ keys: jwks.keys } as unknown as Jwks) : undefined;
