/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
const S = {
  matches: [],
  friends: [],
  games:   [],
  settings: {},
  filter:  'all',
  editMatchId:  null,
  editFriendId: null,
  editGameId:   null,
  selectedGameId: null,
  selectedFriendIds: new Set(),
  selectedNotifyChannels: new Set(['discord_dm']),
  notifyBefore: 15,
  durationMinutes: 60,
  friendColor: '#5b8dee',
};

const COLORS = ['#5b8dee','#7c5ef0','#f04444','#f5a623','#22c55e','#00e5ff','#ff4655','#c89b3c','#cd4227','#7fb238'];
const TIMER_MAP = new Map();

/* ════════════════════════════════════════
   API
════════════════════════════════════════ */
async function api(method, path, body) {
  const r = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function loadAll() {
  try {
    [S.games, S.friends, S.matches, S.settings] = await Promise.all([
      api('GET', '/games'),
      api('GET', '/friends'),
      api('GET', '/matches'),
      api('GET', '/settings'),
    ]);
    render();
    scheduleNotifs();
  } catch (e) { toast('❌', 'Erro ao carregar dados', e.message, 'var(--danger)'); }
}

/* ════════════════════════════════════════
   RENDER
════════════════════════════════════════ */
function render() {
  renderMatches();
  renderFriends();
  renderGames();
  updateCounts();
  if (S.settings.discord_webhook) document.getElementById('s-webhook').value = S.settings.discord_webhook;
}

/* ── Matches ─────────────────────────── */
function renderMatches() {
  const now = Date.now();
  let list = [...S.matches];

  if (S.filter === 'upcoming') list = list.filter(m => +new Date(m.scheduled_at) > now);
  else if (S.filter === 'today') list = list.filter(m => new Date(m.scheduled_at).toDateString() === new Date().toDateString());
  else if (S.filter === 'past') list = list.filter(m => +new Date(m.scheduled_at) < now);

  list.sort((a, b) => {
    const at = +new Date(a.scheduled_at), bt = +new Date(b.scheduled_at);
    const ap = at < now, bp = bt < now;
    if (ap && !bp) return 1;
    if (!ap && bp) return -1;
    return ap ? bt - at : at - bt;
  });

  const upcoming = S.matches.filter(m => +new Date(m.scheduled_at) > now).length;
  document.getElementById('matches-sub').textContent = upcoming
    ? `${upcoming} partida${upcoming>1?'s':''} agendada${upcoming>1?'s':''}`
    : 'Nenhuma partida futura agendada';

  const grid = document.getElementById('matches-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🕹️</div><h3>Nenhuma partida aqui</h3><p>Crie uma nova ou mude o filtro</p></div>`;
    return;
  }

  grid.innerHTML = list.map((m, i) => matchCard(m, i)).join('');
}

function matchCard(m, i) {
  const now  = Date.now();
  const when = +new Date(m.scheduled_at);
  const diff = when - now;
  const dur  = (m.duration_minutes || 60) * 60_000;
  const past = diff < -dur;
  const live = diff <= 0 && diff > -dur;
  const soon = diff > 0 && diff < 1_800_000;

  const cdHtml = live
    ? `<span class="cd-badge cd-live">🟢 AO VIVO</span>`
    : past
    ? `<span class="cd-badge cd-past">Finalizado</span>`
    : soon
    ? `<span class="cd-badge cd-soon" id="cd-${m.id}">⚡ ${fmtCd(diff)}</span>`
    : `<span class="cd-badge cd-future" id="cd-${m.id}">${fmtCd(diff)}</span>`;

  const avatars = (m.friends || []).slice(0, 5).map(f =>
    `<div class="avatar" style="background:${f.avatar_color||'#5b8dee'}" title="@${f.nickname}">${f.nickname[0].toUpperCase()}</div>`
  ).join('') + (m.friends?.length > 5 ? `<div class="avatar avatar-more">+${m.friends.length-5}</div>` : '');

  const c = m.game_color || '#5b8dee';
  const bg = m.game_bg_color || '#0c1018';
  const stripeClass = live ? 'live' : past ? 'past' : '';
  const imgUrl = (m.game_image_url || '').trim();

  // encode for safe inline JSON
  const safeId = parseInt(m.id);

  // Banner background: image (with dark overlay) or solid bg_color
  const bannerBg = imgUrl
    ? `url('${imgUrl}') center/cover no-repeat`
    : bg;

  return `
  <div class="match-card" style="--c:${c}" data-mid="${safeId}">
    <div class="mc-stripe ${stripeClass}" style="background:${live?'linear-gradient(90deg,var(--neon2),var(--neon))':past?'var(--s3)':c}"></div>
    <div class="mc-banner" style="background:${bannerBg}">
      ${imgUrl ? `<div class="mc-banner-img-overlay"></div>` : ''}
      <div class="mc-banner-glow"></div>
      <div class="mc-banner-fade"></div>
      ${!imgUrl ? `<div class="mc-banner-icon">${m.game_emoji||'🎮'}</div>` : ''}
    </div>
    <div class="mc-body">
      <div class="mc-top">
        <span class="game-pill" style="--c:${c}">${m.game_emoji||'🎮'} ${m.game_name||'N/A'}</span>
        <div class="badges">
          ${m.platform ? `<span class="badge">${m.platform.replace(/^[^ ]+ /,'')}</span>` : ''}
          ${m.max_players ? `<span class="badge">👥 ${m.max_players}</span>` : ''}
          <span class="badge">⏱️ ${fmtDuration(m.duration_minutes||60)}</span>
        </div>
      </div>
      <div class="mc-title">${esc(m.title)}</div>
      <div class="mc-time">
        <span>📅</span>
        <span class="tval">${fmtDate(m.scheduled_at)}</span>
        <span>às</span>
        <span class="tval">${fmtTime(m.scheduled_at)}</span>
        ${cdHtml}
      </div>
      ${m.description ? `<div class="mc-desc">${esc(m.description)}</div>` : ''}
      ${m.friends?.length ? `
        <div class="friends-row">
          ${avatars}
          <span class="friends-label">${m.friends.length} convidado${m.friends.length>1?'s':''}</span>
        </div>` : ''}
      <div class="mc-actions">
        <button class="btn btn-ghost btn-sm" onclick="viewMatch(${safeId})">👁️ Ver</button>
        <button class="btn btn-ghost btn-sm" onclick="editMatch(${safeId})">✏️ Editar</button>
        ${!past ? `<button class="btn btn-ghost btn-sm" onclick="triggerNotify(${safeId})">🔔 Notificar</button>` : ''}
        <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="deleteMatch(${safeId})">🗑️</button>
      </div>
    </div>
  </div>`;
}

/* ── Friends ─────────────────────────── */
function renderFriends() {
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

/* ── Games ───────────────────────────── */
function renderGames() {
  const grid = document.getElementById('games-grid');
  if (!S.games.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🎮</div><h3>Nenhum jogo cadastrado</h3><p>Clique em "+ Novo Jogo"</p></div>`;
    return;
  }
  grid.innerHTML = S.games.map((g, i) => {
    const imgUrl = (g.image_url || '').trim();
    const bgStyle = imgUrl
      ? `background:url('${imgUrl}') center/cover no-repeat`
      : `background:${g.bg_color||'#0c1018'}`;
    const overlays = imgUrl
      ? `<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3) 0%,rgba(0,0,0,.72) 100%)"></div>`
      : `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,${g.color||'#5b8dee'}22 0%,transparent 70%)"></div><div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,${g.bg_color||'#0c1018'} 100%)"></div>`;
    return `
  <div class="game-card" style="animation-delay:${i*.05}s">
    <div class="game-card-banner" style="${bgStyle}">
      ${overlays}
      ${!imgUrl ? `<span style="position:relative;z-index:1;font-size:2rem;filter:drop-shadow(0 2px 8px rgba(0,0,0,.8))">${g.emoji||'🎮'}</span>` : ''}
    </div>
    <div class="game-card-body">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="width:10px;height:10px;border-radius:50%;background:${g.color||'#5b8dee'};box-shadow:0 0 6px ${g.color||'#5b8dee'};flex-shrink:0"></span>
        <div class="game-card-name">${esc(g.name)}</div>
      </div>
      ${g.description ? `<div class="game-card-desc">${esc(g.description)}</div>` : ''}
      <div class="game-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="viewGame(${g.id})">👁️ Ver</button>
        <button class="btn btn-ghost btn-sm" onclick="editGame(${g.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="deleteGame(${g.id})">🗑️</button>
      </div>
    </div>
  </div>`;
  }).join('');
}

