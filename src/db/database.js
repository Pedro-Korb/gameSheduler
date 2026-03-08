/**
 * db/database.js
 * Camada de persistência — SQLite via Python (sem dependências npm).
 */

const { execFileSync } = require('child_process');
const path = require('path');

const DB_PATH = path.join(__dirname, 'scheduler.db');
const P = JSON.stringify; // shorthand for safe Python string literals

// ── Execute Python ────────────────────────────────────────────────────────────
function py(script) {
  try {
    const out = execFileSync('python', ['-c', script], { encoding: 'utf8', timeout: 10000 }).trim();
    if (!out) return null;
    return JSON.parse(out);
  } catch (err) {
    const msg = (err.stderr || err.message || '').split('\n').filter(Boolean).pop() || err.message;
    console.error('[DB ERROR]', msg);
    throw new Error(msg);
  }
}

// ── Shared Python header ──────────────────────────────────────────────────────
// Uses a lambda row_factory so every row is a plain dict — no sqlite3.Row issues
const H = `
import sqlite3, json
def conn():
    db = sqlite3.connect(${P(DB_PATH)})
    db.execute("PRAGMA foreign_keys=ON")
    db.row_factory = lambda c, r: dict(zip([x[0] for x in c.description], r))
    return db
`;

// ── Init / DDL ────────────────────────────────────────────────────────────────
function init() {
  py(`${H}
db = conn()
db.executescript("""
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS games (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    emoji       TEXT NOT NULL DEFAULT '?',
    color       TEXT NOT NULL DEFAULT '#5b8dee',
    bg_color    TEXT NOT NULL DEFAULT '#0c1018',
    description TEXT,
    image_url   TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS friends (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname        TEXT NOT NULL UNIQUE,
    display_name    TEXT,
    discord_id      TEXT,
    discord_webhook TEXT,
    email           TEXT,
    whatsapp        TEXT,
    notify_channel  TEXT DEFAULT 'discord',
    avatar_color    TEXT DEFAULT '#5b8dee',
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS matches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id          INTEGER NOT NULL,
    title            TEXT NOT NULL,
    scheduled_at     TEXT NOT NULL,
    platform         TEXT,
    max_players      INTEGER DEFAULT 0,
    description      TEXT,
    notify_before    INTEGER DEFAULT 15,
    duration_minutes INTEGER DEFAULT 60,
    notify_channels  TEXT DEFAULT '["discord_dm"]',
    status           TEXT DEFAULT 'scheduled',
    created_at       TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS match_friends (
    match_id   INTEGER NOT NULL,
    friend_id  INTEGER NOT NULL,
    invited_at TEXT DEFAULT (datetime('now')),
    notified   INTEGER DEFAULT 0,
    PRIMARY KEY (match_id, friend_id)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
""")
db.execute("INSERT OR IGNORE INTO settings VALUES ('discord_webhook','')")
db.execute("INSERT OR IGNORE INTO settings VALUES ('app_name','GG Schedule')")
try:
    db.execute("ALTER TABLE matches ADD COLUMN duration_minutes INTEGER DEFAULT 60")
except Exception:
    pass
try:
    db.execute("ALTER TABLE friends ADD COLUMN whatsapp TEXT")
except Exception:
    pass
try:
    db.execute("ALTER TABLE friends ADD COLUMN notify_channel TEXT DEFAULT 'discord'")
except Exception:
    pass
try:
    db.execute("""ALTER TABLE matches ADD COLUMN notify_channels TEXT DEFAULT '["discord_dm"]'""")
except Exception:
    pass
db.commit()
db.close()
print('"ok"')
`);

  const count = py(`${H}
db = conn()
n = db.execute("SELECT COUNT(*) as n FROM games").fetchone()["n"]
db.close()
print(n)
`);
  if (count === 0) seedDefaultGames();
}

