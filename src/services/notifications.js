/**
 * services/notifications.js
 * Envia convites/notificações via Discord Webhook.
 * Suporta dois modos: Discord DM (por amigo) e Servidor Discord (uma msg global).
 * Fallback: log no console.
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

  const durationMin = match.duration_minutes || 60;
  const durationStr = durationMin >= 60 ? `${Math.floor(durationMin/60)}h${durationMin%60 ? durationMin%60 + 'min' : ''}` : `${durationMin}min`;

  const embed = {
    title: `${match.game_emoji || '🎮'} ${match.title}`,
    description,
    color,
    fields: [
      { name: '🎮 Jogo',       value: match.game_name || 'N/A',   inline: true  },
      { name: '📅 Data',       value: dateStr,                     inline: true  },
      { name: '⏰ Horário',    value: timeStr,                     inline: true  },
      { name: '🖥️ Plataforma', value: match.platform || 'N/A',    inline: true  },
      { name: '⏱️ Duração',    value: durationStr,                 inline: true  },
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

// ── Build server embed (one message mentioning all friends) ───────────────────
function buildServerEmbed(match, friends, type = 'invite') {
  const dt = new Date(match.scheduled_at);
  const dateStr = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isReminder = type === 'reminder';
  const color = isReminder ? 0xf59e0b : parseInt((match.game_color || '#6366f1').replace('#', ''), 16);

  const mentions = friends.map(f => f.discord_id ? `<@${f.discord_id}>` : `**@${f.nickname}**`).join(' ');

  const description = isReminder
    ? `⏰ A partida começa em **${match.notify_before} minutos**! Hora de se preparar!`
    : `Nova partida agendada! Convocados: ${mentions}`;

  const durationMin = match.duration_minutes || 60;
  const durationStr = durationMin >= 60 ? `${Math.floor(durationMin/60)}h${durationMin%60 ? durationMin%60 + 'min' : ''}` : `${durationMin}min`;

  const embed = {
    title: `${match.game_emoji || '🎮'} ${match.title}`,
    description,
    color,
    fields: [
      { name: '🎮 Jogo',       value: match.game_name || 'N/A',   inline: true  },
      { name: '📅 Data',       value: dateStr,                     inline: true  },
      { name: '⏰ Horário',    value: timeStr,                     inline: true  },
      { name: '🖥️ Plataforma', value: match.platform || 'N/A',    inline: true  },
      { name: '⏱️ Duração',    value: durationStr,                 inline: true  },
      ...(match.max_players ? [{ name: '👥 Jogadores', value: `${match.max_players}`, inline: true }] : []),
      { name: '👥 Convocados', value: friends.map(f => `@${f.nickname}`).join(', '), inline: false },
      ...(match.description  ? [{ name: '📝 Obs', value: match.description, inline: false }] : []),
    ],
    footer: { text: 'GG Schedule • Agendador de Partidas' },
    timestamp: new Date().toISOString(),
  };

  const content = isReminder
    ? `${mentions} 🔔 Lembrete: partida começa em breve!`
    : `${mentions} 🎮 Nova partida agendada!`;

  return { content, embeds: [embed] };
}

// ── Notify a single friend (Discord DM) ──────────────────────────────────────
async function notifyFriend(match, friend, type = 'invite') {
  const result = { friendId: friend.id, nickname: friend.nickname, success: false, method: null, error: null };

  // Priority: friend's personal webhook > global webhook > none
  const webhookUrl = friend.discord_webhook?.trim() || (await getSetting('discord_webhook'))?.trim();

  if (webhookUrl) {
    try {
      const payload = buildMatchEmbed(match, friend, type);
      const res = await sendDiscordWebhook(webhookUrl, payload);
      result.success = res.status >= 200 && res.status < 300;
      result.method  = 'discord_dm';
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

// ── Notify via server channel (one message) ──────────────────────────────────
async function notifyServer(match, friends, type = 'invite') {
  const webhookUrl = (await getSetting('discord_webhook'))?.trim();

  if (!webhookUrl) {
    console.log(`[NOTIFY-SERVER] ${type.toUpperCase()} | ${match.title} | ${friends.length} amigos | Sem webhook global`);
    return friends.map(f => ({
      friendId: f.id, nickname: f.nickname, success: true, method: 'console_log', error: null
    }));
  }

  try {
    const payload = buildServerEmbed(match, friends, type);
    const res = await sendDiscordWebhook(webhookUrl, payload);
    const success = res.status >= 200 && res.status < 300;
    console.log(`[NOTIFY-SERVER] ${type} → Servidor Discord | ${success ? '✓' : '✗'} | ${friends.length} mencionados`);
    return friends.map(f => ({
      friendId: f.id, nickname: f.nickname, success, method: 'discord_server', error: success ? null : `HTTP ${res.status}`
    }));
  } catch (err) {
    return friends.map(f => ({
      friendId: f.id, nickname: f.nickname, success: false, method: 'discord_server', error: err.message
    }));
  }
}

// ── Notify all friends of a match (respecting channels) ──────────────────────
async function notifyMatchFriends(match, type = 'invite') {
  if (!match.friends?.length) return [];

  // Parse notify_channels from match
  let channels;
  try {
    channels = typeof match.notify_channels === 'string' ? JSON.parse(match.notify_channels) : (match.notify_channels || ['discord_dm']);
  } catch { channels = ['discord_dm']; }

  let allResults = [];

  // Discord DM — send individually to each friend
  if (channels.includes('discord_dm')) {
    const dmResults = await Promise.all(match.friends.map(f => notifyFriend(match, f, type)));
    allResults.push(...dmResults);
    console.log(`[NOTIFY] DM ${type} results:`, dmResults.map(r => `${r.nickname}:${r.success?'✓':'✗'}`).join(', '));
  }

  // Discord Server — send one message with all mentions
  if (channels.includes('discord_server')) {
    const serverResults = await notifyServer(match, match.friends, type);
    console.log(`[NOTIFY] Server ${type}: ${serverResults[0]?.success ? '✓' : '✗'} (${match.friends.length} mencionados)`);
    if (!channels.includes('discord_dm')) {
      // Only add server results if DM was not also sent (avoid duplicate entries per friend)
      allResults.push(...serverResults);
    } else {
      // Both channels: merge server success into existing DM results so markNotified fires
      serverResults.forEach(sr => {
        const existing = allResults.find(r => r.friendId === sr.friendId);
        if (existing) {
          // Mark as success if either channel succeeded
          existing.success = existing.success || sr.success;
        } else {
          allResults.push(sr);
        }
      });
    }
  }

  return allResults;
}

module.exports = { notifyFriend, notifyMatchFriends, notifyServer, buildMatchEmbed, buildServerEmbed };
