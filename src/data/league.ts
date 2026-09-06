import type { Franchise, Player, Ratings, Team } from "../types";
import { FIRST_NAMES, LAST_NAMES } from "./names";
import { clamp, hashString, pick, rollFrom } from "../engine/rng";

export const FRANCHISES: Franchise[] = [
  {
    id: "beacons",
    city: "Boston",
    name: "Beacons",
    abbr: "BOS",
    park: "Harbor Light Park",
    conference: "American",
    colors: { primary: "#0b1f4b", secondary: "#c8102e", accent: "#f4e7c5" },
  },
  {
    id: "knights",
    city: "New York",
    name: "Knights",
    abbr: "NYK",
    park: "Gotham Yard",
    conference: "American",
    colors: { primary: "#13294b", secondary: "#c4a46a", accent: "#f7f4ea" },
  },
  {
    id: "wind",
    city: "Chicago",
    name: "Wind",
    abbr: "CHW",
    park: "Lakefront Field",
    conference: "American",
    colors: { primary: "#1d4e89", secondary: "#c8102e", accent: "#ffffff" },
  },
  {
    id: "stars",
    city: "Houston",
    name: "Stars",
    abbr: "HOU",
    park: "Prairie Dome",
    conference: "American",
    colors: { primary: "#002d62", secondary: "#eb6e1f", accent: "#ffffff" },
  },
  {
    id: "palms",
    city: "Los Angeles",
    name: "Palms",
    abbr: "LAP",
    park: "Sunset Coliseum",
    conference: "National",
    colors: { primary: "#005a9c", secondary: "#d4a017", accent: "#ffffff" },
  },
  {
    id: "fog",
    city: "San Francisco",
    name: "Fog",
    abbr: "SFO",
    park: "Bayview Park",
    conference: "National",
    colors: { primary: "#1a1a1a", secondary: "#ff6600", accent: "#f4e7c5" },
  },
  {
    id: "arch",
    city: "St. Louis",
    name: "Arch",
    abbr: "STL",
    park: "Riverbend Grounds",
    conference: "National",
    colors: { primary: "#8c1d18", secondary: "#0b1f4b", accent: "#f4e7c5" },
  },
  {
    id: "peaches",
    city: "Atlanta",
    name: "Peaches",
    abbr: "ATL",
    park: "Peachtree Yard",
    conference: "National",
    colors: { primary: "#0c2340", secondary: "#ce1141", accent: "#f4e7c5" },
  },
];

const POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;

function rate(seed: number, base: number, spread: number): { value: number; seed: number } {
  const rolled = rollFrom(seed);
  return { value: clamp(base + (rolled.value - 0.5) * spread), seed: rolled.seed };
}

function ratingsFor(seed: number, kind: "bat" | "pitch", quality: number): { ratings: Ratings; seed: number } {
  let s = seed;
  const take = (base: number, spread: number) => {
    const next = rate(s, base, spread);
    s = next.seed;
    return next.value;
  };
  if (kind === "pitch") {
    return {
      ratings: {
        contact: take(28, 16),
        power: take(22, 14),
        eye: take(32, 16),
        speed: take(36, 18),
        fielding: take(48 + quality * 0.2, 16),
        arm: take(62 + quality * 0.2, 14),
        velocity: take(quality, 18),
        control: take(quality - 4, 18),
        movement: take(quality - 2, 18),
        stamina: take(quality - 6, 22),
      },
      seed: s,
    };
  }
  return {
    ratings: {
      contact: take(quality, 16),
      power: take(quality - 2, 20),
      eye: take(quality - 4, 16),
      speed: take(quality - 8, 22),
      fielding: take(quality - 6, 18),
      arm: take(quality - 8, 16),
      velocity: take(28, 12),
      control: take(28, 12),
      movement: take(26, 12),
      stamina: take(30, 12),
    },
    seed: s,
  };
}

