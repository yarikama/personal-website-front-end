import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Book, { type Show } from './Book'
import Lab from './Lab'
import {
  carried,
  CHECK,
  checkRatio,
  CLUE,
  DESK,
  fraction,
  GROW,
  KEEP,
  oneIn,
  PAGES,
  recurrentWeights,
  SHRINK,
  SIZES,
  survives,
  tableEntries,
  windowWeights,
  WORKED_STEPS,
} from './model'

const STEPS: Show[] = ['desk', 'gone', 'card', 'guess', 'blame', 'tiny', 'named']

const millions = (n: number) => `${(n / 1e6).toFixed(1)} million`
const hundreds = (n: number) => (Math.round(n / 100) * 100).toLocaleString('en-US')

// 1.6 × 10^17
function Power({ n }: { n: number }) {
  const e = Math.floor(Math.log10(n))
  return (
    <>
      {Number((n / 10 ** e).toFixed(1))} × 10<sup>{e}</sup>
    </>
  )
}

export default function RecurrentNetworks() {
  const { vocab, dim, context, hidden } = SIZES
  const lost = oneIn(carried(KEEP, CLUE, PAGES))

  return (
    <Article
      kicker="Natural language processing · Predicting the next word"
      title="Recurrent networks"
      promise="A recurrent network reads a sentence of any length with one small memory. So why does it still lose track of a word twenty words back?"
      takeaway={
        <>
          A recurrent network folds each word into one fixed-size memory with the same weights every time, so it reads
          any length; but the blame that trains it travels back through one <em>multiplication</em> per word, so over
          long distances it fades or explodes.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Language modeling (2): neural network language models and recurrent neural networks',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 6, “Neural Networks” (the feedforward neural language model), and Chapter 14, “RNNs and LSTMs”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'A Neural Probabilistic Language Model',
          by: 'Yoshua Bengio, Réjean Ducharme, Pascal Vincent and Christian Jauvin, JMLR, 2003',
          part: 'The curse of dimensionality, and a fixed-window network in place of the count table',
          url: 'https://www.jmlr.org/papers/v3/bengio03a.html',
        },
        {
          title: 'Recurrent neural network based language model',
          by: 'Tomáš Mikolov, Martin Karafiát, Lukáš Burget, Jan Černocký and Sanjeev Khudanpur, Interspeech, 2010',
          part: 'The RNN language model, trained with truncated backpropagation through time',
          url: 'https://www.isca-archive.org/interspeech_2010/mikolov10_interspeech.html',
        },
        {
          title: 'On the difficulty of training recurrent neural networks',
          by: 'Razvan Pascanu, Tomas Mikolov and Yoshua Bengio, 2013',
          part: 'Vanishing and exploding gradients, and clipping the gradient’s norm',
          url: 'https://arxiv.org/abs/1211.5063',
        },
      ]}
    >
      <Predict
        question={`You read a mystery one page at a time and keep a single index card of notes. After each page you rewrite the card: you keep half of what the old card said and add the new page. When you finish page ${PAGES}, how much is left of what page ${CLUE} put on the card?`}
        options={[
          { label: 'About half' },
          { label: 'About a twentieth' },
          { label: 'About 1 in 1,000' },
          { label: 'About 1 in 260,000', right: true },
        ]}
        reveal={
          <>
            {lost}: half of half, {PAGES - CLUE} times over. Each rewrite only halves it, but the halvings multiply rather
            than add up. A recurrent network has exactly this problem, and it bites hardest while the network learns.
          </>
        }
      />

      <h2>A mystery and one index card</h2>

      <Steps
        readable
        say={[
          <>
            You’re reading a mystery and guessing, before each page, what happens next, but your desk holds only the
            last {DESK} pages.
          </>,
          <>
            On page {PAGES} the answer hangs on a clue from page {CLUE}, long since pushed off the desk, so your guess
            can’t use it.
          </>,
          <>
            So you keep one index card instead: after every page you rewrite it from the old card and the new page, the
            same way each time, keeping half.
          </>,
          <>
            Each guess now comes from the card alone, and the next page shows how wrong it was. Page {PAGES}’s guess was
            badly wrong.
          </>,
          <>To guess better next time, you trace the blame back through every rewrite, to find which notes you should have kept.</>,
          <>
            Each rewrite kept half, so the blame halves at every page: page 15 gets {oneIn(carried(KEEP, 15, PAGES))} of
            it, page {CLUE} just {lost}.
          </>,
          <>
            The pages are words, the desk is a fixed-window model, the card is a recurrent network’s hidden state, your
            rewriting habit is its weights, and tracing the blame is backpropagation through time.
          </>,
        ]}
      >
        {(step) => <Book key={STEPS[step]} show={STEPS[step]} />}
      </Steps>

      <h2>Why not count, or use a desk?</h2>
      <p>
        An <Link to="/learnings/n-gram-models">n-gram model</Link> keeps a count for every run of words it conditions on.
        Runs of 10 words over a 100,000-word vocabulary make 10<sup>50</sup> possible entries, far more than any text
        could fill: Bengio and colleagues called this the <strong>curse of dimensionality</strong>. In 2003 they swapped
        the table for a network. Look up a vector for each of the last few words, lay them side by side, pass them
        through a hidden layer, and finish with a softmax that gives every word in the vocabulary a chance.
      </p>
      <p>
        With {vocab.toLocaleString('en-US')} words, {dim}-number vectors, {context} words of context and {hidden} hidden
        units, that is about {millions(windowWeights(vocab, dim, context, hidden))} weights, where a count table for the
        same 4-word runs could need <Power n={tableEntries(vocab, context + 1)} /> entries. Similar words get similar
        vectors, so a run never seen still gets a sensible guess, and no word ever gets a chance of exactly zero, so
        there is nothing to <Link to="/learnings/smoothing">smooth</Link>. But it is still a desk: a word outside the
        window is invisible, a wider window means a wider first layer, and each word is fed in again at every position
        it passes through.
      </p>

      <h2>The loop</h2>
      <p>
        A <strong>recurrent neural network</strong> (RNN) reads one word at a time and carries one vector, its{' '}
        <strong>hidden state</strong> h: the card. At each word it makes the new state from the old state and the new
        word’s vector, then squashes it with a sigmoid σ:
      </p>
      <p className="text-center font-serif text-xl">
        h<sub>t</sub> = σ(W<sub>h</sub> h<sub>t−1</sub> + W<sub>i</sub> x<sub>t</sub> + b)
      </p>
      <p>
        The same W<sub>h</sub>, W<sub>i</sub> and b serve every word, so 30 words need no more weights than 3 (with the
        sizes above, {millions(recurrentWeights(vocab, dim, hidden))} for any length), and each word is read once. As a
        language model it starts from the start token, and after each word turns the state into a chance for every next
        word with a softmax. Its loss adds up, over every position, minus the log of the chance it gave the word that
        really came next: the <Link to="/learnings/neural-networks">cross-entropy</Link> of a classifier whose classes
        are the vocabulary, and the same sum that <Link to="/learnings/perplexity">perplexity</Link> averages.
      </p>
      <p>
        To train it, unroll the loop into one layer per word and run{' '}
        <Link to="/learnings/neural-networks">backpropagation</Link> from the last word back to the first, adding up
        what each use of the shared weights contributed. That is <strong>backpropagation through time</strong>. The only
        new thing is the length of the road: blame for a late guess must pass through every step to reach an early word.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: the blame reaching a word k steps back is the blame at the guess, multiplied k times by how strongly
        each state depends on the one before. With a single number of memory, that factor is the memory weight w times
        the sigmoid’s slope, and the slope is never more than ¼. At w = {SHRINK.weight} the factor is at most{' '}
        {SHRINK.weight * SHRINK.slope}:
      </p>
      <Numbers
        items={WORKED_STEPS.map((k) => ({
          label: `${k} words back`,
          value: fraction(survives(SHRINK.weight, SHRINK.slope, k)),
          note: 'of the blame',
        }))}
      />
      <p>
        That is a <strong>vanishing gradient</strong>: early words barely learn. The same product can run the other
        way. At w = {GROW.weight} the factor can reach {GROW.weight * GROW.slope}, and 18 steps multiply the blame by
        about {hundreds(survives(GROW.weight, GROW.slope, 18))}: an <strong>exploding gradient</strong>, where one huge
        step wrecks the weights. With a vector of memory the factor is a matrix, and it is rarely exactly 1.
      </p>
      <Clip
        src="recurrent-networks/blame-product"
        label="The gradient of the loss at word 20 with respect to the hidden state at word 2 is the gradient at word 20 times eighteen factors, each the derivative of one hidden state by the one before. Each factor is the memory weight w times the sigmoid's slope, at most w over 4. With w equal to 2 the product is one half to the eighteenth, about 0.0000038; with w equal to 6 it is 1.5 to the eighteenth, about 1,478."
        caption="Backpropagation through time is the chain rule along the unrolled loop: one factor per step back, all of the same kind. Eighteen halvings leave almost nothing; eighteen factors of 1.5 leave far too much."
      />

      <h2>A real one, trained as you watch</h2>
      <p>
        Here is an RNN language model with 8 numbers of memory, trained by backpropagation through time on twelve
        sentences such as “the dogs that the cat sees run”. The last verb agrees with the first noun, four words back,
        past a second noun that may disagree. Runs A and B are the same in every way but their random starting weights.
      </p>
      <Figure
        readable
        caption={
          <>
            Top: the memory after each word, eight numbers, each square more solid the nearer it is to 1. Middle: how much of the chosen guess’s blame reaches each
            memory. Bottom: the chances for the next word, the right one in sage. Guessing after “see” or “sees”, run A
            gets the last verb right every time; run B leans the same way whatever the first noun, and the blame from
            that guess reaches the first noun hundreds of times weaker. In run A it barely fades.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question="An RNN language model was trained only on sentences of up to 10 words. Someone gives it a 30-word sentence. What happens?"
        options={[
          { label: 'It fails: it only has weights for 10 positions' },
          { label: 'It reads only the last 10 words' },
          { label: 'It runs the same weights 30 times and guesses every word', right: true },
          { label: 'It needs three times as many weights first' },
        ]}
        reveal={
          <>
            One set of weights is applied at every word, so any length runs. Whether its guesses are good that deep into
            a sentence is another matter: it never practised there, and blame from that far away arrived faint.
          </>
        }
      />

      <h2>What to do about it</h2>
      <ul>
        <li>
          <strong>Clip the gradient.</strong> When the gradient’s length passes a threshold, around 5, scale it back to
          that length before stepping; its direction stays. This tames exploding gradients, not vanishing ones.
        </li>
        <li>
          <strong>Start the factor near 1.</strong> Initialize the memory weights with care, or swap the sigmoid for a
          ReLU, whose slope is 1 wherever it is active instead of at most ¼.
        </li>
        <li>
          <strong>Give the memory a path that isn’t squashed.</strong> Gated networks such as the{' '}
          <Link to="/learnings/lstm">LSTM</Link> and the GRU update their memory by adding to it, so blame can cross many
          steps.
        </li>
        <li>
          <strong>Cut the backward pass short.</strong> Truncated backpropagation through time stops after a fixed number
          of steps, which saves time. Mikolov’s 2010 RNN language model went back a single step and, mixing several such
          networks, still roughly halved the perplexity of a strong count-based model.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A trained RNN’s blame shrinks by a factor of ${CHECK.keep} each step back. One clue sits ${CHECK.near} words before a guess, another ${CHECK.far}. How much weaker is the blame reaching the far clue?`}
        options={[
          { label: 'About 10 times' },
          { label: 'About 27 times' },
          { label: 'About 400 times', right: true },
          { label: 'The same: every step uses the same weights' },
        ]}
        reveal={
          <>
            {CHECK.keep}
            <sup>{CHECK.near}</sup> ≈ {(CHECK.keep ** CHECK.near).toFixed(2)} against {CHECK.keep}
            <sup>{CHECK.far}</sup> ≈ {(CHECK.keep ** CHECK.far).toFixed(4)}: {CHECK.far - CHECK.near} more factors of{' '}
            {CHECK.keep}, about {hundreds(checkRatio())} times weaker. Distance multiplies; it doesn’t add. Sharing the
            weights is exactly why every step applies the same shrink.
          </>
        }
      />
    </Article>
  )
}
