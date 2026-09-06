import { bullpen, defaultLineup, findPlayer as findInLeague } from "../data/league";
import type {
  Approach,
  BatterLine,
  CommentaryLine,
  GameAction,
  GameRules,
  GameState,
  PitcherLine,
  PitchPlan,
  PitchType,
  Player,
  Runner,
  Team,
  TeamGame,
} from "../types";
import {
  batterIntro,
  callCount,
  crowdFor,
  halfInningCard,
  ordinal,
  pitchName,
  radioOpen,
  recapFor,
} from "./commentary";
import { rollFrom } from "./rng";

const PITCH_TYPES: PitchType[] = ["fourSeam", "sinker", "slider", "curve", "change", "cutter"];

function emptyBatter(playerId: string): BatterLine {
  return {
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
  };
}

function emptyPitcher(playerId: string, started: boolean): PitcherLine {
  return {
    playerId,
    pitches: 0,
    outs: 0,
    runs: 0,
    earnedRuns: 0,
    hits: 0,
    walks: 0,
    strikeouts: 0,
    homeRuns: 0,
    started,
  };
}

function roll(state: GameState): number {
  const next = rollFrom(state.rngState);
  state.rngState = next.seed;
  return next.value;
}

function addLine(state: GameState, text: string, tone: CommentaryLine["tone"] = "call"): void {
  state.eventSeq += 1;
  state.commentary.unshift({
    id: `call-${state.eventSeq}`,
    text,
    tone,
    inning: state.inning,
    half: state.half,
  });
  state.commentary = state.commentary.slice(0, 80);
  state.lastPlay = text;
}

export function offense(state: GameState): TeamGame {
  return state.half === "top" ? state.away : state.home;
}

export function defense(state: GameState): TeamGame {
  return state.half === "top" ? state.home : state.away;
}

export function findPlayer(state: GameState, id: string): Player {
  const found = [...state.home.team.roster, ...state.away.team.roster].find((p) => p.id === id);
  if (!found) throw new Error(`Missing player ${id}`);
  return found;
}

export function currentBatter(state: GameState): Player {
  const side = offense(state);
  const slot = side.lineup[side.battingOrderIndex];
  return findPlayer(state, slot.playerId);
}

export function currentPitcher(state: GameState): Player {
  return findPlayer(state, defense(state).pitcherId);
}

export function totalRuns(side: TeamGame): number {
  return side.scoreByInning.reduce((sum, n) => sum + n, 0);
}

function batterLine(side: TeamGame, id: string): BatterLine {
  side.batterStats[id] ??= emptyBatter(id);
  return side.batterStats[id];
}

function pitcherLine(side: TeamGame, id: string): PitcherLine {
  side.pitcherStats[id] ??= emptyPitcher(id, false);
  return side.pitcherStats[id];
}

function ensureInningBucket(side: TeamGame, inning: number): void {
  while (side.scoreByInning.length < inning) side.scoreByInning.push(0);
}

function buildTeamGame(team: Team, rules: GameRules, starterId?: string): TeamGame {
  const { lineup, bench } = defaultLineup(team, rules.dh);
  const starter = team.roster.find((p) => p.id === starterId) ?? team.roster.find((p) => p.pitcherRole === "SP") ?? team.roster[13];
  const pen = bullpen(team).map((p) => p.id);
  const stats: TeamGame["batterStats"] = {};
  const pitcherStats: TeamGame["pitcherStats"] = {};
  for (const player of team.roster) {
    if (player.position === "P") pitcherStats[player.id] = emptyPitcher(player.id, player.id === starter.id);
    else stats[player.id] = emptyBatter(player.id);
  }
  if (starter) pitcherStats[starter.id] = emptyPitcher(starter.id, true);
  return {
    team,
    lineup,
    battingOrderIndex: 0,
    bench,
    bullpen: pen,
    pitcherId: starter.id,
    scoreByInning: [],
    hits: 0,
    errors: 0,
    batterStats: stats,
    pitcherStats,
  };
}

