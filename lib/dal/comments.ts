import "server-only";

import { createSupabaseServerClient, getVerifiedUserId } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ok, fail, type Result } from "@/lib/errors/result";
import { formatCommentTime } from "@/lib/validation/comment";
import type { AddCommentInput, DeleteCommentInput, EditCommentInput } from "@/lib/validation/comment";

// תגובות טקסט על רעיון — spec סעיף 6.1, 13.2, 13.3 (getIdea: "תגובות טקסט").
// קריאה: client המשתמש + RLS (member_read על idea_comments, profiles_read
// לשמות). כתיבה: RPC שירות בלבד (0017) עם actor מה-session.

export type CommentDto = {
  id: string;
  body: string;
  authorName: string;
  isMine: boolean;
  edited: boolean;
  version: number;
  whenLabel: string; // מחושב בשרת — ראו formatCommentTime
};

type CommentRow = {
  id: string;
  created_by: string;
  body: string;
  version: number;
  created_at: string;
};

// הישנה למעלה, החדשה למטה (כמו צ'אט). שובר שוויון לפי id (אינדקס comments_feed).
// שתי השאילתות במקביל עם getVerifiedUserId (ב-cache לבקשה) — בלי קפיצה נוספת.
export async function listComments(ideaId: string): Promise<CommentDto[]> {
  const supabase = await createSupabaseServerClient();
  const [userId, { data: rows }, { data: profiles }] = await Promise.all([
    getVerifiedUserId(),
    supabase
      .from("idea_comments")
      .select("id, created_by, body, version, created_at")
      .eq("idea_id", ideaId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<CommentRow[]>(),
    supabase.from("profiles").select("id, display_name").returns<{ id: string; display_name: string }[]>(),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const now = new Date();
  return (rows ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    authorName: nameById.get(c.created_by)?.trim() || "מישהו מכם",
    isMine: c.created_by === userId,
    edited: c.version > 1,
    version: c.version,
    whenLabel: formatCommentTime(c.created_at, now),
  }));
}

function mapCommentError(message: string | undefined, fallback: string, traceId: string): Result<never> {
  if (message?.includes("NOT_FOUND")) return fail("NOT_FOUND", "ההודעה או הרעיון כבר לא זמינים. רעננו את הדף.", traceId);
  if (message?.includes("NOT_AUTHOR")) return fail("INVALID_INPUT", "אפשר לערוך ולמחוק רק הודעות שכתבת", traceId);
  if (message?.includes("IDEA_ARCHIVED")) return fail("INVALID_INPUT", "הרעיון בארכיון — אי אפשר להוסיף הודעות", traceId);
  if (message?.includes("VERSION_CONFLICT")) return fail("VERSION_CONFLICT", "ההודעה השתנתה בינתיים. רעננו ונסו שוב.", traceId);
  if (message?.includes("INVALID_INPUT")) return fail("INVALID_INPUT", "הודעה צריכה להיות בין 1 ל-1,000 תווים", traceId);
  return fail("UNEXPECTED", fallback, traceId);
}

export async function addComment(input: AddCommentInput): Promise<Result<{ id: string }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const { data, error } = await createSupabaseServiceClient().rpc("add_comment", {
    p_actor: userId,
    p_request_id: input.requestId,
    p_idea_id: input.ideaId,
    p_body: input.body,
  });
  if (error || !data) return mapCommentError(error?.message, "שליחת ההודעה נכשלה, נסו שוב", traceId);
  return ok({ id: (data as { id: string }).id }, traceId);
}

export async function editComment(input: EditCommentInput): Promise<Result<{ id: string; version: number }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const { data, error } = await createSupabaseServiceClient().rpc("edit_comment", {
    p_actor: userId,
    p_id: input.commentId,
    p_expected_version: input.expectedVersion,
    p_body: input.body,
  });
  if (error || !data) return mapCommentError(error?.message, "שמירת ההודעה נכשלה, נסו שוב", traceId);
  const c = data as { id: string; version: number };
  return ok({ id: c.id, version: c.version }, traceId);
}

export async function deleteComment(input: DeleteCommentInput): Promise<Result<{ deleted: true }>> {
  const traceId = crypto.randomUUID();
  const userId = await getVerifiedUserId();
  if (!userId) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);

  const { data, error } = await createSupabaseServiceClient().rpc("delete_comment", {
    p_actor: userId,
    p_id: input.commentId,
    p_expected_version: input.expectedVersion,
  });
  if (error || data !== true) return mapCommentError(error?.message, "מחיקת ההודעה נכשלה, נסו שוב", traceId);
  return ok({ deleted: true }, traceId);
}
