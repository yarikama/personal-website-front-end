import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import {
  CARD,
  CHANCES,
  CHECK,
  checkTrip,
  LEARNING,
  LEARNING_STEP,
  LONG,
  LONG_FIRST_TRIP,
  loss,
  PAPER,
  rightChances,
  TARGET,
  tripSummary,
  WORKED,
} from './model'
import Relay, { type Show } from './Relay'
import Trips from './Trips'

const STEPS: Show[] = ['listen', 'first', 'write', 'tutor', 'long', 'named']
const DIRECTIONS = ['forwards', 'backwards'] as const

const thousands = (n: number) => n.toLocaleString('en-US')

export default function Seq2seq() {
  const [length, setLength] = useState(10)
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>('forwards')
  const summary = tripSummary(length, direction === 'backwards')
  const tutorWord = TARGET[LEARNING_STEP]
  const checkStep = checkTrip()

  return (
    <Article
      kicker="Natural language processing · Translation and generation"
      title="Sequence to sequence"
      promise="A recurrent network can guess the next word of a sentence. How do you turn it into a translator, which must hear a whole sentence in one language before writing it in another, and where does that design strain?"
      takeaway={
        <>
          An encoder reads the whole source into one vector; a decoder, a language model conditioned on that vector,
          writes the target a word at a time, trained on the right words before each one. Everything it knows about the
          source squeezes through that one fixed-size <em>bottleneck</em>.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Machine translation and sequence-to-sequence models; natural language generation (the training objective and teacher forcing)',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 14, “RNNs and LSTMs”, section 14.7, “The Encoder-Decoder Model with RNNs”, and the bottleneck at the start of section 14.8',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Sequence to Sequence Learning with Neural Networks',
          by: 'Ilya Sutskever, Oriol Vinyals and Quoc V. Le, NIPS, 2014',
          part: 'The deep LSTM encoder–decoder, its 8,000-number summary of a sentence, and reading the source backwards (sections 2, 3.3 and 3.4)',
          url: 'https://arxiv.org/abs/1409.3215',
        },
        {
          title: 'Learning Phrase Representations using RNN Encoder–Decoder for Statistical Machine Translation',
          by: 'Kyunghyun Cho et al., EMNLP, 2014',
          part: 'Two recurrent networks trained together to maximise the chance of the target given the source',
          url: 'https://arxiv.org/abs/1406.1078',
        },
        {
          title: 'On the Properties of Neural Machine Translation: Encoder–Decoder Approaches',
          by: 'Kyunghyun Cho, Bart van Merriënboer, Dzmitry Bahdanau and Yoshua Bengio, 2014',
          part: 'Translation quality falling as sentences grow longer',
          url: 'https://arxiv.org/abs/1409.1259',
        },
      ]}
    >
      <Predict
        question={`In 2014 Sutskever, Vinyals and Le built a translator that first turned an English sentence into ${thousands(PAPER.numbers)} numbers, then wrote the French from those numbers alone. How many numbers did it use for a sentence twice as long?`}
        options={[
          { label: `${thousands(2 * PAPER.numbers)}: twice as many` },
          { label: `${thousands(PAPER.numbers)}: the same`, right: true },
          { label: 'About 11,000: it grows, but slower' },
          { label: 'It depends on which words it holds' },
        ]}
        reveal={
          <>
            {thousands(PAPER.numbers)}, for 5 words or 50. The half that reads ends in one summary of a fixed size, and the
            half that writes sees nothing else. That one choice is why the design works, and where it strains. Here is a
            phone call that shows both.
          </>
        }
      />

      <h2>A sentence over the phone</h2>

      <Steps
        readable
        say={[
          <>
            A friend reads you a French sentence over the phone, one word at a time, and all you may keep is one small
            card of notes, rewritten after each word.
          </>,
          <>
            The line goes quiet, and you start writing the English from the card alone: “the”, at{' '}
            {CHANCES[0].the.toFixed(2)}, looks likeliest.
          </>,
          <>
            Each next word comes from the card and the words already written, so “black” comes before “cat”, though
            “noir” came after “chat”: that is why you waited for the end.
          </>,
          <>
            While you learn, a tutor checks each word: you’d have written “cat”, the tutor says “{tutorWord}”, and you go on
            from “{tutorWord}”, scored by the {LEARNING[tutorWord].toFixed(2)} you gave it.
          </>,
          <>
            Now your friend reads {LONG.length} words. The card is still {CARD} numbers, and “le” is {LONG_FIRST_TRIP}{' '}
            rewrites behind you when you write the first English word.
          </>,
          <>
            Your listening is the encoder, the card is one vector, your writing is the decoder, and going on from the
            tutor’s word is teacher forcing: together, a sequence-to-sequence model.
          </>,
        ]}
      >
        {(step) => <Relay key={STEPS[step]} show={STEPS[step]} />}
      </Steps>

      <h2>Two networks and a hand-over</h2>
      <p>
        A <strong>sequence-to-sequence</strong> model (seq2seq, or encoder–decoder) joins two recurrent networks. The{' '}
        <strong>encoder</strong> reads the source the way any <Link to="/learnings/recurrent-networks">recurrent network</Link>{' '}
        does, folding one word at a time into its hidden state, and predicts nothing. Its last hidden state is the card,
        and it becomes the first hidden state of the <strong>decoder</strong>, a second network with weights of its own.
        The decoder starts from the start token &lt;s&gt;. At each step it turns its state into a softmax over the target
        vocabulary, writes a word, and reads that word back in, until it writes &lt;/s&gt;. Both halves learn together,
        from pairs of sentences and their translations.
      </p>
      <p>
        Without the encoder, the decoder is just an RNN language model. With it, every guess also leans on the source:
        the decoder is a <strong>conditional language model</strong>. So there is no separate translation model and
        language model, as in <Link to="/learnings/ibm-model-1">IBM Model 1</Link>: one network learns both what reads as
        English and what this French says. The lengths are free, too: four French words became five English tokens.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: the chance of a whole translation is the chance of its first word given the source, times the chance
        of the second given the source and the first, and so on through &lt;/s&gt;. For “the black cat sleeps” given “le
        chat noir dort”:
      </p>
      <Numbers
        items={[
          { label: 'First word', value: WORKED[0].chance.toFixed(2), note: '“the”' },
          { label: 'First two', value: WORKED[1].chance.toFixed(2), note: `× ${rightChances[1].toFixed(2)} for “black”` },
          { label: 'All five', value: WORKED[2].chance.toFixed(3), note: 'through </s>' },
        ]}
      />
      <p>
        Training raises that chance for every pair in the corpus, which is the same as lowering minus its log, added up
        word by word: here {loss(rightChances).toFixed(2)}. It is the <Link to="/learnings/neural-networks">cross-entropy</Link>{' '}
        of one softmax per word. Each factor needs the right words before it, so in training every step reads the
        reference’s previous word, never the model’s own guess: that is <strong>teacher forcing</strong>. Every input is
        known in advance, so one pass scores every step, and an early slip cannot drag the rest of the sentence
        off course.
      </p>
      <Clip
        src="seq2seq/sentence-chance"
        label="The chance of an English sentence e given a French sentence f is the product over steps t of the chance of word e t given the earlier words and f. For the black cat sleeps given le chat noir dort, the five chances 0.72, 0.55, 0.86, 0.78 and 0.93 multiply to 0.247. The training loss is minus the log, 1.40, with each step fed the right words before it: teacher forcing."
        caption="One factor per word, each conditioned on the source and on the right words before it. Training lowers minus the log of the product, which is a sum of one loss per word."
      />
      <p>
        At test time there is no reference. The decoder reads its own guesses, a situation it never practised in
        training (often called exposure bias), and picking those guesses well is a search problem of its own, taken up
        in <Link to="/learnings/beam-search">beam search</Link>.
      </p>

      <Predict
        kicker="Quick check"
        question="Training on “le chat noir dort”, the decoder has written “the”. It gives “cat” 0.48 and “black” 0.30, and the reference says “black”. With teacher forcing, what does the decoder read at the next step?"
        options={[
          { label: '“cat”: its own best guess' },
          { label: '“black”: the reference word', right: true },
          { label: 'Both, weighted 0.48 and 0.30' },
          { label: 'Nothing: the sentence stops at the first miss' },
        ]}
        reveal={
          <>
            “black”. The miss is scored, at −log 0.30, but the next step starts from the right words, so it learns what
            follows “the black” rather than what follows its own slip. That is what lets one pass score every step.
          </>
        }
      />

      <h2>Everything through one vector</h2>
      <p>
        The card carries the whole sentence. Sutskever’s model gave it {thousands(PAPER.numbers)} numbers, and Cho and
        colleagues found that their encoder–decoder did well on short sentences but got quickly worse as they grew.
        Part of the trouble is distance. A French word reaches the English word it becomes only through every later
        encoder step, the hand-over, and every earlier decoder step, and each step multiplies the signal that trains it,
        as on <Link to="/learnings/recurrent-networks">recurrent networks</Link>. Choose a length and see how far each
        word travels.
      </p>
      <Figure
        caption={
          <>
            Each bar is one pair, French word k and English word k, taken to translate each other; the first pair is in
            sage. Read forwards, every pair is as many steps apart as the sentence is long. Read backwards, the first
            pairs sit close and the last far, with the same average.
          </>
        }
      >
        <Trips length={length} reversed={direction === 'backwards'} />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Readout label="Shortest" value={summary.shortest} accent />
          <Readout label="Average" value={summary.mean.toFixed(1)} />
          <Readout label="Longest" value={summary.longest} />
        </div>
        <Controls>
          <Slider label="Sentence length" value={length} min={2} max={30} onChange={setLength} />
          <Choice label="Read the French" options={DIRECTIONS} value={direction} onChange={setDirection} />
        </Controls>
      </Figure>
      <p>
        Reading the source backwards was Sutskever’s trick. It put the first words of the two sentences side by side,
        and test <Link to="/learnings/bleu">BLEU</Link> rose from {PAPER.bleuForwards} to {PAPER.bleuBackwards}. It moves
        the distances around without shortening them on average, and the card stays one size. The fix is to let the
        decoder look back at every encoder state at every step, not only the last:{' '}
        <Link to="/learnings/attention">attention</Link>.
      </p>

      <h2>What makes it work</h2>
      <ul>
        <li>
          <strong>Use gated memory on both sides.</strong> An <Link to="/learnings/lstm">LSTM</Link> carries a word across
          far more steps; Sutskever used one LSTM to read and a separate one to write.
        </li>
        <li>
          <strong>Stack layers.</strong> They used {PAPER.layers} layers of {thousands(PAPER.cells)} cells, and each layer
          they added cut perplexity by almost a tenth.
        </li>
        <li>
          <strong>Read the source both ways.</strong> A bidirectional encoder runs a second network from right to left,
          so each word’s state knows its neighbours on both sides.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A ${CHECK.m}-word French sentence is read backwards, and its last word translates to the last of ${CHECK.m} English words. How many steps lie between them?`}
        options={[{ label: '1' }, { label: String(CHECK.m) }, { label: String(checkStep), right: true }, { label: String(2 * CHECK.m) }]}
        reveal={
          <>
            {checkStep}. Read backwards, the last word goes in first, so it passes {CHECK.m - 1} more encoder steps, the
            hand-over, and {CHECK.k - 1} decoder steps before word {CHECK.k}. The trick that brings the first words
            together pushes the last ones apart.
          </>
        }
      />
    </Article>
  )
}
