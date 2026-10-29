import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { signed, SPOTS } from '../../components/explain/ladders'
import Labelled from '../../components/explain/Labelled'
import Sweeping from '../../components/explain/Sweeping'
import CityMap from './CityMap'
import {
  backupsBy,
  blocksOf,
  CITY,
  cornersOf,
  counts,
  firstBump,
  guess,
  JUMBLE,
  PASSES,
  sweptBackups,
  SWEEPING,
  touchedBy,
  VI_SWEEPS,
  WALKING,
} from './model'
import Picks from './Picks'
import Trips from './Trips'
import Walks from './Walks'

const n = (value: number) => value.toLocaleString('en')
const list = (squares: number[]) =>
  squares.length === 1 ? String(squares[0]) : `${squares.slice(0, -1).join(', ')} and ${squares.at(-1)}`

export default function AsynchronousDynamicProgramming() {
  // The board's numbers
  const squares = SPOTS.length
  const viBackups = sweptBackups('copies')
  const downBackups = sweptBackups('down')
  const jumble = JUMBLE()
  const picks = jumble.length - 1
  const early = 2 * squares
  const earlyCounts = counts(jumble, early)
  const never = [...earlyCounts].filter(([, k]) => k === 0).map(([sq]) => sq)
  const most = Math.max(...earlyCounts.values())
  const often = [...earlyCounts].filter(([, k]) => k === most).map(([sq]) => sq)
  const allCounts = [...counts(jumble, picks).values()]

  // The city's
  const c = CITY()
  const { walks } = WALKING()
  const done = walks.length
  const corners = c.corners.length
  const shortest = c.blocks[c.hotel]
  const crow = -guess(c, c.hotel)
  const firstWalk = blocksOf(walks[0])
  const touched = touchedBy(done)
  const walked = backupsBy(done)
  const share = Math.round((touched / corners) * 100)
  const vi = SWEEPING()
  const big = cornersOf(1000)
  const bump = firstBump()!

  const [walk, setWalk] = useState(1)

  return (
    <Article
      kicker="Reinforcement learning · Planning"
      title="Skip the sweep"
      promise="Value iteration looks at every state in every sweep. When a world has more states than you could look at even once, how can you plan at all?"
      takeaway={
        <>
          Back up states one at a time, in any order, with whatever values the others hold: as long as none is left out
          for ever the values still settle, so you can spend the backups <em>where your play goes</em>.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 4, “Dynamic Programming”, §4.5 “Asynchronous Dynamic Programming” and §4.7 “Efficiency of Dynamic Programming”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'MDP Planning under Uncertainty: Policy and Value Iteration',
        },
      ]}
    >
      <Predict
        question={`A city of ${n(corners)} street corners. You walk from your hotel to the station again and again, and each time you stand on a corner you work out its value, until your numbers can only send you down a shortest route. How many corners do you work out along the way?`}
        options={[
          { label: `All ${n(corners)}` },
          { label: 'About 5,000' },
          { label: `About ${n(Math.round(touched / 100) * 100)}`, right: true },
          { label: `${shortest}: the route itself` },
        ]}
        reveal={
          <>
            {n(touched)}, about {share}% of the city. The early walks stray, so it is more than the route, but nine
            corners in ten are never looked at: no walk comes near them, and none needs to. The numbers are still right
            where it counts.
          </>
        }
      />

      <h2>One square, then a city</h2>

      <Steps
        say={[
          <>
            On the board, value iteration swept all {squares} squares {VI_SWEEPS} times. Backgammon has more than 10
            <sup>20</sup> positions: at a billion backups a second, a single sweep would take over 3,000 years.
          </>,
          <>
            But a backup needs no sweep. Pick any square and give it −1 plus its better move, using whatever its
            landings say right now.
          </>,
          <>
            Pick at random, so that in the first {early} picks square {list(often)} comes up {most} times and{' '}
            {never.length === 1 ? 'square' : 'squares'} {list(never)} not once. After {n(picks)} backups the numbers are
            the best play’s all the same.
          </>,
          <>
            So you may choose which states to back up. Here is a city {c.size} blocks by {c.size}, with a river you can
            cross only at a bridge, and you want to walk from your hotel to the station.
          </>,
          <>
            Guess each corner at minus its blocks to the station as if there were no river, {crow} from the hotel; back
            up each corner you stand on and go where it points. The first walk meets the river and takes {firstWalk}{' '}
            blocks.
          </>,
          <>
            Walk again and again. After {done} walks the numbers can only send you the shortest way, {shortest} blocks,
            and you have backed up {n(touched)} of {n(corners)} corners.
          </>,
          <>
            Backing up states one at a time, in place and in any order, is <strong>asynchronous dynamic
            programming</strong>; backing up the ones you reach as you act, and acting on the newest numbers, is{' '}
            <strong>real-time dynamic programming</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Sweeping key="sweeps" passes={PASSES} pace={160} label="Value iteration on the board, sweep by sweep" />
          ) : step === 1 ? (
            <Picks key="first" from={0} to={early} pace={260} label="Squares backed up one at a time, picked at random" />
          ) : step === 2 ? (
            <Picks key="rest" from={early} to={picks} pace={14} label="Random backups until every square is right" />
          ) : step === 3 ? (
            <Labelled key="city" left={`${n(corners)} corners`} right={`${c.size} × ${c.size} blocks`}>
              <CityMap label="A city with a river down the middle, a hotel west of it and a station east of it" />
            </Labelled>
          ) : step === 4 ? (
            <Trips key="first" from={0} blocks pace={55} label="The first walk: towards the station, along the river, over a bridge" />
          ) : step === 5 ? (
            <Trips key="walks" from={1} to={done} pace={45} label="Walk after walk, the corners backed up spreading round the route" />
          ) : (
            <Labelled key="named" left="Real-time DP" right={`${share}% of states`}>
              <CityMap
                label="Every corner the walks backed up, and the last walk's route"
                walks={done}
                path={walks[done - 1].path}
              />
            </Labelled>
          )
        }
      </Steps>

      <h2>Any state, any order</h2>
      <p>
        The backup itself is the one value iteration used. What changes is how many states it touches at a time: one,
        whichever you pick, with the others left as they are.
      </p>
      <p className="not-prose my-8 text-center font-serif text-[1.05rem] whitespace-nowrap sm:text-2xl">
        V(s<sub>k</sub>) ← max<sub>a</sub> Σ p(s′, r | s<sub>k</sub>, a) [r + γV(s′)]
      </p>
      <p>
        Here s<sub>k</sub> is whichever state you chose for backup k. The in-place sweeps of{' '}
        <Link to="/learnings/policy-evaluation">Judging a way of playing</Link> were already halfway there: they read
        values written moments earlier in the same sweep. Drop the fixed order too, and you have it. Here is the first
        corner the first walk backs up on the river bank:
      </p>
      <Numbers
        items={[
          { label: 'Guess', value: signed(bump.guess, 0) },
          { label: 'Best landing', value: signed(bump.landing, 0) },
          { label: 'New value', value: signed(bump.value, 0) },
        ]}
      />
      <p>
        No move goes east, so the corner learns in one backup that it is two blocks further than it looked. Its
        neighbours learn it only when a walk stands on them.
      </p>
      <p>
        Does it still end on the right numbers? With discounting, yes, provided no state is left out for ever: each
        must keep coming up, however rarely. Without discounting, as here, a few odd orders can fail, but they are easy
        to avoid. The walker can skip most of the city only because its guesses are never gloomier than the truth. Start
        hopeful if you will skip; <Link to="/learnings/optimistic-initial-values">Optimism explores</Link> shows why
        that works.
      </p>

      <h2>Walk by walk</h2>
      <p>Move through the walks. The shading deepens where the river made a corner further than its guess.</p>
      <Figure
        caption={
          <>
            All {done} walks cost {n(walked)} backups, less than {Math.ceil(walked / corners)} of value iteration’s full
            sweeps; started from the same guess, value iteration needs {vi.sweeps} sweeps, {n(vi.backups)} backups,
            before its numbers send you only the shortest way.
          </>
        }
      >
        <Walks walk={walk} />
        <Controls>
          <Slider label="Walk" value={walk} min={1} max={done} onChange={setWalk} />
        </Controls>
      </Figure>
      <p>
        The walks’ cost depends on the trip, not the city. In a city ten times wider, they would back up the very same
        corners; each sweep would grow a hundredfold.
      </p>
      <Numbers
        words
        items={[
          { label: 'Walking, any city', value: n(walked) },
          { label: `Sweeping, ${c.size} × ${c.size}`, value: n(vi.backups) },
          { label: 'Sweeping, 1,000 × 1,000', value: `${Math.round((vi.sweeps * big) / 1e6)} million` },
        ]}
      />

      <Predict
        kicker="Quick check"
        question={`On the board, random picks needed ${n(picks)} backups to get every square right; value iteration’s sweeps needed ${n(viBackups)}. So what does giving up the sweep buy you?`}
        options={[
          { label: 'Fewer backups, always' },
          { label: 'The choice of what to back up', right: true },
          { label: 'More exact values' },
          { label: 'Nothing at all' },
        ]}
        reveal={
          <>
            The choice. Picking blindly wastes backups on squares whose landings have not changed, so it can cost more
            than sweeping. Choosing well is what pays: in place from the finish down, the board needs only{' '}
            {n(downBackups)}, and the walker skipped {100 - share}% of the city. Without sweeps you are also never stuck
            finishing one before anything improves.
          </>
        }
      />

      <h2>Spending backups well</h2>
      <ul>
        <li>
          <strong>Back up where you will be.</strong> Plan while you act: the states you actually reach are the ones
          whose values matter, and your newest numbers steer the very next move.
        </li>
        <li>
          <strong>Order them so news travels.</strong> A backup is wasted if nothing it reads has changed. Working back
          from where the rewards are moves information furthest per backup; a later page,{' '}
          <em>prioritized sweeping</em>, picks states by how much their values are about to move.
        </li>
        <li>
          <strong>Don’t starve the states you need.</strong> Values everywhere need backups everywhere, again and again.
          Skipping is only safe for states that good play never reaches.
        </li>
      </ul>
      <p>
        Skipping sweeps is not, by itself, less work: the random picks spent between {Math.min(...allCounts)} and{' '}
        {Math.max(...allCounts)} backups on each square, more in all than sweeping. What it removes is the wait. A sweep must
        finish before any of its news helps, and on a big enough world it never finishes.
      </p>

      <Predict
        kicker="Check yourself"
        question="A chess program faces far more positions than it could ever sweep, and has a few seconds for each move. Which of these can it actually do?"
        options={[
          { label: 'Nothing: planning needs sweeps' },
          { label: 'Value iteration on a faster computer' },
          { label: 'Back up the positions just ahead of this one, then move', right: true },
          { label: 'Back up positions picked at random' },
        ]}
        reveal={
          <>
            Back up what is just ahead. The positions that can follow the one on the board are the only ones this move
            depends on, and there are few enough to work on in seconds. No computer can sweep chess, and random
            positions would almost never be ones the game reaches.
          </>
        }
      />
    </Article>
  )
}
