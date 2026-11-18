import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  CHAIR_PIXELS,
  COPY_CHANNELS,
  DECODER_CHANNELS,
  DEPTHS,
  GROWS,
  side,
  SIZE,
  STACKED,
  STORY,
  STORY_BLOCKS,
  STORY_BOTH,
  STORY_COPY,
  STORY_DEEP,
  STORY_DEPTH,
  USES,
  WORKED,
  type Depth,
  type Grow,
  type Use,
} from './model'
import UShape, { type View } from './UShape'

const two = (value: number) => value.toFixed(2)
const sixteenths = (value: number) => `${Math.round(value * 16)}/16`
const chairOf = (s: { kept: number; extra: number }) => s.kept - s.extra

// What the story's figure shows at each step
const base = { depth: STORY_DEPTH, deep: true, copy: false, named: false }
const VIEWS: View[] = [
  { ...base, map: false, cut: null },
  { ...base, map: true, cut: null, fresh: 'map' },
  { ...base, map: true, cut: STORY_DEEP, fresh: 'cut' },
  { ...base, map: true, cut: STORY_COPY, deep: false, copy: true, fresh: 'cut' },
  { ...base, map: true, cut: STORY_BOTH, copy: true, fresh: 'cut' },
  { ...base, map: true, cut: STORY_BOTH, copy: true, named: true },
]

const WORKED_LABELS = ['Nearest only', 'Below only', 'Three of four']

