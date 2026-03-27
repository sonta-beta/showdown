export function cloneCharacter(base) {
  return {
    ...base,
    hpActual: base.hp,
    ataqueBoost: 1,
    defensaBoost: 1,
    reboteTurno: false,
    esquivaAtaqueTurno: false,
    usos: Object.fromEntries(base.ataques.map((attack) => [attack.id, attack.limiteUso]))
  };
}

export function cloneFfaFighter(slot, characters) {
  const baseCharacter = characters[slot.characterId];

  return {
    slotId: slot.slotId,
    label: slot.label,
    characterId: baseCharacter.id,
    character: cloneCharacter(baseCharacter)
  };
}

export function getAliveFfaIndexes(fighters) {
  return fighters
    .map((fighter, index) => (fighter.character.hpActual > 0 ? index : -1))
    .filter((index) => index >= 0);
}

export function getAliveCombatants(combatants) {
  return combatants.filter((combatant) => combatant.character.hpActual > 0);
}

export function getNextPendingFfaPlayerIndex(fighters, selections, startIndex = -1) {
  for (let offset = 1; offset <= fighters.length; offset += 1) {
    const index = (startIndex + offset) % fighters.length;
    if (fighters[index].character.hpActual > 0 && !selections[index]) {
      return index;
    }
  }

  return -1;
}

export function resetTurnFlags(character) {
  return {
    ...character,
    reboteTurno: false,
    esquivaAtaqueTurno: false
  };
}

export function resetFfaRoundState(fighters) {
  return fighters.map((fighter) => ({
    ...fighter,
    character: resetTurnFlags(fighter.character)
  }));
}

export function resetCombatantsRound(combatants) {
  return combatants.map((combatant) => ({
    ...combatant,
    character: resetTurnFlags(combatant.character)
  }));
}

export function findCombatantIndex(combatants, username) {
  return combatants.findIndex((combatant) => combatant.username === username);
}

export function chooseFirstAttacker(firstMove, secondMove, firstSpeed, secondSpeed) {
  if ((firstMove.prioridad || 0) !== (secondMove.prioridad || 0)) {
    return (firstMove.prioridad || 0) > (secondMove.prioridad || 0);
  }

  return firstSpeed >= secondSpeed;
}

function randomInt(min, max, rng) {
  return Math.floor(rng.random() * (max - min + 1)) + min;
}

function roll(percent, rng) {
  return rng.random() * 100 < percent;
}

function rollTragarOutcome(rng) {
  const rollValue = rng.random() * 100;

  if (rollValue < 5) return { hit: true, poder: 1000 };
  if (rollValue < 60) return { hit: true, poder: 200 };
  return { hit: false, poder: 0 };
}

function rollBorrachoOutcome(rng) {
  const rollValue = rng.random() * 100;

  if (rollValue < 50) return { target: "enemy", poder: 50 };
  if (rollValue < 70) return { target: "enemy", poder: 100 };
  if (rollValue < 99) return { target: "self", poder: 30 };
  return { target: "enemy", poder: 1000 };
}

function rollGolpeInutilOutcome(move, rng) {
  return roll(20, rng) ? { ...move, poder: 150 } : move;
}

export function getDamage(attacker, defender, move, rng = Math) {
  const raw = ((22 * move.poder * (attacker.ataque * attacker.ataqueBoost)) /
    Math.max(1, defender.defensa * defender.defensaBoost)) / 50 + 2;
  const variance = randomInt(85, 100, rng) / 100;
  const baseDamage = raw * variance;
  const boostedDamage = baseDamage * 1.5;
  return Math.max(1, Math.floor(boostedDamage));
}

function applyIncomingAttack(attacker, defender, damage, options = {}) {
  if (defender.esquivaAtaqueTurno && !options.ignoreDodge) {
    return {
      damage: 0,
      reflectedDamage: 0,
      dodged: true,
      rebounded: false
    };
  }

  if (defender.reboteTurno) {
    const reboundedDamage = Math.max(1, Math.floor(damage * 0.5));
    const defenderHpBefore = defender.hpActual;
    const attackerHpBefore = attacker.hpActual;

    defender.hpActual = Math.max(0, defender.hpActual - reboundedDamage);
    attacker.hpActual = Math.max(0, attacker.hpActual - reboundedDamage);

    return {
      damage: defenderHpBefore - defender.hpActual,
      reflectedDamage: attackerHpBefore - attacker.hpActual,
      dodged: false,
      rebounded: true
    };
  }

  const defenderHpBefore = defender.hpActual;
  defender.hpActual = Math.max(0, defender.hpActual - damage);

  return {
    damage: defenderHpBefore - defender.hpActual,
    reflectedDamage: 0,
    dodged: false,
    rebounded: false
  };
}

