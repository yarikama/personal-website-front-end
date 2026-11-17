import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Heads from './Heads'
import {
  ASKER,
  average,
  draw,
  DRAWS,
  finePct,
  GUESS_D,
  LENGTHS,
  LONG,
  LONG_D,
  LONG_NUDGE,
  LONG_PICK,
  LONG_SCALED,
  mostGive,
  ONE_HEAD,
  ONE_SLOTS,
  PAIR,
  PAPER,
  PAPER_DK,
  pct,
  pick,
  SHORT,
  SHORT_D,
  SHORT_NUDGE,
  SHORT_PICK,
  short,
  SPREAD_PAIRS,
  SPREADS,
  STORY_SEED,
  STRANGERS,
  TWO_HEADS,
  TWO_SLOTS,
  WORDS,
  WORKED,
  type Average,
  type Length,
} from './model'
import Pair from './Pair'
import Shares from './Shares'
import Spread from './Spread'

// The many-draw averages for each setting of the lab, worked out once each
const averages = new Map<string, Average>()
function averageOf(d: number, scaled: boolean) {
  const key = `${d} ${scaled}`
  let found = averages.get(key)
  if (!found) {
    found = average(d, scaled)
    averages.set(key, found)
  }
  return found
}

const SCORES = ['Tally', '÷ √d'] as const
type Scores = (typeof SCORES)[number]
const HEADS = ['One head', 'Two heads'] as const
type HeadCount = (typeof HEADS)[number]

// d_k, set as in print
const DK = (
  <>
    d<sub>k</sub>
  </>
)

const spreadOf = (d: number) => Math.round(SPREADS.find((s) => s.d === d)!.rms)
const CHEF = WORDS.indexOf('chef')
// "cooks" on "chef": in its own head, and in one head shared with "pasta"
const FOCUSED = TWO_HEADS.heads[0].weights[ASKER][CHEF]
const BLENDED = ONE_HEAD.heads[0].weights[ASKER][CHEF]
// The leader's gap over the next score, in the story's two runs
const gapOf = (t: number[]) => {
  const sorted = [...t].sort((a, b) => b - a)
  return sorted[0] - sorted[1]
}

