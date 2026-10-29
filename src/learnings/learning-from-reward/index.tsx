import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { Kitchen } from './Kitchen'
import { DOZEN_TRIES } from './model'

export default function LearningFromReward() {
  return (
    <Article
      kicker="Reinforcement learning · The problem"
      title="Learning from reward"
      promise="How do you learn to do something well when nobody can show you the right move, only tell you how it went?"
      takeaway={
        <>
          Reinforcement learning is learning what to do from a <em>score</em>, not from answers: try something, see
          how it went, and do more of what worked.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 1, “Reinforcement Learning”, “Examples” and “Elements of Reinforcement Learning”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="Engineers want a robot to learn to walk. Nobody can write down the right motor command for every moment. What do they give it instead?"
        options={[
          { label: 'The right command for each moment, from experts' },
          { label: 'Videos of people walking' },
          { label: 'A number that goes up as it moves forward', right: true },
          { label: 'Nothing at all' },
        ]}
        reveal={
          <>
            A score. Nobody knows the right command for every twitch of every motor, so there are no answers to copy,
            and a robot’s legs are not a person’s. But anyone can say how far it got. The robot tries, watches the
            number, and keeps what made it go up.
          </>
        }
      />

      <h2>Learning to flip a pancake</h2>

      <Steps
        say={[
          <>You’re making pancakes, and nobody tells you how hard to flick the pan.</>,
          <>Too soft, and it doesn’t turn over. Too hard, and it lands on the floor.</>,
          <>All you get is how it went: on the floor, not turned over, or flipped.</>,
          <>So you try again, a little differently each time, steering away from what went badly.</>,
          <>After a dozen tries you’ve found the flick that works. Nobody showed you; you found it by trying.</>,
          <>
            That’s reinforcement learning. You are the <strong>agent</strong>; the pan and pancake are the{' '}
            <strong>environment</strong>; each flick is an <strong>action</strong>, and how it went is the{' '}
            <strong>reward</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Kitchen key="soft" tries={DOZEN_TRIES.slice(0, 1)} />
          ) : step === 1 ? (
            <Kitchen key="soft-hard" tries={DOZEN_TRIES.slice(0, 2)} done={1} />
          ) : step === 2 ? (
            <Kitchen key="four" tries={DOZEN_TRIES.slice(0, 4)} done={2} pace={1300} />
          ) : step === 3 ? (
            <Kitchen key="dozen" tries={DOZEN_TRIES} done={4} pace={1000} />
          ) : (
            <Kitchen key={step === 4 ? 'found' : 'named'} tries={DOZEN_TRIES} done={11} band labels={step === 5} />
          )
        }
      </Steps>

      <h2>A score, not an answer</h2>
      <p>
        Most machine learning learns from a teacher who knows the answers: thousands of examples, each with the
        right label. Picture a coach at your elbow saying exactly how hard to flick. Reinforcement learning has no
        coach, only a scoreboard. It says how good that try was, never what you should have done instead.
      </p>
      <Numbers
        words
        items={[
          { label: 'A coach', value: '“Flick at 5”', note: 'the right answer' },
          { label: 'A scoreboard', value: '“That one: −1”', note: 'how it went' },
          { label: 'A pile of notes', value: '“These look alike”', note: 'no score at all' },
        ]}
      />
      <p>
        Those are the three kinds of machine learning. The coach is <strong>supervised learning</strong>. The
        scoreboard is <strong>reinforcement learning</strong>. The third finds patterns in data that has neither
        answers nor scores, and is called <strong>unsupervised learning</strong>. A score is weaker than an answer:
        a −1 says the flick was wrong, not which way to change it. So the learner has to try things to find out,
        and that trying is the heart of the subject.
      </p>

      <h2>The loop</h2>
      <p>
        Every reinforcement learning problem has the same shape. The agent sees the situation it’s in, called the{' '}
        <strong>state</strong>. It acts. The environment answers with a new state and a reward, a single number.
        Then it all goes round again.
      </p>
      <Clip
        src="learning-from-reward/the-loop"
        label="The agent sends an action to the environment, which sends back a state and a reward, over and over. Laid out in time: state, action, reward, state, action, reward. The goal is to make the sum of all the rewards, R1 + R2 + R3 and so on, as large as possible."
        caption="Round and round, then laid out in time. The goal is the total of every reward to come, not the next one."
      />
      <p>
        Notice what the agent is after: the <em>total</em> of the rewards, over the whole run. A move that scores
        nothing now can still be the best move, if it sets up rewards later: the difference between{' '}
        <Link to="/learnings/reward-and-value">reward and value</Link>.
      </p>

      <Predict
        kicker="Quick check"
        question="Which of these is a reinforcement learning problem?"
        options={[
          { label: 'A spam filter trained on 10,000 labelled emails' },
          { label: 'Grouping shoppers by what they buy' },
          { label: 'A thermostat learning from your complaints and your bill', right: true },
          { label: 'Translating with a bilingual dictionary' },
        ]}
        reveal={
          <>
            The thermostat never hears the right temperature, only a score: you grumble, or the bill is high. It has
            to try settings and learn from how they went. The spam filter has the answers (supervised), the shoppers
            have no score at all (unsupervised), and the dictionary is a lookup.
          </>
        }
      />

      <h2>What makes it hard</h2>
      <ul>
        <li>
          <strong>Nobody tells you the right action.</strong> You only learn what a flick is worth by making it, so
          you have to <Link to="/learnings/exploration-and-exploitation">try things</Link>, including ones that may
          go badly.
        </li>
        <li>
          <strong>Your actions change what you see next.</strong> The pancake you face depends on your last flick.
          The agent’s choices shape its own experience; it’s a loop, not a list of examples.
        </li>
        <li>
          <strong>Consequences can arrive late.</strong> In chess, the move that lost the game may have come thirty
          moves before the end. The reward shows up long after the action that earned it; sharing out the credit
          is <Link to="/learnings/learning-from-every-move">Learning from every move</Link>.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A bookshop’s website learns from clicks. For a month it shows only cookbooks on its front page, and they get plenty of clicks. What can it conclude?"
        options={[
          { label: 'Cookbooks are what its readers like best' },
          { label: 'Nothing yet about the books it never showed', right: true },
          { label: 'Clicks are the wrong score for a bookshop' },
          { label: 'A month is too short to count clicks' },
        ]}
        reveal={
          <>
            Its scores are only for what it chose to show. Novels might have done better, but no click could ever
            land on one. A labelled dataset holds every answer whatever you guess; a learner from reward sees only how
            its own choices went, so what it does decides what it gets to learn.
          </>
        }
      />
    </Article>
  )
}
