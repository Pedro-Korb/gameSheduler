/* ── api.js ────────────────────────────────
   Camada de comunicação com o backend REST.
─────────────────────────────────────────── */

import { S }               from './state.js';
import { toast }           from './toast.js';
import { render }          from './render/index.js';
import { scheduleNotifs }  from './notifications.js';

export async function api(method, path, body) {
  const r = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function loadAll() {
  try {
    [S.games, S.friends, S.matches, S.settings] = await Promise.all([
      api('GET', '/games'),
      api('GET', '/friends'),
      api('GET', '/matches'),
      api('GET', '/settings'),
    ]);
    render();
    scheduleNotifs();
  } catch (e) {
    toast('❌', 'Erro ao carregar dados', e.message, 'var(--danger)');
  }
}
