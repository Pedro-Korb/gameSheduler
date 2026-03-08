/**
 * routes/api.js
 * Roteador REST para todas as entidades.
 */

const db = require('../db/database');
const notif = require('../services/notifications');
const sched = require('../services/scheduler');

function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.replace(/^\/api\//, '').split('/');
  const resource = parts[0];
  const id = parts[1] ? parseInt(parts[1]) : null;
  const sub = parts[2]; // e.g. /api/matches/1/notify
  const method = req.method;

  try {
    // ── GAMES ──────────────────────────────────────────────────────────────
    if (resource === 'games') {
      if (method === 'GET' && !id) return send(res, 200, db.getAllGames());
      if (method === 'GET' && id) return send(res, 200, db.getGameById(id) || {});
      if (method === 'POST') { const b = await getBody(req); return send(res, 201, db.createGame(b)); }
      if (method === 'PUT' && id) { const b = await getBody(req); return send(res, 200, db.updateGame(id, b) || {}); }
      if (method === 'DELETE' && id) { db.deleteGame(id); return send(res, 200, { success: true }); }
    }

    // ── FRIENDS ────────────────────────────────────────────────────────────
    if (resource === 'friends') {
      if (method === 'GET' && !id) return send(res, 200, db.getAllFriends());
      if (method === 'GET' && id) return send(res, 200, db.getFriendById(id) || {});
      if (method === 'POST') { const b = await getBody(req); return send(res, 201, db.createFriend(b)); }
      if (method === 'PUT' && id) { const b = await getBody(req); return send(res, 200, db.updateFriend(id, b) || {}); }
      if (method === 'DELETE' && id) { db.deleteFriend(id); return send(res, 200, { success: true }); }
    }

    // ── MATCHES ────────────────────────────────────────────────────────────
    if (resource === 'matches') {
      if (method === 'GET' && !id) return send(res, 200, db.getAllMatches());
      if (method === 'GET' && id) return send(res, 200, db.getMatchById(id) || {});

      // POST /api/matches/:id/notify  — manual trigger (must come before generic POST)
      if (method === 'POST' && id && sub === 'notify') {
        const match = db.getMatchById(id);
        if (!match) return send(res, 404, { error: 'not found' });
        const results = await notif.notifyMatchFriends(match, 'reminder');
        return send(res, 200, { results });
      }

      if (method === 'POST') {
        const b = await getBody(req);
        const match = db.createMatch(b);
        sched.reschedule(match.id);
        // Send invites async
        notif.notifyMatchFriends(match, 'invite').then(results => {
          results.forEach(r => { if (r.success) db.markNotified(match.id, r.friendId); });
        });
        return send(res, 201, match);
      }

      if (method === 'PUT' && id) {
        const b = await getBody(req);
        const match = db.updateMatch(id, b);
        if (match) sched.reschedule(match.id);
        return send(res, 200, match || {});
      }

      if (method === 'DELETE' && id) {
        db.deleteMatch(id);
        sched.reschedule(id); // Bug 3: cancel any pending notification timer
        return send(res, 200, { success: true });
      }
    }

    // ── SETTINGS ───────────────────────────────────────────────────────────
    if (resource === 'settings') {
      if (method === 'GET') return send(res, 200, db.getAllSettings());
      if (method === 'POST') {
        const b = await getBody(req);
        Object.entries(b).forEach(([k, v]) => db.setSetting(k, v));
        return send(res, 200, db.getAllSettings());
      }
    }

    // ── TEST notification ──────────────────────────────────────────────────
    if (resource === 'test-notify' && method === 'POST') {
      const b = await getBody(req);
      const webhookUrl = b.webhook_url?.trim();
      if (!webhookUrl) return send(res, 400, { error: 'webhook_url required' });

      const fakeMatch = {
        title: '🎮 Teste de Notificação — GG Schedule',
        scheduled_at: new Date(Date.now() + 900000).toISOString(),
        game_name: 'Valorant', game_emoji: '🔫', game_color: '#ff4655',
        platform: 'PC', description: 'Esta é uma mensagem de teste.',
        notify_before: 15,
      };
      const fakeFriend = { id: 0, nickname: 'você', discord_id: '', discord_webhook: webhookUrl };
      const result = await notif.notifyFriend(fakeMatch, fakeFriend, 'invite');
      return send(res, result.success ? 200 : 400, result);
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('[API ERROR]', err.message);
    send(res, 500, { error: err.message });
  }
}

module.exports = { handle };
