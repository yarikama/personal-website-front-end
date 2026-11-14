import { Link } from 'react-router-dom'
import Section from '../layout/Section'
import ProjectCard from '../ui/ProjectCard'
import { useFeaturedProjects } from '../../hooks'
import { findCaseStudy } from '../../projects'
import { hookOf } from '../../projects/hooks'
import { Loader2 } from 'lucide-react'

export default function BriefSelection() {
  const { projects, isLoading, error } = useFeaturedProjects()

  return (
    <Section id="works">
      <div className="mb-16">
        <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">
          Selected Works
        </span>
        <h2 className="font-serif text-4xl md:text-5xl font-light mt-4 tracking-tight">
          Featured Projects
        </h2>
        <p className="mt-4 text-lg md:text-xl leading-relaxed text-zinc-faded max-w-2xl">
          A curated selection of projects that represent my approach to engineering: thoughtful
          architecture, clean implementation, and measurable impact.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
          <p className="text-sm text-zinc-400">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="font-serif text-xl text-zinc-faded">
            Unable to load projects at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} featured story={!!findCaseStudy(project.slug)} hook={hookOf(project.slug)} />
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link
          to="/works"
          className="
            inline-block font-mono text-xs uppercase tracking-widest
            text-zinc-faded hover:text-ink
            border-b border-zinc-300 hover:border-ink
            pb-1 transition-colors duration-300
          "
        >
          View All Works
        </Link>
      </div>
    </Section>
  )
}
