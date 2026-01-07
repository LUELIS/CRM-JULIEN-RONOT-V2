# API Support Externe - Documentation

Cette API permet à un prestataire externe de gérer les tickets de support du CRM.

## Base URL

```
https://votre-domaine.com/api/external/support
```

## Authentification

Toutes les requêtes doivent inclure un header `Authorization` avec un token Bearer :

```
Authorization: Bearer crm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Obtenir une clé API

Les clés API sont créées par un administrateur dans **Paramètres > Clés API**.

⚠️ **Important** : Le token complet n'est affiché qu'une seule fois à la création. Copiez-le immédiatement.

---

## Endpoints

### Tickets

#### Lister les tickets

```http
GET /api/external/support
```

**Paramètres de requête** (optionnels) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | string | Recherche dans le sujet et le numéro de ticket |
| `status` | string | Filtrer par statut : `new`, `open`, `pending`, `resolved`, `closed` |
| `priority` | string | Filtrer par priorité : `low`, `normal`, `high`, `urgent` |
| `clientId` | string | ID du client |
| `since` | string | Date ISO - tickets créés après cette date |
| `page` | number | Page (défaut: 1) |
| `limit` | number | Nombre par page (défaut: 50, max: 100) |

**Exemple de réponse** :

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "123",
        "ticketNumber": "TKT-20250107-0001",
        "subject": "Problème de connexion",
        "senderEmail": "client@example.com",
        "senderName": "Jean Dupont",
        "status": "open",
        "priority": "normal",
        "tags": ["technique", "urgent"],
        "responseCount": 2,
        "createdAt": "2025-01-07T10:30:00.000Z",
        "lastActivityAt": "2025-01-07T14:45:00.000Z",
        "client": {
          "id": "456",
          "companyName": "Entreprise ABC",
          "email": "contact@abc.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

---

#### Créer un ticket

```http
POST /api/external/support
```

**Corps de la requête** :

```json
{
  "subject": "Problème de facturation",
  "content": "Bonjour, je n'arrive pas à accéder à mes factures...",
  "senderEmail": "client@example.com",
  "senderName": "Marie Martin",
  "priority": "normal",
  "tags": ["facturation"],
  "clientId": "456"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `subject` | string | ✅ | Sujet du ticket |
| `content` | string | ✅ | Message initial |
| `senderEmail` | string | ✅ | Email de l'expéditeur |
| `senderName` | string | ❌ | Nom de l'expéditeur |
| `priority` | string | ❌ | `low`, `normal` (défaut), `high`, `urgent` |
| `tags` | string[] | ❌ | Tags du ticket |
| `clientId` | string | ❌ | ID du client existant |

**Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "789",
    "ticketNumber": "TKT-20250107-0002",
    "subject": "Problème de facturation",
    "status": "new",
    "priority": "normal",
    "createdAt": "2025-01-07T15:00:00.000Z"
  }
}
```

---

#### Obtenir un ticket

```http
GET /api/external/support/:id
```

Le paramètre `:id` peut être :
- L'ID numérique du ticket : `123`
- Le numéro de ticket : `TKT-20250107-0001`

**Exemple de réponse** :

```json
{
  "success": true,
  "data": {
    "id": "123",
    "ticketNumber": "TKT-20250107-0001",
    "subject": "Problème de connexion",
    "senderEmail": "client@example.com",
    "senderName": "Jean Dupont",
    "status": "open",
    "priority": "normal",
    "tags": ["technique"],
    "responseCount": 2,
    "firstResponseAt": "2025-01-07T11:00:00.000Z",
    "resolvedAt": null,
    "closedAt": null,
    "lastActivityAt": "2025-01-07T14:45:00.000Z",
    "createdAt": "2025-01-07T10:30:00.000Z",
    "client": {
      "id": "456",
      "companyName": "Entreprise ABC",
      "email": "contact@abc.com",
      "phone": "0123456789",
      "address": "123 rue Example",
      "city": "Paris",
      "postalCode": "75001"
    },
    "assignee": {
      "id": "1",
      "name": "Support Tech",
      "email": "support@crm.com"
    },
    "messages": [
      {
        "id": "1001",
        "type": "email_in",
        "content": "Bonjour, je n'arrive pas à me connecter...",
        "fromEmail": "client@example.com",
        "fromName": "Jean Dupont",
        "isInternal": false,
        "createdAt": "2025-01-07T10:30:00.000Z",
        "author": null,
        "attachments": []
      },
      {
        "id": "1002",
        "type": "email_out",
        "content": "Bonjour, avez-vous essayé de réinitialiser votre mot de passe ?",
        "fromEmail": "support@crm.com",
        "fromName": "Support Tech",
        "isInternal": false,
        "createdAt": "2025-01-07T11:00:00.000Z",
        "author": {
          "id": "1",
          "name": "Support Tech",
          "email": "support@crm.com"
        },
        "attachments": []
      }
    ]
  }
}
```

---

#### Mettre à jour un ticket

```http
PATCH /api/external/support/:id
```

**Corps de la requête** :

```json
{
  "status": "resolved",
  "priority": "high",
  "tags": ["technique", "résolu"],
  "subject": "Problème de connexion (Résolu)"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `status` | string | `new`, `open`, `pending`, `resolved`, `closed` |
| `priority` | string | `low`, `normal`, `high`, `urgent` |
| `tags` | string[] | Nouveaux tags (remplace les existants) |
| `subject` | string | Nouveau sujet |

**Réponse** :

```json
{
  "success": true,
  "data": {
    "id": "123",
    "ticketNumber": "TKT-20250107-0001",
    "subject": "Problème de connexion (Résolu)",
    "status": "resolved",
    "priority": "high",
    "tags": ["technique", "résolu"],
    "updatedAt": "2025-01-07T16:00:00.000Z"
  }
}
```

---

### Messages

#### Lister les messages d'un ticket

```http
GET /api/external/support/:id/messages
```

**Paramètres de requête** (optionnels) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `includeInternal` | boolean | Inclure les notes internes (défaut: `false`) |

**Réponse** :

```json
{
  "success": true,
  "data": {
    "ticketId": "123",
    "ticketNumber": "TKT-20250107-0001",
    "messages": [
      {
        "id": "1001",
        "type": "email_in",
        "content": "Bonjour, je n'arrive pas à me connecter...",
        "fromEmail": "client@example.com",
        "fromName": "Jean Dupont",
        "toEmail": null,
        "isInternal": false,
        "createdAt": "2025-01-07T10:30:00.000Z",
        "author": null,
        "attachments": []
      }
    ]
  }
}
```

---

#### Ajouter un message/réponse

```http
POST /api/external/support/:id/messages
```

**Corps de la requête** :

```json
{
  "type": "reply",
  "content": "Bonjour, votre problème a été résolu. Pouvez-vous réessayer ?",
  "fromEmail": "support@crm.com",
  "fromName": "Support Technique",
  "sendEmail": true
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `content` | string | ✅ | Contenu du message |
| `type` | string | ❌ | Type de message (voir ci-dessous) |
| `fromEmail` | string | ❌ | Email de l'expéditeur |
| `fromName` | string | ❌ | Nom de l'expéditeur |
| `toEmail` | string | ❌ | Email du destinataire (défaut: email du ticket) |
| `sendEmail` | boolean | ❌ | Envoyer l'email au client (défaut: `true` pour les réponses) |

**Types de message** :

| Type | Description |
|------|-------------|
| `reply` | Réponse du support au client (envoie un email) |
| `note` | Note interne (visible uniquement en interne) |
| `client_message` | Message du client (pour synchronisation) |

**Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "1003",
    "ticketId": "123",
    "ticketNumber": "TKT-20250107-0001",
    "type": "reply",
    "content": "Bonjour, votre problème a été résolu...",
    "isInternal": false,
    "createdAt": "2025-01-07T16:30:00.000Z",
    "emailSent": true,
    "emailError": null
  }
}
```

---

### Clients

#### Lister les clients

```http
GET /api/external/support/clients
```

**Paramètres de requête** (optionnels) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | string | Recherche dans nom, email, téléphone |
| `page` | number | Page (défaut: 1) |
| `limit` | number | Nombre par page (défaut: 50, max: 100) |

**Réponse** :

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "456",
        "type": "company",
        "companyName": "Entreprise ABC",
        "firstName": null,
        "lastName": null,
        "email": "contact@abc.com",
        "phone": "0123456789",
        "address": "123 rue Example",
        "postalCode": "75001",
        "city": "Paris",
        "country": "France",
        "contact": {
          "firstName": "Jean",
          "lastName": "Dupont",
          "email": "jean@abc.com",
          "phone": "0987654321"
        },
        "status": "active",
        "ticketCount": 5,
        "createdAt": "2024-06-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 42,
      "totalPages": 1
    }
  }
}
```

---

#### Créer un client

```http
POST /api/external/support/clients
```

**Corps de la requête** :

```json
{
  "type": "company",
  "companyName": "Nouvelle Entreprise",
  "email": "contact@nouvelle.com",
  "phone": "0123456789",
  "address": "456 avenue Test",
  "postalCode": "69001",
  "city": "Lyon",
  "country": "France",
  "contact": {
    "firstName": "Marie",
    "lastName": "Martin",
    "email": "marie@nouvelle.com",
    "phone": "0987654321"
  }
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `companyName` | string | ✅* | Nom de l'entreprise |
| `lastName` | string | ✅* | Nom (pour particuliers) |
| `firstName` | string | ❌ | Prénom |
| `type` | string | ❌ | `company` (défaut) ou `individual` |
| `email` | string | ❌ | Email principal |
| `phone` | string | ❌ | Téléphone |
| `address` | string | ❌ | Adresse |
| `postalCode` | string | ❌ | Code postal |
| `city` | string | ❌ | Ville |
| `country` | string | ❌ | Pays (défaut: France) |
| `contact` | object | ❌ | Contact principal (voir ci-dessous) |

\* Au moins `companyName` ou `lastName` est requis.

**Objet contact** :

| Champ | Type | Description |
|-------|------|-------------|
| `firstName` | string | Prénom du contact |
| `lastName` | string | Nom du contact |
| `email` | string | Email du contact |
| `phone` | string | Téléphone du contact |

**Réponse** (201 Created) :

```json
{
  "success": true,
  "data": {
    "id": "789",
    "type": "company",
    "companyName": "Nouvelle Entreprise",
    "email": "contact@nouvelle.com",
    "phone": "0123456789",
    "createdAt": "2025-01-07T17:00:00.000Z"
  }
}
```

---

#### Obtenir un client

```http
GET /api/external/support/clients/:id
```

**Réponse** :

```json
{
  "success": true,
  "data": {
    "id": "456",
    "type": "company",
    "companyName": "Entreprise ABC",
    "firstName": null,
    "lastName": null,
    "email": "contact@abc.com",
    "phone": "0123456789",
    "address": "123 rue Example",
    "postalCode": "75001",
    "city": "Paris",
    "country": "France",
    "siret": "12345678901234",
    "vatNumber": "FR12345678901",
    "contact": {
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean@abc.com",
      "phone": "0987654321"
    },
    "status": "active",
    "ticketCount": 5,
    "recentTickets": [
      {
        "id": "123",
        "ticketNumber": "TKT-20250107-0001",
        "subject": "Problème de connexion",
        "status": "resolved",
        "priority": "normal",
        "createdAt": "2025-01-07T10:30:00.000Z"
      }
    ],
    "createdAt": "2024-06-15T10:00:00.000Z"
  }
}
```

---

#### Mettre à jour un client

```http
PATCH /api/external/support/clients/:id
```

**Corps de la requête** :

```json
{
  "companyName": "Entreprise ABC Renommée",
  "phone": "0111222333",
  "contact": {
    "email": "nouveau-contact@abc.com"
  }
}
```

Tous les champs sont optionnels. Seuls les champs fournis seront mis à jour.

---

## Codes d'erreur

| Code HTTP | Description |
|-----------|-------------|
| `200` | Succès |
| `201` | Ressource créée |
| `400` | Requête invalide (paramètres manquants/incorrects) |
| `401` | Non autorisé (token invalide ou manquant) |
| `403` | Accès interdit (permissions insuffisantes) |
| `404` | Ressource non trouvée |
| `409` | Conflit (ex: email déjà utilisé) |
| `429` | Trop de requêtes (rate limit dépassé) |
| `500` | Erreur serveur |

**Format des erreurs** :

```json
{
  "success": false,
  "error": "Description de l'erreur"
}
```

---

## Rate Limiting

Par défaut, chaque clé API est limitée à **1000 requêtes par heure**.

Headers de réponse :
- `X-RateLimit-Limit` : Limite de requêtes
- `X-RateLimit-Remaining` : Requêtes restantes
- `X-RateLimit-Reset` : Timestamp de réinitialisation

---

## Webhooks (à venir)

Une fonctionnalité de webhooks sera disponible prochainement pour recevoir des notifications en temps réel lors de :
- Création d'un nouveau ticket
- Nouveau message sur un ticket
- Changement de statut d'un ticket

---

## Exemples avec cURL

### Lister les tickets ouverts

```bash
curl -X GET "https://votre-domaine.com/api/external/support?status=open" \
  -H "Authorization: Bearer crm_votre_token_ici"
```

### Créer un ticket

```bash
curl -X POST "https://votre-domaine.com/api/external/support" \
  -H "Authorization: Bearer crm_votre_token_ici" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Demande de support",
    "content": "Bonjour, j'\''ai besoin d'\''aide...",
    "senderEmail": "client@example.com",
    "senderName": "Client Test"
  }'
```

### Répondre à un ticket

```bash
curl -X POST "https://votre-domaine.com/api/external/support/TKT-20250107-0001/messages" \
  -H "Authorization: Bearer crm_votre_token_ici" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "reply",
    "content": "Merci pour votre message. Nous allons traiter votre demande.",
    "fromName": "Support Technique"
  }'
```

### Fermer un ticket

```bash
curl -X PATCH "https://votre-domaine.com/api/external/support/TKT-20250107-0001" \
  -H "Authorization: Bearer crm_votre_token_ici" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }'
```

---

## Support

Pour toute question technique sur l'API, contactez votre administrateur CRM.
