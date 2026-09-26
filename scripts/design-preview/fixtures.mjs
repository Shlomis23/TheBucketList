// נתוני דוגמה קבועים לצילומי העיצוב — זוג אחד ("בסטי" ו"גואל") עם רעיונות
// בכל המצבים (מאצ', מחכה לך, מחכה לגואל, אולי, בתוכנית, ארכיון), תוכנית
// קרובה, תוכנית שעברה ("איך היה?"), שני זיכרונות (עם ובלי תמונות) ושיחה עם
// הודעה שלא נקראה. התאריכים יחסיים ל"היום" (12:00 שעון ישראל), כך ששתי ריצות
// באותו יום זהות.
import sharp from "sharp";

export const ME = "00000000-0000-4000-8000-00000000000a";
export const PARTNER = "00000000-0000-4000-8000-00000000000b";
export const SPACE = "00000000-0000-4000-8000-000000009999";
export const SERVICE_KEY = "fake-service-role-key";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const anchor = new Date();
anchor.setUTCHours(9, 0, 0, 0); // 12:00 בישראל
const at = (days, hours = 0) => new Date(anchor.getTime() + days * 86_400_000 + hours * 3_600_000).toISOString();
const dateOnly = (days) => at(days).slice(0, 10);

async function photo(top, bottom) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="600" cy="420" r="120" fill="#ffe3a3" opacity=".85"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

