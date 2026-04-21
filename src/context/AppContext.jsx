import { createContext, useContext, useState, useEffect } from "react";
import { cognitoSignIn, cognitoSignUp, cognitoConfirm, cognitoSignOut, createUserProfile } from "../api/client";
import { ADMIN_IDS } from "../config/admins";

const Ctx = createContext(null);

const SCREENS = ["landing", "library", "ingame", "leaderboard", "profile", "admin", "settings"];

const DEFAULT_TWEAKS = { accent: "#4ef59a", pink: "#ff3b6b", scan: "on", g5: "PONG", music: localStorage.getItem("arco_music") || "8BIT", sound: localStorage.getItem("arco_sound") || "ON" };

export function AppProvider({ children }) {
  const [screen, setScreen]       = useState("landing");
  const [prevScreen, setPrevScreen] = useState("landing");
  const [user, setUser]           = useState(null);
  const [activeGame, setActiveGame] = useState("SNAKE");
  const [tweaks, setTweaksState]    = useState(DEFAULT_TWEAKS);
  const [authError, setAuthError]   = useState(null);
  const [pendingEmail, setPendingEmail] = useState(null); // set after signup, cleared after confirm

  // Apply tweaks as CSS custom properties
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--phos", tweaks.accent);
    r.style.setProperty("--pink", tweaks.pink);
    r.dataset.scan = tweaks.scan;
  }, [tweaks]);

  function setTweaks(updates) {
    if (updates.music !== undefined) localStorage.setItem("arco_music", updates.music);
    if (updates.sound !== undefined) localStorage.setItem("arco_sound", updates.sound);
    setTweaksState(prev => ({ ...prev, ...updates }));
  }

  function navigate(target) {
    if (SCREENS.includes(target)) {
      setPrevScreen(screen);
      setScreen(target);
    }
  }

  async function signInAsGuest() {
    setUser({ userId: "guest", displayName: "GUEST_" + Math.floor(Math.random() * 900 + 100), isGuest: true });
    navigate("library");
  }

  // Sign in with email + password, fetch profile from DynamoDB
  async function signIn(email, password) {
    setAuthError(null);
    try {
      const u = await cognitoSignIn(email, password);
      setUser({ ...u, isGuest: false });
      navigate("library");
    } catch (e) {
      setAuthError(e.message);
    }
  }

  // Sign up — Cognito sends verification email, returns true on success so UI can move to confirm
  async function signUp(username, password, email) {
    setAuthError(null);
    try {
      await cognitoSignUp(username, password, email);
      setPendingEmail({ email, password, username });
      return true;
    } catch (e) {
      setAuthError(e.message);
      return false;
    }
  }

  // Confirm email code → login → create DynamoDB profile → go to library
  async function confirm(code) {
    setAuthError(null);
    try {
      await cognitoConfirm(pendingEmail.email, code);
      const u = await cognitoSignIn(pendingEmail.email, pendingEmail.password);
      await createUserProfile(pendingEmail.username);
      setPendingEmail(null);
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

  // Merge partial updates into the user object (e.g. after profile edit)
  function updateUser(fields) {
    setUser(prev => prev ? { ...prev, ...fields } : prev);
  }

  const isAdmin = ADMIN_IDS.includes(user?.userId);

  return (
    <Ctx.Provider value={{ screen, prevScreen, navigate, user, updateUser, isAdmin, activeGame, launchGame, tweaks, setTweaks, signInAsGuest, signIn, signUp, confirm, signOut, authError, setAuthError, pendingEmail }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
