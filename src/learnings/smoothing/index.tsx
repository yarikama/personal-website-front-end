import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab, { Pick, Training } from './Lab'
import {
  ADD_ONE,
  BIG,
  BIG_SHARE,
  chance,
  CONTEXT,
  contextCount,
  GUESS,
  KS,
  NEVER,
  neverShare,
  NONSENSE,
  oneIn,
  ORDERS,
  pct,
  rowCounts,
  SEEN_SENTENCE,
  SENTENCES,
  sentenceChance,
  SMALL_K,
  V,
  WORKED,
  type LabSentence,
} from './model'
import Shop, { type Show } from './Shop'

// The story's steps: what the figure shows, and k before and after
const STEPS: { show: Show; from: number; to: number }[] = [
  { show: 'tally', from: 0, to: 0 },
  { show: 'chances', from: 0, to: 0 },
  { show: 'week', from: 0, to: 0 },
  { show: 'add-one', from: 0, to: ADD_ONE },
  { show: 'share', from: ADD_ONE, to: ADD_ONE },
  { show: 'small', from: ADD_ONE, to: SMALL_K },
  { show: 'named', from: SMALL_K, to: SMALL_K },
]

const [MANGO, LEMON, MINT] = rowCounts
const mango = (k: number) => chance(CONTEXT, 'mango', k)
const unseen = (k: number) => chance(CONTEXT, 'now', k)
const grouped = (n: number) => n.toLocaleString('en-US')
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)

