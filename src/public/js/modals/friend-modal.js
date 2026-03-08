/* ── modals/friend-modal.js ────────────────
   Lógica do modal de amigos:
   criar, editar, visualizar, excluir.
─────────────────────────────────────────── */

import { S, COLORS }                from '../state.js';
import { esc }                      from '../utils.js';
import { shake }                    from '../utils.js';
import { toast }                    from '../toast.js';
import { api }                      from '../api.js';
import { renderFriends }            from '../render/friends.js';
import { updateCounts }             from '../render/index.js';
import { openModal, closeModal, applyViewMode } from './shared.js';

export function buildColorSwatches() {
  document.getElementById('friend-color-swatches').innerHTML = COLORS.map(c => `
    <div class="swatch ${S.friendColor===c?'sel':''}" style="background:${c}" onclick="pickFriendColor('${c}')"></div>`
  ).join('');
}

export function pickFriendColor(c) {
  S.friendColor = c;
  buildColorSwatches();
}

export function openFriendModal(friendId = null, viewMode = false) {
  // BUG FIX: reset visual antes de abrir
  applyViewMode('ov-friend', 'friend-submit-btn', 'friend-modal-title', '', false);

  S.editFriendId = viewMode ? null : friendId;
  S.friendColor  = '#5b8dee';

  ['f-nick','f-name','f-discord-id','f-webhook','f-email','f-notes'].forEach(id => document.getElementById(id).value = '');

  if (friendId) {
    const f = S.friends.find(x => x.id === friendId);
    if (f) {
      document.getElementById('f-nick').value       = f.nickname || '';
      document.getElementById('f-name').value       = f.display_name || '';
      document.getElementById('f-discord-id').value = f.discord_id || '';
      document.getElementById('f-webhook').value    = f.discord_webhook || '';
      document.getElementById('f-email').value      = f.email || '';
      document.getElementById('f-notes').value      = f.notes || '';
      S.friendColor = f.avatar_color || '#5b8dee';
    }
  }

  buildColorSwatches();
  document.getElementById('friend-modal-title').innerHTML = friendId && !viewMode ? '✏️ Editar Amigo' : viewMode ? '👁️ Visualizar Amigo' : '👤 Novo Amigo';
  document.getElementById('friend-submit-btn').textContent = friendId ? '💾 Salvar' : '✅ Salvar Amigo';

  openModal('ov-friend');
  if (viewMode) applyViewMode('ov-friend', 'friend-submit-btn', 'friend-modal-title', '👁️ Visualizar Amigo', true);
}

export function editFriend(id) { openFriendModal(id, false); }
export function viewFriend(id) { openFriendModal(id, true); }

export async function submitFriend() {
  const nick = document.getElementById('f-nick').value.trim();
  if (!nick) { shake(document.getElementById('f-nick')); return toast('⚠️', 'Nickname obrigatório', '', 'var(--warn)'); }

  const body = {
    nickname:        nick,
    display_name:    document.getElementById('f-name').value.trim(),
    discord_id:      document.getElementById('f-discord-id').value.trim(),
    discord_webhook: document.getElementById('f-webhook').value.trim(),
    email:           document.getElementById('f-email').value.trim(),
    notes:           document.getElementById('f-notes').value.trim(),
    avatar_color:    S.friendColor,
  };

  const btn = document.getElementById('friend-submit-btn');
  btn.disabled = true;

  try {
    if (S.editFriendId) {
      const updated = await api('PUT', `/friends/${S.editFriendId}`, body);
      S.friends = S.friends.map(f => f.id === S.editFriendId ? updated : f);
      toast('✅', 'Amigo atualizado!', `@${nick}`, S.friendColor);
    } else {
      const created = await api('POST', '/friends', body);
      S.friends.push(created);
      toast('👤', 'Amigo adicionado!', `@${nick}`, S.friendColor);
    }
    closeModal('ov-friend');
    renderFriends(); updateCounts();
  } catch (e) {
    toast('❌', 'Erro ao salvar', e.message.includes('UNIQUE') ? 'Nickname já cadastrado' : e.message, 'var(--danger)');
  } finally { btn.disabled = false; }
}

export async function deleteFriend(id) {
  const f = S.friends.find(x => x.id === id);
  if (!confirm(`Excluir "@${f?.nickname}"?`)) return;
  await api('DELETE', `/friends/${id}`);
  S.friends = S.friends.filter(x => x.id !== id);
  renderFriends(); updateCounts();
  toast('🗑️', 'Amigo removido', '', 'var(--danger)');
}
