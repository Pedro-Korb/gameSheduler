# 🎮 GG Schedule v2.0

Agendador de partidas online com cadastro de jogos, amigos e notificações automáticas via Discord.

## 🚀 Início Rápido

```bash
node src/server.js
```

> Requisitos: Node.js 16+ e Python no PATH

---

## 📁 Estrutura

```
src/
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
    ├── index.html             # HTML da SPA
    ├── css/                   # Estilos (base, components, modals, animations)
    └── js/
        ├── app.js             # Entry point (ES Module); expõe handlers no window.*
        ├── api.js             # Fetch wrappers e loadAll()
        ├── state.js           # Estado em memória (games, friends, matches)
        ├── events.js          # Listeners globais (tabs, teclado)
        ├── notifications.js   # Web Notifications API + clock
        ├── settings.js        # Painel de configurações
        ├── toast.js           # Toasts de feedback
        ├── render/            # Renderização por entidade (games, friends, matches)
        └── modals/            # Modais por entidade + shared.js
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
- **Canais configuráveis por partida**: escolha entre *Discord DM* (webhook individual por amigo) e/ou *Canal de servidor* (uma mensagem global mencionando todos)
- **Webhook por amigo**: cada amigo pode ter seu webhook pessoal, usado com prioridade no canal DM
- **Webhook global**: fallback para DM sem webhook próprio; único canal usado no modo servidor
- **Convite automático**: ao criar partida, todos os amigos selecionados recebem embed rico no Discord
- **Lembrete automático**: timer dispara X minutos antes da partida (só cobre as próximas 24h; rescan a cada 30 min)
- **Botão manual "Notificar"**: no card de cada partida para reenvio
- Sem Discord configurado? O convite é logado no console.

### 🌐 Notificações do navegador
- Solicita permissão de *Web Notifications* automaticamente ao abrir
- Relógio ao vivo no header com atualização periódica dos dados em background

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
