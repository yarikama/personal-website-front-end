import { Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { BIG, listHeight, SMALL, WIDTH } from './layout'
import { Pieces, WordList } from './Pieces'
import {
  ALPHABET,
  encodeSteps,
  joined,
  letters,
  MERGES,
  NEW_WORD,
  ORDERS,
  STAGES,
  STORY_MERGES,
  storyMerges,
  WORDS,
  type Merge,
} from './model'

export type Show = 'orders' | 'pair' | 'glue' | 'again' | 'ten' | 'new' | 'named'

// Which merges each step plays, from one stage to another, and how fast
const PLAN: Record<Show, { from: number; to: number; pace: number }> = {
  orders: { from: 0, to: 0, pace: 110 },
  pair: { from: 0, to: 0, pace: 1400 },
  glue: { from: 0, to: 1, pace: 1600 },
  again: { from: 1, to: 3, pace: 1400 },
  ten: { from: 3, to: STORY_MERGES, pace: 750 },
  new: { from: STORY_MERGES, to: STORY_MERGES, pace: 750 },
  named: { from: STORY_MERGES, to: STORY_MERGES, pace: 750 },
}

const NEW_STEPS = encodeSteps(NEW_WORD, storyMerges)
// Of each merge's time, the share spent showing the pair before it is glued
const LOOK = 0.45

// Where things sit in the drawing
const LIST_END = listHeight(WORDS.length)
const NOTE = LIST_END + 26
const BOX = NOTE + 32
const BOX_CHIPS = 46
const NEW = BOX + 82
const HEIGHT = NEW + 10 + BIG.height + 4

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

// Presses for the first `n` words of the list, spelled letter by letter
const lettersFor = (n: number) => WORDS.slice(0, n).reduce((sum, e) => sum + letters(e.word).length * e.count, 0)

// The bookmark shop: the month's orders, split into the stamps that print
// them, and the stamp box. Each step plays its merges once, a pair lit in
// sage and then glued.
export default function Shop({ show }: { show: Show }) {
  const { from, to, pace } = PLAN[show]
  const word = show === 'new' || show === 'named'
  const span = show === 'orders' ? WORDS.length : show === 'pair' ? 1 : word ? NEW_STEPS.length - 1 : to - from
  const played = usePlay(span, pace)
  const named = show === 'named'

  // Where the merges are: the stage shown, and the pair lit or the piece just made
  let stage = to
  let glue: Merge | null = null
  let fresh: string | null = to > from ? joined(MERGES[to - 1]) : null
  if (to > from && played < span) {
    const done = Math.floor(played)
    if (played - done < LOOK) {
      stage = from + done
      glue = MERGES[stage]
      fresh = done > 0 ? joined(MERGES[stage - 1]) : null
    } else {
      stage = from + done + 1
      fresh = joined(MERGES[stage - 1])
    }
  }
  if (show === 'pair') glue = MERGES[0]
  if (word) fresh = null
  const { splits } = STAGES[stage]
  const shown = show === 'orders' ? Math.min(WORDS.length, Math.floor(played) + 1) : WORDS.length
  const presses = show === 'orders' ? lettersFor(shown) : STAGES[stage].presses
  const merges = MERGES.slice(0, stage)

  // The reveal shows the new word as it ends; the step before plays it
  const newAt = named ? NEW_STEPS[NEW_STEPS.length - 1] : word ? NEW_STEPS[Math.min(NEW_STEPS.length - 1, Math.floor(played))] : null

  // The line under the list: the pair being counted, or the merge just made
  const first = MERGES[0]
  const last = stage > 0 ? MERGES[stage - 1] : null
  const note =
    show === 'pair'
      ? `${first.left} then ${first.right}, side by side: ${Math.round(played * first.count)} times`
      : glue
        ? `${glue.left} then ${glue.right}, side by side: ${glue.count} times`
        : last && !word && show !== 'orders'
          ? `glued ${last.left} + ${last.right}: ${last.count} presses saved`
          : null

  return (
    <div>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Readout label={named ? 'Words of text' : 'Orders'} value={ORDERS} />
        <Readout label={named ? 'Tokens' : 'Presses'} value={presses} accent />
      </div>
      <svg
        viewBox={`0 -2 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-5 w-full max-w-[34rem]"
        role="img"
        aria-label={
          named
            ? `${WORDS.length} training words split into tokens; a vocabulary of the 26 letters and ${stage} merged pieces; the unseen word ${NEW_WORD} split into ${(newAt?.pieces ?? []).join(', ')}.`
            : `${WORDS.length} words on order, split into the stamps that print them, and a stamp box of 26 letters${
                stage ? ` and ${stage} glued stamps` : ''
              }.`
        }
      >
        <WordList words={WORDS} splits={splits} shown={shown} glue={glue} fresh={fresh} />

        {note && (
          <text x={0} y={NOTE} className="fill-sage-ink font-mono text-[12px]">
            {note}
          </text>
        )}

        <text x={0} y={BOX} className={label}>
          {named ? 'Vocabulary' : 'Stamp box'}: {ALPHABET.length} letters{stage ? ` + ${stage}` : ''}
        </text>
        <text x={0} y={BOX + 24} className="fill-zinc-faded font-mono text-[12px]">
          a … z
        </text>
        <Pieces pieces={merges.map(joined)} x={BOX_CHIPS} y={BOX + 10} size={SMALL} width={WIDTH - BOX_CHIPS} fresh={fresh} />

        {newAt && (
          <g>
            <text x={0} y={NEW} className={label}>
              {named ? 'A word it never saw' : 'A new order'}: {newAt.pieces.length} {named ? 'tokens' : 'presses'}
            </text>
            <Pieces
              pieces={newAt.pieces}
              y={NEW + 10}
              size={BIG}
              width={WIDTH}
              fresh={newAt.merge ? joined(newAt.merge) : null}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
