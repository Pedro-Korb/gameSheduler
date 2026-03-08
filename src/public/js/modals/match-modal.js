/* ── modals/match-modal.js ─────────────────
   Toda a lógica do modal de partidas:
   criar, editar, visualizar, excluir, notificar.
─────────────────────────────────────────── */

import { S }                         from '../state.js';
import { esc, blendToDark }          from '../utils.js';
import { shake }                     from '../utils.js';
import { toast }                     from '../toast.js';
import { api }                       from '../api.js';
import { renderMatches }             from '../render/matches.js';
import { updateCounts }              from '../render/index.js';
import { scheduleNotifs }            from '../notifications.js';
import { openModal, closeModal, applyViewMode } from './shared.js';

export function openMatchModal(matchId = null, viewMode = false) {
  // BUG FIX: Sempre reseta o modo visual antes de abrir,
  // impedindo que o estado de visualizar "vaze" para o modo editar.
  applyViewMode('modal-match', 'match-submit-btn', 'match-modal-title', '', false);

  S.editMatchId       = viewMode ? null : matchId;
  S.selectedGameId    = null;
  S.selectedFriendIds = new Set();
  S.selectedNotifyChannels = new Set(['discord_dm']);
  S.notifyBefore      = 15;
  S.durationMinutes   = 60;

  // Build game picker
  document.getElementById('match-game-picker').innerHTML = S.games.map(g => `
    <div class="gp-item" data-gid="${g.id}" onclick="selectGame(${g.id})">
      <span class="gpi-emoji">${g.emoji||'🎮'}</span>
      <span class="gpi-name">${esc(g.name)}</span>
    </div>`).join('') || '<p style="font-size:.8rem;color:var(--muted);padding:.5rem">Sem jogos cadastrados.</p>';

  buildFriendsPicker();

  // Reset form
  ['m-title','m-desc','m-maxp'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-platform').value = '';
  document.getElementById('m-duration').value = '60';

  // Default date/time (+1h)
  const d = new Date(Date.now() + 3_600_000);
  document.getElementById('m-date').value = d.toISOString().split('T')[0];
  document.getElementById('m-time').value = d.toTimeString().slice(0,5);

  // Reset notify chips
  document.querySelectorAll('.notify-opt').forEach(b => b.classList.toggle('sel', b.dataset.m === '15'));

  // Fill if editing or viewing
  if (matchId) {
    const m = S.matches.find(x => x.id === matchId);
    if (m) {
      selectGame(m.game_id);
      document.getElementById('m-title').value    = m.title || '';
      document.getElementById('m-desc').value     = m.description || '';
      document.getElementById('m-platform').value = m.platform || '';
      document.getElementById('m-maxp').value     = m.max_players || '';
      const dt = new Date(m.scheduled_at);
      document.getElementById('m-date').value = dt.toISOString().split('T')[0];
      document.getElementById('m-time').value = dt.toTimeString().slice(0,5);
      S.notifyBefore    = m.notify_before ?? 15;
      S.durationMinutes = m.duration_minutes || 60;
      const durSel = document.getElementById('m-duration');
      durSel.value = String(S.durationMinutes);
      if (!durSel.value) durSel.value = '60';
      document.querySelectorAll('.notify-opt').forEach(b => b.classList.toggle('sel', +b.dataset.m === S.notifyBefore));
      try {
        const ch = typeof m.notify_channels === 'string' ? JSON.parse(m.notify_channels) : (m.notify_channels || ['discord_dm']);
        S.selectedNotifyChannels = new Set(ch);
      } catch { S.selectedNotifyChannels = new Set(['discord_dm']); }
      (m.friends || []).forEach(f => S.selectedFriendIds.add(f.id));
      buildFriendsPicker();
    }
  }

  document.getElementById('match-modal-title').innerHTML = matchId && !viewMode ? '✏️ Editar Partida' : viewMode ? '👁️ Visualizar Partida' : '🎯 Nova Partida';
  document.getElementById('match-submit-btn').textContent = matchId ? '💾 Salvar Alterações' : '🚀 Agendar Partida';
  document.querySelectorAll('.channel-chip').forEach(b => b.classList.toggle('sel', S.selectedNotifyChannels.has(b.dataset.ch)));

  openModal('ov-match');

  if (viewMode) applyViewMode('modal-match', 'match-submit-btn', 'match-modal-title', '👁️ Visualizar Partida', true);
}

export function buildFriendsPicker() {
  const c = document.getElementById('match-friends-picker');
  if (!S.friends.length) {
    c.innerHTML = `<p style="font-size:.8rem;color:var(--muted);padding:.5rem">Nenhum amigo cadastrado. <button onclick="closeModal('ov-match');openFriendModal()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:.8rem">Cadastrar →</button></p>`;
    return;
  }
  c.innerHTML = S.friends.map(f => {
    const sel = S.selectedFriendIds.has(f.id);
    return `
    <div class="fp-item ${sel?'sel':''}" onclick="toggleFriend(${f.id})" data-fid="${f.id}">
      <div class="fp-check">${sel?'✓':''}</div>
      <div class="avatar" style="background:${f.avatar_color||'#5b8dee'};width:22px;height:22px;font-size:.55rem">${f.nickname[0].toUpperCase()}</div>
      <span class="fp-nick">@${esc(f.nickname)}</span>
      ${f.display_name ? `<span class="fp-name">${esc(f.display_name)}</span>` : ''}
      ${f.discord_webhook||f.discord_id ? `<span style="font-size:.65rem;color:#5865f2;margin-left:auto">🔵</span>` : ''}
    </div>`;
  }).join('');
}

export function selectGame(gameId) {
  S.selectedGameId = gameId;
  document.querySelectorAll('.gp-item').forEach(el => el.classList.toggle('sel', +el.dataset.gid === gameId));
}

export function toggleFriend(fid) {
  if (S.selectedFriendIds.has(fid)) S.selectedFriendIds.delete(fid);
  else S.selectedFriendIds.add(fid);
  buildFriendsPicker();
}

export async function submitMatch() {
  if (!S.selectedGameId) {
    shake(document.getElementById('match-game-picker'));
    return toast('⚠️', 'Selecione um jogo', '', 'var(--warn)');
  }
  const dateV = document.getElementById('m-date').value;
  const timeV = document.getElementById('m-time').value;
  if (!dateV || !timeV) return toast('⚠️', 'Preencha data e horário', '', 'var(--warn)');

  const game        = S.games.find(g => g.id === S.selectedGameId);
  const scheduledAt = new Date(`${dateV}T${timeV}`).toISOString();
  const title       = document.getElementById('m-title').value.trim()
    || `${game?.emoji||'🎮'} ${game?.name||'Partida'} — ${new Date(scheduledAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}`;

  const body = {
    game_id:          S.selectedGameId,
    title,
    scheduled_at:     scheduledAt,
    platform:         document.getElementById('m-platform').value,
    max_players:      parseInt(document.getElementById('m-maxp').value) || 0,
    description:      document.getElementById('m-desc').value.trim(),
    friend_ids:       [...S.selectedFriendIds],
    notify_before:    S.notifyBefore,
    duration_minutes: parseInt(document.getElementById('m-duration').value) || 60,
    notify_channels:  [...S.selectedNotifyChannels],
  };

  const btn = document.getElementById('match-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Salvando...';

  try {
    if (S.editMatchId) {
      const updated = await api('PUT', `/matches/${S.editMatchId}`, body);
      S.matches = S.matches.map(m => m.id === S.editMatchId ? updated : m);
      toast('✅', 'Partida atualizada!', updated.title, game?.color||'var(--accent)');
    } else {
      const created = await api('POST', '/matches', body);
      S.matches.push(created);
      toast('🎮', 'Partida agendada!', title, game?.color||'var(--accent)');
      if (S.selectedFriendIds.size > 0) {
        const names = S.friends.filter(f => S.selectedFriendIds.has(f.id)).map(f => '@'+f.nickname).slice(0,3).join(', ');
        setTimeout(() => toast('📨', 'Convites enviados!', names + (S.selectedFriendIds.size>3?'...':''), 'var(--neon2)'), 800);
      }
    }
    closeModal('ov-match');
    scheduleNotifs();
    renderMatches();
    updateCounts();
  } catch (e) {
    toast('❌', 'Erro ao salvar', e.message, 'var(--danger)');
  } finally {
    btn.disabled = false;
    btn.textContent = S.editMatchId ? '💾 Salvar Alterações' : '🚀 Agendar Partida';
  }
}

export function editMatch(id) { openMatchModal(id, false); }
export function viewMatch(id) { openMatchModal(id, true); }

export async function deleteMatch(id) {
  const m = S.matches.find(x => x.id === id);
  if (!confirm(`Excluir "${m?.title}"?`)) return;
  await api('DELETE', `/matches/${id}`);
  S.matches = S.matches.filter(x => x.id !== id);
  renderMatches(); updateCounts();
  toast('🗑️', 'Partida removida', '', 'var(--danger)');
}

export async function triggerNotify(id) {
  const m = S.matches.find(x => x.id === id);
  if (!m?.friends?.length) return toast('ℹ️', 'Sem amigos nesta partida', '', 'var(--accent)');
  try {
    const r = await api('POST', `/matches/${id}/notify`);
    const ok = r.results.filter(x => x.success).length;
    toast('🔔', `${ok}/${r.results.length} notificados!`,
      r.results.map(x => `@${x.nickname} ${x.success?'✓':'✗'}`).join(', '),
      ok ? 'var(--success)' : 'var(--warn)');
  } catch (e) { toast('❌', 'Erro ao notificar', e.message, 'var(--danger)'); }
}
