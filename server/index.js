const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

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

const CHARACTERS = {
  alan_soma: {
    id: "alan_soma",
    nombre: "Alan Soma",
    hp: 600,
    ataque: 9,
    defensa: 20,
    velocidad: 6,
    ataques: [
      { id: "aguante", nombre: "Aguante", tipo: "defensivo", efectividad: 80, prioridad: 1, limiteUso: 15 },
      { id: "tragar", nombre: "Tragar", tipo: "ataque", poder: 1000, limiteUso: 3 },
      { id: "golpe_de_gordo", nombre: "Golpe de gordo", tipo: "ataque", poder: 50, efectividad: 100, limiteUso: 20 },
    ],
  },
  ramon: {
    id: "ramon",
    nombre: "Ramón",
    hp: 400,
    ataque: 12,
    defensa: 8,
    velocidad: 15,
    ataques: [
      { id: "infiel", nombre: "Infiel", tipo: "ataque", poder: 200, efectividad: 80, limiteUso: 10 },
      { id: "correr", nombre: "Correr", tipo: "defensivo", poder: 50, efectividad: 80, limiteUso: 15 },
      { id: "golpe_inutil", nombre: "Golpe inútil", tipo: "ataque", poder: 40, efectividad: 100, limiteUso: 25 },
    ],
  },
  sonoda: {
    id: "sonoda",
    nombre: "Sonoda",
    hp: 350,
    ataque: 15,
    defensa: 10,
    velocidad: 10,
    ataques: [
      { id: "lolero", nombre: "Lolero", tipo: "defensivo", efectividad: 80, limiteUso: 10 },
      { id: "kung_fu", nombre: "Kung Fu", tipo: "ataque", poder: 100, efectividad: 90, limiteUso: 15 },
      { id: "borracho", nombre: "Borracho", tipo: "ataque", efectividad: 100, limiteUso: 12 },
    ],
  },
};

function cloneCharacter(base) {
  return {
    ...base,
    hpActual: base.hp,
    ataqueBoost: 1,
    defensaBoost: 1,
    protegerTurno: false,
    esquivaAtaqueTurno: false,
    usos: Object.fromEntries(base.ataques.map((a) => [a.id, a.limiteUso])),
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(percent) {
  return Math.random() * 100 < percent;
}

function rollTragarOutcome() {
  const rollValue = Math.random() * 100;

  if (rollValue < 5) return { hit: true, poder: 1000 };
  if (rollValue < 60) return { hit: true, poder: 200 };
  return { hit: false, poder: 0 };
}

function getDamage(attacker, defender, move) {
  const raw =
    ((22 * move.poder * (attacker.ataque * attacker.ataqueBoost)) /
      Math.max(1, defender.defensa * defender.defensaBoost)) /
      50 +
    2;

  const variance = randomInt(85, 100) / 100;
  const baseDamage = raw * variance;
  const boostedDamage = baseDamage * 1.5;
  return Math.max(1, Math.floor(boostedDamage));
}

function emitActiveUsers() {
  const list = Array.from(users.entries()).map(([username, data]) => ({
    username,
    status: data.status,
  }));
  io.emit("active_users", list);
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
    players: room.players,
    ready: room.ready,
    selectedCharacters: room.selectedCharacters,
  });
}