function updateCounts() {
  document.getElementById('cnt-matches').textContent = S.matches.filter(m => +new Date(m.scheduled_at) > Date.now()).length;
  document.getElementById('cnt-friends').textContent = S.friends.length;
  document.getElementById('cnt-games').textContent   = S.games.length;
}

/* ════════════════════════════════════════
   MATCH MODAL
════════════════════════════════════════ */

// Applies or removes view-only mode on a modal (disables all inputs, hides submit)
function applyViewMode(modalId, submitBtnId, titleEl, titleText, viewMode) {
  const modal = document.getElementById(modalId);
  const inputs = modal.querySelectorAll('input, select, textarea, button:not(.btn-ghost[onclick*="closeModal"]):not(.t-close)');
  if (viewMode) {
    modal.querySelectorAll('.fi,.fs,.fta').forEach(el => { el.disabled = true; el.style.opacity = '.6'; el.style.cursor = 'not-allowed'; });
    modal.querySelectorAll('.notify-opt,.channel-chip,.fp-item,.gp-item,.swatch').forEach(el => { el.style.pointerEvents = 'none'; el.style.opacity = '.55'; });
    const btn = document.getElementById(submitBtnId);
    btn.style.display = 'none';
    document.getElementById(titleEl).innerHTML = titleText;
  } else {
    modal.querySelectorAll('.fi,.fs,.fta').forEach(el => { el.disabled = false; el.style.opacity = ''; el.style.cursor = ''; });
    modal.querySelectorAll('.notify-opt,.channel-chip,.fp-item,.gp-item,.swatch').forEach(el => { el.style.pointerEvents = ''; el.style.opacity = ''; });
    const btn = document.getElementById(submitBtnId);
    btn.style.display = '';
  }
}

