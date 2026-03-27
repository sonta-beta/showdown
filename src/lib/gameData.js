export const CHARACTERS = {
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
        descripcion: "Golpe basico confiable."
      }
    ]
  },
  ramon: {
    id: "ramon",
    nombre: "Ramon",
    hp: 400,
    ataque: 12,
    defensa: 8,
    velocidad: 15,
    descripcion: "Rapido, agresivo y ahora mucho mas resistente.",
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
        nombre: "Golpe inutil",
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
    descripcion: "Caotico y arriesgado: puede curarse, golpear fuerte o destruirse solo.",
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
        descripcion: "Golpea al rival con un ataque de kung fu asiatico. Tiene 10% de probabilidad de duplicar su poder."
      },
      {
        id: "borracho",
        nombre: "Borracho",
        tipo: "ataque",
        efectividad: 100,
        limiteUso: 12,
        descripcion: "50% poder 50 al rival, 20% poder 100 al rival, 29% dañarse a si mismo con poder 30 y 1% golpear al rival con poder 1000."
      }
    ]
  }
};

export const DIFFICULTIES = {
  facil: {
    id: "facil",
    nombre: "Facil",
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
    nombre: "Dificil",
    aiBiasStrong: 0.7,
    aiDelayLabel: "IA agresiva"
  }
};

export const GAME_MODES = {
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

export function buildDefaultFfaSlots() {
  const characterIds = Object.keys(CHARACTERS);

  return Array.from({ length: 4 }, (_, index) => ({
    slotId: index,
    label: `Jugador ${index + 1}`,
    characterId: characterIds[index % characterIds.length]
  }));
}

export function getMoveDetails(move) {
  const details = [];

  if (move.id === "tragar") {
    details.push("5% poder 1000");
    details.push("55% poder 200");
    details.push("40% falla");
  } else if (move.id === "golpe_inutil") {
    details.push("80% poder 20");
    details.push("20% poder 150");
  } else if (move.id === "rebote") {
    details.push("Recibe 50%");
    details.push("Devuelve 50%");
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

export function getSpriteFileName(spriteKey, variant, pose = "normal") {
  return pose === "normal"
    ? `${spriteKey}_${variant}.png`
    : `${spriteKey}_${variant}_${pose}.png`;
}
