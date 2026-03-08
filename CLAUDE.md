# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GG Schedule** is a game session scheduler with Discord notifications. The repository contains two coexisting layers:

1. **React frontend (CRA)** — `src/App.js`, `src/index.js`, etc. Still the default Create React App template; not yet developed.
2. **Node.js backend server** — `src/server.js` and supporting modules. This is the functional application, serving its own SPA from `src/public/index.html`.

Both layers live under `src/`. The backend server is **independent of the React build** and runs directly with Node.

## Commands

### Backend server (the working app)
```bash
# Run the backend server (serves UI + API on port 3000)
node src/server.js
```
Requires: Node.js 16+ and Python 3 in PATH.

### React frontend (CRA)
```bash
npm start        # Dev server (port 3000 — conflicts with backend if both run)
npm run build    # Production build
npm test         # Run tests (Jest + React Testing Library)
npm test -- --testPathPattern=App  # Run a single test file
```

## Architecture

### Backend (`src/`)
- **`server.js`** — Minimal Node.js `http` server (no Express). Handles CORS, serves static files from `src/public/`, routes `/api/*` requests, and boots the DB + scheduler on startup.
- **`routes/api.js`** — Single `handle()` function routing all REST endpoints by URL pattern and HTTP method.
- **`db/database.js`** — All persistence is SQLite, accessed by spawning Python subprocess calls (`execFileSync('python', ['-c', script])`). Every DB operation is a Python snippet embedded as a template literal. The DB file is `src/db/scheduler.db`.
- **`services/notifications.js`** — Sends Discord embeds via webhook. Priority: friend's personal webhook → global webhook (from settings) → console log fallback.
- **`services/scheduler.js`** — In-memory `Map` of `setTimeout` timers. Fires reminder notifications X minutes before each match. Rescans every 30 minutes; also called on match create/update.

### Data model (SQLite)
- `games` — game catalog (emoji, colors, image URL)
- `friends` — players (nickname, Discord ID, personal webhook)
- `matches` — scheduled sessions (linked to a game, has `notify_before` minutes)
- `match_friends` — junction table; tracks per-friend `notified` flag
- `settings` — key/value store (e.g. `discord_webhook`, `app_name`)

### React frontend
`src/App.js` is the default CRA placeholder. The actual UI is the self-contained `src/public/index.html` served by the backend.

## Key Conventions

- **DB access pattern**: All queries in `database.js` use the shared Python header `H` (defines `conn()` with row_factory) prepended to each inline Python script. Parameters are interpolated directly via `JSON.stringify` — not parameterized at the JS level.
- **No npm packages on the backend**: The backend server uses only Node.js built-ins (`http`, `https`, `fs`, `path`, `child_process`).
- **Scheduler only covers next 24h**: Timers are only set for matches firing within 24 hours; the 30-minute rescan picks up the rest as they approach.