export function createGame(input: {
  away: Team;
  home: Team;
  rules?: Partial<GameRules>;
  awayStarterId?: string;
  homeStarterId?: string;
  seed?: number;
}): GameState {
  const rules: GameRules = { dh: true, extraInningRunner: true, ...input.rules };
  const seed = input.seed ?? Date.now() % 2_147_483_647;
  const state: GameState = {
    id: `g-${seed}`,
    seed,
    rngState: seed,
    rules,
    away: buildTeamGame(input.away, rules, input.awayStarterId),
    home: buildTeamGame(input.home, rules, input.homeStarterId),
    inning: 1,
    half: "top",
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: [null, null, null],
    commentary: [],
    isComplete: false,
    winner: null,
    recap: null,
    lastPlay: null,
    pitchType: null,
    eventSeq: 0,
  };
  addLine(state, radioOpen(`${input.away.city} ${input.away.name}`, `${input.home.city} ${input.home.name}`, input.home.park), "radio");
  addLine(state, batterIntro(currentBatter(state), currentPitcher(state)), "radio");
  return state;
}

function resetCount(state: GameState): void {
  state.balls = 0;
  state.strikes = 0;
}

function nextBatter(state: GameState): void {
  const side = offense(state);
  side.battingOrderIndex = (side.battingOrderIndex + 1) % side.lineup.length;
  resetCount(state);
  if (!state.isComplete) {
    addLine(state, batterIntro(currentBatter(state), currentPitcher(state)), "radio");
  }
}

function scoreRun(state: GameState, runner: Runner, rbi: number, earned = true): void {
  const off = offense(state);
  const def = defense(state);
  ensureInningBucket(off, state.inning);
  off.scoreByInning[state.inning - 1] += 1;
  batterLine(off, runner.playerId).r += 1;
  if (rbi) batterLine(off, currentBatter(state).id).rbi += rbi;
  const p = pitcherLine(def, runner.responsiblePitcherId);
  p.runs += 1;
  if (earned) p.earnedRuns += 1;
}

function occupy(state: GameState, base: 0 | 1 | 2, runner: Runner | null): void {
  state.bases[base] = runner;
}

function forceAdvanceOnWalk(state: GameState, batter: Runner): number {
  const [first, second, third] = state.bases;
  let scored = 0;
  if (first && second && third) {
    scoreRun(state, third, 1);
    scored = 1;
    occupy(state, 2, second);
    occupy(state, 1, first);
  } else if (first && second) {
    occupy(state, 2, second);
    occupy(state, 1, first);
  } else if (first) {
    occupy(state, 1, first);
  }
  occupy(state, 0, batter);
  return scored;
}

function clearBases(state: GameState): Runner[] {
  const runners = state.bases.filter((r): r is Runner => r !== null);
  state.bases = [null, null, null];
  return runners;
}

function recordOut(state: GameState, n = 1): void {
  state.outs += n;
  pitcherLine(defense(state), defense(state).pitcherId).outs += n;
}

function maybeExtraRunner(state: GameState): void {
  if (!state.rules.extraInningRunner || state.inning < 10) return;
  const side = offense(state);
  const prevIndex = (side.battingOrderIndex + side.lineup.length - 1) % side.lineup.length;
  const ghost = side.lineup[prevIndex];
  occupy(state, 1, { playerId: ghost.playerId, responsiblePitcherId: defense(state).pitcherId });
  addLine(state, `Automatic runner on second to start the ${state.half} of the ${ordinal(state.inning)}.`, "radio");
}

