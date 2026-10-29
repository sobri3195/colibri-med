function setupSheets() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var db = database_();
    TABLES.forEach(function (name) {
      var s = db.getSheetByName(name) || db.insertSheet(name);
      if (s.getLastRow() === 0) {
        s.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        s.setFrozenRows(1);
      } else sheet_(name);
    });
  } finally {
    lock.releaseLock();
  }
}
function seedSyntheticData() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var seed = Domain.seed();
    ["Facilities", "Resources", "Aircraft"].forEach(function (name) {
      if (read_(name).length === 0) write_(name, seed.tables[name]);
    });
    var currentAircraft = read_("Aircraft");
    var reports = read_("AircraftReports");
    var starterReports = seed.tables.AircraftReports.map(function (r) {
      var fixture = seed.tables.Aircraft.find(function (a) {
        return a.id === r.aircraftId;
      });
      var actual = currentAircraft.find(function (a) {
        return a.demoCode === fixture.demoCode && a.isSynthetic === true;
      });
      if (
        !actual ||
        reports.some(function (existing) {
          return existing.aircraftId === actual.id;
        })
      )
        return null;
      return Object.assign({}, r, {
        aircraftId: actual.id,
        lat: actual.lat,
        lng: actual.lng,
        aircraftStatus: actual.status,
      });
    }).filter(Boolean);
    write_("AircraftReports", starterReports);
  } finally {
    lock.releaseLock();
  }
}
