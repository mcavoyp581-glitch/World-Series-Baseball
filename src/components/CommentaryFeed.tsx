import type { GameState } from "../types";

export function CommentaryFeed({ state }: { state: GameState }) {
  return (
    <aside className="radio" aria-live="polite">
      <div className="kicker">On the air</div>
      <h3>Night Game Radio</h3>
      <ol>
        {state.commentary.slice(0, 8).map((line) => (
          <li key={line.id} className={line.tone}>
            {line.text}
          </li>
        ))}
      </ol>
    </aside>
  );
}
