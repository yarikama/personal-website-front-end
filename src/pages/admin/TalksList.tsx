import { useEffect, useState } from 'react'
import { Check, Copy, Eye, EyeOff, Presentation, SquareArrowOutUpRight } from 'lucide-react'
import AdminNav from '../../components/admin/AdminNav'
import type { TalkContent, TalkEntry } from '../../components/talk/talk'
import { formatTalkDate, talks } from '../../talks'

type Filter = 'all' | TalkEntry['visibility']

function chip(active: boolean) {
  return `px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
    active
      ? 'border-ink bg-ink text-paper dark:border-white dark:bg-white dark:text-zinc-900'
      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-ink dark:hover:text-white'
  }`
}

const ACTION = 'inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest transition-colors'

// Slide count and planned minutes, read from each talk's slides; null while
// they load, or if they fail to
function useTalkContents() {
  const [contents, setContents] = useState<Record<string, TalkContent | null>>({})
  useEffect(() => {
    let live = true
    for (const talk of talks) {
      talk
        .load()
        .then(({ default: content }) => live && setContents((previous) => ({ ...previous, [talk.slug]: content })))
        .catch(() => live && setContents((previous) => ({ ...previous, [talk.slug]: null })))
    }
    return () => {
      live = false
    }
  }, [])
  return contents
}

function TalkCard({ talk, content }: { talk: TalkEntry; content: TalkContent | null | undefined }) {
  const [copied, setCopied] = useState(false)
  const path = `/talks/${talk.slug}`
  const isPublic = talk.visibility === 'public'
  const minutes = content?.sections.reduce((sum, section) => sum + section.minutes, 0)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // The clipboard can be refused; the link is still on the page to copy by hand
    }
  }

  return (
    <article className="border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-zinc-400">
        <span className={`inline-flex items-center gap-1.5 ${isPublic ? 'text-sage' : ''}`}>
          {isPublic ? <Eye size={12} aria-hidden="true" /> : <EyeOff size={12} aria-hidden="true" />}
          {isPublic ? 'Public' : 'Private'}
        </span>
        <span className="uppercase tracking-widest">{talk.kind}</span>
        <time dateTime={talk.date}>{formatTalkDate(talk.date)}</time>
        {talk.venue && <span>{talk.venue}</span>}
        <span className="ml-auto">
          {content === undefined
            ? '…'
            : content === null
              ? 'Slides did not load'
              : `${content.slides.length} slides · ${minutes} min`}
        </span>
      </div>
      <h2 className="mt-2 font-serif text-lg leading-snug">{talk.title}</h2>
      <p className="mt-1 text-sm text-zinc-faded">{talk.summary}</p>
      <p className="mt-2 font-mono text-xs text-zinc-400 break-all">{path}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <a href={path} target="_blank" rel="noopener noreferrer" className={`${ACTION} text-sage hover:underline`}>
          <SquareArrowOutUpRight size={14} aria-hidden="true" />
          Open
        </a>
        <a
          href={`${path}/presenter`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${ACTION} text-zinc-500 hover:text-ink dark:hover:text-white`}
        >
          <Presentation size={14} aria-hidden="true" />
          Presenter
        </a>
        <button onClick={copyLink} className={`${ACTION} text-zinc-500 hover:text-ink dark:hover:text-white`}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </article>
  )
}

// Every talk, public and private. Talks are written in code (src/talks), so
// this is a directory, not an editor.
export default function AdminTalksList() {
  const [filter, setFilter] = useState<Filter>('all')
  const contents = useTalkContents()
  const shown = talks.filter((talk) => filter === 'all' || talk.visibility === filter)
  const count = (visibility: TalkEntry['visibility']) => talks.filter((talk) => talk.visibility === visibility).length

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0f0f0f]">
      <AdminNav />

      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="font-serif text-2xl font-light">Talks</h1>
          <p className="text-sm text-zinc-faded">
            Public talks are listed on /talks. Private ones open only from their link and are kept out of search,
            but their slides are still in the site&rsquo;s code. Add or change a talk in src/talks.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={() => setFilter('all')} className={chip(filter === 'all')}>
            All
          </button>
          <button onClick={() => setFilter('public')} className={chip(filter === 'public')}>
            Public ({count('public')})
          </button>
          <button onClick={() => setFilter('private')} className={chip(filter === 'private')}>
            Private ({count('private')})
          </button>
          <span className="ml-auto font-mono text-xs text-zinc-400">
            {talks.length} talk{talks.length === 1 ? '' : 's'}
          </span>
        </div>

        {shown.length === 0 ? (
          <p className="py-16 text-center text-zinc-faded">No {filter} talks yet.</p>
        ) : (
          <div className="grid gap-4">
            {shown.map((talk) => (
              <TalkCard key={talk.slug} talk={talk} content={contents[talk.slug]} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
