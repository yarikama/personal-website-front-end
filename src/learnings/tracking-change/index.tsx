import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Cafe from './Cafe'
import Drift from './Drift'
import {
  AFTER,
  BEFORE,
  EPSILON,
  FRIEND_STEP,
  GOOD,
  MACHINES,
  NEW_VISITS,
  OLD_VISITS,
  percent,
  plainVisitsToFall,
  STEP_SIZES,
  steadyVisitsToFall,
  story,
  VISITS,
  weights,
  WORLDS,
  type Step,
  type World,
} from './model'
import Weights from './Weights'

const WEIGHT_STEPS: readonly Step[] = ['average', 0.05, 0.1, 0.2]
const showStep = (step: Step) => (step === 'average' ? '1/n' : String(step))
const showWorld = (world: World) => (world === 'drifting' ? 'Drift' : 'Hold still')

export default function TrackingChange() {
  // The story's café, and the numbers it tells, from its run
  const { ratings, yours, hers, yourFall, herFall } = useMemo(() => story(), [])
  const all = OLD_VISITS + NEW_VISITS
  const settled = yours[OLD_VISITS - 1].toFixed(1)

  const [weightStep, setWeightStep] = useState<Step>(FRIEND_STEP)
  const [world, setWorld] = useState<World>('drifting')
  const [step, setStep] = useState<(typeof STEP_SIZES)[number]>(0.1)

  const cafe = (key: string, from: number, to: number, pace: number, friend = false, reveal = false) => (
    <Cafe key={key} ratings={ratings} yours={yours} hers={hers} from={from} to={to} pace={pace} friend={friend} reveal={reveal} />
  )

  return (
    <Article
      kicker="Reinforcement learning · Bandits"
      title="When the world changes"
      promise="Your favourite café got a new chef, and it has gone downhill. How long until your opinion catches up?"
      takeaway={
        <>
          When the world changes, move a <em>fixed step</em> toward each new reward, so recent rewards count most and
          old ones fade away.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 2, “Multi-armed Bandits”, §2.4 “Incremental Implementation” and §2.5 “Tracking a Nonstationary Problem”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question={`You’ve been to a café ${OLD_VISITS} times, and every visit was a ${BEFORE} out of 10. A new chef arrives, and now every visit is a ${AFTER}. Your score for the café is the average of all your visits. How many visits with the new chef until it is down to ${GOOD}?`}
        options={[{ label: '2' }, { label: '5' }, { label: '10' }, { label: String(plainVisitsToFall(OLD_VISITS)), right: true }]}
        reveal={
          <>
            {plainVisitsToFall(OLD_VISITS)}: as many bad visits as there were good ones. In a plain average each new
            visit is one vote among all the old ones, so the longer you’ve known a place, the slower you notice it
            change. Here is a way to notice sooner.
          </>
        }
      />

      <h2>A café with a new chef</h2>

      <Steps
        say={[
          <>
            You’ve eaten at the café on your corner {OLD_VISITS} times. Most visits were about an {BEFORE} out of 10, and
            your score for it, the average of them all, is {settled}.
          </>,
          <>Then a new chef takes over, and the food drops to about a {AFTER}.</>,
          <>
            Each bad meal is only one visit among many, so your average sinks slowly: it takes {yourFall} bad visits to
            come down to {GOOD}.
          </>,
          <>
            Your friend has been going just as long, but she keeps score another way: after each visit, she moves her
            score a fifth of the way toward it.
          </>,
          <>
            Her score wobbles more while the chef stays the same. But when the chef changes, it is down to {GOOD} after{' '}
            {herFall} bad visits. Yours takes {yourFall}.
          </>,
          <>
            Each visit is a <strong>reward</strong>, and each score an <strong>estimate</strong> of the next. Her fixed
            step makes recent rewards count most: each one further back counts four-fifths as much as the one after
            it.
          </>,
        ]}
      >
        {(step) =>
          step === 0
            ? cafe('before', 0, OLD_VISITS, 150)
            : step === 1
              ? cafe('chef', OLD_VISITS, OLD_VISITS + 4, 500)
              : step === 2
                ? cafe('slow', OLD_VISITS + 4, all, 150)
                : step === 3
                  ? cafe('friend', 0, OLD_VISITS, 150, true)
                  : step === 4
                    ? cafe('fast', OLD_VISITS, all, 220, true)
                    : cafe('reveal', all, all, 1, true, true)
        }
      </Steps>

      <p>
        Neither of you is wrong. Your plain average is the best you can do when the café never changes: every meal
        helps you see through the luck of any one night. Her score is the better one when it does change, because she
        lets old meals go.
      </p>

      <h2>One rule, two step sizes</h2>
      <p>
        In <Link to="/learnings/exploration-and-exploitation">Explore or exploit</Link> you kept a running average
        without a notebook: <strong>new = old + step × (latest − old)</strong>. Most learning rules in reinforcement
        learning have this shape. The latest reward is the <em>target</em> the estimate moves toward, the gap in
        brackets is its error, and the <em>step size</em> says how far one error moves it.
      </p>
      <p>
        For the plain average the step is 1/n: a half on the second visit, a twentieth on the twentieth. It shrinks as
        visits pile up, which is why your score hardly moved. Your friend keeps hers fixed at a fifth. Call a fixed step
        α (alpha), replace each old estimate with the line that made it, and her score turns out to be a weighted sum
        of every reward she has seen:
      </p>
      <Clip
        src="tracking-change/unroll"
        label="Q k plus 1 equals Q k plus alpha times R k minus Q k, rewritten as alpha R k plus one minus alpha times Q k, then unrolled into alpha R k, plus one minus alpha times alpha R k minus 1, and so on, plus one minus alpha to the k times the starting guess Q 1. With alpha 0.1 the weights are 0.1, 0.09, 0.081 and so on, and with the start's 0.9 to the k they add up to 1."
        caption={
          <>
            Each reward is weighed by α, times (1 − α) once for every reward that came after it. What’s left of the
            starting guess is (1 − α) multiplied once per reward. With α = 0.1 the weights run 0.1, 0.09, 0.081, and
            together they make exactly 1.
          </>
        }
      />
      <p>With your friend’s step of a fifth, each visit’s share of her score is:</p>
      <Numbers
        items={[0, 5, 20].map((back) => ({
          label: back === 0 ? 'The latest visit' : `${back} visits back`,
          value: percent(FRIEND_STEP * (1 - FRIEND_STEP) ** back),
        }))}
      />
      <p>
        Weights that shrink by the same factor at every step back are called an{' '}
        <strong>exponential recency-weighted average</strong>. It is still an average, since the weights add up to 1,
        but one that leans on the recent past. Here it is as visits come in:
      </p>

      <Figure caption="Each visit enters on the right and slides back, shrinking by the same factor every visit. With 1/n every visit counts the same, and the starting guess drops out at the first visit. With a fixed step the newest counts most, and a little of the start always remains.">
        <Weights key={String(weightStep)} step={weightStep} />
        <Controls>
          <Choice label="Step size" options={WEIGHT_STEPS} value={weightStep} onChange={setWeightStep} format={showStep} />
        </Controls>
      </Figure>

      <h2>Settle down, or keep up</h2>
      <p>
        Which step is right depends on two needs that pull against each other. Added up over time, the steps must be
        big enough to carry the estimate away from wherever it started and past the luck of any one reward. And sooner
        or later they must get small, or the estimate never stops moving. The 1/n step does both, so the plain average
        closes in on the true value, the way a coin tossed more often lands closer to half heads. A fixed step never
        gets small, so the estimate never settles: it keeps answering to the last few rewards. That is a flaw when
        nothing changes, and exactly what you want when something does.
      </p>

      <h2>Ten arms that drift</h2>
      <p>
        Here is the same choice on a slot machine with ten arms, on {MACHINES} machines at once. Every arm’s payout
        starts the same and wanders a little at every pull, so the best arm now may not be the best later. Both players
        pull an arm at random 1 time in {Math.round(1 / EPSILON)}, and otherwise the arm that scores best; one keeps
        plain averages, the other a fixed step. The lines show the share of machines where the pull went to the arm
        that was best at that moment.
      </p>
      <Figure caption="When the arms drift, the plain average falls behind: its scores are mostly memories of a world that has moved on. Make the arms hold still and the plain average wins again. A step of 0.5 chases noise; 0.02 is too slow to keep up.">
        <Drift world={world} step={step} />
        <Controls>
          <Choice label="The arms" options={WORLDS} value={world} onChange={setWorld} format={showWorld} />
          <Choice label="Fixed step" options={STEP_SIZES} value={step} onChange={setStep} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Another friend moves his score halfway toward each visit, not a fifth of the way. Compared with her score, his…"
        options={[
          { label: 'Catches up later' },
          { label: 'Catches up sooner, and is steadier' },
          { label: 'Catches up sooner, but jumps around more', right: true },
          { label: 'Never catches up' },
        ]}
        reveal={
          <>
            A bigger step forgets faster: {BEFORE} + ½ × ({AFTER} − {BEFORE}) = {GOOD}, so{' '}
            {steadyVisitsToFall(0.5) === 1 ? 'one bad visit is' : `${steadyVisitsToFall(0.5)} bad visits are`} enough,
            against her {steadyVisitsToFall(FRIEND_STEP)}. But under the old chef one unlucky meal swings his score just
            as hard. Every step size trades speed for steadiness.
          </>
        }
      />

      <h2>Choosing a step</h2>
      <ul>
        <li>
          <strong>If the world holds still, average everything.</strong> A step of 1/n gives every reward the same say
          and settles on the true value.
        </li>
        <li>
          <strong>If it changes, keep the step fixed.</strong> Recent rewards count most, so the estimate follows the
          change. In reinforcement learning that is the usual case: even the agent’s own learning changes what it sees
          next.
        </li>
        <li>
          <strong>A bigger step follows faster, and wobbles more.</strong> Pick it by how fast the world moves compared
          with how noisy one reward is; 0.1 is a common place to start.
        </li>
        <li>
          <strong>Mind the start.</strong> With a fixed step the first guess never quite fades: it is still{' '}
          {percent(weights(0.1, VISITS).start)} of the score after {VISITS} rewards at α = 0.1.{' '}
          <Link to="/learnings/optimistic-initial-values">Optimism explores</Link> turns that into a way to explore.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A navigation app estimates how long your drive to work takes, from your past drives. Over the years roads open, close and fill up. Which way of keeping the estimate serves you best?"
        options={[
          { label: 'The average of every drive ever' },
          { label: 'Only the last drive' },
          { label: 'A small fixed step toward each drive', right: true },
          { label: 'The average of your first month' },
        ]}
        reveal={
          <>
            The roads change, so old drives describe a world that’s gone, and a fixed step lets them fade. Using only
            the last drive goes too far the other way: one jam or one empty road would swing the estimate every day. A
            small step keeps the recent past and averages out its luck.
          </>
        }
      />
    </Article>
  )
}
