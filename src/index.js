// V138J_REAL_INVITE_ALL_GAMES_DEEPLINK_READY_SAFE
// V138H_ALL_GAMES_10S_AUTO_TURN_SAFE
// V137P_OPPONENT_PROFILE_FRIEND_REAL_SAFE
// V137O_LIVE_MIC_ALL_GAMES_MESH_SAFE
// V137N_LIVE_AUTO_MATCH_SERVER_SAFE
// V137M_MATCH_MODE_BOT_OR_LIVE_ALL_GAMES_SAFE
// V136DY_DOMINO4_PARTNERSHIP_TEAMS_SAFE
const express = require("express");
const http = require("http");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");





const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ana_alafdal_dev_secret_change_later";
const MAX_ACCOUNTS_PER_DEVICE_V138G = 3;
function normalizeDeviceIdV138G(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

// V138J_REAL_INVITE_ALL_GAMES_DEEPLINK_READY_SAFE
const PLAY_STORE_URL_V138J = process.env.PLAY_STORE_URL || "https://play.google.com/store/apps/details?id=com.hadiapps.anaalafdal";
const INVITE_BASE_URL_V138J = process.env.INVITE_BASE_URL || "https://anaalafdal.app/invite";
const INVITE_REFERRER_REWARD_V138J = 3000;
const INVITE_NEW_USER_REWARD_V138J = 1000;

function normalizeInviteCodeV138J(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

function makeInviteCodeV138J(username) {
  const base = String(username || "ANA").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "ANA";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (base + rand).slice(0, 8);
}

function ensureInviteCodeV138J(db, user) {
  if (!user) return "";
  let code = normalizeInviteCodeV138J(user.inviteCode);
  const used = () => db.users.some((u) => u.id !== user.id && normalizeInviteCodeV138J(u.inviteCode) === code);
  let guard = 0;
  while (!code || used()) {
    code = makeInviteCodeV138J(user.username) + String(Math.floor(Math.random() * 90) + 10);
    guard++;
    if (guard > 20) code = "ANA" + Date.now().toString(36).toUpperCase().slice(-6);
  }
  user.inviteCode = code;
  return code;
}

function buildInviteLinkV138J({ code, game, roomId }) {
  const url = new URL(INVITE_BASE_URL_V138J);
  url.searchParams.set("code", normalizeInviteCodeV138J(code));
  if (game) url.searchParams.set("game", String(game).slice(0, 30));
  if (roomId) url.searchParams.set("room", String(roomId).slice(0, 80));
  url.searchParams.set("store", PLAY_STORE_URL_V138J);
  return url.toString();
}

function applyReferralOnRegisterV138J(db, newUser, inviteCode, deviceId) {
  const code = normalizeInviteCodeV138J(inviteCode);
  if (!code || !newUser) return null;
  const referrer = db.users.find((u) => normalizeInviteCodeV138J(u.inviteCode) === code);
  if (!referrer || referrer.id === newUser.id) return null;
  if (deviceId && referrer.deviceId && String(referrer.deviceId) === String(deviceId)) return null;

  db.referrals = Array.isArray(db.referrals) ? db.referrals : [];
  const exists = db.referrals.find((r) => r.referredUserId === newUser.id || (r.referrerId === referrer.id && r.referredDeviceId && r.referredDeviceId === deviceId));
  if (exists) return null;

  newUser.referredBy = referrer.id;
  newUser.referredByCode = code;
  newUser.coins = Number(newUser.coins || 0) + INVITE_NEW_USER_REWARD_V138J;
  referrer.coins = Number(referrer.coins || 0) + INVITE_REFERRER_REWARD_V138J;

  const record = {
    id: makeId("ref"),
    code,
    referrerId: referrer.id,
    referredUserId: newUser.id,
    referredDeviceId: deviceId || "",
    referrerReward: INVITE_REFERRER_REWARD_V138J,
    newUserReward: INVITE_NEW_USER_REWARD_V138J,
    status: "rewarded_after_register",
    createdAt: new Date().toISOString()
  };
  db.referrals.push(record);
  return record;
}

// V136IK_REAL_WAGER_ECONOMY_SAFE
// اقتصاد رهان حقيقي على السيرفر: خصم الرهان عند بداية المباراة، وتجميع pot، وتسليم الجائزة للفائز/الفريق.
const WAGER_STEPS_V136IK = [1000, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1000000];

function normalizeWagerV136IK(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1000;
  return WAGER_STEPS_V136IK.reduce((closest, step) => Math.abs(step - n) < Math.abs(closest - n) ? step : closest, WAGER_STEPS_V136IK[0]);
}

function isBotIdV136IK(id) {
  return String(id || "").startsWith("bot_");
}

const app = express();

// V138_REMOTE_CONFIG_SAFE: تحديث بيانات التطبيق من السيرفر بدون تحديث Google Play
app.get("/app-config", (req, res) => {
  res.json({
    ok: true,
    configVersion: 1,
    appMessage: "مرحبًا بك في أنا الأفضل 👑",
    updateMessage: "تم تحديث بيانات التطبيق بنجاح ✅",
    maintenance: false,
    minSupportedVersion: "1.0.0",
    dailyCoins: 1000,
    rewardedAdCoins: 1500,
    rewardedDailyLimit: 50,
    rewardedCooldownMinutes: 5,
    featureFlagsVersion: 1,
    features: {
      domino: true,
      chess: true,
      carrom: true,
      billiards: true,
      friends: true,
      privateChat: true,
      inviteFriends: true,
      voiceChat: true,
      rewardedAds: true,
      interstitialAds: true,
      policyPage: true
    },
    disabledMessage: "هذه الميزة غير متاحة مؤقتًا. اضغط تحديث البيانات لاحقًا.",
    forceUpdateTitle: "تحديث مطلوب",
    forceUpdateMessage: "يوجد تحديث جديد للتطبيق. يرجى التحديث من Google Play.",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.hadiapps.anaalafdal",
    updatedAt: new Date().toISOString()
  });
});







app.get("/", (req, res) => res.status(200).send("ANA_ALAFDAL_SERVER_OK"));
app.get("/health", (req, res) => res.status(200).send("ANA_ALAFDAL_SERVER_OK"));
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const connectedUserSocketsV137O = new Map();

const dataDir = path.join(__dirname, "..", "data");
const dbFile = path.join(dataDir, "db.json");

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(
      dbFile,
      JSON.stringify({ users: [], matches: [] }, null, 2)
    );
  }
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.matches)) db.matches = [];
  if (!db.devices || typeof db.devices !== "object") db.devices = {};
  if (!Array.isArray(db.referrals)) db.referrals = [];
  if (!Array.isArray(db.friendRequests)) db.friendRequests = [];
  if (!Array.isArray(db.privateChats)) db.privateChats = [];
  if (!Array.isArray(db.friendBlocks)) db.friendBlocks = [];
  return db;
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function makeId(prefix = "id") {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}


// V138FR_FRIEND_REQUESTS_ACCEPT_REJECT_SAFE
function publicFriendRequestV138FR(db, request, viewerId) {
  const from = db.users.find((u) => u.id === request.fromUserId);
  const to = db.users.find((u) => u.id === request.toUserId);
  return {
    id: request.id,
    fromUserId: request.fromUserId,
    toUserId: request.toUserId,
    status: request.status || "pending",
    createdAt: request.createdAt || "",
    respondedAt: request.respondedAt || "",
    direction: String(request.fromUserId) === String(viewerId) ? "outgoing" : "incoming",
    from: from ? publicUser(from) : null,
    to: to ? publicUser(to) : null
  };
}

// V138_FRIENDS_BLOCK_UNFRIEND_SAFE
function isFriendBlockedV138FB(db, a, b) {
  const blocks = Array.isArray(db.friendBlocks) ? db.friendBlocks : [];
  return blocks.some((x) =>
    (String(x.blockerUserId) === String(a) && String(x.blockedUserId) === String(b)) ||
    (String(x.blockerUserId) === String(b) && String(x.blockedUserId) === String(a))
  );
}

function removeFriendBothWaysV138FB(a, b) {
  a.friends = Array.isArray(a.friends) ? a.friends : [];
  b.friends = Array.isArray(b.friends) ? b.friends : [];
  a.friends = a.friends.filter((id) => String(id) !== String(b.id));
  b.friends = b.friends.filter((id) => String(id) !== String(a.id));
}

// V138_PRIVATE_FRIEND_CHAT_SAFE
function areFriendsV138PC(a, b) {
  const af = Array.isArray(a?.friends) ? a.friends : [];
  const bf = Array.isArray(b?.friends) ? b.friends : [];
  return af.includes(b.id) || bf.includes(a.id);
}

function chatKeyV138PC(a, b) {
  return [String(a), String(b)].sort().join("__");
}

function getOrCreatePrivateChatV138PC(db, a, b) {
  db.privateChats = Array.isArray(db.privateChats) ? db.privateChats : [];
  const key = chatKeyV138PC(a, b);
  let chat = db.privateChats.find((c) => c.key === key);
  if (!chat) {
    chat = { id: makeId("chat"), key, userIds: [String(a), String(b)], messages: [], clearedAtBy: {}, createdAt: new Date().toISOString() };
    db.privateChats.push(chat);
  }
  chat.messages = Array.isArray(chat.messages) ? chat.messages : [];
  chat.clearedAtBy = chat.clearedAtBy && typeof chat.clearedAtBy === "object" ? chat.clearedAtBy : {};
  return chat;
}

function publicPrivateMessagesV138PC(chat, viewerId) {
  const clearedAt = chat.clearedAtBy?.[String(viewerId)] || "";
  const clearedTime = clearedAt ? Date.parse(clearedAt) || 0 : 0;
  return (chat.messages || []).filter((m) => {
    const t = Date.parse(m.createdAt || "") || 0;
    return t >= clearedTime;
  }).map((m) => ({
    id: m.id,
    fromUserId: m.fromUserId,
    toUserId: m.toUserId,
    text: m.text,
    createdAt: m.createdAt
  }));
}

function addFriendBothWaysV138FR(me, target) {
  me.friends = Array.isArray(me.friends) ? me.friends : [];
  target.friends = Array.isArray(target.friends) ? target.friends : [];
  if (!me.friends.includes(target.id)) me.friends.push(target.id);
  if (!target.friends.includes(me.id)) target.friends.push(me.id);
}

function emitFriendRequestsUpdateV138FR(db, ...userIds) {
  for (const rawId of userIds) {
    const userId = String(rawId || "");
    if (!userId) continue;

    const user = (db.users || []).find((u) => String(u.id) === userId);
    const friendIds = Array.isArray(user?.friends) ? user.friends : [];
    const friends = friendIds
      .map((id) => (db.users || []).find((u) => u.id === id))
      .filter(Boolean)
      .map(publicUser);

    const requests = (db.friendRequests || [])
      .filter((r) => r.status === "pending" && (r.fromUserId === userId || r.toUserId === userId))
      .map((r) => publicFriendRequestV138FR(db, r, userId));

    const socketId = connectedUserSocketsV137O.get(userId);
    if (!socketId) continue;

    // V138_AUTO_REFRESH_FRIENDS_AFTER_ACCEPT_SAFE: يحدث صندوق الأصدقاء تلقائيًا بعد القبول/الإضافة.
    io.to(socketId).emit("friends:requests", { requests, friends });
    io.to(socketId).emit("friends:updated", { requests, friends });
  }
}

function handleFriendRequestV138FR(req, res) {
  const username = String(req.body.username || req.body.email || "").trim();
  const userId = String(req.body.userId || "").trim();
  if (!userId && username.length < 3) return res.status(400).json({ error: "USERNAME_TOO_SHORT" });

  const db = readDb();
  db.friendRequests = Array.isArray(db.friendRequests) ? db.friendRequests : [];

  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const q = username.toLowerCase();
  const target = db.users.find((u) =>
    (userId && u.id === userId) ||
    (!!q && (String(u.username || "").toLowerCase() === q || String(u.email || "").toLowerCase() === q))
  );

  if (!target) return res.status(404).json({ error: "FRIEND_NOT_FOUND" });
  if (target.id === me.id) return res.status(400).json({ error: "CANNOT_ADD_SELF" });
  if (isFriendBlockedV138FB(db, me.id, target.id)) {
    return res.status(403).json({ error: "FRIEND_BLOCKED" });
  }

  me.friends = Array.isArray(me.friends) ? me.friends : [];
  target.friends = Array.isArray(target.friends) ? target.friends : [];

  if (me.friends.includes(target.id) || target.friends.includes(me.id)) {
    addFriendBothWaysV138FR(me, target);
    writeDb(db);
    return res.json({ ok: true, status: "already_friends", friend: publicUser(target), user: publicUser(me) });
  }

  const reverse = db.friendRequests.find((r) => r.status === "pending" && r.fromUserId === target.id && r.toUserId === me.id);
  if (reverse) {
    reverse.status = "accepted";
    reverse.respondedAt = new Date().toISOString();
    addFriendBothWaysV138FR(me, target);
    writeDb(db);
    emitFriendRequestsUpdateV138FR(db, me.id, target.id);
    emitUserUpdateV136IK(me.id);
    emitUserUpdateV136IK(target.id);
    return res.json({ ok: true, status: "accepted_reverse", friend: publicUser(target), user: publicUser(me) });
  }

  let request = db.friendRequests.find((r) => r.status === "pending" && r.fromUserId === me.id && r.toUserId === target.id);
  if (!request) {
    request = { id: makeId("fr"), fromUserId: me.id, toUserId: target.id, status: "pending", createdAt: new Date().toISOString() };
    db.friendRequests.push(request);
  }

  writeDb(db);
  emitFriendRequestsUpdateV138FR(db, me.id, target.id);
  return res.json({ ok: true, status: "pending", request: publicFriendRequestV138FR(db, request, me.id), friend: publicUser(target) });
}


function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    points: user.points || 0,
    coins: user.coins || 0,
    wins: user.wins || 0,
    losses: user.losses || 0,
    level: user.level || 1,
    email: user.email || "",
    inviteCode: user.inviteCode || "",
    friendsCount: Array.isArray(user.friends) ? user.friends.length : 0,
    avatarUri: user.avatarUri || "",
    countryCode: user.countryCode || "YE"
  };
}

