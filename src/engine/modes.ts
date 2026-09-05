import { buildLeague, defaultLineup, overall, startingPitchers, teamById } from "../data/league";
import type { BatterLine, CareerSave, FieldPosition, GameState, LineupSlot, ManagerSave, Player, Ratings, Team } from "../types";
import { createGame, playFullGame, totalRuns } from "./game";
import { clamp, hashString, rollFrom } from "./rng";

export const CAREER_ID = "career-hero";

const emptyLine = (playerId: string): BatterLine & CareerSave["seasonStats"] => ({
  playerId,
  ab: 0,
  r: 0,
  h: 0,
  rbi: 0,
  bb: 0,
  so: 0,
  hr: 0,
  doubles: 0,
  triples: 0,
  sb: 0,
  cs: 0,
  hbp: 0,
  sf: 0,
  ipOuts: 0,
  pitchRuns: 0,
  pitchK: 0,
  pitchBB: 0,
  wins: 0,
});

const ARCHETYPES: Record<string, Partial<Ratings> & { position?: FieldPosition; pitcherRole?: Player["pitcherRole"] }> = {
  slugger: { contact: 72, power: 86, eye: 68, speed: 48, fielding: 58, arm: 62 },
  contact: { contact: 86, power: 58, eye: 80, speed: 64, fielding: 70, arm: 60 },
  speedster: { contact: 70, power: 48, eye: 66, speed: 92, fielding: 78, arm: 64 },
  glove: { contact: 64, power: 52, eye: 62, speed: 68, fielding: 90, arm: 80 },
  ace: { velocity: 86, control: 80, movement: 84, stamina: 88, contact: 28, power: 22, eye: 30, speed: 40, fielding: 62, arm: 78, position: "P", pitcherRole: "SP" },
  closer: { velocity: 90, control: 74, movement: 88, stamina: 52, contact: 24, power: 20, eye: 28, speed: 38, fielding: 58, arm: 80, position: "P", pitcherRole: "CL" },
};

function baseRatings(): Ratings {
  return {
    contact: 64,
    power: 64,
    eye: 64,
    speed: 64,
    fielding: 64,
    arm: 64,
    velocity: 30,
    control: 30,
    movement: 28,
    stamina: 32,
  };
}

export type Archetype = keyof typeof ARCHETYPES;

export function createCareerPlayer(input: {
  name: string;
  position: FieldPosition;
  archetype: Archetype;
  risingStar: boolean;
  bats: Player["bats"];
  throws: Player["throws"];
}): Player {
  const arch = ARCHETYPES[input.archetype] ?? {};
  const ratings = { ...baseRatings(), ...arch };
  const bump = input.risingStar ? 6 : 0;
  (Object.keys(ratings) as (keyof Ratings)[]).forEach((key) => {
    ratings[key] = clamp(ratings[key] + bump);
  });
  return {
    id: CAREER_ID,
    name: input.name,
    position: arch.position ?? input.position,
    pitcherRole: arch.pitcherRole,
    bats: input.bats,
    throws: input.throws,
    ratings,
    age: input.risingStar ? 21 : 19,
    isCareer: true,
  };
}

export function injectCareerPlayer(team: Team, player: Player): Team {
  const copy = structuredClone(team);
  const idx =
    player.position === "P"
      ? copy.roster.findIndex((p) => p.pitcherRole === (player.pitcherRole ?? "SP"))
      : copy.roster.findIndex((p) => p.position === player.position);
  if (idx >= 0) copy.roster[idx] = { ...player };
  else copy.roster.unshift({ ...player });
  return copy;
}

export function newCareerSave(player: Player, teamId: string, risingStar: boolean): CareerSave {
  return {
    version: 1,
    player,
    teamId,
    level: risingStar ? "Rookie" : "Prospect",
    contract: risingStar ? { years: 3, salary: 720_000 } : { years: 1, salary: 180_000 },
    season: 1,
    games: 0,
    seasonStats: emptyLine(player.id),
    careerStats: emptyLine(player.id),
    xp: risingStar ? 40 : 0,
    log: [`Signed with the ${teamId} organization as a ${risingStar ? "rising star" : "prospect"}.`],
  };
}

function addStats(target: CareerSave["seasonStats"], add: CareerSave["seasonStats"]): void {
  (Object.keys(add) as (keyof CareerSave["seasonStats"])[]).forEach((key) => {
    if (key === "playerId") return;
    target[key] = Number(target[key]) + Number(add[key]);
  });
}

function statsFromGame(state: GameState, playerId: string): CareerSave["seasonStats"] {
  const side = state.home.team.roster.some((p) => p.id === playerId) ? state.home : state.away;
  const bat = side.batterStats[playerId];
  const pit = side.pitcherStats[playerId];
  const won =
    (state.winner === "home" && side === state.home) || (state.winner === "away" && side === state.away);
  return {
    playerId,
    ab: bat?.ab ?? 0,
    r: bat?.r ?? 0,
    h: bat?.h ?? 0,
    rbi: bat?.rbi ?? 0,
    bb: bat?.bb ?? 0,
    so: bat?.so ?? 0,
    hr: bat?.hr ?? 0,
    doubles: bat?.doubles ?? 0,
    triples: bat?.triples ?? 0,
    sb: bat?.sb ?? 0,
    cs: bat?.cs ?? 0,
    hbp: bat?.hbp ?? 0,
    sf: bat?.sf ?? 0,
    ipOuts: pit?.outs ?? 0,
    pitchRuns: pit?.runs ?? 0,
    pitchK: pit?.strikeouts ?? 0,
    pitchBB: pit?.walks ?? 0,
    wins: won ? 1 : 0,
  };
}

