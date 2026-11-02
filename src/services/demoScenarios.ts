import type { Actor, Operation, RecordData } from "../types";
import { mode } from "./api";
import { seed, type State } from "./demo";
import { editDemo, getLocal, notifyDataChanged } from "./storage";
import { canManageScenarios } from "../lib/permissions";
import {
  buildScenario,
  isScenarioKey,
  scenarioId,
  scenarioRows,
  type ScenarioKey,
} from "../lib/scenarios";
function authorize(actor: Actor | null) {
  if (mode !== "demo" || !canManageScenarios(actor))
    throw Error(
      "FORBIDDEN: Pemuatan/reset skenario hanya untuk Operator atau Administrator dalam mode demo.",
    );
}
export async function scenarioManifests(actor: Actor | null) {
  authorize(actor);
  return (
    ((await getLocal("demo", "state")) as State | undefined)?.scenarios ?? {}
  );
}
export async function loadScenario(actor: Actor | null, key: ScenarioKey) {
  authorize(actor);
  if (!isScenarioKey(key)) throw Error("VALIDATION: Skenario tidak dikenal");
  const result = await editDemo((stored, pending) => {
    const state = (stored as State | undefined) ?? seed();
    if (state.scenarios?.[key]) {
      if (
        !state.tables.Requests.some(
          (r) =>
            r.id === state.scenarios![key].requestId && r.demoScenario === key,
        )
      )
        throw Error(
          "CONFLICT: Data skenario tidak lengkap. Tinjau lalu reset paket ini; isian lain tidak diganti.",
        );
      return { state, result: state.scenarios[key] };
    }
    const prepared = buildScenario(key);
    const preparedIds = new Set(
      Object.values(prepared.tables)
        .flat()
        .map((r) => r.id),
    );
    if (
      pending.some(
        (op) =>
          preparedIds.has(op.entityId) || references(op.payload, preparedIds),
      )
    )
      throw Error(
        "WORKFLOW: Ada antrean yang memakai referensi skenario. Tinjau Outbox sebelum memuat paket.",
      );
    const ids = new Set(
      Object.values(state.tables)
        .flat()
        .map((r) => r.id),
    );
    if (
      Object.values(prepared.tables)
        .flat()
        .some((r) => ids.has(r.id))
    )
      throw Error(
        "CONFLICT: ID skenario sudah digunakan. Tinjau atau reset data skenario sebelum memuat.",
      );
    for (const [table, rows] of Object.entries(prepared.tables))
      (state.tables[table] ??= []).push(...rows);
    Object.assign(state.processed, prepared.processed);
    const manifest = {
      requestId: scenarioId(key, 5),
      loadedAt: new Date().toISOString(),
      version: 1,
    };
    (state.scenarios ??= {})[key] = manifest;
    return { state, result: manifest };
  });
  notifyDataChanged();
  return result;
}
function references(value: unknown, ids: Set<string>): boolean {
  if (typeof value === "string") return ids.has(value);
  if (Array.isArray(value)) return value.some((v) => references(v, ids));
  return (
    !!value &&
    typeof value === "object" &&
    Object.values(value).some((v) => references(v, ids))
  );
}
export async function resetScenario(actor: Actor | null, key: ScenarioKey) {
  authorize(actor);
  if (!isScenarioKey(key)) throw Error("VALIDATION: Skenario tidak dikenal");
  await editDemo((stored, pending: Operation[]) => {
    const state = (stored as State | undefined) ?? seed();
    const ids = new Set(scenarioRows(state, key).map((r) => r.id));
    if (
      pending.some((op) => ids.has(op.entityId) || references(op.payload, ids))
    )
      throw Error(
        "WORKFLOW: Skenario memiliki antrean pengiriman. Kirim atau tinjau konflik melalui Outbox pemilik operasi sebelum reset.",
      );
    const foreign = Object.values(state.tables)
      .flat()
      .filter((r) => r.demoScenario !== key);
    if (
      foreign.some((r) =>
        [
          r.requestId,
          r.missionId,
          r.aircraftId,
          r.resourceIds,
          r.receivingFacilityId,
          r.originFacilityId,
        ].some((value) => references(value, ids)),
      )
    )
      throw Error(
        "WORKFLOW: Ada data lain yang merujuk skenario ini. Tinjau relasi terlebih dahulu; data pengguna tidak dihapus.",
      );
    for (const table of Object.keys(state.tables))
      state.tables[table] = state.tables[table].filter(
        (r) => r.demoScenario !== key,
      );
    for (const [id, op] of Object.entries(state.processed))
      if (ids.has((op.result as RecordData)?.id)) delete state.processed[id];
    if (state.scenarios) delete state.scenarios[key];
    return { state, result: undefined };
  });
  notifyDataChanged();
}
