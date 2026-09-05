import { useMemo, useState } from "react";
import { buildLeague, overall } from "../data/league";
import { applyCareerGame, average, createCareerGame, createCareerPlayer, era, inningsPitched, newCareerSave, type Archetype } from "../engine/modes";
import { clearCareer, loadCareer, saveCareer } from "../persist/storage";
import type { CareerSave, FieldPosition, GameState } from "../types";

const POSITIONS: FieldPosition[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "P"];

export function CareerCreate({ onCreated, onBack }: { onCreated: (save: CareerSave) => void; onBack: () => void }) {
  const league = useMemo(() => buildLeague(), []);
  const [name, setName] = useState("Cal Harbor");
  const [position, setPosition] = useState<FieldPosition>("CF");
  const [archetype, setArchetype] = useState<Archetype>("contact");
  const [teamId, setTeamId] = useState(league[0].id);
  const [risingStar, setRisingStar] = useState(false);

  return (
    <section className="setup-card">
      <button className="ghost" onClick={onBack}>
        Back
      </button>
      <h2>Create your player</h2>
      <div className="form-grid">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Position
          <select value={position} onChange={(e) => setPosition(e.target.value as FieldPosition)}>
            {POSITIONS.map((pos) => (
              <option key={pos}>{pos}</option>
            ))}
          </select>
        </label>
        <label>
          Archetype
          <select value={archetype} onChange={(e) => setArchetype(e.target.value as Archetype)}>
            <option value="slugger">Slugger</option>
            <option value="contact">Contact hitter</option>
            <option value="speedster">Speedster</option>
            <option value="glove">Glove-first</option>
            <option value="ace">Ace starter</option>
            <option value="closer">Closer</option>
          </select>
        </label>
        <label>
          Organization
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {league.map((team) => (
              <option key={team.id} value={team.id}>
                {team.city} {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row" style={{ margin: "14px 0" }}>
        <button className={`chip ${risingStar ? "active" : ""}`} onClick={() => setRisingStar((v) => !v)}>
          Rising star {risingStar ? "on" : "off"}
        </button>
      </div>
      <button
        className="primary"
        onClick={() => {
          const player = createCareerPlayer({
            name: name.trim() || "Rookie",
            position,
            archetype,
            risingStar,
            bats: "R",
            throws: "R",
          });
          const save = newCareerSave(player, teamId, risingStar);
          saveCareer(save);
          onCreated(save);
        }}
      >
        Sign the deal
      </button>
    </section>
  );
}

export function CareerHub({
  save,
  onPlay,
  onRefresh,
  onHome,
}: {
  save: CareerSave;
  onPlay: (game: GameState) => void;
  onRefresh: () => void;
  onHome: () => void;
}) {
  const league = useMemo(() => buildLeague(), []);
  const team = league.find((t) => t.id === save.teamId);
  const stats = save.seasonStats;

  return (
    <section>
      <div className="topbar">
        <div className="brand">
          <small>Career · Season {save.season}</small>
          <strong>{save.player.name}</strong>
        </div>
        <button className="ghost" onClick={onHome}>
          Home
        </button>
      </div>
      <div className="card-grid">
        <article className="panel">
          <div className="kicker">{save.level}</div>
          <h3>
            {save.player.position} · {overall(save.player)} OVR
          </h3>
          <p className="muted">
            {team?.city} {team?.name} · ${save.contract.salary.toLocaleString()} / {save.contract.years} yr
          </p>
          <p>
            Season line: {stats.h}-{stats.ab} ({average(stats)}), {stats.hr} HR, {stats.rbi} RBI, {stats.sb} SB
          </p>
          {save.player.position === "P" && (
            <p>
              On the mound: {inningsPitched(stats.ipOuts)} IP, {era(stats)} RA/9, {stats.pitchK} K
            </p>
          )}
          <p className="muted">
            Career: {save.careerStats.h} H / {save.careerStats.hr} HR / {save.careerStats.wins} W · {save.xp} XP · {save.games}{" "}
            games
          </p>
          <div className="actions">
            <button className="primary" onClick={() => onPlay(createCareerGame(save, save.games % 2 === 0, { dh: true, extraInningRunner: true }))}>
              Play next game
            </button>
            <button
              className="danger"
              onClick={() => {
                clearCareer();
                onRefresh();
              }}
            >
              Retire
            </button>
          </div>
        </article>
        <article className="panel">
          <h3>Clubhouse notes</h3>
          <ol>
            {save.log.slice(0, 8).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}

export function useCareerSave(): [CareerSave | null, () => void] {
  const [tick, setTick] = useState(0);
  const save = useMemo(() => loadCareer(), [tick]);
  return [save, () => setTick((n) => n + 1)];
}

export function applyFinishedCareerGame(state: GameState): void {
  const current = loadCareer();
  if (!current) return;
  saveCareer(applyCareerGame(current, state));
}
