import { ALWAYS_ROLL } from '../../components/explain/ladders'
import { centre } from '../../components/explain/laddersLayout'
import Labelled from '../../components/explain/Labelled'
import { lerp, usePlay } from '../../components/explain/useLoop'
import Averages from './Averages'
import { fromStart, GAMES, STORY, type Run } from './model'

// How long the fast-forwarded steps take, in units of `pace` ms
const SPAN = 50
const PACE = 110

const count = (n: number) => n.toLocaleString('en-US')

// The game a fast-forward has reached: slow at first, so the first games
// can be watched, then quicker
const reached = (played: number) => Math.max(1, Math.round(GAMES * (played / SPAN) ** 2))

function Forward({ run, what }: { run: Run; what: string }) {
  const played = usePlay(SPAN, PACE)
  const k = reached(played)
  const plan = run.plans[k]
  return (
    <Labelled left={`Game ${count(k)} · ${what}`} right={`${fromStart(plan).toFixed(1)} turns`}>
      <Averages
        label={`After ${count(k)} games (${what}): the two averages on every square, and the move they pick`}
        table={run.tables[k]}
        plan={plan}
        covered
      />
    </Labelled>
  )
}

// The first game by habit: the counter moves turn by turn (a hidden ladder
// or snake carries it without warning), then the rolls it made get their
// averages
function FirstGame({ run }: { run: Run }) {
  const turns = run.games[0]
  // A beat at the end before the averages show
  const played = usePlay(turns.length + 1, 480)
  const done = played >= turns.length
  const i = Math.min(turns.length - 1, Math.floor(played))
  const t = Math.min(1, (played - i) / 0.6)
  const from = centre(turns[i].from)
  const to = centre(turns[i].to)
  const counter = done ? null : { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
  return (
    <Labelled left="Game 1 · always rolling" right={`${Math.min(turns.length, Math.floor(played + 0.4))} turns`}>
      <Averages
        label={`One game, rolling on every square: it takes ${turns.length} turns. Then each square it stood on gets the turns that followed its roll.`}
        table={done ? run.tables[1] : null}
        plan={done ? ALWAYS_ROLL : null}
        covered
        counter={counter}
      />
    </Labelled>
  )
}

// The story, one step at a time: learning the roll-or-step board with its
// ladders and snakes covered. Give it a `key` per step so each plays from
// its start.
export default function Story({ step }: { step: number }) {
  const { greedy, starts, random } = STORY()
  if (step === 0) {
    return (
      <Labelled left="The board covered" right="roll or step">
        <Averages label="The board with its ladders and snakes covered: nothing is known about any square" covered unknown counter={centre(1)} />
      </Labelled>
    )
  }
  if (step === 1) {
    return (
      <Labelled left="Two averages each" right="none yet">
        <Averages label="Every square has two empty averages: one for the turns after a roll (a die), one for those after a step (+1)" covered />
      </Labelled>
    )
  }
  if (step === 2) return <FirstGame run={greedy} />
  if (step === 3) return <Forward run={greedy} what="better only" />
  if (step === 4) return <Forward run={starts} what="random starts" />
  if (step === 5) return <Forward run={random} what="random moves" />
  const plan = starts.plans[GAMES]
  return (
    <Labelled left="Cloth lifted · Q(s, a)" right={`${fromStart(plan).toFixed(1)} turns`}>
      <Averages
        label="The board uncovered, with the averages after a thousand games from random starts: every step it learned leads to the foot of a ladder"
        table={starts.tables[GAMES]}
        plan={plan}
      />
    </Labelled>
  )
}
