// Pixel-art SVG preview thumbnails shown on each cabinet's mini screen.

const G = "#4ef59a";   // phosphor green
const GB = "#aef5c2";  // bright green
const GD = "#2a6a45";  // dim green
const PK = "#ff3b6b";  // pink/red
const AM = "#e8a100";  // amber

function Snake() {
  const body = [[58,8],[49,8],[40,8],[31,8],[22,8],[22,17],[22,26],[31,26],[40,26]];
  const dots = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 10; c++)
      dots.push([c * 9 + 4, r * 9 + 4]);
  return (
    <svg viewBox="0 0 92 60" width="100%" height="100%">
      {dots.map(([x, y], i) => <rect key={i} x={x} y={y} width="1.5" height="1.5" fill={GD} />)}
      {body.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="8" height="8" fill={i === 0 ? GB : G} rx="1" />
      ))}
      {/* eyes */}
      <rect x="63" y="10" width="2" height="2" fill="#000" />
      {/* food */}
      <rect x="58" y="44" width="7" height="7" fill={PK} rx="1" />
      <rect x="60" y="42" width="3" height="2" fill={GD} />
    </svg>
  );
}

function Flappy() {
  return (
    <svg viewBox="0 0 92 60" width="100%" height="100%">
      {/* pipe 1 */}
      <rect x="8"  y="0"  width="14" height="24" fill={G} />
      <rect x="6"  y="20" width="18" height="5"  fill={GB} />
      <rect x="8"  y="38" width="14" height="22" fill={G} />
      <rect x="6"  y="38" width="18" height="5"  fill={GB} />
      {/* pipe 2 */}
      <rect x="58" y="0"  width="14" height="18" fill={G} />
      <rect x="56" y="14" width="18" height="5"  fill={GB} />
      <rect x="58" y="34" width="14" height="26" fill={G} />
      <rect x="56" y="34" width="18" height="5"  fill={GB} />
      {/* bird — wing, body, tail, beak right, eye */}
      <rect x="32" y="21" width="11" height="5"  fill="#2a9960" rx="1" />
      <rect x="30" y="25" width="16" height="11" fill={G} rx="4" />
      <rect x="24" y="26" width="8"  height="3"  fill="#2a9960" rx="1" />
      <rect x="23" y="30" width="8"  height="3"  fill="#2a9960" rx="1" />
      <rect x="46" y="28" width="6"  height="3"  fill={AM} rx="1" />
      <rect x="39" y="26" width="5"  height="5"  fill="#fff" rx="2" />
      <rect x="41" y="27" width="2"  height="2"  fill="#000" />
      {/* score */}
      <text x="46" y="10" textAnchor="middle" fontFamily="monospace" fontSize="8" fill={GB}>2</text>
    </svg>
  );
}

function Memory() {
  const cards = [
    { sym: "♠", red: false }, { sym: "♥", red: true  }, { sym: "★", red: false }, { sym: "♦", red: true  },
    { sym: "♥", red: true  }, { sym: null             }, { sym: "♠", red: false }, { sym: null             },
    { sym: "★", red: false }, { sym: null             }, { sym: "♦", red: true  }, { sym: null             },
  ];
  return (
    <svg viewBox="0 0 92 60" width="100%" height="100%">
      {cards.map((c, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = col * 22 + 4, y = row * 18 + 3;
        return (
          <g key={i}>
            <rect x={x} y={y} width="18" height="14" fill={c.sym ? "#0a1a0f" : "#111"} stroke={c.sym ? G : GD} strokeWidth="1.5" rx="1" />
            {c.sym
              ? <text x={x + 9} y={y + 10} textAnchor="middle" fontSize="9" fill={c.red ? PK : G} fontFamily="serif">{c.sym}</text>
              : <><line x1={x+3} y1={y+3} x2={x+15} y2={y+11} stroke={GD} strokeWidth="1.2"/>
                  <line x1={x+15} y1={y+3} x2={x+3} y2={y+11} stroke={GD} strokeWidth="1.2"/></>
            }
          </g>
        );
      })}
    </svg>
  );
}

function Battleship() {
  const hits   = [[1,0],[1,1]];
  const misses = [[4,2]];
  return (
    <svg viewBox="0 0 92 60" width="100%" height="100%">
      {/* grid */}
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <rect key={`${r}-${c}`} x={c*14+4} y={r*10+4} width="12" height="8" fill="transparent" stroke={GD} strokeWidth="1" rx="1" />
        ))
      )}
      {/* ships */}
      <rect x="4"  y="14" width="26" height="8" fill={GD} rx="1" />
      <rect x="46" y="34" width="40" height="8" fill={GD} rx="1" />
      {/* hits */}
      {hits.map(([c, r], i) => (
        <g key={i}>
          <line x1={c*14+6}  y1={r*10+6}  x2={c*14+14} y2={r*10+12} stroke={PK} strokeWidth="2" />
          <line x1={c*14+14} y1={r*10+6}  x2={c*14+6}  y2={r*10+12} stroke={PK} strokeWidth="2" />
        </g>
      ))}
      {/* misses */}
      {misses.map(([c, r], i) => (
        <circle key={i} cx={c*14+10} cy={r*10+8} r="3" fill="none" stroke={G} strokeWidth="1.5" />
      ))}
      <text x="4" y="57" fontFamily="monospace" fontSize="6" fill={G}>2P · LOCAL</text>
    </svg>
  );
}

// Entry point — pick thumbnail by game name, fall back to name text.
export default function GameThumb({ name }) {
  if (name === "SNAKE")      return <Snake />;
  if (name === "FLAPPY")     return <Flappy />;
  if (name === "MEMORY")     return <Memory />;
  if (name === "BATTLESHIP") return <Battleship />;
  return <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "#4ef59a" }}>{name.slice(0, 5)}</span>;
}
