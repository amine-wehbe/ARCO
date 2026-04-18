import { useEffect, useRef } from "react";

const TRACKS = {
  "8BIT":   "/music/track_8bit.mp3",
  "ARCADE": "/music/track_arcade.mp3",
};

// Manages a looping background audio track. Tries immediately; retries on first gesture if blocked.
export function useMusic(music) {
  const audioRef   = useRef(null);
  const currentKey = useRef(null);

  useEffect(() => {
    if (music === "OFF") {
      audioRef.current?.pause();
      return;
    }

    if (currentKey.current !== music) {
      audioRef.current?.pause();
      audioRef.current      = new Audio(TRACKS[music]);
      audioRef.current.loop = true;
      currentKey.current    = music;
    }

    const tryPlay = () => audioRef.current?.play().catch(() => {});
    tryPlay();
    // Retry on first click in case browser blocked autoplay before any gesture
    document.addEventListener("click", tryPlay, { once: true });
    return () => document.removeEventListener("click", tryPlay);
  }, [music]);

  // Pause on unmount
  useEffect(() => () => { audioRef.current?.pause(); }, []);
}
