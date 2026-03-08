/* ── modals/game-modal.js ──────────────────
   Lógica do modal de jogos:
   criar, editar, visualizar, excluir.
─────────────────────────────────────────── */

import { S }                        from '../state.js';
import { shake, blendToDark }       from '../utils.js';
import { toast }                    from '../toast.js';
import { api }                      from '../api.js';
import { renderGames }              from '../render/games.js';
import { updateCounts }             from '../render/index.js';
import { openModal, closeModal, applyViewMode } from './shared.js';

export function openGameModal(gameId = null, viewMode = false) {
  // BUG FIX: reset visual antes de abrir
  applyViewMode('ov-game', 'game-submit-btn', 'game-modal-title', '', false);

  S.editGameId = viewMode ? null : gameId;
  ['g-name','g-emoji','g-imgurl','g-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('g-color').value = '#5b8dee';
  document.getElementById('g-emoji').value = '🎮';

  if (gameId) {
    const g = S.games.find(x => x.id === gameId);
    if (g) {
      document.getElementById('g-name').value   = g.name || '';
      document.getElementById('g-emoji').value  = g.emoji || '🎮';
      document.getElementById('g-color').value  = g.color || '#5b8dee';
      document.getElementById('g-imgurl').value = g.image_url || '';
      document.getElementById('g-desc').value   = g.description || '';
    }
  }

  document.getElementById('game-modal-title').innerHTML = gameId && !viewMode ? '✏️ Editar Jogo' : viewMode ? '👁️ Visualizar Jogo' : '🎮 Novo Jogo';
  document.getElementById('game-submit-btn').textContent = gameId ? '💾 Salvar' : '✅ Salvar Jogo';

  openModal('ov-game');
  if (viewMode) applyViewMode('ov-game', 'game-submit-btn', 'game-modal-title', '👁️ Visualizar Jogo', true);
}

export function editGame(id) { openGameModal(id, false); }
export function viewGame(id) { openGameModal(id, true); }

export async function submitGame() {
  const name = document.getElementById('g-name').value.trim();
  if (!name) { shake(document.getElementById('g-name')); return toast('⚠️', 'Nome obrigatório', '', 'var(--warn)'); }

  const color = document.getElementById('g-color').value;
  const body = {
    name,
    emoji:       document.getElementById('g-emoji').value.trim() || '🎮',
    color,
    bg_color:    blendToDark(color),
    image_url:   document.getElementById('g-imgurl').value.trim(),
    description: document.getElementById('g-desc').value.trim(),
  };

  const btn = document.getElementById('game-submit-btn');
  btn.disabled = true;

  try {
    if (S.editGameId) {
      const updated = await api('PUT', `/games/${S.editGameId}`, body);
      S.games = S.games.map(g => g.id === S.editGameId ? updated : g);
      toast('✅', 'Jogo atualizado!', name, color);
    } else {
      const created = await api('POST', '/games', body);
      S.games.push(created);
      toast('🎮', 'Jogo adicionado!', name, color);
    }
    closeModal('ov-game');
    renderGames(); updateCounts();
  } catch (e) {
    toast('❌', 'Erro ao salvar', e.message, 'var(--danger)');
  } finally { btn.disabled = false; }
}

export async function deleteGame(id) {
  const g = S.games.find(x => x.id === id);
  if (!confirm(`Excluir "${g?.name}"?`)) return;
  await api('DELETE', `/games/${id}`);
  S.games = S.games.filter(x => x.id !== id);
  renderGames(); updateCounts();
  toast('🗑️', 'Jogo removido', '', 'var(--danger)');
}
