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

// Layout wrapper — no top nav, navigation handled within each screen
export default function Layout({ children }) {
  return <main>{children}</main>;
}
