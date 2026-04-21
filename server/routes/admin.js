// Admin routes — restricted to admin user IDs, returns platform stats
const router = require("express").Router();
const { ScanCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const db = require("../db/dynamo");
const requireAuth = require("../middleware/auth");

const ADMIN_IDS  = ["f2055494-b001-70ad-abee-854469c2869e"];
const SCORES_TABLE = "arco-scores";
const USERS_TABLE  = "arco-users";
const VALID_GAMES  = ["snake", "flappy", "memory", "battleship"];

// Middleware — rejects non-admins before any handler runs
function requireAdmin(req, res, next) {
  if (!ADMIN_IDS.includes(req.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// GET /admin/stats — total users, per-game score counts, top scorer per game
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Total registered users
    const usersResult = await db.send(new ScanCommand({
      TableName: USERS_TABLE,
      Select: "COUNT",
    }));

    // Per-game: score count + top scorer
    const gameStats = await Promise.all(VALID_GAMES.map(async gameId => {
      const result = await db.send(new QueryCommand({
        TableName: SCORES_TABLE,
        IndexName: "gameId-score-index",
        KeyConditionExpression: "gameId = :g",
        ExpressionAttributeValues: { ":g": gameId },
        ScanIndexForward: false,
        Limit: 1,
      }));
      // Count all scores for this game
      const countResult = await db.send(new QueryCommand({
        TableName: SCORES_TABLE,
        IndexName: "gameId-score-index",
        KeyConditionExpression: "gameId = :g",
        ExpressionAttributeValues: { ":g": gameId },
        Select: "COUNT",
      }));
      const top = result.Items?.[0] ?? null;
      return {
        gameId,
        totalScores: countResult.Count ?? 0,
        topScore:    top?.score ?? 0,
        topPlayer:   top?.username ?? "—",
      };
    }));

    res.json({
      totalUsers: usersResult.Count ?? 0,
      games: gameStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
