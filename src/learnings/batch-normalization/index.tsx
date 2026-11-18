import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import { Classroom, Wobble, type Scene } from './Classroom'
import {
  ART,
  BATCH,
  BATCH_SIZES,
  CONV_BATCH,
  CONV_COUNT,
  CONV_SIDE,
  curved,
  DEPTH,
  GAINS,
  graded,
  KEPT_MEAN,
  KEPT_SPREAD,
  LAB_BATCHES,
  LAB_WOBBLE,
  LATE_CURVED,
  LATE_SCORE,
  MATHS_WEEK_1,
  MATHS_WEEK_2,
  PAIR,
  PAIR_SAMPLE,
  plain,
  signed,
  size,
  STACKS,
  STORY_CLASS,
  STORY_WOBBLE,
  TERM_LENGTH,
  TRUE_Z,
  typicalMiss,
  WIDTH,
  WORKED_BATCH,
  WORKED_BETA,
  WORKED_GAMMA,
  WORKED_MEAN,
  WORKED_NORMALIZED,
  WORKED_OUT,
  WORKED_SPREAD,
  YOU,
  type BatchSize,
  type Gain,
} from './model'
import { Stack } from './Stack'

// What the story shows at each step: a classroom scene, or one score curved
// in many small classes
const STORY: (Scene | 'wobble')[] = ['week-1', 'week-2', 'curved', 'graded', 'wobble', 'late', 'named']
// The worked numbers shown: the batch's lowest, one in the middle, its highest
const WORKED_SHOWN = [0, 2, 3]
const lastLayer = (gain: Gain) => STACKS.get(gain)!.without.at(-1)!

