# CRM MCP Server & Telegram Bot

Ce dossier contient:
- **MCP Server**: Serveur MCP pour exposer les fonctionnalités du CRM à Claude Code
- **Telegram Bot**: Bot Telegram pour interagir avec le CRM

## Configuration

### Variables d'environnement

Ajouter dans `.env`:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=votre_token_bot
TELEGRAM_ALLOWED_USERS=123456789,987654321  # IDs Telegram autorisés

# CRM defaults
CRM_TENANT_ID=1
CRM_USER_ID=1
```

### Créer le bot Telegram

1. Parler à [@BotFather](https://t.me/BotFather) sur Telegram
2. `/newbot` et suivre les instructions
3. Copier le token dans `TELEGRAM_BOT_TOKEN`

### Configurer le webhook

Après déploiement:

```bash
curl "https://votre-domaine.com/api/telegram/setup?action=set&url=https://votre-domaine.com/api/telegram/webhook"
```

## Utilisation

### MCP Server (pour Claude Code)

Ajouter dans `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "crm": {
      "command": "npx",
      "args": ["tsx", "/chemin/vers/CRM-v2/mcp/server.ts"],
      "env": {
        "DATABASE_URL": "votre_database_url"
      }
    }
  }
}
```

### Bot Telegram (mode développement)

```bash
cd mcp
npm run dev
```

### Bot Telegram (production via webhook)

Le webhook est déjà configuré dans `/api/telegram/webhook`.
Il suffit de définir `TELEGRAM_BOT_TOKEN` et d'appeler `/api/telegram/setup?action=set&url=...`

## Commandes Telegram

### Clients
- `/client <nom>` - Créer un client
- `/clients` - Lister les clients
- `/chercher <terme>` - Rechercher

### Notes
- `/note <contenu>` - Créer une note
- `/note @Client contenu` - Note liée à un client
- `/note contenu #demain` - Note avec rappel
- `/notes` - Lister les notes
- `/rappels` - Voir les rappels

### Tâches
- `/tache <titre>` - Créer une tâche
- `/tache @Client titre #lundi !urgent` - Tâche avec client, date, priorité
- `/taches` - Lister les tâches
- `/fait <id>` - Marquer terminée

### Devis
- `/devis` - Assistant création devis
- `/devis_liste` - Lister les devis

### Stats
- `/stats` - Stats du mois
- `/stats today|week|year` - Par période

## Outils MCP

Le serveur MCP expose les outils suivants:

### Clients
- `create_client` - Créer un client
- `search_clients` - Rechercher
- `get_client` - Détails d'un client
- `list_clients` - Lister

### Notes
- `create_note` - Créer une note (avec client, rappel, tags)
- `search_notes` - Rechercher
- `list_notes` - Lister
- `get_reminders` - Rappels à venir

### Tâches
- `create_task` - Créer une tâche
- `create_subtask` - Créer une sous-tâche
- `list_tasks` - Lister
- `complete_task` - Terminer
- `complete_subtask` - Terminer sous-tâche

### Devis
- `create_quote` - Créer un devis
- `list_quotes` - Lister
- `search_quotes` - Rechercher

### Stats
- `get_stats` - Statistiques par période
