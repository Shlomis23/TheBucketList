# Shared recipe library

Entry: `/ideas/recipes`, linked beside the existing idea count and archive link (including an empty ideas list). Nested under ideas so the existing bottom navigation remains unchanged.

Uses only existing CSS classes and tokens. No notification calls, ideas, reactions, or matches are created by recipe actions. Both members can add/edit/delete; deletion requires confirmation. Recipe title is required, HTTPS source link/body/shared note are optional.

Database: `recipes`, member-read RLS, service-only `SECURITY INVOKER` RPCs using the verified actor, open-space checks, version conflict checks and stable IDs for creation retries. Space deletion cascades to recipes. Existing authorized backup includes recipes in JSON and readable HTML.

Validation: `npm run typecheck`, `npm run lint`, `npm test`. Run `supabase/tests/recipes.sql` as an administrator; it uses isolated fixtures in a transaction that rolls back, and checks actual service/authenticated roles. Apply the recipe_book migration before deploying these routes.