function endHalf(state: GameState, runs: number, hits: number): void {
  addLine(state, halfInningCard(state, runs, hits), "score");
  state.outs = 0;
  resetCount(state);
  state.bases = [null, null, null];
  const walkoff = state.half === "bottom" && state.inning >= 9 && totalRuns(state.home) > totalRuns(state.away);
  if (walkoff) {
    finish(state, "home");
    return;
  }
  if (state.half === "top") {
    if (state.inning >= 9 && totalRuns(state.home) > totalRuns(state.away)) {
      finish(state, "home");
      return;
    }
    state.half = "bottom";
    maybeExtraRunner(state);
    addLine(state, `Bottom of the ${ordinal(state.inning)}. ${state.home.team.city} coming to the plate.`, "radio");
    addLine(state, batterIntro(currentBatter(state), currentPitcher(state)), "radio");
    return;
  }
  if (state.inning >= 9 && totalRuns(state.home) !== totalRuns(state.away)) {
    finish(state, totalRuns(state.home) > totalRuns(state.away) ? "home" : "away");
    return;
  }
  state.half = "top";
  state.inning += 1;
  maybeExtraRunner(state);
  addLine(state, `We move to the ${ordinal(state.inning)}.`, "radio");
  addLine(state, batterIntro(currentBatter(state), currentPitcher(state)), "radio");
}

function finish(state: GameState, winner: "home" | "away"): void {
  state.isComplete = true;
  state.winner = winner;
  state.recap = recapFor(state);
  addLine(state, `Final: ${state.away.team.abbr} ${totalRuns(state.away)}, ${state.home.team.abbr} ${totalRuns(state.home)}.`, "score");
  addLine(state, state.recap, "radio");
}

function checkInningOver(state: GameState, halfRuns: number, halfHits: number): boolean {
  if (state.outs >= 3) {
    endHalf(state, halfRuns, halfHits);
    return true;
  }
  return false;
}

function pitchType(state: GameState): PitchType {
  const pitcher = currentPitcher(state);
  const bias = pitcher.ratings.movement > pitcher.ratings.velocity ? 0.55 : 0.35;
  if (roll(state) < 0.34) return "fourSeam";
  if (roll(state) < bias) return roll(state) < 0.5 ? "slider" : "curve";
  return PITCH_TYPES[Math.floor(roll(state) * PITCH_TYPES.length)];
}

function matchup(state: GameState, approach: Approach, plan: PitchPlan): { zone: boolean; swing: boolean; contact: number; power: number } {
  const batter = currentBatter(state);
  const pitcher = currentPitcher(state);
  const fatigue = Math.max(0, pitcherLine(defense(state), pitcher.id).pitches - (40 + pitcher.ratings.stamina * 0.7));
  const stuff = (pitcher.ratings.velocity + pitcher.ratings.movement + pitcher.ratings.control) / 3 - fatigue * 0.15;
  const bat = (batter.ratings.contact + batter.ratings.eye + batter.ratings.power) / 3;
  const platoon = batter.bats !== "S" && batter.bats === pitcher.throws ? 3 : 0;
  const zoneChance = plan === "nibble" ? 0.42 : plan === "pitchout" ? 0.12 : 0.58 + (pitcher.ratings.control - 70) / 220;
  const zone = roll(state) < zoneChance;
  let swingChance = zone ? 0.72 + (approach === "aggressive" ? 0.12 : approach === "patient" ? -0.16 : 0) : 0.28 + (approach === "aggressive" ? 0.18 : approach === "patient" ? -0.1 : 0);
  swingChance += (70 - batter.ratings.eye) / 260;
  if (plan === "pitchout") swingChance *= 0.35;
  const swing = roll(state) < swingChance;
  const contact = (bat - stuff + platoon + (zone ? 8 : -14) + (approach === "aggressive" ? -3 : 0)) / 100;
  const power = (batter.ratings.power - stuff * 0.45 + (zone ? 6 : -8)) / 100;
  return { zone, swing, contact, power };
}

function creditHit(off: TeamGame, pLine: PitcherLine, line: BatterLine): void {
  line.ab += 1;
  line.h += 1;
  off.hits += 1;
  pLine.hits += 1;
}