export default function BatchNormalization() {
  const [gain, setGain] = useState<Gain>(1.25)
  const [batchSize, setBatchSize] = useState<BatchSize>(4)
  const stack = STACKS.get(gain)!
  const outputs = LAB_WOBBLE.get(batchSize)!
  const you = curved(MATHS_WEEK_2)[YOU]
  const yourGrade = graded(MATHS_WEEK_2, 'maths')[YOU]
  const low = Math.min(...STORY_WOBBLE)
  const high = Math.max(...STORY_WOBBLE)

  return (
    <Article
      kicker="Vision and language · Learning to see"
      title="Batch normalization"
      promise="Deep networks train faster when each layer’s numbers are evened out. What does batch normalization do, and why does it need a whole batch to do it?"
      takeaway={
        <>
          Batch normalization evens out each channel over the <em>batch</em>: subtract the batch’s average, divide by
          its spread, then let a learned γ and β set the scale; at test time it uses averages kept from training.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Convolutional neural networks (lecture 8): the BatchNormalization layer',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: '§8.5 “Batch Normalization”',
          url: 'https://d2l.ai/chapter_convolutional-modern/batch-norm.html',
        },
        {
          title: 'Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift',
          by: 'Sergey Ioffe and Christian Szegedy, 2015',
          part: 'The algorithm, per-channel statistics for convolutions, and population statistics at inference',
          url: 'https://arxiv.org/abs/1502.03167',
        },
        {
          title: 'How Does Batch Normalization Help Optimization?',
          by: 'Shibani Santurkar, Dimitris Tsipras, Andrew Ilyas and Aleksander Madry, NeurIPS, 2018',
          part: 'Noise injected after batch norm, and the smoother loss surface',
          url: 'https://arxiv.org/abs/1805.11604',
        },
      ]}
    >
      <Predict
        question="A network with batch normalization is training. One photo goes through it twice with the same weights: once in a batch with 31 photos of cats, once in a batch with 31 photos of cars. What comes out for that photo?"
        options={[
          { label: 'Exactly the same numbers both times' },
          { label: 'Different numbers, because of the other photos', right: true },
          { label: 'Different numbers only if the photo is a cat' },
          { label: 'Zeros both times' },
        ]}
        reveal={
          <>
            Different numbers. While it trains, a batch-norm layer measures the whole batch and evens out every photo
            in it by what it measured, so what your photo gets depends on its batchmates. A classroom shows why anyone
            would want that.
          </>
        }
      />

      <h2>Grading on a curve</h2>

      <Steps
        say={[
          <>
            You grade two quizzes for a class of 8. Maths came back between {Math.min(...MATHS_WEEK_1)} and{' '}
            {Math.max(...MATHS_WEEK_1)}; art sat high and close together, between {Math.min(...ART)} and{' '}
            {Math.max(...ART)}.
          </>,
          <>
            A week later the maths quiz is harder and every score is 20 lower. Your {MATHS_WEEK_2[YOU]} ties for the top,
            yet last week it would have been last.
          </>,
          <>
            So you curve each quiz: take away the class average, then divide by how spread out the class is. Your{' '}
            {MATHS_WEEK_2[YOU]} becomes {signed(you)}, just what your {MATHS_WEEK_1[YOU]} was last week.
          </>,
          <>
            The school wants grades it can read, so each quiz gets two numbers of its own. Maths is 75 + 10 × curved,
            and your {signed(you)} is an {Math.round(yourGrade)}.
          </>,
          <>
            Curving needs a class. In classes of only {STORY_CLASS}, the same {MATHS_WEEK_1[YOU]} curves to anything
            from {signed(low)} to {signed(high)}, depending on who else sat the quiz.
          </>,
          <>
            One student sits the art quiz late and alone, and a class of one has no spread. So you curve her{' '}
            {LATE_SCORE} with the average and spread kept from the last {TERM_LENGTH} classes, {plain(KEPT_MEAN)} and{' '}
            {plain(KEPT_SPREAD)}: {signed(LATE_CURVED)}.
          </>,
          <>
            The class is a batch of photos, and each quiz is a channel, one of the numbers a layer computes for every
            photo. Curving a channel over the batch is batch normalization; the school’s two numbers are γ and β.
          </>,
        ]}
      >
        {(step) => {
          const scene = STORY[step]
          return scene === 'wobble' ? (
            <Wobble
              key="story"
              outputs={STORY_WOBBLE}
              what={`Your ${MATHS_WEEK_1[YOU]}, curved in ${STORY_WOBBLE.length} classes of ${STORY_CLASS}`}
              whole={`whole school ${signed(TRUE_Z)}`}
            />
          ) : (
            <Classroom key={step} scene={scene} />
          )
        }}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        For each channel, find the batch’s average and its spread. Subtract the average from every value, divide by
        the spread, then multiply by γ and add β:
      </p>
      <p className="text-center font-serif text-2xl">y = γ · (x − μ) ÷ σ + β</p>
      <p>
        Here μ is the batch’s average and σ its spread: the square root of the average squared gap from μ, with a tiny ε
        added so that a batch of equal values never divides by zero. γ and β are learned along with the weights. Take
        four photos whose channel reads {WORKED_BATCH.join(', ')}: the average is {WORKED_MEAN}, the spread{' '}
        {WORKED_SPREAD}, and with γ = {WORKED_GAMMA} and β = {WORKED_BETA}:
      </p>
      <Numbers
        items={WORKED_SHOWN.map((i) => ({
          label: `x = ${WORKED_BATCH[i]}`,
          value: plain(WORKED_OUT[i]),
          note: `normalized ${plain(WORKED_NORMALIZED[i])}`,
        }))}
      />
      <p>
        This is <strong>batch normalization</strong>. In a convolutional layer, a channel’s average and spread are taken
        over every position of every image in the batch ({CONV_BATCH} images of {CONV_SIDE} × {CONV_SIDE} give{' '}
        {CONV_COUNT.toLocaleString('en-US')} numbers), and the channel has one γ and one β. Normalizing never takes
        anything away: set γ to the spread and β to the average, and the raw values come back.
      </p>
      <Clip
        src="batch-normalization/batch-norm-rule"
        label="The rule in words: output equals scale times, value minus batch average, divided by batch spread, plus shift. Then in symbols: y equals gamma times x minus mu, divided by sigma, plus beta. Then with a batch of 13, 19, 21 and 27 on a number line: the average is 20, the spread is 5, so 27 becomes 7 divided by 5, which is 1.4, and with gamma 2 and beta 1 the output is 3.8."
        caption="Each phrase becomes its symbol, then the batch 13, 19, 21, 27 drops in: 27 sits 7 above the average of 20, which is 1.4 spreads, and γ = 2, β = 1 make it 3.8."
      />

      <h2>Through a stack of layers</h2>
      <p>
        Why would a layer want its inputs evened out? Each layer multiplies by weights, and the size of its numbers gets
        multiplied with them, layer after layer. Here is a toy network of {DEPTH} layers, {WIDTH} units each, run on a
        batch of {BATCH} random inputs with the same weights both ways.
      </p>
      <Figure
        caption={
          <>
            Ink is the network without batch normalization, sage with it; each gridline is ten times the one below.
            Without it, the last layer’s numbers end anywhere from {size(lastLayer(0.8))} to {size(lastLayer(1.25))},
            depending on the weights’ size. The sage line doesn’t move at all, since normalizing undoes any rescaling of
            the weights before it.
          </>
        }
      >
        <Stack key={gain} without={stack.without} withNorm={stack.with} />
        <Controls>
          <Choice label="Weights’ size" options={GAINS} value={gain} onChange={setGain} format={(g) => `× ${g}`} />
        </Controls>
      </Figure>

      <h2>Why it helps, as far as anyone knows</h2>
      <p>
        The 2015 paper put its reason in its title: while earlier layers learn, the numbers each later layer receives
        keep moving, as the maths quiz did, and it called that <em>internal covariate shift</em>. That reason has not
        held up well. A 2018 study added fresh random shifts and rescalings after every batch-norm layer, and the
        networks trained about as well as with plain batch norm; its authors argue instead that batch norm makes the
        loss surface smoother, so bigger steps are safe. The practical effect is not in dispute: networks with it train
        with larger learning rates and care far less how their weights start. The paper also found that the batch’s
        noise regularizes a little, sometimes enough to drop <Link to="/learnings/dropout">dropout</Link>.
      </p>

      <h2>Why the batch matters</h2>
      <p>
        A curve is only as good as the class. Here is one value that sits {plain(TRUE_Z)} spreads above its channel’s
        average, normalized inside {LAB_BATCHES} random batches of each size.
      </p>
      <Figure caption="Each dot is the value’s output in one batch; the sage line is where it lands against the whole dataset. Small batches scatter it widely; large ones pull it in.">
        <Wobble key={batchSize} outputs={outputs} what={`${LAB_BATCHES} batches of ${batchSize}`} whole={`whole dataset ${signed(TRUE_Z)}`} />
        <Controls>
          <Choice label="Batch size" options={BATCH_SIZES} value={batchSize} onChange={setBatchSize} />
          <Readout label="Typical miss" value={plain(typicalMiss(outputs), 2)} accent />
        </Controls>
      </Figure>
      <p>
        At test time there is often no batch at all: one photo arrives alone. So while it trains, each layer keeps a
        running average of the averages and spreads it has seen, and in evaluation mode it uses those instead, so a
        photo’s answer never depends on what came with it. Transformers use{' '}
        <Link to="/learnings/transformer-block">layer normalization</Link> instead, which evens out each example over
        its own numbers and needs no batch.
      </p>

      <Predict
        kicker="Quick check"
        question="After batch norm, a channel always has average 0 and spread 1 over the batch. Training finds the next layer would do best if this channel had average 3 and spread 2. What happens?"
        options={[
          { label: 'Nothing can be done: batch norm forces 0 and 1' },
          { label: 'Training sets β near 3 and γ near 2', right: true },
          { label: 'The weights before it grow until it gets there' },
          { label: 'The layer switches batch norm off' },
        ]}
        reveal={
          <>
            γ and β come after the normalizing and are learned like any weight, so the channel can land wherever it
            works best. Growing the weights before it would do nothing: as the stack of layers showed, normalizing
            undoes their size.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Switch to evaluation mode before predicting.</strong> In PyTorch, <code>model.eval()</code> makes batch
          norm use its running averages. Forget it, and a photo’s label depends on its batchmates.
        </li>
        <li>
          <strong>Keep batches from getting tiny.</strong> With only a few examples a batch, the averages are mostly
          noise. Use larger batches, or keep the running averages fixed while fine-tuning.
        </li>
        <li>
          <strong>Drop the bias in the layer before it.</strong> Subtracting the average cancels any constant a
          convolution adds, and β does the bias’s job; that is why ResNet’s convolutions say <code>bias=False</code>.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A batch-norm layer gets a batch of just 2 examples, and one unit reads ${PAIR[0]} and ${PAIR[1]}. Before γ and β, what are its two outputs?`}
        options={[
          { label: `${PAIR[0]} and ${PAIR[1]}, unchanged` },
          { label: '−1 and +1', right: true },
          { label: '0 and 0' },
          { label: `${plain(PAIR_SAMPLE[0])} and ${signed(PAIR_SAMPLE[1])}` },
        ]}
        reveal={
          <>
            −1 and +1, and it would be the same for any two different values. The average sits halfway between them and
            the spread is half the gap, so each is exactly one spread away. The layer keeps only which one was bigger,
            which is why batches of 2 train badly. ({plain(PAIR_SAMPLE[0])} would come from dividing by n − 1, which
            batch norm doesn’t do.)
          </>
        }
      />
    </Article>
  )
}
