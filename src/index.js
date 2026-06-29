// V393B_SUPPORT_REPLY_SAFE: player sees replies from app management only; owner can clear content and reply without exposing identity.
// V391_DELETE_SUPPORT_MESSAGE_SAFE: owner can delete resolved support messages from admin inbox.
// V390_SUPPORT_IMAGE_ATTACHMENT_SAFE: support messages can include one private image shown only in owner inbox.
// V388B_FIX_ADMIN_SUPPORT_OWNER_ACCOUNT_SAFE: make hady22333 owner; owner email is private server-side only.
// V388_ADMIN_SUPPORT_INBOX_SAFE: owner-only admin inbox for support messages.
// V375_SUPPORT_SUGGESTIONS_HEADER_SAFE: save support/suggestions/complaints messages in db.supportMessagesV375.
// V294_GAME_ISOLATION_APP_SERVER_READY: عزل قناة beta المشتركة بين الكيرم والبلياردو على السيرفر حسب room.game/state.game/kind.
// V269_CARROM_ONLINE_BOT_3S_SERVER_DELEGATE_READY: يسمح لجهاز اللاعب الحقيقي بتنفيذ ضربة بوت الكيرم عندما يكون turnUserId للبوت بدل انتظار مؤقت 15 ثانية.
// V262_BILLIARDS4_TEAM_WIN_PAYOUT_READY: بلياردو 4 شراكة 0+2 ضد 1+3، فوز وجائزة للفريق.
// V260B_CARROM4_TEAM_WIN_PAYOUT_SAFE: كيرم 4 شراكة 0+2 ضد 1+3، فوز وجائزة للفريق.
// V201_AUTH_EMAIL_PHONE_LOGIN_REGISTER_READY: server accepts email/phone/username auth.\n// V138J_REAL_INVITE_ALL_GAMES_DEEPLINK_READY_SAFE
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

// V416A_SECURITY_HARDENING_LOCAL_READY
// حماية إنتاج: لا أسرار داخل الكود، CORS مضبوط، rate limit، وهيدرات أمنية بدون تغيير قوانين اللعب.
const IS_PRODUCTION_V416A = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const DEFAULT_DEV_JWT_SECRET_V416A = "ana_alafdal_dev_secret_change_later";

function isWeakJwtSecretV416A(value) {
  const s = String(value || "");
  return !s || s === DEFAULT_DEV_JWT_SECRET_V416A || s.length < 32;
}

if (IS_PRODUCTION_V416A && isWeakJwtSecretV416A(JWT_SECRET)) {
  console.error("V416A_SECURITY: ضع JWT_SECRET قوي في .env على سيرفر الإنتاج قبل التشغيل.");
  process.exit(1);
} else if (isWeakJwtSecretV416A(JWT_SECRET)) {
  console.warn("V416A_SECURITY: JWT_SECRET الحالي مناسب للتطوير فقط، لا تستخدمه للإنتاج.");
}

const ALLOWED_ORIGINS_V416A = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

function corsOriginV416A(origin, callback) {
  // تطبيقات الموبايل غالبًا لا ترسل Origin، لذلك نسمح للـ no-origin.
  if (!origin) return callback(null, true);
  if (ALLOWED_ORIGINS_V416A.length === 0 && !IS_PRODUCTION_V416A) return callback(null, true);
  if (ALLOWED_ORIGINS_V416A.includes(origin)) return callback(null, true);
  return callback(null, false);
}

function securityHeadersV416A(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}

function clientIpV416A(req) {
  const xf = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xf || req.socket?.remoteAddress || req.ip || "unknown";
}

const httpRateBucketsV416A = new Map();

function makeRateLimitV416A(name, windowMs, max, message) {
  return (req, res, next) => {
    if (req.path === "/health") return next();

    const now = Date.now();
    const userKey = req.user?.id ? `u:${req.user.id}` : `ip:${clientIpV416A(req)}`;
    const key = `${name}:${userKey}`;

    let bucket = httpRateBucketsV416A.get(key);
    if (!bucket || now > bucket.resetAt) bucket = { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    httpRateBucketsV416A.set(key, bucket);

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "RATE_LIMIT",
        message: message || "طلبات كثيرة، حاول لاحقًا.",
        retryAfter
      });
    }

    next();
  };
}

const globalRateLimitV416A = makeRateLimitV416A("global", 15 * 60 * 1000, 900, "طلبات كثيرة على السيرفر، حاول بعد قليل.");
const authRateLimitV416A = makeRateLimitV416A("auth", 10 * 60 * 1000, 20, "محاولات دخول/تسجيل كثيرة، انتظر قليلًا.");
const economyRateLimitV416A = makeRateLimitV416A("economy", 10 * 60 * 1000, 90, "طلبات كوينز كثيرة، انتظر قليلًا.");
const socialRateLimitV416A = makeRateLimitV416A("social", 5 * 60 * 1000, 120, "نشاط اجتماعي كثير، انتظر قليلًا.");
const uploadRateLimitV416A = makeRateLimitV416A("upload", 15 * 60 * 1000, 12, "رفع ملفات كثير، انتظر قليلًا.");
const adminRateLimitV416A = makeRateLimitV416A("admin", 10 * 60 * 1000, 80, "طلبات إدارة كثيرة، انتظر قليلًا.");
const MAX_ACCOUNTS_PER_DEVICE_V138G = 999999; // V194B_DISABLE_3_ACCOUNTS_LIMIT_READY: limit disabled temporarily
function normalizeDeviceIdV138G(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

// V138J_REAL_INVITE_ALL_GAMES_DEEPLINK_READY_SAFE
// V448A_PUBLIC_INVITE_RENDER_REDIRECT_READY: رابط الدعوة الافتراضي عبر Render ثم يحوّل إلى Google Play.
const PLAY_STORE_URL_V138J = process.env.PLAY_STORE_URL || "https://play.google.com/store/apps/details?id=com.hadiapps.anaalafdal";
const INVITE_BASE_URL_V138J = process.env.INVITE_BASE_URL || "https://ana-alafdal-server.onrender.com/invite";
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
// اقتصاد تحدي عملات حقيقي على السيرفر: خصم تحدي العملات عند بداية المباراة، وتجميع pot، وتسليم الجائزة للفائز/الفريق.
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
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeadersV416A);
app.use(cors({
  origin: corsOriginV416A,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));
app.use(globalRateLimitV416A);
app.use(express.json({ limit: "35mb" }));
const UPLOADS_DIR_V154 = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOADS_DIR_V154, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR_V154));


// V138_REMOTE_CONFIG_SAFE: تحديث بيانات التطبيق من السيرفر بدون تحديث Google Play
app.get("/app-config", (req, res) => {
  res.json({
    ok: true,
    configVersion: 2,
    appMessage: "مرحبًا بك في أنا الأفضل 👑",
    updateMessage: "تم تحديث بيانات التطبيق بنجاح ✅",
    maintenance: false,
    minSupportedVersion: "1.0.0",
    dailyCoins: 1000,
    rewardedAdCoins: 1500,
    rewardedDailyLimit: 50,
    rewardedCooldownMinutes: 5,
    featureFlagsVersion: 2,
    // V434A_REMOTE_UI_CONFIG_READY: إعدادات واجهة يتحكم بها Render ويطبقها زر تحديث البيانات.
    uiConfigVersion: 1,
    ui: {
      giftButtonBottom: 88,
      giftButtonBottomBilliards: 82
    },
    // V435_UPDATE_DATA_NOTICE_CONFIG_READY: إشعار تطوير يظهر على زر تحديث البيانات من Render.
    updateNoticeVersion: 1,
    updateNotice: {
      enabled: true,
      type: "ready",
      badgeText: "جديد",
      title: "✨ تطوير جديد",
      message: "تم تجهيز تحسينات جديدة: رفع زر الهدايا فوق أزرار الهاتف، وربط إعدادات التطوير بزر تحديث البيانات.",
      showBadgeOnRefreshButton: true
    },
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
      bannerAds: true,
      postInterstitialAds: true,
      privateChatInterstitialAds: true,
      vipSubscriptions: true, // V415A_VIP_MONTHLY_FOUNDATION_NO_ADS_DAILY_BONUS_GIFT_DISCOUNT_SAFE
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
// V416A_SECURITY_HARDENING_LOCAL_READY: CORS/body parser/rate-limit moved before routes.

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOriginV416A, methods: ["GET", "POST"] }
});

const connectedUserSocketsV137O = new Map();

const voiceCountryCodesV475B = [ // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
  "YE", "SA", "AE", "QA", "KW", "BH", "OM", "IQ", "SY", "JO", "PS", "LB",
  "EG", "SD", "LY", "TN", "DZ", "MA", "MR", "SO", "DJ", "KM"
];

const voiceCountryParticipantsV475B = new Map(); // code -> Map(userId -> participant) V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
const voiceCountryMessagesV475C = new Map(); // code -> messages[] V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
const voiceCountryReportsV475D = []; // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
const voiceCountryMuteMemoryV475D = new Map(); // userId -> Set(targetUserId) V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
const voiceCountryRecentTextV475D = new Map(); // userId:code -> last text/time V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
const voiceCountryVoiceStatesV475E1 = new Map(); // code -> Map(userId -> voiceState) V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
const voiceCountrySocketIndexV475F2 = new Map(); // socketId -> { userId, code, at } V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
const VOICE_COUNTRY_MAX_MESSAGES_V475C = 100; // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
const VOICE_COUNTRY_MESSAGE_TTL_MS_V475G7D_R3 = 6 * 60 * 60 * 1000; // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
const VOICE_COUNTRY_REPORT_KEEP_MS_V475G7D_R3 = 7 * 24 * 60 * 60 * 1000; // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
const VOICE_COUNTRY_REPORT_DUPLICATE_MS_V475G7D_R3 = 24 * 60 * 60 * 1000; // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
const VOICE_COUNTRY_REPORT_SPAM_WINDOW_MS_V475G7D_R3 = 60 * 60 * 1000; // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
const VOICE_COUNTRY_REPORT_SPAM_LIMIT_V475G7D_R3 = 8; // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
const VOICE_COUNTRY_REPORT_HIDE_THRESHOLD_V475G7D_R3 = 3; // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
const VOICE_COUNTRY_REPORT_PRIORITY_THRESHOLD_V475G7D_R3 = 5; // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE_BASE

const VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2 = 4; // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
const VOICE_COUNTRY_HAND_QUEUE_MAX_V476D1_R2 = 50; // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
const voiceCountrySpeakerIdsV476D1R2 = new Map(); // code -> Set(userId) // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
const voiceCountryHandQueueV476D1R2 = new Map(); // code -> userId[] // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
 // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE // V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
const VOICE_COUNTRY_REPORTS_MAX_V475D = 500; // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
const VOICE_COUNTRY_DUPLICATE_WINDOW_MS_V475D = 15000; // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
const VOICE_COUNTRY_MUTE_TTL_MS_V475F1 = 24 * 60 * 60 * 1000; // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
const VOICE_COUNTRY_REPORTS_DB_MAX_V475F1 = 1000; // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE

function getLiveSocketIdsV475F2() { // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
  try {
    return new Set(Array.from(io?.sockets?.sockets?.keys?.() || []));
  } catch {
    return new Set();
  }
}

function emitVoiceCountryCleanupRefreshV475F2(codes) { // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
  const list = Array.from(codes || []).filter(Boolean);

  for (const code of list) {
    try { emitVoiceCountryStateV475B(code); } catch {}
    try { emitVoiceCountryVoiceStatesV475E1(code); } catch {}
  }

  try { emitVoiceCountryListV475B(); } catch {}
}

function removeVoiceCountryPresenceForSocketV475F2(socket, reason = "cleanup") { // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
  const socketId = String(socket?.id || "");
  const userId = String(socket?.user?.id || "");
  const changedCodes = new Set();

  if (!socketId && !userId) return 0;

  try {
    for (const [code, map] of Array.from(voiceCountryParticipantsV475B.entries())) {
      if (!(map instanceof Map)) continue;

      for (const [key, participant] of Array.from(map.entries())) {
        const pSocketId = String(participant?.socketId || "");
        const pUserId = String(participant?.userId || participant?.id || key || "");

        if ((socketId && pSocketId === socketId) || (userId && pUserId === userId && (!pSocketId || pSocketId === socketId))) {
          map.delete(key);
          changedCodes.add(code);
          if (pSocketId) voiceCountrySocketIndexV475F2.delete(pSocketId);
        }
      }

      if (map.size === 0) voiceCountryParticipantsV475B.delete(code);
    }
  } catch {}

  try {
    for (const [code, map] of Array.from(voiceCountryVoiceStatesV475E1.entries())) {
      if (!(map instanceof Map)) continue;

      for (const [key, state] of Array.from(map.entries())) {
        const sSocketId = String(state?.socketId || "");
        const sUserId = String(state?.userId || key || "");

        if ((socketId && sSocketId === socketId) || (userId && sUserId === userId && (!sSocketId || sSocketId === socketId))) {
          map.delete(key);
          changedCodes.add(code);
        }
      }

      if (map.size === 0) voiceCountryVoiceStatesV475E1.delete(code);
    }
  } catch {}

  if (socketId) voiceCountrySocketIndexV475F2.delete(socketId);
  if (changedCodes.size > 0) emitVoiceCountryCleanupRefreshV475F2(changedCodes);

  return changedCodes.size;
}

function removeVoiceCountryPresenceForUserEverywhereV475F2(userId, exceptSocketId = "") { // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
  const safeUserId = String(userId || "");
  const safeExceptSocketId = String(exceptSocketId || "");
  const changedCodes = new Set();

  if (!safeUserId) return 0;

  try {
    for (const [code, map] of Array.from(voiceCountryParticipantsV475B.entries())) {
      if (!(map instanceof Map)) continue;

      for (const [key, participant] of Array.from(map.entries())) {
        const pUserId = String(participant?.userId || participant?.id || key || "");
        const pSocketId = String(participant?.socketId || "");

        if (pUserId === safeUserId && (!safeExceptSocketId || pSocketId !== safeExceptSocketId)) {
          map.delete(key);
          changedCodes.add(code);
          if (pSocketId) voiceCountrySocketIndexV475F2.delete(pSocketId);
        }
      }

      if (map.size === 0) voiceCountryParticipantsV475B.delete(code);
    }
  } catch {}

  try {
    for (const [code, map] of Array.from(voiceCountryVoiceStatesV475E1.entries())) {
      if (!(map instanceof Map)) continue;

      for (const [key, state] of Array.from(map.entries())) {
        const sUserId = String(state?.userId || key || "");
        const sSocketId = String(state?.socketId || "");

        if (sUserId === safeUserId && (!safeExceptSocketId || sSocketId !== safeExceptSocketId)) {
          map.delete(key);
          changedCodes.add(code);
        }
      }

      if (map.size === 0) voiceCountryVoiceStatesV475E1.delete(code);
    }
  } catch {}

  if (changedCodes.size > 0) emitVoiceCountryCleanupRefreshV475F2(changedCodes);
  return changedCodes.size;
}

function pruneVoiceCountryGhostPresenceV475F2(reason = "interval") { // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
  const live = getLiveSocketIdsV475F2();
  const changedCodes = new Set();

  try {
    for (const [code, map] of Array.from(voiceCountryParticipantsV475B.entries())) {
      if (!(map instanceof Map)) continue;

      for (const [key, participant] of Array.from(map.entries())) {
        const pSocketId = String(participant?.socketId || "");
        if (pSocketId && live.has(pSocketId)) continue;

        map.delete(key);
        changedCodes.add(code);
        if (pSocketId) voiceCountrySocketIndexV475F2.delete(pSocketId);
      }

      if (map.size === 0) voiceCountryParticipantsV475B.delete(code);
    }
  } catch {}

  try {
    for (const [code, map] of Array.from(voiceCountryVoiceStatesV475E1.entries())) {
      if (!(map instanceof Map)) continue;

      const participantMap = voiceCountryParticipantsV475B.get(code) || new Map();

      for (const [key, state] of Array.from(map.entries())) {
        const sSocketId = String(state?.socketId || "");
        const sUserId = String(state?.userId || key || "");
        const hasLiveSocket = sSocketId && live.has(sSocketId);
        const hasParticipant = participantMap.has(sUserId);

        if (!hasLiveSocket || !hasParticipant) {
          map.delete(key);
          changedCodes.add(code);
        }
      }

      if (map.size === 0) voiceCountryVoiceStatesV475E1.delete(code);
    }
  } catch {}

  if (changedCodes.size > 0) emitVoiceCountryCleanupRefreshV475F2(changedCodes);
  return changedCodes.size;
}

try {
  if (!global.__voiceCountryPresenceCleanupV475F2) {
    global.__voiceCountryPresenceCleanupV475F2 = setInterval(() => {
      pruneVoiceCountryGhostPresenceV475F2("interval");
    }, 25000);

    if (global.__voiceCountryPresenceCleanupV475F2?.unref) {
      global.__voiceCountryPresenceCleanupV475F2.unref();
    }
  }
} catch {}

function getVoiceCountryVoiceMapV475E1(code) { // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  if (!safeCode) return new Map();

  if (!voiceCountryVoiceStatesV475E1.has(safeCode)) {
    voiceCountryVoiceStatesV475E1.set(safeCode, new Map());
  }

  return voiceCountryVoiceStatesV475E1.get(safeCode);
}

function makeVoiceCountryVoiceStatesV475E1(code) { // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  const map = safeCode ? getVoiceCountryVoiceMapV475E1(safeCode) : new Map();

  return Array.from(map.values()).map((s) => ({
    userId: String(s?.userId || ""),
    username: String(s?.username || "لاعب"),
    muted: !!s?.muted,
    speaking: !!s?.speaking,
    at: Number(s?.at || Date.now())
  }));
}

function emitVoiceCountryVoiceStatesV475E1(code) { // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  if (!safeCode) return;

  try {
    io.to(`voiceCountry:${safeCode}`).emit("voiceCountry:voiceStates", {
      code: safeCode,
      states: makeVoiceCountryVoiceStatesV475E1(safeCode)
    });
  } catch {}
}

function setVoiceCountryVoiceStateV475E1(socket, code, patch = {}) { // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || socket?.voiceCountryCodeV475B || "");
  if (!safeCode || !socket?.user?.id) return null;

  const userId = String(socket.user.id);
  const map = getVoiceCountryVoiceMapV475E1(safeCode);

  const next = {
    userId,
    socketId: String(socket.id || ""), // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
    username: String(socket.user.username || "لاعب"),
    muted: patch.muted !== undefined ? !!patch.muted : true,
    speaking: patch.speaking !== undefined ? !!patch.speaking : false,
    at: Date.now()
  };

  if (next.muted) next.speaking = false;

  map.set(userId, next);
  return next;
}

function clearVoiceCountryVoiceStateV475E1(socket, code) { // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || socket?.voiceCountryCodeV475B || "");
  const userId = String(socket?.user?.id || "");
  if (!safeCode || !userId) return;

  const map = getVoiceCountryVoiceMapV475E1(safeCode);
  map.delete(userId);
  emitVoiceCountryVoiceStatesV475E1(safeCode);
}

function normalizeVoiceCountryCodeV475B(value) { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
  const code = String(value || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return voiceCountryCodesV475B.includes(code) ? code : "";
}

function getVoiceCountryMapV475B(code) { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  if (!safeCode) return null;
  if (!voiceCountryParticipantsV475B.has(safeCode)) voiceCountryParticipantsV475B.set(safeCode, new Map());
  return voiceCountryParticipantsV475B.get(safeCode);
}

function makeVoiceCountryListV475B() { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
  return voiceCountryCodesV475B.map((code) => ({
    code,
    count: Number((voiceCountryParticipantsV475B.get(code) || new Map()).size || 0)
  }));
}


function getVoiceCountrySpeakerSetV476D1R2(code) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return new Set();
  if (!voiceCountrySpeakerIdsV476D1R2.has(safeCode)) voiceCountrySpeakerIdsV476D1R2.set(safeCode, new Set());
  return voiceCountrySpeakerIdsV476D1R2.get(safeCode);
}

function getVoiceCountryHandQueueV476D1R2(code) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return [];
  if (!voiceCountryHandQueueV476D1R2.has(safeCode)) voiceCountryHandQueueV476D1R2.set(safeCode, []);
  return voiceCountryHandQueueV476D1R2.get(safeCode);
}

function cleanupVoiceCountrySpeakerQueueV476D1R2(code) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return;
  const participants = getVoiceCountryMapV475B(safeCode);
  const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);

  Array.from(speakerSet).forEach((id) => {
    if (!participants.has(String(id))) speakerSet.delete(String(id));
  });

  const queue = getVoiceCountryHandQueueV476D1R2(safeCode);
  const seen = new Set();
  const fresh = queue
    .map((id) => String(id || ""))
    .filter((id) => !!id && participants.has(id) && !speakerSet.has(id) && !seen.has(id) && seen.add(id))
    .slice(0, VOICE_COUNTRY_HAND_QUEUE_MAX_V476D1_R2);

  queue.splice(0, queue.length, ...fresh);
}

function removeFromVoiceCountryHandQueueV476D1R2(code, userId) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  const uid = String(userId || "");
  if (!safeCode || !uid) return;
  const queue = getVoiceCountryHandQueueV476D1R2(safeCode);
  queue.splice(0, queue.length, ...queue.filter((id) => String(id) !== uid));
}

function addToVoiceCountryHandQueueV476D1R2(code, userId) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  const uid = String(userId || "");
  if (!safeCode || !uid) return 0;
  cleanupVoiceCountrySpeakerQueueV476D1R2(safeCode);

  const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);
  if (speakerSet.has(uid)) return 0;

  const queue = getVoiceCountryHandQueueV476D1R2(safeCode);
  if (!queue.includes(uid)) queue.push(uid);
  while (queue.length > VOICE_COUNTRY_HAND_QUEUE_MAX_V476D1_R2) queue.pop();

  return queue.indexOf(uid) + 1;
}

function setVoiceCountrySpeakerVoiceStateV476D1R2(code, userId, muted = true, speaking = false) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  const uid = String(userId || "");
  if (!safeCode || !uid) return null;

  const participants = getVoiceCountryMapV475B(safeCode);
  const p = participants.get(uid) || {};
  const voiceMap = getVoiceCountryVoiceMapV475E1(safeCode);
  const cur = voiceMap.get(uid) || {};

  const next = {
    ...cur,
    userId: uid,
    username: String(p?.username || cur?.username || "لاعب").slice(0, 60),
    avatarUri: String(p?.avatarUri || cur?.avatarUri || ""),
    muted: !!muted,
    speaking: !!speaking && !muted,
    updatedAt: Date.now()
  };

  voiceMap.set(uid, next);
  return next;
}

