import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Arms from './Arms'
import Curves from './Curves'
import Lunches from './Lunches'
import {
  bonus,
  CS,
  MACHINES,
  returnsTo,
  secondVisit,
  SPOTS,
  standing,
  story,
  STORY_C,
  STORY_LUNCHES,
} from './model'

const SALADS = SPOTS.indexOf('Salads')
const TACOS = SPOTS.indexOf('Tacos')

export default function UpperConfidenceBound() {
  // The story's year of lunches, and the numbers it tells, from the run
  const record = useMemo(() => story(), [])
  const back = secondVisit(record, SALADS)!
  const year = standing(record, STORY_LUNCHES, STORY_C)
  const returns = returnsTo(record, SALADS)

  const [c, setC] = useState<(typeof CS)[number]>(2)
  const doubt = (t: number, n: number) => `+${bonus(1, t, n).toFixed(2)}`

  return (
    <Article
      kicker="Reinforcement learning · Bandits"
      title="The benefit of the doubt"
      promise="A lunch spot with 4.6 stars from 2,000 reviews, or one with 4.2 stars from 3: which should you try?"
      takeaway={
        <>
          Explore where you are <em>unsure</em>, not at random: rank each option by how good it looks plus how much it
          could still surprise you.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 2, “Multi-armed Bandits”, §2.7 “Upper-Confidence-Bound Action Selection” and §2.10 “Summary”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="You’ll eat near your new office every workday for a year. Spot A has 4.6 stars from 2,000 reviews. Spot B has 4.2 stars from 3. Where should one of your first lunches be?"
        options={[
          { label: 'A: it’s rated higher' },
          { label: 'B: it could be better, and you’d learn more', right: true },
          { label: 'It makes no difference' },
          { label: 'Neither, until B has more reviews' },
        ]}
        reveal={
          <>
            B. Two thousand people have pinned A down; one more lunch there teaches you nothing. Three reviews say little
            about B: it could really be a 4.8, or a 3.5. A lunch there is cheap, and if B turns out better, you gain on
            every lunch for the rest of the year.
          </>
        }
      />

      <h2>A year of lunches</h2>
      <p>Reviews are other people’s lunches. Here are your own, scored out of 10.</p>

      <Steps
        say={[
          <>You start a new job with four lunch spots nearby, and try each of them once.</>,
          <>
            One lunch says little, so you draw each spot’s score with a bar around it: how much better or worse the
            place might really be.
          </>,
          <>Each day you go wherever a bar reaches highest, so a high score can win, and so can a big doubt.</>,
          <>
            Every lunch at a spot makes you surer of it and shortens its bar, while Salads, not picked again, keeps its
            long one.
          </>,
          <>
            You haven’t been back to Salads since day 2, but its bar creeps up as the weeks pass, until on lunch {back} it
            reaches highest and you give it another go.
          </>,
          <>
            After {STORY_LUNCHES} lunches, Tacos, truly the best, has had {year.visits[TACOS]} of them, and you still
            check on Salads now and then, each time after a longer wait: lunch {returns.join(', then ')}.
          </>,
          <>
            This is a bandit: each spot is an <strong>arm</strong>, the dot is its estimated value Q, and the top of the
            bar, value plus doubt, is the <strong>upper confidence bound</strong> that decides the next pull.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Lunches key="try" record={record} from={0} to={4} pace={900} bars={false} />
          ) : step === 1 ? (
            <Lunches key="doubt" record={record} from={4} to={4} pace={1400} bars="grow" />
          ) : step === 2 ? (
            <Lunches key="pick" record={record} from={4} to={14} pace={750} />
          ) : step === 3 ? (
            <Lunches key="shrink" record={record} from={14} to={back - 5} pace={500} />
          ) : step === 4 ? (
            <Lunches key="return" record={record} from={back - 5} to={back} pace={900} focus={SALADS} />
          ) : step === 5 ? (
            <Lunches key="year" record={record} from={back} to={STORY_LUNCHES} pace={28} truth />
          ) : (
            <Lunches key="named" record={record} from={STORY_LUNCHES} to={STORY_LUNCHES} pace={1} named />
          )
        }
      </Steps>

      <h2>The rule, in one line</h2>
      <p>
        What you just did is called <strong>upper-confidence-bound action selection</strong>, or UCB. Picking at random
        now and then, as in <Link to="/learnings/exploration-and-exploitation">Explore or exploit</Link>, explores too,
        but blindly: a random pick is as likely to land on a spot you already know is poor as on one you’ve barely
        tried. UCB spends its exploring on what it knows least about.
      </p>
      <Clip
        src="upper-confidence-bound/ucb-score"
        label="How good it looks, plus how unsure you still are, becomes Q of a plus c times the square root of log t over N of a. More visits shrink the bonus: 1.52, 0.76, 0.38. More time grows it slowly: 1.52, 2.15, 2.63."
        caption={
          <>
            Score plus doubt. Each visit divides the doubt; time only creeps it back up. The c in front says how much a
            doubt is worth.
          </>
        }
      />
      <p>
        Here t counts every lunch so far, N(a) the lunches at spot a, and ln is the natural logarithm, which grows ever
        more slowly. With c = 1:
      </p>
      <Numbers
        items={[
          { label: 'Tried once, lunch 10', value: doubt(10, 1) },
          { label: 'Tried 4 times, lunch 10', value: doubt(10, 4) },
          { label: 'Tried once, lunch 1,000', value: doubt(1000, 1) },
        ]}
      />
      <p>
        Visits cut the doubt quickly. Time wins it back, but a hundred times as many lunches less than doubles it. So no
        option is dropped for good, yet each return comes after a longer wait.
      </p>

      <h2>Ten arms, pull by pull</h2>
      <p>
        Now the rule on the machine from the earlier pages: ten arms, each paying its own average plus noise. It tries
        every arm once, then pulls wherever the green reaches highest.
      </p>
      <Figure caption="Watch the green tops line up: the rule keeps pulling whichever is highest, so a well-known good arm needs only a thin cap, while a poor one waits until time has grown its cap tall enough. With a small c it settles fast and can miss the best arm; with a big c it keeps checking long after it needs to.">
        <Arms key={c} c={c} />
        <Controls>
          <Choice label="Worth of a doubt, c" options={CS} value={c} onChange={setC} />
        </Controls>
      </Figure>

      <h2>Against random exploring</h2>
      <p>
        One machine is luck. Here are {MACHINES} of them, each played for 1,000 steps by UCB and by the ε-greedy rule
        that picks at random 1 time in 10. The lines are the average reward at each step.
      </p>
      <Figure
        caption={
          <>
            With c up to 2, UCB pulls ahead and stays there; at 4 it re-checks so much that random exploring wins
            over the run. The book compares every method in the chapter this way, each at its best setting, and UCB
            comes out on top. Look at step 11 in the lower chart.
          </>
        }
      >
        <Curves c={c} />
        <Controls>
          <Choice label="Worth of a doubt, c" options={CS} value={c} onChange={setC} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="With c = 2, UCB’s average reward leaps on step 11, then drops back for a few steps. Why?"
        options={[
          { label: 'Its random picks get lucky' },
          { label: 'Every arm has had one try, so it takes the best-looking', right: true },
          { label: 'The arms start paying more' },
          { label: 'c grows after ten steps' },
        ]}
        reveal={
          <>
            Steps 1 to 10 try each arm once, in turn, so they earn an average arm’s reward. On step 11 every doubt is
            equal, and the pick is simply the arm that paid best, often a good one. That arm now has two tries and the
            smallest doubt, so the next steps go back to arms tried once, and the reward dips. A smaller c lets the
            leader keep more of those pulls.
          </>
        }
      />

      <h2>When to reach for it</h2>
      <ul>
        <li>
          <strong>Explore where you’re unsure.</strong> If you can count how often you’ve tried each option, spend your
          curiosity on the ones you’ve tried least, not on a coin flip.
        </li>
        <li>
          <strong>c sets the price of a doubt.</strong> Too small and you settle before you know; too big and you keep
          re-checking what you already know. Between ½ and 1 worked best here.
        </li>
        <li>
          <strong>It assumes the world holds still.</strong> A spot visited a hundred times has a tiny doubt, even if it
          just got a new cook. UCB is hard to adapt to a <Link to="/learnings/tracking-change">changing world</Link>,
          and to problems with too many situations to keep a count for each.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A music app picks songs with UCB. One song was played once, early on, and nobody liked it. Millions of plays later, does it ever play again?"
        options={[
          { label: 'Never: it flopped' },
          { label: 'Yes, but ever more rarely', right: true },
          { label: 'Yes, every so many plays' },
          { label: 'Only if c is 0' },
        ]}
        reveal={
          <>
            Its doubt grows with ln t and has no ceiling, so in time it outgrows the gap and the song gets another
            chance. Because ln t grows more and more slowly, each chance comes after a longer wait. With c = 0 there is
            no doubt at all, and it would never play again.
          </>
        }
      />
    </Article>
  )
}
