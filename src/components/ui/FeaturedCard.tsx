import { Link } from 'react-router-dom'
import HairlineFigure from '../figures/HairlineFigure'
import ResponsiveImage from './ResponsiveImage'
import TagStrip from './TagStrip'
import { figureOf } from '../../projects/figures'

interface FeaturedCardData {
  slug?: string
  title: string
  description: string
  coverImage?: string | null
  tags?: string[]
}

/**
 * A featured project on the home page, trimmed to what makes a reader open
 * it: the cover, the title, one line, and its tags folded into strips that
 * open under the pointer. Numbers and links live on the project's page. The
 * whole card is one link to that page.
 */
// `flip` puts the cover on the right on a wide screen, so a list of cards can
// alternate sides; on a phone the cover is always above the text.
export default function FeaturedCard({ project, hook, flip = false }: { project: FeaturedCardData; hook?: string; flip?: boolean }) {
  const figure = figureOf(project.slug)
  const page = project.slug ? `/works/${project.slug}` : null
  // Without a written hook, the description's first lines stand in for it
  const line = hook ?? project.description.split('\n').find((l) => l.trim())?.replace(/^[-*]\s*/, '') ?? ''

  const body = (
    <>
      {(figure || project.coverImage) && (
        // The cover is decoration here: the link is named by the title and the line under it
        <div aria-hidden="true" className={`aspect-[8/5] w-full max-w-full ${flip ? 'md:order-last' : ''}`}>
          {figure ? (
            <HairlineFigure figure={figure} className="mx-auto h-full" />
          ) : (
            <ResponsiveImage src={project.coverImage!} alt="" sizes="(min-width: 768px) 320px, 100vw" className="h-full w-full object-contain" />
          )}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="mb-3 font-serif text-[1.6rem] md:text-[1.9rem] leading-tight tracking-tight text-balance">
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0_1px] bg-[position:0_100%] transition-[background-size] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:bg-[length:100%_1px] group-focus-visible:bg-[length:100%_1px]">
            {project.title}
          </span>
        </h3>
        <p className="max-w-xl font-serif text-xl md:text-[1.4rem] leading-snug text-ink-light line-clamp-3">{line}</p>
        {project.tags && project.tags.length > 0 && (
          <div className="mt-6">
            <TagStrip tags={project.tags} />
          </div>
        )}
      </div>
    </>
  )

  const layout = `group grid items-center gap-5 md:gap-10 ${flip ? 'md:grid-cols-[minmax(0,1fr)_20rem]' : 'md:grid-cols-[20rem_minmax(0,1fr)]'}`
  return page ? (
    <Link to={page} className={`${layout} rounded-xl focus-visible:outline-offset-8`}>
      {body}
    </Link>
  ) : (
    <article className={layout}>{body}</article>
  )
}
