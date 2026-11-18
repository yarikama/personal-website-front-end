import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Families from './Families'
import Lab, { LOST_BOOST } from './Lab'
import {
  big,
  CHECK,
  CHECK_FEWER,
  count,
  FACTORS,
  FLOOR_TILES,
  grouped,
  IMAGE,
  IMAGE_NUMBERS,
  LATENT,
  LATENT_NUMBERS,
  PASSES,
  pct,
  PLAN_NOTES,
  REBUILDS,
  SD_FEWER,
  SHRINK,
  SIDE,
  STORY,
  STORY_F,
  STORY_FEWER,
  type Factor,
} from './model'
import Mosaic, { type Show } from './Mosaic'

// What the story's figure shows at each step
const STEPS: Show[] = ['floor', 'floor-passes', 'encode', 'decode', 'plan-passes', 'compare', 'named']

const PLAN_SIDE = SIDE / STORY_F
const CHECK_LATENT = count(CHECK.side / CHECK.f, CHECK.channels)

export default function LatentDiffusion() {
  const [f, setF] = useState<Factor>(STORY_F)
  const rebuild = REBUILDS[f]

  return (
    <Article
      kicker="Vision and language · Generating images"
      title="Latent diffusion"
      promise="A diffusion model runs its network dozens of times for every picture. How does Stable Diffusion make that cheap enough for a home computer?"
      takeaway={
        <>
          Train an autoencoder once to squeeze away the detail nobody can see, run every denoising step in its small{' '}
          <em>latent</em>, and decode once at the end.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 16, diffusion models: latent diffusion models, and the timeline and comparison of generative models',
        },
        {
          title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
          by: 'Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser and Björn Ommer, CVPR 2022',
          part: 'Perceptual compression, the downsampling factors f = 1 to 32, and cross-attention conditioning',
          url: 'https://arxiv.org/abs/2112.10752',
        },
      ]}
    >
      <Predict
        question={`Stable Diffusion makes ${IMAGE.side} × ${IMAGE.side} colour pictures, but its denoising steps work on a grid of ${LATENT.side} × ${LATENT.side} with ${LATENT.channels} numbers at each spot. How many times fewer numbers does each step handle?`}
        options={[
          { label: `${SHRINK}×: the grid is ${SHRINK} times smaller per side` },
          { label: `${SD_FEWER}×`, right: true },
          { label: `${SHRINK * SHRINK}×: ${SHRINK} × ${SHRINK}` },
          { label: 'None: it is still the same picture' },
        ]}
        reveal={
          <>
            {SD_FEWER} times. Shrinking each side by {SHRINK} would make it {SHRINK * SHRINK}, but each spot keeps{' '}
            {LATENT.channels} numbers where a pixel has {IMAGE.channels} colours. The puzzle is how so few numbers can
            still become a sharp picture. A tiled floor shows how.
          </>
        }
      />

      <h2>A floor and a plan</h2>

      <Steps
        readable
        say={[
          <>
            You’re laying a mosaic floor, {SIDE} tiles by {SIDE}: {grouped(FLOOR_TILES)} tiles, each a shade of grey.
          </>,
          <>
            You start from tiles of random shades and fix the floor in {PASSES} passes, nudging all{' '}
            {grouped(FLOOR_TILES)} tiles every time: {grouped(PASSES * FLOOR_TILES)} touches.
          </>,
          <>
            A tiler offers a shortcut: once, they learn to sum up each {STORY_F}-by-{STORY_F} patch in 4 notes (how
            bright, how it shades across and down, how grainy), {grouped(PLAN_NOTES)} notes for the whole floor.
          </>,
          <>Hand them any plan and they lay the floor: each patch shaded as noted, with grain sprinkled wherever they like.</>,
          <>
            So you make your {PASSES} passes on the plan instead, {grouped(PASSES * PLAN_NOTES)} touches,{' '}
            {STORY_FEWER} times fewer, and the tiler lays the floor once at the end.
          </>,
          <>
            Up close the specks sit in different places and the tiles are off by {pct(STORY.close)} on average; from
            across the room, by only {pct(STORY.far)}.
          </>,
          <>
            That’s <strong>latent diffusion</strong>: the floor is an image, the plan is its <strong>latent</strong>,
            the tiler is an autoencoder trained once, and each pass is a denoising step.
          </>,
        ]}
      >
        {(step) => <Mosaic key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        The passes are a <Link to="/learnings/diffusion-models">diffusion model</Link>’s denoising steps, each a full run
        of its network over every number it is given. The tiler’s two jobs are the encoder and decoder of an
        autoencoder, the kind a <Link to="/learnings/variational-autoencoders">VAE</Link> is. Diffusion never sees the
        floor: it learns, and later makes, plans.
      </p>

      <h2>The one line of math</h2>
      <p>
        A step’s work grows with how many numbers it handles: height times width times the numbers at each spot. Shrink
        each side by f and the count falls by f × f; change the numbers per spot from 3 colours to c, and it moves by 3
        ÷ c. So the latent is f² × 3 ÷ c times smaller. For Stable Diffusion:
      </p>
      <Numbers
        items={[
          { label: 'Image', value: grouped(IMAGE_NUMBERS), note: `${IMAGE.side} × ${IMAGE.side} × ${IMAGE.channels}` },
          { label: 'Latent', value: grouped(LATENT_NUMBERS), note: `${LATENT.side} × ${LATENT.side} × ${LATENT.channels}` },
          { label: 'Fewer', value: `${SD_FEWER}×`, note: `${SHRINK}² × ${IMAGE.channels} ÷ ${LATENT.channels}` },
        ]}
      />
      <Clip
        src="latent-diffusion/fewer-numbers"
        label={`The image holds ${IMAGE.side} times ${IMAGE.side} times ${IMAGE.channels} numbers, the latent ${LATENT.side} times ${LATENT.side} times ${LATENT.channels}. Their ratio splits into ${SHRINK} squared, which is 64, times 3 over 4, which gives ${SD_FEWER}. Over ${PASSES} steps that is ${big(PASSES * IMAGE_NUMBERS)} numbers against ${big(PASSES * LATENT_NUMBERS)}.`}
        caption={`The sides give ${SHRINK * SHRINK}, the extra channel takes a quarter back: ${SD_FEWER}. Fifty steps over the latent handle about what one would over the pixels.`}
      />
      <p>
        The floor was grey, one number a tile, and shrank only {STORY_F} per side: {SIDE}² ÷ ({PLAN_SIDE}² × 4) is{' '}
        {STORY_FEWER}. A picture {IMAGE.side} pixels across can take {SHRINK} per side, and its 3 colours give another
        factor of 3: {STORY_FEWER} × 4 × 3 = {SD_FEWER}.
      </p>

      <h2>What the plan keeps</h2>
      <p>
        Most of a picture’s numbers pin down detail you can’t see from a step away: exactly where each speck of grain
        falls. The plan keeps how bright, which way it shades and how grainy, and lets the decoder make up the specks.
        Choose how big a patch each set of notes sums up.
      </p>
      <Figure
        caption={
          <>
            A fuller tile is a higher number. What differs is drawn {LOST_BOOST} times stronger. At 4 × 4 nearly all of
            it is specks in new places, which blurring away (the view from across the room) hides; at 8 × 8 and up,
            the edges of the sun and hill start to go, and blurring no longer hides it.
          </>
        }
      >
        <Lab rebuild={rebuild} />
        <Controls>
          <Choice label="Patch" options={FACTORS} value={f} onChange={setF} format={(v) => `${v}×${v}`} />
          <Readout label="Numbers" value={grouped(rebuild.numbers)} />
          <Readout label="Fewer" value={`${rebuild.fewer}×`} />
          <Readout label="Off up close" value={pct(rebuild.close)} />
          <Readout label="From afar" value={pct(rebuild.far)} accent />
        </Controls>
      </Figure>
      <p>
        At 2 × 2 the plan saves nothing; at 16 × 16 it is a blur that grain can’t rescue. Rombach and colleagues found
        the same with real pictures: no shrinking, or 2 per side, left training slow, its effort spent on invisible
        detail; 32 per side lost too much; 4 to 16 worked best. Their autoencoder is trained with a perceptual loss and
        an adversary that judges it patch by patch, as in a <Link to="/learnings/gans">GAN</Link>, so its decoder paints believable texture
        instead of a blur.
      </p>

      <Predict
        kicker="Quick check"
        question="A latent diffusion model gets layout and colours right, but small text and fine fur come out garbled, whatever the prompt or number of steps. Which part most likely needs changing?"
        options={[
          { label: 'Take more denoising steps' },
          { label: 'Train the denoiser longer' },
          { label: 'An autoencoder that squeezes less', right: true },
          { label: 'A bigger text encoder' },
        ]}
        reveal={
          <>
            The autoencoder. Detail its latent throws away can’t come back: the denoiser only ever makes latents, and the
            decoder can only guess at what they don’t hold. More steps or training make better latents, not more detailed
            ones. A smaller shrink factor, or more numbers per spot, keeps more.
          </>
        }
      />

      <h2>The recipe: Stable Diffusion</h2>
      <ul>
        <li>
          <strong>Train the autoencoder once, then freeze it.</strong> Stable Diffusion’s is a VAE with only a slight
          pull toward N(0, I), turning {IMAGE.side} × {IMAGE.side} × 3 pictures into {LATENT.side} × {LATENT.side} ×{' '}
          {LATENT.channels} latents. Any number of diffusion models can then share it.
        </li>
        <li>
          <strong>Train the denoiser on latents.</strong> Encode each training picture and teach a{' '}
          <Link to="/learnings/u-net">U-Net</Link> to predict the noise in its noised latent, with the same loss as in
          pixel space.
        </li>
        <li>
          <strong>Bring in the prompt with cross-attention.</strong> A frozen text encoder,{' '}
          <Link to="/learnings/clip">CLIP</Link>’s, turns the prompt into vectors that the U-Net’s layers look up through{' '}
          <Link to="/learnings/transformer-block">cross-attention</Link>, steered by{' '}
          <Link to="/learnings/classifier-free-guidance">classifier-free guidance</Link>.
        </li>
        <li>
          <strong>Decode once.</strong> Start from random noise in the latent, take 20 to 50 steps there, and run the
          decoder a single time on the result.
        </li>
      </ul>

      <h2>GANs, VAEs and diffusion side by side</h2>
      <p>
        Each family of image generator fixed what the one before got wrong, and latent diffusion put two of them
        together: a VAE’s compact code with diffusion’s sharp, varied samples.
      </p>
      <Figure
        caption={
          <>
            When each arrived, and how they compare at making one picture. The shaded cell is each family’s weak spot:
            a GAN can fall back on a few kinds of picture, a VAE blurs, and plain diffusion pays for its quality in
            passes over every pixel.
          </>
        }
      >
        <Families />
      </Figure>
      <p>
        Newer models such as Stable Diffusion 3 swap the U-Net for a Transformer and change how the steps are taken,
        but they still run them in an autoencoder’s latent.
      </p>

      <Predict
        kicker="Check yourself"
        question={`An autoencoder shrinks ${CHECK.side} × ${CHECK.side} colour pictures by ${CHECK.f} per side and keeps ${CHECK.channels} numbers at each spot. How many times fewer numbers does each denoising step handle?`}
        options={[{ label: `${CHECK.f}×` }, { label: '12×' }, { label: `${CHECK_FEWER}×`, right: true }, { label: `${SD_FEWER}×` }]}
        reveal={
          <>
            {CHECK_FEWER} times: {CHECK.f}² = {CHECK.f * CHECK.f} from the sides, and 3 colours become{' '}
            {CHECK.channels} numbers, so nothing changes there. {grouped(IMAGE_NUMBERS)} numbers become{' '}
            {grouped(CHECK_LATENT)}. It keeps more detail than Stable Diffusion’s latent and saves less.
          </>
        }
      />
    </Article>
  )
}