export default function MultiHeadAttention() {
  const [d, setD] = useState<Length>(LONG_D)
  const [scores, setScores] = useState<Scores>('Tally')
  const [seed, setSeed] = useState(STORY_SEED)
  const [heads, setHeads] = useState<HeadCount>('Two heads')
  const scaled = scores === '÷ √d'
  const strangers = draw(d, seed)
  const now = pick(strangers.tallies, d, scaled)
  const many = averageOf(d, scaled)
  const shown = heads === 'Two heads' ? TWO_HEADS : ONE_HEAD

  return (
    <Article
      kicker="Natural language processing · Transformers"
      title="Multi-head attention"
      promise={<>Inside a Transformer, every attention score is divided by √{DK}, and attention is split into several small heads. What goes wrong without each?</>}
      takeaway={
        <>
          A dot product of {DK} numbers is about √{DK} in size, big enough to pin a softmax on one word and stall its
          learning, so attention divides it by √{DK}. And since one softmax gives one average, a Transformer runs several
          narrower heads side by side, each free to look for a <em>different</em> relation, for the same cost.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Attention and Transformers: the sequence-stacked form, multi-head attention and the scaled dot product',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 7, “Transformers and Pretraining”, §7.1 on attention and multi-head attention, and §7.3 on computing it with one matrix',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Attention Is All You Need',
          by: 'Ashish Vaswani et al., NeurIPS, 2017',
          part: '§3.2, “Attention”: scaled dot-product attention, its footnote on why dot products grow, and multi-head attention',
          url: 'https://arxiv.org/abs/1706.03762',
        },
      ]}
    >
      <Predict
        question={`Two strangers each answer the same ${GUESS_D} yes-or-no questions at random. Score +1 for every answer they share and −1 for every one they don’t. How far from zero does the total usually land?`}
        options={[
          { label: 'Close to 0: random answers cancel out' },
          { label: `About ${Math.sqrt(GUESS_D)}`, right: true },
          { label: `About ${GUESS_D / 2}` },
          { label: `About ${GUESS_D}` },
        ]}
        reveal={
          <>
            About {Math.sqrt(GUESS_D)}, the square root of {GUESS_D}. The answers mostly cancel, but never exactly, and
            what’s left over grows like the square root of the number of questions. That leftover is why a Transformer
            shrinks its attention scores.
          </>
        }
      />

      <h2>The matchmaking quiz</h2>

      <Steps
        readable
        say={[
          <>
            You run a matchmaking quiz: two people answer the same yes-or-no questions, and their tally is +1 for every
            answer they share and −1 for every one they don’t.
          </>,
          <>
            Between strangers answering at random, the tally doesn’t stay near zero: over {SPREAD_PAIRS.toLocaleString('en')} pairs it lands
            about ±{spreadOf(4)} on 4 questions, ±{spreadOf(16)} on 16, ±{spreadOf(64)} on 64 and ±{spreadOf(256)} on
            256.
          </>,
          <>
            Now share one person’s attention between {STRANGERS} strangers with a softmax, so a higher tally earns a
            bigger share: on a {SHORT_D}-question quiz, the leader gets {pct(SHORT_PICK.top)}.
          </>,
          <>
            Make it {LONG_D} questions and the tallies sit {Math.sqrt(LONG_D / SHORT_D)} times further apart, so one
            stranger takes {finePct(LONG_PICK.top)}, though every one of them answered at random.
          </>,
          <>
            A pick that sure stops listening: a point off the leader’s tally only moves its share to{' '}
            {finePct(LONG_NUDGE.after)}, where on the short quiz the same point took it from {pct(SHORT_NUDGE.before)} to{' '}
            {pct(SHORT_NUDGE.after)}.
          </>,
          <>
            So divide every tally by the square root of the quiz length, {Math.sqrt(LONG_D)} here: the scores shrink back
            to a spread of about 1, and the six share again, the leader with {pct(LONG_SCALED.top)}.
          </>,
          <>
            The answers are a query and a key, each question is one of their {DK} dimensions, the tally is their dot
            product, and the shares are attention weights: this is <strong>scaled dot-product attention</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Pair key="pair" you={PAIR.you} them={PAIR.them} />
          ) : step === 1 ? (
            <Spread key="spread" rows={SPREADS} />
          ) : step === 2 ? (
            <Shares key="short" tallies={SHORT.tallies} d={SHORT_D} scaled={false} />
          ) : step === 3 ? (
            <Shares key="long" tallies={LONG.tallies} d={LONG_D} scaled={false} />
          ) : step === 4 ? (
            <Shares key="nudge" tallies={LONG.tallies} d={LONG_D} scaled={false} nudge />
          ) : step === 5 ? (
            <Shares key="scaled" tallies={LONG.tallies} d={LONG_D} scaled />
          ) : (
            <Shares key="named" tallies={LONG.tallies} d={LONG_D} scaled named />
          )
        }
      </Steps>

      <p>
        Nothing about the strangers changed between the short quiz and the long one; only the size of their scores did,
        and the softmax cares about size. A lead of {gapOf(SHORT.tallies)} points is a lean; a lead of{' '}
        {gapOf(LONG.tallies)} is a landslide. Once nearly all the weight sits on one word, small changes to the scores
        barely move it, so training sends almost nothing back to the queries and keys that made them. This is the reason
        the Transformer’s authors gave for the scale. (Where queries, keys and values come from is the page on{' '}
        <Link to="/learnings/self-attention">self-attention</Link>.)
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a score is the query’s dot product with the key, divided by the square root of their length, {DK}. Each
        of the {DK} terms in the dot product adds noise of size 1, and independent noise adds up in its variance, not its
        size: {DK} terms give a variance of {DK}, so a spread of √{DK}. Dividing by √{DK} puts the spread back to 1.
        Averaged over {DRAWS.toLocaleString('en')} random draws of {STRANGERS} keys:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `length ${w.d}`,
          value: `±${w.spread}`,
          note: `leader ${pct(w.raw.top)}, scaled ${pct(w.scaled.top)}`,
        }))}
      />
      <p>
        Unscaled, the leader’s share climbs with {DK}; scaled, it stays near {pct(WORKED[1].scaled.top)} at every length.
        The original Transformer’s heads have {DK} = {PAPER_DK}, so they divide by {Math.sqrt(PAPER_DK)}.
      </p>
      <Clip
        src="multi-head-attention/score-spread"
        label="The dot product of a query and a key is a sum of d k terms, q1 k1 plus q2 k2 up to q d k k d k. Each term has mean 0 and variance 1, so the variance of the sum is 1 plus 1 and so on, d k times: d k. A typical score is about plus or minus the square root of d k. The score is therefore the dot product divided by the square root of d k, which brings the spread back to 1. For d k equal to 64, a spread of 8 divided by 8 gives 1."
        caption={<>Variances add, sizes don’t: {DK} terms of variance 1 make a score about √{DK} in size, and dividing by √{DK} undoes exactly that.</>}
      />

      <Figure
        readable
        caption={
          <>
            Pick a quiz length and whether to scale, then draw new strangers. Slope adds up how fast each share moves with
            its own score: {short(mostGive(STRANGERS))} for six even shares, 0 when one takes everything. Unscaled, it sinks
            as d grows; scaled, it holds near {short(averageOf(LONG_D, true).give)} on average.
          </>
        }
      >
        <Shares key={`${d} ${scores} ${seed}`} tallies={strangers.tallies} d={d} scaled={scaled} />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Readout label="Leader" value={finePct(now.top)} accent />
          <Readout label="Slope" value={short(now.give)} />
          <Readout label={`Leader, ${DRAWS.toLocaleString('en')} draws`} value={pct(many.top)} />
        </div>
        <Controls>
          <Choice label="Questions (d)" options={LENGTHS} value={d} onChange={setD} />
          <Choice label="Scores" options={SCORES} value={scores} onChange={setScores} />
          <Button onClick={() => setSeed((s) => s + 1)}>New strangers</Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={<>A model’s heads have {DK} = 256, and someone deletes the ÷ √{DK}. Early in training, before the queries and keys mean anything, what do its attention weights look like?</>}
        options={[
          { label: 'Even across the words, since the scores are random' },
          { label: 'Nearly all on one word, picked by chance, and slow to change', right: true },
          { label: 'Just as before: a softmax only cares about which score is highest' },
          { label: 'Close to zero for every word' },
        ]}
        reveal={
          <>
            Random queries and keys 256 numbers long give scores about ±16, and a softmax over gaps that wide puts nearly
            all the weight on whichever word scored highest by chance. The softmax sees the size of the gaps, not just
            their order. With the weights pinned, little gradient flows back, so the chance pick is slow to unlearn.
          </>
        }
      />

      <h2>Every word at once</h2>
      <p>
        So far one word asked. In a sentence every word asks at once, and the work is done as a few big
        multiplications. Stack the words’ vectors as the rows of a table X, n rows of d numbers. Then XQ is every query
        at once, one row per word, and XK and XV are every key and value. One more product, XQ(XK)ᵀ, is every score at
        once: an n × n table whose row i holds word i’s score against each word. Divide by √{DK}, softmax each row, and
        multiply by XV: row i of the result is word i’s output. The grids below are such tables, after the softmax.
      </p>

      <h2>Several heads</h2>
      <p>
        Each row of that table is one set of weights that adds up to 1, which is a problem for a word that needs two
        things. In “the chef cooks fresh pasta”, cooks wants to know who cooks and what gets cooked. One head can only
        split its weight, {pct(BLENDED)} on chef and {pct(BLENDED)} on pasta, and pass on one average of the two.{' '}
        <strong>Multi-head attention</strong> gives each head its own, narrower Q, K and V: h heads of width d/h. Each
        head makes its own table, and their outputs are laid side by side, then mixed by one more matrix (Y in the
        course, W<sup>O</sup> in the paper).
      </p>
      <Figure
        readable
        caption={
          <>
            A toy model with hand-set weights and four features per word: person, food, action, other. With two heads,
            cooks puts {pct(FOCUSED)} on chef in one and {pct(FOCUSED)} on pasta in the other, and passes both on in
            separate numbers. One head of the same width blends them into the same numbers. Words with nothing to ask
            spread evenly.
          </>
        }
      >
        <Heads
          heads={shown.heads}
          names={heads === 'Two heads' ? ['Head 1: who?', 'Head 2: what?'] : ['One head']}
          out={shown.out}
          slots={heads === 'Two heads' ? TWO_SLOTS : ONE_SLOTS}
        />
        <Controls>
          <Choice label="Heads" options={HEADS} value={heads} onChange={setHeads} />
        </Controls>
      </Figure>
      <p>
        Splitting costs nothing extra. h heads of width d/h hold the same 3d² weights for Q, K and V as one head of
        width d, and their scores take the same n²d multiply-adds. The paper’s base model splits d = {PAPER.d} into h ={' '}
        {PAPER.h} heads of {PAPER_DK}. Nobody tells a trained head what to look for; each settles on its own relation,
        and the paper’s pictures show some that track the structure of a sentence.
      </p>

      <Predict
        kicker="Quick check"
        question="One head’s weights for a word are 50% on a word whose value is (2, 0) and 50% on one whose value is (0, 2). What does that head pass on?"
        options={[
          { label: '(2, 0) and (0, 2), kept apart' },
          { label: '(1, 1)', right: true },
          { label: '(2, 2)' },
          { label: '(0, 0)' },
        ]}
        reveal={
          <>
            One head gives one weighted average: 0.5 × (2, 0) + 0.5 × (0, 2) = (1, 1), half of each, mixed into the same
            numbers. To pass both on whole, they have to come from two heads, laid side by side.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Scale by the head’s width.</strong> The dot product is {DK} = d/h numbers long, so divide by √{DK}.
          Dividing by √d would shrink each head’s scores √h times too far and flatten its weights.
        </li>
        <li>
          <strong>Split the width; don’t add to it.</strong> Keep h × {DK} = d, so more heads cost nothing. The price is
          that each head describes its relation in fewer numbers.
        </li>
        <li>
          <strong>Mix after joining.</strong> The last matrix lets what one head found reach every output number; without
          it, each head’s findings would stay in its own slot.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A model has d = 1024, split into 16 heads. What should each head divide its scores by?"
        options={[
          { label: '32, the square root of 1024' },
          { label: '8', right: true },
          { label: '16, the number of heads' },
          { label: '64' },
        ]}
        reveal={
          <>
            Each head’s queries and keys are 1024 ÷ 16 = 64 numbers long, so its dot products spread about ±8, and √64 = 8
            brings them back to about 1. Dividing by 32 would squash them to a spread of a quarter, and every head’s
            weights would sit nearly even.
          </>
        }
      />
    </Article>
  )
}
