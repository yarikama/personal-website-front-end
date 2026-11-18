import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Beach from './Beach'
import {
  ALEXNET_HEAD,
  decimal,
  dilatedLayers,
  DILATIONS,
  GUESS,
  GUESS_SIDE,
  headParameters,
  insideCounts,
  IOU,
  outputSize,
  pct,
  plainLayers,
  SIZES,
  STORY,
  thousands,
  viewWidth,
  WIDE,
} from './model'
import Reach from './Reach'
import Stamps from './Stamps'

const KERNELS = [2, 3, 4] as const
const STRIDES = [1, 2, 3] as const
const STACKS = ['1, 1, 1', '1, 2, 4'] as const
const LAYERS = [1, 2, 3] as const

// "1, 2 or 4", or "4 everywhere"
const either = (values: number[]) =>
  values.length === 1 ? `${values[0]} everywhere` : `${values.slice(0, -1).join(', ')} or ${values.at(-1)}`

// The check: what each layer of doubled dilations adds
const WIDE_LAYERS = dilatedLayers(WIDE)
const WIDE_VIEWS = Array.from({ length: WIDE_LAYERS }, (_, i) => viewWidth(Array.from({ length: i + 1 }, (_, j) => 2 ** j)))

export default function SemanticSegmentation() {
  const [kernel, setKernel] = useState<(typeof KERNELS)[number]>(3)
  const [stride, setStride] = useState<(typeof STRIDES)[number]>(2)
  const [picked, setPicked] = useState<[number, number]>([1, 1])
  const [stack, setStack] = useState<(typeof STACKS)[number]>('1, 2, 4')
  const [layers, setLayers] = useState<(typeof LAYERS)[number]>(3)

  const inside = insideCounts(4, kernel, stride)
  const side = outputSize(4, kernel, stride)
  const dilations = (stack === '1, 1, 1' ? DILATIONS.plain : DILATIONS.dilated).slice(0, layers)
  const seen = viewWidth(dilations)
  const pixels = GUESS.photo * GUESS.photo

  return (
    <Article
      kicker="Vision and language · Labelling every pixel"
      title="Semantic segmentation"
      promise="A photo classifier names one thing and throws away where it is. How can the same network name every pixel?"
      takeaway={
        <>
          Segmentation is a classifier run at every spot: rewrite its head as 1 × 1 convolutions to get a coarse map
          of what is where, then grow the map back with <em>transposed</em> convolutions, or keep it full size and widen
          the view with dilated ones.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 14, image segmentation: converting linear layers to convolutions, ConvTranspose2d, dilated convolutions',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Sections 14.9 to 14.11: semantic segmentation, transposed convolution, fully convolutional networks',
          url: 'https://d2l.ai/chapter_computer-vision/fcn.html',
        },
        {
          title: 'Fully Convolutional Networks for Semantic Segmentation',
          by: 'Jonathan Long, Evan Shelhamer and Trevor Darrell, CVPR 2015',
          part: 'Turning a classifier’s fully connected layers into convolutions, and up-sampling inside the network',
          url: 'https://arxiv.org/abs/1411.4038',
        },
        {
          title: 'Multi-Scale Context Aggregation by Dilated Convolutions',
          by: 'Fisher Yu and Vladlen Koltun, ICLR 2016',
          part: 'Stacking dilations 1, 2, 4 to widen the view without shrinking the map',
          url: 'https://arxiv.org/abs/1511.07122',
        },
        {
          title: 'Deconvolution and Checkerboard Artifacts',
          by: 'Augustus Odena, Vincent Dumoulin and Chris Olah, Distill, 2016',
          part: 'Why uneven overlap leaves a checkerboard',
          url: 'https://distill.pub/2016/deconv-checkerboard/',
        },
      ]}
    >
      <Predict
        question={`A network names the one thing in ${GUESS.window} × ${GUESS.window} photos, and its body shrinks a photo ${GUESS.stride} times on each side. You rewrite its last layers so they can slide, keeping every weight, and give it a ${GUESS.photo} × ${GUESS.photo} photo. What comes out?`}
        options={[
          { label: `An error: it only takes ${GUESS.window} × ${GUESS.window}` },
          { label: 'One name for the whole photo' },
          { label: 'A 2 × 2 grid of names' },
          { label: `An ${GUESS_SIDE} × ${GUESS_SIDE} grid of names`, right: true },
        ]}
        reveal={
          <>
            An {GUESS_SIDE} × {GUESS_SIDE} grid. The rewritten network reads a {GUESS.window}-pixel window and moves it{' '}
            {GUESS.stride} pixels at a time, so it fits ({GUESS.photo} − {GUESS.window}) ÷ {GUESS.stride} + 1 ={' '}
            {GUESS_SIDE} positions along each side: {GUESS_SIDE * GUESS_SIDE} names for {thousands(pixels)} pixels.
            Coarse, but each name now says where.
          </>
        }
      />

      <h2>Colouring in a holiday photo</h2>

      <Steps
        readable
        say={[
          <>A friend shows you a holiday photo and asks what it is. “A beach,” you say: one word for the whole picture.</>,
          <>Now they want it coloured in: which squares are sky, which are sea and sand, and where the little boat is.</>,
          <>
            One square alone can’t tell you. These two are the same grey, yet one is sky and one is sea; only the wave
            crests around it give the sea away.
          </>,
          <>So you lay a card with a 4 × 4 window on the photo, name what you see through it, and slide it on 4 squares.</>,
          <>
            That is {STORY.answers} words for {STORY.squares} squares. {pct(STORY.blocky)} of squares come out right,
            but the shore is a staircase and the boat, too small to win its window, is gone.
          </>,
          <>
            So you paint each word back with a soft brush that blends where neighbours meet. The shore smooths out and{' '}
            {pct(STORY.spread)} are right. The boat is still gone.
          </>,
          <>
            The photo is an image, each square a pixel. The card is the classifier slid like a filter, its words a
            coarse score map, and the soft brush a transposed convolution. This is <strong>semantic segmentation</strong>.
          </>,
        ]}
      >
        {(step) => <Beach key={step} step={step} />}
      </Steps>

      <h2>A classifier that slides</h2>
      <p>
        The card needs no new network. A classifier’s body is already made of filters that slide over an image of any
        size (see <Link to="/learnings/convolutional-networks">convolutional networks</Link>). Only its head refuses:
        fully connected layers built for one vector of fixed length. But a fully connected layer applied to one
        feature vector is exactly a <strong>1 × 1 convolution</strong>, a filter one pixel wide, and on a map of feature
        vectors that filter applies the same weights at every spot. Rewrite the head that way and the network takes a
        photo of any size and returns a map of scores, one per window. The rewrite is called{' '}
        <strong>convolutionalization</strong>, and a network with no fully connected layer left is a fully convolutional
        network, or FCN. (A head layer that read a whole block of features becomes a filter the size of that block.)
      </p>

      <Predict
        kicker="Quick check"
        question="A classifier’s last layer maps 512 features to 10 classes. Rewritten as a 1 × 1 convolution, it runs on a 20 × 30 map of features. How many weights and biases does it have now?"
        options={[
          { label: thousands(headParameters(512, 10)), right: true },
          { label: thousands(headParameters(512, 10) * 600) },
          { label: '600' },
          { label: thousands(512 * 10) },
        ]}
        reveal={
          <>
            {thousands(headParameters(512, 10))}: 512 × 10 weights and 10 biases, exactly as before. A convolution reuses
            one set of weights at every spot, so a bigger map changes how many answers come out, never how many weights
            there are. AlexNet’s last layer, {thousands(ALEXNET_HEAD.inputs)} to {thousands(ALEXNET_HEAD.outputs)}, keeps
            its {thousands(headParameters(ALEXNET_HEAD.inputs, ALEXNET_HEAD.outputs))} the same way.
          </>
        }
      />

      <h2>Growing the map back</h2>
      <p>
        The coarse map knows what, but only roughly where: a network that shrinks 32 times gives one answer per 32 × 32
        block. The soft brush runs a strided filter backwards. Each input value stamps a copy of a small kernel,
        multiplied by itself, into a bigger output; the stamps sit a stride apart, and where they overlap they add.
        This is a <strong>transposed convolution</strong> (written as a matrix, it is a convolution’s matrix turned on
        its side), and its kernel is learned like any filter.
      </p>
      <Clip
        src="semantic-segmentation/stamps"
        label="A row of four inputs, 1, 2, 1 and 3, each stamps the kernel 1, 1, 1 into the output, two places apart. Where two stamps overlap they add, giving 1, 1, 3, 2, 3, 1, 4, 3, 3. The first stamp starts at 0 and the last at 3 times 2, so the output is 3 times 2 plus 3, which is 9 wide."
        caption="Stamps two apart and three wide meet on every other pixel inside, and there they add. The output runs from the first stamp’s start to the last stamp’s end."
      />
      <p>
        In words: the last stamp starts (inputs − 1) strides along and is a kernel wide, so the output is (inputs − 1)
        × stride + kernel across. For 4 inputs and stride 2:
      </p>
      <Numbers
        items={SIZES.map(({ kernel: k, size }) => ({
          label: `Kernel ${k}`,
          value: size,
          note: k === 2 ? 'exactly double' : k === 3 ? 'odd, and uneven' : `trim 1 a side: ${outputSize(4, k, 2, 1)}`,
        }))}
      />
      <p>
        Kernel 2 doubles the map exactly, and kernel 4 does once padding trims a pixel off each side. Kernel 3 has a
        worse problem. Try it:
      </p>

      <Figure caption="Every input and kernel value is 1 here, so each output pixel’s number, and its ink, counts the stamps that land on it. Tap an input square to see its stamp in sage. With kernel 3 and stride 2, every other row and column collects extra stamps.">
        <Stamps kernel={kernel} stride={stride} picked={picked} onPick={setPicked} />
        <Controls>
          <Choice label="Kernel" options={KERNELS} value={kernel} onChange={setKernel} />
          <Choice label="Stride" options={STRIDES} value={stride} onChange={setStride} />
          <Readout label="Output" value={`${side} × ${side}`} />
          <Readout label="Stamps inside" value={either(inside)} accent={inside.length === 1} />
        </Controls>
      </Figure>

      <p>
        Uneven overlap means some pixels get more of every input than their neighbours. A learned kernel can partly
        cancel that, but it tends to show as a faint grid of brighter and dimmer dots, called{' '}
        <strong>checkerboard artifacts</strong>. A kernel the stride divides gives every inside pixel the same share.
      </p>

      <Predict
        kicker="Quick check"
        question="Which of these up-sampling layers will leave a checkerboard?"
        options={[
          { label: 'Kernel 2, stride 2' },
          { label: 'Kernel 4, stride 2' },
          { label: 'Kernel 5, stride 2', right: true },
          { label: 'Kernel 6, stride 3' },
        ]}
        reveal={
          <>
            Kernel 5, stride 2. Two doesn’t divide five, so along each side the stamps pile up 3 deep on one pixel and 2
            deep on the next; inside, pixels get {either(insideCounts(4, 5, 2))} stamps. The others give every inside
            pixel the same count: {insideCounts(4, 2, 2)[0]}, {insideCounts(4, 4, 2)[0]} and {insideCounts(4, 6, 3)[0]}.
          </>
        }
      />

      <h2>Or never shrink</h2>
      <p>
        Growing a map back repairs detail after it is lost. A <strong>dilated convolution</strong> keeps it: a 3 × 3
        filter whose taps sit d pixels apart instead of side by side, so its 9 weights cover more ground, and with d
        pixels of padding the map keeps its size. Double d at each layer and the view doubles too.
      </p>

      <Figure caption="The centre pixel, outlined, and what it sees of the input through the layers so far, in sage. The dots are the 9 squares its newest layer reads. Plain layers add one ring each; doubling the dilation doubles the reach, with the same 9 weights a layer.">
        <Reach dilations={dilations} />
        <Controls>
          <Choice label="Dilations" options={STACKS} value={stack} onChange={setStack} />
          <Choice label="Layers" options={LAYERS} value={layers} onChange={setLayers} />
          <Readout label="Sees" value={`${seen} × ${seen}`} accent />
          <Readout label="Weights" value={9 * layers} />
        </Controls>
      </Figure>

      <h2>Scoring a map</h2>
      <p>
        Training compares the network’s map with one a person coloured in, pixel by pixel: the usual cross-entropy (see{' '}
        <Link to="/learnings/neural-networks">neural networks</Link>), averaged over every pixel. Pixel accuracy
        flatters a map: ours gets {pct(STORY.spread)} right without a single boat pixel. So each class is scored by its{' '}
        <strong>IoU</strong>, intersection over union: the pixels both maps give that class, divided by the pixels
        either does. Sea rises from {decimal(IOU.seaBlocky)} on the blocky map to {decimal(IOU.seaSpread)} once
        blended; the boat scores {IOU.boatSpread}. Bringing back something that small needs the detail the shrinking
        threw away, which is what a <Link to="/learnings/u-net">U-Net</Link> carries across.
      </p>

      <h2>What to do with it</h2>
      <ul>
        <li>
          <strong>Start from a trained classifier.</strong> Convolutionalize its head; its features already know what
          things look like.
        </li>
        <li>
          <strong>Up-sample with a kernel the stride divides</strong>, such as 2 or 4 for stride 2, to keep the
          checkerboard out.
        </li>
        <li>
          <strong>Widen with dilation where the map must stay sharp</strong>, instead of shrinking it and growing it
          back.
        </li>
        <li>
          <strong>Report IoU for each class</strong>, so that small things count.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Each output pixel must see ${WIDE} pixels across, and the map must not shrink. With 3 × 3 layers whose dilations double (1, 2, 4, …), how many layers do you need?`}
        options={[
          { label: String(WIDE_LAYERS - 1) },
          { label: String(WIDE_LAYERS), right: true },
          { label: '8' },
          { label: String(plainLayers(WIDE)) },
        ]}
        reveal={
          <>
            {WIDE_LAYERS}. A layer with dilation d adds 2d to the view: {WIDE_VIEWS.slice(0, -1).join(', then ')}, and a
            fourth with d = {2 ** (WIDE_LAYERS - 1)} reaches {WIDE_VIEWS.at(-1)}. Plain 3 × 3 layers add 2 each and would
            need {plainLayers(WIDE)}.
          </>
        }
      />
    </Article>
  )
}
