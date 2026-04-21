import { useEffect, useRef } from "react";

const CELL   = 24;
const COLS   = 25;
const ROWS   = 22;
const W      = CELL * COLS; // 600px
const H      = CELL * ROWS; // 528px

// Wraps the original snake canvas game in a React component.
// Props:
//   onGameOver(score) — called when the player loses; wire to submitScore() in api/client.js
export default function SnakeGame({ onGameOver, isGuest, hiScore = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    // ── Game state ──────────────────────────────────────────────────────────
    let moveInterval  = 120;
    let lastMoveTime  = 0;
    let rafId         = null;
    let gameOver      = false;
    let gameStarted   = false;
    let score         = 0;
    let highScore     = isGuest ? 0 : hiScore;

    let snake     = [{ x: 12, y: 11 }, { x: 11, y: 11 }, { x: 10, y: 11 }];
    let direction = { dx: 0, dy: 0 };
    let food      = { x: 5, y: 15 };

    function spawnFood() {
      food.x = Math.floor(Math.random() * COLS);
      food.y = Math.floor(Math.random() * ROWS);
    }

    function reset() {
      snake       = [{ x: 12, y: 11 }, { x: 11, y: 11 }, { x: 10, y: 11 }];
      direction   = { dx: 0, dy: 0 };
      score       = 0;
      moveInterval = 120;
      gameOver    = false;
      spawnFood();
    }

    function update() {
      if (direction.dx === 0 && direction.dy === 0) return;
      const head = { x: snake[0].x + direction.dx, y: snake[0].y + direction.dy };
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        spawnFood();
        moveInterval = Math.max(50, moveInterval - 5);
      } else {
        snake.pop();
      }
    }

    function checkCollision() {
      const head = snake[0];
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { gameOver = true; return; }
      snake.slice(1).forEach(s => { if (s.x === head.x && s.y === head.y) gameOver = true; });
    }

    function drawGrid() {
      ctx.strokeStyle = "rgba(78,245,154,0.18)";
      for (let x = 0; x < COLS; x++)
        for (let y = 0; y < ROWS; y++)
          ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      if (!gameStarted) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#4ef59a";
        ctx.font = "bold 14px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText("SNAKE", W / 2, H / 2 - 50);
        ctx.fillStyle = "#aef5c2";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("PRESS ENTER TO START", W / 2, H / 2);
        ctx.fillStyle = "#2a6a45";
        ctx.fillText("HI  " + highScore, W / 2, H / 2 + 30);
        return;
      }

      // Snake
      snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? "#aef5c2" : "#4ef59a";
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      });

      // Food
      ctx.fillStyle = "#ff3b6b";
      ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);

      // Score HUD
      ctx.fillStyle = "#4ef59a";
      ctx.font = "9px 'Press Start 2P'";
      ctx.textAlign = "left";
      ctx.fillText("SCORE  " + score, 8, 18);
      ctx.textAlign = "right";
      ctx.fillText("HI  " + highScore, W - 8, 18);

      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ff3b6b";
        ctx.font = "12px 'Press Start 2P'";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 30);
        ctx.fillStyle = "#fff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("SCORE  " + score, W / 2, H / 2);
        ctx.fillText("HI  " + highScore, W / 2, H / 2 + 22);
        ctx.fillStyle = "#4ef59a";
        ctx.fillText("ENTER  restart", W / 2, H / 2 + 54);
      }
    }

    function gameLoop(ts) {
      if (ts - lastMoveTime >= moveInterval) {
        if (gameStarted && !gameOver) {
          update();
          checkCollision();
          if (gameOver) {
            if (score > highScore) {
              highScore = score;
              if (!isGuest) localStorage.setItem("arco_snake_hi", highScore);
            }
            onGameOver?.(score); // AWS_WIRE: hook up submitScore(score) here
          }
        }
        lastMoveTime = ts;
      }
      render();
      rafId = requestAnimationFrame(gameLoop);
    }

    // ── Input ───────────────────────────────────────────────────────────────
    function onKey(e) {
      if (!gameStarted && e.key === "Enter") { gameStarted = true; return; }
      if (gameOver     && e.key === "Enter") { reset(); gameStarted = true; return; }
      // Prevent arrow keys from scrolling the page while playing
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowUp"    && direction.dy !== 1)  { direction = { dx:  0, dy: -1 }; }
      if (e.key === "ArrowDown"  && direction.dy !== -1) { direction = { dx:  0, dy:  1 }; }
      if (e.key === "ArrowLeft"  && direction.dx !== 1)  { direction = { dx: -1, dy:  0 }; }
      if (e.key === "ArrowRight" && direction.dx !== -1) { direction = { dx:  1, dy:  0 }; }
    }

    window.addEventListener("keydown", onKey);
    rafId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: "block", margin: "0 auto", imageRendering: "pixelated" }}
    />
  );
}
