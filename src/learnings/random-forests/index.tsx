import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { seeded } from '../../components/explain/random'
import { Steps } from '../../components/explain/Steps'
import Bag from './Bag'
import Grow from './Grow'
import Jar from './Jar'
import {
  BAG_ROWS,
  BAG_SEED,
  BAGGING,
  bootstrap,
  counts,
  CROWDS,
  distinctShare,
  FAIRS,
  FEATURES,
  FOREST,
  GUESS,
  IN_BAG,
  MOST_TREES,
  pct,
  runFor,
  storyMiss,
  TRAIN,
  two,
  WORKED,
} from './model'

const tallyOf = (seed: number) => counts(bootstrap(seeded(seed), BAG_ROWS), BAG_ROWS)
const three = (value: number) => String(Number(value.toFixed(3)))
const last = (curve: number[]) => curve[curve.length - 1]

export default function RandomForests() {
  const bagging = runFor(BAGGING)
  const forest = runFor(FOREST)

  const [seed, setSeed] = useState(BAG_SEED)
  const tally = tallyOf(seed)
  const kept = tally.filter((c) => c > 0).length

  const [trees, setTrees] = useState(100)
  const [m, setM] = useState(FOREST)
  const chosen = runFor(m)

  return (
    <Article
      kicker="Machine learning · Trees and ensembles"
      title="Random forests"
      promise="One deep decision tree changes wildly with the data it is grown on. Averaging many trees should fix that, so why does a random forest go out of its way to hide features from its own trees?"
      takeaway={
        <>
          An average of trees steadies only the part of their errors they don’t share. Bootstrap samples make the trees
          differ, and letting each split see only a few features makes them differ more, which lowers the{' '}
          <em>floor</em> ρσ² that no number of trees gets below.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Lecture notes, Week 7, Decision trees: “Bagging” and “Random forests”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: '§8.7 “Bagging”; Chapter 15 “Random Forests”: §15.2 on the variance of an average of correlated trees, §15.3 on out-of-bag samples and the usual m',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Random Forests',
          by: 'Leo Breiman, Machine Learning 45, 2001',
          part: 'Random features at each split, and out-of-bag estimates',
          url: 'https://doi.org/10.1023/A:1010933404324',
        },
      ]}
    >
      <Predict
        question={`You average the predictions of ${GUESS.trees} trees. Each tree’s prediction has the same variance, and any two are correlated ${GUESS.rho}: when one is too high, the other tends to be too. What is the variance of the average, next to one tree’s?`}
        options={[
          { label: 'A hundredth of it' },
          { label: 'A tenth of it' },
          { label: 'About half of it', right: true },
          { label: 'All of it' },
        ]}
        reveal={
          <>
            About half: {three(GUESS.variance)} of it. Averaging cancels only the part of each tree’s error that the
            others don’t share. A jar of jellybeans shows why.
          </>
        }
      />

      <h2>A jar at the fair</h2>

      <Steps
        readable
        say={[
          <>
            A jar at the fair holds 1,000 jellybeans. Guess alone, and over {FAIRS} fairs you miss by about{' '}
            {storyMiss('alone')}.
          </>,
          <>
            Ask {CROWDS.apart.friends} friends who each count for themselves, and take their average: their misses
            cancel, and it misses by about {storyMiss('apart')}.
          </>,
          <>
            But your friends all use the same trick, counting one row and multiplying, so whatever it gets wrong on the
            day, they all get wrong: the average misses by about {storyMiss('trick')}.
          </>,
          <>
            Ask {CROWDS.more.friends.toLocaleString('en-US')} friends with the same trick: still about{' '}
            {storyMiss('more')}. The miss they share doesn’t cancel, however many you ask.
          </>,
          <>
            So you give each friend a different small window to count through. Each guess gets worse, but the misses
            differ, and the average misses by about {storyMiss('windows')}.
          </>,
          <>
            The count is the value a model predicts, each friend is a tree, the trick is the strongest feature every tree
            splits on first, and the windows are the few features each split may look at: a random forest.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Jar key="alone" crowd="alone" />
          ) : step === 1 ? (
            <Jar key="apart" crowd="apart" />
          ) : step === 2 ? (
            <Jar key="trick" crowd="trick" />
          ) : step === 3 ? (
            <Jar key="more" crowd="more" />
          ) : (
            <Jar key="windows" crowd="windows" model={step === 5} />
          )
        }
      </Steps>

      <p>
        That trick is what a correlation of {GUESS.rho} means, as in the opening question: half of every guess’s variance
        is shared, and no number of friends removes it.
      </p>

      <h2>Many trees from one dataset</h2>
      <p>
        A deep <Link to="/learnings/decision-trees">decision tree</Link> is like one friend’s guess: right on average,
        far off on any one day. It has little bias and a lot of variance, in the terms of{' '}
        <Link to="/learnings/bias-variance">bias and variance</Link>: change a few rows and you get a different tree. Trees grown on fresh datasets would cancel that out, but you have one dataset.{' '}
        <strong>Bagging</strong>, short for bootstrap aggregating, makes do: each tree gets its own{' '}
        <strong>bootstrap sample</strong>, n rows drawn from your n at random with replacement.
      </p>
      <Figure
        caption={
          <>
            One tree’s sample. Each square is a row of your data; the sage dots under it are how many times the sample
            drew it. Hollow squares were never drawn.
          </>
        }
      >
        <Bag tally={tally} />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Readout label="Rows in the sample" value={`${kept} of ${BAG_ROWS}`} accent />
          <Readout label="Out of the bag" value={BAG_ROWS - kept} />
        </div>
        <Controls>
          <Button onClick={() => setSeed((s) => s + 1)}>Draw again</Button>
        </Controls>
      </Figure>
      <p>
        One draw misses a given row with chance 1 − 1/n, and all n draws miss it with chance (1 − 1/n)ⁿ, about 1/e.
        So a sample holds about {pct(IN_BAG)} of your rows ({pct(distinctShare(BAG_ROWS))} with {BAG_ROWS}), and the
        rest are <strong>out-of-bag</strong> for that tree: predict each row with only the trees that never saw it,
        and you get a test score without setting any data aside.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: average B trees, each with variance σ², every two correlated ρ. The shared part, ρσ², stays whatever
        B is; the rest, (1 − ρ)σ², is divided by B. With {WORKED[0].trees} trees and σ² = 1:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `ρ = ${w.rho}`,
          value: three(w.variance),
          note: `${three(w.floor)} + ${three(w.shrinks)}`,
        }))}
      />
      <p>
        Correlation puts a floor under the average. More trees take you down to it; only trees that are less alike
        lower the floor itself.
      </p>
      <Clip
        src="random-forests/average-of-trees"
        label="The variance of an average of B trees. A grid of every pair of trees: the B cells on its diagonal are each sigma squared, the other B times B minus 1 are rho sigma squared. Added up and divided by B squared, that is rho sigma squared, which never shrinks, plus 1 minus rho times sigma squared over B, which falls as B grows. With B = 100 and sigma squared = 1: rho 0 gives 0.01, rho 0.5 gives 0.505, rho 0.1 gives 0.109."
        caption="Add up every pair of trees and divide by B². The B diagonal cells shrink away with B; the pairs, B(B − 1) of them, leave ρσ² behind."
      />

      <h2>Hiding features</h2>
      <p>
        Bootstrap samples overlap a lot, so bagged trees come out alike: if one feature predicts best, nearly every tree
        splits on it first and makes much the same mistakes. A <strong>random forest</strong> adds one rule: at each
        split, the tree may choose only among m features drawn at random, often √p of the p features (p/3 when
        predicting a number). Many splits can’t reach the strongest feature, so the trees differ more. Each tree gets a
        little worse; the floor drops by more. Those are the friends’ windows.
      </p>

      <h2>Grow a forest</h2>
      <p>
        Here {TRAIN} rows with {FEATURES} features predict a number. The first three features are rough readings of
        one strong quantity, the way floor area, rooms and bedrooms all measure a house, and the target jumps where it
        passes its middle. Bagging lets each split choose from all {FEATURES}; the usual forest uses m = {FOREST}, both
        √{FEATURES} and {FEATURES}/3.
      </p>
      <Figure
        readable
        caption={
          <>
            Test error as trees are added, on a log scale. Ink: bagging. Sage: your m, its out-of-bag estimate dashed,
            and dotted, the floor ρσ² plus the noise, where it levels off. ρ is measured on the trees’ mistakes against the
            true values, which we know because we made the data.
          </>
        }
      >
        <Grow bagging={bagging} forest={chosen} trees={trees} />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Readout label="Test error" value={two(chosen.test[trees - 1])} accent />
          <Readout label="Out-of-bag" value={two(chosen.oob[trees - 1])} />
          <Readout label="Trees alike, ρ" value={two(chosen.rho)} />
          <Readout label="One tree" value={two(chosen.oneTree)} />
        </div>
        <Controls>
          <Slider label="Trees" value={trees} min={1} max={MOST_TREES} onChange={setTrees} />
          <Slider label="Features per split, m" value={m} min={1} max={FEATURES} onChange={setM} />
        </Controls>
      </Figure>
      <p>
        Every bagged tree splits first on a reading, and their mistakes correlate {two(bagging.rho)}. At m = {FOREST},{' '}
        {pct(forest.readingFirst)} do, and the correlation falls to {two(forest.rho)}. Alone, a forest tree is worse,{' '}
        {two(forest.oneTree)} against {two(bagging.oneTree)}; {MOST_TREES} of them reach {two(last(forest.test))}{' '}
        against {two(last(bagging.test))}. At m = 1 the trees are least alike but too weak. From about 50 trees on, the
        out-of-bag estimate stays within a tenth of the test error, with no rows held back.
      </p>

      <Predict
        kicker="Quick check"
        question="Your bagged trees all split first on the same feature, and test error stopped falling at 100 trees. Which change is most likely to lower it?"
        options={[
          { label: 'Grow 1,000 trees' },
          { label: 'Let each split pick from a few random features', right: true },
          { label: 'Grow each tree on all the rows, no bootstrap' },
          { label: 'Keep only the 10 best trees' },
        ]}
        reveal={
          <>
            A few random features per split. A flat curve means you are at the floor ρσ², and more trees can’t go below
            it; making the trees less alike lowers it. Dropping the bootstrap makes every tree the same, ρ = 1, the
            highest floor there is, and ten trees bring back the part that more trees had divided away.
          </>
        }
      />

      <h2>Using a forest well</h2>
      <ul>
        <li>
          <strong>Add trees until the curve flattens.</strong> More trees never overfit; past the floor they only cost
          time. A few hundred is common.
        </li>
        <li>
          <strong>Tune m, then the leaf size.</strong> Start at √p (p/3 for numbers) and try values either side. A
          larger smallest leaf makes each tree smaller and steadier, worth a try on noisy data.
        </li>
        <li>
          <strong>Score it out of the bag.</strong> The out-of-bag error is a fair test score for free, so every row can
          go into training, and you can compare settings without a validation set.
        </li>
        <li>
          <strong>Read feature importance with care.</strong> A forest ranks features by how much their splits cut the
          error, and near-copies, like the three readings here, split the credit between them.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="You bag 100 straight lines, each fitted by least squares to a bootstrap sample of 10,000 rows. How much steadier is their average than one line fitted to all the rows?"
        options={[
          { label: 'About 100 times' },
          { label: 'About twice' },
          { label: 'Hardly at all', right: true },
          { label: 'It is less steady' },
        ]}
        reveal={
          <>
            Hardly at all. A <Link to="/learnings/least-squares">least-squares</Link> line barely moves from one large
            sample to the next, so the 100 lines are nearly one line: ρ is close to 1, and the floor ρσ² is almost all
            of σ². Bagging pays off for unstable models, like deep trees, whose fit jumps with the data.
          </>
        }
      />
    </Article>
  )
}
