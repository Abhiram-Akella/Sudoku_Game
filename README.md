# 🔢 Daily Sudoku

A production-ready daily Sudoku game — same puzzle for all players each day, with a live leaderboard.

## Features

- **Daily puzzle** — deterministic seed from date; everyone gets the same puzzle. Loads the completed board on page reload if already solved.
- **Difficulty** — Easy / Medium / Hard tabs (changes clue count)
- **Error highlighting** — conflicting cells flash red instantly
- **Region completion** — row, column or box flashes green for 0.5s when completed correctly (strictly verified against solution)
- **Hints** — 3 hints per session; fetches the correct value from the server
- **Leaderboard** — sorted by time; auto-resets at 23:59:59 UTC via Redis TTL. Supports duplicate usernames securely with unique client-side `userId` tracking.
- **No accounts** — username entered once, saved to localStorage alongside a generated `userId`
- **Input Mode (Numpad Selection)** — select a number from the numpad to keep it locked, and click any empty cells to insert it repeatedly.
- **Same Number Highlighting** — clicking any filled cell instantly highlights all other instances of that number on the board.
- **Centered Layout & Sliding Transition** — the puzzle is centered on screen while solving, smoothly sliding left to reveal the leaderboard on complete.
- **Keyboard support** — arrows to navigate, 1-9 to fill, Backspace to erase

## Architecture

```
frontend (React + Vite → nginx)
    ↕  /api/* proxy
backend (Express.js)
    ↕
Redis (leaderboard sorted sets with daily TTL)
```

## Development

### Prerequisites
- Node.js 18+
- Redis (local or Docker)

### Backend
```bash
cd backend
cp .env.example .env   # edit if needed
npm install
npm run dev            # runs on :4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # runs on :5173, proxies /api → :4000
```

## Production Deployment (Docker)

```bash
# From project root
docker-compose up -d --build

# App available at http://your-server-ip
```

### Environment Variables (backend)

| Variable        | Default       | Description                    |
|-----------------|---------------|--------------------------------|
| `PORT`          | `4000`        | API port                       |
| `REDIS_HOST`    | `localhost`   | Redis hostname                 |
| `REDIS_PORT`    | `6379`        | Redis port                     |
| `REDIS_PASSWORD`| _(empty)_     | Redis password (if auth)       |
| `CORS_ORIGIN`   | `*`           | Allowed CORS origin            |
| `NODE_ENV`      | `development` | Environment                    |

### Frontend env
Create `frontend/.env.production`:
```
VITE_API_URL=/api
```

## API Reference

| Method | Endpoint                  | Description                   |
|--------|---------------------------|-------------------------------|
| GET    | `/api/puzzle?difficulty=` | Get today's puzzle            |
| GET    | `/api/puzzle/hint?row=&col=&difficulty=` | Get hint for a cell |
| POST   | `/api/puzzle/complete`    | Submit completed puzzle score |
| GET    | `/api/puzzle/leaderboard` | Get today's leaderboard       |
| GET    | `/health`                 | Health check                  |

## How the Puzzle Works

- Puzzle is generated using a **Mulberry32 seeded PRNG** seeded by the date string (YYYY-MM-DD)
- The generator creates a full valid solution, then removes cells while guaranteeing **unique solution** via backtracking solution count check
- All users on the same day get **identical** puzzle regardless of timezone (UTC date used)
- Server verifies the submitted board against the solution before recording a score

## Leaderboard Reset

- Each leaderboard is stored as a Redis Sorted Set with key `sudoku:lb:YYYY-MM-DD`
- TTL is set to `seconds_until_end_of_UTC_day` on every write
- Redis automatically evicts the key — no cron job needed
