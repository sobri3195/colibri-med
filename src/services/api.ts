import type { Actor, Operation, Result } from "../types";
import { demoCall } from "./demo";
import { queue, outbox, dequeue } from "./storage";
export const mode =
  import.meta.env.VITE_APP_MODE === "connected" ? "connected" : "demo";
export async function call(
  action: string,
  payload: Record<string, unknown> = {},
  actor: Actor | null = null,
): Promise<any> {
  if (mode === "demo") return demoCall(actor, action, payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("/api/gateway", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });
    const r: Result = await response.json();
    if (!r.ok)
      throw Error(
        (r.error?.code ?? "BACKEND") +
          ": " +
          (r.error?.message ?? "Permintaan gagal"),
      );
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
  const owner = actor?.id ?? "public";
  await queue(owner, op);
  if (!navigator.onLine) return { queued: true };
  try {
    const result = await call(action, op.payload, actor);
    await dequeue(owner, op.operationId);
    return result;
  } catch (e) {
    op.status = String(e).includes("CONFLICT")
      ? "Konflik perubahan"
      : "Gagal dikirim";
    op.retryCount++;
    await queue(owner, op);
    throw e;
  }
}
export async function retry(actor: Actor | null) {
  const owner = actor?.id ?? "public";
  for (const op of await outbox(owner)) {
    if (op.status === "Konflik perubahan") continue;
    try {
      await queue(owner, { ...op, status: "Mengirim" });
      await call(op.action, op.payload, actor);
      await dequeue(owner, op.operationId);
    } catch (e) {
      await queue(owner, {
        ...op,
        retryCount: op.retryCount + 1,
        status: String(e).includes("CONFLICT")
          ? "Konflik perubahan"
          : "Gagal dikirim",
      });
      throw e;
    }
  }
}
