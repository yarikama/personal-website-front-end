import { Link } from 'react-router-dom'

const LABEL = 'font-mono font-medium text-[0.95rem] uppercase tracking-widest px-5 py-3'

// A way into a page on this site, in the hero's award style: sage outline
// with rounded corners, like the project covers it sits under, and on hover
// a wave of sage washes in (the .liquid-* classes in index.css) and an arrow
// opens at the end. `block` fills its container, label centred; the arrow
// then opens inside that width instead of growing past it.
export default function WaveLink({ to, children, block = false }: { to: string; children: string; block?: boolean }) {
  return (
    <Link
      to={to}
      className={`liquid-trigger group items-stretch overflow-hidden rounded-xl border border-sage/50 transition-colors duration-300 hover:border-sage focus-visible:border-sage ${
        block ? 'flex w-full' : 'inline-flex'
      }`}
    >
      <span className={`relative overflow-hidden ${block ? 'flex-1' : ''}`}>
        <span className={`block text-sage ${LABEL} ${block ? 'text-center' : ''}`}>{children}</span>
        <span aria-hidden="true" className="liquid-foam" />
        <span aria-hidden="true" className="liquid-fill">
          <span className="liquid-fill-body">
            <span className={`liquid-fill-text flex items-center text-paper ${LABEL} ${block ? 'justify-center' : ''}`}>
              {children}
            </span>
          </span>
        </span>
      </span>
      {/* Opens as the wave reaches it, closes at once */}
      <span className="flex w-0 items-center justify-center overflow-hidden bg-sage text-paper transition-[width,padding] duration-300 group-hover:w-11 group-hover:px-3 group-hover:delay-[350ms] group-focus-visible:w-11 group-focus-visible:px-3 group-focus-visible:delay-[350ms]">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M1 7H13M13 7L7.5 1.5M13 7L7.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  )
}
