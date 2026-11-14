import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Section from '../components/layout/Section'
import MagazineLine from '../components/ui/MagazineLine'
import { useLabNotes, useLabNoteTags } from '../hooks'
import { ArrowLeft, ArrowUpRight, Loader2 } from 'lucide-react'
import { PAGES, usePageMeta } from '../lib/pageMeta'

export default function NotesPage() {
  usePageMeta(PAGES.notes)
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined)
  const { notes, isLoading, error } = useLabNotes({ tag: activeTag })
  const { tags } = useLabNoteTags()

  const allTags = useMemo(() => {
    return [{ tag: 'All', count: 0 }, ...tags]
  }, [tags])

  return (
    <div className="pt-24">
      <Section>
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors mb-12"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        <div className="mb-16">
          <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">
            Lab Notes
          </span>
          <h1 className="font-serif text-5xl md:text-6xl font-light mt-4 tracking-tight">
            Technical Writings
          </h1>
          <p className="mt-6 text-zinc-faded max-w-2xl text-lg md:text-xl leading-relaxed">
            Essays and explorations on software engineering, machine learning theory, and the
            philosophy of building systems that endure.
          </p>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-12">
            {allTags.map((tagItem) => (
              <button
                key={tagItem.tag}
                onClick={() => setActiveTag(tagItem.tag === 'All' ? undefined : tagItem.tag)}
                className={`
                  font-mono text-xs uppercase tracking-widest
                  px-3 py-1.5 border transition-colors duration-300
                  ${
                    (tagItem.tag === 'All' && !activeTag) || activeTag === tagItem.tag
                      ? 'border-ink text-ink bg-ink/5 dark:border-zinc-400 dark:bg-zinc-400/10'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-faded hover:border-zinc-400 hover:text-ink'
                  }
                `}
              >
                {tagItem.tag}
                {tagItem.count > 0 && (
                  <span className="ml-1.5 opacity-60">({tagItem.count})</span>
                )}
              </button>
            ))}
          </div>
        )}

        <MagazineLine className="mb-12" />

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
            <p className="text-sm text-zinc-400">Loading notes...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl text-zinc-faded">
              Unable to load notes at this time.
            </p>
          </div>
        ) : notes.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl text-zinc-faded mb-4">
              Coming Soon
            </p>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Technical writings on AI systems, distributed architectures, and engineering
              philosophy are in progress.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {notes.map((note, index) => (
              <Link
                key={note.id}
                to={`/notes/${note.slug}`}
                className="group block"
              >
                <article className="h-full">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[0.875rem] text-zinc-400 uppercase tracking-widest">
                      {new Date(note.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="font-mono text-[0.875rem] text-zinc-400 uppercase tracking-widest">
                      {note.readTime}
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl font-light tracking-tight transition-colors duration-300 mb-3">
                    {note.title}
                  </h2>

                  <p className="text-sm text-zinc-faded leading-relaxed mb-4">
                    {note.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[0.8rem] text-zinc-400 uppercase tracking-widest px-2 py-0.5 border border-zinc-200 dark:border-zinc-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-zinc-faded group-hover:text-ink transition-colors duration-300">
                    <span className="font-mono text-xs uppercase tracking-widest">Read</span>
                    <ArrowUpRight
                      size={14}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                  </div>

                  <MagazineLine className="mt-6" delay={index * 50} />
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-200/20">
          <p className="font-mono text-sm text-zinc-400 uppercase tracking-widest text-center">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
            {activeTag && ` / ${activeTag}`}
          </p>
        </div>
      </Section>
    </div>
  )
}
