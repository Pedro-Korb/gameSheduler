/* ── render/matches.js ─────────────────────
   Renderiza a grade de partidas e os cards individuais.
─────────────────────────────────────────── */

import { S } from '../state.js';
import { esc, fmtDate, fmtTime, fmtCd, fmtDuration } from '../utils.js';

export function renderMatches() {
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

export function matchCard(m, i) {
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
  const safeId = parseInt(m.id);
  const bannerBg = imgUrl ? `url('${imgUrl}') center/cover no-repeat` : bg;

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
