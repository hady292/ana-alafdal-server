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
    level: user.level || 1
  };
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

app.get("/leaderboard", (req, res) => {
  const db = readDb();
  const leaderboard = db.users
    .map(publicUser)
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .slice(0, 50);

  res.json({ leaderboard });
});

const rooms = new Map();

function roomList() {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    game: room.game,
    status: room.status,
    playersCount: room.players.length,
    players: room.players.map((p) => ({
      id: p.id,
      username: p.username
    })),
    maxPlayers: 2
  }));
}

function publicRoom(room, userId) {
  const base = {
    id: room.id,
    game: room.game,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      username: p.username
    })),
    chat: room.chat.slice(-50),
    beta: room.beta
  };

  if (room.game === "domino") {
    base.domino = {
      board: room.domino.board,
      turn: room.domino.turn,
      myHand: room.domino.hands[userId] || [],
      handCounts: Object.fromEntries(
        Object.entries(room.domino.hands).map(([id, hand]) => [id, hand.length])
      )
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

function startDomino(room) {
  const tiles = createDominoTiles();
  room.domino.board = [];
  room.domino.hands = {};
  room.players.forEach((player, index) => {
    room.domino.hands[player.id] = tiles.splice(0, 7);
    if (index === 0) room.domino.turn = player.id;
  });
}

function playDomino(room, userId, tile) {
  if (room.status !== "playing") return { ok: false, error: "GAME_NOT_STARTED" };
  if (room.domino.turn !== userId) return { ok: false, error: "NOT_YOUR_TURN" };

  if (!Array.isArray(tile) || tile.length !== 2) {
    return { ok: false, error: "INVALID_TILE_FORMAT" };
  }

  const hand = room.domino.hands[userId] || [];
  const index = hand.findIndex((t) => t[0] === tile[0] && t[1] === tile[1]);

  if (index === -1) return { ok: false, error: "TILE_NOT_IN_HAND" };

  if (room.domino.board.length === 0) {
    room.domino.board.push(tile);
  } else {
    const left = room.domino.board[0][0];
    const right = room.domino.board[room.domino.board.length - 1][1];

    if (tile[1] === left) {
      room.domino.board.unshift(tile);
    } else if (tile[0] === left) {
      room.domino.board.unshift([tile[1], tile[0]]);
    } else if (tile[0] === right) {
      room.domino.board.push(tile);
    } else if (tile[1] === right) {
      room.domino.board.push([tile[1], tile[0]]);
    } else {
      return { ok: false, error: "MOVE_NOT_ALLOWED" };
    }
  }

  hand.splice(index, 1);

  if (hand.length === 0) {
    finishRoom(room, userId);
    return { ok: true };
  }

  const next = room.players.find((p) => p.id !== userId);
  if (next) room.domino.turn = next.id;

  return { ok: true };
}


function findPlayableDominoTile(room, userId) {
  const hand = room.domino.hands[userId] || [];
  const board = room.domino.board || [];

  if (hand.length === 0) return null;
  if (board.length === 0) return hand[0];

  const left = board[0][0];
  const right = board[board.length - 1][1];

  return hand.find((tile) =>
    tile[0] === left ||
    tile[1] === left ||
    tile[0] === right ||
    tile[1] === right
  ) || null;
}

function playBotIfNeeded(room) {
  if (!room || room.game !== "domino" || room.status !== "playing") return;

  const current = room.players.find((p) => p.id === room.domino.turn);
  if (!current || !String(current.id).startsWith("bot_")) return;

  const tile = findPlayableDominoTile(room, current.id);

  if (tile) {
    playDomino(room, current.id, tile);
    return;
  }

  const human = room.players.find((p) => !String(p.id).startsWith("bot_"));
  if (human) {
    room.domino.turn = human.id;
  }
}

function finishRoom(room, winnerId) {
  room.status = "finished";

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

  socket.on("room:create", ({ game }) => {
    const allowedGames = ["domino", "chess", "carrom", "billiards"];
    if (!allowedGames.includes(game)) {
      return socket.emit("error:message", "GAME_NOT_ALLOWED");
    }

    const room = {
      id: makeId("room").slice(0, 12),
      game,
      status: "waiting",
      players: [
        {
          id: socket.user.id,
          username: socket.user.username,
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
      }
    };

    rooms.set(room.id, room);
    socket.join(room.id);
    socket.emit("room:joined", publicRoom(room, socket.user.id));
    io.emit("rooms:list", roomList());
  });

  socket.on("room:join", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:message", "ROOM_NOT_FOUND");

    const existing = room.players.find((p) => p.id === socket.user.id);

    if (existing) {
      existing.socketId = socket.id;
    } else {
      if (room.players.length >= 2) return socket.emit("error:message", "ROOM_FULL");
      room.players.push({
        id: socket.user.id,
        username: socket.user.username,
        socketId: socket.id
      });
    }

    socket.join(room.id);

    if (room.players.length === 2 && room.status === "waiting") {
      room.status = "playing";
      if (room.game === "domino") startDomino(room);
    }

    socket.emit("room:joined", publicRoom(room, socket.user.id));
    emitRoom(room);
  });

  socket.on("room:addBot", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error:message", "ROOM_NOT_FOUND");

    if (room.players.length >= 2) {
      return socket.emit("error:message", "ROOM_FULL");
    }

    const botId = "bot_" + room.id;

    const existingBot = room.players.find((p) => p.id === botId);
    if (!existingBot) {
      room.players.push({
        id: botId,
        username: "Bot",
        socketId: "bot_socket_" + room.id
      });
    }

    if (room.players.length === 2 && room.status === "waiting") {
      room.status = "playing";
      if (room.game === "domino") startDomino(room);
    }

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

  socket.on("domino:play", ({ roomId, tile }) => {
    const room = rooms.get(roomId);
    if (!room || room.game !== "domino") return;

    const result = playDomino(room, socket.user.id, tile);
    if (!result.ok) return socket.emit("error:message", result.error);

    playBotIfNeeded(room);
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
