import { createContext, useContext, useId, type ReactNode } from 'react'
import { AGES, ageX, BOTTOM, HEIGHT, LEFT, priceY, RIGHT, TOP, WIDTH, type Scale } from './chartScale'
import { priceAt, type Line, type Sale } from './model'

// The pieces every bike chart is drawn with

// The plot's clip, unique to each chart on the page
const ClipId = createContext('')
const useClip = () => `url(#${useContext(ClipId)})`

// Anything that should stop at the chart's edges
export function Clipped({ children }: { children: ReactNode }) {
  return <g clipPath={useClip()}>{children}</g>
}

// The line across the whole chart, clipped to it
export function LinePath({
  line,
  scale,
  className,
  dashed = false,
  width = 2.5,
}: {
  line: Line
  scale: Scale
  className: string
  dashed?: boolean
  width?: number
}) {
  const clip = useClip()
  return (
    <line
      x1={ageX(AGES[0])}
      y1={priceY(priceAt(line, AGES[0]), scale)}
      x2={ageX(AGES[1])}
      y2={priceY(priceAt(line, AGES[1]), scale)}
      className={`pointer-events-none ${className}`}
      strokeWidth={width}
      strokeDasharray={dashed ? '6 5' : undefined}
      strokeLinecap="round"
      clipPath={clip}
    />
  )
}

// A sale's miss: the gap from the line to the sale, and with `square` the
// square with that gap for a side, drawn beside it, away from the chart's edge
export function Miss({
  sale,
  line,
  scale,
  square,
  grow = 1,
  strong = false,
}: {
  sale: Sale
  line: Line
  scale: Scale
  square: boolean
  grow?: number
  strong?: boolean
}) {
  const x = ageX(sale.age)
  const y = priceY(sale.price, scale)
  const onLine = priceY(priceAt(line, sale.age), scale)
  const side = Math.abs(onLine - y) * grow
  const right = x + side <= RIGHT
  const clip = useClip()
  return (
    <g className="pointer-events-none">
      {square && side > 0.5 && (
        <rect
          x={right ? x : x - side}
          y={y < onLine ? onLine - side : onLine}
          width={side}
          height={side}
          className={strong ? 'fill-ink/15 stroke-ink' : 'fill-ink/[0.07] stroke-ink/50'}
          strokeWidth={1}
          clipPath={clip}
        />
      )}
      <line x1={x} x2={x} y1={y} y2={onLine} className="stroke-ink" strokeWidth={1.5} clipPath={clip} />
    </g>
  )
}

export function Dot({ sale, scale, odd = false }: { sale: Sale; scale: Scale; odd?: boolean }) {
  return (
    <circle
      cx={ageX(sale.age)}
      cy={priceY(sale.price, scale)}
      r={6}
      className={odd ? 'fill-paper stroke-ink' : 'fill-ink'}
      strokeWidth={2}
    />
  )
}

// The frame: grid, ticks, axis names, and whatever is drawn inside
export function Plot({
  scale,
  label,
  ageName = 'Age (years)',
  priceName = 'Price',
  children,
}: {
  scale: Scale
  label: string
  ageName?: string
  priceName?: string
  children: ReactNode
}) {
  const step = scale.high - scale.low > 600 ? 200 : 100
  const prices: number[] = []
  for (let p = Math.ceil(scale.low / step) * step; p <= scale.high; p += step) prices.push(p)
  // Only letters and digits, so url(#…) finds it in every browser
  const id = `least-squares-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const ages = Array.from({ length: AGES[1] - AGES[0] + 1 }, (_, i) => AGES[0] + i)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      <defs>
        <clipPath id={id}>
          <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} />
        </clipPath>
      </defs>
      {prices.map((p) => (
        <g key={p}>
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={priceY(p, scale)}
            y2={priceY(p, scale)}
            className="stroke-zinc-300 dark:stroke-zinc-200/15"
            strokeWidth={1}
          />
          <text
            x={LEFT - 8}
            y={priceY(p, scale) + 4}
            textAnchor="end"
            className="fill-zinc-faded font-mono text-[11px] tabular-nums"
          >
            ${p}
          </text>
        </g>
      ))}
      {ages.map((a) => (
        <text
          key={a}
          x={ageX(a)}
          y={BOTTOM + 16}
          textAnchor="middle"
          className="fill-zinc-faded font-mono text-[11px] tabular-nums"
        >
          {a}
        </text>
      ))}
      <text
        x={(LEFT + RIGHT) / 2}
        y={HEIGHT - 6}
        textAnchor="middle"
        className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
      >
        {ageName}
      </text>
      <text x={LEFT + 6} y={TOP + 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {priceName}
      </text>
      <ClipId.Provider value={id}>{children}</ClipId.Provider>
    </svg>
  )
}