function getUserMeta(userId) {
  if (!userId || String(userId).startsWith("bot_")) return { username: "Bot", avatarUri: "", countryCode: "YE" };
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  return { username: user?.username || "لاعب", avatarUri: user?.avatarUri || "", countryCode: user?.countryCode || "YE" };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "أنا الأفضل | Ana Alafdal",
    status: "server_running",
    v137e: "profile_email_friends_avatar_sync_safe",
    games: ["domino", "chess", "carrom_beta", "billiards_beta"]
  });
});

app.post("/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const email = String(req.body.email || "").trim().toLowerCase();
  const deviceId = normalizeDeviceIdV138G(req.body.deviceId);
  const inviteCodeV138J = normalizeInviteCodeV138J(req.body.inviteCode);

  if (username.length < 3) {
    return res.status(400).json({ error: "USERNAME_TOO_SHORT" });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
  }


  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "EMAIL_INVALID" });
  }

  if (!deviceId) {
    return res.status(400).json({ error: "DEVICE_ID_REQUIRED" });
  }

  const db = readDb();
  db.devices = db.devices || {};
  const deviceRecord = db.devices[deviceId] || { userIds: [], createdAt: new Date().toISOString() };
  const activeDeviceUsers = (deviceRecord.userIds || []).filter((id) => db.users.some((u) => u.id === id));
  // V138_EMAIL_OPTIONAL_TEST: حد الجهاز معطل مؤقتًا للفحص فقط
  if (activeDeviceUsers.length >= MAX_ACCOUNTS_PER_DEVICE_V138G) {
    return res.status(429).json({ error: "DEVICE_ACCOUNT_LIMIT" });
  }
  const exists = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() || (!!email && String(u.email || "").toLowerCase() === email)
  );

  if (exists) {
    return res.status(409).json({ error: String(exists.username || "").toLowerCase() === username.toLowerCase() ? "USERNAME_EXISTS" : "EMAIL_EXISTS" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: makeId("user"),
    username,
    email,
    passwordHash,
    deviceId,
    inviteCode: "",
    referredBy: "",
    referredByCode: inviteCodeV138J || "",
    points: 0,
    coins: 10000,
    wins: 0,
    losses: 0,
    level: 1,
    avatarUri: "",
    countryCode: "YE",
    friends: [],
    createdAt: new Date().toISOString()
  };

  ensureInviteCodeV138J(db, user);
  applyReferralOnRegisterV138J(db, user, inviteCodeV138J, deviceId);

  deviceRecord.userIds = [...new Set([...(deviceRecord.userIds || []), user.id])];
  deviceRecord.lastRegisterAt = new Date().toISOString();
  db.devices[deviceId] = deviceRecord;
  db.users.push(user);
  writeDb(db);

  res.json({
    token: signToken(user),
    user: publicUser(user)
  });
});

app.post("/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const deviceId = normalizeDeviceIdV138G(req.body.deviceId);

  const db = readDb();
  const loginKey = username.toLowerCase();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === loginKey || String(u.email || "").toLowerCase() === loginKey
  );

  if (!user) return res.status(401).json({ error: "INVALID_LOGIN" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "INVALID_LOGIN" });

  if (deviceId) {
    db.devices = db.devices || {};
    const deviceRecord = db.devices[deviceId] || { userIds: [], createdAt: new Date().toISOString() };
    deviceRecord.userIds = [...new Set([...(deviceRecord.userIds || []), user.id])];
    deviceRecord.lastLoginAt = new Date().toISOString();
    db.devices[deviceId] = deviceRecord;
    user.lastLoginDeviceId = deviceId;
    user.lastLoginAt = new Date().toISOString();
    writeDb(db);
  }

  res.json({
    token: signToken(user),
    user: publicUser(user)
  });
});

// V138J_REAL_INVITE_ALL_GAMES_DEEPLINK_READY_SAFE
app.post("/invite/link", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const code = ensureInviteCodeV138J(db, user);
  const game = String(req.body.game || "").trim().slice(0, 30);
  const roomId = String(req.body.roomId || "").trim().slice(0, 80);
  const inviteLink = buildInviteLinkV138J({ code, game, roomId });
  user.lastInviteAt = new Date().toISOString();
  writeDb(db);

  const gameName = game === "chess" ? "الشطرنج" : game === "carrom" ? "الكيرم" : game === "billiards" ? "البلياردو" : game === "domino" ? "الدومينو" : "أنا الأفضل";
  const message = [
    "تعال العب معي في أنا الأفضل 🎮👑",
    `اللعبة: ${gameName}`,
    `كود دعوتي: ${code}`,
    roomId ? `كود الغرفة: ${roomId}` : "",
    "",
    "إذا التطبيق عندك اضغط الرابط وادخل نفس اللعبة/الغرفة.",
    "إذا ما عندك التطبيق حمّله من Google Play:",
    inviteLink
  ].filter(Boolean).join("\n");

  res.json({
    ok: true,
    inviteCode: code,
    inviteLink,
    playStoreUrl: PLAY_STORE_URL_V138J,
    game,
    roomId,
    message
  });
});

app.get("/invite/resolve", (req, res) => {
  const code = normalizeInviteCodeV138J(req.query.code);
  const game = String(req.query.game || "").trim().slice(0, 30);
  const roomId = String(req.query.room || req.query.roomId || "").trim().slice(0, 80);
  const db = readDb();
  const referrer = db.users.find((u) => normalizeInviteCodeV138J(u.inviteCode) === code);
  res.json({
    ok: true,
    code,
    game,
    roomId,
    playStoreUrl: PLAY_STORE_URL_V138J,
    referrer: referrer ? { id: referrer.id, username: referrer.username } : null
  });
});

app.get("/me", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  res.json({ user: publicUser(user) });
});

// V138_REAL_SERVER_ECONOMY_REWARDS_SAFE
// كل مكافآت الكوينز من السيرفر الحقيقي: يومية + إعلان مكافأة.
function todayKeyV138REAL() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAILY_REWARD_COINS_V138REAL = 1000;
const REWARDED_AD_COINS_V138REAL = 1500;
const REWARDED_AD_DAILY_LIMIT_V138REAL = 50;
const REWARDED_AD_COOLDOWN_MS_V138REAL = 5 * 60 * 1000;

app.post("/economy/claim-daily", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  user.economy = user.economy || {};
  const today = todayKeyV138REAL();

  if (user.economy.dailyRewardDate === today) {
    return res.status(409).json({
      error: "DAILY_ALREADY_CLAIMED",
      message: "استلمت مكافأة اليوم بالفعل.",
      user: publicUser(user),
      economy: user.economy
    });
  }

  user.economy.dailyRewardDate = today;
  user.coins = Number(user.coins || 0) + DAILY_REWARD_COINS_V138REAL;

  user.economy.lastDailyRewardAt = new Date().toISOString();
  writeDb(db);
  emitUserUpdateV136IK(user.id);

  res.json({
    ok: true,
    type: "daily",
    addedCoins: DAILY_REWARD_COINS_V138REAL,
    user: publicUser(user),
    economy: user.economy
  });
});

app.post("/economy/claim-rewarded-ad", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  user.economy = user.economy || {};
  const today = todayKeyV138REAL();
  const now = Date.now();

  if (user.economy.rewardAdDate !== today) {
    user.economy.rewardAdDate = today;
    user.economy.rewardAdCount = 0;
    user.economy.rewardAdLastAt = 0;
  }

  const count = Math.max(0, Number(user.economy.rewardAdCount || 0));
  if (count >= REWARDED_AD_DAILY_LIMIT_V138REAL) {
    return res.status(429).json({
      error: "REWARDED_DAILY_LIMIT",
      message: `وصلت للحد اليومي ${REWARDED_AD_DAILY_LIMIT_V138REAL} إعلانات.`,
      user: publicUser(user),
      economy: user.economy
    });
  }

  const lastAt = Math.max(0, Number(user.economy.rewardAdLastAt || 0));
  if (lastAt && now - lastAt < REWARDED_AD_COOLDOWN_MS_V138REAL) {
    const waitMs = REWARDED_AD_COOLDOWN_MS_V138REAL - (now - lastAt);
    return res.status(429).json({
      error: "REWARDED_COOLDOWN",
      message: `انتظر ${Math.ceil(waitMs / 60000)} دقيقة قبل مكافأة إعلان جديدة.`,
      waitMs,
      user: publicUser(user),
      economy: user.economy
    });
  }

  user.economy.rewardAdDate = today;
  user.economy.rewardAdCount = count + 1;
  user.economy.rewardAdLastAt = now;
  user.economy.rewardAdLastIso = new Date(now).toISOString();
  user.coins = Number(user.coins || 0) + REWARDED_AD_COINS_V138REAL;

  writeDb(db);
  emitUserUpdateV136IK(user.id);

  res.json({
    ok: true,
    type: "rewarded_ad",
    addedCoins: REWARDED_AD_COINS_V138REAL,
    rewardAdCount: user.economy.rewardAdCount,
    dailyLimit: REWARDED_AD_DAILY_LIMIT_V138REAL,
    cooldownMs: REWARDED_AD_COOLDOWN_MS_V138REAL,
    user: publicUser(user),
    economy: user.economy
  });
});


app.patch("/me/profile", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const rawAvatarUri = String(req.body.avatarUri || "");
  const avatarUri = rawAvatarUri.slice(0, 350000);
  const countryCode = String(req.body.countryCode || "YE").trim().toUpperCase().slice(0, 2) || "YE";
  const email = String(req.body.email || user.email || "").trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "EMAIL_INVALID" });
  }
  if (email) {
    const emailOwner = db.users.find((u) => u.id !== user.id && String(u.email || "").toLowerCase() === email);
    if (emailOwner) return res.status(409).json({ error: "EMAIL_EXISTS" });
    user.email = email;
  }

  user.avatarUri = avatarUri;
  user.countryCode = /^[A-Z]{2}$/.test(countryCode) ? countryCode : "YE";
  writeDb(db);

  // حدث اللاعبين الموجودين في الغرف حتى تظهر الصورة/العلم فورًا
  for (const room of rooms.values()) {
    for (const p of room.players) {
      if (p.id === user.id) {
        p.avatarUri = user.avatarUri;
        p.countryCode = user.countryCode;
      }
    }
    emitRoom(room);
  }

  res.json({ user: publicUser(user) });
});


// V137E_PROFILE_EMAIL_FRIENDS_AVATAR_SYNC_SAFE
app.get("/me/profile-full", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  const friendIds = Array.isArray(user.friends) ? user.friends : [];
  const friends = friendIds
    .map((id) => db.users.find((u) => u.id === id))
    .filter(Boolean)
    .map(publicUser);
  res.json({ user: publicUser(user), friends });
});

app.get("/users/:id/profile", requireAuth, (req, res) => {
  const targetId = String(req.params.id || "");
  if (!targetId || targetId.startsWith("bot_")) {
    return res.status(404).json({ error: "USER_NOT_FOUND" });
  }
  const db = readDb();
  const target = db.users.find((u) => u.id === targetId);
  if (!target) return res.status(404).json({ error: "USER_NOT_FOUND" });
  // لا نكشف الإيميل هنا: هذا ملف عام للخصم داخل اللعبة.
  res.json({
    user: {
      id: target.id,
      username: target.username,
      points: target.points || 0,
      coins: target.coins || 0,
      wins: target.wins || 0,
      losses: target.losses || 0,
      level: target.level || 1,
      friendsCount: Array.isArray(target.friends) ? target.friends.length : 0,
      avatarUri: target.avatarUri || "",
      countryCode: target.countryCode || "YE"
    }
  });
});

app.get("/friends", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const friendIds = Array.isArray(user.friends) ? user.friends : [];
  const friends = friendIds
    .map((id) => db.users.find((u) => u.id === id))
    .filter(Boolean)
    .map(publicUser);

  const requests = (db.friendRequests || [])
    .filter((r) => r.status === "pending" && (r.fromUserId === user.id || r.toUserId === user.id))
    .map((r) => publicFriendRequestV138FR(db, r, user.id));

  res.json({ friends, requests });
});

app.post("/friends/request", requireAuth, handleFriendRequestV138FR);

// توافق مع الزر القديم: صار يرسل طلب صداقة بدل إضافة مباشرة
app.post("/friends/add", requireAuth, handleFriendRequestV138FR);

app.post("/friends/respond", requireAuth, (req, res) => {
  const requestId = String(req.body.requestId || req.body.id || "").trim();
  const action = String(req.body.action || "").trim().toLowerCase();

  if (!requestId || !["accept", "reject", "decline"].includes(action)) {
    return res.status(400).json({ error: "BAD_REQUEST" });
  }

  const db = readDb();
  db.friendRequests = Array.isArray(db.friendRequests) ? db.friendRequests : [];

  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const request = db.friendRequests.find((r) => r.id === requestId && r.toUserId === me.id && r.status === "pending");
  if (!request) return res.status(404).json({ error: "REQUEST_NOT_FOUND" });

  const sender = db.users.find((u) => u.id === request.fromUserId);
  if (!sender) return res.status(404).json({ error: "SENDER_NOT_FOUND" });

  request.respondedAt = new Date().toISOString();

  if (action === "accept") {
    request.status = "accepted";
    addFriendBothWaysV138FR(me, sender);
  } else {
    request.status = "rejected";
  }

  writeDb(db);
  emitFriendRequestsUpdateV138FR(db, me.id, sender.id);

  if (action === "accept") {
    emitUserUpdateV136IK(me.id);
    emitUserUpdateV136IK(sender.id);
  }

  res.json({ ok: true, status: request.status, friend: action === "accept" ? publicUser(sender) : null });
});

app.get("/friends/chat/:friendId", requireAuth, (req, res) => {
  const friendId = String(req.params.friendId || "").trim();
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  const friend = db.users.find((u) => u.id === friendId);
  if (!me || !friend) return res.status(404).json({ error: "USER_NOT_FOUND" });
  if (isFriendBlockedV138FB(db, me.id, friend.id)) return res.status(403).json({ error: "FRIEND_BLOCKED" });
  if (!areFriendsV138PC(me, friend)) return res.status(403).json({ error: "NOT_FRIENDS" });

  const chat = getOrCreatePrivateChatV138PC(db, me.id, friend.id);
  writeDb(db);
  res.json({ ok: true, friend: publicUser(friend), messages: publicPrivateMessagesV138PC(chat, me.id) });
});

