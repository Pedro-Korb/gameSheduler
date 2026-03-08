# 🎮 GG Schedule — Agendador de Partidas Online

Interface web para agendar partidas de jogos online, convidar amigos e receber notificações.

## 🚀 Como rodar

### Requisitos
- Node.js 16+

### Instalação e execução

```bash
node server.js
```

Acesse: **http://localhost:3000**

## 📁 Estrutura

```
game-scheduler/
├── server.js          # Servidor HTTP com API REST
├── db/
│   └── data.json      # Dados persistidos (criado automaticamente)
└── public/
    └── index.html     # Interface completa
```

## 🎮 Funcionalidades

- **12 jogos pré-cadastrados**: Valorant, LoL, CS2, Apex, Fortnite, Warzone, Minecraft, OW2, FC 25, R6 Siege, Deadlock e outros
- **Agendamento completo**: jogo, data, horário, plataforma, máximo de jogadores
- **Convidar amigos**: tags de nicknames com Enter/vírgula
- **Contagem regressiva** ao vivo nos cards
- **Notificações automáticas**: avisa X minutos antes da partida
- **Toast de notificação**: simula envio para cada amigo convidado
- **Filtros**: Todos, Próximos, Hoje, Passados
- **Persistência**: dados salvos em `db/data.json`

## 🔔 Notificações

O app solicita permissão de notificação do navegador ao carregar. Se aceito, envia notificações nativas no desktop quando uma partida está prestes a começar.

Use o botão "🔔 Notificar" no card para simular o envio de notificações para os amigos convidados.
