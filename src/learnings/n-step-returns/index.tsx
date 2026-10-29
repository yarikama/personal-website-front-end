import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Hike from './Hike'
import Learn from './Learn'
import { ALL, AVERAGE_MISS, BEST, COLUMNS, FIRST_GUESS, HIKES, lambdaWeight, RUNS, showN, storyReturn, STRIP_HIKES, TRUE } from './model'
import Strip from './Strip'

const offBy = (minutes: number) => Math.round(Math.abs(minutes))

export default function NStepReturns() {
  const one = COLUMNS[0]
  const whole = COLUMNS[COLUMNS.length - 1]
  const missOf = (n: number) => Math.round(AVERAGE_MISS.find((m) => m.n === n)!.miss)
  return (
    <Article
      kicker="Reinforcement learning · Values"
      title="Walk a few steps, then guess"
      promise="Trust your next guess after a single step, or wait for the real ending: which learns better?"
      takeaway={
        <>
          An n-step return adds up n real rewards, then trusts the guess where they lead. More steps mean less error
          from wrong guesses and more from luck, and the best n usually lies <em>in between</em>.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 6, §6.3 “Optimality of TD(0)”; Chapter 7, “n-step Bootstrapping”, §7.1 “n-step TD Prediction”; Chapter 12, “Eligibility Traces”, §12.1 “The λ-return”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lecture “Policy Evaluation using Data”',
        },
      ]}
    >
      <Predict
        question={`You learn how long a foggy trail takes from each signpost, starting from a rough guess on every post, over ${HIKES} hikes. To check a post’s guess, what should you walk before trusting the chalk on a later post?`}
        options={[
          { label: 'One leg' },
          { label: 'A few legs', right: true },
          { label: 'All the way' },
          { label: 'It’s all the same' },
        ]}
        reveal={
          <>
            A few legs. Trusting the very next post leans on chalk that starts out wrong, and news from the hut creeps
            back one post per hike. Walking all the way trusts no chalk, but every number carries that day’s luck. In
            the trail below, {showN(BEST.n)} legs ends {HIKES} hikes off by {missOf(BEST.n)} minutes; one leg by{' '}
            {missOf(1)}, the whole way by {missOf(ALL)}.
          </>
        }
      />

      <h2>Three ways to check a guess</h2>

      <Steps
        readable
        say={[
          <>Every weekend you hike to a hut, and you’ve chalked a guess on each signpost: the minutes still to go. The trailhead says 150.</>,
          <>
            To check it, walk one leg and trust the next post: 7 minutes walked plus its 140 makes {storyReturn(1)}.
            Quick, but only as good as that chalk.
          </>,
          <>
            Or walk all the way and time it: {storyReturn(10)} minutes today, with a wrong fork in the fog. No chalk at
            all, but all of today’s luck.
          </>,
          <>Or walk three legs, 21 minutes, and add the 115 chalked there: {storyReturn(3)}. A little chalk, a little luck.</>,
          <>
            Each post is a state, its chalk is the value V, the minutes are rewards, and three legs plus the chalk is a{' '}
            <em>3-step return</em>. One leg is TD(0); all the way is Monte Carlo.
          </>,
        ]}
      >
        {(step) => <Hike key={step} step={step} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        In words: <strong>n-step return = the next n rewards + the guess where they lead</strong>. If the episode ends
        before n steps, it is just the rewards: the whole return.{' '}
        <Link to="/learnings/temporal-difference-learning">Temporal-difference learning</Link> took one reward and a
        guess; <Link to="/learnings/monte-carlo-prediction">Monte Carlo</Link> took every reward and no guess. This
        fills in everything between.
      </p>
      <Clip
        src="n-step-returns/nstep-return"
        label="The return written term by term: R t plus 1, plus gamma R t plus 2, plus gamma squared R t plus 3, and on to the end. A cut after three terms: the tail is replaced by gamma cubed times V of S t plus 3, your guess for the rest. Then the general n-step return, with n equal to 1 giving TD zero and n reaching the end giving Monte Carlo."
        caption="Keep the first n rewards; swap everything after them for one guess. Where you cut is the only difference between TD(0) and Monte Carlo."
      />
      <p>The trailhead’s three checks from the story, against its chalked 150:</p>
      <Numbers
        items={[
          { label: '1 leg', value: storyReturn(1), note: '7 + 140' },
          { label: '3 legs', value: storyReturn(3), note: '21 + 115' },
          { label: 'All the way', value: storyReturn(10), note: 'timed' },
        ]}
      />
      <p>
        The update is the familiar one, V(S<sub>t</sub>) ← V(S<sub>t</sub>) + α[G<sub>t:t+n</sub> − V(S<sub>t</sub>)],
        with the <strong>n-step return</strong> G<sub>t:t+n</sub> as its target. It happens n steps late, once those
        rewards are in. On a trail every minute counts the same, so γ = 1.
      </p>

      <h2>Two ways to be wrong</h2>
      <p>
        Say every chalk mark is a fifth too low: you wrote them last spring, when you were faster. Here is the
        trailhead’s n-step return over {STRIP_HIKES} hikes in the fog, for each n.
      </p>
      <Figure
        readable
        caption={`One leg gives nearly the same number every hike, but it is the chalk’s number, ${offBy(one.mean - TRUE[0])} minutes short: that is bias. All the way is right on average but scattered by about ${Math.round(whole.sd)} minutes either way: that is variance. Each extra leg trades some of one for some of the other.`}
      >
        <Strip />
      </Figure>
      <p>
        So more steps means <strong>less bias, more variance</strong>. Neither end is best in general: which wins
        depends on how wrong the guesses are and how noisy the world is.
      </p>

      <h2>Learn the trail</h2>
      <p>
        Now the guesses start wrong and improve as you go: every post begins at {FIRST_GUESS} minutes, and each hike
        moves them toward their n-step returns. Pick how many legs to walk before trusting the chalk.
      </p>
      <Figure
        readable
        caption={`The bars are the chalk after each hike; the outlines are the true minutes left. With one leg, the hut’s news crawls back about a post per hike, and the posts far from it are still near where they started. All the way, every mark swings with the day’s luck. Over ${RUNS} runs, ${showN(BEST.n)} legs ends closest.`}
      >
        <Learn />
      </Figure>

      <Predict
        kicker="Quick check"
        question="Your chalk marks are careful averages of years of hikes, nearly exact. But this season, landslides make every hike’s times swing wildly. Which way should you lean?"
        options={[
          { label: 'Fewer legs', right: true },
          { label: 'More legs' },
          { label: 'All the way' },
          { label: 'It makes no difference' },
        ]}
        reveal={
          <>
            Fewer legs. Good chalk means little bias to escape, and wild times mean every extra leg adds noise. Lean on
            the guesses when they are good and the world is noisy; walk further when the guesses are poor.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Tune n with the step.</strong> The best n depends on the step size α and on the problem. On this trail
          a bigger step favours fewer legs and a smaller one more. Try a few of each.
        </li>
        <li>
          <strong>Expect a delay of n steps.</strong> A state can’t be updated until its next n rewards are in, and
          the last few states of an episode are updated at its end with whatever rewards are left.
        </li>
        <li>
          <strong>Or blend every n.</strong> The <em>λ-return</em> averages all the n-step returns at once, giving each
          a share λ times the one before. With λ = 0.5, the shares are:
        </li>
      </ul>
      <Numbers
        items={[1, 2, 3].map((n) => ({
          label: `${n} step${n > 1 ? 's' : ''}`,
          value: lambdaWeight(0.5, n),
          note: n === 1 ? 'half' : n === 2 ? 'a quarter' : 'an eighth',
        }))}
      />
      <p>
        λ = 0 puts all the weight on one step, TD(0); λ = 1 pushes it all to the end, Monte Carlo. Like n, λ sets the
        balance between bias and variance, but with one smooth dial.
      </p>

      <Predict
        kicker="Check yourself"
        question="A friend played a two-room escape game ten times. Nine times she started in room B and got out in 6 of them (worth 1; failing is 0). Once she started in room A, walked into room B, and failed. Replaying these games until the numbers settle, what is room A worth to a one-step learner, and to Monte Carlo?"
        options={[
          { label: '0.6 and 0', right: true },
          { label: '0 and 0.6' },
          { label: '0 and 0' },
          { label: '0.6 and 0.6' },
        ]}
        reveal={
          <>
            Monte Carlo averages room A’s only game: 0. The one-step learner says A leads to B, and B got her out 6
            times in 10, so A is worth 0.6. If what happens in B doesn’t depend on how you got there, 0.6 is the better
            bet: one step uses that structure, and Monte Carlo ignores it.
          </>
        }
      />
    </Article>
  )
}