app.post("/friends/chat/:friendId", requireAuth, (req, res) => {
  const friendId = String(req.params.friendId || "").trim();
  const text = String(req.body.text || "").trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: "EMPTY_MESSAGE" });

  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  const friend = db.users.find((u) => u.id === friendId);
  if (!me || !friend) return res.status(404).json({ error: "USER_NOT_FOUND" });
  if (isFriendBlockedV138FB(db, me.id, friend.id)) return res.status(403).json({ error: "FRIEND_BLOCKED" });
  if (!areFriendsV138PC(me, friend)) return res.status(403).json({ error: "NOT_FRIENDS" });

  const chat = getOrCreatePrivateChatV138PC(db, me.id, friend.id);
  const msg = {
    id: makeId("msg"),
    fromUserId: me.id,
    toUserId: friend.id,
    text,
    createdAt: new Date().toISOString()
  };
  chat.messages.push(msg);
  if (chat.messages.length > 300) chat.messages = chat.messages.slice(-300);

  writeDb(db);
  res.json({ ok: true, message: msg, messages: publicPrivateMessagesV138PC(chat, me.id) });
});

app.delete("/friends/chat/:friendId", requireAuth, (req, res) => {
  const friendId = String(req.params.friendId || "").trim();
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  const friend = db.users.find((u) => u.id === friendId);
  if (!me || !friend) return res.status(404).json({ error: "USER_NOT_FOUND" });
  if (!areFriendsV138PC(me, friend)) return res.status(403).json({ error: "NOT_FRIENDS" });

  const chat = getOrCreatePrivateChatV138PC(db, me.id, friend.id);
  chat.clearedAtBy[String(me.id)] = new Date().toISOString();

  writeDb(db);
  res.json({ ok: true, cleared: true, messages: [] });
});

app.post("/friends/remove", requireAuth, (req, res) => {
  const friendId = String(req.body.friendId || req.body.userId || "").trim();
  if (!friendId) return res.status(400).json({ error: "BAD_FRIEND_ID" });

  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  const friend = db.users.find((u) => u.id === friendId);
  if (!me || !friend) return res.status(404).json({ error: "USER_NOT_FOUND" });

  removeFriendBothWaysV138FB(me, friend);
  writeDb(db);
  emitFriendRequestsUpdateV138FR(db, me.id, friend.id);
  emitUserUpdateV136IK(me.id);
  emitUserUpdateV136IK(friend.id);

  res.json({ ok: true, removed: true });
});

app.post("/friends/block", requireAuth, (req, res) => {
  const targetUserId = String(req.body.targetUserId || req.body.friendId || req.body.userId || "").trim();
  if (!targetUserId) return res.status(400).json({ error: "BAD_TARGET_ID" });

  const db = readDb();
  db.friendBlocks = Array.isArray(db.friendBlocks) ? db.friendBlocks : [];

  const me = db.users.find((u) => u.id === req.user.id);
  const target = db.users.find((u) => u.id === targetUserId);
  if (!me || !target) return res.status(404).json({ error: "USER_NOT_FOUND" });
  if (me.id === target.id) return res.status(400).json({ error: "CANNOT_BLOCK_SELF" });

  removeFriendBothWaysV138FB(me, target);

  db.friendRequests = (db.friendRequests || []).filter((r) =>
    !(
      r.status === "pending" &&
      (
        (String(r.fromUserId) === String(me.id) && String(r.toUserId) === String(target.id)) ||
        (String(r.fromUserId) === String(target.id) && String(r.toUserId) === String(me.id))
      )
    )
  );

  const exists = db.friendBlocks.some((b) => String(b.blockerUserId) === String(me.id) && String(b.blockedUserId) === String(target.id));
  if (!exists) {
    db.friendBlocks.push({
      id: makeId("block"),
      blockerUserId: me.id,
      blockedUserId: target.id,
      createdAt: new Date().toISOString()
    });
  }

  writeDb(db);
  emitFriendRequestsUpdateV138FR(db, me.id, target.id);
  emitUserUpdateV136IK(me.id);
  emitUserUpdateV136IK(target.id);

  res.json({ ok: true, blocked: true });
});


// V138_GOOGLE_PLAY_UGC_REPORT_SAFE:
// إبلاغ داخل التطبيق عن مستخدم/رسالة لدعم سياسة Google Play للمحتوى الذي ينشئه المستخدمون.
app.post("/friends/report", requireAuth, (req, res) => {
  const targetUserId = String(req.body.targetUserId || req.body.friendId || req.body.userId || "").trim();
  const reason = String(req.body.reason || "friend_or_chat_report").slice(0, 300);
  const context = String(req.body.context || "friends").slice(0, 80);

  if (!targetUserId) return res.status(400).json({ error: "BAD_TARGET_ID" });

  const db = readDb();
  db.userReports = Array.isArray(db.userReports) ? db.userReports : [];

  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  const target = db.users.find((u) => String(u.id) === String(targetUserId));
  if (!me || !target) return res.status(404).json({ error: "USER_NOT_FOUND" });
  if (String(me.id) === String(target.id)) return res.status(400).json({ error: "CANNOT_REPORT_SELF" });

  db.userReports.push({
    id: makeId("report"),
    reporterUserId: me.id,
    targetUserId: target.id,
    reason,
    context,
    status: "open",
    createdAt: new Date().toISOString()
  });

  writeDb(db);
  res.json({ ok: true, reported: true });
});

app.post("/friends/unblock", requireAuth, (req, res) => {
  const targetUserId = String(req.body.targetUserId || req.body.friendId || req.body.userId || "").trim();
  if (!targetUserId) return res.status(400).json({ error: "BAD_TARGET_ID" });

  const db = readDb();
  db.friendBlocks = Array.isArray(db.friendBlocks) ? db.friendBlocks : [];

  const before = db.friendBlocks.length;
  db.friendBlocks = db.friendBlocks.filter((b) =>
    !(String(b.blockerUserId) === String(req.user.id) && String(b.blockedUserId) === String(targetUserId))
  );

  writeDb(db);
  emitFriendRequestsUpdateV138FR(db, req.user.id, targetUserId);

  res.json({ ok: true, unblocked: before !== db.friendBlocks.length });
});

app.get("/leaderboard", (req, res) => {
  const db = readDb();
  const leaderboard = db.users
    .map(publicUser)
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .slice(0, 50);

  res.json({ leaderboard });
});

const rooms = new Map();


// V127_HUMAN_LIKE_SMART_BOTS_SOCIAL_AI
// بوتات اجتماعية: واضحة كبوتات، ترحب وتعلّق بشكل خفيف بدون إزعاج أو ادعاء أنها بشر.
const BOT_CHAT_MIN_INTERVAL_MS = 30000;
const BOT_CHAT_TURN_INTERVAL = 3;
const BOT_PERSONALITIES = [
  { name: "Bot فارس", mood: "calm", countryCode: "YE" },
  { name: "Bot نجم", mood: "smart", countryCode: "YE" },
  { name: "Bot ورد", mood: "friendly", countryCode: "YE" },
  { name: "Bot صقر", mood: "bold", countryCode: "YE" },
  { name: "Bot ريان", mood: "balanced", countryCode: "YE" },
  { name: "Bot لطيف", mood: "friendly", countryCode: "YE" }
];

const BOT_MESSAGES = {
  welcome2: [
    "السلام عليكم 👋 جاهز نلعب؟ 😊",
    "حياك الله 🌹 بالتوفيق يا بطل 💪",
    "كيفك؟ خلينا نلعبها بروح حلوة 😄",
    "أهلًا وسهلًا 👋 جولة ممتعة إن شاء الله"
  ],
  welcome4: [
    "السلام عليكم يا شباب 👋 كيفكم؟ 😄",
    "حياكم الله جميعًا 🌹 نلعبها حماس؟ 💪",
    "كيفكم يا أبطال؟ جولة ممتعة للجميع 😊",
    "خلونا نلعب بروح حلوة، أحبكم 🌹"
  ],
  move: [
    "دور جميل 😎",
    "خلينا نشوف من الأفضل 💪",
    "اللعب حلو معك 😊",
    "ركز يا بطل 😄",
    "ما شاء الله، الجولة حماس 🔥"
  ],
  goodHuman: [
    "ضربة جميلة 😎",
    "لعبك قوي والله 💪",
    "ما شاء الله عليك 👏",
    "قريب جدًا 😄"
  ],
  win: [
    "جولة حلوة، شكرًا لكم 🌹",
    "لعب ممتع جدًا 😄",
    "نعيدها؟ 😉",
    "بالتوفيق في القادمة 💪"
  ],
  lose: [
    "مبروك عليك 👏 لعبك قوي",
    "حظ أوفر لي 😄 أنت ممتاز",
    "جولة جميلة 🌹",
    "أحسنت يا بطل 💪"
  ]
};

function isBotPlayer(playerOrId) {
  const id = typeof playerOrId === "string" ? playerOrId : playerOrId?.id;
  return !!id && String(id).startsWith("bot_");
}

function pickBotPersonality(room, botIndex) {
  const index = Math.max(0, (botIndex - 1) % BOT_PERSONALITIES.length);
  const personality = BOT_PERSONALITIES[index];
  const usedNames = new Set((room.players || []).map((p) => p.username));
  let name = personality.name;
  if (usedNames.has(name)) name = `${personality.name} ${botIndex}`;
  return { ...personality, name };
}

function pickRandom(list) {
  if (!Array.isArray(list) || !list.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

function pushBotChat(room, bot, text, reason = "social", force = false) {
  if (!room || !bot || !text) return null;
  if (!room.chat) room.chat = [];
  if (!room.botSocial) room.botSocial = { turnCount: 0, lastAt: 0, recentTexts: [] };

  const now = Date.now();
  const recentTexts = room.botSocial.recentTexts || [];
  if (!force) {
    if (now - (room.botSocial.lastAt || 0) < BOT_CHAT_MIN_INTERVAL_MS) return null;
    if (recentTexts.includes(text)) return null;
  }

  const message = {
    id: makeId("botmsg"),
    userId: bot.id,
    username: bot.username || "Bot",
    text,
    kind: "bot",
    reason,
    at: new Date().toISOString()
  };
  room.chat.push(message);
  room.botSocial.lastAt = now;
  room.botSocial.recentTexts = [text, ...recentTexts].slice(0, 8);

  io.to(room.id).emit("chat:new", message);
  return message;
}

function botWelcome(room) {
  if (!room || !room.players) return;
  const bot = room.players.find((p) => isBotPlayer(p));
  if (!bot) return;
  const list = (room.maxPlayers || 2) >= 4 ? BOT_MESSAGES.welcome4 : BOT_MESSAGES.welcome2;
  pushBotChat(room, bot, pickRandom(list), "welcome", true);
}

function botMaybeComment(room, reason = "move") {
  if (!room || !room.players) return;
  const bot = room.players.find((p) => isBotPlayer(p));
  if (!bot) return;
  if (!room.botSocial) room.botSocial = { turnCount: 0, lastAt: 0, recentTexts: [] };
  room.botSocial.turnCount = (room.botSocial.turnCount || 0) + 1;
  if (room.botSocial.turnCount % BOT_CHAT_TURN_INTERVAL !== 0) return;
  pushBotChat(room, bot, pickRandom(BOT_MESSAGES[reason] || BOT_MESSAGES.move), reason, false);
}

function botFinishComment(room, winnerId) {
  if (!room || !room.players) return;
  const bot = room.players.find((p) => isBotPlayer(p));
  if (!bot) return;
  const list = isBotPlayer(winnerId) ? BOT_MESSAGES.win : BOT_MESSAGES.lose;
  pushBotChat(room, bot, pickRandom(list), "finish", true);
}

function roomList() {
  return Array.from(rooms.values())
    .filter((room) => room.status !== "finished")
    .map((room) => ({
      id: room.id,
      game: room.game,
      status: room.status,
      playersCount: room.players.length,
      players: room.players.map((p) => {
        const dbUser = !String(p.id).startsWith("bot_") ? readDb().users.find((u) => u.id === p.id) : null;
        return {
          id: p.id,
          username: p.username,
          avatarUri: p.avatarUri || dbUser?.avatarUri || "",
          countryCode: p.countryCode || dbUser?.countryCode || "YE"
        };
      }),
      maxPlayers: room.maxPlayers || 2,
      dominoMode: room.dominoMode || "classic",
      matchMode: room.matchMode || "live",
      wager: room.wager ? { amount: room.wager.amount || 0, pot: room.wager.pot || 0, locked: !!room.wager.locked, paidOut: !!room.wager.paidOut } : null,
      humanFirstBotWaitMs: room.humanFirstBotWaitMs || HUMAN_FIRST_BOT_WAIT_MS,
      humanFirstBotEndsAt: room.humanFirstBotEndsAt || null
    }));
}

function publicRoom(room, userId) {
  const base = {
    id: room.id,
    game: room.game,
    status: room.status,
    maxPlayers: room.maxPlayers || 2,
    dominoMode: room.dominoMode || "classic",
    matchMode: room.matchMode || "live",
    wager: room.wager ? {
      amount: room.wager.amount || 0,
      pot: room.wager.pot || 0,
      locked: !!room.wager.locked,
      paidOut: !!room.wager.paidOut,
      winnerAwardText: room.wager.winnerAwardText || null
    } : null,
    playersCount: room.players.length,
    humanFirstBotWaitMs: room.humanFirstBotWaitMs || HUMAN_FIRST_BOT_WAIT_MS,
    humanFirstBotEndsAt: room.humanFirstBotEndsAt || null,
    players: room.players.map((p) => {
      const dbUser = !String(p.id).startsWith("bot_") ? readDb().users.find((u) => u.id === p.id) : null;
      return {
        id: p.id,
        username: dbUser?.username || p.username,
        avatarUri: dbUser?.avatarUri || p.avatarUri || "",
        countryCode: dbUser?.countryCode || p.countryCode || "YE",
        points: dbUser?.points || 0,
        coins: dbUser?.coins || 0,
        wins: dbUser?.wins || 0,
        losses: dbUser?.losses || 0,
        friendsCount: Array.isArray(dbUser?.friends) ? dbUser.friends.length : 0
      };
    }),
    chat: room.chat.slice(-50),
    beta: room.beta,
    winnerId: room.winnerId || null,
    winnerUsername: room.winnerUsername || null,
    draw: !!room.draw,
    finishReason: room.finishReason || null
  };

  if (room.game === "domino") {
    base.domino = {
      board: room.domino.board,
      boardMeta: room.domino.boardMeta || [],
      turn: room.domino.turn,
      turnEndsAt: room.domino.turnEndsAt || null,
      autoMessage: room.domino.autoMessage || null,
      myHand: room.domino.hands[userId] || [],
      handCounts: Object.fromEntries(
        Object.entries(room.domino.hands).map(([id, hand]) => [id, hand.length])
      ),
      stockCount: (room.domino.stock || []).length,
      scores: room.domino.scores || {},
      finishReason: room.domino.finishReason || null,
      roundPointsText: room.domino.roundPointsText || null,
      totalPieces:
        (room.domino.board || []).length +
        (room.domino.stock || []).length +
        Object.values(room.domino.hands || {}).reduce((sum, hand) => sum + hand.length, 0),
      winnerId: room.winnerId || null,
      winnerUsername: room.winnerUsername || null
    };
  }

  if (room.game === "chess") {
    base.chess = {
      fen: room.chess.fen(),
      turn: room.chess.turn(),
      isCheck: room.chess.isCheck(),
      isGameOver: room.chess.isGameOver(),
      turnEndsAt: room.chessTurnEndsAtV138H || null,
      autoMessage: room.chessAutoMessageV138H || null
    };
  }

  return base;
}

function emitRoom(room) {
  for (const player of room.players) {
    io.to(player.socketId).emit("room:update", publicRoom(room, player.id));
  }
  io.emit("rooms:list", roomList());
}

function createDominoTiles() {
  const tiles = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push([a, b]);
    }
  }
  return tiles.sort(() => Math.random() - 0.5);
}

