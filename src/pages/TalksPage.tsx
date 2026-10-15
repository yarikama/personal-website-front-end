import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Section from '../components/layout/Section'
import MagazineLine from '../components/ui/MagazineLine'
import { formatTalkDate, publicTalks } from '../talks'

// The public talks and lessons. Private ones are reached only by their links.
export default function TalksPage() {
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
          <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Talks</span>
          <h1 className="font-serif text-5xl md:text-6xl font-light mt-4 tracking-tight">Talks and Lessons</h1>
          <p className="mt-6 text-zinc-faded max-w-2xl text-lg">
            Interactive slides from talks I have given and things I have taught. Open one and step through it with
            the arrow keys.
          </p>
        </div>

        <MagazineLine className="mb-12" />

        {publicTalks.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl text-zinc-faded italic mb-4">Coming Soon</p>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">The first public talk is in the works.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {publicTalks.map((talk, index) => (
              <Link key={talk.slug} to={`/talks/${talk.slug}`} className="group block">
                <article>
                  <div className="mb-4 flex items-center justify-between gap-4 font-mono text-[0.8rem] text-zinc-400 uppercase tracking-widest">
                    <time dateTime={talk.date}>{formatTalkDate(talk.date)}</time>
                    <span>{talk.venue ? `${talk.kind} · ${talk.venue}` : talk.kind}</span>
                  </div>

                  <h2 className="font-serif text-2xl font-light tracking-tight mb-3">{talk.title}</h2>

                  <p className="text-sm text-zinc-faded leading-relaxed mb-4">{talk.summary}</p>

                  <div className="flex items-center gap-2 text-zinc-faded group-hover:text-ink transition-colors duration-300">
                    <span className="font-mono text-xs uppercase tracking-widest">Open slides</span>
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
            {publicTalks.length} talk{publicTalks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </Section>
    </div>
  )
}
