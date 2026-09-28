# Shared recipe library

Entry: `/ideas/recipes`, linked beside the existing idea count and archive link (including an empty ideas list). Nested under ideas so the existing bottom navigation remains unchanged.

Uses only existing CSS classes and tokens. No notification calls, ideas, reactions, or matches are created by recipe actions. Both members can add/edit/delete; deletion requires confirmation. Recipe title is required, HTTPS source link/body/shared note are optional.

Database: `recipes`, member-read RLS, service-only `SECURITY INVOKER` RPCs using the verified actor, open-space checks, version conflict checks and stable IDs for creation retries. Space deletion cascades to recipes. Existing authorized backup includes recipes in JSON and readable HTML.

Validation: `npm run typecheck`, `npm run lint`, `npm test`. Run `supabase/tests/recipes.sql` as an administrator; it uses isolated fixtures in a transaction that rolls back, and checks actual service/authenticated roles. Apply the recipe_book migration before deploying these routes.

Recipe classifications: optional single-valued course (main, side, salad, soup, bread_pastry, dessert, sauce_spread, other) and classification (meat, dairy, pareve). Null means unclassified. Both filters combine with free-text search using AND; each can also select unclassified recipes. Shared labels live in lib/recipes.ts. Existing recipes are not backfilled.

Apply recipe_classification before deploying the classification UI. The new service-only save_classified_recipe RPC validates both fields, preserves version checks and idempotency, and includes them in backup. The legacy save_recipe RPC remains compatible and preserves classifications when editing. Run supabase/tests/recipe_classification.sql in addition to the original SQL regression test.
