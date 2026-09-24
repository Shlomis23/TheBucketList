"use server";

import { chooseExperience } from "@/lib/dal/choose";
import { chooseFiltersSchema } from "@/lib/validation/choose";
import { fail } from "@/lib/errors/result";

export async function chooseExperienceAction(input: unknown) {
  const parsed = chooseFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", "סינון לא תקין", crypto.randomUUID());
  }
  return chooseExperience(parsed.data);
}