function seedDefaultGames() {
  const defaults = [
    { name: 'Valorant', emoji: '🔫', color: '#ff4655', bg_color: '#160506', description: 'FPS tático 5v5 da Riot Games' },
    { name: 'League of Legends', emoji: '⚔️', color: '#c89b3c', bg_color: '#0a0c0e', description: 'MOBA clássico da Riot Games' },
    { name: 'CS2', emoji: '💣', color: '#f0a500', bg_color: '#0d0f0a', description: 'Counter-Strike 2 da Valve' },
    { name: 'Apex Legends', emoji: '🦾', color: '#cd4227', bg_color: '#100806', description: 'Battle Royale da Respawn' },
    { name: 'Fortnite', emoji: '🌀', color: '#00d4ff', bg_color: '#060b10', description: 'Battle Royale da Epic Games' },
    { name: 'Minecraft', emoji: '⛏️', color: '#7fb238', bg_color: '#080e04', description: 'Sandbox da Mojang' },
  ];
  defaults.forEach(g => createGame(g));
}

// ═══════════════ GAMES ═══════════════
function getAllGames() {
  return py(`${H}
db = conn()
rows = db.execute("SELECT * FROM games ORDER BY name").fetchall()
db.close()
print(json.dumps(rows))
`) || [];
}

function getGameById(id) {
  return py(`${H}
db = conn()
row = db.execute("SELECT * FROM games WHERE id=?", (${+id},)).fetchone()
db.close()
print(json.dumps(row))
`);
}

function createGame(data) {
  return py(`${H}
db = conn()
cur = db.execute(
  "INSERT INTO games (name,emoji,color,bg_color,description,image_url) VALUES (?,?,?,?,?,?)",
  (${P(data.name || '')},${P(data.emoji || '🎮')},${P(data.color || '#5b8dee')},
   ${P(data.bg_color || '#0c1018')},${P(data.description || '')},${P(data.image_url || '')})
)
db.commit()
row = db.execute("SELECT * FROM games WHERE id=?", (cur.lastrowid,)).fetchone()
db.close()
print(json.dumps(row))
`);
}

function updateGame(id, data) {
  return py(`${H}
db = conn()
db.execute(
  "UPDATE games SET name=?,emoji=?,color=?,bg_color=?,description=?,image_url=? WHERE id=?",
  (${P(data.name || '')},${P(data.emoji || '🎮')},${P(data.color || '#5b8dee')},
   ${P(data.bg_color || '#0c1018')},${P(data.description || '')},${P(data.image_url || '')},${+id})
)
db.commit()
row = db.execute("SELECT * FROM games WHERE id=?", (${+id},)).fetchone()
db.close()
print(json.dumps(row))
`);
}

function deleteGame(id) {
  py(`${H}
db = conn()
db.execute("DELETE FROM games WHERE id=?", (${+id},))
db.commit()
db.close()
print('"ok"')
`);
  return true;
}

// ═══════════════ FRIENDS ═══════════════
function getAllFriends() {
  return py(`${H}
db = conn()
rows = db.execute("SELECT * FROM friends ORDER BY nickname").fetchall()
db.close()
print(json.dumps(rows))
`) || [];
}

function getFriendById(id) {
  return py(`${H}
db = conn()
row = db.execute("SELECT * FROM friends WHERE id=?", (${+id},)).fetchone()
db.close()
print(json.dumps(row))
`);
}

function createFriend(data) {
  return py(`${H}
db = conn()
cur = db.execute(
  "INSERT INTO friends (nickname,display_name,discord_id,discord_webhook,email,whatsapp,notify_channel,avatar_color,notes) VALUES (?,?,?,?,?,?,?,?,?)",
  (${P(data.nickname || '')},${P(data.display_name || '')},${P(data.discord_id || '')},
   ${P(data.discord_webhook || '')},${P(data.email || '')},${P(data.whatsapp || '')},
   ${P(data.notify_channel || 'discord')},${P(data.avatar_color || '#5b8dee')},${P(data.notes || '')})
)
db.commit()
row = db.execute("SELECT * FROM friends WHERE id=?", (cur.lastrowid,)).fetchone()
db.close()
print(json.dumps(row))
`);
}

