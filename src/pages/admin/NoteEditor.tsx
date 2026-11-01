import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { adminLabNotesService, uploadService, type CreateLabNoteData } from '../../services/api'
import { ArrowLeft, Save, Loader2, Eye, Columns, Square, ImagePlus, Sparkles, History } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import MarkdownRenderer from '../../components/ui/MarkdownRenderer'
import { useAutocomplete, useNoteDraft } from '../../hooks'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function estimateReadTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState<CreateLabNoteData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    tags: [],
    readTime: '1 min read',
    date: new Date().toISOString().split('T')[0],
    published: false,
  })
  const [tagsInput, setTagsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingNote, setIsLoadingNote] = useState(isEditing)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoSlug, setAutoSlug] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  const draft = useNoteDraft({
    noteId: id,
    data: { formData, tagsInput },
    ready: !isLoadingNote,
    onRestore: (saved) => {
      setFormData(saved.formData)
      setTagsInput(saved.tagsInput)
      setAutoSlug(false)
    },
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing note for editing - always fetch from API to get full content
  useEffect(() => {
    if (isEditing && id) {
      setIsLoadingNote(true)
      adminLabNotesService
        .getById(id)
        .then((response) => {
          const note = response.data
          setFormData({
            title: note.title,
            slug: note.slug,
            excerpt: note.excerpt,
            content: note.content,
            tags: note.tags,
            readTime: note.readTime,
            date: note.date,
            published: note.published,
          })
          setTagsInput(note.tags.join(', '))
          setAutoSlug(false)
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load note')
        })
        .finally(() => {
          setIsLoadingNote(false)
        })
    }
  }, [id, isEditing])

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: autoSlug ? generateSlug(title) : prev.slug,
    }))
  }

  const handleContentChange = (content: string) => {
    setFormData((prev) => ({
      ...prev,
      content,
      readTime: estimateReadTime(content),
    }))
  }

  const handleTagsChange = (value: string) => {
    setTagsInput(value)
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setFormData((prev) => ({ ...prev, tags }))
  }

  // Insert text at cursor position in textarea
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = formData.content.substring(0, start)
    const after = formData.content.substring(end)
    const newContent = before + text + after

    handleContentChange(newContent)

    // Restore cursor position after the inserted text
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + text.length
    }, 0)
  }

  const autocomplete = useAutocomplete({
    textareaRef,
    content: formData.content,
    title: formData.title,
    noteId: id,
    insert: insertAtCursor,
  })

  // Keep the ghost layer aligned with the textarea: same scroll position, and
  // the same text width once the textarea shows a scrollbar.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const ghost = ghostRef.current
    if (!textarea || !ghost) return
    ghost.scrollTop = textarea.scrollTop
    // offsetWidth - clientWidth is the scrollbar plus the 1px border on each side.
    const width = Math.max(0, textarea.offsetWidth - textarea.clientWidth - 2)
    if (width !== scrollbarWidth) setScrollbarWidth(width)
  }, [autocomplete.ghost?.at, autocomplete.ghost?.text, scrollbarWidth])

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadService.uploadImage(file, 'notes')
      const markdown = `![${file.name}](${result.url})`
      insertAtCursor(markdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file)
    }
  }

  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          handleImageUpload(file)
        }
        break
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    // If the request fails (an expired session redirects to the login page),
    // the latest text is already in the draft.
    draft.flush()

    try {
      if (isEditing && id) {
        await adminLabNotesService.update(id, formData)
      } else {
        await adminLabNotesService.create(formData)
      }
      draft.markSaved()
      navigate('/admin/notes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing && isLoadingNote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-[#0f0f0f]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-paper dark:bg-[#0f0f0f] z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/notes"
              className="p-2 text-zinc-faded hover:text-ink transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-serif text-xl font-light">
              {isEditing ? 'Edit Note' : 'New Note'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {draft.savedAt && (
              <span
                className="font-mono text-[0.875rem] text-zinc-400"
                title="Unsaved changes are kept in this browser until you save"
              >
                Draft kept · {new Date(draft.savedAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
              </span>
            )}
            {isEditing && formData.slug && (
              <Link
                to={`/notes/${formData.slug}`}
                target="_blank"
                className="p-2 text-zinc-faded hover:text-ink transition-colors"
                title="Preview"
              >
                <Eye size={18} />
              </Link>
            )}
            <button
              type="submit"
              form="note-form"
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
        </div>
      </header>

      {/* Form */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {draft.offer && (
          <div className="mb-6 p-4 border border-sage/40 bg-sage/5 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-ink dark:text-zinc-200">
              <History size={16} className="text-sage" />
              Unsaved changes from {formatTime(draft.offer.savedAt)} were kept in this browser.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={draft.restore}
                className="px-3 py-1.5 bg-ink text-paper dark:bg-white dark:text-zinc-900 font-mono text-xs uppercase tracking-widest hover:opacity-90"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={draft.discard}
                className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-ink dark:hover:text-white"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form id="note-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              className="
                w-full px-4 py-3 bg-transparent border border-zinc-200 dark:border-zinc-700
                font-serif text-2xl
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="Article title"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Slug
              <button
                type="button"
                onClick={() => setAutoSlug(!autoSlug)}
                className="ml-2 text-sage hover:underline normal-case"
              >
                ({autoSlug ? 'auto' : 'manual'})
              </button>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => {
                setAutoSlug(false)
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }}
              required
              className="
                w-full px-4 py-3 bg-transparent border border-zinc-200 dark:border-zinc-700
                font-mono text-sm
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="article-url-slug"
            />
          </div>

          {/* Date & Published */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
                className="
                  w-full px-4 py-3 bg-transparent border border-zinc-200 dark:border-zinc-700
                  font-mono text-sm
                  focus:outline-none focus:border-ink dark:focus:border-zinc-400
                  transition-colors
                "
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
                Status
              </label>
              <label className="flex items-center gap-3 px-4 py-3 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-zinc-400 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData((prev) => ({ ...prev, published: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="font-mono text-sm">Published</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              className="
                w-full px-4 py-3 bg-transparent border border-zinc-200 dark:border-zinc-700
                font-mono text-sm
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="RAG, Python, LlamaIndex"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Excerpt
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
              required
              rows={2}
              className="
                w-full px-4 py-3 bg-transparent border border-zinc-200 dark:border-zinc-700
                font-serif text-base leading-relaxed resize-none
                focus:outline-none focus:border-ink dark:focus:border-zinc-400
                transition-colors
              "
              placeholder="Brief description for listing pages..."
            />
          </div>

          {/* Content with Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                Content (Markdown)
                <span className="ml-2 normal-case text-zinc-500">· {formData.readTime}</span>
                {autocomplete.ghost && (
                  <span className="ml-2 normal-case text-sage">· Tab accepts all, ⌥→ one word, Esc dismisses</span>
                )}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => autocomplete.setEnabled(!autocomplete.enabled)}
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-ink transition-colors"
                  title="Inline suggestions from the note autocomplete model"
                >
                  <Sparkles size={14} className={autocomplete.enabled ? 'text-sage' : ''} />
                  {autocomplete.enabled ? 'Autocomplete On' : 'Autocomplete Off'}
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-ink transition-colors disabled:opacity-50"
                  title="Upload image"
                >
                  {isUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ImagePlus size={14} />
                  )}
                  {isUploading ? 'Uploading...' : 'Add Image'}
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-ink transition-colors"
                >
                  {showPreview ? <Square size={14} /> : <Columns size={14} />}
                  {showPreview ? 'Editor Only' : 'Show Preview'}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className={`grid gap-4 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* Editor */}
              <div
                className="relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <textarea
                  ref={textareaRef}
                  value={formData.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onPaste={handlePaste}
                  onScroll={(e) => {
                    if (ghostRef.current) ghostRef.current.scrollTop = e.currentTarget.scrollTop
                  }}
                  {...autocomplete.handlers}
                  required
                  className={`
                    block w-full h-[calc(100vh-8rem)] min-h-[600px] px-4 py-3 bg-transparent border
                    font-mono text-sm leading-relaxed resize-y
                    focus:outline-none transition-colors
                    ${isDragging
                      ? 'border-sage border-2 bg-sage/5'
                      : 'border-zinc-200 dark:border-zinc-700 focus:border-ink dark:focus:border-zinc-400'
                    }
                  `}
                  placeholder="# Your article content in Markdown...

Tip: Drag & drop or paste images directly here"
                />
                {autocomplete.ghost && (
                  <div
                    ref={ghostRef}
                    aria-hidden="true"
                    className="absolute inset-0 px-4 py-3 border border-transparent font-mono text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
                    style={{ paddingRight: `calc(1rem + ${scrollbarWidth}px)` }}
                  >
                    {/* Invisible copy of the text before the caret, so the
                        suggestion lands exactly where the caret is. */}
                    <span className="invisible">{formData.content.slice(0, autocomplete.ghost.at)}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">{autocomplete.ghost.text}</span>
                  </div>
                )}
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-sage/10 border-2 border-dashed border-sage pointer-events-none">
                    <div className="flex flex-col items-center gap-2 text-sage">
                      <ImagePlus size={32} />
                      <span className="font-mono text-xs uppercase tracking-widest">
                        Drop image here
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="border border-zinc-200 dark:border-zinc-700 p-4 overflow-y-auto h-[calc(100vh-8rem)] min-h-[600px] bg-white dark:bg-zinc-900/50 rounded">
                  {formData.content ? (
                    <MarkdownRenderer content={formData.content} />
                  ) : (
                    <p className="text-zinc-400 italic">Preview will appear here...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
