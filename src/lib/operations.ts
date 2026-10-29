import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
function canonical(value: unknown, depth = 0): string {
  if (depth > 20) throw Error("VALIDATION: Payload terlalu dalam");
  if (Array.isArray(value))
    return (
      "[" + value.map((v) => canonical(v ?? null, depth + 1)).join(",") + "]"
    );
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v, depth + 1))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export function operationFingerprint(action: string, payload: unknown) {
  return bytesToHex(
    sha256(new TextEncoder().encode(canonical({ action, payload }))),
  );
}
