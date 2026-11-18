import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Faces from './Faces'
import Lab from './Lab'
import {
  CHECK_COND,
  CHECK_OPTIONS,
  CHECK_UNCOND,
  CHECK_W,
  generate,
  guided,
  KINDS,
  quoted,
  TAU,
  WORKED_COND,
  WORKED_UNCOND,
  WORKED_W,
  type Kind,
} from './model'

const pct = (share: number) => `${Math.round(100 * share)}%`
const one = (value: number) => value.toFixed(1)
const two = (value: number) => value.toFixed(2)

// The lab's numbers the prose quotes, for the owl
const AT_1 = quoted(1)
const AT_3 = quoted(3)
const AT_15 = quoted(15)
const CHECK_ANSWER = guided(CHECK_UNCOND, CHECK_COND, CHECK_W)

export default function ClassifierFreeGuidance() {
  const [kind, setKind] = useState<Kind>('owl')
  const [w, setW] = useState(1)
  const points = generate(kind, w)

  return (
    <Article
      kicker="Vision and language · Generating images"
      title="Classifier-free guidance"
      promise="An image model trained on captions follows its prompt only loosely. How do you make it listen harder, without a second model?"
      takeaway={
        <>
          Guess the noise twice, with the prompt and without, and step <em>past</em> the prompted guess: ε̂ = ε
          <sub>∅</sub> + w(ε<sub>c</sub> − ε<sub>∅</sub>). A guidance scale of a few trades variety for
          faithfulness; too much walks off the data.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 16, “Diffusion models”: classifier-free guidance and Imagen',
        },
        {
          title: 'Classifier-Free Diffusion Guidance',
          by: 'Jonathan Ho and Tim Salimans, NeurIPS 2021 Workshop on Deep Generative Models (arXiv 2022)',
          part: 'The method, and how often to drop the label in training',
          url: 'https://arxiv.org/abs/2207.12598',
        },
        {
          title: 'Diffusion Models Beat GANs on Image Synthesis',
          by: 'Prafulla Dhariwal and Alex Nichol, NeurIPS 2021',
          part: 'Classifier guidance, the method this one replaces',
          url: 'https://arxiv.org/abs/2105.05233',
        },
        {
          title: 'Photorealistic Text-to-Image Diffusion Models with Deep Language Understanding (Imagen)',
          by: 'Chitwan Saharia et al., NeurIPS 2022',
          part: 'Sections 2.2 “Classifier-free guidance” and 2.3 “Large guidance weight samplers”',
          url: 'https://arxiv.org/abs/2205.11487',
        },
      ]}
    >
      <Predict
        question="At each step, a diffusion model can guess the noise in a picture twice: once reading the prompt, once without it. Which guess makes the picture follow the prompt hardest?"
        options={[
          { label: 'The prompted guess, as it is' },
          { label: 'The average of the two' },
          { label: 'Past the prompted guess, away from the other', right: true },
          { label: 'The unprompted guess, with fresh noise' },
        ]}
        reveal={
          <>
            Past it. The gap between the two guesses is what the prompt changes, and doing that several times over is
            how nearly every text-to-image model is run. A street artist does the same.
          </>
        }
      />

      <h2>A caricature</h2>

      <Steps
        readable
        say={[
          <>You draw faces at a street fair, and to you each face is two numbers: how long its nose is, and how wide.</>,
          <>Someone asks for “just a face”, and you draw the ordinary one, in the middle of every face you’ve drawn.</>,
          <>Someone else asks for their friend Sam, and you draw Sam: a slightly longer nose, a slightly narrower face.</>,
          <>The arrow from the ordinary face to Sam is everything that makes Sam look like Sam.</>,
          <>
            For a caricature, walk that arrow three times: three times the extra nose, three times the narrowness, and
            Sam is unmistakable.
          </>,
          <>Walk it ten times and you have left every face you ever drew behind. It looks like nobody.</>,
          <>
            Image models do this. The ordinary face is the noise guess without the prompt, Sam is the guess with it,
            and the number of walks is the <strong>guidance scale</strong> w.
          </>,
        ]}
      >
        {(step) => <Faces key={step} step={step} />}
      </Steps>

      <h2>Two guesses from one network</h2>
      <p>
        The denoiser in <Link to="/learnings/diffusion-models">diffusion models</Link> looks at a noisy picture x
        <sub>t</sub> and its step t, and guesses the noise ε that was mixed in. To have it draw what you ask, hand it
        the prompt c as one more input: a class label as a learned vector, or a caption read through{' '}
        <Link to="/learnings/transformer-block">cross-attention</Link>. Its guess ε<sub>c</sub> is then the best one
        for pictures that match c.
      </p>
      <p>
        The ordinary face needs a second guess, made with no prompt at all. Rather than train a second network, you
        hide the prompt during training on about one example in ten, putting the empty prompt ∅ in its place, so the
        same network learns both ε<sub>c</sub> and ε<sub>∅</sub>. Generating a picture then costs two calls of the
        network at every step, one handed c and one handed ∅.
      </p>

      <h2>The one line of math</h2>
      <p>In words: start from the guess without the prompt, and walk w times along what the prompt changes about it.</p>
      <p className="text-center font-serif text-xl">
        ε̂ = ε<sub>∅</sub> + w (ε<sub>c</sub> − ε<sub>∅</sub>)
      </p>
      <p>
        The step then uses ε̂ wherever it would have used the plain guess. For one pixel where ε<sub>∅</sub> ={' '}
        {WORKED_UNCOND} and ε<sub>c</sub> = {WORKED_COND}:
      </p>
      <Numbers
        items={WORKED_W.map((scale) => ({
          label: `w = ${scale}`,
          value: one(guided(WORKED_UNCOND, WORKED_COND, scale)),
          note: scale === 0 ? 'prompt ignored' : scale === 1 ? 'plain prompted' : 'past it',
        }))}
      />
      <p>
        This is <strong>classifier-free guidance</strong>. The name is a contrast: the method before it,{' '}
        <em>classifier guidance</em>, trained a separate classifier on noisy pictures and nudged each step the way
        that made it surer the picture showed c. The gap ε<sub>c</sub> − ε<sub>∅</sub> already points that way (by
        Bayes’ rule it is the pull of a classifier hidden in the two guesses), so no classifier is needed.
      </p>
      <Clip
        src="classifier-free-guidance/guided-guess"
        label="Guided equals without plus w times, with minus without, written as epsilon hat equals epsilon empty plus w times epsilon c minus epsilon empty. The bracket is what the prompt changes. With epsilon empty 0.3 and epsilon c 0.5: w equals 0 gives 0.3, the prompt ignored; w equals 1 gives 0.5, the plain prompted guess; w equals 7 gives 1.7, past it. Regrouped, epsilon hat equals 1 minus w times epsilon empty plus w times epsilon c; at w equals 7 that is minus 6 epsilon empty plus 7 epsilon c, a weight below zero that pushes away from the unprompted guess. Ho and Salimans write it as 1 plus s times epsilon c minus s times epsilon empty, with s equal to w minus 1."
        caption="Regroup the rule and the unprompted guess gets the weight 1 − w: past w = 1 it is below zero, and every step is pushed away from what an ordinary picture would be."
      />

      <h2>Turn it up yourself</h2>
      <p>
        Here pictures are shrunk to points in the plane, three kinds of them, and the denoiser is the exact best one
        for this data, made to follow its prompt only loosely, as a trained one does. Pick a kind and drag w.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage dots look like the kind asked for; ink dots look like another. At w = 1 only {pct(AT_1.onTarget)} of
            the owls are owls. By w = 3 it is {pct(AT_3.onTarget)}, with their middle on the owls’ centre. At w = 15
            every one is an owl, yet they spread only {two(AT_15.spread)}, less than real owls’ {TAU}, and their
            middle has slid {two(AT_15.past)} past the centre, away from the cats and dogs.
          </>
        }
      >
        <Lab kind={kind} w={w} points={points} />
        <Controls>
          <Choice label="Asked for" options={KINDS} value={kind} onChange={setKind} />
          <Slider label="Guidance scale" value={w} min={0} max={15} step={0.5} onChange={setW} format={(v) => v.toFixed(1)} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="You push w to 20 and every picture comes out garish and much like the others. What happened?"
        options={[
          { label: 'The model is undertrained' },
          { label: 'The prompt was dropped too often in training' },
          { label: 'Guidance pushed past anything in the training data', right: true },
          { label: 'Too few denoising steps' },
        ]}
        reveal={
          <>
            Past the data. Each step walks w times along the prompt’s arrow, and far enough out there were never any
            training pictures, so the model has no idea what belongs there. Imagen (Saharia et al., 2022) met this as
            pixel values running past the range seen in training, and clipped them back at every step.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Start with w between about 3 and 12.</strong> Below that the prompt is followed loosely; well above,
          pictures grow samey and oversaturated.
        </li>
        <li>
          <strong>Drop the prompt 10 to 20% of the time in training.</strong> Ho and Salimans found the two about
          equally good, and half the time worse.
        </li>
        <li>
          <strong>Budget two passes per step.</strong> The guesses with and without the prompt can run as one batch
          of two, but they cost twice the plain model.
        </li>
        <li>
          <strong>Swap ∅ for a negative prompt.</strong> Put “blurry” where the empty prompt was, and every step is
          pushed away from blurry instead of away from ordinary.
        </li>
      </ul>
      <p>
        Stable Diffusion, the model in <Link to="/learnings/latent-diffusion">latent diffusion</Link>, guides every
        step this way.
      </p>

      <Predict
        kicker="Check yourself"
        question={`For one pixel, the guess without the prompt is ${one(CHECK_UNCOND)} and with it ${one(CHECK_COND)}. At w = ${CHECK_W}, what does the step use?`}
        options={CHECK_OPTIONS.map((value) => ({ label: one(value), right: Math.abs(value - CHECK_ANSWER) < 1e-9 }))}
        reveal={
          <>
            {one(CHECK_ANSWER)}. The prompt pulls this pixel down by {one(CHECK_UNCOND - CHECK_COND)}, and guidance
            walks that {CHECK_W} times: {one(CHECK_UNCOND)} − {CHECK_W} × {one(CHECK_UNCOND - CHECK_COND)} ={' '}
            {one(CHECK_ANSWER)}. The walk goes whichever way the prompt points, down as readily as up.
          </>
        }
      />
    </Article>
  )
}
