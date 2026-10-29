import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { lateBest, MACHINES, percent, RIVER, SCRIPT, settledOnRiver, shifted, story, STORY_MORNINGS } from './model'
import OneMachine from './OneMachine'
import Routes from './Routes'
import Shifted from './Shifted'

const ALPHAS = [0.1, 0.4] as const
const BASELINES = ['Average reward', 'None'] as const
const stepOf = (alpha: number) => `α = ${alpha}`

export default function GradientBandits() {
  // The story's two commuters, and the numbers it tells, from their runs
  const { you, neighbour } = useMemo(() => story(), [])
  const end = you.mornings.at(-1)!
  const theirs = neighbour.mornings.at(-1)!
  const [monday, tuesday, wednesday] = you.mornings
  const stuck = useMemo(() => 1 - settledOnRiver(false, 1000, 5), [])
  // The guess: ten arms paying about 4, with and without the baseline
  const guess = useMemo(() => ({ without: lateBest(shifted(0.1, false)), with: lateBest(shifted(0.1, true)) }), [])

  const [alpha, setAlpha] = useState<(typeof ALPHAS)[number]>(0.1)
  const [baseline, setBaseline] = useState<(typeof BASELINES)[number]>('Average reward')
  const [replays, setReplays] = useState(0)

  return (
    <Article
      kicker="Reinforcement learning · Bandits"
      title="Preferences, not values"
      promise="Can you learn to choose well without ever scoring your options?"
      takeaway={
        <>
          You can learn to choose well by nudging <em>preferences</em>, as long as you judge each result against what
          you usually get.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 2, “Multi-armed Bandits”, §2.8 “Gradient Bandit Algorithms”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="Ten slot machines pay out on every pull, about 4 coins each on average. After each pull you lean more toward the machine you just played, the more it paid. After 1,000 pulls, how often are you on the best one?"
        options={[
          { label: 'Almost always' },
          { label: 'About half the time', right: true },
          { label: '1 in 10, as at first' },
          { label: 'Never' },
        ]}
        reveal={
          <>
            About {percent(guess.without)} of the time, over {MACHINES} sets of machines. Every pull pays, so every
            machine you play gets a push, the poor ones too. Judge each payout against what you usually get instead,
            and it’s {percent(guess.with)}.
          </>
        }
      />

      <h2>Three ways to work</h2>

      <Steps
        say={[
          <>
            You’ve started a new job, and there are three ways to get there. You don’t time them; you just have a habit
            for each, and so far the three are equally strong.
          </>,
          <>
            On Monday you take the highway and get in {monday.early} minutes early. With nothing to compare it with,
            that is simply your usual, and no habit changes.
          </>,
          <>
            Tuesday, the back streets: {tuesday.early} minutes early, worse than usual. That habit weakens, and the other
            two take up what it lost.
          </>,
          <>
            Wednesday, the river road: {wednesday.early} minutes early, well above your usual. That habit grows, and the
            other two give a little way.
          </>,
          <>
            {STORY_MORNINGS} mornings on, you take the river road {Math.round(end.chances[RIVER] * 100)} times in 100,
            and get in {end.usual.toFixed(0)} minutes early as a rule. You never worked out how long any route takes.
          </>,
          <>
            Your neighbour starts the same way, but every early arrival counts as a win for him. Whatever he takes gets
            stronger, so a few good highway mornings lock him onto it: he gets in {theirs.usual.toFixed(0)} minutes
            early, to your {end.usual.toFixed(0)}.
          </>,
          <>
            This is a <strong>gradient bandit</strong>. Each route is an arm, a habit is a <strong>preference</strong>{' '}
            H, your usual is the <strong>baseline</strong> R̄, and how often you take a route is its chance π.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Routes key="start" run={you} who="You" baseline from={0} to={0} pace={1000} />
          ) : step <= 3 ? (
            <Routes key={`morning-${step}`} run={you} who="You" baseline from={step - 1} to={step} pace={2600} />
          ) : step === 4 ? (
            <Routes key="months" run={you} who="You" baseline from={SCRIPT.length} to={STORY_MORNINGS} pace={110} />
          ) : step === 5 ? (
            <Routes key="neighbour" run={neighbour} who="Your neighbour" baseline={false} from={0} to={STORY_MORNINGS} pace={110} />
          ) : (
            <Routes key="named" run={you} who="You" baseline from={STORY_MORNINGS} to={STORY_MORNINGS} pace={110} named />
          )
        }
      </Steps>

      <p>
        Nothing in that figure is a score. In <Link to="/learnings/exploration-and-exploitation">Explore or exploit</Link>{' '}
        you rated each restaurant and went to the best; a preference rates nothing, it only says how strongly you lean.
        And the usual matters: give a thousand neighbours the same first three mornings and about {percent(stuck)} end
        up stuck on a slower road. With a usual to compare against, almost none do.
      </p>

      <h2>From habits to chances</h2>
      <p>
        Preferences become chances in two moves: raise e to the power of each, so every one is positive, then divide
        by their total, so they add up to 1. This is the <em>softmax</em>.
      </p>
      <Clip
        src="gradient-bandits/softmax"
        label="Preferences 1, 2 and 0 become e to the H: 2.72, 7.39 and 1, which total 11.11, giving chances 0.24, 0.67 and 0.09. Adding 3 to every preference multiplies every e to the H, and the total, by about 20, and the chances stay the same."
        caption={
          <>
            Add the same amount to every preference and every e<sup>H</sup>, and their total, grow by one factor. The
            chances don’t move: only the gaps count.
          </>
        }
      />

      <h2>One rule for every choice</h2>
      <p>
        After each choice, take the surprise: the reward minus your usual. Raise the chosen option by step × surprise ×
        (1 − its chance), and lower each other one by step × surprise × its chance. A bad surprise runs it backwards.
      </p>
      <Clip
        src="gradient-bandits/preference-update"
        label="The rule in words, then symbols: the chosen preference rises by alpha times R minus R-bar times one minus its chance; each other falls by alpha times R minus R-bar times its chance. With alpha 0.5, a surprise of 3 and three options at a third each, the chosen one rises by 1 and the other two fall by 0.5."
        caption="What the chosen option gains, the others lose, each in proportion to its chance."
      />
      <p>Here it is on one machine of ten arms paying around 4, as in the guess.</p>
      <Figure caption="With the baseline, the best arm (in sage) pulls ahead, slowly and surely. Without it, whatever gets pulled a lot early shoots up, right or not.">
        <OneMachine key={`${alpha} ${baseline} ${replays}`} alpha={alpha} baseline={baseline === 'Average reward'} />
        <Controls>
          <Choice label="Baseline" options={BASELINES} value={baseline} onChange={setBaseline} />
          <Choice label="Step size" options={ALPHAS} value={alpha} onChange={setAlpha} format={stepOf} />
          <Button onClick={() => setReplays((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Two mornings, both 3 minutes better than usual. One is on a route you take 1 morning in 10, the other on one you take 9 in 10. Whose habit grows more?"
        options={[
          { label: 'The rare route’s', right: true },
          { label: 'The usual route’s' },
          { label: 'Both the same' },
          { label: 'Neither' },
        ]}
        reveal={
          <>
            The chosen habit grows by step × surprise × (1 − its chance): nine tenths of a step for the rare route, one
            tenth for the common one. A habit you nearly always follow has little room left to grow; a good trip on a
            route you seldom take is news.
          </>
        }
      />

      <h2>Why the usual matters</h2>
      <p>Now {MACHINES} machines like it: the share on their best arm, pull by pull, with a baseline and without.</p>
      <Figure caption="Without a baseline every payout is a win, so every arm pulled gets pushed up and early luck decides where many machines end. With it, only better-than-usual payouts push up.">
        <Shifted alpha={alpha} />
        <Controls>
          <Choice label="Step size" options={ALPHAS} value={alpha} onChange={setAlpha} format={stepOf} />
        </Controls>
      </Figure>
      <p>
        Why does it work? If you knew every arm’s payout, you could work out which way to nudge each preference to
        raise the expected reward, and step uphill: <em>gradient ascent</em>. You don’t, but the rule’s step, averaged
        over what you might pick, is exactly that uphill step.
      </p>
      <Clip
        src="gradient-bandits/why-it-climbs"
        label="The slope of expected reward with respect to one preference equals the average, over the arm you pick, of the reward times one-if-picked minus its chance. A baseline times the same bracket averages to zero. So the rule's step, on average, is alpha times the slope."
        caption="Any baseline that doesn’t depend on the arm you pick adds nothing on average. It only changes how much each step wobbles."
      />
      <p>
        So the baseline never changes where the learner heads, only how noisy the way is. Without it, rewards near 4
        make every step a big push that is right only on average; subtract the usual and what’s left is the news. Later
        in the book this grows into <Link to="/learnings/reinforce">policy-gradient</Link> methods, which learn the
        chances directly, and <Link to="/learnings/actor-critic">actor–critic</Link> methods, which learn the baseline
        as well.
      </p>

      <h2>Putting it to work</h2>
      <ul>
        <li>
          <strong>Judge against your usual.</strong> Compare each result with a running average, not with zero, so good
          days and bad days push opposite ways.
        </li>
        <li>
          <strong>Read preferences against each other.</strong> A preference of 3 means nothing alone; what counts is
          how far it sits above the rest.
        </li>
        <li>
          <strong>Learn the choice itself.</strong> When scoring options is hard, learn how likely to pick each one.
          Policy-gradient methods train game players, robots and language models this way.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A news app picks headlines this way, with the average reward as its baseline. Its team changes the rewards: a click now earns 101 points instead of 1, a skip 100 instead of 0. What happens to its learning?"
        options={[
          { label: 'Nothing changes', right: true },
          { label: 'It learns faster' },
          { label: 'It locks onto early picks' },
          { label: 'It stops learning' },
        ]}
        reveal={
          <>
            The usual rises by exactly 100 too, so every surprise, and so every step, is what it was. Without the
            baseline it would be your neighbour: every headline shown would get a big push, and early luck would win.
          </>
        }
      />
    </Article>
  )
}
