import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { fetchAdminMetrics, fetchAdminAlerts } from "../api/client";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

// AWS_WIRE: fetchAdminMetrics() → GET /admin/metrics → CloudWatch GetMetricData via Lambda
// AWS_WIRE: fetchAdminAlerts()  → GET /admin/alerts  → CloudWatch alarms list via Lambda
// Both endpoints should be IAM-protected (not behind Cognito) — attach an IAM policy to your Lambda role.

const MOCK_CARDS = [
  { k: "EC2",    big: "8/8",    sub: "healthy instances" },
  { k: "ASG",    big: "DESIRED 8", sub: "min 4 · max 16" },
  { k: "S3",     big: "412 GB", sub: "assets + replays" },
  { k: "DYNAMO", big: "1.2k/s", sub: "reads · 3 tbls" },
];

const MOCK_ALERTS = [
  { level: "WARN", msg: "tic-tac ws p95 > 120ms", age: "2m" },
  { level: "INFO", msg: "ASG scaled 6 → 8",        age: "14m" },
];

const MOCK_ACTIVE = [["SNAKE",421],["FLAPPY",318],["TIC-TAC",212],["MEMORY",94],["PONG",58]];

export default function Admin() {
  const { navigate, isAdmin } = useApp();
  const [cards]  = useState(MOCK_CARDS);
  const [alerts] = useState(MOCK_ALERTS);
  const [active] = useState(MOCK_ACTIVE);

  // Hard gate — non-admins are immediately bounced, nothing renders
  useEffect(() => {
    if (!isAdmin) navigate("library");
  }, [isAdmin]);

  useKeyNav(e => {
    if (e.key === "Escape") { e.preventDefault(); navigate("library"); }
  }, []);

  if (!isAdmin) return null;

  // Uncomment when API Gateway is live:
  // useEffect(() => {
  //   fetchAdminMetrics().then(setCards).catch(() => {});
  //   fetchAdminAlerts().then(setAlerts).catch(() => {});
  // }, []);

  const alertPill = lvl => lvl === "WARN"
    ? <span className="pill warn">{lvl}</span>
    : <span className="pill">{lvl}</span>;

  return (
    <>
      <ScreenHead num="06" title="Admin" note="AWS ops — team-only, hidden from players" />
      <CRT>
        <Bezel
          title="ARCO · OPS · us-east-1"
          right={<div className="row" style={{ gap: 6 }}><span className="pill accent">PROD</span><span className="pill" style={{ color: "var(--phos-bright)" }}>● ALL GREEN</span></div>}
        />

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {cards.map(({ k, big, sub }) => (
            <div key={k} style={{ border: "2px solid var(--phos-dim)", padding: 12, background: "rgba(78,245,154,0.03)" }}>
              <div className="label">{k}</div>
              <div className="stat" style={{ marginTop: 4 }}>{big}</div>
              <div className="muted" style={{ fontSize: 14 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* CPU chart */}
        <div style={{ border: "2px solid var(--phos-dim)", padding: 12 }}>
          <div className="row">
            <div className="label">CPU · LAST 1H · arco-api ASG</div>
            <div className="grow" />
            <span className="pill">CLOUDWATCH</span>
          </div>
          <svg viewBox="0 0 600 100" style={{ width: "100%", height: 100, marginTop: 6 }}>
            <path d="M0,70 L40,65 L80,60 L120,68 L160,52 L200,46 L240,50 L280,38 L320,32 L360,40 L400,28 L440,34 L480,26 L520,32 L560,24 L600,30" fill="none" stroke="var(--phos)" strokeWidth="2" />
            <line x1="0" y1="30" x2="600" y2="30" stroke="var(--pink)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="595" y="26" textAnchor="end" fontFamily="'Press Start 2P'" fontSize="8" fill="var(--pink)">threshold 70%</text>
          </svg>
        </div>

        {/* Alerts + active players */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="col">
            <div className="label">ALERTS</div>
            {alerts.map((a, i) => (
              <div key={i} style={{ border: "2px solid var(--phos-dim)", padding: 8, display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 10, alignItems: "center" }}>
                {alertPill(a.level)}
                <div className="bright">{a.msg}</div>
                <span className="muted" style={{ fontSize: 13 }}>{a.age}</span>
              </div>
            ))}
          </div>
          <div className="col">
            <div className="label">ACTIVE PLAYERS · PER GAME</div>
            {active.map(([g, n]) => (
              <div key={g} style={{ display: "grid", gridTemplateColumns: "80px 1fr 50px", gap: 10, alignItems: "center" }}>
                <div className="pixel bright" style={{ fontSize: 9 }}>{g}</div>
                <div className="bar"><span style={{ width: `${(n / 500) * 100}%` }} /></div>
                <div className="pixel" style={{ fontSize: 9, textAlign: "right" }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </CRT>
    </>
  );
}
