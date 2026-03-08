# 🎮 GG Schedule v2.0

Agendador de partidas online com cadastro de jogos, amigos e notificações automáticas via Discord.

## 🚀 Início Rápido

```bash
node server.js
```

Acesse: **http://localhost:3000**

> Requisitos: Node.js 16+ e Python 3 (ambos já vêm no sistema — sem `npm install`!)

---

## 📁 Estrutura

```
gg-schedule/
├── server.js                  # Servidor HTTP principal
├── db/
│   ├── database.js            # Camada de dados (SQLite via Python)
│   └── scheduler.db           # Banco SQLite (criado automaticamente)
├── services/
│   ├── notifications.js       # Discord webhook + fallback
│   └── scheduler.js           # Timers automáticos de notificação
├── routes/
│   └── api.js                 # Rotas REST
└── public/
    └── index.html             # SPA completa (HTML/CSS/JS)
```

---

## ✨ Funcionalidades

### 🗓️ Partidas
- Criar, editar e excluir agendamentos
- Selecionar jogo do catálogo
- Escolher amigos cadastrados para convidar
- Configurar notificação antecipada (5, 15, 30, 60 min)
- Contagem regressiva ao vivo nos cards
- Filtros: Todos / Próximos / Hoje / Passados
- Envio automático de convites ao criar partida

### 👥 Amigos
- Cadastro com nickname, nome, Discord ID, webhook pessoal, e-mail e notas
- Cor de avatar personalizável
- Usado para seleção nos convites

### 🎮 Jogos
- Catálogo personalizado com emoji, nome, cor temática, URL de imagem e descrição
- 6 jogos pré-cadastrados (Valorant, LoL, CS2, Apex, Fortnite, Minecraft)

### 🔔 Notificações Discord
- **Webhook por amigo**: cada amigo pode ter seu webhook pessoal (canal/DM próprio)
- **Webhook global**: fallback para quem não tem webhook configurado
- **Convite automático**: ao criar partida, todos os amigos selecionados recebem embed rico no Discord
- **Lembrete automático**: timer dispara X minutos antes da partida
- **Botão manual "Notificar"**: no card de cada partida para reenvio
- Sem Discord configurado? O convite é logado no console.

---

## 🔔 Configurar Discord

### Criar um Webhook

1. No Discord, vá em **Configurações do Servidor → Integrações → Webhooks**
2. Clique em **Novo Webhook**
3. Escolha o canal e copie a URL
4. Cole em **Configurações → Webhook Global** (ou no campo do amigo)

### Por amigo (recomendado)
Cada amigo pode ter seu próprio webhook — assim a notificação vai direto para o canal deles.

---

## 🛠️ API REST

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/games | Lista jogos |
| POST | /api/games | Cria jogo |
| PUT | /api/games/:id | Edita jogo |
| DELETE | /api/games/:id | Remove jogo |
| GET | /api/friends | Lista amigos |
| POST | /api/friends | Cria amigo |
| PUT | /api/friends/:id | Edita amigo |
| DELETE | /api/friends/:id | Remove amigo |
| GET | /api/matches | Lista partidas |
| POST | /api/matches | Cria partida (envia convites) |
| PUT | /api/matches/:id | Edita partida |
| DELETE | /api/matches/:id | Remove partida |
| POST | /api/matches/:id/notify | Envia notificação manual |
| GET | /api/settings | Configurações |
| POST | /api/settings | Salva configurações |
| POST | /api/test-notify | Testa webhook |
