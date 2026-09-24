"use server";

import { revalidatePath } from "next/cache";
import { createInvitation, revokeInvitation } from "@/lib/dal/invitations";
import { createInvitationSchema, invitationIdSchema } from "@/lib/validation/invitation";
import type { Result } from "@/lib/errors/result";
import { fail } from "@/lib/errors/result";

export async function createInvitationAction(
  input: unknown,
): Promise<Result<{ id: string; link: string; expiresAt: string; maskedEmail: string }>> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "INVALID_INPUT",
      "כתובת אימייל לא תקינה",
      crypto.randomUUID(),
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const result = await createInvitation(parsed.data.targetEmail);
  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function revokeInvitationAction(input: unknown): Promise<Result<{ revoked: true }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "בקשה לא תקינה", crypto.randomUUID());

  const result = await revokeInvitation(parsed.data.invitationId);
  if (result.ok) revalidatePath("/settings");
  return result;
}
