import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "node:crypto";
export const actions = new Set([
  "health",
  "auth.login",
  "auth.logout",
  "auth.me",
  "requests.create",
  "requests.update",
  "requests.list",
  "requests.get",
  "requests.transition",
  "missions.list",
  "missions.get",
  "missions.assign",
  "missions.transition",
  "medicalReviews.save",
  "medicalReviews.list",
  "flightReviews.save",
  "flightReviews.list",
  "patientNotes.create",
  "patientNotes.list",
  "checklists.save",
  "checklists.list",
  "facilities.list",
  "resources.list",
  "resources.update",
  "handovers.save",
  "handovers.list",
  "reports.summary",
  "leadership.summary",
  "activity.list",
]);
const MAX = 32768;
export const config = { maxDuration: 60 };
export function validOrigin(origin: unknown, expected: unknown) {
  return (
    typeof origin === "string" &&
    typeof expected === "string" &&
    origin === expected &&
    new URL(origin).origin === expected
  );
}
export default async function gateway(req: VercelRequest, res: VercelResponse) {
  const requestId = randomBytes(16).toString("hex");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const fail = (status: number, code: string, message: string) =>
    res.status(status).json({
      ok: false,
      error: { code, message },
      requestId,
      serverTime: new Date().toISOString(),
    });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(405, "METHOD", "Metode tidak diizinkan");
  }
  try {
    if (!validOrigin(req.headers.origin, process.env.APP_ORIGIN))
      return fail(403, "ORIGIN", "Origin tidak diizinkan");
  } catch {
    return fail(403, "ORIGIN", "Origin tidak valid");
  }
  const url = process.env.APPS_SCRIPT_WEB_APP_URL;
  const secret = process.env.APPS_SCRIPT_SHARED_SECRET;
  if (
    !url ||
    !secret ||
    !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(
      url,
    )
  )
    return fail(503, "CONFIG", "Backend connected belum dikonfigurasi");
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > MAX) return fail(413, "PAYLOAD", "Payload terlalu besar");
  let body: any;
  try {
    if (req.body !== undefined) {
      const raw =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (Buffer.byteLength(raw) > MAX)
        return fail(413, "PAYLOAD", "Payload terlalu besar");
      body = JSON.parse(raw);
    } else {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > MAX)
          return fail(413, "PAYLOAD", "Payload terlalu besar");
      }
      body = JSON.parse(raw);
    }
  } catch {
    return fail(400, "JSON", "JSON tidak valid");
  }
  if (
    !actions.has(body?.action) ||
    !body.payload ||
    typeof body.payload !== "object" ||
    Array.isArray(body.payload)
  )
    return fail(400, "ACTION", "Action atau payload tidak valid");
  const cookie = String(req.headers.cookie ?? "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("colibri_session="))
    ?.slice(16);
  const sessionToken = cookie && /^[a-f0-9]{64}$/.test(cookie) ? cookie : "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        requestId,
        action: body.action,
        payload: body.payload,
        sessionToken,
        candidateToken:
          body.action === "auth.login"
            ? randomBytes(32).toString("hex")
            : undefined,
      }),
      signal: AbortSignal.timeout(50000),
      redirect: "follow",
    });
    if (!response.ok)
      return fail(502, "UPSTREAM", "Backend tidak dapat dihubungi");
    const result = await response.json();
    if (typeof result.ok !== "boolean")
      return fail(502, "UPSTREAM", "Respons backend tidak valid");
    if (body.action === "auth.login" && result.ok) {
      const token = result.data?.sessionToken;
      if (!/^[a-f0-9]{64}$/.test(token))
        return fail(502, "UPSTREAM", "Respons sesi tidak valid");
      res.setHeader(
        "Set-Cookie",
        `colibri_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
      );
      result.data = result.data.actor;
    }
    if (body.action === "auth.logout" && result.ok)
      res.setHeader(
        "Set-Cookie",
        "colibri_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
      );
    if (!result.ok)
      return fail(
        result.error?.code === "UNAUTHORIZED" ? 401 : 400,
        String(result.error?.code ?? "BACKEND"),
        String(result.error?.message ?? "Permintaan gagal"),
      );
    return res.status(200).json({
      ok: true,
      data: result.data,
      requestId,
      serverTime: result.serverTime,
    });
  } catch {
    return fail(
      502,
      "UPSTREAM",
      "Koneksi backend gagal. Mode connected tetap aktif.",
    );
  }
}
