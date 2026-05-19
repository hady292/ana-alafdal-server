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

const app = express();

app.get("/", (req, res) => res.status(200).send("ANA_ALAFDAL_SERVER_OK"));
app.get("/health", (req, res) => res.status(200).send("ANA_ALAFDAL_SERVER_OK"));
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

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
  return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function makeId(prefix = "id") {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
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
    avatarUri: user.avatarUri || "",
    countryCode: user.countryCode || "YE"
  };
}

function getUserMeta(userId) {
  if (!userId || String(userId).startsWith("bot_")) return { avatarUri: "", countryCode: "YE" };
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  return { avatarUri: user?.avatarUri || "", countryCode: user?.countryCode || "YE" };
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
    games: ["domino", "chess", "carrom_beta", "billiards_beta"]
  });
});

app.post("/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (username.length < 3) {
    return res.status(400).json({ error: "USERNAME_TOO_SHORT" });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
  }

  const db = readDb();
  const exists = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (exists) {
    return res.status(409).json({ error: "USERNAME_EXISTS" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: makeId("user"),
    username,
    passwordHash,
    points: 0,
    coins: 100,
    wins: 0,
    losses: 0,
    level: 1,
    avatarUri: "",
    countryCode: "YE",
    createdAt: new Date().toISOString()
  };

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

  const db = readDb();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) return res.status(401).json({ error: "INVALID_LOGIN" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "INVALID_LOGIN" });

  res.json({
    token: signToken(user),
    user: publicUser(user)
  });
});

app.get("/me", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  res.json({ user: publicUser(user) });
});

app.patch("/me/profile", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const avatarUri = String(req.body.avatarUri || "").slice(0, 1200);
  const countryCode = String(req.body.countryCode || "YE").trim().toUpperCase().slice(0, 2) || "YE";

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
      maxPlayers: room.maxPlayers || 2
    }));
}

