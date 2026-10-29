import { lerp, usePlay } from '../../components/explain/useLoop'
import { HUT, STORY, storyReturn } from './model'

const WIDTH = 460
const HEIGHT = 190
const GROUND = 118
const post = (i: number) => 30 + i * 40

// The whole hike of the story: on to post 5, a wrong fork back to 4, then
// on to the hut
const WHOLE = [0, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 10]

// Where the hiker is partway along a list of posts, `at` legs in
function along(posts: number[], at: number) {
  const i = Math.min(posts.length - 2, Math.floor(at))
  return lerp(post(posts[i]), post(posts[i + 1]), Math.min(1, at - i))
}

// A bracket under legs `from` to `to` (posts), with a label
function Walked({ from, to, label, shown = 1 }: { from: number; to: number; label: string; shown?: number }) {
  const left = post(from) + 3
  const right = post(to) - 3
  const y = GROUND + 18
  return (
    <g opacity={shown}>
      <path d={`M ${left} ${y - 6} V ${y} H ${right} V ${y - 6}`} fill="none" className="stroke-sage" strokeWidth={1.5} />
      <text x={(left + right) / 2} y={y + 17} textAnchor="middle" className="fill-sage font-mono text-[11px]">
        {label}
      </text>
    </g>
  )
}

// The story's hike, one step at a time: the chalk on every post, then the
// trailhead's chalk checked by one leg, by the whole hike, and by three
// legs, then the same in the method's words. Give it a `key` per step.
export default function Hike({ step }: { step: number }) {
  const legs = step === 1 ? 1 : step === 2 ? WHOLE.length - 1 : step >= 3 ? 3 : 0
  const played = usePlay(legs, step === 2 ? 260 : 700)
  const done = played >= legs
  const named = step === 4

  const hiker = step === 2 ? along(WHOLE, played) : lerp(post(0), post(legs), legs ? played / legs : 0)
  // The post whose chalk the check trusts
  const trusted = step === 1 ? 1 : step >= 3 ? 3 : null
  const lost = step === 2 && played > 5 && played < 7

  const status = [
    'Chalked on each post: minutes still to go',
    `7 min walked + 140 chalked = ${storyReturn(1)}`,
    `Timed all the way: ${done ? STORY.whole : Math.round((STORY.whole * played) / legs)} min`,
    `7 + 9 + 5 = 21 min walked + 115 chalked = ${storyReturn(3)}`,
    '3-step return: R1 + R2 + R3 + V(S3)',
  ][step]

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{status}</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-2 w-full max-w-[32rem]" role="img" aria-label={status}>
        {/* The trail */}
        <line x1={post(0)} x2={post(HUT)} y1={GROUND} y2={GROUND} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={6} strokeLinecap="round" />

        {/* The posts and their chalk */}
        {STORY.chalk.slice(0, HUT).map((minutes, i) => {
          const x = post(i)
          const trust = trusted === i && (step !== 1 && step !== 3 ? true : done)
          const checked = i === 0 && step > 0
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={GROUND} y2={GROUND - 34} className="stroke-zinc-400" strokeWidth={2} />
              <rect x={x - 15} y={GROUND - 56} width={30} height={20} className={trust ? 'fill-ink' : 'fill-paper stroke-zinc-400'} strokeWidth={1} />
              <text
                x={x}
                y={GROUND - 42}
                textAnchor="middle"
                className={`font-mono text-[11px] tabular-nums ${trust ? 'fill-paper' : checked ? 'fill-sage' : 'fill-ink'}`}
              >
                {minutes}
              </text>
              {named && (i === 0 || i === 3) && (
                <text x={x} y={GROUND - 64} textAnchor="middle" className="fill-sage font-mono text-[11px]">
                  {i === 0 ? 'S0' : 'V(S3)'}
                </text>
              )}
            </g>
          )
        })}

        {/* The hut */}
        <path
          d={`M ${post(HUT) - 14} ${GROUND} V ${GROUND - 20} L ${post(HUT)} ${GROUND - 34} L ${post(HUT) + 14} ${GROUND - 20} V ${GROUND} Z`}
          className="fill-paper stroke-ink"
          strokeWidth={1.5}
        />
        <text x={post(HUT)} y={GROUND + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          Hut
        </text>

        {/* What was walked */}
        {step === 1 && <Walked from={0} to={1} label="7" shown={done ? 1 : 0.35} />}
        {step === 2 && (
          <Walked from={0} to={HUT} label={done ? `${STORY.whole} min, one wrong fork` : 'timing…'} shown={done ? 1 : 0.5} />
        )}
        {step >= 3 && <Walked from={0} to={3} label={named ? 'R1 + R2 + R3' : '7 + 9 + 5'} shown={done ? 1 : 0.35} />}
        {lost && (
          <text x={post(5)} y={GROUND - 72} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
            wrong fork
          </text>
        )}

        {/* The hiker */}
        <circle cx={hiker} cy={GROUND} r={7} className="fill-sage stroke-paper" strokeWidth={2} />
      </svg>
    </div>
  )
}
