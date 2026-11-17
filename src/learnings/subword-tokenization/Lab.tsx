import { Readout } from '../../components/explain/figure'
import { BIG, flow, linesOf, listHeight, WIDTH } from './layout'
import { Pieces, WordList } from './Pieces'
import { ALL_MERGES, encode, joined, letters, MERGES, STAGES, vocabularySize, WORDS } from './model'

// How many of the counted pairs to draw
const TOP = 5
const PITCH = 22
const BAR_FROM = 86
const BAR_TO = WIDTH - 34

const LIST_END = listHeight(WORDS.length)
const PAIRS = LIST_END + 34
const NEW = PAIRS + 18 + TOP * PITCH + 24

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

// Byte-pair encoding on the shop's list, `k` merges in: every word as it is
// split, the pairs counted (the most frequent, in sage, is glued next), and
// a word of the reader's own split with the same merges
export default function Lab({ k, typed }: { k: number; typed: string }) {
  const stage = STAGES[k]
  const next = k < ALL_MERGES ? MERGES[k] : null
  const pairs = stage.pairs.slice(0, TOP)
  const most = pairs[0]?.count ?? 1
  const pieces = typed ? encode(typed, stage.merges) : []
  // Room for a long word's second line
  const lines = linesOf(flow(pieces, BIG, WIDTH))
  const height = NEW + 10 + lines * (BIG.height + BIG.gap) + 2

  return (
    <div>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Merges" value={`${k} of ${ALL_MERGES}`} />
        <Readout label="Vocabulary" value={vocabularySize(k)} />
        <Readout label="Tokens in the list" value={stage.presses} accent />
      </div>
      <svg
        viewBox={`0 -2 ${WIDTH} ${height}`}
        className="mx-auto mt-5 w-full max-w-[34rem]"
        role="img"
        aria-label={`After ${k} merges: the ${WORDS.length} words split into ${stage.presses} tokens; the pair glued next is ${
          next ? `${next.left} + ${next.right}, ${next.count} times` : 'none'
        }${typed ? `; ${typed} splits into ${pieces.join(', ')}` : ''}.`}
      >
        <WordList words={WORDS} splits={stage.splits} glue={next} fresh={k > 0 ? joined(MERGES[k - 1]) : null} />

        <text x={0} y={PAIRS} className={label}>
          Neighbouring pairs, counted
        </text>
        {pairs.length === 0 && (
          <text x={0} y={PAIRS + 22} className="fill-ink font-mono text-[12px]">
            None left: every word is one token.
          </text>
        )}
        {pairs.map((pair, i) => {
          const y = PAIRS + 12 + i * PITCH
          return (
            <g key={`${pair.left} ${pair.right}`}>
              <text x={0} y={y + 11} className={`font-mono text-[12px] ${i === 0 ? 'fill-sage-ink' : 'fill-ink'}`}>
                {pair.left} + {pair.right}
              </text>
              <rect
                x={BAR_FROM}
                y={y + 2}
                width={Math.max(2, ((BAR_TO - BAR_FROM) * pair.count) / most)}
                height={12}
                rx={3}
                className={i === 0 ? 'fill-sage' : 'fill-ink'}
                fillOpacity={i === 0 ? 1 : 0.35}
              />
              <text x={WIDTH} y={y + 11} textAnchor="end" className="fill-ink font-mono text-[12px] tabular-nums">
                {pair.count}
              </text>
            </g>
          )
        })}

        <text x={0} y={NEW} className={label}>
          {typed
            ? `${typed}: ${pieces.length} ${pieces.length === 1 ? 'token' : 'tokens'} from ${letters(typed).length} letters`
            : 'Type a word to split it'}
        </text>
        {typed && <Pieces pieces={pieces} y={NEW + 10} size={BIG} width={WIDTH} />}
      </svg>
    </div>
  )
}
