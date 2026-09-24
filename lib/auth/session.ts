import "server-only";

// נקודת כניסה יחידה ל"מי המשתמש" בצד שרת. כל Server Action/Route Handler
// שצריך actor מאומת קורא רק לפונקציה הזו — לא בונה session בעצמו.
// ראו docs/The-Bucket-List-Technical-Spec-HE.md סעיף 10.1, 13.4.
export { getVerifiedUserId } from "@/lib/supabase/server";
