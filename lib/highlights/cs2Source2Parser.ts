import { parseEvent, parseHeader, parsePlayerInfo } from "@laihoe/demoparser2";
import type { ParsedDemo, PlayerRef } from "./types";

const toArray = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => (Array.isArray(item) ? item : [item])) as Array<Record<string, unknown>>;
  }
  return [];
};

const readFirst = (record: Record<string, unknown> | null | undefined, keys: string[], fallback: unknown = null) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const normalizeRound = (record: Record<string, unknown>) => {
  const value = Number(readFirst(record, ["total_rounds_played", "round", "round_number"], 0));
  return Number.isFinite(value) ? value + 1 : null;
};

const eventTick = (record: Record<string, unknown>) => Number(readFirst(record, ["tick"], 0)) || 0;

const playerRef = (record: Record<string, unknown>, role: string): PlayerRef | null => {
  const steamId = String(readFirst(record, [`${role}_steamid`, `${role}_steamId`, `${role}_steam_id`, `${role}_xuid`], ""));
  if (!steamId || steamId === "0") return null;
  return {
    steamId,
    name: String(readFirst(record, [`${role}_name`, `${role}_player_name`, `${role}_user_name`], "Unknown"))
  };
};

const parseEventsSafe = (filePath: string, eventName: string, playerExtra = ["team_name"], otherExtra = ["total_rounds_played"]) => {
  try {
    const output = parseEvent(filePath, eventName, playerExtra, otherExtra);
    if (Array.isArray(output)) return output as Array<Record<string, unknown>>;
    const keyed = (output as Record<string, unknown>)?.[eventName];
    return keyed ? toArray(keyed) : toArray(output);
  } catch (error) {
    console.warn("[upload-debug] parser event FAILURE", {
      filePath,
      eventName,
      message: error instanceof Error ? error.message : "Unknown parser event error"
    });
    return [];
  }
};

export function parseCs2Source2Demo(filePath: string): ParsedDemo {
  console.info("[upload-debug] parser header START", { filePath });
  const header = parseHeader(filePath) as Record<string, unknown>;
  console.info("[upload-debug] parser header SUCCESS", { filePath });
  const deaths = parseEventsSafe(filePath, "player_death");
  const roundStarts = parseEventsSafe(filePath, "round_start", [], ["total_rounds_played"]);
  const roundEnds = parseEventsSafe(filePath, "round_end", [], ["total_rounds_played"]);
  const playersBySteamId = new Map<string, PlayerRef>();

  console.info("[upload-debug] parser player-info START", { filePath });
  toArray(parsePlayerInfo(filePath)).forEach((player) => {
    const steamId = String(readFirst(player, ["steamid", "steamId", "steam_id", "xuid"], ""));
    if (!steamId) return;
    playersBySteamId.set(steamId, {
      steamId,
      name: String(readFirst(player, ["name", "player_name", "user_name"], "Unknown"))
    });
  });
  console.info("[upload-debug] parser player-info SUCCESS", { filePath, players: playersBySteamId.size });

  const kills = deaths.map((event) => {
    const killer = playerRef(event, "attacker");
    const victim = playerRef(event, "user");
    if (killer?.steamId && !playersBySteamId.has(killer.steamId)) playersBySteamId.set(killer.steamId, killer);
    if (victim?.steamId && !playersBySteamId.has(victim.steamId)) playersBySteamId.set(victim.steamId, victim);

    return {
      killer,
      victim,
      assister: playerRef(event, "assister"),
      headshot: Boolean(readFirst(event, ["headshot"], false)),
      weapon: String(readFirst(event, ["weapon"], "unknown")),
      tick: eventTick(event),
      round: normalizeRound(event)
    };
  });

  const roundsByNumber = new Map<number, { number: number; start?: number | null; end?: number | null }>();
  roundStarts.forEach((event) => {
    const roundNumber = normalizeRound(event);
    if (roundNumber) roundsByNumber.set(roundNumber, { number: roundNumber, start: eventTick(event), end: null });
  });
  roundEnds.forEach((event) => {
    const roundNumber = normalizeRound(event);
    if (!roundNumber) return;
    const round = roundsByNumber.get(roundNumber) || { number: roundNumber, start: null };
    round.end = eventTick(event);
    roundsByNumber.set(roundNumber, round);
  });

  return {
    players: Array.from(playersBySteamId.values()),
    rounds: Array.from(roundsByNumber.values()).sort((left, right) => left.number - right.number),
    kills,
    tickRate: Number(readFirst(header, ["tickrate", "tickRate", "tick_rate"], 64)) || 64,
    metadata: { parser: "demoparser2", header }
  };
}
