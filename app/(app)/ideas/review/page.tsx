import { listIdeas } from "@/lib/dal/ideas";
import { getPartnerName } from "@/lib/dal/profile";
import { parseIdeaListParams } from "@/lib/validation/ideaList";
import { categoryLabels, formatCostMinor, formatDurationMinutes } from "@/lib/validation/idea";
import { orderForReview } from "@/lib/validation/review";
import { ReviewDeck, type ReviewCard } from "@/components/ReviewDeck";
import { PageTransition } from "@/components/PageTransition";

// /ideas/review — "סבב החלטות" (26.9, אפשרות א). כל הרעיונות הפעילים שעוד לא
// הגבתי עליהם, בכרטיסים אחד-אחד. נכנסים מהבאנר ברשימה, מהבית ומהתראה על
// רעיון חדש (?first=<id> — הרעיון מההתראה ראשון).
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const firstId = typeof sp.first === "string" ? sp.first : null;
  const [{ ideas }, partnerName] = await Promise.all([
    listIdeas(parseIdeaListParams({ view: "unreacted" })),
    getPartnerName(),
  ]);

  const cards: ReviewCard[] = orderForReview(
    ideas.map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      categoryLabel: categoryLabels[i.category],
      meta: [formatDurationMinutes(i.durationMinutes), formatCostMinor(i.costMinor), i.locationText].filter(Boolean).join(" · "),
      description: i.description,
      createdAt: i.createdAt,
      partnerAnswered: i.partnerReaction !== null,
    })),
    firstId,
  );

  return (
    <PageTransition kind="detail">
      <ReviewDeck cards={cards} partnerName={partnerName} />
    </PageTransition>
  );
}
