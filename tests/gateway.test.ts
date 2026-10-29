import { afterEach, describe, expect, it, vi } from "vitest";
import gateway, { validOrigin } from "../api/gateway";
const origin = "https://colibri.example";
async function request(action = "health", extra: any = {}) {
  const req: any = {
    method: "POST",
    headers: { origin },
    body: { action, payload: {} },
    ...extra,
  };
  const res: any = {
    headers: {},
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(n: number) {
      this.statusCode = n;
      return this;
    },
    json(v: any) {
      this.body = v;
      return this;
    },
  };
  await gateway(req, res);
  return res;
}
function config() {
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv(
    "APPS_SCRIPT_WEB_APP_URL",
    "https://script.google.com/macros/s/test/exec",
  );
  vi.stubEnv("APPS_SCRIPT_SHARED_SECRET", "test-only-not-a-real-secret");
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("same-origin gateway", () => {
  it("rejects cross-origin mutations and missing Origin", async () => {
    config();
    expect(
      (
        await request("health", {
          headers: { origin: "https://other.example" },
        })
      ).statusCode,
    ).toBe(403);
    expect((await request("health", { headers: {} })).statusCode).toBe(403);
  });
  it("rejects non POST and overlarge payloads", async () => {
    config();
    expect((await request("health", { method: "GET" })).statusCode).toBe(405);
    expect(
      (
        await request("health", {
          body: { action: "health", payload: { text: "x".repeat(40000) } },
        })
      ).statusCode,
    ).toBe(413);
  });
  it("fails visibly if connected config is unavailable", async () => {
    vi.stubEnv("APP_ORIGIN", origin);
    expect((await request()).body.error.code).toBe("CONFIG");
  });
  it("allowlists actions", async () => {
    config();
    expect((await request("setupSheets")).statusCode).toBe(400);
  });
  it("keeps token HttpOnly and secret server-side", async () => {
    config();
    let forwarded: any;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        forwarded = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              sessionToken: "a".repeat(64),
              actor: { id: "x", role: "Operator" },
            },
            serverTime: "2026-01-01",
          }),
        };
      }),
    );
    const r = await request("auth.login");
    expect(r.body.data).toEqual({ id: "x", role: "Operator" });
    expect(r.headers["Set-Cookie"]).toContain(
      "HttpOnly; Secure; SameSite=Strict",
    );
    expect(forwarded.secret).toBe("test-only-not-a-real-secret");
    expect(forwarded.candidateToken).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(r.body)).not.toContain("test-only");
  });
  it("reports upstream failure and never returns demo records", async () => {
    config();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Error("secret diagnostic")),
    );
    const r = await request();
    expect(r.statusCode).toBe(502);
    expect(r.body.data).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain("secret diagnostic");
  });
  it("revokes browser cookie after logout", async () => {
    config();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { loggedOut: true } }),
      }),
    );
    expect((await request("auth.logout")).headers["Set-Cookie"]).toContain(
      "Max-Age=0",
    );
  });
});
