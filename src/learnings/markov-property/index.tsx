import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { KNOWINGS, PHOTO, type Knowing } from './model'
import Swing from './Swing'

export default function MarkovProperty() {
  const [knowing, setKnowing] = useState<Knowing>('one photo')

  return (
    <Article
      kicker="Reinforcement learning · Markov decision processes"
      title="Now is enough"
      promise="How much of the past do you need to remember to decide what to do next?"
      takeaway={
        <>
          A good state keeps whatever about the past still matters, so that what happens next depends on{' '}
          <em>now</em> alone. Then deciding from the state is as good as deciding from the whole history.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 3, “Finite Markov Decision Processes”, §3.1 “The Agent–Environment Interface”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="A friend sends you one photo of their child on a swing, the seat right at the bottom of its arc. Can you tell where the seat will be one second later?"
        options={[
          { label: 'Yes: at the bottom still' },
          { label: 'Yes: up at the front' },
          { label: 'No: it could be going either way', right: true },
          { label: 'No: swings are random' },
        ]}
        reveal={
          <>
            No. A swing passes the bottom twice each time round, once going forward and once coming back, and a photo
            of either looks the same. It will be high up at the front, or high up at the back, and nothing in one photo
            says which.
          </>
        }
      />

      <h2>A photo of a swing</h2>

      <Steps
        readable
        say={[
          <>A friend sends you a photo of their child on a swing, the seat right at the bottom.</>,
          <>
            Where will the seat be a second later? From one photo, it could be swinging forward or back: two answers,
            each as likely.
          </>,
          <>Then a second photo arrives, taken a moment before the first.</>,
          <>
            Now there is one answer. The gap between the two says which way the seat is moving, and how fast.
          </>,
          <>
            A video of the whole afternoon would tell you no more. Two photos already hold everything the past can say
            about the next second.
          </>,
          <>
            What you know at each moment is the <strong>state</strong>. A state that makes the rest of the past
            irrelevant to what comes next, like the two photos, has the <strong>Markov property</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Swing key="photo" t={PHOTO} knowing="one photo" caption="One photo" />
          ) : step === 1 ? (
            <Swing key="guess" t={PHOTO} knowing="one photo" ghosts caption="One photo" />
          ) : step === 2 ? (
            <Swing key="second" t={PHOTO} knowing="one photo" before caption="Two photos" />
          ) : step === 3 ? (
            <Swing key="one" t={PHOTO} knowing="two photos" ghosts caption="Two photos" />
          ) : step === 4 ? (
            <Swing key="all" t={PHOTO} knowing="the whole afternoon" ghosts trail caption="The whole afternoon" />
          ) : (
            <Swing key="named" t={PHOTO} knowing="two photos" ghosts caption="State: where, and which way" />
          )
        }
      </Steps>

      <h2>Only now matters</h2>
      <p>
        In <Link to="/learnings/learning-from-reward">Learning from reward</Link>, an agent sees a state, acts, and gets
        back a reward and a new state, over and over. What the world does next could, in general, depend on everything
        that has ever happened. The Markov property says it doesn’t: given the state and the action now, the history
        before them adds nothing.
      </p>
      <Clip
        src="markov-property/only-now-matters"
        label="The chance of the next state and reward given the whole history, from S 0 and A 0 through R t, S t and A t, equals the chance given only S t and A t. The history drops away, leaving p of s prime and r given s and a: the chance of each next state and reward from each state and action. That one function is everything the agent needs to know about the world."
        caption="The long history falls away. What is left, p(s′, r | s, a), is the whole of how the world works, one step at a time."
      />
      <p>
        A world like that, with states, actions, rewards and the chances p(s′, r | s, a) linking them, is a{' '}
        <strong>Markov decision process</strong>, or MDP. When the states, actions and rewards are finite in number, it
        is a finite MDP, and most of reinforcement learning is built on it. It differs from a{' '}
        <Link to="/learnings/contextual-bandits">contextual bandit</Link> in one way: the action now changes which state
        comes next.
      </p>
      <Numbers
        words
        items={[
          { label: 'One photo', value: 'Where the seat is', note: 'not Markov' },
          { label: 'Two photos', value: 'Where, which way, how fast', note: 'Markov' },
          { label: 'Whole afternoon', value: 'Everything', note: 'no better' },
        ]}
      />

      <h2>See it swing</h2>
      <p>
        Here the swing goes on by itself. The solid seat is now; the dashed ones are where it could be a second later,
        given only what you know.
      </p>
      <Figure readable caption="With one photo you nearly always face two futures, which meet only at the very top of the arc, where the seat stops for an instant before turning. Add a second photo and there is always one. The whole afternoon gives the same single answer as two photos: once the state is Markov, more history is wasted memory.">
        <Swing key={knowing} t="live" knowing={knowing} ghosts />
        <Controls>
          <Choice label="What you know" options={KNOWINGS} value={knowing} onChange={setKnowing} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="For choosing the next move well, which of these is a Markov state?"
        options={[
          { label: 'In noughts and crosses: the board', right: true },
          { label: 'On a motorway: one photo of the cars' },
          { label: 'In blackjack, from one deck: your hand' },
          { label: 'In a chat: the last word said' },
        ]}
        reveal={
          <>
            The board in noughts and crosses holds everything that matters: how you got there changes nothing. One photo
            of traffic hides speeds, as one photo of the swing does. In blackjack the cards already played change what
            is left in the deck. And the last word of a chat means little without what came before it.
          </>
        }
      />

      <h2>Choosing the state</h2>
      <ul>
        <li>
          <strong>Keep what the future depends on.</strong> Not only what the sensors see now, but what they saw that
          still matters: speeds from two readings, the cards already played, the question that “yes” answered.
        </li>
        <li>
          <strong>Don’t expect the hidden.</strong> A state can’t contain what the agent never observed, like the
          card about to be dealt. Markov means nothing worth knowing was <em>forgotten</em>, not that everything is known.
        </li>
        <li>
          <strong>Close enough works.</strong> Real states are rarely perfectly Markov. The theory assumes they are, and
          the methods still work well when the state is a good summary.
        </li>
        <li>
          <strong>Draw the agent small.</strong> The agent is only the part that decides. Anything it can’t change at
          will, its motors, its battery and the reward it is given among them, belongs to the environment.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A lift’s controller sees only which floor the lift is on. Is that a good enough state for deciding where to go next?"
        options={[
          { label: 'Yes: the floor is where it is' },
          { label: 'No: add which way it’s going and the buttons pressed', right: true },
          { label: 'No: it needs a log of the whole day' },
          { label: 'Only on the top floor' },
        ]}
        reveal={
          <>
            The floor alone is the single photo: a lift at floor 3 going up and one going down need different next
            moves, and so do lifts with different buttons waiting. Add direction and pending calls and the state is close
            to Markov; a log of the whole day would add little more.
          </>
        }
      />
    </Article>
  )
}
