import { Link } from 'react-router-dom'
import Section from '../layout/Section'
import FeaturedCard from '../ui/FeaturedCard'
import TopoField from '../ui/TopoField'
import { useFeaturedProjects } from '../../hooks'
import { hookOf } from '../../projects/hooks'
import { Loader2 } from 'lucide-react'

export default function BriefSelection() {
  const { projects, isLoading, error } = useFeaturedProjects()

  return (
    <Section id="works">
      {/* The heading, with the way to every project beside it, over a contour field that fades out before the text */}
      <div className="relative mb-14 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <TopoField className="absolute -right-10 -top-16 h-[calc(100%+7rem)] w-[min(62%,40rem)] [mask-image:linear-gradient(to_right,transparent,#000_25%,#000_92%,transparent),linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in] max-md:w-full max-md:-right-4 max-md:opacity-80" />
        <div className="relative">
          <span className="font-mono text-sm text-zinc-faded uppercase tracking-widest">
            Selected Works
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-light mt-4 tracking-tight">
            Featured Projects
          </h2>
        </div>
        <Link
          to="/works"
          className="relative pb-1.5 font-mono text-sm uppercase tracking-widest text-sage-ink transition-colors duration-300 hover:text-ink"
        >
          All works →
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-faded mb-4" />
          <p className="text-sm text-zinc-faded">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="font-serif text-xl text-zinc-faded">
            Unable to load projects at this time.
          </p>
        </div>
      ) : (
        <div className="grid gap-14">
          {/* Covers alternate sides down the list */}
          {projects.map((project, index) => (
            <FeaturedCard key={project.id} project={project} hook={hookOf(project.slug)} flip={index % 2 === 1} />
          ))}
        </div>
      )}
    </Section>
  )
}
