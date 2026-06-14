import type { HighlightMoment, ParsedDemo, ParsedKill } from "./types";

const byRound = (kills: ParsedKill[]) =>
  kills.reduce((map, kill) => {
    const round = kill.round || 0;
    const current = map.get(round) || [];
    current.push(kill);
    map.set(round, current);
    return map;
  }, new Map<number, ParsedKill[]>());

const playerKey = (kill: ParsedKill) => kill.killer?.steamId || kill.killer?.name || null;

const buildMoment = (type: string, events: ParsedKill[], tickRate: number): HighlightMoment => {
  const sorted = [...events].sort((left, right) => left.tick - right.tick);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const headshots = sorted.filter((event) => event.headshot).length;
  const kills = sorted.length;
  const typeBonus = type === "clutch" ? 18 : type === "multi-kill" ? 12 : 5;
  const headshotBonus = headshots * 4;
  const score = kills * 20 + typeBonus + headshotBonus;

  return {
    type,
    playerName: first.killer?.name || null,
    playerSteamId: first.killer?.steamId || null,
    roundNumber: first.round,
    startTick: Math.max(0, first.tick - Math.round(tickRate * 4)),
    endTick: last.tick + Math.round(tickRate * 5),
    startTimeSeconds: Math.max(0, first.tick / tickRate - 4),
    endTimeSeconds: last.tick / tickRate + 5,
    kills,
    headshots,
    score,
    confidence: Math.min(0.98, 0.54 + kills * 0.12 + headshots * 0.05),
    metadata: {
      weapon: first.weapon || "unknown",
      eventTicks: sorted.map((event) => event.tick),
      victims: sorted.map((event) => event.victim?.name || "Unknown")
    }
  };
};

export function selectHighlightCandidates(parsedDemo: ParsedDemo, { maxCandidates = 12 } = {}) {
  const kills = (parsedDemo.kills || []).filter((kill) => Number.isFinite(kill.tick) && kill.tick > 0 && kill.killer);
  console.info("[upload-debug] detection input SUCCESS", {
    players: parsedDemo.players.length,
    rounds: parsedDemo.rounds.length,
    kills: parsedDemo.kills.length,
    eligibleKills: kills.length,
    maxCandidates
  });
  const killsByRound = byRound(kills);
  const moments: HighlightMoment[] = [];

  for (const [, roundKills] of killsByRound.entries()) {
    const sorted = [...roundKills].sort((left, right) => left.tick - right.tick);
    const byKiller = new Map<string, ParsedKill[]>();

    sorted.forEach((kill) => {
      const key = playerKey(kill);
      if (!key) return;
      const current = byKiller.get(key) || [];
      current.push(kill);
      byKiller.set(key, current);
    });

    byKiller.forEach((playerKills) => {
      if (playerKills.length >= 2) moments.push(buildMoment("multi-kill", playerKills, parsedDemo.tickRate));
    });

    const lastTwo = sorted.slice(-2);
    if (lastTwo.length === 2 && playerKey(lastTwo[0]) === playerKey(lastTwo[1])) {
      moments.push(buildMoment("clutch", lastTwo, parsedDemo.tickRate));
    }

    const entry = sorted[0];
    if (entry) moments.push(buildMoment(entry.headshot ? "headshot-entry" : "entry-frag", [entry], parsedDemo.tickRate));
  }

  const candidates = moments.sort((left, right) => right.score - left.score).slice(0, maxCandidates);
  console.info("[upload-debug] detection output SUCCESS", {
    rawMoments: moments.length,
    candidates: candidates.length
  });
  return candidates;
}
