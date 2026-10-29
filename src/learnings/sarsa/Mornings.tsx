import { usePlay } from '../../components/explain/useLoop'
import { MOVES } from '../../components/explain/mdp'
import { cellsOf, HOME, minutes, onwardOf, score, STATION, STORY, tableAt, TOWN, type Training } from '../../components/explain/gridLearning'
import Town from '../../components/explain/Town'

const fmt = (value: number) => score(value, 1)
const paren = (value: number) => (value < 0 ? `(${fmt(value)})` : fmt(value))

// Where someone walking `steps` is after `played` of them: between two
// corners while a step is under way
function walker(training: Training, morning: number, played: number) {
  const steps = training.walks[morning].steps
  const index = Math.min(Math.floor(played), steps.length - 1)
  const k = played >= steps.length ? 1 : Math.min(1, (played - index) / 0.6)
  const here = TOWN.cell(steps[index].state)
  const there = TOWN.cell(steps[index].next)
  return { at: { x: here.x + (there.x - here.x) * k, y: here.y + (there.y - here.y) * k }, done: Math.min(steps.length, Math.floor(played + 0.4)) }
}

function Status({ children }: { children: string }) {
  return <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{children}</p>
}

// The story: mornings walking to the station in a new town, learning a
// score for every way out of every corner as you go. One step of the story
// at a time; give it a `key` per step so each plays from its start.
export default function Mornings({
  step,
  training,
  zoom,
  shortest,
}: {
  step: number
  training: Training
  zoom: { morning: number; index: number }
  // The first morning (from 1) that took the fewest minutes there are
  shortest: number
}) {
  const span = step === 2 ? training.walks[0].steps.length : step === 3 ? 1 : step === 4 ? shortest - 2 : step === 5 ? training.walks[shortest - 1].steps.length : 0
  const pace = step === 2 ? 260 : step === 3 ? 3200 : step === 4 ? 520 : 320
  const played = usePlay(span, pace)
  const label = (text: string) => `A town of six blocks by four, with buildings, home and the station. ${text}`

  if (step <= 1) {
    return (
      <div>
        <Status>{step === 0 ? 'A new town · no map' : 'A score for every way out of every corner'}</Status>
        <div className="mt-3">
          <Town
            world={TOWN}
            home={HOME}
            goal={STATION}
            goalLabel="top"
            label={label(step === 0 ? 'You are at home.' : 'Each corner shows four scores, one for each way out, all 0.')}
            table={step === 1 ? training.tables[0] : null}
            walker={HOME}
          />
        </div>
      </div>
    )
  }

  if (step === 2 || step === 5) {
    const morning = step === 2 ? 0 : shortest - 1
    const { at, done } = walker(training, morning, played)
    const trail = cellsOf(training.walks[morning]).slice(Math.max(0, done - 6), done).map((s) => TOWN.cell(s))
    return (
      <div>
        <Status>{`Morning ${morning + 1} · ${done} min${step === 5 && done === minutes(training.walks[morning]) ? ': the shortest way' : ''}`}</Status>
        <div className="mt-3">
          <Town
            world={TOWN}
            home={HOME}
            goal={STATION}
            goalLabel="top"
            label={label(`Morning ${morning + 1}: you walk to the station, and the scores of the ways you take change as you go.`)}
            table={tableAt(training, morning, done)}
            walker={at}
            trail={trail}
          />
        </div>
      </div>
    )
  }

  if (step === 3) {
    const steps = training.walks[zoom.morning].steps
    const now = steps[zoom.index]
    const then = steps[zoom.index + 1]
    const onward = onwardOf(now, STORY)
    const updated = played >= 0.55
    const way = MOVES[now.action]
    return (
      <div>
        <Status>{`Morning ${zoom.morning + 1} · one update`}</Status>
        <div className="mt-3">
          <Town
            world={TOWN}
            home={HOME}
            goal={STATION}
            goalLabel="top"
            label={label(
              `You went ${way} from the ringed corner and will go ${MOVES[then.action]} next. The ${way} score moves from ${fmt(now.before)} to ${fmt(now.after)}.`
            )}
            focus={now.state}
            ways={[
              { cell: now.state, action: now.action, tone: 'ink', text: fmt(updated ? now.after : now.before) },
              { cell: now.next, action: then.action, tone: 'sage', text: fmt(onward) },
            ]}
          />
        </div>
        <p className="mt-3 text-center font-mono text-[0.8rem] tabular-nums text-zinc-faded">
          <span className="uppercase tracking-widest">{way}:</span> {fmt(now.before)} + 0.5 × (−1 + <span className="text-sage">{paren(onward)}</span> −{' '}
          {paren(now.before)}) = <span className={updated ? 'text-ink' : 'opacity-0'}>{fmt(now.after)}</span>
        </p>
      </div>
    )
  }

  if (step === 4) {
    const morning = Math.min(1 + Math.floor(played), shortest - 2)
    const walk = training.walks[morning]
    return (
      <div>
        <Status>{`Morning ${morning + 1} · ${minutes(walk)} min`}</Status>
        <div className="mt-3">
          <Town
            world={TOWN}
            home={HOME}
            goal={STATION}
            goalLabel="top"
            label={label(`Morning after morning, the walks get shorter as the scores sort the ways out.`)}
            table={training.tables[morning + 1]}
            scores="arrows"
            routes={[{ cells: cellsOf(walk), tone: 'ink', faint: true }]}
          />
        </div>
      </div>
    )
  }

  // The same walk, named
  const route = cellsOf(training.walks[shortest - 1])
  const steps = training.walks[shortest - 1].steps
  const k = 3
  return (
    <div>
      <Status>{'s, a, r, s′, a′ · Sarsa'}</Status>
      <div className="mt-3">
        <Town
          world={TOWN}
          home={HOME}
          goal={STATION}
            goalLabel="top"
          label={label('The shortest walk, with one corner named s, the way out of it a, the next corner s′ and the way out of that a′.')}
          routes={[{ cells: route, tone: 'sage' }]}
          ways={[
            { cell: steps[k].state, action: steps[k].action, tone: 'ink' },
            { cell: steps[k + 1].state, action: steps[k + 1].action, tone: 'sage' },
          ]}
          marks={[
            { at: TOWN.cell(steps[k].state), text: 's, a' },
            { at: TOWN.cell(steps[k + 1].state), text: 's′, a′', accent: true },
          ]}
        />
      </div>
      <p className="mt-3 text-center font-mono text-[0.8rem] tabular-nums text-zinc-faded">
        Q(s, a) ← Q(s, a) + α × (r + γ <span className="text-sage">Q(s′, a′)</span> − Q(s, a))
      </p>
    </div>
  )
}
