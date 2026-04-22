import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { useKeyNav } from "../../hooks/useKeyNav";
import { getSocket, destroySocket, saveSession, loadSession, clearSession } from "../../api/socket";

const ROWS = 10;
const COLS = 10;
const CELL = 32;
const LETTERS = ["A","B","C","D","E","F","G","H","I","J"];

const SHIPS = [
  { name: "CARRIER",    size: 5 },
  { name: "BATTLESHIP", size: 4 },
  { name: "CRUISER",    size: 3 },
  { name: "SUBMARINE",  size: 3 },
  { name: "DESTROYER",  size: 2 },
];

// ── Board helpers ─────────────────────────────────────────────────────────────

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ ship: null })));
}

function emptyShots() {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ fired: false, hit: false })));
}

function canPlace(board, row, col, size, dir) {
  for (let i = 0; i < size; i++) {
    const r = dir === "H" ? row     : row + i;
    const c = dir === "H" ? col + i : col;
    if (r >= ROWS || c >= COLS || board[r][c].ship) return false;
  }
  return true;
}

function doPlace(board, row, col, size, dir, name) {
  const b = board.map(r => r.map(c => ({ ...c })));
  for (let i = 0; i < size; i++) {
    const r = dir === "H" ? row     : row + i;
    const c = dir === "H" ? col + i : col;
    b[r][c] = { ship: name };
  }
  return b;
}

// Convert placed board to ships array for server
function boardToShips(board) {
  const found = {};
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const name = board[r][c].ship;
      if (name) { if (!found[name]) found[name] = []; found[name].push({ r, c }); }
    }
  return Object.entries(found).map(([name, cells]) => ({ name, cells }));
}

// ── Grid component ────────────────────────────────────────────────────────────
// mode "place"  → shows placed ships + hover preview, clickable
// mode "own"    → your ships + incoming enemy shots (read-only)
// mode "enemy"  → fog of war, only reveals fired shots, clickable

