import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Commute from './Commute'
import { favourite, onTimeCount, percent, SIGNS, story, STORY_MORNINGS, tables } from './model'
import Signs from './Signs'

export default function ContextualBandits() {
  // The story's two runs, and the numbers it tells, from them
  const { blind, look } = useMemo(() => story(), [])
  const [table] = tables(blind, STORY_MORNINGS)
  const share = (route: number) => percent(table[route].onTime / table[route].rides)
  const leader = favourite(table) === 1 ? 'train' : 'bike'
  const blindOnTime = onTimeCount(blind)
  const lookOnTime = onTimeCount(look)

  const [count, setCount] = useState<(typeof SIGNS)[number]>(4)

  return (
    <Article
      kicker="Reinforcement learning · Bandits"
      title="Reading the situation"
      promise="The best way to get to work depends on the weather. What do you lose by never looking out of the window?"
      takeaway={
        <>
          When something you can see changes which action is best, learn a <em>policy</em>, the best action for each
          situation, not one action for all of them.
        </>
      }
      sources={[
        {
          title: 'Reinforcement Learning: An Introduction',
          by: 'Richard S. Sutton and Andrew G. Barto, 2nd edition',
          part: 'Chapter 2, “Multi-armed Bandits”, §2.9 “Associative Search (Contextual Bandits)”',
          url: 'http://incompleteideas.net/book/the-book-2nd.html',
        },
      ]}
    >
      <Predict
        question="You bike or take the train to work. On a dry morning the bike gets you in on time 9 times in 10, the train 6. In the rain, the bike manages 3 in 10, the train 8. Half the mornings are wet. At best, how often are you on time if you never check the sky, and if you check it first?"
        options={[
          { label: '60%, then 90%' },
          { label: '70%, then 70%' },
          { label: '70%, then 85%', right: true },
          { label: '75%, then 90%' },
        ]}
        reveal={
          <>
            Never looking, the bike averages 60% over the two kinds of morning and the train 70%, so you always take
            the train: 70%. Looking first, you bike when it’s dry (90%) and take the train when it’s wet (80%): 85%.
            A glance out of the window is worth 15 on-time mornings in every 100.
          </>
        }
      />

      <h2>On the way to work</h2>

      <Steps
        say={[
          <>Each morning you go to work by bike or by train, and note whether you got in on time.</>,
          <>You keep one score per route: the share of its mornings that were on time. You never look at the sky.</>,
          <>
            After {STORY_MORNINGS} mornings the {leader} leads, {share(1)} to {share(0)}, so you take it nearly every
            day. But see how each route really does: when it’s dry, the bike is better.
          </>,
          <>
            So for the next {STORY_MORNINGS} mornings you check the sky first, and keep a table for dry mornings and one
            for wet ones.
          </>,
          <>
            Soon the tables give you a rule: bike when it’s dry, train when it rains. You’re on time {lookOnTime}{' '}
            mornings out of {STORY_MORNINGS}, up from {blindOnTime}.
          </>,
          <>
            The sky is the <strong>situation</strong>, or context. A rule from situation to action is a{' '}
            <strong>policy</strong>. And each sky’s table is a little bandit problem of its own.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Commute key="first" run={blind} from={0} to={8} pace={1000} />
          ) : step === 1 ? (
            <Commute key="blind" run={blind} from={8} to={STORY_MORNINGS} pace={110} />
          ) : step === 2 ? (
            <Commute key="truth" run={blind} from={STORY_MORNINGS} to={STORY_MORNINGS} pace={110} truth />
          ) : step === 3 ? (
            <Commute key="look" run={look} from={0} to={8} pace={1000} />
          ) : (
            <Commute
              key={step === 4 ? 'rule' : 'named'}
              run={look}
              from={step === 4 ? 8 : STORY_MORNINGS}
              to={STORY_MORNINGS}
              pace={110}
              named={step === 5}
            />
          )
        }
      </Steps>

      <h2>Why one table can’t win</h2>
      <p>
        Never looking, each route’s score mixes both kinds of morning. The bike’s 90% and 30% blur into 60%, the
        train’s 60% and 80% into 70%, and the best a single table can do is the best of those blurred averages.
        Looking first, you pick the best route for each sky and only then average.
      </p>
      <Clip
        src="contextual-bandits/look-first"
        label="Never looking: the bike scores one half of 90% plus one half of 30%, which is 60%; the train one half of 60% plus one half of 80%, which is 70%; the best of the averages is 70%. Looking first: the bike on dry mornings, 90%, and the train on wet ones, 80%; the average of the bests is 85%."
        caption="The best of the averages against the average of the bests: 70% against 85%."
      />
      <p>
        The average of the bests can never fall below the best of the averages, and it’s higher whenever different
        situations want different actions. That gap is what reading the situation is worth. A problem like this is
        called a <strong>contextual bandit</strong> (the book’s older name is associative search): the bandit from{' '}
        <Link to="/learnings/exploration-and-exploitation">Explore or exploit</Link>, plus a clue you get to see
        before each choice.
      </p>

      <h2>Machines that take turns</h2>
      <p>
        Now in real units. There are several slot machines with ten arms each, and each machine has its own best
        arm. Every step one of them, picked at random, is put in front of you, and a sign on the front says which.
        One learner ignores the sign and keeps a single table of scores; the other keeps a table per sign. Both pick
        at random one step in ten, to keep exploring.
      </p>
      <p>
        To the first learner, the machines blur into one machine whose payouts jump about from step to step. It uses
        a constant step size, the fix for <Link to="/learnings/tracking-change">a world that changes</Link>, but that
        only helps when the world drifts slowly. Here it changes every step.
      </p>
      <Figure caption="With one machine there is no sign to read, and the two learners nearly tie. With more, one table settles on an arm that is fair on average and the best on hardly any machine, while a table per sign finds each machine’s own best arm. Each of those tables sees only its share of the steps, so with 8 signs they take longer to learn.">
        <Signs count={count} />
        <Controls>
          <Choice label="Machines" options={SIGNS} value={count} onChange={setCount} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A news site picks one headline for its front page and learns which gets clicked. Morning readers click business stories; evening readers click sport. Its scores keep swinging. What fixes it best?"
        options={[
          { label: 'Explore more often' },
          { label: 'A step size that tracks change' },
          { label: 'Separate scores for morning and evening', right: true },
          { label: 'Average over more days' },
        ]}
        reveal={
          <>
            The clock is a clue. Ignore it and two audiences blur into one site whose taste seems to flip twice a day.
            A tracking step only chases each flip after it has happened, and exploring more or averaging longer blurs
            it further. With a table per time of day, each table faces a world that holds still.
          </>
        }
      />

      <h2>Between a bandit and the whole problem</h2>
      <p>
        Contextual bandits sit halfway. Like the full problem, what you learn is a policy, not one best action. Like
        a bandit, an action decides only the reward that comes back: your route today doesn’t change tomorrow’s
        weather. Once an action also changes the situation you face next, as a chess move changes the board, you
        have the whole problem of reinforcement learning, where a move can be{' '}
        <Link to="/learnings/reward-and-value">worth more for what it sets up than for what it pays now</Link>.
      </p>
      <Numbers
        words
        items={[
          { label: 'Bandit', value: 'One best action', note: 'nothing to read' },
          { label: 'Contextual bandit', value: 'A best action per situation', note: 'acts don’t change what’s next' },
          { label: 'The full problem', value: 'A policy that plans ahead', note: 'acts change what’s next' },
        ]}
      />

      <h2>Reading the situation</h2>
      <ul>
        <li>
          <strong>Look for the clue.</strong> Before learning one best choice, ask what you can see that might change
          it: the weather, the time of day, who is asking.
        </li>
        <li>
          <strong>Keep a score per situation.</strong> A few situations fit in a few tables. With thousands, each
          table sees too little, so use a model that carries what it learns across similar situations.
        </li>
        <li>
          <strong>Notice when your choice changes what comes next.</strong> Then scores per situation aren’t enough:
          a choice has to be judged by where it leads, and that needs the full reinforcement learning tools.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Which of these is no longer a contextual bandit, but the full reinforcement learning problem?"
        options={[
          { label: 'An ad for the page someone is reading' },
          { label: 'A route from today’s weather' },
          { label: 'A chess move from the board', right: true },
          { label: 'A coupon from what’s in the basket' },
        ]}
        reveal={
          <>
            A chess move changes the board you face next, so it is worth its reward plus everything it sets up. In the
            other three a choice earns its reward and that’s all: the next reader, tomorrow’s weather and the next
            basket arrive whatever you picked.
          </>
        }
      />
    </Article>
  )
}
