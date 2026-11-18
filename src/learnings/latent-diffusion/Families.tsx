import { Link } from 'react-router-dom'
import { FAMILIES, TIMELINE } from './model'

const WIDTH = 560
const HEIGHT = 96
// Which line under the axis each label sits on, so none overlap
const ROWS = [0, 0, 1, 2]
const FROM = 2013
const TO = 2023
const LEFT = 24
const RIGHT = WIDTH - 24
const AXIS = 30
const at = (year: number) => LEFT + ((year - FROM) / (TO - FROM)) * (RIGHT - LEFT)

const COLUMNS = ['Speed', 'Quality', 'Variety'] as const
const KEYS = { Speed: 'speed', Quality: 'quality', Variety: 'variety' } as const

// When each family arrived, and how the four compare on making one image
export default function Families() {
  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={TIMELINE.map((t) => `${t.year}: ${t.what}`).join('; ')}>
        <line x1={LEFT} x2={RIGHT} y1={AXIS} y2={AXIS} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.5} />
        {[2014, 2016, 2018, 2020, 2022].map((year) => (
          <text key={year} x={at(year)} y={AXIS - 12} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tracking-widest">
            {year}
          </text>
        ))}
        {TIMELINE.map((t, i) => (
          <g key={t.what}>
            {ROWS[i] > 0 && (
              <line x1={at(t.year)} x2={at(t.year)} y1={AXIS + 6} y2={AXIS + 10 + ROWS[i] * 16} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            )}
            <circle cx={at(t.year)} cy={AXIS} r={5} className={t.year === 2022 ? 'fill-sage' : 'fill-ink'} />
            <text
              x={i === TIMELINE.length - 1 ? at(t.year) + 12 : at(t.year)}
              y={AXIS + 22 + ROWS[i] * 16}
              textAnchor={i === TIMELINE.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}
              className={`${t.year === 2022 ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px] uppercase tracking-widest`}
            >
              {t.what}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-6 grid grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] gap-x-3 gap-y-3 text-sm leading-snug">
        <span />
        {COLUMNS.map((c) => (
          <span key={c} className="font-mono text-[0.75rem] uppercase tracking-widest text-zinc-faded">
            {c}
          </span>
        ))}
        {FAMILIES.map((f) => (
          <div key={f.name} className="contents">
            <span className="text-ink">
              {f.to === '/learnings/latent-diffusion' ? f.name : <Link to={f.to} className="underline decoration-sage underline-offset-2">{f.name}</Link>}
            </span>
            {COLUMNS.map((c) => {
              const key = KEYS[c]
              return (
                <span key={c}>
                  <span className={f.weak.includes(key) ? 'rounded-md bg-ink/10 px-1.5 py-0.5 text-ink' : 'text-ink'}>{f[key]}</span>
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
