import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { adminCategoriesService } from '../../services/api'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import type { Category, CategoryCreate } from '../../types'

function generateName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function CategoryEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEditing = Boolean(id)

  // Get category data from location state (passed from list page)
  const categoryFromState = location.state?.category as Category | undefined

  const [formData, setFormData] = useState<CategoryCreate>({
    name: '',
    label: '',
    description: '',
    order: 0,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoName, setAutoName] = useState(true)

  // Load existing category for editing
  useEffect(() => {
    if (isEditing && id) {
      if (categoryFromState && categoryFromState.id === id) {
        setFormData({
          name: categoryFromState.name,
          label: categoryFromState.label,
          description: categoryFromState.description || '',
          order: categoryFromState.order,
        })
        setAutoName(false)
      } else {
        setError('Category data not found. Please go back to the categories list.')
      }
    }
  }, [id, isEditing, categoryFromState])

  const handleLabelChange = (label: string) => {
    setFormData((prev) => ({
      ...prev,
      label,
      name: autoName ? generateName(label) : prev.name,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      if (isEditing && id) {
        await adminCategoriesService.update(id, formData)
      } else {
        await adminCategoriesService.create(formData)
      }
      navigate('/admin/categories')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-paper dark:bg-[#0f0f0f] z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/categories"
              className="p-2 text-zinc-faded hover:text-ink transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-serif text-xl font-light">
              {isEditing ? 'Edit Category' : 'New Category'}
            </h1>
          </div>
          <button
            type="submit"
            form="category-form"
            disabled={isSaving}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-ink text-paper dark:bg-white dark:text-zinc-900
              font-mono text-xs uppercase tracking-widest
              hover:opacity-90 transition-opacity
              disabled:opacity-50
            "
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form id="category-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Label */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Label (Display Name)
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              required
              className="
                w-full px-4 py-3 bg-transparent rounded-xl border border-zinc-200 dark:border-zinc-700
                font-serif text-2xl
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="Engineering"
            />
          </div>

          {/* Name (slug) */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Name (ID/Slug)
              <button
                type="button"
                onClick={() => setAutoName(!autoName)}
                className="ml-2 text-sage hover:underline normal-case"
              >
                ({autoName ? 'auto' : 'manual'})
              </button>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setAutoName(false)
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }}
              required
              className="
                w-full px-4 py-3 bg-transparent rounded-xl border border-zinc-200 dark:border-zinc-700
                font-mono text-sm
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="engineering"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Used as the category identifier in URLs and API
            </p>
          </div>

          {/* Order */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Order
            </label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))
              }
              className="
                w-full px-4 py-3 bg-transparent rounded-xl border border-zinc-200 dark:border-zinc-700
                font-mono text-sm
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="0"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Lower numbers appear first
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="
                w-full px-4 py-3 bg-transparent rounded-xl border border-zinc-200 dark:border-zinc-700
                font-serif text-base leading-relaxed resize-none
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="A brief description of this category..."
            />
          </div>
        </form>
      </main>
    </div>
  )
}
