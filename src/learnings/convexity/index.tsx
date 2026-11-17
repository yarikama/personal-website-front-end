import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import ChordLab from './ChordLab'
import {
  BENDS,
  BOWL,
  chordTest,
  DENT,
  DENT_B,
  dentTrapped,
  descend,
  family,
  FRIENDS,
  LAB_ROPE,
  LAB_STARTS,
  minima,
  one,
  ROPE_WORKED,
  SECOND_VALLEY,
  STORY_START,
  STORY_STARTS,
  trapped,
  WORKED_BENDS,
} from './model'
import Valley from './Valley'

export default function Convexity() {
  const [b, setB] = useState(DENT_B)
  const [rope, setRope] = useState<[number, number]>(LAB_ROPE)
  const [walker, setWalker] = useState<number | null>(null)
  const [crowd, setCrowd] = useState<number[] | null>(null)
  const [runs, setRuns] = useState(0)

  const ground = family(b)
  const convex = chordTest(ground.f) <= 1e-9
  const valleys = minima(ground.f).length
  const stuck = LAB_STARTS.filter((s) => trapped(ground.f, descend(ground.f, s).at(-1)!)).length

  return (
    <Article
      kicker="Machine learning · Fitting a model"
      title="Convexity"
      promise="Training a model is walking downhill on its loss. When can you be sure that where you stop is the lowest point there is?"
      takeaway={
        <>
          A loss is <em>convex</em> when no rope between two points of it has ground above it. Then every flat spot is the
          lowest, so walking downhill from anywhere finds the best fit, and a second derivative that is never negative is
          how you tell.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Week 3 lecture notes, “Convex optimization: introduction and basic definitions” and “Computational aspects of optimization algorithms”',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: 'Section 11.5.5, “Multiple Minima”: a neural network’s loss is not convex, so try several starts',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Convex Optimization',
          by: 'Stephen Boyd and Lieven Vandenberghe, Cambridge University Press, 2004',
          part: 'Section 3.1.4, second-order conditions, and Section 3.2, operations that preserve convexity',
          url: 'https://web.stanford.edu/~boyd/cvxbook/',
        },
      ]}
    >
      <Predict
        question="A hiker in dense fog can only tell which way the ground tilts where she stands. She always steps downhill and stops when the ground is flat. On which ground is she sure to reach the lowest point, wherever she starts?"
        options={[
          { label: 'A big bowl with one shallow dip on its side' },
          { label: 'A lopsided bowl, steep on one side, gentle on the other', right: true },
          { label: 'Two valleys, the deeper one far wider' },
          { label: 'Any of them, if she starts high enough' },
        ]}
        reveal={
          <>
            Only the lopsided bowl. Steep or gentle doesn’t matter; what matters is that the ground never rises again on
            the way down. One shallow dip is enough to stop her if she starts above it, and the wide valley catches most
            starts, not all; starting higher only gives her further to walk into the same dip.
          </>
        }
      />

      <h2>Lost in the fog</h2>

      <Steps
        say={[
          <>
            You’re lost on a mountain in dense fog, trying to reach the lowest point of the valley. You can’t see a thing;
            all you can tell is which way the ground tilts where you stand.
          </>,
          <>You shuffle a little way down the tilt, check again, and repeat, until the ground under you is flat. Then you stop.</>,
          <>
            In a bowl, that flat spot is the bottom. Drop {FRIENDS} friends anywhere in the fog, and all {FRIENDS} end up
            there.
          </>,
          <>
            Now the valley has a shallow dip on one slope. Start above it and you walk into the dip and stop: flat ground,
            but not the bottom.
          </>,
          <>
            From inside the fog, the dip feels just like the bottom. Of {FRIENDS} friends, {dentTrapped} stop in it.
          </>,
          <>
            A rope shows the difference. Stretch one between the two flat spots and the hump between them pokes up through
            it. Over a bowl, no rope ever has ground above it.
          </>,
          <>
            The ground is your model’s loss, where you stand is its parameters θ, and walking downhill is training. A loss
            with no ground above any rope is called <strong>convex</strong>, and on it every flat spot is the lowest.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Valley
              key="feel"
              landscape={BOWL}
              show="feel"
              start={STORY_START}
              label="A hiker on the slope of a bowl in fog, feeling the ground slope down to her left"
            />
          ) : step === 1 ? (
            <Valley
              key="walk"
              landscape={BOWL}
              show="walk"
              start={STORY_START}
              label="The hiker walks downhill to the bottom of the bowl and stops"
            />
          ) : step === 2 ? (
            <Valley
              key="crowd"
              landscape={BOWL}
              show="crowd"
              starts={STORY_STARTS}
              label={`${FRIENDS} walkers dropped anywhere on the bowl all end at its bottom`}
            />
          ) : step === 3 ? (
            <Valley
              key="dent-walk"
              landscape={DENT}
              show="walk"
              start={STORY_START}
              label="On a valley with a shallow dip on its right slope, the hiker walks into the dip and stops, above the real bottom"
            />
          ) : step === 4 ? (
            <Valley
              key="dent-crowd"
              landscape={DENT}
              show="crowd"
              starts={STORY_STARTS}
              label={`Of ${FRIENDS} walkers on the dented valley, ${dentTrapped} stop in the dip and ${FRIENDS - dentTrapped} reach the bottom`}
            />
          ) : step === 5 ? (
            <Valley
              key="rope"
              landscape={DENT}
              show="rope"
              starts={STORY_STARTS}
              label="A rope between the dip and the bottom, with the hump between them standing above it"
            />
          ) : (
            <Valley
              key="named"
              landscape={DENT}
              show="named"
              starts={STORY_STARTS}
              label="The same valley named: the height is the loss, the position is the parameter, the dip is a local minimum and the bottom the global minimum"
            />
          )
        }
      </Steps>

      <p>
        The flat spot in the dip is a <strong>local minimum</strong>: lowest only compared with the ground right around
        it. The bottom is the <strong>global minimum</strong>.
      </p>

      <h2>The one line of math</h2>
      <p>
        Stretch the rope between the ground at x and at y. A share θ of the way along, its height is the same mix of
        the two end heights, and a function is convex when the ground there is never higher:
      </p>
      <p className="text-center font-serif text-xl">f(θx + (1 − θ)y) ≤ θ f(x) + (1 − θ) f(y)</p>
      <Clip
        src="convexity/chord-rule"
        label="The rule built from words: the ground a share theta of the way from x to y is at most the rope at the same spot. Then numbers for the dented valley, x to the fourth minus 2 x squared plus 0.8 x, with x = −1, y = 1 and theta one half: the ground at 0 is 0, the rope is half of −1.8 plus half of −0.2, which is −1. 0 is not at most −1, so the valley is not convex."
        caption={`The dented valley fails at its hump: halfway between x = −1 and x = 1 the rope is at ${one(ROPE_WORKED.rope)}, and the ground is at ${one(ROPE_WORKED.ground)}.`}
      />
      <p>
        Trying every rope is slow. For a smooth function there’s a shortcut: ground can only stand above a rope where it
        bends down, like the top of a hump. How the ground bends is its second derivative, f″. If f″ is never negative
        anywhere, the function is convex. At each function’s least bend:
      </p>
      <Numbers
        words
        items={WORKED_BENDS.map((w) => ({
          label: w.name,
          value: w.convex ? 'convex' : 'not convex',
          note: `f″(0) = ${one(w.bend)}`,
        }))}
      />
      <p>
        x⁴ shows why the rule says never negative, not always positive: its bottom is flat and it is still a bowl. And the
        tilt 0.8x is a straight line, which bends nothing, so it can’t make or break convexity.
      </p>
      <p>
        With many parameters, the second derivative becomes a grid of them, the <strong>Hessian</strong>, and “never
        negative” becomes <strong>positive semidefinite</strong>: slice the loss through any point in any direction, and
        the slice bends up or not at all.
      </p>
      <p>
        You rarely work out that grid, because two rules do most of the work: a sum of convex functions is convex, and a
        convex function of a linear map of the parameters is convex. <Link to="/learnings/least-squares">Least squares</Link>{' '}
        squares each point’s error, which is linear in the weights, and adds them up: convex. The loss of{' '}
        <Link to="/learnings/logistic-regression">logistic regression</Link> is convex in each point’s score, and the
        score is linear in the weights: convex too. A neural network passes its weights through layer after layer of
        bends, and its loss is not.
      </p>

      <h2>Why a convex loss can’t trap you</h2>
      <p>
        Few losses have a formula for their lowest point, and some that do cost too much to compute, so training
        searches: start somewhere and walk downhill, as{' '}
        <Link to="/learnings/gradient-descent">gradient descent</Link> does. On a convex loss, every flat spot is a global
        minimum. If somewhere were lower, the rope from your flat spot to it would slope down the whole way, and the
        ground, never above the rope, would have to drop right beside you. But the ground beside you is flat.
      </p>

      <h2>Bend the ground yourself</h2>
      <p>
        The ground here is x⁴ + b·x² + 0.8x, which bends least at x = 0, by 2b. Slide b, drag the rope’s two ends, and
        tap the ground to drop a walker.
      </p>
      <Figure
        caption={
          <>
            The ground turns ink wherever it stands above the rope, and the strip underneath is ink where f″ is negative:
            ropes fail only across those stretches. Between b = {one(SECOND_VALLEY + BENDS.step)} and 0 the ground is not
            convex, yet it has one valley and every walker finds it. Not convex doesn’t mean trapped; convex means you
            can’t be.
          </>
        }
      >
        <ChordLab
          landscape={ground}
          rope={rope}
          onRope={setRope}
          walker={walker}
          onWalker={(x) => {
            setWalker(x)
            setCrowd(null)
            setRuns((n) => n + 1)
          }}
          crowd={crowd}
          run={`${b} ${runs}`}
        />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Readout label="Convex" value={convex ? 'Yes' : 'No'} accent={convex} />
          <Readout label="Least f″" value={one(2 * b)} />
          <Readout label="Valleys" value={valleys} />
          <Readout label={`Stuck of ${FRIENDS}`} value={stuck} />
        </div>
        <Controls>
          <Slider label="b" value={b} min={BENDS.min} max={BENDS.max} step={BENDS.step} onChange={setB} format={one} />
          <Button
            onClick={() => {
              setCrowd(LAB_STARTS)
              setRuns((n) => n + 1)
            }}
          >
            Drop {FRIENDS} walkers
          </Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="You fit a model whose loss is convex, twice, from two random starts. Both runs report that the slope is flat, but one ends at loss 0.31 and the other at 0.52. What should you conclude?"
        options={[
          { label: 'The 0.52 run found a local minimum; keep the 0.31 one' },
          { label: 'The 0.52 run stopped early or has a bug', right: true },
          { label: 'Both are fine: convex losses have minima at many heights' },
          { label: 'Restart from more starts and keep the best' },
        ]}
        reveal={
          <>
            On a convex loss every flat spot is a global minimum, so two flat spots must be equally low. A gap means one run
            isn’t really at a flat spot: it stopped on a loose test or ran out of steps.
            More restarts won’t fix that; they are for losses that aren’t convex.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Convex loss: trust where it stops.</strong> For least squares, ridge or logistic regression, a run that
          reaches flat ground has the best fit. A better optimizer only gets there sooner.
        </li>
        <li>
          <strong>Not convex: start from several places.</strong> Neural networks are trained from a few random starts,
          keeping the lowest loss, because each start can settle in a different valley.
        </li>
        <li>
          <strong>Check convexity by its parts.</strong> Sums of convex pieces and convex functions of linear maps stay
          convex, so a convex penalty like <Link to="/learnings/ridge-regression">ridge’s</Link> λ‖w‖² keeps a convex loss
          convex.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Your loss is the larger of two convex losses: f(x) = max(x², (x − 1)²). It has a sharp corner at x = ½. Is it convex?"
        options={[
          { label: 'Yes', right: true },
          { label: 'No: the corner breaks it' },
          { label: 'Only if both pieces have the same lowest point' },
          { label: 'Only between x = 0 and x = 1' },
        ]}
        reveal={
          <>
            Yes. Any rope on the larger one starts and ends at least as high as each piece’s own rope, so it runs above
            both pieces, and so above their larger one. A corner that points down is fine; a hump that points up is what
            breaks convexity.
          </>
        }
      />
    </Article>
  )
}
