import Labelled from '../../components/explain/Labelled'
import { lerp, usePlay } from '../../components/explain/useLoop'
import Notebook from './Notebook'
import { FRIDGE, MONDAY, PAIRS, policyOf, SHELVES, STORY_DAY, storyRuns, TUESDAY, tried, triedShelves } from './model'

const WIDTH = 640
const HEIGHT = 230

const SLOT = { w: 28, h: 52, gap: 8 }
const PER_ROW = FRIDGE / 2

// Where bottle `i` stands in a fridge drawn at (fx, fy)
const slot = (fx: number, fy: number, i: number) => ({
  x: fx + SLOT.gap + (i % PER_ROW) * (SLOT.w + SLOT.gap),
  y: fy + SLOT.gap + Math.floor(i / PER_ROW) * (SLOT.h + SLOT.gap),
})
const FRIDGE_W = PER_ROW * (SLOT.w + SLOT.gap) + SLOT.gap
const FRIDGE_H = 2 * (SLOT.h + SLOT.gap) + SLOT.gap

function Bottle({ x, y, tone, opacity = 1 }: { x: number; y: number; tone: 'left' | 'bought'; opacity?: number }) {
  const fill = tone === 'bought' ? 'fill-sage' : 'fill-zinc-400'
  return (
    <g opacity={opacity}>
      <rect x={x + SLOT.w / 2 - 5} y={y + 6} width={10} height={7} rx={1.5} className={fill} />
      <rect x={x + 5} y={y + 12} width={SLOT.w - 10} height={SLOT.h - 14} rx={4} className={fill} />
    </g>
  )
}

// A fridge of FRIDGE bottles at (fx, fy): `left` grey bottles from
// yesterday, then `bought` new ones in sage, dropping in one after another
// as `drop` goes from 0 to 1
function Fridge({ fx, fy, left, bought, drop = 1 }: { fx: number; fy: number; left: number; bought: number; drop?: number }) {
  return (
    <g>
      <rect x={fx} y={fy} width={FRIDGE_W} height={FRIDGE_H} rx={5} className="fill-paper stroke-zinc-400" strokeWidth={1.5} />
      <line x1={fx} x2={fx + FRIDGE_W} y1={fy + FRIDGE_H / 2} y2={fy + FRIDGE_H / 2} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {Array.from({ length: left + bought }, (_, i) => {
        const at = slot(fx, fy, i)
        const isNew = i >= left
        const k = isNew ? Math.max(0, Math.min(1, drop * bought - (i - left))) : 1
        return <Bottle key={i} x={at.x} y={at.y - (1 - k) * 30} tone={isNew ? 'bought' : 'left'} opacity={isNew ? k : 1} />
      })}
    </g>
  )
}

// What nobody can tell you in the morning
function Unknown({ x, y, show }: { x: number; y: number; show: number }) {
  return (
    <g opacity={show}>
      <text x={x} y={y} className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
        The day
      </text>
      {['want a bottle', 'go off overnight'].map((what, i) => (
        <text key={what} x={x} y={y + 40 + i * 34} className="fill-ink font-mono text-[13px]">
          <tspan className="fill-zinc-faded font-serif text-[22px]">?</tspan> {what}
        </text>
      ))}
    </g>
  )
}

