import { overall } from "../data/league";
import type { Player } from "../types";

export function PlayerCard({ player, label }: { player: Player; label: string }) {
  const ovr = overall(player);
  const focus = player.position === "P" ? player.ratings.velocity : player.ratings.contact;
  return (
    <article className="player-card">
      <div className="kicker">{label}</div>
      <b>{player.name}</b>
      <div className="muted">
        {player.position}
        {player.pitcherRole ? ` ${player.pitcherRole}` : ""} · {player.bats}/{player.throws} · {ovr} OVR
      </div>
      <div className="meter" aria-hidden>
        <span style={{ width: `${ovr}%` }} />
      </div>
      <small className="muted">{player.position === "P" ? `Stuff ${focus}` : `Contact ${focus}`}</small>
    </article>
  );
}
