import React, { useEffect, useMemo, useState } from "react";
import { socket } from "./lib/socket";

const CHARACTERS = {
  alan_soma: {
    id: "alan_soma",
    nombre: "Alan Soma",
    hp: 600,
    ataque: 9,
    defensa: 20,
    velocidad: 6,
    descripcion: "Tanque resistente que aguanta y busca rematar con Tragar.",
    spriteScale: 1,
    ataques: [
      {
        id: "aguante",
        nombre: "Aguante",
        tipo: "defensivo",
        efectividad: 80,
        prioridad: 1,
        limiteUso: 15,
        descripcion: "Recibe solo el 30% del daño rival ese turno."
      },
      {
        id: "tragar",
        nombre: "Tragar",
        tipo: "ataque",
        poder: 1000,
        limiteUso: 3,
        descripcion: "Tiene 10% de hacer un golpe de poder 1000, 40% de hacer un golpe de poder 200, 10% de hacer un golpe de poder 250 y el resto falla."
      },
      {
        id: "golpe_de_gordo",
        nombre: "Golpe de gordo",
        tipo: "ataque",
        poder: 50,
        efectividad: 100,
        limiteUso: 20,
        descripcion: "Golpe básico confiable."
      }
    ]
  },
  ramon: {
    id: "ramon",
    nombre: "Ramón",
    hp: 400,
    ataque: 12,
    defensa: 8,
    velocidad: 15,
    descripcion: "Rápido, agresivo y ahora mucho más resistente.",
    spriteScale: 1,
    ataques: [
      {
        id: "infiel",
        nombre: "Infiel",
        tipo: "ataque",
        poder: 200,
        efectividad: 80,
        limiteUso: 10,
        descripcion: "Golpe muy fuerte por la espalda."
      },
      {
        id: "correr",
        nombre: "Correr",
        tipo: "defensivo",
        poder: 50,
        efectividad: 80,
        limiteUso: 15,
        descripcion: "Si el rival ataca, esquiva completamente y contraataca. Si el rival se defiende, falla."
      },
      {
        id: "golpe_inutil",
        nombre: "Golpe inútil",
        tipo: "ataque",
        poder: 40,
        efectividad: 100,
        limiteUso: 25,
        descripcion: "Golpe básico débil."
      }
    ]
  },
  sonoda: {
    id: "sonoda",
    nombre: "Sonoda",
    hp: 350,
    ataque: 15,
    defensa: 10,
    velocidad: 10,
    descripcion: "Caótico y arriesgado: puede curarse, golpear fuerte o destruirse solo.",
    spriteScale: 1,
    ataques: [
      {
        id: "lolero",
        nombre: "Lolero",
        tipo: "defensivo",
        efectividad: 80,
        limiteUso: 10,
        descripcion: "Se cura el 25% de la vida pero tiene un 5% de probabilidad de engordar y morir."
      },
      {
        id: "kung_fu",
        nombre: "Kung Fu",
        tipo: "ataque",
        poder: 100,
        efectividad: 90,
        limiteUso: 15,
        descripcion: "Golpea al rival con un ataque de kung fu asiático. Tiene 10% de probabilidad de duplicar su poder."
      },
      {
        id: "borracho",
        nombre: "Borracho",
        tipo: "ataque",
        efectividad: 100,
        limiteUso: 12,
        descripcion: "50% poder 50 al rival, 20% poder 100 al rival, 29% dañarse a sí mismo con poder 30 y 1% golpear al rival con poder 1000."
      }
    ]
  }
};

const DIFFICULTIES = {
  facil: {
    id: "facil",
    nombre: "Fácil",
    aiBiasStrong: 0.2,
    aiDelayLabel: "IA simple"
  },
  normal: {
    id: "normal",
    nombre: "Normal",
    aiBiasStrong: 0.45,
    aiDelayLabel: "IA equilibrada"
  },
  dificil: {
    id: "dificil",
    nombre: "Difícil",
    aiBiasStrong: 0.7,
    aiDelayLabel: "IA agresiva"
  }
};

