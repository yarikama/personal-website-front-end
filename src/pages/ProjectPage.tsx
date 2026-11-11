import { useEffect, useState, type ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Built } from '../components/case/CaseStudy'
import Section from '../components/layout/Section'
import { useProjects } from '../hooks'
import { descriptionBlocks } from '../lib/descriptionBlocks'
import { findCaseStudy } from '../projects'
import type { Project } from '../types'
import { usePageMeta } from '../lib/pageMeta'

// A project's own page at /works/:slug: its story when one is written (code
// in src/projects, loaded on opening), otherwise its card set out as a page.
// Either way it ends with the next project, so a reader can go on.
export default function ProjectPage() {
  const { slug } = useParams()
  const { projects, isLoading, error } = useProjects()
  const index = projects.findIndex((project) => project.slug === slug)
  const project = index >= 0 ? projects[index] : null
  const next = projects.length > 1 && index >= 0 ? projects[(index + 1) % projects.length] : null
  const { Page, failed } = useCaseStudy(slug)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  usePageMeta(
    project
      ? { title: project.title, description: project.description, image: project.coverImage, type: 'article' }
      : null,
  )

  const back = (
    <Link
      to="/works"
      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors mb-12"
    >
      <ArrowLeft size={14} />
      All works
    </Link>
  )

  // Wait for the story too, so the page doesn't flash its card first
  const story = findCaseStudy(slug)
  if (isLoading || (story && !Page && !failed && project)) {
    return (
      <div className="pt-24">
        <Section reading>
          {back}
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-zinc-400" />
        </Section>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="pt-24">
        <Section reading>
          {back}
          <p className="font-serif text-2xl text-zinc-faded italic">
            {error ? 'This project did not load. Try reloading the page.' : 'There is no project here.'}
          </p>
        </Section>
      </div>
    )
  }

  return (
    <div className="pt-24">
      <Section reading>
        {back}
        {Page ? <Page project={project} /> : <ProjectCardPage project={project} />}
        {next && (
          <Link
            to={`/works/${next.slug}`}
            className="group mt-16 flex w-full items-center justify-between gap-4 border border-ink px-5 py-4 text-left transition-colors hover:bg-ink hover:text-paper"
          >
            <span className="flex flex-col gap-1">
              <span className="font-mono text-[0.875rem] uppercase tracking-widest text-sage group-hover:text-paper">
                Next project
              </span>
              <span className="font-serif text-2xl font-light leading-tight">{next.title}</span>
            </span>
            <ArrowRight size={18} className="shrink-0" />
          </Link>
        )}
      </Section>
    </div>
  )
}

// A project's story component, loaded on first use. `Page` is null while it
// loads, and for a project with no story written.
function useCaseStudy(slug: string | undefined) {
  const entry = findCaseStudy(slug)
  const [loaded, setLoaded] = useState<{ slug: string; Page: ComponentType<{ project: Project }> } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!entry) return
    let live = true
    setFailed(false)
    entry
      .load()
      .then(({ default: Page }) => live && setLoaded({ slug: entry.slug, Page }))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [entry])
  const Page = loaded && loaded.slug === entry?.slug ? loaded.Page : null
  return { Page, failed }
}

// A project with no story yet: its card, laid out as a page
function ProjectCardPage({ project }: { project: Project }) {
  const results = project.metrics ? project.metrics.split(/\s+·\s+/).filter(Boolean) : []
  return (
    <article>
      <header className="mb-12">
        <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">
          {project.category.label} · {project.year}
        </span>
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight mt-4">{project.title}</h1>
      </header>
      {results.length > 0 && (
        <ul className="mb-10 grid grid-cols-1 sm:grid-cols-3 border-y border-zinc-200 dark:border-zinc-200/20 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-200/20">
          {results.map((result) => (
            <li key={result} className="px-4 py-5 font-serif text-xl font-light leading-snug sm:text-center">
              {result}
            </li>
          ))}
        </ul>
      )}
      <div className="mb-12 flex flex-col gap-4 text-lg leading-relaxed text-zinc-faded">
        {descriptionBlocks(project.description).map((block, i) =>
          block.kind === 'list' ? (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{block.text}</p>
          )
        )}
      </div>
      <Built project={project} />
    </article>
  )
}
