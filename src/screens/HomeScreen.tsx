export function HomeScreen({
  onQuick,
  onCareer,
  onManager,
}: {
  onQuick: () => void;
  onCareer: () => void;
  onManager: () => void;
}) {
  return (
    <section className="home-hero">
      <div className="kicker">World Series Baseball</div>
      <h1>Night game. Full count. Your call.</h1>
      <p>
        Pitch-by-pitch baseball with radio chatter, a living scoreboard, and three ways to live on the diamond:
        play a classic, carve out a career, or skipper a club through a season.
      </p>
      <div className="mode-grid">
        <button className="mode-card" onClick={onQuick}>
          <div className="kicker">01</div>
          <h3>Quick Game</h3>
          <p className="muted">Pick a matchup, choose starters, and work a full nine — extras if it stays knotted.</p>
        </button>
        <button className="mode-card" onClick={onCareer}>
          <div className="kicker">02</div>
          <h3>Career</h3>
          <p className="muted">Create a prospect or rising star, pile up stats, and climb the contract ladder.</p>
        </button>
        <button className="mode-card" onClick={onManager}>
          <div className="kicker">03</div>
          <h3>Manager</h3>
          <p className="muted">Set the lineup, work the bullpen, swing a trade, and chase the standings.</p>
        </button>
      </div>
    </section>
  );
}
