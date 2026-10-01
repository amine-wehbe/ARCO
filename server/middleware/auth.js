// Verifies the Cognito JWT from the Authorization header and attaches userId to req
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: "id",
});

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = await verifier.verify(token);
    req.userId   = payload.sub;
    req.userEmail = payload.email;
    req.username  = payload.preferred_username || payload.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
module.exports.verifier = verifier;
