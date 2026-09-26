import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

// getClaims עם JWKS מהבנייה (27.9, lib/supabase/jwks.ts): מאמת בלי אף קריאת
// רשת, ומפתח שלא ברשימה (הוחלף מאז הבנייה) עדיין יורד מהשרת.
const b64url = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf as Uint8Array).toString("base64url");

async function makeToken(kid: string) {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const header = b64url(Buffer.from(JSON.stringify({ alg: "ES256", typ: "JWT", kid })));
  const payload = b64url(
    Buffer.from(JSON.stringify({ sub: "user-1", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 600 })),
  );
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, Buffer.from(`${header}.${payload}`));
  return { token: `${header}.${payload}.${b64url(sig)}`, jwk: { ...pub, kid, alg: "ES256", key_ops: ["verify"] } };
}

describe("getClaims עם JWKS סטטי", () => {
  it("מאמת בלי קריאת רשת", async () => {
    const { token, jwk } = await makeToken("k1");
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
    const client = createClient("https://example.supabase.co", "anon", {
      global: { fetch: fetchSpy },
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "t1" },
    });
    const { data, error } = await client.auth.getClaims(token, { jwks: { keys: [jwk as never] } });
    expect(error).toBeNull();
    expect(data?.claims.sub).toBe("user-1");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("kid שלא ברשימה — מוריד את ה-JWKS מהשרת", async () => {
    const { token, jwk } = await makeToken("k2");
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createClient("https://example.supabase.co", "anon", {
      global: { fetch: fetchSpy },
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "t2" },
    });
    const { data, error } = await client.auth.getClaims(token, { jwks: { keys: [{ ...jwk, kid: "old" } as never] } });
    expect(error).toBeNull();
    expect(data?.claims.sub).toBe("user-1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String((fetchSpy.mock.calls[0] as unknown[])[0])).toContain("/auth/v1/.well-known/jwks.json");
  });

  it("חתימה מזויפת — נדחית גם עם JWKS סטטי", async () => {
    const a = await makeToken("k3");
    const b = await makeToken("k3");
    const client = createClient("https://example.supabase.co", "anon", {
      global: { fetch: vi.fn() },
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "t3" },
    });
    // הטוקן של a מול המפתח של b (אותו kid) — חייב להיכשל.
    const { data, error } = await client.auth.getClaims(a.token, { jwks: { keys: [b.jwk as never] } });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
