// TextEncoder is not guaranteed by Apps Script V8. UTF-8 conversion via Utilities.
if (typeof TextEncoder === "undefined") {
  var TextEncoder = function () {};
  TextEncoder.prototype.encode = function (s) {
    return new Uint8Array(
      Utilities.newBlob(s)
        .getBytes()
        .map(function (b) {
          return (b + 256) % 256;
        }),
    );
  };
}
var ACTIONS = [
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
  "missions.reassign",
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
  "facilities.create",
  "facilities.update",
  "resources.list",
  "resources.create",
  "resources.update",
  "handovers.save",
  "handovers.list",
  "reports.summary",
  "leadership.summary",
  "activity.list",
];
function envelope_(raw) {
  if (
    typeof raw !== "string" ||
    Utilities.newBlob(raw).getBytes().length > 40000
  )
    throw Error("PAYLOAD: Payload terlalu besar");
  var e = JSON.parse(raw);
  var secret = PropertiesService.getScriptProperties().getProperty(
    "PROXY_SHARED_SECRET",
  );
  if (!secret || !equal_(e.secret, secret))
    throw Error("FORBIDDEN: Akses ditolak");
  if (
    ACTIONS.indexOf(e.action) < 0 ||
    !e.payload ||
    typeof e.payload !== "object" ||
    Array.isArray(e.payload)
  )
    throw Error("VALIDATION: Action atau payload tidak valid");
  if (
    e.payload.offset !== undefined &&
    (!Number.isInteger(e.payload.offset) || e.payload.offset < 0)
  )
    throw Error("VALIDATION: Offset tidak valid");
  if (
    e.payload.limit !== undefined &&
    (!Number.isInteger(e.payload.limit) ||
      e.payload.limit < 1 ||
      e.payload.limit > 100)
  )
    throw Error("VALIDATION: Limit tidak valid");
  return e;
}
