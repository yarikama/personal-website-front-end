import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Gully, { GullyMap, type Show, type Trail } from './Gully'
import {
  BETA_RANGE,
  CHECK_BETA,
  CHECK_YOURSELF_BETA,
  DEFAULT_BETA,
  distance,
  FLIP_GRADIENT,
  flipSettles,
  flipping,
  LAB_GRADIENTS,
  LAB_STEPS,
  labEnd,
  labPlain,
  labPlainEnd,
  labWalk,
  START,
  STEADY_GRADIENT,
  steady,
  steadySettles,
  STORY,
  STORY_BETA,
  storyAway,
  storyCovered,
  strideAcross,
  strideAlong,
  STRIDES,
  tilt,
  weightOf,
  WORKED_BETAS,
  type LabGradient,
  type Walk,
} from './model'

const one = (value: number) => value.toFixed(1)
const two = (value: number) => value.toFixed(2)

const PLAIN: Trail = { walk: STORY.plain, tone: 'plain' }
const SLEDGE: Trail = { walk: STORY.momentum, tone: 'momentum' }
const STORY_STEPS: { show: Show; trails: Trail[] }[] = [
  { show: 'intro', trails: [] },
  { show: 'walk', trails: [{ walk: STORY.exact, tone: 'plain' }] },
  { show: 'noisy', trails: [PLAIN] },
  { show: 'sledge', trails: [SLEDGE] },
  { show: 'both', trails: [PLAIN, SLEDGE] },
  { show: 'named', trails: [PLAIN, SLEDGE] },
]

const tenAgo = weightOf(STORY_BETA, 10)
const lastLeft = (w: Walk) => distance(w.path[LAB_STEPS])