function makePlayer(seed: number, index: number, teamId: string): { player: Player; seed: number } {
  let s = seed;
  const first = pick(s, FIRST_NAMES);
  s = first.seed;
  const last = pick(s, LAST_NAMES);
  s = last.seed;
  const batsRoll = rollFrom(s);
  s = batsRoll.seed;
  const throwsRoll = rollFrom(s);
  s = throwsRoll.seed;
  const ageRoll = rollFrom(s);
  s = ageRoll.seed;

  let position: Player["position"] = "P";
  let pitcherRole: Player["pitcherRole"];
  let quality = 68;
  if (index < 9) {
    position = POSITIONS[index];
    quality = 72 + (8 - index) * 1.4;
  } else if (index < 13) {
    position = POSITIONS[index % 8];
    quality = 62;
  } else if (index < 18) {
    position = "P";
    pitcherRole = "SP";
    quality = 74 - (index - 13) * 3;
  } else if (index === 18) {
    position = "P";
    pitcherRole = "CL";
    quality = 78;
  } else {
    position = "P";
    pitcherRole = "RP";
    quality = 66;
  }

  const built = ratingsFor(s, position === "P" ? "pitch" : "bat", quality);
  s = built.seed;
  return {
    player: {
      id: `${teamId}-${index}`,
      name: `${first.item} ${last.item}`,
      position,
      pitcherRole,
      bats: batsRoll.value < 0.18 ? "L" : batsRoll.value < 0.9 ? "R" : "S",
      throws: throwsRoll.value < 0.28 ? "L" : "R",
      ratings: built.ratings,
      age: 22 + Math.floor(ageRoll.value * 14),
    },
    seed: s,
  };
}

export function generateRoster(franchise: Franchise): Player[] {
  let seed = hashString(`roster-${franchise.id}-v1`);
  const roster: Player[] = [];
  for (let i = 0; i < 26; i += 1) {
    const next = makePlayer(seed, i, franchise.id);
    roster.push(next.player);
    seed = next.seed;
  }
  return roster;
}

export function buildLeague(): Team[] {
  return FRANCHISES.map((franchise) => ({
    ...franchise,
    roster: generateRoster(franchise),
  }));
}

export function defaultLineup(team: Team, dh: boolean): { lineup: { playerId: string; position: Player["position"] }[]; bench: string[] } {
  const bats = team.roster.filter((p) => p.position !== "P");
  const starters = bats.slice(0, dh ? 9 : 8);
  const lineup = starters.map((player, idx) => ({
    playerId: player.id,
    position: dh ? player.position : idx < 8 ? player.position : player.position,
  }));
  if (!dh) {
    const starter = team.roster.find((p) => p.pitcherRole === "SP");
    if (starter) lineup.push({ playerId: starter.id, position: "P" });
  }
  const used = new Set(lineup.map((slot) => slot.playerId));
  return {
    lineup,
    bench: bats.filter((p) => !used.has(p.id)).map((p) => p.id),
  };
}

export function startingPitchers(team: Team): Player[] {
  return team.roster.filter((p) => p.pitcherRole === "SP");
}

export function bullpen(team: Team): Player[] {
  return team.roster.filter((p) => p.pitcherRole === "RP" || p.pitcherRole === "CL");
}

export function findPlayer(teams: Team[], id: string): Player | undefined {
  for (const team of teams) {
    const found = team.roster.find((p) => p.id === id);
    if (found) return found;
  }
  return undefined;
}

export function teamById(teams: Team[], id: string): Team {
  const team = teams.find((t) => t.id === id);
  if (!team) throw new Error(`Unknown team ${id}`);
  return team;
}

export const CLASSIC_MATCHUPS = [
  { label: "Harbor Rivalry", awayId: "knights", homeId: "beacons" },
  { label: "Bay Classic", awayId: "palms", homeId: "fog" },
  { label: "River Series", awayId: "wind", homeId: "arch" },
  { label: "Southern Lights", awayId: "stars", homeId: "peaches" },
] as const;

export function overall(player: Player): number {
  const r = player.ratings;
  if (player.position === "P") {
    return Math.round((r.velocity + r.control + r.movement + r.stamina) / 4);
  }
  return Math.round((r.contact + r.power + r.eye + r.speed + r.fielding) / 5);
}
