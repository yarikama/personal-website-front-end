import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminProjectsService } from '../../services/api'
import { Plus, Edit, Trash2, Loader2, Star, ExternalLink } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import type { Project } from '../../types'

export default function AdminProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProjects = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await adminProjectsService.getAll(100)
      setProjects(response.data)
    } catch {
      setError('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return

    setDeletingId(id)
    try {
      await adminProjectsService.delete(id)
      fetchProjects()
    } catch {
      alert('Failed to delete project')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-light">Projects</h1>
            <p className="text-sm text-zinc-faded">Manage your project portfolio</p>
          </div>
          <Link
            to="/admin/projects/new"
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-ink text-paper dark:bg-white dark:text-zinc-900
              font-mono text-xs uppercase tracking-widest
              hover:opacity-90 transition-opacity
            "
          >
            <Plus size={14} />
            New Project
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
            <p className="text-sm text-zinc-400">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-zinc-faded">Failed to load projects</p>
            <button
              onClick={() => fetchProjects()}
              className="mt-4 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
            >
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl text-zinc-faded mb-4">No projects yet</p>
            <Link
              to="/admin/projects/new"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
            >
              <Plus size={14} />
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="
                  flex items-center justify-between gap-4 p-4
                  rounded-xl border border-zinc-200 dark:border-zinc-800
                  hover:border-zinc-400 transition-colors
                "
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-serif text-lg truncate">{project.title}</h2>
                    {project.featured && (
                      <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-1">
                    {project.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                    <span className="font-mono uppercase tracking-widest">
                      {project.category.label}
                    </span>
                    <span>·</span>
                    <span className="font-mono">{project.year}</span>
                    <span>·</span>
                    <span className="truncate">{project.tags.join(', ')}</span>
                    {!project.published && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 dark:text-amber-500">Draft</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-ink transition-colors"
                      title="View Live"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <Link
                    to={`/admin/projects/${project.id}/edit`}
                    state={{ project }}
                    className="p-2 text-zinc-400 hover:text-ink transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(project.id, project.title)}
                    disabled={deletingId === project.id}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === project.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-20">
          <Link
            to="/"
            className="font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors"
          >
            Back to Site
          </Link>
        </div>
      </main>
    </div>
  )
}
