import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  accuracy,
  BEST,
  bestSplit,
  CHECK,
  decrease,
  entropy,
  FIRST_GUESS_TREE,
  FULL,
  FULL_DEPTH,
  gini,
  GROWN,
  GUESS,
  MIN_LEAVES,
  misclassification,
  NOISE,
  pct,
  piles,
  SATURDAY_TREES,
  SATURDAYS,
  TEST_SIZE,
  three,
  TRAIN_SIZE,
  weighted,
  type MinLeaf,
  type Node,
} from './model'
import Saturdays from './Saturdays'

// The story's numbers, from the model
const GUESSED = FIRST_GUESS_TREE as Node
const FIRST = bestSplit(SATURDAYS)!
const [, WINDY] = piles(SATURDAYS, FIRST)
const RIGHT_AT_TWO = Math.round(accuracy(SATURDAY_TREES[2], SATURDAYS) * SATURDAYS.length)

// The emails' numbers
const PARENT = [...GUESS.parent]
const A = GUESS.a.map((pile) => [...pile])
const B = GUESS.b.map((pile) => [...pile])

// Check yourself
const C = decrease([...CHECK.parent], CHECK.c.map((pile) => [...pile]), gini)
const D = decrease([...CHECK.parent], CHECK.d.map((pile) => [...pile]), gini)