function openMatchModal(matchId = null, viewMode = false) {
  S.editMatchId       = matchId;
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

  // Build friends picker
  buildFriendsPicker();

  // Reset form
  ['m-title','m-desc','m-maxp'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-platform').value = '';
  document.getElementById('m-duration').value = '60';

  // Default date/time (+1h)
  const d = new Date(Date.now() + 3_600_000);
  document.getElementById('m-date').value = d.toISOString().split('T')[0];
  document.getElementById('m-time').value = d.toTimeString().slice(0,5);

  // Reset notify
  document.querySelectorAll('.notify-opt').forEach(b => b.classList.toggle('sel', b.dataset.m === '15'));

  // Fill if editing
  if (matchId) {
    const m = S.matches.find(x => x.id === matchId);
    if (m) {
      selectGame(m.game_id);
      document.getElementById('m-title').value = m.title || '';
      document.getElementById('m-desc').value  = m.description || '';
      document.getElementById('m-platform').value = m.platform || '';
      document.getElementById('m-maxp').value  = m.max_players || '';
      const dt = new Date(m.scheduled_at);
      document.getElementById('m-date').value = dt.toISOString().split('T')[0];
      document.getElementById('m-time').value = dt.toTimeString().slice(0,5);
      S.notifyBefore = m.notify_before ?? 15;
      S.durationMinutes = m.duration_minutes || 60;
      // Bug 4: fallback to '60' if value not in select options
      const durSel = document.getElementById('m-duration');
      durSel.value = String(S.durationMinutes);
      if (!durSel.value) durSel.value = '60';
      document.querySelectorAll('.notify-opt').forEach(b => b.classList.toggle('sel', +b.dataset.m === S.notifyBefore));
      // Restore notify channels
      try {
        const ch = typeof m.notify_channels === 'string' ? JSON.parse(m.notify_channels) : (m.notify_channels || ['discord_dm']);
        S.selectedNotifyChannels = new Set(ch);
      } catch { S.selectedNotifyChannels = new Set(['discord_dm']); }
      (m.friends || []).forEach(f => S.selectedFriendIds.add(f.id));
      buildFriendsPicker();
    }
  }

  document.getElementById('match-modal-title').innerHTML = matchId ? '✏️ Editar Partida' : '🎯 Nova Partida';
  document.getElementById('match-submit-btn').textContent = matchId ? '💾 Salvar Alterações' : '🚀 Agendar Partida';
  document.getElementById('match-submit-btn').style.display = '';
  // Update channel chips UI
  document.querySelectorAll('.channel-chip').forEach(b => b.classList.toggle('sel', S.selectedNotifyChannels.has(b.dataset.ch)));
  openModal('ov-match');
  if (viewMode) applyViewMode('modal-match', 'match-submit-btn', 'match-modal-title', '👁️ Visualizar Partida', true);
}

function buildFriendsPicker() {
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

function selectGame(gameId) {
  S.selectedGameId = gameId;
  document.querySelectorAll('.gp-item').forEach(el => el.classList.toggle('sel', +el.dataset.gid === gameId));
}

function toggleFriend(fid) {
  if (S.selectedFriendIds.has(fid)) S.selectedFriendIds.delete(fid);
  else S.selectedFriendIds.add(fid);
  buildFriendsPicker();
}

async function submitMatch() {
  if (!S.selectedGameId) {
    shake(document.getElementById('match-game-picker'));
    return toast('⚠️', 'Selecione um jogo', '', 'var(--warn)');
  }
  const dateV = document.getElementById('m-date').value;
  const timeV = document.getElementById('m-time').value;
  if (!dateV || !timeV) return toast('⚠️', 'Preencha data e horário', '', 'var(--warn)');

  const game = S.games.find(g => g.id === S.selectedGameId);
  const scheduledAt = new Date(`${dateV}T${timeV}`).toISOString();
  const title = document.getElementById('m-title').value.trim()
    || `${game?.emoji||'🎮'} ${game?.name||'Partida'} — ${fmtDate(scheduledAt)}`;

  const body = {
    game_id:      S.selectedGameId,
    title,
    scheduled_at: scheduledAt,
    platform:     document.getElementById('m-platform').value,
    max_players:  parseInt(document.getElementById('m-maxp').value) || 0,
    description:  document.getElementById('m-desc').value.trim(),
    friend_ids:   [...S.selectedFriendIds],
    notify_before: S.notifyBefore,
    duration_minutes: parseInt(document.getElementById('m-duration').value) || 60,
    notify_channels: [...S.selectedNotifyChannels],
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

function editMatch(id) { openMatchModal(id); }
function viewMatch(id) { openMatchModal(id, true); }

async function deleteMatch(id) {
  const m = S.matches.find(x => x.id === id);
  if (!confirm(`Excluir "${m?.title}"?`)) return;
  await api('DELETE', `/matches/${id}`);
  S.matches = S.matches.filter(x => x.id !== id);
  renderMatches(); updateCounts();
  toast('🗑️', 'Partida removida', '', 'var(--danger)');
}

async function triggerNotify(id) {
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

/* ════════════════════════════════════════
   FRIEND MODAL
════════════════════════════════════════ */
function buildColorSwatches() {
  document.getElementById('friend-color-swatches').innerHTML = COLORS.map(c => `
    <div class="swatch ${S.friendColor===c?'sel':''}" style="background:${c}" onclick="pickFriendColor('${c}')"></div>`
  ).join('');
}

function pickFriendColor(c) {
  S.friendColor = c;
  buildColorSwatches();
}

function openFriendModal(friendId = null, viewMode = false) {
  S.editFriendId = viewMode ? null : friendId;
  S.friendColor  = '#5b8dee';

  ['f-nick','f-name','f-discord-id','f-webhook','f-email','f-notes'].forEach(id => document.getElementById(id).value = '');

  if (friendId) {
    const f = S.friends.find(x => x.id === friendId);
    if (f) {
      document.getElementById('f-nick').value        = f.nickname || '';
      document.getElementById('f-name').value        = f.display_name || '';
      document.getElementById('f-discord-id').value  = f.discord_id || '';
      document.getElementById('f-webhook').value     = f.discord_webhook || '';
      document.getElementById('f-email').value       = f.email || '';
      document.getElementById('f-notes').value       = f.notes || '';
      S.friendColor = f.avatar_color || '#5b8dee';
    }
  }

  buildColorSwatches();
  document.getElementById('friend-modal-title').innerHTML = friendId ? '✏️ Editar Amigo' : '👤 Novo Amigo';
  document.getElementById('friend-submit-btn').textContent = friendId ? '💾 Salvar' : '✅ Salvar Amigo';
  document.getElementById('friend-submit-btn').style.display = '';
  openModal('ov-friend');
  if (viewMode) applyViewMode('ov-friend', 'friend-submit-btn', 'friend-modal-title', '👁️ Visualizar Amigo', true);
}

function editFriend(id) { openFriendModal(id); }
function viewFriend(id) { openFriendModal(id, true); }

async function submitFriend() {
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

async function deleteFriend(id) {
  const f = S.friends.find(x => x.id === id);
  if (!confirm(`Excluir "@${f?.nickname}"?`)) return;
  await api('DELETE', `/friends/${id}`);
  S.friends = S.friends.filter(x => x.id !== id);
  renderFriends(); updateCounts();
  toast('🗑️', 'Amigo removido', '', 'var(--danger)');
}

/* ════════════════════════════════════════
   GAME MODAL
════════════════════════════════════════ */
function openGameModal(gameId = null, viewMode = false) {
  S.editGameId = gameId;
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

  document.getElementById('game-modal-title').innerHTML = gameId ? '✏️ Editar Jogo' : '🎮 Novo Jogo';
  document.getElementById('game-submit-btn').textContent = gameId ? '💾 Salvar' : '✅ Salvar Jogo';
  document.getElementById('game-submit-btn').style.display = '';
  openModal('ov-game');
  if (viewMode) applyViewMode('ov-game', 'game-submit-btn', 'game-modal-title', '👁️ Visualizar Jogo', true);
}

function editGame(id) { openGameModal(id); }
function viewGame(id) { openGameModal(id, true); }

async function submitGame() {
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

async function deleteGame(id) {
  const g = S.games.find(x => x.id === id);
  if (!confirm(`Excluir "${g?.name}"?`)) return;
  await api('DELETE', `/games/${id}`);
  S.games = S.games.filter(x => x.id !== id);
  renderGames(); updateCounts();
  toast('🗑️', 'Jogo removido', '', 'var(--danger)');
}

/* ════════════════════════════════════════
   SETTINGS
════════════════════════════════════════ */
async function saveSettings() {
  const webhook = document.getElementById('s-webhook').value.trim();
  await api('POST', '/settings', { discord_webhook: webhook });
  S.settings.discord_webhook = webhook;
  toast('✅', 'Configurações salvas!', '', 'var(--success)');
}

async function testWebhook() {
  const url = document.getElementById('s-webhook').value.trim();
  const el  = document.getElementById('discord-result');
  if (!url) { toast('⚠️', 'Insira a URL do webhook', '', 'var(--warn)'); return; }

  el.style.display = 'flex';
  el.className = 'discord-status info';
  el.innerHTML = '<div class="spinner"></div> Testando...';

  try {
    const r = await api('POST', '/test-notify', { webhook_url: url });
    if (r.success) {
      el.className = 'discord-status ok';
      el.innerHTML = '✅ Webhook funcionando! Verifique seu canal Discord.';
    } else {
      el.className = 'discord-status err';
      el.innerHTML = `❌ Falhou: ${r.error || 'resposta inválida'}`;
    }
  } catch (e) {
    el.className = 'discord-status err';
    el.innerHTML = `❌ Erro: ${e.message}`;
  }
}

/* ════════════════════════════════════════
   NOTIFICATIONS / TIMERS
════════════════════════════════════════ */
function scheduleNotifs() {
  const now = Date.now();
  for (const [id, t] of TIMER_MAP) clearTimeout(t);
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
          new Notification(`${game?.emoji||'🎮'} Game Schedule`, { body: `${m.title} começa em ${m.notify_before}min!` });
        }
      }, delay));
    }
  });
}

