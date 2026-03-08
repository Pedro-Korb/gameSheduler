/* ── notifications.js ──────────────────────
   Temporizadores de notificação no browser
   e relógio da interface.

   startClock recebe loadAllCallback para evitar
   dependência circular com api.js.
─────────────────────────────────────────── */

import { S, TIMER_MAP } from './state.js';
import { toast }         from './toast.js';

export function scheduleNotifs() {
  const now = Date.now();
  for (const [, t] of TIMER_MAP) clearTimeout(t);
  TIMER_MAP.clear();

  S.matches.forEach(m => {
    if (!m.notify_before) return;
    const fireAt = +new Date(m.scheduled_at) - m.notify_before * 60_000;
    const delay  = fireAt - now;
    if (delay > 0 && delay < 86_400_000) {
      TIMER_MAP.set(m.id, setTimeout(() => {
        const game = S.games.find(g => g.id === m.game_id);
        toast(game?.emoji||'🔔', `Partida em ${m.notify_before} minutos!`, m.title, game?.color||'var(--warn)', 10000);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${game?.emoji||'🎮'} GG Schedule`, { body: `${m.title} começa em ${m.notify_before}min!` });
        }
      }, delay));
    }
  });
}

const _reloadedMatches = new Set();

export function startClock(loadAllCallback) {
  setInterval(() => {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
    const now = Date.now();
    document.querySelectorAll('[id^="cd-"]').forEach(el => {
      const id  = parseInt(el.id.replace('cd-', ''));
      const m   = S.matches.find(x => x.id === id);
      if (!m) return;
      const diff = +new Date(m.scheduled_at) - now;
      const dur  = (m.duration_minutes || 60) * 60_000;
      if (diff <= 0 && diff > -dur) {
        el.className = 'cd-badge cd-live';
        el.textContent = '🟢 AO VIVO';
        return;
      }
      if (diff <= -dur) {
        if (!_reloadedMatches.has(id)) {
          _reloadedMatches.add(id);
          loadAllCallback().then(() => _reloadedMatches.delete(id));
        }
        return;
      }
      const fmtCd = ms => {
        const h = Math.floor(ms/3_600_000), m2 = Math.floor((ms%3_600_000)/60_000), s = Math.floor((ms%60_000)/1_000);
        if (h > 48) return `${Math.ceil(h/24)}d`;
        if (h > 0) return `${h}h ${m2}m`;
        if (m2 > 0) return `${m2}m ${s}s`;
        return `${s}s`;
      };
      el.className = `cd-badge ${diff < 1_800_000 ? 'cd-soon' : 'cd-future'}`;
      el.textContent = (diff < 1_800_000 ? '⚡ ' : '') + fmtCd(diff);
    });
  }, 1000);
}
