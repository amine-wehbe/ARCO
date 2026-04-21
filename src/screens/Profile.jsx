import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { fetchUserStats, updateProfile } from "../api/client";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

// Hardcoded score ceilings used only for the visual bar width per game
const GAME_MAX = { snake: 50000, flappy: 1000, memory: 5000, battleship: 500 };

// Games shown in the profile per-game section
const PROFILE_GAMES = ["snake", "flappy", "memory", "battleship"];

// 10 pixel avatar color schemes — stored by id in DynamoDB
const AVATARS = [
  { id: "1",  bg: "#00ff88", shadow: "#ff2d78" },
  { id: "2",  bg: "#ff2d78", shadow: "#00ff88" },
  { id: "3",  bg: "#00cfff", shadow: "#ffcc00" },
  { id: "4",  bg: "#ffcc00", shadow: "#00cfff" },
  { id: "5",  bg: "#ff6600", shadow: "#9933ff" },
  { id: "6",  bg: "#9933ff", shadow: "#ff6600" },
  { id: "7",  bg: "#ff3333", shadow: "#00ff88" },
  { id: "8",  bg: "#ffffff", shadow: "#ff2d78" },
  { id: "9",  bg: "#22ffaa", shadow: "#000000" },
  { id: "10", bg: "#ff99cc", shadow: "#000000" },
];

// Return avatar config by id, defaulting to first
function getAvatar(id) {
  return AVATARS.find(a => a.id === String(id)) ?? AVATARS[0];
}

export default function Profile() {
  const { user, updateUser, signOut, navigate } = useApp();
  const [userData,     setUserData]     = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [editing,      setEditing]      = useState(false);
  const [editName,     setEditName]     = useState("");
  const [editAvatar,   setEditAvatar]   = useState("1");
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);

  useKeyNav(e => {
    if (e.key === "Escape") {
      e.preventDefault();
      editing ? setEditing(false) : navigate("library");
    }
  }, [editing]);

  const displayName = user?.displayName ?? "PIXELWYRM";
  const userId      = user?.userId     ?? "u_9f32a1";
  const avatarId    = userData?.avatar ?? user?.avatar ?? "1";
  const avatar      = getAvatar(avatarId);

  useEffect(() => {
    if (!user || user.isGuest) return;
    setLoadingStats(true);
    fetchUserStats(userId)
      .then(data => setUserData(data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [userId]);

  // Seed edit fields when opening edit mode
  function openEdit() {
    setEditName(displayName);
    setEditAvatar(avatarId);
    setSaveError(null);
    setEditing(true);
  }

  // Save username + avatar to backend, update context on success
  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(userId, { username: editName.trim(), avatar: editAvatar });
      updateUser({ displayName: editName.trim(), avatar: editAvatar });
      setUserData(prev => prev ? { ...prev, username: editName.trim(), avatar: editAvatar } : prev);
      setEditing(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Derive level from gamesPlayed using triangular progression
  const gamesPlayed    = userData?.gamesPlayed ?? 0;
  const level          = Math.floor((1 + Math.sqrt(1 + 8 * gamesPlayed)) / 2);
  const gamesAtLevel   = (level * (level - 1)) / 2;
  const gamesIntoLevel = gamesPlayed - gamesAtLevel;
  const gamesNeeded    = level;
  const levelProgress  = gamesNeeded > 0 ? gamesIntoLevel / gamesNeeded : 0;

  // Build per-game rows: [label, scoreStr, barFraction]
  const perGame = PROFILE_GAMES.map(g => {
    const best      = userData?.["best_" + g];
    const scoreStr  = best != null ? best.toLocaleString() : "—";
    const bar       = best != null ? Math.min(best / GAME_MAX[g], 1) : 0;
    return [g.toUpperCase(), scoreStr, bar];
  });

  // Avatar tile component used in both display and picker
  function AvatarTile({ av, size = 72, initials, selected, onClick }) {
    return (
      <div
        onClick={onClick}
        style={{
          width: size, height: size,
          background: av.bg, color: "#000",
          display: "grid", placeItems: "center",
          fontFamily: "'Press Start 2P'", fontSize: size * 0.33,
          boxShadow: `${size * 0.07}px ${size * 0.07}px 0 ${selected ? "#fff" : av.shadow}`,
          cursor: onClick ? "pointer" : "default",
          outline: selected ? "2px solid #fff" : "none",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  }

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <ScreenHead num="05" title="Profile" note="your stats across all games" />
      <CRT>
        <Bezel title={`/profile/${displayName.toLowerCase()}`} right={<span className="muted" style={{ fontSize: 14 }}>member since APR 2026</span>} />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 30, flex: 1 }}>

          {/* Left: identity + stats OR edit panel */}
          {editing ? (
            <div className="col" style={{ gap: 14 }}>
              <div className="pixel phos" style={{ fontSize: 10 }}>&gt; EDIT PROFILE</div>

              {/* Username input */}
              <div className="col" style={{ gap: 6 }}>
                <div className="label">USERNAME</div>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={20}
                  style={{
                    background: "transparent", border: "2px solid var(--phos)",
                    color: "var(--phos)", fontFamily: "'VT323'", fontSize: 20,
                    padding: "4px 8px", outline: "none", width: "100%",
                  }}
                />
              </div>

              {/* Avatar picker */}
              <div className="col" style={{ gap: 6 }}>
                <div className="label">AVATAR</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {AVATARS.map(av => (
                    <AvatarTile
                      key={av.id}
                      av={av}
                      size={48}
                      initials={initials}
                      selected={editAvatar === av.id}
                      onClick={() => setEditAvatar(av.id)}
                    />
                  ))}
                </div>
              </div>

              {saveError && <div style={{ color: "var(--pink)", fontSize: 12 }}>{saveError}</div>}

              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <button className="btn" onClick={handleSave} disabled={saving}>
                  {saving ? "SAVING..." : "SAVE"}
                </button>
                <button className="btn ghost" onClick={() => setEditing(false)}>CANCEL</button>
              </div>
            </div>
          ) : (
            <div className="col">
              <div className="row">
                <AvatarTile av={avatar} size={72} initials={initials} selected={false} />
                <div className="col">
                  <div className="pixel" style={{ fontSize: 18, color: "#fff" }}>{displayName}</div>
                  <div className="muted" style={{ fontSize: 14 }}>@{displayName.toLowerCase()} · id {userId}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="pill accent">LVL {String(level).padStart(2, "0")}</span>&nbsp;
                    <span className="pill">{level < 5 ? "BRONZE" : level < 15 ? "SILVER" : "GOLD"}</span>
                  </div>
                  {/* Level progress bar */}
                  <div style={{ marginTop: 8, width: "100%" }}>
                    <div className="bar" style={{ width: "100%" }}>
                      <span style={{ width: `${levelProgress * 100}%` }} />
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                      {gamesIntoLevel}/{gamesNeeded} games → LVL {String(level + 1).padStart(2, "0")}
                    </div>
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
          )}

          {/* Right: per-game bests (always visible) */}
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
            {!editing && (
              user?.isGuest
                ? <button className="btn ghost" disabled style={{ opacity: 0.4, cursor: "default" }}>EDIT</button>
                : <button className="btn" onClick={openEdit}>EDIT</button>
            )}
            <button className="btn" onClick={signOut}>SIGN OUT</button>
          </div>
        </div>
      </CRT>
    </>
  );
}