function getDominoTilePoints(tile) {
  if (!Array.isArray(tile)) return 0;
  return Number(tile[0] || 0) + Number(tile[1] || 0);
}

function getDominoHandPoints(room, playerId) {
  const hand = room?.domino?.hands?.[playerId] || [];
  return hand.reduce((sum, tile) => sum + getDominoTilePoints(tile), 0);
}

function getDominoEnds(room) {
  const board = room?.domino?.board || [];
  if (!board.length) return { left: null, right: null };
  return { left: board[0][0], right: board[board.length - 1][1] };
}

function getDominoLegalMoves(room, tile) {
  const board = room?.domino?.board || [];
  if (!Array.isArray(tile) || tile.length !== 2) return [];
  room.domino.autoMessage = null;
  const originalTile = [tile[0], tile[1]];
  if (board.length === 0) return [{ side: "start", orientedTile: originalTile, originalTile, score: getDominoTilePoints(tile) + (tile[0] === tile[1] ? 20 : 0) }];
  const { left, right } = getDominoEnds(room);
  const moves = [];
  if (tile[1] === left) moves.push({ side: "left", orientedTile: [tile[0], tile[1]], originalTile, score: getDominoTilePoints(tile) + (tile[0] === tile[1] ? 8 : 0) });
  if (tile[0] === left) moves.push({ side: "left", orientedTile: [tile[1], tile[0]], originalTile, score: getDominoTilePoints(tile) + (tile[0] === tile[1] ? 8 : 0) });
  if (tile[0] === right) moves.push({ side: "right", orientedTile: [tile[0], tile[1]], originalTile, score: getDominoTilePoints(tile) + (tile[0] === tile[1] ? 8 : 0) });
  if (tile[1] === right) moves.push({ side: "right", orientedTile: [tile[1], tile[0]], originalTile, score: getDominoTilePoints(tile) + (tile[0] === tile[1] ? 8 : 0) });
  return moves;
}

function canPlayDominoTile(room, tile) { return getDominoLegalMoves(room, tile).length > 0; }

function findBestDominoMove(room, userId) {
  const hand = room?.domino?.hands?.[userId] || [];
  let best = null;
  for (const tile of hand) {
    for (const move of getDominoLegalMoves(room, tile)) {
      const remainingPenalty = hand.filter((t) => t !== tile).reduce((sum, t) => sum + getDominoTilePoints(t), 0) * 0.01;
      const score = move.score - remainingPenalty;
      if (!best || score > best.score) best = { tile, side: move.side, orientedTile: move.orientedTile, score };
    }
  }
  return best;
}

function findPlayableDominoTile(room, userId) { const move = findBestDominoMove(room, userId); return move ? move.tile : null; }

function isDominoFourPlayers(room) {
  return !!room && room.game === "domino" && ((room.maxPlayers || 2) >= 4 || (room.players || []).length >= 4);
}

// V136DY_DOMINO4_PARTNERSHIP_TEAMS_SAFE
function isDominoTeamsRoom(room) {
  return !!room && room.game === "domino" && (room.dominoMode === "teams") && isDominoFourPlayers(room);
}

function getDominoSeatIndex(room, userId) {
  return (room.players || []).findIndex((p) => p.id === userId);
}

function getDominoTeamIndex(room, userId) {
  const idx = getDominoSeatIndex(room, userId);
  if (idx < 0) return 0;
  return idx % 2; // 0 = المقاعد 1 و3، 1 = المقاعد 2 و4
}

function getDominoTeamPlayers(room, teamIndex) {
  return (room.players || []).filter((p, index) => index % 2 === teamIndex);
}

function getDominoTeamHandPoints(room, teamIndex) {
  return getDominoTeamPlayers(room, teamIndex).reduce((sum, p) => sum + getDominoHandPoints(room, p.id), 0);
}

function getDominoPartnerId(room, userId) {
  const team = getDominoTeamIndex(room, userId);
  const partner = getDominoTeamPlayers(room, team).find((p) => p.id !== userId);
  return partner ? partner.id : null;
}

function drawDominoUntilPlayable(room, userId) {
  if (!room.domino.stock) room.domino.stock = [];

  // 4 لاعبين: 7 × 4 = 28، لا يوجد سوق سحب. اللاعب يلعب أو يمرر فقط.
  if (isDominoFourPlayers(room)) {
    return {
      drawn: 0,
      hasPlayable: !!findBestDominoMove(room, userId),
      stockCount: 0,
      noDrawMode: true
    };
  }

  const hand = room.domino.hands[userId] || [];
  let drawn = 0;
  while (!findBestDominoMove(room, userId) && room.domino.stock.length > 0) { hand.push(room.domino.stock.shift()); drawn++; }
  return { drawn, hasPlayable: !!findBestDominoMove(room, userId), stockCount: room.domino.stock.length };
}

function changeDominoTurn(room, userId) {
  const players = room.players || [];
  if (!players.length) return;
  const currentIndex = players.findIndex((p) => p.id === userId);
  const next = players[((currentIndex >= 0 ? currentIndex : 0) + 1) % players.length];
  if (next) room.domino.turn = next.id;
}

function chooseDominoStarter(room) {
  let best = null;
  for (const player of room.players || []) {
    const hand = room.domino.hands[player.id] || [];
    for (const tile of hand) {
      const value = tile[0] === tile[1] ? 100 + tile[0] : getDominoTilePoints(tile);
      if (!best || value > best.value) best = { playerId: player.id, value };
    }
  }
  return best ? best.playerId : (room.players[0] && room.players[0].id);
}

function startDomino(room) {
  const tiles = createDominoTiles();
  const previousScores = room.domino && room.domino.scores ? room.domino.scores : {};
  room.domino.board = [];
  room.domino.boardMeta = [];
  room.domino.hands = {};
  room.domino.stock = [];
  room.domino.autoMessage = null;
  // V136IJ_DOMINO_FINISH_DISCONNECT_CLEAN_SAFE:
  // تنظيف سبب/نقاط الجولة السابقة عند بداية جولة دومينو جديدة.
  room.domino.finishReason = null;
  room.domino.roundPointsText = null;
  room.domino.turnStartedAt = null;
  room.domino.turnEndsAt = null;
  room.domino.scores = { ...previousScores };
  room.winnerId = null;
  room.winnerUsername = null;
  room.players.forEach((player) => {
    room.domino.hands[player.id] = tiles.splice(0, 7);
    if (room.domino.scores[player.id] == null) room.domino.scores[player.id] = 0;
  });
  room.domino.turn = chooseDominoStarter(room);
  room.domino.stock = isDominoFourPlayers(room) ? [] : tiles;
  const starter = (room.players || []).find((p) => p.id === room.domino.turn);
  room.domino.autoMessage = isDominoTeamsRoom(room)
    ? `🤝 دومينو 4 شراكة: شريكك اللاعب المقابل · يبدأ ${starter?.username || "الأعلى"}`
    : (isDominoFourPlayers(room)
      ? `🎲 4 لاعبين: تمرير فقط · يبدأ ${starter?.username || "الأعلى"}`
      : `🎲 يبدأ ${starter?.username || "صاحب أعلى بلاطة"}`);
  scheduleDominoTurnTimer(room);
}

function makeDominoBoardMove(originalTile, orientedTile, side, userId) {
  return { tile: orientedTile, originalTile, side, flipped: originalTile[0] !== orientedTile[0] || originalTile[1] !== orientedTile[1], isDouble: orientedTile[0] === orientedTile[1], playedBy: userId, playedAt: new Date().toISOString() };
}

function ensureDominoBoardMeta(room) {
  if (!room.domino.boardMeta) room.domino.boardMeta = [];
  if (room.domino.boardMeta.length === 0 && Array.isArray(room.domino.board)) {
    room.domino.boardMeta = room.domino.board.map((tile, index) => ({ tile, originalTile: tile, side: index === 0 ? "start" : "right", flipped: false, isDouble: Array.isArray(tile) && tile[0] === tile[1], playedBy: null, playedAt: null }));
  }
}

function playDomino(room, userId, tile, requestedSide) {
  if (room.status !== "playing") return { ok: false, error: "GAME_NOT_STARTED" };
  if (room.domino.turn !== userId) return { ok: false, error: "NOT_YOUR_TURN" };
  if (!Array.isArray(tile) || tile.length !== 2) return { ok: false, error: "INVALID_TILE_FORMAT" };
  ensureDominoBoardMeta(room);
  const hand = room.domino.hands[userId] || [];
  const index = hand.findIndex((t) => t[0] === tile[0] && t[1] === tile[1]);
  if (index === -1) return { ok: false, error: "TILE_NOT_IN_HAND" };
  const legalMoves = getDominoLegalMoves(room, tile);
  if (!legalMoves.length) return { ok: false, error: "MOVE_NOT_ALLOWED" };
  let chosen = null;
  if (requestedSide) {
    chosen = legalMoves.find((m) => m.side === requestedSide);
    if (!chosen) return { ok: false, error: "SIDE_NOT_ALLOWED" };
  } else if (legalMoves.length === 1 || room.domino.board.length === 0) chosen = legalMoves[0];
  else return { ok: false, error: "CHOOSE_SIDE" };
  const originalTile = [tile[0], tile[1]];
  const orientedTile = chosen.orientedTile;
  const side = chosen.side;
  if (room.domino.board.length === 0 || side === "start") room.domino.board.push(orientedTile);
  else if (side === "left") room.domino.board.unshift(orientedTile);
  else room.domino.board.push(orientedTile);
  const move = makeDominoBoardMove(originalTile, orientedTile, side, userId);
  if (side === "left") room.domino.boardMeta.unshift(move); else room.domino.boardMeta.push(move);
  hand.splice(index, 1);
  if (hand.length === 0) {
    room.domino.finishReason = "خلصت القطع";
    finishRoom(room, userId);
    return { ok: true };
  }
  changeDominoTurn(room, userId);
  return { ok: true };
}

function getBestDominoBlockedWinner(room) {
  const players = room.players || [];
  if (players.length === 0) return null;

  // V136DY_DOMINO4_PARTNERSHIP_TEAMS_SAFE:
  // في وضع الشراكة، القفل يُحسب بمجموع نقاط كل فريق، والفريق الأقل يفوز.
  if (isDominoTeamsRoom(room)) {
    const team0 = getDominoTeamHandPoints(room, 0);
    const team1 = getDominoTeamHandPoints(room, 1);
    const winningTeam = team0 <= team1 ? 0 : 1;
    const winner = getDominoTeamPlayers(room, winningTeam)[0] || players[0];
    return winner ? winner.id : null;
  }

  let bestPlayer = players[0];
  let bestPoints = getDominoHandPoints(room, bestPlayer.id);

  for (const player of players) {
    const points = getDominoHandPoints(room, player.id);
    if (points < bestPoints) {
      bestPoints = points;
      bestPlayer = player;
    }
  }

  return bestPlayer ? bestPlayer.id : null;
}

function isDominoRoundBlocked(room) {
  if (!room || room.game !== "domino") return false;
  if ((room.domino.stock || []).length > 0) return false;

  return (room.players || []).every((player) => {
    return !findPlayableDominoTile(room, player.id);
  });
}

function skipDominoTurn(room, userId) {
  if (!room || room.game !== "domino") return { ok: false, error: "ROOM_NOT_FOUND" };
  if (room.status !== "playing") return { ok: false, error: "GAME_NOT_STARTED" };
  if (room.domino.turn !== userId) return { ok: false, error: "NOT_YOUR_TURN" };

  room.domino.autoMessage = null;

  // 4 لاعبين: لا يوجد سحب. إذا لا توجد حركة، يتم تمرير الدور فقط.
  if (isDominoFourPlayers(room)) {
    const hasPlayable = !!findBestDominoMove(room, userId);
    if (hasPlayable) {
      room.domino.autoMessage = "عندك حركة · العب بلاطة";
      return { ok: true, drew: 0, skipped: false, hasPlayable: true, noDrawMode: true };
    }

    if (isDominoRoundBlocked(room)) {
      const blockedWinnerId = getBestDominoBlockedWinner(room);
      if (blockedWinnerId) {
        room.domino.finishReason = "الجولة مقفولة: الأقل نقاطًا";
        finishRoom(room, blockedWinnerId);
        return { ok: true, drew: 0, skipped: true, blocked: true, finished: true, noDrawMode: true };
      }
    }

    const current = (room.players || []).find((p) => p.id === userId);
    changeDominoTurn(room, userId);
    room.domino.autoMessage = `تمرير تلقائي: لا توجد حركة`;
    return { ok: true, drew: 0, skipped: true, noDrawMode: true };
  }

  const drawResult = drawDominoUntilPlayable(room, userId);

  // إذا سحب ووجد قطعة مناسبة، يبقى الدور معه ليلعبها.
  if (drawResult.hasPlayable) {
    return { ok: true, drew: drawResult.drawn, skipped: false };
  }

  // إذا السحب انتهى وكل اللاعبين مقفولين، تنتهي الجولة لصاحب أقل نقاط في اليد.
  if (isDominoRoundBlocked(room)) {
    const blockedWinnerId = getBestDominoBlockedWinner(room);
    if (blockedWinnerId) {
      finishRoom(room, blockedWinnerId);
      return { ok: true, drew: drawResult.drawn, skipped: true, blocked: true, finished: true };
    }
  }

  // إذا لا توجد قطعة مناسبة، مرر الدور.
  changeDominoTurn(room, userId);
  return { ok: true, drew: drawResult.drawn, skipped: true };
}