function putInPlay(state: GameState, contact: number, power: number): { runs: number; hits: number } {
  const batter = currentBatter(state);
  const pitcher = currentPitcher(state);
  const off = offense(state);
  const def = defense(state);
  const quality = contact + (roll(state) - 0.5) * 0.7;
  const lift = roll(state);
  const smash = quality + power + (roll(state) - 0.5) * 0.55;
  const runner = { playerId: batter.id, responsiblePitcherId: pitcher.id };
  const line = batterLine(off, batter.id);
  const pLine = pitcherLine(def, pitcher.id);
  let runs = 0;
  let hits = 0;

  if (roll(state) < 0.016) {
    def.errors += 1;
    line.ab += 1;
    const [first] = state.bases;
    if (first && roll(state) < 0.4) occupy(state, 1, first);
    occupy(state, 0, runner);
    addLine(state, `Chopper to the left side — and it gets through! E on the infield. ${batter.name} reaches.`, "crowd");
    return { runs, hits };
  }

  if (smash > 0.38 && lift > 0.6 && roll(state) < 0.055 + Math.max(0, power) * 0.1) {
    creditHit(off, pLine, line);
    line.hr += 1;
    pLine.homeRuns += 1;
    hits += 1;
    const onBase = clearBases(state);
    for (const man of onBase) {
      scoreRun(state, man, 1);
      runs += 1;
    }
    scoreRun(state, runner, 1);
    runs += 1;
    addLine(state, `A high drive — that ball is GONE! ${batter.name} with ${onBase.length + 1} on the swing.`, "crowd");
    addLine(state, crowdFor(runs, state.half === "bottom" && state.inning >= 9 && totalRuns(state.home) > totalRuns(state.away)), "crowd");
    return { runs, hits };
  }

  const babip = 0.278 + quality * 0.1 + batter.ratings.speed / 900;
  const isHit = roll(state) < babip;

  if (!isHit) {
    if (lift > 0.64 && state.bases[2] && state.outs < 2 && quality > -0.12) {
      line.ab += 1;
      line.sf += 1;
      const tagged = findPlayer(state, state.bases[2].playerId);
      scoreRun(state, state.bases[2], 1);
      occupy(state, 2, null);
      runs += 1;
      recordOut(state, 1);
      addLine(state, `Sacrifice fly. ${tagged.name} tags and the run scores.`, "score");
      return { runs, hits };
    }
    if (lift < 0.4 && state.bases[0] && state.outs < 2 && roll(state) < 0.42) {
      line.ab += 1;
      recordOut(state, state.outs === 0 && roll(state) < 0.55 ? 2 : 1);
      const [first, second, third] = state.bases;
      if (state.outs >= 3) {
        addLine(state, `Ground ball, two gone if they turn it — double play! Inning over.`, "call");
        occupy(state, 0, null);
        occupy(state, 1, null);
        return { runs, hits };
      }
      occupy(state, 0, null);
      if (third && roll(state) < 0.28) {
        scoreRun(state, third, 0);
        occupy(state, 2, null);
        runs += 1;
      }
      if (second) occupy(state, 2, second);
      occupy(state, 1, first);
      addLine(state, `Ground ball, they get the lead runner. ${batter.name} is out at first.`, "call");
      return { runs, hits };
    }
    line.ab += 1;
    recordOut(state, 1);
    if (lift > 0.55) addLine(state, `${batter.name} lifts one to the warning track — caught. Out number ${Math.min(state.outs, 3)}.`, "call");
    else addLine(state, `Chopper, 6-3, ${batter.name} is retired.`, "call");
    return { runs, hits };
  }

  const extra = roll(state);
  if (smash > 0.22 && lift > 0.5 && batter.ratings.speed > 80 && extra < 0.05) {
    creditHit(off, pLine, line);
    line.triples += 1;
    hits += 1;
    const [first, second, third] = state.bases;
    if (third) {
      scoreRun(state, third, 1);
      runs += 1;
    }
    if (second) {
      scoreRun(state, second, 1);
      runs += 1;
    }
    if (first) {
      scoreRun(state, first, 1);
      runs += 1;
    }
    state.bases = [null, null, runner];
    addLine(state, `${batter.name} rips one into the gap and flies to third. A triple!`, "crowd");
    return { runs, hits };
  }

  if (smash > 0.12 && lift > 0.34 && extra < 0.2) {
    creditHit(off, pLine, line);
    line.doubles += 1;
    hits += 1;
    const [first, second, third] = state.bases;
    if (third) {
      scoreRun(state, third, 1);
      runs += 1;
    }
    if (second) {
      scoreRun(state, second, 1);
      runs += 1;
    }
    occupy(state, 2, first ?? null);
    occupy(state, 1, runner);
    occupy(state, 0, null);
    addLine(state, `Lined into the gap! ${batter.name} is in with a stand-up double.`, "crowd");
    return { runs, hits };
  }

  creditHit(off, pLine, line);
  hits += 1;
  const [first, second, third] = state.bases;
  if (third) {
    scoreRun(state, third, 1);
    runs += 1;
    occupy(state, 2, null);
  }
  if (second) {
    if (batter.ratings.speed > 78 && roll(state) < 0.22) {
      scoreRun(state, second, 1);
      runs += 1;
    } else {
      occupy(state, 2, second);
    }
  }
  occupy(state, 1, first);
  occupy(state, 0, runner);
  addLine(state, `Base hit! ${batter.name} punches it through. ${runs ? `${runs} run${runs === 1 ? "" : "s"} in.` : "Man aboard."}`, "call");
  return { runs, hits };
}

