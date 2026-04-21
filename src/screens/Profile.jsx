import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { fetchUserStats } from "../api/client";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

// Hardcoded score ceilings used only for the visual bar width per game
const GAME_MAX = { snake: 50000, flappy: 1000, memory: 5000, battleship: 500 };

// Games shown in the profile per-game section
const PROFILE_GAMES = ["snake", "flappy", "memory", "battleship"];

export default function Profile() {
  const { user, tweaks, signOut, navigate } = useApp();
  const [userData,    setUserData]    = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useKeyNav(e => {
    if (e.key === "Escape") { e.preventDefault(); navigate("library"); }
  }, []);

  const displayName = user?.displayName ?? "PIXELWYRM";
  const userId      = user?.userId     ?? "u_9f32a1";

  useEffect(() => {
    if (!user || user.isGuest) return;
    setLoadingStats(true);
    fetchUserStats(userId)
      .then(data => setUserData(data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [userId]);

  // Derive display values from real data, falling back to placeholders
  const gamesPlayed = userData?.gamesPlayed ?? 0;
  const level       = Math.floor(gamesPlayed / 5) + 1;

  // Build per-game rows: [label, scoreStr, barFraction]
  // Backend stores flat attrs: best_snake, best_flappy, best_memory, best_battleship
  const perGame = PROFILE_GAMES.map(g => {
    const best = userData?.["best_" + g];
    const label = g.toUpperCase();
    const scoreStr = best != null ? best.toLocaleString() : "—";
    const bar = best != null ? Math.min(best / GAME_MAX[g], 1) : 0;
    return [label, scoreStr, bar];
  });

  return (
    <>
      <ScreenHead num="05" title="Profile" note="your stats across all games" />
      <CRT>
        <Bezel title={`/profile/${displayName.toLowerCase()}`} right={<span className="muted" style={{ fontSize: 14 }}>member since APR 2026</span>} />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 30, flex: 1 }}>
          {/* Left: identity + stats */}
          <div className="col">
            <div className="row">
              <div style={{ width: 72, height: 72, background: "var(--phos)", color: "#000", display: "grid", placeItems: "center", fontFamily: "'Press Start 2P'", fontSize: 24, boxShadow: "5px 5px 0 var(--pink)" }}>
                {displayName.slice(0, 2)}
              </div>
              <div className="col">
                <div className="pixel" style={{ fontSize: 18, color: "#fff" }}>{displayName}</div>
                <div className="muted" style={{ fontSize: 14 }}>@{displayName.toLowerCase()} · id {userId}</div>
                <div style={{ marginTop: 4 }}>
                  <span className="pill accent">LVL {String(level).padStart(2, "0")}</span>&nbsp;
                  <span className="pill">{level < 5 ? "BRONZE" : level < 15 ? "SILVER" : "GOLD"}</span>
                </div>
              </div>
            </div>

            <div style={{ fontFamily: "'VT323'", fontSize: 17, marginTop: 10 }}>
              <div className="pixel phos" style={{ fontSize: 10, marginBottom: 8 }}>&gt; /stats</div>
              {loadingStats
                ? <div className="muted">LOADING...</div>
                : <>
                    <div className="bright">GAMES....... {gamesPlayed}</div>
                    <div className="bright">LEVEL....... {level}</div>
                  </>
              }
              <div className="pink" style={{ marginTop: 8 }}>▌</div>
            </div>
          </div>

          {/* Right: per-game bests */}
          <div className="col">
            <div className="label">PER-GAME BEST</div>
            {perGame.map(([g, s, p]) => (
              <div key={g} style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "2px dashed var(--phos-dim)" }}>
                <div className="pixel bright" style={{ fontSize: 10 }}>{g}</div>
                <div className="bar"><span style={{ width: `${p * 100}%` }} /></div>
                <div className="pixel" style={{ fontSize: 9, textAlign: "right" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12 }}>
          <span className="muted pixel" style={{ fontSize: 8 }}>scores synced via dynamodb</span>
          <div className="row">
            <button className="btn ghost">EDIT</button>
            <button className="btn" onClick={signOut}>SIGN OUT</button>
          </div>
        </div>
      </CRT>
    </>
  );
}
