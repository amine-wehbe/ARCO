import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { fetchUserStats } from "../api/client";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import Cabinet from "../components/Cabinet";
import ScreenHead from "../components/ScreenHead";

// Grid is 3 columns: positions 0-4 are games, position 5 is the empty "SOON" slot
//   [0] [1] [2]
//   [3] [4] [5=empty]

const BASE_GAMES = [
  { name: "SNAKE",      tag: "1P" },
  { name: "FLAPPY",     tag: "1P" },
  { name: "MEMORY",     tag: "1P" },
  { name: "BATTLESHIP", tag: "2P" },
];
const COLS = 3;
const VALID = 5; // indices 0-4 are valid games

export default function Library() {
  const { tweaks, navigate, launchGame, user, isAdmin } = useApp();
  const [selected,   setSelected]   = useState(0);
  const [userStats,  setUserStats]  = useState(null);

  // Fetch real best scores from DynamoDB for logged-in users
  useEffect(() => {
    if (!user || user.isGuest) { setUserStats(null); return; }
    fetchUserStats(user.userId).then(setUserStats).catch(() => {});
  }, [user?.userId]);

  // Format hi score from DynamoDB best attrs — guests and errors show "---"
  function fmtHi(game) {
    if (!user || user.isGuest || !userStats) return "---";
    const best = userStats["best_" + game.toLowerCase()];
    return best > 0 ? best.toLocaleString() : "---";
  }

  const games = [
    { ...BASE_GAMES[0], hi: fmtHi("SNAKE") },
    { ...BASE_GAMES[1], hi: fmtHi("FLAPPY") },
    { ...BASE_GAMES[2], hi: fmtHi("MEMORY") },
    { ...BASE_GAMES[3], hi: "---" },
    { name: tweaks.g5, tag: "2P", hi: "---" },
  ];
  const current = games[selected];

  function move(delta) {
    setSelected(s => {
      let next = s + delta;
      // Skip the empty slot (index 5)
      if (next < 0) next = VALID - 1;
      if (next >= VALID) next = 0;
      return next;
    });
  }

  function moveRow(delta) {
    setSelected(s => {
      const next = s + delta * COLS;
      if (next < 0 || next >= VALID) return s; // no wrap on vertical edges
      return next;
    });
  }

  useKeyNav(e => {
    if (e.key === "ArrowLeft")  { e.preventDefault(); move(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    if (e.key === "ArrowUp")    { e.preventDefault(); moveRow(-1); }
    if (e.key === "ArrowDown")  { e.preventDefault(); moveRow(1); }
    if (e.key === "Enter")      { e.preventDefault(); launchGame(games[selected].name); }
    if (e.key === "p" || e.key === "P") { e.preventDefault(); navigate("profile"); }
    if (e.key === "l" || e.key === "L") { e.preventDefault(); navigate("leaderboard"); }
    if (e.key === "s" || e.key === "S") { e.preventDefault(); navigate("settings"); }
    if ((e.key === "a" || e.key === "A") && isAdmin) { e.preventDefault(); navigate("admin"); }
  }, [selected]);

  return (
    <>
      <ScreenHead num="02" title="Library" note="the hall — walk up to any cabinet" />
      <CRT>
        <Bezel title="THE HALL" right={<span className="muted" style={{ fontSize: 14 }}>5 of 6 cabinets</span>} />

        <div className="pixel-title" style={{ fontSize: 20, textAlign: "center", margin: "8px 0 18px" }}>
          SELECT A GAME
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 40, padding: "20px 40px", justifyItems: "center", flex: 1, alignContent: "center" }}>
          {games.map((g, i) => (
            <Cabinet
              key={g.name}
              {...g}
              selected={selected === i}
              onClick={() => { setSelected(i); launchGame(games[i].name); }}
            />
          ))}
          <Cabinet empty />
        </div>

        <div style={{ marginTop: "auto", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12 }}>
          {/* Game info + controls row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="pixel phos" style={{ fontSize: 11 }}>
              ▸ {current.name}  ·  {current.tag} PLAYERS  ·  HI {current.hi}
            </div>
            <div className="row">
              <span className="kbd">← →</span><span className="muted">move</span>
              <span className="kbd">↑ ↓</span><span className="muted">row</span>
              <span className="kbd">ENTER</span><span className="muted">play</span>
            </div>
          </div>
          {/* Nav row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="pill" style={{ cursor: "pointer" }} onClick={() => navigate("profile")}>
                <span className="kbd" style={{ fontSize: 9 }}>P</span> PROFILE
              </span>
              <span className="pill" style={{ cursor: "pointer" }} onClick={() => navigate("leaderboard")}>
                <span className="kbd" style={{ fontSize: 9 }}>L</span> LEADERBOARD
              </span>
              <span className="pill" style={{ cursor: "pointer" }} onClick={() => navigate("settings")}>
                <span className="kbd" style={{ fontSize: 9 }}>S</span> SETTINGS
              </span>
              {isAdmin && (
                <span className="pill accent" style={{ cursor: "pointer" }} onClick={() => navigate("admin")}>
                  <span className="kbd" style={{ fontSize: 9 }}>A</span> ADMIN
                </span>
              )}
            </div>
          </div>
        </div>
      </CRT>
    </>
  );
}
