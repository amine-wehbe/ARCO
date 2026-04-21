import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { fetchAdminStats } from "../api/client";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

export default function Admin() {
  const { navigate, isAdmin } = useApp();
  const [stats,   setStats]   = useState(null);
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);

  // Hard gate — non-admins are immediately bounced, nothing renders
  useEffect(() => {
    if (!isAdmin) navigate("library");
  }, [isAdmin]);

  useKeyNav(e => {
    if (e.key === "Escape") { e.preventDefault(); navigate("library"); }
  }, []);

  // Fetch EC2 health + admin stats in parallel
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      fetch(import.meta.env.VITE_API_BASE_URL + "/health")
        .then(r => r.json()).catch(() => null),
      fetchAdminStats().catch(() => null),
    ]).then(([h, s]) => {
      setHealth(h);
      setStats(s);
    }).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  const games = stats?.games ?? [];
  const maxScores = Math.max(...games.map(g => g.totalScores), 1);

  return (
    <>
      <ScreenHead num="06" title="Admin" note="ops dashboard — restricted access" />
      <CRT>
        <Bezel
          title="ARCO · OPS"
          right={
            <div className="row" style={{ gap: 6 }}>
              <span className="pill accent">PROD</span>
              <span className="pill" style={{ color: health?.status === "ok" ? "var(--phos)" : "var(--pink)" }}>
                ● {health?.status === "ok" ? "EC2 ONLINE" : "EC2 OFFLINE"}
              </span>
            </div>
          }
        />

        {loading ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center" }} className="muted pixel">LOADING...</div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {/* Total users */}
              <div style={{ border: "2px solid var(--phos-dim)", padding: 12, background: "rgba(78,245,154,0.03)" }}>
                <div className="label">USERS</div>
                <div className="stat" style={{ marginTop: 4 }}>{stats?.totalUsers ?? "—"}</div>
                <div className="muted" style={{ fontSize: 14 }}>registered accounts</div>
              </div>
              {/* Total scores */}
              <div style={{ border: "2px solid var(--phos-dim)", padding: 12, background: "rgba(78,245,154,0.03)" }}>
                <div className="label">SCORES</div>
                <div className="stat" style={{ marginTop: 4 }}>{games.reduce((a, g) => a + g.totalScores, 0)}</div>
                <div className="muted" style={{ fontSize: 14 }}>runs submitted</div>
              </div>
              {/* EC2 status */}
              <div style={{ border: "2px solid var(--phos-dim)", padding: 12, background: "rgba(78,245,154,0.03)" }}>
                <div className="label">EC2</div>
                <div className="stat" style={{ marginTop: 4, color: health?.status === "ok" ? "var(--phos)" : "var(--pink)" }}>
                  {health?.status === "ok" ? "ONLINE" : "OFFLINE"}
                </div>
                <div className="muted" style={{ fontSize: 14 }}>eu-west-1 · t3.micro</div>
              </div>
            </div>

            {/* Per-game stats */}
            <div style={{ border: "2px solid var(--phos-dim)", padding: 12 }}>
              <div className="label" style={{ marginBottom: 12 }}>PER-GAME STATS</div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 160px", gap: 10, marginBottom: 8 }}>
                <div className="muted" style={{ fontSize: 11 }}>GAME</div>
                <div className="muted" style={{ fontSize: 11 }}>RUNS</div>
                <div className="muted" style={{ fontSize: 11, textAlign: "right" }}>TOP SCORE</div>
                <div className="muted" style={{ fontSize: 11, textAlign: "right" }}>TOP PLAYER</div>
              </div>
              {games.map(g => (
                <div key={g.gameId} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 160px", gap: 10, alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--phos-dim)" }}>
                  <div className="pixel bright" style={{ fontSize: 9 }}>{g.gameId.toUpperCase()}</div>
                  <div className="bar"><span style={{ width: `${(g.totalScores / maxScores) * 100}%` }} /></div>
                  <div className="pixel" style={{ fontSize: 9, textAlign: "right" }}>{g.totalScores} runs</div>
                  <div style={{ textAlign: "right", fontSize: 13 }}>
                    {g.topPlayer} <span className="phos pixel" style={{ fontSize: 9 }}>{g.topScore > 0 ? g.topScore.toLocaleString() : "—"}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CPU chart — visual only */}
            <div style={{ border: "2px solid var(--phos-dim)", padding: 12 }}>
              <div className="row">
                <div className="label">CPU · LAST 1H · arco-api EC2</div>
                <div className="grow" />
                <span className="pill">CLOUDWATCH</span>
              </div>
              <svg viewBox="0 0 600 80" style={{ width: "100%", height: 80, marginTop: 6 }}>
                <path d="M0,60 L40,55 L80,50 L120,58 L160,42 L200,36 L240,40 L280,28 L320,22 L360,30 L400,18 L440,24 L480,16 L520,22 L560,14 L600,20" fill="none" stroke="var(--phos)" strokeWidth="2" />
                <line x1="0" y1="20" x2="600" y2="20" stroke="var(--pink)" strokeWidth="1" strokeDasharray="4 4" />
                <text x="595" y="16" textAnchor="end" fontFamily="'Press Start 2P'" fontSize="8" fill="var(--pink)">70%</text>
              </svg>
            </div>
          </>
        )}

        <div style={{ marginTop: "auto", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <span className="kbd">ESC</span><span className="muted">back</span>
        </div>
      </CRT>
    </>
  );
}
