import type { Actor, Operation, Result } from "../types";
import { demoCall } from "./demo";
import { queue, outbox, dequeue, saveReceipt } from "./storage";
import { ApiError, blockedDelivery, deliveryStatus } from "../lib/errors";
export const mode =
  import.meta.env.VITE_APP_MODE === "connected" ? "connected" : "demo";
export const outboxOwner = (actor: Actor | null) =>
  mode + ":" + (actor?.id ?? "public");
export async function call(
  action: string,
  payload: Record<string, unknown> = {},
  actor: Actor | null = null,
): Promise<any> {
  if (mode === "demo") return demoCall(actor, action, payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch("/api/gateway", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });
    const r: Result = await response.json();
    if (!r.ok) {
      const code = r.error?.code ?? "BACKEND";
      if (
        code === "UNAUTHORIZED" &&
        action !== "auth.login" &&
        typeof window !== "undefined"
      )
        window.dispatchEvent(new Event("colibri-session-expired"));
      throw new ApiError(code, r.error?.message ?? "Permintaan gagal");
    }
    return r.data;
  } finally {
    clearTimeout(timer);
  }
}
export async function submit(
  actor: Actor | null,
  action: string,
  payload: Record<string, unknown>,
) {
  const op: Operation = {
    operationId: crypto.randomUUID(),
    entityId: String(payload.id ?? crypto.randomUUID()),
    baseRevision: Number(payload.baseRevision ?? 0),
    createdAt: new Date().toISOString(),
    status: "Menunggu jaringan",
    retryCount: 0,
    action,
    payload,
  };
  op.payload = { ...payload, id: op.entityId, operationId: op.operationId };
  const owner = outboxOwner(actor);
  const pending = await outbox(owner);
  if (
    pending.some(
      (p) => p.entityId === op.entityId && p.status === "Perlu rekonsiliasi",
    )
  )
    throw new ApiError(
      "PARTIAL_FAILURE",
      "Operasi entitas ini perlu rekonsiliasi sebelum perubahan baru",
    );
  await queue(owner, op);
  if (!navigator.onLine || pending.length) return { queued: true };
  try {
    const result = await call(action, op.payload, actor);
    await saveReceipt(owner, op, result);
    await dequeue(owner, op.operationId);
    return result;
  } catch (e) {
    op.status = deliveryStatus(e);
    op.retryCount++;
    await queue(owner, op);
    throw e;
  }
}
export async function retry(actor: Actor | null) {
  const owner = outboxOwner(actor);
  const run = async () => {
    let sent = 0;
    if (!navigator.onLine)
      throw new ApiError("NETWORK", "Perangkat sedang offline");
    // Check the live cookie before replaying any internal connected operation.
    if (mode === "connected" && actor) {
      const current = await call("auth.me", {}, actor);
      if (current?.id !== actor.id)
        throw new ApiError(
          "UNAUTHORIZED",
          "Masuk kembali sebagai pemilik outbox",
        );
    }
    for (const op of await outbox(owner)) {
      if (blockedDelivery(op.status))
        throw new ApiError(
          "BLOCKED",
          "Operasi " +
            op.operationId +
            " perlu ditinjau; operasi berikutnya belum dikirim",
        );
      try {
        await queue(owner, { ...op, status: "Mengirim" });
        const result = await call(op.action, op.payload, actor);
        await saveReceipt(owner, op, result);
        await dequeue(owner, op.operationId);
        sent++;
      } catch (e) {
        await queue(owner, {
          ...op,
          retryCount: op.retryCount + 1,
          status: deliveryStatus(e),
        });
        throw e;
      }
    }
    return { sent, remaining: (await outbox(owner)).length };
  };
  return navigator.locks
    ? navigator.locks.request("colibri-outbox:" + owner, run)
    : run();
}
