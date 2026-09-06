import { currentBatter, findPlayer } from "../engine/game";
import type { GameState } from "../types";

export function Diamond({ state }: { state: GameState }) {
  const names = state.bases.map((runner) => (runner ? findPlayer(state, runner.playerId).name.split(" ").at(-1) : ""));
  const batter = currentBatter(state);

  return (
    <div className="diamond-wrap">
      <svg className="diamond-svg" viewBox="0 0 200 180" aria-label="Baseball diamond">
        <path d="M100 28 L172 100 L100 172 L28 100 Z" fill="#c4a46a" opacity="0.35" />
        <path d="M100 46 L154 100 L100 154 L46 100 Z" fill="none" stroke="#f4e7c5" strokeWidth="2" />
        <rect x="93" y="147" width="14" height="14" className="base" />
        <rect x="147" y="93" width="14" height="14" transform="rotate(45 154 100)" className={`base ${state.bases[0] ? "on" : ""}`} />
        <rect x="93" y="39" width="14" height="14" transform="rotate(45 100 46)" className={`base ${state.bases[1] ? "on" : ""}`} />
        <rect x="39" y="93" width="14" height="14" transform="rotate(45 46 100)" className={`base ${state.bases[2] ? "on" : ""}`} />
        <circle cx="100" cy="100" r="6" fill="#b5522b" />
        <text x="162" y="88" fill="#f4e7c5" fontSize="7">{names[0]}</text>
        <text x="92" y="34" fill="#f4e7c5" fontSize="7">{names[1]}</text>
        <text x="18" y="88" fill="#f4e7c5" fontSize="7">{names[2]}</text>
        <text x="72" y="172" fill="#f3d27a" fontSize="8">{batter.name}</text>
      </svg>
    </div>
  );
}
