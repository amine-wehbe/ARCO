// User routes — get and update profile (auth required)
const router = require("express").Router();
const { GetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const db = require("../db/dynamo");
const requireAuth = require("../middleware/auth");

const TABLE = "arco-users";
const USERNAME_RE = /^[A-Za-z0-9_\-]{3,16}$/;

// Get a user profile by userId
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { userId: req.params.id },
    }));
    if (!result.Item) {
      return res.status(404).json({ error: "User not found" });
    }
    // Email is private — only returned to the profile owner
    const { email, ...publicProfile } = result.Item;
    res.status(200).json(req.userId === req.params.id ? result.Item : publicProfile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update username or avatar — only the token owner can update their own profile
router.patch("/:id", requireAuth, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { username, avatar } = req.body;
  if (!username && !avatar) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  if (username && !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "username must be 3-16 letters, digits, _ or -" });
  }
  if (avatar && !/^\d{1,2}$/.test(String(avatar))) {
    return res.status(400).json({ error: "invalid avatar" });
  }

  const updates = [];
  const values = {};
  if (username) { updates.push("username = :u"); values[":u"] = username; }
  if (avatar)   { updates.push("avatar = :a");   values[":a"] = avatar; }

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { userId: req.params.id },
      UpdateExpression: "SET " + updates.join(", "),
      ExpressionAttributeValues: values,
    }));
    res.status(200).json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a user profile entry (called once after signup confirmation)
router.post("/", requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "username must be 3-16 letters, digits, _ or -" });
  }

  const item = {
    userId: req.userId,
    email: req.userEmail,
    username,
    avatar: "1",
    createdAt: new Date().toISOString(),
  };

  try {
    await db.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
