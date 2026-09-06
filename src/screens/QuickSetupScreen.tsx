import { useMemo, useState } from "react";
import { CLASSIC_MATCHUPS, buildLeague, startingPitchers } from "../data/league";
import { createGame } from "../engine/game";
import type { GameState } from "../types";

export function QuickSetupScreen({ onStart, onBack }: { onStart: (game: GameState) => void; onBack: () => void }) {
  const league = useMemo(() => buildLeague(), []);
  const [awayId, setAwayId] = useState("knights");
  const [homeId, setHomeId] = useState("beacons");
  const [awayStarter, setAwayStarter] = useState("");
  const [homeStarter, setHomeStarter] = useState("");
  const [dh, setDh] = useState(true);
  const [extra, setExtra] = useState(true);

  const away = league.find((t) => t.id === awayId)!;
  const home = league.find((t) => t.id === homeId)!;

  return (
    <section className="setup-card">
      <div className="row">
        <button className="ghost" onClick={onBack}>
          Back
        </button>
        <div className="kicker">Quick Game</div>
      </div>
      <h2>Choose your night</h2>
      <div className="row" style={{ margin: "12px 0 18px" }}>
        {CLASSIC_MATCHUPS.map((match) => (
          <button
            key={match.label}
            className="chip"
            onClick={() => {
              setAwayId(match.awayId);
              setHomeId(match.homeId);
            }}
          >
            {match.label}
          </button>
        ))}
      </div>
      <div className="card-grid">
        <label>
          Away
          <select value={awayId} onChange={(e) => setAwayId(e.target.value)}>
            {league.map((team) => (
              <option key={team.id} value={team.id}>
                {team.city} {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Home
          <select value={homeId} onChange={(e) => setHomeId(e.target.value)}>
            {league.map((team) => (
              <option key={team.id} value={team.id}>
                {team.city} {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Away starter
          <select value={awayStarter} onChange={(e) => setAwayStarter(e.target.value)}>
            <option value="">Ace of the staff</option>
            {startingPitchers(away).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Home starter
          <select value={homeStarter} onChange={(e) => setHomeStarter(e.target.value)}>
            <option value="">Ace of the staff</option>
            {startingPitchers(home).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className={`chip ${dh ? "active" : ""}`} onClick={() => setDh((v) => !v)}>
          DH {dh ? "on" : "off"}
        </button>
        <button className={`chip ${extra ? "active" : ""}`} onClick={() => setExtra((v) => !v)}>
          Extra-inning runner {extra ? "on" : "off"}
        </button>
      </div>
      <div className="actions">
        <button
          className="primary"
          onClick={() =>
            onStart(
              createGame({
                away,
                home,
                awayStarterId: awayStarter || undefined,
                homeStarterId: homeStarter || undefined,
                rules: { dh, extraInningRunner: extra },
              }),
            )
          }
        >
          Play ball
        </button>
      </div>
    </section>
  );
}