function concludePA(state: GameState, halfRuns: number, halfHits: number): GameState {
  if (checkInningOver(state, halfRuns, halfHits)) return state;
  if (state.half === "bottom" && state.inning >= 9 && totalRuns(state.home) > totalRuns(state.away)) {
    finish(state, "home");
    return state;
  }
  nextBatter(state);
  return state;
}

function deliverPitch(state: GameState, approach: Approach, plan: PitchPlan): GameState {
  const batter = currentBatter(state);
  const pitcher = currentPitcher(state);
  const type = pitchType(state);
  state.pitchType = type;
  const named = pitchName(state.rngState, type);
  state.rngState = named.seed;
  pitcherLine(defense(state), pitcher.id).pitches += 1;

  if (plan === "pitchout") {
    addLine(state, `${pitcher.name} steps off and fires a pitchout.`, "call");
  }

  const { zone, swing, contact, power } = matchup(state, approach, plan);

  if (!swing) {
    if (zone) {
      state.strikes += 1;
      addLine(state, `${named.text}, taken. Strike ${state.strikes}.`);
      if (state.strikes >= 3) {
        batterLine(offense(state), batter.id).ab += 1;
        batterLine(offense(state), batter.id).so += 1;
        pitcherLine(defense(state), pitcher.id).strikeouts += 1;
        recordOut(state, 1);
        addLine(state, `${batter.name} is frozen. Strike three looking.`, "crowd");
        return concludePA(state, 0, 0);
      }
    } else {
      state.balls += 1;
      addLine(state, `${named.text} misses. Ball ${state.balls}.`);
      if (state.balls >= 4) {
        batterLine(offense(state), batter.id).bb += 1;
        pitcherLine(defense(state), pitcher.id).walks += 1;
        const scored = forceAdvanceOnWalk(state, { playerId: batter.id, responsiblePitcherId: pitcher.id });
        addLine(state, `${batter.name} walks.${scored ? " That forces a run." : ""}`, scored ? "score" : "call");
        return concludePA(state, scored, 0);
      }
    }
    addLine(state, callCount(state), "radio");
    return state;
  }

  if (roll(state) < 0.035) {
    batterLine(offense(state), batter.id).hbp += 1;
    const scored = forceAdvanceOnWalk(state, { playerId: batter.id, responsiblePitcherId: pitcher.id });
    addLine(state, `That one got away — ${batter.name} is hit by the pitch.`, "crowd");
    return concludePA(state, scored, 0);
  }

  const miss = roll(state) > 0.58 + contact;
  if (miss) {
    state.strikes += 1;
    addLine(state, `Swing and a miss at ${named.text}. Strike ${state.strikes}.`);
    if (state.strikes >= 3) {
      batterLine(offense(state), batter.id).ab += 1;
      batterLine(offense(state), batter.id).so += 1;
      pitcherLine(defense(state), pitcher.id).strikeouts += 1;
      recordOut(state, 1);
      addLine(state, `${batter.name} chases. Struck him out swinging.`, "crowd");
      return concludePA(state, 0, 0);
    }
    addLine(state, callCount(state), "radio");
    return state;
  }

  if (roll(state) < 0.34 - Math.max(-0.08, contact * 0.1)) {
    if (state.strikes < 2) state.strikes += 1;
    addLine(state, `Fouled away. Still ${state.balls} and ${state.strikes}.`);
    return state;
  }

  const play = putInPlay(state, contact, power);
  return concludePA(state, play.runs, play.hits);
}

