import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

// AWS_WIRE: PATCH /users/{userId} to persist displayName — call updateProfile() from api/client.js

const MUSIC_OPTIONS = ["8BIT", "ARCADE", "OFF"];
const MUSIC_LABELS  = { "8BIT": "8-BIT TUNE", "ARCADE": "ARCADE FUN", "OFF": "OFF" };

export default function Settings() {
  const { tweaks, setTweaks, navigate, signOut } = useApp();
  const [sound,  setSound]  = useState("ON");
  const [diff,   setDiff]   = useState("NORMAL");
  const [motion, setMotion] = useState("OFF");
  const [cursor, setCursor] = useState(0);

  // Flat list of interactive items (sections are skipped in the handler)
  const items = [
    { label: "DISPLAY NAME",  value: "pixelwyrm",                  action: null },
    { label: "EMAIL",         value: "add email to sync",           action: null },
    { label: "SIGN OUT",      value: "▸",                           action: signOut },
    { label: "MUSIC",         value: `◂  ${MUSIC_LABELS[tweaks.music]}  ▸`, toggle: () => setTweaks({ music: MUSIC_OPTIONS[(MUSIC_OPTIONS.indexOf(tweaks.music) + 1) % MUSIC_OPTIONS.length] }) },
    { label: "SOUND",         value: `◂  ${sound}  ▸`,             toggle: () => setSound(s => s === "ON" ? "OFF" : "ON") },
    { label: "DIFFICULTY",    value: `◂ ${diff} ▸`,                toggle: () => setDiff(d => d === "NORMAL" ? "HARD" : "NORMAL") },
    { label: "CRT SCANLINES", value: `◂  ${tweaks.scan.toUpperCase()}  ▸`, toggle: () => setTweaks({ scan: tweaks.scan === "on" ? "off" : "on" }) },
    { label: "REDUCE MOTION", value: `◂  ${motion} ▸`,             toggle: () => setMotion(m => m === "ON" ? "OFF" : "ON") },
  ];

  function activate(i) {
    const item = items[i];
    if (item.action) { item.action(); return; }
    if (item.toggle) item.toggle();
  }

  useKeyNav(e => {
    if (e.key === "ArrowUp")    { e.preventDefault(); setCursor(c => (c - 1 + items.length) % items.length); }
    if (e.key === "ArrowDown")  { e.preventDefault(); setCursor(c => (c + 1) % items.length); }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault(); activate(cursor);
    }
    if (e.key === "Escape")     { e.preventDefault(); navigate("library"); }
  }, [cursor, items]);

  const SECTIONS = [
    { label: "ACCOUNT", indices: [0, 1, 2] },
    { label: "GAME",    indices: [3, 4, 5] },
    { label: "DISPLAY", indices: [6, 7] },
  ];

  return (
    <>
      <ScreenHead num="07" title="Settings" note="short and sweet — just the essentials" />
      <CRT>
        <Bezel title="-- OPTIONS --" right={<span className="muted">press enter to edit</span>} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "20px 60px", justifyContent: "center" }}>
          {SECTIONS.map(sec => (
            <div key={sec.label}>
              <div className="label" style={{ color: "var(--phos)", margin: "18px 0 6px" }}>{sec.label}</div>
              {sec.indices.map(i => {
                const item = items[i];
                const active = cursor === i;
                return (
                  <div
                    key={i}
                    className={"menu-item" + (active ? " active" : "")}
                    style={{ gridTemplateColumns: "140px 1fr", cursor: "pointer" }}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => activate(i)}
                  >
                    <span>{(active ? "▸ " : "  ") + item.label}</span>
                    <span style={{ textAlign: "right", color: active ? "#fff" : "var(--phos-bright)" }}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12 }}>
          <div className="row">
            <span className="kbd">↑</span><span className="kbd">↓</span><span className="muted">navigate</span>
            <span className="kbd">← →</span><span className="muted">change</span>
            <span className="kbd">ENTER</span><span className="muted">confirm</span>
            <span className="kbd">ESC</span><span className="muted">back</span>
          </div>
          <button className="btn" onClick={() => navigate("library")}>SAVE &amp; BACK</button>
        </div>
      </CRT>
    </>
  );
}
