import GameThumb from "./GameThumb";

// Arcade cabinet tile used in the Library screen
export default function Cabinet({ name, tag, hi, selected, empty, onClick }) {
  if (empty) {
    return (
      <div className="cabinet empty" onClick={onClick}>
        <div className="body">
          <div className="marquee" />
          <div className="screen-sm" style={{ marginTop: 6 }}>SOON</div>
          <div className="joystick" />
          <div className="buttons"><span /><span /><span /></div>
          <div className="base" />
        </div>
        <div className="label">? ? ? ? ?</div>
      </div>
    );
  }

  return (
    <div className={`cabinet${selected ? " selected" : ""}`} onClick={onClick}>
      <div className="body">
        <div className="marquee">{name}</div>
        <div className="screen-sm" style={{ marginTop: 6, padding: 0, overflow: "hidden" }}><GameThumb name={name} /></div>
        <div className="joystick" />
        <div className="buttons"><span /><span /><span /></div>
        <div className="base" />
      </div>
      <div className="label">{name}</div>
      {hi !== "---" && <div className="muted" style={{ fontFamily: "'Press Start 2P'", fontSize: 7 }}>HI {hi}</div>}
    </div>
  );
}
