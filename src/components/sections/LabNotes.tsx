import { Link } from 'react-router-dom'
import Section from '../layout/Section'
import { useLabNotes } from '../../hooks'
import { ArrowUpRight, Loader2 } from 'lucide-react'

export default function LabNotes() {
  const { notes, isLoading, error } = useLabNotes({ limit: 3 })
  const hasNotes = notes.length > 0

  return (
    <Section id="notes">
      <div className="mb-16">
        <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">
          Lab Notes
        </span>
        <h2 className="font-serif text-4xl md:text-5xl font-light mt-4 tracking-tight">
          Technical
          <br />
          Writings
        </h2>
        <p className="mt-4 text-lg md:text-xl leading-relaxed text-zinc-faded max-w-2xl">
          Essays and explorations on software engineering, machine learning theory, and the
          philosophy of building systems that endure.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      ) : error || !hasNotes ? (
        <div className="py-12 text-center">
          <p className="font-serif text-xl text-zinc-faded mb-4">
            Coming Soon
          </p>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Technical writings on AI systems, distributed architectures, and engineering
            philosophy are in progress.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {notes.map((note, index) => (
            <Link
              key={note.id}
              to={`/notes/${note.slug}`}
              className="group block"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-baseline justify-between gap-4 py-4 border-b border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-400 transition-colors">
                <div className="flex items-baseline gap-4 min-w-0">
                  <span className="font-mono text-sm text-zinc-400 shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-serif text-xl md:text-2xl font-light tracking-tight transition-colors duration-300 truncate">
                    {note.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest hidden sm:block">
                    {note.readTime}
                  </span>
                  <ArrowUpRight
                    size={16}
                    className="text-zinc-400 group-hover:text-ink transition-colors duration-300"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link
          to="/notes"
          className="
            inline-block font-mono text-xs uppercase tracking-widest
            text-zinc-faded hover:text-ink
            border-b border-zinc-300 hover:border-ink
            pb-1 transition-colors duration-300
          "
        >
          View All Notes
        </Link>
      </div>
    </Section>
  )
}
