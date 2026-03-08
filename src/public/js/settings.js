/* ── settings.js ───────────────────────────
   Salvar configurações e testar webhook Discord.
─────────────────────────────────────────── */

import { S }     from './state.js';
import { api }   from './api.js';
import { toast } from './toast.js';

export async function saveSettings() {
  const webhook = document.getElementById('s-webhook').value.trim();
  await api('POST', '/settings', { discord_webhook: webhook });
  S.settings.discord_webhook = webhook;
  toast('✅', 'Configurações salvas!', '', 'var(--success)');
}

export async function testWebhook() {
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