function steal(state: GameState): GameState {
  const from: 0 | 1 | 2 | null = state.bases[2] ? 2 : state.bases[1] ? 1 : state.bases[0] ? 0 : null;
  if (from === null) {
    addLine(state, "Nobody on. No steal to attempt.", "radio");
    return state;
  }
  const runner = state.bases[from];
  if (!runner) {
    addLine(state, "Nobody on. No steal to attempt.", "radio");
    return state;
  }
  const player = findPlayer(state, runner.playerId);
  const catcherSlot = defense(state).lineup.find((slot) => slot.position === "C");
  const arm = catcherSlot ? findPlayer(state, catcherSlot.playerId).ratings.arm : 68;
  const success = roll(state) < 0.28 + player.ratings.speed / 160 - arm / 400;
  if (from === 2) {
    if (success && state.outs < 2) {
      scoreRun(state, runner, 0);
      occupy(state, 2, null);
      batterLine(offense(state), runner.playerId).sb += 1;
      addLine(state, `${player.name} steals home! Unbelievable.`, "crowd");
      if (state.half === "bottom" && state.inning >= 9 && totalRuns(state.home) > totalRuns(state.away)) finish(state, "home");
    } else {
      recordOut(state, 1);
      occupy(state, 2, null);
      batterLine(offense(state), runner.playerId).cs += 1;
      addLine(state, `${player.name} is thrown out at the plate.`, "call");
      checkInningOver(state, 0, 0);
    }
    return state;
  }
  const dest = (from + 1) as 1 | 2;
  if (state.bases[dest]) {
    addLine(state, "The next bag is occupied. They hold.", "radio");
    return state;
  }
  if (success) {
    occupy(state, dest, runner);
    occupy(state, from, null);
    batterLine(offense(state), runner.playerId).sb += 1;
    addLine(state, `${player.name} is off and running — stolen base!`, "crowd");
  } else {
    recordOut(state, 1);
    occupy(state, from, null);
    batterLine(offense(state), runner.playerId).cs += 1;
    addLine(state, `Caught stealing. ${player.name} is cut down.`, "call");
    checkInningOver(state, 0, 0);
  }
  return state;
}

function bunt(state: GameState): GameState {
  const batter = currentBatter(state);
  const pitcher = currentPitcher(state);
  const runner = { playerId: batter.id, responsiblePitcherId: pitcher.id };
  pitcherLine(defense(state), pitcher.id).pitches += 1;
  const quality = roll(state) + currentBatter(state).ratings.contact / 400;
  if (quality < 0.18) {
    batterLine(offense(state), batter.id).ab += 1;
    batterLine(offense(state), batter.id).so += 1;
    pitcherLine(defense(state), pitcher.id).strikeouts += 1;
    recordOut(state, 1);
    addLine(state, `${batter.name} misses the bunt. Strike three.`, "call");
    return concludePA(state, 0, 0);
  }
  if (quality < 0.42 || state.outs >= 2) {
    batterLine(offense(state), batter.id).ab += 1;
    recordOut(state, 1);
    addLine(state, `Bunt popped up — out. ${batter.name} couldn't get it down.`, "call");
    return concludePA(state, 0, 0);
  }
  const [first, second, third] = state.bases;
  let runs = 0;
  if (third && state.outs < 2 && roll(state) < 0.35) {
    scoreRun(state, third, 1);
    occupy(state, 2, null);
    runs += 1;
  } else if (second) occupy(state, 2, second);
  if (first) occupy(state, 1, first);
  occupy(state, 0, quality > 0.88 ? runner : null);
  if (quality > 0.88) {
    batterLine(offense(state), batter.id).ab += 1;
    batterLine(offense(state), batter.id).h += 1;
    offense(state).hits += 1;
    addLine(state, `Perfect bunt! ${batter.name} beats it out.`, "crowd");
    return concludePA(state, runs, 1);
  }
  batterLine(offense(state), batter.id).ab += 1;
  recordOut(state, 1);
  addLine(state, `Sacrifice bunt. The runners move up.`, "call");
  return concludePA(state, runs, 0);
}

