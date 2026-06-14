export type PlayerRef = {
  steamId?: string | null;
  name?: string | null;
};

export type ParsedKill = {
  killer: PlayerRef | null;
  victim: PlayerRef | null;
  assister?: PlayerRef | null;
  headshot: boolean;
  weapon?: string | null;
  tick: number;
  round: number | null;
};

export type ParsedDemo = {
  players: PlayerRef[];
  rounds: Array<{ number: number; start?: number | null; end?: number | null }>;
  kills: ParsedKill[];
  tickRate: number;
  metadata?: Record<string, unknown>;
};

export type HighlightMoment = {
  type: string;
  playerName: string | null;
  playerSteamId: string | null;
  roundNumber: number | null;
  startTick: number;
  endTick: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  kills: number;
  headshots: number;
  score: number;
  confidence: number;
  metadata: Record<string, unknown>;
};
