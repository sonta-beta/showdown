import React, { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./lib/socket";
import {
  buildDefaultFfaSlots as buildDefaultFfaSlotsShared,
  CHARACTERS as CHARACTERS_SHARED,
  DIFFICULTIES as DIFFICULTIES_SHARED,
  GAME_MODES as GAME_MODES_SHARED,
  getMoveDetails as getMoveDetailsShared,
  getSpriteFileName as getSpriteFileNameShared
} from "./lib/gameData";
import {
  chooseFirstAttacker as chooseFirstAttackerShared,
  cloneCharacter as cloneCharacterShared,
  cloneFfaFighter as cloneFfaFighterShared,
  getAliveFfaIndexes as getAliveFfaIndexesShared,
  getNextPendingFfaPlayerIndex as getNextPendingFfaPlayerIndexShared,
  resetFfaRoundState as resetFfaRoundStateShared,
  resetTurnFlags as resetTurnFlagsShared,
  resolveMove as resolveMoveShared
} from "./lib/gameEngine";
import { pickAiMove as pickAiMoveShared } from "./lib/ai";
import {
  ADVENTURE_ACHIEVEMENT,
  DEFAULT_BATTLE_BACKGROUND,
  ADVENTURE_DIFFICULTY_MODIFIERS,
  ADVENTURE_LEVELS,
  getAdventureLevel
} from "./lib/adventureData";

const BROWSER_CACHE_KEY = "showdown34.browser-cache.v1";

const CHARACTERS = {
  alan_soma: {
    id: "alan_soma",
    nombre: "Alan Soma",
    hp: 600,
    ataque: 9,
    defensa: 20,
    velocidad: 6,
    descripcion: "Tanque resistente que usa Rebote y busca rematar con Tragar.",
    spriteScale: 1,
    ataques: [
      {
        id: "rebote",
        nombre: "Rebote",
        tipo: "defensivo",
        efectividad: 80,
        prioridad: 1,
        limiteUso: 15,
        descripcion: "Recibe solo el 50% del dano rival y devuelve ese 50% al atacante ese turno."
      },
      {
        id: "tragar",
        nombre: "Tragar",
        tipo: "ataque",
        poder: 1000,
        limiteUso: 3,
        descripcion: "Tiene 5% de hacer un golpe de poder 1000, 55% de hacer un golpe de poder 200 y 40% de probabilidad de fallar."
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
        poder: 20,
        efectividad: 100,
        limiteUso: 25,
        descripcion: "Golpe basico flojo, pero tiene 20% de salir con poder 150."
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

const GAME_MODES = {
  duel: {
    id: "duel",
    nombre: "Duelo",
    descripcion: "El modo actual 1 contra 1."
  },
  free_for_all: {
    id: "free_for_all",
    nombre: "Free For All",
    descripcion: "Cuatro jugadores en una sola batalla hasta que quede uno."
  }
};

function buildDefaultFfaSlots() {
  return buildDefaultFfaSlotsShared();
}

function cloneFfaFighter(slot) {
  return cloneFfaFighterShared(slot, CHARACTERS_SHARED);
}

function getAliveFfaIndexes(fighters) {
  return getAliveFfaIndexesShared(fighters);
}

function getNextPendingFfaPlayerIndex(fighters, selections, startIndex = -1) {
  return getNextPendingFfaPlayerIndexShared(fighters, selections, startIndex);
}

function resetFfaRoundState(fighters) {
  return resetFfaRoundStateShared(fighters);
}

function cloneCharacter(base) {
  return cloneCharacterShared(base);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMoveDetails(move) {
  return getMoveDetailsShared(move);
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
  return getSpriteFileNameShared(spriteKey, variant, pose);
}

function buildDefaultBrowserCache() {
  return {
    lastUsername: "",
    lastHomeTab: "jugar_local",
    selectedCharacterId: "alan_soma",
    adventureProfiles: {}
  };
}

function buildAdventureProfile(username = "") {
  return {
    username,
    completedLevelIds: [],
    achievementUnlocked: false
  };
}

function normalizeAdventureProfiles(rawProfiles) {
  if (!rawProfiles || typeof rawProfiles !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawProfiles).map(([username, value]) => {
      const completedLevelIds = Array.isArray(value?.completedLevelIds)
        ? ADVENTURE_LEVELS
          .filter((level) => value.completedLevelIds.includes(level.id))
          .map((level) => level.id)
        : [];

      return [
        username,
        {
          username: value?.username || username,
          completedLevelIds,
          achievementUnlocked: Boolean(value?.achievementUnlocked)
        }
      ];
    })
  );
}

function readBrowserCache() {
  const fallback = buildDefaultBrowserCache();

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(BROWSER_CACHE_KEY);
    if (!rawValue) {
      return fallback;
    }

    const parsed = JSON.parse(rawValue);
    return {
      lastUsername: typeof parsed?.lastUsername === "string" ? parsed.lastUsername : fallback.lastUsername,
      lastHomeTab: typeof parsed?.lastHomeTab === "string" ? parsed.lastHomeTab : fallback.lastHomeTab,
      selectedCharacterId: typeof parsed?.selectedCharacterId === "string" ? parsed.selectedCharacterId : fallback.selectedCharacterId,
      adventureProfiles: normalizeAdventureProfiles(parsed?.adventureProfiles)
    };
  } catch (error) {
    return fallback;
  }
}

function writeBrowserCache(nextCache) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BROWSER_CACHE_KEY, JSON.stringify(nextCache));
}

function getAdventureProfileState(profiles, username) {
  if (!username) {
    return buildAdventureProfile(username);
  }

  return profiles[username] || buildAdventureProfile(username);
}

function isAdventureLevelUnlocked(level, completedLevelIds) {
  const completedSet = completedLevelIds instanceof Set
    ? completedLevelIds
    : new Set(completedLevelIds);

  if (level.orden <= 1) {
    return true;
  }

  const previousLevel = ADVENTURE_LEVELS.find((candidate) => candidate.orden === level.orden - 1);
  return previousLevel ? completedSet.has(previousLevel.id) : false;
}

function completeAdventureProgress(profiles, username, levelId) {
  const currentProfile = getAdventureProfileState(profiles, username);
  const completedSet = new Set(currentProfile.completedLevelIds);
  completedSet.add(levelId);

  const completedLevelIds = ADVENTURE_LEVELS
    .filter((level) => completedSet.has(level.id))
    .map((level) => level.id);
  const completedAll = completedLevelIds.length === ADVENTURE_LEVELS.length;
  const updatedProfile = {
    ...currentProfile,
    username,
    completedLevelIds,
    achievementUnlocked: currentProfile.achievementUnlocked || completedAll
  };

  return {
    nextProfiles: {
      ...profiles,
      [username]: updatedProfile
    },
    updatedProfile,
    unlockedAchievement: !currentProfile.achievementUnlocked && updatedProfile.achievementUnlocked,
    nextLevel: ADVENTURE_LEVELS.find((level) => !completedLevelIds.includes(level.id)) || null
  };
}

function scaleAdventureStat(value, factor) {
  return Math.max(1, Math.round(value * factor));
}

function buildAdventureCharacter(baseCharacter, difficultyId) {
  const modifier = ADVENTURE_DIFFICULTY_MODIFIERS[difficultyId] || ADVENTURE_DIFFICULTY_MODIFIERS.dificil;

  return {
    ...baseCharacter,
    hp: scaleAdventureStat(baseCharacter.hp, modifier.hp),
    ataque: scaleAdventureStat(baseCharacter.ataque, modifier.ataque),
    defensa: scaleAdventureStat(baseCharacter.defensa, modifier.defensa),
    velocidad: scaleAdventureStat(baseCharacter.velocidad, modifier.velocidad)
  };
}

function getAdventureDifficultyConfig(level) {
  if (!level) {
    return DIFFICULTIES.normal;
  }

  return {
    id: level.dificultadId,
    nombre: level.dificultadId,
    aiBiasStrong:
      level.dificultadId === "facil"
        ? 0.2
        : level.dificultadId === "normal"
          ? 0.45
          : 0.78,
    aiDelayLabel: "Aventura"
  };
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
  if (!tragar || !tragar.descripcion.includes("55% de hacer un golpe de poder 200")) {
    throw new Error("Test failed: Tragar debería indicar sus nuevos valores de poder.");
  }

  const rebote = CHARACTERS.alan_soma.ataques.find((a) => a.id === "rebote");
  if (!rebote || !rebote.descripcion.includes("50%")) {
    throw new Error("Test failed: Rebote debería estar configurado con mitigacion y reflejo.");
  }

  const golpeInutil = CHARACTERS.ramon.ataques.find((a) => a.id === "golpe_inutil");
  if (!golpeInutil || golpeInutil.poder !== 20) {
    throw new Error("Test failed: Golpe inutil debería tener poder base 20.");
  }

  if (getSpriteFileName("ramon", "front", "hit") !== "ramon_front_hit.png") {
    throw new Error("Test failed: el nombre del sprite hit no coincide.");
  }

  const golpe = CHARACTERS.alan_soma.ataques.find((a) => a.id === "golpe_de_gordo");
  if (!golpe || getDamage(alan, ramon, golpe) < 1) {
    throw new Error("Test failed: el daño mínimo debería ser 1.");
  }
}

/*
  if (ADVENTURE_LEVELS.length !== 10) {
    throw new Error("Test failed: la aventura deberÃ­a tener 10 niveles.");
  }

  if (ADVENTURE_ACHIEVEMENT.id !== "orgullo_epet_34") {
    throw new Error("Test failed: el logro final de aventura no coincide.");
  }
}
*/

runSelfTests();

function runAdventureSelfTests() {
  if (ADVENTURE_LEVELS.length !== 10) {
    throw new Error("Test failed: la aventura deberia tener 10 niveles.");
  }

  if (ADVENTURE_ACHIEVEMENT.id !== "orgullo_epet_34") {
    throw new Error("Test failed: el logro final de aventura no coincide.");
  }
}

function getStageBackgroundStyle(background) {
  const resolvedBackground = background?.imagen ? background : DEFAULT_BATTLE_BACKGROUND;

  return {
    backgroundImage: `url(${resolvedBackground.imagen})`,
    backgroundPosition: resolvedBackground.posicion || "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#101418"
  };
}

runAdventureSelfTests();

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

const FFA_STAGE_LAYOUT = [
  {
    side: "left",
    hudClassName: "ffa-stage-hud-slot-0",
    spriteClassName: "ffa-stage-sprite-slot-0",
    variant: "front",
    mirrored: false,
    scale: 1
  },
  {
    side: "right",
    hudClassName: "ffa-stage-hud-slot-1",
    spriteClassName: "ffa-stage-sprite-slot-1",
    variant: "front",
    mirrored: true,
    scale: 1
  },
  {
    side: "left",
    hudClassName: "ffa-stage-hud-slot-2",
    spriteClassName: "ffa-stage-sprite-slot-2",
    variant: "back",
    mirrored: false,
    scale: 1
  },
  {
    side: "right",
    hudClassName: "ffa-stage-hud-slot-3",
    spriteClassName: "ffa-stage-sprite-slot-3",
    variant: "back",
    mirrored: true,
    scale: 1
  }
];

const FFA_STAGE_ANCHORS = [
  { x: 0.2, y: 0.37 },
  { x: 0.79, y: 0.36 },
  { x: 0.32, y: 0.83 },
  { x: 0.71, y: 0.84 }
];

const FFA_STAGE_SCALE_BY_CHARACTER = {
  alan_soma: 1.12,
  ramon: 1,
  sonoda: 0.98
};

const FFA_SIDEBAR_SCALE_BY_CHARACTER = {
  alan_soma: 1.02,
  ramon: 0.96,
  sonoda: 0.95
};

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getFfaHpTone(hp, maxHp) {
  const hpPct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0;
  const toneClassName = hpPct <= 20 ? "is-danger" : hpPct <= 50 ? "is-caution" : "is-healthy";

  return {
    hpPct,
    toneClassName
  };
}

function getFfaSpriteScale(spriteKey, surface = "stage") {
  const scaleMap = surface === "sidebar"
    ? FFA_SIDEBAR_SCALE_BY_CHARACTER
    : FFA_STAGE_SCALE_BY_CHARACTER;

  return scaleMap[spriteKey] ?? 1;
}

function buildLocalFfaArenaCombatants(fighters, currentIndex, selections, battleOver) {
  return fighters.map((fighter, index) => {
    const isAlive = fighter.character.hpActual > 0;
    const isCurrent = !battleOver && index === currentIndex;
    const alreadyPicked = Boolean(selections[index]);

    let statusLabel = "Espera";
    if (!isAlive) statusLabel = "KO";
    else if (battleOver) statusLabel = "Vivo";
    else if (isCurrent) statusLabel = "Activa";
    else if (alreadyPicked) statusLabel = "Listo";

    return {
      key: fighter.slotId,
      ownerLabel: `J${index + 1}`,
      name: fighter.character.nombre,
      spriteKey: fighter.character.id,
      hp: fighter.character.hp,
      hpActual: fighter.character.hpActual,
      statusLabel,
      highlight: isCurrent
    };
  });
}

function buildOnlineFfaArenaCombatants(combatants, battleOver) {
  return combatants.map((combatant) => {
    const isAlive = combatant.hpActual > 0;

    let statusLabel = "Activo";
    if (!isAlive) statusLabel = "KO";
    else if (battleOver) statusLabel = "Vivo";
    else if (combatant.isMe) statusLabel = combatant.pending ? "Listo" : "Mover";
    else if (combatant.pending) statusLabel = "Listo";

    return {
      key: combatant.username,
      ownerLabel: combatant.nombre,
      name: combatant.username,
      spriteKey: combatant.characterId,
      hp: combatant.hp,
      hpActual: combatant.hpActual,
      statusLabel,
      highlight: combatant.isMe
    };
  });
}

function buildLocalFfaSpriteStates(fighters) {
  return Object.fromEntries(
    fighters.map((fighter) => [
      String(fighter.slotId),
      {
        pose: fighter.character.hpActual > 0 ? "normal" : "ko",
        acting: false,
        flashing: false
      }
    ])
  );
}

function buildOnlineFfaSpriteStates(combatants) {
  return Object.fromEntries(
    combatants.map((combatant) => [
      String(combatant.username),
      {
        pose: combatant.hpActual > 0 ? "normal" : "ko",
        acting: false,
        flashing: false
      }
    ])
  );
}

function patchFfaSpriteState(currentState, key, patch) {
  if (key === null || key === undefined) {
    return currentState;
  }

  const normalizedKey = String(key);
  const previous = currentState[normalizedKey] || {
    pose: "normal",
    acting: false,
    flashing: false
  };

  return {
    ...currentState,
    [normalizedKey]: {
      ...previous,
      ...patch
    }
  };
}

function getFfaAttackTranslate(actorIndex, targetIndex, stageSize) {
  if (
    actorIndex === undefined
    || targetIndex === undefined
    || actorIndex === targetIndex
    || !stageSize.width
    || !stageSize.height
  ) {
    return null;
  }

  const actorAnchor = FFA_STAGE_ANCHORS[actorIndex];
  const targetAnchor = FFA_STAGE_ANCHORS[targetIndex];

  if (!actorAnchor || !targetAnchor) {
    return null;
  }

  const rawX = (targetAnchor.x - actorAnchor.x) * stageSize.width * 0.56;
  const rawY = (targetAnchor.y - actorAnchor.y) * stageSize.height * 0.56;

  return {
    x: Math.round(rawX),
    y: Math.round(rawY)
  };
}

function FfaStageSprite({
  spriteKey,
  name,
  mirrored = false,
  variant = "front",
  pose = "normal",
  scale = 1,
  acting = false,
  flashing = false,
  attackTranslate = null,
  className = ""
}) {
  const fileName = getSpriteFileName(spriteKey, variant, pose);
  const normalizedScale = scale * getFfaSpriteScale(spriteKey, "stage");
  const transform = `${mirrored ? "scaleX(-1) " : ""}scale(${normalizedScale})`;

  return (
    <div
      className={classNames("ffa-stage-sprite", className)}
      style={{
        transform: acting && attackTranslate
          ? `translate(${attackTranslate.x}px, ${attackTranslate.y}px)`
          : "translate(0px, 0px)",
        transition: "transform 180ms ease"
      }}
    >
      <div className="ffa-stage-sprite-shadow" />
      <img
        src={`/sprites/${fileName}`}
        alt={name}
        className="ffa-stage-sprite-image"
        style={{
          transform,
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
  );
}

function FfaSidebarSlot({ combatant, slotIndex }) {
  const layout = FFA_STAGE_LAYOUT[slotIndex];
  const sideClassName = layout.side === "left" ? "is-left" : "is-right";

  if (!combatant) {
    return (
      <div className={classNames("ffa-side-slot", sideClassName, "is-empty")}>
        <div className="ffa-side-slot-top">
          <div className="ffa-side-slot-owner">Esperando</div>
          <span className="ffa-side-slot-status">Libre</span>
        </div>
        <div className="ffa-side-slot-name">Sin rival</div>
      </div>
    );
  }

  const { hpPct, toneClassName } = getFfaHpTone(combatant.hpActual, combatant.hp);
  const fileName = getSpriteFileName(combatant.spriteKey, "front", combatant.hpActual > 0 ? "normal" : "ko");
  const avatarScale = getFfaSpriteScale(combatant.spriteKey, "sidebar");
  const avatarTransform = `${layout.side === "right" ? "scaleX(-1) " : ""}scale(${avatarScale})`;

  return (
    <div
      className={classNames(
        "ffa-side-slot",
        sideClassName,
        toneClassName,
        combatant.highlight && "is-active",
        combatant.hpActual <= 0 && "is-ko"
      )}
    >
      <div className="ffa-side-slot-top">
        <div className="ffa-side-slot-owner">{combatant.ownerLabel}</div>
        <span className="ffa-side-slot-status">{combatant.statusLabel}</span>
      </div>
      <div className="ffa-side-slot-name">{combatant.name}</div>

      <div className="ffa-side-slot-avatar">
        <img
          src={`/sprites/${fileName}`}
          alt={combatant.name}
          className="ffa-side-slot-avatar-image"
          style={{
            transform: avatarTransform,
            transformOrigin: "bottom center"
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      <div className="ffa-side-slot-bottom">
        <div className="ffa-side-slot-track">
          <div className="ffa-side-slot-fill" style={{ width: `${hpPct}%` }} />
        </div>
        <div className="ffa-side-slot-hp">{combatant.hpActual}/{combatant.hp}</div>
      </div>
    </div>
  );
}

function FfaBattleArena({
  combatants,
  spriteStates = {},
  turn,
  arenaLabel = "Free For All",
  turnNote = "",
  stageBackground = null
}) {
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const slots = Array.from({ length: 4 }, (_, index) => combatants[index] ?? null);
  const slotIndexByKey = Object.fromEntries(
    slots
      .filter(Boolean)
      .map((combatant, index) => [String(combatant.key), index])
  );

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;

    const updateStageSize = () => {
      const rect = node.getBoundingClientRect();
      setStageSize({
        width: rect.width,
        height: rect.height
      });
    };

    updateStageSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateStageSize());
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateStageSize);
    return () => window.removeEventListener("resize", updateStageSize);
  }, []);

  return (
    <div className="ffa-showdown-shell">
      <div className="ffa-showdown-board">
        <div className="ffa-side-column">
          {[0, 2].map((slotIndex) => (
            <FfaSidebarSlot
              key={`ffa-side-${slotIndex}-${slots[slotIndex]?.key ?? "empty"}`}
              combatant={slots[slotIndex]}
              slotIndex={slotIndex}
            />
          ))}
        </div>

        <div
          ref={stageRef}
          className="ffa-showdown-stage"
          style={getStageBackgroundStyle(stageBackground)}
        >
          <div className="ffa-showdown-stage-overlay" />
          <div className="ffa-showdown-stage-floor" />

          <div className="ffa-stage-turn-badge">
            <div className="ffa-stage-turn-kicker">{arenaLabel}</div>
            <div className="ffa-stage-turn-main">Turno {turn}</div>
            {turnNote ? <div className="ffa-stage-turn-note">{turnNote}</div> : null}
          </div>

          {slots.map((combatant, index) => {
            if (!combatant) return null;

            const layout = FFA_STAGE_LAYOUT[index];
            const spriteState = spriteStates[String(combatant.key)] || {
              pose: combatant.hpActual > 0 ? "normal" : "ko",
              acting: false,
              flashing: false
            };
            const targetIndex = spriteState.targetKey !== undefined && spriteState.targetKey !== null
              ? slotIndexByKey[String(spriteState.targetKey)]
              : undefined;
            const attackTranslate = getFfaAttackTranslate(index, targetIndex, stageSize);

            return (
              <React.Fragment key={`ffa-stage-${combatant.key}`}>
                <FfaStageSprite
                  spriteKey={combatant.spriteKey}
                  name={combatant.name}
                  mirrored={layout.mirrored}
                  variant={layout.variant}
                  pose={spriteState.pose}
                  scale={layout.scale}
                  acting={spriteState.acting}
                  flashing={spriteState.flashing}
                  attackTranslate={attackTranslate}
                  className={layout.spriteClassName}
                />
              </React.Fragment>
            );
          })}
        </div>

        <div className="ffa-side-column">
          {[1, 3].map((slotIndex) => (
            <FfaSidebarSlot
              key={`ffa-side-${slotIndex}-${slots[slotIndex]?.key ?? "empty"}`}
              combatant={slots[slotIndex]}
              slotIndex={slotIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(() => (readBrowserCache().lastHomeTab === "jugar_local" ? "menu" : "auth"));
  const [activeHomeTab, setActiveHomeTab] = useState(() => readBrowserCache().lastHomeTab || "jugar_local");
  const [gameModeId, setGameModeId] = useState("duel");
  const [selectedId, setSelectedId] = useState(() => readBrowserCache().selectedCharacterId || "alan_soma");
  const [difficultyId, setDifficultyId] = useState("normal");
  const [player, setPlayer] = useState(null);
  const [enemy, setEnemy] = useState(null);
  const [ffaSlots, setFfaSlots] = useState(() => buildDefaultFfaSlots());
  const [ffaPlayers, setFfaPlayers] = useState([]);
  const [ffaSelections, setFfaSelections] = useState({});
  const [ffaCurrentPlayerIndex, setFfaCurrentPlayerIndex] = useState(0);
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
  const [ffaSpriteStates, setFfaSpriteStates] = useState({});
  const [onlineFfaSpriteStates, setOnlineFfaSpriteStates] = useState({});
  const [usernameInput, setUsernameInput] = useState(() => readBrowserCache().lastUsername || "");
  const [username, setUsername] = useState("");
  const [adventureProfiles, setAdventureProfiles] = useState(() => readBrowserCache().adventureProfiles);
  const [battleContext, setBattleContext] = useState({ type: "local", levelId: "" });
  const [activeUsers, setActiveUsers] = useState([]);
  const [availableFfaRooms, setAvailableFfaRooms] = useState([]);
  const [challengeTarget, setChallengeTarget] = useState("");
  const [challengeMessage, setChallengeMessage] = useState("");
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [currentRoomMode, setCurrentRoomMode] = useState("duel");
  const [currentRoomMaxPlayers, setCurrentRoomMaxPlayers] = useState(2);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [roomReady, setRoomReady] = useState({});
  const [roomSelectedCharacters, setRoomSelectedCharacters] = useState({});
  const [roomSelectedCharacter, setRoomSelectedCharacter] = useState("alan_soma");
  const [onlineFfaCombatants, setOnlineFfaCombatants] = useState([]);
  const [onlineBattleMode, setOnlineBattleMode] = useState(false);
  const [selectedMoveId, setSelectedMoveId] = useState(null);
  const [mobileLogOpen, setMobileLogOpen] = useState(false);
  const [previewMoveId, setPreviewMoveId] = useState(null);
  const queuedMoveTimeoutRef = useRef(null);
  const touchPreviewTimeoutRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const onlineBattleFallbackRef = useRef(null);
  const onlineTurnAnimatingRef = useRef(false);
  const pendingOnlineBattleStateRef = useRef(null);
  const attemptedCacheLoginRef = useRef(false);

  const selectedCharacter = CHARACTERS[selectedId];
  const gameMode = GAME_MODES[gameModeId];
  const enemyBase = useMemo(
    () => CHARACTERS[selectedId === "alan_soma" ? "ramon" : "alan_soma"],
    [selectedId]
  );
  const adventureProfileKey = (username || usernameInput).trim();
  const adventureProfile = useMemo(
    () => getAdventureProfileState(adventureProfiles, adventureProfileKey),
    [adventureProfileKey, adventureProfiles]
  );
  const completedAdventureLevelIds = adventureProfile.completedLevelIds;
  const completedAdventureLevelSet = useMemo(
    () => new Set(completedAdventureLevelIds),
    [completedAdventureLevelIds]
  );
  const currentAdventureLevel = useMemo(
    () => (battleContext.type === "adventure" ? getAdventureLevel(battleContext.levelId) : null),
    [battleContext]
  );
  const currentAdventureStageStyle = useMemo(
    () => getStageBackgroundStyle(currentAdventureLevel?.fondo),
    [currentAdventureLevel]
  );
  const adventureDifficulty = currentAdventureLevel ? getAdventureDifficultyConfig(currentAdventureLevel) : null;
  const difficulty = adventureDifficulty || DIFFICULTIES[difficultyId];
  const selectedMove = player?.ataques.find((move) => move.id === selectedMoveId) ?? null;
  const ffaCurrentPlayer = ffaPlayers[ffaCurrentPlayerIndex] ?? null;
  const ffaSelectedMove = ffaCurrentPlayer?.character.ataques.find((move) => move.id === selectedMoveId) ?? null;
  const onlineFfaPlayer = onlineFfaCombatants.find((combatant) => combatant.isMe) ?? null;
  const onlineFfaSelectedMove = onlineFfaPlayer?.ataques.find((move) => move.id === selectedMoveId) ?? null;
  const isFfaBattle = screen === "battle" && gameModeId === "free_for_all" && ffaPlayers.length > 0;
  const isOnlineFfaBattle = screen === "battle" && onlineBattleMode && currentRoomMode === "free_for_all" && onlineFfaCombatants.length > 0;
  const isAdventureBattle = battleContext.type === "adventure" && Boolean(currentAdventureLevel);
  const isAdventureBossBattle = isAdventureBattle && currentAdventureLevel?.modo === "boss";
  const nextAdventureLevel = ADVENTURE_LEVELS.find((level) => !completedAdventureLevelSet.has(level.id)) || null;
  const adventureCompletionCount = completedAdventureLevelIds.length;
  const adventureAchievementUnlocked = adventureProfile.achievementUnlocked;
  const battleInputLocked = busy;
  const localFfaArenaCombatants = isFfaBattle
    ? buildLocalFfaArenaCombatants(ffaPlayers, ffaCurrentPlayerIndex, ffaSelections, battleOver)
    : [];
  const onlineFfaArenaCombatants = isOnlineFfaBattle
    ? buildOnlineFfaArenaCombatants(onlineFfaCombatants, battleOver)
    : [];

  useEffect(() => {
    writeBrowserCache({
      lastUsername: (username || usernameInput).trim(),
      lastHomeTab: activeHomeTab,
      selectedCharacterId: selectedId,
      adventureProfiles
    });
  }, [activeHomeTab, adventureProfiles, selectedId, username, usernameInput]);

  function navigateToHomeTab(tabId) {
    if (tabId === "jugar_local") {
      setBattleContext({ type: "local", levelId: "" });
      setScreen("menu");
      return;
    }

    if (tabId === "aventura") {
      setScreen("adventure");
      return;
    }

    setScreen("lobby");
  }

  function registerUser(rawUsername, options = {}) {
    const clean = rawUsername.trim();

    if (!clean) {
      if (!options.silent) {
        setChallengeMessage("Escribi un nombre de usuario para entrar.");
      }
      return;
    }

    const requestedTab = options.targetTab || (activeHomeTab === "jugar_local" ? "salas" : activeHomeTab);

    socket.emit("register_user", clean, (response) => {
      if (!response?.ok) {
        if (options.isRestoreAttempt) {
          setUsername("");
          setScreen("auth");
          setChallengeMessage("No pudimos restaurar tu sesion. Reingresa con tu usuario.");
          return;
        }

        setChallengeMessage(response?.message || "No se pudo entrar al lobby.");
        return;
      }

      setUsernameInput(response.username);
      setUsername(response.username);
      setActiveHomeTab(requestedTab);
      navigateToHomeTab(requestedTab);
      setChallengeMessage(
        requestedTab === "aventura"
          ? `Sesion restaurada para la aventura como ${response.username}.`
          : `Conectado como ${response.username}.`
      );
    });
  }

  useEffect(() => {
    const cachedUsername = usernameInput.trim();

    if (!cachedUsername || username || attemptedCacheLoginRef.current || activeHomeTab === "jugar_local") {
      return;
    }

    attemptedCacheLoginRef.current = true;
    registerUser(cachedUsername, {
      targetTab: activeHomeTab,
      isRestoreAttempt: true
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function openHomeTab(tabId) {
    setActiveHomeTab(tabId);

    if (tabId === "jugar_local") {
      setScreen("menu");
      return;
    }

    if (tabId === "aventura") {
      if (!username) {
        setScreen("auth");
        setChallengeMessage("Entra con un usuario para guardar tu progreso de aventura.");
        return;
      }

      setScreen("adventure");
      return;
    }

    if (!username) {
      setScreen("auth");
      setChallengeMessage("Entrá con un usuario para ver las salas online.");
      return;
    }

    setScreen("lobby");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function resetLocalFfaSpriteStates(fighters) {
    setFfaSpriteStates(buildLocalFfaSpriteStates(fighters));
  }

  function resetOnlineFfaSpriteStates(combatants) {
    setOnlineFfaSpriteStates(buildOnlineFfaSpriteStates(combatants));
  }

  function hydrateCharacterForBattle(stateCharacter) {
    const baseCharacter = CHARACTERS[stateCharacter?.characterId] || {};
    const attacksById = Object.fromEntries((baseCharacter.ataques || []).map((attack) => [attack.id, attack]));
    const hydratedAttacks = (stateCharacter?.ataques || baseCharacter.ataques || []).map((attack) => ({
      ...(attacksById[attack.id] || {}),
      ...attack
    }));

    return {
      ...baseCharacter,
      ...stateCharacter,
      id: stateCharacter?.characterId || baseCharacter.id,
      ataques: hydratedAttacks,
      usos: { ...(stateCharacter?.usos || {}) }
    };
  }

  function applyOnlineBattleState(battleState) {
    if (onlineBattleFallbackRef.current) {
      clearTimeout(onlineBattleFallbackRef.current);
      onlineBattleFallbackRef.current = null;
    }

    setBattleContext({ type: "online", levelId: "" });
    setCurrentRoomMode(battleState.mode || "duel");
    setCurrentRoomId(battleState.roomId || "");
    setTurn(battleState.turn || 1);
    setLogs(battleState.log || ["La batalla online comenzó."]);
    setBattleOver(Boolean(battleState.winner));
    setScreen("battle");

    if (battleState.mode === "free_for_all") {
      const nextCombatants = battleState.combatants || [];
      const me = nextCombatants.find((combatant) => combatant.isMe);

      setOnlineBattleMode(true);
      setOnlineFfaCombatants(nextCombatants);
      resetOnlineFfaSpriteStates(nextCombatants);
      setPlayer(null);
      setEnemy(null);
      setSelectedId(me?.characterId || selectedId);
      setRoomSelectedCharacter(me?.characterId || roomSelectedCharacter);
      setBusy(Boolean(me?.pending) && !battleState.winner);
      return;
    }

    const nextPlayer = hydrateCharacterForBattle(battleState.me);
    const nextEnemy = hydrateCharacterForBattle(battleState.enemy);

    setOnlineBattleMode(true);
    setOnlineFfaCombatants([]);
    setOnlineFfaSpriteStates({});
    setSelectedId(nextPlayer.id || "alan_soma");
    setRoomSelectedCharacter(nextPlayer.id || "alan_soma");
    setPlayer(nextPlayer);
    setEnemy(nextEnemy);
    setBusy(Boolean(battleState.pendingMoves?.me) && !battleState.winner);
  }

  async function playOnlineTurnSequence(payload) {
    const steps = payload?.steps || [];

    onlineTurnAnimatingRef.current = true;
    setBusy(true);
    setSelectedMoveId(null);
    setPreviewMoveId(null);

    for (const step of steps) {
      const actorIsPlayer = step.actor === "me";
      const targetIsPlayer = step.target === "me";

      if (actorIsPlayer) {
        setPlayerActing(true);
      } else {
        setEnemyActing(true);
      }

      await sleep(320);
      setLogs((prev) => [step.text, ...prev].slice(0, 20));

      if (targetIsPlayer) {
        if (step.targetKo) {
          setPlayerPose("ko");
        } else if (step.targetDamaged) {
          setPlayerPose("hit");
          setPlayerFlashing(true);
        }
      } else if (step.targetKo) {
        setEnemyPose("ko");
      } else if (step.targetDamaged) {
        setEnemyPose("hit");
        setEnemyFlashing(true);
      }

      await sleep(380);

      if (targetIsPlayer && step.targetDamaged && !step.targetKo) {
        setPlayerPose("normal");
        setPlayerFlashing(false);
      }

      if (!targetIsPlayer && step.targetDamaged && !step.targetKo) {
        setEnemyPose("normal");
        setEnemyFlashing(false);
      }

      if (actorIsPlayer) {
        setPlayerActing(false);
      } else {
        setEnemyActing(false);
      }

      await sleep(220);
    }

    const nextState = pendingOnlineBattleStateRef.current || payload?.finalState;
    pendingOnlineBattleStateRef.current = null;
    onlineTurnAnimatingRef.current = false;

    if (nextState) {
      applyOnlineBattleState(nextState);
    } else {
      setBusy(false);
    }
  }

  async function playOnlineFfaTurnSequence(payload) {
    const steps = payload?.steps || [];

    onlineTurnAnimatingRef.current = true;
    setBusy(true);
    setSelectedMoveId(null);
    setPreviewMoveId(null);

    for (const step of steps) {
      setOnlineFfaSpriteStates((current) => patchFfaSpriteState(current, step.actorUsername, {
        acting: true,
        targetKey: step.targetUsername ?? null
      }));
      await sleep(320);

      setLogs((prev) => [step.text, ...prev].slice(0, 24));

      if (step.targetKo) {
        setOnlineFfaSpriteStates((current) => patchFfaSpriteState(current, step.targetUsername, { pose: "ko", flashing: false }));
      } else if (step.targetDamaged) {
        setOnlineFfaSpriteStates((current) => patchFfaSpriteState(current, step.targetUsername, { pose: "hit", flashing: true }));
      }

      await sleep(380);

      if (step.targetDamaged && !step.targetKo) {
        setOnlineFfaSpriteStates((current) => patchFfaSpriteState(current, step.targetUsername, { pose: "normal", flashing: false }));
      }

      setOnlineFfaSpriteStates((current) => patchFfaSpriteState(current, step.actorUsername, {
        acting: false,
        targetKey: null
      }));
      await sleep(220);
    }

    const nextState = pendingOnlineBattleStateRef.current || payload?.finalState;
    pendingOnlineBattleStateRef.current = null;
    onlineTurnAnimatingRef.current = false;

    if (nextState) {
      applyOnlineBattleState(nextState);
    } else {
      setBusy(false);
    }
  }

  function submitOnlineFfaMove(move, targetUsername = null) {
    if (!currentRoomId || currentRoomMode !== "free_for_all") return;

    socket.emit("submit_move", { roomId: currentRoomId, moveId: move.id, targetUsername }, (response) => {
      if (!response?.ok) {
        setBusy(false);
        setSelectedMoveId(null);
        setChallengeMessage(response?.message || "No se pudo enviar el movimiento.");
        return;
      }

      setBusy(true);
      setSelectedMoveId(null);
      setChallengeMessage("Movimiento enviado. Esperando al resto...");
    });
  }

  function startLegacyOnlineBattle(roomId, selectedCharacters = {}) {
    const myCharacterId = selectedCharacters[username] || roomSelectedCharacter || selectedId || "alan_soma";
    const rivalUsername = roomPlayers.find((playerName) => playerName !== username);
    const rivalCharacterId = selectedCharacters[rivalUsername] || (myCharacterId === "alan_soma" ? "ramon" : "alan_soma");
    const nextPlayer = cloneCharacter(CHARACTERS[myCharacterId] || CHARACTERS.alan_soma);
    const nextEnemy = cloneCharacter(CHARACTERS[rivalCharacterId] || CHARACTERS.ramon);

    setBattleContext({ type: "online", levelId: "" });
    setOnlineBattleMode(false);
    setOnlineFfaSpriteStates({});
    setSelectedId(myCharacterId);
    setRoomSelectedCharacter(myCharacterId);
    setPlayer(nextPlayer);
    setEnemy(nextEnemy);
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
      `Comienza la batalla online. ${nextPlayer.nombre} vs ${nextEnemy.nombre}.`,
      `Sala: ${roomId || currentRoomId || "online"}.`
    ]);
    setScreen("battle");
  }

  function startOnlineBattlePreview(roomId, selectedCharacters = {}) {
    const myCharacterId = selectedCharacters[username] || roomSelectedCharacter || selectedId || "alan_soma";
    const rivalUsername = roomPlayers.find((playerName) => playerName !== username);
    const rivalCharacterId = selectedCharacters[rivalUsername] || "ramon";
    const nextPlayer = cloneCharacter(CHARACTERS[myCharacterId] || CHARACTERS.alan_soma);
    const nextEnemy = cloneCharacter(CHARACTERS[rivalCharacterId] || CHARACTERS.ramon);

    setBattleContext({ type: "online", levelId: "" });
    setOnlineBattleMode(true);
    setOnlineFfaSpriteStates({});
    setSelectedId(myCharacterId);
    setRoomSelectedCharacter(myCharacterId);
    setPlayer(nextPlayer);
    setEnemy(nextEnemy);
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
      `Comienza la batalla online. ${nextPlayer.nombre} vs ${nextEnemy.nombre}.`,
      `Sala: ${roomId || currentRoomId || "online"}.`
    ]);
    setScreen("battle");
  }

  useEffect(() => {
    function onActiveUsers(list) {
      setActiveUsers(list);
    }

    function onFfaRooms(list) {
      setAvailableFfaRooms(list || []);
    }

    function onChallengeReceived({ from }) {
      setIncomingChallenge({ from });
      setChallengeMessage(`${from} te desafió.`);
    }

    function onChallengeRejected({ by }) {
      setChallengeMessage(`${by} rechazó tu reto.`);
      setIncomingChallenge(null);
    }

    function onBattleStarted({ roomId, players, mode, maxPlayers }) {
      if (onlineBattleFallbackRef.current) {
        clearTimeout(onlineBattleFallbackRef.current);
        onlineBattleFallbackRef.current = null;
      }

      setBattleContext({ type: "online", levelId: "" });
      setCurrentRoomId(roomId);
      setCurrentRoomMode(mode || "duel");
      setActiveHomeTab((mode || "duel") === "free_for_all" ? "salas_ffa" : "salas");
      setCurrentRoomMaxPlayers(maxPlayers || 2);
      setGameModeId(mode || "duel");
      setRoomPlayers(players || []);
      setRoomReady({});
      setRoomSelectedCharacters({});
      setOnlineBattleMode(false);
      setOnlineFfaCombatants([]);
      setIncomingChallenge(null);
      setChallengeMessage(`Sala creada: ${roomId}`);
      setScreen("room");
    }

    function onRoomState({ roomId, mode, maxPlayers, players, ready, selectedCharacters }) {
      setCurrentRoomId(roomId || "");
      setCurrentRoomMode(mode || "duel");
      setActiveHomeTab((mode || "duel") === "free_for_all" ? "salas_ffa" : "salas");
      setCurrentRoomMaxPlayers(maxPlayers || 2);
      setGameModeId(mode || "duel");
      setRoomPlayers(players || []);
      setRoomReady(ready || {});
      setRoomSelectedCharacters(selectedCharacters || {});
      setScreen("room");
    }

    function onStartOnlineBattle({ roomId, mode, maxPlayers, players, selectedCharacters }) {
      setCurrentRoomId(roomId || "");
      setCurrentRoomMode(mode || "duel");
      setActiveHomeTab((mode || "duel") === "free_for_all" ? "salas_ffa" : "salas");
      setCurrentRoomMaxPlayers(maxPlayers || 2);
      setGameModeId(mode || "duel");
      setRoomPlayers(players || []);
      setRoomSelectedCharacters(selectedCharacters || {});
      setOnlineBattleMode(true);
      setSelectedMoveId(null);
      setPreviewMoveId(null);
      setOnlineFfaCombatants([]);
      if (onlineBattleFallbackRef.current) {
        clearTimeout(onlineBattleFallbackRef.current);
      }
      if (mode === "free_for_all") {
        setChallengeMessage(`La batalla comenzó en ${roomId}.`);
        return;
      }
      startOnlineBattlePreview(roomId, selectedCharacters || {});
      onlineBattleFallbackRef.current = setTimeout(() => {
        startLegacyOnlineBattle(roomId, selectedCharacters || {});
      }, 1200);
      setChallengeMessage(`La batalla comenzó en ${roomId}.`);
    }

    function onBattleState(state) {
      if (onlineTurnAnimatingRef.current) {
        pendingOnlineBattleStateRef.current = state;
        return;
      }

      applyOnlineBattleState(state);
    }

    function onTurnSequence(payload) {
      if ((payload?.finalState?.mode || currentRoomMode) === "free_for_all") {
        playOnlineFfaTurnSequence(payload);
        return;
      }

      playOnlineTurnSequence(payload);
    }

    socket.on("active_users", onActiveUsers);
    socket.on("ffa_rooms", onFfaRooms);
    socket.on("challenge_received", onChallengeReceived);
    socket.on("challenge_rejected", onChallengeRejected);
    socket.on("battle_started", onBattleStarted);
    socket.on("room_state", onRoomState);
    socket.on("start_online_battle", onStartOnlineBattle);
    socket.on("turn_sequence", onTurnSequence);
    socket.on("battle_state", onBattleState);

    return () => {
      if (onlineBattleFallbackRef.current) {
        clearTimeout(onlineBattleFallbackRef.current);
        onlineBattleFallbackRef.current = null;
      }

      socket.off("active_users", onActiveUsers);
      socket.off("ffa_rooms", onFfaRooms);
      socket.off("challenge_received", onChallengeReceived);
      socket.off("challenge_rejected", onChallengeRejected);
      socket.off("battle_started", onBattleStarted);
      socket.off("room_state", onRoomState);
      socket.off("start_online_battle", onStartOnlineBattle);
      socket.off("turn_sequence", onTurnSequence);
      socket.off("battle_state", onBattleState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEnterLobby() {
    registerUser(usernameInput, {
      targetTab: activeHomeTab === "aventura" ? "aventura" : "salas"
    });
    return;

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
      setActiveHomeTab("salas");
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

  function handleCreateFfaRoom() {
    if (!username) {
      setChallengeMessage("Primero entrá al lobby con tu usuario.");
      return;
    }

    socket.emit("create_ffa_room", {}, (response) => {
      if (!response?.ok) {
        setChallengeMessage(response?.message || "No se pudo crear la sala FFA.");
        return;
      }

      setChallengeMessage(response?.message || `Sala FFA creada: ${response.roomId}.`);
    });
  }

  function handleJoinFfaRoom(roomId) {
    socket.emit("join_ffa_room", { roomId }, (response) => {
      if (!response?.ok) {
        setChallengeMessage(response?.message || "No se pudo entrar a la sala FFA.");
        return;
      }

      setChallengeMessage(response?.message || `Entraste a la sala FFA ${roomId}.`);
    });
  }

  function handleLeaveRoom() {
    if (!currentRoomId) {
      setScreen("lobby");
      return;
    }

    socket.emit("leave_battle", { roomId: currentRoomId }, (response) => {
      if (!response?.ok) {
        setChallengeMessage("No se pudo salir de la sala.");
        return;
      }

      setCurrentRoomId("");
      setCurrentRoomMode("duel");
      setCurrentRoomMaxPlayers(2);
      setBattleContext({ type: "local", levelId: "" });
      setRoomPlayers([]);
      setRoomReady({});
      setRoomSelectedCharacters({});
      setOnlineBattleMode(false);
      setOnlineFfaCombatants([]);
      setOnlineFfaSpriteStates({});
      setSelectedMoveId(null);
      setPreviewMoveId(null);
      setBusy(false);
      setBattleOver(false);
      setActiveHomeTab(activeHomeTab === "salas_ffa" ? "salas_ffa" : "salas");
      setChallengeMessage("Saliste de la sala.");
      setScreen("lobby");
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

  function handleOpenLocalModes() {
    setActiveHomeTab("jugar_local");
    setBattleContext({ type: "local", levelId: "" });
    setChallengeMessage("Elegí entre Duelo y Free For All.");
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

        setChallengeMessage(
          currentRoomMode === "free_for_all"
            ? "Marcado como listo. Esperando a que se completen los 4 jugadores..."
            : "Marcado como listo. Esperando al otro jugador..."
        );
      }
    );
  }

  function finalizeAdventureBattle(won) {
    if (!currentAdventureLevel) {
      return;
    }

    if (!won) {
      setChallengeMessage(`No superaste ${currentAdventureLevel.titulo}. Puedes reintentarlo.`);
      return;
    }

    if (!adventureProfileKey) {
      setChallengeMessage(`Superaste ${currentAdventureLevel.titulo}.`);
      return;
    }

    const outcome = completeAdventureProgress(adventureProfiles, adventureProfileKey, currentAdventureLevel.id);
    setAdventureProfiles(outcome.nextProfiles);

    if (outcome.unlockedAchievement) {
      setChallengeMessage(`Logro desbloqueado: ${ADVENTURE_ACHIEVEMENT.nombre}. ${ADVENTURE_ACHIEVEMENT.descripcion}`);
      return;
    }

    if (outcome.nextLevel) {
      setChallengeMessage(`Superaste ${currentAdventureLevel.titulo}. Se desbloqueo ${outcome.nextLevel.titulo}.`);
      return;
    }

    setChallengeMessage(`Superaste ${currentAdventureLevel.titulo}.`);
  }

  function startAdventureDuel(level) {
    const nextPlayer = cloneCharacter(CHARACTERS[selectedId] || CHARACTERS.alan_soma);
    const nextEnemy = cloneCharacter(
      buildAdventureCharacter(CHARACTERS[level.rivalId] || CHARACTERS.ramon, level.dificultadId)
    );

    setBattleContext({ type: "adventure", levelId: level.id });
    setGameModeId("duel");
    setDifficultyId(level.dificultadId === "facil" || level.dificultadId === "normal" ? level.dificultadId : "dificil");
    setOnlineBattleMode(false);
    clearQueuedMove();
    clearTouchPreview();
    setPlayer(nextPlayer);
    setEnemy(nextEnemy);
    setFfaPlayers([]);
    setFfaSelections({});
    setOnlineFfaCombatants([]);
    setOnlineFfaSpriteStates({});
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
      `Aventura ${level.orden}/10 · ${level.titulo}`,
      level.historia,
      `${nextPlayer.nombre} contra ${nextEnemy.nombre} (${level.dificultadId}).`
    ]);
    setScreen("battle");
  }

  function startAdventureBossBattle(level) {
    const bossOrder = ["ramon", "alan_soma", "sonoda"];
    const boostedPlayer = cloneCharacter(CHARACTERS[selectedId] || CHARACTERS.alan_soma);
    boostedPlayer.hp *= 2;
    boostedPlayer.hpActual = boostedPlayer.hp;

    const nextFighters = [
      {
        slotId: 0,
        label: username || "Vos",
        characterId: selectedId,
        character: boostedPlayer,
        isPlayer: true,
        isAi: false
      },
      ...bossOrder.map((characterId, index) => ({
        slotId: index + 1,
        label: CHARACTERS[characterId]?.nombre || characterId,
        characterId,
        character: cloneCharacter(
          buildAdventureCharacter(CHARACTERS[characterId] || CHARACTERS.ramon, level.dificultadId)
        ),
        isPlayer: false,
        isAi: true
      }))
    ];

    setBattleContext({ type: "adventure", levelId: level.id });
    setGameModeId("free_for_all");
    setDifficultyId("dificil");
    clearQueuedMove();
    clearTouchPreview();
    setOnlineBattleMode(false);
    setPlayer(null);
    setEnemy(null);
    setFfaPlayers(nextFighters);
    resetLocalFfaSpriteStates(nextFighters);
    setOnlineFfaCombatants([]);
    setOnlineFfaSpriteStates({});
    setFfaSelections({});
    setFfaCurrentPlayerIndex(0);
    setSelectedMoveId(null);
    setPreviewMoveId(null);
    setMobileLogOpen(false);
    setBattleOver(false);
    setBusy(false);
    setTurn(1);
    setLogs([
      `Aventura ${level.orden}/10 · ${level.titulo}`,
      level.historia,
      `${boostedPlayer.nombre} entra al boss final con la vida duplicada: ${boostedPlayer.hp} HP.`,
      "En el cierre de la EPET 34, Ramon, Alan y Sonoda atacan juntos."
    ]);
    setScreen("battle");
  }

  function startAdventureLevel(levelId) {
    const level = getAdventureLevel(levelId);

    if (!level) {
      return;
    }

    if (!isAdventureLevelUnlocked(level, completedAdventureLevelSet)) {
      setChallengeMessage("Ese nivel todavia esta bloqueado. Completa el anterior primero.");
      return;
    }

    setActiveHomeTab("aventura");

    if (level.modo === "boss") {
      startAdventureBossBattle(level);
      return;
    }

    startAdventureDuel(level);
  }

  function buildAdventureBossSelections(baseSelections) {
    const nextSelections = { ...baseSelections };
    const playerTargetIndex = ffaPlayers.findIndex((fighter) => fighter.isPlayer && fighter.character.hpActual > 0);

    ffaPlayers.forEach((fighter, index) => {
      if (!fighter?.isAi || fighter.character.hpActual <= 0 || nextSelections[index]) {
        return;
      }

      const aiMove = pickAiMove(fighter.character);
      const aliveTargets = ffaPlayers
        .map((candidate, targetIndex) => ({ candidate, targetIndex }))
        .filter(({ candidate, targetIndex }) => targetIndex !== index && candidate.character.hpActual > 0);
      let targetIndex = null;

      if (aiMove.tipo === "ataque") {
        if (playerTargetIndex >= 0 && playerTargetIndex !== index) {
          targetIndex = playerTargetIndex;
        } else {
          targetIndex = aliveTargets[0]?.targetIndex ?? null;
        }
      }

      nextSelections[index] = {
        moveId: aiMove.id,
        targetIndex
      };
    });

    return nextSelections;
  }

  function startBattle() {
    setBattleContext({ type: "local", levelId: "" });
    setOnlineBattleMode(false);
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

  function updateFfaSlotCharacter(slotId, characterId) {
    setFfaSlots((current) => current.map((slot) => (
      slot.slotId === slotId
        ? { ...slot, characterId }
        : slot
    )));
  }

  function startFreeForAllBattle() {
    const nextFighters = ffaSlots.map((slot) => cloneFfaFighter(slot));

    setBattleContext({ type: "local", levelId: "" });
    clearQueuedMove();
    clearTouchPreview();
    setOnlineBattleMode(false);
    setPlayer(null);
    setEnemy(null);
    setFfaPlayers(nextFighters);
    resetLocalFfaSpriteStates(nextFighters);
    setOnlineFfaSpriteStates({});
    setFfaSelections({});
    setFfaCurrentPlayerIndex(0);
    setSelectedMoveId(null);
    setPreviewMoveId(null);
    setMobileLogOpen(false);
    setBattleOver(false);
    setBusy(false);
    setTurn(1);
    setLogs([
      "Comienza el Free For All.",
      "Cada jugador elige un movimiento y objetivo antes de resolver la ronda."
    ]);
    setScreen("battle");
  }

  function resolveFfaAction(fighters, action, actionOrder) {
    const attackerEntry = fighters[action.playerIndex];

    if (!attackerEntry || attackerEntry.character.hpActual <= 0) {
      return null;
    }

    const nextFighters = fighters.map((fighter) => ({
      ...fighter,
      character: {
        ...fighter.character,
        usos: { ...fighter.character.usos }
      }
    }));
    const attacker = nextFighters[action.playerIndex];
    const move = attacker.character.ataques.find((candidate) => candidate.id === action.moveId);

    if (!move) {
      return {
        fighters: nextFighters,
        text: `${attacker.label} no pudo ejecutar su movimiento.`
      };
    }

    let targetIndex = action.targetIndex ?? -1;
    let defenderPlannedMove = null;

    if (move.id === "correr") {
      const counterSource = actionOrder.find((candidate) => {
        if (candidate.playerIndex === action.playerIndex || candidate.targetIndex !== action.playerIndex) {
          return false;
        }

        const source = nextFighters[candidate.playerIndex];
        const sourceMove = source?.character.ataques.find((candidateMove) => candidateMove.id === candidate.moveId);
        return source && source.character.hpActual > 0 && sourceMove?.tipo === "ataque";
      });

      if (counterSource) {
        targetIndex = counterSource.playerIndex;
        defenderPlannedMove = nextFighters[counterSource.playerIndex]?.character.ataques.find((candidate) => candidate.id === counterSource.moveId) ?? null;
      }
    } else if (move.tipo === "ataque" && (targetIndex < 0 || nextFighters[targetIndex]?.character.hpActual <= 0)) {
      targetIndex = nextFighters.findIndex((fighter, index) => index !== action.playerIndex && fighter.character.hpActual > 0);
    }

    if (move.tipo === "ataque" && targetIndex < 0) {
      return {
        fighters: nextFighters,
        text: `${attacker.label} no encontro un objetivo valido.`
      };
    }

    const defender = targetIndex >= 0 ? nextFighters[targetIndex] : attacker;
    const defenderHpBefore = defender.character.hpActual;
    const result = resolveMoveShared({
      attacker: attacker.character,
      defender: defender.character,
      move,
      attackerLabel: attacker.label,
      defenderLabel: defender.label,
      defenderPlannedMove
    });

    attacker.character = result.attacker;
    if (targetIndex >= 0) {
      nextFighters[targetIndex].character = result.defender;
    }

    const targetEntry = targetIndex >= 0 ? nextFighters[targetIndex] : attacker;
    const visualTargetKey = move.tipo === "ataque" ? targetEntry.slotId : null;

    return {
      fighters: nextFighters,
      text: result.text,
      actorKey: attacker.slotId,
      targetKey: visualTargetKey,
      targetDamaged: targetEntry.character.hpActual < defenderHpBefore,
      targetKo: targetEntry.character.hpActual <= 0
    };
  }

  async function resolveFreeForAllRound(nextSelections) {
    const aliveAtStart = getAliveFfaIndexes(ffaPlayers);
    const actionOrder = aliveAtStart
      .map((playerIndex) => {
        const selection = nextSelections[playerIndex];
        const fighter = ffaPlayers[playerIndex];
        const move = fighter.character.ataques.find((candidate) => candidate.id === selection?.moveId);

        if (!move) return null;

        return {
          playerIndex,
          moveId: selection.moveId,
          targetIndex: selection.targetIndex,
          priority: move.prioridad || 0,
          speed: fighter.character.velocidad || 0
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (b.speed !== a.speed) return b.speed - a.speed;
        return a.playerIndex - b.playerIndex;
      });

    let fighters = ffaPlayers.map((fighter) => ({
      ...fighter,
      character: {
        ...fighter.character,
        usos: { ...fighter.character.usos }
      }
    }));
    const stepStates = [];

    setLogs((prev) => [`Turno ${turn}`, ...prev].slice(0, 24));

    for (const action of actionOrder) {
      const result = resolveFfaAction(fighters, action, actionOrder);
      if (!result) continue;

      fighters = result.fighters;
      stepStates.push({
        actorKey: result.actorKey,
        targetKey: result.targetKey,
        targetDamaged: result.targetDamaged,
        targetKo: result.targetKo,
        text: result.text,
        fighters: fighters.map((fighter) => ({
          ...fighter,
          character: {
            ...fighter.character,
            usos: { ...fighter.character.usos }
          }
        }))
      });

      const aliveNow = getAliveFfaIndexes(fighters);
      if (aliveNow.length <= 1) {
        break;
      }
    }

    for (const step of stepStates) {
      setFfaSpriteStates((current) => patchFfaSpriteState(current, step.actorKey, {
        acting: true,
        targetKey: step.targetKey
      }));
      await sleep(320);

      setFfaPlayers(step.fighters);
      setLogs((prev) => [step.text, ...prev].slice(0, 24));

      if (step.targetKo) {
        setFfaSpriteStates((current) => patchFfaSpriteState(current, step.targetKey, { pose: "ko", flashing: false }));
      } else if (step.targetDamaged) {
        setFfaSpriteStates((current) => patchFfaSpriteState(current, step.targetKey, { pose: "hit", flashing: true }));
      }

      await sleep(380);

      if (step.targetDamaged && !step.targetKo) {
        setFfaSpriteStates((current) => patchFfaSpriteState(current, step.targetKey, { pose: "normal", flashing: false }));
      }

      setFfaSpriteStates((current) => patchFfaSpriteState(current, step.actorKey, {
        acting: false,
        targetKey: null
      }));
      await sleep(220);
    }

    const finalFighters = resetFfaRoundState(fighters);
    const survivors = getAliveFfaIndexes(finalFighters);
    const playerBossIndex = finalFighters.findIndex((fighter) => fighter.isPlayer);
    const playerBossAlive = playerBossIndex >= 0 && finalFighters[playerBossIndex].character.hpActual > 0;
    const bossOpponentsAlive = finalFighters.filter((fighter) => fighter.isAi && fighter.character.hpActual > 0).length;

    if (isAdventureBossBattle && !playerBossAlive) {
      setBattleOver(true);
      setFfaPlayers(finalFighters);
      resetLocalFfaSpriteStates(finalFighters);
      setFfaSelections({});
      setFfaCurrentPlayerIndex(playerBossIndex >= 0 ? playerBossIndex : 0);
      setSelectedMoveId(null);
      setPreviewMoveId(null);
      setBusy(false);
      setLogs((prev) => ["Los guardianes de la 34 te frenaron antes del logro final.", ...prev].slice(0, 24));
      finalizeAdventureBattle(false);
      return;
    }

    if (isAdventureBossBattle && playerBossAlive && bossOpponentsAlive === 0) {
      setBattleOver(true);
      setFfaPlayers(finalFighters);
      resetLocalFfaSpriteStates(finalFighters);
      setFfaSelections({});
      setFfaCurrentPlayerIndex(playerBossIndex);
      setSelectedMoveId(null);
      setPreviewMoveId(null);
      setBusy(false);
      setLogs((prev) => [`${finalFighters[playerBossIndex].label} resistio y supero a los tres guardianes.`, ...prev].slice(0, 24));
      finalizeAdventureBattle(true);
      return;
    }

    if (survivors.length === 1) {
      setBattleOver(true);
      setLogs((prev) => [`${finalFighters[survivors[0]].label} ganó el Free For All.`, ...prev].slice(0, 24));
    } else if (survivors.length === 0) {
      setBattleOver(true);
      setLogs((prev) => ["Todos cayeron. Empate total.", ...prev].slice(0, 24));
    } else {
      setTurn((current) => current + 1);
    }

    setFfaPlayers(finalFighters);
    resetLocalFfaSpriteStates(finalFighters);
    setFfaSelections({});
    setFfaCurrentPlayerIndex(survivors[0] ?? 0);
    setSelectedMoveId(null);
    setPreviewMoveId(null);
    setBusy(false);
  }

  function commitFfaSelection(move, targetIndex = null) {
    if (!ffaCurrentPlayer) return;

    const nextSelections = {
      ...ffaSelections,
      [ffaCurrentPlayerIndex]: {
        moveId: move.id,
        targetIndex
      }
    };

    if (isAdventureBossBattle) {
      const resolvedSelections = buildAdventureBossSelections(nextSelections);

      setFfaSelections(resolvedSelections);
      setSelectedMoveId(null);
      setPreviewMoveId(null);
      setBusy(true);
      resolveFreeForAllRound(resolvedSelections);
      return;
    }

    const nextPlayerIndex = getNextPendingFfaPlayerIndex(ffaPlayers, nextSelections, ffaCurrentPlayerIndex);

    setFfaSelections(nextSelections);
    setSelectedMoveId(null);
    setPreviewMoveId(null);

    if (nextPlayerIndex === -1) {
      setBusy(true);
      resolveFreeForAllRound(nextSelections);
      return;
    }

    setFfaCurrentPlayerIndex(nextPlayerIndex);
  }

  function pickAiMove(currentEnemy) {
    return pickAiMoveShared(currentEnemy, difficulty);
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

  function submitOnlineMove(move) {
    if (!currentRoomId || !onlineBattleMode) return;

    socket.emit("submit_move", { roomId: currentRoomId, moveId: move.id }, (response) => {
      if (!response?.ok) {
        setBusy(false);
        setSelectedMoveId(null);
        setChallengeMessage(response?.message || "No se pudo enviar el movimiento.");
        return;
      }

      setBusy(true);
      setChallengeMessage("Movimiento enviado. Esperando al rival...");
    });
  }

  function handleMoveClick(move) {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (isOnlineFfaBattle) {
      setSelectedMoveId(move.id);
      if (move.tipo !== "ataque") {
        submitOnlineFfaMove(move);
      }
      return;
    }

    if (isFfaBattle) {
      setSelectedMoveId(move.id);
      if (move.tipo !== "ataque") {
        commitFfaSelection(move);
      }
      return;
    }

    clearQueuedMove();
    setSelectedMoveId(move.id);
    queuedMoveTimeoutRef.current = setTimeout(() => {
      queuedMoveTimeoutRef.current = null;
      setSelectedMoveId(null);
      if (onlineBattleMode) {
        submitOnlineMove(move);
        return;
      }
      runTurn(move);
    }, 900);
  }

  function handleCancelMove() {
    if (isFfaBattle) {
      setSelectedMoveId(null);
      return;
    }

    clearQueuedMove();
    setSelectedMoveId(null);
  }

  function applyMove(attacker, defender, move, chosenByPlayer, defenderMove) {
    const attackerLabel = chosenByPlayer ? `Tu ${attacker.nombre}` : `El rival ${attacker.nombre}`;
    return resolveMoveShared({
      attacker,
      defender,
      move,
      attackerLabel,
      defenderLabel: defender.nombre,
      defenderPlannedMove: defenderMove
    });
  }

  function endTurnUpdate(nextPlayer, nextEnemy) {
    return {
      updatedPlayer: resetTurnFlagsShared(nextPlayer),
      updatedEnemy: resetTurnFlagsShared(nextEnemy)
    };
  }

  async function runTurn(playerMove) {
    if (!player || !enemy || battleOver || busy) return;
    clearQueuedMove();
    setSelectedMoveId(null);
    setPreviewMoveId(null);
    setBusy(true);

    const enemyMove = pickAiMove(enemy);
    const firstIsPlayer =
      chooseFirstAttackerShared(playerMove, enemyMove, player.velocidad, enemy.velocidad);

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

      if (isAdventureBattle) {
        finalizeAdventureBattle(e.hpActual <= 0 && p.hpActual > 0);
      }
    }

    setTurn((t) => t + 1);
    setBusy(false);
  }

  function handleBattleBack() {
    if (isAdventureBattle) {
      setScreen("adventure");
      setBusy(false);
      setSelectedMoveId(null);
      setPreviewMoveId(null);
      setMobileLogOpen(false);
      return;
    }

    setScreen("menu");
  }

  function handleReplayBattle() {
    if (currentAdventureLevel) {
      startAdventureLevel(currentAdventureLevel.id);
      return;
    }

    if (gameModeId === "free_for_all") {
      startFreeForAllBattle();
      return;
    }

    startBattle();
  }

  return (
    <div className="showdown-dark min-h-screen bg-black text-slate-100">
      <div className="showdown-shell mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-6 pt-3 md:px-6">
        {screen !== "battle" && (
          <header className="mb-6 border-b border-red-700/70 pb-3">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-center">
              <div className="flex items-start gap-6">
                <div className="min-w-[180px] pr-6">
                  <h1 className="showdown-title mt-2 text-5xl leading-none text-red-600 md:text-6xl">Showdown34</h1>
                </div>
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-6 pt-1 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 lg:justify-center">
                {[
                  { id: "jugar_local", label: "Jugar local" },
                  { id: "aventura", label: "Aventura" },
                  { id: "salas", label: "Salas" },
                  { id: "salas_ffa", label: "Salas FFA" }
                ].map((tab) => {
                  const isActive = activeHomeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => openHomeTab(tab.id)}
                      className={`px-0 py-3 text-left transition ${isActive ? "border-red-600 text-red-500" : "text-zinc-500 hover:text-zinc-200"}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </header>
        )}

        {screen === "auth" && (
          <div className="flex min-h-[62vh] items-center justify-center px-2">
            <div className="w-full max-w-sm rounded-[32px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(239,245,250,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
              <div className="mb-5">
                <div>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">Entrar</h2>
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
                  Entrar al sistema
                </button>
                <button
                  onClick={handleOpenLocalModes}
                  className="w-full rounded-[20px] border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
                >
                  Modo local
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
              <div className="lg:px-3">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 lg:text-left">{activeHomeTab === "salas_ffa" ? "Salas FFA" : "Salas"}</div>
                <h2 className="mt-1 text-center text-3xl font-black tracking-[-0.03em] text-slate-900 lg:text-left">{activeHomeTab === "salas_ffa" ? "Free For All abiertas" : "Sala activa"}</h2>
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
                  <div className="px-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{activeHomeTab === "salas_ffa" ? "Salas disponibles" : "Jugadores conectados"}</div>
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    {activeHomeTab === "salas_ffa" ? `${availableFfaRooms.length} abiertas` : `${activeUsers.length} online`}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/75">
                  {activeHomeTab === "salas_ffa" ? (
                    availableFfaRooms.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-slate-500">No hay salas públicas FFA abiertas.</div>
                    ) : (
                      availableFfaRooms.map((room, index) => (
                        (() => {
                          const isMyRoom = room.players.includes(username);

                          return (
                            <div
                              key={room.roomId}
                              className={`flex items-center justify-between gap-3 px-4 py-4 ${index !== availableFfaRooms.length - 1 ? "border-b border-slate-200/80" : ""}`}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-base font-black tracking-[-0.02em] text-slate-900">{room.roomId}</div>
                                <div className="mt-1 text-sm text-slate-500">{room.count}/{room.maxPlayers} jugadores · {room.players.join(", ")}</div>
                              </div>
                              <button
                                onClick={() => handleJoinFfaRoom(room.roomId)}
                                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${isMyRoom ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                              >
                                {isMyRoom ? "Abrir" : "Unirse"}
                              </button>
                            </div>
                          );
                        })()
                      ))
                    )
                  ) : (
                    activeUsers.map((user, index) => (
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
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-slate-200 bg-white/78 p-4">
                  <div className="px-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Reto directo</div>
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

                {activeHomeTab === "salas_ffa" && (
                  <div className="rounded-[26px] border border-slate-200 bg-white/78 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="px-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Salas FFA</div>
                      <button
                        onClick={handleCreateFfaRoom}
                        className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
                      >
                        Crear
                      </button>
                    </div>

                    <div className="space-y-3">
                      {availableFfaRooms.length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                          No hay salas públicas FFA abiertas.
                        </div>
                      ) : (
                        availableFfaRooms.map((room) => {
                          const isMyRoom = room.players.includes(username);

                          return (
                            <div key={room.roomId} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-black text-slate-900">{room.roomId}</div>
                                  <div className="text-sm text-slate-500">{room.count}/{room.maxPlayers} jugadores</div>
                                </div>
                                <button
                                  onClick={() => handleJoinFfaRoom(room.roomId)}
                                  className={`rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${isMyRoom ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100" : "border border-slate-300 bg-slate-100 text-slate-700 hover:bg-white"}`}
                                >
                                  {isMyRoom ? "Abrir" : "Unirse"}
                                </button>
                              </div>
                              <div className="mt-2 text-sm text-slate-500">
                                {room.players.join(", ")}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-[26px] border border-slate-200 bg-white/78 p-4">
                  <div className="px-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Estado</div>
                  <div className="mt-3 text-sm font-medium text-slate-300">
                    {challengeMessage || "Conectado al lobby."}
                  </div>
                </div>

                {incomingChallenge && (
                  <div className="rounded-[26px] border border-amber-200 bg-[linear-gradient(180deg,#fff7db_0%,#ffefbf_100%)] p-4">
                    <div className="px-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Desafío entrante</div>
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
                  onClick={handleOpenLocalModes}
                  className="w-full rounded-[22px] border border-slate-300 bg-white/85 px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-700 transition hover:bg-white"
                >
                  Jugar local
                </button>
              </div>
            </div>
          </section>
        )}

        {screen === "room" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(234,242,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-900">Sala previa</h2>
                <button
                  onClick={handleLeaveRoom}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                >
                  Salir
                </button>
              </div>

              <div className="mb-5 rounded-[24px] border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
                <div className="font-semibold">Sala</div>
                <div className="mt-1 text-slate-500">{currentRoomId || "Sin sala"}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.values(CHARACTERS).map((char) => {
                  const selected = char.id === roomSelectedCharacter;
                  return (
                    <button
                      key={char.id}
                      onClick={() => setRoomSelectedCharacter(char.id)}
                      className={`overflow-hidden rounded-[26px] border p-4 text-left transition ${selected ? "border-sky-500 bg-[linear-gradient(180deg,#f2faff_0%,#dbefff_100%)] shadow-[0_18px_40px_rgba(14,165,233,0.22)]" : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)] hover:border-slate-300 hover:bg-white"}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-lg font-black tracking-[-0.03em] text-slate-900">{char.nombre}</span>
                        {selected && <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">Pick</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
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
                className="mt-5 w-full rounded-[22px] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:brightness-110"
              >
                Listo para pelear
              </button>
            </section>

            <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(237,243,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
              <h2 className="mb-4 text-center text-xl font-black tracking-[-0.02em] text-slate-900 lg:text-left">Jugadores en la sala</h2>
              <div className="space-y-3">
                {roomPlayers.map((playerName) => (
                  <div key={playerName} className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                          <div className="font-black text-slate-900">{playerName}</div>
                        <div className="text-sm text-slate-500">
                          {playerName === username ? "Vos" : currentRoomMode === "free_for_all" ? "Jugador" : "Rival"}
                        </div>
                        </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${roomReady[playerName] ? "bg-emerald-500 text-white" : "border border-slate-300 bg-white text-slate-500"}`}>
                        {roomReady[playerName] ? "Listo" : "Esperando"}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Personaje</span>
                      <span className="font-black text-slate-900">{CHARACTERS[roomSelectedCharacters[playerName]]?.nombre || "Sin elegir"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
                <div className="text-center font-semibold lg:text-left">Estado</div>
                <div className="mt-1 text-zinc-400">
                  {challengeMessage || (currentRoomMode === "free_for_all"
                    ? `Esperando ${currentRoomMaxPlayers} jugadores listos.`
                    : "Esperando confirmación de ambos jugadores.")}
                </div>
              </div>
            </section>
          </div>
        )}

        {screen === "adventure" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <section className="space-y-5">
              <div className="overflow-hidden rounded-[34px] border border-slate-900/12 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(127,29,29,0.96)_55%,rgba(245,158,11,0.9)_100%)] p-6 text-white shadow-[0_26px_80px_rgba(15,23,42,0.28)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-200">Aventura EPET 34</div>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">Sobrevivi al folklore de Itaembe Guazu</h2>
                    <p className="mt-3 max-w-xl text-sm text-white/80 md:text-base">
                      Cada nivel mezcla fotos reales de la EPET 34 con Ramon, Alan y Agua convirtiendo cualquier recreo, proyecto o mala indicacion en algo personal.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Usuario</div>
                      <div className="mt-2 text-xl font-black">{username}</div>
                    </div>
                    <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Progreso</div>
                      <div className="mt-2 text-xl font-black">{adventureCompletionCount}/{ADVENTURE_LEVELS.length}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                  <div className="font-black uppercase tracking-[0.18em] text-amber-200">Historia</div>
                  <div className="mt-2">
                    La escuela tecnica EPET 34 nacio en Itaembe Guazu para acompanar el crecimiento del barrio. En esta campana, cada duelo te mete mas adentro de su identidad hasta llegar al combate final por el orgullo de la 34.
                  </div>
                </div>
              </div>

              <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(234,242,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Tu protagonista</div>
                    <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-900">Elegi con quien vas a pasar la aventura</h3>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900">
                    Actual: <span className="font-black">{selectedCharacter.nombre}</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {Object.values(CHARACTERS).map((char) => {
                    const selected = char.id === selectedId;

                    return (
                      <button
                        key={`adventure-character-${char.id}`}
                        onClick={() => setSelectedId(char.id)}
                        className={`rounded-[26px] border p-4 text-left transition ${selected ? "border-sky-500 bg-[linear-gradient(180deg,#f2faff_0%,#dbefff_100%)] shadow-[0_18px_40px_rgba(14,165,233,0.18)]" : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)] hover:border-slate-300 hover:bg-white"}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="text-lg font-black tracking-[-0.03em] text-slate-900">{char.nombre}</div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${selected ? "bg-sky-600 text-white" : "border border-slate-300 bg-white text-slate-500"}`}>
                            {selected ? "Activo" : "Elegir"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                          <div>HP: <span className="font-black">{char.hp}</span></div>
                          <div>Ataque: <span className="font-black">{char.ataque}</span></div>
                          <div>Defensa: <span className="font-black">{char.defensa}</span></div>
                          <div>Velocidad: <span className="font-black">{char.velocidad}</span></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(235,242,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Mapa de niveles</div>
                    <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-900">Del primer timbre al combate final</h3>
                  </div>
                  {nextAdventureLevel && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Siguiente recomendado: <span className="font-black">{nextAdventureLevel.titulo}</span>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {ADVENTURE_LEVELS.map((level) => {
                    const completed = completedAdventureLevelSet.has(level.id);
                    const unlocked = isAdventureLevelUnlocked(level, completedAdventureLevelSet);
                    const isNext = nextAdventureLevel?.id === level.id;

                    return (
                      <article
                        key={level.id}
                        className={`rounded-[28px] border p-5 shadow-sm transition ${completed ? "border-emerald-200 bg-[linear-gradient(180deg,#f0fdf4_0%,#dcfce7_100%)]" : unlocked ? "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)]" : "border-slate-200 bg-slate-100/90"}`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Nivel {level.orden}</div>
                            <h4 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-900">{level.titulo}</h4>
                            <div className="mt-1 text-sm font-semibold text-slate-500">{level.subtitulo}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {completed && (
                              <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">Completado</span>
                            )}
                            {!completed && isNext && (
                              <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">Siguiente</span>
                            )}
                            {!unlocked && (
                              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Bloqueado</span>
                            )}
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-slate-700">{level.resumen}</p>
                        <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/75 p-4 text-sm text-slate-700">
                          {level.historia}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {level.modo === "boss" ? "Boss final" : `${CHARACTERS[level.rivalId]?.nombre || level.rivalId} · ${level.dificultadId}`}
                          </div>
                          <button
                            disabled={!unlocked}
                            onClick={() => startAdventureLevel(level.id)}
                            className={`rounded-[18px] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition ${unlocked ? "bg-slate-900 text-white hover:bg-slate-800" : "cursor-not-allowed border border-slate-300 bg-white text-slate-400"}`}
                          >
                            {completed ? "Rejugar" : unlocked ? "Jugar" : "Bloqueado"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(237,243,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                <div className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Premio final</div>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900">{ADVENTURE_ACHIEVEMENT.nombre}</h3>
                <p className="mt-3 text-sm text-slate-600">{ADVENTURE_ACHIEVEMENT.descripcion}</p>

                <div className={`mt-4 rounded-[24px] border px-4 py-4 text-sm ${adventureAchievementUnlocked ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white/80 text-slate-600"}`}>
                  {adventureAchievementUnlocked
                    ? "Logro desbloqueado. Ya sos parte de la historia de la 34."
                    : "Completa los 10 niveles para desbloquear este logro en el navegador."}
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(237,243,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                <div className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Checkpoint</div>
                <div className="mt-2 text-lg font-black tracking-[-0.03em] text-slate-900">
                  {nextAdventureLevel ? nextAdventureLevel.titulo : "Aventura completada"}
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {nextAdventureLevel
                    ? nextAdventureLevel.historia
                    : "La EPET 34 ya te reconoce como alguien que supero la puerta, los talleres y a sus tres guardianes."}
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(237,243,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                <div className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Estado</div>
                <div className="mt-3 text-sm font-medium text-slate-700">
                  {challengeMessage || "Tu progreso de aventura se guarda automaticamente."}
                </div>
              </section>
            </aside>
          </div>
        )}

        {screen === "menu" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(234,242,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
              {gameModeId === "duel" ? (
                <>
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-900">Elegi tu personaje</h2>
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
                </>
              ) : (
                <>
                  <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-900">Arma los 4 combatientes</h2>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      Local
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {ffaSlots.map((slot) => {
                      const slotCharacter = CHARACTERS[slot.characterId] || CHARACTERS.alan_soma;

                      return (
                        <div
                          key={slot.slotId}
                          className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Slot {slot.slotId + 1}</div>
                              <div className="text-lg font-black tracking-[-0.03em] text-slate-900">{slot.label}</div>
                            </div>
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                              {slotCharacter.nombre}
                            </span>
                          </div>

                          <select
                            value={slot.characterId}
                            onChange={(e) => updateFfaSlotCharacter(slot.slotId, e.target.value)}
                            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-400"
                          >
                            {Object.values(CHARACTERS).map((char) => (
                              <option key={`${slot.slotId}-${char.id}`} value={char.id}>
                                {char.nombre}
                              </option>
                            ))}
                          </select>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-700">
                            <div className="rounded-2xl bg-white/80 px-3 py-2">HP: <span className="font-black">{slotCharacter.hp}</span></div>
                            <div className="rounded-2xl bg-white/80 px-3 py-2">Ataque: <span className="font-black">{slotCharacter.ataque}</span></div>
                            <div className="rounded-2xl bg-white/80 px-3 py-2">Defensa: <span className="font-black">{slotCharacter.defensa}</span></div>
                            <div className="rounded-2xl bg-white/80 px-3 py-2">Velocidad: <span className="font-black">{slotCharacter.velocidad}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-[30px] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(237,243,248,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
              <div className="mb-5">
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Battle Setup</div>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">{gameMode.nombre}</h2>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Modo</div>
                <div className="mt-3 space-y-3">
                  {Object.values(GAME_MODES).map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setGameModeId(mode.id)}
                      className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${gameModeId === mode.id ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)]" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}
                    >
                      <div className="font-black">{mode.nombre}</div>
                    </button>
                  ))}
                </div>
              </div>

              {gameModeId === "duel" && (
                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white/80 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Dificultad</div>
                  <div className="mt-3 space-y-3">
                    {Object.values(DIFFICULTIES).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDifficultyId(d.id)}
                        className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${difficultyId === d.id ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)]" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}
                      >
                        <div className="font-black">{d.nombre}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (gameModeId === "free_for_all") {
                    startFreeForAllBattle();
                    return;
                  }

                  setSelectedId(roomSelectedCharacter || selectedId);
                  startBattle();
                }}
                className="mt-5 w-full rounded-[22px] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:brightness-110"
              >
                {gameModeId === "free_for_all" ? "Iniciar Free For All" : "Iniciar Showdown34"}
              </button>
            </section>
          </div>
        )}

        {isOnlineFfaBattle && onlineFfaPlayer && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_320px] xl:grid-cols-[minmax(0,1.55fr)_360px]">
            <section className="overflow-hidden rounded-[30px] border border-slate-900/15 bg-[linear-gradient(180deg,#f7f9fc_0%,#e2e9f1_100%)] p-3 shadow-[0_22px_60px_rgba(15,23,42,0.18)] md:p-5">
              <div className="mb-3 flex flex-row items-center justify-between gap-2 rounded-[24px] border border-slate-900/10 bg-white/80 px-3 py-2 shadow-sm md:mb-4 md:px-5 md:py-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Online Free For All</div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-slate-900 md:text-2xl">Turno {turn}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScreen("room")}
                    className="rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-white md:px-4 md:text-sm md:normal-case md:tracking-normal"
                  >
                    Sala
                  </button>
                  <button
                    onClick={() => setMobileLogOpen(true)}
                    className="lg:hidden rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-white"
                  >
                    Log
                  </button>
                </div>
              </div>

              <FfaBattleArena
                combatants={onlineFfaArenaCombatants}
                spriteStates={onlineFfaSpriteStates}
                turn={turn}
                arenaLabel="Free For All"
                turnNote={battleOver ? "Resultado final" : onlineFfaPlayer.pending ? "Esperando al resto" : "Elegí un movimiento"}
              />

              <div className="rounded-[28px] border border-slate-900/10 bg-white/80 p-3 shadow-sm md:p-4">
                <div className="mb-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Tu turno</div>
                  <div className="text-base font-black text-slate-900 md:text-lg">
                    {battleOver ? "La batalla terminó" : `${onlineFfaPlayer.username} usa ${onlineFfaPlayer.nombre}`}
                  </div>
                  {!battleOver && (
                    <div className="mt-1 text-sm text-slate-500">
                      {onlineFfaPlayer.pending ? "Ya mandaste tu movimiento." : "Elegí un movimiento y, si corresponde, un objetivo."}
                    </div>
                  )}
                </div>

                {!battleOver && (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {onlineFfaPlayer.ataques.map((move) => {
                        const usage = onlineFfaPlayer.usos[move.id];
                        const disabled = battleInputLocked || onlineFfaPlayer.pending || usage <= 0;
                        const isSelected = selectedMoveId === move.id;

                        return (
                          <button
                            key={`online-ffa-move-${move.id}`}
                            disabled={disabled}
                            onClick={() => handleMoveClick(move)}
                            className={`min-h-[72px] rounded-[22px] border px-3 py-2.5 text-left transition md:min-h-24 md:px-4 md:py-3 ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : isSelected ? "border-sky-500 bg-[linear-gradient(180deg,#1e293b_0%,#0f172a_100%)] text-slate-100 shadow-[0_12px_24px_rgba(14,165,233,0.18)]" : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)] text-slate-800 hover:border-sky-400 hover:bg-white"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-black tracking-[-0.02em] md:text-base">{move.nombre}</div>
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:text-xs">{move.tipo}</div>
                              </div>
                              <div className="rounded-full border border-slate-300 bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-500 md:text-xs">
                                {usage}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {onlineFfaSelectedMove?.tipo === "ataque" && !onlineFfaPlayer.pending && (
                      <div className="mt-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#e8f1f8_100%)] p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Elegí objetivo</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {onlineFfaCombatants
                            .filter((combatant) => !combatant.isMe && combatant.hpActual > 0)
                            .map((combatant) => (
                              <button
                                key={`online-target-${combatant.username}`}
                                onClick={() => submitOnlineFfaMove(onlineFfaSelectedMove, combatant.username)}
                                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"
                              >
                                <div className="font-black">{combatant.username}</div>
                                <div className="text-sm text-slate-500">{combatant.nombre} · {combatant.hpActual}/{combatant.hp} HP</div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
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
                    key={`online-ffa-log-${line}-${i}`}
                    className={`rounded-[20px] border px-4 py-3 text-sm shadow-sm ${i === 0 ? "border-sky-200 bg-sky-50 text-slate-800" : "border-slate-200 bg-white/80 text-slate-700"}`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {isFfaBattle && ffaCurrentPlayer && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_320px] xl:grid-cols-[minmax(0,1.55fr)_360px]">
            <section className="overflow-hidden rounded-[30px] border border-slate-900/15 bg-[linear-gradient(180deg,#f7f9fc_0%,#e2e9f1_100%)] p-3 shadow-[0_22px_60px_rgba(15,23,42,0.18)] md:p-5">
              <div className="mb-3 flex flex-row items-center justify-between gap-2 rounded-[24px] border border-slate-900/10 bg-white/80 px-3 py-2 shadow-sm md:mb-4 md:px-5 md:py-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">{isAdventureBossBattle ? "Aventura Boss" : "Free For All"}</div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-slate-900 md:text-2xl">Turno {turn}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBattleBack}
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

              <FfaBattleArena
                combatants={localFfaArenaCombatants}
                spriteStates={ffaSpriteStates}
                turn={turn}
                arenaLabel={isAdventureBossBattle ? "Guardianes de la 34" : "Free For All"}
                turnNote={battleOver ? "Resultado final" : isAdventureBossBattle ? "Vos eliges y los tres responden" : `${ffaCurrentPlayer.label} decide`}
                stageBackground={isAdventureBossBattle ? currentAdventureLevel?.fondo : null}
              />

              <div className="rounded-[28px] border border-slate-900/10 bg-white/80 p-3 shadow-sm md:p-4">
                <div className="mb-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Selección actual</div>
                  <div className="text-base font-black text-slate-900 md:text-lg">
                    {battleOver ? "La batalla terminó" : `${ffaCurrentPlayer.label} elige un movimiento`}
                  </div>
                  {!battleOver && (
                    <div className="mt-1 text-sm text-slate-500">
                      Personaje activo: <span className="font-black text-slate-900">{ffaCurrentPlayer.character.nombre}</span>
                    </div>
                  )}
                </div>

                {!battleOver && (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {ffaCurrentPlayer.character.ataques.map((move) => {
                        const usage = ffaCurrentPlayer.character.usos[move.id];
                        const disabled = battleInputLocked || usage <= 0;
                        const isSelected = selectedMoveId === move.id;

                        return (
                          <button
                            key={move.id}
                            disabled={disabled}
                            onClick={() => handleMoveClick(move)}
                            className={`min-h-[72px] rounded-[22px] border px-3 py-2.5 text-left transition md:min-h-24 md:px-4 md:py-3 ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : isSelected ? "border-sky-500 bg-[linear-gradient(180deg,#1e293b_0%,#0f172a_100%)] text-slate-100 shadow-[0_12px_24px_rgba(14,165,233,0.18)]" : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4f9_100%)] text-slate-800 hover:border-sky-400 hover:bg-white"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-black tracking-[-0.02em] md:text-base">{move.nombre}</div>
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:text-xs">{move.tipo}</div>
                              </div>
                              <div className="rounded-full border border-slate-300 bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-500 md:text-xs">
                                {usage}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {ffaSelectedMove?.tipo === "ataque" && (
                      <div className="mt-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#e8f1f8_100%)] p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Elegí objetivo</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {ffaPlayers
                            .map((fighter, index) => ({ fighter, index }))
                            .filter(({ fighter, index }) => index !== ffaCurrentPlayerIndex && fighter.character.hpActual > 0 && (!isAdventureBossBattle || fighter.isAi))
                            .map(({ fighter, index }) => (
                              <button
                                key={`target-${fighter.slotId}`}
                                onClick={() => commitFfaSelection(ffaSelectedMove, index)}
                                className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"
                              >
                                <div className="font-black">{fighter.label}</div>
                                <div className="text-sm text-slate-500">{fighter.character.nombre} · {fighter.character.hpActual}/{fighter.character.hp} HP</div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {battleOver && (
                  <div className="mt-3 rounded-[26px] border border-slate-900/10 bg-[linear-gradient(180deg,#fff7db_0%,#ffe4a3_100%)] p-3 text-center text-slate-900 shadow-sm md:mt-4 md:p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-700">Resultado</div>
                    <div className="mt-1 text-xl font-black md:text-2xl">{logs[0]}</div>
                    <button
                      onClick={handleReplayBattle}
                      className="mt-3 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 md:px-5 md:py-3 md:text-sm md:tracking-[0.18em]"
                    >
                      {isAdventureBossBattle ? "Reintentar nivel" : "Jugar otra vez"}
                    </button>
                  </div>
                )}
              </div>
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
                    key={`ffa-log-${line}-${i}`}
                    className={`rounded-[20px] border px-4 py-3 text-sm shadow-sm ${i === 0 ? "border-sky-200 bg-sky-50 text-slate-800" : "border-slate-200 bg-white/80 text-slate-700"}`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {screen === "battle" && gameModeId !== "free_for_all" && player && enemy && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_320px] xl:grid-cols-[minmax(0,1.55fr)_360px]">
            <section className="overflow-hidden rounded-[30px] border border-slate-900/15 bg-[linear-gradient(180deg,#f7f9fc_0%,#e2e9f1_100%)] p-2 shadow-[0_22px_60px_rgba(15,23,42,0.18)] md:p-5">
              <div className="mb-2 flex flex-row items-center justify-between gap-2 rounded-[24px] border border-slate-900/10 bg-white/80 px-3 py-2 shadow-sm md:mb-4 md:flex-row md:items-center md:justify-between md:px-5 md:py-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">{isAdventureBattle ? "Aventura EPET 34" : "Showdown34 Battle"}</div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-slate-900 md:text-2xl">Turno {turn}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBattleBack}
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
                  className="battle-stage-surface relative h-[290px] w-full overflow-hidden rounded-[22px] border border-slate-800/30 bg-cover bg-center bg-no-repeat md:h-[430px]"
                  style={currentAdventureStageStyle}
                >
                  <div className="battle-stage-overlay absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(15,23,42,0.06)_28%,rgba(15,23,42,0.18)_100%)]" />
                  <div className="battle-stage-floor absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.22)_100%)]" />
                  <div className="absolute left-1/2 top-[32%] h-8 w-28 -translate-x-1/2 rounded-full bg-slate-950/15 blur-md md:top-[28%] md:h-10 md:w-52" />
                  <div className="absolute bottom-5 left-1/2 h-8 w-40 -translate-x-1/2 rounded-full bg-slate-950/20 blur-md md:bottom-10 md:h-14 md:w-72" />

                  <HpPanel name={enemy.nombre} hp={enemy.hpActual} maxHp={enemy.hp} side="enemy" />
                  <div className="absolute bottom-8 left-[40%] z-20 h-32 w-40 -translate-x-1/2 md:bottom-6 md:left-[35%] md:z-10 md:h-56 md:w-72">
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
                  <div className="absolute bottom-[4.5rem] left-[68%] z-10 h-32 w-40 -translate-x-1/2 md:top-8 md:bottom-auto md:left-[65%] md:z-20 md:h-48 md:w-64">
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
                    const disabled = battleOver || battleInputLocked || player.usos[move.id] <= 0;
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
                          className={`pointer-events-none absolute inset-x-0 bottom-[calc(100%+0.55rem)] z-40 rounded-[20px] border border-slate-700/15 bg-slate-900/96 p-3 text-sm text-slate-100 shadow-2xl transition ${isPreviewOpen ? "visible opacity-100" : "invisible opacity-0 group-hover:visible group-hover:opacity-100"}`}
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
                    const disabled = battleOver || battleInputLocked || player.usos[move.id] <= 0;
                    const usage = player.usos[move.id];
                    const powerLabel = move.id === "tragar"
                      ? "5% 1000 · 55% 200 · 40% falla"
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
                        disabled={!selectedMove || battleInputLocked}
                        className={`rounded-2xl px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition md:px-4 md:py-3 md:text-sm md:normal-case md:tracking-normal ${!selectedMove || battleInputLocked ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
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
                    onClick={handleReplayBattle}
                    className="mt-3 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 md:px-5 md:py-3 md:text-sm md:tracking-[0.18em]"
                  >
                    {isAdventureBattle ? "Reintentar nivel" : "Jugar otra vez"}
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

        {screen === "battle" && mobileLogOpen && (isOnlineFfaBattle || (gameModeId === "free_for_all" && ffaPlayers.length > 0) || (gameModeId !== "free_for_all" && player && enemy)) && (
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


