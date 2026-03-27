import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { CHARACTERS as CHARACTERS_SHARED } from "../src/lib/gameData.js";
import {
  chooseFirstAttacker as chooseFirstAttackerShared,
  cloneCharacter as cloneCharacterShared,
  findCombatantIndex as findCombatantIndexShared,
  getAliveCombatants as getAliveCombatantsShared,
  resetCombatantsRound as resetCombatantsRoundShared,
  resetTurnFlags as resetTurnFlagsShared,
  resolveMove as resolveMoveShared
} from "../src/lib/gameEngine.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend online funcionando" });
});

const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

const users = new Map();
const socketToUser = new Map();
const challenges = new Map();
const rooms = new Map();

const ROOM_MODES = {
  duel: "duel",
  free_for_all: "free_for_all",
};

const CHARACTERS = CHARACTERS_SHARED;

function cloneCharacter(base) {
  return cloneCharacterShared(base);
}

function emitActiveUsers() {
  const list = Array.from(users.entries()).map(([username, data]) => ({
    username,
    status: data.status,
  }));
  io.emit("active_users", list);
}

function emitFfaRooms() {
  const list = Array.from(rooms.values())
    .filter((room) => room.mode === ROOM_MODES.free_for_all && room.isPublic && !room.battle && room.players.length < room.maxPlayers)
    .map((room) => ({
      roomId: room.roomId,
      players: room.players,
      count: room.players.length,
      maxPlayers: room.maxPlayers,
    }));

  io.emit("ffa_rooms", list);
}

function createRoom(roomId, mode, players, options = {}) {
  const room = {
    roomId,
    mode,
    isPublic: Boolean(options.isPublic),
    maxPlayers: mode === ROOM_MODES.free_for_all ? 4 : 2,
    players: [...players],
    ready: Object.fromEntries(players.map((username) => [username, false])),
    selectedCharacters: Object.fromEntries(players.map((username) => [username, null])),
    battle: null,
  };

  rooms.set(roomId, room);
  return room;
}

function getRoomByUsername(username) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.includes(username)) {
      return { roomId, room };
    }
  }
  return null;
}

function emitToRoomPlayers(room, eventName, payload) {
  if (!room) return;

  for (const username of room.players) {
    const user = users.get(username);
    if (!user?.socketId) continue;
    io.to(user.socketId).emit(eventName, payload);
  }
}

function emitRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  emitToRoomPlayers(room, "room_state", {
    roomId,
    mode: room.mode || ROOM_MODES.duel,
    maxPlayers: room.maxPlayers || 2,
    players: room.players,
    ready: room.ready,
    selectedCharacters: room.selectedCharacters,
  });
}

function serializeCombatant(combatant, viewerUsername, pendingMoves) {
  return {
    username: combatant.username,
    characterId: combatant.character.id,
    nombre: combatant.character.nombre,
    hp: combatant.character.hp,
    hpActual: combatant.character.hpActual,
    ataques: combatant.character.ataques,
    usos: combatant.character.usos,
    protegerTurno: combatant.character.protegerTurno,
    esquivaAtaqueTurno: combatant.character.esquivaAtaqueTurno,
    isMe: combatant.username === viewerUsername,
    pending: Boolean(pendingMoves[combatant.username]),
  };
}