function Morning({ step }: { step: number }) {
  const played = usePlay(1, step === 1 ? 2400 : step === 2 ? 2000 : 1)

  if (step === 0) {
    return (
      <Labelled left="Monday morning" right={`room for ${FRIDGE}`}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`A fridge with room for ${FRIDGE} bottles of juice; ${MONDAY.left} is left from yesterday.`}>
          <Fridge fx={(WIDTH - FRIDGE_W) / 2} fy={24} left={MONDAY.left} bought={0} />
          <text x={WIDTH / 2} y={24 + FRIDGE_H + 34} textAnchor="middle" className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
            {MONDAY.left} left from yesterday
          </text>
        </svg>
      </Labelled>
    )
  }

  if (step === 1) {
    const drop = Math.min(1, played / 0.55)
    const day = Math.max(0, Math.min(1, (played - 0.65) / 0.25))
    const open = MONDAY.left + MONDAY.bought
    return (
      <Labelled left="Your move: known" right="The day: unknown">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`${MONDAY.left} left and ${MONDAY.bought} bought makes ${open} bottles to open with, for sure. How many people want one, and how many go off overnight, is unknown.`}
        >
          <Fridge fx={30} fy={24} left={MONDAY.left} bought={MONDAY.bought} drop={drop} />
          <text x={30 + FRIDGE_W / 2} y={24 + FRIDGE_H + 34} textAnchor="middle" className="fill-ink font-mono text-[13px]">
            {MONDAY.left} + <tspan className="fill-sage">{MONDAY.bought}</tspan>
            {drop >= 1 ? ` = ${open}` : ''}
          </text>
          <line x1={290} x2={290} y1={14} y2={HEIGHT - 14} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="4 4" />
          <Unknown x={330} y={70} show={day} />
        </svg>
      </Labelled>
    )
  }

  // Two mornings, one shelf
  const k = Math.min(1, played / 0.6)
  const shown = Math.max(0, Math.min(1, (played - 0.6) / 0.3))
  const small = 0.55
  const big = 0.75
  const open = MONDAY.left + MONDAY.bought
  const meet = { x: 330, y: HEIGHT / 2 - 10 }
  return (
    <Labelled left="Two mornings" right={`both open with ${open}`}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Monday: ${MONDAY.left} left, ${MONDAY.bought} bought. Tuesday: ${TUESDAY.left} left, ${TUESDAY.bought} bought. Both mornings open with ${open} bottles.`}
      >
        {[
          { name: 'Mon', day: MONDAY, y: 6 },
          { name: 'Tue', day: TUESDAY, y: 122 },
        ].map(({ name, day, y }) => (
          <g key={name}>
            <text x={6} y={y + 40} className="fill-zinc-faded font-mono text-[13px] uppercase tracking-widest">
              {name}
            </text>
            <g transform={`translate(56 ${y}) scale(${small})`}>
              <Fridge fx={0} fy={0} left={day.left} bought={day.bought} />
            </g>
            <text x={56 + (FRIDGE_W * small) / 2} y={y + FRIDGE_H * small + 20} textAnchor="middle" className="fill-ink font-mono text-[13px]">
              {day.left} + <tspan className="fill-sage">{day.bought}</tspan>
            </text>
            <path
              d={`M ${56 + FRIDGE_W * small + 10} ${y + (FRIDGE_H * small) / 2} L ${lerp(56 + FRIDGE_W * small + 10, meet.x - 6, k)} ${lerp(
                y + (FRIDGE_H * small) / 2,
                meet.y,
                k
              )}`}
              className="fill-none stroke-ink"
              strokeWidth={1.5}
            />
          </g>
        ))}
        <g opacity={shown}>
          <g transform={`translate(${meet.x} ${meet.y - (FRIDGE_H * big) / 2}) scale(${big})`}>
            <Fridge fx={0} fy={0} left={open} bought={0} />
          </g>
          <text x={meet.x + (FRIDGE_W * big) / 2} y={meet.y + (FRIDGE_H * big) / 2 + 26} textAnchor="middle" className="fill-ink font-mono text-[13px] uppercase tracking-widest">
            open with {open}
          </text>
          <text x={meet.x + FRIDGE_W * big + 16} y={meet.y + 12} className="fill-zinc-400 font-serif text-[36px]">
            → ?
          </text>
        </g>
      </svg>
    </Labelled>
  )
}

// The pair notebook and the shelf notebook, side by side
function Notebooks({ step }: { step: number }) {
  const runs = storyRuns()
  const played = usePlay(step === 5 ? STORY_DAY : 1, step === 5 ? 110 : 900)
  const open = MONDAY.left + MONDAY.bought
  const blank = Array.from({ length: FRIDGE + 1 }, (_, left) => Array<number>(FRIDGE + 1 - left).fill(0))
  const learned = played >= 0.6

  if (step <= 4) {
    // Monday's day, written in by each notebook
    const pairCounts = blank.map((row, left) => row.map((n, i) => (left === MONDAY.left && left + i === open && (step > 3 || learned) ? 1 : n)))
    const shelfCounts = blank.map((row, left) => row.map((n, i) => (left + i === open && step === 4 && learned ? 1 : n)))
    const lost = `−${MONDAY.missed}`
    return (
      <Labelled left="A score per pair" right="A score per shelf">
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          <Notebook
            kind="pairs"
            counts={pairCounts}
            marks={[
              { left: MONDAY.left, open, text: step > 3 || learned ? lost : '' },
              { left: TUESDAY.left, open, text: '?', waiting: true },
            ]}
            label={`A score for every pair of bottles left and bottles to open with. Monday's pair, ${MONDAY.left} left and open with ${open}, has learned ${lost}; Tuesday's pair, ${TUESDAY.left} left and open with ${open}, has learned nothing.`}
          />
          <Notebook
            kind="shelf"
            counts={shelfCounts}
            faded={step === 3}
            marks={
              step === 4
                ? [
                    { left: MONDAY.left, open, text: learned ? lost : '' },
                    { left: TUESDAY.left, open, text: learned ? lost : '' },
                  ]
                : []
            }
            label={`A score for every number of bottles to open with: one column each. Monday's day writes ${lost} into the column for ${open}, which Tuesday's choice reads too.`}
          />
        </div>
      </Labelled>
    )
  }

  // Thirty days of each, then named
  const day = step === 5 ? Math.min(STORY_DAY, Math.floor(played)) : STORY_DAY
  const named = step === 6
  const pairs = runs.pairs.counts[day]
  const shelf = runs.shelf.counts[day]
  return (
    <Labelled
      left={named ? `Q(s, a): ${PAIRS}` : `Day ${day}: ${tried(pairs)}/${PAIRS} tried`}
      right={named ? `V(afterstate): ${SHELVES}` : `${triedShelves(shelf)}/${SHELVES} tried`}
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <Notebook
          kind="pairs"
          counts={pairs}
          picks={day === STORY_DAY ? policyOf(runs.pairs.tables[day]) : undefined}
          columns={named ? 'a: open with' : 'open with'}
          rows={named ? 's: left' : 'left'}
          label={`The pair notebook after ${day} days: it has learned from ${tried(pairs)} of its ${PAIRS} pairs.`}
        />
        <Notebook
          kind="shelf"
          counts={shelf}
          picks={day === STORY_DAY ? policyOf(runs.shelf.tables[day]) : undefined}
          columns={named ? 'afterstate' : 'open with'}
          rows={named ? 's: left' : 'left'}
          label={`The shelf notebook after ${day} days: it has learned from ${triedShelves(shelf)} of its ${SHELVES} shelves.`}
        />
      </div>
    </Labelled>
  )
}

// The story: a juice stall's fridge, two mornings that open with the same
// shelf, and two notebooks that learn from them. Give it a `key` per step.
export default function Stall({ step }: { step: number }) {
  return step <= 2 ? <Morning step={step} /> : <Notebooks step={step} />
}