/* ════════════════════════════════════════
   CLOCK / COUNTDOWN
════════════════════════════════════════ */
const _reloadedMatches = new Set();

function startClock() {
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
        // AO VIVO — show remaining time
        el.className = 'cd-badge cd-live';
        el.textContent = '🟢 AO VIVO';
        return;
      }
      if (diff <= -dur) {
        // Bug 5: reload only once per finished match, not every second
        if (!_reloadedMatches.has(id)) {
          _reloadedMatches.add(id);
          loadAll().then(() => _reloadedMatches.delete(id));
        }
        return;
      }
      el.className = `cd-badge ${diff < 1_800_000 ? 'cd-soon' : 'cd-future'}`;
      el.textContent = (diff < 1_800_000 ? '⚡ ' : '') + fmtCd(diff);
    });
  }, 1000);
}

/* ════════════════════════════════════════
   MODAL HELPERS
════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
});

/* ════════════════════════════════════════
   TAB NAVIGATION
════════════════════════════════════════ */
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ════════════════════════════════════════
   FILTERS
════════════════════════════════════════ */
document.querySelectorAll('.filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.filter = btn.dataset.f;
    renderMatches();
  });
});

/* ════════════════════════════════════════
   NOTIFY OPTIONS
════════════════════════════════════════ */
document.querySelectorAll('.notify-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.notify-opt').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    S.notifyBefore = parseInt(btn.dataset.m);
  });
});

