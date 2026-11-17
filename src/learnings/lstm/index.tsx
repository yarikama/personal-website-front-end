import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Day, { type Show } from './Day'
import {
  DINNER,
  GAP,
  GUESS_F,
  inMind,
  LAB_F,
  pct,
  SENTENCE_NAMES,
  SENTENCES,
  squashed,
  STORY_NEXT,
  survives,
  TRACES,
  WORKED_F,
  type LabF,
  type Sentence,
} from './model'
import Trace from './Trace'

const STEPS: Show[] = ['start', 'head', 'note', 'calls', 'lunch', 'dinner', 'named']

// Worked out once, for the prose
const LONG_HELD = TRACES.Long[0.99]
const LONG_LEAKY = TRACES.Long[0.8]
const SQUASH = squashed(3)

export default function Lstm() {
  const [sentence, setSentence] = useState<Sentence>('Noun between')
  const [keep, setKeep] = useState<LabF>(0.99)
  const data = TRACES[sentence][keep]

  return (
    <Article
      kicker="Natural language processing · Predicting the next word"
      title="Long short-term memory"
      promise="A plain recurrent network has usually lost a sentence’s first words by the time it needs them. What does an LSTM change, so that a word can still count twenty words later?"
      takeaway={
        <>
          An LSTM keeps a second memory, the cell, that a word can change only through its gates: new cell = forget
          gate × old cell + input gate × new content. Because the old cell is carried by a <em>plus</em>, not squashed,
          a stored word and the training signal that reaches back to it both last as long as the forget gate stays near
          1.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Language modeling (2): vanishing gradients and the LSTM cell',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 14, “RNNs and LSTMs”, section 14.5, “The LSTM”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Long Short-Term Memory',
          by: 'Sepp Hochreiter and Jürgen Schmidhuber, Neural Computation 9(8), 1997',
          part: 'The memory cell, its input and output gates, and the constant error carousel',
          url: 'https://doi.org/10.1162/neco.1997.9.8.1735',
        },
        {
          title: 'Learning to Forget: Continual Prediction with LSTM',
          by: 'Felix A. Gers, Jürgen Schmidhuber and Fred Cummins, Neural Computation 12(10), 2000',
          part: 'The forget gate',
          url: 'https://doi.org/10.1162/089976600300015015',
        },
        {
          title: 'An Empirical Exploration of Recurrent Network Architectures',
          by: 'Rafal Jozefowicz, Wojciech Zaremba and Ilya Sutskever, ICML, 2015',
          part: 'Starting the forget gate’s bias at 1',
          url: 'https://proceedings.mlr.press/v37/jozefowicz15.html',
        },
        {
          title: 'Learning Phrase Representations using RNN Encoder–Decoder for Statistical Machine Translation',
          by: 'Kyunghyun Cho et al., EMNLP, 2014',
          part: 'The gated recurrent unit (GRU)',
          url: 'https://arxiv.org/abs/1406.1078',
        },
      ]}
    >
      <Predict
        question={`A memory keeps ${pct(GUESS_F)} of what it holds at every word it reads, and adds nothing. After ${GAP} words, how much of what it stored at the start is left?`}
        options={[
          { label: pct(GUESS_F) },
          { label: 'About half' },
          { label: `About ${pct(survives(GUESS_F, GAP))}`, right: true },
          { label: 'Nothing at all' },
        ]}
        reveal={
          <>
            About {pct(survives(GUESS_F, GAP))}: {GUESS_F} multiplied by itself {GAP} times. A small leak at every word
            adds up. To carry a word across a clause, a memory has to keep very nearly all of it at each step: keeping
            99% a word leaves {pct(survives(0.99, GAP))} after {GAP}. An LSTM is built so that it can.
          </>
        }
      />

      <h2>A message for dinner</h2>

      <Steps
        readable
        say={[
          <>Over breakfast your sister asks you to tell Mum, at dinner, that the spare keys are under the mat.</>,
          <>
            Keep it in your head, and every stop of the day stirs it in with new things. Each leaves half of it clear, and
            by dinner only {pct(inMind[DINNER])} is.
          </>,
          <>
            So you write it on a note instead. The day can’t smudge a note: it changes only when you cross something out
            or write something down.
          </>,
          <>
            At every stop you make three quick calls: keep what’s on the note? Write something new? Read it now? At
            breakfast you cross out yesterday’s errand and write the message.
          </>,
          <>At lunch a friend tells you all about her new cat. Nice, but not for Mum: you write nothing, and the note stays as it was.</>,
          <>At dinner you read the note and tell Mum, as clearly as your sister told you.</>,
          <>
            Now each stop is a word. The note is the LSTM’s <strong>cell state</strong>, and keep, write and read are its{' '}
            <strong>forget</strong>, <strong>input</strong> and <strong>output gates</strong>. At the end it still knows
            “keys” was plural, so the next word is “{STORY_NEXT}”.
          </>,
        ]}
      >
        {(step) => <Day key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        A <Link to="/learnings/recurrent-networks">plain recurrent network</Link> keeps everything in its head: one
        hidden state, rewritten at every word through a weight and a squashing function. That is the first lane, and it
        is why its gradients vanish over long distances. The LSTM keeps that hidden state and adds the note: a second
        vector, the cell, which a word can change only through the gates.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: the new cell is the share of the old cell the forget gate keeps, plus the share of new content the
        input gate lets in. Then the output gate picks how much of it to show:
      </p>
      <p className="text-center">
        c<sub>t</sub> = f<sub>t</sub> × c<sub>t−1</sub> + i<sub>t</sub> × g<sub>t</sub>, and h<sub>t</sub> = o
        <sub>t</sub> × tanh(c<sub>t</sub>)
      </p>
      <p>
        Each gate is a sigmoid of the current word and the last output h<sub>t−1</sub>, so it sits between 0 and 1, a
        learned dial rather than a switch; g<sub>t</sub> is new content, made the way a plain recurrent network makes
        its state. The cell and gates are vectors, and × works number by number. If nothing is written, what is left of
        a stored word after {GAP} words is the forget gate multiplied {GAP} times:
      </p>
      <Numbers
        items={WORKED_F.map((f) => ({
          label: `f = ${f}`,
          value: pct(survives(f, GAP)),
          note: `left after ${GAP} words`,
        }))}
      />
      <p>
        The plus sign is the point. How much does c<sub>t</sub> move when c<sub>t−1</sub> moves? Along the cell, only by
        f<sub>t</sub>. So the training signal travelling back {GAP} words shrinks by the same product, and with a forget
        gate near 1 it arrives almost whole. A plain recurrent network multiplies instead by its weight times the
        squash’s slope at every word, and can’t hold that at 1 while also taking in what it reads.
      </p>
      <Clip
        src="lstm/cell-path"
        label="The update: new cell equals forget gate times old cell, plus input gate times new content. The derivative of the new cell with respect to the old one, along the cell, is the forget gate alone. Across twenty words it is the forget gates multiplied: with each at 0.99, 0.99 to the twentieth is 0.82."
        caption="Only the forget gate stands between one cell and the next, so twenty words back the signal is twenty forget gates multiplied."
      />
      <p>
        This is <strong>long short-term memory</strong> (LSTM): a short-term memory, the hidden state, made to last.
        Hochreiter and Schmidhuber’s first version, in 1997, had only input and output gates, and its cell never leaked
        at all, a path they called the constant error carousel. Three years later Gers, Schmidhuber and Cummins added the
        forget gate, so a cell could also let go of what it no longer needs.
      </p>

      <h2>Watch one read</h2>
      <p>
        One memory unit of each kind reads a sentence and must choose the verb that comes next. Its state leans one way
        for a plural subject and the other for a singular one.
      </p>
      <Figure
        readable
        caption={
          <>
            Each row is a word; a sage bar leans towards “are”, an ink bar towards “is”. The weights are set by hand to
            the moves a trained network learns: the LSTM’s subject wipes the cell and writes, other words keep it at f
            and let almost nothing in, and the last word opens the output gate.
          </>
        }
      >
        <Trace key={`${sentence} ${keep}`} tokens={SENTENCES[sentence]} data={data} />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Readout label={`LSTM: “${data.verb}”`} value={pct(data.lstmRight)} accent />
          <Readout label={`Plain RNN: “${data.verb}”`} value={pct(data.plainRight)} />
        </div>
        <Controls>
          <Choice label="Sentence" options={SENTENCE_NAMES} value={sentence} onChange={setSentence} />
          <Choice label="Forget gate" options={LAB_F} value={keep} onChange={setKeep} />
        </Controls>
      </Figure>
      <p>
        The plain unit has one state for two jobs, carrying the subject and taking in each word, so every noun
        overwrites it and the last noun picks the verb. The LSTM shuts its input gate at “sister” and “table”, and its
        cell carries “keys” past them. But keeping isn’t enough without keeping nearly all: on the long sentence a forget
        gate of 0.8 leaves {pct(LONG_LEAKY.lstmRight)} on “are”, worse than a coin, where 0.99 gives{' '}
        {pct(LONG_HELD.lstmRight)}.
      </p>

      <Predict
        kicker="Quick check"
        question="Reading “The keys my sister left on the table”, the LSTM reaches “sister”. Which gates keep its memory of plural “keys” as it was?"
        options={[
          { label: 'Forget gate near 1, input gate near 0', right: true },
          { label: 'Forget gate near 0, input gate near 1' },
          { label: 'Output gate near 1' },
          { label: 'All three at 0.5' },
        ]}
        reveal={
          <>
            Keep the old cell and let nothing in, and c<sub>t</sub> = 1 × c<sub>t−1</sub> + 0: unchanged. Forget near 0
            with input near 1 is what the subject itself does, wipe and write, which here would replace “keys” with
            “sister”. The output gate only decides what the cell shows right now; it can’t protect it. Gates at half would
            lose half of “keys” and mix in some of “sister”.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Start with the forget gate open.</strong> Set its bias to about 1, so a fresh LSTM keeps its cell by
          default and learns what to drop. Jozefowicz and colleagues found this one change enough to catch up with the
          GRU.
        </li>
        <li>
          <strong>Still clip gradients.</strong> The cell stops the signal from vanishing along one path; through the
          gates and the hidden state it can still blow up, so clip it as for any{' '}
          <Link to="/learnings/recurrent-networks">recurrent network</Link>.
        </li>
        <li>
          <strong>Try a GRU for less.</strong> The gated recurrent unit merges keep and write into one gate and drops
          the separate cell. It often does as well, with fewer weights.
        </li>
        <li>
          <strong>Know where it stops.</strong> A cell can carry a few facts a long way, but not every word of a long
          passage. Reading a whole sentence into one vector and writing another from it strains it; that is what
          attention, later in this field, was built for.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="To keep the cell from growing, a team changes the update to c = tanh(f × c_prev + i × g), squashing the cell at every word as a plain RNN squashes its state. What happens on long sentences?"
        options={[
          { label: 'Nothing much: the gates still decide what to keep' },
          { label: 'Stored words and their gradients fade again, a little at every word', right: true },
          { label: 'It remembers better, since the cell stays small' },
          { label: 'It can no longer forget anything' },
        ]}
        reveal={
          <>
            Even with the forget gate at 1 and nothing written, every pass through tanh shrinks a stored value:{' '}
            {SQUASH.map((x) => x.toFixed(2)).join(', ')} after three words. And the backward signal is multiplied by
            tanh’s slope, under 1, at every word. That is the plain recurrent network’s problem back. The bare sum is
            what lets f = 1 mean “exactly as it was”.
          </>
        }
      />
    </Article>
  )
}
