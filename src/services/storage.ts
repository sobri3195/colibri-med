import { openDB } from "idb";
import type { Operation } from "../types";
let connection: ReturnType<typeof openDB> | undefined;
const db = () =>
  (connection ??= openDB("colibri-med", 3, {
    blocking() {
      const active = connection;
      connection = undefined;
      void active?.then((d) => d.close());
    },
    upgrade(d) {
      for (const name of ["drafts", "outbox", "demo", "meta", "archive"])
        if (!d.objectStoreNames.contains(name)) d.createObjectStore(name);
    },
  }));
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
  const tx = (await db()).transaction(["outbox", "meta"], "readwrite");
  const store = tx.objectStore("outbox");
  const key = owner + ":" + op.operationId;
  const previous = await store.get(key);
  let sequence = previous?.sequence;
  if (sequence === undefined) {
    sequence =
      Number((await tx.objectStore("meta").get("outboxSequence")) ?? 0) + 1;
    await tx.objectStore("meta").put(sequence, "outboxSequence");
  }
  await store.put({ ...op, owner, sequence }, key);
  await tx.done;
}
export async function outbox(owner: string): Promise<Operation[]> {
  return (await (await db()).getAll("outbox"))
    .filter((x) => x.owner === owner)
    .sort((a, b) =>
      a.sequence !== undefined && b.sequence !== undefined
        ? a.sequence - b.sequence
        : Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
          String(a.operationId).localeCompare(String(b.operationId)),
    );
}
export async function dequeue(owner: string, id: string) {
  return (await db()).delete("outbox", owner + ":" + id);
}
export async function archiveOperation(owner: string, id: string) {
  const tx = (await db()).transaction(["outbox", "archive"], "readwrite");
  const key = owner + ":" + id;
  const operation = await tx.objectStore("outbox").get(key);
  if (
    !operation ||
    !["Konflik perubahan", "Perlu ditinjau"].includes(operation.status)
  ) {
    await tx.done;
    throw Error(
      "Operasi ini tidak dapat diarsipkan; rekonsiliasi server harus ditangani administrator.",
    );
  }
  await tx
    .objectStore("archive")
    .put({ ...operation, archivedAt: new Date().toISOString() }, key);
  await tx.objectStore("outbox").delete(key);
  await tx.done;
}
export async function archivedOperations(owner: string) {
  return (await (await db()).getAll("archive")).filter(
    (r) => r.owner === owner,
  );
}
