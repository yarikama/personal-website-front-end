import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminCategoriesService } from '../../services/api'
import { Plus, Edit, Trash2, Loader2, GripVertical } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import type { Category } from '../../types'

export default function AdminCategoriesList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await adminCategoriesService.getAll()
      // Sort by order
      const sorted = [...response.data].sort((a, b) => a.order - b.order)
      setCategories(sorted)
    } catch {
      setError('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete category "${label}"? Projects using this category may be affected.`)) return

    setDeletingId(id)
    try {
      await adminCategoriesService.delete(id)
      fetchCategories()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category')
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
            <h1 className="font-serif text-2xl font-light">Categories</h1>
            <p className="text-sm text-zinc-faded">Manage project categories</p>
          </div>
          <Link
            to="/admin/categories/new"
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-ink text-paper dark:bg-white dark:text-zinc-900
              font-mono text-xs uppercase tracking-widest
              hover:opacity-90 transition-opacity
            "
          >
            <Plus size={14} />
            New Category
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
            <p className="text-sm text-zinc-400">Loading categories...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-zinc-faded">Failed to load categories</p>
            <button
              onClick={() => fetchCategories()}
              className="mt-4 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
            >
              Try again
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl text-zinc-faded mb-4">No categories yet</p>
            <Link
              to="/admin/categories/new"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
            >
              <Plus size={14} />
              Create your first category
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="
                  flex items-center justify-between gap-4 p-4
                  rounded-xl border border-zinc-200 dark:border-zinc-800
                  hover:border-zinc-400 transition-colors
                "
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="text-zinc-300 dark:text-zinc-600">
                    <GripVertical size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-serif text-lg">{category.label}</h2>
                      <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
                        {category.name}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">
                        {category.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                      <span className="font-mono">Order: {category.order}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/categories/${category.id}/edit`}
                    state={{ category }}
                    className="p-2 text-zinc-400 hover:text-ink dark:hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(category.id, category.label)}
                    disabled={deletingId === category.id}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === category.id ? (
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
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
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
