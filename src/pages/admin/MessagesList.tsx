import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2, Mail, MailOpen, Reply, Trash2 } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import { adminContactService, replyLink, type ContactMessage, type MessageChange } from '../../services/api'

const PAGE = 50

function chip(active: boolean) {
  return `px-3 py-1.5 font-mono text-xs uppercase tracking-widest rounded-full border transition-colors ${
    active
      ? 'border-ink bg-ink text-paper dark:border-white dark:bg-white dark:text-zinc-900'
      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-ink dark:hover:text-white'
  }`
}

const ACTION =
  'inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest transition-colors'

function MessageCard({
  item,
  onChange,
  onDelete,
}: {
  item: ContactMessage
  onChange: (change: MessageChange) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const when = new Date(item.createdAt)

  const toggle = () => {
    // Opening an unread message reads it.
    if (!open && !item.read) onChange({ read: true })
    setOpen(!open)
  }

  return (
    <article
      className={`rounded-xl border p-5 transition-colors ${
        item.read ? 'border-zinc-200 dark:border-zinc-800' : 'border-sage/60'
      }`}
    >
      <button onClick={toggle} aria-expanded={open} className="block w-full text-left">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-zinc-400">
          {!item.read && (
            <span className="inline-flex items-center gap-1.5 text-sage">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sage" />
              Unread
            </span>
          )}
          <time dateTime={item.createdAt}>
            {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
          <span className="text-ink">{item.name}</span>
          <span className="break-all">{item.email}</span>
          {item.replied && (
            <span className="inline-flex items-center gap-1 text-sage">
              <Check size={12} aria-hidden="true" />
              Replied
            </span>
          )}
        </div>
        <h2
          className={`mt-2 font-serif text-lg leading-snug break-words ${
            item.read ? 'font-light' : 'font-normal'
          }`}
        >
          {item.subject}
        </h2>
        {!open && <p className="mt-1 text-sm text-zinc-faded line-clamp-2 break-words">{item.message}</p>}
      </button>

      {open && (
        <>
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap break-words">{item.message}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <a href={replyLink(item)} className={`${ACTION} text-sage hover:underline`}>
              <Reply size={14} aria-hidden="true" />
              Reply by email
            </a>
            <button
              onClick={() => onChange({ replied: !item.replied })}
              aria-pressed={item.replied}
              className={`${ACTION} ${item.replied ? 'text-sage' : 'text-zinc-500 hover:text-ink dark:hover:text-white'}`}
            >
              <Check size={14} aria-hidden="true" />
              {item.replied ? 'Replied' : 'Mark replied'}
            </button>
            <button
              onClick={() => {
                onChange({ read: false })
                setOpen(false)
              }}
              className={`${ACTION} text-zinc-500 hover:text-ink dark:hover:text-white`}
            >
              <Mail size={14} aria-hidden="true" />
              Mark unread
            </button>
            <button
              onClick={onDelete}
              className={`${ACTION} ml-auto text-zinc-400 hover:text-red-500`}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  )
}

export default function AdminMessagesList() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [items, setItems] = useState<ContactMessage[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (offset: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await adminContactService.list(unreadOnly, offset, PAGE)
        setItems((previous) => (offset === 0 ? response.data : [...previous, ...response.data]))
        setTotal(response.pagination.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setIsLoading(false)
      }
    },
    [unreadOnly],
  )

  useEffect(() => {
    load(0)
  }, [load])

  const change = async (id: string, update: MessageChange) => {
    try {
      const { data } = await adminContactService.update(id, update)
      setItems((previous) => previous.map((item) => (item.id === id ? data : item)))
    } catch {
      alert('Failed to update the message')
    }
  }

  const remove = async (item: ContactMessage) => {
    if (!confirm(`Delete the message from ${item.name}? This cannot be undone.`)) return
    try {
      await adminContactService.remove(item.id)
      setItems((previous) => previous.filter((other) => other.id !== item.id))
      setTotal((n) => n - 1)
    } catch {
      alert('Failed to delete the message')
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="font-serif text-2xl font-light">Messages</h1>
          <p className="text-sm text-zinc-faded">
            Sent through the contact form. Each one is also emailed to you; replying there answers
            the sender.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={() => setUnreadOnly(false)} className={chip(!unreadOnly)}>
            All
          </button>
          <button onClick={() => setUnreadOnly(true)} className={chip(unreadOnly)}>
            Unread
          </button>
          <span className="ml-auto font-mono text-xs text-zinc-400">
            {total} message{total === 1 ? '' : 's'}
          </span>
        </div>

        {error ? (
          <div className="py-16 text-center">
            <p className="text-zinc-faded">{error}</p>
            <button
              onClick={() => load(0)}
              className="mt-4 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !isLoading && items.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-zinc-faded">
            <MailOpen size={28} aria-hidden="true" />
            <p className="font-serif text-xl">
              {unreadOnly ? 'Nothing unread' : 'No messages yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <MessageCard
                key={item.id}
                item={item}
                onChange={(update) => change(item.id, update)}
                onDelete={() => remove(item)}
              />
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          items.length < total && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => load(items.length)}
                className="font-mono text-xs uppercase tracking-widest text-sage hover:underline"
              >
                Load more
              </button>
            </div>
          )
        )}

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
