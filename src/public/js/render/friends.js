/* ── render/friends.js ─────────────────────
   Renderiza a grade de amigos.
─────────────────────────────────────────── */

import { S } from '../state.js';
import { esc } from '../utils.js';

export function renderFriends() {
  const grid = document.getElementById('friends-grid');
  if (!S.friends.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><h3>Nenhum amigo cadastrado</h3><p>Clique em "+ Novo Amigo" para começar</p></div>`;
    return;
  }
  grid.innerHTML = S.friends.map((f, i) => `
  <div class="friend-card" style="animation-delay:${i*.05}s">
    <div class="friend-avatar-lg" style="background:${f.avatar_color||'#5b8dee'}">${f.nickname[0].toUpperCase()}</div>
    <div class="friend-info">
      <div class="friend-nick">@${esc(f.nickname)}</div>
      ${f.display_name ? `<div class="friend-name">${esc(f.display_name)}</div>` : ''}
      <div class="friend-tags">
        ${f.discord_webhook || f.discord_id ? `<span class="friend-tag-item friend-discord">🔵 Discord</span>` : ''}
        ${f.email ? `<span class="friend-tag-item">✉️ Email</span>` : ''}
        ${f.notes ? `<span class="friend-tag-item">📝 Obs</span>` : ''}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.4rem">
      <button class="btn btn-ghost btn-sm btn-icon-sq" onclick="viewFriend(${f.id})" title="Visualizar">👁️</button>
      <button class="btn btn-ghost btn-sm btn-icon-sq" onclick="editFriend(${f.id})" title="Editar">✏️</button>
      <button class="btn btn-danger btn-sm btn-icon-sq" onclick="deleteFriend(${f.id})" title="Excluir">🗑️</button>
    </div>
  </div>`).join('');
}