function emitVoiceCountryNoticeToUserV476D1R2(code, userId, message) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  const uid = String(userId || "");
  const msg = String(message || "");
  if (!safeCode || !uid || !msg) return;

  try {
    for (const [sid, row] of voiceCountrySocketIndexV475F2.entries()) {
      if (row && String(row.userId || "") === uid && normalizeVoiceCountryCodeV475B(row.code || "") === safeCode) {
        io.to(String(sid)).emit("voiceCountry:notice", { ok: true, message: msg });
      }
    }
  } catch {}
}

function promoteNextVoiceCountrySpeakerV476D1R2(code) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return "";

  cleanupVoiceCountrySpeakerQueueV476D1R2(safeCode);

  const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);
  if (speakerSet.size >= VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2) return "";

  const queue = getVoiceCountryHandQueueV476D1R2(safeCode);
  const participants = getVoiceCountryMapV475B(safeCode);

  while (queue.length && speakerSet.size < VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2) {
    const nextId = String(queue.shift() || "");
    if (!nextId || !participants.has(nextId) || speakerSet.has(nextId)) continue;

    speakerSet.add(nextId);
    setVoiceCountrySpeakerVoiceStateV476D1R2(safeCode, nextId, true, false);
    emitVoiceCountryNoticeToUserV476D1R2(safeCode, nextId, "تم صعودك للمنصة 🎙️ افتح المايك عندما يأتي دورك");
    return nextId;
  }

  return "";
}

function removeVoiceCountrySpeakerAndQueueV476D1R2(code, userId, promoteNext = true) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  const uid = String(userId || "");
  if (!safeCode || !uid) return;

  const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);
  speakerSet.delete(uid);
  removeFromVoiceCountryHandQueueV476D1R2(safeCode, uid);
  setVoiceCountrySpeakerVoiceStateV476D1R2(safeCode, uid, true, false);

  if (promoteNext) promoteNextVoiceCountrySpeakerV476D1R2(safeCode);
}

function makeVoiceCountryHandQueuePublicV476D1R2(code) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return [];

  cleanupVoiceCountrySpeakerQueueV476D1R2(safeCode);
  const participants = getVoiceCountryMapV475B(safeCode);

  return getVoiceCountryHandQueueV476D1R2(safeCode).slice(0, VOICE_COUNTRY_HAND_QUEUE_MAX_V476D1_R2).map((uid, index) => {
    const p = participants.get(String(uid)) || {};
    return {
      userId: String(uid),
      username: String(p?.username || "لاعب").slice(0, 60),
      position: index + 1
    };
  });
}

function isVoiceCountryModeratorV476D1R2(socket) { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  try {
    const uid = String(socket?.user?.id || "");
    const dbUser = (db.users || []).find((u) => String(u.id) === uid) || socket?.user || {};
    return !!(
      dbUser?.owner ||
      dbUser?.isOwner ||
      dbUser?.admin ||
      dbUser?.isAdmin ||
      String(dbUser?.role || "").toLowerCase().includes("admin") ||
      String(dbUser?.role || "").toLowerCase().includes("owner") ||
      String(dbUser?.role || "").toLowerCase().includes("founder")
    );
  } catch {
    return false;
  }
}


function makeVoiceCountryStateV475B(code) { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  const map = safeCode ? (voiceCountryParticipantsV475B.get(safeCode) || new Map()) : new Map();

  if (safeCode) cleanupVoiceCountrySpeakerQueueV476D1R2(safeCode);

  const speakerSetV476D1R2 = safeCode ? getVoiceCountrySpeakerSetV476D1R2(safeCode) : new Set();
  const handQueueIdsV476D1R2 = safeCode ? getVoiceCountryHandQueueV476D1R2(safeCode) : [];

  const participants = Array.from(map.values()).slice(0, 80).map((p) => {
    const uid = String(p?.userId || p?.id || "");
    const isSpeaker = !!uid && speakerSetV476D1R2.has(uid);
    const handPos = uid ? handQueueIdsV476D1R2.indexOf(uid) : -1;

    return {
      ...p,
      voiceRoleV476D1R2: isSpeaker ? "speaker" : "listener",
      isSpeakerV476D1R2: isSpeaker,
      handRaisedV476D1R2: handPos >= 0,
      handQueuePositionV476D1R2: handPos >= 0 ? handPos + 1 : 0
    };
  });

  return {
    code: safeCode,
    count: Number(map.size || 0),
    maxSpeakersV476D1R2: VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2,
    speakerCountV476D1R2: Number(speakerSetV476D1R2.size || 0),
    speakerIdsV476D1R2: Array.from(speakerSetV476D1R2).slice(0, VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2),
    handQueueV476D1R2: makeVoiceCountryHandQueuePublicV476D1R2(safeCode),
    participants
  };
}

function getVoiceCountryMessagesV475C(code) { // V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  if (!safeCode) return [];
  if (!voiceCountryMessagesV475C.has(safeCode)) voiceCountryMessagesV475C.set(safeCode, []);
  return voiceCountryMessagesV475C.get(safeCode);
}

function pushVoiceCountryMessageV475C(code, message) { // V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  if (!safeCode || !message) return [];
  const list = cleanupVoiceCountryMessagesV475G7DR3(safeCode); // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  list.push(message);
  while (list.length > VOICE_COUNTRY_MAX_MESSAGES_V475C) list.shift();
  voiceCountryMessagesV475C.set(safeCode, list);
  return list;
}

function makeVoiceCountryMessageV475C(socket, code, text) { // V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  const cleanText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const db = readDb();
  const dbUser = (db.users || []).find((u) => String(u.id) === String(socket?.user?.id));
  const participant = makeVoiceCountryParticipantV475B3(socket, dbUser);
  const hidden = !!participant.hiddenProfile || participant.canAddFriend === false;

  return {
    id: `vcm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code: safeCode,
    userId: hidden ? "" : String(participant.userId || participant.id || ""),
    username: hidden ? "لاعب مخفي" : String(participant.username || participant.name || "لاعب"),
    avatarUri: hidden ? "" : String(participant.avatarUri || participant.avatarUrl || participant.photoUrl || ""),
    hiddenProfile: hidden,
    canAddFriend: !hidden,
    text: cleanText,
    createdAt: Date.now()
  };
}


function isVoiceCountryMessageExpiredV475G7DR3(message) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  const createdAt = Number(message?.createdAt || 0);
  if (!createdAt) return false;
  return Date.now() - createdAt > VOICE_COUNTRY_MESSAGE_TTL_MS_V475G7D_R3;
}

function cleanupVoiceCountryMessagesV475G7DR3(code) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return [];
  const list = getVoiceCountryMessagesV475C(safeCode);
  const fresh = list.filter((m) => !isVoiceCountryMessageExpiredV475G7DR3(m));
  if (fresh.length !== list.length) {
    list.splice(0, list.length, ...fresh);
    voiceCountryMessagesV475C.set(safeCode, list);
  }
  while (list.length > VOICE_COUNTRY_MAX_MESSAGES_V475C) list.shift();
  return list;
}

function getVisibleVoiceCountryMessagesV475G7DR3(code) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  return cleanupVoiceCountryMessagesV475G7DR3(code)
    .filter((m) => !m?.hiddenByReportsV475G7DR3 && !m?.hiddenByReportsV475G7DR2 && !m?.hiddenByReportsV475G7D)
    .slice(-VOICE_COUNTRY_MAX_MESSAGES_V475C);
}

function cleanupVoiceCountryReportsListV475G7DR3(list) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  const fresh = list.filter((row) => {
    const at = Number(row?.createdAt || 0);
    return !!at && now - at < VOICE_COUNTRY_REPORT_KEEP_MS_V475G7D_R3;
  });
  if (fresh.length !== list.length) list.splice(0, list.length, ...fresh);
  return list;
}

function cleanupVoiceCountryReportsDbV475G7DR3(db) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  const list = normalizeVoiceCountryPersistListV475F1(db.voiceCountryReportsV475F1);
  cleanupVoiceCountryReportsListV475G7DR3(list);
  db.voiceCountryReportsV475F1 = list;
  return list;
}

function makeVoiceCountryReportGuardV475G7DR3({ code, messageId, reporterId, reportedUserId } = {}) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  const safeMessageId = String(messageId || "");
  const safeReporterId = String(reporterId || "");
  const safeReportedUserId = String(reportedUserId || "");
  const now = Date.now();

  if (!safeCode || !safeMessageId || !safeReporterId) return { ok: false, message: "تعذر تسجيل البلاغ" };
  if (safeReportedUserId && safeReportedUserId === safeReporterId) return { ok: false, message: "لا يمكنك الإبلاغ عن رسالتك" };

  const db = readDb();
  const reports = cleanupVoiceCountryReportsDbV475G7DR3(db);
  writeDb(db);

  const duplicate = reports.some((row) =>
    String(row?.code || "") === safeCode &&
    String(row?.messageId || "") === safeMessageId &&
    String(row?.reporterId || "") === safeReporterId &&
    now - Number(row?.createdAt || 0) < VOICE_COUNTRY_REPORT_DUPLICATE_MS_V475G7D_R3
  );
  if (duplicate) return { ok: false, message: "تم تسجيل بلاغك على هذه الرسالة مسبقًا ✅" };

  const reporterRecentCount = reports.filter((row) =>
    String(row?.reporterId || "") === safeReporterId &&
    now - Number(row?.createdAt || 0) < VOICE_COUNTRY_REPORT_SPAM_WINDOW_MS_V475G7D_R3
  ).length;
  if (reporterRecentCount >= VOICE_COUNTRY_REPORT_SPAM_LIMIT_V475G7D_R3) {
    return { ok: false, message: "تم تهدئة البلاغات مؤقتًا بسبب كثرة البلاغات السريعة" };
  }

  const sameMessageReports = reports.filter((row) =>
    String(row?.code || "") === safeCode &&
    String(row?.messageId || "") === safeMessageId
  );

  const uniqueReporters = new Set(sameMessageReports.map((row) => String(row?.reporterId || "")).filter(Boolean));
  uniqueReporters.add(safeReporterId);

  const uniqueCount = uniqueReporters.size;
  const hideMessage = uniqueCount >= VOICE_COUNTRY_REPORT_HIDE_THRESHOLD_V475G7D_R3;
  const priority = uniqueCount >= VOICE_COUNTRY_REPORT_PRIORITY_THRESHOLD_V475G7D_R3 ? "high" : "normal";

  return {
    ok: true,
    uniqueReportersAfter: uniqueCount,
    hideMessage,
    priority,
    status: hideMessage ? "hidden_pending_review" : "recorded"
  };
}

function hideVoiceCountryMessageByReportsV475G7DR3(code, messageId, uniqueReportersAfter) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  const safeMessageId = String(messageId || "");
  if (!safeCode || !safeMessageId) return false;
  const list = cleanupVoiceCountryMessagesV475G7DR3(safeCode);
  const msg = list.find((m) => String(m?.id || "") === safeMessageId);
  if (!msg) return false;
  msg.hiddenByReportsV475G7DR3 = true;
  msg.hiddenByReportsV475G7D = true;
  msg.reportStatusV475G7DR3 = "hidden_pending_review";
  msg.reportUniqueCountV475G7DR3 = Number(uniqueReportersAfter || 0);
  msg.hiddenAtV475G7DR3 = Date.now();
  return true;
}

function normalizeVoiceCountryPersistListV475F1(value) { // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
  return Array.isArray(value) ? value : [];
}

function persistVoiceCountryReportV475F1(report) { // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
  try {
    const db = readDb();
    const list = normalizeVoiceCountryPersistListV475F1(db.voiceCountryReportsV475F1);
    cleanupVoiceCountryReportsListV475G7DR3(list); // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE

    list.push({
      id: `vcr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      code: String(report?.code || ""),
      messageId: String(report?.messageId || ""),
      reporterId: String(report?.reporterId || ""),
      reportedUserId: String(report?.reportedUserId || ""),
      reportedUsername: String(report?.reportedUsername || "لاعب"),
      textPreview: String(report?.textPreview || "").slice(0, 160),
      reason: String(report?.reason || "message_report").slice(0, 100),
      createdAt: Number(report?.createdAt || Date.now()),
      status: String(report?.status || "recorded"),
      uniqueReporters: Number(report?.uniqueReporters || 1),
      priority: String(report?.priority || "normal"),
      hiddenByReports: !!report?.hiddenByReports
    });

    while (list.length > VOICE_COUNTRY_REPORTS_DB_MAX_V475F1) list.shift();

    db.voiceCountryReportsV475F1 = list;
    writeDb(db);
    return true;
  } catch (err) {
    return false;
  }
}

function cleanupVoiceCountryMutesV475F1(db) { // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
  const now = Date.now();
  const list = normalizeVoiceCountryPersistListV475F1(db.voiceCountryMutesV475F1);

  db.voiceCountryMutesV475F1 = list.filter((row) => {
    const at = Number(row?.mutedAt || 0);
    if (!at) return false;
    return now - at < VOICE_COUNTRY_MUTE_TTL_MS_V475F1;
  });

  return db.voiceCountryMutesV475F1;
}

function persistVoiceCountryMuteV475F1(userId, targetUserId, code, targetUsername) { // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
  const ownerId = String(userId || "");
  const targetId = String(targetUserId || "");
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");

  if (!ownerId || !targetId || ownerId === targetId) return false;

  try {
    const db = readDb();
    const list = cleanupVoiceCountryMutesV475F1(db);
    const now = Date.now();

    const existing = list.find((row) =>
      String(row?.ownerId || "") === ownerId &&
      String(row?.targetUserId || "") === targetId
    );

    if (existing) {
      existing.code = safeCode || String(existing.code || "");
      existing.targetUsername = String(targetUsername || existing.targetUsername || "لاعب").slice(0, 60);
      existing.mutedAt = now;
      existing.expiresAt = now + VOICE_COUNTRY_MUTE_TTL_MS_V475F1;
    } else {
      list.push({
        id: `vcm_${now}_${Math.random().toString(36).slice(2, 8)}`,
        ownerId,
        targetUserId: targetId,
        targetUsername: String(targetUsername || "لاعب").slice(0, 60),
        code: safeCode,
        mutedAt: now,
        expiresAt: now + VOICE_COUNTRY_MUTE_TTL_MS_V475F1
      });
    }

    db.voiceCountryMutesV475F1 = list;
    writeDb(db);
    return true;
  } catch (err) {
    return false;
  }
}

function getVoiceCountryMutesForUserV475F1(userId, code) { // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
  const ownerId = String(userId || "");
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");

  if (!ownerId) return [];

  try {
    const db = readDb();
    const list = cleanupVoiceCountryMutesV475F1(db);
    writeDb(db);

    return list
      .filter((row) => {
        const sameOwner = String(row?.ownerId || "") === ownerId;
        const rowCode = String(row?.code || "");
        return sameOwner && (!safeCode || !rowCode || rowCode === safeCode);
      })
      .map((row) => ({
        targetUserId: String(row?.targetUserId || ""),
        targetUsername: String(row?.targetUsername || "لاعب"),
        code: String(row?.code || ""),
        mutedAt: Number(row?.mutedAt || 0),
        expiresAt: Number(row?.expiresAt || 0)
      }))
      .filter((row) => !!row.targetUserId);
  } catch (err) {
    return [];
  }
}

function normalizeVoiceCountryModerationTextV475D(text) { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function cleanVoiceCountryTextV475D(text) { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
  const clean = normalizeVoiceCountryModerationTextV475D(text);
  const lowered = clean.toLowerCase();

  const blockedWords = [
    "fuck",
    "shit",
    "كلب",
    "حمار",
    "لعنة",
    "قذر"
  ];

  const hit = blockedWords.find((w) => lowered.includes(String(w).toLowerCase()));
  if (hit) {
    return { ok: false, text: clean, reason: "blocked_word" };
  }

  return { ok: true, text: clean, reason: "" };
}

function isVoiceCountryDuplicateMessageV475D(socket, code, text) { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
  const userId = String(socket?.user?.id || socket?.id || "guest");
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  const normalized = normalizeVoiceCountryModerationTextV475D(text).toLowerCase();
  const key = `${userId}:${safeCode}`;
  const now = Date.now();
  const last = voiceCountryRecentTextV475D.get(key);

  voiceCountryRecentTextV475D.set(key, { text: normalized, at: now });

  if (!last) return false;
  return last.text === normalized && now - Number(last.at || 0) < VOICE_COUNTRY_DUPLICATE_WINDOW_MS_V475D;
}

function findVoiceCountryMessageV475D(code, messageId) { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  const list = getVoiceCountryMessagesV475C(safeCode);
  return list.find((m) => String(m?.id || "") === String(messageId || "")) || null;
}

function pushVoiceCountryReportV475D(report) { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
  voiceCountryReportsV475D.push({
    ...report,
    createdAt: Date.now()
  });

  while (voiceCountryReportsV475D.length > VOICE_COUNTRY_REPORTS_MAX_V475D) {
    voiceCountryReportsV475D.shift();
  }

  try { persistVoiceCountryReportV475F1({ ...report, createdAt: Date.now() }); } catch {} // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
  return voiceCountryReportsV475D.length;
}

function addVoiceCountryMuteV475D(userId, targetUserId) { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
  const owner = String(userId || "");
  const target = String(targetUserId || "");

  if (!owner || !target || owner === target) return false;

  if (!voiceCountryMuteMemoryV475D.has(owner)) {
    voiceCountryMuteMemoryV475D.set(owner, new Set());
  }

  voiceCountryMuteMemoryV475D.get(owner).add(target);
  return true;
}

function makeVoiceCountryParticipantV475B3(socket, dbUser) { // V475B3_COUNTRY_ROOM_PLAYER_CARD_PRIVACY_SAFE
  const hidden = !!dbUser?.voiceCountryProfileHiddenV475B3;
  const socketId = String(socket?.id || "");
  const realId = String(socket?.user?.id || dbUser?.id || "");
  if (hidden) {
    return {
      id: `hidden_${socketId}`,
      userId: "",
      username: "لاعب مخفي",
      name: "لاعب مخفي",
      hiddenProfile: true,
      canAddFriend: false,
      avatarUri: "",
      avatarUrl: "",
      photoUrl: "",
      socketId,
      joinedAt: Date.now()
    };
  }

  const avatar = String( // V475C1_COUNTRY_NAME_AVATAR_FALLBACK_SAFE
    dbUser?.avatarUri ||
    dbUser?.avatarUrl ||
    dbUser?.photoUrl ||
    dbUser?.imageUrl ||
    dbUser?.profileImageUrl ||
    dbUser?.profilePhotoUrl ||
    dbUser?.picture ||
    dbUser?.avatar ||
    socket?.user?.avatarUri ||
    socket?.user?.avatarUrl ||
    socket?.user?.photoUrl ||
    socket?.user?.imageUrl ||
    socket?.user?.profileImageUrl ||
    socket?.user?.profilePhotoUrl ||
    socket?.user?.picture ||
    socket?.user?.avatar ||
    ""
  );

  const username = String( // V475C1_COUNTRY_NAME_AVATAR_FALLBACK_SAFE
    dbUser?.displayName ||
    dbUser?.name ||
    dbUser?.username ||
    socket?.user?.displayName ||
    socket?.user?.name ||
    socket?.user?.username ||
    "لاعب"
  );
  return {
    id: realId,
    userId: realId,
    username,
    name: username,
    avatarUri: avatar,
    avatarUrl: avatar,
    photoUrl: avatar,
    countryCode: String(dbUser?.countryCode || "YE"),
    friendsCount: Array.isArray(dbUser?.friends) ? dbUser.friends.length : 0,
    hiddenProfile: false,
    canAddFriend: true,
    socketId,
    joinedAt: Date.now()
  };
}

function emitVoiceCountryListV475B() { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
  io.emit("voiceCountry:list", makeVoiceCountryListV475B());
}

function emitVoiceCountryStateV475B(code) { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
  const safeCode = normalizeVoiceCountryCodeV475B(code);
  if (!safeCode) return;
  io.to(`voiceCountry:${safeCode}`).emit("voiceCountry:state", makeVoiceCountryStateV475B(safeCode));
}

function leaveVoiceCountryRoomV475B(socket, reason) { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
  const prevCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
  if (!prevCode) return;
  const map = getVoiceCountryMapV475B(prevCode);
  const userId = String(socket?.user?.id || "");
  if (map && userId) {
    const current = map.get(userId);
    if (!current || String(current.socketId || "") === String(socket.id || "")) map.delete(userId);
  }
  removeVoiceCountrySpeakerAndQueueV476D1R2(prevCode, socket.user?.id, true); // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
  try { socket.leave(`voiceCountry:${prevCode}`); } catch {}
  socket.voiceCountryCodeV475B = "";
  emitVoiceCountryStateV475B(prevCode);
  emitVoiceCountryListV475B();
}

const socketCooldownsV416A = new Map();

function socketCooldownV416A(socket, key, ms) {
  const userId = String(socket?.user?.id || socket.id || "anon");
  const safeKey = `sock:${userId}:${String(key || "event")}`;
  const now = Date.now();
  const last = Number(socketCooldownsV416A.get(safeKey) || 0);

  if (last && now - last < ms) {
    const waitMs = ms - (now - last);
    try {
      socket.emit("error:message", `انتظر ${Math.ceil(waitMs / 1000)} ثانية قبل المحاولة مرة أخرى`);
    } catch {}
    return true;
  }

  socketCooldownsV416A.set(safeKey, now);

  if (socketCooldownsV416A.size > 20000) {
    const cutoff = now - 30 * 60 * 1000;
    for (const [k, v] of socketCooldownsV416A.entries()) {
      if (Number(v) < cutoff) socketCooldownsV416A.delete(k);
    }
  }

  return false;
}

function isRoomPlayerV416A(room, userId) {
  return (room?.players || []).some((p) => String(p?.id) === String(userId));
}

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
  if (!Array.isArray(db.posts)) db.posts = [];
  if (!Array.isArray(db.postReports)) db.postReports = [];
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
    countryCode: user.countryCode || "YE",
    vipLevel: Number(user.vipLevel || 0),
    vipActivatedAt: user.vipActivatedAt || "",
    vipExpiresAt: user.vipExpiresAt || "",
    vipSubscriptionStatus: user.vipSubscriptionStatus || "",
    vipPlan: user.vipPlan || "",
    vipDailyBonusDate: user.vipDailyBonusDate || "",
    vipProductId: user.vipProductId || "",
    vipPlanTitle: getVipPlanTitleV454(user),
    vipAdFree: isVipSubscriptionActiveV415A(user),
    vipGiftAccess: getVipGiftAccessV454(user),
    vipGiftUsageV454: sanitizeGiftUsageV454(user.vipGiftUsageV454),
    giftStats: user.giftStats || { sent: 0, received: 0 },
    voiceCountryProfileHiddenV475B3: !!user.voiceCountryProfileHiddenV475B3, // V475B3_COUNTRY_ROOM_PLAYER_CARD_PRIVACY_SAFE
    walletLog: Array.isArray(user.walletLog) ? user.walletLog.slice(0, 30) : [],
    tasks: user.tasks || {}
  };
}


