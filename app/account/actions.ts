"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { closeSpace, deleteAccount, reopenSpace, sendReauthCode } from "@/lib/dal/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeInviteCookie } from "@/lib/invitations/cookie";
import { fail, type Result } from "@/lib/errors/result";
import { CLOSE_CONFIRM_WORD } from "@/lib/validation/account";
import { notifyPartner } from "@/lib/push";

// סגירת מרחב / ביטול סגירה / מחיקת חשבון — ראו lib/dal/account.ts.

export async function closeSpaceAction(confirmText: unknown): Promise<Result<never> | undefined> {
  if (typeof confirmText !== "string" || confirmText.trim() !== CLOSE_CONFIRM_WORD) {
    return fail("INVALID_INPUT", `כדי לאשר צריך להקליד "${CLOSE_CONFIRM_WORD}"`, crypto.randomUUID());
  }
  const result = await closeSpace();
  if (!result.ok) return result;
  notifyPartner({ kind: "space_closed" });
  revalidatePath("/", "layout");
  redirect("/space-closed");
}

export async function reopenSpaceAction(): Promise<Result<never> | undefined> {
  const result = await reopenSpace();
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  redirect("/");
}

export async function sendReauthCodeAction() {
  return sendReauthCode();
}

export async function deleteAccountAction(code: unknown): Promise<Result<never> | undefined> {
  if (typeof code !== "string" || !/^\d{6,10}$/.test(code.trim())) {
    return fail("INVALID_INPUT", "הקוד מהמייל הוא 6 ספרות", crypto.randomUUID());
  }
  const result = await deleteAccount(code.trim());
  if (!result.ok) return result;

  revalidatePath("/", "layout");
  if (result.data.outcome === "scheduled") {
    notifyPartner({ kind: "space_closed" });
    redirect("/space-closed");
  }

  // נמחק עכשיו: ניקוי ה-session במכשיר (המשתמש כבר לא קיים ב-Auth).
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  await consumeInviteCookie();
  redirect("/login?deleted=1");
}
