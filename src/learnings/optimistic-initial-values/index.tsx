import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import {
  BEST_FLAVOUR,
  CHANGE_AT,
  crowd,
  CUSTOMERS,
  FRIEND_EPSILON,
  FRIEND_STARTS,
  leftAfter,
  machines,
  MACHINES,
  meanOf,
  MINT,
  ratingsAfter,
  settledAt,
  SHOP_VISITS,
  STARTS,
  STEPS,
  story,
  VISITS,
} from './model'
import Shares, { Compare } from './Shares'
import Shop from './Shop'

export default function OptimisticInitialValues() {
  // The story's run, and the numbers it tells
  const visits = useMemo(() => story(), [])
  const settled = settledAt(visits)
  const final = ratingsAfter(visits, VISITS)

  const [start, setStart] = useState<(typeof STARTS)[number]>(5)
  const [friendStart, setFriendStart] = useState<(typeof FRIEND_STARTS)[number]>(0)
  const hopeful = machines(start)
  const random = machines('realist')
  const you = crowd('you')
  const friend = crowd(friendStart)

  return (
    <Article
      kicker="Reinforcement learning · Bandits"
      title="Optimism explores"
      promise="How can someone who always orders their favourite still end up trying the whole menu?"
      takeaway={
        <>
          Start every estimate high and even a learner that never picks at random will <em>explore</em>, but only
          once: the hope is spent at the start, so a world that changes later needs exploring that lasts.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 2, “Multi-armed Bandits”, §2.6 “Optimistic Initial Values”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="A new ice-cream shop has six flavours. You always order the one you rate highest, never one at random, but before tasting any you rate them all a perfect 10. What happens?"
        options={[
          { label: 'You stick with the first one' },
          { label: 'You try them all, then settle on the best', right: true },
          { label: 'You keep switching forever' },
          { label: 'You settle on the last one you try' },
        ]}
        reveal={
          <>
            You taste every flavour, a few of them twice, and from visit {settled} on you order the best one every
            time. No scoop can live up to a 10, so whatever you just ate drops below the flavours you haven’t tried
            yet. Here is how it goes.
          </>
        }
      />

      <h2>A new ice-cream shop</h2>

      <Steps
        say={[
          <>A new ice-cream shop opens with six flavours. You haven’t tasted any, so you imagine every one is a 10.</>,
          <>
            You always order the flavour you rate highest; they’re all tied, so you start with Vanilla. It’s a 6: nice,
            but no 10, so you move your rating halfway toward it, down to 8.
          </>,
          <>Now every flavour you haven’t tasted beats Vanilla’s 8, so you order those next, and each lets you down.</>,
          <>
            After six visits you’ve had the whole menu. Pistachio disappointed you least, but its rating sinks too, so
            the lead changes hands a few more times.
          </>,
          <>
            From visit {settled} on you order Pistachio every time, and it really is the best in the shop. You never
            once picked at random.
          </>,
          <>
            This is a <strong>greedy</strong> learner, one that never explores on purpose, with{' '}
            <strong>optimistic initial values</strong>: each flavour is an arm, and the 10 you imagined is every arm’s
            starting estimate.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Shop key="hope" visits={visits} from={0} to={0} pace={1} />
          ) : step === 1 ? (
            <Shop key="vanilla" visits={visits} from={0} to={1} pace={2600} />
          ) : step === 2 ? (
            <Shop key="round" visits={visits} from={1} to={6} pace={1400} />
          ) : step === 3 ? (
            <Shop key="lead" visits={visits} from={6} to={settled - 1} pace={1400} />
          ) : (
            <Shop
              key={step === 4 ? 'settle' : 'named'}
              visits={visits}
              from={step === 4 ? settled - 1 : VISITS}
              to={VISITS}
              pace={220}
              truth
              named={step === 5}
            />
          )
        }
      </Steps>

      <p>
        Nothing in your rule says “explore”. The exploring comes from the hope. While a flavour’s rating is still a
        guess, it beats every flavour you’ve actually eaten, so the untried always go next. Start every estimate above
        anything the world could really pay, and a learner that only ever takes the best-looking option still tries
        everything.
      </p>

      <h2>How long the hope lasts</h2>
      <p>
        Each taste moved a rating a fixed share of the way toward what you tasted: the{' '}
        <Link to="/learnings/exploration-and-exploitation">running update</Link>{' '}
        <strong>new = old + step × (latest − old)</strong>, with a step that stays the same. You used a half; learning
        programs often use a tenth, written α. Every reward then closes the same share of the gap between the estimate
        and the truth:
      </p>
      <Clip
        src="optimistic-initial-values/optimism-drains"
        label="The update, new estimate equals old plus alpha times reward minus old, rewritten as: the new gap to the reward is one minus alpha times the old gap. So after k rewards, one minus alpha to the k of the starting gap is left. Starting at 5 with alpha 0.1 and rewards of 1: 5, 4.6, 4.24, 3.92."
        caption={
          <>
            After k rewards, <strong>(1 − α)<sup>k</sup></strong> of the starting gap is left. Start at 5 with α = 0.1
            and rewards of about 1, and the estimate goes 5, 4.6, 4.24, 3.92: down by less each time.
          </>
        }
      />
      <Numbers
        items={[1, 10, 30].map((k) => ({
          label: `After ${k} ${k === 1 ? 'try' : 'tries'}`,
          value: leftAfter(5, 1, 0.1, k).toFixed(1),
          note: 'from 5',
        }))}
      />
      <p>
        A starting value that leans the estimates like this is called a <strong>bias</strong>. With a plain average
        the first reward counts in full, so the bias is gone after one try and the hope buys a single round. With a
        fixed step it fades but never quite leaves: the shop still rates Mint {final[MINT].toFixed(1)}, though it’s
        usually a 4.5, because you never went back. The bias is also useful: the start is where you can put what you
        already know, such as how big rewards usually are.
      </p>

      <h2>Ten arms, {MACHINES} machines</h2>
      <p>
        Now the real thing: {MACHINES} slot machines with ten arms each, every arm paying its own average plus noise.
        The optimist never picks at random but starts every estimate high; the{' '}
        <Link to="/learnings/exploration-and-exploitation">ε-greedy</Link> learner starts at 0 and picks at random 1
        time in 10. Both use α = 0.1. The line is the share of machines where that step’s pull was the best arm.
      </p>
      <Figure caption="The optimist starts worse: its first rounds go to hopes that every arm lets down. Once they drain, it pulls the best arm more often than ε-greedy, which keeps spending one pull in ten at random. Start it at 0 and it never explores; start it at 20 and it takes longer to drain.">
        <Shares
          series={[
            { shares: hopeful.best, tone: 'sage', label: `Starts at ${start}` },
            { shares: random.best, tone: 'ink', label: 'ε-greedy' },
          ]}
          axis={`Step, over ${STEPS.toLocaleString('en')}`}
          window={15}
          label="Share of machines pulling the best arm at each step, for the optimist and for ε-greedy"
        />
        <Compare
          columns={[
            { label: `Starts at ${start}`, tone: 'sage' },
            { label: 'ε-greedy', tone: 'ink' },
          ]}
          rows={[
            { label: 'Steps 1–100', shares: [meanOf(hopeful.best, 0, 100), meanOf(random.best, 0, 100)] },
            { label: `Steps 901–${STEPS}`, shares: [meanOf(hopeful.best, 900), meanOf(random.best, 900)] },
          ]}
        />
        <Controls>
          <Choice label="Optimist starts at" options={STARTS} value={start} onChange={setStart} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Weeks after you settle on Pistachio, Mint gets a new recipe and becomes the best in the shop. You still only order your top-rated flavour. What happens?"
        options={[
          { label: 'You find out within days' },
          { label: 'You try everything again' },
          { label: 'You almost never find out', right: true },
          { label: 'Pistachio starts to taste worse' },
        ]}
        reveal={
          <>
            Your rating for Mint is still the {final[MINT].toFixed(1)} from one scoop long ago, below Pistachio’s{' '}
            {final[BEST_FLAVOUR].toFixed(1)}, and nothing makes you taste it again. Your hope was spent on the first
            rounds, and those don’t come back.
          </>
        }
      />

      <h2>The start happens only once</h2>
      <p>
        Optimism makes a learner explore at the start, and only then. Once its hopes have drained it is a plain greedy
        learner, and if the world changes later, nothing sends it back to look. Here are {CUSTOMERS} customers in the
        shop, and after {CHANGE_AT} visits Mint gets its new recipe. Beside you, a friend who picks at random 1 visit
        in {Math.round(1 / FRIEND_EPSILON)}.
      </p>
      <Figure caption="Before the change, your hope finds Pistachio sooner than her random picks do. After it, you keep ordering Pistachio, while her random visits run into the new Mint. Start her at 10 as well and she gets both: a quick start, and a way to notice change.">
        <Shares
          series={[
            { shares: you, tone: 'ink', label: 'You' },
            { shares: friend, tone: 'sage', label: 'Friend' },
          ]}
          axis={`Visit, over ${SHOP_VISITS}`}
          window={9}
          mark={{ at: CHANGE_AT, label: 'Mint’s new recipe' }}
          label="Share of customers ordering the best flavour at each visit, for you and for a friend who picks at random sometimes; Mint becomes the best at visit 100"
        />
        <Compare
          columns={[
            { label: 'You', tone: 'ink' },
            { label: 'Friend', tone: 'sage' },
          ]}
          rows={[
            {
              label: `Visits ${CHANGE_AT - 19}–${CHANGE_AT}`,
              shares: [meanOf(you, CHANGE_AT - 20, CHANGE_AT), meanOf(friend, CHANGE_AT - 20, CHANGE_AT)],
            },
            {
              label: `Visits ${SHOP_VISITS - 19}–${SHOP_VISITS}`,
              shares: [meanOf(you, SHOP_VISITS - 20), meanOf(friend, SHOP_VISITS - 20)],
            },
          ]}
        />
        <Controls>
          <Choice label="Friend starts every rating at" options={FRIEND_STARTS} value={friendStart} onChange={setFriendStart} />
        </Controls>
      </Figure>

      <h2>Using it</h2>
      <ul>
        <li>
          <strong>Take it as a free start.</strong> Setting every starting estimate high costs nothing and makes even a
          greedy learner try everything. It does best when the world holds still.
        </li>
        <li>
          <strong>Start just above the best you expect.</strong> Too low and nothing gets tried; far too high and the
          learner wastes a long while draining hopes before it earns much.
        </li>
        <li>
          <strong>Keep exploring if the world can change.</strong> Optimism is spent once. Add a few random picks, a{' '}
          <Link to="/learnings/tracking-change">step that keeps up with change</Link>, or a{' '}
          <Link to="/learnings/upper-confidence-bound">bonus for the little-tried</Link> that grows back whenever an
          arm is left alone.
        </li>
        <li>
          <strong>Put what you know in the start.</strong> The starting value is a bias you choose, so if you know
          roughly what rewards look like, start there rather than at 0.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A learner keeps a plain average of each arm’s rewards and starts every estimate at 100. Rewards are around 1. How many pulls of an arm before the 100 stops mattering?"
        options={[{ label: 'One', right: true }, { label: 'About 10' }, { label: 'About 100' }, { label: 'It never fully goes' }]}
        reveal={
          <>
            A plain average counts the first reward in full (its step is 1/1), so the estimate jumps straight to that
            reward and the 100 is gone. This learner tries each arm once and is then simply greedy. For optimism to
            last longer, the step has to stay fixed, so the hope drains a share at a time.
          </>
        }
      />
    </Article>
  )
}
