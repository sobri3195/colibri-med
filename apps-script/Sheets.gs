var TABLES = [
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
];
var HEADERS = [
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "revision",
  "status",
  "data",
];
function database_() {
  var id =
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw Error("CONFIG: SPREADSHEET_ID belum diatur");
  return SpreadsheetApp.openById(id);
}
function sheet_(name) {
  if (TABLES.indexOf(name) < 0) throw Error("SCHEMA: Sheet tidak valid");
  var s = database_().getSheetByName(name);
  if (!s) throw Error("SCHEMA: Jalankan setupSheets");
  var h = s.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (JSON.stringify(h) !== JSON.stringify(HEADERS))
    throw Error("SCHEMA: Header tidak sesuai");
  return s;
}
function read_(name) {
  var s = sheet_(name);
  if (s.getLastRow() < 2) return [];
  return s
    .getRange(2, 1, s.getLastRow() - 1, HEADERS.length)
    .getValues()
    .map(function (r) {
      var data = JSON.parse(r[7]);
      if (data.id !== r[0] || Number(data.revision) !== Number(r[5]))
        throw Error("SCHEMA: Record tidak sesuai");
      return data;
    });
}
function safeCell_(value) {
  var text = String(value == null ? "" : value);
  return /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
}
function cells_(r) {
  return [
    r.id,
    r.createdAt,
    r.updatedAt,
    r.createdBy,
    r.updatedBy,
    r.revision,
    r.status,
    JSON.stringify(r),
  ].map(safeCell_);
}
function write_(name, records) {
  if (!records.length) return;
  var s = sheet_(name);
  var ids =
    s.getLastRow() > 1
      ? s
          .getRange(2, 1, s.getLastRow() - 1, 1)
          .getValues()
          .map(function (r) {
            return r[0];
          })
      : [];
  var append = [];
  records.forEach(function (r) {
    var index = ids.indexOf(r.id);
    if (index < 0) append.push(cells_(r));
    else s.getRange(index + 2, 1, 1, HEADERS.length).setValues([cells_(r)]);
  });
  if (append.length)
    s.getRange(s.getLastRow() + 1, 1, append.length, HEADERS.length).setValues(
      append,
    );
}
function base_(data, actor) {
  return Object.assign(
    {
      id: Utilities.getUuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor || "setup",
      updatedBy: actor || "setup",
      revision: 1,
      status: "Actif",
    },
    data,
  );
}
