import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { FieldDrawing, FieldRun, Header } from './Field'
import Lab from './Lab'
import {
  BACK,
  BACK_ON,
  BETA,
  CLEAR_GUESSES,
  CLEAR_MINUTE,
  DATA,
  DATA_SPREAD,
  DRAW,
  FORWARD,
  FRESH_CHOICES,
  JUMP,
  JUMP_MIDDLE,
  labRun,
  SHEEP,
  START,
  STEP_CHOICES,
  T,
  WORKED,
  type Fresh,
  type StepChoice,
} from './model'

const two = (value: number) => value.toFixed(2)
const pct = (share: number) => `${Math.round(100 * share)}%`

const FIELD = 'Two hundred sheep in a field'
const LAST = BACK[BACK.length - 1]

// What the story's figure shows at each step
function Story({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div>
          <Header minute={0} status="Two flocks" />
          <FieldDrawing points={DATA} tone="sage" names="field" label={`${FIELD}, in two flocks, one by the barn and one by the pond.`} />
        </div>
      )
    case 1:
      return (
        <FieldRun
          key="wander"
          frames={FORWARD.slice(0, CLEAR_MINUTE + 1)}
          ms={3000}
          minutes={[0, CLEAR_MINUTE]}
          status={(done) => (done ? 'Still two flocks' : 'Wandering…')}
          tone="sage"
          label={`${FIELD}, each wandering a little every minute for ${CLEAR_MINUTE} minutes.`}
        />
      )
    case 2:
      return (
        <FieldRun
          key="scatter"
          frames={FORWARD.slice(CLEAR_MINUTE)}
          ms={4000}
          minutes={[CLEAR_MINUTE, T]}
          status={(done) => (done ? 'One round scatter' : 'Wandering…')}
          tone="sage"
          label={`${FIELD}, wandering until minute ${T}, when they form one round scatter around the middle.`}
        />
      )
    case 3:
      return (
        <div>
          <Header minute={CLEAR_MINUTE} status="Your guesses" />
          <FieldDrawing
            points={FORWARD[CLEAR_MINUTE]}
            arrows={CLEAR_GUESSES}
            tone="sage"
            names="field"
            label={`${FIELD} at minute ${CLEAR_MINUTE}, with lines from some of them to where each most likely started: almost all point into a flock.`}
          />
        </div>
      )
    case 4:
      return (
        <FieldRun
          key="jump"
          frames={[FORWARD[T], JUMP]}
          ms={1600}
          status={(done) => (done ? `${JUMP_MIDDLE} of ${SHEEP} nearer the middle` : 'One jump…')}
          tone="ink"
          label={`Every sheep sent from minute ${T} straight to its best-guess start: all ${JUMP_MIDDLE} end in a short line through the middle, between the flocks.`}
        />
      )
    case 5:
      return (
        <FieldRun
          key="back"
          frames={BACK}
          ms={4500}
          minutes={[T, 0]}
          status={(done) => (done ? `${BACK_ON} of ${SHEEP} on a flock` : 'One minute at a time…')}
          tone="judged"
          label={`The sheep taken back one minute at a time from minute ${T}: ${BACK_ON} of ${SHEEP} end inside a flock's ring.`}
        />
      )
    default:
      return (
        <div>
          <Header minute={null} status={`${SHEEP} new pictures`} />
          <FieldDrawing
            points={LAST}
            tone="judged"
            names="pixels"
            label="The same field relabelled: across is pixel 1, up is pixel 2, and each flock is a kind of two-pixel picture."
          />
        </div>
      )
  }
}