export default function Smoothing() {
  const [sentence, setSentence] = useState<LabSentence>(GUESS)
  const [k, setK] = useState<(typeof KS)[number]>(0)

  return (
    <Article
      kicker="Natural language processing · Predicting the next word"
      title="Smoothing"
      promise="A language model learned by counting calls anything it never counted impossible. How do you teach it that unseen is not impossible, without making nonsense likely too?"
      takeaway={
        <>
          Counting gives every pair it never saw a chance of exactly 0, and one 0 sinks a whole sentence. Smoothing
          adds a pretend count k to every pair so nothing is impossible; keep k <em>small</em>, because every pretend
          count is paid for by the pairs you really saw.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Language modeling (2): unknown words and UNK, zero probabilities, add-α smoothing and linear interpolation',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 3, “N-gram Language Models”, section 3.6, “Smoothing, Interpolation, and Backoff”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'An Empirical Study of Smoothing Techniques for Language Modeling',
          by: 'Stanley F. Chen and Joshua Goodman, ACL, 1996',
          part: 'Additive smoothing (plus-one and plus-delta) against interpolated and backoff methods on real text',
          url: 'https://aclanthology.org/P96-1041/',
        },
      ]}
    >
      <Predict
        question="A model learned which word follows which from 12 short sentences. They include “you want mango”, “i want mint” and “i want mango now”, but never “mint now”. How likely does it find the new sentence “you want mint now”?"
        options={[
          { label: 'About as likely as “i want mango now”' },
          { label: 'A few times less likely' },
          { label: 'Impossible: a chance of exactly 0', right: true },
          { label: 'It can’t score it at all' },
        ]}
        reveal={
          <>
            Exactly 0. Both times “mint” appeared, the sentence ended there, so the count of “now” after “mint” is 0 out
            of {contextCount('mint')}. The sentence’s chance is a product, one factor per pair of words, and a single 0
            makes the product 0, however ordinary the rest.
          </>
        }
      />

      <h2>Ice cream on Saturdays</h2>

      <Steps
        readable
        say={[
          <>
            Every Saturday you take your niece for ice cream. In {ORDERS} visits she has picked mango {times(MANGO)},
            lemon {times(LEMON)} and mint {times(MINT)}.
          </>,
          <>
            So you guess her next pick from the tally: mango {MANGO} in {ORDERS}, lemon {LEMON} in {ORDERS}, mint {MINT} in {ORDERS}, and the{' '}
            {NEVER} flavours she has never picked, 0: never.
          </>,
          <>
            To guess her next five picks together, you multiply their chances. One cherry among them, and all five get a
            chance of 0, however usual the other four.
          </>,
          <>
            So you pretend she has picked every flavour on the menu once more than she has: {V} pretend picks on top of
            her {ORDERS}.
          </>,
          <>
            Nothing is impossible now. But the {NEVER} flavours she never picked share {pct(neverShare(ADD_ONE))} of your
            guess, and mango falls from {pct(mango(0))} to {pct(mango(ADD_ONE))}.
          </>,
          <>
            Pretend a tenth of a pick for each flavour instead: the never-picked share {pct(neverShare(SMALL_K))}, and
            mango keeps {pct(mango(SMALL_K))}.
          </>,
          <>
            Her picks are the words that followed “{CONTEXT}” in {SENTENCES.length} short sentences, the menu is the
            vocabulary, and the pretend picks are <strong>smoothing</strong>.
          </>,
        ]}
      >
        {(step) => <Shop key={step} {...STEPS[step]} />}
      </Steps>

      <h2>One zero sinks the sentence</h2>
      <p>
        A bigram model scores a sentence the way you scored her five visits: one chance for each neighbouring pair of
        words, all multiplied (the chain rule with a one-word memory, from{' '}
        <Link to="/learnings/n-gram-models">n-gram models</Link>). Counting gives a pair it never saw a chance of exactly
        0, and no corpus holds every ordinary pair: “mint now” is a fine way to end a sentence that twelve sentences
        happen to miss. So the model calls “{GUESS}” impossible, and a score built on its chances, like{' '}
        <Link to="/learnings/perplexity">perplexity</Link>, breaks along with it.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: the chance of word w after word v is (how often w followed v, plus k) divided by (how often v was
        followed by anything, plus k × V), where V is the number of words that could come next. The k on top is each
        pair’s pretend count. The k × V below adds up the pretend counts of all V words, so the chances still sum to 1.
        With k = 1 this is <strong>add-one</strong> or <strong>Laplace smoothing</strong>; with a smaller k,{' '}
        <strong>add-k smoothing</strong>. Mango after “{CONTEXT}”, and a word never seen there, for three values of k:
      </p>
      <Numbers
        items={WORKED.map((value) => ({
          label: `k = ${value}`,
          value: pct(mango(value)),
          note: `never seen: ${pct(unseen(value))}`,
        }))}
      />
      <Clip
        src="smoothing/add-k"
        label={`The chance of mango after want, first in words, times “want mango” was said over times “want” was said, then as c of want mango over c of want, ${MANGO} over ${ORDERS}; a word never seen after want gets 0 over ${ORDERS}, which is 0. A pretend count k joins the top, and k times V joins the bottom. With k = 1 and V = ${V}: mango gets ${MANGO + 1} over ${ORDERS + V}, about ${mango(1).toFixed(2)}, and the unseen word 1 over ${ORDERS + V}, about ${unseen(1).toFixed(2)}.`}
        caption="Add k to every pair on top and k for each of the V next words below: the counts you saw shrink a little, and nothing is zero any more."
      />
      <p>
        Every pretend count is paid for by the words you did see. Add-one hands {pct(neverShare(ADD_ONE))} of the chance
        after “{CONTEXT}” to {NEVER} words never seen there, “{CONTEXT} {CONTEXT}” among them, each getting half of what
        mint earned by really being said.
      </p>

      <h2>Words it has never seen</h2>
      <p>
        Smoothing fixes pairs of words the model knows. A word that isn’t in the vocabulary at all, say “banana”, has no
        row or column to add k to. The fix is a stand-in, <strong>UNK</strong> (for unknown), kept in the vocabulary
        like any other word: before scoring, every word the model doesn’t know becomes UNK, the way the shop’s
        “special” stands in for whatever is new this week. Usually the rarest words of the training text are turned
        into UNK too, so it has real counts to learn from. In these twelve sentences it has none, so only smoothing
        gives it a chance.
      </p>

      <h2>Try it on the twelve sentences</h2>
      <p>
        The model below learned from these {SENTENCES.length} sentences, so you can check any count. Pick a sentence to
        score and a pretend count k.
      </p>
      <Figure
        readable
        caption={
          <>
            Each sage bar is one pair’s chance, from 0 at the bottom to 1 at the top, and the sentence’s chance is their
            product. At k = 0 one empty track sinks the sentence. At k = 1, “{SEEN_SENTENCE}” falls from{' '}
            {oneIn(sentenceChance(SEEN_SENTENCE, 0))} to {oneIn(sentenceChance(SEEN_SENTENCE, 1))}, while the nonsense “
            {NONSENSE}” climbs to {oneIn(sentenceChance(NONSENSE, 1))}: the bigger k, the less sense counts.
          </>
        }
      >
        <Training />
        <div className="mt-6">
          <Lab sentence={sentence} k={k} />
        </div>
        <div className="mt-4">
          <Readout label="The sentence’s chance" value={oneIn(sentenceChance(sentence, k))} accent />
        </div>
        <Controls>
          <Pick value={sentence} onChange={setSentence} />
          <Choice label="Pretend count k" options={KS} value={k} onChange={setK} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A test sentence reads “i want banana now”, and the model has never seen “banana”. Why turn it into UNK rather than delete it?"
        options={[
          { label: 'UNK gets a higher chance than any real word' },
          { label: 'Deleting it scores a different sentence, with a pair nobody said', right: true },
          { label: 'Deleting it would leave a sentence too short to score' },
          { label: 'No reason: deleting it works just as well' },
        ]}
        reveal={
          <>
            Deleting it scores “i want now”: the pair “want now” was never in the sentence, and the sentence has one
            factor fewer than it should, so it looks likelier than one with a real word in that place. UNK keeps the slot
            and charges for it.
          </>
        }
      />

      <h2>What people do about it</h2>
      <ul>
        <li>
          <strong>Keep k small, and choose it on held-out text.</strong> Try a few values on sentences the model never
          trained on, and keep the one with the best <Link to="/learnings/perplexity">perplexity</Link>.
        </li>
        <li>
          <strong>Turn rare training words into UNK.</strong> Then UNK has real counts, and every new word in a test
          sentence lands on it.
        </li>
        <li>
          <strong>Fall back on shorter contexts.</strong> When a two-word context has no data, use the one-word chance
          instead (<strong>backoff</strong>), or always blend the three-, two- and one-word chances with weights that sum
          to 1 (<strong>interpolation</strong>). Both beat pretend counts on real text.
        </li>
        <li>
          <strong>Or split words into pieces.</strong> Modern models break a rare word into common pieces, <Link to="/learnings/subword-tokenization">subword
          tokenization</Link>, so no word is ever wholly unknown.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A trigram model has a vocabulary of ${grouped(BIG.size)} words. In training, the two words “out of” were followed by something ${BIG.total} times, by ${BIG.seenWords} different words. With add-one smoothing, about how much of the chance after “out of” goes to words never seen there?`}
        options={[
          { label: 'About 1%' },
          { label: `About ${pct(neverShare(ADD_ONE))}, as after “${CONTEXT}”` },
          { label: 'About 60%' },
          { label: 'Over 99%', right: true },
        ]}
        reveal={
          <>
            Over 99%: {grouped(BIG.size - BIG.seenWords)} unseen words each get a pretend count of 1, against{' '}
            {BIG.total} real counts, so they take {grouped(BIG.size - BIG.seenWords)} ÷ {grouped(BIG.total + BIG.size)},{' '}
            {(100 * BIG_SHARE).toFixed(1)}% of the chance. The bigger the vocabulary, the more add-one takes from what
            was seen, which is why real language models use a far smaller k, or interpolation.
          </>
        }
      />
    </Article>
  )
}
