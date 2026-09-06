import { findPlayer, totalRuns } from "../engine/game";
import { inningsPitched } from "../engine/modes";
import type { GameState, TeamGame } from "../types";

function SideBox({ side, state }: { side: TeamGame; state: GameState }) {
  return (
    <div className="panel">
      <h3>
        {side.team.city} {side.team.name} — {totalRuns(side)}
      </h3>
      <table className="box-score">
        <thead>
          <tr>
            <th>Batter</th>
            <th>AB</th>
            <th>R</th>
            <th>H</th>
            <th>RBI</th>
            <th>BB</th>
            <th>K</th>
          </tr>
        </thead>
        <tbody>
          {side.lineup.map((slot) => {
            const player = findPlayer(state, slot.playerId);
            const line = side.batterStats[slot.playerId];
            return (
              <tr key={slot.playerId}>
                <td>
                  {player.name} <span className="muted">{slot.position}</span>
                </td>
                <td>{line?.ab ?? 0}</td>
                <td>{line?.r ?? 0}</td>
                <td>{line?.h ?? 0}</td>
                <td>{line?.rbi ?? 0}</td>
                <td>{line?.bb ?? 0}</td>
                <td>{line?.so ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <table className="box-score" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Pitcher</th>
            <th>IP</th>
            <th>H</th>
            <th>R</th>
            <th>BB</th>
            <th>K</th>
            <th>P</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(side.pitcherStats)
            .filter((line) => line.pitches > 0 || line.started)
            .map((line) => (
              <tr key={line.playerId}>
                <td>{findPlayer(state, line.playerId).name}</td>
                <td>{inningsPitched(line.outs)}</td>
                <td>{line.hits}</td>
                <td>{line.runs}</td>
                <td>{line.walks}</td>
                <td>{line.strikeouts}</td>
                <td>{line.pitches}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function BoxScore({ state }: { state: GameState }) {
  return (
    <div className="card-grid">
      <SideBox side={state.away} state={state} />
      <SideBox side={state.home} state={state} />
    </div>
  );
}
