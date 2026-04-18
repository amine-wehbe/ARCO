import { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { useMusic } from "./hooks/useMusic";
import Layout from "./components/Layout";
import TweaksPanel from "./components/TweaksPanel";
import Landing     from "./screens/Landing";
import Library     from "./screens/Library";
import InGame      from "./screens/InGame";
import Leaderboard from "./screens/Leaderboard";
import Profile     from "./screens/Profile";
import Admin       from "./screens/Admin";
import Settings    from "./screens/Settings";

function Router() {
  const { screen, tweaks } = useApp();
  const [tweaksOpen, setTweaksOpen] = useState(false);
  useMusic(tweaks.music);

  // Wireframe editor compat — open tweaks panel via postMessage
  useEffect(() => {
    const handler = e => {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode")   setTweaksOpen(true);
      if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", handler);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch {}
    return () => window.removeEventListener("message", handler);
  }, []);

  const screens = {
    landing:     <Landing />,
    library:     <Library />,
    ingame:      <InGame />,
    leaderboard: <Leaderboard />,
    profile:     <Profile />,
    admin:       <Admin />,
    settings:    <Settings />,
  };

  return (
    <Layout>
      {screens[screen] ?? <Landing />}
      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
