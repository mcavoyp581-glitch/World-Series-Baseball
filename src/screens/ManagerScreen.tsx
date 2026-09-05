import { useMemo, useState } from "react";
import { buildLeague, overall } from "../data/league";
import {
  applyManagerGame,
  createManagerGame,
  formatLineup,
  nextManagerGame,
  newManagerSave,
  simNextManagerGame,
  sortedStandings,
  teamWithMoves,
  tradePlayers,
} from "../engine/modes";
import { clearManager, loadManager, saveManager } from "../persist/storage";
import type { GameState, LineupSlot, ManagerSave } from "../types";

export function ManagerSetup({ onCreated, onBack }: { onCreated: (save: ManagerSave) => void; onBack: () => void }) {
  const league = useMemo(() => buildLeague(), []);
  const [teamId, setTeamId] = useState(league[0].id);

  return (
    <section className="setup-card">
      <button className="ghost" onClick={onBack}>
        Back
      </button>
      <h2>Take a club</h2>
      <label>
        Franchise
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {league.map((team) => (
            <option key={team.id} value={team.id}>
              {team.conference} · {team.city} {team.name}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button
          className="primary"
          onClick={() => {
            const save = newManagerSave(teamId);
            saveManager(save);
            onCreated(save);
          }}
        >
          Hire me
        </button>
      </div>
    </section>
  );
}

export function ManagerHub({
  save,
  onPlay,
  onRefresh,
  onHome,
}: {
  save: ManagerSave;
  onPlay: (game: GameState) => void;
  onRefresh: () => void;
  onHome: () => void;
}) {
  const league = useMemo(() => buildLeague(), []);
  const team = teamWithMoves(league.find((t) => t.id === save.teamId)!, save);
  const fixture = nextManagerGame(save);
  const standings = sortedStandings(save);
  const [lineup, setLineup] = useState<LineupSlot[]>(save.lineup);
  const [tradeOut, setTradeOut] = useState(team.roster[0]?.id ?? "");
  const [tradeTeam, setTradeTeam] = useState(league.find((t) => t.id !== save.teamId)?.id ?? "");
  const other = league.find((t) => t.id === tradeTeam) ?? league[0];
  const [tradeIn, setTradeIn] = useState(other.roster[0]?.id ?? "");

  function persistLineup(next: LineupSlot[]) {
    setLineup(next);
    saveManager({ ...save, lineup: next });
    onRefresh();
  }

  return (
    <section>
      <div className="topbar">
        <div className="brand">
          <small>
            Manager · Day {save.day}
          </small>
          <strong>
            {team.city} {team.name}
          </strong>
        </div>
        <button className="ghost" onClick={onHome}>
          Home
        </button>
      </div>
      <div className="card-grid">
        <article className="panel">
          <div className="kicker">Next opponent</div>
          <h3>
            {fixture
              ? `${fixture.awayId === save.teamId ? "@" : "vs"} ${league.find((t) => t.id === (fixture.homeId === save.teamId ? fixture.awayId : fixture.homeId))?.name}`
              : "Season complete"}
          </h3>
          <div className="actions">
            <button
              className="primary"
              disabled={!fixture}
              onClick={() => fixture && onPlay(createManagerGame({ ...save, lineup }, { dh: true, extraInningRunner: true }))}
            >
              Manage game
            </button>
            <button
              disabled={!fixture}
              onClick={() => {
                saveManager(simNextManagerGame({ ...save, lineup }));
                onRefresh();
              }}
            >
              Sim next
            </button>
            <button
              className="danger"
              onClick={() => {
                clearManager();
                onRefresh();
              }}
            >
              Resign
            </button>
          </div>
        </article>
        <article className="panel">
          <h3>Standings</h3>
          <table className="box-score">
            <thead>
              <tr>
                <th>Club</th>
                <th>W</th>
                <th>L</th>
                <th>RS</th>
                <th>RA</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const club = league.find((t) => t.id === row.id);
                return (
                  <tr key={row.id}>
                    <td>
                      {club?.abbr} {row.id === save.teamId ? "•" : ""}
                    </td>
                    <td>{row.w}</td>
                    <td>{row.l}</td>
                    <td>{row.rs}</td>
                    <td>{row.ra}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>
      </div>
      <div className="card-grid" style={{ marginTop: 16 }}>
        <article className="panel">
          <h3>Lineup card</h3>
          {formatLineup(team, lineup).map((row, idx) => (
            <div className="lineup-row" key={`${row.slot.playerId}-${idx}`}>
              <span>
                {idx + 1}. {row.player.name} <span className="muted">{row.slot.position}</span>
              </span>
              {idx > 0 && (
                <button
                  className="chip"
                  onClick={() => {
                    const next = [...lineup];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    persistLineup(next);
                  }}
                >
                  Up
                </button>
              )}
            </div>
          ))}
        </article>
        <article className="panel">
          <h3>Roster move</h3>
          <div className="form-grid">
            <label>
              Send out
              <select value={tradeOut} onChange={(e) => setTradeOut(e.target.value)}>
                {team.roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({overall(p)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              From
              <select
                value={tradeTeam}
                onChange={(e) => {
                  setTradeTeam(e.target.value);
                  const next = league.find((t) => t.id === e.target.value);
                  setTradeIn(next?.roster[0]?.id ?? "");
                }}
              >
                {league
                  .filter((t) => t.id !== save.teamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.city} {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Bring back
              <select value={tradeIn} onChange={(e) => setTradeIn(e.target.value)}>
                {other.roster.slice(0, 12).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({overall(p)})
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                saveManager(tradePlayers({ ...save, lineup }, tradeOut, tradeTeam, tradeIn));
                onRefresh();
              }}
            >
              Confirm trade
            </button>
          </div>
          <ol>
            {save.log.slice(0, 6).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}

export function useManagerSave(): [ManagerSave | null, () => void] {
  const [tick, setTick] = useState(0);
  const save = useMemo(() => loadManager(), [tick]);
  return [save, () => setTick((n) => n + 1)];
}

export function applyFinishedManagerGame(state: GameState): void {
  const current = loadManager();
  if (!current) return;
  saveManager(applyManagerGame(current, state));
}