export default function UNet() {
  const [depth, setDepth] = useState<Depth>(2)
  const [how, setHow] = useState<Grow>('Bilinear')
  const [use, setUse] = useState<Use>('Deep map')

  return (
    <Article
      kicker="Vision and language · Labelling every pixel"
      title="U-Net"
      promise="To label every pixel, a network shrinks the picture so it can see what is in it. How does it get the sharp edges back?"
      takeaway={
        <>
          A U-Net shrinks the image to learn <em>what</em> is in it, grows the map back, and copies the fine detail
          across at every size to recover <em>where</em>, stacked beside the decoder’s map rather than added to it.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lectures 14 and 15, dense prediction: U-Net and bilinear up-sampling',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: '§14.11.2 “Initializing Transposed Convolutional Layers” (bilinear interpolation); §8.7.1 “From ResNet to DenseNet” (concatenating instead of adding)',
          url: 'https://d2l.ai/chapter_computer-vision/fcn.html',
        },
        {
          title: 'U-Net: Convolutional Networks for Biomedical Image Segmentation',
          by: 'Olaf Ronneberger, Philipp Fischer and Thomas Brox, MICCAI 2015',
          part: 'The architecture, and why it copies and crops',
          url: 'https://arxiv.org/abs/1505.04597',
        },
      ]}
    >
      <Predict
        question={`You shrink a ${CHAIR_PIXELS}-pixel chair in a ${SIZE}×${SIZE} photo to a 4×4 map of which blocks hold chair, then grow the map back to ${SIZE}×${SIZE} and cut along it. Of the pixels you cut out, how many are chair?`}
        options={[
          { label: 'Nearly all' },
          { label: 'About three in four' },
          { label: 'About half' },
          { label: 'About one in three', right: true },
        ]}
        reveal={
          <>
            About one in three: {chairOf(STORY.deep)} of {STORY.deep.kept}. The small map knows the chair only to the
            nearest block, and a chair is mostly gaps between its legs. Here is why, and the fix.
          </>
        }
      />

      <h2>Cutting out a sticker</h2>

      <Steps
        readable
        say={[
          <>
            You want to cut the chair out of this {SIZE}×{SIZE} photo to make a sticker. The picture frame on the wall
            is drawn in the same ink.
          </>,
          <>
            Step back across the room and the photo blurs into 4×4 blocks: no edges any more, but now you can see which
            shape is the chair, and which {STORY_BLOCKS} blocks it touches.
          </>,
          <>
            Blow those blocks back up to full size, smoothing between them, and cut: the sticker is a blob of{' '}
            {STORY.deep.kept} pixels, only {chairOf(STORY.deep)} of them chair.
          </>,
          <>
            Walk back up close: the photo shows exactly which pixels have ink, but so does the frame, and cutting along
            the ink takes its {STORY.copy.frame} pixels too.
          </>,
          <>
            Use both, keeping a pixel only where it has ink and the blown-up blocks say chair, and the cut is exact: all{' '}
            {STORY.both.kept} chair pixels, nothing else.
          </>,
          <>
            That is a <strong>U-Net</strong>. Stepping back is the <strong>encoder</strong>, which shrinks the image to
            learn what is in it; blowing up is the <strong>decoder</strong>; walking up close is the{' '}
            <strong>skip connection</strong>, which copies the fine detail across.
          </>,
        ]}
      >
        {(step) => <UShape key={step} {...VIEWS[step]} />}
      </Steps>

      <p>
        The encoder is an ordinary stack of <Link to="/learnings/convolutional-networks">convolutions and pooling</Link>,
        halving the map at each level going down; the decoder doubles it at each level coming back, which makes the U.
        The deep end has seen the most of the picture, so it knows what things are, but only to the nearest block. The
        top has the exact pixels but has seen too little to tell a chair from a frame. A real U-Net copies across at
        every level, not just the top, and learns how to combine the two instead of using our hand-written rule.
      </p>

      <h2>Growing the map back</h2>
      <p>
        Each decoder level has to double its map. A{' '}
        <Link to="/learnings/semantic-segmentation">transposed convolution</Link> learns how. <strong>Bilinear
        up-sampling</strong> uses a fixed rule instead: each new pixel is a blend of the four old pixels around it,
        weighted by how close it sits to each. When you double, every new pixel sits a quarter of the way from its
        nearest old pixel toward the next one, so it takes 3/4 of the near one and 1/4 of the far one, across and then
        down. In words: 9/16 of the nearest, 3/16 of each side neighbour, 1/16 of the diagonal. Three pixels from the
        story’s first doubling, where a block is 1 if it holds chair:
      </p>
      <Numbers
        items={WORKED.map((w, i) => ({
          label: WORKED_LABELS[i],
          value: two(w.value),
          note: sixteenths(w.value),
        }))}
      />
      <Clip
        src="u-net/bilinear-weights"
        label="Four old pixels and a new one a quarter of the way from the nearest. Across, it takes three quarters of the near pixel and one quarter of the far one; down, the same. Multiplied, the weights are nine sixteenths for the nearest, three sixteenths for each side neighbour and one sixteenth for the diagonal. With the nearest, the one across and the diagonal holding chair, and the one below not, the new pixel is nine plus three plus one sixteenths: 0.81."
        caption="Bilinear is two straight-line blends: one across, one down. The four weights always add to 1, so a flat region stays flat."
      />
      <p>
        There is nothing to learn, so bilinear up-sampling cannot change how many channels a map has; a convolution
        after it does the learning. It also never leaves the checkerboard pattern a transposed convolution can, which
        is why many U-Nets use it.
      </p>

      <h2>Try it yourself</h2>
      <p>
        Shrink the chair further or less, grow it back by copying each block or by bilinear blending, and choose what
        the cut uses.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage cells are cut; the photo’s ink shows as an inset square. Missed counts chair left behind, extra anything
            else cut. The deep map alone always takes floor, more the further you shrink; the copy alone always takes the
            frame. Both together are exact at every depth.
          </>
        }
      >
        <Lab depth={depth} how={how} use={use} />
        <Controls>
          <Choice
            label="Shrink to"
            options={DEPTHS}
            value={depth}
            onChange={setDepth}
            format={(d) => `${side(d)}×${side(d)}`}
          />
          <Choice label="Grow by" options={GROWS} value={how} onChange={setHow} />
          <Choice label="Cut with" options={USES} value={use} onChange={setUse} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Your segmentation network finds the right objects, but every outline comes out rounded and too big. What is most likely missing?"
        options={[
          { label: 'Enough encoder levels to recognise things' },
          { label: 'Skip connections from the encoder', right: true },
          { label: 'A transposed convolution instead of bilinear' },
          { label: 'More classes in the last layer' },
        ]}
        reveal={
          <>
            The skips. Finding the right objects means the deep end works; blobby outlines mean the decoder knows where
            things are only to the nearest block. More levels would make that worse, and in the lab copying versus
            bilinear moves a few pixels, not the outline.
          </>
        }
      />

      <h2>Stack, don’t add</h2>
      <p>
        The copy joins the decoder’s map by <strong>concatenation</strong>, stacking their channels. At the paper’s top
        level, the up-sampled map has {DECODER_CHANNELS} channels and the copy {COPY_CHANNELS}, so the convolution after
        them reads {STACKED}. A <Link to="/learnings/transformer-block">residual connection</Link>, as in ResNet, adds
        instead and keeps {DECODER_CHANNELS}. Adding suits a skip that carries the same thing as the layer it jumps, a
        draft to improve. Here the two carry different things, what and where, and stacking keeps them apart so the
        next convolution can learn how far to trust each, pixel by pixel.
      </p>

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Make the sizes divide.</strong> Four levels halve the map four times, so the side should be a multiple
          of 16, or the copy and the up-sampled map no longer line up. The original paper used convolutions without
          padding, which trim each map, so it cropped every copy to fit; most U-Nets now pad instead.
        </li>
        <li>
          <strong>Start with bilinear and a convolution.</strong> Reach for a transposed convolution when you want the
          up-sampling itself learned, and watch for checkerboards.
        </li>
        <li>
          <strong>Buy context with depth.</strong> Each level lets the deep end see about twice as far, which large
          objects need; the skips keep that from costing sharpness.
        </li>
      </ul>
      <p>
        The same shape returns as the denoiser in diffusion models, which must hand back an image the size of the one it
        was given.
      </p>

      <Predict
        kicker="Check yourself"
        question="Which of these tasks most needs a U-Net’s decoder and skip connections?"
        options={[
          { label: 'Naming the main object in a photo' },
          { label: 'Counting the people in a photo' },
          { label: 'Giving every pixel its distance from the camera', right: true },
          { label: 'Telling whether a photo was taken indoors' },
        ]}
        reveal={
          <>
            Distance per pixel. It needs an answer for every pixel, with sharp jumps where one object ends and another
            begins: the what from the deep end and the where from the copies. The others are one answer per photo, which
            the encoder’s deep end can give on its own.
          </>
        }
      />
    </Article>
  )
}