export async function buildFixtures() {
  const profiles = [
    { id: ME, display_name: "בסטי" },
    { id: PARTNER, display_name: "גואל" },
  ];
  const space_members = [
    { space_id: SPACE, user_id: ME, slot: 1 },
    { space_id: SPACE, user_id: PARTNER, slot: 2 },
  ];

  const idea = (n, title, category, by, extra = {}) => ({
    id: id(n), space_id: SPACE, title, category, created_by: by, description: "", location_text: null,
    source_url: null, cost_minor: null, duration_minutes: null, place_id: null, status: "active", version: 1,
    created_at: at(-n), ...extra,
  });
  const ideas = [
    idea(1, "ערב קריוקי", "culture", PARTNER, { cost_minor: 12000, duration_minutes: 180, description: "בר קריוקי חדש בפלורנטין" }),
    idea(2, "קיאקים בכנרת", "outdoors", PARTNER, { duration_minutes: 240, location_text: "כנרת" }),
    idea(3, "סדנת קרמיקה עם מורה פרטית", "learning", ME, { cost_minor: 24000 }),
    idea(4, "צניחה חופשית", "outdoors", ME, { cost_minor: 120000 }),
    idea(5, "הופעה של נסרין ואגם בוחבוט", "culture", ME, { location_text: "היכל מנורה, תל אביב", source_url: "https://example.com/show" }),
    idea(6, "חומוס אליהו", "food", PARTNER, { location_text: "עכו" }),
    idea(7, "שקיעה בחוף הבונים", "outdoors", ME),
    idea(8, "ערב משחקים", "home", PARTNER),
    idea(9, "טיול לאילת", "trip", ME, { status: "archived" }),
    idea(10, "ארוחת בוקר במושבה", "food", ME, { cost_minor: 15000 }),
  ];

  const r = (ideaN, user, preference) => ({ space_id: SPACE, idea_id: id(ideaN), user_id: user, preference, updated_at: at(-ideaN, 1) });
  const idea_reactions = [
    r(1, ME, "yes"), r(1, PARTNER, "yes"),
    r(2, PARTNER, "yes"),
    r(3, ME, "yes"),
    r(4, ME, "yes"), r(4, PARTNER, "maybe"),
    r(5, ME, "yes"), r(5, PARTNER, "yes"),
    r(6, ME, "yes"), r(6, PARTNER, "yes"),
    r(7, ME, "yes"), r(7, PARTNER, "yes"),
    r(8, ME, "yes"), r(8, PARTNER, "yes"),
  ];

  const idea_comments = [
    { id: id(101), space_id: SPACE, idea_id: id(1), created_by: ME, body: "מתי בא לך? אולי חמישי?", version: 1, created_at: at(-1, -3) },
    { id: id(102), space_id: SPACE, idea_id: id(1), created_by: PARTNER, body: "חמישי מעולה! יש שם מבצע https://example.com/karaoke", version: 1, created_at: at(-1, -1) },
  ];

  const plan = (n, ideaN, title, status, startsAt, extra = {}) => ({
    id: id(n), space_id: SPACE, idea_id: id(ideaN), title, status, starts_at: startsAt, ends_at: null,
    timezone: "Asia/Jerusalem", meeting_place: null, notes: "", budget_minor: null, version: 1, created_at: at(-10),
    created_by: ME, ...extra,
  });
  const plans = [
    plan(201, 5, "הופעה של נסרין ואגם בוחבוט", "proposed", at(3, 9), { meeting_place: "היכל מנורה, תל אביב", notes: "לקחת אטמי אוזניים", budget_minor: 38000 }),
    plan(202, 6, "חומוס אליהו", "proposed", at(-1, 1)),
    plan(203, 7, "שקיעה בחוף הבונים", "completed", at(-6, 6)),
    plan(204, 8, "ערב משחקים", "completed", at(-20, 8)),
  ];

  const memories = [
    { id: id(301), space_id: SPACE, plan_id: id(203), created_by: ME, happened_on: dateOnly(-6), story: "לקחנו אבטיח ונשארנו עד שהיה חושך.\nגואל מצא צדף בצורת לב.", version: 1 },
    { id: id(302), space_id: SPACE, plan_id: id(204), created_by: PARTNER, happened_on: dateOnly(-20), story: "", version: 1 },
  ];

  const memory_photos = [
    { id: id(401), space_id: SPACE, memory_id: id(301), uploaded_by: ME, status: "ready", object_path: `${SPACE}/${id(301)}/a`, sort_order: 1, created_at: at(-6, 8) },
    { id: id(402), space_id: SPACE, memory_id: id(301), uploaded_by: PARTNER, status: "ready", object_path: `${SPACE}/${id(301)}/b`, sort_order: 2, created_at: at(-6, 9) },
  ];
  const [sunset, sea] = await Promise.all([photo("#ffb88a", "#2c3e6e"), photo("#8fd3f4", "#1b4f72")]);
  const objects = {
    [memory_photos[0].object_path]: sunset,
    [`${memory_photos[0].object_path}.t`]: sunset,
    [memory_photos[1].object_path]: sea,
    [`${memory_photos[1].object_path}.t`]: sea,
  };

  const bothYes = (ideaId) =>
    idea_reactions.filter((x) => x.idea_id === ideaId && x.preference === "yes").length === 2;
  const nameOf = (u) => profiles.find((p) => p.id === u)?.display_name ?? "";

  const rpc = {
    list_my_matches: () => ideas.filter((i) => i.status === "active" && bothYes(i.id)).map((i) => ({ idea_id: i.id })),
    get_idea_reactions: ({ p_idea_id }) =>
      space_members.map((m) => ({
        user_id: m.user_id,
        display_name: nameOf(m.user_id),
        preference: idea_reactions.find((x) => x.idea_id === p_idea_id && x.user_id === m.user_id)?.preference ?? null,
      })),
    unread_conversations: () => [
      { idea_id: id(1), idea_title: "ערב קריוקי", unread_count: 1, last_at: at(-1, -1), last_author: "גואל" },
    ],
    partner_reactions: () => idea_reactions.filter((x) => x.user_id === PARTNER).map((x) => ({ idea_id: x.idea_id, preference: x.preference })),
    match_celebration_state: () => ({ me: "בסטי", partner: "גואל", unseen: [] }),
    get_my_space_state: () => [
      { space_id: SPACE, status: "open", closed_at: null, purge_after: null, closed_by_me: false, closed_by_name: null, member_count: 2, deletion_requested: false },
    ],
    get_invitation_status: () => [],
    has_pending_invitation_for_me: () => false,
    mark_idea_read: () => true,
    check_rate_limit: () => true,
  };

  const users = {
    [ME]: { id: ME, aud: "authenticated", role: "authenticated", email: "besti@example.test", app_metadata: {}, user_metadata: {}, created_at: at(-30) },
    [PARTNER]: { id: PARTNER, aud: "authenticated", role: "authenticated", email: "partner@example.test", app_metadata: {}, user_metadata: {}, created_at: at(-30) },
  };

  return {
    users,
    objects,
    rpc,
    tables: { profiles, space_members, ideas, idea_reactions, idea_comments, plans, memories, memory_photos },
    ids: { idea: id, plan: id, memory: id },
  };
}
