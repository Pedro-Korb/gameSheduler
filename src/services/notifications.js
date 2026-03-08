/**
 * services/notifications.js
 * Envia convites/notificações via Discord Webhook.
 * Fallback: log no console + simula resposta amigável.
 */

const https = require('https');
const http  = require('http');
const { getSetting } = require('../db/database');

// ── Send via Discord Webhook ──────────────────────────────────────────────────
function sendDiscordWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url  = new URL(webhookUrl);
    const lib  = url.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Build Discord embed ───────────────────────────────────────────────────────
function buildMatchEmbed(match, friend, type = 'invite') {
  const dt = new Date(match.scheduled_at);
  const dateStr = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isReminder = type === 'reminder';
  const color = isReminder ? 0xf59e0b : parseInt((match.game_color || '#6366f1').replace('#', ''), 16);

  const description = isReminder
    ? `⏰ A partida começa em **${match.notify_before} minutos**! Hora de se preparar!`
    : `Você foi convidado por **${match.owner || 'seu amigo'}** para uma partida!`;

  const embed = {
    title: `${match.game_emoji || '🎮'} ${match.title}`,
    description,
    color,
    fields: [
      { name: '🎮 Jogo',       value: match.game_name || 'N/A',   inline: true  },
      { name: '📅 Data',       value: dateStr,                     inline: true  },
      { name: '⏰ Horário',    value: timeStr,                     inline: true  },
      { name: '🖥️ Plataforma', value: match.platform || 'N/A',    inline: true  },
      ...(match.max_players ? [{ name: '👥 Jogadores', value: `${match.max_players}`, inline: true }] : []),
      ...(match.description  ? [{ name: '📝 Obs', value: match.description, inline: false }] : []),
    ],
    footer: { text: 'GG Schedule • Agendador de Partidas' },
    timestamp: new Date().toISOString(),
  };

  const mention = friend?.discord_id ? `<@${friend.discord_id}> ` : (friend ? `**@${friend.nickname}** ` : '');
  const content = isReminder
    ? `${mention}🔔 Lembrete: sua partida começa em breve!`
    : `${mention}🎮 Você foi convidado para uma partida!`;

  return { content, embeds: [embed] };
}

// ── Notify a single friend ────────────────────────────────────────────────────
async function notifyFriend(match, friend, type = 'invite') {
  const result = { friendId: friend.id, nickname: friend.nickname, success: false, method: null, error: null };

  // Priority: friend's personal webhook > global webhook > none
  const webhookUrl = friend.discord_webhook?.trim() || (await getSetting('discord_webhook'))?.trim();

  if (webhookUrl) {
    try {
      const payload = buildMatchEmbed(match, friend, type);
      const res = await sendDiscordWebhook(webhookUrl, payload);
      result.success = res.status >= 200 && res.status < 300;
      result.method  = 'discord_webhook';
      if (!result.success) result.error = `HTTP ${res.status}`;
    } catch (err) {
      result.error = err.message;
    }
  } else {
    // No webhook configured — log & simulate
    console.log(`[NOTIFY] ${type.toUpperCase()} → @${friend.nickname} | ${match.title} | ${match.scheduled_at}`);
    result.success = true;
    result.method  = 'console_log';
  }

  return result;
}

// ── Notify all friends of a match ─────────────────────────────────────────────
async function notifyMatchFriends(match, type = 'invite') {
  if (!match.friends?.length) return [];
  const results = await Promise.all(match.friends.map(f => notifyFriend(match, f, type)));
  console.log(`[NOTIFY] ${type} results:`, results.map(r => `${r.nickname}:${r.success?'✓':'✗'}`).join(', '));
  return results;
}

module.exports = { notifyFriend, notifyMatchFriends, buildMatchEmbed };