export default function DecisionTrees() {
  const [depth, setDepth] = useState(BEST.depth)
  const [minLeaf, setMinLeaf] = useState<MinLeaf>(1)

  return (
    <Article
      kicker="Machine learning · Trees and ensembles"
      title="Decision trees"
      promise="A decision tree sorts things by asking one yes-or-no question after another. Which question should it ask first, and why does a tree that sorts its training data perfectly still get new data wrong?"
      takeaway={
        <>
          At every node a tree asks the one question that leaves its two piles least mixed, by Gini or entropy. Grown
          until every pile is pure, it memorises the noise too, so <em>stop it early</em> or prune it back.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Week 7 lecture notes, “Decision trees” and “Training of decision trees”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 9.2, “Tree-Based Methods”: growing a tree, impurity measures and cost-complexity pruning',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Constructing optimal binary decision trees is NP-complete',
          by: 'Laurent Hyafil and Ronald L. Rivest, Information Processing Letters, 1976',
          part: 'Why trees are grown greedily',
        },
        {
          title: 'Classification and Regression Trees',
          by: 'Leo Breiman, Jerome Friedman, Richard Olshen and Charles Stone, 1984',
          part: 'CART: Gini impurity and cost-complexity pruning',
        },
      ]}
    >
      <Predict
        question="A filter sorts 800 emails, 400 spam and 400 not, with one yes-or-no question. Question A leaves piles of 300 spam + 100 not and 100 spam + 300 not. Question B leaves 200 spam + 400 not and 200 spam + 0 not. Labelling each pile by its majority, both get 200 emails wrong. Which should a tree ask first?"
        options={[
          { label: 'A: the even split' },
          { label: 'B: one pile is finished', right: true },
          { label: 'Either: both get 200 wrong' },
          { label: 'Neither: both leave mixed piles' },
        ]}
        reveal={
          <>
            B. Counting mistakes calls it a tie, but B’s second pile is done: 200 spam and nothing else, so no question
            below it will ever be needed, and what is left to sort is one pile at two to one. A leaves two piles at three
            to one, both still to sort. The measures trees use see the difference; the numbers are below.
          </>
        }
      />

      <h2>Twenty questions about Saturday</h2>

      <Steps
        readable
        say={[
          <>
            You’ve kept notes on {SATURDAYS.length} Saturdays: the days your friend came on your run (sage dots) and the
            days she stayed home (rings), by temperature and wind.
          </>,
          <>
            To guess next Saturday, you ask yes-or-no questions. “Is it under 12°?” splits the days into two piles: she
            ran {GUESSED.left.counts[1]} of {GUESSED.left.counts[0] + GUESSED.left.counts[1]} cold days and{' '}
            {GUESSED.right.counts[1]} of {GUESSED.right.counts[0] + GUESSED.right.counts[1]} warm ones.
          </>,
          <>
            But why that question? Try every cut on either axis and keep the one that leaves the piles least mixed: “wind
            under {FIRST.threshold} km/h?” sends {WINDY[0]} days, every one at home, to one side.
          </>,
          <>
            Then do the same inside each pile. Two questions in, each box is mostly one kind, and guessing its majority
            gets {RIGHT_AT_TWO} of {SATURDAYS.length} Saturdays right.
          </>,
          <>
            Keep going until every box is one kind. The last cuts fence off two odd days, the cold day she ran and the
            birthday she skipped, and now all {SATURDAYS.length} are right.
          </>,
          <>
            That is a <strong>decision tree</strong>. Each question is a <strong>node</strong> testing one feature against
            a threshold, each box is a <strong>leaf</strong> that predicts its majority, and how mixed a pile is is its{' '}
            <strong>impurity</strong>.
          </>,
        ]}
      >
        {(step) => {
          const scene = (['days', 'guess', 'sweep', 'two', 'full', 'named'] as const)[step]
          return <Saturdays key={scene} scene={scene} />
        }}
      </Steps>

      <p>
        Taking the best question now and never revisiting it is a{' '}
        <Link to="/learnings/greedy-choice">greedy choice</Link>, and it can miss the best tree for the data:
        finding that one is NP-complete, so practical tree learners all grow greedily. Each step is cheap. On one
        feature, only the gaps between neighbouring values give different piles, so a node with n points and d features
        has at most d(n − 1) questions to try.
      </p>

      <h2>The one line of math</h2>
      <p>
        Two measures of how mixed a pile is are in common use. <strong>Gini impurity</strong> is the chance that two
        items drawn from the pile, the first put back, are of different classes: one minus each class’s share squared,
        G = 1 − Σ p². <strong>Entropy</strong> is how many yes-or-no questions it takes, on average, to learn an item’s
        class: H = −Σ p log₂ p. Both are 0 for a pure pile and largest for an even one. A question scores by how much it
        lowers the impurity: the parent’s, less the children’s, each weighted by its share of the items. For the emails:
      </p>
      <Numbers
        items={[
          { label: '400 : 400', value: three(gini(PARENT)), note: 'Gini before' },
          { label: 'Question A', value: three(weighted(A, gini)), note: `lower by ${three(decrease(PARENT, A, gini))}` },
          { label: 'Question B', value: three(weighted(B, gini)), note: `lower by ${three(decrease(PARENT, B, gini))}` },
        ]}
      />
      <p>
        Entropy agrees: it falls from {three(entropy(PARENT))} to {three(weighted(A, entropy))} under A and to{' '}
        {three(weighted(B, entropy))} under B. The share labelled wrong, the misclassification rate, is{' '}
        {weighted(A, misclassification)} under both, so it cannot choose. The difference is shape. As a pile goes from
        even to pure, its misclassification rate falls in a straight line, so when both piles keep the parent’s
        majority, their weighted rate equals the parent’s and the question earns nothing. Gini and entropy fall fastest
        near pure, so making a pile all one class earns extra.
      </p>
      <Clip
        src="decision-trees/gini-split"
        label="Gini impurity in words, how mixed equals one minus the sum of each share squared, then in symbols, G equals one minus the sum of p k squared. For question B's pile of 200 spam and 400 not, G is one minus a third squared minus two thirds squared, four ninths. Weighted by size, three quarters times four ninths plus a quarter times zero for the pure pile is one third, so B lowers the Gini by 0.167 and A by 0.125."
        caption="Score each pile, then weigh it by its share of the items. B’s pure pile adds nothing, and its mixed pile is only three quarters of the emails."
      />

      <h2>Grow one too far</h2>
      <p>
        Here are {TRAIN_SIZE} points in two classes, split by the dashed curve, with one label in {Math.round(1 / NOISE)}{' '}
        flipped at random: noise no rule could predict. Grow the tree deeper and watch how often it is right on the points
        it learned from, and on {TEST_SIZE.toLocaleString('en-US')} new points from the same source.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage boxes predict the filled class. At depth {BEST.depth} the tree gets {pct(BEST.test)} of new points
            right. Grown to the end, depth {FULL_DEPTH}, it fences off each flipped label in a box of its own:{' '}
            {pct(FULL.train)} on its training points, {pct(FULL.test)} on new ones.
          </>
        }
      >
        <Lab grown={GROWN[minLeaf]} at={depth} />
        <Controls>
          <Slider
            label="Depth"
            value={depth}
            min={0}
            max={FULL_DEPTH}
            onChange={setDepth}
            format={(d) => (d === FULL_DEPTH ? `${d} (full)` : String(d))}
          />
          <Choice label="Smallest leaf" options={MIN_LEAVES} value={minLeaf} onChange={setMinLeaf} />
        </Controls>
      </Figure>
      <p>
        Each box the deep tree adds fits a point or two, and most of them are the flipped labels. That is the
        high-variance end of <Link to="/learnings/bias-variance">bias and variance</Link>: change a few training points
        and those small boxes are drawn somewhere else.
      </p>

      <Predict
        kicker="Quick check"
        question={`Grown until each leaf holds one class, a tree gets ${pct(FULL.train)} of its training data right and ${pct(FULL.test)} of new data. Which change is most likely to help on new data?`}
        options={[
          { label: 'Grow it deeper' },
          { label: 'Cap the depth, or require 5 points a leaf', right: true },
          { label: 'Rescale every feature to 0 to 1' },
          { label: 'Score questions by entropy, not Gini' },
        ]}
        reveal={
          <>
            Cap it. The pure leaves at the bottom fit noise, and a cap stops them: depth {BEST.depth} gets{' '}
            {pct(BEST.test)} of new points right, and 5 points a leaf {pct(GROWN[5][FULL_DEPTH].test)}. The tree is
            already as deep as it goes. Rescaling moves every threshold with its feature and changes no pile, and Gini
            and entropy nearly always pick much the same questions.
          </>
        }
      />

      <h2>Keeping a tree honest</h2>
      <ul>
        <li>
          <strong>Stop early.</strong> Cap the depth, or refuse a leaf with fewer than a handful of points. Choose the
          setting by accuracy on held-out data; the training data always says deeper.
        </li>
        <li>
          <strong>Or grow it out, then prune.</strong> Grow the full tree, then cut back each subtree that doesn’t earn
          its place on held-out data, or costs more than a set price per leaf. Pruning can keep a weak question whose
          children are strong, which a rule to stop when gains are small would never have asked.
        </li>
        <li>
          <strong>Skip the scaling.</strong> A question only asks which side of a threshold a value falls, so stretching,
          shifting or any change that keeps a feature’s order gives the same tree.
        </li>
        <li>
          <strong>Don’t trust one tree’s shape.</strong> Change a few training points and the first question can change,
          and everything under it. <Link to="/learnings/random-forests">Random forests</Link> average many trees to
          steady it.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A node holds 50 runs and 50 days at home. Question C splits off 10 home days on their own, leaving 50 runs and 40 home. Question D splits it into 35 runs + 15 home and 15 runs + 35 home. Which lowers the Gini impurity more?"
        options={[
          { label: 'C: it makes a pure leaf' },
          { label: 'D: two 70:30 piles', right: true },
          { label: 'They tie' },
          { label: 'Neither lowers it' },
        ]}
        reveal={
          <>
            D, by {three(D)} against {three(C)}. A pure leaf is worth a lot only if it is big: C’s holds a tenth of the
            days, and the 90 left behind are nearly even (Gini {three(gini([...CHECK.c[0]]))}). D leaves both piles at
            70:30, Gini {three(gini([...CHECK.d[0]]))} each. Every pile counts by its size, which is why B won the
            emails: its pure pile held a quarter of them.
          </>
        }
      />
    </Article>
  )
}
