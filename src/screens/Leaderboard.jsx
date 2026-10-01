import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { useClickSound } from "../hooks/useClickSound";
import { fetchLeaderboard } from "../api/client";
import { ADMIN_IDS } from "../config/admins";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

// Top-10 per game from GET /scores/:gameId?period= (DynamoDB GSI sorted by score)

const PERIODS = ["TODAY", "WEEK", "ALL TIME"];
const PERIOD_PARAM = { "TODAY": "today", "WEEK": "week", "ALL TIME": "all" };
// Battleship has no score to rank (it only counts games played), so it has no leaderboard
const GAMES = ["SNAKE", "FLAPPY", "MEMORY"];

export default function Leaderboard() {
  const { navigate, user } = useApp();
  const playClick = useClickSound();

  const [gameIdx,   setGameIdx]   = useState(0);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(false);

  const game   = GAMES[gameIdx];
  const period = PERIODS[periodIdx];

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(game, PERIOD_PARAM[period])
      .then(data => {
        if (!data?.leaderboard) { setRows([]); return; }
        const mapped = data.leaderboard.map((item, i) => [
          String(i + 1).padStart(2, "0"),
          item.username || item.userId.slice(0, 8),
          item.score,
          new Date(item.timestamp).toLocaleDateString(),
          item.userId === user?.userId,
          ADMIN_IDS.includes(item.userId),
        ]);
        setRows(mapped);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [game, period]);

  // Left/right switches game, up/down switches period, ESC goes back
  useKeyNav(e => {
    if (e.key === "ArrowLeft")  { e.preventDefault(); setGameIdx(i => (i - 1 + GAMES.length) % GAMES.length); }
    if (e.key === "ArrowRight") { e.preventDefault(); setGameIdx(i => (i + 1) % GAMES.length); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setPeriodIdx(i => (i - 1 + PERIODS.length) % PERIODS.length); }
    if (e.key === "ArrowDown")  { e.preventDefault(); setPeriodIdx(i => (i + 1) % PERIODS.length); }
    if (e.key === "Escape")     { e.preventDefault(); navigate("library"); }
  }, [gameIdx, periodIdx]);

  return (
    <>
      <ScreenHead num="04" title="Leaderboard" note="per-game high scores — classic arcade style" />
      <CRT>
        <Bezel
          title="HIGH SCORES"
          right={
            <div className="row" style={{ gap: 6 }}>
              {GAMES.map((g, i) => (
                <span key={g} className={"pill" + (gameIdx === i ? " accent" : "")} style={{ cursor: "pointer" }} onClick={() => { playClick(); setGameIdx(i); }}>{g}</span>
              ))}
            </div>
          }
        />

        <div className="pixel-title" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 18px" }}>
          -- TOP SCORES · {game} --
        </div>

        <table className="table" style={{ flex: 1 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>NAME</th>
              <th style={{ width: 120, textAlign: "right" }}>SCORE</th>
              <th style={{ width: 80,  textAlign: "right" }}>TIME</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={5} style={{ textAlign: "center", padding: 30 }} className="muted pixel">LOADING...</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={5} style={{ textAlign: "center", padding: 30 }} className="muted pixel">NO SCORES YET — BE THE FIRST</td></tr>
              : rows.map(r => (
                <tr key={r[0]} className={r[4] ? "you" : ""}>
                  <td className="pixel" style={{ fontSize: 10, color: "var(--phos)" }}>{r[0]}</td>
                  <td>
                    {r[1]}
                    {r[5] && <span className="pill accent" style={{ fontSize: 8, marginLeft: 6, padding: "1px 5px" }}>ADMIN</span>}
                  </td>
                  <td className="pixel" style={{ fontSize: 10, textAlign: "right" }}>{r[2]}</td>
                  <td style={{ textAlign: "right" }}>{r[3]}</td>
                  <td style={{ color: "var(--pink)", fontSize: 13 }}>{r[4] ? "◂ YOU" : ""}</td>
                </tr>
              ))
            }
          </tbody>
        </table>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12 }}>
          <div className="row" style={{ gap: 6 }}>
            {PERIODS.map((p, i) => (
              <span key={p} className={"pill" + (periodIdx === i ? " accent" : "")} style={{ cursor: "pointer" }} onClick={() => { playClick(); setPeriodIdx(i); }}>{p}</span>
            ))}
          </div>
          <div className="row">
            <span className="kbd">← →</span><span className="muted">game</span>
            <span className="kbd">↑ ↓</span><span className="muted">period</span>
            <span className="kbd">ESC</span><span className="muted">back</span>
          </div>
        </div>
      </CRT>
    </>
  );
}