function playBotIfNeeded(room) {
  if (!room || room.game !== "domino" || room.status !== "playing") return false;
  if (!room.domino) return false;

  const current = (room.players || []).find((p) => p.id === room.domino.turn);
  if (!current || !String(current.id).startsWith("bot_")) return false;

  // V136EH_DOMINO4_ALL_PLAYERS_TURN_FRAME_3S_BOTS_SAFE:
  // قبل أن يلعب البوت نرسل حالة الغرفة وهو صاحب الدور، ثم ننتظر 3 ثواني.
  // هذا يجعل الإطار الذهبي ينتقل فعليًا فوق صورة البوت قبل لعبته.
  const boardLen = Array.isArray(room.domino.board) ? room.domino.board.length : 0;
  const handLen = Array.isArray(room.domino.hands?.[current.id]) ? room.domino.hands[current.id].length : 0;
  const visualKey = `${room.id}:${current.id}:${boardLen}:${handLen}`;
  if (room.domino.pendingBotVisualTurnKey === visualKey) return true;
  room.domino.pendingBotVisualTurnKey = visualKey;

  emitRoom(room);

  setTimeout(() => {
    const live = rooms.get(room.id);
    if (!live || live.game !== "domino" || live.status !== "playing" || !live.domino) return;

    const liveCurrent = (live.players || []).find((p) => p.id === live.domino.turn);
    if (!liveCurrent || !String(liveCurrent.id).startsWith("bot_")) {
      if (live.domino) live.domino.pendingBotVisualTurnKey = null;
      return;
    }

    // 4 لاعبين: البوت لا يسحب، يلعب أو يمرر فقط.
    if (!isDominoFourPlayers(live)) drawDominoUntilPlayable(live, liveCurrent.id);

    const bestMove = findBestDominoMove(live, liveCurrent.id);
    if (bestMove) {
      playDomino(live, liveCurrent.id, bestMove.tile, bestMove.side);
      botMaybeComment(live, "move");
    } else if (isDominoRoundBlocked(live)) {
      const blockedWinnerId = getBestDominoBlockedWinner(live);
      if (blockedWinnerId) {
        live.domino.finishReason = "الجولة مقفولة: الأقل نقاطًا";
        finishRoom(live, blockedWinnerId);
      }
    } else {
      live.domino.autoMessage = `تمرير تلقائي: لا توجد حركة`;
      changeDominoTurn(live, liveCurrent.id);
    }

    live.domino.pendingBotVisualTurnKey = null;
    scheduleDominoTurnTimer(live);
    emitRoom(live);

    const next = (live.players || []).find((p) => p.id === live.domino?.turn);
    if (live.status === "playing" && next && String(next.id).startsWith("bot_")) {
      playBotIfNeeded(live);
    }
  }, BOT_TURN_VISUAL_DELAY_MS);

  return true;
}


const DOMINO_TURN_MS = 10000;
// V136EH_DOMINO4_ALL_PLAYERS_TURN_FRAME_3S_BOTS_SAFE:
// كل بوت ينتظر 3 ثواني قبل اللعب حتى يظهر الإطار الذهبي على صاحب الدور ويشعر اللاعب أنه يلعب مع بشر.
const BOT_TURN_VISUAL_DELAY_MS = 3000;
const HUMAN_FIRST_BOT_WAIT_MS = 40000;
const dominoTurnTimers = new Map();
const chessTurnTimersV138H = new Map();
const betaTurnTimersV138H = new Map();
const humanFirstBotTimers = new Map();
const UNIVERSAL_TURN_MS_V138H = 10000;

function clearHumanFirstBotTimer(roomId) {
  const timer = humanFirstBotTimers.get(roomId);
  if (timer) clearTimeout(timer);
  humanFirstBotTimers.delete(roomId);
}

function getHumanFirstBotRemainingMs(room) {
  if (!room || room.status !== "waiting") return 0;
  if ((room.players || []).length >= (room.maxPlayers || 2)) return 0;
  const endsAt = room.humanFirstBotEndsAt ? new Date(room.humanFirstBotEndsAt).getTime() : 0;
  if (!endsAt || Number.isNaN(endsAt)) return HUMAN_FIRST_BOT_WAIT_MS;
  return Math.max(0, endsAt - Date.now());
}

function createBotForRoom(room) {
  const maxPlayers = room.maxPlayers || 2;
  let botIndex = 1;
  while ((room.players || []).some((p) => p.id === `bot_${room.id}_${botIndex}`)) botIndex++;
  const personality = pickBotPersonality(room, botIndex);
  return {
    id: `bot_${room.id}_${botIndex}`,
    username: personality.name,
    botMood: personality.mood,
    avatarUri: "",
    countryCode: personality.countryCode || "YE",
    socketId: `bot_socket_${room.id}_${botIndex}`,
    isBot: true
  };
}


function emitUserUpdateV136IK(userId) {
  if (!userId || isBotIdV136IK(userId)) return;
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  for (const room of rooms.values()) {
    const player = (room.players || []).find((p) => p.id === userId);
    if (player && player.socketId) io.to(player.socketId).emit("user:update", publicUser(user));
  }
}

function collectRoomWagerV136IK(room) {
  if (!room || !room.wager || !(room.wager.amount > 0)) return true;
  if (room.wager.locked) return true;

  const amount = normalizeWagerV136IK(room.wager.amount);
  const realPlayers = (room.players || []).filter((p) => !isBotIdV136IK(p.id));
  const db = readDb();

  for (const player of realPlayers) {
    const user = db.users.find((u) => u.id === player.id);
    const coins = Number(user?.coins || 0);
    if (!user || coins < amount) {
      if (player.socketId) io.to(player.socketId).emit("error:message", `رصيدك لا يكفي للرهان ${amount} كوينز`);
      room.wager.lastError = "INSUFFICIENT_COINS";
      return false;
    }
  }

  room.wager.amount = amount;
  room.wager.paid = room.wager.paid || {};
  for (const player of realPlayers) {
    const user = db.users.find((u) => u.id === player.id);
    user.coins = Math.max(0, Number(user.coins || 0) - amount);
    room.wager.paid[player.id] = amount;
  }

  // البوت يساهم افتراضيًا في قيمة الجائزة حتى تكون مباراة البوت مفيدة، لكن لا يُخصم من قاعدة البيانات.
  room.wager.pot = amount * Math.max(1, (room.players || []).length);
  room.wager.locked = true;
  room.wager.collectedAt = new Date().toISOString();
  writeDb(db);
  for (const player of realPlayers) emitUserUpdateV136IK(player.id);
  return true;
}

function awardRoomWagerV136IK(room, winnerId, db) {
  if (!room || !room.wager || !room.wager.locked || room.wager.paidOut) return;
  const pot = Math.max(0, Math.floor(Number(room.wager.pot || 0)));
  if (pot <= 0) return;

  let receivers = [];
  if (room.game === "domino" && isDominoTeamsRoom(room)) {
    const team = getDominoTeamIndex(room, winnerId);
    receivers = getDominoTeamPlayers(room, team).filter((p) => !isBotIdV136IK(p.id));
  } else if (!isBotIdV136IK(winnerId)) {
    const winnerPlayer = (room.players || []).find((p) => p.id === winnerId);
    if (winnerPlayer) receivers = [winnerPlayer];
  }

  if (!receivers.length) {
    room.wager.paidOut = true;
    room.wager.winnerAwardText = "فاز البوت · لم تُضاف جائزة الرهان لأي حساب حقيقي";
    return;
  }

  const share = Math.floor(pot / receivers.length);
  let distributed = 0;
  for (let i = 0; i < receivers.length; i++) {
    const player = receivers[i];
    const user = db.users.find((u) => u.id === player.id);
    if (!user) continue;
    const add = i === receivers.length - 1 ? (pot - distributed) : share;
    user.coins = Number(user.coins || 0) + add;
    distributed += add;
  }

  room.wager.paidOut = true;
  room.wager.paidOutAt = new Date().toISOString();
  room.wager.winnerAwardText = receivers.length > 1 ? `تم توزيع جائزة الرهان ${pot} كوينز على الفريق الفائز` : `تمت إضافة جائزة الرهان ${pot} كوينز للفائز`;
}

function fillRoomWithBots(room) {
  if (!room || room.status !== "waiting") return false;
  const maxPlayers = room.maxPlayers || 2;
  let added = false;
  while ((room.players || []).length < maxPlayers) {
    room.players.push(createBotForRoom(room));
    added = true;
  }
  if (added) {
    room.botAddedAfterHumanWait = true;
    room.humanFirstBotEndsAt = null;
    room.botSocial = room.botSocial || { turnCount: 0, lastAt: 0, recentTexts: [] };
    botWelcome(room);
  }
  return added;
}

function startRoomIfReady(room) {
  if (!room || room.status !== "waiting") return false;
  if ((room.players || []).length < (room.maxPlayers || 2)) return false;
  clearHumanFirstBotTimer(room.id);
  if (!collectRoomWagerV136IK(room)) {
    emitRoom(room);
    return false;
  }
  room.status = "playing";
  if (room.game === "domino") {
    startDomino(room);
    playBotIfNeeded(room);
    scheduleDominoTurnTimer(room);
  }
  if (room.game === "chess") {
    playChessBotIfNeeded(room);
    scheduleChessTurnTimerV138H(room);
  }
  if (room.game === "carrom" || room.game === "billiards") {
    room.beta = room.beta || {};
    room.beta.realtimeRoomsV137A = true;
    room.beta.tableMode = Number(room.maxPlayers) === 4 ? 4 : 2;
    room.beta.startedAt = new Date().toISOString();
    room.beta.lastAction = `${room.game === "carrom" ? "الكيرم" : "البلياردو"} بدأ من غرفة أونلاين حقيقية`;
    setBetaTurnV138(room, (room.players || [])[0]?.id);
    scheduleBetaTurnTimerV138H(room);
  }
  emitRoom(room);
  return true;
}

function scheduleHumanFirstBotTimer(room) {
  if (!room || room.status !== "waiting") return;
  clearHumanFirstBotTimer(room.id);

  // V138_MATCH_MODE_CLEAN_BOT_HUMAN_QUICK_SAFE:
  // live = بشر فقط بدون بوت، quick = ينتظر 40 ثانية ثم يملأ بالبوت، bot = يملأ فورًا عند الإنشاء.
  if (String(room.matchMode || "live") === "live") {
    room.humanFirstBotWaitMs = 0;
    room.humanFirstBotEndsAt = null;
    emitRoom(room);
    return;
  }

  if ((room.players || []).length >= (room.maxPlayers || 2)) return;

  room.humanFirstBotWaitMs = HUMAN_FIRST_BOT_WAIT_MS;
  room.humanFirstBotEndsAt = new Date(Date.now() + HUMAN_FIRST_BOT_WAIT_MS).toISOString();

  const timer = setTimeout(() => {
    const live = rooms.get(room.id);
    if (!live || live.status !== "waiting") return;
    if (String(live.matchMode || "live") === "live") return;
    if ((live.players || []).length >= (live.maxPlayers || 2)) return;
    live.humanFirstBotTriggeredAt = new Date().toISOString();
    fillRoomWithBots(live);
    startRoomIfReady(live);
  }, HUMAN_FIRST_BOT_WAIT_MS);

  humanFirstBotTimers.set(room.id, timer);
}

function clearDominoTurnTimer(roomId) {
  const timer = dominoTurnTimers.get(roomId);
  if (timer) clearTimeout(timer);
  dominoTurnTimers.delete(roomId);
}

function clearChessTurnTimerV138H(roomId) {
  const timer = chessTurnTimersV138H.get(roomId);
  if (timer) clearTimeout(timer);
  chessTurnTimersV138H.delete(roomId);
}

function clearBetaTurnTimerV138H(roomId) {
  const timer = betaTurnTimersV138H.get(roomId);
  if (timer) clearTimeout(timer);
  betaTurnTimersV138H.delete(roomId);
}

function clearAllTurnTimersV138H(roomId) {
  clearDominoTurnTimer(roomId);
  clearChessTurnTimerV138H(roomId);
  clearBetaTurnTimerV138H(roomId);
}

function scheduleDominoTurnTimer(room) {
  if (!room || room.game !== "domino" || room.status !== "playing") return;
  clearDominoTurnTimer(room.id);
  if (!room.domino) return;
  room.domino.turnStartedAt = new Date().toISOString();
  room.domino.turnEndsAt = new Date(Date.now() + DOMINO_TURN_MS).toISOString();

  const timer = setTimeout(() => {
    const live = rooms.get(room.id);
    if (!live || live.game !== "domino" || live.status !== "playing") return;
    const currentId = live.domino.turn;
    const current = (live.players || []).find((p) => p.id === currentId);
    if (!current) return;

    if (String(current.id).startsWith("bot_")) {
      playBotIfNeeded(live);
      scheduleDominoTurnTimer(live);
      emitRoom(live);
      return;
    }

    const best = findBestDominoMove(live, currentId);
    if (best) {
      playDomino(live, currentId, best.tile, best.side);
      live.domino.autoMessage = "⏱ تم اللعب تلقائيًا بسبب انتهاء الوقت";
    } else {
      skipDominoTurn(live, currentId);
      live.domino.autoMessage = isDominoFourPlayers(live) ? "⏭ تمرير تلقائي: لا توجد حركة" : "⏱ تم السحب/التمرير تلقائيًا";
    }
    playBotIfNeeded(live);
    scheduleDominoTurnTimer(live);
    emitRoom(live);
  }, DOMINO_TURN_MS);

  dominoTurnTimers.set(room.id, timer);
}



