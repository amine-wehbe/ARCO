// Score routes — post a score (auth required), get leaderboard (public)
const router = require("express").Router();
const { PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const db = require("../db/dynamo");
const requireAuth = require("../middleware/auth");

const TABLE       = "arco-scores";
const USERS_TABLE = "arco-users";
const VALID_GAMES = ["snake", "flappy", "memory", "battleship"];
const MAX_SCORE   = 1_000_000;

// Save a score for the authenticated user
router.post("/", requireAuth, async (req, res) => {
  const { gameId, score } = req.body;
  if (!gameId || score === undefined) {
    return res.status(400).json({ error: "gameId and score are required" });
  }
  if (!VALID_GAMES.includes(gameId)) {
    return res.status(400).json({ error: `gameId must be one of: ${VALID_GAMES.join(", ")}` });
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return res.status(400).json({ error: `score must be an integer between 0 and ${MAX_SCORE}` });
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

const PERIOD_MS = { today: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000 };

// Get top 10 scores for a game (public). ?period=today|week|all (default all)
router.get("/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const period = req.query.period || "all";
  if (!VALID_GAMES.includes(gameId)) {
    return res.status(400).json({ error: `gameId must be one of: ${VALID_GAMES.join(", ")}` });
  }
  if (period !== "all" && !PERIOD_MS[period]) {
    return res.status(400).json({ error: "period must be one of: today, week, all" });
  }

  try {
    const base = {
      TableName: TABLE,
      IndexName: "gameId-score-index",
      KeyConditionExpression: "gameId = :g",
      ExpressionAttributeValues: { ":g": gameId },
      ScanIndexForward: false, // descending by score
    };
    if (period === "all") {
      const result = await db.send(new QueryCommand({ ...base, Limit: 10 }));
      return res.status(200).json({ leaderboard: result.Items });
    }

    // DynamoDB applies Limit before filtering, so page through (highest scores first) until we have 10 matches
    const since = new Date(Date.now() - PERIOD_MS[period]).toISOString();
    const items = [];
    let startKey;
    do {
      const page = await db.send(new QueryCommand({
        ...base,
        FilterExpression: "#ts >= :since",
        ExpressionAttributeNames: { "#ts": "timestamp" },
        ExpressionAttributeValues: { ":g": gameId, ":since": since },
        ExclusiveStartKey: startKey,
      }));
      items.push(...page.Items);
      startKey = page.LastEvaluatedKey;
    } while (startKey && items.length < 10);
    res.status(200).json({ leaderboard: items.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
