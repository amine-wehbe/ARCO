import MusicPlayer from "./MusicPlayer";

// Section label shown above each CRT frame — music player sits on the right of the same row.
export default function ScreenHead({ num, title, note }) {
  return (
    <div className="screen-head">
      <div className="screen-head-left">
        <h2>{num} · {title}</h2>
        <p>{note}</p>
      </div>
      <MusicPlayer />
    </div>
  );
}