export default function DiffusionModels() {
  const [steps, setSteps] = useState<StepChoice>(100)
  const [fresh, setFresh] = useState<Fresh>('On')
  const [replay, setReplay] = useState(0)
  const one = labRun(1, 'On')
  const five = labRun(5, 'On')
  const many = labRun(1000, 'On')
  const still = labRun(1000, 'Off')
  const [w1, w10, w100] = WORKED

  return (
    <Article
      kicker="Vision and language · Generating images"
      title="Diffusion models"
      promise="Turning a picture into static is easy: keep adding noise. How does a network learn to run that backwards, and make new pictures out of pure static?"
      takeaway={
        <>
          A diffusion model learns one thing, to guess the noise mixed into a sample at any step, and makes new samples
          by starting from pure noise and taking that guess away a <em>little</em> at a time.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 16, diffusion models: forward and reverse diffusion, the noise-prediction loss, training and sampling',
        },
        {
          title: 'Denoising Diffusion Probabilistic Models',
          by: 'Jonathan Ho, Ajay Jain and Pieter Abbeel, NeurIPS 2020',
          part: 'The closed-form noising, the simplified noise-prediction loss, and Algorithms 1 and 2',
          url: 'https://arxiv.org/abs/2006.11239',
        },
        {
          title: 'Deep Unsupervised Learning using Nonequilibrium Thermodynamics',
          by: 'Jascha Sohl-Dickstein, Eric A. Weiss, Niru Maheswaranathan and Surya Ganguli, ICML 2015',
          part: 'The first diffusion model: destroy the data slowly with noise, learn to reverse it',
          url: 'https://arxiv.org/abs/1503.03585',
        },
      ]}
    >
      <Predict
        question="Two flocks of sheep graze at opposite ends of a field. All afternoon each sheep wanders at random, until they are scattered around the middle. For any sheep, you can name the guess of its starting spot that is off by the least, on average. Send every sheep straight to that guess. Where do they end up?"
        options={[
          { label: 'Back in their two flocks' },
          { label: 'Each at the flock nearest it' },
          { label: 'In a heap in the middle', right: true },
          { label: 'Scattered just as they were' },
        ]}
        reveal={
          <>
            In a heap in the middle. After a long wander, where a sheep stands says almost nothing about where it began:
            it could have come from either flock. The guess that misses by least on average is then halfway between
            them, in the middle of the field, where no sheep ever grazed.
          </>
        }
      />

      <h2>Two flocks and an afternoon</h2>

      <Steps
        readable
        say={[
          <>You keep {SHEEP} sheep in two flocks, one grazing by the barn and one by the pond.</>,
          <>Every minute each sheep takes a small random step, and the field’s gentle bowl pulls it a touch toward the middle.</>,
          <>
            By minute {T} the flocks are gone: one round scatter around the middle, which would look the same whatever
            shape the flocks had been.
          </>,
          <>
            You have watched many afternoons, so for a sheep at any spot and minute you can guess where it started; at
            minute {CLEAR_MINUTE}, almost every guess points into a flock.
          </>,
          <>
            At minute {T} every guess is a hedge between the flocks, so sending each sheep to its guess in one jump
            leaves all {JUMP_MIDDLE} nearer the middle than either flock.
          </>,
          <>
            So undo one minute at a time: nudge each sheep a little the way you guess it came, let it wander a little,
            and {BACK_ON} of {SHEEP} end back on a flock.
          </>,
          <>
            Each sheep is a picture with two pixels, its spot their values (the more solid a square, the higher the value);
            the wander is <strong>noise</strong>, and your guess is a network: a <strong>diffusion model</strong>.
          </>,
        ]}
      >
        {(step) => <Story step={step} />}
      </Steps>

      <p>
        A real picture is the same, with a direction for every pixel value instead of two. A{' '}
        <Link to="/learnings/gans">GAN</Link> learns to make pictures through a contest and a{' '}
        <Link to="/learnings/variational-autoencoders">VAE</Link> through a squeezed code; a diffusion model only ever
        learns to undo a little noise. The wander is the <strong>forward process</strong>: T steps, each shrinking the
        sample a touch and adding Gaussian noise of variance β<sub>t</sub>, the <strong>noise schedule</strong>. Nothing
        in it is learned. DDPM, the version on this page, uses T = 1000 with β rising from 0.0001 to 0.02; our field
        uses T = {T} and β = {BETA} at every step.
      </p>

      <h2>The one line of math</h2>
      <p>
        You never have to walk all the steps to know where a sample can be at step t. Write ᾱ<sub>t</sub> for what is
        left of the start: (1 − β) multiplied together once per step so far. Then the sample at step t is its start,
        shrunk by √ᾱ<sub>t</sub>, plus a single noise draw ε scaled by √(1 − ᾱ<sub>t</sub>):
      </p>
      <p className="text-center font-serif text-2xl text-ink">
        x<sub>t</sub> = √ᾱ<sub>t</sub> x<sub>0</sub> + √(1 − ᾱ<sub>t</sub>) ε
      </p>
      <p>
        With β = {BETA}, ᾱ is {two(w1.a)} after one minute, {two(w10.a)} after ten and {w100.a.toFixed(3)} after a
        hundred. A sheep {START} m east of the middle, with a noise draw of ε = {DRAW}, stands at:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `Minute ${w.t}`,
          value: two(w.x),
          note: `${two(w.shrunk)} + ${two(w.noise)}`,
        }))}
      />
      <p>
        By minute {T} only {two(w100.keep)} of the start is left in the sum; the rest is noise. The two weights are made
        so their squares add to 1, which is why the clip below can fold many small draws into one.
      </p>
      <Clip
        src="diffusion-models/closed-form"
        label="One step of noising: x t equals the square root of 1 minus beta times x t minus 1, plus the square root of beta times epsilon. Substituting the step before gives two noise draws, whose variances add to 1 minus (1 minus beta) squared, so they merge into one draw. After t steps, x t equals the square root of alpha bar t times x 0 plus the square root of 1 minus alpha bar t times epsilon, with alpha bar t equal to (1 minus beta) to the t. With beta 0.05 and t 10, alpha bar is 0.60: x 10 equals 0.77 x 0 plus 0.63 epsilon."
        caption="Two small noise draws add up to one bigger one, so any number of steps folds into a single jump from the start."
      />

      <h2>Teaching the guess</h2>
      <p>
        Training uses that jump. Take a training picture, pick a step t at random, draw the noise ε, and make
        x<sub>t</sub> in one go. The network sees x<sub>t</sub> and t and guesses the noise; the loss is the squared
        miss between its guess and the real ε, averaged: a plain mean squared error. Guessing the noise is as good as
        guessing the picture, since the closed form gives the start back: ({two(w10.x)} − {two(w10.noise)}) ÷{' '}
        {two(w10.keep)} = {START}. For pictures the network is usually a <Link to="/learnings/u-net">U-Net</Link>, which
        takes a picture and returns one the same size, and is told t.
      </p>
      <p>
        Squared error has a catch you have already met: it is smallest for the average. A network trained this way
        guesses the average noise over every start that could have led to x<sub>t</sub>, the hedge that put the sheep
        in the middle. Our field’s guesses are that exact average, worked out from the flocks we drew, so they are
        what a perfectly trained network would say.
      </p>

      <Predict
        kicker="Quick check"
        question="T is 1000. To make one training example at step t = 700, how many noising steps does the computer run?"
        options={[
          { label: '700' },
          { label: '1000' },
          { label: 'One', right: true },
          { label: '300, from the noise back' },
        ]}
        reveal={
          <>
            One. The closed form mixes the clean picture and a single noise draw with the weights for step 700, so a
            training example at any step costs the same, and each picture can be trained at a fresh random step every
            time it comes round.
          </>
        }
      />

      <h2>Running it backwards</h2>
      <p>
        To make a new picture, start from pure noise and go from step T down to 1. At each step, take away a share of
        the network’s noise guess, undo the shrink, and mix in a little fresh noise (none at the last step). Here the
        same {SHEEP} draws of noise run back with the same perfect guesses; choose how many steps to take between pure
        noise and data, and whether to add the fresh noise.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage: samples inside a ring, where the real ones lie; ink: samples that are not. One step lands{' '}
            {pct(one.on)} in a ring; five, {pct(five.on)}; a thousand, {pct(many.on)}, with the real width of{' '}
            {two(DATA_SPREAD)}. Without fresh noise, a thousand steps still land, but squeezed to a width of{' '}
            {two(still.spread)}: every sample near the centre, all alike.
          </>
        }
      >
        <Lab steps={steps} fresh={fresh} replay={replay} />
        <Controls>
          <Choice label="Steps back" options={STEP_CHOICES} value={steps} onChange={setSteps} />
          <Choice label="Fresh noise" options={FRESH_CHOICES} value={fresh} onChange={setFresh} />
          <Button onClick={() => setReplay((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>
      <p>
        Small steps work because each asks the network to move a sample only a little, where its average guess is close
        to right. The fresh noise keeps each step a draw rather than a slide, so the samples stay as varied as the data.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Take many small steps.</strong> DDPM runs all 1000 when it generates, one network pass each, which
          makes it slow. Later samplers such as DDIM reuse the same network and get by with tens of steps.
        </li>
        <li>
          <strong>Train at every noise level.</strong> Draw t evenly from 1 to T, so the network practises on the
          near-pure noise where generation starts as much as on the nearly clean end.
        </li>
        <li>
          <strong>Start the schedule gently.</strong> Tiny β where the picture is nearly clean keeps each step back small
          enough for the average guess to be right; the last steps can add a lot, since little is left by then.
        </li>
        <li>
          <strong>Keep the fresh noise.</strong> Without it the samples collapse toward the most typical picture.
        </li>
      </ul>
      <p>
        To make the picture a prompt asks for, the same network is also given the text: that is{' '}
        <Link to="/learnings/classifier-free-guidance">classifier-free guidance</Link>. To make it affordable for large
        pictures, the steps run on a compressed version of the picture:{' '}
        <Link to="/learnings/latent-diffusion">latent diffusion</Link>.
      </p>

      <Predict
        kicker="Check yourself"
        question="To save time, a team trains its denoiser only at steps 1 to 300 of T = 1000, then generates from pure noise as usual. What goes wrong?"
        options={[
          { label: 'Nothing: the later steps fix it' },
          { label: 'The first steps are guesses at noise it never saw', right: true },
          { label: 'Only the finest detail comes out blurred' },
          { label: 'It runs faster with the same results' },
        ]}
        reveal={
          <>
            Generation starts at step 1000, where the picture is nearly all noise, and the network has never practised
            there. Its first 700 guesses are untrained, so by step 300 the sample is unlike anything it saw at that
            step, and even the steps it knows go wrong.
          </>
        }
      />
    </Article>
  )
}
