/**
 * services/scheduler.js
 * Gerencia timers de notificação para partidas futuras.
 * Recarrega a cada hora para pegar novos agendamentos.
 */

const db    = require('../db/database');
const notif = require('./notifications');

const timers = new Map(); // matchId → TimeoutId

function schedule() {
  const now     = Date.now();
  const matches = db.getAllMatches();

  // Clear stale timers
  for (const [id] of timers) {
    if (!matches.find(m => m.id === id)) {
      clearTimeout(timers.get(id));
      timers.delete(id);
    }
  }

  for (const match of matches) {
    if (match.status === 'done' || !match.notify_before) continue;
    const fireAt = new Date(match.scheduled_at).getTime() - match.notify_before * 60_000;
    const delay  = fireAt - now;

    // Only schedule if within next 24h and not already scheduled
    if (delay > 0 && delay < 86_400_000 && !timers.has(match.id)) {
      const id = setTimeout(async () => {
        timers.delete(match.id);
        const fresh = db.getMatchById(match.id);
        if (!fresh) return;
        console.log(`[SCHEDULER] Firing reminder for "${fresh.title}"`);
        const results = await notif.notifyMatchFriends(fresh, 'reminder');
        results.forEach(r => { if (r.success) db.markNotified(match.id, r.friendId); });
      }, delay);

      timers.set(match.id, id);
      console.log(`[SCHEDULER] Scheduled reminder for "${match.title}" in ${Math.round(delay/60000)}min`);
    }
  }
}

function reschedule(matchId) {
  if (timers.has(matchId)) { clearTimeout(timers.get(matchId)); timers.delete(matchId); }
  schedule();
}

function start() {
  schedule();
  // Refresh every 30 minutes
  setInterval(schedule, 30 * 60_000);
  console.log('[SCHEDULER] Started');
}

module.exports = { start, reschedule };