// V368_POSTS_AUDIENCE_PRIVACY_SAFE: server-side post audience public/friends/private.
const POST_REPORT_HIDE_LIMIT_V149 = 3;

function postReportCountV149(db, postId) {
  return Array.isArray(db.postReports)
    ? db.postReports.filter((r) => String(r.postId) === String(postId)).length
    : 0;
}

function shouldHidePostByReportsV149(db, post, viewerId) {
  if (!post || !post.id) return false;
  if (String(post.userId) === String(viewerId)) return false;
  return postReportCountV149(db, post.id) >= POST_REPORT_HIDE_LIMIT_V149;
}

function normalizePostVisibilityV368(value) {
  const v = String(value || "public").trim().toLowerCase();
  if (v === "friends" || v === "friend") return "friends";
  if (v === "private" || v === "me" || v === "only_me") return "private";
  return "public";
}

function canViewPostV368(db, post, viewer) {
  if (!post || !viewer) return false;
  const viewerId = String(viewer.id || "");
  const ownerId = String(post.userId || "");
  if (ownerId === viewerId) return true;
  if (post.hiddenByOwner) return false;

  const visibility = normalizePostVisibilityV368(post.visibility || post.privacy || post.audience || "public");
  if (visibility === "public") return true;
  if (visibility === "private") return false;

  const owner = Array.isArray(db.users) ? db.users.find((u) => String(u.id) === ownerId) : null;
  const ownerFriends = Array.isArray(owner?.friends) ? owner.friends.map(String) : [];
  const viewerFriends = Array.isArray(viewer?.friends) ? viewer.friends.map(String) : [];

  return ownerFriends.includes(viewerId) || viewerFriends.includes(ownerId);
}

function publicPostV143(db, post, viewerId) {
  const owner = db.users.find((u) => String(u.id) === String(post.userId)) || {};
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const commentsPreview = comments.slice(-3).reverse().map((c) => {
    const cu = db.users.find((u) => String(u.id) === String(c.userId)) || {};
    return {
      id: c.id,
      userId: c.userId,
      username: cu.username || "لاعب",
      countryCode: cu.countryCode || "YE",
      text: String(c.text || ""),
      createdAt: c.createdAt || "",
      canDelete: String(c.userId) === String(viewerId)
    };
  });

  return {
    id: post.id,
    userId: post.userId,
    username: owner.username || "لاعب",
    countryCode: owner.countryCode || "YE",
    avatarUri: owner.avatarUri || "",
    text: String(post.text || ""),
    mediaUrl: String(post.mediaUrl || ""),
    mediaType: String(post.mediaType || ""),
    visibility: normalizePostVisibilityV368(post.visibility || post.privacy || post.audience || "public"),
    createdAt: post.createdAt || "",
    likes: likes.length,
    likedByMe: likes.map(String).includes(String(viewerId)),
    canDelete: String(post.userId) === String(viewerId),
    commentsCount: comments.length,
    commentsPreview,
    reportCount: String(post.userId) === String(viewerId) ? postReportCountV149(db, post.id) : 0,
    hiddenByReports: shouldHidePostByReportsV149(db, post, viewerId),
    hiddenByOwner: !!post.hiddenByOwner
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


// V201_AUTH_EMAIL_PHONE_LOGIN_REGISTER_READY:
// دخول/تسجيل بإيميل أو رقم جوال أو اسم مستخدم، مع بقاء الحسابات القديمة.
function normalizePhoneV201(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let v = raw.replace(/[\s\-()]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "";
  return v.startsWith("+") ? "+" + digits : digits;
}

function looksEmailV201(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

function makeUsernameBaseV201(value) {
  const raw = String(value || "player").trim().toLowerCase();
  const beforeAt = raw.includes("@") ? raw.split("@")[0] : raw;
  const clean = beforeAt.replace(/[^a-z0-9_\u0600-\u06FF]/gi, "").slice(0, 18);
  return clean.length >= 3 ? clean : "player";
}

function makeUniqueUsernameV201(db, baseValue) {
  const base = makeUsernameBaseV201(baseValue);
  let username = base;
  let i = 1;
  while (db.users.some((u) => String(u.username || "").toLowerCase() === username.toLowerCase())) {
    username = (base + i).slice(0, 22);
    i += 1;
  }
  return username;
}

function findUserByIdentifierV201(db, value) {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase();
  const phone = normalizePhoneV201(raw);
  return db.users.find((u) => {
    const uName = String(u.username || "").toLowerCase();
    const uEmail = String(u.email || "").toLowerCase();
    const uPhone = normalizePhoneV201(u.phone || u.mobile || "");
    return uName === key || (!!uEmail && uEmail === key) || (!!phone && !!uPhone && uPhone === phone);
  });
}

app.post("/auth/register", authRateLimitV416A, async (req, res) => {
  const rawIdentifier = String(req.body.identifier || req.body.username || req.body.email || req.body.phone || "").trim();
  const rawUsername = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  let email = String(req.body.email || "").trim().toLowerCase();
  let phone = normalizePhoneV201(req.body.phone || "");
  const deviceId = normalizeDeviceIdV138G(req.body.deviceId);
  const inviteCodeV138J = normalizeInviteCodeV138J(req.body.inviteCode);
  const registerCountryCodeV227 = String(req.body.countryCode || "YE").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "YE";

  if (!rawIdentifier && !email && !phone) {
    return res.status(400).json({ error: "CONTACT_REQUIRED" });
  }

  if (!email && looksEmailV201(rawIdentifier)) {
    email = rawIdentifier.toLowerCase();
  }

  if (!phone) {
    phone = normalizePhoneV201(rawIdentifier);
  }

  if (email && !looksEmailV201(email)) {
    return res.status(400).json({ error: "EMAIL_INVALID" });
  }

  const rawLooksPhone = /[0-9]/.test(rawIdentifier) && rawIdentifier.replace(/\D/g, "").length >= 7;
  if (!phone && rawLooksPhone && !looksEmailV201(rawIdentifier)) {
    return res.status(400).json({ error: "PHONE_INVALID" });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
  }

  if (!deviceId) {
    return res.status(400).json({ error: "DEVICE_ID_REQUIRED" });
  }

  const db = readDb();
  db.devices = db.devices || {};

  let username = rawUsername;
  if (looksEmailV201(username) || normalizePhoneV201(username)) username = "";
  if (!username) username = makeUniqueUsernameV201(db, email || phone || rawIdentifier);
  if (username.length < 3) {
    return res.status(400).json({ error: "USERNAME_TOO_SHORT" });
  }

  const deviceRecord = db.devices[deviceId] || { userIds: [], createdAt: new Date().toISOString() };
  const activeDeviceUsers = (deviceRecord.userIds || []).filter((id) => db.users.some((u) => u.id === id));

  if (false && activeDeviceUsers.length >= MAX_ACCOUNTS_PER_DEVICE_V138G) {
    return res.status(429).json({ error: "DEVICE_ACCOUNT_LIMIT" });
  }

  const exists = db.users.find((u) => {
    const sameUsername = String(u.username || "").toLowerCase() === username.toLowerCase();
    const sameEmail = !!email && String(u.email || "").toLowerCase() === email;
    const samePhone = !!phone && normalizePhoneV201(u.phone || u.mobile || "") === phone;
    return sameUsername || sameEmail || samePhone;
  });

  if (exists) {
    if (String(exists.username || "").toLowerCase() === username.toLowerCase()) return res.status(409).json({ error: "USERNAME_EXISTS" });
    if (email && String(exists.email || "").toLowerCase() === email) return res.status(409).json({ error: "EMAIL_EXISTS" });
    return res.status(409).json({ error: "PHONE_EXISTS" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: makeId("user"),
    username,
    email,
    phone,
    passwordHash,
    deviceId,
    authMethods: {
      password: true,
      email: !!email,
      phone: !!phone,
      google: false,
      facebook: false,
      tiktok: false
    },
    inviteCode: "",
    referredBy: "",
    referredByCode: inviteCodeV138J || "",
    points: 0,
    coins: 10000,
    wins: 0,
    losses: 0,
    level: 1,
    vipLevel: 0,
    walletLog: [],
    tasks: {},
    avatarUri: "",
    countryCode: /^[A-Z]{2}$/.test(registerCountryCodeV227) ? registerCountryCodeV227 : "YE",
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

app.post("/auth/login", authRateLimitV416A, async (req, res) => {
  const identifier = String(req.body.identifier || req.body.username || req.body.email || req.body.phone || "").trim();
  const password = String(req.body.password || "");
  const deviceId = normalizeDeviceIdV138G(req.body.deviceId);



  if (!identifier || !password) {
    return res.status(400).json({ error: "CONTACT_REQUIRED" });
  }

  const db = readDb();
  const user = findUserByIdentifierV201(db, identifier);

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
    "افتح التطبيق واكتب كود الدعوة عند التسجيل.",
    "حمّل التطبيق من Google Play:",
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

app.get("/invite", (req, res) => {
  const code = normalizeInviteCodeV138J(req.query.code);
  const game = String(req.query.game || "").trim().slice(0, 30);
  const roomId = String(req.query.room || req.query.roomId || "").trim().slice(0, 80);
  try {
    const storeUrl = new URL(PLAY_STORE_URL_V138J);
    const refParts = [];
    if (code) refParts.push(`inviteCode=${encodeURIComponent(code)}`);
    if (game) refParts.push(`game=${encodeURIComponent(game)}`);
    if (roomId) refParts.push(`room=${encodeURIComponent(roomId)}`);
    if (refParts.length) storeUrl.searchParams.set("referrer", refParts.join("&"));
    return res.redirect(302, storeUrl.toString());
  } catch {
    return res.redirect(302, PLAY_STORE_URL_V138J);
  }
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

app.post("/economy/claim-daily", requireAuth, economyRateLimitV416A, (req, res) => {
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

app.post("/economy/claim-rewarded-ad", requireAuth, economyRateLimitV416A, (req, res) => {
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



app.post("/economy/claim-task", requireAuth, economyRateLimitV416A, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const taskId = String(req.body.taskId || "").slice(0, 40);
  const rewards = {
    login: 500,
    play_match: 800,
    send_message: 600,
    invite_friend: 1200,
    post_share: 700,
    like_post: 400
  };

  const added = Number(rewards[taskId] || 0);
  if (!added) return res.status(400).json({ error: "TASK_NOT_FOUND", message: "المهمة غير موجودة." });

  const today = todayKeyV138REAL();
  user.tasks = user.tasks || {};
  user.tasks[today] = user.tasks[today] || {};

  if (user.tasks[today][taskId]) {
    return res.status(409).json({
      error: "TASK_ALREADY_CLAIMED",
      message: "استلمت جائزة هذه المهمة اليوم بالفعل.",
      user: publicUser(user),
      tasks: user.tasks[today]
    });
  }

  user.tasks[today][taskId] = new Date().toISOString();
  user.coins = Number(user.coins || 0) + added;
  user.walletLog = Array.isArray(user.walletLog) ? user.walletLog : [];
  user.walletLog.unshift({ type: "task", taskId, coins: added, at: new Date().toISOString() });
  user.walletLog = user.walletLog.slice(0, 30);

  writeDb(db);
  emitUserUpdateV136IK(user.id);

  res.json({
    ok: true,
    type: "task",
    taskId,
    addedCoins: added,
    user: publicUser(user),
    tasks: user.tasks[today]
  });
});

// V454_SUBSCRIPTION_GIFTS_ONLY_NO_COIN_PRICES
// الخطط الشهرية الجديدة: 19.99 هدايا كاملة، 9.99 هدية واحدة من كل نوع، 3.99 بدون إعلانات فقط.
const VIP_SUBSCRIPTION_DAYS_V415A = 30;
const VIP_MONTHLY_PRICE_COINS_V415A = 0; // V454: لم يعد VIP يُشترى بالكويـنز.
const VIP_DAILY_BONUS_COINS_V415A = 0; // V454: لا توجد مكافأة كوينز ضمن خطط الاشتراك الجديدة.
const VIP_GIFT_DISCOUNT_PERCENT_V415A = 0; // V454: لا يوجد خصم هدايا؛ الهدايا بالاشتراك فقط.

const VIP_PLANS_V454 = {
  no_ads_399: {
    planId: "no_ads_399",
    productId: "ana_vip_no_ads_monthly_399",
    priceUsd: "3.99",
    level: 1,
    title: "بدون إعلانات",
    noAds: true,
    giftAccess: "none"
  },
  gifts_one_each_999: {
    planId: "gifts_one_each_999",
    productId: "ana_vip_gifts_one_each_monthly_999",
    priceUsd: "9.99",
    level: 2,
    title: "بدون إعلانات + هدية واحدة من كل نوع",
    noAds: true,
    giftAccess: "one_each"
  },
  gifts_unlimited_1999: {
    planId: "gifts_unlimited_1999",
    productId: "ana_vip_gifts_unlimited_monthly_1999",
    priceUsd: "19.99",
    level: 3,
    title: "بدون إعلانات + جميع الهدايا",
    noAds: true,
    giftAccess: "unlimited"
  }
};

const VIP_GIFT_TYPES_V454 = {
  royal_lion_8s: "الأسد الملكي",
  legend_lion_15s: "الأسد الأسطوري",
  super_car_15s: "السيارة الأسطورية",
  royal_heart_5s: "القلب الملكي", // V474G_SERVER_READY_ROYAL_HEART_SAFE
  royal_rose_5s: "الوردة الملكية", // V474G_SERVER_READY_ROYAL_ROSE_SAFE
  royal_fireworks_15s: "الألعاب النارية الملكية",
  royal_wolf_15s: "الذئب الأسطوري",
  royal_horse_15s: "الخيل الملكي",
  royal_crown_15s: "التاج الملكي"
};

function isVipSubscriptionActiveV415A(user) {
  const status = String(user?.vipSubscriptionStatus || "").toLowerCase();
  const expiresMs = user?.vipExpiresAt ? new Date(user.vipExpiresAt).getTime() : 0;
  return status === "active" && Number.isFinite(expiresMs) && expiresMs > Date.now();
}

function addVipDaysV415A(baseIso, days) {
  const baseMs = baseIso ? new Date(baseIso).getTime() : 0;
  const safeBase = Number.isFinite(baseMs) && baseMs > Date.now() ? baseMs : Date.now();
  return new Date(safeBase + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeVipPlanIdV454(value) {
  const raw = String(value || "").trim();
  if (raw === "1" || raw === "no_ads" || raw === "no_ads_399" || raw === "ana_vip_no_ads_monthly_399") return "no_ads_399";
  if (raw === "2" || raw === "gifts_one_each" || raw === "gifts_one_each_999" || raw === "ana_vip_gifts_one_each_monthly_999") return "gifts_one_each_999";
  if (raw === "3" || raw === "gifts_unlimited" || raw === "gifts_unlimited_1999" || raw === "ana_vip_gifts_unlimited_monthly_1999") return "gifts_unlimited_1999";
  return raw;
}

function getVipPlanV454(user) {
  if (!isVipSubscriptionActiveV415A(user)) return null;
  const planId = normalizeVipPlanIdV454(user?.vipPlan || user?.vipProductId || user?.vipLevel);
  return VIP_PLANS_V454[planId] || null;
}

function getVipPlanTitleV454(user) {
  const plan = getVipPlanV454(user);
  return plan ? plan.title : "";
}

function getVipGiftAccessV454(user) {
  const plan = getVipPlanV454(user);
  return plan ? plan.giftAccess : "none";
}

function sanitizeGiftUsageV454(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const out = {};
  Object.keys(VIP_GIFT_TYPES_V454).forEach((giftType) => {
    const n = Math.max(0, Math.floor(Number(input[giftType] || 0) || 0));
    if (n > 0) out[giftType] = n;
  });
  return out;
}

function canSendSubscriptionGiftV454(user, giftType) {
  const plan = getVipPlanV454(user);
  if (!plan || plan.giftAccess === "none") {
    return { ok: false, code: "VIP_GIFT_PLAN_REQUIRED", message: "🎁 إرسال الهدايا يحتاج اشتراك الهدايا: فعّل خطة 9.99 أو 19.99." }; // V475G7C3_GIFT_SUBSCRIPTION_NOTICE_CLEAR_SAFE
  }
  if (!VIP_GIFT_TYPES_V454[giftType]) {
    return { ok: false, code: "GIFT_NOT_READY", message: "هذه الهدية غير متاحة." };
  }
  if (plan.giftAccess === "unlimited") {
    return { ok: true, plan, usageAfter: null };
  }
  if (plan.giftAccess === "one_each") {
    const usage = sanitizeGiftUsageV454(user.vipGiftUsageV454);
    const used = Math.max(0, Math.floor(Number(usage[giftType] || 0) || 0));
    if (used >= 1) {
      return { ok: false, code: "VIP_GIFT_TYPE_ALREADY_USED", message: "خطة 9.99 تسمح بهدية واحدة من كل نوع خلال مدة الاشتراك." };
    }
    usage[giftType] = used + 1;
    return { ok: true, plan, usageAfter: usage };
  }
  return { ok: false, code: "VIP_GIFT_PLAN_REQUIRED", message: "خطة الاشتراك الحالية لا تسمح بإرسال الهدايا." };
}

app.post("/vip/activate", requireAuth, economyRateLimitV416A, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const requestedPlanId = normalizeVipPlanIdV454(req.body?.planId || req.body?.plan || req.body?.productId || req.body?.level);
  const plan = VIP_PLANS_V454[requestedPlanId];
  if (!plan) {
    return res.status(400).json({
      error: "INVALID_VIP_PLAN",
      message: "خطة الاشتراك غير صحيحة.",
      plans: Object.values(VIP_PLANS_V454),
      user: publicUser(user)
    });
  }

  const allowInternalActivationV454 = String(process.env.ALLOW_INTERNAL_VIP_ACTIVATE_V454 || "").toLowerCase() === "true";
  if (!allowInternalActivationV454) {
    return res.status(402).json({
      error: "GOOGLE_PLAY_BILLING_REQUIRED",
      message: "هذه الخطط شهرية بالدولار وتحتاج ربط Google Play Billing قبل التفعيل الحقيقي. لم يتم خصم كوينز.",
      plan,
      user: publicUser(user)
    });
  }

  const wasActive = isVipSubscriptionActiveV415A(user);
  const nextExpiresAt = addVipDaysV415A(user.vipExpiresAt, VIP_SUBSCRIPTION_DAYS_V415A);

  user.vipLevel = Math.max(Number(user.vipLevel || 0), Number(plan.level || 1));
  user.vipActivatedAt = user.vipActivatedAt || new Date().toISOString();
  user.vipSubscriptionStatus = "active";
  user.vipPlan = plan.planId;
  user.vipProductId = plan.productId;
  user.vipExpiresAt = nextExpiresAt;
  user.vipGiftUsageV454 = {};
  user.walletLog = Array.isArray(user.walletLog) ? user.walletLog : [];
  user.walletLog.unshift({
    type: "vip_subscription_internal_test_v454",
    plan: plan.planId,
    productId: plan.productId,
    priceUsd: plan.priceUsd,
    coins: 0,
    days: VIP_SUBSCRIPTION_DAYS_V415A,
    expiresAt: nextExpiresAt,
    at: new Date().toISOString()
  });
  user.walletLog = user.walletLog.slice(0, 30);

  writeDb(db);
  emitUserUpdateV136IK(user.id);

  res.json({
    ok: true,
    type: "vip_subscription_v454_internal_test",
    plan,
    days: VIP_SUBSCRIPTION_DAYS_V415A,
    expiresAt: nextExpiresAt,
    message: wasActive ? "تم تمديد خطة الاشتراك 30 يوم ✅" : "تم تفعيل خطة الاشتراك 30 يوم ✅",
    user: publicUser(user)
  });
});

app.post("/vip/claim-daily-bonus", requireAuth, economyRateLimitV416A, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  return res.status(410).json({
    error: "VIP_DAILY_BONUS_DISABLED_V454",
    message: "خطط V454 الجديدة لا تحتوي على مكافأة كوينز يومية. المزايا الآن: بدون إعلانات والهدايا حسب الخطة.",
    user: publicUser(user)
  });
});





function ensureOwnerEmailV388B(db) {
  if (!db || !Array.isArray(db.users)) return false;

  const owner = db.users.find((u) => String(u.username || "").trim().toLowerCase() === "hady22333");
  if (!owner) return false;

  let changed = false;

  if (String(owner.email || "").trim().toLowerCase() !== "hadyalhsamy6@gmail.com") {
    owner.email = "hadyalhsamy6@gmail.com";
    changed = true;
  }

  owner.isAdmin = true;
  owner.role = "owner";

  return changed;
}

function isSupportAdminV388(user) {
  if (!user) return false;

  const id = String(user.id || "");
  const email = String(user.email || "").trim().toLowerCase();
  const username = String(user.username || "").trim().toLowerCase();
  const role = String(user.role || "").trim().toLowerCase();

  const envIds = String(process.env.ANA_ADMIN_USER_IDS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const envEmails = String(process.env.ANA_ADMIN_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  if (user.isAdmin === true || role === "admin" || role === "owner") return true;
  if (envIds.includes(id)) return true;
  if (envEmails.includes(email)) return true;

  // صاحب التطبيق الحالي
  if (email === "hadyalhsamy6@gmail.com") return true;
  if (username === "hady22333") return true;
  if (username === "hadyalhsamy6") return true;

  return false;
}

function publicMySupportMessageV393(m) {
  const hasReply = !!String(m.adminReplyText || "").trim();
  return {
    id: String(m.id || ""),
    type: String(m.type || "suggestion"),
    text: String(m.text || ""),
    mediaUrl: String(m.mediaUrl || ""),
    mediaType: String(m.mediaType || ""),
    status: String(m.status || "new"),
    adminReplyText: String(m.adminReplyText || ""),
    adminReplyFrom: hasReply ? "إدارة التطبيق" : "",
    adminReplyAt: String(m.adminReplyAt || ""),
    createdAt: String(m.createdAt || "")
  };
}

function publicSupportMessageV388(m) {
  return {
    id: String(m.id || ""),
    userId: String(m.userId || ""),
    username: String(m.username || "لاعب"),
    countryCode: String(m.countryCode || "YE"),
    type: String(m.type || "suggestion"),
    text: String(m.text || ""),
    sourceScreen: String(m.sourceScreen || ""),
    mediaUrl: String(m.mediaUrl || ""),
    mediaType: String(m.mediaType || ""),
    adminReplyText: String(m.adminReplyText || ""),
    adminReplyFrom: String(m.adminReplyText || "").trim() ? "إدارة التطبيق" : "",
    adminReplyAt: String(m.adminReplyAt || ""),
    status: String(m.status || "new"),
    createdAt: String(m.createdAt || "")
  };
}

app.get("/support/my/messages", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const messages = db.supportMessagesV375
    .filter((m) => String(m.userId) === String(me.id))
    .filter((m) => !Array.isArray(m.hiddenForUserIds) || !m.hiddenForUserIds.map((x) => String(x)).includes(String(me.id)))
    .slice(0, 100)
    .map(publicMySupportMessageV393);

  res.json({ ok: true, messages });
});

app.delete("/support/my/messages/:messageId", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const messageId = String(req.params.messageId || "");
  const msg = db.supportMessagesV375.find((m) => String(m.id) === messageId && String(m.userId) === String(me.id));

  if (!msg) {
    return res.status(404).json({ error: "SUPPORT_MESSAGE_NOT_FOUND", message: "الرسالة غير موجودة." });
  }

  const hiddenForUserIds = Array.isArray(msg.hiddenForUserIds) ? msg.hiddenForUserIds.map((x) => String(x)) : [];
  if (!hiddenForUserIds.includes(String(me.id))) hiddenForUserIds.push(String(me.id));
  msg.hiddenForUserIds = hiddenForUserIds;
  msg.hiddenForUserAt = new Date().toISOString();

  writeDb(db);

  res.json({ ok: true, message: "تم حذف الرسالة من عندك فقط.", deletedId: messageId });
});

app.get("/admin/support/messages", requireAuth, adminRateLimitV416A, (req, res) => {
  const db = readDb();
  if (ensureOwnerEmailV388B(db)) writeDb(db);
  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });
  if (!isSupportAdminV388(me)) {
    return res.status(403).json({ error: "ADMIN_ONLY", message: "هذه الصفحة لصاحب التطبيق فقط." });
  }

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const messages = db.supportMessagesV375
    .slice(0, 300)
    .map(publicSupportMessageV388);

  res.json({
    ok: true,
    isAdmin: true,
    total: db.supportMessagesV375.length,
    messages
  });
});

app.delete("/admin/support/messages/:messageId", requireAuth, adminRateLimitV416A, (req, res) => {
  const db = readDb();

  if (typeof ensureOwnerEmailV388B === "function" && ensureOwnerEmailV388B(db)) writeDb(db);

  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  if (!isSupportAdminV388(me)) {
    return res.status(403).json({ error: "ADMIN_ONLY", message: "الحذف لصاحب التطبيق فقط." });
  }

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const messageId = String(req.params.messageId || "");
  const idx = db.supportMessagesV375.findIndex((m) => String(m.id) === messageId);

  if (idx < 0) {
    return res.status(404).json({ error: "SUPPORT_MESSAGE_NOT_FOUND", message: "الرسالة غير موجودة." });
  }

  const deleted = db.supportMessagesV375.splice(idx, 1)[0];
  writeDb(db);

  res.json({
    ok: true,
    message: "تم حذف رسالة الدعم.",
    deletedId: String(deleted?.id || messageId)
  });
});

app.patch("/admin/support/messages/:messageId/content", requireAuth, adminRateLimitV416A, (req, res) => {
  const db = readDb();
  if (typeof ensureOwnerEmailV388B === "function" && ensureOwnerEmailV388B(db)) writeDb(db);

  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  if (!isSupportAdminV388(me)) {
    return res.status(403).json({ error: "ADMIN_ONLY", message: "هذه الصفحة لصاحب التطبيق فقط." });
  }

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const messageId = String(req.params.messageId || "");
  const msg = db.supportMessagesV375.find((m) => String(m.id) === messageId);

  if (!msg) {
    return res.status(404).json({ error: "SUPPORT_MESSAGE_NOT_FOUND", message: "الرسالة غير موجودة." });
  }

  const clearText = req.body && req.body.clearText === true;
  const clearImage = req.body && req.body.clearImage === true;

  if (!clearText && !clearImage) {
    return res.status(400).json({ error: "NO_CONTENT_CHANGE", message: "لم يتم اختيار حذف النص أو الصورة." });
  }

  if (clearText) {
    msg.text = "";
    msg.textClearedByAdmin = true;
    msg.textClearedAt = new Date().toISOString();
  }

  if (clearImage) {
    msg.mediaUrl = "";
    msg.mediaType = "";
    msg.imageClearedByAdmin = true;
    msg.imageClearedAt = new Date().toISOString();
  }

  msg.updatedAt = new Date().toISOString();
  writeDb(db);

  res.json({ ok: true, message: publicSupportMessageV388(msg) });
});

app.post("/admin/support/messages/:messageId/reply", requireAuth, adminRateLimitV416A, (req, res) => {
  const db = readDb();
  if (typeof ensureOwnerEmailV388B === "function" && ensureOwnerEmailV388B(db)) writeDb(db);

  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  if (!isSupportAdminV388(me)) {
    return res.status(403).json({ error: "ADMIN_ONLY", message: "هذه الصفحة لصاحب التطبيق فقط." });
  }

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const messageId = String(req.params.messageId || "");
  const msg = db.supportMessagesV375.find((m) => String(m.id) === messageId);

  if (!msg) {
    return res.status(404).json({ error: "SUPPORT_MESSAGE_NOT_FOUND", message: "الرسالة غير موجودة." });
  }

  const text = String(req.body.text || "").trim().slice(0, 500);
  if (text.length < 2) {
    return res.status(400).json({ error: "REPLY_EMPTY", message: "اكتب ردًا قصيرًا أولًا." });
  }

  msg.adminReplyText = text;
  msg.adminReplyFrom = "إدارة التطبيق";
  msg.adminReplyAt = new Date().toISOString();
  msg.updatedAt = new Date().toISOString();

  writeDb(db);

  res.json({ ok: true, message: publicSupportMessageV388(msg) });
});

app.patch("/admin/support/messages/:messageId/status", requireAuth, adminRateLimitV416A, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });
  if (!isSupportAdminV388(me)) {
    return res.status(403).json({ error: "ADMIN_ONLY", message: "هذه الصفحة لصاحب التطبيق فقط." });
  }

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const messageId = String(req.params.messageId || "");
  const statusRaw = String(req.body.status || "").trim().toLowerCase();
  const status = ["new", "reviewing", "resolved"].includes(statusRaw) ? statusRaw : "new";

  const msg = db.supportMessagesV375.find((m) => String(m.id) === messageId);
  if (!msg) return res.status(404).json({ error: "SUPPORT_MESSAGE_NOT_FOUND", message: "الرسالة غير موجودة." });

  msg.status = status;
  msg.updatedAt = new Date().toISOString();

  writeDb(db);

  res.json({
    ok: true,
    message: publicSupportMessageV388(msg)
  });
});

app.post("/support/feedback", requireAuth, socialRateLimitV416A, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const rawType = String(req.body.type || "suggestion").trim().toLowerCase();
  const type = ["suggestion", "complaint", "bug", "report"].includes(rawType) ? rawType : "suggestion";
  const text = String(req.body.text || "").trim().slice(0, 700);
  const sourceScreen = String(req.body.sourceScreen || "app").trim().slice(0, 80);
  const safeSupportMediaTypeV390 = String(req.body.mediaType || "").trim() === "image" ? "image" : "";
  const safeSupportMediaUrlV390 = safeSupportMediaTypeV390 ? String(req.body.mediaUrl || "").trim().slice(0, 900) : "";

  if (text.length < 3 && !safeSupportMediaUrlV390) {
    return res.status(400).json({ error: "SUPPORT_EMPTY", message: "اكتب رسالتك أو أرفق صورة للمشكلة." });
  }

  db.supportMessagesV375 = Array.isArray(db.supportMessagesV375) ? db.supportMessagesV375 : [];

  const now = Date.now();
  const last = db.supportMessagesV375.find((m) => String(m.userId) === String(me.id));
  if (last && now - (Date.parse(last.createdAt || "") || 0) < 30000) {
    return res.status(429).json({ error: "SUPPORT_TOO_FAST", message: "انتظر قليلًا قبل إرسال رسالة جديدة." });
  }

  const message = {
    id: makeId("support"),
    userId: String(me.id),
    username: String(me.username || "لاعب"),
    countryCode: String(me.countryCode || "YE"),
    type,
    text: text || (safeSupportMediaUrlV390 ? "صورة مرفقة" : ""),
    sourceScreen,
    mediaUrl: safeSupportMediaUrlV390,
    mediaType: safeSupportMediaTypeV390,
    status: "new",
    createdAt: new Date().toISOString()
  };

  db.supportMessagesV375.unshift(message);
  db.supportMessagesV375 = db.supportMessagesV375.slice(0, 3000);

  writeDb(db);

  res.json({
    ok: true,
    message: "تم استلام رسالتك بنجاح، شكرًا لمساعدتنا في تحسين التطبيق.",
    feedback: message
  });
});

app.post("/posts/media", requireAuth, uploadRateLimitV416A, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const mediaType = String(req.body.mediaType || "");
  if (!["image", "video"].includes(mediaType)) {
    return res.status(400).json({ error: "BAD_MEDIA_TYPE", message: "نوع المرفق غير صحيح." });
  }

  const base64 = String(req.body.base64 || "");
  if (!base64 || base64.length < 20) {
    return res.status(400).json({ error: "MEDIA_EMPTY", message: "المرفق فارغ." });
  }

  const buffer = Buffer.from(base64, "base64");
  const maxBytes = mediaType === "video" ? 12 * 1024 * 1024 : 4 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return res.status(413).json({ error: "MEDIA_TOO_LARGE", message: "حجم المرفق كبير جدًا." });
  }

  const ext = mediaType === "video" ? "mp4" : "jpg";
  const fileName = `${makeId("post_media")}.${ext}`;
  const filePath = path.join(UPLOADS_DIR_V154, fileName);

  fs.writeFileSync(filePath, buffer);

  res.json({
    ok: true,
    mediaType,
    url: `${req.protocol}://${req.get("host")}/uploads/${fileName}`
  });
});


app.get("/posts/feed", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const scope = String(req.query.scope || "me");
  const myId = String(me.id);
  const friendIds = Array.isArray(me.friends) ? me.friends.map(String) : [];

  let posts = db.posts;
  if (scope === "me") {
    posts = posts.filter((p) => String(p.userId) === myId);
  } else if (scope === "friends") {
    posts = posts.filter((p) => friendIds.includes(String(p.userId)) && canViewPostV368(db, p, me));
  } else {
    posts = posts.filter((p) => p && p.id && canViewPostV368(db, p, me) && normalizePostVisibilityV368(p.visibility || p.privacy || p.audience || "public") === "public");
  }

  posts = posts
    .filter((p) => !shouldHidePostByReportsV149(db, p, myId))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 150)
    .map((p) => publicPostV143(db, p, myId));

  res.json({ ok: true, scope, posts });
});


app.get("/posts/me", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const posts = db.posts
    .filter((p) => String(p.userId) === String(me.id))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 100)
    .map((p) => ({
      id: p.id,
      userId: p.userId,
      username: me.username,
      countryCode: me.countryCode || "YE",
      text: p.text,
      createdAt: p.createdAt,
      visibility: normalizePostVisibilityV368(p.visibility || p.privacy || p.audience || "public"),
      likes: Array.isArray(p.likes) ? p.likes.length : 0
    }));

  res.json({ ok: true, posts });
});

app.post("/posts", requireAuth, socialRateLimitV416A, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const text = String(req.body.text || "").trim().slice(0, 500);
  const rawMediaUrlV152 = String(req.body.mediaUrl || "").trim().slice(0, 900);
  const rawMediaTypeV152 = String(req.body.mediaType || "").trim();
  const safeMediaTypeV152 = rawMediaUrlV152 && ["image", "video"].includes(rawMediaTypeV152) ? rawMediaTypeV152 : "";
  const safeVisibilityV368 = normalizePostVisibilityV368(req.body.visibility || req.body.privacy || req.body.audience || "public");

  if (!text && !safeMediaTypeV152) {
    return res.status(400).json({ error: "POST_EMPTY", message: "اكتب نصًا أو أرفق صورة/فيديو أولًا." });
  }

  db.posts = Array.isArray(db.posts) ? db.posts : [];

  const post = {
    id: makeId("post"),
    userId: String(me.id),
    text,
    mediaUrl: safeMediaTypeV152 ? rawMediaUrlV152 : "",
    mediaType: safeMediaTypeV152,
    visibility: safeVisibilityV368,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };
  db.posts.unshift(post);
  db.posts = db.posts.slice(0, 2000);

  writeDb(db);

  const posts = db.posts
    .filter((p) => String(p.userId) === String(me.id))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 100)
    .map((p) => ({
      id: p.id,
      userId: p.userId,
      username: me.username,
      countryCode: me.countryCode || "YE",
      text: p.text,
      createdAt: p.createdAt,
      visibility: normalizePostVisibilityV368(p.visibility || p.privacy || p.audience || "public"),
      likes: Array.isArray(p.likes) ? p.likes.length : 0
    }));

  res.json({ ok: true, post, posts });
});






app.get("/posts/reports/me", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  db.postReports = Array.isArray(db.postReports) ? db.postReports : [];

  const myPostIds = new Set(
    db.posts
      .filter((p) => String(p.userId) === String(me.id))
      .map((p) => String(p.id))
  );

  const reports = db.postReports
    .filter((r) => myPostIds.has(String(r.postId)))
    .slice(0, 100)
    .map((r) => {
      const post = db.posts.find((p) => String(p.id) === String(r.postId)) || {};
      const reporter = db.users.find((u) => String(u.id) === String(r.reporterUserId)) || {};
      return {
        id: r.id,
        postId: r.postId,
        postText: String(post.text || ""),
        reporterUserId: r.reporterUserId,
        reporterUsername: reporter.username || "لاعب",
        reason: r.reason || "",
        createdAt: r.createdAt || ""
      };
    });

  res.json({ ok: true, reports });
});


app.post("/posts/:postId/report", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  db.postReports = Array.isArray(db.postReports) ? db.postReports : [];

  const postId = String(req.params.postId || "");
  const post = db.posts.find((p) => String(p.id) === postId);
  if (!post) return res.status(404).json({ error: "POST_NOT_FOUND", message: "المنشور غير موجود." });

  if (String(post.userId) === String(me.id)) {
    return res.status(400).json({ error: "CANNOT_REPORT_OWN_POST", message: "لا يمكنك الإبلاغ عن منشورك." });
  }

  const exists = db.postReports.find((r) =>
    String(r.postId) === postId &&
    String(r.reporterUserId) === String(me.id)
  );

  if (exists) {
    return res.json({ ok: true, alreadyReported: true, message: "تم إرسال بلاغ سابقًا." });
  }

  const report = {
    id: makeId("post_report"),
    postId,
    postOwnerUserId: String(post.userId || ""),
    reporterUserId: String(me.id),
    reason: String(req.body.reason || "reported").slice(0, 120),
    createdAt: new Date().toISOString()
  };

  db.postReports.unshift(report);
  db.postReports = db.postReports.slice(0, 2000);

  writeDb(db);

  res.json({ ok: true, report });
});