function cloneCharacter(base) {
  return {
    ...base,
    hpActual: base.hp,
    ataqueBoost: 1,
    defensaBoost: 1,
    protegerTurno: false,
    esquivaAtaqueTurno: false,
    usos: Object.fromEntries(base.ataques.map((a) => [a.id, a.limiteUso]))
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(percent) {
  return Math.random() * 100 < percent;
}

function rollTragarOutcome() {
  const roll = Math.random() * 100;

  if (roll < 10) return { hit: true, poder: 1000 };
  if (roll < 50) return { hit: true, poder: 200 };
  if (roll < 60) return { hit: true, poder: 250 };
  return { hit: false, poder: 0 };
}

function getDamage(attacker, defender, move) {
  const raw = ((22 * move.poder * (attacker.ataque * attacker.ataqueBoost)) /
    Math.max(1, defender.defensa * defender.defensaBoost)) / 50 + 2;
  const variance = randomInt(85, 100) / 100;
  const baseDamage = raw * variance;
  const boostedDamage = baseDamage * 1.5;
  return Math.max(1, Math.floor(boostedDamage));
}

function getSpriteFileName(spriteKey, variant, pose = "normal") {
  return pose === "normal"
    ? `${spriteKey}_${variant}.png`
    : `${spriteKey}_${variant}_${pose}.png`;
}

function runSelfTests() {
  const alan = cloneCharacter(CHARACTERS.alan_soma);
  const ramon = cloneCharacter(CHARACTERS.ramon);

  if (alan.hpActual !== 600) {
    throw new Error("Test failed: Alan debería empezar con 600 HP.");
  }

  if (ramon.hpActual !== 400) {
    throw new Error("Test failed: Ramón debería empezar con 400 HP.");
  }

  if (ramon.usos.infiel !== 10) {
    throw new Error("Test failed: Infiel debería tener 10 usos.");
  }

  const tragar = CHARACTERS.alan_soma.ataques.find((a) => a.id === "tragar");
  if (!tragar || !tragar.descripcion.includes("poder 250")) {
    throw new Error("Test failed: Tragar debería indicar sus nuevos valores de poder.");
  }

  if (getSpriteFileName("ramon", "front", "hit") !== "ramon_front_hit.png") {
    throw new Error("Test failed: el nombre del sprite hit no coincide.");
  }

  const golpe = CHARACTERS.alan_soma.ataques.find((a) => a.id === "golpe_de_gordo");
  if (!golpe || getDamage(alan, ramon, golpe) < 1) {
    throw new Error("Test failed: el daño mínimo debería ser 1.");
  }
}

runSelfTests();

function BattleSprite({
  spriteKey,
  name,
  mirrored = false,
  variant = "front",
  scale = 1,
  side = "enemy",
  pose = "normal",
  acting = false,
  flashing = false
}) {
  const fileName = getSpriteFileName(spriteKey, variant, pose);
  const spritePosition = side === "enemy" ? "absolute left-1/2 top-24 -translate-x-1/2" : "absolute left-1/2 bottom-10 -translate-x-1/2";
  const shadowPosition = side === "enemy" ? "absolute right-20 top-[58%] w-28" : "absolute left-20 bottom-6 w-32";
  const attackOffset = side === "enemy" ? "translateX(-26px)" : "translateX(26px)";
  const finalTransform = `${mirrored ? "scaleX(-1) " : ""}${acting ? `${attackOffset} ` : ""}scale(${scale})`;

  return (
    <div className="relative h-full w-full">
      <div className={`${shadowPosition} z-0 h-5 rounded-full bg-black/35 blur-md`} />

      <div className={spritePosition}>
        <img
          src={`/sprites/${fileName}`}
          alt={name}
          className={`relative z-10 h-44 w-auto object-contain ${mirrored ? "scale-x-[-1]" : ""}`}
          style={{
            transform: finalTransform,
            transformOrigin: "bottom center",
            transition: "transform 180ms ease, filter 120ms ease, opacity 120ms ease",
            filter: flashing ? "brightness(1.85) saturate(1.3)" : "none",
            opacity: flashing ? 0.82 : 1
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    </div>
  );
}

function HpPanel({ name, hp, maxHp, side = "enemy" }) {
  const hpPct = Math.max(0, (hp / maxHp) * 100);
  const panelPosition = side === "enemy" ? "absolute right-4 top-4" : "absolute right-4 bottom-4";

  let hpColor = "bg-green-500";
  if (hpPct <= 50) hpColor = "bg-yellow-500";
  if (hpPct <= 20) hpColor = "bg-red-500";

  return (
    <div className={`${panelPosition} z-30 w-56 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-lg`}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-100">{name}</div>
        <div className="text-xs text-zinc-400">{hp}/{maxHp} HP</div>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${hpColor}`}
          style={{ width: `${hpPct}%` }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("auth");
  const [selectedId, setSelectedId] = useState("alan_soma");
  const [difficultyId, setDifficultyId] = useState("normal");
  const [player, setPlayer] = useState(null);
  const [enemy, setEnemy] = useState(null);
  const [turn, setTurn] = useState(1);
  const [logs, setLogs] = useState(["Elegí personaje y dificultad para empezar."]);
  const [battleOver, setBattleOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playerPose, setPlayerPose] = useState("normal");
  const [enemyPose, setEnemyPose] = useState("normal");
  const [playerActing, setPlayerActing] = useState(false);
  const [enemyActing, setEnemyActing] = useState(false);
  const [playerFlashing, setPlayerFlashing] = useState(false);
  const [enemyFlashing, setEnemyFlashing] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [username, setUsername] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [challengeTarget, setChallengeTarget] = useState("");
  const [challengeMessage, setChallengeMessage] = useState("");
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [roomReady, setRoomReady] = useState({});
  const [roomSelectedCharacter, setRoomSelectedCharacter] = useState("alan_soma");

  const selectedCharacter = CHARACTERS[selectedId];
  const enemyBase = useMemo(
    () => CHARACTERS[selectedId === "alan_soma" ? "ramon" : "alan_soma"],
    [selectedId]
  );
  const difficulty = DIFFICULTIES[difficultyId];

  useEffect(() => {
    function onActiveUsers(list) {
      setActiveUsers(list);
    }

    function onChallengeReceived({ from }) {
      setIncomingChallenge({ from });
      setChallengeMessage(`${from} te desafió.`);
    }

    function onChallengeRejected({ by }) {
      setChallengeMessage(`${by} rechazó tu reto.`);
      setIncomingChallenge(null);
    }

    function onBattleStarted({ roomId, players }) {
      setCurrentRoomId(roomId);
      setRoomPlayers(players || []);
      setRoomReady({});
      setIncomingChallenge(null);
      setChallengeMessage(`Sala creada: ${roomId}`);
      setScreen("room");
    }

    function onRoomState({ roomId, players, ready }) {
      setCurrentRoomId(roomId || "");
      setRoomPlayers(players || []);
      setRoomReady(ready || {});
    }

    function onStartOnlineBattle({ roomId, players }) {
      setCurrentRoomId(roomId || "");
      setRoomPlayers(players || []);
      setChallengeMessage(`La batalla comenzó en ${roomId}.`);
      setSelectedId(roomSelectedCharacter);
      setScreen("menu");
    }

    socket.on("active_users", onActiveUsers);
    socket.on("challenge_received", onChallengeReceived);
    socket.on("challenge_rejected", onChallengeRejected);
    socket.on("battle_started", onBattleStarted);
    socket.on("room_state", onRoomState);
    socket.on("start_online_battle", onStartOnlineBattle);

    return () => {
      socket.off("active_users", onActiveUsers);
      socket.off("challenge_received", onChallengeReceived);
      socket.off("challenge_rejected", onChallengeRejected);
      socket.off("battle_started", onBattleStarted);
      socket.off("room_state", onRoomState);
      socket.off("start_online_battle", onStartOnlineBattle);
    };
  }, []);

  function handleEnterLobby() {
    const clean = usernameInput.trim();

    if (!clean) {
      setChallengeMessage("Escribí un nombre de usuario para entrar.");
      return;
    }

    socket.emit("register_user", clean, (response) => {
      if (!response?.ok) {
        setChallengeMessage(response?.message || "No se pudo entrar al lobby.");
        return;
      }

      setUsername(response.username);
      setScreen("lobby");
      setChallengeMessage(`Conectado como ${response.username}.`);
    });
  }

  function handleSendChallenge(targetName) {
    const target = String(targetName || "").trim();

    if (!username) {
      setChallengeMessage("Primero entrá al lobby con tu usuario.");
      return;
    }

    if (!target) {
      setChallengeMessage("Escribí un usuario para retar.");
      return;
    }

    socket.emit("send_challenge", { to: target }, (response) => {
      if (!response?.ok) {
        setChallengeMessage(response?.message || "No se pudo enviar el reto.");
        return;
      }

      setChallengeTarget(target);
      setChallengeMessage(response.message);
    });
  }

  function handleAcceptChallenge() {
    if (!incomingChallenge?.from) return;

    socket.emit("accept_challenge", { from: incomingChallenge.from }, (response) => {
      if (!response?.ok) {
        setChallengeMessage(response?.message || "No se pudo aceptar el reto.");
        return;
      }

      setIncomingChallenge(null);
      setChallengeMessage(`Aceptaste el reto de ${incomingChallenge.from}.`);
    });
  }

  function handleRejectChallenge() {
    if (!incomingChallenge?.from) return;

    socket.emit("reject_challenge", { from: incomingChallenge.from }, (response) => {
      if (!response?.ok) {
        setChallengeMessage(response?.message || "No se pudo rechazar el reto.");
        return;
      }

      setChallengeMessage(`Rechazaste el reto de ${incomingChallenge.from}.`);
      setIncomingChallenge(null);
    });
  }

  function handlePrepareLocalBattle() {
    const target = challengeTarget || enemyBase.nombre;
    setChallengeMessage(target ? `Preparando sala de prueba contra ${target}.` : "Preparando sala de prueba.");
    setScreen("menu");
  }

  function handleReadyForBattle() {
    if (!currentRoomId) return;

    socket.emit(
      "player_ready",
      {
        roomId: currentRoomId,
        username,
        characterId: roomSelectedCharacter
      },
      (response) => {
        if (!response?.ok) {
          setChallengeMessage(response?.message || "No se pudo marcar como listo.");
          return;
        }

        setChallengeMessage("Marcado como listo. Esperando al otro jugador...");
      }
    );
  }

  function startBattle() {
    setPlayer(cloneCharacter(selectedCharacter));
    setEnemy(cloneCharacter(enemyBase));
    setTurn(1);
    setBusy(false);
    setBattleOver(false);
    setPlayerPose("normal");
    setEnemyPose("normal");
    setPlayerActing(false);
    setEnemyActing(false);
    setPlayerFlashing(false);
    setEnemyFlashing(false);
    setLogs([
      `Comienza la partida rápida. ${selectedCharacter.nombre} vs ${enemyBase.nombre}.`,
      `Dificultad: ${difficulty.nombre}. ${difficulty.aiDelayLabel}.`
    ]);
    setScreen("battle");
  }

  function pickAiMove(currentEnemy) {
    const available = currentEnemy.ataques.filter((a) => currentEnemy.usos[a.id] > 0);
    if (!available.length) return currentEnemy.ataques[0];

    const damaging = available.filter((a) => a.tipo === "ataque");
    const defensive = available.filter((a) => a.tipo === "defensivo");

    if (difficulty.id === "facil") {
      if (Math.random() < 0.5 && defensive.length > 0) {
        return defensive[randomInt(0, defensive.length - 1)];
      }
      return available[randomInt(0, available.length - 1)];
    }

    if (difficulty.id === "normal") {
      if (currentEnemy.id === "alan_soma" && currentEnemy.hpActual < currentEnemy.hp * 0.45) {
        const aguante = available.find((a) => a.id === "aguante");
        if (aguante && Math.random() < 0.45) return aguante;
      }

      if (currentEnemy.id === "ramon" && damaging.length > 0) {
        return Math.random() < difficulty.aiBiasStrong
          ? damaging.reduce((best, move) => ((move.poder || 0) > (best.poder || 0) ? move : best))
          : available[randomInt(0, available.length - 1)];
      }

      return available[randomInt(0, available.length - 1)];
    }

    if (currentEnemy.id === "alan_soma") {
      const tragar = available.find((a) => a.id === "tragar");
      const aguante = available.find((a) => a.id === "aguante");
      const golpe = available.find((a) => a.id === "golpe_de_gordo");

      if (tragar && Math.random() < 0.3) return tragar;
      if (aguante && currentEnemy.hpActual < currentEnemy.hp * 0.55 && Math.random() < 0.55) {
        return aguante;
      }
      if (golpe) return golpe;
    }

    if (currentEnemy.id === "ramon") {
      const infiel = available.find((a) => a.id === "infiel");
      const correr = available.find((a) => a.id === "correr");
      const golpe = available.find((a) => a.id === "golpe_inutil");

      if (correr && Math.random() < 0.35) return correr;
      if (infiel && Math.random() < 0.7) return infiel;
      if (golpe) return golpe;
    }

    return available[randomInt(0, available.length - 1)];
  }

  function applyMove(attacker, defender, move, chosenByPlayer, defenderMove) {
    const nextAttacker = { ...attacker, usos: { ...attacker.usos } };
    const nextDefender = { ...defender, usos: { ...defender.usos } };
    const owner = chosenByPlayer ? "Tu" : "El rival";

    if (nextAttacker.usos[move.id] <= 0) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${owner} ${attacker.nombre} no tiene más usos para ${move.nombre}.`
      };
    }

    nextAttacker.usos[move.id] -= 1;

    if (move.id === "aguante") {
      if (!roll(move.efectividad)) {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} intentó Aguante, pero falló.`
        };
      }

      nextAttacker.protegerTurno = true;
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${owner} ${attacker.nombre} usó Aguante y reducirá el daño recibido este turno.`
      };
    }

    if (move.id === "lolero") {
      if (!roll(move.efectividad)) {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} intentó Lolero, pero falló.`
        };
      }

      if (roll(5)) {
        nextAttacker.hpActual = 0;
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} usó Lolero, engordó demasiado y murió.`
        };
      }

      const heal = Math.floor(nextAttacker.hp * 0.25);
      nextAttacker.hpActual = Math.min(nextAttacker.hp, nextAttacker.hpActual + heal);
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${owner} ${attacker.nombre} usó Lolero y recuperó ${heal} de vida.`
      };
    }

    if (move.id === "aguante") {
      if (!roll(move.efectividad)) {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} intentó Aguante, pero falló.`
        };
      }

      nextAttacker.protegerTurno = true;
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${owner} ${attacker.nombre} usó Aguante y reducirá el daño recibido este turno.`
      };
    }

    if (move.id === "tragar") {
      const outcome = rollTragarOutcome();

      if (!outcome.hit) {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} usó Tragar, pero falló.`
        };
      }

      if (nextDefender.esquivaAtaqueTurno && outcome.poder === 1000) {
        const reducedMove = { ...move, poder: 200, efectividad: 100 };
        const dmg = getDamage(nextAttacker, nextDefender, reducedMove);
        nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} usó Tragar, pero ${defender.nombre} evitó el ataque letal. El golpe se redujo y causó ${dmg} de daño.`
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
            ? `${owner} ${attacker.nombre} usó Tragar con potencia máxima y causó ${dmg} de daño.`
            : `${owner} ${attacker.nombre} usó Tragar con poder ${outcome.poder} y causó ${dmg} de daño.`
      };
    }

    if (move.id === "kung_fu") {
      const accuracy = move.efectividad ?? 100;
      if (!roll(accuracy)) {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} usó Kung Fu, pero falló.`
        };
      }

      const poweredMove = roll(10) ? { ...move, poder: move.poder * 2 } : move;
      const dmg = getDamage(nextAttacker, nextDefender, poweredMove);
      nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: poweredMove.poder > move.poder
          ? `${owner} ${attacker.nombre} usó Kung Fu y duplicó su poder, causando ${dmg} de daño.`
          : `${owner} ${attacker.nombre} usó Kung Fu e hizo ${dmg} de daño.`
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
          text: `${owner} ${attacker.nombre} usó Borracho e hizo ${dmg} de daño.`
        };
      }

      if (rollValue < 70) {
        const borrachoMove = { ...move, poder: 100 };
        const dmg = getDamage(nextAttacker, nextDefender, borrachoMove);
        nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} usó Borracho con fuerza y causó ${dmg} de daño.`
        };
      }

      if (rollValue < 99) {
        const selfMove = { ...move, poder: 30 };
        const selfDmg = getDamage(nextAttacker, nextAttacker, selfMove);
        nextAttacker.hpActual = Math.max(0, nextAttacker.hpActual - selfDmg);
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} usó Borracho y se dañó a sí mismo por ${selfDmg}.`
        };
      }

      const borrachoMove = { ...move, poder: 1000 };
      const dmg = getDamage(nextAttacker, nextDefender, borrachoMove);
      nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${owner} ${attacker.nombre} usó Borracho y desató un golpe devastador de ${dmg} de daño.`
      };
    }

    if (move.id === "correr") {
      if (!defenderMove || defenderMove.tipo !== "ataque") {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} intentó Correr, pero el rival no atacó.`
        };
      }

      if (!roll(move.efectividad)) {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} intentó Correr, pero no pudo esquivar.`
        };
      }

      nextAttacker.esquivaAtaqueTurno = true;
      const dmg = getDamage(nextAttacker, nextDefender, move);
      nextDefender.hpActual = Math.max(0, nextDefender.hpActual - dmg);

      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${owner} ${attacker.nombre} esquivó completamente el ataque y contraatacó con Correr por ${dmg} de daño.`
      };
    }

    if (move.tipo === "ataque") {
      const accuracy = move.efectividad ?? 100;
      if (!roll(accuracy)) {
        return {
          attacker: nextAttacker,
          defender: nextDefender,
          text: `${owner} ${attacker.nombre} usó ${move.nombre}, pero falló.`
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
        text: dmg === 0
          ? `${owner} ${attacker.nombre} usó ${move.nombre}, pero el rival lo esquivó.`
          : `${owner} ${attacker.nombre} usó ${move.nombre} e hizo ${dmg} de daño.`
      };
    }

    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${owner} ${attacker.nombre} no hizo nada.`
    };
  }

  function endTurnUpdate(nextPlayer, nextEnemy) {
    const updatedPlayer = { ...nextPlayer };
    const updatedEnemy = { ...nextEnemy };

    updatedPlayer.protegerTurno = false;
    updatedEnemy.protegerTurno = false;
    updatedPlayer.esquivaAtaqueTurno = false;
    updatedEnemy.esquivaAtaqueTurno = false;

    return { updatedPlayer, updatedEnemy };
  }

  async function runTurn(playerMove) {
    if (!player || !enemy || battleOver || busy) return;
    setBusy(true);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const enemyMove = pickAiMove(enemy);
    const firstIsPlayer =
      (playerMove.prioridad || 0) > (enemyMove.prioridad || 0)
        ? true
        : (playerMove.prioridad || 0) < (enemyMove.prioridad || 0)
          ? false
          : player.velocidad >= enemy.velocidad;

    let p = { ...player };
    let e = { ...enemy };
    const turnHeader = `Turno ${turn}`;
    setLogs((prev) => [turnHeader, ...prev].slice(0, 14));

    const executeStep = async ({ attackerIsPlayer, move, defenderPlannedMove }) => {
      if (attackerIsPlayer) {
        setPlayerActing(true);
      } else {
        setEnemyActing(true);
      }

      await sleep(320);

      const result = attackerIsPlayer
        ? applyMove(p, e, move, true, defenderPlannedMove)
        : applyMove(e, p, move, false, defenderPlannedMove);

      let playerDamaged = false;
      let enemyDamaged = false;
      let playerKO = false;
      let enemyKO = false;

      if (attackerIsPlayer) {
        const nextP = result.attacker;
        const nextE = result.defender;
        enemyDamaged = nextE.hpActual < e.hpActual;
        enemyKO = nextE.hpActual <= 0;
        p = nextP;
        e = nextE;
      } else {
        const nextE = result.attacker;
        const nextP = result.defender;
        playerDamaged = nextP.hpActual < p.hpActual;
        playerKO = nextP.hpActual <= 0;
        e = nextE;
        p = nextP;
      }

      setPlayer(p);
      setEnemy(e);
      setLogs((prev) => [result.text, ...prev].slice(0, 14));

      if (playerKO) {
        setPlayerPose("ko");
      } else if (playerDamaged) {
        setPlayerPose("hit");
        setPlayerFlashing(true);
      }

      if (enemyKO) {
        setEnemyPose("ko");
      } else if (enemyDamaged) {
        setEnemyPose("hit");
        setEnemyFlashing(true);
      }

      await sleep(400);

      if (playerDamaged && !playerKO) {
        setPlayerPose("normal");
        setPlayerFlashing(false);
      }
      if (enemyDamaged && !enemyKO) {
        setEnemyPose("normal");
        setEnemyFlashing(false);
      }

      if (attackerIsPlayer) {
        setPlayerActing(false);
      } else {
        setEnemyActing(false);
      }

      await sleep(320);
      return result;
    };

    if (firstIsPlayer) {
      await executeStep({ attackerIsPlayer: true, move: playerMove, defenderPlannedMove: enemyMove });
      if (p.hpActual > 0 && e.hpActual > 0) {
        await executeStep({ attackerIsPlayer: false, move: enemyMove, defenderPlannedMove: playerMove });
      }
    } else {
      await executeStep({ attackerIsPlayer: false, move: enemyMove, defenderPlannedMove: playerMove });
      if (p.hpActual > 0 && e.hpActual > 0) {
        await executeStep({ attackerIsPlayer: true, move: playerMove, defenderPlannedMove: enemyMove });
      }
    }

    const after = endTurnUpdate(p, e);
    p = after.updatedPlayer;
    e = after.updatedEnemy;

    setPlayer(p);
    setEnemy(e);

    if (p.hpActual <= 0 || e.hpActual <= 0) {
      setBattleOver(true);
      setLogs((prev) => [
        p.hpActual <= 0 && e.hpActual <= 0
          ? "Empate."
          : e.hpActual <= 0
            ? "Ganaste la partida."
            : "Perdiste la partida.",
        ...prev
      ].slice(0, 14));
    }

    setTurn((t) => t + 1);
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col p-4 md:p-8">
        <header className="mb-6 flex flex-col gap-2 border-b border-zinc-800 pb-4">
          <h1 className="text-3xl font-black tracking-tight">Quick Showdown Prototype</h1>
          <p className="text-sm text-zinc-400">
            Partida rápida 1v1 con Alan Soma y Ramón, 3 dificultades y combate por turnos.
          </p>
        </header>

        {screen === "auth" && (
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-2 text-2xl font-bold">Entrar al lobby</h2>
            <p className="mb-5 text-sm text-zinc-400">
              Primera versión del multijugador estilo Showdown: elegís un username y después podés retar a usuarios activos.
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-300">Nombre de usuario</label>
              <input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Ej: Sonta"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
              />
              <button
                onClick={handleEnterLobby}
                className="w-full rounded-2xl bg-zinc-100 px-4 py-3 font-bold text-zinc-950 transition hover:opacity-90"
              >
                Entrar
              </button>
            </div>

            {challengeMessage && (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                {challengeMessage}
              </div>
            )}
          </div>
        )}

        {screen === "lobby" && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Lobby</h2>
                  <p className="text-sm text-zinc-400">Usuario activo: {username}</p>
                </div>
                <button
                  onClick={() => setScreen("auth")}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  Cambiar usuario
                </button>
              </div>

              <div className="space-y-3">
                {activeUsers.map((user) => (
                  <div
                    key={user.username}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">{user.username}</div>
                      <div className="text-sm text-zinc-400">
                        {user.username === username ? "Vos" : user.status === "online" ? "Online" : "En batalla"}
                      </div>
                    </div>
                    {user.username !== username && (
                      <button
                        onClick={() => handleSendChallenge(user.username)}
                        disabled={user.status !== "online"}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${user.status === "online" ? "bg-zinc-100 text-zinc-950 hover:opacity-90" : "cursor-not-allowed border border-zinc-700 text-zinc-500"}`}
                      >
                        Retar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-xl font-bold">Reto directo</h2>
              <input
                value={challengeTarget}
                onChange={(e) => setChallengeTarget(e.target.value)}
                placeholder="Escribí un username activo"
                className="mb-3 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
              />
              <button
                onClick={() => handleSendChallenge(challengeTarget.trim())}
                className="w-full rounded-2xl bg-zinc-100 px-4 py-3 font-bold text-zinc-950 transition hover:opacity-90"
              >
                Enviar reto
              </button>

              <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                <div className="font-semibold">Estado</div>
                <div className="mt-1 text-zinc-400">{challengeMessage || "Todavía no enviaste ningún reto."}</div>
              </div>

              {incomingChallenge && (
                <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
                  <div className="text-sm font-semibold text-zinc-100">{incomingChallenge.from} te desafió</div>
                  <div className="mt-1 text-sm text-zinc-400">Aceptá o rechazá el reto desde acá.</div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleAcceptChallenge}
                      className="flex-1 rounded-xl bg-zinc-100 px-4 py-2 font-semibold text-zinc-950"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={handleRejectChallenge}
                      className="flex-1 rounded-xl border border-zinc-700 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handlePrepareLocalBattle}
                className="mt-5 w-full rounded-2xl border border-zinc-700 px-4 py-3 font-semibold text-zinc-100 transition hover:bg-zinc-800"
              >
                Probar sala local
              </button>
            </section>
          </div>
        )}

        {screen === "room" && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-2 text-2xl font-bold">Sala previa</h2>
              <p className="mb-5 text-sm text-zinc-400">Elegí tu personaje y marcate como listo. Cuando ambos estén listos, arranca la batalla.</p>

              <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                <div className="font-semibold">Sala</div>
                <div className="mt-1 text-zinc-400">{currentRoomId || "Sin sala"}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {Object.values(CHARACTERS).map((char) => {
                  const selected = char.id === roomSelectedCharacter;
                  return (
                    <button
                      key={char.id}
                      onClick={() => setRoomSelectedCharacter(char.id)}
                      className={`rounded-2xl border p-4 text-left transition ${selected ? "border-zinc-200 bg-zinc-800" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-lg font-bold">{char.nombre}</span>
                        {selected && <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-900">Elegido</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300">
                        <div>HP: {char.hp}</div>
                        <div>Ataque: {char.ataque}</div>
                        <div>Defensa: {char.defensa}</div>
                        <div>Velocidad: {char.velocidad}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleReadyForBattle}
                className="mt-5 w-full rounded-2xl bg-zinc-100 px-4 py-3 font-bold text-zinc-950 transition hover:opacity-90"
              >
                Listo
              </button>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-xl font-bold">Jugadores en la sala</h2>
              <div className="space-y-3">
                {roomPlayers.map((playerName) => (
                  <div key={playerName} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                    <div>
                      <div className="font-semibold text-zinc-100">{playerName}</div>
                      <div className="text-sm text-zinc-400">{playerName === username ? "Vos" : "Rival"}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-bold ${roomReady[playerName] ? "bg-zinc-100 text-zinc-950" : "border border-zinc-700 text-zinc-400"}`}>
                      {roomReady[playerName] ? "Listo" : "Esperando"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                <div className="font-semibold">Estado</div>
                <div className="mt-1 text-zinc-400">{challengeMessage || "Esperando confirmación de ambos jugadores."}</div>
              </div>
            </section>
          </div>
        )}

        {screen === "menu" && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-xl font-bold">Elegí tu personaje</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.values(CHARACTERS).map((char) => {
                  const selected = char.id === selectedId;
                  return (
                    <button
                      key={char.id}
                      onClick={() => setSelectedId(char.id)}
                      className={`rounded-2xl border p-4 text-left transition ${selected ? "border-zinc-200 bg-zinc-800" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-lg font-bold">{char.nombre}</span>
                        {selected && (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-900">
                            Seleccionado
                          </span>
                        )}
                      </div>
                      <p className="mb-3 text-sm text-zinc-400">{char.descripcion}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300">
                        <div>HP: {char.hp}</div>
                        <div>Ataque: {char.ataque}</div>
                        <div>Defensa: {char.defensa}</div>
                        <div>Velocidad: {char.velocidad}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-xl font-bold">Dificultad</h2>
              <div className="space-y-3">
                {Object.values(DIFFICULTIES).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficultyId(d.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${difficultyId === d.id ? "border-zinc-200 bg-zinc-800" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"}`}
                  >
                    <div className="font-bold">{d.nombre}</div>
                    <div className="text-sm text-zinc-400">{d.aiDelayLabel}</div>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                <div className="font-semibold">Rival automático</div>
                <div className="mt-1 text-zinc-400">
                  Usuario conectado: {username || "Invitado"}
                  {currentRoomId ? ` · Sala: ${currentRoomId}` : ""}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedId(roomSelectedCharacter || selectedId);
                  startBattle();
                }}
                className="mt-5 w-full rounded-2xl bg-zinc-100 px-4 py-3 font-bold text-zinc-950 transition hover:opacity-90"
              >
                Iniciar partida rápida
              </button>
            </section>
          </div>
        )}

        {screen === "battle" && player && enemy && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Combate</h2>
                  <p className="text-sm text-zinc-400">
                    Turno {turn} · Dificultad {difficulty.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setScreen("menu")}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  Volver
                </button>
              </div>

              <div className="mb-6 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 p-4">
                <div className="relative h-[420px] w-full rounded-2xl border border-zinc-700 overflow-hidden">
                  <img
                    src="/backgrounds/battle_bg.png"
                    alt="battle background"
                    className="absolute inset-0 h-full w-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
                  <div className="absolute left-1/2 top-[28%] h-10 w-52 -translate-x-1/2 rounded-full bg-black/20 blur-md" />
                  <div className="absolute bottom-10 left-1/2 h-14 w-72 -translate-x-1/2 rounded-full bg-black/25 blur-md" />

                  <HpPanel name={enemy.nombre} hp={enemy.hpActual} maxHp={enemy.hp} side="enemy" />
                  <div className="absolute bottom-6 left-[35%] h-56 w-72 -translate-x-1/2">
                    <BattleSprite
                      spriteKey={player.id}
                      name={player.nombre}
                      variant="back"
                      side="player"
                      scale={player.spriteScale ?? 1}
                      pose={playerPose}
                      acting={playerActing}
                      flashing={playerFlashing}
                    />
                  </div>

                  <HpPanel name={player.nombre} hp={player.hpActual} maxHp={player.hp} side="player" />
                  <div className="absolute left-[65%] top-8 h-48 w-64 -translate-x-1/2">
                    <BattleSprite
                      spriteKey={enemy.id}
                      name={enemy.nombre}
                      mirrored
                      variant="front"
                      side="enemy"
                      scale={enemy.spriteScale ?? 1}
                      pose={enemyPose}
                      acting={enemyActing}
                      flashing={enemyFlashing}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-3 text-sm font-semibold text-zinc-300">Tus ataques</div>
                <div className="grid gap-3 md:grid-cols-3">
                  {player.ataques.map((move) => {
                    const disabled = battleOver || busy || player.usos[move.id] <= 0;
                    const usage = player.usos[move.id];

                    return (
                      <button
                        key={move.id}
                        disabled={disabled}
                        onClick={() => runTurn(move)}
                        className={`rounded-2xl border p-4 text-left transition ${disabled ? "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500" : "border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800"}`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-bold">{move.nombre}</span>
                          <span className="text-xs text-zinc-400">{move.tipo}</span>
                        </div>
                        <div className="text-sm text-zinc-400">
                          {move.poder ? `Poder ${move.poder}` : "Sin daño base"}
                          {move.efectividad ? ` · ${move.efectividad}%` : ""}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">Usos restantes: {usage}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {battleOver && (
                <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-center">
                  <div className="text-lg font-bold">
                    {player.hpActual > 0 && enemy.hpActual <= 0 ? "Victoria" : player.hpActual <= 0 && enemy.hpActual > 0 ? "Derrota" : "Empate"}
                  </div>
                  <button
                    onClick={startBattle}
                    className="mt-3 rounded-xl bg-zinc-100 px-4 py-2 font-bold text-zinc-950"
                  >
                    Jugar otra vez
                  </button>
                </div>
              )}
            </section>

            <aside className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-xl font-bold">Log de batalla</h2>
              <div className="space-y-2">
                {logs.map((line, i) => (
                  <div
                    key={`${line}-${i}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
