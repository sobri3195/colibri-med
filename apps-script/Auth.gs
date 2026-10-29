function digest_(value) {
  return Domain.bytesToHex(Domain.sha256(new TextEncoder().encode(value)));
}
function passwordHash_(password, salt) {
  return Domain.bytesToHex(
    Domain.pbkdf2(
      Domain.sha256,
      new TextEncoder().encode(password),
      Domain.hexToBytes(salt),
      { c: 600000, dkLen: 32 },
    ),
  );
}
function equal_(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  var mismatch = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++)
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return mismatch === 0;
}
function actor_(token) {
  if (!/^[a-f0-9]{64}$/.test(token || ""))
    throw Error("UNAUTHORIZED: Login diperlukan");
  var hash = digest_(token);
  var session = read_("Sessions").find(function (s) {
    return (
      equal_(s.tokenHash, hash) &&
      s.status === "Actif" &&
      Date.parse(s.expiresAt) > Date.now()
    );
  });
  if (!session) throw Error("UNAUTHORIZED: Sesi kedaluwarsa");
  var user = read_("Users").find(function (u) {
    return u.id === session.userId && u.status === "Actif";
  });
  if (!user) throw Error("UNAUTHORIZED: Pengguna tidak aktif");
  return { id: user.id, name: user.name, role: user.role };
}
function login_(p, candidate) {
  if (
    typeof p.username !== "string" ||
    typeof p.password !== "string" ||
    p.username.length > 100 ||
    p.password.length > 200 ||
    !/^[a-f0-9]{64}$/.test(candidate || "")
  )
    throw Error("VALIDATION: Login tidak valid");
  var cache = CacheService.getScriptCache();
  var key = "login:" + digest_(p.username.toLowerCase());
  var count = Number(cache.get(key) || 0);
  if (count >= 5)
    throw Error("RATE_LIMIT: Terlalu banyak percobaan. Coba lagi nanti.");
  cache.put(key, String(count + 1), 900);
  var u = read_("Users").find(function (r) {
    return r.username === p.username.toLowerCase() && r.status === "Actif";
  });
  var salt = u ? u.salt : "00000000000000000000000000000000";
  var hash = passwordHash_(p.password, salt);
  if (!u || !equal_(hash, u.passwordHash))
    throw Error("UNAUTHORIZED: Login gagal");
  cache.remove(key);
  write_("Sessions", [
    base_(
      {
        userId: u.id,
        tokenHash: digest_(candidate),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      u.id,
    ),
  ]);
  return {
    actor: { id: u.id, name: u.name, role: u.role },
    sessionToken: candidate,
  };
}
function logout_(token) {
  var hash = digest_(token || "");
  var session = read_("Sessions").find(function (s) {
    return equal_(s.tokenHash, hash);
  });
  if (session) {
    session.status = "Révoqué";
    session.updatedAt = new Date().toISOString();
    session.revision++;
    write_("Sessions", [session]);
  }
  return { loggedOut: true };
}
// Run only in the Apps Script editor, not exposed by the dispatcher.
// Configure INVITE_USERNAME, INVITE_PASSWORD and INVITE_ROLE in Script Properties.
function createInvitedAccount() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var username = props.getProperty("INVITE_USERNAME");
    var password = props.getProperty("INVITE_PASSWORD");
    var role = props.getProperty("INVITE_ROLE");
    if (
      !username ||
      !password ||
      password.length < 14 ||
      [
        "Operator",
        "Koordinator medis",
        "Koordinator penerbangan",
        "Dokter/perawat",
        "Rumah sakit penerima",
        "Administrator",
        "Viewer pimpinan",
      ].indexOf(role) < 0
    )
      throw Error("Invitation properties invalid");
    username = username.toLowerCase();
    if (
      read_("Users").some(function (u) {
        return u.username === username;
      })
    )
      throw Error("User already exists");
    var salt = Utilities.getUuid().replace(/-/g, "");
    write_("Users", [
      base_({
        username: username,
        name: username,
        role: role,
        salt: salt,
        passwordHash: passwordHash_(password, salt),
      }),
    ]);
    props.deleteProperty("INVITE_PASSWORD");
  } finally {
    lock.releaseLock();
  }
}
