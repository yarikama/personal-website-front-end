import type { ReactNode } from 'react'
import MagazineLine from '../ui/MagazineLine'

export interface Source {
  title: string
  // Who wrote it, and where or when: "Martin Kleppmann, 2017"
  by: string
  // What part of it this page draws on: "Chapter 1, Percentiles in Practice"
  part?: string
  url?: string
}

interface ArticleProps {
  // Where the topic sits: "Data systems · Scalability"
  kicker: string
  title: string
  // What the reader will be able to answer by the end, as a question: it
  // says why to read on, without giving the answer away before they guess
  promise: ReactNode
  // The 20% that gives 80% of it: one sentence a reader should leave with,
  // shown at the end once they have seen why it is true
  takeaway: ReactNode
  sources: Source[]
  children: ReactNode
}

// A learning page: the question it answers, then prose and figures, then the
// one thing to remember and where it comes from. Text in the body is styled
// like a note; figures opt out of that styling themselves.
export default function Article({ kicker, title, promise, takeaway, sources, children }: ArticleProps) {
  return (
    <article>
      <header className="mb-12">
        <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">{kicker}</span>
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight mt-4 mb-8">{title}</h1>
        <p className="font-serif text-2xl font-light leading-snug text-zinc-faded">{promise}</p>
      </header>

      <div
        className="prose prose-zinc dark:prose-invert max-w-none
          prose-headings:font-serif prose-headings:font-light
          prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-4
          prose-p:text-zinc-faded prose-p:leading-relaxed
          prose-li:text-zinc-faded
          prose-strong:text-ink prose-strong:font-medium
          prose-a:text-sage prose-a:no-underline hover:prose-a:underline"
      >
        {children}
      </div>

      <div className="mt-16 border-l-2 border-sage pl-5">
        <span className="font-mono text-[0.8rem] uppercase tracking-widest text-sage">Remember this</span>
        <p className="mt-2 font-serif text-2xl font-light leading-snug">{takeaway}</p>
      </div>

      <MagazineLine className="mt-16 mb-8" />
      <footer>
        <h2 className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400 mb-4">Read more</h2>
        <ul className="flex flex-col gap-3">
          {sources.map((source) => (
            <li key={source.title} className="text-sm text-zinc-faded leading-relaxed">
              {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-sage italic">
                  {source.title}
                </a>
              ) : (
                <span className="text-ink italic">{source.title}</span>
              )}
              , {source.by}
              {source.part && <>. {source.part}</>}
            </li>
          ))}
        </ul>
      </footer>
    </article>
  )
}
