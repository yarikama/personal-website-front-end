import { useState } from 'react'
import { Link } from 'react-router-dom'
import ResponsiveImage from './ResponsiveImage'
import { ArrowUpRight } from 'lucide-react'
import MagazineLine from './MagazineLine'
import WaveLink from './WaveLink'
import { descriptionBlocks } from '../../lib/descriptionBlocks'

// Base project type that works with both API and local data
interface ProjectCardData {
  id: string
  slug?: string
  title: string
  description: string
  tags: string[]
  coverImage?: string | null
  link?: string | null
  github?: string | null
  metrics?: string | null
}

interface ProjectCardProps {
  project: ProjectCardData
  index: number
  featured?: boolean
  // Its story is written: say so on the card, not only by the link
  story?: boolean
  // The project in one line; shown instead of the description
  hook?: string
}

export default function ProjectCard({ project, index, featured = false, story = false, hook }: ProjectCardProps) {
  // Each project has a page of its own at /works/<slug>
  const page = project.slug ? `/works/${project.slug}` : null
  const formattedIndex = String(index + 1).padStart(2, '0')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  // The cover preview follows the pointer, so over the buttons below it would
  // sit on top of them: hide it there
  const [overLink, setOverLink] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!project.coverImage) return
    setOverLink((e.target as Element).closest('[data-actions]') !== null)
    setMousePosition({
      x: e.clientX,
      y: e.clientY,
    })
  }

  return (
    <article
      className="group relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      <MagazineLine className="mb-6" delay={index * 100} />

      {/* Hover Image Preview */}
      {project.coverImage && isHovering && !overLink && (
        <div
          className="
            pointer-events-none fixed z-50
            w-48 h-32 md:w-64 md:h-44
            rounded-lg overflow-hidden shadow-2xl
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            border border-zinc-200 dark:border-zinc-700
          "
          style={{
            left: mousePosition.x + 20,
            top: mousePosition.y - 80,
            transform: 'translate(0, 0)',
          }}
        >
          <ResponsiveImage src={project.coverImage} alt="" sizes="256px" loading="eager" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-4 mb-3">
            <span className="font-mono text-sm text-zinc-400">{formattedIndex}</span>
            <h3
              className={`
                font-serif font-light tracking-tight
                transition-colors duration-300
                ${featured ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}
              `}
            >
              {page ? (
                <Link to={page} className="hover:underline underline-offset-4">
                  {project.title}
                </Link>
              ) : project.link ? (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline underline-offset-4"
                >
                  {project.title}
                </a>
              ) : (
                project.title
              )}
            </h3>
          </div>

          {/* With a page of its own, the card is a preview: one line that
              makes the reader want to open it, or the first lines of the
              description; the rest is on the page */}
          {hook ? (
            <p className={`mb-5 max-w-2xl font-serif font-light leading-snug text-ink ${featured ? 'text-2xl md:text-[1.7rem]' : 'text-xl md:text-2xl'}`}>
              {hook}
            </p>
          ) : (
            <div
              className={`text-zinc-faded text-sm md:text-base leading-relaxed mb-4 max-w-2xl space-y-2 ${
                page ? 'line-clamp-3' : ''
              }`}
            >
              {descriptionBlocks(project.description).map((block, i) =>
                block.kind === 'list' ? (
                  <ul key={i} className="list-disc pl-5 space-y-1">
                    {block.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i}>{block.text}</p>
                ),
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[0.8rem] text-zinc-400 uppercase tracking-widest"
              >
                {tag}
              </span>
            ))}
          </div>

          {project.metrics && (
            <div className="mt-4 font-mono text-sm text-zinc-faded">
              {project.metrics}
            </div>
          )}

          {/* Always shown, not only on hover: the ask chat's citations land
              on this card, and these are where to go from it. */}
          {(page || project.github || (project.link && project.link !== project.github)) && (
            <div data-actions className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {page && <WaveLink to={page}>{story ? 'Read the story' : 'See the project'}</WaveLink>}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-sage hover:text-ink transition-colors"
                >
                  Code <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
              {project.link && project.link !== project.github && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-sage hover:text-ink transition-colors"
                >
                  Link <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>

        {!page && project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="
              p-2 text-zinc-400 hover:text-ink
              transition-colors duration-300
              opacity-0 group-hover:opacity-100 focus-visible:opacity-100
            "
            aria-label={`View ${project.title}`}
          >
            <ArrowUpRight size={20} />
          </a>
        )}
      </div>
    </article>
  )
}