function bumpRatings(ratings: Ratings, amount: number, skip?: keyof Ratings): Ratings {
  const next = { ...ratings };
  (Object.keys(next) as (keyof Ratings)[]).forEach((key) => {
    if (key !== skip) next[key] = clamp(next[key] + amount);
  });
  return next;
}

function maybePromote(save: CareerSave): CareerSave {
  const next = { ...save, log: [...save.log] };
  const ladder: CareerSave["level"][] = ["Prospect", "Rookie", "Regular", "All-Star", "Superstar"];
  const idx = ladder.indexOf(next.level);
  const need = [80, 160, 280, 420, 9999][idx] ?? 9999;
  if (next.xp >= need && idx < ladder.length - 1) {
    next.level = ladder[idx + 1];
    next.contract = {
      years: Math.min(6, next.contract.years + 1),
      salary: Math.round(next.contract.salary * (next.level === "Superstar" ? 4 : 2.1)),
    };
    next.player = { ...next.player, ratings: bumpRatings(next.player.ratings, 2) };
    next.log.unshift(`Promoted to ${next.level}. New deal: $${next.contract.salary.toLocaleString()} / ${next.contract.years} yr.`);
  }
  return next;
}

export function applyCareerGame(save: CareerSave, state: GameState): CareerSave {
  if (save.lastGameId === state.id) return save;
  const earned = statsFromGame(state, save.player.id);
  const xpGain = earned.h * 6 + earned.hr * 14 + earned.rbi * 4 + earned.bb * 2 + earned.pitchK * 3 + earned.wins * 8 + 12;
  const next: CareerSave = {
    ...save,
    games: save.games + 1,
    seasonStats: { ...save.seasonStats },
    careerStats: { ...save.careerStats },
    xp: save.xp + xpGain,
    lastGameId: state.id,
    log: [`Game ${save.games + 1}: ${state.recap ?? "Final posted."} (+${xpGain} XP)`, ...save.log].slice(0, 24),
  };
  addStats(next.seasonStats, earned);
  addStats(next.careerStats, earned);
  if (earned.h + earned.hr + earned.pitchK > 3) {
    next.player = { ...next.player, ratings: bumpRatings(next.player.ratings, 1, "stamina") };
  }
  return maybePromote(next);
}

export function opponentForCareer(save: CareerSave, seed = Date.now()): Team {
  const league = buildLeague();
  const others = league.filter((t) => t.id !== save.teamId);
  const pick = others[Math.floor(rollFrom(hashString(`${save.teamId}-${save.games}-${seed}`)).value * others.length)] ?? others[0];
  return pick;
}

export function createCareerGame(save: CareerSave, home: boolean, rules: { dh: boolean; extraInningRunner: boolean }, seed?: number): GameState {
  const league = buildLeague();
  const club = injectCareerPlayer(teamById(league, save.teamId), save.player);
  const foe = opponentForCareer(save, seed);
  return createGame({
    away: home ? foe : club,
    home: home ? club : foe,
    rules,
    seed,
    homeStarterId: home && save.player.position === "P" ? save.player.id : undefined,
    awayStarterId: !home && save.player.position === "P" ? save.player.id : undefined,
  });
}

export function newManagerSave(teamId: string): ManagerSave {
  const league = buildLeague();
  const team = teamById(league, teamId);
  const { lineup } = defaultLineup(team, true);
  const standings: ManagerSave["standings"] = {};
  for (const club of league) standings[club.id] = { w: 0, l: 0, rs: 0, ra: 0 };
  const schedule: ManagerSave["schedule"] = [];
  const others = league.filter((t) => t.id !== teamId);
  others.forEach((opp, i) => {
    schedule.push({ homeId: i % 2 === 0 ? teamId : opp.id, awayId: i % 2 === 0 ? opp.id : teamId, played: false });
    schedule.push({ homeId: i % 2 === 0 ? opp.id : teamId, awayId: i % 2 === 0 ? teamId : opp.id, played: false });
  });
  return {
    version: 1,
    teamId,
    season: 1,
    day: 1,
    lineup,
    starterIndex: 0,
    standings,
    schedule,
    trades: [],
    acquired: [],
    departedIds: [],
    log: [`Hired as skipper of the ${team.city} ${team.name}.`],
  };
}

export function teamWithMoves(team: Team, save: ManagerSave): Team {
  const incoming = save.acquired.filter((p) => !save.departedIds.includes(p.id));
  return {
    ...team,
    roster: [...team.roster.filter((p) => !save.departedIds.includes(p.id)), ...incoming],
  };
}

