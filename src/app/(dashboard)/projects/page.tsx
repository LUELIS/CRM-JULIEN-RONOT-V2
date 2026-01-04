"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, FolderKanban, Archive, MoreHorizontal, Trash2, Edit, Users,
  LayoutGrid, List, Search, Calendar, CheckCircle2, Filter
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StyledSelect } from "@/components/ui/styled-select"

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  isArchived: boolean
  client: { id: string; companyName: string } | null
  columns: {
    id: string
    name: string
    cards: {
      id: string
      isCompleted: boolean
      dueDate: string | null
    }[]
  }[]
  createdAt: string
  updatedAt: string
}

interface Client {
  id: string
  companyName: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterClientId, setFilterClientId] = useState<string>("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [newProjectColor, setNewProjectColor] = useState("#0064FA")
  const [newProjectClientId, setNewProjectClientId] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchClients()
  }, [showArchived])

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?includeArchived=${showArchived}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.map((p: any) => ({ ...p, id: String(p.id) })))
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients?limit=100")
      if (res.ok) {
        const data = await res.json()
        setClients(data.data?.map((c: any) => ({ id: String(c.id), companyName: c.companyName })) || [])
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return

    setCreating(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          color: newProjectColor,
          clientId: newProjectClientId || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setShowCreateModal(false)
        setNewProjectName("")
        setNewProjectDescription("")
        setNewProjectColor("#0064FA")
        setNewProjectClientId("")
        router.push(`/projects/${data.id}`)
      } else {
        alert(`Erreur: ${data.error || "Impossible de creer le projet"}`)
      }
    } catch (error) {
      console.error("Error creating project:", error)
      alert("Erreur de connexion au serveur")
    } finally {
      setCreating(false)
    }
  }

  const archiveProject = async (projectId: string, archive: boolean) => {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: archive }),
      })
      fetchProjects()
    } catch (error) {
      console.error("Error archiving project:", error)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm("Supprimer ce projet et toutes ses taches ?")) return

    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
      fetchProjects()
    } catch (error) {
      console.error("Error deleting project:", error)
    }
  }

  const getTotalCards = (project: Project) => {
    return project.columns.reduce((acc, col) => acc + col.cards.length, 0)
  }

  const getCompletedCards = (project: Project) => {
    return project.columns.reduce((acc, col) =>
      acc + col.cards.filter(c => c.isCompleted).length, 0)
  }

  const getProgress = (project: Project) => {
    const total = getTotalCards(project)
    if (total === 0) return 0
    return Math.round((getCompletedCards(project) / total) * 100)
  }

  const getOverdueTasks = (project: Project) => {
    const now = new Date()
    return project.columns.reduce((acc, col) =>
      acc + col.cards.filter(c =>
        c.dueDate && new Date(c.dueDate) < now && !c.isCompleted
      ).length, 0)
  }

  const colors = [
    "#0064FA", "#5F00BA", "#F0783C", "#2E7D32", "#C2185B",
    "#00838F", "#F9A825", "#5D4037", "#6B7280",
  ]

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchQuery ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClient = !filterClientId || project.client?.id === filterClientId
    return matchesSearch && matchesClient
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0064FA]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Projets</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Gerez vos projets avec des tableaux Kanban</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0064FA] text-white rounded-xl text-sm font-medium hover:bg-[#0052CC] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un projet..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Client filter */}
          <div className="min-w-[180px]">
            <StyledSelect
              value={filterClientId}
              onChange={setFilterClientId}
              placeholder="Tous les clients"
              options={[
                { value: "", label: "Tous les clients" },
                ...clients.map(c => ({ value: c.id, label: c.companyName }))
              ]}
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-600 shadow-sm text-[#0064FA]"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-600 shadow-sm text-[#0064FA]"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Archive toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showArchived
                ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Masquer archives" : "Voir archives"}
          </button>
        </div>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FolderKanban className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery || filterClientId ? "Aucun projet trouve" : "Aucun projet"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery || filterClientId
              ? "Modifiez vos filtres pour voir plus de resultats"
              : "Creez votre premier projet pour commencer"}
          </p>
          {!searchQuery && !filterClientId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Creer un projet
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#0064FA]/50 hover:shadow-lg transition-all cursor-pointer group ${
                project.isArchived ? "opacity-60" : ""
              }`}
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.isArchived && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        Archive
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Ouvrir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveProject(project.id, !project.isArchived)}>
                        <Archive className="h-4 w-4 mr-2" />
                        {project.isArchived ? "Restaurer" : "Archiver"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Progression</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {getProgress(project)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0064FA] rounded-full transition-all"
                      style={{ width: `${getProgress(project)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {getCompletedCards(project)}/{getTotalCards(project)}
                    </span>
                    {getOverdueTasks(project) > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {getOverdueTasks(project)} en retard
                      </span>
                    )}
                  </div>
                  {project.client && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Users className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{project.client.companyName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Projet
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progression
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Taches
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Derniere maj
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    project.isArchived ? "opacity-60" : ""
                  }`}
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {project.client?.companyName || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0064FA] rounded-full"
                          style={{ width: `${getProgress(project)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {getProgress(project)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-gray-900 dark:text-gray-100">
                      {getCompletedCards(project)}/{getTotalCards(project)}
                    </span>
                    {getOverdueTasks(project) > 0 && (
                      <span className="ml-2 text-red-500">
                        ({getOverdueTasks(project)} en retard)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Ouvrir
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveProject(project.id, !project.isArchived)}>
                          <Archive className="h-4 w-4 mr-2" />
                          {project.isArchived ? "Restaurer" : "Archiver"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Nouveau projet
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom du projet *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Mon projet"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Description du projet..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client (optionnel)
                  </label>
                  <StyledSelect
                    value={newProjectClientId}
                    onChange={setNewProjectClientId}
                    placeholder="Selectionner un client"
                    options={[
                      { value: "", label: "Aucun client" },
                      ...clients.map(c => ({ value: c.id, label: c.companyName }))
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Couleur
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewProjectColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newProjectColor === color
                            ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createProject}
                  disabled={creating || !newProjectName.trim()}
                  className="px-4 py-2 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creation..." : "Creer le projet"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
