import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { useClickSound } from "../hooks/useClickSound";
import { fetchPlatformStats } from "../api/client";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

const MENU = ["PLAY AS GUEST", "SIGN IN", "CREATE ACCOUNT", "OPTIONS"];

export default function Landing() {
  const { signInAsGuest, signIn, signUp, confirm, navigate, authError, setAuthError, pendingEmail } = useApp();
  const playClick = useClickSound();
  const [cursor,       setCursor]      = useState(0);
  const [platformStats, setPlatformStats] = useState(null);

  // Fetch real user count + global hi score on mount
  useEffect(() => {
    fetchPlatformStats().then(setPlatformStats).catch(() => {});
  }, []);
  const [mode, setMode]     = useState("menu");
  const [form, setForm]     = useState({ username: "", password: "", email: "", code: "" });
  const [loading, setLoading] = useState(false);

  function handleSelect(i) {
    playClick();
    if (i === 0) { signInAsGuest(); return; }
    if (i === 1) { setMode("signin"); setAuthError(null); return; }
    if (i === 2) { setMode("signup"); setAuthError(null); return; }
    if (i === 3) { navigate("settings"); return; }
  }

  // Arrow keys + Enter navigate the main menu; disabled when form is open
  useKeyNav(e => {
    if (mode !== "menu") return;
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => (c - 1 + MENU.length) % MENU.length); }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => (c + 1) % MENU.length); }
    if (e.key === "Enter")     { e.preventDefault(); handleSelect(cursor); }
  }, [mode, cursor]);

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true);
    await signIn(form.email, form.password);
    setLoading(false);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    const ok = await signUp(form.username, form.password, form.email);
    setLoading(false);
    if (ok) setMode("confirm");
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setLoading(true);
    await confirm(form.code);
    setLoading(false);
  }

  function field(key, placeholder, type = "text") {
    return (
      <div className="col" style={{ gap: 4 }}>
        <div className="label">{placeholder}</div>
        <input
          className="input" type={type} placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ maxWidth: 340 }}
        />
      </div>
    );
  }

  return (
    <>
      <ScreenHead num="01" title="Landing" note="press start · guest or sign in" />
      <CRT>
        <Bezel title="· · A R C O · ·" right={<span className="muted" style={{ fontSize: 14 }}>© CODE OF DUTY PRESENTS</span>} />

        <div style={{ textAlign: "center", margin: "60px 0 10px" }}>
          <div className="pixel-title" style={{ fontSize: 28, letterSpacing: "0.3em", color: "var(--phos-dim)" }}>
            A R C O
          </div>
          <div className="pixel-title" style={{ fontSize: 52, letterSpacing: "0.05em", marginTop: 8 }}>
            PRESS START
          </div>
        </div>
        <div className="pixel" style={{ textAlign: "center", fontSize: 12, marginBottom: 40, color: "var(--phos)" }}>
          &gt; READY PLAYER ONE<span className="blink">_</span>
        </div>

        {mode === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginBottom: 50 }}>
            {MENU.map((label, i) => (
              <div
                key={i}
                className={"menu-item" + (cursor === i ? " active" : "")}
                style={{ width: 340, cursor: "pointer" }}
                onMouseEnter={() => setCursor(i)}
                onClick={() => handleSelect(i)}
              >
                <span className="arrow pixel">{cursor === i ? "▸" : " "}</span>
                <span>{label}</span>
                <span />
              </div>
            ))}
          </div>
        )}

        {(mode === "signin" || mode === "signup") && (
          <form
            onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
            style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", marginBottom: 40 }}
          >
            <div className="pixel" style={{ fontSize: 12, color: "var(--phos)", marginBottom: 8 }}>
              {mode === "signin" ? "── SIGN IN ──" : "── CREATE ACCOUNT ──"}
            </div>
            {mode === "signup" && field("username", "USERNAME")}
            {field("email", "EMAIL", "email")}
            {field("password", "PASSWORD", "password")}
            {authError && <div className="pixel" style={{ fontSize: 8, color: "var(--pink)" }}>⚠ {authError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn primary" disabled={loading} onClick={playClick}>
                {loading ? "..." : mode === "signin" ? "SIGN IN" : "CREATE"}
              </button>
              <button type="button" className="btn ghost" onClick={() => { playClick(); setMode("menu"); setAuthError(null); }}>
                BACK
              </button>
            </div>
          </form>
        )}

        {mode === "confirm" && (
          <form
            onSubmit={handleConfirm}
            style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", marginBottom: 40 }}
          >
            <div className="pixel" style={{ fontSize: 12, color: "var(--phos)", marginBottom: 8 }}>
              ── VERIFY EMAIL ──
            </div>
            <div className="pixel" style={{ fontSize: 9, color: "var(--phos-dim)", textAlign: "center", maxWidth: 300 }}>
              CHECK YOUR EMAIL FOR A VERIFICATION CODE
            </div>
            {field("code", "VERIFICATION CODE")}
            {authError && <div className="pixel" style={{ fontSize: 8, color: "var(--pink)" }}>⚠ {authError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn primary" disabled={loading} onClick={playClick}>
                {loading ? "..." : "CONFIRM"}
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12 }}>
          <div className="row">
            <span className="kbd">↑</span><span className="kbd">↓</span><span className="kbd">ENTER</span>
            <span className="muted">navigate · select</span>
          </div>
          <span className="muted pixel" style={{ fontSize: 8 }}>
            ● {platformStats ? `${platformStats.totalUsers.toLocaleString()} PLAYERS` : "— PLAYERS"} · © 2026
          </span>
        </div>
      </CRT>
    </>
  );
}
