import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID, pbkdf2Sync } from "node:crypto";
import { describe, it, expect } from "vitest";
function runtime() {
  const sheets = new Map<string, any[]>();
  const props = new Map([
    ["SPREADSHEET_ID", "private-mock"],
    ["PROXY_SHARED_SECRET", "mock-secret"],
  ]);
  const cache = new Map<string, string>();
  let failWrite = false;
  const sheet = (name: string) => ({
    getLastRow: () => sheets.get(name)!.length,
    setFrozenRows: () => {},
    getRange: (row: number, col: number, h: number, w: number) => ({
      getValues: () =>
        Array.from({ length: h }, (_, i) =>
          Array.from(
            { length: w },
            (_, j) => sheets.get(name)![row - 1 + i]?.[col - 1 + j] ?? "",
          ),
        ),
      setValues: (rows: any[][]) => {
        if (failWrite && name === "ActivityLogs")
          throw Error("simulated partial failure");
        rows.forEach((values, i) => {
          const arr = sheets.get(name)!;
          arr[row - 1 + i] ??= [];
          values.forEach((v, j) => (arr[row - 1 + i][col - 1 + j] = v));
        });
      },
    }),
  });
  const context = vm.createContext({
    console,
    TextEncoder,
    Uint8Array,
    Uint32Array,
    Int32Array,
    ArrayBuffer,
    DataView,
    Date,
    JSON,
    Math,
    Map,
    Set,
    WeakMap,
    WeakSet,
    URL,
    Utilities: {
      getUuid: randomUUID,
      newBlob: (s: string) => ({ getBytes: () => [...Buffer.from(s)] }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
        deleteProperty: (k: string) => props.delete(k),
      }),
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (n: string) => (sheets.has(n) ? sheet(n) : null),
        insertSheet: (n: string) => {
          sheets.set(n, []);
          return sheet(n);
        },
      }),
      flush: () => {},
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => cache.get(k) ?? null,
        put: (k: string, v: string) => cache.set(k, v),
        remove: (k: string) => cache.delete(k),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {},
        tryLock: () => true,
        releaseLock: () => {},
      }),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (s: string) => ({ setMimeType: () => s }),
    },
  });
  for (const name of [
    "Validation",
    "Domain",
    "Sheets",
    "Auth",
    "Setup",
    "Services",
    "Code",
  ])
    vm.runInContext(
      readFileSync("apps-script/" + name + ".gs", "utf8"),
      context,
    );
  const run = (code: string) => vm.runInContext(code, context);
  const post = (action: string, payload: any = {}, extra: any = {}) =>
    JSON.parse(
      run(
        `doPost({postData:{contents:${JSON.stringify(JSON.stringify({ secret: "mock-secret", action, payload, ...extra }))}}})`,
      ),
    );
  run("setupSheets(); seedSyntheticData();");
  return {
    run,
    post,
    sheets,
    props,
    setFail: (v: boolean) => {
      failWrite = v;
    },
  };
}
describe("actual Apps Script dispatcher against in-memory Sheets", () => {
  it("sets up every table idempotently without erasing data", () => {
    const r = runtime();
    expect([...r.sheets.keys()].sort()).toEqual(
      [
        "Users",
        "Sessions",
        "Requests",
        "MedicalReviews",
        "FlightReviews",
        "Missions",
        "MissionAssignments",
        "PatientNotes",
        "Checklists",
        "Facilities",
        "Resources",
        "HandoverRecords",
        "ActivityLogs",
        "Settings",
        "ProcessedOperations",
      ].sort(),
    );
    const count = r.sheets.get("Facilities")!.length;
    r.run("setupSheets(); seedSyntheticData();");
    expect(r.sheets.get("Facilities")).toHaveLength(count);
  });
  it("rejects wrong secret, arbitrary function names, public lists, and disabled public create", () => {
    const r = runtime();
    expect(r.post("health", {}, { secret: "wrong" }).error.code).toBe(
      "FORBIDDEN",
    );
    expect(r.post("setupSheets").ok).toBe(false);
    expect(r.post("requests.list").error.code).toBe("UNAUTHORIZED");
    expect(r.post("requests.create").error.code).toBe("FORBIDDEN");
    expect(r.post("health").data).toEqual({ status: "ok", prototype: true });
  });
  it("uses standard PBKDF2 and never stores raw session tokens or passwords", () => {
    const r = runtime();
    const password = "synthetic-passphrase-123";
    r.props.set("INVITE_USERNAME", "operator");
    r.props.set("INVITE_PASSWORD", password);
    r.props.set("INVITE_ROLE", "Operator");
    r.run("createInvitedAccount();");
    const user = JSON.parse(r.sheets.get("Users")![1][7]);
    expect(user.passwordHash).toBe(
      pbkdf2Sync(
        password,
        Buffer.from(user.salt, "hex"),
        600000,
        32,
        "sha256",
      ).toString("hex"),
    );
    expect(r.props.has("INVITE_PASSWORD")).toBe(false);
    const token = "a".repeat(64);
    const login = r.post(
      "auth.login",
      { username: "operator", password },
      { candidateToken: token },
    );
    expect(login.ok).toBe(true);
    expect(JSON.stringify(r.sheets.get("Sessions"))).not.toContain(token);
    expect(r.post("auth.me", {}, { sessionToken: token }).data.role).toBe(
      "Operator",
    );
    expect(r.post("auth.logout", {}, { sessionToken: token }).ok).toBe(true);
    expect(r.post("auth.me", {}, { sessionToken: token }).error.code).toBe(
      "UNAUTHORIZED",
    );
  }, 20000);
  it("expires sessions, checks active users, and limits login attempts", () => {
    const r = runtime();
    r.run(
      `write_('Users',[base_({id:'user',username:'u',role:'Operator'})]);write_('Sessions',[base_({userId:'user',tokenHash:digest_('${"b".repeat(64)}'),expiresAt:'2000-01-01T00:00:00Z'})]);`,
    );
    expect(
      r.post("auth.me", {}, { sessionToken: "b".repeat(64) }).error.code,
    ).toBe("UNAUTHORIZED");
    r.run(`CacheService.getScriptCache().put('login:'+digest_('u'),'5',900)`);
    expect(
      r.post(
        "auth.login",
        { username: "u", password: "bad" },
        { candidateToken: "c".repeat(64) },
      ).error.code,
    ).toBe("RATE_LIMIT");
  });
  it("persists requests, prevents formulas and retries without duplicate rows", () => {
    const r = runtime();
    r.props.set("PUBLIC_SUBMISSIONS_ENABLED", "true");
    const p = {
      id: randomUUID(),
      operationId: randomUUID(),
      data: {
        name: "=SUM(1,1)",
        contact: "@bad",
        facility: "Facility",
        summary: "Synthetic only",
        patients: 1,
        location: "Example location",
        access: "",
        lat: "",
        lng: "",
      },
    };
    expect(r.post("requests.create", p).ok).toBe(true);
    expect(r.post("requests.create", p).ok).toBe(true);
    expect(
      r.post("requests.create", { ...p, data: { ...p.data, patients: 2 } })
        .error.code,
    ).toBe("OPERATION_REUSE");
    expect(r.sheets.get("Requests")).toHaveLength(2);
    expect(r.run(`safeCell_(' =SUM(1,1)')`)).toBe("' =SUM(1,1)");
    for (const cell of r.sheets.get("Requests")![1])
      expect(String(cell)).not.toMatch(/^[\s]*[=+@-]/);
  });
  it("journals partial failures and blocks unsafe replay", () => {
    const r = runtime();
    r.props.set("PUBLIC_SUBMISSIONS_ENABLED", "true");
    r.setFail(true);
    const p = {
      id: randomUUID(),
      operationId: randomUUID(),
      data: {
        name: "Simulasi",
        contact: "example",
        facility: "Example facility",
        summary: "Synthetic only",
        patients: 1,
        location: "Example location",
        access: "",
        lat: "",
        lng: "",
      },
    };
    expect(r.post("requests.create", p).error.code).toBe("PARTIAL_FAILURE");
    r.setFail(false);
    expect(r.post("requests.create", p).error.code).toBe("PARTIAL_FAILURE");
    expect(r.sheets.get("Requests")).toHaveLength(2);
    expect(
      r.post("requests.create", {
        ...p,
        id: randomUUID(),
        operationId: randomUUID(),
      }).error.code,
    ).toBe("PARTIAL_FAILURE");
  });
});