/* ════════════════════════════════════════
   CHANNEL CHIPS
════════════════════════════════════════ */
document.querySelectorAll('.channel-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const ch = btn.dataset.ch;
    if (S.selectedNotifyChannels.has(ch)) {
      S.selectedNotifyChannels.delete(ch);
    } else {
      S.selectedNotifyChannels.add(ch);
    }
    btn.classList.toggle('sel', S.selectedNotifyChannels.has(ch));
  });
});

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
function toast(icon, title, msg, color = 'var(--accent)', duration = 4500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = typeof color === 'string' && color.startsWith('#')
    ? color + '66' : color;
  el.innerHTML = `
    <div class="t-icon">${icon}</div>
    <div class="t-body">
      <div class="t-title" style="color:${color}">${title}</div>
      ${msg ? `<div class="t-msg">${msg}</div>` : ''}
    </div>
    <button class="t-close" onclick="rmToast(this.parentElement)">✕</button>`;
  document.getElementById('toasts').prepend(el);
  setTimeout(() => rmToast(el), duration);
  const all = document.querySelectorAll('.toast');
  if (all.length > 5) rmToast(all[all.length-1]);
}

function rmToast(el) {
  if (!el || el.classList.contains('out')) return;
  el.classList.add('out');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function fmtDate(iso) { return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }); }
function fmtTime(iso) { return new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }); }

function fmtCd(ms) {
  if (ms < 0) return 'Passou';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 48) return `${Math.ceil(h/24)}d`;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fmtDuration(min) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m}m` : `${h}h`;
  }
  return `${min}min`;
}

function blendToDark(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.round(r*.08)},${Math.round(g*.08)},${Math.round(b*.08)})`;
}

function shake(el) {
  el.animate([
    {transform:'translateX(-5px)'},{transform:'translateX(5px)'},
    {transform:'translateX(-3px)'},{transform:'translateX(3px)'},
    {transform:'translateX(0)'}
  ], { duration:280 });
}

/* ════════════════════════════════════════
   BOOT
════════════════════════════════════════ */
loadAll();
startClock();

if ('Notification' in window && Notification.permission === 'default') {
  setTimeout(() => Notification.requestPermission(), 2500);
}
