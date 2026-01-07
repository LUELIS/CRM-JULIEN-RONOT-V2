"use client"

import { useState } from "react"
import {
  Book,
  Key,
  Ticket,
  MessageSquare,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  AlertTriangle,
  Info,
  Code,
  Terminal,
} from "lucide-react"

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

interface Endpoint {
  method: HttpMethod
  path: string
  description: string
  params?: {
    name: string
    type: string
    required: boolean
    description: string
  }[]
  queryParams?: {
    name: string
    type: string
    description: string
  }[]
  body?: {
    name: string
    type: string
    required: boolean
    description: string
  }[]
  response: string
  example?: {
    request?: string
    response: string
  }
}

interface Section {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  endpoints: Endpoint[]
}

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
}

const sections: Section[] = [
  {
    id: "tickets",
    title: "Tickets",
    icon: <Ticket className="w-5 h-5" />,
    description: "Gestion des tickets de support",
    endpoints: [
      {
        method: "GET",
        path: "/api/external/support",
        description: "Liste tous les tickets avec pagination et filtres",
        queryParams: [
          { name: "search", type: "string", description: "Recherche dans le sujet et numéro" },
          { name: "status", type: "string", description: "new, open, pending, resolved, closed" },
          { name: "priority", type: "string", description: "low, normal, high, urgent" },
          { name: "clientId", type: "string", description: "ID du client" },
          { name: "since", type: "string", description: "Date ISO - tickets créés après" },
          { name: "page", type: "number", description: "Page (défaut: 1)" },
          { name: "limit", type: "number", description: "Limite (défaut: 50, max: 100)" },
        ],
        response: "Liste paginée des tickets",
        example: {
          response: `{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "123",
        "ticketNumber": "TKT-20250107-0001",
        "subject": "Problème de connexion",
        "senderEmail": "client@example.com",
        "status": "open",
        "priority": "normal",
        "createdAt": "2025-01-07T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}`,
        },
      },
      {
        method: "POST",
        path: "/api/external/support",
        description: "Crée un nouveau ticket",
        body: [
          { name: "subject", type: "string", required: true, description: "Sujet du ticket" },
          { name: "content", type: "string", required: true, description: "Message initial" },
          { name: "senderEmail", type: "string", required: true, description: "Email de l'expéditeur" },
          { name: "senderName", type: "string", required: false, description: "Nom de l'expéditeur" },
          { name: "priority", type: "string", required: false, description: "low, normal (défaut), high, urgent" },
          { name: "tags", type: "string[]", required: false, description: "Tags du ticket" },
          { name: "clientId", type: "string", required: false, description: "ID du client existant" },
        ],
        response: "Ticket créé avec son numéro",
        example: {
          request: `{
  "subject": "Demande de support",
  "content": "Bonjour, j'ai besoin d'aide...",
  "senderEmail": "client@example.com",
  "senderName": "Jean Dupont",
  "priority": "normal"
}`,
          response: `{
  "success": true,
  "data": {
    "id": "789",
    "ticketNumber": "TKT-20250107-0002",
    "subject": "Demande de support",
    "status": "new",
    "createdAt": "2025-01-07T15:00:00.000Z"
  }
}`,
        },
      },
      {
        method: "GET",
        path: "/api/external/support/:id",
        description: "Détails d'un ticket avec tous ses messages",
        params: [
          { name: "id", type: "string", required: true, description: "ID ou numéro du ticket (TKT-xxx)" },
        ],
        response: "Ticket complet avec messages et client",
        example: {
          response: `{
  "success": true,
  "data": {
    "id": "123",
    "ticketNumber": "TKT-20250107-0001",
    "subject": "Problème de connexion",
    "status": "open",
    "priority": "normal",
    "client": {
      "id": "456",
      "companyName": "Entreprise ABC",
      "email": "contact@abc.com"
    },
    "messages": [
      {
        "id": "1001",
        "type": "email_in",
        "content": "Bonjour, je n'arrive pas à me connecter...",
        "fromEmail": "client@example.com",
        "createdAt": "2025-01-07T10:30:00.000Z"
      }
    ]
  }
}`,
        },
      },
      {
        method: "PATCH",
        path: "/api/external/support/:id",
        description: "Met à jour un ticket (statut, priorité, tags)",
        params: [
          { name: "id", type: "string", required: true, description: "ID ou numéro du ticket" },
        ],
        body: [
          { name: "status", type: "string", required: false, description: "new, open, pending, resolved, closed" },
          { name: "priority", type: "string", required: false, description: "low, normal, high, urgent" },
          { name: "tags", type: "string[]", required: false, description: "Nouveaux tags" },
          { name: "subject", type: "string", required: false, description: "Nouveau sujet" },
        ],
        response: "Ticket mis à jour",
        example: {
          request: `{
  "status": "resolved",
  "tags": ["résolu", "technique"]
}`,
          response: `{
  "success": true,
  "data": {
    "id": "123",
    "ticketNumber": "TKT-20250107-0001",
    "status": "resolved",
    "updatedAt": "2025-01-07T16:00:00.000Z"
  }
}`,
        },
      },
    ],
  },
  {
    id: "messages",
    title: "Messages",
    icon: <MessageSquare className="w-5 h-5" />,
    description: "Gestion des messages et réponses",
    endpoints: [
      {
        method: "GET",
        path: "/api/external/support/:id/messages",
        description: "Liste les messages d'un ticket",
        params: [
          { name: "id", type: "string", required: true, description: "ID ou numéro du ticket" },
        ],
        queryParams: [
          { name: "includeInternal", type: "boolean", description: "Inclure les notes internes (défaut: false)" },
        ],
        response: "Liste des messages du ticket",
        example: {
          response: `{
  "success": true,
  "data": {
    "ticketId": "123",
    "ticketNumber": "TKT-20250107-0001",
    "messages": [
      {
        "id": "1001",
        "type": "email_in",
        "content": "Message du client...",
        "fromEmail": "client@example.com",
        "isInternal": false,
        "createdAt": "2025-01-07T10:30:00.000Z"
      }
    ]
  }
}`,
        },
      },
      {
        method: "POST",
        path: "/api/external/support/:id/messages",
        description: "Ajoute une réponse ou note à un ticket",
        params: [
          { name: "id", type: "string", required: true, description: "ID ou numéro du ticket" },
        ],
        body: [
          { name: "content", type: "string", required: true, description: "Contenu du message" },
          { name: "type", type: "string", required: false, description: "reply (défaut), note, client_message" },
          { name: "fromEmail", type: "string", required: false, description: "Email de l'expéditeur" },
          { name: "fromName", type: "string", required: false, description: "Nom de l'expéditeur" },
          { name: "sendEmail", type: "boolean", required: false, description: "Envoyer par email (défaut: true pour reply)" },
        ],
        response: "Message créé avec statut d'envoi email",
        example: {
          request: `{
  "type": "reply",
  "content": "Bonjour, nous avons résolu votre problème.",
  "fromName": "Support Technique",
  "sendEmail": true
}`,
          response: `{
  "success": true,
  "data": {
    "id": "1003",
    "ticketId": "123",
    "type": "reply",
    "content": "Bonjour, nous avons résolu...",
    "emailSent": true,
    "emailError": null,
    "createdAt": "2025-01-07T16:30:00.000Z"
  }
}`,
        },
      },
    ],
  },
  {
    id: "clients",
    title: "Clients",
    icon: <Users className="w-5 h-5" />,
    description: "Gestion des clients",
    endpoints: [
      {
        method: "GET",
        path: "/api/external/support/clients",
        description: "Liste tous les clients",
        queryParams: [
          { name: "search", type: "string", description: "Recherche dans nom, email, téléphone" },
          { name: "page", type: "number", description: "Page (défaut: 1)" },
          { name: "limit", type: "number", description: "Limite (défaut: 50, max: 100)" },
        ],
        response: "Liste paginée des clients",
        example: {
          response: `{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "456",
        "type": "company",
        "companyName": "Entreprise ABC",
        "email": "contact@abc.com",
        "phone": "0123456789",
        "ticketCount": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 42
    }
  }
}`,
        },
      },
      {
        method: "POST",
        path: "/api/external/support/clients",
        description: "Crée un nouveau client",
        body: [
          { name: "companyName", type: "string", required: false, description: "Nom de l'entreprise (requis si pas lastName)" },
          { name: "lastName", type: "string", required: false, description: "Nom (requis si pas companyName)" },
          { name: "firstName", type: "string", required: false, description: "Prénom" },
          { name: "type", type: "string", required: false, description: "company (défaut) ou individual" },
          { name: "email", type: "string", required: false, description: "Email principal" },
          { name: "phone", type: "string", required: false, description: "Téléphone" },
          { name: "address", type: "string", required: false, description: "Adresse" },
          { name: "postalCode", type: "string", required: false, description: "Code postal" },
          { name: "city", type: "string", required: false, description: "Ville" },
          { name: "country", type: "string", required: false, description: "Pays (défaut: France)" },
          { name: "contact", type: "object", required: false, description: "Contact: {firstName, lastName, email, phone}" },
        ],
        response: "Client créé",
        example: {
          request: `{
  "type": "company",
  "companyName": "Nouvelle Entreprise",
  "email": "contact@nouvelle.com",
  "phone": "0123456789",
  "city": "Paris"
}`,
          response: `{
  "success": true,
  "data": {
    "id": "789",
    "type": "company",
    "companyName": "Nouvelle Entreprise",
    "email": "contact@nouvelle.com",
    "createdAt": "2025-01-07T17:00:00.000Z"
  }
}`,
        },
      },
      {
        method: "GET",
        path: "/api/external/support/clients/:id",
        description: "Détails d'un client avec ses tickets récents",
        params: [
          { name: "id", type: "string", required: true, description: "ID du client" },
        ],
        response: "Client avec détails complets et tickets récents",
        example: {
          response: `{
  "success": true,
  "data": {
    "id": "456",
    "type": "company",
    "companyName": "Entreprise ABC",
    "email": "contact@abc.com",
    "ticketCount": 5,
    "recentTickets": [
      {
        "id": "123",
        "ticketNumber": "TKT-20250107-0001",
        "subject": "Problème de connexion",
        "status": "resolved"
      }
    ]
  }
}`,
        },
      },
      {
        method: "PATCH",
        path: "/api/external/support/clients/:id",
        description: "Met à jour un client",
        params: [
          { name: "id", type: "string", required: true, description: "ID du client" },
        ],
        body: [
          { name: "companyName", type: "string", required: false, description: "Nouveau nom" },
          { name: "email", type: "string", required: false, description: "Nouvel email" },
          { name: "phone", type: "string", required: false, description: "Nouveau téléphone" },
          { name: "contact", type: "object", required: false, description: "Mise à jour contact" },
        ],
        response: "Client mis à jour",
      },
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
      title="Copier"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  )
}

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="bg-[#0d1117] rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-gray-300">{code}</code>
      </pre>
    </div>
  )
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
      >
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-bold border ${methodColors[endpoint.method]}`}
        >
          {endpoint.method}
        </span>
        <code className="text-sm text-gray-300 font-mono">{endpoint.path}</code>
        <span className="flex-1 text-sm text-gray-500 truncate ml-2">
          {endpoint.description}
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4 bg-white/[0.02]">
          <p className="text-gray-400">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Paramètres URL</h4>
              <div className="space-y-2">
                {endpoint.params.map((param) => (
                  <div key={param.name} className="flex items-start gap-2 text-sm">
                    <code className="px-2 py-0.5 bg-white/10 rounded text-blue-400">
                      {param.name}
                    </code>
                    <span className="text-gray-500">{param.type}</span>
                    {param.required && (
                      <span className="text-xs text-red-400">requis</span>
                    )}
                    <span className="text-gray-400">- {param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Paramètres de requête</h4>
              <div className="space-y-2">
                {endpoint.queryParams.map((param) => (
                  <div key={param.name} className="flex items-start gap-2 text-sm">
                    <code className="px-2 py-0.5 bg-white/10 rounded text-emerald-400">
                      {param.name}
                    </code>
                    <span className="text-gray-500">{param.type}</span>
                    <span className="text-gray-400">- {param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.body && endpoint.body.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Corps de la requête</h4>
              <div className="space-y-2">
                {endpoint.body.map((field) => (
                  <div key={field.name} className="flex items-start gap-2 text-sm">
                    <code className="px-2 py-0.5 bg-white/10 rounded text-amber-400">
                      {field.name}
                    </code>
                    <span className="text-gray-500">{field.type}</span>
                    {field.required && (
                      <span className="text-xs text-red-400">requis</span>
                    )}
                    <span className="text-gray-400">- {field.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.example && (
            <div className="space-y-3">
              {endpoint.example.request && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Exemple de requête
                  </h4>
                  <CodeBlock code={endpoint.example.request} />
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Exemple de réponse
                </h4>
                <CodeBlock code={endpoint.example.response} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState("tickets")
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null)

  const curlExamples = {
    list: `curl -X GET "https://votre-domaine.com/api/external/support?status=open" \\
  -H "Authorization: Bearer crm_votre_token_ici"`,
    create: `curl -X POST "https://votre-domaine.com/api/external/support" \\
  -H "Authorization: Bearer crm_votre_token_ici" \\
  -H "Content-Type: application/json" \\
  -d '{
    "subject": "Demande de support",
    "content": "Bonjour, j'\\''ai besoin d'\\''aide...",
    "senderEmail": "client@example.com"
  }'`,
    reply: `curl -X POST "https://votre-domaine.com/api/external/support/TKT-20250107-0001/messages" \\
  -H "Authorization: Bearer crm_votre_token_ici" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "reply",
    "content": "Merci pour votre message.",
    "fromName": "Support Technique"
  }'`,
  }

  const copyCurl = (key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedCurl(key)
    setTimeout(() => setCopiedCurl(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Book className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">API Support Externe</h1>
                <p className="text-sm text-gray-500">Documentation pour intégrations tierces</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                v1.0
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Navigation */}
              <nav className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Endpoints
                </h3>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? "bg-blue-500/20 text-blue-400"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {section.icon}
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>

              {/* Quick Info */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Base URL
                </h3>
                <code className="text-xs text-gray-400 break-all">
                  https://votre-domaine.com/api/external/support
                </code>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-8">
            {/* Authentication Section */}
            <section className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Key className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white mb-2">Authentification</h2>
                  <p className="text-gray-400 mb-4">
                    Toutes les requêtes doivent inclure un header <code className="text-amber-400">Authorization</code> avec votre token Bearer.
                  </p>
                  <div className="bg-[#0d1117] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Header</span>
                      <CopyButton text="Authorization: Bearer crm_votre_token_ici" />
                    </div>
                    <code className="text-sm text-emerald-400">
                      Authorization: Bearer crm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                    </code>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Le token n&apos;est affiché qu&apos;une seule fois à la création.
                        Conservez-le précieusement !
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Error Codes */}
            <section className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Codes d&apos;erreur
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { code: "200", desc: "Succès", color: "emerald" },
                  { code: "201", desc: "Créé", color: "emerald" },
                  { code: "400", desc: "Requête invalide", color: "amber" },
                  { code: "401", desc: "Non autorisé", color: "red" },
                  { code: "404", desc: "Non trouvé", color: "red" },
                  { code: "429", desc: "Rate limit", color: "amber" },
                  { code: "500", desc: "Erreur serveur", color: "red" },
                ].map((error) => (
                  <div
                    key={error.code}
                    className={`p-3 rounded-lg bg-${error.color}-500/10 border border-${error.color}-500/20`}
                  >
                    <span className={`text-lg font-bold text-${error.color}-400`}>
                      {error.code}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{error.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-2">Format des erreurs</h4>
                <CodeBlock
                  code={`{
  "success": false,
  "error": "Description de l'erreur"
}`}
                />
              </div>
            </section>

            {/* Endpoints Sections */}
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className={activeSection === section.id ? "" : "hidden"}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-blue-500/20">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{section.title}</h2>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {section.endpoints.map((endpoint, index) => (
                    <EndpointCard key={index} endpoint={endpoint} />
                  ))}
                </div>
              </section>
            ))}

            {/* cURL Examples */}
            <section className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-400" />
                Exemples cURL
              </h2>
              <div className="space-y-4">
                {Object.entries(curlExamples).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-300 capitalize">
                        {key === "list" ? "Lister les tickets" : key === "create" ? "Créer un ticket" : "Répondre à un ticket"}
                      </h4>
                      <button
                        onClick={() => copyCurl(key, value)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/10 transition-colors text-xs text-gray-400"
                      >
                        {copiedCurl === key ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                    <CodeBlock code={value} language="bash" />
                  </div>
                ))}
              </div>
            </section>

            {/* Rate Limiting */}
            <section className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                Rate Limiting
              </h2>
              <p className="text-gray-400 mb-4">
                Par défaut, chaque clé API est limitée à <strong className="text-white">1000 requêtes par heure</strong>.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-white/10 rounded text-blue-400">X-RateLimit-Limit</code>
                  <span className="text-gray-400">Limite de requêtes</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-white/10 rounded text-blue-400">X-RateLimit-Remaining</code>
                  <span className="text-gray-400">Requêtes restantes</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-white/10 rounded text-blue-400">X-RateLimit-Reset</code>
                  <span className="text-gray-400">Timestamp de réinitialisation</span>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-center text-sm text-gray-500">
            Pour toute question technique sur l&apos;API, contactez votre administrateur CRM.
          </p>
        </div>
      </footer>
    </div>
  )
}
