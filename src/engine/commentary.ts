import type { GameState, PitchType, Player } from "../types";
import { rollFrom } from "./rng";

const PITCH_NAMES: Record<PitchType, string[]> = {
  fourSeam: ["the four-seamer", "a riding fastball", "heat up in the zone", "the heater"],
  sinker: ["a heavy sinker", "a two-seamer that dives", "a bowling-ball sinker"],
  slider: ["a biting slider", "a slider on the black", "a late-breaking slider"],
  curve: ["a big overhand curve", "a 12-to-6 curve", "a slow hammer"],
  change: ["a fading changeup", "a changeup that dies", "the change of pace"],
  cutter: ["a sharp cutter", "a cut fastball in on the hands", "a late cutter"],
};

function choose(seed: number, lines: string[]): { text: string; seed: number } {
  const rolled = rollFrom(seed);
  return { text: lines[Math.floor(rolled.value * lines.length)] ?? lines[0], seed: rolled.seed };
}

export function pitchName(seed: number, type: PitchType): { text: string; seed: number } {
  return choose(seed, PITCH_NAMES[type]);
}

export function callCount(state: GameState): string {
  if (state.balls === 3 && state.strikes === 2) return "Full count. Everybody's on their feet.";
  if (state.strikes === 2) return `Two strikes. ${state.balls} and 2.`;
  return `The count is ${state.balls} and ${state.strikes}.`;
}

export function radioOpen(away: string, home: string, park: string): string {
  return `From ${park}, a packed house for ${away} at ${home}. The lights are up, the grass is cut, and we are underway.`;
}

export function halfInningCard(state: GameState, runs: number, hits: number): string {
  const label = state.half === "top" ? "Top" : "Bottom";
  const team = state.half === "top" ? state.away.team : state.home.team;
  if (runs === 0) {
    return `${label} of the ${ordinal(state.inning)} is in the books. ${team.city} goes quietly. Hits: ${hits}.`;
  }
  return `${label} of the ${ordinal(state.inning)}: ${team.city} puts ${runs} on the board. Hits: ${hits}.`;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

export function recapFor(state: GameState): string {
  const awayRuns = totalRuns(state, "away");
  const homeRuns = totalRuns(state, "home");
  const winner = homeRuns === awayRuns ? null : homeRuns > awayRuns ? state.home : state.away;
  const loser = winner === state.home ? state.away : state.home;
  const hrHitters = Object.values({ ...state.home.batterStats, ...state.away.batterStats })
    .filter((line) => line.hr > 0)
    .map((line) => playerName(state, line.playerId));
  const starter = bestStarter(state);
  const extra = state.inning > 9 ? ` It took ${state.inning} innings.` : "";
  const dinger = hrHitters.length ? ` ${hrHitters.slice(0, 2).join(" and ")} went deep.` : "";
  if (!winner) {
    return `Final from ${state.home.team.park}: ${state.away.team.city} ${awayRuns}, ${state.home.team.city} ${homeRuns}.${extra}${dinger}`;
  }
  const margin = Math.abs(homeRuns - awayRuns);
  const verb = margin >= 6 ? "rolled past" : margin === 1 ? "edged" : "took down";
  return `${winner.team.city} ${verb} the ${loser.team.name} ${Math.max(homeRuns, awayRuns)}-${Math.min(homeRuns, awayRuns)} at ${state.home.team.park}.${extra} ${starter}${dinger}`;
}

function totalRuns(state: GameState, side: "home" | "away"): number {
  return state[side].scoreByInning.reduce((sum, n) => sum + n, 0);
}

function playerName(state: GameState, id: string): string {
  const player = [...state.home.team.roster, ...state.away.team.roster].find((p) => p.id === id);
  return player?.name ?? "a ballplayer";
}

function bestStarter(state: GameState): string {
  const lines = [...Object.values(state.home.pitcherStats), ...Object.values(state.away.pitcherStats)].filter((p) => p.started);
  const top = lines.sort((a, b) => b.strikeouts - a.strikeouts)[0];
  if (!top) return "";
  const name = playerName(state, top.playerId);
  const ip = `${Math.floor(top.outs / 3)}.${top.outs % 3}`;
  return `${name} worked ${ip} and punched out ${top.strikeouts}.`;
}

export function crowdFor(runs: number, walkoff: boolean): string {
  if (walkoff) return "Ballgame! The home crowd spills into the night.";
  if (runs >= 3) return "The place is shaking. Hats are flying onto the grass.";
  if (runs === 2) return "A two-spot, and the radio booth is standing.";
  if (runs === 1) return "That one is going to play on the highlight reel.";
  return "A murmur rolls through the stands.";
}

export function batterIntro(batter: Player, pitcher: Player): string {
  return `${batter.name} steps in, ${batter.bats}-side, against ${pitcher.name}.`;
}
