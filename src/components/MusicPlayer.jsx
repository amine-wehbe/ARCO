import { useRef } from "react";
import { useApp } from "../context/AppContext";

const TRACKS = ["8BIT", "ARCADE"];
const LABELS  = { "8BIT": "8-BIT TUNE", "ARCADE": "ARCADE FUN" };

// Persistent mini music player shown in the header on every screen.
export default function MusicPlayer() {
  const { tweaks, setTweaks } = useApp();
  const { music } = tweaks;
  const isPlaying  = music !== "OFF";
  const lastTrack  = useRef(music !== "OFF" ? music : "8BIT");
  if (isPlaying) lastTrack.current = music;

  function togglePlay() {
    setTweaks({ music: isPlaying ? "OFF" : lastTrack.current });
  }

  function nextTrack() {
    const base = isPlaying ? music : lastTrack.current;
    const next = TRACKS[(TRACKS.indexOf(base) + 1) % TRACKS.length];
    setTweaks({ music: next });
  }

  const label = LABELS[isPlaying ? music : lastTrack.current];

  return (
    <div className="music-player">
      <span className="pixel" style={{ fontSize: 8, color: "var(--phos-dim)" }}>♪</span>
      <div className="music-label" style={{ color: isPlaying ? "var(--phos)" : "var(--phos-dim)" }}>
        <span key={label} className="pixel music-label-inner">{label}</span>
      </div>
      <button className="music-btn pixel" onClick={togglePlay} title={isPlaying ? "pause" : "play"}>
        {isPlaying ? "⏸" : "▶"}
      </button>
      <button className="music-btn pixel" onClick={nextTrack} title="next track">
        ▶▶
      </button>
    </div>
  );
}