function buildBattlePublicState(room, viewerUsername) {
  if (room.mode === ROOM_MODES.free_for_all) {
    return {
      roomId: room.roomId,
      mode: room.mode,
      turn: room.battle.turn,
      log: room.battle.log,
      winner: room.battle.winner,
      combatants: room.battle.combatants.map((combatant) =>
        serializeCombatant(combatant, viewerUsername, room.battle.pendingMoves)
      ),
      pendingMoves: Object.fromEntries(
        room.players.map((username) => [username, Boolean(room.battle.pendingMoves[username])])
      ),
      viewerUsername,
    };
  }

  const isPlayer1 = room.battle.player1.username === viewerUsername;
  const me = isPlayer1 ? room.battle.player1 : room.battle.player2;
  const enemy = isPlayer1 ? room.battle.player2 : room.battle.player1;

  return {
    roomId: room.roomId,
    mode: room.mode || ROOM_MODES.duel,
    me: {
      username: me.username,
      characterId: me.character.id,
      nombre: me.character.nombre,
      hp: me.character.hp,
      hpActual: me.character.hpActual,
      ataques: me.character.ataques,
      usos: me.character.usos,
      protegerTurno: me.character.protegerTurno,
      esquivaAtaqueTurno: me.character.esquivaAtaqueTurno,
    },
    enemy: {
      username: enemy.username,
      characterId: enemy.character.id,
      nombre: enemy.character.nombre,
      hp: enemy.character.hp,
      hpActual: enemy.character.hpActual,
      ataques: enemy.character.ataques,
      usos: enemy.character.usos,
      protegerTurno: enemy.character.protegerTurno,
      esquivaAtaqueTurno: enemy.character.esquivaAtaqueTurno,
    },
    turn: room.battle.turn,
    log: room.battle.log,
    pendingMoves: {
      me: !!room.battle.pendingMoves[viewerUsername],
      enemy: !!room.battle.pendingMoves[enemy.username],
    },
    winner: room.battle.winner,
  };
}

function emitBattleState(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.battle) return;

  for (const username of room.players) {
    const user = users.get(username);
    if (!user) continue;
    io.to(user.socketId).emit("battle_state", buildBattlePublicState(room, username));
  }
}

function applyMove(attacker, defender, move, attackerOwnerLabel, defenderPlannedMove) {
  return resolveMoveShared({
    attacker,
    defender,
    move,
    attackerLabel: attackerOwnerLabel,
    defenderLabel: defender.nombre,
    defenderPlannedMove,
  });
}

function endTurnUpdate(p1, p2) {
  return { a: resetTurnFlagsShared(p1), b: resetTurnFlagsShared(p2) };
}

function getAliveCombatants(combatants) {
  return getAliveCombatantsShared(combatants);
}

function findCombatantIndex(combatants, username) {
  return findCombatantIndexShared(combatants, username);
}

function resetCombatantsRound(combatants) {
  return resetCombatantsRoundShared(combatants);
}

