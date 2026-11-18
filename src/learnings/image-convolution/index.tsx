import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  BLUR_RAMP,
  BORDERS,
  CHANNELS,
  EDGE_SIDE,
  HORIZON_DOWN,
  IMAGE_NAMES,
  IMAGES,
  KERNEL_NAMES,
  kernelNamed,
  ON_WALL,
  PHOTO_NUMBERS,
  PHOTO_SIDE,
  RAMP_BORDER_EDGE,
  show,
  SIZES,
  SQUARE_DIFFERENCES,
  STORY_SHRUNK,
  STORY_SIDE,
  WALL,
  WORKED,
  type Border,
  type ImageName,
  type KernelName,
} from './model'
import Stand, { type Show } from './Stand'

const STEPS: Show[] = ['picture', 'blurring', 'blurred', 'border', 'edging', 'edges', 'named']

export default function ImageConvolution() {
  const [image, setImage] = useState<ImageName>('Speckled')
  const [kernel, setKernel] = useState<KernelName>('Box')
  const [border, setBorder] = useState<Border>('Shrink')
  const [at, setAt] = useState<[number, number]>([4, 2])

  return (
    <Article
      kicker="Vision and language · Learning to see"
      title="Image convolution"
      promise="To a computer a photo is only a grid of numbers. How can one small grid of nine weights blur it, or pick out every edge in it?"
      takeaway={
        <>
          A filter slides a small grid of weights over an image and writes down the weighted sum at every spot: weights
          that average <em>blur</em> it, and weights that take a difference find its <em>edges</em>.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lectures 5 and 6: computer vision and the convolution operator, smoothing filters, image borders, Sobel derivatives and hand-crafted features',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: '§7.2 “Convolutions for Images” and §7.3 “Padding and Stride”',
          url: 'https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html',
        },
        {
          title: 'Histograms of Oriented Gradients for Human Detection',
          by: 'Navneet Dalal and Bill Triggs, CVPR 2005',
          part: 'The hand-made features built from edge filters that learned filters later replaced',
          url: 'https://doi.org/10.1109/CVPR.2005.177',
        },
      ]}
    >
      <Predict
        question="A picture shows a solid block on a blank background. At every pixel, you take the column of three pixels just to its right and subtract the column just to its left. Where is the answer not zero?"
        options={[
          { label: 'All over the block' },
          { label: 'Only its left and right sides', right: true },
          { label: 'Along all four sides' },
          { label: 'Nowhere: it all cancels' },
        ]}
        reveal={
          <>
            Only the left and right sides. Inside the block, and out on the blank background, the right column matches
            the left and they cancel. Along the top and bottom nothing changes from left to right either. Only where a
            row steps from blank to solid do the two columns differ.
          </>
        }
      />

      <h2>Cards at a match</h2>

      <Steps
        readable
        say={[
          <>
            At a match, {STORY_SIDE * STORY_SIDE} fans sit in an {STORY_SIDE}-by-{STORY_SIDE} block, each holding up a
            card shaded from 0, blank, to 9, solid. Together the cards show a tall block.
          </>,
          <>The leader calls out a rule: look at the nine cards around you, yours in the middle, and hold up their average.</>,
          <>The block’s crisp sides go soft, {BLUR_RAMP.join(', then ')} along a row: averaging blurs the picture.</>,
          <>
            Fans in the outer ring have empty seats beside them, so last round they sat out and the picture shrank to{' '}
            {STORY_SHRUNK} by {STORY_SHRUNK}. This time each empty seat counts as a blank card.
          </>,
          <>
            A new rule: add up the column of three cards on your right, take away the column on your left, and count the
            middle row twice.
          </>,
          <>
            Now only the fans along the block’s left and right sides hold anything up, {show(EDGE_SIDE)} on one and{' '}
            {show(-EDGE_SIDE)} on the other: the rule finds edges.
          </>,
          <>
            The block of cards is an <strong>image</strong> and each card a <strong>pixel</strong>. A rule of nine
            weights is a <strong>filter</strong>, and running it at every seat is a <strong>convolution</strong>.
          </>,
        ]}
      >
        {(step) => <Stand key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        A photo is the same grid, only larger and in {CHANNELS} layers, one each for red, green and blue: a{' '}
        {PHOTO_SIDE}-by-{PHOTO_SIDE} photo is {CHANNELS} × {PHOTO_SIDE} × {PHOTO_SIDE} ={' '}
        {PHOTO_NUMBERS.toLocaleString('en-US')} numbers. No single number says “eye” or “edge”; those live in how
        neighbours relate, which is what a filter reads.
      </p>

      <h2>The one line of math</h2>
      <p>
        Both rules did the same thing: multiply each of the nine cards by a weight, and add. In words, the output at a
        pixel is the sum, over the 3-by-3 window centred on it, of each weight times the pixel under it:
        g[i, j] = Σ k[u, v] · f[i + u, j + v], with u and v running from −1 to 1. The average has all nine weights equal
        to 1/9. The edge rule has −1, −2, −1 down its left column, 1, 2, 1 down its right, and zeros between.
      </p>
      <Numbers
        items={[
          { label: 'Blur, on the side', value: show(WORKED.blur.value), note: `${WORKED.blur.solid} of 9 solid` },
          { label: 'Edges, on the side', value: show(WORKED.side.value), note: '(9 + 18 + 9) − 0' },
          { label: 'Edges, inside', value: show(WORKED.inside.value), note: '36 − 36' },
        ]}
      />
      <Clip
        src="image-convolution/weighted-sum"
        label="New value equals add up weight times pixel over the window, written as g of i j equals the sum over u and v of k of u v times f of i plus u, j plus v. Then the story's window, pixels 0, 9, 9 in each row, times the edge weights minus 1, 0, 1; minus 2, 0, 2; minus 1, 0, 1. The right column gives 9 plus 2 times 9 plus 9, the left column 0, and the answer is 36."
        caption="One window on the block’s left side: the right column’s weights meet solid cards, the left column’s meet blanks, and 36 is what is left."
      />
      <p>
        That sliding weighted sum is called <strong>convolution</strong>, and the little grid of weights is the{' '}
        <strong>filter</strong> or <strong>kernel</strong>. Strictly, convolution flips the filter round before laying
        it down; for a symmetric filter like the average that changes nothing, and neural networks skip the flip.
      </p>

      <h2>Why a difference finds edges</h2>
      <p>
        An edge is where brightness changes fast, a steep slope. On a grid the nearest thing to a slope is a difference
        of neighbours, right minus left, so −1, 0, 1 is a slope meter: along a row of 1, 4, 9, 16, 25 it reads{' '}
        {SQUARE_DIFFERENCES.join(', ')}, twice the slope of x² at each spot. Differences also magnify noise, so the
        edge rule first averages three rows with weights 1, 2, 1 and then takes the difference. That is the{' '}
        <strong>Sobel filter</strong>. Turned a quarter, it finds edges that run across; the two answers together give
        each pixel an edge strength, √(across² + down²), and a direction.
      </p>
      <Clip
        src="image-convolution/sobel-built"
        label="A slope is a difference of neighbours: on the row 1, 4, 9, 16, 25, right minus left gives 8, 12, 16, twice the slope 2x there. Then the column 1, 2, 1, average down, times the row minus 1, 0, 1, difference across, multiplies out row by row into the Sobel filter: minus 1, 0, 1; minus 2, 0, 2; minus 1, 0, 1."
        caption="Average down, then difference across: each Sobel weight is its row’s averaging weight times its column’s difference."
      />

      <h2>Try it yourself</h2>
      <p>
        Pick a picture and a filter, then tap any cell to move the window and see its sum. The Gaussian filter weights
        the middle 4, the sides 2 and the corners 1, over 16: it trusts near pixels more than far ones, so it blurs
        more gently than the box’s flat average.
      </p>
      <Figure
        readable
        caption={
          <>
            The more ink in a cell, the bigger its number, from 0 to 9. Edge outputs fill sage where the numbers grow to
            the right (or downward) and ink where they shrink. Shrink drops the outer ring; Zeros keeps it by counting
            the missing seats as 0, which on the ramp invents an edge of {show(RAMP_BORDER_EDGE)} at the right border.
          </>
        }
      >
        <Lab image={IMAGES[image]} kernel={kernelNamed(kernel)} border={border} at={at} onAt={setAt} />
        <Controls>
          <Choice label="Picture" options={IMAGE_NAMES} value={image} onChange={setImage} />
          <Choice label="Filter" options={KERNEL_NAMES} value={kernel} onChange={setKernel} />
          <Choice label="Border" options={BORDERS} value={border} onChange={setBorder} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="You want a filter that leaves flat, even patches of a picture exactly as they were. What must be true of its nine weights?"
        options={[
          { label: 'They add up to 1', right: true },
          { label: 'They add up to 0' },
          { label: 'They are all equal' },
          { label: 'They are all positive' },
        ]}
        reveal={
          <>
            They add up to 1. On a flat patch of {WALL}s, every pixel under the window is {WALL}, so the answer is {WALL}{' '}
            times the sum of the weights. The average’s weights add to 1 and give back {show(ON_WALL.box)}; the edge
            filter’s add to 0 and give {show(ON_WALL.edge)}, which is why flat patches vanish under it. Nine equal
            weights of 1 would give {show(ON_WALL.ones)}.
          </>
        }
      />

      <h2>Using filters well</h2>
      <ul>
        <li>
          <strong>Smooth before you take differences.</strong> A difference turns every stray speck into a pair of
          false edges (try the speckled picture with an edge filter). Sobel’s 1, 2, 1 damps them a little; a Gaussian
          blur first damps them more.
        </li>
        <li>
          <strong>Choose the border on purpose.</strong> With no padding, an n-wide image comes out n − k + 1 wide
          under a k-wide filter: a 32-pixel picture under a 5-wide filter gives {SIZES.shrink}. Two zeros on each
          side keep {SIZES.padded}, but zeros are a dark frame that bleeds inward; copying or mirroring the edge pixels
          outward avoids that.
        </li>
        <li>
          <strong>Step further to shrink on purpose.</strong> Move the window two pixels at a time, a stride of 2, and
          the padded output halves to {SIZES.strided}.
        </li>
        <li>
          <strong>Let the weights be learned.</strong> For years, people built features from edge filters by hand, such
          as histograms of oriented gradients (HoG) for finding people in photos.{' '}
          <Link to="/learnings/convolutional-networks">Convolutional networks</Link> keep the sliding weighted sum but
          learn the weights from data.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A photo of a calm sea: bright sky above, darker water below, the horizon perfectly level. You run the story’s edge rule, right column minus left. What comes out?"
        options={[
          { label: 'A line along the horizon' },
          { label: 'Zero everywhere', right: true },
          { label: 'Sky bright, sea dark' },
          { label: 'A blurred copy' },
        ]}
        reveal={
          <>
            Zero everywhere. Along any row, the pixels to the right match the pixels to the left, so every sum cancels.
            The horizon is a change from top to bottom, and it takes the filter turned a quarter, bottom minus top, to
            see it: on a sky of 9s over a sea of 2s, that reads {show(HORIZON_DOWN[2][0])} along the two rows at the
            horizon.
          </>
        }
      />
    </Article>
  )
}
