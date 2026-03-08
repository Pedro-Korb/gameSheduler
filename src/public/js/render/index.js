/* ── render/index.js ───────────────────────
   Agrega todos os sub-módulos de render.
   Outros módulos importam de cá para acionar o ciclo completo.
─────────────────────────────────────────── */

import { renderMatches } from './matches.js';
import { renderFriends } from './friends.js';
import { renderGames }   from './games.js';
import { S }             from '../state.js';

export { renderMatches, renderFriends, renderGames };

export function updateCounts() {
  document.getElementById('cnt-matches').textContent = S.matches.filter(m => +new Date(m.scheduled_at) > Date.now()).length;
  document.getElementById('cnt-friends').textContent = S.friends.length;
  document.getElementById('cnt-games').textContent   = S.games.length;
}

export function render() {
  renderMatches();
  renderFriends();
  renderGames();
  updateCounts();
  if (S.settings.discord_webhook) document.getElementById('s-webhook').value = S.settings.discord_webhook;
}