function resolveRoomTurn(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.battle) return;

  const battle = room.battle;
  const p1Name = room.players[0];
  const p2Name = room.players[1];

  const p1MoveId = battle.pendingMoves[p1Name];
  const p2MoveId = battle.pendingMoves[p2Name];

  if (!p1MoveId || !p2MoveId) return;

  let p1 = battle.player1;
  let p2 = battle.player2;

  const move1 = p1.character.ataques.find((m) => m.id === p1MoveId);
  const move2 = p2.character.ataques.find((m) => m.id === p2MoveId);

  if (!move1 || !move2) return;

  const firstIsP1 =
    chooseFirstAttackerShared(move1, move2, p1.character.velocidad, p2.character.velocidad);

  const turnLines = [`Turno ${battle.turn}`];
  const steps = [];

  const step1 = firstIsP1
    ? applyMove(p1.character, p2.character, move1, p1.username, move2)
    : applyMove(p2.character, p1.character, move2, p2.username, move1);

  turnLines.push(step1.text);

  if (firstIsP1) {
    const prevHp = p2.character.hpActual;
    p1 = { ...p1, character: step1.attacker };
    p2 = { ...p2, character: step1.defender };

    steps.push({
      actor: "me",
      actorUsername: p1.username,
      target: "enemy",
      targetUsername: p2.username,
      text: step1.text,
      targetDamaged: p2.character.hpActual < prevHp,
      targetKo: p2.character.hpActual <= 0,
    });
  } else {
    const prevHp = p1.character.hpActual;
    p2 = { ...p2, character: step1.attacker };
    p1 = { ...p1, character: step1.defender };

    steps.push({
      actor: "enemy",
      actorUsername: p2.username,
      target: "me",
      targetUsername: p1.username,
      text: step1.text,
      targetDamaged: p1.character.hpActual < prevHp,
      targetKo: p1.character.hpActual <= 0,
    });
  }

  if (p1.character.hpActual > 0 && p2.character.hpActual > 0) {
    const step2 = firstIsP1
      ? applyMove(p2.character, p1.character, move2, p2.username, move1)
      : applyMove(p1.character, p2.character, move1, p1.username, move2);

    turnLines.push(step2.text);

    if (firstIsP1) {
      const prevHp = p1.character.hpActual;
      p2 = { ...p2, character: step2.attacker };
      p1 = { ...p1, character: step2.defender };

      steps.push({
        actor: "enemy",
        actorUsername: p2.username,
        target: "me",
        targetUsername: p1.username,
        text: step2.text,
        targetDamaged: p1.character.hpActual < prevHp,
        targetKo: p1.character.hpActual <= 0,
      });
    } else {
      const prevHp = p2.character.hpActual;
      p1 = { ...p1, character: step2.attacker };
      p2 = { ...p2, character: step2.defender };

      steps.push({
        actor: "me",
        actorUsername: p1.username,
        target: "enemy",
        targetUsername: p2.username,
        text: step2.text,
        targetDamaged: p2.character.hpActual < prevHp,
        targetKo: p2.character.hpActual <= 0,
      });
    }
  }

  const after = endTurnUpdate(p1.character, p2.character);
  p1 = { ...p1, character: after.a };
  p2 = { ...p2, character: after.b };

  battle.player1 = p1;
  battle.player2 = p2;
  battle.pendingMoves = {};
  battle.log = [...turnLines.reverse(), ...battle.log].slice(0, 20);

  if (p1.character.hpActual <= 0 && p2.character.hpActual <= 0) {
    battle.winner = "draw";
    battle.log = ["Empate.", ...battle.log].slice(0, 20);
  } else if (p2.character.hpActual <= 0) {
    battle.winner = p1.username;
    battle.log = [`${p1.username} ganó la partida.`, ...battle.log].slice(0, 20);
  } else if (p1.character.hpActual <= 0) {
    battle.winner = p2.username;
    battle.log = [`${p2.username} ganó la partida.`, ...battle.log].slice(0, 20);
  } else {
    battle.turn += 1;
  }

  for (const username of room.players) {
    const user = users.get(username);
    if (!user) continue;

    const viewerSteps = steps.map((s) => ({
      ...s,
      actor: s.actorUsername === username ? "me" : "enemy",
      target: s.targetUsername === username ? "me" : "enemy",
    }));

    io.to(user.socketId).emit("turn_sequence", {
      steps: viewerSteps,
      finalState: buildBattlePublicState(room, username),
    });
  }

  emitBattleState(roomId);
}

function resolveFfaAction(combatants, action, actionOrder) {
  const cloned = combatants.map((combatant) => ({
    ...combatant,
    character: {
      ...combatant.character,
      usos: { ...combatant.character.usos },
    },
  }));
  const attackerIndex = findCombatantIndex(cloned, action.username);
  const attacker = cloned[attackerIndex];

  if (!attacker || attacker.character.hpActual <= 0) {
    return null;
  }

  const move = attacker.character.ataques.find((candidate) => candidate.id === action.moveId);
  if (!move) {
    return { combatants: cloned, text: `${attacker.username} no pudo ejecutar su movimiento.` };
  }

  let targetIndex = findCombatantIndex(cloned, action.targetUsername);
  let defenderPlannedMove = null;

  if (move.id === "correr") {
    const counterSource = actionOrder.find((candidate) => {
      if (candidate.username === action.username || candidate.targetUsername !== action.username) {
        return false;
      }

      const source = cloned[findCombatantIndex(cloned, candidate.username)];
      const sourceMove = source?.character.ataques.find((candidateMove) => candidateMove.id === candidate.moveId);
      return source && source.character.hpActual > 0 && sourceMove?.tipo === "ataque";
    });

    if (counterSource) {
      targetIndex = findCombatantIndex(cloned, counterSource.username);
      defenderPlannedMove = cloned[targetIndex]?.character.ataques.find((candidate) => candidate.id === counterSource.moveId) ?? null;
    }
  } else if (move.tipo === "ataque" && (targetIndex < 0 || cloned[targetIndex].character.hpActual <= 0)) {
    targetIndex = cloned.findIndex((combatant) => combatant.username !== action.username && combatant.character.hpActual > 0);
  }

  if (move.tipo === "ataque" && targetIndex < 0) {
    return { combatants: cloned, text: `${attacker.username} no encontró un objetivo válido.` };
  }

  const defender = targetIndex >= 0 ? cloned[targetIndex] : attacker;
  const defenderHpBefore = defender.character.hpActual;
  const result = resolveMoveShared({
    attacker: attacker.character,
    defender: defender.character,
    move,
    attackerLabel: attacker.username,
    defenderLabel: defender.username,
    defenderPlannedMove,
  });

  attacker.character = result.attacker;
  if (targetIndex >= 0) {
    cloned[targetIndex].character = result.defender;
  }

  const target = targetIndex >= 0 ? cloned[targetIndex] : attacker;
  const visualTargetUsername = move.tipo === "ataque" ? target.username : null;

  return {
    combatants: cloned,
    text: result.text,
    actorUsername: attacker.username,
    targetUsername: visualTargetUsername,
    targetDamaged: target.character.hpActual < defenderHpBefore,
    targetKo: target.character.hpActual <= 0,
  };
}

