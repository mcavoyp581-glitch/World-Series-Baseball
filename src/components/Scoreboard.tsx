import { offense, totalRuns } from "../engine/game";
import type { GameState } from "../types";

export function Scoreboard({ state }: { state: GameState }) {
  const innings = Math.max(9, state.inning);
  const cols = Array.from({ length: innings }, (_, i) => i + 1);
  const batting = offense(state).team.abbr;

  return (
    <section className="scoreboard" aria-label="Scoreboard">
      <table>
        <thead>
          <tr>
            <th className="team"> </th>
            {cols.map((n) => (
              <th key={n}>{n}</th>
            ))}
            <th>R</th>
            <th>H</th>
            <th>E</th>
          </tr>
        </thead>
        <tbody>
          {(["away", "home"] as const).map((side) => {
            const club = state[side];
            return (
              <tr key={side}>
                <td className="team">{club.team.abbr}</td>
                {cols.map((n) => (
                  <td key={n}>{club.scoreByInning[n - 1] ?? (n < state.inning || (n === state.inning && (side === "away" ? state.half === "bottom" : false)) ? 0 : "")}</td>
                ))}
                <td>{totalRuns(club)}</td>
                <td>{club.hits}</td>
                <td>{club.errors}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="count-row">
        <div className="pill">
          Inning <b>{state.half === "top" ? "Top" : "Bot"} {state.inning}</b>
        </div>
        <div className="pill">
          Count <b>{state.balls}-{state.strikes}</b>
        </div>
        <div className="pill">
          Outs <b>{state.outs}</b>
        </div>
        <div className="pill">
          At bat <b>{batting}</b>
        </div>
        <div className="pill">
          Pitches <b>{state.home.pitcherStats[state.home.pitcherId]?.pitches ?? 0}/{state.away.pitcherStats[state.away.pitcherId]?.pitches ?? 0}</b>
        </div>
      </div>
    </section>
  );
}
