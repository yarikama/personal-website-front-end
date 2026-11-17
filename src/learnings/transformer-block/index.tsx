import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Families from './Families'
import {
  blockWeights,
  D_FF,
  D_MODEL,
  FAMILIES,
  FIRST,
  layerNorm,
  LENGTHS,
  LOUD,
  mean,
  pairs,
  ROUNDS,
  SAME_FROM,
  spread,
  WORKED,
  type Family,
} from './model'
import Round, { type Show } from './Round'

const STEPS: Show[] = ['start', 'meet', 'add', 'even', 'alone', 'rounds', 'named']

const WEIGHTS = blockWeights()
const millions = (n: number) => `${(n / 1e6).toFixed(2)} million`
const big = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : n.toLocaleString('en-US')
// An evened-out notebook, to two places
const listed = (x: number[]) => x.map((v) => (Math.abs(v) < 0.005 ? '0' : v.toFixed(2).replace('-', '−'))).join(', ')
const WORKED_ITEMS = [
  { label: WORKED.notes.join(', '), note: `mean ${mean(WORKED.notes)}, spread ${spread(WORKED.notes)}`, x: WORKED.notes },
  { label: WORKED.louder.join(', '), note: 'ten times louder', x: WORKED.louder },
  { label: WORKED.shifted.join(', '), note: 'every score 7 higher', x: WORKED.shifted },
]

