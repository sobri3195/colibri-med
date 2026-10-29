import "fake-indexeddb/auto";
import { afterEach, it, expect, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("frontend connected failure remains a failure without creating demo data", async () => {
  vi.stubEnv("VITE_APP_MODE", "connected");
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: async () => ({
        ok: false,
        error: { code: "UPSTREAM", message: "backend unavailable" },
      }),
    }),
  );
  const { call, mode } = await import("../src/services/api");
  expect(mode).toBe("connected");
  await expect(call("requests.list", {})).rejects.toThrow("UPSTREAM");
  expect(fetch).toHaveBeenCalledTimes(1);
  const { getLocal } = await import("../src/services/storage");
  expect(await getLocal("demo", "state")).toBeUndefined();
});
