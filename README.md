# ARCO — Retro Arcade

A retro-styled arcade web app with 4 games, AWS-backed auth, leaderboards, and user profiles.

**Live:** https://dmlg1bi4iczn7.cloudfront.net

---

## Games

| Game | Players |
|---|---|
| Snake | 1P |
| Flappy Bird | 1P |
| Memory | 1P |
| Battleship | Local 2P |

---

## Tech Stack

- **Frontend** — React + Vite, deployed on S3 + CloudFront
- **Backend** — Node.js + Express on AWS EC2 (t3.micro, eu-west-1)
- **Auth** — AWS Cognito (email + username, JWT)
- **Database** — AWS DynamoDB (users + scores tables)
- **CDN** — CloudFront with path-based routing to EC2 for API calls

---

## Project Structure

```
arco/
├── src/
│   ├── api/client.js          # All API calls
│   ├── context/AppContext.jsx # Global state + auth logic
│   ├── screens/               # Landing, Library, InGame, Leaderboard, Profile
│   └── games/                 # snake, flappy, memory, battleship
├── server/
│   ├── index.js               # Express entry point
│   ├── middleware/auth.js     # JWT verification
│   ├── routes/                # auth, scores, users
│   └── db/dynamo.js           # DynamoDB client
├── .env.example               # Frontend env template
└── server/.env.example        # Backend env template
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- AWS account with Cognito User Pool + DynamoDB tables created (see below)

### Frontend

```bash
cp .env.example .env
# Edit .env: set VITE_API_BASE_URL=http://localhost:3000 for local dev
npm install
npm run dev
# → http://localhost:5173
```

### Backend

```bash
cd server
cp .env.example .env
# Edit .env with your Cognito and AWS values (see below)
npm install
npm run dev
# → http://localhost:3000
```

**server/.env values:**

```
PORT=3000
AWS_REGION=eu-west-1
COGNITO_USER_POOL_ID=<your-user-pool-id>
COGNITO_CLIENT_ID=<your-app-client-id>
```

> Remove `DYNAMO_ENDPOINT` line for real DynamoDB (keep it only for local DynamoDB emulator).

---

## AWS Setup (from scratch)

### 1. Cognito User Pool

1. AWS Console → Cognito → Create User Pool
2. Sign-in: **Email**
3. Required attributes: `email`, `preferred_username`
4. App client type: **Single Page Application (SPA)**
5. Auth flow: enable `ALLOW_USER_PASSWORD_AUTH`
6. Copy User Pool ID and App Client ID → paste into `server/.env`

### 2. DynamoDB Tables

**arco-users**
```
Table name: arco-users
Partition key: userId (String)
Billing: On-demand
```

**arco-scores**
```
Table name: arco-scores
Partition key: gameId (String)
Sort key: sk (String)
Billing: On-demand

GSI:
  Index name: gameId-score-index
  Partition key: gameId (String)
  Sort key: score (Number)
```

### 3. IAM Role (for EC2)

Create role `arco-ec2-role` with:
- `AmazonDynamoDBFullAccess`
- `AmazonCognitoPowerUser`

Attach to EC2 instance.

### 4. EC2 Backend

```bash
# On the EC2 instance (Amazon Linux 2023, t3.micro)
sudo dnf install -y nodejs npm
sudo npm install -g pm2

# Upload server/ folder (from your machine)
scp -i ~/.ssh/arco-key.pem -r server/ ec2-user@<EC2-IP>:~/

# On EC2
cd ~/server
cp .env.example .env    # fill in values
npm install
pm2 start index.js --name arco-server
pm2 save
pm2 startup            # follow the printed command to auto-start on reboot
```

### 5. Frontend Deploy

```bash
# In project root
npm run build

# Push dist/ to S3
aws s3 sync dist/ s3://<your-bucket-name> --delete
```

### 6. CloudFront

Create distribution:
- **Origin 1** — S3 bucket (default)
- **Origin 2** — `<EC2-IP>.nip.io` port 3000 (HTTP)

Add behaviors (in order):
- `/auth*` → EC2 origin
- `/scores*` → EC2 origin
- `/users*` → EC2 origin
- `/health` → EC2 origin
- `/*` (default) → S3 origin

After any config change, create a CloudFront invalidation: `/*`

---

## API Reference

Base URL is the CloudFront domain (or `http://localhost:3000` locally).

### Auth
```
POST /auth/signup    { email, password, username }
POST /auth/confirm   { email, code }
POST /auth/login     { email, password }  → { token }
POST /auth/logout    (Bearer token)
```

### Scores
```
POST /scores         (Bearer) { gameId, score }
GET  /scores/:gameId          → { leaderboard: [...] }
```
Valid gameIds: `snake`, `flappy`, `memory`, `battleship`

### Users
```
POST  /users         (Bearer) { username }
GET   /users/:id     (Bearer) → user object
PATCH /users/:id     (Bearer) { username?, avatar? }
```

---

## Restarting the EC2 Instance

If the instance was stopped (e.g. to save costs):

1. AWS Console → EC2 → Instances → select → **Start instance**
2. Wait ~30s for boot
3. SSH in: `ssh -i ~/.ssh/arco-key.pem ec2-user@54.195.242.3`
4. Check server: `pm2 status`
5. If stopped: `pm2 restart arco-server`
6. Verify: `curl http://localhost:3000/health`

The Elastic IP (54.195.242.3) stays the same across stop/start, so CloudFront doesn't need to be updated.

---

## Team

- **Amine Wehbe** — project lead, full-stack, AWS setup
- AUB EECE Final Year Project
