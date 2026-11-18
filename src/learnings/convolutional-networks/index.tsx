import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  ALEX,
  ALEX_DENSE,
  ALEX_FIRST,
  CHECK_LAYER,
  CHECK_REACH,
  CHECK_WEIGHTS,
  CHECK_WRONG,
  DEPTHS,
  MAP,
  PHOTO,
  PHOTO_CONV,
  PHOTO_DENSE,
  POOLED,
  SECOND,
  SEVEN_SCORES,
  SIZE,
  stack,
  STAMPS,
  STORY_DENSE,
  STORY_DENSE_ONE,
  STORY_FIRST,
  STORY_SECOND,
} from './model'
import Postcode, { type Show } from './Postcode'
import Reach from './Reach'

const STEPS: Show[] = ['digit', 'wired', 'stamp', 'stamps', 'pool', 'second', 'named']

const n = (v: number) => v.toLocaleString('en-US')
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`
const billions = (v: number) => `${Math.round(v / 1e9)} billion`
const DEPTH_NAMES = ['One', 'Two', 'Three']
const SEVEN_SCORE = SEVEN_SCORES[SECOND.findIndex((s) => s.name === '7')]
const ONE_SCORE = SEVEN_SCORES[SECOND.findIndex((s) => s.name === '1')]

export default function ConvolutionalNetworks() {
  const [depth, setDepth] = useState<(typeof DEPTHS)[number]>(2)
  const stacked = stack(depth)

  return (
    <Article
      kicker="Vision and language · Learning to see"
      title="Convolutional networks"
      promise="A small colour photo is 150,000 numbers, and a cat can sit anywhere in it. How does a network learn to recognize what a picture shows without a weight for every pixel and every output?"
      takeaway={
        <>
          A convolutional network learns small filters and presses each one <em>everywhere</em>, so its weights grow
          with its filters and channels, never with the picture; pooling and stacking let later layers see more, from
          edges up to whole objects.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lectures 6 to 8: the convolutional layer, pooling, LeNet, AlexNet and ImageNet, VGG and ResNet',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Chapter 7, §7.1 “From Fully Connected Layers to Convolutions”, §7.4 “Multiple Input and Multiple Output Channels”, §7.5 “Pooling” and §7.6 LeNet; Chapter 8, §8.1 AlexNet and §8.2 VGG',
          url: 'https://d2l.ai/chapter_convolutional-neural-networks/why-conv.html',
        },
        {
          title: 'Gradient-Based Learning Applied to Document Recognition',
          by: 'Yann LeCun, Léon Bottou, Yoshua Bengio and Patrick Haffner, Proceedings of the IEEE 86(11), 1998',
          part: 'LeNet: convolutional layers and subsampling for handwritten digits',
          url: 'https://doi.org/10.1109/5.726791',
        },
        {
          title: 'ImageNet Classification with Deep Convolutional Neural Networks',
          by: 'Alex Krizhevsky, Ilya Sutskever and Geoffrey E. Hinton, NeurIPS, 2012',
          part: 'AlexNet: 60 million parameters, 96 first-layer kernels of 11 × 11 × 3, the learned kernels of Figure 3, and the ILSVRC-2012 top-5 error of 15.3% against 26.2%',
          url: 'https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html',
        },
        {
          title: 'Very Deep Convolutional Networks for Large-Scale Image Recognition',
          by: 'Karen Simonyan and Andrew Zisserman, ICLR, 2015',
          part: 'VGG: stacks of 3 × 3 filters, 16 to 19 weight layers',
          url: 'https://arxiv.org/abs/1409.1556',
        },
      ]}
    >
      <Predict
        question={`A layer turns a ${PHOTO} × ${PHOTO} greyscale photo into a ${PHOTO} × ${PHOTO} map of where its edges are. Wired the plain way, with a weight from every pixel to every square of the map, it needs ${n(PHOTO_DENSE)} weights. A convolutional layer does the same job with one small filter. How many weights does it need?`}
        options={[
          { label: 'About 100 million' },
          { label: 'About a million' },
          { label: `About ${n(PHOTO * PHOTO)}, one per pixel` },
          { label: String(PHOTO_CONV), right: true },
        ]}
        reveal={
          <>
            {PHOTO_CONV}. One 3 × 3 filter, its nine weights used again at every spot of the photo. An edge looks the
            same in the top corner as in the middle, so there is no reason to learn it {n(PHOTO * PHOTO)} times, and
            the count stays at {PHOTO_CONV} however big the photo gets.
          </>
        }
      />

      <h2>Reading a postcode</h2>

      <Steps
        readable
        say={[
          <>
            You’re reading the postcode on an envelope, one digit at a time: each digit is an {SIZE} × {SIZE} grid of
            squares, solid where there is ink.
          </>,
          <>
            To map where its strokes are, you could wire each square of a {MAP} × {MAP} map to all {SIZE * SIZE}{' '}
            squares of the digit, with a weight on every wire: {n(STORY_DENSE_ONE)} weights for one map.
          </>,
          <>
            Or you carry one 3 × 3 stamp that looks for a flat bar, and press it on every spot: 9 weights, since a bar
            is a bar wherever it sits.
          </>,
          <>
            One stamp finds one thing, so you carry {STAMPS.length}, for flat, upright and slanted strokes, and each
            leaves its own map.
          </>,
          <>
            Roughly where a stroke is will do, so you keep the strongest value in each 2 × 2 block, and every map
            shrinks to {POOLED} × {POOLED}.
          </>,
          <>
            A second stamp reads all three small maps at once: a flat bar on top with a slant under it scores{' '}
            {signed(SEVEN_SCORE)} for 7, and the stamp for 1 scores {signed(ONE_SCORE)}.
          </>,
          <>
            Nobody hands a network its stamps: it learns every weight from labelled digits. Each stamp is a{' '}
            <strong>filter</strong>, each map a <strong>channel</strong>, the shrinking <strong>max pooling</strong>:
            this is a <strong>convolutional network</strong>.
          </>,
        ]}
      >
        {(step) => <Postcode key={step} show={STEPS[step]} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        Sliding a filter and taking a weighted sum at each spot is{' '}
        <Link to="/learnings/image-convolution">image convolution</Link>. What a network adds is learning the filter,
        and many of them. In words: a filter holds one weight for each square of its window in each channel it reads,
        and a layer holds one filter for each channel it makes.
      </p>
      <p className="text-center font-serif text-2xl">weights = channels out × channels in × k × k</p>
      <Clip
        src="convolutional-networks/weight-count"
        label="Weights in a convolutional layer. One filter has k times k weights for each channel it reads, so k times k times channels in. A layer has one filter per channel out, so the count is channels out times channels in times k times k, plus one bias per filter. The image size is not in it. Then three examples: the story's first layer, 3 times 1 times 3 times 3, is 27; its second layer, 2 times 3 times 3 times 3, is 54; AlexNet's first layer, 96 times 3 times 11 times 11, is 34,848."
        caption="The count is built from the filter, never from the picture: the photo’s height and width appear nowhere."
      />
      <Numbers
        items={[
          { label: 'Story, layer 1', value: n(STORY_FIRST), note: `${STAMPS.length} × 1 × 3 × 3` },
          { label: 'Story, layer 2', value: n(STORY_SECOND), note: `${SECOND.length} × ${STAMPS.length} × 3 × 3` },
          { label: 'AlexNet, layer 1', value: n(ALEX_FIRST), note: `${ALEX.out} × ${ALEX.inn} × ${ALEX.k} × ${ALEX.k}` },
        ]}
      />
      <p>
        Add one bias per filter if you like. Wiring the digit to the story’s three maps would take {n(STORY_DENSE)}{' '}
        weights instead of {STORY_FIRST}; wiring a {ALEX.side} × {ALEX.side} colour photo to AlexNet’s {ALEX.out} maps
        of {ALEX.map} × {ALEX.map}, about {billions(ALEX_DENSE)}. Two choices buy the saving: each square of a map looks
        only at a small window (<strong>local connections</strong>), and every spot uses the same weights (
        <strong>weight sharing</strong>). Both suit pictures, where a stroke is made of nearby pixels and means the
        same thing anywhere.
      </p>

      <Predict
        kicker="Quick check"
        question={`A layer reads ${CHECK_LAYER.inn} channels and makes ${CHECK_LAYER.out}, with ${CHECK_LAYER.k} × ${CHECK_LAYER.k} filters. How many weights does it have, leaving out the biases?`}
        options={[
          { label: n(CHECK_WRONG.noChannelsIn) },
          { label: n(CHECK_WRONG.noWindow) },
          { label: n(CHECK_WEIGHTS), right: true },
          { label: 'It depends on the image size' },
        ]}
        reveal={
          <>
            {n(CHECK_WEIGHTS)}: each of the {CHECK_LAYER.out} filters has a 3 × 3 window over all {CHECK_LAYER.inn}{' '}
            channels, {CHECK_LAYER.out} × {CHECK_LAYER.inn} × 9. Forget that a filter spans every channel coming in and
            you get {n(CHECK_WRONG.noChannelsIn)}; forget the window and you get {n(CHECK_WRONG.noWindow)}. The image
            size never enters, because the same weights are used at every spot.
          </>
        }
      />

      <h2>Watch a filter learn</h2>
      <p>
        The story asked you to take one thing on trust: that a network finds its own stamps. Here is one filter, nine
        weights, starting from random. The network presses it everywhere, keeps the strongest response, and turns that
        into a chance of “7”. <Link to="/learnings/gradient-descent">Gradient descent</Link> does the rest.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage weights in the filter want ink; ink-coloured ones count against it. Beside each digit is what it really
            is, and its sage box is where the filter fired most. Under it is how sure the network is that the digit is a
            7: the bar is sage when the call is right, and ✗ marks a wrong one. Press Train.
            From this start the filter grows a flat bar and finds the 7’s top stroke wherever it sits; New start may find
            a slant instead, or stall at 11 of 12.
          </>
        }
      >
        <Lab />
      </Figure>
      <p>
        Real networks learn the same way, only with more filters. AlexNet’s first layer learned edges at every angle
        and blobs of colour, nobody having asked for edges; later layers combine those into parts, and parts into
        objects.
      </p>

      <h2>From postcodes to ImageNet</h2>
      <p>
        LeNet, in 1998, was the story’s recipe in earnest: two convolutional layers with pooling, then fully connected
        layers, reading handwritten digits. In 2012, AlexNet scaled it up to five convolutional layers and three fully
        connected ones, 60 million weights trained on two GPUs, with ReLU between layers. It learned from ImageNet’s
        1.2 million labelled photos in 1,000 classes, and in that year’s challenge its top-5 error was 15.3% against
        26.2% for the next entry, which used hand-made features. Most of its weights sit in the fully connected layers
        at the end, which is where it used <Link to="/learnings/dropout">dropout</Link>.
      </p>
      <p>
        VGG, two years later, used nothing but 3 × 3 filters, stacked two or three deep between poolings, for 16 to 19
        layers. A stack sees further than its filters do:
      </p>
      <Figure
        readable
        caption="Each square reads the three below it. Sage squares are everything the top square depends on, down to the input. Two 3 × 3 layers see as far as one 5 × 5, three as far as one 7 × 7; the weights count 64 channels in and out of every layer."
      >
        <Reach depth={depth} />
        <Controls>
          <Choice
            label="3 × 3 layers"
            options={DEPTHS}
            value={depth}
            onChange={setDepth}
            format={(d) => DEPTH_NAMES[d - 1]}
          />
          <Readout label="Sees" value={`${stacked.side} × ${stacked.side}`} />
          <Readout label="Stacked 3 × 3s" value={n(stacked.small)} accent />
          <Readout label={`One ${stacked.side} × ${stacked.side}`} value={n(stacked.big)} />
        </Controls>
      </Figure>
      <p>
        The stack is cheaper for the same view, and has a ReLU between its layers that the one big filter lacks. Deeper
        still, plain stacks got harder to train, until ResNet reached 152 layers by adding each block’s input back to
        its output, the <Link to="/learnings/transformer-block">residual connection</Link> Transformers later borrowed;{' '}
        <Link to="/learnings/batch-normalization">batch normalization</Link> helps keep such stacks steady.
      </p>

      <h2>Using one</h2>
      <ul>
        <li>
          <strong>Start from a pretrained network.</strong> Edges and textures suit almost any photos, so take a network
          trained on ImageNet, swap its last layer for your classes, and fine-tune it on your few hundred pictures.
        </li>
        <li>
          <strong>Stack 3 × 3s.</strong> For a wider view, add a layer rather than growing the filter.
        </li>
        <li>
          <strong>Trace the shapes.</strong> Write channels × height × width after every layer; the first fully
          connected layer’s input is the last map, flattened.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A network runs a 3 × 3 convolution, then a 2 × 2 max pool that steps by 2, then another 3 × 3 convolution. How wide a patch of the input does one square of the last map see?"
        options={[
          { label: '5 × 5' },
          { label: '7 × 7' },
          { label: `${CHECK_REACH} × ${CHECK_REACH}`, right: true },
          { label: '12 × 12' },
        ]}
        reveal={
          <>
            {CHECK_REACH} × {CHECK_REACH}. The last convolution reads 3 pooled squares across; each covers 2 squares of
            the first map, so 6; and the first convolution adds a square on each side, so {CHECK_REACH}. Without the
            pool it would be 5 × 5, as in the stacking figure: pooling widens the view of every layer after it, for no
            weights at all.
          </>
        }
      />
    </Article>
  )
}
