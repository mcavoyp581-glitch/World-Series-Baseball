import { useState } from "react";
import type { GameState, Screen } from "./types";
import { HomeScreen } from "./screens/HomeScreen";
import { QuickSetupScreen } from "./screens/QuickSetupScreen";
import { GameScreen } from "./screens/GameScreen";
import { CareerCreate, CareerHub, applyFinishedCareerGame, useCareerSave } from "./screens/CareerScreen";
import { ManagerHub, ManagerSetup, applyFinishedManagerGame, useManagerSave } from "./screens/ManagerScreen";

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [game, setGame] = useState<GameState | null>(null);
  const [career, refreshCareer] = useCareerSave();
  const [manager, refreshManager] = useManagerSave();

  function goHome() {
    setGame(null);
    setScreen({ name: "home" });
    refreshCareer();
    refreshManager();
  }

  return (
    <div className="app-shell">
      {screen.name === "home" && (
        <HomeScreen
          onQuick={() => setScreen({ name: "quick-setup" })}
          onCareer={() => setScreen(career ? { name: "career" } : { name: "career-create" })}
          onManager={() => setScreen(manager ? { name: "manager" } : { name: "manager-setup" })}
        />
      )}
      {screen.name === "quick-setup" && (
        <QuickSetupScreen
          onBack={goHome}
          onStart={(next) => {
            setGame(next);
            setScreen({ name: "game", source: "quick" });
          }}
        />
      )}
      {screen.name === "career-create" && (
        <CareerCreate
          onBack={goHome}
          onCreated={() => {
            refreshCareer();
            setScreen({ name: "career" });
          }}
        />
      )}
      {screen.name === "career" && career && (
        <CareerHub
          save={career}
          onHome={goHome}
          onRefresh={refreshCareer}
          onPlay={(next) => {
            setGame(next);
            setScreen({ name: "game", source: "career" });
          }}
        />
      )}
      {screen.name === "manager-setup" && (
        <ManagerSetup
          onBack={goHome}
          onCreated={() => {
            refreshManager();
            setScreen({ name: "manager" });
          }}
        />
      )}
      {screen.name === "manager" && manager && (
        <ManagerHub
          save={manager}
          onHome={goHome}
          onRefresh={refreshManager}
          onPlay={(next) => {
            setGame(next);
            setScreen({ name: "game", source: "manager" });
          }}
        />
      )}
      {screen.name === "game" && game && (
        <GameScreen
          initial={game}
          canManage={screen.source !== "career"}
          onExit={() => {
            if (screen.source === "career") setScreen({ name: "career" });
            else if (screen.source === "manager") setScreen({ name: "manager" });
            else setScreen({ name: "home" });
            setGame(null);
            refreshCareer();
            refreshManager();
          }}
          onComplete={(finalState) => {
            if (screen.source === "career") applyFinishedCareerGame(finalState);
            if (screen.source === "manager") applyFinishedManagerGame(finalState);
          }}
        />
      )}
    </div>
  );
}