export default function TransformerBlock() {
  const [family, setFamily] = useState<Family>('Encoder only')

  return (
    <Article
      kicker="Natural language processing · Transformers"
      title="The Transformer block"
      promise="Attention lets every word look at every other word, yet it is only one part of each Transformer layer. What do the other parts do, and how do the same layers become BERT, GPT and T5?"
      takeaway={
        <>
          A Transformer block is attention, then a feed-forward network, each wrapped as norm(x + step(x)): the{' '}
          <em>adding</em> keeps each word’s own vector and a clear path for training, the norm keeps every vector the
          same size, and what each word may look at makes the stack an encoder or a decoder.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Attention and Transformers (1) and (2): residual connections, layer normalization, the encoder, the decoder, cross-attention and the cost of self-attention; Pre-trained Language Models (1): implementing the Transformer',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 7, “Transformers and Pretraining”, §7.2 “Transformer Blocks”; Chapter 13, “Machine Translation”, §13.3 “Details of the Encoder-Decoder Model”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Attention Is All You Need',
          by: 'Ashish Vaswani et al., NeurIPS, 2017',
          part: '§3.1 “Encoder and Decoder Stacks”, with LayerNorm(x + Sublayer(x)); §3.3, the position-wise feed-forward network; d_model = 512, d_ff = 2048',
          url: 'https://arxiv.org/abs/1706.03762',
        },
        {
          title: 'Deep Residual Learning for Image Recognition',
          by: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren and Jian Sun, CVPR, 2016',
          part: 'Residual connections: a layer learns a change that is added to its input',
          url: 'https://arxiv.org/abs/1512.03385',
        },
        {
          title: 'Layer Normalization',
          by: 'Jimmy Lei Ba, Jamie Ryan Kiros and Geoffrey E. Hinton, 2016',
          part: 'Normalizing over one example’s own units, with a learned gain and bias',
          url: 'https://arxiv.org/abs/1607.06450',
        },
        {
          title: 'On Layer Normalization in the Transformer Architecture',
          by: 'Ruibin Xiong et al., ICML, 2020',
          part: 'Putting the norm before each step rather than after the add',
          url: 'https://arxiv.org/abs/2002.04745',
        },
        {
          title: 'Linformer: Self-Attention with Linear Complexity',
          by: 'Sinong Wang, Belinda Z. Li, Madian Khabsa, Han Fang and Hao Ma, 2020',
          part: 'Squeezing the keys and values to a fixed length',
          url: 'https://arxiv.org/abs/2006.04768',
        },
      ]}
    >
      <Predict
        question="Each block in the original Transformer’s encoder has two parts: attention, where words share with each other, and a part that works on each word alone. Which part holds more of the block’s weights?"
        options={[
          { label: 'Attention, nearly all of them' },
          { label: 'Attention, about two thirds' },
          { label: 'About half each' },
          { label: 'The part that works on each word alone, about two thirds', right: true },
        ]}
        reveal={
          <>
            About two thirds: {millions(WEIGHTS.feedForward)} of a block’s {millions(WEIGHTS.total)} weights work on each
            word alone, against {millions(WEIGHTS.attention)} in attention. Attention is how words share; most of the
            work happens one word at a time.
          </>
        }
      />

      <h2>Planning a trip in rounds</h2>

      <Steps
        readable
        say={[
          <>
            Four friends plan a trip, and each keeps a notebook of four scores: beach, city, hiking and budget. Cal feels
            strongly about everything.
          </>,
          <>Round one opens with a meeting: everyone listens to everyone, and notes down a blend of what they heard.</>,
          <>Nobody rewrites their notebook from the meeting. Each one adds what they heard to what was already there.</>,
          <>
            Adding makes notes louder, so each friend evens theirs out: take away their own average, divide by their
            spread. Cal’s spread falls from {spread(FIRST.added[LOUD]).toFixed(1)} to 1, like everyone’s.
          </>,
          <>
            Then each goes off alone and runs the same checklist over their own notes, adds what it turns up, and evens
            out again.
          </>,
          <>
            After {ROUNDS} rounds, each notebook still has its owner’s first notes in it. Had they rewritten their
            notebooks instead, all four would hold the same notes from round {SAME_FROM} on.
          </>,
          <>
            Each friend is a word, and the notebook its vector. The meeting is{' '}
            <Link to="/learnings/self-attention">self-attention</Link>, thinking alone is the feed-forward network, adding
            is a residual connection, and evening out is layer normalization. One round is a Transformer block.
          </>,
        ]}
      >
        {(step) => <Round key={step} show={STEPS[step]} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        Both steps of the block, attention and then the feed-forward network, are wrapped the same way: add the step’s
        change to what came in, then normalize. To normalize one word’s vector, subtract its mean, divide by its
        spread, then scale and shift by two numbers the model learns.
      </p>
      <p className="text-center font-serif text-2xl">output = norm(x + step(x))</p>
      <Numbers words items={WORKED_ITEMS.map(({ label, note, x }) => ({ label, value: listed(layerNorm(x)), note }))} />
      <p>
        Volume and offset are gone and only the pattern is left, at a standard size, whatever came in. This is{' '}
        <strong>layer normalization</strong>, done for each word on its own; adding the input back is a{' '}
        <strong>residual connection</strong>. The original Transformer normalizes after the add, as here. Many later
        models normalize the input of each step instead, then add, which trains more steadily in deep stacks.
      </p>
      <p>
        The adding matters most in training. In a stack of plain layers, the blame for a mistake is multiplied at every
        layer on its way down and fades, as it does across the words of a{' '}
        <Link to="/learnings/recurrent-networks">recurrent network</Link>. A skip changes the arithmetic:
      </p>
      <Clip
        src="transformer-block/skip-paths"
        label="A plain layer's output is F of x, and its slope is F prime. With a skip, the output is x plus F of x, and its slope is 1 plus F prime. Through three plain layers the slopes multiply to a times b times c. Through three layers with skips, (1 + a)(1 + b)(1 + c) expands into eight terms: 1, plus a, b and c, plus ab, ac and bc, plus abc. With each slope 0.1, the plain stack passes 0.001 of the blame, and the stack with skips passes 1.331, of which 1 comes straight down the skips."
        caption="Each skip turns a layer’s slope into 1 plus its own. Multiplied out, one of the eight paths is a plain 1: blame running down the skips, past every layer, shrunk by none."
      />
      <p>
        The feed-forward network is the part from the guess. Attention only blends words’ vectors, and a blend of blends
        is still a blend; bending a vector takes a{' '}
        <Link to="/learnings/neural-networks">hidden layer with a nonlinearity</Link>. So every word goes through the
        same two layers, from {D_MODEL} numbers out to {D_FF.toLocaleString('en-US')} and back, on its own.
      </p>

      <h2>Three ways to stack blocks</h2>
      <p>
        Stack blocks where every word sees every word and you have an <strong>encoder</strong>, built to read a whole
        text: the shape of BERT. Hide from each word the words after it (
        <Link to="/learnings/self-attention">masking</Link>) and you have a <strong>decoder</strong>, which can write one
        word at a time: the shape of GPT. Translation uses both. An encoder reads the source, and each decoder block
        gains a third step between its attention and its feed-forward network: <strong>cross-attention</strong>, whose
        queries come from the words written so far and whose keys and values come from the encoder’s last layer. The
        original Transformer and T5 have this shape. How each family learns is the subject of{' '}
        <Link to="/learnings/pretraining-objectives">pretraining objectives</Link>.
      </p>
      <Figure
        readable
        caption="Choose a word to look from it. Sage arcs join it to the words it can look at; dashed ones are cross-attention, from the word being written to every word of the source. Words it cannot see are dashed boxes."
      >
        <Families key={family} family={family} />
        <Controls>
          <Choice label="Family" options={FAMILIES} value={family} onChange={setFamily} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A Transformer translates English into French. In a decoder block’s cross-attention, where do the queries, keys and values come from?"
        options={[
          { label: 'Queries, keys and values all from the English' },
          { label: 'Queries from the French so far; keys and values from the encoder’s English', right: true },
          { label: 'Queries from the English; keys and values from the French so far' },
          { label: 'Queries, keys and values all from the French so far' },
        ]}
        reveal={
          <>
            The word being written asks, so the query is French; what it asks about is the source, so keys and values
            come from the encoder’s output. It is the same arrangement as{' '}
            <Link to="/learnings/attention">attention in an RNN translator</Link>, built from Transformer blocks.
          </>
        }
      />

      <h2>The price: every pair</h2>
      <p>Attention scores every word against every word, so n words make n² scores, in every head of every block:</p>
      <Numbers
        items={LENGTHS.map((n) => ({ label: `${n.toLocaleString('en-US')} words`, value: big(pairs(n)), note: 'scores' }))}
      />
      <p>
        Double the text and the work quadruples. Shortcuts exist, such as Linformer, which squeezes the keys and values
        to a fixed number of rows, but most large models still pay the full square.
      </p>

      <h2>Reading a Transformer diagram</h2>
      <ul>
        <li>
          <strong>Find the adds.</strong> Every arrow that goes around a step and rejoins it is a residual connection,
          the path that keeps a deep stack trainable.
        </li>
        <li>
          <strong>See where the norm sits.</strong> After the add is the original layout; before each step is the one
          most deep models use now.
        </li>
        <li>
          <strong>Ask what each word may see.</strong> All words, earlier words only, or a second text through
          cross-attention: that decides encoder, decoder or both.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Someone deletes every residual connection from a 24-block Transformer but keeps the layer norms. What is most likely to go wrong?"
        options={[
          { label: 'Nothing: layer norm does the same job' },
          { label: 'It can no longer read sentences longer than 24 words' },
          { label: 'Early blocks barely learn, and words’ vectors drift toward each other', right: true },
          { label: 'Every vector grows without limit' },
        ]}
        reveal={
          <>
            Layer norm fixes each vector’s size, not its path. Without the adds, each block must rewrite every vector
            from scratch: the blame reaching early blocks is a product of 24 slopes, and repeated blending wears words
            down to the same notes, as the friends’ did by round {SAME_FROM}. Growing without limit is what the norm
            prevents, and length has nothing to do with the number of blocks.
          </>
        }
      />
    </Article>
  )
}