function Grid({ board, shots = emptyShots(), mode, hoverCells, onCellClick, onCellHover, disabled }) {
  return (
    <div style={{ display: "inline-block", userSelect: "none", opacity: disabled ? 0.5 : 1 }}>
      {/* Column numbers */}
      <div style={{ display: "flex", paddingLeft: CELL }}>
        {Array.from({ length: COLS }, (_, c) => (
          <div key={c} style={{ width: CELL, textAlign: "center", fontFamily: "'Press Start 2P'", fontSize: 7, color: "var(--phos-dim)", paddingBottom: 4 }}>
            {c + 1}
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: ROWS }, (_, r) => (
        <div key={r} style={{ display: "flex" }}>
          <div style={{ width: CELL, display: "grid", placeItems: "center", fontFamily: "'Press Start 2P'", fontSize: 7, color: "var(--phos-dim)" }}>
            {LETTERS[r]}
          </div>
          {Array.from({ length: COLS }, (_, c) => {
            const cell  = board[r][c];
            const shot  = shots[r][c];
            const hover = hoverCells?.find(h => h.r === r && h.c === c);
            const valid = hoverCells?.[0]?.valid;

            let bg = "#08080e", border = "1px solid var(--phos-dim)", cursor = "default", content = null;

            if (mode === "place") {
              if (cell.ship) { bg = "rgba(78,245,154,0.25)"; border = "1px solid var(--phos)"; }
              if (hover)     { bg = valid ? "rgba(78,245,154,0.55)" : "rgba(255,59,107,0.45)"; border = valid ? "1px solid var(--phos)" : "1px solid var(--pink)"; cursor = "pointer"; }
              else if (!cell.ship) cursor = "crosshair";
            }
            if (mode === "own") {
              if (cell.ship) { bg = "rgba(78,245,154,0.15)"; border = "1px solid var(--phos)"; }
              if (shot.fired) content = shot.hit
                ? <span style={{ color: "#ff3b6b", fontSize: 14, lineHeight: 1 }}>✕</span>
                : <span style={{ color: "var(--phos-dim)", fontSize: 24, lineHeight: 1 }}>●</span>;
            }
            if (mode === "enemy") {
              if (!shot.fired && !disabled) cursor = "crosshair";
              if (shot.fired) {
                content = shot.hit
                  ? <span style={{ color: "#ff3b6b", fontSize: 14, lineHeight: 1 }}>✕</span>
                  : <span style={{ color: "var(--phos-dim)", fontSize: 24, lineHeight: 1 }}>●</span>;
                if (shot.hit) { bg = "rgba(255,59,107,0.18)"; border = "1px solid var(--pink)"; }
              }
            }

            return (
              <div
                key={c}
                style={{ width: CELL, height: CELL, background: bg, border, display: "grid", placeItems: "center", cursor: disabled ? "default" : cursor, boxSizing: "border-box", transition: "background 0.08s" }}
                onMouseEnter={() => !disabled && onCellHover?.(r, c)}
                onMouseLeave={() => !disabled && onCellHover?.(null, null)}
                onClick={() => !disabled && onCellClick?.(r, c)}
              >
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// Phases: lobby | waiting | placement | waiting-ready | playing | gameover
export default function BattleshipGame({ onGameOver }) {
  const { user } = useApp();
  const userId   = user?.userId ?? "guest";
  const username = user?.displayName ?? "GUEST";

  const [phase,               setPhase]               = useState("lobby");
  const [roomCode,            setRoomCode]            = useState("");
  const [inputCode,           setInputCode]           = useState("");
  const [opponentUsername,    setOpponentUsername]    = useState("");
  const [myBoard,             setMyBoard]             = useState(emptyBoard());
  const [myShots,             setMyShots]             = useState(emptyShots()); // my shots on opponent board
  const [opponentShots,       setOpponentShots]       = useState(emptyShots()); // opponent shots on my board
  const [shipIdx,             setShipIdx]             = useState(0);
  const [dir,                 setDir]                 = useState("H");
  const [hover,               setHover]               = useState(null);
  const [isMyTurn,            setIsMyTurn]            = useState(false);
  const [lastResult,          setLastResult]          = useState(null);
  const [error,               setError]               = useState(null);
  const [won,                 setWon]                 = useState(null);
  const [opponentWantsRematch,setOpponentWantsRematch]= useState(false);
  const [disconnected,        setDisconnected]        = useState(false);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on("room-created", ({ roomCode: code }) => {
      setRoomCode(code);
      setPhase("waiting");
      saveSession(code, userId);
    });

    socket.on("opponent-joined", ({ username: oppName }) => {
      setOpponentUsername(oppName);
      setDisconnected(false);
      setPhase("placement");
    });

    socket.on("joined", ({ roomCode: code, opponentUsername: oppName }) => {
      setRoomCode(code);
      setOpponentUsername(oppName);
      setPhase("placement");
      saveSession(code, userId);
    });

    socket.on("rejoined", ({ roomCode: code, phase: p, opponentUsername: oppName, yourTurn, shots, opponentShots: oppShots, board }) => {
      // Restore roomCode — critical for attack/rematch events after reconnect
      if (code) setRoomCode(code);
      if (oppName) setOpponentUsername(oppName);
      if (shots)    setMyShots(shots);
      if (oppShots) setOpponentShots(oppShots);
      // Convert server board (null|shipName) back to client format ({ ship })
      if (board)    setMyBoard(board.map(row => row.map(cell => ({ ship: cell }))));
      setIsMyTurn(!!yourTurn);
      setDisconnected(false);
      setPhase(p);
    });

    socket.on("rejoin-failed", () => { clearSession(); setPhase("lobby"); });

    socket.on("placement-confirmed", () => setPhase("waiting-ready"));

    socket.on("game-start", ({ yourTurn }) => {
      setIsMyTurn(yourTurn);
      setPhase("playing");
    });

    socket.on("attack-result", ({ r, c, hit, sunkShip, gameOver, won: didWin, isAttacker, yourTurn }) => {
      if (isAttacker) {
        // My shot landed — update my shots grid
        setMyShots(prev => prev.map((row, ri) =>
          row.map((cell, ci) => ri === r && ci === c ? { fired: true, hit } : cell)
        ));
        if (hit)      setLastResult(sunkShip ? `${sunkShip} SUNK!` : "HIT!");
        else          setLastResult("MISS");
      } else {
        // Opponent fired at me — update opponent shots on my board
        setOpponentShots(prev => prev.map((row, ri) =>
          row.map((cell, ci) => ri === r && ci === c ? { fired: true, hit } : cell)
        ));
      }

      if (gameOver) {
        setWon(didWin);
        setPhase("gameover");
        clearSession();
        onGameOver?.(didWin ? 1 : 0);
      } else {
        setIsMyTurn(!!yourTurn);
      }
    });

    socket.on("opponent-disconnected", () => setDisconnected(true));
    socket.on("opponent-reconnected",  () => setDisconnected(false));
    socket.on("opponent-wants-rematch",() => setOpponentWantsRematch(true));

    socket.on("rematch-start", () => {
      setMyBoard(emptyBoard()); setMyShots(emptyShots()); setOpponentShots(emptyShots());
      setShipIdx(0); setDir("H"); setHover(null); setLastResult(null);
      setWon(null); setOpponentWantsRematch(false); setDisconnected(false);
      setPhase("placement");
    });

    socket.on("error", ({ message }) => setError(message));

    // Try to rejoin a previous session on mount
    const session = loadSession();
    if (session) socket.emit("rejoin-room", { roomCode: session.roomCode, userId: session.userId });

    return () => {
      socket.removeAllListeners();
      destroySocket();
      clearSession();
    };
  }, []);

  // ── Key nav ─────────────────────────────────────────────────────────────────
  useKeyNav(e => {
    if ((e.key === "r" || e.key === "R") && phase === "placement") {
      setDir(d => d === "H" ? "V" : "H");
    }
  }, [phase]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function createRoom() {
    setError(null);
    getSocket().emit("create-room", { userId, username });
  }

  function joinRoom() {
    if (!inputCode.trim()) return;
    setError(null);
    getSocket().emit("join-room", { roomCode: inputCode.trim().toUpperCase(), userId, username });
  }

  function handlePlaceClick(r, c) {
    const ship = SHIPS[shipIdx];
    if (!ship || !canPlace(myBoard, r, c, ship.size, dir)) return;
    const newBoard = doPlace(myBoard, r, c, ship.size, dir, ship.name);
    setMyBoard(newBoard);

    if (shipIdx + 1 < SHIPS.length) {
      setShipIdx(shipIdx + 1);
    } else {
      // All placed — send to server
      getSocket().emit("place-ships", { roomCode, userId, ships: boardToShips(newBoard) });
    }
  }

  function handleFireClick(r, c) {
    if (!isMyTurn || myShots[r][c].fired) return;
    getSocket().emit("attack", { roomCode, userId, r, c });
  }

  function requestRematch() {
    setOpponentWantsRematch(false);
    getSocket().emit("rematch", { roomCode, userId });
  }

  function backToLobby() {
    clearSession();
    setPhase("lobby");
    setRoomCode(""); setInputCode(""); setOpponentUsername("");
    setMyBoard(emptyBoard()); setMyShots(emptyShots()); setOpponentShots(emptyShots());
    setShipIdx(0); setDir("H"); setHover(null); setLastResult(null);
    setWon(null); setError(null); setDisconnected(false); setOpponentWantsRematch(false);
  }

  // ── Hover preview ───────────────────────────────────────────────────────────
  let hoverCells = null;
  if (phase === "placement" && hover && SHIPS[shipIdx]) {
    const ship  = SHIPS[shipIdx];
    const valid = canPlace(myBoard, hover.r, hover.c, ship.size, dir);
    hoverCells  = Array.from({ length: ship.size }, (_, i) => ({
      r: dir === "H" ? hover.r     : hover.r + i,
      c: dir === "H" ? hover.c + i : hover.c,
      valid,
    })).filter(h => h.r < ROWS && h.c < COLS);
  }

  // ── Shared status bar ───────────────────────────────────────────────────────
  function StatusBar({ left, right }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <div className="muted pixel" style={{ fontSize: 8 }}>{left}</div>
        {right}
      </div>
    );
  }

  // ── Screens ─────────────────────────────────────────────────────────────────

  if (phase === "lobby") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, minHeight: 360 }}>
      <div className="pixel-title" style={{ fontSize: 16 }}>BATTLESHIP ONLINE</div>
      {error && <div className="pixel" style={{ fontSize: 8, color: "var(--pink)" }}>⚠ {error}</div>}

      <button className="btn primary" onClick={createRoom}>
        CREATE GAME
      </button>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div className="label">OR JOIN WITH CODE</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="ENTER CODE"
            value={inputCode}
            maxLength={4}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && joinRoom()}
            style={{ width: 120, textAlign: "center", letterSpacing: "0.3em" }}
          />
          <button className="btn" onClick={joinRoom}>JOIN</button>
        </div>
      </div>
    </div>
  );

  if (phase === "waiting") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, minHeight: 360 }}>
      <div className="pixel-title" style={{ fontSize: 16 }}>WAITING FOR OPPONENT</div>
      <div className="muted pixel" style={{ fontSize: 9 }}>SHARE THIS CODE WITH YOUR OPPONENT</div>
      <div className="pixel-title" style={{ fontSize: 36, color: "var(--phos)", letterSpacing: "0.3em" }}>{roomCode}</div>
      <div className="muted pixel" style={{ fontSize: 8 }}>WAITING<span className="blink">...</span></div>
      <button className="btn ghost" onClick={backToLobby}>CANCEL</button>
    </div>
  );

  if (phase === "placement") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <div className="pixel" style={{ fontSize: 10, color: "#fff" }}>PLACE YOUR FLEET</div>
        {SHIPS[shipIdx] && <>
          <span className="pill pink">{SHIPS[shipIdx].name} · SIZE {SHIPS[shipIdx].size}</span>
          <button className="btn ghost" style={{ padding: "4px 10px" }} onClick={() => setDir(d => d === "H" ? "V" : "H")}>
            [{dir}] <span style={{ fontSize: 8 }}>R = ROTATE</span>
          </button>
        </>}
      </div>
      <Grid
        board={myBoard} mode="place"
        hoverCells={hoverCells}
        onCellClick={handlePlaceClick}
        onCellHover={(r, c) => setHover(r !== null ? { r, c } : null)}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {SHIPS.map((s, i) => (
          <span key={s.name} className={`pill${i < shipIdx ? " accent" : i === shipIdx ? " pink" : ""}`}>
            {i < shipIdx ? "✓ " : ""}{s.name}
          </span>
        ))}
      </div>
      <div className="muted pixel" style={{ fontSize: 8 }}>VS {opponentUsername} · CLICK TO PLACE · R TO ROTATE</div>
    </div>
  );

  if (phase === "waiting-ready") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 360 }}>
      <div className="pixel-title" style={{ fontSize: 14 }}>FLEET DEPLOYED</div>
      <div className="muted pixel" style={{ fontSize: 9 }}>WAITING FOR {opponentUsername} TO PLACE SHIPS<span className="blink">...</span></div>
    </div>
  );

  if (phase === "playing") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0" }}>
      {/* Status row */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {disconnected
          ? <span className="pill pink">⚠ OPPONENT DISCONNECTED — WAITING 60S</span>
          : <span className={`pill${isMyTurn ? " accent" : ""}`}>{isMyTurn ? "▸ YOUR TURN — FIRE!" : `${opponentUsername}'S TURN`}</span>
        }
        {lastResult && <span className="pill pink">{lastResult}</span>}
      </div>

      {/* Two grids */}
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div className="label">YOUR FLEET</div>
          <Grid board={myBoard} shots={opponentShots} mode="own" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div className="label">{isMyTurn ? "ENEMY WATERS — CLICK TO FIRE" : "ENEMY WATERS"}</div>
          <Grid board={emptyBoard()} shots={myShots} mode="enemy" onCellClick={handleFireClick} disabled={!isMyTurn || disconnected} />
        </div>
      </div>
      <div className="muted pixel" style={{ fontSize: 8 }}>ROOM {roomCode} · VS {opponentUsername}</div>
    </div>
  );

  if (phase === "gameover") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 360 }}>
      <div className="pixel-title" style={{ fontSize: 28, color: won ? "var(--phos)" : "var(--pink)" }}>
        {won ? "VICTORY!" : "DEFEAT"}
      </div>
      <div className="muted pixel" style={{ fontSize: 9 }}>
        {won ? "ALL ENEMY SHIPS SUNK" : `${opponentUsername} WINS`}
      </div>
      {opponentWantsRematch && <div className="pixel" style={{ fontSize: 9, color: "var(--phos)" }}>{opponentUsername} WANTS A REMATCH</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="btn primary" onClick={requestRematch}>REMATCH</button>
        <button className="btn ghost"   onClick={backToLobby}>BACK TO LOBBY</button>
      </div>
    </div>
  );

  return null;
}
