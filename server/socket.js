// Socket.io event handlers — all Battleship real-time logic
const { validateShips, buildBoard, processAttack, emptyShots } = require("./game");
const roomStore = require("./rooms");

const { verifier } = require("./middleware/auth");

const RECONNECT_GRACE_MS = 60_000;
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUEST_RE = /^GUEST_\d{3}$/;

// Identify the socket once at connection time — event payloads are never trusted for identity.
// Signed-in players are identified by their verified Cognito token; guests by a random per-tab id.
async function identify(socket, next) {
  const { token, guestId, guestName } = socket.handshake.auth || {};
  if (token) {
    try {
      const payload = await verifier.verify(token);
      socket.data.userId   = payload.sub;
      socket.data.username = payload.preferred_username || payload.email;
      return next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  }
  if (typeof guestId === "string" && UUID_RE.test(guestId)) {
    socket.data.userId   = "guest:" + guestId;
    socket.data.username = typeof guestName === "string" && GUEST_RE.test(guestName) ? guestName : "GUEST";
    return next();
  }
  return next(new Error("UNAUTHORIZED"));
}

module.exports = function attachSocket(io) {

  // Emit to the opponent of a given player index
  function toOpponent(room, playerIdx, event, data) {
    const opp = room.players[1 - playerIdx];
    if (opp?.socketId) io.to(opp.socketId).emit(event, data);
  }

  // Tear down a room and boot all sockets out
  function closeRoom(room) {
    for (const p of room.players) {
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
    }
    roomStore.deleteRoom(room.code);
  }

  io.use(identify);

  io.on("connection", socket => {
    const { userId, username } = socket.data;

    // ── Create room ───────────────────────────────────────────────────────────
    socket.on("create-room", () => {
      // Clean up any pre-existing room for this user
      const existing = roomStore.getRoomByUserId(userId);
      if (existing) {
        toOpponent(existing, roomStore.getPlayerIndex(existing, userId), "opponent-disconnected");
        closeRoom(existing);
      }
      const code = roomStore.createRoom(userId, username, socket.id);
      socket.join(code);
      socket.emit("room-created", { roomCode: code });
    });

    // ── Join room ─────────────────────────────────────────────────────────────
    socket.on("join-room", ({ roomCode } = {}) => {
      const code = String(roomCode || "").toUpperCase().trim();
      const room = roomStore.getRoom(code);
      if (!room)                               return socket.emit("error", { message: "ROOM NOT FOUND" });
      if (room.phase !== "waiting")            return socket.emit("error", { message: "GAME ALREADY STARTED" });
      if (room.players.length >= 2)            return socket.emit("error", { message: "ROOM IS FULL" });
      if (room.players[0].userId === userId)   return socket.emit("error", { message: "CANNOT JOIN YOUR OWN ROOM" });

      // Leave any other room this player was still sitting in
      const existing = roomStore.getRoomByUserId(userId);
      if (existing) {
        toOpponent(existing, roomStore.getPlayerIndex(existing, userId), "opponent-disconnected");
        closeRoom(existing);
      }

      room.players.push(roomStore.makePlayer(userId, username, socket.id));
      room.phase = "placement";
      socket.join(code);
      socket.emit("joined", { roomCode: code, opponentUsername: room.players[0].username });
      io.to(room.players[0].socketId).emit("opponent-joined", { username });
    });

    // ── Rejoin room (reconnect) ───────────────────────────────────────────────
    socket.on("rejoin-room", ({ roomCode } = {}) => {
      const room = roomStore.getRoom(String(roomCode || "").toUpperCase());
      if (!room) return socket.emit("rejoin-failed");

      const idx = roomStore.getPlayerIndex(room, userId);
      if (idx === -1) return socket.emit("rejoin-failed");

      const player = room.players[idx];
      if (player.disconnectTimer) { clearTimeout(player.disconnectTimer); player.disconnectTimer = null; }
      player.socketId = socket.id;
      socket.join(room.code);

      const opp = room.players[1 - idx];
      socket.emit("rejoined", {
        roomCode:           room.code,
        phase:              room.phase,
        opponentUsername:   opp?.username ?? null,
        yourTurn:           room.phase === "playing" && room.turn === idx,
        shots:              player.shots,       // your shots against opponent
        opponentShots:      opp?.shots ?? null, // opponent's shots on your board
        board:              player.board,       // own ship positions to re-render fleet
      });
      // Broadcast to room channel — more reliable than targeting opp.socketId directly
      socket.to(room.code).emit("opponent-reconnected", { yourTurn: room.phase === "playing" && room.turn === (1 - idx) });
    });

    // ── Place ships ───────────────────────────────────────────────────────────
    socket.on("place-ships", ({ roomCode, ships } = {}) => {
      const room = roomStore.getRoom(roomCode);
      if (!room || room.phase !== "placement") return socket.emit("error", { message: "NOT IN PLACEMENT PHASE" });
      if (!validateShips(ships))               return socket.emit("error", { message: "INVALID SHIP PLACEMENT" });

      const idx = roomStore.getPlayerIndex(room, userId);
      if (idx === -1) return;

      room.players[idx].board = buildBoard(ships);
      room.players[idx].shots = emptyShots();
      room.players[idx].ready = true;
      socket.emit("placement-confirmed");

      // Both ready → start the game
      if (room.players.length === 2 && room.players.every(p => p.ready)) {
        room.phase = "playing";
        room.turn  = 0;
        room.players.forEach((p, i) => {
          if (p.socketId) io.to(p.socketId).emit("game-start", { yourTurn: i === 0 });
        });
      }
    });

    // ── Attack ────────────────────────────────────────────────────────────────
    socket.on("attack", ({ roomCode, r, c } = {}) => {
      const room = roomStore.getRoom(roomCode);
      if (!room || room.phase !== "playing") return socket.emit("error", { message: "NOT IN PLAYING PHASE" });

      const attackerIdx = roomStore.getPlayerIndex(room, userId);
      if (attackerIdx === -1)                return socket.emit("error", { message: "NOT IN THIS ROOM" });
      if (attackerIdx !== room.turn)         return socket.emit("error", { message: "NOT YOUR TURN" });

      const defenderIdx = 1 - attackerIdx;
      const result = processAttack(
        room.players[defenderIdx].board,
        room.players[attackerIdx].shots,
        r, c
      );
      if (!result) return socket.emit("error", { message: "INVALID ATTACK" });

      const { hit, sunkShip, gameOver } = result;

      if (gameOver) {
        room.phase = "gameover";
        socket.emit("attack-result",                          { r, c, hit, sunkShip, gameOver: true,  won: true,  isAttacker: true  });
        toOpponent(room, attackerIdx, "attack-result",        { r, c, hit, sunkShip, gameOver: true,  won: false, isAttacker: false });
      } else {
        room.turn = defenderIdx;
        socket.emit("attack-result",                          { r, c, hit, sunkShip, gameOver: false, yourTurn: false, isAttacker: true  });
        toOpponent(room, attackerIdx, "attack-result",        { r, c, hit, sunkShip, gameOver: false, yourTurn: true,  isAttacker: false });
      }
    });

    // ── Rematch ───────────────────────────────────────────────────────────────
    socket.on("rematch", ({ roomCode } = {}) => {
      const room = roomStore.getRoom(roomCode);
      if (!room) return;
      const idx = roomStore.getPlayerIndex(room, userId);
      if (idx === -1) return;

      room.players[idx].wantsRematch = true;
      if (room.players.length === 2 && room.players.every(p => p.wantsRematch)) {
        room.players.forEach(p => { p.board = null; p.shots = null; p.ready = false; p.wantsRematch = false; });
        room.phase = "placement";
        room.turn  = 0;
        io.to(roomCode).emit("rematch-start");
      } else {
        toOpponent(room, idx, "opponent-wants-rematch");
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const room = roomStore.getRoomBySocketId(socket.id);
      if (!room) return;

      const idx = room.players.findIndex(p => p.socketId === socket.id);
      if (idx === -1) return;

      // No grace period needed if game is over or still waiting
      if (room.phase === "gameover" || room.phase === "waiting") {
        closeRoom(room); return;
      }

      // 60s grace period — notify opponent but keep room alive for reconnect
      toOpponent(room, idx, "opponent-disconnected");
      room.players[idx].disconnectTimer = setTimeout(() => {
        closeRoom(room);
      }, RECONNECT_GRACE_MS);
    });
  });
};