function scheduleChessTurnTimerV138H(room) {
  if (!room || room.game !== "chess" || room.status !== "playing" || !room.chess) return;
  clearChessTurnTimerV138H(room.id);
  if (room.chess.isGameOver()) return;
  room.chessTurnStartedAtV138H = new Date().toISOString();
  room.chessTurnEndsAtV138H = new Date(Date.now() + UNIVERSAL_TURN_MS_V138H).toISOString();

  const timer = setTimeout(() => {
    const live = rooms.get(room.id);
    if (!live || live.game !== "chess" || live.status !== "playing" || !live.chess) return;
    if (live.chess.isGameOver()) return;

    const currentColor = live.chess.turn();
    const currentPlayer = (live.players || [])[currentColor === "w" ? 0 : 1];
    const move = chooseSmartChessBotMove(live);
    if (!move) return;

    try {
      live.chess.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      live.chessAutoMessageV138H = `⏱ نقلة تلقائية بسبب انتهاء وقت ${currentPlayer?.username || "اللاعب"}`;
      botMaybeComment(live, "move");
      if (live.chess.isGameOver()) {
        finishChessIfGameOverV138(live, currentPlayer?.id || null);
      } else {
        playChessBotIfNeeded(live);
        scheduleChessTurnTimerV138H(live);
        emitRoom(live);
      }
    } catch {}
  }, UNIVERSAL_TURN_MS_V138H);

  chessTurnTimersV138H.set(room.id, timer);
}

function scheduleBetaTurnTimerV138H(room) {
  if (!room || !["carrom", "billiards"].includes(room.game) || room.status !== "playing") return;
  room.beta = room.beta || {};
  if (!room.beta.turnUserId) setBetaTurnV138(room, (room.players || [])[0]?.id);
  clearBetaTurnTimerV138H(room.id);
  room.beta.turnStartedAt = new Date().toISOString();
  room.beta.turnEndsAt = new Date(Date.now() + UNIVERSAL_TURN_MS_V138H).toISOString();

  const timer = setTimeout(() => {
    const live = rooms.get(room.id);
    if (!live || !["carrom", "billiards"].includes(live.game) || live.status !== "playing") return;
    live.beta = live.beta || {};
    const oldUserId = live.beta.turnUserId || null;
    const oldUsername = live.beta.turnUsername || "لاعب";
    advanceBetaTurnV138(live);
    const seq = Date.now();
    const autoShotTextV138 = live.game === "carrom"
      ? `🤖 انتهى وقت ${oldUsername} · البوت نفّذ ضربة كيرم آمنة مؤقتًا`
      : `🤖 انتهى وقت ${oldUsername} · البوت نفّذ ضربة بلياردو آمنة مؤقتًا`;
    live.beta.realtimeRoomsV137A = true;
    live.beta.realtimeSyncV137K = true;
    live.beta.serverTurnGuardV138 = true;
    live.beta.autoSubstituteV138 = true;
    live.beta.realtimeSeq = seq;
    live.beta.lastAction = autoShotTextV138;
    live.beta.realtimeState = {
      ...(live.beta.realtimeState || {}),
      kind: live.game === "carrom" ? "carrom-state-v137k" : "billiards-state-v137k",
      reason: "auto-substitute-shot-v138",
      seq,
      roomId: live.id,
      game: live.game,
      fromUserId: "server_auto_v138h",
      fromUsername: "Auto Substitute",
      autoTurnTimeoutV138H: true,
      autoSubstituteShotV138: true,
      autoSubstituteGameV138: live.game,
      skippedUserId: oldUserId,
      skippedUsername: oldUsername,
      turnDone: true,
      nextTurn: true,
      nextTurnUserId: live.beta.turnUserId || null,
      nextTurnUsername: live.beta.turnUsername || null,
      turnUserId: live.beta.turnUserId || null,
      turnUsername: live.beta.turnUsername || null,
      turnEndsAt: live.beta.turnEndsAt || null,
      statusText: autoShotTextV138,
      status: autoShotTextV138,
      serverAt: new Date().toISOString()
    };
    io.to(live.id).emit("beta:state", live.beta.realtimeState);
    scheduleBetaTurnTimerV138H(live);
    emitRoom(live);
  }, UNIVERSAL_TURN_MS_V138H);

  betaTurnTimersV138H.set(room.id, timer);
}

function chooseSmartChessBotMove(room) {
  if (!room || room.game !== "chess" || !room.chess) return null;
  const moves = room.chess.moves({ verbose: true });
  if (!moves.length) return null;
  const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  let best = null;
  for (const move of moves) {
    let score = 0;
    if (move.captured) score += values[String(move.captured).toLowerCase()] || 0;
    if (move.promotion) score += values[String(move.promotion).toLowerCase()] || 0;
    if (move.flags && String(move.flags).includes("c")) score += 30;
    try {
      const temp = new Chess(room.chess.fen());
      temp.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      if (temp.isCheckmate()) score += 10000;
      else if (temp.isCheck()) score += 120;
    } catch {}
    score += Math.random() * 8;
    if (!best || score > best.score) best = { move, score };
  }
  return best ? best.move : moves[Math.floor(Math.random() * moves.length)];
}

function playChessBotIfNeeded(room) {
  if (!room || room.game !== "chess" || room.status !== "playing" || !room.chess) return;
  if (String(room.matchMode || "live") === "live") return;
  const players = room.players || [];
  if (players.length < 2 || room.chess.isGameOver()) return;
  const turnIndex = room.chess.turn() === "w" ? 0 : 1;
  const current = players[turnIndex];
  if (!current || !isBotPlayer(current)) return;
  const move = chooseSmartChessBotMove(room);
  if (!move) return;
  try {
    room.chess.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
    botMaybeComment(room, "move");
    if (room.chess.isGameOver()) {
      finishChessIfGameOverV138(room, current.id);
    }
  } catch {}
}

function emitRoomState(room) {
  for (const player of room.players || []) {
    if (player.socketId) {
      io.to(player.socketId).emit("room:update", publicRoom(room, player.id));
    }
  }
  io.emit("rooms:list", roomList());
}


function finishRoomDrawV138(room, reason) {
  clearAllTurnTimersV138H(room.id);
  clearHumanFirstBotTimer(room.id);
  room.status = "finished";
  room.winnerId = null;
  room.winnerUsername = "تعادل";
  room.draw = true;
  room.finishReason = reason || "انتهت المباراة بالتعادل";

  const db = readDb();
  db.matches.push({
    id: makeId("match"),
    roomId: room.id,
    game: room.game,
    winnerId: null,
    draw: true,
    reason: room.finishReason,
    endedAt: new Date().toISOString()
  });
  writeDb(db);
  emitRoomState(room);
  io.to(room.id).emit("match:finished", { roomId: room.id, game: room.game, winnerId: null, draw: true, reason: room.finishReason });
}

function finishChessIfGameOverV138(room, moverId) {
  if (!room || room.game !== "chess" || !room.chess || !room.chess.isGameOver()) return false;
  if (room.chess.isCheckmate()) {
    finishRoom(room, moverId);
    return true;
  }
  let reason = "انتهت مباراة الشطرنج بالتعادل";
  if (typeof room.chess.isStalemate === "function" && room.chess.isStalemate()) reason = "تعادل: Stalemate";
  else if (typeof room.chess.isThreefoldRepetition === "function" && room.chess.isThreefoldRepetition()) reason = "تعادل: تكرار الوضع ثلاث مرات";
  else if (typeof room.chess.isInsufficientMaterial === "function" && room.chess.isInsufficientMaterial()) reason = "تعادل: قطع غير كافية للمات";
  else if (typeof room.chess.isDraw === "function" && room.chess.isDraw()) reason = "تعادل حسب قانون الشطرنج";
  finishRoomDrawV138(room, reason);
  return true;
}

function setBetaTurnV138(room, userId) {
  if (!room || !room.beta) return;
  const players = room.players || [];
  const idx = Math.max(0, players.findIndex((p) => String(p.id) === String(userId)));
  room.beta.turnIndex = idx;
  room.beta.turnUserId = players[idx] ? players[idx].id : null;
  room.beta.turnUsername = players[idx] ? players[idx].username : null;
  room.beta.turnStartedAt = new Date().toISOString();
  room.beta.turnEndsAt = new Date(Date.now() + UNIVERSAL_TURN_MS_V138H).toISOString();
}

function advanceBetaTurnV138(room) {
  if (!room || !room.beta) return;
  const players = room.players || [];
  if (!players.length) return;
  const currentIndex = Math.max(0, players.findIndex((p) => String(p.id) === String(room.beta.turnUserId)));
  const nextIndex = (currentIndex + 1) % players.length;
  setBetaTurnV138(room, players[nextIndex].id);
}

function finishRoom(room, winnerId) {
  clearAllTurnTimersV138H(room.id);
  clearHumanFirstBotTimer(room.id);
  if (room.game === "domino") {
    if (!room.domino.scores) room.domino.scores = {};

    for (const p of room.players) {
      if (room.domino.scores[p.id] == null) room.domino.scores[p.id] = 0;
    }

    // TopTop style:
    // الفائز يأخذ مجموع نقاط بلاط الخصوم المتبقية، وليس 100 مباشرة.
    const handPointsMap = Object.fromEntries((room.players || []).map((p) => [p.id, getDominoHandPoints(room, p.id)]));
    let roundPoints = 0;
    let currentScore = 0;
    const winnerPlayerForRound = room.players.find((p) => p.id === winnerId);
    room.domino.finishReason = room.domino.finishReason || ((room.domino.hands[winnerId] || []).length === 0 ? "خلصت القطع" : "الجولة مقفولة: الأقل نقاطًا");

    if (isDominoTeamsRoom(room)) {
      const winnerTeam = getDominoTeamIndex(room, winnerId);
      const teamPlayers = getDominoTeamPlayers(room, winnerTeam);
      const opponentPlayers = (room.players || []).filter((p) => getDominoTeamIndex(room, p.id) !== winnerTeam);
      roundPoints = opponentPlayers.reduce((sum, p) => sum + (handPointsMap[p.id] || 0), 0);
      for (const teammate of teamPlayers) {
        room.domino.scores[teammate.id] = (room.domino.scores[teammate.id] || 0) + roundPoints;
      }
      currentScore = Math.max(...teamPlayers.map((p) => room.domino.scores[p.id] || 0));
      const partnerId = getDominoPartnerId(room, winnerId);
      const partner = (room.players || []).find((p) => p.id === partnerId);
      room.domino.roundPointsText = `نقاط الشراكة: +${roundPoints} لفريق ${winnerPlayerForRound?.username || "الفائز"}${partner ? " و" + partner.username : ""}`;
    } else {
      roundPoints = room.players
        .filter((p) => p.id !== winnerId)
        .reduce((sum, p) => sum + (handPointsMap[p.id] || 0), 0);
      room.domino.roundPointsText = `نقاط الجولة: +${roundPoints} لـ ${winnerPlayerForRound?.username || "الفائز"}`;
      room.domino.scores[winnerId] =
        (room.domino.scores[winnerId] || 0) + roundPoints;
      currentScore = room.domino.scores[winnerId] || 0;
    }

    // إذا لم يصل الفائز إلى 100، نبدأ جولة جديدة بنفس النقاط المتراكمة.
    if (currentScore < 100) {
      room.status = "playing";
      startDomino(room);
      playBotIfNeeded(room);
      scheduleDominoTurnTimer(room);
      emitRoomState(room);
      return;
    }
  }

  room.status = "finished";
  room.winnerId = winnerId;
  const winnerPlayer = room.players.find((p) => p.id === winnerId);
  room.winnerUsername = winnerPlayer ? winnerPlayer.username : "الفائز";
  botFinishComment(room, winnerId);

  const db = readDb();
  const winner = db.users.find((u) => u.id === winnerId);

  if (winner) {
    winner.wins = (winner.wins || 0) + 1;
    winner.points = (winner.points || 0) + 10;
    winner.coins = (winner.coins || 0) + 20;
    winner.level = Math.max(1, Math.floor((winner.points || 0) / 100) + 1);
  }

  awardRoomWagerV136IK(room, winnerId, db);

  for (const p of room.players) {
    if (p.id !== winnerId) {
      const loser = db.users.find((u) => u.id === p.id);
      if (loser) loser.losses = (loser.losses || 0) + 1;
    }
  }

  db.matches.push({
    id: makeId("match"),
    roomId: room.id,
    game: room.game,
    winnerId,
    endedAt: new Date().toISOString()
  });

  writeDb(db);
  for (const p of room.players || []) emitUserUpdateV136IK(p.id);
  emitRoomState(room);
  io.to(room.id).emit("match:finished", { roomId: room.id, game: room.game, winnerId });
}


// V136CQ_DOMINO_WITHDRAWAL_WINNER_RULES_SAFE:
// قوانين الانسحاب: دومينو 2 المتبقي يفوز فوراً، دومينو 4 يستمر حتى يبقى لاعب واحد فيفوز.
function finishRoomByWithdrawal(room, winnerId, reason) {
  clearAllTurnTimersV138H(room.id);
  clearHumanFirstBotTimer(room.id);
  room.status = "finished";
  room.winnerId = winnerId;
  const winnerPlayer = (room.players || []).find((p) => p.id === winnerId);
  room.winnerUsername = winnerPlayer ? winnerPlayer.username : "الفائز";
  if (room.game === "domino") {
    if (!room.domino) room.domino = {};
    if (!room.domino.scores) room.domino.scores = {};
    for (const p of room.players || []) {
      if (room.domino.scores[p.id] == null) room.domino.scores[p.id] = 0;
    }
    room.domino.finishReason = reason || "فوز بسبب الانسحاب";
    room.domino.roundPointsText = "الفوز بسبب انسحاب المنافسين";
    room.domino.scores[winnerId] = Math.max(room.domino.scores[winnerId] || 0, 100);
  }

  const db = readDb();
  const winner = db.users.find((u) => u.id === winnerId);
  if (winner) {
    winner.wins = (winner.wins || 0) + 1;
    winner.points = (winner.points || 0) + 10;
    winner.coins = (winner.coins || 0) + 20;
    winner.level = Math.max(1, Math.floor((winner.points || 0) / 100) + 1);
  }
  awardRoomWagerV136IK(room, winnerId, db);

  for (const p of room.players || []) {
    if (p.id !== winnerId) {
      const loser = db.users.find((u) => u.id === p.id);
      if (loser) loser.losses = (loser.losses || 0) + 1;
    }
  }
  db.matches.push({
    id: makeId("match"),
    roomId: room.id,
    game: room.game,
    winnerId,
    endedAt: new Date().toISOString()
  });
  writeDb(db);
  for (const p of room.players || []) emitUserUpdateV136IK(p.id);
  emitRoomState(room);
  io.to(room.id).emit("match:finished", { roomId: room.id, game: room.game, winnerId });
}

