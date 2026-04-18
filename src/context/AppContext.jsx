import { createContext, useContext, useState, useEffect } from "react";
import { cognitoSignIn, cognitoSignUp, cognitoSignOut } from "../api/client";

const Ctx = createContext(null);

const SCREENS = ["landing", "library", "ingame", "leaderboard", "profile", "admin", "settings"];

const DEFAULT_TWEAKS = { accent: "#4ef59a", pink: "#ff3b6b", scan: "on", g5: "PONG", music: localStorage.getItem("arco_music") || "8BIT" };

export function AppProvider({ children }) {
  const [screen, setScreen]   = useState("landing");
  const [user, setUser]       = useState(null);
  const [activeGame, setActiveGame] = useState("SNAKE");
  const [tweaks, setTweaksState]    = useState(DEFAULT_TWEAKS);
  const [authError, setAuthError]   = useState(null);

  // Apply tweaks as CSS custom properties
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--phos", tweaks.accent);
    r.style.setProperty("--pink", tweaks.pink);
    r.dataset.scan = tweaks.scan;
  }, [tweaks]);

  function setTweaks(updates) {
    if (updates.music !== undefined) localStorage.setItem("arco_music", updates.music);
    setTweaksState(prev => ({ ...prev, ...updates }));
  }

  function navigate(target) {
    if (SCREENS.includes(target)) setScreen(target);
  }

  async function signInAsGuest() {
    setUser({ userId: "guest", displayName: "GUEST_" + Math.floor(Math.random() * 900 + 100), isGuest: true });
    navigate("library");
  }

  async function signIn(username, password) {
    setAuthError(null);
    try {
      const u = await cognitoSignIn(username, password);
      setUser({ ...u, isGuest: false });
      navigate("library");
    } catch (e) {
      setAuthError(e.message);
    }
  }

  async function signUp(username, password, email) {
    setAuthError(null);
    try {
      await cognitoSignUp(username, password, email);
      // After sign-up, sign them in automatically
      const u = await cognitoSignIn(username, password);
      setUser({ ...u, isGuest: false });
      navigate("library");
    } catch (e) {
      setAuthError(e.message);
    }
  }

  async function signOut() {
    await cognitoSignOut();
    setUser(null);
    navigate("landing");
  }

  function launchGame(name) {
    setActiveGame(name);
    navigate("ingame");
  }

  return (
    <Ctx.Provider value={{ screen, navigate, user, activeGame, launchGame, tweaks, setTweaks, signInAsGuest, signIn, signUp, signOut, authError, setAuthError }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
