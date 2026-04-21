// All API calls to the ARCO backend. Token is read from localStorage on every request.

const BASE = import.meta.env.VITE_API_BASE_URL;

// Decode JWT payload without a library
function parseJwt(token) {
  return JSON.parse(atob(token.split(".")[1]));
}

// Attach stored Cognito id token to every request
function authHeaders() {
  const token = localStorage.getItem("arco_id_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${method} ${path} → ${res.status}`);
  }
  return res.json();
}

const get  = (path)       => request("GET",  path);
const post = (path, body) => request("POST", path, body);

// ── Auth ───────────────────────────────────────────────────────────────────

// Register — does not log in, Cognito sends a verification email next
export async function cognitoSignUp(username, password, email) {
  return post("/auth/signup", { email, password, username });
}

// Confirm account with the code emailed by Cognito
export async function cognitoConfirm(email, code) {
  return post("/auth/confirm", { email, code });
}

// Login — stores token, returns { userId, displayName, email }
export async function cognitoSignIn(email, password) {
  const data = await post("/auth/login", { email, password });
  localStorage.setItem("arco_id_token", data.token);
  const payload = parseJwt(data.token);
  return {
    userId:      payload.sub,
    displayName: payload.preferred_username || payload.email,
    email:       payload.email,
  };
}

// Logout — clears local token (server-side invalidation is a bonus if it works)
export async function cognitoSignOut() {
  localStorage.removeItem("arco_id_token");
}

// ── Users ──────────────────────────────────────────────────────────────────

// Create profile entry in DynamoDB — called once right after first login
export async function createUserProfile(username) {
  return post("/users", { username });
}

// Fetch profile by userId
export async function fetchUserStats(userId) {
  return get(`/users/${userId}`);
}

// Update username or avatar
export async function updateProfile(userId, fields) {
  return request("PATCH", `/users/${userId}`, fields);
}

// ── Scores ─────────────────────────────────────────────────────────────────

// Top 10 for a given game (public)
export async function fetchLeaderboard(game = "snake") {
  return get(`/scores/${game.toLowerCase()}`);
}

// Post a score for the logged-in user
export async function submitScore(game, score) {
  return post("/scores", { gameId: game.toLowerCase(), score });
}

// ── Admin ──────────────────────────────────────────────────────────────────

// Fetch platform stats — admin only, returns totalUsers + per-game data
export async function fetchAdminStats() {
  return get("/admin/stats");
}