export default function Momentum() {
  const [beta, setBeta] = useState<number>(DEFAULT_BETA)
  const [gradients, setGradients] = useState<LabGradient>('Mini-batch')
  const plain = labPlain(gradients)
  const heavy = labWalk(beta, gradients)
  const trails: Trail[] = [
    { walk: plain, tone: 'plain' },
    { walk: heavy, tone: 'momentum' },
  ]

  return (
    <Article
      kicker="Vision and language · Learning to see"
      title="Momentum"
      promise="Every mini-batch points a little the wrong way, and in a long, narrow valley plain steps spend most of their length bouncing between the walls. What does keeping a running velocity fix, and why is 0.9 the usual setting?"
      takeaway={
        <>
          <em>Momentum</em> steps along a running sum of gradients, v ← βv + g: a direction that agrees with itself piles
          up to 1 ÷ (1 − β) times, ten at β = 0.9, while one that flips side, like a zigzag, shrinks, and noise partly
          cancels.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lectures 3 and 4, SGD and regularization: noisy mini-batch gradients and momentum updates',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Section 12.6, Momentum: leaky averages, an ill-conditioned problem, the momentum method',
          url: 'https://d2l.ai/chapter_optimization/momentum.html',
        },
        {
          title: 'Some methods of speeding up the convergence of iteration methods',
          by: 'Boris T. Polyak, USSR Computational Mathematics and Mathematical Physics 4(5), 1964',
          part: 'The heavy-ball method',
          url: 'https://doi.org/10.1016/0041-5553(64)90137-5',
        },
        {
          title: 'On the importance of initialization and momentum in deep learning',
          by: 'Ilya Sutskever, James Martens, George Dahl and Geoffrey Hinton, ICML 2013',
          part: 'Momentum for training deep networks',
          url: 'https://proceedings.mlr.press/v28/sutskever13.html',
        },
        {
          title: 'Adam: A Method for Stochastic Optimization',
          by: 'Diederik P. Kingma and Jimmy Ba, ICLR 2015',
          part: 'Running averages of the gradient and of its square',
          url: 'https://arxiv.org/abs/1412.6980',
        },
      ]}
    >
      <Predict
        question={
          <>
            Walking down a long, narrow gully by the slope underfoot, you are {one(storyAway(STORY.plain))} m from the
            hut at the bottom after {STRIDES} strides. Now each stride keeps {STORY_BETA} of the last stride’s motion and
            adds half as much of the new slope. After {STRIDES} strides, how far from the hut are you?
          </>
        }
        options={[
          { label: 'Further: it flies off' },
          { label: `About ${one(storyAway(STORY.plain))} m, the same` },
          { label: 'About 4 m' },
          { label: 'Under 1 m', right: true },
        ]}
        reveal={
          <>
            Under 1 m: {one(storyAway(STORY.momentum))} m, even with half the push. Keeping most of the last motion
            builds up speed along the floor and damps the side-to-side bouncing. A sledge shows how.
          </>
        }
      />

      <h2>A sledge in the gully</h2>

      <Steps
        readable
        say={[
          <>
            You’re back in the fog, at the top of a long, narrow gully: steep walls either side, and a floor sloping
            gently down to a hut {Math.round(distance(START))} m away.
          </>,
          <>
            You stride by the slope underfoot, but the steep walls throw you from side to side, and after {STRIDES}{' '}
            strides you have come only {storyCovered(STORY.exact)}% of the way.
          </>,
          <>Your feet are numb, too, so every slope you feel is a little off, and every stride gets a random kick.</>,
          <>
            Now ride a heavy sledge, pushed half as hard: each slope you feel nudges its speed, and it keeps nine tenths
            of the speed it had.
          </>,
          <>
            Across the gully the nudges flip side and cancel, so it barely swings; along it they agree and pile up, so it
            ends {one(storyAway(STORY.momentum))} m from the hut, against your {one(storyAway(STORY.plain))}.
          </>,
          <>
            The gully is a model’s loss, your numb feet are a <strong>mini-batch gradient</strong>, the sledge’s speed is
            its <strong>velocity</strong>, and the nine tenths it keeps is the <strong>momentum</strong> β.
          </>,
        ]}
      >
        {(step) => {
          const { show, trails: shown } = STORY_STEPS[step]
          return <Gully key={show} show={show} trails={shown} strides={STRIDES} />
        }}
      </Steps>

      <p>
        A mini-batch gradient is the slope worked out on a few dozen random training examples instead of all of them:
        cheap, but each one points a little off, and an unlucky batch can undo what the last few did. The plain step,
        and why it bounces between steep walls, are on <Link to="/learnings/gradient-descent">Gradient descent</Link>:
        a step short enough for the walls barely moves along the floor. Momentum lets the strides along the floor
        add up and the ones across cancel.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: new velocity = β × old velocity + this gradient, then step against the velocity instead of the
        gradient. In symbols, v ← βv + g, then w ← w − ηv. With β = 0 it is the plain step.
      </p>
      <Clip
        src="momentum/steady-or-flipping"
        label="New velocity equals beta times old velocity plus gradient becomes v gets beta v plus g. A gradient that is the same every step settles where v equals beta v plus g, so v equals g over 1 minus beta: 10 g when beta is 0.9. A gradient that flips sign every step settles where v equals minus beta v plus g, so v equals g over 1 plus beta: about 0.53 g."
        caption="Where the velocity settles. A steady gradient piles up to g ÷ (1 − β); one that flips every step shrinks to g ÷ (1 + β)."
      />
      <p>
        The steady case is the same sum as rewards on <Link to="/learnings/discounting">Discounting</Link>: at β ={' '}
        {STORY_BETA} the velocity is {Math.round(steady(STORY_BETA))} times the gradient, mostly the last ten, since one ten steps
        old still counts {STORY_BETA}¹⁰ ≈ {two(tenAgo)}. The zigzag flips, so it settles at{' '}
        {two(flipping(STORY_BETA))} times. With half the step, as the sledge had, a stride along can grow to{' '}
        {Math.round(strideAlong(STORY_BETA))} plain strides and one across shrinks to {two(strideAcross(STORY_BETA))}.
        Whatever the step, momentum tilts it toward the steady direction by (1 + β) ÷ (1 − β):
      </p>
      <Numbers
        words
        items={WORKED_BETAS.map((b) => ({
          label: `β = ${b}`,
          value: `${Math.round(tilt(b))} to 1`,
          note: `×${Math.round(steady(b))} along, ×${two(flipping(b))} across`,
        }))}
      />
      <p>
        Mini-batch noise is neither steady nor flipping: it points anywhere, so in the sum it partly cancels, and the
        velocity points more truly downhill than any one batch does.
      </p>

      <h2>Drag the momentum</h2>
      <Figure
        readable
        caption={
          <>
            Contour lines of the loss seen from above, with the bottom at the hollow dot. Ink is {LAB_STEPS} plain steps;
            sage is {LAB_STEPS} steps with momentum β at half the step size, from the same start, through the same
            mini-batches. At 0 the sage path is plain steps at half the step, and slower. Near 0.9 it arrives smoothly;
            near 1 it is too heavy to turn and swings far past the bottom.
          </>
        }
      >
        <GullyMap trails={trails} played={LAB_STEPS} named />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Readout label={`Left after ${LAB_STEPS}, momentum`} value={two(lastLeft(heavy))} accent />
          <Readout label="Plain steps" value={two(lastLeft(plain))} />
        </div>
        <Controls>
          <Slider
            label="Momentum β"
            value={beta}
            min={BETA_RANGE[0]}
            max={BETA_RANGE[1]}
            step={0.01}
            onChange={setBeta}
            format={two}
          />
          <Choice label="Gradient" options={LAB_GRADIENTS} value={gradients} onChange={setGradients} />
        </Controls>
      </Figure>
      <p>
        With exact gradients, plain steps end {one(labPlainEnd())} from the bottom. At half the step, β = 0.5 ends{' '}
        {one(labEnd(0.5))}, β = 0.9 ends {two(labEnd(0.9))}, and β = 0.99 ends {one(labEnd(0.99))}, still swinging.
        Too little momentum is slow; too much never settles.
      </p>

      <Predict
        kicker="Quick check"
        question={`A network trains slowly but steadily with plain SGD at a learning rate of 0.1. You switch on momentum ${CHECK_BETA} and keep the learning rate, and within a few steps the loss shoots up to NaN. What is the best fix?`}
        options={[
          { label: 'Raise β to 0.99' },
          { label: 'Cut the learning rate to about 0.01', right: true },
          { label: 'Use smaller mini-batches' },
          { label: 'Reset the velocity each epoch' },
        ]}
        reveal={
          <>
            Cut the learning rate. On a steady slope the velocity grows to {Math.round(steady(CHECK_BETA))} times the gradient, so
            every step is ten times longer than before: in effect a learning rate of 1. Dividing it by ten gets back the
            old stride with the zigzag cancelled. A larger β makes the step longer still, smaller batches add noise, and
            a reset now and then changes nothing in between.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Start at β = 0.9.</strong> It averages about the last ten mini-batches: enough to cancel a zigzag,
          light enough to turn when the slope does.
        </li>
        <li>
          <strong>Shrink the step size when you add it.</strong> On a steady slope a step grows to η ÷ (1 − β), ten
          times at 0.9, so a learning rate tuned for plain SGD is too big. The sledge above used half, and still went
          further.
        </li>
        <li>
          <strong>Carry the velocity from batch to batch.</strong> It is the memory: reset it every batch and you are
          back to plain SGD.
        </li>
        <li>
          <strong>Adam adds a step size for each weight.</strong> It keeps the same running average of gradients, plus
          one of squared gradients, and divides by the root of that, so a weight with large gradients takes smaller
          steps.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`With β = ${CHECK_YOURSELF_BETA}, one weight’s gradient flips +${FLIP_GRADIENT}, −${FLIP_GRADIENT}, +${FLIP_GRADIENT}, … every step, and another’s is a steady ${STEADY_GRADIENT}. Once the velocity settles, which weight moves more each step?`}
        options={[
          { label: 'The flipping one, 6× more' },
          { label: 'Both the same' },
          { label: 'The steady one, about 3× more', right: true },
          { label: 'The steady one, 10× more' },
        ]}
        reveal={
          <>
            The steady one. Its velocity piles up to {STEADY_GRADIENT} ÷ (1 − {CHECK_YOURSELF_BETA}) ={' '}
            {one(steadySettles)}; the flipping one shrinks to {FLIP_GRADIENT} ÷ (1 + {CHECK_YOURSELF_BETA}) ≈{' '}
            {two(flipSettles)}. That is {one(steadySettles / flipSettles)} times more, though its gradient is six times
            smaller.
          </>
        }
      />
    </Article>
  )
}
