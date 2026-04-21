// Score routes — post a score (auth required), get leaderboard (public)
const router = require("express").Router();
const { PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const db = require("../db/dynamo");
const requireAuth = require("../middleware/auth");

const TABLE       = "arco-scores";
const USERS_TABLE = "arco-users";
const VALID_GAMES = ["snake", "flappy", "memory", "battleship"];

// Save a score for the authenticated user
router.post("/", requireAuth, async (req, res) => {
  const { gameId, score } = req.body;
  if (!gameId || score === undefined) {
    return res.status(400).json({ error: "gameId and score are required" });
  }
  if (!VALID_GAMES.includes(gameId)) {
    return res.status(400).json({ error: `gameId must be one of: ${VALID_GAMES.join(", ")}` });
  }

  const item = {
    gameId,
    sk: `${Date.now()}#${req.userId}`,
    userId: req.userId,
    username: req.username,
    score: Number(score),
    timestamp: new Date().toISOString(),
  };

  // Flat attribute name for this game's best score e.g. best_snake
  const bestAttr = "best_" + gameId;

  try {
    // Save score to leaderboard table
    await db.send(new PutCommand({ TableName: TABLE, Item: item }));

    // Increment gamesPlayed and seed flat best score attr if not set yet
    await db.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: req.userId },
      UpdateExpression: "SET gamesPlayed = if_not_exists(gamesPlayed, :zero) + :one, #attr = if_not_exists(#attr, :score)",
      ExpressionAttributeNames: { "#attr": bestAttr },
      ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":score": item.score },
    }));

    // Overwrite best score only if this run beats it
    try {
      await db.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId: req.userId },
        UpdateExpression: "SET #attr = :score",
        ConditionExpression: "#attr < :score",
        ExpressionAttributeNames: { "#attr": bestAttr },
        ExpressionAttributeValues: { ":score": item.score },
      }));
    } catch (e) {
      if (e.name !== "ConditionalCheckFailedException") throw e;
    }

    res.status(201).json({ message: "Score saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get top 10 scores for a game (public)
router.get("/:gameId", async (req, res) => {
  const { gameId } = req.params;
  if (!VALID_GAMES.includes(gameId)) {
    return res.status(400).json({ error: `gameId must be one of: ${VALID_GAMES.join(", ")}` });
  }

  try {
    const result = await db.send(new QueryCommand({
      TableName: TABLE,
      IndexName: "gameId-score-index",
      KeyConditionExpression: "gameId = :g",
      ExpressionAttributeValues: { ":g": gameId },
      ScanIndexForward: false, // descending by score
      Limit: 10,
    }));
    res.status(200).json({ leaderboard: result.Items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
