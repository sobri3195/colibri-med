function service_(actor, action, p) {
  if (
    actor &&
    actor.role === "Viewer pimpinan" &&
    action !== "leadership.summary"
  )
    throw Error(
      "FORBIDDEN: Gunakan ringkasan pengawasan pimpinan; data operasional rinci dibatasi",
    );
  var group = action.split(".")[0];
  var tables = {
    requests: "Requests",
    missions: "Missions",
    medicalReviews: "MedicalReviews",
    flightReviews: "FlightReviews",
    patientNotes: "PatientNotes",
    checklists: "Checklists",
    facilities: "Facilities",
    resources: "Resources",
    handovers: "HandoverRecords",
    activity: "ActivityLogs",
    aircraft: "Aircraft",
    aircraftReports: "AircraftReports",
  };
  var mutation = !/\.(list|get|summary|snapshot)$/.test(action);
  var names =
    action === "aircraft.snapshot"
      ? ["Aircraft", "AircraftReports", "Missions"]
      : action === "leadership.summary"
        ? [
            "Requests",
            "Missions",
            "MedicalReviews",
            "FlightReviews",
            "HandoverRecords",
            "Resources",
            "Facilities",
            "ActivityLogs",
          ]
        : action === "reports.summary"
          ? TABLES.filter(function (n) {
              return (
                [
                  "Users",
                  "Sessions",
                  "Settings",
                  "ProcessedOperations",
                ].indexOf(n) < 0
              );
            })
          : mutation
            ? [
                "Requests",
                "Missions",
                "MedicalReviews",
                "FlightReviews",
                "PatientNotes",
                "Checklists",
                "HandoverRecords",
                "MissionAssignments",
                "ActivityLogs",
                "Resources",
                "Facilities",
                "Aircraft",
                "AircraftReports",
              ]
            : [tables[group]];
  if (
    action === "reports.summary" &&
    ["Dokter/perawat", "Koordinator medis", "Administrator"].indexOf(
      actor.role,
    ) < 0
  )
    names = names.filter(function (n) {
      return n !== "PatientNotes";
    });
  var state = { tables: {}, processed: {} };
  Object.keys(tables).forEach(function (k) {
    state.tables[tables[k]] = [];
  });
  names.forEach(function (n) {
    state.tables[n] = read_(n);
  });
  var before = JSON.stringify(state.tables);
  var operations = mutation ? read_("ProcessedOperations") : [];
  var op = operations.find(function (r) {
    return r.id === p.operationId;
  });
  var owner = actor ? actor.id : "public";
  if (op) {
    if (op.owner !== owner)
      throw Error("FORBIDDEN: Operasi milik pengguna lain");
    if (op.fingerprint !== Domain.operationFingerprint(action, p))
      throw Error(
        "OPERATION_REUSE: operationId telah digunakan untuk permintaan berbeda",
      );
    if (op.status === "Committed") {
      state.processed[p.operationId] = {
        owner: op.owner,
        result: op.result,
        fingerprint: op.fingerprint,
      };
      return Domain.execute(state, actor, action, p);
    }
    throw Error(
      "PARTIAL_FAILURE: Operasi perlu rekonsiliasi administrator; jangan mengirim operasi baru.",
    );
  }
  var original = JSON.parse(before);
  if (
    operations.some(function (operation) {
      return operation.status !== "Committed";
    })
  )
    throw Error(
      "PARTIAL_FAILURE: Ada operasi tertunda; administrator harus merekonsiliasi sebelum perubahan baru.",
    );
  var result = Domain.execute(state, actor, action, p);
  if (!mutation) return result;
  // Journal pending first. A partial write is never silently replayed.
  var journal = base_(
    {
      id: p.operationId,
      owner: owner,
      status: "Pending",
      action: action,
      fingerprint: Domain.operationFingerprint(action, p),
      entityId: result.id,
      result: result,
    },
    owner,
  );
  write_("ProcessedOperations", [journal]);
  SpreadsheetApp.flush();
  try {
    Object.keys(state.tables).forEach(function (name) {
      var old = original[name] || [];
      var changed = state.tables[name].filter(function (r) {
        var prior = old.find(function (x) {
          return x.id === r.id;
        });
        return !prior || JSON.stringify(prior) !== JSON.stringify(r);
      });
      write_(name, changed);
    });
    SpreadsheetApp.flush();
    journal.status = "Committed";
    journal.revision++;
    journal.updatedAt = new Date().toISOString();
    write_("ProcessedOperations", [journal]);
    SpreadsheetApp.flush();
    return result;
  } catch (error) {
    throw Error(
      "PARTIAL_FAILURE: Penulisan sebagian mungkin terjadi; administrator harus meninjau operationId.",
    );
  }
}
