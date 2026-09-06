export type Hand = "L" | "R" | "S";
export type FieldPosition = "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH" | "P";
export type PitcherRole = "SP" | "RP" | "CL";
export type PitchType = "fourSeam" | "sinker" | "slider" | "curve" | "change" | "cutter";
export type Half = "top" | "bottom";
export type Approach = "normal" | "aggressive" | "patient";
export type PitchPlan = "challenge" | "nibble" | "pitchout";

export interface Ratings {
  contact: number;
  power: number;
  eye: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  control: number;
  movement: number;
  stamina: number;
}

export interface Player {
  id: string;
  name: string;
  position: FieldPosition;
  pitcherRole?: PitcherRole;
  bats: Hand;
  throws: Hand;
  ratings: Ratings;
  age: number;
  isCareer?: boolean;
}

export interface Franchise {
  id: string;
  city: string;
  name: string;
  abbr: string;
  park: string;
  conference: "American" | "National";
  colors: { primary: string; secondary: string; accent: string };
}

export interface Team extends Franchise {
  roster: Player[];
}

export interface LineupSlot {
  playerId: string;
  position: FieldPosition;
}

export interface Runner {
  playerId: string;
  responsiblePitcherId: string;
}

export interface BatterLine {
  playerId: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
  doubles: number;
  triples: number;
  sb: number;
  cs: number;
  hbp: number;
  sf: number;
}

export interface PitcherLine {
  playerId: string;
  pitches: number;
  outs: number;
  runs: number;
  earnedRuns: number;
  hits: number;
  walks: number;
  strikeouts: number;
  homeRuns: number;
  started: boolean;
}

export interface CommentaryLine {
  id: string;
  text: string;
  tone: "call" | "crowd" | "score" | "radio";
  inning: number;
  half: Half;
}

export interface GameRules {
  dh: boolean;
  extraInningRunner: boolean;
}

export interface TeamGame {
  team: Team;
  lineup: LineupSlot[];
  battingOrderIndex: number;
  bench: string[];
  bullpen: string[];
  pitcherId: string;
  scoreByInning: number[];
  hits: number;
  errors: number;
  batterStats: Record<string, BatterLine>;
  pitcherStats: Record<string, PitcherLine>;
}

export interface GameState {
  id: string;
  seed: number;
  rngState: number;
  rules: GameRules;
  away: TeamGame;
  home: TeamGame;
  inning: number;
  half: Half;
  outs: number;
  balls: number;
  strikes: number;
  bases: [Runner | null, Runner | null, Runner | null];
  commentary: CommentaryLine[];
  isComplete: boolean;
  winner: "home" | "away" | null;
  recap: string | null;
  lastPlay: string | null;
  pitchType: PitchType | null;
  eventSeq: number;
}

export type GameAction =
  | { type: "pitch"; approach?: Approach; plan?: PitchPlan }
  | { type: "steal" }
  | { type: "bunt" }
  | { type: "intentionalWalk" }
  | { type: "pinchHit"; playerId: string }
  | { type: "changePitcher"; playerId: string };

export interface CareerSave {
  version: 1;
  player: Player;
  teamId: string;
  level: "Prospect" | "Rookie" | "Regular" | "All-Star" | "Superstar";
  contract: { years: number; salary: number };
  season: number;
  games: number;
  seasonStats: BatterLine & { ipOuts: number; pitchRuns: number; pitchK: number; pitchBB: number; wins: number };
  careerStats: BatterLine & { ipOuts: number; pitchRuns: number; pitchK: number; pitchBB: number; wins: number };
  xp: number;
  lastGameId?: string;
  log: string[];
}

export interface ManagerSave {
  version: 1;
  teamId: string;
  season: number;
  day: number;
  lineup: LineupSlot[];
  starterIndex: number;
  standings: Record<string, { w: number; l: number; rs: number; ra: number }>;
  schedule: { homeId: string; awayId: string; played: boolean; homeScore?: number; awayScore?: number }[];
  trades: string[];
  acquired: Player[];
  departedIds: string[];
  lastGameId?: string;
  log: string[];
}

export type Screen =
  | { name: "home" }
  | { name: "quick-setup" }
  | { name: "game"; source: "quick" | "career" | "manager" }
  | { name: "career" }
  | { name: "career-create" }
  | { name: "manager" }
  | { name: "manager-setup" };