function resolveFfaRoomTurn(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.battle || room.mode !== ROOM_MODES.free_for_all) return;

  const battle = room.battle;
  const aliveCombatants = getAliveCombatants(battle.combatants);
  const aliveUsernames = aliveCombatants.map((combatant) => combatant.username);
  if (!aliveUsernames.every((username) => battle.pendingMoves[username])) return;

  const actionOrder = aliveUsernames
    .map((username) => {
      const combatant = battle.combatants.find((candidate) => candidate.username === username);
      const pendingMove = battle.pendingMoves[username];
      const move = combatant?.character.ataques.find((candidate) => candidate.id === pendingMove?.moveId);
      if (!combatant || !move) return null;
      return {
        username,
        moveId: pendingMove.moveId,
        targetUsername: pendingMove.targetUsername || null,
        priority: move.prioridad || 0,
        speed: combatant.character.velocidad || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.priority - a.priority) || (b.speed - a.speed) || a.username.localeCompare(b.username));

  let combatants = battle.combatants.map((combatant) => ({
    ...combatant,
    character: {
      ...combatant.character,
      usos: { ...combatant.character.usos },
    },
  }));
  const turnLines = [`Turno ${battle.turn}`];
  const steps = [];

  for (const action of actionOrder) {
    const result = resolveFfaAction(combatants, action, actionOrder);
    if (!result) continue;
    combatants = result.combatants;
    turnLines.push(result.text);
    steps.push({
      actorUsername: result.actorUsername,
      targetUsername: result.targetUsername,
      text: result.text,
      targetDamaged: result.targetDamaged,
      targetKo: result.targetKo,
    });

    if (getAliveCombatants(combatants).length <= 1) {
      break;
    }
  }

  battle.combatants = resetCombatantsRound(combatants);
  battle.pendingMoves = {};
  battle.log = [...turnLines.reverse(), ...battle.log].slice(0, 24);

  const survivors = getAliveCombatants(battle.combatants);
  if (survivors.length === 1) {
    battle.winner = survivors[0].username;
    battle.log = [`${survivors[0].username} ganó la partida.`, ...battle.log].slice(0, 24);
  } else if (survivors.length === 0) {
    battle.winner = "draw";
    battle.log = ["Empate total.", ...battle.log].slice(0, 24);
  } else {
    battle.turn += 1;
  }

  for (const username of room.players) {
    const user = users.get(username);
    if (!user) continue;

    io.to(user.socketId).emit("turn_sequence", {
      steps,
      finalState: buildBattlePublicState(room, username),
    });
  }

  emitBattleState(roomId);
}

