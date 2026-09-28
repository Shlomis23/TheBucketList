import { beforeEach, describe, expect, it, vi } from "vitest";
import { listIdeas } from "@/lib/dal/ideas";
import { parseIdeaListParams } from "@/lib/validation/ideaList";

const db = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[] | null>,
  selections: {} as Record<string, string>,
  partner: [] as { idea_id: string; preference: string }[],
}));
vi.mock("@/lib/supabase/server", () => ({
  getVerifiedUserId: async () => "me",
  createSupabaseServerClient: async () => ({
    from(table: string) {
      const filters: [string, unknown][] = [];
      let columns = "";
      const query = {
        select(value: string) { columns = value; db.selections[table] = value; return query; },
        eq(key: string, value: unknown) { filters.push([key, value]); return query; },
        order() { return query; },
        async returns() {
          const rows = db.tables[table];
          return { data: rows?.filter(row => filters.every(([key, value]) => row[key] === value))
            .map(row => Object.fromEntries(columns.split(",").map(key => [key.trim(), row[key.trim()]]))) ?? null };
        },
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ rpc: async () => ({ data: db.partner }) }),
}));
vi.mock("@/lib/dal/conversations", () => ({
  getUnreadConversations: async () => [{ ideaId: "a", unreadCount: 2 }],
}));

function idea(id: string, overrides = {}) {
  return { id, space_id: "space", title: "טיול", description: "תיאור", category: "outdoors",
    location_text: null, source_url: null, cost_minor: 100, duration_minutes: 60,
    created_at: "2026-09-01", status: "active", version: 1, ...overrides };
}
const search = (q: string, params: Record<string, string> = {}) => listIdeas(parseIdeaListParams({ q, ...params }));

beforeEach(() => {
  db.tables = {
    ideas: [idea("a"), idea("b", { title: "מסעדה", category: "food", cost_minor: 50 }),
      idea("archived", { status: "archived" })],
    idea_comments: [{ idea_id: "a", body: "נביא פיקניק לדרך" }, { idea_id: "a", body: "פיקניק נהדר" },
      { idea_id: "a", body: "הודעה אחרת" }, { idea_id: "b", body: "פיקניק" },
      { idea_id: "archived", body: "פיקניק" }, { idea_id: "unavailable", body: "סודי" }],
    idea_reactions: [{ idea_id: "b", preference: "yes" }], plans: [],
  };
  db.partner = [{ idea_id: "b", preference: "yes" }];
  db.selections = {};
});

describe("idea search including conversations", () => {
  it("finds message-only matches once and preserves full comment/unread counts", async () => {
    const result = await search("פיקניק");
    expect(result.ideas.map(i => i.id)).toEqual(["a", "b"]);
    expect(result.ideas[0]).toMatchObject({ commentCount: 3, unreadCount: 2 });
    expect(result.ideas[0]).not.toHaveProperty("body");
    expect(result.counts).toEqual({ all: 2, unreacted: 1, waiting: 0, matches: 1 });
  });
  it("combines message matches with category, view and sorting", async () => {
    expect((await search("פיקניק", { cat: "outdoors" })).ideas.map(i => i.id)).toEqual(["a"]);
    expect((await search("פיקניק", { view: "matches" })).ideas.map(i => i.id)).toEqual(["b"]);
    expect((await search("פיקניק", { view: "unreacted" })).ideas.map(i => i.id)).toEqual(["a"]);
    expect((await search("פיקניק", { sort: "cheap" })).ideas.map(i => i.id)).toEqual(["b", "a"]);
  });
  it("searches the selected status only and cannot create results from unrelated comments", async () => {
    expect((await search("פיקניק", { status: "archived" })).ideas.map(i => i.id)).toEqual(["archived"]);
    expect((await search("סודי")).ideas).toEqual([]);
  });
  it("keeps title, description and location searches when comments are unavailable", async () => {
    db.tables.idea_comments = null;
    db.tables.ideas = [idea("title", { title: "ירושלים" }), idea("description", { description: "ירושלים" }),
      idea("location", { location_text: "ירושלים" })];
    expect((await search("ירוש")).ideas.map(i => i.id)).toEqual(["title", "description", "location"]);
  });
  it("keeps empty searches lightweight", async () => {
    expect((await search("  ")).ideas).toHaveLength(2);
    expect(db.selections.idea_comments).toBe("idea_id");
  });
  it("matches literal substrings without case sensitivity or joining separate messages", async () => {
    db.tables.idea_comments = [{ idea_id: "a", body: "Enjoy PICNIC 100%" }, { idea_id: "b", body: "Enjoy" },
      { idea_id: "b", body: "PICNIC" }];
    expect((await search("enjoy picnic")).ideas.map(i => i.id)).toEqual(["a"]);
    expect((await search("100%")).ideas.map(i => i.id)).toEqual(["a"]);
    expect((await search("missing")).ideas).toEqual([]);
  });
});