function handleDominoPlayerLeave(room, leavingUserId) {
  if (!room || room.game !== "domino") return;
  const oldPlayers = room.players || [];
  const leavingIndex = oldPlayers.findIndex((p) => p.id === leavingUserId);
  if (leavingIndex === -1) return;

  const wasPlaying = room.status === "playing";
  const wasFourPlayers = isDominoFourPlayers(room);
  const leavingWasTurn = room.domino && room.domino.turn === leavingUserId;

  // V136DY_DOMINO4_PARTNERSHIP_TEAMS_SAFE:
  // في وضع الشراكة، إذا انسحب لاعب أثناء اللعب، يدخل بوت في نفس مقعده ويحمل نفس اليد حتى لا ينكسر الفريق.
  if (wasPlaying && isDominoTeamsRoom(room)) {
    const bot = createBotForRoom(room);
    bot.username = `${bot.username} بديل`;
    const oldHand = room.domino?.hands?.[leavingUserId] || [];
    const oldScore = room.domino?.scores?.[leavingUserId] || 0;
    oldPlayers[leavingIndex] = bot;
    room.players = oldPlayers;
    if (room.domino) {
      if (!room.domino.hands) room.domino.hands = {};
      if (!room.domino.scores) room.domino.scores = {};
      delete room.domino.hands[leavingUserId];
      delete room.domino.scores[leavingUserId];
      room.domino.hands[bot.id] = oldHand;
      room.domino.scores[bot.id] = oldScore;
      if (leavingWasTurn) room.domino.turn = bot.id;
      room.domino.autoMessage = "🤝 دخل بوت بديل مكان لاعب غادر للحفاظ على الشراكة";
    }
    scheduleDominoTurnTimer(room);
    playBotIfNeeded(room);
    emitRoomState(room);
    return;
  }

  room.players = oldPlayers.filter((p) => p.id !== leavingUserId);
  if (room.domino) {
    if (room.domino.hands) delete room.domino.hands[leavingUserId];
    if (room.domino.scores) delete room.domino.scores[leavingUserId];
  }

  if (room.players.length === 0) {
    clearDominoTurnTimer(room.id);
    clearHumanFirstBotTimer(room.id);
    rooms.delete(room.id);
    io.emit("rooms:list", roomList());
    return;
  }

  if (!wasPlaying) {
    room.status = "waiting";
    scheduleHumanFirstBotTimer(room);
    emitRoomState(room);
    return;
  }

  if (!wasFourPlayers) {
    const winnerId = room.players[0].id;
    finishRoomByWithdrawal(room, winnerId, "فوز بسبب انسحاب اللاعب الآخر");
    return;
  }

  if (room.players.length === 1) {
    const winnerId = room.players[0].id;
    finishRoomByWithdrawal(room, winnerId, "فوز بسبب انسحاب باقي اللاعبين");
    return;
  }

  if (room.domino) {
    const stillHasTurnPlayer = room.players.some((p) => p.id === room.domino.turn);
    if (leavingWasTurn || !stillHasTurnPlayer) {
      const nextIndex = Math.min(leavingIndex, room.players.length - 1);
      room.domino.turn = room.players[nextIndex]?.id || room.players[0].id;
    }
    room.domino.autoMessage = "غادر لاعب · تستمر غرفة 4 لاعبين باللاعبين المتبقين";
  }

  scheduleDominoTurnTimer(room);
  playBotIfNeeded(room);
  emitRoomState(room);
}


// V138_BETA4_WITHDRAW_CONTINUE_SAFE:
// كيرم 4 وبلياردو 4: إذا لاعب انسحب، الباقي يواصلون.
// 4 -> 3 يواصلون، 3 -> 2 يواصلون، 2 -> 1 الأخير فائز.
function handleBeta4PlayerLeaveV138(room, leavingUserId) {
  if (!room || !["carrom", "billiards"].includes(room.game)) return false;

  const wasPlaying = room.status === "playing";
  const oldPlayers = Array.isArray(room.players) ? room.players : [];
  const leavingIndex = oldPlayers.findIndex((p) => String(p.id) === String(leavingUserId));
  const leavingPlayer = oldPlayers[leavingIndex];
  const leavingName = leavingPlayer?.username || "لاعب";
  const gameLabel = room.game === "carrom" ? "الكيرم" : "البلياردو";

  room.players = oldPlayers.filter((p) => String(p.id) !== String(leavingUserId));

  if (room.players.length === 0) {
    clearAllTurnTimersV138H(room.id);
    clearHumanFirstBotTimer(room.id);
    rooms.delete(room.id);
    io.emit("rooms:list", roomList());
    return true;
  }

  if (!wasPlaying) {
    room.status = "waiting";
    room.beta = room.beta || {};
    room.beta.lastAction = `${leavingName} غادر غرفة ${gameLabel}`;
    scheduleHumanFirstBotTimer(room);
    emitRoomState(room);
    return true;
  }

  room.beta = room.beta || {};
  room.beta.withdrawContinueV138 = true;
  room.beta.lastLeftPlayerNameV138 = leavingName;
  room.beta.lastLeftAtV138 = new Date().toISOString();

  // إذا بقي لاعب واحد فقط، هو الفائز.
  if (room.players.length === 1) {
    const winner = room.players[0];
    room.beta.lastAction = `${leavingName} انسحب · ${winner.username || "اللاعب الباقي"} هو الفائز`;
    io.to(room.id).emit("beta:playerLeft", {
      roomId: room.id,
      game: room.game,
      leftUserId: leavingUserId,
      leftUsername: leavingName,
      remainingCount: room.players.length,
      finished: true,
      winnerId: winner.id,
      winnerUsername: winner.username || "الفائز",
      message: room.beta.lastAction
    });
    finishRoomByWithdrawal(room, winner.id, room.beta.lastAction);
    return true;
  }

  // إذا بقي 3 أو 2 لاعبين، تستمر المباراة.
  const stillHasTurnPlayer = room.players.some((p) => String(p.id) === String(room.beta.turnUserId || ""));
  if (!stillHasTurnPlayer || String(room.beta.turnUserId || "") === String(leavingUserId)) {
    const nextIndex = Math.min(Math.max(0, leavingIndex), room.players.length - 1);
    setBetaTurnV138(room, room.players[nextIndex]?.id || room.players[0].id);
  }

  room.beta.lastAction = `${leavingName} انسحب من ${gameLabel} 4 · ${room.players.length} لاعبين يواصلون`;
  scheduleBetaTurnTimerV138H(room);

  io.to(room.id).emit("beta:playerLeft", {
    roomId: room.id,
    game: room.game,
    leftUserId: leavingUserId,
    leftUsername: leavingName,
    remainingCount: room.players.length,
    finished: false,
    nextTurnUserId: room.beta.turnUserId || null,
    nextTurnUsername: room.beta.turnUsername || null,
    message: room.beta.lastAction
  });

  emitRoomState(room);
  io.emit("rooms:list", roomList());
  return true;
}


io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error("NO_TOKEN"));

  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("INVALID_TOKEN"));
  }
});


function getRoomHumanPlayerIdsV137O(room) {
  return (room?.players || [])
    .map((p) => String(p?.id || ""))
    .filter((id) => id && !isBotIdV136IK(id));
}

function isVoiceRoomMemberV137O(room, userId) {
  return getRoomHumanPlayerIdsV137O(room).includes(String(userId || ""));
}

function emitVoiceSignalV137O(socket, room, eventName, payload, toUserId) {
  if (!room || !isVoiceRoomMemberV137O(room, socket.user.id)) return;
  const safePayload = { roomId: room.id, userId: socket.user.id, username: socket.user.username, ...payload };
  const targetUserId = String(toUserId || "");
  if (targetUserId && isVoiceRoomMemberV137O(room, targetUserId)) {
    const targetSocketId = connectedUserSocketsV137O.get(targetUserId);
    if (targetSocketId) io.to(targetSocketId).emit(eventName, safePayload);
    return;
  }
  socket.to(room.id).emit(eventName, safePayload);
}

