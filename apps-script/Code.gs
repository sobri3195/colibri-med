function doPost(event) {
  var requestId = Utilities.getUuid();
  var lock;
  var output;
  try {
    var e = envelope_(event && event.postData && event.postData.contents);
    if (typeof e.requestId === "string" && /^[a-f0-9]{32}$/.test(e.requestId))
      requestId = e.requestId;
    if (e.action === "health")
      return json_({
        ok: true,
        data: { status: "ok", prototype: true },
        requestId: requestId,
        serverTime: new Date().toISOString(),
      });
    lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) throw Error("BUSY: Server sibuk; coba kembali");
    var data;
    if (e.action === "auth.login") data = login_(e.payload, e.candidateToken);
    else if (e.action === "auth.logout") data = logout_(e.sessionToken);
    else {
      var actor = null;
      if (e.action === "requests.create" && !e.sessionToken) {
        if (
          PropertiesService.getScriptProperties().getProperty(
            "PUBLIC_SUBMISSIONS_ENABLED",
          ) !== "true"
        )
          throw Error("FORBIDDEN: Permohonan publik belum diaktifkan");
        var cache = CacheService.getScriptCache();
        var key = "public-submissions";
        var count = Number(cache.get(key) || 0);
        if (count >= 20)
          throw Error("RATE_LIMIT: Pengiriman simulasi dibatasi sementara");
        cache.put(key, String(count + 1), 600);
      } else actor = actor_(e.sessionToken);
      data =
        e.action === "auth.me" ? actor : service_(actor, e.action, e.payload);
    }
    output = {
      ok: true,
      data: data,
      requestId: requestId,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    var message = String((error && error.message) || "");
    var match =
      /^(UNAUTHORIZED|FORBIDDEN|VALIDATION|CONFLICT|WORKFLOW|RATE_LIMIT|PARTIAL_FAILURE|NOT_FOUND|SCHEMA|CONFIG|BUSY|PAYLOAD|ACTION): (.{1,180})/.exec(
        message,
      );
    output = {
      ok: false,
      error: {
        code: match ? match[1] : "INTERNAL",
        message: match
          ? match[2]
          : "Permintaan gagal. Hubungi administrator prototipe.",
      },
      requestId: requestId,
      serverTime: new Date().toISOString(),
    };
  } finally {
    if (lock) lock.releaseLock();
  }
  return json_(output);
}
function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