function publicRoom(room, userId) {
  const base = {
    id: room.id,
    game: room.game,
    status: room.status,
    maxPlayers: room.maxPlayers || 2,
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
    chat: room.chat.slice(-50),
    beta: room.beta
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
      isGameOver: room.chess.isGameOver()
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

function drawDominoUntilPlayable(room, userId) {
  if (!room.domino.stock) room.domino.stock = [];
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
  room.domino.stock = tiles;
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
  if (hand.length === 0) { finishRoom(room, userId); return { ok: true }; }
  changeDominoTurn(room, userId);
  return { ok: true };
}

function getBestDominoBlockedWinner(room) {
  const players = room.players || [];
  if (players.length === 0) return null;

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
  if (!room || room.game !== "domino" || room.status !== "playing") return;
  let guard = 0;
  while (guard < ((room.players || []).length + 2)) {
    guard++;
    const current = room.players.find((p) => p.id === room.domino.turn);
    if (!current || !String(current.id).startsWith("bot_")) return;
    drawDominoUntilPlayable(room, current.id);
    const bestMove = findBestDominoMove(room, current.id);
    if (bestMove) { playDomino(room, current.id, bestMove.tile, bestMove.side); botMaybeComment(room, "move"); continue; }
    if (isDominoRoundBlocked(room)) {
      const blockedWinnerId = getBestDominoBlockedWinner(room);
      if (blockedWinnerId) finishRoom(room, blockedWinnerId);
      return;
    }
    changeDominoTurn(room, current.id);
  }
}


const DOMINO_TURN_MS = 15000;
const HUMAN_FIRST_BOT_WAIT_MS = 40000;
const dominoTurnTimers = new Map();
const humanFirstBotTimers = new Map();

function clearHumanFirstBotTimer(roomId) {
  const timer = humanFirstBotTimers.get(roomId);
  if (timer) clearTimeout(timer);
  humanFirstBotTimers.delete(roomId);
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

function fillRoomWithBots(room) {
  if (!room || room.status !== "waiting") return false;
  const maxPlayers = room.maxPlayers || 2;
  let added = false;
  while ((room.players || []).length < maxPlayers) {
    room.players.push(createBotForRoom(room));
    added = true;
  }
  if (added) {
    room.botSocial = room.botSocial || { turnCount: 0, lastAt: 0, recentTexts: [] };
    botWelcome(room);
  }
  return added;
}

function startRoomIfReady(room) {
  if (!room || room.status !== "waiting") return false;
  if ((room.players || []).length < (room.maxPlayers || 2)) return false;
  clearHumanFirstBotTimer(room.id);
  room.status = "playing";
  if (room.game === "domino") {
    startDomino(room);
    playBotIfNeeded(room);
    scheduleDominoTurnTimer(room);
  }
  if (room.game === "chess") {
    playChessBotIfNeeded(room);
  }
  emitRoom(room);
  return true;
}

function scheduleHumanFirstBotTimer(room) {
  if (!room || room.status !== "waiting") return;
  clearHumanFirstBotTimer(room.id);
  if ((room.players || []).length >= (room.maxPlayers || 2)) return;

  room.humanFirstBotWaitMs = HUMAN_FIRST_BOT_WAIT_MS;
  room.humanFirstBotEndsAt = new Date(Date.now() + HUMAN_FIRST_BOT_WAIT_MS).toISOString();

  const timer = setTimeout(() => {
    const live = rooms.get(room.id);
    if (!live || live.status !== "waiting") return;
    if ((live.players || []).length >= (live.maxPlayers || 2)) return;
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
      live.domino.autoMessage = "⏱ تم السحب/التمرير تلقائيًا";
    }
    playBotIfNeeded(live);
    scheduleDominoTurnTimer(live);
    emitRoom(live);
  }, DOMINO_TURN_MS);

  dominoTurnTimers.set(room.id, timer);
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
      const winnerId = room.chess.isCheckmate() ? (players[turnIndex === 0 ? 1 : 0]?.id) : null;
      if (winnerId) finishRoom(room, winnerId);
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

function finishRoom(room, winnerId) {
  clearDominoTurnTimer(room.id);
  clearHumanFirstBotTimer(room.id);
  if (room.game === "domino") {
    if (!room.domino.scores) room.domino.scores = {};

    for (const p of room.players) {
      if (room.domino.scores[p.id] == null) room.domino.scores[p.id] = 0;
    }

    // TopTop style:
    // الفائز يأخذ مجموع نقاط بلاط الخصوم المتبقية، وليس 100 مباشرة.
    const roundPoints = room.players
      .filter((p) => p.id !== winnerId)
      .reduce((sum, p) => sum + getDominoHandPoints(room, p.id), 0);

    room.domino.scores[winnerId] =
      (room.domino.scores[winnerId] || 0) + roundPoints;

    const currentScore = room.domino.scores[winnerId] || 0;

    // إذا لم يصل الفائز إلى 100، نبدأ جولة جديدة بنفس النقاط المتراكمة.
    if (currentScore < 100) {
      room.status = "playing";
      startDomino(room);
      playBotIfNeeded(room);
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
  emitRoomState(room);
  io.to(room.id).emit("match:finished", { winnerId });
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

io.on("connection", (socket) => {
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

  socket.on("room:create", ({ game, maxPlayers }) => {
    const allowedGames = ["domino", "chess", "carrom", "billiards"];
    if (!allowedGames.includes(game)) {
      return socket.emit("error:message", "GAME_NOT_ALLOWED");
    }

    const roomMaxPlayers = Number(maxPlayers) === 4 ? 4 : 2;

    const room = {
      id: makeId("room").slice(0, 12),
      game,
      maxPlayers: roomMaxPlayers,
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
        scoreA: 0,
        scoreB: 0,
        lastAction: "جاهز"
      },
      botSocial: {
        turnCount: 0,
        lastAt: 0,
        recentTexts: []
      }
    };

    rooms.set(room.id, room);
    socket.join(room.id);
    socket.emit("room:joined", publicRoom(room, socket.user.id));
    io.emit("rooms:list", roomList());
    scheduleHumanFirstBotTimer(room);
  });

  socket.on("room:join", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:message", "ROOM_NOT_FOUND");
    if (room.status === "finished") return socket.emit("error:message", "ROOM_FINISHED");

    const existing = room.players.find((p) => p.id === socket.user.id);

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

    // V108_FOUR_PLAYERS_DOMINO_SAFE:
    // زر "استعد" يملأ المقاعد الفارغة ببوتات حتى يكتمل عدد اللاعبين.
    // في غرف لاعبين يضيف Bot واحد، وفي غرف 4 لاعبين يضيف حتى 3 Bots.
    if (room.players.length >= maxPlayers) {
      if (!me) return socket.emit("error:message", "ROOM_FULL");
      socket.join(room.id);
      socket.emit("room:joined", publicRoom(room, socket.user.id));
      emitRoom(room);
      return;
    }

    fillRoomWithBots(room);

    if (room.players.length === (room.maxPlayers || 2) && room.status === "waiting") {
      startRoomIfReady(room);
    }

    socket.join(room.id);
    socket.emit("room:joined", publicRoom(room, socket.user.id));
    emitRoom(room);
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

  // V107_REALTIME_LIVE_MIC_WEBRTC:
  // السيرفر هنا لا يسجل ولا يخزن الصوت. هو فقط قناة إشارات WebRTC داخل نفس الغرفة.
  socket.on("voice:offer", ({ roomId, offer }) => {
    const room = rooms.get(roomId);
    if (!room || !offer) return;
    socket.to(room.id).emit("voice:offer", {
      userId: socket.user.id,
      username: socket.user.username,
      offer
    });
  });

  socket.on("voice:answer", ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    if (!room || !answer) return;
    socket.to(room.id).emit("voice:answer", {
      userId: socket.user.id,
      username: socket.user.username,
      answer
    });
  });

  socket.on("voice:ice", ({ roomId, candidate }) => {
    const room = rooms.get(roomId);
    if (!room || !candidate) return;
    socket.to(room.id).emit("voice:ice", {
      userId: socket.user.id,
      username: socket.user.username,
      candidate
    });
  });

  socket.on("voice:mute", ({ roomId, muted }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    socket.to(room.id).emit("voice:muted", {
      userId: socket.user.id,
      username: socket.user.username,
      muted: !!muted
    });
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
      const move = room.chess.move({
        from,
        to,
        promotion: promotion || "q"
      });

      if (!move) return socket.emit("error:message", "INVALID_CHESS_MOVE");

      if (room.chess.isGameOver()) {
        finishRoom(room, socket.user.id);
      } else {
        playChessBotIfNeeded(room);
      }

      emitRoom(room);
    } catch {
      socket.emit("error:message", "INVALID_CHESS_MOVE");
    }
  });

  socket.on("beta:score", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !["carrom", "billiards"].includes(room.game)) return;

    const index = room.players.findIndex((p) => p.id === socket.user.id);
    if (index === 0) room.beta.scoreA += 1;
    if (index === 1) room.beta.scoreB += 1;

    room.beta.lastAction = `${socket.user.username} سجل نقطة`;
    botMaybeComment(room, "goodHuman");
    emitRoom(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.find((p) => p.id === socket.user.id);
      if (player) player.socketId = socket.id;
    }
  });
});

server.listen(PORT, () => {
  console.log("============================================");
  console.log("✅ Ana Alafdal server is running");
  console.log("🌐 http://localhost:" + PORT);
  console.log("============================================");
});
