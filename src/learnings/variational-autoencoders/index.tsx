import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import {
  AE_HITS,
  balance,
  COLLAPSE,
  HIGH,
  NUDGED_HITS,
  NUDGED_KL,
  OWN_SHARE,
  SPOTS,
  TRICK,
  TRICK_SD,
  TRICK_Z,
  VAE_HITS,
  VAE_KL,
  WEIGHT_POWERS,
  weightOf,
  WIDE,
  WIDE_HITS,
  WORKED,
} from './model'
import PairLab from './PairLab'
import Plane, { type Scene } from './Plane'

const SCENES: Scene[] = ['game', 'spots', 'random', 'nudge', 'pull', 'sample', 'named']
const one = (v: number) => v.toFixed(1)
const two = (v: number) => v.toFixed(2)
const weightText = (power: number) => String(parseFloat(weightOf(power).toPrecision(2)))

export default function VariationalAutoencoders() {
  const [power, setPower] = useState(WEIGHT_POWERS.start)
  const found = balance(weightOf(power))

  return (
    <Article
      kicker="Vision and language · Generating images"
      title="No holes in the map"
      promise="A network that squeezes each picture into two numbers can rebuild every picture it has seen. Why can’t it draw a new one from two numbers you make up, and what would let it?"
      takeaway={
        <>
          An autoencoder’s decoder knows only the exact codes it was trained on. A <em>variational autoencoder</em>{' '}
          encodes each image as a blob, samples from it with z = μ + σε, and pays a KL penalty that pulls every blob
          toward N(0, I), so a code drawn from N(0, I) almost always lands where the decoder has practised.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 15, “Generative AI for Images”: autoencoders, variational autoencoders, the reparameterization trick and the KL divergence',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Appendix §22.11.4, “Kullback–Leibler Divergence”',
          url: 'https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html',
        },
        {
          title: 'Auto-Encoding Variational Bayes',
          by: 'Diederik P. Kingma and Max Welling, 2013',
          part: '§2.4 “The reparameterization trick”; Appendix B, the KL term for Gaussians',
          url: 'https://arxiv.org/abs/1312.6114',
        },
      ]}
    >
      <Predict
        question={`A network squeezes four tiny sketches into four spots on a plane and draws each back from its spot, perfectly. Hand its drawing half ${SPOTS} random spots in that plane: how many come back as a sketch?`}
        options={[
          { label: `All ${SPOTS}: it draws perfectly` },
          { label: 'About half' },
          { label: 'About 4, one a sketch' },
          { label: 'Almost none', right: true },
        ]}
        reveal={
          <>
            Almost none: {AE_HITS} of {SPOTS} in the run below. Training only ever asked it about four exact spots.
            Nothing told it what to draw anywhere else, so there it draws whatever its weights happen to give.
          </>
        }
      />

      <h2>Two numbers over the phone</h2>

      <Steps
        readable
        say={[
          <>
            You and a friend play a game: you see a tiny sketch, read out two numbers, and your friend draws it from
            those alone.
          </>,
          <>You give each of four sketches its own spot, and with practice your friend redraws every one perfectly.</>,
          <>
            Now read out {SPOTS} spots you never used. Your friend has never heard them, so they draw anything:{' '}
            {AE_HITS} of {SPOTS} come back as a sketch.
          </>,
          <>
            Change the game: you nudge the numbers a little at random each time, so your friend must draw the bar
            anywhere near the bar’s spot. Now {NUDGED_HITS} of {SPOTS} come back, but gaps remain.
          </>,
          <>
            Tiny nudges and far-off spots would bring the gaps back, so you pay for straying from the middle or nudging
            far from one step: the blobs crowd in, overlap, and blur the redraws a little.
          </>,
          <>
            Read out {SPOTS} spots from the middle now: {VAE_HITS} come back, and between the bar and the dash your
            friend draws a plus that nobody ever showed them.
          </>,
          <>
            That game is a <strong>variational autoencoder</strong>: you are the encoder, your friend the decoder, the
            two numbers the latent code z, each nudged spot a sample from a blob with mean μ and spread σ, and the
            penalty a pull toward the standard normal N(0, I).
          </>,
        ]}
      >
        {(step) => <Plane key={step} scene={SCENES[step]} />}
      </Steps>

      <p>
        The game without nudges is a plain <strong>autoencoder</strong>: an encoder squeezes an image into a short
        code, a decoder rebuilds the image from it, and both learn until the rebuild matches. (With straight-line maps
        for both halves, it finds the directions <Link to="/learnings/pca">PCA</Link> does.) Its decoder knows only the
        codes its encoder made, so a code you invent lands in a hole.
      </p>

      <h2>A sample you can train through</h2>
      <p>
        A VAE’s encoder gives a mean μ and a spread σ for each number of the code (as log σ², so σ = exp(½ log σ²)
        stays positive). Training must send the loss back through the random draw into μ and σ, but a draw has no
        slope. The <strong>reparameterization trick</strong> moves the chance outside: draw ε from N(0, 1) on its own
        and set z = μ + σε. Same blob, but now z moves by 1 when μ does and by ε when σ does. With μ = {TRICK.mean},
        log σ² = ln 0.25 (σ = {TRICK_SD}) and ε = {TRICK.eps}, z = {one(TRICK_Z)}.
      </p>

      <h2>The one line of math</h2>
      <p>
        The penalty is the <strong>Kullback–Leibler (KL) divergence</strong>, which measures how far one distribution
        is from another. For one number of the code, in words: half of the mean squared, plus the spread squared, minus
        the log of the spread squared, minus one. In symbols, KL = ½ (μ² + σ² − ln σ² − 1).
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `μ ${w.mean}, σ ${w.sd}`,
          value: two(w.kl),
          note: w.kl === 0 ? 'already N(0, 1)' : w.mean ? 'off the middle' : 'shrunk to a point',
        }))}
      />
      <Clip
        src="variational-autoencoders/kl-closed-form"
        label="The KL divergence of a blob q equal to N of mu, sigma squared from p equal to N of 0, 1 is the average over z drawn from q of log q of z minus log p of z. The logs differ by minus one half log sigma squared, minus z minus mu squared over two sigma squared, plus z squared over two. Averaged over q, z minus mu squared becomes sigma squared and z squared becomes mu squared plus sigma squared, leaving one half of mu squared plus sigma squared minus log sigma squared minus one. For mu 0 and sigma 1 it is 0; for mu 2 and sigma 1 it is 2; for mu 0 and sigma 0.1 it is 1.81."
        caption="Averaged over the blob, (z − μ)² becomes σ² and z² becomes μ² + σ²; the rest is gathering terms."
      />
      <p>
        Each number of the code pays its own share, and the shares add: the story’s blobs paid {one(NUDGED_KL)} each
        in the corners and {one(VAE_KL)} near the middle. The loss is the rebuild error plus a weight λ times the KL,
        and the two pull apart. Rebuilding wants narrow blobs far apart; the KL wants every blob to be N(0, 1), where a
        code says nothing about its image.
      </p>

      <h2>Weigh the two terms</h2>
      <p>
        Two sketches with one-number codes: for each weight, the lab finds the blobs with the lowest loss under the
        best possible decoder, which blends the sketches at each code by how likely each blob is to have put it there.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage is the bar’s codes, ink the dash’s, the dashed curve N(0, 1). The decoder has practised along the sage
            band; tiles ringed in sage come from there, the rest are scrambles. Small weights keep crisp sketches with
            holes between; past about {Math.round(COLLAPSE)}, both blobs become N(0, 1).
          </>
        }
      >
        <PairLab balance={found} />
        <Controls>
          <Slider
            label="KL weight λ"
            value={power}
            min={WEIGHT_POWERS.min}
            max={WEIGHT_POWERS.max}
            step={0.1}
            onChange={setPower}
            format={weightText}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="In the lab, push the KL weight to the top. What does the decoder draw from the bar’s own codes?"
        options={[
          { label: 'The bar, sharper' },
          { label: 'A scramble' },
          { label: 'A faint plus, like every code', right: true },
          { label: 'The dash' },
        ]}
        reveal={
          <>
            A faint plus. A heavy weight makes both blobs exactly N(0, 1), so a code says nothing about which sketch
            went in, and the best the decoder can draw is their average, half bar and half dash: the worst rebuild
            error, {two(HIGH.rebuild)}.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Generate by sampling the prior.</strong> Draw z from N(0, I) and decode it; the encoder is only
          needed for training.
        </li>
        <li>
          <strong>Tune λ.</strong> Code often averages the rebuild error over pixels but sums the KL over the code, so
          the scales differ: too little weight brings back the holes, too much the blur.
        </li>
        <li>
          <strong>Expect some blur.</strong> Where blobs overlap, the decoder draws a blend: even the story’s bar came
          back at {Math.round(100 * OWN_SHARE)}% strength.{' '}
          <Link to="/learnings/gans">GANs</Link> draw sharper; <Link to="/learnings/latent-diffusion">latent diffusion</Link>{' '}
          keeps a VAE as its compressor and generates in the VAE’s code.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A trained VAE’s blobs sit inside N(0, I). For more variety, you draw codes from a normal ${WIDE} times wider. What comes out?`}
        options={[
          { label: 'More varied, still sharp' },
          { label: 'The same images, more often' },
          { label: 'Mostly garbage', right: true },
          { label: 'Blurred copies of one image' },
        ]}
        reveal={
          <>
            Mostly garbage: spread the story’s {SPOTS} codes {WIDE} times wider and only {WIDE_HITS} land in a blob. The
            KL term packed the blobs where N(0, I) draws, so wider draws land where the decoder never practised: the
            autoencoder’s holes again.
          </>
        }
      />
    </Article>
  )
}
