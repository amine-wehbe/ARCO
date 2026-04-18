import { useApp } from "../context/AppContext";

const TABS = [
  { id: "landing",     label: "LANDING" },
  { id: "library",     label: "LIBRARY" },
  { id: "ingame",      label: "IN-GAME" },
  { id: "leaderboard", label: "SCORES" },
  { id: "profile",     label: "PROFILE" },
  { id: "admin",       label: "ADMIN" },
  { id: "settings",    label: "SETTINGS" },
];

// Temporary dev nav — remove once in-screen navigation is fully wired
export default function Layout({ children }) {
  const { screen, navigate } = useApp();

  return (
    <>
      <header className="top">
        <div className="logo">
          <div className="logo-mark">A</div>
          <div>
            <div className="logo-name">ARCO</div>
            <div className="logo-sub">© By Code Of Duty</div>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={"tab" + (screen === t.id ? " active" : "")} onClick={() => navigate(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