export function nextManagerGame(save: ManagerSave): ManagerSave["schedule"][number] | undefined {
  return save.schedule.find((g) => !g.played && (g.homeId === save.teamId || g.awayId === save.teamId));
}

export function createManagerGame(save: ManagerSave, rules: { dh: boolean; extraInningRunner: boolean }, seed?: number): GameState {
  const league = buildLeague();
  const fixture = nextManagerGame(save);
  if (!fixture) throw new Error("Season complete");
  const rawHome = teamById(league, fixture.homeId);
  const rawAway = teamById(league, fixture.awayId);
  const home = fixture.homeId === save.teamId ? teamWithMoves(rawHome, save) : rawHome;
  const away = fixture.awayId === save.teamId ? teamWithMoves(rawAway, save) : rawAway;
  const game = createGame({ away, home, rules, seed });
  const userSide = fixture.homeId === save.teamId ? game.home : game.away;
  userSide.lineup = save.lineup;
  const rotation = startingPitchers(userSide.team);
  const starter = rotation[save.starterIndex % rotation.length];
  if (starter) userSide.pitcherId = starter.id;
  return game;
}

function recordResult(save: ManagerSave, homeId: string, awayId: string, homeScore: number, awayScore: number): void {
  save.standings[homeId].rs += homeScore;
  save.standings[homeId].ra += awayScore;
  save.standings[awayId].rs += awayScore;
  save.standings[awayId].ra += homeScore;
  if (homeScore === awayScore) return;
  const winner = homeScore > awayScore ? homeId : awayId;
  const loser = winner === homeId ? awayId : homeId;
  save.standings[winner].w += 1;
  save.standings[loser].l += 1;
}

export function applyManagerGame(save: ManagerSave, state: GameState): ManagerSave {
  if (save.lastGameId === state.id) return save;
  const next = structuredClone(save);
  next.lastGameId = state.id;
  const fixture = next.schedule.find((g) => !g.played && g.homeId === state.home.team.id && g.awayId === state.away.team.id);
  if (fixture) {
    fixture.played = true;
    fixture.homeScore = totalRuns(state.home);
    fixture.awayScore = totalRuns(state.away);
  }
  recordResult(next, state.home.team.id, state.away.team.id, totalRuns(state.home), totalRuns(state.away));
  next.day += 1;
  next.starterIndex += 1;
  next.log.unshift(state.recap ?? "Game final.");
  const league = buildLeague();
  const others = next.schedule.filter((g) => !g.played && g.homeId !== next.teamId && g.awayId !== next.teamId).slice(0, 2);
  for (const game of others) {
    const simulated = playFullGame(
      createGame({
        away: teamById(league, game.awayId),
        home: teamById(league, game.homeId),
        seed: hashString(`${next.day}-${game.homeId}-${game.awayId}`),
      }),
    );
    game.played = true;
    game.homeScore = totalRuns(simulated.home);
    game.awayScore = totalRuns(simulated.away);
    recordResult(next, game.homeId, game.awayId, game.homeScore, game.awayScore);
  }
  return next;
}

export function simNextManagerGame(save: ManagerSave): ManagerSave {
  const game = createManagerGame(save, { dh: true, extraInningRunner: true });
  return applyManagerGame(save, playFullGame(game));
}

export function tradePlayers(save: ManagerSave, outgoingId: string, incomingTeamId: string, incomingId: string): ManagerSave {
  const league = buildLeague();
  const user = teamById(league, save.teamId);
  const other = teamById(league, incomingTeamId);
  const outgoing = [...user.roster, ...save.acquired].find((p) => p.id === outgoingId);
  const incoming = other.roster.find((p) => p.id === incomingId);
  if (!outgoing || !incoming) return save;
  const next = structuredClone(save);
  next.departedIds = [...next.departedIds, outgoingId];
  next.acquired = [...next.acquired.filter((p) => p.id !== outgoingId), { ...incoming }];
  next.lineup = next.lineup.map((slot) => (slot.playerId === outgoingId ? { ...slot, playerId: incomingId } : slot));
  next.trades.unshift(`Traded ${outgoing.name} to ${other.city} for ${incoming.name} (${overall(incoming)} OVR).`);
  next.log.unshift(next.trades[0]);
  return next;
}

export function average(stats: CareerSave["seasonStats"]): string {
  if (!stats.ab) return ".000";
  return (stats.h / stats.ab).toFixed(3).replace(/^0/, "");
}

export function era(stats: CareerSave["seasonStats"]): string {
  if (!stats.ipOuts) return "-";
  return ((stats.pitchRuns * 27) / stats.ipOuts).toFixed(2);
}

export function inningsPitched(outs: number): string {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

export function sortedStandings(save: ManagerSave): { id: string; w: number; l: number; rs: number; ra: number }[] {
  return Object.entries(save.standings)
    .map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => b.w - a.w || a.l - b.l || b.rs - a.rs);
}

export { overall };

export function formatLineup(team: Team, lineup: LineupSlot[]): { slot: LineupSlot; player: Player }[] {
  return lineup.map((slot) => ({
    slot,
    player: team.roster.find((p) => p.id === slot.playerId) ?? team.roster[0],
  }));
}
