import React, { useEffect, useMemo, useRef, useState } from "react";
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
        descripcion: "Tiene 10% de hacer un golpe de poder 1000, 40% de hacer un golpe de poder 200, 10% de hacer un golpe de poder 200 y el resto falla."
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

function getMoveDetails(move) {
  const details = [];

  if (move.id === "tragar") {
    details.push("10% poder 1000");
    details.push("40% poder 200");
    details.push("10% poder 200");
    details.push("40% falla");
  } else if (typeof move.poder === "number") {
    details.push(`Poder ${move.poder}`);
  } else {
    details.push("Sin daño base");
  }

  if (typeof move.efectividad === "number") {
    details.push(`Precision ${move.efectividad}%`);
  }

  if (typeof move.prioridad === "number") {
    details.push(`Prioridad ${move.prioridad}`);
  }

  return details;
}

function rollTragarOutcome() {
  const roll = Math.random() * 100;

  if (roll < 10) return { hit: true, poder: 1000 };
  if (roll < 50) return { hit: true, poder: 200 };
  if (roll < 60) return { hit: true, poder: 200 };
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
  if (!tragar || !tragar.descripcion.includes("10% de hacer un golpe de poder 200")) {
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
  const spritePosition = side === "enemy"
    ? "absolute bottom-0 left-1/2 -translate-x-1/2 md:top-24 md:bottom-auto"
    : "absolute bottom-0 left-1/2 -translate-x-1/2 md:bottom-10";
  const shadowPosition = side === "enemy"
    ? "absolute bottom-2 left-1/2 w-24 -translate-x-1/2 md:right-20 md:left-auto md:top-[58%] md:bottom-auto md:w-28 md:translate-x-0"
    : "absolute bottom-2 left-1/2 w-28 -translate-x-1/2 md:left-20 md:bottom-6 md:w-32";
  const attackOffset = side === "enemy" ? "translateX(-12px)" : "translateX(26px)";
  const finalTransform = `${mirrored ? "scaleX(-1) " : ""}${acting ? `${attackOffset} ` : ""}scale(${scale})`;

  return (
    <div className="relative h-full w-full">
      <div className={`${shadowPosition} z-0 h-5 rounded-full bg-black/35 blur-md`} />

      <div className={spritePosition}>
        <img
          src={`/sprites/${fileName}`}
          alt={name}
          className={`relative z-10 h-28 w-auto object-contain md:h-44 ${mirrored ? "scale-x-[-1]" : ""}`}
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
  const panelPosition = side === "enemy" ? "absolute right-2 top-2 md:right-4 md:top-4" : "absolute left-2 bottom-2 md:right-4 md:bottom-4";

  let hpColor = "bg-green-500";
  if (hpPct <= 50) hpColor = "bg-yellow-500";
  if (hpPct <= 20) hpColor = "bg-red-500";

  return (
    <div className={`${panelPosition} z-30 w-40 rounded-[18px] border border-slate-900/15 bg-white/88 px-2 py-2 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm md:w-56 md:px-3`}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-xs font-black tracking-[-0.02em] md:text-sm">{name}</div>
        <div className="text-[10px] font-semibold text-slate-500 md:text-xs">{hp}/{maxHp} HP</div>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 md:h-3">
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
  const [selectedMoveId, setSelectedMoveId] = useState(null);
  const [mobileLogOpen, setMobileLogOpen] = useState(false);
  const [previewMoveId, setPreviewMoveId] = useState(null);
  const queuedMoveTimeoutRef = useRef(null);
  const touchPreviewTimeoutRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const selectedCharacter = CHARACTERS[selectedId];
  const enemyBase = useMemo(
    () => CHARACTERS[selectedId === "alan_soma" ? "ramon" : "alan_soma"],
    [selectedId]
  );
  const difficulty = DIFFICULTIES[difficultyId];
  const selectedMove = player?.ataques.find((move) => move.id === selectedMoveId) ?? null;

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
    clearQueuedMove();
    setPlayer(cloneCharacter(selectedCharacter));
    setEnemy(cloneCharacter(enemyBase));
    setTurn(1);
    setBusy(false);
    setBattleOver(false);
    setSelectedMoveId(null);
    setMobileLogOpen(false);
    setPreviewMoveId(null);
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

  function clearTouchPreview() {
    if (touchPreviewTimeoutRef.current) {
      clearTimeout(touchPreviewTimeoutRef.current);
      touchPreviewTimeoutRef.current = null;
    }
  }

  function clearQueuedMove() {
    if (queuedMoveTimeoutRef.current) {
      clearTimeout(queuedMoveTimeoutRef.current);
      queuedMoveTimeoutRef.current = null;
    }
  }

  function handleMoveTouchStart(moveId) {
    clearTouchPreview();
    longPressTriggeredRef.current = false;
    touchPreviewTimeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setPreviewMoveId(moveId);
    }, 350);
  }

  function handleMoveTouchEnd() {
    clearTouchPreview();
    if (longPressTriggeredRef.current) {
      setPreviewMoveId(null);
    }
  }

  function handleMoveClick(move) {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    clearQueuedMove();
    setSelectedMoveId(move.id);
    queuedMoveTimeoutRef.current = setTimeout(() => {
      queuedMoveTimeoutRef.current = null;
      setSelectedMoveId(null);
      runTurn(move);
    }, 900);
  }

  function handleCancelMove() {
    clearQueuedMove();
    setSelectedMoveId(null);
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
    clearQueuedMove();
    setSelectedMoveId(null);
    setPreviewMoveId(null);
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
    <div className="showdown-dark min-h-screen bg-[linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col p-3 md:p-6">
        {screen !== "battle" && (
        <header className="mb-4 rounded-[28px] border border-slate-900/15 bg-[linear-gradient(180deg,#f6f8fb_0%,#dce6f0_100%)] px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:mb-6 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-500">Battle Client</div>
              <h1 className="showdown-title text-3xl text-slate-100 md:text-4xl">Showdown34</h1>
            </div>
            <div className="flex items-center gap-2 self-start rounded-2xl border border-slate-900/10 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Local Battle
            </div>
          </div>
        </header>
        )}

        {screen === "auth" && (
          <div className="flex min-h-[62vh] items-center justify-center px-2">
            <div className="w-full max-w-sm rounded-[32px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(239,245,250,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">Login</div>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">Entrar al lobby</h2>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                  Online
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Usuario</label>
                <input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Ej: Sonta"
                  className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-sky-50/40"
                />
                <button
                  onClick={handleEnterLobby}
                  className="w-full rounded-[20px] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:brightness-110"
                >
                  Entrar
                </button>
              </div>

              {challengeMessage && (
                <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {challengeMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "lobby" && (
          <section className="rounded-[32px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(235,242,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="mb-5 flex flex-col gap-4 border-b border-slate-900/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Lobby</div>
                <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-900">Sala activa</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
                  Usuario activo: <span className="font-black text-slate-900">{username}</span>
                </div>
                <button
                  onClick={() => setScreen("auth")}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cambiar usuario
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Jugadores conectados</div>
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    {activeUsers.length} online
                  </div>
                </div>

                <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/75">
                  {activeUsers.map((user, index) => (
                    <div
                      key={user.username}
                      className={`flex items-center justify-between gap-3 px-4 py-4 ${index !== activeUsers.length - 1 ? "border-b border-slate-200/80" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-base font-black tracking-[-0.02em] text-slate-900">{user.username}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {user.username === username ? "Vos" : user.status === "online" ? "Disponible para retar" : "En batalla"}
                        </div>
                      </div>
                      {user.username === username ? (
                        <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-700">
                          Vos
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendChallenge(user.username)}
                          disabled={user.status !== "online"}
                          className={`rounded-2xl px-4 py-2 text-sm font-black transition ${user.status === "online" ? "bg-slate-900 text-white hover:bg-slate-800" : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"}`}
                        >
                          Retar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-slate-200 bg-white/78 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Reto directo</div>
                  <div className="mt-3 space-y-3">
                    <input
                      value={challengeTarget}
                      onChange={(e) => setChallengeTarget(e.target.value)}
                      placeholder="Escribí un username activo"
                      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-sky-50/40"
                    />
                    <button
                      onClick={() => handleSendChallenge(challengeTarget.trim())}
                      className="w-full rounded-[18px] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-110"
                    >
                      Enviar reto
                    </button>
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white/78 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Estado</div>
                  <div className="mt-3 text-sm font-medium text-slate-300">
                    {challengeMessage || "Conectado al lobby."}
                  </div>
                </div>

                {incomingChallenge && (
                  <div className="rounded-[26px] border border-amber-200 bg-[linear-gradient(180deg,#fff7db_0%,#ffefbf_100%)] p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Desafío entrante</div>
                    <div className="mt-2 text-base font-black text-slate-900">{incomingChallenge.from} te desafió</div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={handleAcceptChallenge}
                        className="flex-1 rounded-[18px] bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={handleRejectChallenge}
                        className="flex-1 rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePrepareLocalBattle}
                  className="w-full rounded-[22px] border border-slate-300 bg-white/85 px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-700 transition hover:bg-white"
                >
                  Probar sala local
                </button>
              </div>
            </div>
          </section>
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(234,242,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Team Builder</div>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-900">Elegí tu personaje</h2>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-500">
                  Usuario: {username || "Invitado"}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.values(CHARACTERS).map((char) => {
                  const selected = char.id === selectedId;
                  return (
                    <button
                      key={char.id}
                      onClick={() => setSelectedId(char.id)}
                      className={`overflow-hidden rounded-[26px] border text-left transition ${selected ? "border-sky-500 bg-[linear-gradient(180deg,#f2faff_0%,#dbefff_100%)] shadow-[0_18px_40px_rgba(14,165,233,0.22)]" : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)] hover:border-slate-300 hover:bg-white"}`}
                    >
                      <div className="border-b border-slate-900/6 px-4 py-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-lg font-black tracking-[-0.03em] text-slate-900">{char.nombre}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${selected ? "bg-sky-600 text-white" : "border border-slate-300 bg-white text-slate-500"}`}>
                            {selected ? "Pick" : "Disponible"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-4 text-sm text-slate-700">
                        <div className="rounded-2xl bg-white/70 px-3 py-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">HP</div>
                          <div className="mt-1 font-black">{char.hp}</div>
                        </div>
                        <div className="rounded-2xl bg-white/70 px-3 py-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ataque</div>
                          <div className="mt-1 font-black">{char.ataque}</div>
                        </div>
                        <div className="rounded-2xl bg-white/70 px-3 py-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Defensa</div>
                          <div className="mt-1 font-black">{char.defensa}</div>
                        </div>
                        <div className="rounded-2xl bg-white/70 px-3 py-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Velocidad</div>
                          <div className="mt-1 font-black">{char.velocidad}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(237,243,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
              <div className="mb-5">
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Battle Setup</div>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">{selectedCharacter.nombre}</h2>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Dificultad</div>
                <div className="mt-3 space-y-3">
                  {Object.values(DIFFICULTIES).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficultyId(d.id)}
                      className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${difficultyId === d.id ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)]" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}
                    >
                      <div className="font-black">{d.nombre}</div>
                      <div className={`text-sm ${difficultyId === d.id ? "text-slate-300" : "text-slate-500"}`}>{d.aiDelayLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Resumen</div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Personaje</span>
                    <span className="font-black text-slate-900">{selectedCharacter.nombre}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Usuario</span>
                    <span className="font-black text-slate-900">{username || "Invitado"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sala</span>
                    <span className="font-black text-slate-900">{currentRoomId || "Local"}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedId(roomSelectedCharacter || selectedId);
                  startBattle();
                }}
                className="mt-5 w-full rounded-[22px] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:brightness-110"
              >
                Iniciar Showdown34
              </button>
            </section>
          </div>
        )}

        {screen === "battle" && player && enemy && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_320px] xl:grid-cols-[minmax(0,1.55fr)_360px]">
            <section className="overflow-hidden rounded-[30px] border border-slate-900/15 bg-[linear-gradient(180deg,#f7f9fc_0%,#e2e9f1_100%)] p-2 shadow-[0_22px_60px_rgba(15,23,42,0.18)] md:p-5">
              <div className="mb-2 flex flex-row items-center justify-between gap-2 rounded-[24px] border border-slate-900/10 bg-white/80 px-3 py-2 shadow-sm md:mb-4 md:flex-row md:items-center md:justify-between md:px-5 md:py-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Showdown34 Battle</div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-slate-900 md:text-2xl">Turno {turn}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScreen("menu")}
                    className="rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-white md:px-4 md:text-sm md:normal-case md:tracking-normal"
                  >
                    Volver
                  </button>
                  <button
                    onClick={() => setMobileLogOpen(true)}
                    className="lg:hidden rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-white"
                  >
                    Log
                  </button>
                </div>
              </div>

              <div className="mb-3 overflow-hidden rounded-[28px] border border-slate-700/40 bg-[linear-gradient(180deg,#dfe7ef_0%,#bfd2e0_18%,#a8c1d4_48%,#8facbf_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] md:mb-5 md:p-4">
                <div
                  className="relative h-[290px] w-full overflow-hidden rounded-[22px] border border-slate-800/30 bg-slate-900 bg-cover bg-center bg-no-repeat md:h-[430px]"
                  style={{ backgroundImage: "url('/backgrounds/battle_bg.webp')" }}
                >
                  <img
                    src="/backgrounds/battle_bg.png"
                    alt="battle background"
                    className="absolute inset-0 h-full w-full object-cover opacity-100"
                  />
                  <div className="battle-stage-overlay absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(15,23,42,0.06)_28%,rgba(15,23,42,0.18)_100%)]" />
                  <div className="battle-stage-floor absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.22)_100%)]" />
                  <div className="absolute left-1/2 top-[32%] h-8 w-28 -translate-x-1/2 rounded-full bg-slate-950/15 blur-md md:top-[28%] md:h-10 md:w-52" />
                  <div className="absolute bottom-5 left-1/2 h-8 w-40 -translate-x-1/2 rounded-full bg-slate-950/20 blur-md md:bottom-10 md:h-14 md:w-72" />

                  <HpPanel name={enemy.nombre} hp={enemy.hpActual} maxHp={enemy.hp} side="enemy" />
                  <div className="absolute bottom-4 left-[40%] z-20 h-32 w-40 -translate-x-1/2 md:bottom-6 md:left-[35%] md:z-10 md:h-56 md:w-72">
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
                  <div className="absolute bottom-14 left-[68%] z-10 h-32 w-40 -translate-x-1/2 md:top-8 md:bottom-auto md:left-[65%] md:z-20 md:h-48 md:w-64">
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

              <div className="rounded-[28px] border border-slate-900/10 bg-white/80 p-3 shadow-sm md:p-4">
                <div className="mb-2 flex items-center justify-between gap-3 md:mb-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Moves</div>
                    <div className="text-base font-black text-slate-900 md:text-lg">Tus ataques</div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {player.ataques.map((move) => {
                    const disabled = battleOver || busy || player.usos[move.id] <= 0;
                    const usage = player.usos[move.id];
                    const moveDetails = getMoveDetails(move);
                    const isPreviewOpen = previewMoveId === move.id;
                    const isSelected = selectedMoveId === move.id;

                    return (
                      <div
                        key={move.id}
                        className="group relative"
                        onMouseEnter={() => setPreviewMoveId(move.id)}
                        onMouseLeave={() => setPreviewMoveId((current) => (current === move.id ? null : current))}
                      >
                        <button
                          disabled={disabled}
                          onClick={() => handleMoveClick(move)}
                          onFocus={() => setPreviewMoveId(move.id)}
                          onBlur={() => setPreviewMoveId((current) => (current === move.id ? null : current))}
                          onTouchStart={() => handleMoveTouchStart(move.id)}
                          onTouchEnd={handleMoveTouchEnd}
                          onTouchCancel={handleMoveTouchEnd}
                          className={`min-h-[72px] w-full rounded-[22px] border px-3 py-2.5 text-left transition md:min-h-24 md:px-4 md:py-3 ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : isSelected ? "border-sky-500 bg-[linear-gradient(180deg,#1e293b_0%,#0f172a_100%)] text-slate-100 shadow-[0_12px_24px_rgba(14,165,233,0.18)]" : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)] text-slate-800 hover:border-sky-400 hover:bg-white hover:shadow-[0_12px_24px_rgba(56,189,248,0.14)]"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-black tracking-[-0.02em] md:text-base">{move.nombre}</div>
                              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:text-xs md:tracking-[0.24em]">{move.tipo}</div>
                            </div>
                            <div className="rounded-full border border-slate-300 bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-500 md:text-xs">
                              {usage}
                            </div>
                          </div>
                        </button>

                        <div
                          className={`pointer-events-none absolute inset-x-0 bottom-[calc(100%+0.55rem)] z-40 rounded-[20px] border border-slate-700/15 bg-slate-900/96 p-3 text-sm text-slate-100 shadow-2xl transition ${isPreviewOpen ? "visible opacity-100" : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"}`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div className="font-semibold">{move.nombre}</div>
                            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{move.tipo}</div>
                          </div>
                          <div className="text-slate-300">{move.descripcion}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                            {moveDetails.map((detail) => (
                              <span key={detail} className="rounded-full border border-slate-700 px-2 py-1">
                                {detail}
                              </span>
                            ))}
                            <span className="rounded-full border border-slate-700 px-2 py-1">
                              Usos {usage}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden">
                  {player.ataques.map((move) => {
                    const disabled = battleOver || busy || player.usos[move.id] <= 0;
                    const usage = player.usos[move.id];
                    const powerLabel = move.id === "tragar"
                      ? "10% 1000 · 40% 200 · 10% 250 · 40% falla"
                      : move.poder
                        ? `Poder ${move.poder}`
                        : "Sin daño base";

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
                          {powerLabel}
                          {move.efectividad ? ` · ${move.efectividad}%` : ""}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">Usos restantes: {usage}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#e8f1f8_100%)] p-3 md:mt-4 md:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Confirmación</div>
                      <div className="text-sm font-black text-slate-900 md:text-lg">
                        {selectedMove ? `Movimiento elegido: ${selectedMove.nombre}` : "Todavía no elegiste un movimiento"}
                      </div>
                      {selectedMove && (
                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:text-xs md:tracking-[0.2em]">
                          Se ejecuta automáticamente
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelMove}
                        disabled={!selectedMove || busy}
                        className={`rounded-2xl px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition md:px-4 md:py-3 md:text-sm md:normal-case md:tracking-normal ${!selectedMove || busy ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {battleOver && (
                <div className="mt-3 rounded-[26px] border border-slate-900/10 bg-[linear-gradient(180deg,#fff7db_0%,#ffe4a3_100%)] p-3 text-center text-slate-900 shadow-sm md:mt-4 md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-700">Resultado</div>
                  <div className="mt-1 text-xl font-black md:text-2xl">
                    {player.hpActual > 0 && enemy.hpActual <= 0 ? "Victoria" : player.hpActual <= 0 && enemy.hpActual > 0 ? "Derrota" : "Empate"}
                  </div>
                  <button
                    onClick={startBattle}
                    className="mt-3 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 md:px-5 md:py-3 md:text-sm md:tracking-[0.18em]"
                  >
                    Jugar otra vez
                  </button>
                </div>
              )}
            </section>

            <aside className="hidden lg:block rounded-[30px] border border-slate-900/15 bg-[linear-gradient(180deg,#f7f9fc_0%,#e6edf4_100%)] p-4 shadow-[0_22px_60px_rgba(15,23,42,0.16)] md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Battle Feed</div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-slate-900">Log de batalla</h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold text-slate-500">
                  {logs.length} eventos
                </div>
              </div>
              <div className="space-y-2">
                {logs.map((line, i) => (
                  <div
                    key={`${line}-${i}`}
                    className={`rounded-[20px] border px-4 py-3 text-sm shadow-sm ${i === 0 ? "border-sky-200 bg-sky-50 text-slate-800" : "border-slate-200 bg-white/80 text-slate-700"}`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {screen === "battle" && player && enemy && mobileLogOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 lg:hidden" onClick={() => setMobileLogOpen(false)}>
            <div
              className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-hidden border border-slate-700 bg-slate-950"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Battle Feed</div>
                  <h2 className="text-lg font-black text-slate-100">Log de batalla</h2>
                </div>
                <button
                  onClick={() => setMobileLogOpen(false)}
                  className="border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
                >
                  Cerrar
                </button>
              </div>
              <div className="max-h-[calc(70vh-74px)] space-y-2 overflow-y-auto p-4">
                {logs.map((line, i) => (
                  <div
                    key={`mobile-${line}-${i}`}
                    className={`border px-4 py-3 text-sm ${i === 0 ? "border-sky-700 bg-sky-950/40 text-slate-100" : "border-slate-800 bg-slate-900 text-slate-300"}`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
