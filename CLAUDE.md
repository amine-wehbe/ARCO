# ARCO — Claude Context File

Use this to get up to speed on the project before helping.

---

## What is ARCO?

Retro arcade web app. React + Vite SPA with 5 games, AWS backend. Styled like a CRT arcade cabinet.

**Live URL:** https://dmlg1bi4iczn7.cloudfront.net  
**GitHub:** https://github.com/amine-wehbe/ARCO

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, custom CSS (CRT/arcade aesthetic) |
| Auth | AWS Cognito (User Pool, SPA client, email + preferred_username) |
| Backend | Node.js + Express on EC2 (t3.micro, eu-west-1) |
| Database | DynamoDB (arco-users, arco-scores) |
| Hosting | S3 + CloudFront (frontend), CloudFront behaviors route /auth*, /scores*, /users*, /health to EC2 |
| Process mgr | PM2 on EC2 |

---

## AWS Resources

| Resource | Value |
|---|---|
| CloudFront domain | dmlg1bi4iczn7.cloudfront.net |
| CloudFront dist ID | E1M9LV0FD1BNYU |
| EC2 Elastic IP | 54.195.242.3 |
| EC2 origin (nip.io) | 54.195.242.3.nip.io |
| Cognito User Pool ID | eu-west-1_nrzuVJfok |
| Cognito Client ID | 30o582cpokj509g1fk135mka20 |
| DynamoDB table: users | arco-users (PK: userId) |
| DynamoDB table: scores | arco-scores (PK: gameId, SK: timestamp#userId, GSI: gameId-score-index) |
| IAM role on EC2 | arco-ec2-role (DynamoDBFullAccess + CognitoPowerUser) |
| Region | eu-west-1 (Ireland) |

---

## Project Structure

```
arco/
├── src/
│   ├── api/client.js          # All fetch calls to backend (BASE = VITE_API_BASE_URL)
│   ├── context/AppContext.jsx # Global state: user, navigate, tweaks, confirm flow
│   ├── screens/
│   │   ├── Landing.jsx        # Sign in / Sign up / Confirm (email code) screens
│   │   ├── Library.jsx        # Game selection grid
│   │   ├── InGame.jsx         # Game wrapper — calls submitScore on game over
│   │   ├── Leaderboard.jsx    # Per-game top 10 from DynamoDB
│   │   ├── Profile.jsx        # User stats (partial — perGame data not yet wired)
│   │   └── Settings.jsx       # Volume, tweaks
│   └── games/
│       ├── snake/             # Snake game
│       ├── flappy/            # Flappy Bird
│       ├── memory/            # Memory card matching
│       └── battleship/        # Local 2-player Battleship
├── server/
│   ├── index.js               # Express entry, CORS config
│   ├── middleware/auth.js     # Cognito JWT verify → req.userId, req.username
│   ├── routes/auth.js         # POST /auth/signup, /confirm, /login, /logout
│   ├── routes/scores.js       # POST /scores, GET /scores/:gameId
│   ├── routes/users.js        # POST /users, GET /users/:id, PATCH /users/:id
│   └── db/dynamo.js           # DynamoDB DocumentClient
├── .env                       # VITE_API_BASE_URL (not committed)
└── .env.example
```

---

## API Reference

All routes go through CloudFront → EC2 (`http://54.195.242.3:3000`).

### Auth
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | /auth/signup | — | `{ email, password, username }` | `{ message }` |
| POST | /auth/confirm | — | `{ email, code }` | `{ message }` |
| POST | /auth/login | — | `{ email, password }` | `{ token, userId, email }` |
| POST | /auth/logout | Bearer | — | `{ message }` |

### Scores
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | /scores | Bearer | `{ gameId, score }` | `{ message }` |
| GET | /scores/:gameId | — | — | `{ leaderboard: [...] }` |

Valid gameIds: `snake`, `flappy`, `memory`, `battleship`

### Users
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | /users | Bearer | `{ username }` | `{ message }` |
| GET | /users/:id | Bearer | — | `{ userId, username, ... }` |
| PATCH | /users/:id | Bearer | `{ username?, avatar? }` | `{ message }` |

---

## Auth Flow

1. Sign up → Cognito sends verification email
2. User enters 6-digit code → POST /auth/confirm
3. POST /auth/login → returns Cognito id token (JWT)
4. Token stored in `localStorage` as `arco_id_token`
5. POST /users creates DynamoDB profile entry (once, on first login)
6. All subsequent requests attach `Authorization: Bearer <token>`

---

## Current State (as of April 2026)

**Working:**
- Full auth flow (signup → confirm → login → logout)
- Score submission on game over for all 4 games
- Leaderboard pulls real data from DynamoDB
- Frontend live on CloudFront, backend on EC2 via CloudFront behaviors

**Pending / In Progress:**
- Profile page per-game best scores (currently shows placeholder data — needs userId-based query)
- Nav bar cleanup (top nav should be removed)
- IAM users for teammates (currently sharing root credentials — bad)

**Stretch Goals:**
- Battleship multiplayer via WebSocket
- Auto Scaling Group + ALB in front of EC2 (teammate working on this)

---

## How CloudFront Routing Works

CloudFront has two origins:
1. **S3** — default, serves the React SPA
2. **EC2** — `54.195.242.3.nip.io` port 3000

Behaviors (in order of precedence):
- `/auth*` → EC2
- `/scores*` → EC2
- `/users*` → EC2
- `/health` → EC2
- `/*` (default) → S3

CloudFront doesn't accept raw IPs as origin, hence `nip.io` as a DNS alias.

---

## Local Dev Setup

```bash
# Frontend
cp .env.example .env        # set VITE_API_BASE_URL
npm install
npm run dev                 # http://localhost:5173

# Backend
cd server
cp .env.example .env        # fill in Cognito + AWS values
npm install
npm run dev                 # http://localhost:3000
```

For local backend, point `VITE_API_BASE_URL=http://localhost:3000` in `.env`.

---

## Restarting the EC2 Backend

If the EC2 instance was stopped:
1. AWS Console → EC2 → Instances → select instance → Start
2. Wait ~30 seconds for it to boot
3. SSH in: `ssh -i ~/.ssh/arco-key.pem ec2-user@54.195.242.3`
4. Check PM2: `pm2 status`
5. If server shows `stopped`: `pm2 restart arco-server`
6. Test: `curl http://54.195.242.3:3000/health`