export function resolveMove({
  attacker,
  defender,
  move,
  attackerLabel,
  defenderLabel,
  defenderPlannedMove,
  rng = Math
}) {
  const nextAttacker = {
    ...attacker,
    usos: { ...attacker.usos }
  };
  const nextDefender = {
    ...defender,
    usos: { ...defender.usos }
  };

  if ((nextAttacker.usos[move.id] ?? 0) <= 0) {
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerLabel} no tiene mas usos para ${move.nombre}.`
    };
  }

  nextAttacker.usos[move.id] -= 1;

  if (move.id === "rebote") {
    if (!roll(move.efectividad, rng)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} intento Rebote, pero fallo.`
      };
    }

    nextAttacker.reboteTurno = true;
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerLabel} uso Rebote: recibira la mitad del dano y devolvera la otra mitad este turno.`
    };
  }

  if (move.id === "lolero") {
    if (!roll(move.efectividad, rng)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} intento Lolero, pero fallo.`
      };
    }

    if (roll(5, rng)) {
      nextAttacker.hpActual = 0;
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} uso Lolero, engordo demasiado y murio.`
      };
    }

    const heal = Math.floor(nextAttacker.hp * 0.25);
    nextAttacker.hpActual = Math.min(nextAttacker.hp, nextAttacker.hpActual + heal);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerLabel} uso Lolero y recupero ${heal} de vida.`
    };
  }

  if (move.id === "tragar") {
    const outcome = rollTragarOutcome(rng);

    if (!outcome.hit) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} uso Tragar, pero fallo.`
      };
    }

    if (nextDefender.esquivaAtaqueTurno && outcome.poder === 1000) {
      const reducedMove = { ...move, poder: 200, efectividad: 100 };
      const damage = getDamage(nextAttacker, nextDefender, reducedMove, rng);
      const resolution = applyIncomingAttack(nextAttacker, nextDefender, damage, { ignoreDodge: true });
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: resolution.rebounded
          ? `${attackerLabel} uso Tragar, pero ${defenderLabel} evito el golpe letal y activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
          : `${attackerLabel} uso Tragar, pero ${defenderLabel} evito el golpe letal. Causo ${resolution.damage} de dano.`
      };
    }

    const resolvedMove = { ...move, poder: outcome.poder, efectividad: 100 };
    const damage = getDamage(nextAttacker, nextDefender, resolvedMove, rng);
    const resolution = applyIncomingAttack(nextAttacker, nextDefender, damage);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: resolution.rebounded
        ? outcome.poder === 1000
          ? `${attackerLabel} uso Tragar con potencia maxima, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
          : `${attackerLabel} uso Tragar con poder ${outcome.poder}, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
        : outcome.poder === 1000
        ? `${attackerLabel} uso Tragar con potencia maxima y causo ${resolution.damage} de dano.`
        : `${attackerLabel} uso Tragar con poder ${outcome.poder} y causo ${resolution.damage} de dano.`
    };
  }

  if (move.id === "kung_fu") {
    if (!roll(move.efectividad ?? 100, rng)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} uso Kung Fu, pero fallo.`
      };
    }

    const poweredMove = roll(10, rng) ? { ...move, poder: move.poder * 2 } : move;
    const damage = getDamage(nextAttacker, nextDefender, poweredMove, rng);
    const resolution = applyIncomingAttack(nextAttacker, nextDefender, damage);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: resolution.rebounded
        ? poweredMove.poder > move.poder
          ? `${attackerLabel} uso Kung Fu y duplico su poder, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
          : `${attackerLabel} uso Kung Fu, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
        : poweredMove.poder > move.poder
        ? `${attackerLabel} uso Kung Fu y duplico su poder, causando ${resolution.damage} de dano.`
        : `${attackerLabel} uso Kung Fu e hizo ${resolution.damage} de dano.`
    };
  }

  if (move.id === "borracho") {
    const outcome = rollBorrachoOutcome(rng);

    if (outcome.target === "self") {
      const selfMove = { ...move, poder: outcome.poder };
      const selfDamage = getDamage(nextAttacker, nextAttacker, selfMove, rng);
      nextAttacker.hpActual = Math.max(0, nextAttacker.hpActual - selfDamage);
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} uso Borracho y se daño a si mismo por ${selfDamage}.`
      };
    }

    const resolvedMove = { ...move, poder: outcome.poder };
    const damage = getDamage(nextAttacker, nextDefender, resolvedMove, rng);
    const resolution = applyIncomingAttack(nextAttacker, nextDefender, damage);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: resolution.rebounded
        ? outcome.poder === 1000
          ? `${attackerLabel} uso Borracho con un golpe devastador, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
          : outcome.poder === 100
          ? `${attackerLabel} uso Borracho con fuerza, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
          : `${attackerLabel} uso Borracho, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
        : outcome.poder === 1000
        ? `${attackerLabel} uso Borracho y desato un golpe devastador de ${resolution.damage} de dano.`
        : outcome.poder === 100
        ? `${attackerLabel} uso Borracho con fuerza y causo ${resolution.damage} de dano.`
        : `${attackerLabel} uso Borracho e hizo ${resolution.damage} de dano.`
    };
  }

  if (move.id === "correr") {
    if (!defenderPlannedMove || defenderPlannedMove.tipo !== "ataque") {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} intento Correr, pero ${defenderLabel} no ataco.`
      };
    }

    if (!roll(move.efectividad, rng)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} intento Correr, pero no pudo esquivar.`
      };
    }

    nextAttacker.esquivaAtaqueTurno = true;
    const damage = getDamage(nextAttacker, nextDefender, move, rng);
    nextDefender.hpActual = Math.max(0, nextDefender.hpActual - damage);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: `${attackerLabel} esquivo completamente el ataque y contraataco con Correr por ${damage} de daño.`
    };
  }

  if (move.id === "golpe_inutil") {
    if (!roll(move.efectividad ?? 100, rng)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} uso ${move.nombre}, pero fallo.`
      };
    }

    const poweredMove = rollGolpeInutilOutcome(move, rng);
    const damage = getDamage(nextAttacker, nextDefender, poweredMove, rng);
    const resolution = applyIncomingAttack(nextAttacker, nextDefender, damage);

    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: resolution.dodged
        ? `${attackerLabel} uso ${move.nombre}, pero ${defenderLabel} lo esquivo.`
        : resolution.rebounded
        ? poweredMove.poder > move.poder
          ? `${attackerLabel} uso ${move.nombre} con potencia 150, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
          : `${attackerLabel} uso ${move.nombre}, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
        : poweredMove.poder > move.poder
        ? `${attackerLabel} uso ${move.nombre} con potencia 150 e hizo ${resolution.damage} de dano.`
        : `${attackerLabel} uso ${move.nombre} e hizo ${resolution.damage} de dano.`
    };
  }

  if (move.tipo === "ataque") {
    if (!roll(move.efectividad ?? 100, rng)) {
      return {
        attacker: nextAttacker,
        defender: nextDefender,
        text: `${attackerLabel} uso ${move.nombre}, pero fallo.`
      };
    }

    const damage = getDamage(nextAttacker, nextDefender, move, rng);
    const resolution = applyIncomingAttack(nextAttacker, nextDefender, damage);
    return {
      attacker: nextAttacker,
      defender: nextDefender,
      text: resolution.dodged
        ? `${attackerLabel} uso ${move.nombre}, pero ${defenderLabel} lo esquivo.`
        : resolution.rebounded
        ? `${attackerLabel} uso ${move.nombre}, pero ${defenderLabel} activo Rebote: recibio ${resolution.damage} de dano y devolvio ${resolution.reflectedDamage}.`
        : `${attackerLabel} uso ${move.nombre} e hizo ${resolution.damage} de dano.`
    };
  }

  return {
    attacker: nextAttacker,
    defender: nextDefender,
    text: `${attackerLabel} no hizo nada.`
  };
}