function intentionalWalk(state: GameState): GameState {
  const batter = currentBatter(state);
  const pitcher = currentPitcher(state);
  batterLine(offense(state), batter.id).bb += 1;
  pitcherLine(defense(state), pitcher.id).walks += 1;
  pitcherLine(defense(state), pitcher.id).pitches += 4;
  const scored = forceAdvanceOnWalk(state, { playerId: batter.id, responsiblePitcherId: pitcher.id });
  addLine(state, `They put four wide ones up. Intentional walk to ${batter.name}.`, "radio");
  return concludePA(state, scored, 0);
}

function pinchHit(state: GameState, playerId: string): GameState {
  const side = offense(state);
  if (!side.bench.includes(playerId)) {
    addLine(state, "That pinch-hitter isn't available.", "radio");
    return state;
  }
  const slot = side.lineup[side.battingOrderIndex];
  const outgoing = findPlayer(state, slot.playerId);
  side.lineup = side.lineup.map((s, idx) => (idx === side.battingOrderIndex ? { ...s, playerId } : s));
  side.bench = side.bench.filter((id) => id !== playerId);
  side.bench.push(slot.playerId);
  batterLine(side, playerId);
  addLine(state, `Pinch-hit: ${findPlayer(state, playerId).name} for ${outgoing.name}.`, "radio");
  addLine(state, batterIntro(currentBatter(state), currentPitcher(state)), "radio");
  return state;
}

function changePitcher(state: GameState, playerId: string): GameState {
  const side = defense(state);
  if (!side.bullpen.includes(playerId) && !side.team.roster.some((p) => p.id === playerId && p.position === "P")) {
    addLine(state, "That arm isn't in the pen tonight.", "radio");
    return state;
  }
  const outgoing = findPlayer(state, side.pitcherId);
  side.pitcherId = playerId;
  side.bullpen = side.bullpen.filter((id) => id !== playerId);
  pitcherLine(side, playerId).started = pitcherLine(side, playerId).started;
  addLine(state, `Mound visit. ${findPlayer(state, playerId).name} takes over for ${outgoing.name}.`, "radio");
  return state;
}

export function applyAction(input: GameState, action: GameAction): GameState {
  if (input.isComplete) return input;
  const state = structuredClone(input);
  switch (action.type) {
    case "pitch":
      return deliverPitch(state, action.approach ?? "normal", action.plan ?? "challenge");
    case "steal":
      return steal(state);
    case "bunt":
      return bunt(state);
    case "intentionalWalk":
      return intentionalWalk(state);
    case "pinchHit":
      return pinchHit(state, action.playerId);
    case "changePitcher":
      return changePitcher(state, action.playerId);
    default:
      return state;
  }
}

export function autoPlay(state: GameState, until: (next: GameState, prev: GameState) => boolean): GameState {
  let current = state;
  let guard = 0;
  while (!current.isComplete && guard < 4000 && !until(current, state)) {
    current = applyAction(current, { type: "pitch" });
    guard += 1;
  }
  return current;
}

export function playHalfInning(state: GameState): GameState {
  const inning = state.inning;
  const half = state.half;
  return autoPlay(state, (next) => next.isComplete || next.inning !== inning || next.half !== half);
}

export function playFullGame(state: GameState): GameState {
  return autoPlay(state, (next) => next.isComplete);
}

export function playerFromLeague(teams: Team[], id: string): Player | undefined {
  return findInLeague(teams, id);
}