io.on("connection", (socket) => {
  connectedUserSocketsV137O.set(String(socket.user.id), socket.id);
  socket.on("disconnect", () => {
    if (connectedUserSocketsV137O.get(String(socket.user.id)) === socket.id) connectedUserSocketsV137O.delete(String(socket.user.id));
  });
  
    // V138D: تم إيقاف منحة المليون نهائيًا. الحساب الجديد يبدأ بـ 10000 فقط.

socket.emit("rooms:list", roomList());

  socket.on("rooms:list", () => {
    socket.emit("rooms:list", roomList());
  });

  socket.on("profile:update", () => {
    for (const room of rooms.values()) {
      const me = room.players.find((p) => p.id === socket.user.id);
      if (me) {
        const meta = getUserMeta(socket.user.id);
        me.avatarUri = meta.avatarUri;
        me.countryCode = meta.countryCode;
        emitRoom(room);
      }
    }
    socket.emit("rooms:list", roomList());
  });

  socket.on("room:create", ({ game, maxPlayers, dominoMode, wager, matchMode }) => {
    const allowedGames = ["domino", "chess", "carrom", "billiards"];
    if (!allowedGames.includes(game)) {
      return socket.emit("error:message", "GAME_NOT_ALLOWED");
    }

    const roomMaxPlayers = Number(maxPlayers) === 4 ? 4 : 2;
    const safeDominoMode = game === "domino" && roomMaxPlayers === 4 && String(dominoMode) === "teams" ? "teams" : "classic";
    const safeWagerV136IK = normalizeWagerV136IK(wager);

    {
      const db = readDb();
      const creator = db.users.find((u) => u.id === socket.user.id);
      if (!creator || Number(creator.coins || 0) < safeWagerV136IK) {
        return socket.emit("error:message", `رصيدك لا يكفي لإنشاء رهان ${safeWagerV136IK} كوينز`);
      }
    }

    // V137N_LIVE_AUTO_MATCH_SERVER_SAFE:
    // في وضع "بحث لايف مع بشر" لا ننشئ غرفة جديدة إذا توجد غرفة انتظار مناسبة.
    // اللاعب الثاني يدخل نفس غرفة اللاعب الأول وتبدأ المباراة عند اكتمال العدد.
    const safeMatchModeV138 = ["bot", "live", "quick"].includes(String(matchMode || "live")) ? String(matchMode || "live") : "live";

    if (safeMatchModeV138 === "live" || safeMatchModeV138 === "quick") {
      const existingRoom = Array.from(rooms.values()).find((r) => {
        if (!r || r.status !== "waiting") return false;
        if (r.game !== game) return false;
        if (String(r.matchMode || "live") !== safeMatchModeV138) return false;
        if (Number(r.maxPlayers || 2) !== roomMaxPlayers) return false;
        const rDominoMode = r.game === "domino" && Number(r.maxPlayers || 2) === 4 && String(r.dominoMode || "classic") === "teams" ? "teams" : "classic";
        if (game === "domino" && rDominoMode !== safeDominoMode) return false;
        if ((r.players || []).length >= (r.maxPlayers || 2)) return false;
        if ((r.players || []).some((p) => p.id === socket.user.id)) return false;
        const existingWager = Number(r?.wager?.amount || 0);
        if (existingWager && existingWager !== safeWagerV136IK) return false;
        return true;
      });

      if (existingRoom) {
        existingRoom.players.push({
          id: socket.user.id,
          username: socket.user.username,
          avatarUri: getUserMeta(socket.user.id).avatarUri,
          countryCode: getUserMeta(socket.user.id).countryCode,
          socketId: socket.id
        });
        socket.join(existingRoom.id);

        if (existingRoom.players.length === (existingRoom.maxPlayers || 2) && existingRoom.status === "waiting") {
          startRoomIfReady(existingRoom);
        } else if (existingRoom.status === "waiting") {
          scheduleHumanFirstBotTimer(existingRoom);
        }

        socket.emit("room:joined", publicRoom(existingRoom, socket.user.id));
        emitRoom(existingRoom);
        return;
      }
    }

    const room = {
      id: makeId("room").slice(0, 12),
      game,
      maxPlayers: roomMaxPlayers,
      dominoMode: safeDominoMode,
      matchMode: safeMatchModeV138,
      wager: {
        amount: safeWagerV136IK,
        pot: 0,
        paid: {},
        locked: false,
        paidOut: false
      },
      status: "waiting",
      players: [
        {
          id: socket.user.id,
          username: socket.user.username,
          avatarUri: getUserMeta(socket.user.id).avatarUri,
          countryCode: getUserMeta(socket.user.id).countryCode,
          socketId: socket.id
        }
      ],
      chat: [],
      domino: {
        board: [],
        hands: {},
        turn: null
      },
      chess: game === "chess" ? new Chess() : null,
      beta: {
        // V137A_REALTIME_CARROM_BILLIARDS_ROOMS_SAFE:
        // حالة غرفة حقيقية للكِيرم/البلياردو بدون لمس الفيزياء. المزامنة الكاملة للضربات تأتي في V137B/V137C.
        scoreA: 0,
        scoreB: 0,
        lastAction: game === "carrom" || game === "billiards" ? "غرفة أونلاين حقيقية بانتظار اللاعبين" : "جاهز",
        realtimeRoomsV137A: game === "carrom" || game === "billiards",
        serverTurnGuardV138: game === "carrom" || game === "billiards",
        tableMode: roomMaxPlayers,
        turnIndex: 0,
        turnUserId: null,
        turnUsername: null,
        turnStartedAt: null,
        startedAt: null
      },
      botSocial: {
        turnCount: 0,
        lastAt: 0,
        recentTexts: []
      }
    };

    rooms.set(room.id, room);
    socket.join(room.id);

    // V138_MATCH_MODE_CLEAN: اختيار "اللعب مع بوت" يملأ المقاعد فورًا ويبدأ الغرفة.
    // اختيار "بحث سريع" لا يملأ فورًا؛ ينتظر البشر 40 ثانية ثم يضيف بوت تلقائيًا.
    if (safeMatchModeV138 === "bot") {
      fillRoomWithBots(room);
      startRoomIfReady(room);
    }

    socket.emit("room:joined", publicRoom(room, socket.user.id));
    io.emit("rooms:list", roomList());
    if (room.status === "waiting") scheduleHumanFirstBotTimer(room);
  });

  socket.on("room:join", ({ roomId, expectedGame, expectedMaxPlayers, expectedDominoMode }) => {
    // V136ES_DOMINO4_TEAMS_LOCK_FIX_SAFE: قفل دخول غرف الدومينو حسب النوع: 2 / 4 فردي / 4 شراكة.
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:message", "ROOM_NOT_FOUND");
    if (room.status === "finished") return socket.emit("error:message", "ROOM_FINISHED");

    // V137A_REALTIME_CARROM_BILLIARDS_ROOMS_SAFE:
    // قفل دخول الغرف حسب اللعبة والعدد لكل الألعاب، وليس الدومينو فقط.
    if (String(expectedGame || "")) {
      const wantedGame = String(expectedGame || "");
      if (room.game !== wantedGame) return socket.emit("error:message", "ROOM_GAME_MODE_MISMATCH");
      const wantedMaxAny = Number(expectedMaxPlayers) === 4 ? 4 : 2;
      const roomMaxAny = Number(room.maxPlayers) === 4 ? 4 : 2;
      if (roomMaxAny !== wantedMaxAny) return socket.emit("error:message", "ROOM_GAME_MODE_MISMATCH");
    }

    if (String(expectedGame || "") === "domino") {
      if (room.game !== "domino") return socket.emit("error:message", "DOMINO_ROOM_MODE_MISMATCH");
      const wantedMax = Number(expectedMaxPlayers) === 4 ? 4 : 2;
      const wantedMode = wantedMax === 4 && String(expectedDominoMode || "classic") === "teams" ? "teams" : "classic";
      const roomMax = Number(room.maxPlayers) === 4 ? 4 : 2;
      const roomMode = roomMax === 4 && String(room.dominoMode || "classic") === "teams" ? "teams" : "classic";
      if (roomMax !== wantedMax || (wantedMax === 4 && roomMode !== wantedMode)) {
        return socket.emit("error:message", "DOMINO_ROOM_MODE_MISMATCH");
      }
    }

    const existing = room.players.find((p) => p.id === socket.user.id);

    if (!existing && room.wager && room.wager.amount > 0 && !isBotIdV136IK(socket.user.id)) {
      const db = readDb();
      const user = db.users.find((u) => u.id === socket.user.id);
      if (!user || Number(user.coins || 0) < Number(room.wager.amount || 0)) {
        return socket.emit("error:message", `رصيدك لا يكفي لدخول رهان ${room.wager.amount} كوينز`);
      }
    }

    if (existing) {
      existing.socketId = socket.id;
    } else {
      if (room.players.length >= (room.maxPlayers || 2)) return socket.emit("error:message", "ROOM_FULL");
      room.players.push({
        id: socket.user.id,
        username: socket.user.username,
        avatarUri: getUserMeta(socket.user.id).avatarUri,
        countryCode: getUserMeta(socket.user.id).countryCode,
        socketId: socket.id
      });
    }

    socket.join(room.id);

    if (room.players.length === (room.maxPlayers || 2) && room.status === "waiting") {
      startRoomIfReady(room);
    } else if (room.status === "waiting") {
      scheduleHumanFirstBotTimer(room);
    }

    socket.emit("room:joined", publicRoom(room, socket.user.id));
    emitRoom(room);
  });

  socket.on("room:addBot", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:message", "ROOM_NOT_FOUND");
    if (room.status === "finished") return socket.emit("error:message", "ROOM_FINISHED");

    const me = room.players.find((p) => p.id === socket.user.id);
    const maxPlayers = room.maxPlayers || 2;

    // V128_HUMAN_PRIORITY_BOT_AFTER_40S:
    // لا نسمح بزر أو عميل قديم بإدخال بوت فورًا.
    // الأولوية دائماً للاعبين الحقيقيين، والبوت يدخل فقط بعد انتهاء انتظار 40 ثانية.
    if (room.players.length >= maxPlayers) {
      if (!me) return socket.emit("error:message", "ROOM_FULL");
      socket.join(room.id);
      socket.emit("room:joined", publicRoom(room, socket.user.id));
      emitRoom(room);
      return;
    }

    if (room.status === "waiting") {
      const remainingMs = getHumanFirstBotRemainingMs(room);
      if (remainingMs > 0) {
        scheduleHumanFirstBotTimer(room);
        socket.emit("error:message", `HUMAN_PRIORITY_WAIT_${Math.ceil(remainingMs / 1000)}S`);
        socket.emit("room:joined", publicRoom(room, socket.user.id));
        emitRoom(room);
        return;
      }
    }

    fillRoomWithBots(room);

    if (room.players.length === (room.maxPlayers || 2) && room.status === "waiting") {
      startRoomIfReady(room);
    }

    socket.join(room.id);
    socket.emit("room:joined", publicRoom(room, socket.user.id));
    emitRoom(room);
  });

  socket.on("room:leave", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = (room.players || []).find((p) => p.id === socket.user.id);
    if (!player) return;

    socket.leave(room.id);

    if (room.game === "domino") {
      handleDominoPlayerLeave(room, socket.user.id);
      socket.emit("rooms:list", roomList());
      return;
    }

    if ((room.game === "carrom" || room.game === "billiards") && Number(room.maxPlayers || 2) === 4) {
      handleBeta4PlayerLeaveV138(room, socket.user.id);
      socket.emit("rooms:list", roomList());
      return;
    }

    room.players = (room.players || []).filter((p) => p.id !== socket.user.id);
    if (room.players.length === 0) {
      rooms.delete(room.id);
      io.emit("rooms:list", roomList());
      return;
    }
    if (room.status === "playing" && room.players.length === 1) {
      finishRoom(room, room.players[0].id);
      return;
    }
    emitRoomState(room);
  });

  socket.on("chat:send", ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const clean = String(text || "").trim().slice(0, 200);
    if (!clean) return;

    const message = {
      id: makeId("msg"),
      userId: socket.user.id,
      username: socket.user.username,
      text: clean,
      at: new Date().toISOString()
    };

    room.chat.push(message);
    io.to(room.id).emit("chat:new", message);
  });

  // V137O_LIVE_MIC_ALL_GAMES_MESH_SAFE:
  // السيرفر لا يسجل ولا يخزن الصوت. هو فقط قناة إشارات WebRTC داخل نفس الغرفة، مع توجيه مخصص لكل لاعب في غرف 2/4.
  socket.on("voice:offer", ({ roomId, toUserId, offer }) => {
    const room = rooms.get(roomId);
    if (!room || !offer) return;
    emitVoiceSignalV137O(socket, room, "voice:offer", { offer }, toUserId);
  });

  socket.on("voice:answer", ({ roomId, toUserId, answer }) => {
    const room = rooms.get(roomId);
    if (!room || !answer) return;
    emitVoiceSignalV137O(socket, room, "voice:answer", { answer }, toUserId);
  });

  socket.on("voice:ice", ({ roomId, toUserId, candidate }) => {
    const room = rooms.get(roomId);
    if (!room || !candidate) return;
    emitVoiceSignalV137O(socket, room, "voice:ice", { candidate }, toUserId);
  });

  socket.on("voice:mute", ({ roomId, muted }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    emitVoiceSignalV137O(socket, room, "voice:muted", { muted: !!muted }, null);
  });

  socket.on("domino:play", ({ roomId, tile, side }) => {
    const room = rooms.get(roomId);
    if (!room || room.game !== "domino") return;

    const result = playDomino(room, socket.user.id, tile, side);
    if (!result.ok) return socket.emit("error:message", result.error);

    playBotIfNeeded(room);
    scheduleDominoTurnTimer(room);
    emitRoom(room);
  });

  socket.on("domino:skip", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.game !== "domino") return;

    const result = skipDominoTurn(room, socket.user.id);
    if (!result.ok) return socket.emit("error:message", result.error);

    playBotIfNeeded(room);
    scheduleDominoTurnTimer(room);
    emitRoom(room);
  });

  socket.on("chess:move", ({ roomId, from, to, promotion }) => {
    const room = rooms.get(roomId);
    if (!room || room.game !== "chess") return;
    if (room.status !== "playing") return socket.emit("error:message", "GAME_NOT_STARTED");

    try {
      const turnColor = room.chess.turn();
      const expectedPlayer = (room.players || [])[turnColor === "w" ? 0 : 1];
      if (!expectedPlayer || String(expectedPlayer.id) !== String(socket.user.id)) {
        return socket.emit("error:message", "NOT_YOUR_CHESS_TURN");
      }

      const move = room.chess.move({
        from,
        to,
        promotion: promotion || "q"
      });

      if (!move) return socket.emit("error:message", "INVALID_CHESS_MOVE");

      if (room.chess.isGameOver()) {
        finishChessIfGameOverV138(room, socket.user.id);
      } else {
        playChessBotIfNeeded(room);
        scheduleChessTurnTimerV138H(room);
      }

      emitRoom(room);
    } catch {
      socket.emit("error:message", "INVALID_CHESS_MOVE");
    }
  });


  // V137K_REALTIME_CARROM_BILLIARDS_STATE_SYNC_SAFE:
  // مزامنة حالة الطاولة والضربات للكِيرم والبلياردو بين لاعبين حقيقيين.
  // السيرفر لا يعيد حساب الفيزياء ولا يغيّر قوانين اللعب؛ يستقبل snapshot صغيرة من العميل صاحب الحركة
  // ويبثها لباقي اللاعبين في نفس الغرفة مع حفظ آخر حالة داخل room.beta.realtimeState.
  socket.on("beta:state", ({ roomId, game, state }) => {
    const room = rooms.get(roomId);
    if (!room || !["carrom", "billiards"].includes(room.game)) return;
    if (String(game || room.game) !== room.game) return socket.emit("error:message", "ROOM_GAME_MODE_MISMATCH");
    const player = (room.players || []).find((p) => p.id === socket.user.id);
    if (!player) return socket.emit("error:message", "NOT_IN_ROOM");
    if (room.status !== "playing" && room.status !== "finished") return;

    const safeState = state && typeof state === "object" ? state : {};
    room.beta = room.beta || {};
    if (!room.beta.turnUserId) setBetaTurnV138(room, (room.players || [])[0]?.id);
    if (room.beta.turnUserId && String(room.beta.turnUserId) !== String(socket.user.id)) {
      return socket.emit("error:message", "ليس دورك الآن");
    }

    const seq = Number(safeState.seq || Date.now());
    const previousSeq = Number(room?.beta?.realtimeSeq || 0);
    if (seq < previousSeq) return;

    room.beta.realtimeRoomsV137A = true;
    room.beta.realtimeSyncV137K = true;
    room.beta.serverTurnGuardV138 = true;
    room.beta.realtimeSeq = seq;
    room.beta.realtimeState = {
      ...safeState,
      seq,
      game: room.game,
      roomId: room.id,
      fromUserId: socket.user.id,
      fromUsername: socket.user.username,
      turnUserId: room.beta.turnUserId || null,
      turnUsername: room.beta.turnUsername || null,
      serverAt: new Date().toISOString()
    };
    room.beta.lastAction = `${socket.user.username} حدّث حالة ${room.game === "carrom" ? "الكيرم" : "البلياردو"}`;

    if (safeState.turnDone === true || safeState.nextTurn === true || safeState.shotComplete === true) {
      advanceBetaTurnV138(room);
      room.beta.realtimeState.nextTurnUserId = room.beta.turnUserId || null;
      room.beta.realtimeState.nextTurnUsername = room.beta.turnUsername || null;
    }
    scheduleBetaTurnTimerV138H(room);

    socket.to(room.id).emit("beta:state", room.beta.realtimeState);
    socket.emit("beta:state:ack", { roomId: room.id, seq, turnUserId: room.beta.turnUserId || null });
    // V138AQ_BILLIARDS_REALTIME_FLOOD_JITTER_FIX_SAFE:
    // لا نرسل room:update مع كل beta:state حتى لا يعمل App.setRoom مع كل فريم.
    if (safeState.turnDone === true || safeState.nextTurn === true || safeState.shotComplete === true) {
      emitRoom(room);
    }
  });

  socket.on("beta:finish", ({ roomId, winnerId, reason }) => {
    const room = rooms.get(roomId);
    if (!room || !["carrom", "billiards"].includes(room.game)) return;
    const player = (room.players || []).find((p) => p.id === socket.user.id);
    if (!player) return socket.emit("error:message", "NOT_IN_ROOM");
    if (room.status !== "playing") return socket.emit("error:message", "GAME_NOT_STARTED");
    const safeWinnerId = String(winnerId || socket.user.id);
    const winner = (room.players || []).find((p) => String(p.id) === safeWinnerId) || player;
    room.beta = room.beta || {};
    room.beta.serverFinishGuardV138 = true;
    room.beta.lastFinishReasonV137K = String(reason || "انتهت المباراة").slice(0, 140);
    finishRoom(room, winner.id);
  });

  socket.on("beta:score", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !["carrom", "billiards"].includes(room.game)) return;

    if (room.beta?.turnUserId && String(room.beta.turnUserId) !== String(socket.user.id)) return socket.emit("error:message", "ليس دورك الآن");
    const index = room.players.findIndex((p) => p.id === socket.user.id);
    if (index === 0) room.beta.scoreA += 1;
    if (index === 1) room.beta.scoreB += 1;
    advanceBetaTurnV138(room);
    scheduleBetaTurnTimerV138H(room);

    room.beta.lastAction = `${socket.user.username} سجل نقطة`;
    botMaybeComment(room, "goodHuman");
    emitRoom(room);
  });

  socket.on("disconnect", () => {
    // V136IJ_DOMINO_FINISH_DISCONNECT_CLEAN_SAFE:
    // لا نترك socket قديم كأنه متصل بعد انقطاع اللاعب.
    for (const room of rooms.values()) {
      const player = (room.players || []).find((p) => p.id === socket.user.id);
      if (!player) continue;

      if (player.socketId === socket.id) {
        player.socketId = null;
        player.disconnectedAt = Date.now();
      }

      if (room.game === "domino") {
        if (!room.domino) room.domino = {};
        room.domino.autoMessage = `${player.username || "لاعب"} انقطع اتصاله`;
      }

      emitRoomState(room);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("============================================");
  console.log("✅ Ana Alafdal server is running");
  console.log("🌐 http://localhost:" + PORT);
  console.log("============================================");
});
