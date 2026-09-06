# World Series Baseball

A browser baseball game with pitch-by-pitch simulation, radio-style play-by-play, and three modes:

- **Quick Game** — pick home/away clubs (or a classic matchup), assign starters, toggle DH / extra-inning runner, and play a full MLB-style nine. Extras if it’s tied.
- **Career** — create a prospect or rising star, play games, stack stats, and climb contracts/levels. Progress is saved in `localStorage`.
- **Manager** — take a franchise, set the lineup, work the bullpen, make mid-game calls, swing a lightweight trade, and watch a season standings snapshot.

The sim tracks count, outs, baserunners, hits/runs/errors, pitch counts, steals, bunts, double plays, sac flies, walks, strikeouts, and errors. You can intervene any time: steal, bunt, intentional walk, pinch hit, or change pitchers.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test        # engine + mode checks
npm run build   # production bundle
```

## How to play

1. From the home screen choose **Quick Game**, **Career**, or **Manager**.
2. In a live game, **Deliver pitch** works the at-bat. Approach chips (patient / normal / aggressive) and pitch plans (nibble / challenge / pitchout) tilt the next offering.
3. **Auto half** and **Auto game** play out the sim when you want the radio call without clicking every pitch.
4. After the final out you get a box score and a short recap.

Career and manager progress live in the browser (`wsb-career-v1`, `wsb-manager-v1`). Use **Retire** / **Resign** on those hubs to reset.

## Project layout

```
src/
  data/          League franchises and generated rosters
  engine/        Pitch-by-pitch sim, commentary, career/manager rules
  persist/       localStorage helpers
  components/    Scoreboard, diamond, radio feed, box score
  screens/       Home, setup, live game, career, manager
```

The eight-club Diamond League is fictional (Boston Beacons, New York Knights, and friends) so the game can ship with full rosters without depending on live MLB data.
