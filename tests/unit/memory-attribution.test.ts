import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), userId: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: mocks.from }),
  getVerifiedUserId: mocks.userId,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ rpc: mocks.rpc }),
}));

import { getMemory, updateMemory } from "@/lib/dal/memories";

const id = "c17effd8-eecf-4d2e-b75e-df730a980e21";
const row = {
  id, plan_id: null, title: "ערב יחד", category: null, happened_on: "2026-10-01",
  story: "הסיפור שלנו", version: 3, created_by: "creator",
  last_edited_by: null as string | null, last_edited_at: null as string | null,
};

function useRow(memory: typeof row) {
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: memory }),
      returns: vi.fn().mockResolvedValue({ data: table === "profiles" ? [
        { id: "creator", display_name: " גואל " }, { id: "editor", display_name: " שלומי " },
      ] : [] }),
    };
    return query;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userId.mockResolvedValue("editor");
  useRow(row);
});

describe("memory attribution", () => {
  it("keeps an existing memory's creator without inventing a historical editor", async () => {
    expect(await getMemory(id)).toMatchObject({
      createdByName: "גואל", lastEditedByName: null, lastEditedAt: null,
    });
  });

  it("reads the actual editor separately from the original creator", async () => {
    useRow({ ...row, last_edited_by: "editor", last_edited_at: "2026-11-06T10:00:00Z" });
    expect(await getMemory(id)).toMatchObject({
      createdByName: "גואל", lastEditedByName: "שלומי", lastEditedAt: "2026-11-06T10:00:00Z",
    });
  });

  it("takes the editing actor from the verified session", async () => {
    mocks.rpc.mockResolvedValue({ data: { id, version: 4 }, error: null });
    await updateMemory({ memoryId: id, expectedVersion: 3, title: row.title,
      happenedOn: row.happened_on, story: "עדכון", category: null });
    expect(mocks.rpc).toHaveBeenCalledWith("update_memory", expect.objectContaining({
      p_actor: "editor", p_expected_version: 3,
    }));
  });

  it("does not write without a verified session", async () => {
    mocks.userId.mockResolvedValue(null);
    expect(await updateMemory({ memoryId: id, expectedVersion: 3, title: row.title,
      happenedOn: row.happened_on, story: "עדכון" })).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
