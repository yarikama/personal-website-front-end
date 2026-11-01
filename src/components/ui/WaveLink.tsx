import { Link } from 'react-router-dom'

const LABEL = 'font-mono font-medium text-[0.95rem] uppercase tracking-widest px-5 py-3'

// Two corners cut on the diagonal, after the isometric angles of the site's
// mark. The outline is the outer shape showing 1px around the inner one: on
// a 45° cut that takes the inner cut 0.586px (2 − √2) shorter.
const CUT = 'polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px)'
const CUT_INNER = 'polygon(10.414px 0, 100% 0, 100% calc(100% - 10.414px), calc(100% - 10.414px) 100%, 0 100%, 0 10.414px)'

// A way into a page on this site, in the hero's award style: sage outline,
// and on hover a wave of sage washes in (the .liquid-* classes in index.css)
// and an arrow opens at the end.
export default function WaveLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="liquid-trigger group inline-flex bg-sage/50 p-px transition-colors duration-300 hover:bg-sage focus-visible:bg-sage"
      style={{ clipPath: CUT }}
    >
      <span className="flex items-stretch bg-paper" style={{ clipPath: CUT_INNER }}>
        <span className="relative overflow-hidden">
          <span className={`block text-sage ${LABEL}`}>{children}</span>
          <span aria-hidden="true" className="liquid-foam" />
          <span aria-hidden="true" className="liquid-fill">
            <span className="liquid-fill-body">
              <span className={`liquid-fill-text flex items-center text-paper ${LABEL}`}>{children}</span>
            </span>
          </span>
        </span>
        {/* Opens as the wave reaches it, closes at once */}
        <span className="flex w-0 items-center justify-center overflow-hidden bg-sage text-paper transition-[width,padding] duration-300 group-hover:w-11 group-hover:px-3 group-hover:delay-[350ms] group-focus-visible:w-11 group-focus-visible:px-3 group-focus-visible:delay-[350ms]">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 7H13M13 7L7.5 1.5M13 7L7.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </Link>
  )
}