function updateFriend(id, data) {
  return py(`${H}
db = conn()
db.execute(
  "UPDATE friends SET nickname=?,display_name=?,discord_id=?,discord_webhook=?,email=?,whatsapp=?,notify_channel=?,avatar_color=?,notes=? WHERE id=?",
  (${P(data.nickname || '')},${P(data.display_name || '')},${P(data.discord_id || '')},
   ${P(data.discord_webhook || '')},${P(data.email || '')},${P(data.whatsapp || '')},
   ${P(data.notify_channel || 'discord')},${P(data.avatar_color || '#5b8dee')},${P(data.notes || '')},${+id})
)
db.commit()
row = db.execute("SELECT * FROM friends WHERE id=?", (${+id},)).fetchone()
db.close()
print(json.dumps(row))
`);
}

function deleteFriend(id) {
  py(`${H}
db = conn()
db.execute("DELETE FROM friends WHERE id=?", (${+id},))
db.commit()
db.close()
print('"ok"')
`);
  return true;
}

// ═══════════════ MATCHES ═══════════════
const MATCH_SELECT = `
  SELECT m.*, g.name as game_name, g.emoji as game_emoji,
         g.color as game_color, g.bg_color as game_bg_color,
         g.image_url as game_image_url
  FROM matches m LEFT JOIN games g ON g.id = m.game_id
`;

function getAllMatches() {
  return py(`${H}
db = conn()
matches = db.execute("""
  SELECT m.*, g.name as game_name, g.emoji as game_emoji,
         g.color as game_color, g.bg_color as game_bg_color,
         g.image_url as game_image_url
  FROM matches m LEFT JOIN games g ON g.id = m.game_id
  ORDER BY m.scheduled_at ASC
""").fetchall()
for m in matches:
    m["friends"] = db.execute("""
      SELECT f.*, mf.notified FROM friends f
      JOIN match_friends mf ON mf.friend_id = f.id WHERE mf.match_id=?
    """, (m["id"],)).fetchall()
db.close()
print(json.dumps(matches))
`) || [];
}

function getMatchById(id) {
  return py(`${H}
db = conn()
m = db.execute("""
  SELECT m.*, g.name as game_name, g.emoji as game_emoji,
         g.color as game_color, g.bg_color as game_bg_color,
         g.image_url as game_image_url
  FROM matches m LEFT JOIN games g ON g.id = m.game_id WHERE m.id=?
""", (${+id},)).fetchone()
if m is None:
    db.close(); print("null"); exit()
m["friends"] = db.execute("""
  SELECT f.*, mf.notified FROM friends f
  JOIN match_friends mf ON mf.friend_id = f.id WHERE mf.match_id=?
""", (m["id"],)).fetchall()
db.close()
print(json.dumps(m))
`);
}

function createMatch(data) {
  const fids = JSON.stringify((Array.isArray(data.friend_ids) ? data.friend_ids : []).map(Number));
  return py(`${H}
db = conn()
cur = db.execute(
  "INSERT INTO matches (game_id,title,scheduled_at,platform,max_players,description,notify_before,duration_minutes,notify_channels) VALUES (?,?,?,?,?,?,?,?,?)",
  (${+data.game_id || 0},${P(data.title || '')},${P(data.scheduled_at || '')},
   ${P(data.platform || '')},${+(data.max_players || 0)},${P(data.description || '')},${+(data.notify_before || 15)},${+(data.duration_minutes || 60)},${P(JSON.stringify(data.notify_channels || ['discord_dm']))})
)
mid = cur.lastrowid
for fid in ${fids}:
    db.execute("INSERT OR IGNORE INTO match_friends (match_id,friend_id) VALUES (?,?)", (mid,fid))
db.commit()
m = db.execute("""
  SELECT m.*, g.name as game_name, g.emoji as game_emoji,
         g.color as game_color, g.bg_color as game_bg_color,
         g.image_url as game_image_url
  FROM matches m LEFT JOIN games g ON g.id = m.game_id WHERE m.id=?
""", (mid,)).fetchone()
m["friends"] = db.execute("""
  SELECT f.*, mf.notified FROM friends f
  JOIN match_friends mf ON mf.friend_id = f.id WHERE mf.match_id=?
""", (mid,)).fetchall()
db.close()
print(json.dumps(m))
`);
}