app.patch("/posts/:postId/visibility", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const postId = String(req.params.postId || "");
  const post = db.posts.find((p) => String(p.id) === postId);
  if (!post) return res.status(404).json({ error: "POST_NOT_FOUND", message: "المنشور غير موجود." });

  if (String(post.userId) !== String(me.id)) {
    return res.status(403).json({ error: "NOT_POST_OWNER", message: "لا يمكنك تعديل منشور ليس لك." });
  }

  post.hiddenByOwner = !!req.body.hidden;
  post.hiddenByOwnerAt = post.hiddenByOwner ? new Date().toISOString() : "";

  // V368: allow changing audience safely if sent later by the app.
  if (req.body.visibility !== undefined || req.body.privacy !== undefined || req.body.audience !== undefined) {
    post.visibility = normalizePostVisibilityV368(req.body.visibility || req.body.privacy || req.body.audience || post.visibility || "public");
  }

  writeDb(db);

  res.json({ ok: true, post: publicPostV143(db, post, me.id) });
});


app.get("/posts/:postId", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const postId = String(req.params.postId || "");
  const post = db.posts.find((p) => String(p.id) === postId);
  if (!post) return res.status(404).json({ error: "POST_NOT_FOUND", message: "المنشور غير موجود." });
  if (!canViewPostV368(db, post, me)) return res.status(403).json({ error: "POST_NOT_VISIBLE_V368_DETAIL", message: "لا يمكنك مشاهدة هذا المنشور." });

  const base = publicPostV143(db, post, me.id);
  const comments = (Array.isArray(post.comments) ? post.comments : []).map((c) => {
    const cu = db.users.find((u) => String(u.id) === String(c.userId)) || {};
    return {
      id: c.id,
      userId: c.userId,
      username: cu.username || "لاعب",
      countryCode: cu.countryCode || "YE",
      text: String(c.text || ""),
      createdAt: c.createdAt || "",
      canDelete: String(c.userId) === String(me.id)
    };
  }).reverse();

  res.json({ ok: true, post: { ...base, comments, commentsCount: comments.length } });
});


app.post("/posts/:postId/comments", requireAuth, socialRateLimitV416A, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const postId = String(req.params.postId || "");
  const post = db.posts.find((p) => String(p.id) === postId);
  if (!post) return res.status(404).json({ error: "POST_NOT_FOUND", message: "المنشور غير موجود." });
  if (!canViewPostV368(db, post, me)) return res.status(403).json({ error: "POST_NOT_VISIBLE_V368_COMMENT", message: "لا يمكنك التعليق على هذا المنشور." });

  const text = String(req.body.text || "").trim().slice(0, 220);
  if (!text) return res.status(400).json({ error: "COMMENT_EMPTY", message: "اكتب نص التعليق أولًا." });

  post.comments = Array.isArray(post.comments) ? post.comments : [];
  const comment = {
    id: makeId("comment"),
    userId: String(me.id),
    text,
    createdAt: new Date().toISOString()
  };
  post.comments.push(comment);
  post.comments = post.comments.slice(-300);

  writeDb(db);

  res.json({ ok: true, comment, post: publicPostV143(db, post, me.id) });
});



app.delete("/posts/:postId/comments/:commentId", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const postId = String(req.params.postId || "");
  const commentId = String(req.params.commentId || "");
  const post = db.posts.find((p) => String(p.id) === postId);
  if (!post) return res.status(404).json({ error: "POST_NOT_FOUND", message: "المنشور غير موجود." });

  post.comments = Array.isArray(post.comments) ? post.comments : [];
  const before = post.comments.length;
  post.comments = post.comments.filter((c) => !(String(c.id) === commentId && String(c.userId) === String(me.id)));

  if (post.comments.length === before) {
    return res.status(404).json({ error: "COMMENT_NOT_FOUND", message: "التعليق غير موجود أو ليس لك." });
  }

  writeDb(db);

  res.json({ ok: true, deleted: true, post: publicPostV143(db, post, me.id) });
});


app.post("/posts/:postId/like", requireAuth, socialRateLimitV416A, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const postId = String(req.params.postId || "");
  const post = db.posts.find((p) => String(p.id) === postId);
  if (!post) return res.status(404).json({ error: "POST_NOT_FOUND", message: "المنشور غير موجود." });
  if (!canViewPostV368(db, post, me)) return res.status(403).json({ error: "POST_NOT_VISIBLE_V368_LIKE", message: "لا يمكنك التفاعل مع هذا المنشور." });

  post.likes = Array.isArray(post.likes) ? post.likes.map(String) : [];
  const myId = String(me.id);
  if (post.likes.includes(myId)) {
    post.likes = post.likes.filter((id) => String(id) !== myId);
  } else {
    post.likes.push(myId);
  }

  writeDb(db);
  res.json({ ok: true, post: publicPostV143(db, post, myId) });
});


app.delete("/posts/:postId", requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const postId = String(req.params.postId || "");
  db.posts = Array.isArray(db.posts) ? db.posts : [];
  const before = db.posts.length;
  db.posts = db.posts.filter((p) => !(String(p.id) === postId && String(p.userId) === String(me.id)));

  if (db.posts.length === before) {
    return res.status(404).json({ error: "POST_NOT_FOUND", message: "المنشور غير موجود." });
  }

  writeDb(db);

  const posts = db.posts
    .filter((p) => String(p.userId) === String(me.id))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 100)
    .map((p) => ({
      id: p.id,
      userId: p.userId,
      username: me.username,
      countryCode: me.countryCode || "YE",
      text: p.text,
      createdAt: p.createdAt,
      visibility: normalizePostVisibilityV368(p.visibility || p.privacy || p.audience || "public"),
      likes: Array.isArray(p.likes) ? p.likes.length : 0
    }));

  res.json({ ok: true, deleted: true, posts });
});


app.patch("/me/profile", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const rawAvatarUri = String(req.body.avatarUri || "");
  const avatarUri = rawAvatarUri.slice(0, 1500000);
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
  user.voiceCountryProfileHiddenV475B3 = !!req.body.voiceCountryProfileHiddenV475B3; // V475B3_COUNTRY_ROOM_PLAYER_CARD_PRIVACY_SAFE
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

  const getFriendCurrentGameV105 = (friendId) => {
    for (const room of rooms.values()) {
      if (!room || room.status === "finished") continue;
      const found = (room.players || []).find((p) => String(p.id) === String(friendId));
      if (!found) continue;
      if (room.game === "domino") return "domino";
      if (room.game === "chess") return "chess";
      if (room.game === "carrom") return "carrom";
      if (room.game === "billiards") return "billiards";
      return String(room.game || "playing");
    }
    return "";
  };

  const friendIds = Array.isArray(user.friends) ? user.friends : [];
  const friends = friendIds
    .map((id) => db.users.find((u) => u.id === id))
    .filter(Boolean)
    .map((friend) => {
      const base = publicUser(friend);
      const currentGame = getFriendCurrentGameV105(friend.id);
      return {
        ...base,
        isOnline: connectedUserSocketsV137O.has(String(friend.id)),
        currentGame,
        status: currentGame || friend.presenceStatusV139 || (connectedUserSocketsV137O.has(String(friend.id)) ? "online" : "offline")
      };
    });

  const requests = (db.friendRequests || [])
    .filter((r) => r.status === "pending" && (r.fromUserId === user.id || r.toUserId === user.id))
    .map((r) => publicFriendRequestV138FR(db, r, user.id));

  res.json({ friends, requests });
});

app.post("/friends/request", requireAuth, socialRateLimitV416A, handleFriendRequestV138FR);

// توافق مع الزر القديم: صار يرسل طلب صداقة بدل إضافة مباشرة
app.post("/friends/add", requireAuth, socialRateLimitV416A, handleFriendRequestV138FR);

