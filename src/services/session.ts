import { roles, type Actor } from "../types";
const key = "colibri-demo-session";
export interface DemoSession {
  actor: Actor;
  expiresAt: number;
}
export function readDemoSession(): DemoSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (
      !value ||
      !roles.includes(value.actor?.role) ||
      value.actor?.id !== "demo:" + value.actor.role ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= Date.now()
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
export function saveDemoSession(actor: Actor): DemoSession {
  const value = { actor, expiresAt: Date.now() + 3600000 };
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Demo can continue in memory if tab storage is unavailable. */
  }
  return value;
}
export function clearDemoSession() {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* No server token is stored here. */
  }
}
