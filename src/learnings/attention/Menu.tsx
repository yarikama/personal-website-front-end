import { usePlay } from '../../components/explain/useLoop'
import Grid, { WIDTH } from './Grid'
import { STORY, STORY_WEIGHTS } from './model'

export type Show = 'menu' | 'memory' | 'dark' | 'rest' | 'grid' | 'named'

// ms for a row of glances to fill in
const PACE = 700

// The menu line read aloud: first from memory, then glancing back at it
// for each English word. Give it a `key` per step, so it plays from the start.
export default function Menu({ show }: { show: Show }) {
  if (show === 'menu') return <Line />
  if (show === 'memory') return <Memory />
  return <Glances show={show} />
}

const n = STORY.source.length
const column = (j: number, inset = 70) => inset + (j * (WIDTH - 2 * inset)) / (n - 1)

// The French line on its own, as on the menu
function Line() {
  return (
    <svg viewBox={`0 0 ${WIDTH} 120`} className="mx-auto w-full max-w-[36rem]" role="img" aria-label="The menu line: mousse au chocolat noir">
      <rect x={30} y={22} width={WIDTH - 60} height={76} rx={14} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      <text x={WIDTH / 2} y={44} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        Desserts
      </text>
      {STORY.source.map((word, j) => (
        <text key={j} x={column(j, 100)} y={78} textAnchor="middle" className="fill-ink font-serif text-[20px]">
          {word}
        </text>
      ))}
    </svg>
  )
}

// Read once, then said from one memory of the whole line: the words pour
// into a single dot, and what comes out has lost a detail
function Memory() {
  const played = usePlay(3, PACE)
  const pour = Math.min(1, played)
  const out = Math.max(0, Math.min(1, played - 1.4))
  const hub = { x: WIDTH / 2, y: 112 }
  const english = ['dark?', 'chocolate', 'mousse']
  return (
    <svg
      viewBox={`0 0 ${WIDTH} 220`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label="The four French words all flow into one memory, and the English said from it is unsure whether the chocolate was dark"
    >
      {STORY.source.map((word, j) => (
        <g key={j}>
          <text x={column(j)} y={30} textAnchor="middle" className="fill-ink font-serif text-[18px]">
            {word}
          </text>
          <line
            x1={column(j)}
            y1={42}
            x2={column(j) + (hub.x - column(j)) * pour}
            y2={42 + (hub.y - 14 - 42) * pour}
            className="stroke-sage"
            strokeWidth={1.5}
          />
        </g>
      ))}
      <circle cx={hub.x} cy={hub.y} r={14} className="fill-sage" fillOpacity={0.15 + 0.85 * pour} />
      <text x={hub.x + 24} y={hub.y + 4} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        one memory
      </text>
      {english.map((word, t) => (
        <g key={t} opacity={out}>
          <line
            x1={hub.x}
            y1={hub.y + 14}
            x2={column(t) + (column(t + 1) - column(t)) / 2}
            y2={176}
            className="stroke-zinc-300 dark:stroke-zinc-200/25"
          />
          <text
            x={column(t) + (column(t + 1) - column(t)) / 2}
            y={200}
            textAnchor="middle"
            className={`font-serif text-[18px] ${t === 0 ? 'fill-zinc-faded' : 'fill-ink'}`}
          >
            {word}
          </text>
        </g>
      ))}
    </svg>
  )
}

// The glances, row by row: "dark" alone, then the other two, then the
// whole grid with each row's total, then relabelled as the network
function Glances({ show }: { show: Exclude<Show, 'menu' | 'memory'> }) {
  const played = usePlay(2, PACE)
  const shown =
    show === 'dark'
      ? [played, 0, 0]
      : show === 'rest'
        ? [1, Math.min(1, played), Math.max(0, played - 1)]
        : [1, 1, 1]
  const focus = show === 'dark' ? 0 : show === 'rest' ? (played < 1 ? 1 : 2) : undefined
  return (
    <Grid
      source={STORY.source}
      target={STORY.target}
      weights={STORY_WEIGHTS}
      shown={shown}
      focus={focus}
      tops={show === 'grid'}
      sums={show === 'grid'}
      named={show === 'named'}
    />
  )
}