app.post("/friends/respond", requireAuth, socialRateLimitV416A, (req, res) => {
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

app.post("/friends/chat/:friendId", requireAuth, socialRateLimitV416A, (req, res) => {
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

  // V139_PRIVATE_CHAT_SOCKET_NOTIFY_SAFE:
  try {
    for (const s of io.sockets.sockets.values()) {
      if (String(s?.user?.id || "") === String(friend.id)) {
        io.to(s.id).emit("private:message", {
          ...msg,
          fromUserId: String(me.id),
          senderId: String(me.id),
          fromUsername: me.username,
          toUserId: String(friend.id)
        });
      }
    }
  } catch (e) {
    console.log("V139 private notify failed:", e?.message || e);
  }

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

app.post("/friends/remove", requireAuth, socialRateLimitV416A, (req, res) => {
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

app.post("/friends/block", requireAuth, socialRateLimitV416A, (req, res) => {
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
app.post("/friends/report", requireAuth, socialRateLimitV416A, (req, res) => {
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

app.post("/friends/unblock", requireAuth, socialRateLimitV416A, (req, res) => {
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
      // V409A_DOMINO_REAL_FINAL_HANDS_REVEAL_COLLECT_SAFE:
      // إرسال البلاط الحقيقي المتبقي فقط بعد انتهاء المباراة للعرض البصري، بدون تغيير أي قانون.
      finalHands: room.status === "finished"
        ? Object.fromEntries(Object.entries(room.domino.hands || {}).map(([id, hand]) => [
            id,
            Array.isArray(hand)
              ? hand.map((tile) => Array.isArray(tile) ? [Number(tile[0] || 0), Number(tile[1] || 0)] : [0, 0])
              : []
          ]))
        : null,
      // V409B_DOMINO_REAL_ROUND_FINAL_HANDS_REVEAL_VISIBLE_SAFE:
      // كشف بصري حقيقي لبلاط نهاية الجولة حتى لو بدأت جولة جديدة قبل الوصول إلى 100.
      lastRoundFinalHands: room.domino.lastRoundFinalHands || null,
      lastRoundWinnerId: room.domino.lastRoundWinnerId || null,
      lastRoundWinnerUsername: room.domino.lastRoundWinnerUsername || null,
      lastRoundWinnerTeamIds: room.domino.lastRoundWinnerTeamIds || null,
      lastRoundRoundPointsText: room.domino.lastRoundRoundPointsText || null,
      lastRoundFinishReason: room.domino.lastRoundFinishReason || null,
      lastRoundRevealSeq: room.domino.lastRoundRevealSeq || null,
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

// V401C_DOMINO_SUPER_BOT_AI_SAFE: stronger domino bot scoring for 2, 4 fardi, and 4 partner. Rules unchanged.
function getDominoOpenNumbersAfterMoveV401C(room, move) {
  const board = Array.isArray(room?.domino?.board) ? room.domino.board : [];
  if (!board.length || move.side === "start") return { left: move.orientedTile[0], right: move.orientedTile[1] };
  const ends = getDominoEnds(room);
  if (move.side === "left") return { left: move.orientedTile[0], right: ends.right };
  return { left: ends.left, right: move.orientedTile[1] };
}

function dominoHandNumberCountV401C(hand, n, excludeTile) {
  return (Array.isArray(hand) ? hand : []).reduce((count, tile) => {
    if (!Array.isArray(tile) || tile === excludeTile) return count;
    return count + (tile[0] === n ? 1 : 0) + (tile[1] === n ? 1 : 0);
  }, 0);
}

function dominoPlayableCountForEndsV401C(hand, left, right, excludeTile) {
  return (Array.isArray(hand) ? hand : []).reduce((count, tile) => {
    if (!Array.isArray(tile) || tile === excludeTile) return count;
    return count + (tile[0] === left || tile[1] === left || tile[0] === right || tile[1] === right ? 1 : 0);
  }, 0);
}

function dominoOpponentPressureV401C(room, userId, left, right) {
  const players = room?.players || [];
  const myTeam = isDominoTeamsRoom(room) ? getDominoTeamIndex(room, userId) : null;
  let pressure = 0;

  for (const p of players) {
    if (!p || p.id === userId) continue;
    const isPartner = myTeam !== null && getDominoTeamIndex(room, p.id) === myTeam;
    const hand = room?.domino?.hands?.[p.id] || [];
    const playable = dominoPlayableCountForEndsV401C(hand, left, right, null);

    if (isPartner) {
      pressure += playable * 2.2;
    } else {
      pressure -= playable * 3.8;
      pressure += Math.max(0, 3 - playable) * 7.5;
    }
  }

  return pressure;
}

function dominoPartnerSupportV401C(room, userId, left, right) {
  if (!isDominoTeamsRoom(room)) return 0;
  const partnerId = getDominoPartnerId(room, userId);
  const partnerHand = partnerId ? (room?.domino?.hands?.[partnerId] || []) : [];
  const playable = dominoPlayableCountForEndsV401C(partnerHand, left, right, null);
  const myTeam = getDominoTeamIndex(room, userId);
  const teamPoints = getDominoTeamHandPoints(room, myTeam);
  const opponentPoints = getDominoTeamHandPoints(room, 1 - myTeam);
  return playable * 4.8 + (teamPoints <= opponentPoints ? 3.5 : 0);
}

function findBestDominoMove(room, userId) {
  const hand = room?.domino?.hands?.[userId] || [];
  let best = null;
  const board = room?.domino?.board || [];
  const handPointsNow = getDominoHandPoints(room, userId);

  for (const tile of hand) {
    for (const move of getDominoLegalMoves(room, tile)) {
      const nextEnds = getDominoOpenNumbersAfterMoveV401C(room, move);
      const remainingHand = hand.filter((t) => t !== tile);
      const remainingPoints = remainingHand.reduce((sum, t) => sum + getDominoTilePoints(t), 0);
      const ownFollowUps = dominoPlayableCountForEndsV401C(remainingHand, nextEnds.left, nextEnds.right, null);
      const leftControl = dominoHandNumberCountV401C(remainingHand, nextEnds.left, null);
      const rightControl = dominoHandNumberCountV401C(remainingHand, nextEnds.right, null);
      const controlScore = (leftControl + rightControl) * 3.4;
      const pressureScore = dominoOpponentPressureV401C(room, userId, nextEnds.left, nextEnds.right);
      const partnerScore = dominoPartnerSupportV401C(room, userId, nextEnds.left, nextEnds.right);
      const doubleScore = tile[0] === tile[1] ? (board.length === 0 ? 22 : 8) : 0;
      const lowExitBonus = remainingHand.length <= 2 ? (30 - remainingPoints * 1.2) : 0;
      const endgameDumpBonus = handPointsNow >= 24 ? getDominoTilePoints(tile) * 1.6 : getDominoTilePoints(tile) * 0.65;
      const selfBlockPenalty = ownFollowUps === 0 && remainingHand.length > 0 ? 13 : 0;
      const startStrongBonus = board.length === 0 ? (getDominoTilePoints(tile) + (tile[0] === tile[1] ? 18 : 0)) : 0;

      const score =
        move.score +
        endgameDumpBonus +
        startStrongBonus +
        doubleScore +
        ownFollowUps * 5.5 +
        controlScore +
        pressureScore +
        partnerScore +
        lowExitBonus -
        remainingPoints * 0.42 -
        selfBlockPenalty;

      if (!best || score > best.score) {
        best = { tile, side: move.side, orientedTile: move.orientedTile, score };
      }
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
// V233: الكيرم يبقى 15 ثانية.
// V285_BILLIARDS_REFERENCE_EXACT_VISUAL_RULES_READY: البلياردو فقط يصبح 25 ثانية ليطابق الفيديو المرجعي، بدون تغيير الدومينو/الشطرنج/الكيرم.
const BETA_TURN_MS_V233 = 15000;
const BILLIARDS_TURN_MS_V285 = 25000;
function betaTurnMsV285(room) {
  return room && room.game === "billiards" ? BILLIARDS_TURN_MS_V285 : BETA_TURN_MS_V233;
}

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
      if (player.socketId) io.to(player.socketId).emit("error:message", `رصيدك لا يكفي للتحدي عملات ${amount} كوينز`);
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
  if ((room.game === "carrom" || room.game === "billiards") && Number(room.maxPlayers || 2) === 4) {
    const winnerIndex = (room.players || []).findIndex((p) => String(p.id) === String(winnerId));
    if (winnerIndex >= 0) {
      const parity = winnerIndex % 2;
      receivers = (room.players || []).filter((p, index) => index % 2 === parity && !isBotIdV136IK(p.id));
    }
  } else if (room.game === "domino" && isDominoTeamsRoom(room)) {
    const team = getDominoTeamIndex(room, winnerId);
    receivers = getDominoTeamPlayers(room, team).filter((p) => !isBotIdV136IK(p.id));
  } else if (!isBotIdV136IK(winnerId)) {
    const winnerPlayer = (room.players || []).find((p) => p.id === winnerId);
    if (winnerPlayer) receivers = [winnerPlayer];
  }

  if (!receivers.length) {
    room.wager.paidOut = true;
    room.wager.winnerAwardText = "فاز البوت · لم تُضاف جائزة تحدي العملات لأي حساب حقيقي";
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
  room.wager.winnerAwardText = receivers.length > 1 ? `تم توزيع جائزة تحدي العملات ${pot} كوينز على الفريق الفائز` : `تمت إضافة جائزة تحدي العملات ${pot} كوينز للفائز`;
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
  room.beta.turnEndsAt = new Date(Date.now() + betaTurnMsV285(room)).toISOString();

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
  }, betaTurnMsV285(room));

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
  room.beta.turnEndsAt = new Date(Date.now() + betaTurnMsV285(room)).toISOString();
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

    // V409B_DOMINO_REAL_ROUND_FINAL_HANDS_REVEAL_VISIBLE_SAFE:
    // نحفظ البلاط الحقيقي المتبقي قبل إعادة توزيع الجولة الجديدة، للعرض البصري فقط.
    const finalHandsSnapshotV409B = Object.fromEntries(Object.entries(room.domino.hands || {}).map(([id, hand]) => [
      id,
      Array.isArray(hand)
        ? hand.map((tile) => Array.isArray(tile) ? [Number(tile[0] || 0), Number(tile[1] || 0)] : [0, 0])
        : []
    ]));
    room.domino.lastRoundFinalHands = finalHandsSnapshotV409B;
    room.domino.lastRoundWinnerId = winnerId;
    room.domino.lastRoundWinnerUsername = winnerPlayerForRound?.username || "الفائز";
    room.domino.lastRoundWinnerTeamIds = isDominoTeamsRoom(room)
      ? getDominoTeamPlayers(room, getDominoTeamIndex(room, winnerId)).map((p) => String(p.id))
      : [String(winnerId)];
    room.domino.lastRoundRoundPointsText = room.domino.roundPointsText || null;
    room.domino.lastRoundFinishReason = room.domino.finishReason || null;
    room.domino.lastRoundRevealSeq = Date.now();

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
  const carrom4WinnerIndexV260B = (room.game === "carrom" || room.game === "billiards") && Number(room.maxPlayers || 2) === 4
    ? (room.players || []).findIndex((p) => String(p.id) === String(winnerId))
    : -1;
  const carrom4WinnerTeamIdsV260B = carrom4WinnerIndexV260B >= 0
    ? (room.players || []).filter((p, index) => index % 2 === carrom4WinnerIndexV260B % 2).map((p) => String(p.id))
    : [];

  if (carrom4WinnerTeamIdsV260B.length) {
    room.winnerTeamIds = carrom4WinnerTeamIdsV260B;
    room.winnerUsername = (room.players || [])
      .filter((p) => carrom4WinnerTeamIdsV260B.includes(String(p.id)))
      .map((p) => p.username || "لاعب")
      .join(" + ");
  }

  const winnerIdsForStatsV260B = carrom4WinnerTeamIdsV260B.length ? carrom4WinnerTeamIdsV260B : [String(winnerId)];
  for (const winnerUserIdV260B of winnerIdsForStatsV260B) {
    if (isBotIdV136IK(winnerUserIdV260B)) continue;
    const winner = db.users.find((u) => String(u.id) === String(winnerUserIdV260B));
    if (winner) {
      winner.wins = (winner.wins || 0) + 1;
      winner.points = (winner.points || 0) + 10;
      winner.coins = (winner.coins || 0) + 20;
      winner.level = Math.max(1, Math.floor((winner.points || 0) / 100) + 1);
    }
  }

  awardRoomWagerV136IK(room, winnerId, db);

  for (const p of room.players) {
    if (!winnerIdsForStatsV260B.includes(String(p.id))) {
      const loser = db.users.find((u) => String(u.id) === String(p.id));
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
  io.to(room.id).emit("match:finished", { roomId: room.id, game: room.game, winnerId, winnerTeamIds: room.winnerTeamIds || null });
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
  io.to(room.id).emit("match:finished", { roomId: room.id, game: room.game, winnerId, winnerTeamIds: room.winnerTeamIds || null });
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



// V179_TWO_PLAYER_WITHDRAWAL_WINNER_READY:
// أي لعبة 2 لاعبين إذا لاعب انسحب/خرج/انقطع، اللاعب الباقي يفوز فورًا.
function handleTwoPlayerWithdrawalV179(room, leavingUserId, reason) {
  if (!room || !Array.isArray(room.players)) return false;
  if (room.status !== "playing") return false;

  const maxPlayers = Number(room.maxPlayers || 2);
  if (maxPlayers !== 2) return false;

  const game = String(room.game || "");
  if (!["domino", "chess", "carrom", "billiards"].includes(game)) return false;

  const leavingPlayer = room.players.find((p) => String(p.id) === String(leavingUserId));
  const winner = room.players.find((p) => String(p.id) !== String(leavingUserId));

  if (!winner) return false;

  const leavingName = leavingPlayer?.username || leavingPlayer?.name || "لاعب";
  const winnerName = winner?.username || winner?.name || "اللاعب الباقي";

  room.withdrawalV179 = {
    leftUserId: leavingUserId,
    leftUsername: leavingName,
    winnerId: winner.id,
    winnerUsername: winnerName,
    reason: reason || "فوز بسبب الانسحاب",
    createdAt: new Date().toISOString()
  };

  const message = `${leavingName} انسحب · ${winnerName} هو الفائز`;

  try {
    io.to(room.id).emit("beta:playerLeft", {
      roomId: room.id,
      game: room.game,
      leftUserId: leavingUserId,
      leftUsername: leavingName,
      remainingCount: 1,
      finished: true,
      winnerId: winner.id,
      winnerUsername: winnerName,
      message
    });
  } catch {}

  finishRoomByWithdrawal(room, winner.id, message);
  return true;
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

// V187_BETA_ANTI_CHEAT_GUARD_READY:
// حماية إضافية للكيرم والبلياردو:
// حجم payload، أرقام آمنة، معدل إرسال، منع إنهاء مبكر/من غير الدور.
// V187E_RELAX_SAFE_BETA_STATE_READY:
const BETA_STATE_MAX_BYTES_V187 = 140000;
const BETA_STATE_MIN_INTERVAL_MS_V187 = 16;
const BETA_SEQ_FUTURE_DRIFT_MS_V187 = 15000;
const BETA_MATCH_MIN_FINISH_MS_V187 = 10000;
// V187G_ALLOW_TIME_SEQ_NUMBERS_READY:
const BETA_MAX_NUMBER_ABS_V187 = 1000000000000000;

// V187F_SANITIZE_BETA_STATE_READY:
// تنظيف بيانات الكيرم/البلياردو قبل فحص الحماية.
// يمنع ظهور "بيانات الطاولة غير آمنة" بسبب NaN/Infinity/function/symbol.
function betaSanitizeStateV187F(value, depth = 0, seen = new WeakSet()) {
  if (depth > 14) return null;
  if (value == null) return null;

  const t = typeof value;

  if (t === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (t === "string") {
    return value.length > 3000 ? value.slice(0, 3000) : value;
  }

  if (t === "boolean") return value;

  if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
    return null;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 1500).map((x) => betaSanitizeStateV187F(x, depth + 1, seen));
  }

  if (t === "object") {
    if (seen.has(value)) return null;
    seen.add(value);

    const out = {};
    const keys = Object.keys(value).slice(0, 500);

    for (const k of keys) {
      const key = String(k).slice(0, 160);
      out[key] = betaSanitizeStateV187F(value[k], depth + 1, seen);
    }

    return out;
  }

  return null;
}

function betaJsonSizeV187(value) {
  try { return Buffer.byteLength(JSON.stringify(value || {}), "utf8"); } catch { return 999999999; }
}

function betaStateLooksSafeV187(value, depth = 0) {
  if (depth > 14) return false;
  if (value == null || typeof value === "undefined") return true;

  const t = typeof value;

  if (t === "string") return value.length <= 3000;
  if (t === "boolean") return true;
  if (t === "number") return Number.isFinite(value) && Math.abs(value) <= BETA_MAX_NUMBER_ABS_V187;

  if (Array.isArray(value)) {
    if (value.length > 1500) return false;
    return value.every((x) => betaStateLooksSafeV187(x, depth + 1));
  }

  if (t === "object") {
    const keys = Object.keys(value);
    if (keys.length > 500) return false;

    for (const k of keys) {
      if (String(k).length > 160) return false;
      if (!betaStateLooksSafeV187(value[k], depth + 1)) return false;
    }

    return true;
  }

  return false;
}

function betaIsTerminalUpdateV187(state) {
  return !!(state && (state.turnDone === true || state.nextTurn === true || state.shotComplete === true));
}

function betaRejectV187(socket, code, msg) {
  socket.emit("error:message", msg || code);
  socket.emit("beta:guard", { ok: false, code });
}


function addFriendPresenceIdV475D1R2(set, value, selfId) { // V475D1_R2_FRIEND_PRESENCE_ONLY_REAL_FRIENDS_SAFE
  if (value == null) return;

  if (typeof value === "string" || typeof value === "number") {
    const id = String(value || "");
    if (id && id !== String(selfId || "")) set.add(id);
    return;
  }

  if (typeof value !== "object") return;

  const candidates = [
    value.id,
    value.userId,
    value.friendId,
    value.targetUserId,
    value.otherUserId,
    value.toUserId,
    value.fromUserId,
    value.friend && value.friend.id,
    value.user && value.user.id
  ];

  for (const c of candidates) {
    const id = String(c || "");
    if (id && id !== String(selfId || "")) set.add(id);
  }
}

function relationLooksAcceptedV475D1R2(row) { // V475D1_R2_FRIEND_PRESENCE_ONLY_REAL_FRIENDS_SAFE
  const status = String(row?.status || row?.state || row?.type || "").toLowerCase();
  return row?.accepted === true || row?.isFriend === true || ["accepted", "friend", "friends", "approved"].includes(status);
}

function rowHasUserV475D1R2(row, userId) { // V475D1_R2_FRIEND_PRESENCE_ONLY_REAL_FRIENDS_SAFE
  const id = String(userId || "");
  if (!id || !row || typeof row !== "object") return false;

  const candidates = [
    row.userId,
    row.friendId,
    row.targetUserId,
    row.otherUserId,
    row.toUserId,
    row.fromUserId,
    row.requesterId,
    row.receiverId,
    row.senderId,
    row.recipientId,
    row.user && row.user.id,
    row.friend && row.friend.id
  ].map((x) => String(x || ""));

  return candidates.includes(id);
}

function getFriendIdsForPresenceV475D1R2(userId) { // V475D1_R2_FRIEND_PRESENCE_ONLY_REAL_FRIENDS_SAFE
  const selfId = String(userId || "");
  const ids = new Set();

  if (!selfId) return ids;

  try {
    const db = readDb();
    const users = Array.isArray(db.users) ? db.users : [];
    const me = users.find((u) => String(u?.id || "") === selfId);

    if (me && Array.isArray(me.friends)) {
      for (const f of me.friends) addFriendPresenceIdV475D1R2(ids, f, selfId);
    }

    for (const other of users) {
      const otherId = String(other?.id || "");
      if (!otherId || otherId === selfId) continue;

      const list = Array.isArray(other?.friends) ? other.friends : [];
      const hasMe = list.some((f) => {
        if (typeof f === "string" || typeof f === "number") return String(f) === selfId;
        if (!f || typeof f !== "object") return false;

        const candidates = [
          f.id,
          f.userId,
          f.friendId,
          f.targetUserId,
          f.otherUserId,
          f.toUserId,
          f.fromUserId,
          f.friend && f.friend.id,
          f.user && f.user.id
        ].map((x) => String(x || ""));

        return candidates.includes(selfId);
      });

      if (hasMe) ids.add(otherId);
    }

    const possiblePools = [db.friendships, db.friends, db.friendRequests, db.friend_requests];

    for (const pool of possiblePools) {
      if (!Array.isArray(pool)) continue;

      for (const row of pool) {
        if (!relationLooksAcceptedV475D1R2(row)) continue;
        if (!rowHasUserV475D1R2(row, selfId)) continue;

        const candidates = [
          row.userId,
          row.friendId,
          row.targetUserId,
          row.otherUserId,
          row.toUserId,
          row.fromUserId,
          row.requesterId,
          row.receiverId,
          row.senderId,
          row.recipientId
        ];

        for (const c of candidates) {
          const id = String(c || "");
          if (id && id !== selfId) ids.add(id);
        }
      }
    }
  } catch (err) {
    // لو حدث خطأ، الأفضل عدم إرسال أي تنبيه بدل تنبيه خاطئ.
  }

  return ids;
}

function emitFriendPresenceOnlyRealFriendsV475D1R2(userId, payload) { // V475D1_R2_FRIEND_PRESENCE_ONLY_REAL_FRIENDS_SAFE
  const ids = getFriendIdsForPresenceV475D1R2(userId);

  for (const friendId of ids) {
    const socketId = connectedUserSocketsV137O.get(String(friendId));
    if (!socketId) continue;

    try {
      io.to(socketId).emit("friend:presence", payload);
    } catch {}
  }
}

// V476J_R6_COUNTRY_COUNCIL_POLISH_SERVER_SAFE: moderator quiet mode + action log
const voiceCountryModerationSettingsV476J = new Map();
const voiceCountryModerationLogsV476J = new Map();

function getVoiceCountryModerationSettingsV476J(code) {
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return { handLocked: false, chatLocked: false, updatedAt: 0 };
  if (!voiceCountryModerationSettingsV476J.has(safeCode)) {
    voiceCountryModerationSettingsV476J.set(safeCode, { handLocked: false, chatLocked: false, updatedAt: Date.now() });
  }
  return voiceCountryModerationSettingsV476J.get(safeCode);
}

function getVoiceCountryModerationLogsV476J(code) {
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return [];
  return voiceCountryModerationLogsV476J.get(safeCode) || [];
}

function emitVoiceCountryModerationStateV476J(code, toSocket) {
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return;
  const payload = {
    code: safeCode,
    settings: getVoiceCountryModerationSettingsV476J(safeCode),
    logs: getVoiceCountryModerationLogsV476J(safeCode).slice(-12)
  };
  if (toSocket) {
    try { toSocket.emit("voiceCountry:moderationState", payload); } catch {}
  } else {
    try { io.to(`voiceCountry:${safeCode}`).emit("voiceCountry:moderationState", payload); } catch {}
  }
}

function pushVoiceCountryModerationLogV476J(code, action, actorSocket, targetUserId, message) {
  const safeCode = normalizeVoiceCountryCodeV475B(code || "");
  if (!safeCode) return null;
  const map = getVoiceCountryMapV475B(safeCode);
  const target = map?.get(String(targetUserId || "")) || {};
  const item = {
    id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code: safeCode,
    action: String(action || "action").slice(0, 50),
    actorId: String(actorSocket?.user?.id || ""),
    actorName: String(actorSocket?.user?.username || actorSocket?.user?.name || "المشرف").slice(0, 60),
    targetUserId: String(targetUserId || ""),
    targetName: String(target?.username || target?.name || "لاعب").slice(0, 60),
    message: String(message || "").slice(0, 140),
    at: Date.now()
  };
  const logs = getVoiceCountryModerationLogsV476J(safeCode).concat(item).slice(-40);
  voiceCountryModerationLogsV476J.set(safeCode, logs);
  try { io.to(`voiceCountry:${safeCode}`).emit("voiceCountry:moderationLog", { code: safeCode, item, logs: logs.slice(-12) }); } catch {}
  try { emitVoiceCountryModerationStateV476J(safeCode); } catch {}
  return item;
}



io.on("connection", (socket) => {
  // V139_LOCAL_PRESENCE: حالة اللاعب على السيرفر المحلي
  const setPresenceV139 = (status) => {
    const safeStatus = ["online", "menu", "playing", "offline"].includes(String(status)) ? String(status) : "online";
    socket.user.presenceStatusV139 = safeStatus;
    emitFriendPresenceOnlyRealFriendsV475D1R2(socket.user.id, { // V475D1_R2_FRIEND_PRESENCE_ONLY_REAL_FRIENDS_SAFE
      userId: socket.user.id,
      username: socket.user.username,
      status: safeStatus,
      at: Date.now()
    });
    console.log("V139 presence:", socket.user.id, safeStatus);
  };

  setPresenceV139("online");

  socket.on("presence:set", ({ status } = {}) => {
    setPresenceV139(status);
  });

  connectedUserSocketsV137O.set(String(socket.user.id), socket.id);
  socket.on("disconnect", () => {
    removeVoiceCountryPresenceForSocketV475F2(socket, "disconnect"); // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
    clearVoiceCountryVoiceStateV475E1(socket, socket.voiceCountryCodeV475B); // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
    leaveVoiceCountryRoomV475B(socket, "disconnect"); // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
    if (connectedUserSocketsV137O.get(String(socket.user.id)) === socket.id) connectedUserSocketsV137O.delete(String(socket.user.id));
  });
  
    // V138D: تم إيقاف منحة المليون نهائيًا. الحساب الجديد يبدأ بـ 10000 فقط.

socket.emit("rooms:list", roomList());

  socket.on("rooms:list", () => {
    if (socketCooldownV416A(socket, "rooms_list", 800)) return; // V416A
    socket.emit("rooms:list", roomList());
  });

  socket.on("voiceCountry:list", () => { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
    if (socketCooldownV416A(socket, "voice_country_list", 700)) return;
    socket.emit("voiceCountry:list", makeVoiceCountryListV475B());
  });

  socket.on("voiceCountry:join", ({ code } = {}) => { // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
    if (socketCooldownV416A(socket, "voice_country_join", 900)) return;
    const safeCode = normalizeVoiceCountryCodeV475B(code);
    if (!safeCode) return socket.emit("voiceCountry:notice", { ok: false, message: "دولة غير صحيحة" });

    const oldCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
    if (oldCode && oldCode !== safeCode) leaveVoiceCountryRoomV475B(socket, "switch");

    let map = getVoiceCountryMapV475B(safeCode);
    pruneVoiceCountryGhostPresenceV475F2("before_join"); // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
    removeVoiceCountryPresenceForUserEverywhereV475F2(socket.user?.id, String(socket.id || "")); // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
    map = getVoiceCountryMapV475B(safeCode); // V475F2C1_SERVER_JOIN_MAP_REACQUIRE_FIX_SAFE
    if (!map) return socket.emit("voiceCountry:notice", { ok: false, message: "تعذر دخول المجلس" }); // V475F2C1_SERVER_JOIN_MAP_REACQUIRE_FIX_SAFE
    const dbV475B3 = readDb(); // V475B3_COUNTRY_ROOM_PLAYER_CARD_PRIVACY_SAFE
    const dbUserV475B3 = (dbV475B3.users || []).find((u) => String(u.id) === String(socket.user.id)); // V475B3_COUNTRY_ROOM_PLAYER_CARD_PRIVACY_SAFE
    const participant = makeVoiceCountryParticipantV475B3(socket, dbUserV475B3);
    participant.socketId = String(socket.id || ""); // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE // V475B3_COUNTRY_ROOM_PLAYER_CARD_PRIVACY_SAFE

    map.set(String(socket.user.id), participant);
    voiceCountrySocketIndexV475F2.set(String(socket.id || ""), { userId: String(socket.user.id || ""), code: safeCode, at: Date.now() }); // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE
    socket.voiceCountryCodeV475B = safeCode;
    try { socket.join(`voiceCountry:${safeCode}`); } catch {}

    socket.emit("voiceCountry:joined", makeVoiceCountryStateV475B(safeCode));
    socket.emit("voiceCountry:messages", { code: safeCode, messages: getVisibleVoiceCountryMessagesV475G7DR3(safeCode).slice(-VOICE_COUNTRY_MAX_MESSAGES_V475C) });
    socket.emit("voiceCountry:mutes", { code: safeCode, mutes: getVoiceCountryMutesForUserV475F1(socket.user?.id, safeCode) }); // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
    // V478J_COUNCIL_KEEP_LIVE_MIC_ON_RESYNC_SAFE:
    // join/resync لا يجوز أن يطفئ مايك لاعب يتكلم أصلًا. كان يعيد muted=true ويقتل WebRTC.
    const existingVoiceV478J = getVoiceCountryVoiceMapV475E1(safeCode).get(String(socket.user.id || ""));
    if (existingVoiceV478J && existingVoiceV478J.muted === false) {
      setVoiceCountryVoiceStateV475E1(socket, safeCode, { muted: false, speaking: true });
    } else {
      setVoiceCountryVoiceStateV475E1(socket, safeCode, { muted: true, speaking: false });
    }
    socket.emit("voiceCountry:voiceStates", { code: safeCode, states: makeVoiceCountryVoiceStatesV475E1(safeCode) }); // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE
    emitVoiceCountryModerationStateV476J(safeCode, socket); // V476J_R6C_EMIT_MOD_STATE_ON_JOIN
    emitVoiceCountryVoiceStatesV475E1(safeCode); // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE // V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
  });

  socket.on("voiceCountry:leave", () => {
    removeVoiceCountryPresenceForSocketV475F2(socket, "leave"); // V475F2_COUNTRY_ROOM_PRESENCE_CLEANUP_SAFE // V475B_COUNTRY_ROOMS_PRESENCE_REAL_SAFE
    if (socketCooldownV416A(socket, "voice_country_leave", 500)) return;
    leaveVoiceCountryRoomV475B(socket, "leave");
    socket.emit("voiceCountry:joined", { code: "", count: 0, participants: [] });
  });

  socket.on("voiceCountry:messages:get", ({ code } = {}) => { // V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
    const requestedCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    if (!requestedCode) return socket.emit("voiceCountry:messages", { code: "", messages: [] });
    socket.emit("voiceCountry:messages", {
      code: requestedCode,
      messages: getVisibleVoiceCountryMessagesV475G7DR3(requestedCode).slice(-VOICE_COUNTRY_MAX_MESSAGES_V475C)
    });
  });

  socket.on("voiceCountry:message", ({ code, text } = {}) => { // V475C_COUNTRY_ROOM_TEXT_CHAT_SAFE
    if (socketCooldownV416A(socket, "voice_country_message", 1200)) return;

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const joinedCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
    if (!safeCode || !joinedCode || safeCode !== joinedCode) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "ادخل المجلس أولًا قبل إرسال رسالة" });
    }

    const settingsV476J = getVoiceCountryModerationSettingsV476J(safeCode); // V476J_R6C_CHAT_LOCK_IN_HANDLER
    if (settingsV476J.chatLocked && !isVoiceCountryModeratorV476D1R2(socket)) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "رسائل المجلس مقفلة مؤقتًا بواسطة المشرف" });
    }

    const cleanText = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleanText) return socket.emit("voiceCountry:notice", { ok: false, message: "اكتب رسالة أولًا" });
    if (cleanText.length > 180) return socket.emit("voiceCountry:notice", { ok: false, message: "الرسالة طويلة جدًا" });

    const moderationV475D = cleanVoiceCountryTextV475D(cleanText); // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
    if (!moderationV475D.ok) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "تم منع الرسالة لأنها تحتوي على كلمة غير مناسبة" });
    }

    if (isVoiceCountryDuplicateMessageV475D(socket, safeCode, moderationV475D.text)) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "لا تكرر نفس الرسالة بسرعة" });
    }

    const msg = makeVoiceCountryMessageV475C(socket, safeCode, moderationV475D.text); // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
    pushVoiceCountryMessageV475C(safeCode, msg);
    io.to(`voiceCountry:${safeCode}`).emit("voiceCountry:message", msg);
  });
  socket.on("voiceCountry:voiceState", ({ code, muted, speaking } = {}) => { // V475E1_COUNTRY_ROOM_MIC_STATE_SAFE // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
    if (false && socketCooldownV416A(socket, "voice_country_voice_state_v475e1", 500)) return; // V478J_COUNCIL_KEEP_LIVE_MIC_ON_RESYNC_SAFE

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    if (!safeCode || String(socket.voiceCountryCodeV475B || "") !== safeCode) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "ادخل المجلس أولًا" });
    }

    const uid = String(socket?.user?.id || "");
    if (!uid) return socket.emit("voiceCountry:notice", { ok: false, message: "تعذر معرفة المستخدم" });

    cleanupVoiceCountrySpeakerQueueV476D1R2(safeCode);

    const wantsToSpeak = (!!speaking && !muted) || muted === false;
    const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);
    const settingsV476J = getVoiceCountryModerationSettingsV476J(safeCode); // V476J_R6C_VOICESTATE_LOCK_IN_HANDLER
    if (wantsToSpeak && !speakerSet.has(uid) && settingsV476J.handLocked && !isVoiceCountryModeratorV476D1R2(socket)) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "رفع اليد مقفل مؤقتًا بواسطة المشرف" });
    }

    if (wantsToSpeak && !speakerSet.has(uid)) {
      if (speakerSet.size >= VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2) {
        const pos = addToVoiceCountryHandQueueV476D1R2(safeCode, uid);
        setVoiceCountrySpeakerVoiceStateV476D1R2(safeCode, uid, true, false);
        emitVoiceCountryVoiceStatesV475E1(safeCode);
        emitVoiceCountryStateV475B(safeCode);
        emitVoiceCountryListV475B();

        return socket.emit("voiceCountry:notice", {
          ok: true,
          message: `المنصة ممتلئة: مسموح 4 متحدثين فقط. تم وضعك في الانتظار رقم ${pos || "?"} ✋`
        });
      }

      speakerSet.add(uid);
      removeFromVoiceCountryHandQueueV476D1R2(safeCode, uid);
      socket.emit("voiceCountry:notice", { ok: true, message: "تم صعودك للمنصة 🎙️" });
    }

    if (!wantsToSpeak) {
      removeVoiceCountrySpeakerAndQueueV476D1R2(safeCode, uid, true);
    }

    const state = setVoiceCountryVoiceStateV475E1(socket, safeCode, {
      muted: wantsToSpeak ? false : true,
      speaking: wantsToSpeak
    });

    io.to(`voiceCountry:${safeCode}`).emit("voiceCountry:voiceState", { code: safeCode, ...state });
    emitVoiceCountryVoiceStatesV475E1(safeCode);
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
  });


  // V476B_COUNTRY_WEBRTC_SIGNALING_SERVER_SAFE: real audio WebRTC signaling for voice country councils
  function emitVoiceCountryWebRtcSignalV476B(socket, eventName, payload = {}, toUserId) {
    const safeCode = normalizeVoiceCountryCodeV475B(payload?.code || socket?.voiceCountryCodeV475B || "");
    const joinedCode = normalizeVoiceCountryCodeV475B(socket?.voiceCountryCodeV475B || "");
    if (!safeCode || !joinedCode || safeCode !== joinedCode) {
      socket.emit("voiceCountry:notice", { ok: false, message: "ادخل المجلس أولًا قبل تشغيل الصوت" });
      return false;
    }

    const fromUserId = String(socket?.user?.id || "");
    const targetUserId = String(toUserId || payload?.toUserId || "");
    if (!fromUserId || !targetUserId || fromUserId === targetUserId) {
      socket.emit("voiceCountry:notice", { ok: false, message: "هدف الصوت غير صحيح" });
      return false;
    }

    const map = getVoiceCountryMapV475B(safeCode);
    if (!map || !map.has(fromUserId) || !map.has(targetUserId)) {
      socket.emit("voiceCountry:notice", { ok: false, message: "الطرف الآخر غير موجود داخل المجلس" });
      return false;
    }

    let jsonLen = 0;
    try { jsonLen = JSON.stringify(payload || {}).length; } catch { jsonLen = 999999; }
    // V478F_COUNTRY_LIVE_DIRECT_SIGNAL_SAFE:
    // المجلس الصوتي لايف مثل الألعاب: WebRTC SDP/ICE قد يكون أكبر من 12000، فلا نسقط offer/answer الحقيقي.
    if (jsonLen > 250000) {
      socket.emit("voiceCountry:notice", { ok: false, message: "إشارة الصوت كبيرة جدًا" });
      return false;
    }

    const fromParticipant = map.get(fromUserId) || {};
    const packet = {
      code: safeCode,
      fromUserId,
      fromUsername: String(fromParticipant?.username || socket?.user?.username || "لاعب").slice(0, 60),
      toUserId: targetUserId,
      at: Date.now(),
      ...payload,
      code: safeCode,
      toUserId: targetUserId
    };

    let sent = 0;
    try {
      for (const [sid, row] of voiceCountrySocketIndexV475F2.entries()) {
        if (
          row &&
          String(row.userId || "") === targetUserId &&
          normalizeVoiceCountryCodeV475B(row.code || "") === safeCode
        ) {
          io.to(String(sid)).emit(eventName, packet);
          sent++;
        }
      }
    } catch {}

    // V478L_COUNCIL_DUAL_SIGNAL_FANOUT_SAFE:
    // إذا فشل توجيه offer المباشر، ابثه لكل الموجودين في المجلس ما عدا المرسل.
    // هذا يحل حالة: المتكلم يرسل offer لكن المستمع لا يرد answer.
    if (!sent && eventName === "voiceCountry:webrtc:offer") {
      try {
        for (const [sid, row] of voiceCountrySocketIndexV475F2.entries()) {
          const rowUserIdV478L = String(row?.userId || "");
          if (
            row &&
            rowUserIdV478L &&
            rowUserIdV478L !== fromUserId &&
            normalizeVoiceCountryCodeV475B(row.code || "") === safeCode
          ) {
            io.to(String(sid)).emit(eventName, { ...packet, toUserId: rowUserIdV478L, fanoutV478L: true });
            sent++;
          }
        }
      } catch {}
    }

    if (!sent) {
      socket.emit("voiceCountry:notice", { ok: false, message: "تعذر الوصول للطرف الآخر صوتيًا" });
      return false;
    }

    return true;
  }

  socket.on("voiceCountry:webrtc:offer", ({ code, toUserId, offer } = {}) => { // V476B_COUNTRY_WEBRTC_SIGNALING_SERVER_SAFE
    if (false && socketCooldownV416A(socket, "voice_country_webrtc_offer_v476b", 500)) return; // V478F_COUNTRY_LIVE_DIRECT_SIGNAL_SAFE
    if (!offer) return socket.emit("voiceCountry:notice", { ok: false, message: "عرض الصوت غير صحيح" });
    emitVoiceCountryWebRtcSignalV476B(socket, "voiceCountry:webrtc:offer", { code, offer }, toUserId);
  });

  socket.on("voiceCountry:webrtc:answer", ({ code, toUserId, answer } = {}) => { // V476B_COUNTRY_WEBRTC_SIGNALING_SERVER_SAFE
    if (false && socketCooldownV416A(socket, "voice_country_webrtc_answer_v476b", 500)) return; // V478F_COUNTRY_LIVE_DIRECT_SIGNAL_SAFE
    if (!answer) return socket.emit("voiceCountry:notice", { ok: false, message: "رد الصوت غير صحيح" });
    emitVoiceCountryWebRtcSignalV476B(socket, "voiceCountry:webrtc:answer", { code, answer }, toUserId);
  });

  socket.on("voiceCountry:webrtc:ice", ({ code, toUserId, candidate } = {}) => { // V476B_COUNTRY_WEBRTC_SIGNALING_SERVER_SAFE
    if (false && socketCooldownV416A(socket, "voice_country_webrtc_ice_v476b", 120)) return; // V478B_R1_ICE_NO_DROP_SAFE
    if (!candidate) return;
    emitVoiceCountryWebRtcSignalV476B(socket, "voiceCountry:webrtc:ice", { code, candidate }, toUserId);
  });

  socket.on("voiceCountry:webrtc:end", ({ code, toUserId } = {}) => { // V476B_COUNTRY_WEBRTC_SIGNALING_SERVER_SAFE
    if (socketCooldownV416A(socket, "voice_country_webrtc_end_v476b", 700)) return;
    emitVoiceCountryWebRtcSignalV476B(socket, "voiceCountry:webrtc:end", { code }, toUserId);
  });



  socket.on("voiceCountry:hand:raise", ({ code } = {}) => { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
    if (socketCooldownV416A(socket, "voice_country_hand_raise_v476d1r2", 800)) return;

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const uid = String(socket?.user?.id || "");
    if (!safeCode || String(socket.voiceCountryCodeV475B || "") !== safeCode) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "ادخل المجلس أولًا" });
    }

    cleanupVoiceCountrySpeakerQueueV476D1R2(safeCode);
    const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);
    const settingsV476J = getVoiceCountryModerationSettingsV476J(safeCode); // V476J_R6C_HAND_LOCK_IN_HANDLER
    if (settingsV476J.handLocked && !speakerSet.has(uid) && !isVoiceCountryModeratorV476D1R2(socket)) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "رفع اليد مقفل مؤقتًا بواسطة المشرف" });
    }

    if (speakerSet.has(uid)) {
      return socket.emit("voiceCountry:notice", { ok: true, message: "أنت موجود على المنصة بالفعل 🎙️" });
    }

    if (speakerSet.size < VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2) {
      speakerSet.add(uid);
      removeFromVoiceCountryHandQueueV476D1R2(safeCode, uid);
      setVoiceCountrySpeakerVoiceStateV476D1R2(safeCode, uid, true, false);
      emitVoiceCountryVoiceStatesV475E1(safeCode);
      emitVoiceCountryStateV475B(safeCode);
      emitVoiceCountryListV475B();
      return socket.emit("voiceCountry:notice", { ok: true, message: "تم صعودك للمنصة 🎙️ افتح المايك عندما يأتي دورك" });
    }

    const pos = addToVoiceCountryHandQueueV476D1R2(safeCode, uid);
    emitVoiceCountryStateV475B(safeCode);
    return socket.emit("voiceCountry:notice", { ok: true, message: `تم رفع يدك ✋ ترتيبك: ${pos}` });
  });

  socket.on("voiceCountry:hand:cancel", ({ code } = {}) => { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
    if (socketCooldownV416A(socket, "voice_country_hand_cancel_v476d1r2", 800)) return;
    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const uid = String(socket?.user?.id || "");
    if (!safeCode || !uid) return;

    removeFromVoiceCountryHandQueueV476D1R2(safeCode, uid);
    emitVoiceCountryStateV475B(safeCode);
    socket.emit("voiceCountry:notice", { ok: true, message: "تم إلغاء رفع اليد" });
  });

  socket.on("voiceCountry:speaker:leave", ({ code } = {}) => { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
    if (socketCooldownV416A(socket, "voice_country_speaker_leave_v476d1r2", 900)) return;
    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const uid = String(socket?.user?.id || "");
    if (!safeCode || !uid) return;

    removeVoiceCountrySpeakerAndQueueV476D1R2(safeCode, uid, true);
    emitVoiceCountryVoiceStatesV475E1(safeCode);
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
    socket.emit("voiceCountry:notice", { ok: true, message: "نزلت من المنصة وأصبحت مستمعًا" });
  });

  socket.on("voiceCountry:speaker:promote", ({ code, targetUserId } = {}) => { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
    if (socketCooldownV416A(socket, "voice_country_speaker_promote_v476d1r2", 900)) return;
    if (!isVoiceCountryModeratorV476D1R2(socket)) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "هذا الخيار للمشرف فقط" });
    }

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const target = String(targetUserId || "");
    if (!safeCode || !target) return;

    cleanupVoiceCountrySpeakerQueueV476D1R2(safeCode);
    const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);

    if (speakerSet.size >= VOICE_COUNTRY_MAX_SPEAKERS_V476D1_R2 && !speakerSet.has(target)) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "المنصة ممتلئة: الحد 4 متحدثين" });
    }

    speakerSet.add(target);
    removeFromVoiceCountryHandQueueV476D1R2(safeCode, target);
    setVoiceCountrySpeakerVoiceStateV476D1R2(safeCode, target, true, false);
    emitVoiceCountryNoticeToUserV476D1R2(safeCode, target, "المشرف صعّدك للمنصة 🎙️");
      pushVoiceCountryModerationLogV476J(safeCode, "promote_speaker", socket, target, "تصعيد متحدث للمنصة"); // V476J_R6_MOD_LOG_PROMOTE
    emitVoiceCountryVoiceStatesV475E1(safeCode);
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
  });

  socket.on("voiceCountry:speaker:demote", ({ code, targetUserId } = {}) => { // V476D1_R2_COUNTRY_SPEAKER_LIMIT_QUEUE_SERVER_SAFE
    if (socketCooldownV416A(socket, "voice_country_speaker_demote_v476d1r2", 900)) return;
    if (!isVoiceCountryModeratorV476D1R2(socket)) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "هذا الخيار للمشرف فقط" });
    }

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const target = String(targetUserId || "");
    if (!safeCode || !target) return;

    removeVoiceCountrySpeakerAndQueueV476D1R2(safeCode, target, true);
    emitVoiceCountryNoticeToUserV476D1R2(safeCode, target, "تم إنزالك من المنصة بواسطة المشرف");
      pushVoiceCountryModerationLogV476J(safeCode, "demote_speaker", socket, target, "إنزال متحدث من المنصة"); // V476J_R6_MOD_LOG_DEMOTE
    emitVoiceCountryVoiceStatesV475E1(safeCode);
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
  });

  // V476I4_COUNTRY_COUNCIL_MODERATOR_TOOLS_SAFE: reject hand, mute speaker mic, kick user from country council
  socket.on("voiceCountry:hand:reject", ({ code, targetUserId } = {}) => {
    if (socketCooldownV416A(socket, "voice_country_hand_reject_v476i4", 900)) return;
    if (!isVoiceCountryModeratorV476D1R2(socket)) return socket.emit("voiceCountry:notice", { ok: false, message: "هذا الخيار للمشرف فقط" });

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const joinedCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
    const target = String(targetUserId || "");
    if (!safeCode || !target || safeCode !== joinedCode) return socket.emit("voiceCountry:notice", { ok: false, message: "طلب غير صحيح" });

    removeFromVoiceCountryHandQueueV476D1R2(safeCode, target);
    emitVoiceCountryNoticeToUserV476D1R2(safeCode, target, "تم رفض طلب رفع اليد هذه المرة");
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
    socket.emit("voiceCountry:notice", { ok: true, message: "تم رفض الطلب" });
    pushVoiceCountryModerationLogV476J(safeCode, "reject_hand", socket, target, "رفض طلب رفع اليد"); // V476J_R6_MOD_LOG_REJECT
  });

  socket.on("voiceCountry:speaker:mute", ({ code, targetUserId } = {}) => {
    if (socketCooldownV416A(socket, "voice_country_speaker_mute_v476i4", 900)) return;
    if (!isVoiceCountryModeratorV476D1R2(socket)) return socket.emit("voiceCountry:notice", { ok: false, message: "هذا الخيار للمشرف فقط" });

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const joinedCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
    const target = String(targetUserId || "");
    if (!safeCode || !target || safeCode !== joinedCode) return socket.emit("voiceCountry:notice", { ok: false, message: "طلب غير صحيح" });

    const speakerSet = getVoiceCountrySpeakerSetV476D1R2(safeCode);
    if (!speakerSet.has(target)) return socket.emit("voiceCountry:notice", { ok: false, message: "هذا اللاعب ليس على المنصة" });

    setVoiceCountrySpeakerVoiceStateV476D1R2(safeCode, target, true, false);
    emitVoiceCountryNoticeToUserV476D1R2(safeCode, target, "المشرف كتم المايك مؤقتًا");
    emitVoiceCountryVoiceStatesV475E1(safeCode);
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
    socket.emit("voiceCountry:notice", { ok: true, message: "تم كتم مايك المتحدث" });
    pushVoiceCountryModerationLogV476J(safeCode, "mute_speaker", socket, target, "كتم مايك متحدث"); // V476J_R6_MOD_LOG_MUTE
  });

  socket.on("voiceCountry:moderator:kick", ({ code, targetUserId } = {}) => {
    if (socketCooldownV416A(socket, "voice_country_moderator_kick_v476i4", 1200)) return;
    if (!isVoiceCountryModeratorV476D1R2(socket)) return socket.emit("voiceCountry:notice", { ok: false, message: "هذا الخيار للمشرف فقط" });

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const joinedCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
    const target = String(targetUserId || "");
    const actor = String(socket?.user?.id || "");
    if (!safeCode || !target || !actor || target === actor || safeCode !== joinedCode) return socket.emit("voiceCountry:notice", { ok: false, message: "لا يمكن تنفيذ هذا الإجراء" });

    removeVoiceCountrySpeakerAndQueueV476D1R2(safeCode, target, false);
    removeFromVoiceCountryHandQueueV476D1R2(safeCode, target);

    let kicked = 0;
    try {
      for (const [sid, row] of voiceCountrySocketIndexV475F2.entries()) {
        if (row && String(row.userId || "") === target && normalizeVoiceCountryCodeV475B(row.code || "") === safeCode) {
          const targetSocket = io.sockets.sockets.get(String(sid));
          if (targetSocket) {
            try { targetSocket.emit("voiceCountry:notice", { ok: false, message: "تم إخراجك من المجلس بواسطة المشرف" }); } catch {}
            try { targetSocket.emit("voiceCountry:kicked", { code: safeCode, message: "تم إخراجك من المجلس بواسطة المشرف" }); } catch {}
            try { targetSocket.emit("voiceCountry:joined", { code: "", count: 0, participants: [] }); } catch {}
            try { removeVoiceCountryPresenceForSocketV475F2(targetSocket, "moderator_kick_v476i4"); } catch {}
            try { targetSocket.voiceCountryCodeV475B = ""; } catch {}
            try { targetSocket.leave(`voiceCountry:${safeCode}`); } catch {}
            kicked++;
          }
        }
      }
    } catch {}

    emitVoiceCountryVoiceStatesV475E1(safeCode);
    emitVoiceCountryStateV475B(safeCode);
    emitVoiceCountryListV475B();
    socket.emit("voiceCountry:notice", { ok: true, message: kicked ? "تم إخراج اللاعب من المجلس" : "تم حذف اللاعب من قائمة المجلس إن كان موجودًا" });
    pushVoiceCountryModerationLogV476J(safeCode, "kick_user", socket, target, "إخراج لاعب من المجلس"); // V476J_R6_MOD_LOG_KICK
  });

  socket.on("voiceCountry:moderation:toggle", ({ code, key, value } = {}) => { // V476J_R6_COUNTRY_COUNCIL_POLISH_SERVER_SAFE
    if (socketCooldownV416A(socket, "voice_country_moderation_toggle_v476j_r6", 900)) return;
    if (!isVoiceCountryModeratorV476D1R2(socket)) return socket.emit("voiceCountry:notice", { ok: false, message: "هذا الخيار للمشرف فقط" });

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const joinedCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
    if (!safeCode || safeCode !== joinedCode) return socket.emit("voiceCountry:notice", { ok: false, message: "ادخل المجلس أولًا" });

    const settings = getVoiceCountryModerationSettingsV476J(safeCode);
    const k = String(key || "");
    if (k === "handLocked") settings.handLocked = !!value;
    else if (k === "chatLocked") settings.chatLocked = !!value;
    else return socket.emit("voiceCountry:notice", { ok: false, message: "خيار غير صحيح" });

    settings.updatedAt = Date.now();
    voiceCountryModerationSettingsV476J.set(safeCode, settings);

    const msg = k === "handLocked"
      ? (settings.handLocked ? "تم قفل رفع اليد مؤقتًا" : "تم فتح رفع اليد")
      : (settings.chatLocked ? "تم قفل رسائل المجلس مؤقتًا" : "تم فتح رسائل المجلس");

    pushVoiceCountryModerationLogV476J(safeCode, k, socket, "", msg);
    emitVoiceCountryModerationStateV476J(safeCode);
    socket.emit("voiceCountry:notice", { ok: true, message: msg });
  });



  socket.on("voiceCountry:report", ({ code, messageId, reason } = {}) => { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    if (!safeCode) return socket.emit("voiceCountry:notice", { ok: false, message: "ادخل المجلس أولًا" });

    cleanupVoiceCountryMessagesV475G7DR3(safeCode); // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
    const msg = findVoiceCountryMessageV475D(safeCode, messageId);
    if (!msg) return socket.emit("voiceCountry:notice", { ok: false, message: "لم يتم العثور على الرسالة" });

    const reportGuardV475G7DR3 = makeVoiceCountryReportGuardV475G7DR3({
      code: safeCode,
      messageId: String(messageId || ""),
      reporterId: String(socket.user?.id || ""),
      reportedUserId: String(msg?.userId || "")
    }); // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE

    if (!reportGuardV475G7DR3.ok) {
      return socket.emit("voiceCountry:notice", { ok: false, message: reportGuardV475G7DR3.message || "تعذر تسجيل البلاغ" });
    }

    pushVoiceCountryReportV475D({
      code: safeCode,
      messageId: String(messageId || ""),
      reporterId: String(socket.user?.id || ""),
      reportedUserId: String(msg?.userId || ""),
      reportedUsername: String(msg?.username || msg?.senderName || "لاعب"),
      textPreview: String(msg?.text || "").slice(0, 120),
      reason: String(reason || "message_report").slice(0, 80),
      status: String(reportGuardV475G7DR3.status || "recorded"),
      uniqueReporters: Number(reportGuardV475G7DR3.uniqueReportersAfter || 1),
      priority: String(reportGuardV475G7DR3.priority || "normal"),
      hiddenByReports: !!reportGuardV475G7DR3.hideMessage
    });

    if (reportGuardV475G7DR3.hideMessage) { // V475G7D_R3_SERVER_ONLY_TTL_REPORTS_SAFE
      hideVoiceCountryMessageByReportsV475G7DR3(safeCode, messageId, reportGuardV475G7DR3.uniqueReportersAfter);
      io.to(`voiceCountry:${safeCode}`).emit("voiceCountry:messages", {
        code: safeCode,
        messages: getVisibleVoiceCountryMessagesV475G7DR3(safeCode).slice(-VOICE_COUNTRY_MAX_MESSAGES_V475C)
      });
    }

    socket.emit("voiceCountry:notice", { ok: true, message: "تم إرسال البلاغ للمراجعة ✅" });
  });

  socket.on("voiceCountry:mutes:get", ({ code } = {}) => { // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE
    if (socketCooldownV416A(socket, "voice_country_mutes_get_v475f1", 900)) return;

    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    socket.emit("voiceCountry:mutes", {
      code: safeCode,
      mutes: getVoiceCountryMutesForUserV475F1(socket.user?.id, safeCode)
    });
  });

  socket.on("voiceCountry:mute", ({ code, targetUserId, targetUsername } = {}) => { // V475D_COUNTRY_ROOM_CHAT_PROTECTION_SAFE
    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const ok = addVoiceCountryMuteV475D(socket.user?.id, targetUserId);
    if (ok) persistVoiceCountryMuteV475F1(socket.user?.id, targetUserId, safeCode, targetUsername); // V475F1_COUNTRY_ROOM_PERSIST_REPORTS_MUTES_SAFE

    if (!safeCode || !ok) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "تعذر كتم هذا اللاعب" });
    }

    socket.emit("voiceCountry:notice", {
      ok: true,
      message: `تم كتم ${String(targetUsername || "اللاعب").slice(0, 30)} مؤقتًا`
    });
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

    const activeVoiceCodeV475B3 = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || ""); // V475B3_COUNTRY_ROOM_PLAYER_CARD_PRIVACY_SAFE
    if (activeVoiceCodeV475B3) {
      const dbV475B3 = readDb();
      const dbUserV475B3 = (dbV475B3.users || []).find((u) => String(u.id) === String(socket.user.id));
      const mapV475B3 = getVoiceCountryMapV475B(activeVoiceCodeV475B3);
      if (mapV475B3) {
        mapV475B3.set(String(socket.user.id), makeVoiceCountryParticipantV475B3(socket, dbUserV475B3));
        emitVoiceCountryStateV475B(activeVoiceCodeV475B3);
        emitVoiceCountryListV475B();
      }
    }

    socket.emit("rooms:list", roomList());
  });

  socket.on("room:create", ({ game, maxPlayers, dominoMode, wager, matchMode } = {}, ackV221) => {
    if (socketCooldownV416A(socket, "room_create", 1800)) return; // V416A
    // V221: نرجع تأكيد للعميل أن البحث/الغرفة أضافته فعلاً أو نرجع سبب الفشل.
    const replyCreateV221 = (payload) => {
      try {
        if (typeof ackV221 === "function") ackV221(payload || {});
      } catch {}
    };
    const allowedGames = ["domino", "chess", "carrom", "billiards"];
    if (!allowedGames.includes(game)) {
      replyCreateV221({ ok: false, error: "GAME_NOT_ALLOWED" });
      return socket.emit("error:message", "GAME_NOT_ALLOWED");
    }

    const roomMaxPlayers = Number(maxPlayers) === 4 ? 4 : 2;
    const safeDominoMode = game === "domino" && roomMaxPlayers === 4 && String(dominoMode) === "teams" ? "teams" : "classic";
    const safeWagerV136IK = normalizeWagerV136IK(wager);

    {
      const db = readDb();
      const creator = db.users.find((u) => u.id === socket.user.id);
      if (!creator || Number(creator.coins || 0) < safeWagerV136IK) {
        replyCreateV221({ ok: false, error: `رصيدك لا يكفي لإنشاء تحدي عملات ${safeWagerV136IK} كوينز` });
        return socket.emit("error:message", `رصيدك لا يكفي لإنشاء تحدي عملات ${safeWagerV136IK} كوينز`);
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
        replyCreateV221({ ok: true, joinedExisting: true, room: publicRoom(existingRoom, socket.user.id) });
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
    replyCreateV221({ ok: true, created: true, room: publicRoom(room, socket.user.id) });
  });

  socket.on("room:join", ({ roomId, expectedGame, expectedMaxPlayers, expectedDominoMode }) => {
    if (socketCooldownV416A(socket, `room_join_${String(roomId || "")}`, 1000)) return; // V416A
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
        return socket.emit("error:message", `رصيدك لا يكفي لدخول تحدي عملات ${room.wager.amount} كوينز`);
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
    if (socketCooldownV416A(socket, `room_add_bot_${String(roomId || "")}`, 2500)) return; // V416A
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

    // V179_TWO_PLAYER_WITHDRAWAL_WINNER_READY:
    // شطرنج/كيرم/بلياردو 2 لاعبين: الخروج أثناء اللعب = خسارة المنسحب وفوز الباقي.
    if (
      room.status === "playing" &&
      Number(room.maxPlayers || 2) === 2 &&
      ["chess", "carrom", "billiards"].includes(String(room.game || ""))
    ) {
      handleTwoPlayerWithdrawalV179(room, socket.user.id, "فوز بسبب انسحاب اللاعب الآخر");
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


  // V454_SUBSCRIPTION_GIFTS_ONLY_NO_COIN_PRICES: إرسال الهدايا حسب الاشتراك فقط، بدون خصم كوينز وبدون مخزون قابل لإعادة الإرسال.
  socket.on("gift:send", ({ roomId, toUserId, giftType } = {}) => {
    const room = rooms.get(String(roomId || ""));
    if (!room) return socket.emit("error:message", "ROOM_NOT_FOUND");

    const sender = (room.players || []).find((p) => String(p.id) === String(socket.user.id));
    if (!sender) return socket.emit("error:message", "NOT_IN_ROOM");
    if (socketCooldownV416A(socket, `gift_send_${room.id}`, 4500)) return;

    const receiver = (room.players || []).find((p) => String(p.id) === String(toUserId));
    if (!receiver) return socket.emit("error:message", "GIFT_RECEIVER_NOT_IN_ROOM");
    if (String(receiver.id) === String(sender.id)) {
      return socket.emit("error:message", "لا يمكنك إرسال الهدية لنفسك");
    }

    const safeGiftType = String(giftType || "").trim().slice(0, 40);
    if (!VIP_GIFT_TYPES_V454[safeGiftType]) {
      return socket.emit("error:message", "GIFT_NOT_READY");
    }

    const dbGiftV454 = readDb();
    const userObjV454 = dbGiftV454.users.find((u) => String(u.id) === String(socket.user.id));
    if (!userObjV454) {
      return socket.emit("error:message", "USER_NOT_FOUND");
    }

    const giftPermissionV454 = canSendSubscriptionGiftV454(userObjV454, safeGiftType);
    if (!giftPermissionV454.ok) {
      return socket.emit("error:message", giftPermissionV454.message || "🎁 إرسال الهدايا يحتاج اشتراك الهدايا.");
    }

    if (giftPermissionV454.usageAfter) {
      userObjV454.vipGiftUsageV454 = giftPermissionV454.usageAfter;
    }

    userObjV454.walletLog = Array.isArray(userObjV454.walletLog) ? userObjV454.walletLog : [];
    userObjV454.walletLog.unshift({
      type: "gift_subscription_send_v454",
      giftType: safeGiftType,
      giftName: VIP_GIFT_TYPES_V454[safeGiftType] || safeGiftType,
      plan: giftPermissionV454.plan.planId,
      coins: 0,
      at: new Date().toISOString()
    });
    userObjV454.walletLog = userObjV454.walletLog.slice(0, 30);

    if (!room.giftHistoryV178) room.giftHistoryV178 = [];

    const senderGiftNameV474T2 = String(sender.username || sender.name || "لاعب").trim() || "لاعب"; // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
    const receiverGiftNameV474T2 = String(receiver.username || receiver.name || "لاعب").trim() || "لاعب"; // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
    const giftRouteTextV474T2 = `${senderGiftNameV474T2} أرسل إلى ${receiverGiftNameV474T2}`; // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE

    const giftEvent = {
      id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roomId: room.id,
      fromUserId: sender.id,
      senderUserId: sender.id, // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
      fromName: senderGiftNameV474T2,
      senderName: senderGiftNameV474T2, // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
      routeFromName: senderGiftNameV474T2, // V474X_SERVER_EXPLICIT_ROUTE_PARTS_SAFE
      fromUsername: senderGiftNameV474T2, // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
      toUserId: receiver.id,
      receiverUserId: receiver.id, // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
      toName: receiverGiftNameV474T2,
      receiverName: receiverGiftNameV474T2, // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
      routeToName: receiverGiftNameV474T2, // V474X_SERVER_EXPLICIT_ROUTE_PARTS_SAFE
      toUsername: receiverGiftNameV474T2, // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
      routeText: giftRouteTextV474T2, // V474T2_SERVER_AUTH_GIFT_ROUTE_LOCKED_TEXT_SAFE
      giftType: safeGiftType,
      giftName: VIP_GIFT_TYPES_V454[safeGiftType] || safeGiftType,
      price: 0,
      originalPrice: 0,
      vipDiscountPercent: 0,
      free: true,
      giftSource: "subscription",
      fromInventory: false,
      inventoryDeltaSender: 0,
      inventoryDeltaReceiver: 0,
      vipPlan: giftPermissionV454.plan.planId,
      createdAt: new Date().toISOString()
    };

    try {
      const receiverObjV454 = dbGiftV454.users.find((u) => String(u.id) === String(receiver.id));
      if (receiverObjV454) {
        receiverObjV454.receivedGifts = Array.isArray(receiverObjV454.receivedGifts) ? receiverObjV454.receivedGifts : [];
        receiverObjV454.receivedGifts.unshift({
          id: giftEvent.id,
          roomId: giftEvent.roomId,
          fromUserId: giftEvent.fromUserId,
          fromName: giftEvent.fromName,
          giftType: giftEvent.giftType,
          giftName: giftEvent.giftName,
          price: 0,
          source: giftEvent.giftSource,
          fromInventory: false,
          inventoryDelta: 0,
          createdAt: giftEvent.createdAt,
          status: "received"
        });
        receiverObjV454.receivedGifts = receiverObjV454.receivedGifts.slice(0, 100);
        receiverObjV454.giftStats = receiverObjV454.giftStats && typeof receiverObjV454.giftStats === "object" ? receiverObjV454.giftStats : { sent: 0, received: 0 };
        receiverObjV454.giftStats.received = Number(receiverObjV454.giftStats.received || 0) + 1;
      }

      userObjV454.sentGifts = Array.isArray(userObjV454.sentGifts) ? userObjV454.sentGifts : [];
      userObjV454.sentGifts.unshift({
        id: giftEvent.id,
        roomId: giftEvent.roomId,
        toUserId: giftEvent.toUserId,
        toName: giftEvent.toName,
        giftType: giftEvent.giftType,
        giftName: giftEvent.giftName,
        price: 0,
        source: giftEvent.giftSource,
        fromInventory: false,
        inventoryDelta: 0,
        createdAt: giftEvent.createdAt,
        status: "sent"
      });
      userObjV454.sentGifts = userObjV454.sentGifts.slice(0, 100);
      userObjV454.giftStats = userObjV454.giftStats && typeof userObjV454.giftStats === "object" ? userObjV454.giftStats : { sent: 0, received: 0 };
      userObjV454.giftStats.sent = Number(userObjV454.giftStats.sent || 0) + 1;

      writeDb(dbGiftV454);
      try { emitUserUpdateV136IK(String(receiver.id)); } catch {}
      try { emitUserUpdateV136IK(String(socket.user.id)); } catch {}
    } catch (giftPersistErrV454) {
      console.error("V454_SUBSCRIPTION_GIFT_PERSIST_FAILED", giftPersistErrV454);
      return socket.emit("error:message", "تعذر حفظ الهدية");
    }

    room.giftHistoryV178.push(giftEvent);
    room.giftHistoryV178 = room.giftHistoryV178.slice(-100);

    io.to(room.id).emit("gift:sent", giftEvent);
    emitRoom(room);
  });


  socket.on("voiceCountry:gift", ({ code, toUserId, giftType } = {}) => { // V475G7C2_R3_COUNTRY_GIFT_BROADCAST_SERVER_SAFE
    const safeCode = normalizeVoiceCountryCodeV475B(code || socket.voiceCountryCodeV475B || "");
    const joinedCode = normalizeVoiceCountryCodeV475B(socket.voiceCountryCodeV475B || "");
    if (!safeCode || !joinedCode || safeCode !== joinedCode) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "ادخل المجلس أولًا قبل إرسال هدية" });
    }

    if (socketCooldownV416A(socket, `voice_country_gift_${safeCode}`, 4500)) return;

    const safeGiftType = String(giftType || "").trim().slice(0, 40);
    if (!VIP_GIFT_TYPES_V454[safeGiftType]) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "هدية غير صحيحة" });
    }

    const map = getVoiceCountryMapV475B(safeCode);
    const targetRaw = String(toUserId || "");
    if (!map || !targetRaw) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "اختر لاعبًا داخل المجلس" });
    }

    const entries = Array.from(map.entries());
    const targetEntry = entries.find(([uid, p]) =>
      String(uid || "") === targetRaw ||
      String(p?.userId || "") === targetRaw ||
      String(p?.id || "") === targetRaw ||
      String(p?.socketId || "") === targetRaw
    );

    if (!targetEntry) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "اللاعب غير موجود داخل المجلس" });
    }

    const [targetUserIdReal, targetParticipant] = targetEntry;
    if (!targetUserIdReal || String(targetUserIdReal) === String(socket.user?.id || "")) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "لا يمكنك إرسال هدية لنفسك" });
    }

    const dbGiftV475G7C2 = readDb();
    const senderObjV475G7C2 = (dbGiftV475G7C2.users || []).find((u) => String(u.id) === String(socket.user.id));
    const receiverObjV475G7C2 = (dbGiftV475G7C2.users || []).find((u) => String(u.id) === String(targetUserIdReal));

    if (!senderObjV475G7C2) {
      return socket.emit("voiceCountry:notice", { ok: false, message: "تعذر معرفة المرسل" });
    }

    const giftPermissionV475G7C2 = canSendSubscriptionGiftV454(senderObjV475G7C2, safeGiftType);
    if (!giftPermissionV475G7C2.ok) {
      return socket.emit("voiceCountry:notice", { ok: false, message: giftPermissionV475G7C2.message || "🎁 إرسال الهدايا يحتاج اشتراك الهدايا." });
    }

    if (giftPermissionV475G7C2.usageAfter) {
      senderObjV475G7C2.vipGiftUsageV454 = giftPermissionV475G7C2.usageAfter;
    }

    const senderNameV475G7C2 = String(senderObjV475G7C2.username || senderObjV475G7C2.name || socket.user?.username || "لاعب").trim() || "لاعب";
    const receiverNameV475G7C2 = String(
      receiverObjV475G7C2?.username ||
      receiverObjV475G7C2?.name ||
      targetParticipant?.username ||
      targetParticipant?.name ||
      "لاعب"
    ).trim() || "لاعب";
    const routeTextV475G7C2 = `${senderNameV475G7C2} أرسل إلى ${receiverNameV475G7C2}`;

    const giftEvent = {
      id: `vcgift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roomId: `voiceCountry:${safeCode}`,
      voiceCountryCode: safeCode,
      countryCode: safeCode,
      channelType: "voiceCountry",
      fromUserId: String(socket.user.id),
      fromName: senderNameV475G7C2,
      senderName: senderNameV475G7C2,
      routeFromName: senderNameV475G7C2,
      fromUsername: senderNameV475G7C2,
      toUserId: String(targetUserIdReal),
      toName: receiverNameV475G7C2,
      receiverName: receiverNameV475G7C2,
      routeToName: receiverNameV475G7C2,
      toUsername: receiverNameV475G7C2,
      routeText: routeTextV475G7C2,
      giftType: safeGiftType,
      giftName: VIP_GIFT_TYPES_V454[safeGiftType] || safeGiftType,
      giftSource: "subscription",
      vipPlan: giftPermissionV475G7C2.plan?.planId || "",
      createdAt: Date.now()
    };

    try {
      if (receiverObjV475G7C2) {
        receiverObjV475G7C2.receivedGifts = Array.isArray(receiverObjV475G7C2.receivedGifts) ? receiverObjV475G7C2.receivedGifts : [];
        receiverObjV475G7C2.receivedGifts.unshift({
          id: giftEvent.id,
          roomId: giftEvent.roomId,
          fromUserId: giftEvent.fromUserId,
          fromName: giftEvent.fromName,
          giftType: giftEvent.giftType,
          giftName: giftEvent.giftName,
          source: giftEvent.giftSource,
          createdAt: giftEvent.createdAt
        });
        receiverObjV475G7C2.receivedGifts = receiverObjV475G7C2.receivedGifts.slice(0, 100);
        receiverObjV475G7C2.giftStats = receiverObjV475G7C2.giftStats && typeof receiverObjV475G7C2.giftStats === "object" ? receiverObjV475G7C2.giftStats : { sent: 0, received: 0 };
        receiverObjV475G7C2.giftStats.received = Number(receiverObjV475G7C2.giftStats.received || 0) + 1;
      }

      senderObjV475G7C2.sentGifts = Array.isArray(senderObjV475G7C2.sentGifts) ? senderObjV475G7C2.sentGifts : [];
      senderObjV475G7C2.sentGifts.unshift({
        id: giftEvent.id,
        roomId: giftEvent.roomId,
        toUserId: giftEvent.toUserId,
        toName: giftEvent.toName,
        giftType: giftEvent.giftType,
        giftName: giftEvent.giftName,
        source: giftEvent.giftSource,
        createdAt: giftEvent.createdAt
      });
      senderObjV475G7C2.sentGifts = senderObjV475G7C2.sentGifts.slice(0, 100);
      senderObjV475G7C2.giftStats = senderObjV475G7C2.giftStats && typeof senderObjV475G7C2.giftStats === "object" ? senderObjV475G7C2.giftStats : { sent: 0, received: 0 };
      senderObjV475G7C2.giftStats.sent = Number(senderObjV475G7C2.giftStats.sent || 0) + 1;
      writeDb(dbGiftV475G7C2);
    } catch (err) {
      console.error("V475G7C2_R3_COUNTRY_GIFT_PERSIST_FAILED", err);
    }

    io.to(`voiceCountry:${safeCode}`).emit("gift:sent", giftEvent);
    // V478B_R1_HIDE_EXTRA_GIFT_NOTICES_SAFE: no extra success toast; only route text appears above gift.
  });

  socket.on("chat:send", ({ roomId, text }) => {
    const room = rooms.get(String(roomId || ""));
    if (!room) return;
    if (!isRoomPlayerV416A(room, socket.user.id)) return socket.emit("error:message", "NOT_IN_ROOM"); // V416A
    if (socketCooldownV416A(socket, `chat_send_${room.id}`, 1000)) return; // V416A

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
  function normalizeVoiceCountryLiveRoomIdV478K(roomId) { // V478K_COUNCIL_USE_GAME_LIVE_ENGINE_SAFE
    const raw = String(roomId || "").trim();
    if (!raw.startsWith("voiceCountry:")) return "";
    return normalizeVoiceCountryCodeV475B(raw.replace(/^voiceCountry:/, ""));
  }

  function emitVoiceCountryLiveEngineSignalV478K(socket, eventName, roomId, payload = {}, toUserId) { // V478K_COUNCIL_USE_GAME_LIVE_ENGINE_SAFE
    const safeCode = normalizeVoiceCountryLiveRoomIdV478K(roomId);
    const joinedCode = normalizeVoiceCountryCodeV475B(socket?.voiceCountryCodeV475B || "");
    if (!safeCode || !joinedCode || safeCode !== joinedCode) return false;

    const fromUserId = String(socket?.user?.id || "");
    const targetUserId = String(toUserId || payload?.toUserId || "");
    if (!fromUserId || !targetUserId || fromUserId === targetUserId) return false;

    const map = getVoiceCountryMapV475B(safeCode);
    if (!map || !map.has(fromUserId) || !map.has(targetUserId)) return false;

    const fromParticipant = map.get(fromUserId) || {};
    const packet = {
      roomId: `voiceCountry:${safeCode}`,
      userId: fromUserId,
      username: String(fromParticipant?.username || socket?.user?.username || "لاعب").slice(0, 60),
      toUserId: targetUserId,
      at: Date.now(),
      ...payload
    };

    let sent = 0;
    try {
      for (const [sid, row] of voiceCountrySocketIndexV475F2.entries()) {
        if (
          row &&
          String(row.userId || "") === targetUserId &&
          normalizeVoiceCountryCodeV475B(row.code || "") === safeCode
        ) {
          io.to(String(sid)).emit(eventName, packet);
          sent++;
        }
      }
    } catch {}

    // V478L_COUNCIL_GAME_ENGINE_FANOUT_SAFE:
    // إذا لم يصل offer عبر target، ابثه لكل أعضاء المجلس. answer/ice تبقى موجهة.
    if (!sent && eventName === "voice:offer") {
      try {
        for (const [sid, row] of voiceCountrySocketIndexV475F2.entries()) {
          const rowUserIdV478L = String(row?.userId || "");
          if (
            row &&
            rowUserIdV478L &&
            rowUserIdV478L !== fromUserId &&
            normalizeVoiceCountryCodeV475B(row.code || "") === safeCode
          ) {
            io.to(String(sid)).emit(eventName, { ...packet, toUserId: rowUserIdV478L, fanoutV478L: true });
            sent++;
          }
        }
      } catch {}
    }

    return sent > 0;
  }

  socket.on("voice:offer", ({ roomId, toUserId, offer }) => {
    const safeCouncilCodeV478K = normalizeVoiceCountryLiveRoomIdV478K(roomId);
    if (safeCouncilCodeV478K) {
      if (!offer) return;
      emitVoiceCountryLiveEngineSignalV478K(socket, "voice:offer", roomId, { offer }, toUserId);
      return;
    }

    const room = rooms.get(roomId);
    if (!room || !offer) return;
    emitVoiceSignalV137O(socket, room, "voice:offer", { offer }, toUserId);
  });

  socket.on("voice:answer", ({ roomId, toUserId, answer }) => {
    const safeCouncilCodeV478K = normalizeVoiceCountryLiveRoomIdV478K(roomId);
    if (safeCouncilCodeV478K) {
      if (!answer) return;
      emitVoiceCountryLiveEngineSignalV478K(socket, "voice:answer", roomId, { answer }, toUserId);
      return;
    }

    const room = rooms.get(roomId);
    if (!room || !answer) return;
    emitVoiceSignalV137O(socket, room, "voice:answer", { answer }, toUserId);
  });

  socket.on("voice:ice", ({ roomId, toUserId, candidate }) => {
    const safeCouncilCodeV478K = normalizeVoiceCountryLiveRoomIdV478K(roomId);
    if (safeCouncilCodeV478K) {
      if (!candidate) return;
      emitVoiceCountryLiveEngineSignalV478K(socket, "voice:ice", roomId, { candidate }, toUserId);
      return;
    }

    const room = rooms.get(roomId);
    if (!room || !candidate) return;
    emitVoiceSignalV137O(socket, room, "voice:ice", { candidate }, toUserId);
  });

  socket.on("voice:mute", ({ roomId, muted }) => {
    const safeCouncilCodeV478K = normalizeVoiceCountryLiveRoomIdV478K(roomId);
    if (safeCouncilCodeV478K) {
      const safeCode = normalizeVoiceCountryLiveRoomIdV478K(roomId);
      setVoiceCountryVoiceStateV475E1(socket, safeCode, { muted: !!muted, speaking: !muted });
      emitVoiceCountryVoiceStatesV475E1(safeCode);
      io.to(`voiceCountry:${safeCode}`).emit("voice:muted", {
        roomId: `voiceCountry:${safeCode}`,
        userId: String(socket?.user?.id || ""),
        username: String(socket?.user?.username || "لاعب"),
        muted: !!muted
      });
      return;
    }

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

    let safeState = state && typeof state === "object" ? state : {};

    // V294_GAME_ISOLATION_APP_SERVER_READY:
    // عزل صارم: لا نقبل snapshot ممهورة بلعبة مختلفة أو kind مختلف داخل نفس الغرفة.
    const requestedStateGameV294 = String((safeState && (safeState.game || safeState.gameScopeV294)) || game || room.game || "");
    const requestedStateKindV294 = String((safeState && safeState.kind) || "");
    if (requestedStateGameV294 && requestedStateGameV294 !== room.game) {
      return socket.emit("error:message", "BETA_STATE_GAME_SCOPE_MISMATCH");
    }
    if (room.game === "carrom" && /billiards/i.test(requestedStateKindV294)) {
      return socket.emit("error:message", "BETA_STATE_KIND_MISMATCH");
    }
    if (room.game === "billiards" && /carrom/i.test(requestedStateKindV294)) {
      return socket.emit("error:message", "BETA_STATE_KIND_MISMATCH");
    }

    // V187F_SANITIZE_BETA_STATE_READY:
    // تنظيف بيانات الطاولة قبل فحص الحماية.
    safeState = betaSanitizeStateV187F(safeState) || {};

    // V187_BETA_ANTI_CHEAT_GUARD_READY:
    // فحص حجم/شكل/معدل بيانات الطاولة قبل قبولها.
    if (betaJsonSizeV187(safeState) > BETA_STATE_MAX_BYTES_V187) {
      return betaRejectV187(socket, "BETA_STATE_TOO_LARGE", "بيانات الطاولة كبيرة جدًا");
    }

    if (!betaStateLooksSafeV187(safeState)) {
      return betaRejectV187(socket, "BETA_STATE_UNSAFE", "بيانات الطاولة غير آمنة");
    }

    room.beta = room.beta || {};
    const nowV187 = Date.now();
    const terminalUpdateV187 = betaIsTerminalUpdateV187(safeState);

    room.beta.lastStateAtByUserV187 = room.beta.lastStateAtByUserV187 || {};
    const lastStateAtV187 = Number(room.beta.lastStateAtByUserV187[String(socket.user.id)] || 0);

    if (!terminalUpdateV187 && nowV187 - lastStateAtV187 < BETA_STATE_MIN_INTERVAL_MS_V187) {
      return socket.emit("beta:state:ack", { roomId: room.id, dropped: true, reason: "RATE_LIMIT" });
    }

    room.beta.lastStateAtByUserV187[String(socket.user.id)] = nowV187;
    room.beta = room.beta || {};
    if (!room.beta.turnUserId) setBetaTurnV138(room, (room.players || [])[0]?.id);
    const currentBetaTurnUserIdV269 = String(room.beta.turnUserId || "");
    const currentBetaTurnPlayerV269 = (room.players || []).find((p) => String(p?.id || "") === currentBetaTurnUserIdV269) || null;
    const carromDelegatedBotTurnV269 =
      room.game === "carrom" &&
      currentBetaTurnUserIdV269 &&
      currentBetaTurnUserIdV269 !== String(socket.user.id) &&
      String(room.matchMode || "live") !== "live" &&
      (isBotIdV136IK(currentBetaTurnUserIdV269) || isBotPlayer(currentBetaTurnPlayerV269));

    if (room.beta.turnUserId && String(room.beta.turnUserId) !== String(socket.user.id) && !carromDelegatedBotTurnV269) {
      return socket.emit("error:message", "ليس دورك الآن");
    }

    const seq = Number(safeState.seq || Date.now());

    if (!Number.isFinite(seq) || seq <= 0 || seq > Date.now() + BETA_SEQ_FUTURE_DRIFT_MS_V187) {
      return betaRejectV187(socket, "BETA_BAD_SEQ", "ترتيب بيانات الطاولة غير صحيح");
    }

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
      gameScopeV294: room.game,
      roomId: room.id,
      fromUserId: socket.user.id,
      fromUsername: socket.user.username,
      turnUserId: room.beta.turnUserId || null,
      turnUsername: room.beta.turnUsername || null,
      serverAt: new Date().toISOString()
    };
    room.beta.lastAction = `${socket.user.username} حدّث حالة ${room.game === "carrom" ? "الكيرم" : "البلياردو"}`;

    // V237B_TURN_RULE_AUTHORITATIVE:
    // shotComplete = انتهت الضربة فقط، وليس سببًا دائمًا لنقل الدور.
    // السيرفر يثبت الدور فقط عندما تصله نتيجة قانون صريحة من اللعبة.
    const explicitTurnResultV237 =
      safeState.turnResultV237 === true ||
      typeof safeState.turnContinues === "boolean" ||
      typeof safeState.authoritativeTurnUserId !== "undefined" ||
      typeof safeState.nextTurnUserId !== "undefined";

    let turnWasResolvedV237 = false;

    if (explicitTurnResultV237) {
      const playersV237 = room.players || [];
      const actorIdV237 = carromDelegatedBotTurnV269 ? currentBetaTurnUserIdV269 : String(socket.user.id);
      const currentIndexV237 = Math.max(0, playersV237.findIndex((p) => String(p.id) === String(room.beta.turnUserId || actorIdV237)));
      const fallbackNextPlayerV237 = playersV237.length ? playersV237[(currentIndexV237 + 1) % playersV237.length] : null;
      const requestedIdV237 = String(safeState.authoritativeTurnUserId || safeState.nextTurnUserId || "").trim();
      const requestedPlayerV237 = playersV237.find((p) => String(p.id) === requestedIdV237) || null;
      const continuesV237 = safeState.turnContinues === true;

      const finalPlayerV237 = continuesV237
        ? (playersV237.find((p) => String(p.id) === actorIdV237) || requestedPlayerV237 || fallbackNextPlayerV237)
        : (requestedPlayerV237 || fallbackNextPlayerV237);

      if (finalPlayerV237 && finalPlayerV237.id) {
        setBetaTurnV138(room, finalPlayerV237.id);
        turnWasResolvedV237 = true;
        room.beta.lastTurnDecisionV237 = {
          byUserId: actorIdV237,
          turnContinues: continuesV237,
          authoritativeTurnUserId: room.beta.turnUserId || null,
          requestedTurnUserId: requestedIdV237 || null,
          reason: String(safeState.turnDecisionReason || safeState.reason || "").slice(0, 160),
          at: new Date().toISOString()
        };

        room.beta.realtimeState.turnResultV237 = true;
        room.beta.realtimeState.shotComplete = safeState.shotComplete === true;
        room.beta.realtimeState.turnContinues = continuesV237;
        room.beta.realtimeState.authoritativeTurnUserId = room.beta.turnUserId || null;
        room.beta.realtimeState.nextTurnUserId = room.beta.turnUserId || null;
        room.beta.realtimeState.nextTurnUsername = room.beta.turnUsername || null;
        room.beta.realtimeState.turnUserId = room.beta.turnUserId || null;
        room.beta.realtimeState.turnUsername = room.beta.turnUsername || null;
        room.beta.realtimeState.turnDecisionReason = room.beta.lastTurnDecisionV237.reason;
      }
    } else if (safeState.nextTurn === true || safeState.turnDone === true) {
      // Legacy: nextTurn/turnDone فقط تنقل الدور. shotComplete وحدها لا تنقل.
      advanceBetaTurnV138(room);
      turnWasResolvedV237 = true;
      room.beta.realtimeState.nextTurnUserId = room.beta.turnUserId || null;
      room.beta.realtimeState.nextTurnUsername = room.beta.turnUsername || null;
      room.beta.realtimeState.turnUserId = room.beta.turnUserId || null;
      room.beta.realtimeState.turnUsername = room.beta.turnUsername || null;
      room.beta.realtimeState.legacyTurnResultV237 = true;
    }

    if (turnWasResolvedV237) {
      scheduleBetaTurnTimerV138H(room);
    }

    room.beta.realtimeState.turnStartedAt = room.beta.turnStartedAt || null;
    room.beta.realtimeState.turnEndsAt = room.beta.turnEndsAt || null;

    // V238_HUMAN_TURN_COUNTDOWN_SYNC:
    // أرسل نتيجة الدور الرسمية لكل اللاعبين، حتى اللاعب الذي أرسل الضربة،
    // لأن صاحب الضربة يحتاج turnEndsAt الجديد إذا نفس اللاعب سيكمل.
    room.beta.realtimeState.serverAuthoritativeTurnV238 = true;
    io.to(room.id).emit("beta:state", room.beta.realtimeState);
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
    room.beta = room.beta || {};

    // V187_BETA_ANTI_CHEAT_GUARD_READY:
    // منع إنهاء مباراة كيرم/بلياردو من غير الدور أو مباشرة بعد البداية.
    if (room.beta.turnUserId && String(room.beta.turnUserId) !== String(socket.user.id)) {
      return betaRejectV187(socket, "BETA_FINISH_NOT_YOUR_TURN", "لا يمكنك إنهاء المباراة الآن: ليس دورك");
    }

    const startedAtV187 = Date.parse(String(room.beta.startedAt || ""));
    if (Number.isFinite(startedAtV187) && Date.now() - startedAtV187 < BETA_MATCH_MIN_FINISH_MS_V187) {
      return betaRejectV187(socket, "BETA_FINISH_TOO_EARLY", "لا يمكن إنهاء المباراة بهذه السرعة");
    }

    if (room.beta.lastFinishAtV187 && Date.now() - Number(room.beta.lastFinishAtV187) < 3000) return;
    room.beta.lastFinishAtV187 = Date.now();

    const safeWinnerId = String(winnerId || socket.user.id);
    const winner = (room.players || []).find((p) => String(p.id) === safeWinnerId);
    if (!winner) return betaRejectV187(socket, "BETA_BAD_WINNER", "الفائز غير موجود في الغرفة");

    room.beta.serverFinishGuardV138 = true;
    room.beta.lastFinishReasonV137K = String(reason || "انتهت المباراة").slice(0, 140);
    finishRoom(room, winner.id);
  });

  socket.on("beta:score", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !["carrom", "billiards"].includes(room.game)) return;

    if (room.status !== "playing") return socket.emit("error:message", "GAME_NOT_STARTED");
    if (room.beta?.turnUserId && String(room.beta.turnUserId) !== String(socket.user.id)) return socket.emit("error:message", "ليس دورك الآن");

    room.beta.lastScoreAtByUserV187 = room.beta.lastScoreAtByUserV187 || {};
    const nowScoreV187 = Date.now();
    const lastScoreAtV187 = Number(room.beta.lastScoreAtByUserV187[String(socket.user.id)] || 0);

    if (nowScoreV187 - lastScoreAtV187 < 1200) return socket.emit("error:message", "انتظر قبل تسجيل نقطة أخرى");

    room.beta.lastScoreAtByUserV187[String(socket.user.id)] = nowScoreV187;

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

        // V179_TWO_PLAYER_WITHDRAWAL_WINNER_READY:
        // إذا انقطع اللاعب أثناء مباراة 2 لاعبين، يعتبر انسحابًا حتى لا تتعلق المباراة.
        try {
          if (room && room.status === "playing" && Number(room.maxPlayers || 2) === 2) {
            if (String(room.game || "") === "domino") {
              handleDominoPlayerLeave(room, socket.user.id);
              return;
            }

            if (["chess", "carrom", "billiards"].includes(String(room.game || ""))) {
              handleTwoPlayerWithdrawalV179(room, socket.user.id, "فوز بسبب انقطاع اللاعب الآخر");
              return;
            }
          }
        } catch {}
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

// V221_QUICK_MATCH_ACK_SERVER_READY: room:create replies with ack so the app knows the player was really added to a waiting/playing room.

// V225_PUBLIC_AVATAR_SERVER_LIMIT_READY: /me/profile accepts larger data:image avatar payloads so avatars are visible to opponents instead of local file:// paths.

// V227_REGISTER_COUNTRY_AUTO_READY: register accepts countryCode from app device locale/timezone instead of forcing YE for every new account.

// V233_BETA_TURN_15S_SERVER_READY: billiards/carrom server turn timeout is 15s so real turn transfer matches the visible 15-to-1 countdown; domino/chess unchanged.

// V233B_SET_BETA_TURN_15S_READY: setBetaTurnV138 now uses BETA_TURN_MS_V233=15000 so every billiards/carrom turn deadline matches visible countdown.

// V235_SERVER_AUTHORITATIVE_BETA_TURN_READY: beta turnDone emits the new authoritative turnUserId/turnEndsAt from server.


// V285_BILLIARDS_REFERENCE_EXACT_VISUAL_RULES_READY: billiards beta turn timer uses 25s; carrom keeps V233 15s.