function updateMatch(id, data) {
  const fidsVal = Array.isArray(data.friend_ids)
    ? JSON.stringify(data.friend_ids.map(Number))
    : 'None';
  return py(`${H}
db = conn()
db.execute(
  "UPDATE matches SET game_id=?,title=?,scheduled_at=?,platform=?,max_players=?,description=?,notify_before=?,duration_minutes=?,notify_channels=? WHERE id=?",
  (${+data.game_id || 0},${P(data.title || '')},${P(data.scheduled_at || '')},
   ${P(data.platform || '')},${+(data.max_players || 0)},${P(data.description || '')},${+(data.notify_before || 15)},${+(data.duration_minutes || 60)},${P(JSON.stringify(data.notify_channels || ['discord_dm']))},${+id})
)
friend_ids = ${fidsVal}
if friend_ids is not None:
    db.execute("DELETE FROM match_friends WHERE match_id=?", (${+id},))
    for fid in friend_ids:
        db.execute("INSERT OR IGNORE INTO match_friends (match_id,friend_id) VALUES (?,?)", (${+id},fid))
db.commit()
m = db.execute("""
  SELECT m.*, g.name as game_name, g.emoji as game_emoji,
         g.color as game_color, g.bg_color as game_bg_color,
         g.image_url as game_image_url
  FROM matches m LEFT JOIN games g ON g.id = m.game_id WHERE m.id=?
""", (${+id},)).fetchone()
m["friends"] = db.execute("""
  SELECT f.*, mf.notified FROM friends f
  JOIN match_friends mf ON mf.friend_id = f.id WHERE mf.match_id=?
""", (${+id},)).fetchall()
db.close()
print(json.dumps(m))
`);
}

function deleteMatch(id) {
  py(`${H}
db = conn()
db.execute("DELETE FROM match_friends WHERE match_id=?", (${+id},))
db.execute("DELETE FROM matches WHERE id=?", (${+id},))
db.commit()
db.close()
print('"ok"')
`);
  return true;
}

function markNotified(matchId, friendId) {
  py(`${H}
db = conn()
db.execute("UPDATE match_friends SET notified=1 WHERE match_id=? AND friend_id=?", (${+matchId},${+friendId}))
db.commit()
db.close()
print('"ok"')
`);
}

// ═══════════════ SETTINGS ═══════════════
function getSetting(key) {
  return py(`${H}
db = conn()
row = db.execute("SELECT value FROM settings WHERE key=?", (${P(key)},)).fetchone()
db.close()
print(json.dumps(row["value"] if row else None))
`);
}

function setSetting(key, value) {
  py(`${H}
db = conn()
db.execute("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)", (${P(key)},${P(String(value || ''))}))
db.commit()
db.close()
print('"ok"')
`);
}

function getAllSettings() {
  return py(`${H}
db = conn()
rows = db.execute("SELECT key, value FROM settings").fetchall()
db.close()
print(json.dumps({r["key"]: r["value"] for r in rows}))
`) || {};
}

module.exports = {
  init,
  getAllGames, getGameById, createGame, updateGame, deleteGame,
  getAllFriends, getFriendById, createFriend, updateFriend, deleteFriend,
  getAllMatches, getMatchById, createMatch, updateMatch, deleteMatch, markNotified,
  getSetting, setSetting, getAllSettings,
};
