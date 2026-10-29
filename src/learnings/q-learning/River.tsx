import { usePlay } from '../../components/explain/useLoop'
import type { Training } from '../../components/explain/gridLearning'
import Town from '../../components/explain/Town'
import { EDGE, FAR, HOME, MORNINGS, RIVERSIDE, STATION, settled, wetWhen } from './model'

const at = (x: number, y: number) => RIVERSIDE.at({ x, y })
const EDGE_ROUTE = Array.from({ length: EDGE + 1 }, (_, x) => at(x, 2))
const FAR_ROUTE = [at(0, 2), at(0, 1), ...Array.from({ length: EDGE + 1 }, (_, x) => at(x, 0)), at(EDGE, 1), at(EDGE, 2)]
// The scripted slip: three blocks along the edge, then a random step south
const SLIP = [at(0, 2), at(1, 2), at(2, 2), at(3, 2), at(3, 3)]

function Status({ children }: { children: string }) {
  return <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{children}</p>
}

// Where someone walking through `cells` is after `played` blocks
function along(cells: number[], played: number) {
  const index = Math.min(Math.floor(played), cells.length - 2)
  const k = Math.min(1, Math.max(0, played - index) / 0.6)
  const here = RIVERSIDE.cell(cells[index])
  const there = RIVERSIDE.cell(cells[index + 1])
  return { x: here.x + (there.x - here.x) * k, y: here.y + (there.y - here.y) * k }
}

const label = (text: string) => `A riverside: three streets of seven blocks above a river, home at the left by the water, the station at the right. ${text}`

// Each wet morning of a learner's 500, as a tick on a strip
function Strip({ y, training, name, tone }: { y: number; training: Training; name: string; tone: 'sage' | 'ink' }) {
  const when = wetWhen(training)
  const x = (morning: number) => 20 + (morning / MORNINGS) * 420
  return (
    <g>
      <text x={20} y={y - 12} className={`font-mono text-[11px] uppercase tracking-widest ${tone === 'sage' ? 'fill-sage' : 'fill-ink'}`}>
        {name}: {when.length} wet mornings
      </text>
      <rect x={20} y={y} width={420} height={26} className="fill-zinc-200/60 dark:fill-zinc-200/10" />
      {when.map((morning) => (
        <rect key={morning} x={x(morning)} y={y} width={1.6} height={26} className={tone === 'sage' ? 'fill-sage' : 'fill-ink'} />
      ))}
    </g>
  )
}

// The story: you and a friend learning the walk to the station along the
// river, each in your own way. One step at a time; give it a `key` per
// step so each plays from its start.
export default function River({ step, you, friend }: { step: number; you: Training; friend: Training }) {
  const yours = settled(you)
  const hers = settled(friend)
  const span = step === 1 ? SLIP.length - 1 : step === 5 ? Math.max(yours.length, hers.length) - 1 : step === 2 || step === 3 ? 1 : 0
  const played = usePlay(span, step === 1 ? 800 : step === 5 ? 520 : 1800)

  if (step === 4) {
    return (
      <div>
        <Status>{`${MORNINGS} mornings each · every tick a wet one`}</Status>
        <svg viewBox="0 0 460 150" className="mx-auto mt-3 w-full max-w-[34rem]" role="img" aria-label={`Wet mornings over ${MORNINGS}: yours bunch up early and thin out; your friend's go on all along.`}>
          <Strip y={34} training={you} name="You" tone="ink" />
          <Strip y={98} training={friend} name="Your friend" tone="sage" />
          <text x={20} y={142} className="fill-zinc-400 font-mono text-[11px]">morning 1</text>
          <text x={440} y={142} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
            morning {MORNINGS}
          </text>
        </svg>
      </div>
    )
  }

  if (step === 0) {
    return (
      <div>
        <Status>{`The edge: ${EDGE} min · the far street: ${FAR} min`}</Status>
        <div className="mt-3">
          <Town
            world={RIVERSIDE}
            home={HOME}
            goal={STATION}
            label={label(`Two routes: along the water's edge, ${EDGE} minutes, and along the far street, ${FAR} minutes.`)}
            routes={[
              { cells: EDGE_ROUTE, tone: 'sage' },
              { cells: FAR_ROUTE, tone: 'ink', dashed: true },
            ]}
            walker={HOME}
          />
        </div>
      </div>
    )
  }

  if (step === 1) {
    const wet = played >= SLIP.length - 1.4
    return (
      <div>
        <Status>{wet ? 'A random step · into the river' : `Along the edge · block ${Math.min(Math.floor(played) + 1, 3)}`}</Status>
        <div className="mt-3">
          <Town
            world={RIVERSIDE}
            home={HOME}
            goal={STATION}
            label={label('You walk three blocks along the edge, then a random step takes you south, into the river.')}
            walker={along(SLIP, played)}
            wet={wet}
            trail={SLIP.slice(0, Math.floor(played) + 1).map((s) => RIVERSIDE.cell(s))}
          />
        </div>
      </div>
    )
  }

  if (step === 5) {
    const done = played >= span
    return (
      <div>
        <Status>{done ? `No random steps: her ${hers.length - 1} min, your ${yours.length - 1} min` : 'No more random steps'}</Status>
        <div className="mt-3">
          <Town
            world={RIVERSIDE}
            home={HOME}
            goal={STATION}
            label={label(`With no random steps, your friend walks the edge in ${hers.length - 1} minutes and you the far street in ${yours.length - 1}.`)}
            routes={[
              { cells: yours, tone: 'ink', faint: true },
              { cells: hers, tone: 'sage', faint: true },
            ]}
            walker={along(hers, Math.min(played, hers.length - 1))}
            other={along(yours, Math.min(played, yours.length - 1))}
          />
        </div>
      </div>
    )
  }

  // Steps 2, 3 and 6: the routes each of you settled on
  const showYours = step === 2 || step === 6
  const showHers = step === 3 || step === 6
  const named = step === 6
  return (
    <div>
      <Status>
        {named ? 'Sarsa: on-policy · Q-learning: off-policy' : showYours ? `You, after ${MORNINGS} mornings: the far street` : `Your friend, after ${MORNINGS} mornings: the edge`}
      </Status>
      <div className="mt-3">
        <Town
          world={RIVERSIDE}
          home={HOME}
          goal={STATION}
          label={label(
            named
              ? 'Your route, the far street, is Sarsa’s; your friend’s, the edge, is Q-learning’s.'
              : showYours
                ? 'Your scores lead along the far street, away from the water.'
                : 'Your friend’s scores lead along the edge.'
          )}
          routes={[
            ...(showYours ? [{ cells: yours, tone: 'ink' as const, shown: named ? 1 : played }] : []),
            ...(showHers ? [{ cells: hers, tone: 'sage' as const, shown: named ? 1 : played }] : []),
          ]}
          marks={
            named
              ? [
                  { at: { x: 3, y: 0 }, text: 'Sarsa' },
                  { at: { x: 3, y: 2 }, text: 'Q-learning', accent: true },
                ]
              : []
          }
        />
      </div>
    </div>
  )
}
