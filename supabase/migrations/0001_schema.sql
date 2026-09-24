-- ==========================================================================
-- 0001_schema.sql
--
-- מקור: docs/The-Bucket-List-Technical-Spec-HE.md סעיף 10.1.
-- זהו בסיס סכמה שהועתק מהאפיון כלשונו. הוא לא הורץ מעולם מול Postgres/Supabase
-- אמיתיים (ראו סעיפים 10.1, 14.3 במסמך). לפני שמסתמכים עליו:
--   1. להריץ מול DB מקומי נקי ולוודא שהוא עובר בלי שגיאה.
--   2. לבדוק שה-CHECK constraints, ה-FK המורכבים וה-unique indexes אכן אוכפים
--      את מה שהם אמורים (ראו tests/integration ו-supabase/tests).
--   3. לסקור grants בפועל אחרי ההרצה (ראו 0002_rls.sql).
-- אין להוסיף הרשאות כתיבה ישירות ללקוחות "כדי לעקוף" RPC חסרה.
-- ==========================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open','closed')),
  timezone text not null default 'Asia/Jerusalem',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check ((status = 'open' and closed_at is null)
      or (status = 'closed' and closed_at is not null))
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  slot smallint not null check (slot in (1,2)),
  joined_at timestamptz not null default now(),
  primary key (space_id,user_id),
  unique (user_id),
  unique (space_id,slot)
);

-- לא נגיש ב-Data API; אין raw token בשום טבלה.
create table private.invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  target_email text not null check (target_email = lower(btrim(target_email))),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (expires_at > created_at),
  check ((status = 'accepted' and accepted_by is not null and accepted_at is not null)
      or (status <> 'accepted' and accepted_by is null and accepted_at is null))
);
create unique index one_pending_invite_per_space
  on private.invitations(space_id) where status = 'pending';

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null default 'other' check
    (category in ('food','outdoors','culture','trip','home','learning','other')),
  location_text text check (char_length(location_text) <= 200),
  source_url text check (char_length(source_url) <= 2048 and source_url ~ '^https://'),
  cost_minor bigint check (cost_minor between 0 and 100000000),
  currency text not null default 'ILS' check (currency = 'ILS'),
  duration_minutes integer check (duration_minutes between 1 and 525600),
  status text not null default 'active' check (status in ('active','archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,space_id),
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);

create table public.idea_reactions (
  space_id uuid not null,
  idea_id uuid not null,
  user_id uuid not null,
  preference text not null check (preference in ('yes','maybe','no')),
  updated_at timestamptz not null default now(),
  primary key (idea_id,user_id),
  foreign key (idea_id,space_id) references public.ideas(id,space_id) on delete cascade,
  foreign key (space_id,user_id) references public.space_members(space_id,user_id)
);

create table public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  idea_id uuid not null,
  created_by uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (idea_id,space_id) references public.ideas(id,space_id) on delete cascade,
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  idea_id uuid not null,
  created_by uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status text not null default 'proposed' check (status in ('proposed','completed','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Asia/Jerusalem',
  meeting_place text check (char_length(meeting_place) <= 200),
  notes text not null default '' check (char_length(notes) <= 3000),
  budget_minor bigint check (budget_minor between 0 and 100000000),
  currency text not null default 'ILS' check (currency = 'ILS'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,space_id),
  check (ends_at is null or (starts_at is not null and ends_at > starts_at)),
  foreign key (idea_id,space_id) references public.ideas(id,space_id),
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);
create unique index one_active_plan_per_idea on public.plans(idea_id)
  where status = 'proposed';

create table public.plan_confirmations (
  space_id uuid not null,
  plan_id uuid not null,
  user_id uuid not null,
  plan_version integer not null check (plan_version > 0),
  confirmed_at timestamptz not null default now(),
  primary key (plan_id,user_id),
  foreign key (plan_id,space_id) references public.plans(id,space_id) on delete cascade,
  foreign key (space_id,user_id) references public.space_members(space_id,user_id)
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  plan_id uuid not null unique,
  created_by uuid not null,
  happened_on date not null,
  story text not null default '' check (char_length(story) <= 5000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,space_id),
  foreign key (plan_id,space_id) references public.plans(id,space_id),
  foreign key (space_id,created_by) references public.space_members(space_id,user_id)
);

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  memory_id uuid not null,
  uploaded_by uuid not null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  status text not null default 'pending' check (status in ('pending','ready','failed','deleting')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id,space_id),
  foreign key (memory_id,space_id) references public.memories(id,space_id) on delete cascade,
  foreign key (space_id,uploaded_by) references public.space_members(space_id,user_id),
  check (object_path = space_id::text || '/' || memory_id::text || '/' || id::text)
);

create table private.mutation_keys (
  actor_id uuid not null references public.profiles(id),
  operation text not null,
  request_id uuid not null,
  payload_hash text not null,
  resource_id uuid,
  created_at timestamptz not null default now(),
  primary key (actor_id,operation,request_id)
);

create table private.audit_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index ideas_feed on public.ideas(space_id,status,created_at desc,id desc);
create index comments_feed on public.idea_comments(idea_id,created_at,id);
create index plans_feed on public.plans(space_id,status,starts_at,id);
create index memories_feed on public.memories(space_id,happened_on desc,id desc);
create index photos_by_memory on public.memory_photos(memory_id,status,sort_order);
create index reactions_by_space on public.idea_reactions(space_id,user_id);
create index confirmations_by_space on public.plan_confirmations(space_id);

-- ה-FK המורכבים מונעים חיבור ילד למרחב אחר. unique(user_id) מונע חברות כפולה;
-- שתי משבצות עם unique מונעות חבר שלישי גם במירוץ. מחיקת חשבון אינה
-- DELETE auth.users עיוור: חלק מה-FK בכוונה מונעים מחיקה לפני טיפול מסודר
-- במרחב ובנתונים המשותפים.
