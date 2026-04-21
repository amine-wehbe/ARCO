import { useEffect, useRef } from "react";

// Canvas dimensions
const W = 360;
const H = 560;

// Physics (ported from BirdScript.cs)
const GRAVITY       = 900; // px/s² — replaces Rigidbody2D gravityScale
const FLAP_STRENGTH = -300; // px/s upward — replaces flapStrength

// Pipes (ported from PipeMoveScript + PipeSpawnerScript)
const PIPE_W         = 55;
const GAP            = 145; // gap between top and bottom pipe
const PIPE_SPEED     = 180; // px/s — replaces moveSpeed
const SPAWN_INTERVAL = 1.8; // seconds — replaces spawnRate
const HEIGHT_OFFSET  = 120; // random height range — replaces heightOffset

const BIRD_R = 11; // bird radius
const BIRD_X = 80; // fixed horizontal position

// Props:
//   onGameOver(score) — AWS_WIRE: hook up submitScore("FLAPPY", score) in InGame.jsx
export default function FlappyGame({ onGameOver, isGuest, hiScore = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    let rafId    = null;
    let lastTime = null;

    // ── Game state ───────────────────────────────────────────────────────────
    let gameStarted = false;
    let gameOver    = false;
    let score       = 0;
    let highScore   = isGuest ? 0 : hiScore;
    let spawnTimer  = 0;

    // Bird (BirdScript)
    let bird = { y: H / 2, vy: 0 };

    // Pipes array: { x, topH, scored }
    // topH = height of top pipe (PipeSpawnerScript random range)
    let pipes = [];

    function spawnPipe() {
      const center   = H / 2;
      const topH     = center + (Math.random() * 2 - 1) * HEIGHT_OFFSET;
      const clamped  = Math.max(60, Math.min(H - GAP - 60, topH));
      pipes.push({ x: W + 10, topH: clamped, scored: false });
    }

    function flap() {
      if (gameOver) return;
      if (!gameStarted) gameStarted = true;
      bird.vy = FLAP_STRENGTH;
    }

    function reset() {
      bird        = { y: H / 2, vy: 0 };
      pipes       = [];
      score       = 0;
      spawnTimer  = 0;
      gameOver    = false;
      gameStarted = false;
      lastTime    = null;
    }

    // AABB collision — mirrors OnCollisionEnter2D + y < 40 check in BirdScript
    function hitsPipe(p) {
      const bx1 = BIRD_X - BIRD_R + 3, bx2 = BIRD_X + BIRD_R - 3;
      const by1 = bird.y  - BIRD_R + 3, by2 = bird.y  + BIRD_R - 3;
      if (bx2 < p.x || bx1 > p.x + PIPE_W) return false;
      return by1 < p.topH || by2 > p.topH + GAP;
    }

    function triggerGameOver() {
      gameOver = true;
      if (score > highScore) {
        highScore = score;
        if (!isGuest) localStorage.setItem("arco_flappy_hi", highScore);
      }
      onGameOver?.(score); // AWS_WIRE: submitScore("FLAPPY", score)
    }

    // ── Update (game logic) ──────────────────────────────────────────────────
    function update(dt) {
      if (!gameStarted || gameOver) return;

      // Bird physics (BirdScript)
      bird.vy += GRAVITY * dt;
      bird.y  += bird.vy * dt;

      // Ground / ceiling (birdIsAlive = false when y < 40 in original)
      if (bird.y + BIRD_R >= H || bird.y - BIRD_R <= 0) { triggerGameOver(); return; }

      // Pipe spawning (PipeSpawnerScript)
      spawnTimer += dt;
      if (spawnTimer >= SPAWN_INTERVAL) { spawnPipe(); spawnTimer = 0; }

      // Pipe movement + scoring + collision (PipeMoveScript + PipeMiddleScript)
      pipes = pipes.filter(p => p.x + PIPE_W > -10); // deadZone equivalent
      for (const p of pipes) {
        p.x -= PIPE_SPEED * dt;
        if (!p.scored && p.x + PIPE_W < BIRD_X) { p.scored = true; score++; } // addScore(1)
        if (hitsPipe(p)) { triggerGameOver(); return; }
      }
    }

    // ── Render ───────────────────────────────────────────────────────────────
    function render() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = "rgba(78,245,154,0.10)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // Pipes
      for (const p of pipes) {
        // Top pipe body
        ctx.fillStyle = "#1a4a2a";
        ctx.fillRect(p.x, 0, PIPE_W, p.topH - 12);
        // Top pipe cap
        ctx.fillStyle = "#4ef59a";
        ctx.fillRect(p.x - 4, p.topH - 12, PIPE_W + 8, 12);

        // Bottom pipe cap
        const botY = p.topH + GAP;
        ctx.fillStyle = "#4ef59a";
        ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 12);
        // Bottom pipe body
        ctx.fillStyle = "#1a4a2a";
        ctx.fillRect(p.x, botY + 12, PIPE_W, H - botY - 12);
      }

      // Bird — rotates based on velocity (nose up when flapping, down when falling)
      const angle = Math.min(Math.max(Math.atan2(bird.vy, 260), -0.5), 1.2);
      ctx.save();
      ctx.translate(BIRD_X, bird.y);
      ctx.rotate(angle);

      // Tail feathers
      ctx.fillStyle = "#e8a100";
      ctx.beginPath();
      ctx.moveTo(-BIRD_R + 2, 0);
      ctx.lineTo(-BIRD_R - 8, -5);
      ctx.lineTo(-BIRD_R - 6, 0);
      ctx.lineTo(-BIRD_R - 8, 5);
      ctx.closePath();
      ctx.fill();

      // Body
      ctx.fillStyle = "#4ef59a";
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_R + 2, BIRD_R, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = "#2a9960";
      ctx.beginPath();
      ctx.ellipse(-2, 3, 7, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // White belly patch
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(3, 2, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye white
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(6, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      // Pupil
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(7, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      // Eye shine
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(8, -5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Beak (upper + lower)
      ctx.fillStyle = "#e8a100";
      ctx.beginPath();
      ctx.moveTo(BIRD_R, -2);
      ctx.lineTo(BIRD_R + 8, -1);
      ctx.lineTo(BIRD_R, 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c07000";
      ctx.beginPath();
      ctx.moveTo(BIRD_R, 1);
      ctx.lineTo(BIRD_R + 6, 2);
      ctx.lineTo(BIRD_R, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // HUD
      ctx.textAlign = "center";
      ctx.fillStyle = "#4ef59a";
      ctx.font      = "11px 'Press Start 2P'";
      ctx.fillText(String(score).padStart(3, "0"), W / 2, 28);
      ctx.textAlign = "right";
      ctx.font      = "7px 'Press Start 2P'";
      ctx.fillStyle = "#2a6a45";
      ctx.fillText("HI " + highScore, W - 8, 22);

      // Start screen (StartGame.cs equivalent)
      if (!gameStarted && !gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#4ef59a";
        ctx.font = "14px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText("FLAPPY", W / 2, H / 2 - 50);
        ctx.fillStyle = "#aef5c2";
        ctx.font = "8px 'Press Start 2P'";
        ctx.fillText("SPACE OR CLICK TO FLAP", W / 2, H / 2);
        ctx.fillStyle = "#2a6a45";
        ctx.fillText("HI  " + highScore, W / 2, H / 2 + 28);
      }

      // Game over screen (LogicScript.gameOver equivalent)
      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ff3b6b";
        ctx.font = "12px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 40);
        ctx.fillStyle = "#fff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("SCORE  " + score, W / 2, H / 2 - 10);
        ctx.fillText("HI  " + highScore, W / 2, H / 2 + 12);
        ctx.fillStyle = "#4ef59a";
        ctx.fillText("SPACE  restart", W / 2, H / 2 + 44);
      }
    }

    // ── Game loop ────────────────────────────────────────────────────────────
    function gameLoop(ts) {
      if (lastTime !== null) {
        const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap delta to avoid physics jumps
        update(dt);
      }
      lastTime = ts;
      render();
      rafId = requestAnimationFrame(gameLoop);
    }

    // ── Input ────────────────────────────────────────────────────────────────
    function onKey(e) {
      if (e.code === "Space") {
        e.preventDefault();
        if (gameOver) { reset(); return; }
        flap();
      }
    }

    function onClick() {
      if (gameOver) { reset(); return; }
      flap();
    }

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("click", onClick);
    rafId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: "block", margin: "0 auto", imageRendering: "pixelated", cursor: "pointer" }}
    />
  );
}
