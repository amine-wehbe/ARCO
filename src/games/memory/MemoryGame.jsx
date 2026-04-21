import { useState, useEffect, useRef } from "react";

const SYMBOLS = ["♠", "♥", "♦", "♣", "★", "◆", "▲", "●"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards() {
  return shuffle([...SYMBOLS, ...SYMBOLS]).map((sym, i) => ({
    id: i, sym, flipped: false, matched: false,
  }));
}

// Props:
//   onGameOver(score) — AWS_WIRE: hook up submitScore("MEMORY", score) in InGame.jsx
export default function MemoryGame({ onGameOver, isGuest, hiScore: dbHiScore = 0 }) {
  const [cards,    setCards]    = useState(makeCards);
  const [flipped,  setFlipped]  = useState([]); // indices of currently face-up unmatched cards
  const [moves,    setMoves]    = useState(0);
  const [seconds,  setSeconds]  = useState(0);
  const [started,  setStarted]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [locked,   setLocked]   = useState(false); // blocks clicks during mismatch delay
  const timerRef = useRef(null);

  // Start timer on first card flip
  useEffect(() => {
    if (started && !done) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [started, done]);

  const hiScore = isGuest ? 0 : dbHiScore;

  function calcScore(moves, seconds) {
    return Math.max(0, 1000 - moves * 15 - seconds * 2);
  }

  function saveHiScore(score) {
    if (!isGuest && score > hiScore) localStorage.setItem("arco_memory_hi", score);
  }

  function reset() {
    setCards(makeCards());
    setFlipped([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setDone(false);
    setLocked(false);
  }

  function flip(idx) {
    if (locked) return;
    if (cards[idx].matched || cards[idx].flipped) return;
    if (flipped.length === 2) return;

    if (!started) setStarted(true);

    const next = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    const newFlipped = [...flipped, idx];
    setCards(next);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (next[a].sym === next[b].sym) {
        // Match
        const matched = next.map((c, i) =>
          i === a || i === b ? { ...c, matched: true, flipped: false } : c
        );
        setCards(matched);
        setFlipped([]);
        if (matched.every(c => c.matched)) {
          setDone(true);
          const score = calcScore(moves + 1, seconds);
          saveHiScore(score);
          onGameOver?.(score);
        }
      } else {
        // Mismatch — flip back after 800ms
        setLocked(true);
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setFlipped([]);
          setLocked(false);
        }, 800);
      }
    }
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <div className="col" style={{ alignItems: "center", gap: 2 }}>
          <div className="label">MOVES</div>
          <div className="pixel" style={{ fontSize: 18, color: "#fff" }}>{String(moves).padStart(3, "0")}</div>
        </div>
        <div className="col" style={{ alignItems: "center", gap: 2 }}>
          <div className="label">TIME</div>
          <div className="pixel" style={{ fontSize: 18, color: "var(--phos)" }}>{fmt(seconds)}</div>
        </div>
        <div className="col" style={{ alignItems: "center", gap: 2 }}>
          <div className="label">PAIRS</div>
          <div className="pixel" style={{ fontSize: 18, color: "#fff" }}>
            {cards.filter(c => c.matched).length / 2} / {SYMBOLS.length}
          </div>
        </div>
        <div className="col" style={{ alignItems: "center", gap: 2 }}>
          <div className="label">BEST</div>
          <div className="pixel" style={{ fontSize: 18, color: "var(--pink)" }}>
            {hiScore > 0 ? hiScore : "---"}
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 80px)", gap: 10 }}>
        {cards.map((card, i) => {
          const isUp = card.flipped || card.matched;
          return (
            <div
              key={card.id}
              onClick={() => flip(i)}
              style={{
                width: 80, height: 96,
                border: card.matched
                  ? "2px solid var(--phos)"
                  : isUp
                    ? "2px solid var(--phos-bright)"
                    : "2px solid var(--phos-dim)",
                background: card.matched
                  ? "rgba(78,245,154,0.1)"
                  : isUp
                    ? "#0d1f14"
                    : "#08080e",
                display: "grid", placeItems: "center",
                cursor: card.matched ? "default" : "pointer",
                transition: "background 0.15s",
                userSelect: "none",
              }}
            >
              {isUp ? (
                <span style={{
                  fontSize: 32,
                  color: card.matched ? "var(--phos)" : "var(--phos-bright)",
                  textShadow: card.matched ? "0 0 10px var(--phos)" : "none",
                }}>
                  {card.sym}
                </span>
              ) : (
                <span className="pixel" style={{ fontSize: 14, color: "var(--phos-dim)" }}>?</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Game over overlay */}
      {done && (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <div className="pixel-title" style={{ fontSize: 18 }}>YOU WIN</div>
          <div className="muted">moves: <span style={{ color: "#fff" }}>{moves}</span> · time: <span style={{ color: "#fff" }}>{fmt(seconds)}</span></div>
          <div className="pixel" style={{ fontSize: 12, color: "var(--phos)" }}>
            SCORE  {String(calcScore(moves, seconds)).padStart(5, "0")}
          </div>
          <button className="btn primary" onClick={reset}>PLAY AGAIN</button>
        </div>
      )}

      {!started && !done && (
        <div className="muted pixel" style={{ fontSize: 8 }}>CLICK ANY CARD TO START</div>
      )}
    </div>
  );
}
