function randomInt(min, max, rng) {
  return Math.floor(rng.random() * (max - min + 1)) + min;
}

export function pickAiMove(currentEnemy, difficulty, rng = Math) {
  const available = currentEnemy.ataques.filter((attack) => currentEnemy.usos[attack.id] > 0);
  if (!available.length) return currentEnemy.ataques[0];

  const damaging = available.filter((attack) => attack.tipo === "ataque");
  const defensive = available.filter((attack) => attack.tipo === "defensivo");

  if (difficulty.id === "facil") {
    if (rng.random() < 0.5 && defensive.length > 0) {
      return defensive[randomInt(0, defensive.length - 1, rng)];
    }
    return available[randomInt(0, available.length - 1, rng)];
  }

  if (difficulty.id === "normal") {
    if (currentEnemy.id === "alan_soma" && currentEnemy.hpActual < currentEnemy.hp * 0.45) {
      const rebote = available.find((attack) => attack.id === "rebote");
      if (rebote && rng.random() < 0.45) return rebote;
    }

    if (currentEnemy.id === "ramon" && damaging.length > 0) {
      return rng.random() < difficulty.aiBiasStrong
        ? damaging.reduce((best, move) => ((move.poder || 0) > (best.poder || 0) ? move : best))
        : available[randomInt(0, available.length - 1, rng)];
    }

    return available[randomInt(0, available.length - 1, rng)];
  }

  if (currentEnemy.id === "alan_soma") {
    const tragar = available.find((attack) => attack.id === "tragar");
    const rebote = available.find((attack) => attack.id === "rebote");
    const golpe = available.find((attack) => attack.id === "golpe_de_gordo");

    if (tragar && rng.random() < 0.3) return tragar;
    if (rebote && currentEnemy.hpActual < currentEnemy.hp * 0.55 && rng.random() < 0.55) {
      return rebote;
    }
    if (golpe) return golpe;
  }

  if (currentEnemy.id === "ramon") {
    const infiel = available.find((attack) => attack.id === "infiel");
    const correr = available.find((attack) => attack.id === "correr");
    const golpe = available.find((attack) => attack.id === "golpe_inutil");

    if (correr && rng.random() < 0.35) return correr;
    if (infiel && rng.random() < 0.7) return infiel;
    if (golpe) return golpe;
  }

  return available[randomInt(0, available.length - 1, rng)];
}
