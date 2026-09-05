import { useEffect, useRef, useState } from "react";
import { BoxScore } from "../components/BoxScore";
import { CommentaryFeed } from "../components/CommentaryFeed";
import { Diamond } from "../components/Diamond";
import { PlayerCard } from "../components/PlayerCard";
import { Scoreboard } from "../components/Scoreboard";
import { applyAction, currentBatter, currentPitcher, defense, findPlayer, offense, playFullGame, playHalfInning } from "../engine/game";
import type { Approach, GameState, PitchPlan } from "../types";

export function GameScreen({
  initial,
  onExit,
  onComplete,
  canManage = true,
}: {
  initial: GameState;
  onExit: () => void;
  onComplete?: (state: GameState) => void;
  canManage?: boolean;
}) {
  const [game, setGame] = useState(initial);
  const [approach, setApproach] = useState<Approach>("normal");
  const [plan, setPlan] = useState<PitchPlan>("challenge");
  const [modal, setModal] = useState<"none" | "pinch" | "bullpen">("none");
  const [busy, setBusy] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    if (game.isComplete && !finished.current) {
      finished.current = true;
      onComplete?.(game);
    }
  }, [game, onComplete]);

  function act(next: GameState) {
    setGame(next);
  }

  const runnersOn = game.bases.some(Boolean);
  const off = offense(game);
  const def = defense(game);

  return (
    <section>
      <div className="topbar">
        <div className="brand">
          <small>
            {game.away.team.city} at {game.home.team.city}
          </small>
          <strong>
            {game.away.team.abbr} @ {game.home.team.abbr}
          </strong>
        </div>
        <button className="ghost" onClick={onExit} disabled={busy}>
          Leave park
        </button>
      </div>
      <Scoreboard state={game} />
      <div className="game-layout">
        <Diamond state={game} />
        <CommentaryFeed state={game} />
      </div>
      <div className="player-pair" style={{ marginTop: 14 }}>
        <PlayerCard player={currentBatter(game)} label="At the plate" />
        <PlayerCard player={currentPitcher(game)} label={`${currentPitcher(game).throws}HP`} />
      </div>
      {!game.isComplete && (
        <>
          <div className="row" style={{ marginTop: 14 }}>
            {(["patient", "normal", "aggressive"] as const).map((item) => (
              <button key={item} className={`chip ${approach === item ? "active" : ""}`} onClick={() => setApproach(item)}>
                {item}
              </button>
            ))}
            {(["nibble", "challenge", "pitchout"] as const).map((item) => (
              <button key={item} className={`chip ${plan === item ? "active" : ""}`} onClick={() => setPlan(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="primary" disabled={busy} onClick={() => act(applyAction(game, { type: "pitch", approach, plan }))}>
              Deliver pitch
            </button>
            <button disabled={busy || !runnersOn} onClick={() => act(applyAction(game, { type: "steal" }))}>
              Steal
            </button>
            <button disabled={busy || game.outs >= 2} onClick={() => act(applyAction(game, { type: "bunt" }))}>
              Bunt
            </button>
            {canManage && (
              <>
                <button disabled={busy} onClick={() => act(applyAction(game, { type: "intentionalWalk" }))}>
                  IBB
                </button>
                <button disabled={busy} onClick={() => setModal("pinch")}>
                  Pinch hit
                </button>
                <button disabled={busy} onClick={() => setModal("bullpen")}>
                  Change pitcher
                </button>
              </>
            )}
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                window.setTimeout(() => {
                  act(playHalfInning(game));
                  setBusy(false);
                }, 40);
              }}
            >
              Auto half
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                window.setTimeout(() => {
                  act(playFullGame(game));
                  setBusy(false);
                }, 40);
              }}
            >
              Auto game
            </button>
          </div>
        </>
      )}
      {game.isComplete && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="kicker">Final</div>
          <p className="recap">{game.recap}</p>
        </div>
      )}
      {(game.isComplete || game.inning > 1 || game.half === "bottom") && (
        <div style={{ marginTop: 16 }}>
          <BoxScore state={game} />
        </div>
      )}
      {modal !== "none" && (
        <div className="modal-backdrop" onClick={() => setModal("none")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === "pinch" ? "Pinch hitter" : "Bullpen"}</h3>
            <div className="form-grid">
              {(modal === "pinch" ? off.bench : def.bullpen).map((id) => {
                const player = findPlayer(game, id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      act(applyAction(game, modal === "pinch" ? { type: "pinchHit", playerId: id } : { type: "changePitcher", playerId: id }));
                      setModal("none");
                    }}
                  >
                    {player.name} · {player.position} {player.pitcherRole ?? ""}
                  </button>
                );
              })}
            </div>
            <button className="ghost" style={{ marginTop: 12 }} onClick={() => setModal("none")}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