function removePlayerFromRoom(roomId, username) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players = room.players.filter((playerName) => playerName !== username);
  delete room.ready[username];
  delete room.selectedCharacters[username];

  if (room.battle?.pendingMoves) {
    delete room.battle.pendingMoves[username];
  }

  if (room.mode === ROOM_MODES.free_for_all && room.battle?.combatants) {
    room.battle.combatants = room.battle.combatants.filter((combatant) => combatant.username !== username);

    const survivors = getAliveCombatants(room.battle.combatants);
    if (!room.battle.winner && survivors.length === 1) {
      room.battle.winner = survivors[0].username;
      room.battle.log = [`${survivors[0].username} ganó la partida.`, ...room.battle.log].slice(0, 24);
    }
  }

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return;
  }

  emitRoomState(roomId);
  if (room.battle) {
    emitBattleState(roomId);
  }
}

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("register_user", (usernameRaw, callback) => {
    try {
      const username = String(usernameRaw || "").trim();

      if (!username) {
        return callback?.({ ok: false, message: "El username no puede estar vacío." });
      }

      if (username.length < 3) {
        return callback?.({
          ok: false,
          message: "El username debe tener al menos 3 caracteres.",
        });
      }

      const existing = users.get(username);

      if (existing && existing.socketId !== socket.id) {
        return callback?.({ ok: false, message: "Ese username ya está en uso." });
      }

      users.set(username, {
        socketId: socket.id,
        status: "online",
      });

      socketToUser.set(socket.id, username);
      emitActiveUsers();
      emitFfaRooms();

      callback?.({ ok: true, username });
    } catch {
      callback?.({ ok: false, message: "Error al registrar usuario." });
    }
  });

  socket.on("send_challenge", ({ to }, callback) => {
    const from = socketToUser.get(socket.id);

    if (!from) {
      return callback?.({ ok: false, message: "Primero tenés que registrarte." });
    }

    const sender = users.get(from);
    const target = users.get(to);

    if (!target) {
      return callback?.({ ok: false, message: "Ese usuario no está conectado." });
    }

    if (from === to) {
      return callback?.({ ok: false, message: "No podés retarte a vos mismo." });
    }

    if (!sender || sender.status !== "online") {
      return callback?.({
        ok: false,
        message: "No podés enviar retos mientras estás ocupado.",
      });
    }

    if (target.status !== "online") {
      return callback?.({ ok: false, message: "Ese usuario está ocupado." });
    }

    challenges.set(to, { from, to });
    io.to(target.socketId).emit("challenge_received", { from });

    callback?.({ ok: true, message: `Reto enviado a ${to}.` });
  });

  socket.on("accept_challenge", ({ from }, callback) => {
    const to = socketToUser.get(socket.id);

    if (!to) {
      return callback?.({ ok: false, message: "Usuario no registrado." });
    }

    const pending = challenges.get(to);

    if (!pending || pending.from !== from) {
      return callback?.({
        ok: false,
        message: "No hay un reto pendiente de ese usuario.",
      });
    }

    const fromUser = users.get(from);
    const toUser = users.get(to);

    if (!fromUser || !toUser) {
      return callback?.({
        ok: false,
        message: "Uno de los usuarios ya no está conectado.",
      });
    }

    fromUser.status = "in-room";
    toUser.status = "in-room";
    challenges.delete(to);

    const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fromSocket = io.sockets.sockets.get(fromUser.socketId);
    const toSocket = io.sockets.sockets.get(toUser.socketId);

    fromSocket?.join(roomId);
    toSocket?.join(roomId);

    createRoom(roomId, ROOM_MODES.duel, [from, to]);

    emitToRoomPlayers(rooms.get(roomId), "battle_started", {
      roomId,
      mode: ROOM_MODES.duel,
      maxPlayers: 2,
      players: [from, to],
    });

    emitRoomState(roomId);
    emitActiveUsers();
    emitFfaRooms();

    callback?.({ ok: true, roomId });
  });

  socket.on("reject_challenge", ({ from }, callback) => {
    const to = socketToUser.get(socket.id);

    if (!to) {
      return callback?.({ ok: false, message: "Usuario no registrado." });
    }

    const pending = challenges.get(to);

    if (!pending || pending.from !== from) {
      return callback?.({ ok: false, message: "No existe ese reto." });
    }

    const challenger = users.get(from);
    if (challenger) {
      io.to(challenger.socketId).emit("challenge_rejected", { by: to });
    }

    challenges.delete(to);
    callback?.({ ok: true });
  });

  socket.on("create_ffa_room", (_payload, callback) => {
    const username = socketToUser.get(socket.id);
    if (!username) {
      return callback?.({ ok: false, message: "Primero tenés que registrarte." });
    }

    const user = users.get(username);
    const existingRoomData = getRoomByUsername(username);

    if (existingRoomData?.room?.mode === ROOM_MODES.free_for_all && !existingRoomData.room.battle) {
      socket.join(existingRoomData.roomId);
      emitRoomState(existingRoomData.roomId);
      emitFfaRooms();
      return callback?.({
        ok: true,
        roomId: existingRoomData.roomId,
        message: "Ya tenés una sala FFA abierta."
      });
    }

    if (!user || user.status !== "online") {
      return callback?.({ ok: false, message: "No podés crear una sala ahora." });
    }

    const roomId = `ffa_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const room = createRoom(roomId, ROOM_MODES.free_for_all, [username], { isPublic: true });

    user.status = "in-room";
    socket.join(roomId);

    emitToRoomPlayers(room, "battle_started", {
      roomId,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      players: room.players,
    });

    emitRoomState(roomId);
    emitActiveUsers();
    emitFfaRooms();

    callback?.({ ok: true, roomId });
  });

  socket.on("join_ffa_room", ({ roomId }, callback) => {
    const username = socketToUser.get(socket.id);
    if (!username) {
      return callback?.({ ok: false, message: "Primero tenés que registrarte." });
    }

    const user = users.get(username);
    const room = rooms.get(roomId);
    const existingRoomData = getRoomByUsername(username);

    if (existingRoomData?.roomId === roomId && room?.mode === ROOM_MODES.free_for_all && !room?.battle) {
      socket.join(roomId);
      emitRoomState(roomId);
      emitFfaRooms();
      return callback?.({
        ok: true,
        roomId,
        message: "Volviste a tu sala FFA."
      });
    }

    if (!user || user.status !== "online") {
      return callback?.({ ok: false, message: "No podés entrar a una sala ahora." });
    }

    if (!room || room.mode !== ROOM_MODES.free_for_all || !room.isPublic || room.battle) {
      return callback?.({ ok: false, message: "La sala FFA ya no está disponible." });
    }

    if (room.players.length >= room.maxPlayers) {
      return callback?.({ ok: false, message: "La sala ya está completa." });
    }

    room.players.push(username);
    room.ready[username] = false;
    room.selectedCharacters[username] = null;

    user.status = "in-room";
    socket.join(roomId);

    emitRoomState(roomId);
    emitActiveUsers();
    emitFfaRooms();

    callback?.({ ok: true, roomId });
  });

  socket.on("player_ready", ({ roomId, username, characterId }, callback) => {
    const realUsername = socketToUser.get(socket.id);

    if (!realUsername || realUsername !== username) {
      return callback?.({ ok: false, message: "Usuario inválido." });
    }

    const room = rooms.get(roomId);
    if (!room) {
      return callback?.({ ok: false, message: "La sala no existe." });
    }

    if (!room.players.includes(username)) {
      return callback?.({ ok: false, message: "No pertenecés a esa sala." });
    }

    if (!CHARACTERS[characterId]) {
      return callback?.({ ok: false, message: "Personaje inválido." });
    }

    room.ready[username] = true;
    room.selectedCharacters[username] = characterId;

    emitRoomState(roomId);

    const everyoneReady = room.players.length === (room.maxPlayers || 2) && room.players.every(
      (p) => room.ready[p] && room.selectedCharacters[p]
    );

    if (everyoneReady) {
      for (const playerName of room.players) {
        const user = users.get(playerName);
        if (user) user.status = "in-battle";
      }

      if (room.mode === ROOM_MODES.free_for_all) {
        room.isPublic = false;
        room.battle = {
          mode: room.mode,
          turn: 1,
          log: ["La batalla Free For All comenzó."],
          winner: null,
          pendingMoves: {},
          combatants: room.players.map((playerName) => ({
            username: playerName,
            character: cloneCharacter(CHARACTERS[room.selectedCharacters[playerName]]),
          })),
        };
      } else {
        const [u1, u2] = room.players;
        room.battle = {
          mode: ROOM_MODES.duel,
          turn: 1,
          log: ["La batalla comenzó."],
          winner: null,
          pendingMoves: {},
          player1: {
            username: u1,
            character: cloneCharacter(CHARACTERS[room.selectedCharacters[u1]]),
          },
          player2: {
            username: u2,
            character: cloneCharacter(CHARACTERS[room.selectedCharacters[u2]]),
          },
        };
      }

      emitToRoomPlayers(room, "start_online_battle", {
        roomId,
        mode: room.mode || ROOM_MODES.duel,
        maxPlayers: room.maxPlayers || 2,
        players: room.players,
        selectedCharacters: room.selectedCharacters,
      });

      emitBattleState(roomId);
      emitActiveUsers();
      emitFfaRooms();
    }

    callback?.({ ok: true });
  });

  socket.on("submit_move", ({ roomId, moveId, targetUsername }, callback) => {
    const username = socketToUser.get(socket.id);
    if (!username) {
      return callback?.({ ok: false, message: "Usuario no registrado." });
    }

    const room = rooms.get(roomId);
    if (!room || !room.battle) {
      return callback?.({ ok: false, message: "La batalla no existe." });
    }

    if (!room.players.includes(username)) {
      return callback?.({ ok: false, message: "No pertenecés a esa batalla." });
    }

    if (room.battle.winner) {
      return callback?.({ ok: false, message: "La batalla ya terminó." });
    }

    if (room.mode === ROOM_MODES.free_for_all) {
      const selfCombatant = room.battle.combatants.find((combatant) => combatant.username === username);
      if (!selfCombatant || selfCombatant.character.hpActual <= 0) {
        return callback?.({ ok: false, message: "Tu personaje ya fue derrotado." });
      }

      const move = selfCombatant.character.ataques.find((candidate) => candidate.id === moveId);
      if (!move) {
        return callback?.({ ok: false, message: "Movimiento inválido." });
      }

      if (move.tipo === "ataque" && !targetUsername) {
        return callback?.({ ok: false, message: "Tenés que elegir un objetivo." });
      }

      room.battle.pendingMoves[username] = {
        moveId,
        targetUsername: targetUsername || null,
      };
      emitBattleState(roomId);

      const allAliveSubmitted = getAliveCombatants(room.battle.combatants)
        .every((combatant) => !!room.battle.pendingMoves[combatant.username]);

      if (allAliveSubmitted) {
        resolveFfaRoomTurn(roomId);
      }

      return callback?.({ ok: true });
    }

    room.battle.pendingMoves[username] = moveId;
    emitBattleState(roomId);

    const bothSubmitted = room.players.every((p) => !!room.battle.pendingMoves[p]);

    if (bothSubmitted) {
      resolveRoomTurn(roomId);
    }

    callback?.({ ok: true });
  });

  socket.on("leave_battle", ({ roomId }, callback) => {
    const username = socketToUser.get(socket.id);
    if (!username) {
      return callback?.({ ok: false });
    }

    const user = users.get(username);
    if (user) user.status = "online";

    if (roomId) {
      removePlayerFromRoom(roomId, username);
    }

    socket.leave(roomId);
    emitActiveUsers();
    emitFfaRooms();
    callback?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const username = socketToUser.get(socket.id);

    if (username) {
      users.delete(username);
      socketToUser.delete(socket.id);

      if (challenges.has(username)) {
        challenges.delete(username);
      }

      for (const [target, value] of challenges.entries()) {
        if (value.from === username) {
          challenges.delete(target);
        }
      }

      const roomData = getRoomByUsername(username);
      if (roomData) {
        const { roomId, room } = roomData;
        removePlayerFromRoom(roomId, username);

        if (!room.battle) {
          for (const otherUsername of room.players) {
            const otherUser = users.get(otherUsername);
            if (otherUser) {
              otherUser.status = "online";
            }
          }
        }
      }

      emitActiveUsers();
      emitFfaRooms();
    }

    console.log("Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});


