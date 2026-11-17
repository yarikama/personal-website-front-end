import { usePlay } from '../../components/explain/useLoop'
import Alike from './Alike'
import { EPOCHS, EVERY, mostAlike, STORY_FRAMES, STORY_ORDER, STORY_RUN, STORY_WORD, two } from './model'

// The story's whole run: how alike each word's filled arrow is to cat's,
// from the random start through every pass over the 160 pairs
const PACE = 110

export default function Training() {
  const played = usePlay(STORY_FRAMES.length - 1, PACE)
  const frame = Math.floor(played)
  const values = STORY_FRAMES[frame]
  const done = frame === STORY_FRAMES.length - 1
  const top = mostAlike(STORY_RUN.v, STORY_WORD)
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded tabular-nums">
          Pass {frame * EVERY} of {EPOCHS}
        </span>
        <span className={`tabular-nums ${done ? 'text-sage-ink' : 'text-ink'}`}>
          {done ? `Most like cat: ${top}, ${two(values[0])}` : 'How alike, to cat'}
        </span>
      </div>
      <div className="mt-3">
        <Alike
          words={STORY_ORDER}
          values={values}
          watch={top}
          label={`How much each word's filled arrow points the way cat's does, over ${EPOCHS} passes. At the start they are all near 0; by the end ${top} is the most alike, at ${two(STORY_FRAMES.at(-1)![0])}.`}
        />
      </div>
    </div>
  )
}
