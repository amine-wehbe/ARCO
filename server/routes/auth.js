// Auth routes — sign up, confirm, login, logout via Cognito
const router = require("express").Router();
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

// Register a new user
router.post("/signup", async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: "email, password and username are required" });
  }
  if (!/^[A-Za-z0-9_\-]{3,16}$/.test(username)) {
    return res.status(400).json({ error: "username must be 3-16 letters, digits, _ or -" });
  }
  try {
    await cognito.send(new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "preferred_username", Value: username },
      ],
    }));
    res.status(201).json({ message: "User created. Check your email for a verification code." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Confirm account with emailed verification code
router.post("/confirm", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "email and code are required" });
  }
  try {
    await cognito.send(new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }));
    res.status(200).json({ message: "Account confirmed. You can now log in." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login — returns id token (JWT) used as Bearer token everywhere
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  try {
    const result = await cognito.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }));
    const tokens = result.AuthenticationResult;
    res.status(200).json({
      token: tokens.IdToken,           // identifies the user to this API
      accessToken: tokens.AccessToken, // only used for server-side logout
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Logout — revokes the user's tokens in Cognito. Expects the ACCESS token (GlobalSignOut rejects id tokens)
router.post("/logout", async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  const token = header.split(" ")[1];
  try {
    await cognito.send(new GlobalSignOutCommand({ AccessToken: token }));
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
