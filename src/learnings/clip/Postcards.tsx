import { lerp, usePlay } from '../../components/explain/useLoop'
import Board, { Pair } from './Board'
import { HEIGHT, WIDTH } from './layout'
import Glyph from './Glyph'
import { CAPTIONS, N, PICTURES, START, STEPS, STORY_RUN, STORY_TAU, type Arrows } from './model'

export type Show = 'cards' | 'arrows' | 'grid' | 'diagonal' | 'train' | 'named'

// The slips, shuffled as they came out of the box
const SHUFFLED = [2, 0, 3, 1]

// Where the run is `t` steps in, between two saved steps
function along(run: Arrows[], t: number): Arrows {
  const k = Math.min(run.length - 2, Math.floor(t))
  const f = Math.min(1, t - k)
  return {
    pictures: run[k].pictures.map((a, i) => lerp(a, run[k + 1].pictures[i], f)),
    captions: run[k].captions.map((b, j) => lerp(b, run[k + 1].captions[j], f)),
  }
}

// Four torn postcards: the pictures, and the caption slips shuffled
function Cards() {
  const played = usePlay(1, 900)
  return (
    <Pair>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Four pictures: a sun, a house, a tree and a boat."
      >
        <text
          x={WIDTH / 2}
          y={14}
          textAnchor="middle"
          className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
        >
          Fronts
        </text>
        {PICTURES.map((p, i) => (
          <Glyph key={p.name} picture={p} x={WIDTH / 2 + (i % 2 ? 46 : -46)} y={i < 2 ? 82 : 182} size={64} />
        ))}
      </svg>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Four caption slips, shuffled: ${SHUFFLED.map((j) => CAPTIONS[j]).join(', ')}.`}
      >
        <text
          x={WIDTH / 2}
          y={14}
          textAnchor="middle"
          className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
        >
          Backs, shuffled
        </text>
        {SHUFFLED.map((j, k) => {
          const x = WIDTH / 2 + (k % 2 ? 18 : -18) * played
          const y = 50 + k * 50
          return (
            <g key={j} transform={`rotate(${(k % 2 ? 1 : -1) * 3 * played}, ${x}, ${y + 14})`}>
              <rect
                x={x - 66}
                y={y}
                width={132}
                height={30}
                rx={4}
                className="fill-paper stroke-ink"
                strokeOpacity={0.5}
              />
              <text x={x} y={y + 19} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                {CAPTIONS[j]}
              </text>
            </g>
          )
        })}
      </svg>
    </Pair>
  )
}

// The story's figure. Give it a `key` per step so each step plays from the
// start.
export default function Postcards({ show }: { show: Show }) {
  const span = show === 'arrows' ? 1 : show === 'grid' ? N * N : show === 'train' ? STEPS : 0
  const pace = show === 'arrows' ? 1000 : show === 'grid' ? 420 : 70
  const played = usePlay(span, pace)

  if (show === 'cards') return <Cards />

  const trained = show === 'named'
  const arrows = show === 'train' ? along(STORY_RUN, played) : trained ? STORY_RUN[STEPS] : START
  const comparing = show === 'grid' && played < N * N ? Math.floor(played) : null
  return (
    <Board
      arrows={arrows}
      tau={STORY_TAU}
      grow={show === 'arrows' ? played : 1}
      cells={show === 'arrows' ? 0 : show === 'grid' ? Math.floor(played) + (played >= N * N ? 0 : 1) : N * N}
      comparing={comparing}
      diagonal={show !== 'arrows' && show !== 'grid'}
      losses={show === 'train' || trained}
      named={trained}
    />
  )
}
