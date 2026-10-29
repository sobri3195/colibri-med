import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import {
  queue,
  outbox,
  archiveOperation,
  archivedOperations,
} from "../src/services/storage";
import type { Actor, Operation } from "../src/types";
const actor = (): Actor => ({
  id: crypto.randomUUID(),
  name: "Simulasi",
  role: "Operator",
});
const operation = (payload: Record<string, unknown> = {}): Operation => ({
  operationId: crypto.randomUUID(),
  entityId: crypto.randomUUID(),
  baseRevision: 1,
  createdAt: new Date().toISOString(),
  status: "Menunggu jaringan",
  retryCount: 0,
  action: "requests.transition",
  payload,
});
async function connected(a: Actor, results: any[] = []) {
  vi.stubEnv("VITE_APP_MODE", "connected");
  vi.resetModules();
  vi.stubGlobal("navigator", { onLine: true });
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      const input = JSON.parse(options.body);
      calls.push(input.action);
      return {
        json: async () =>
          input.action === "auth.me"
            ? { ok: true, data: a }
            : (results.shift() ?? { ok: true, data: {} }),
      };
    }),
  );
  return { ...(await import("../src/services/api")), calls };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("preserves insertion order even for identical timestamps and keeps it on retry", async () => {
  const owner = crypto.randomUUID();
  const first = operation();
  const second = operation();
  second.createdAt = first.createdAt;
  first.operationId = "z-first";
  second.operationId = "a-second";
  await queue(owner, first);
  await queue(owner, second);
  await queue(owner, { ...first, status: "Gagal dikirim" });
  expect((await outbox(owner)).map((r) => r.operationId)).toEqual([
    "z-first",
    "a-second",
  ]);
});
it("sends outbox in order and checks the current session before mutations", async () => {
  const a = actor();
  const api = await connected(a);
  await queue(api.outboxOwner(a), operation());
  await queue(api.outboxOwner(a), operation());
  await api.retry(a);
  expect(api.calls).toEqual([
    "auth.me",
    "requests.transition",
    "requests.transition",
  ]);
  expect(await outbox(api.outboxOwner(a))).toHaveLength(0);
});
it("partial write blocks replay and all following operations", async () => {
  const a = actor();
  const api = await connected(a, [
    {
      ok: false,
      error: { code: "PARTIAL_FAILURE", message: "Perlu rekonsiliasi" },
    },
  ]);
  const owner = api.outboxOwner(a);
  await queue(owner, operation());
  await queue(owner, operation());
  await expect(api.retry(a)).rejects.toThrow("PARTIAL_FAILURE");
  expect((await outbox(owner)).map((p) => p.status)).toEqual([
    "Perlu rekonsiliasi",
    "Menunggu jaringan",
  ]);
  await expect(api.retry(a)).rejects.toThrow("BLOCKED");
  expect(api.calls.filter((c) => c !== "auth.me")).toHaveLength(1);
  await expect(
    archiveOperation(owner, (await outbox(owner))[0].operationId),
  ).rejects.toThrow("rekonsiliasi");
});
it("archives a reviewed conflict without losing the operation or exposing it to another actor", async () => {
  const a = actor();
  const api = await connected(a);
  const owner = api.outboxOwner(a);
  const conflict = { ...operation(), status: "Konflik perubahan" };
  await queue(owner, conflict);
  await queue(owner, operation());
  await expect(api.retry(a)).rejects.toThrow("BLOCKED");
  await archiveOperation(owner, conflict.operationId);
  expect(await archivedOperations(owner)).toHaveLength(1);
  expect(await archivedOperations(api.outboxOwner(actor()))).toHaveLength(0);
  await api.retry(a);
  expect(await outbox(owner)).toHaveLength(0);
});
it("new writes join the queue instead of overtaking existing operations", async () => {
  const a = actor();
  const api = await connected(a);
  const owner = api.outboxOwner(a);
  await queue(owner, operation());
  expect(
    await api.submit(a, "requests.transition", {
      id: crypto.randomUUID(),
      baseRevision: 1,
      status: "Diterima Operator",
    }),
  ).toEqual({ queued: true });
  expect(api.calls).toHaveLength(0);
  expect(await outbox(owner)).toHaveLength(2);
});
it("cannot retry another user session or silently send demo operations to connected", async () => {
  const a = actor();
  const api = await connected(actor());
  await queue(api.outboxOwner(a), operation());
  await queue("demo:" + a.id, operation());
  await expect(api.retry(a)).rejects.toThrow("UNAUTHORIZED");
  expect(api.calls).toEqual(["auth.me"]);
  expect(await outbox(api.outboxOwner(a))).toHaveLength(1);
  expect(await outbox("demo:" + a.id)).toHaveLength(1);
});
