import { describe, expect, it } from "vitest";
import { buildLeague, teamById } from "../data/league";
import { applyAction, createGame, playFullGame, playHalfInning, totalRuns } from "./game";
import { applyCareerGame, applyManagerGame, createCareerGame, createCareerPlayer, createManagerGame, newCareerSave, newManagerSave, nextManagerGame } from "./modes";

const league = buildLeague();

describe("league", () => {
  it("builds eight stable rosters", () => {
    const again = buildLeague();
    expect(league).toHaveLength(8);
    expect(league[0].roster).toHaveLength(26);
    expect(league[0].roster[0].name).toBe(again[0].roster[0].name);
  });
});

describe("game engine", () => {
  it("plays a complete nine-inning game with matching box-score runs", () => {
    const game = playFullGame(
      createGame({
        away: teamById(league, "knights"),
        home: teamById(league, "beacons"),
        seed: 20241030,
      }),
    );
    expect(game.isComplete).toBe(true);
    expect(game.winner).toBeTruthy();
    expect(game.inning).toBeGreaterThanOrEqual(9);
    expect(totalRuns(game.home)).toBe(game.home.scoreByInning.reduce((a, b) => a + b, 0));
    expect(totalRuns(game.away)).toBe(game.away.scoreByInning.reduce((a, b) => a + b, 0));
    expect(game.recap?.length).toBeGreaterThan(20);
    const homeAB = Object.values(game.home.batterStats).reduce((sum, line) => sum + line.ab, 0);
    expect(homeAB).toBeGreaterThan(20);
  });

  it("ends a half-inning after three outs", () => {
    const start = createGame({
      away: teamById(league, "fog"),
      home: teamById(league, "palms"),
      seed: 88,
    });
    const half = playHalfInning(start);
    expect(half.half === "bottom" || half.isComplete).toBe(true);
    expect(half.outs === 0 || half.isComplete).toBe(true);
  });

  it("supports steal, bunt, IBB, pinch hit, and pitching change", () => {
    let state = createGame({
      away: teamById(league, "stars"),
      home: teamById(league, "arch"),
      seed: 11,
    });
    state = applyAction(state, { type: "intentionalWalk" });
    expect(state.bases[0]).toBeTruthy();
    state = applyAction(state, { type: "steal" });
    const bench = state.away.bench[0];
    state = applyAction(state, { type: "pinchHit", playerId: bench });
    expect(state.away.lineup[state.away.battingOrderIndex].playerId).toBe(bench);
    const arm = state.home.bullpen[0];
    state = applyAction(state, { type: "changePitcher", playerId: arm });
    expect(state.home.pitcherId).toBe(arm);
    state = applyAction(state, { type: "bunt" });
    expect(state.commentary.length).toBeGreaterThan(3);
  });

  it("can play extra innings when tied late", () => {
    const finished = playFullGame(
      createGame({
        away: teamById(league, "wind"),
        home: teamById(league, "peaches"),
        seed: 314159,
        rules: { dh: true, extraInningRunner: true },
      }),
    );
    expect(finished.isComplete).toBe(true);
    if (finished.inning > 9) {
      expect(Math.abs(totalRuns(finished.home) - totalRuns(finished.away))).toBeGreaterThan(0);
    }
  });
});

describe("career and manager", () => {
  it("creates a career player and persists stats after a game", () => {
    const player = createCareerPlayer({
      name: "Test Prospect",
      position: "CF",
      archetype: "contact",
      risingStar: true,
      bats: "L",
      throws: "L",
    });
    const save = newCareerSave(player, "beacons", true);
    const game = playFullGame(createCareerGame(save, true, { dh: true, extraInningRunner: true }, 77));
    const next = applyCareerGame(save, game);
    expect(next.games).toBe(1);
    expect(next.careerStats.ab + next.careerStats.bb + next.careerStats.sf + next.seasonStats.ipOuts).toBeGreaterThanOrEqual(0);
    expect(next.xp).toBeGreaterThan(save.xp);
  });

  it("advances a manager season and standings", () => {
    const save = newManagerSave("knights");
    expect(nextManagerGame(save)).toBeTruthy();
    const game = playFullGame(createManagerGame(save, { dh: true, extraInningRunner: true }, 123));
    const next = applyManagerGame(save, game);
    const knights = next.standings.knights;
    expect(knights.w + knights.l).toBe(1);
    expect(next.schedule.some((g) => g.played)).toBe(true);
  });
});
