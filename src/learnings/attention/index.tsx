import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import Menu, { type Show } from './Menu'
import {
  CHOCOLAT,
  DARK,
  NOIR,
  NOT_KNOWING_DONT,
  PAIR_NAMES,
  PAIRS,
  pct,
  STATES,
  STORY,
  STORY_CONTEXTS,
  STORY_WEIGHTS,
  two,
  vector,
  type PairName,
} from './model'

const STEPS: Show[] = ['menu', 'memory', 'dark', 'rest', 'grid', 'named']
const KINDS = ['Soft', 'Hard'] as const

// Worked out once, for the prose
const DARK_ROW = STORY_WEIGHTS[DARK]
const MOUSSE_CONTEXT = STORY_CONTEXTS[STORY.target.indexOf('mousse')]
const [NE, PAS] = [NOT_KNOWING_DONT[1], NOT_KNOWING_DONT[3]]

export default function Attention() {
  const [pair, setPair] = useState<PairName>('Not knowing')
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<(typeof KINDS)[number]>('Soft')
  const target = PAIRS[pair].target
  // A new pair may have fewer words than the step picked on the old one
  const at = Math.min(step, target.length - 1)
  const choosePair = (next: PairName) => {
    setPair(next)
    setStep(Math.min(step, PAIRS[next].target.length - 1))
  }

  return (
    <Article
      kicker="Natural language processing · Translation and generation"
      title="Attention"
      promise="An encoder–decoder that squeezes a whole sentence into one vector loses the details of long ones. How can the decoder keep every source word at hand, and know which one matters for the word it is writing now?"
      takeaway={
        <>
          At every step the decoder scores each source word against what it is about to write, turns the scores into
          weights that add up to 1, and reads a weighted mix of the encoder states: a <em>fresh</em> context for every
          word, and a soft alignment that nobody had to label.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Machine translation and sequence-to-sequence models: the attention mechanism; Attention and Transformers (1): the recap of attention in seq2seq',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 14, “RNNs and LSTMs”, section 14.8, “Attention”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Neural Machine Translation by Jointly Learning to Align and Translate',
          by: 'Dzmitry Bahdanau, Kyunghyun Cho and Yoshua Bengio, ICLR, 2015',
          part: 'The alignment model, the context vector as a weighted sum, and the learned alignments',
          url: 'https://arxiv.org/abs/1409.0473',
        },
        {
          title: 'Effective Approaches to Attention-based Neural Machine Translation',
          by: 'Minh-Thang Luong, Hieu Pham and Christopher D. Manning, EMNLP, 2015',
          part: 'Global and local attention, and the dot-product score',
          url: 'https://arxiv.org/abs/1508.04025',
        },
      ]}
    >
      <Predict
        question="A translation network reads “mousse au chocolat noir” and writes “dark chocolate mousse”. It learned from whole sentence pairs, and nobody ever told it which word matches which. As it writes “dark”, which French word does it rely on most?"
        options={[
          { label: '“mousse”: the first word, like “dark”' },
          { label: 'All four equally' },
          { label: '“noir”, the last word', right: true },
          { label: 'None: it works from one summary of the line' },
        ]}
        reveal={
          <>
            “Noir”, with about {pct(DARK_ROW[NOIR])} of its attention. A network with attention looks back at the source
            for every word it writes, and learns where to look from the translations alone, even when English puts the
            words in a different order.
          </>
        }
      />

      <h2>Reading a menu aloud</h2>

      <Steps
        readable
        say={[
          <>Your friend can’t read French, so you read the dessert menu out to them in English.</>,
          <>
            You could read a line once, look up and say it from memory, but on a long line details slip: was the
            chocolate dark, or milk?
          </>,
          <>
            So you keep the menu open, and to say “dark” you glance back: {pct(DARK_ROW[NOIR])} of the glance lands on
            “noir”, the last word, and a little on “chocolat” beside it.
          </>,
          <>
            Then “chocolate” comes from “chocolat” and “mousse” from the first word: your English runs left to right
            while your eyes run right to left.
          </>,
          <>
            Nobody told you which word matches which, yet your glances, a row for each English word, draw the matches,
            and every row adds up to one whole glance.
          </>,
          <>
            That is <strong>attention</strong>: each French word is an encoder state, each English word a decoder step,
            each share an <strong>attention weight</strong>, and what a row takes in is that step’s{' '}
            <strong>context vector</strong>.
          </>,
        ]}
      >
        {(step) => <Menu key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        The look-up-and-recite way is the plain <Link to="/learnings/seq2seq">encoder–decoder</Link>: the decoder gets
        one vector for the whole sentence and has to make it last. Attention keeps every encoder state, one per source
        word, and lets each decoder step take its own mix of them.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: give each source word a score for how well it fits what the decoder is about to write, turn the scores
        into weights that are positive and add up to 1, then add up the encoder states, each times its weight. The
        middle step is a softmax, e to each score over the total (the same one that turns{' '}
        <Link to="/learnings/gradient-bandits">preferences into choices</Link>):
      </p>
      <p className="text-center">
        c<sub>t</sub> = Σ<sub>j</sub> a<sub>tj</sub> s<sub>j</sub>, where a<sub>tj</sub> = softmax over j of score(h
        <sub>t−1</sub>, s<sub>j</sub>)
      </p>
      <p>
        Here s<sub>j</sub> is the encoder state of source word j, h<sub>t−1</sub> the decoder’s state before word t, and
        c<sub>t</sub> the context it reads to write word t. For “dark”, say the scores for mousse, au, chocolat and noir
        are 0, 0, 1.5 and 4:
      </p>
      <Numbers
        items={[
          { label: 'noir', value: pct(DARK_ROW[NOIR]), note: 'score 4' },
          { label: 'chocolat', value: pct(DARK_ROW[CHOCOLAT]), note: 'score 1.5' },
          { label: 'mousse, au', value: pct(DARK_ROW[0]), note: 'score 0, each' },
        ]}
      />
      <p>
        A gap of 2.5 in score is a factor of e<sup>2.5</sup>, about 12, in weight. Now pretend each encoder state is two
        numbers, how much the word is about a colour and how much about food: noir is {vector(STATES[NOIR])}, chocolat{' '}
        {vector(STATES[CHOCOLAT])}. The context for “dark” comes out at {vector(STORY_CONTEXTS[DARK])}, mostly colour;
        the same sum for “mousse” gives {vector(MOUSSE_CONTEXT)}, mostly food. Real states have hundreds of numbers, none
        with a name, but the sum is the same.
      </p>
      <Clip
        src="attention/one-step"
        label={`One attention step for the word dark. The four French words mousse, au, chocolat and noir get scores 0, 0, 1.5 and 4. A softmax turns them into weights ${DARK_ROW.map((w) => two(w)).join(', ')}, which add up to 1. The context is the weighted sum of the four encoder states, which comes to ${vector(STORY_CONTEXTS[DARK])}.`}
        caption="Scores become weights, and the weights mix the encoder states into one context. Every step of the decoder does this again, with its own scores."
      />
      <p>
        Bahdanau, Cho and Bengio introduced this in 2015. Their score is a small network that takes h<sub>t−1</sub> and s
        <sub>j</sub>; the simplest score is their dot product. The weights come out of the same training as the rest: no
        one marks which word matches which.
      </p>

      <h2>Watch it align</h2>
      <p>
        Three sentence pairs, with scores set by hand to what a trained model learns. Pick an English word to see the mix
        its context is made of, and switch to Hard to keep only each row’s strongest word.
      </p>
      <Figure
        readable
        caption="Each row is one decoder step; the fuller a cell’s sage, the bigger its weight, and the outlined cell is the row’s largest. Hard keeps only that cell, the way a hard alignment picks one partner per word."
      >
        <Lab pair={pair} step={at} hard={kind === 'Hard'} />
        <Controls>
          <Choice label="Sentence" options={PAIR_NAMES} value={pair} onChange={choosePair} />
          <Choice
            label="Writing"
            options={target.map((_, t) => t)}
            value={at}
            onChange={setStep}
            format={(t) => target[t]}
          />
          <Choice label="Alignment" options={KINDS} value={kind} onChange={setKind} />
        </Controls>
      </Figure>
      <p>
        English “don’t” comes from two French words: soft, it takes {pct(PAS)} of “pas” and {pct(NE)} of “ne”; hard, it
        must drop one. <Link to="/learnings/ibm-model-1">IBM Model 1</Link> works with hard alignments, and since it
        can’t know the right one it sums over every possible choice. Soft weights need no such sum: they change smoothly
        with the scores, so <Link to="/learnings/gradient-descent">gradient descent</Link> can tune them along with the
        rest of the network. In the sister’s cat, “is” has no French word of its own and spreads its glance, while
        “sleeping” goes to “dort”.
      </p>

      <Predict
        kicker="Quick check"
        question="A model with attention is translating a ten-word French sentence and has just written its fourth English word. Getting ready for the fifth, what does it work out again?"
        options={[
          { label: 'The encoder states of all ten French words' },
          { label: 'The weights over all ten French words, and the context made from them', right: true },
          { label: 'Nothing: the context was fixed when the first word was written' },
          { label: 'One weight, for the fifth French word' },
        ]}
        reveal={
          <>
            The encoder read the French once, and its states stay as they are. What changes is the decoder’s state, so
            the scores, the weights and the context are worked out again over all ten words. A context fixed once is
            the plain encoder–decoder’s single summary, and matching the fifth word to the fifth word breaks the moment
            the two languages order words differently.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Give each state its neighbours.</strong> Bahdanau’s encoder reads the sentence both ways, so the state
          for “noir” already knows it follows “chocolat”.
        </li>
        <li>
          <strong>Score cheaply.</strong> Luong, Pham and Manning tried several scores; for attention over the whole
          sentence a plain dot product did best, and it costs one multiply-and-add per number.
        </li>
        <li>
          <strong>For long inputs, look at a window.</strong> Their local attention first guesses where in the source to
          look, then weighs only the words within ten places of it.
        </li>
        <li>
          <strong>Read the grid when a translation goes wrong.</strong> A row smeared over the whole sentence, or pointing
          at the wrong word, shows where the model was looking. It shows where, not why.
        </li>
      </ul>
      <p>
        Later the Transformer takes the step further: every word of a sentence attends to the words of its own sentence,
        which is called self-attention.
      </p>

      <Predict
        kicker="Check yourself"
        question="A speech recogniser with attention writes text from a recording cut into slices of a tenth of a second. As it writes the word “seven”, its weights are spread over slices 12 to 15 and near zero everywhere else. What does that tell you?"
        options={[
          { label: 'It is unsure, and should have put all the weight on one slice' },
          { label: '“Seven” was said across those slices, and the weights align the word with them', right: true },
          { label: 'Slices 12 to 15 are the loudest in the recording' },
          { label: 'Nothing: the weights only mean something in translation' },
        ]}
        reveal={
          <>
            A spoken word lasts several slices, so its context should mix all of them: the spread is the alignment, not
            doubt. The scores ask which parts of the source fit the word being written, not which are loud. Attention
            doesn’t care what the source is, only that each output looks back at the parts it comes from.
          </>
        }
      />
    </Article>
  )
}
