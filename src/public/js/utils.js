/* ── utils.js ──────────────────────────────
   Funções utilitárias puras (sem efeitos colaterais).
─────────────────────────────────────────── */

export function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

export function fmtCd(ms) {
  if (ms < 0) return 'Passou';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 48) return `${Math.ceil(h/24)}d`;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

export function fmtDuration(min) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m}m` : `${h}h`;
  }
  return `${min}min`;
}

export function blendToDark(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.round(r*.08)},${Math.round(g*.08)},${Math.round(b*.08)})`;
}

export function shake(el) {
  el.animate([
    {transform:'translateX(-5px)'},{transform:'translateX(5px)'},
    {transform:'translateX(-3px)'},{transform:'translateX(3px)'},
    {transform:'translateX(0)'}
  ], { duration:280 });
}