function buildBattlePublicState(room, viewerUsername) {
  const isPlayer1 = room.battle.player1.username === viewerUsername;
  const me = isPlayer1 ? room.battle.player1 : room.battle.player2;
  const enemy = isPlayer1 ? room.battle.player2 : room.battle.player1;

  return {
    roomId: room.roomId,
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
  const nextAttacker = {
    ...attacker,
    usos: { ...attacker.usos },
  };
  const nextDefender = {
    ...defender,
    usos: { ...defender.usos },
  };

  if (nextAttacker.usos[move.id] <= 0) {
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerOwnerLabel} no tiene más usos para ${move.nombre}.`,
    };
  }

  nextAttacker.usos[move.id] -= 1;

  if (move.id === "aguante") {
    if (!roll(move.efectividad)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} intentó Aguante, pero falló.`,
      };
    }

    nextAttacker.protegerTurno = true;
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerOwnerLabel} usó Aguante y reducirá el daño recibido este turno.`,
    };
  }

  if (move.id === "tragar") {
    const outcome = rollTragarOutcome();

    if (!outcome.hit) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usó Tragar, pero falló.`,
      };
    }

    if (nextDefender.esquivaAtaqueTurno && outcome.poder === 1000) {
      const reducedMove = { ...move, poder: 200, efectividad: 100 };
      const dmg = getDamage(nextAttacker, nextDefender, reducedMove);
      nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);

      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usó Tragar, pero el rival evitó el ataque letal. Causó ${dmg} de daño.`,
      };
    }

    const resolvedMove = { ...move, poder: outcome.poder, efectividad: 100 };
    const dmg = getDamage(nextAttacker, nextDefender, resolvedMove);
    nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);

    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text:
        outcome.poder === 1000
          ? `${attackerOwnerLabel} usó Tragar con potencia máxima y causó ${dmg} de daño.`
          : `${attackerOwnerLabel} usó Tragar con poder ${outcome.poder} y causó ${dmg} de daño.`,
    };
  }

  if (move.id === "lolero") {
    if (!roll(move.efectividad)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} intentÃ³ Lolero, pero fallÃ³.`,
      };
    }

    if (roll(5)) {
      nextAttacker.hpActual = 0;
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usÃ³ Lolero, engordÃ³ demasiado y muriÃ³.`,
      };
    }

    const heal = Math.floor(nextAttacker.hp * 0.25);
    nextAttacker.hpActual = Math.min(nextAttacker.hp, nextAttacker.hpActual + heal);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerOwnerLabel} usÃ³ Lolero y recuperÃ³ ${heal} de vida.`,
    };
  }

  if (move.id === "kung_fu") {
    const accuracy = move.efectividad ?? 100;
    if (!roll(accuracy)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usÃ³ Kung Fu, pero fallÃ³.`,
      };
    }

    const poweredMove = roll(10) ? { ...move, poder: move.poder * 2 } : move;
    const dmg = getDamage(nextAttacker, nextDefender, poweredMove);
    nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text:
        poweredMove.poder > move.poder
          ? `${attackerOwnerLabel} usÃ³ Kung Fu y duplicÃ³ su poder, causando ${dmg} de daÃ±o.`
          : `${attackerOwnerLabel} usÃ³ Kung Fu e hizo ${dmg} de daÃ±o.`,
    };
  }

  if (move.id === "borracho") {
    const rollValue = Math.random() * 100;

    if (rollValue < 50) {
      const borrachoMove = { ...move, poder: 50 };
      const dmg = getDamage(nextAttacker, nextDefender, borrachoMove);
      nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usÃ³ Borracho e hizo ${dmg} de daÃ±o.`,
      };
    }

    if (rollValue < 70) {
      const borrachoMove = { ...move, poder: 100 };
      const dmg = getDamage(nextAttacker, nextDefender, borrachoMove);
      nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usÃ³ Borracho con fuerza y causÃ³ ${dmg} de daÃ±o.`,
      };
    }

    if (rollValue < 99) {
      const selfMove = { ...move, poder: 30 };
      const selfDmg = getDamage(nextAttacker, nextAttacker, selfMove);
      nextAttacker.hpActual = Math.max(0, nextAttacker.hpActual - selfDmg);
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usÃ³ Borracho y se daÃ±Ã³ a sÃ­ mismo por ${selfDmg}.`,
      };
    }

    const borrachoMove = { ...move, poder: 1000 };
    const dmg = getDamage(nextAttacker, nextDefender, borrachoMove);
    nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerOwnerLabel} usÃ³ Borracho y desatÃ³ un golpe devastador de ${dmg} de daÃ±o.`,
    };
  }

  if (move.id === "correr") {
    if (!defenderPlannedMove || defenderPlannedMove.tipo !== "ataque") {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} intentó Correr, pero el rival no atacó.`,
      };
    }

    if (!roll(move.efectividad)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} intentó Correr, pero no pudo esquivar.`,
      };
    }

    nextAttacker.esquivaAtaqueTurno = true;
    const dmg = getDamage(nextAttacker, nextDefender, move);
    nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);

    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerOwnerLabel} esquivó completamente el ataque y contraatacó con Correr por ${dmg} de daño.`,
    };
  }

  if (move.tipo === "ataque") {
    const accuracy = move.efectividad ?? 100;

    if (!roll(accuracy)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerOwnerLabel} usó ${move.nombre}, pero falló.`,
      };
    }

    let dmg = getDamage(nextAttacker, nextDefender, move);

    if (nextDefender.esquivaAtaqueTurno) {
      dmg = 0;
    } else if (nextDefender.protegerTurno) {
      dmg = Math.floor(dmg * 0.3);
    }

    nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);

    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text:
        dmg === 0
          ? `${attackerOwnerLabel} usó ${move.nombre}, pero el rival lo esquivó.`
          : `${attackerOwnerLabel} usó ${move.nombre} e hizo ${dmg} de daño.`,
    };
  }

  return {
    attacker: nextAttacker,
    defender: nextDefender,
    text: `${attackerOwnerLabel} no hizo nada.`,
  };
}

function endTurnUpdate(p1, p2) {
  const a = { ...p1 };
  const b = { ...p2 };

  a.protegerTurno = false;
  b.protegerTurno = false;
  a.esquivaAtaqueTurno = false;
  b.esquivaAtaqueTurno = false;

  return { a, b };
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
    (move1.prioridad || 0) > (move2.prioridad || 0)
      ? true
      : (move1.prioridad || 0) < (move2.prioridad || 0)
      ? false
      : p1.character.velocidad >= p2.character.velocidad;

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

    rooms.set(roomId, {
      roomId,
      players: [from, to],
      ready: {
        [from]: false,
        [to]: false,
      },
      selectedCharacters: {
        [from]: null,
        [to]: null,
      },
      battle: null,
    });

    emitToRoomPlayers(rooms.get(roomId), "battle_started", {
      roomId,
      players: [from, to],
    });

    emitRoomState(roomId);
    emitActiveUsers();

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

    room.ready[username] = true;
    room.selectedCharacters[username] = characterId || null;

    emitRoomState(roomId);

    const everyoneReady = room.players.every(
      (p) => room.ready[p] && room.selectedCharacters[p]
    );

    if (everyoneReady) {
      for (const playerName of room.players) {
        const user = users.get(playerName);
        if (user) user.status = "in-battle";
      }

      const [u1, u2] = room.players;
      room.battle = {
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

      emitToRoomPlayers(room, "start_online_battle", {
        roomId,
        players: room.players,
        selectedCharacters: room.selectedCharacters,
      });

      emitBattleState(roomId);
      emitActiveUsers();
    }

    callback?.({ ok: true });
  });

  socket.on("submit_move", ({ roomId, moveId }, callback) => {
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
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter((p) => p !== username);
        delete room.ready[username];
        delete room.selectedCharacters[username];

        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          emitRoomState(roomId);
        }
      }
    }

    socket.leave(roomId);
    emitActiveUsers();
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
        room.players = room.players.filter((p) => p !== username);
        delete room.ready[username];
        delete room.selectedCharacters[username];

        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          for (const otherUsername of room.players) {
            const otherUser = users.get(otherUsername);
            if (otherUser) {
              otherUser.status = "online";
            }
          }
          emitRoomState(roomId);
        }
      }

      emitActiveUsers();
    }

    console.log("Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
