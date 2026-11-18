import { usePlay } from '../../components/explain/useLoop'
import Coins from './Coins'
import { between, frameAt, NON_SATURATING, ONE_KIND, STORY, STORY_ROUNDS, STORY_SHOWN, UNSURE } from './model'

export type Show = 'coins' | 'cashier' | 'nudge' | 'turns' | 'end' | 'named'

const first = STORY[0]
const end = STORY[STORY_ROUNDS - 1]

// The forger and the cashier, one step of the story at a time. Each step
// plays on its own when shown (give it a key to play again).
export default function Story({ show }: { show: Show }) {
  // The curve settling into place, then the rounds
  const learned = usePlay(1, 900)
  const early = usePlay(STORY_SHOWN, 800)
  const late = usePlay(STORY_ROUNDS - 1 - STORY_SHOWN, 160)

  if (show === 'coins')
    return (
      <Coins real={ONE_KIND} fakes={first.fakes} cashier={null} label="Sixteen real coins around 8 grams, and sixteen fakes around 2.5 grams." />
    )
  if (show === 'cashier')
    return (
      <Coins
        real={ONE_KIND}
        fakes={first.fakes}
        cashier={between(UNSURE, first.cashier, learned)}
        label="The cashier's curve of the chance a coin is real: near zero at the fakes' weight, high near 8 grams."
      />
    )
  if (show === 'nudge')
    return (
      <Coins
        real={ONE_KIND}
        fakes={first.fakes}
        cashier={first.cashier}
        nudges={NON_SATURATING}
        label="Each fake has an arrow pointing heavier, up the cashier's curve."
      />
    )
  if (show === 'turns') {
    const frame = frameAt(STORY, early)
    return (
      <Coins
        real={ONE_KIND}
        fakes={frame.fakes}
        cashier={frame.cashier}
        nudges={NON_SATURATING}
        label="Round by round the fakes move heavier and the cashier's curve moves after them."
      />
    )
  }
  const frame = show === 'end' ? frameAt(STORY, STORY_SHOWN + late) : end
  return (
    <Coins
      real={ONE_KIND}
      fakes={frame.fakes}
      cashier={frame.cashier}
      nudges={NON_SATURATING}
      names={show === 'named' ? 'gan' : 'coins'}
      label="The fakes now weigh what real coins weigh, and the curve sits at one half where they are."
    />
  )
}
