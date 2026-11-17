import { usePlay } from '../../components/explain/useLoop'
import { CLASS, CLASS_HUNT, GAPS, ON_LIST, TICKS } from './model'

// What the figure shows at each step of the story
export type RollStage = 'class' | 'ticks' | 'hunt' | 'crossed' | 'list' | 'reveal'

const NAME_W = 76
const CELL = { w: 52, h: 30 }
const COL = 62
const ROW = 42
const TOP = 46
const VERDICT_X = NAME_W + CLASS.items.length * COL + 14
const WIDTH = VERDICT_X + 120
const HEIGHT = TOP + CLASS.people.length * ROW + 34

const cellX = (y: number) => NAME_W + y * COL
const rowY = (x: number) => TOP + x * ROW

const PACE = 520

function Tick({ cx, cy, strong }: { cx: number; cy: number; strong: boolean }) {
  return (
    <path
      d={`M${cx - 8},${cy} l5,6 l11,-12`}
      className="fill-none stroke-sage"
      strokeWidth={strong ? 2.6 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function Cross({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M${cx - 6},${cy - 6} l12,12 M${cx + 6},${cy - 6} l-12,12`}
      className="fill-none stroke-ink"
      strokeWidth={2}
      strokeLinecap="round"
    />
  )
}

// A teacher's grid of students and homeworks, a tick where one came in.
// It plays the hunt for a missing homework row by row, then crosses off
// the students with a gap, and at the reveal relabels the same grid as
// x, y and P(x, y). Give it a `key` to play the hunt again.
export default function Roll({ stage }: { stage: RollStage }) {
  const hunting = stage === 'hunt'
  const played = usePlay(hunting ? CLASS_HUNT.length : 0, PACE)
  const done = hunting ? Math.floor(played) : stage === 'class' || stage === 'ticks' ? 0 : CLASS_HUNT.length
  const looking = hunting && played < CLASS_HUNT.length ? CLASS_HUNT[done] : undefined
  const seen = CLASS_HUNT.slice(0, done)
  const reveal = stage === 'reveal'

  // A row's hunt is over once its last look is seen
  const finished = (x: number) => {
    const looks = CLASS_HUNT.filter((look) => look.person === x)
    return seen.length > 0 && seen.includes(looks[looks.length - 1])
  }
  const gapOf = (x: number) => seen.find((look) => look.person === x && look.gap)

  const showVerdicts = stage === 'crossed' || stage === 'list' || reveal || hunting
  const onList = (x: number) => ON_LIST.includes(CLASS.people[x])
  const faded = (x: number) =>
    (stage === 'ticks' && x !== 1) || ((stage === 'list' || reveal) && !onList(x)) ? 0.4 : 1

  const status = looking
    ? `${CLASS.people[looking.person]}, ${CLASS.items[looking.item]}: ${CLASS.likes[looking.person][looking.item] ? 'handed in' : 'missing'}`
    : stage === 'ticks'
      ? `Ben: ${TICKS('Ben')} ticks, ${CLASS.items.length - TICKS('Ben')} gap`
      : stage === 'class'
        ? ' '
        : hunting
          ? `${GAPS.length} students with a gap`
        : reveal
          ? 'no counterexample ⇒ ∀y P(x, y)'
          : stage === 'list'
            ? `On the list: ${ON_LIST.join(', ')}`
            : 'One gap is enough'

  return (
    <div>
      <p className="text-right font-mono text-[0.875rem] uppercase tracking-widest text-ink">{status}</p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-3 w-full max-w-[30rem]"
        role="img"
        aria-label={`Four students and three homeworks. Ana and Dee handed in all three; Ben is missing HW 2; Cy is missing HW 1 and HW 3. ${reveal ? 'Each student is an x, each homework a y, a tick is P(x, y) and a gap is a counterexample.' : ''}`}
      >
        {/* Headers: the story's words, or the logic's at the reveal */}
        <text x={0} y={22} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {reveal ? 'x' : 'Student'}
        </text>
        {CLASS.items.map((item, y) => (
          <text
            key={item}
            x={cellX(y) + CELL.w / 2}
            y={22}
            textAnchor="middle"
            className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
          >
            {reveal ? `y = ${item.replace('HW ', 'h')}` : item}
          </text>
        ))}

        {CLASS.people.map((name, x) => {
          const cy = rowY(x) + CELL.h / 2
          const gap = gapOf(x)
          const over = finished(x)
          const struck = (stage === 'crossed' || stage === 'list' || reveal) && !onList(x)
          return (
            <g key={name} opacity={faded(x)}>
              <text x={0} y={cy + 4} className="fill-ink font-mono text-[11px]">
                {name}
              </text>
              {struck && <line x1={-2} x2={name.length * 7.5 + 2} y1={cy} y2={cy} className="stroke-ink" strokeWidth={1.5} />}
              {CLASS.items.map((item, y) => {
                const handed = CLASS.likes[x][y]
                const now = looking?.person === x && looking.item === y
                const found = gap?.item === y
                const checked = seen.some((look) => look.person === x && look.item === y)
                const box = found
                  ? 'fill-paper stroke-ink'
                  : handed
                    ? checked || stage === 'ticks'
                      ? 'fill-sage/25 stroke-sage'
                      : 'fill-sage/10 stroke-sage'
                    : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
                return (
                  <g key={item}>
                    <rect
                      x={cellX(y)}
                      y={rowY(x)}
                      width={CELL.w}
                      height={CELL.h}
                      rx={7}
                      className={box}
                      strokeWidth={found ? 2 : 1.2}
                      strokeDasharray={!handed && !found ? '3 4' : undefined}
                    />
                    {handed && <Tick cx={cellX(y) + CELL.w / 2} cy={cy} strong={stage === 'ticks' && x === 1} />}
                    {found && <Cross cx={cellX(y) + CELL.w / 2} cy={cy} />}
                    {now && (
                      <rect
                        x={cellX(y) - 4}
                        y={rowY(x) - 4}
                        width={CELL.w + 8}
                        height={CELL.h + 8}
                        rx={10}
                        className="fill-none stroke-ink"
                        strokeWidth={1.5}
                      />
                    )}
                  </g>
                )
              })}
              {showVerdicts && over && (
                <text
                  x={VERDICT_X}
                  y={cy + 4}
                  className={`${gap ? 'fill-ink' : 'fill-sage-ink'} font-mono text-[11px]`}
                >
                  {gap
                    ? reveal
                      ? `¬P(x, h${CLASS.items[gap.item].replace('HW ', '')})`
                      : `missing ${CLASS.items[gap.item]}`
                    : reveal
                      ? '∀y P(x, y)'
                      : stage === 'list'
                        ? 'on the list'
                        : 'none missing'}
                </text>
              )}
            </g>
          )
        })}

        {reveal && (
          <text
            x={WIDTH / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-zinc-faded font-mono text-[11px]"
          >
            tick = P(x, y) · gap = a counterexample
          </text>
        )}
      </svg>
    </div>
  )
}
