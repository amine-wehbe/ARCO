import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { submitScore, fetchUserStats } from "../api/client";
import { useKeyNav } from "../hooks/useKeyNav";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";
import SnakeGame      from "../games/snake/SnakeGame";
import MemoryGame     from "../games/memory/MemoryGame";
import FlappyGame     from "../games/flappy/FlappyGame";
import BattleshipGame from "../games/battleship/BattleshipGame";
import GamePlaceholder from "../components/GamePlaceholder";

const GAME_META = {
  SNAKE:       { label: "SNAKE · 1P",       controls: <><span className="kbd">↑↓←→</span><span className="muted">move</span></> },
  FLAPPY:      { label: "FLAPPY · 1P",      controls: <><span className="kbd">SPACE</span><span className="muted">flap</span></> },
  MEMORY:      { label: "MEMORY · 1P",      controls: <><span className="kbd">CLICK</span><span className="muted">flip card</span></> },
  BATTLESHIP:  { label: "BATTLESHIP · 2P",  controls: null },
};

function GameSwitch({ name, onGameOver, isGuest, hiScore }) {
  if (name === "SNAKE")      return <SnakeGame      onGameOver={onGameOver} isGuest={isGuest} hiScore={hiScore} />;
  if (name === "FLAPPY")     return <FlappyGame     onGameOver={onGameOver} isGuest={isGuest} hiScore={hiScore} />;
  if (name === "MEMORY")     return <MemoryGame     onGameOver={onGameOver} isGuest={isGuest} hiScore={hiScore} />;
  if (name === "BATTLESHIP") return <BattleshipGame onGameOver={onGameOver} />;
  return <GamePlaceholder name={name} />;
}

export default function InGame() {
  const { user, navigate, activeGame } = useApp();
  const isBattleship = activeGame === "BATTLESHIP";
  const playerName   = user?.displayName ?? "GUEST_42";

  const [lastScore,      setLastScore]      = useState(null);
  const [hiScore,        setHiScore]        = useState(0);
  const [statsReady,     setStatsReady]     = useState(false);
  // Battleship session win tracker — persists across rematches
  const [bsWins,  setBsWins]  = useState(0);
  const [bsTotal, setBsTotal] = useState(0);

  const meta = GAME_META[activeGame] ?? { label: activeGame, controls: null };

  // Fetch real best score from DynamoDB before mounting the game
  useEffect(() => {
    if (isBattleship) { setStatsReady(true); return; } // no hi score for battleship
    if (!user || user.isGuest) { setHiScore(0); setStatsReady(true); return; }
    fetchUserStats(user.userId)
      .then(data => setHiScore(data?.["best_" + activeGame.toLowerCase()] ?? 0))
      .catch(() => setHiScore(0))
      .finally(() => setStatsReady(true));
  }, [user?.userId, activeGame]);

  // Q or ESC quits — Q disabled for Battleship
  useKeyNav(e => {
    if (e.key === "Escape") { e.preventDefault(); navigate("library"); }
    if (!isBattleship && (e.key === "q" || e.key === "Q")) { e.preventDefault(); navigate("library"); }
  }, [activeGame]);

  function handleGameOver(score) {
    if (isBattleship) {
      // score is 1 for win, 0 for loss — submit 1 to increment gamesPlayed, no leaderboard impact
      setBsTotal(t => t + 1);
      if (score) setBsWins(w => w + 1);
      if (user && !user.isGuest && score) {
        submitScore(activeGame, 1).catch(err => console.error("submitScore failed:", err));
      }
      return;
    }
    setLastScore(score);
    if (user && !user.isGuest) {
      submitScore(activeGame, score).catch(err => console.error("submitScore failed:", err));
    }
  }

  return (
    <>
      <ScreenHead num="03" title="In-game" note={meta.label.toLowerCase()} />
      <CRT>
        <Bezel title={meta.label} right={<span className="pill accent">● PLAYING</span>} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
          <div className="col">
            <div className="label">PLAYER</div>
            <div className="pixel" style={{ fontSize: 14, color: "#fff" }}>{playerName}</div>
          </div>

          {/* Battleship: session win counter — other games: last score */}
          {isBattleship ? (
            bsTotal > 0 && (
              <div className="col" style={{ alignItems: "center" }}>
                <div className="label">GAMES WON</div>
                <div className="stat phos">{bsWins}/{bsTotal}</div>
              </div>
            )
          ) : (
            lastScore !== null && (
              <div className="col" style={{ alignItems: "center" }}>
                <div className="label">LAST SCORE</div>
                <div className="stat phos">{String(lastScore).padStart(5, "0")}</div>
              </div>
            )
          )}

          <div className="col" style={{ alignItems: "flex-end" }}>
            {meta.controls && <div className="label">CONTROLS</div>}
            <div className="row" style={{ gap: 4 }}>
              {meta.controls}
              {!isBattleship && <span className="kbd">Q</span>}
              <span className="kbd">ESC</span><span className="muted">quit</span>
            </div>
          </div>
        </div>

        {statsReady
          ? <GameSwitch name={activeGame} onGameOver={handleGameOver} isGuest={user?.isGuest ?? true} hiScore={hiScore} />
          : <div style={{ flex: 1, display: "grid", placeItems: "center" }} className="muted pixel">LOADING...</div>
        }
      </CRT>
    </>
  );
}
