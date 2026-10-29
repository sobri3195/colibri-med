import { openDB } from "idb";
import type { Operation } from "../types";
const db = () =>
  openDB("colibri-med", 1, {
    upgrade(d) {
      d.createObjectStore("drafts");
      d.createObjectStore("outbox");
      d.createObjectStore("demo");
    },
  });
export async function getLocal(store: "drafts" | "demo", key: string) {
  return (await db()).get(store, key);
}
export async function putLocal(
  store: "drafts" | "demo",
  key: string,
  value: unknown,
) {
  return (await db()).put(store, value, key);
}
export async function queue(owner: string, op: Operation) {
  return (await db()).put(
    "outbox",
    { ...op, owner },
    owner + ":" + op.operationId,
  );
}
export async function outbox(owner: string): Promise<Operation[]> {
  return (await (await db()).getAll("outbox")).filter((x) => x.owner === owner);
}
export async function dequeue(owner: string, id: string) {
  return (await db()).delete("outbox", owner + ":" + id);
}
