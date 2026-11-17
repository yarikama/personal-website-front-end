import { lerp, usePlay } from '../../components/explain/useLoop'
import { blankHappy, lean, pct, REVIEWS, rightCount, STORY, type Prompt } from './model'
import Sorting, { SortingKey } from './Sorting'

export type Scene = 'mixed' | 'happyLast' | 'allHappy' | 'blank' | 'calibrate' | 'named'

// Each step: the cards shown, the shift it starts and ends at, and whether
// the blank card is out
const SCENES: Record<Scene, { prompt: Prompt; from: number; to: number; blank: boolean; ms: number }> = {
  mixed: { prompt: STORY.mixed, from: lean(STORY.mixed), to: lean(STORY.mixed), blank: false, ms: 1400 },
  happyLast: { prompt: STORY.happyLast, from: lean(STORY.mixed), to: lean(STORY.happyLast), blank: false, ms: 1400 },
  allHappy: { prompt: STORY.allHappy, from: lean(STORY.happyLast), to: lean(STORY.allHappy), blank: false, ms: 1000 },
  blank: { prompt: STORY.allHappy, from: lean(STORY.allHappy), to: lean(STORY.allHappy), blank: true, ms: 900 },
  calibrate: { prompt: STORY.allHappy, from: lean(STORY.allHappy), to: 0, blank: true, ms: 1600 },
  named: { prompt: STORY.allHappy, from: 0, to: 0, blank: true, ms: 1 },
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

// The story's figure for one step. Give it a `key` per step, so each step
// plays from the start.
export default function Story({ scene }: { scene: Scene }) {
  const { prompt, from, to, blank, ms } = SCENES[scene]
  const played = usePlay(1, ms)
  const shift = lerp(from, to, ease(played))
  const right = rightCount(shift)
  const named = scene === 'named'
  const calibrated = scene === 'calibrate' || scene === 'named'

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">
          {named ? 'A language model, calibrated' : calibrated ? 'Judged against the blank card' : 'Your helper sorts'}
        </span>
        <span className={`tabular-nums ${right === REVIEWS.length - 1 ? 'text-sage-ink' : 'text-ink'}`}>
          {right} of {REVIEWS.length} right
        </span>
      </div>
      <Sorting
        prompt={prompt}
        shift={shift}
        shown={scene === 'mixed' ? played : 1}
        blank={blank ? (scene === 'blank' ? ease(played) : 1) : null}
        blankChance={blankHappy(prompt)}
        named={named}
        description={describe(scene, prompt, right)}
      />
      <SortingKey named={named} />
    </div>
  )
}

function describe(scene: Scene, prompt: Prompt, right: number): string {
  const cards = prompt.map((l) => (l === 'P' ? 'happy' : 'unhappy')).join(', ')
  switch (scene) {
    case 'mixed':
    case 'happyLast':
    case 'allHappy':
      return `Cards ${cards}. Twelve reviews placed by how sure the helper is that each is happy; ${right} of 12 fall on the right side of 50%.`
    case 'blank':
      return `The same cards, and a blank card that the helper scores ${pct(blankHappy(prompt))} happy.`
    case 'calibrate':
      return `Every score slides left by the blank card's lean, so the blank card lands on 50%; ${right} of 12 are now right.`
    case 'named':
      return `The same picture for a language model: four demonstrations, the input N/A at 50% after calibration, ${right} of 12 test reviews right.`
  }
}
