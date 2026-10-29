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
    ["Facilities", "Resources"].forEach(function (name) {
      if (read_(name).length === 0) write_(name, seed.tables[name]);
    });
  } finally {
    lock.releaseLock();
  }
}
