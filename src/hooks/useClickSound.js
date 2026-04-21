import { useCallback } from "react";
import { useApp } from "../context/AppContext";

// Returns playClick() — generates a short arcade beep via Web Audio API
export function useClickSound() {
  const { tweaks } = useApp();

  return useCallback(() => {
    if (tweaks.sound !== "ON") return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume().then(() => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
      osc.onended = () => ctx.close();
    });
  }, [tweaks.sound]);
}
