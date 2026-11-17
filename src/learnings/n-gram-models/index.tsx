import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Cafe, { type Show } from './Cafe'
import Lab from './Lab'
import {
  BIG_VOCABULARY,
  BIGRAM,
  chance,
  fraction,
  HEARD,
  hops,
  MODELS,
  NEW,
  nextChances,
  oneIn,
  ORDERS,
  prefixes,
  REPEATS,
  seenEntries,
  SHORT,
  spelled,
  tableSize,
  TINY,
  TINY_ASKED,
  TINY_CHANCE,
  vocabulary,
} from './model'

const STEPS: Show[] = ['orders', 'whole', 'next', 'tally', 'chain', 'named']

const P_NEW = chance(BIGRAM, NEW)
const P_HEARD = chance(BIGRAM, HEARD)
const P_SHORT = chance(BIGRAM, SHORT)
const LONGEST = prefixes(NEW).at(-1)!
// The hop that sinks the short order: stopping after "coffee"
const STOP = hops(BIGRAM, SHORT).at(-1)!
const TOKENS = vocabulary(ORDERS).length + 1
const TRIGRAM = MODELS[2]
// The unigram's one guess, whatever came before: its likeliest word
const UNIGRAM_GUESS = nextChances(MODELS[0], []).find((row) => row.next !== '</s>')!.next
const percent = (share: number) => `${Math.round(share * 100)}%`

export default function NGramModels() {
  return (
    <Article
      kicker="Natural language processing · Predicting the next word"
      title="N-gram language models"
      promise="How can a program give a sentence it has never seen a probability, and why can’t it just look up every sentence it has?"
      takeaway={
        <>
          An n-gram model scores a sentence hop by hop: each word’s chance is how often it followed the{' '}
          <em>last n − 1 words</em> in the text it counted, and the sentence’s chance is their product. Looking further
          back predicts better, but needs exponentially more text.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Language Modeling (1) and (2): the chain rule, unigram, bigram and trigram models, start and end tokens, and the bigram demo',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 3, “N-gram Language Models”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'A Mathematical Theory of Communication',
          by: 'Claude E. Shannon, Bell System Technical Journal 27, 1948',
          part: 'Part I, Section 3, “The Series of Approximations to English”: text written from word-pair counts',
          url: 'https://doi.org/10.1002/j.1538-7305.1948.tb01338.x',
        },
      ]}
    >
      <Predict
        question={
          <>
            A café kept its last {ORDERS.length} orders. Nobody ordered “{NEW}”, though people did order large teas, teas
            with lemon and coffees with milk. A program that only counts which word follows which: what chance does it
            give that order?
          </>
        }
        options={[
          { label: '0: nobody said it' },
          { label: 'About 1 in 1,000' },
          { label: `About ${oneIn(P_NEW)}`, right: true },
          { label: 'About 1 in 2' },
        ]}
        reveal={
          <>
            About {oneIn(P_NEW)}, barely less than “{HEARD}”, which someone did order ({oneIn(P_HEARD)}). The program
            never looks for the whole order. It stitches it together from pairs it has heard, so a new order made of
            familiar steps is nearly as likely as an old one.
          </>
        }
      />

      <h2>A new barista</h2>

      <Steps
        readable
        say={[
          <>You’ve just started at a café, and you’ve kept its last {ORDERS.length} orders, each from its start to its end.</>,
          <>A customer begins “a large tea with…”, so you look back for orders that began the same way.</>,
          <>
            The longer the start, the fewer the matches: only {LONGEST.matching.length} began “{LONGEST.start.join(' ')}
            ”, and it went on to {LONGEST.next[0]}, so milk gets no chance at all.
          </>,
          <>So keep it short: for each word, tally only the word that came straight after it.</>,
          <>
            Then chain the tallies, hop by hop: “{NEW}”, which nobody ordered, comes out at {fraction(P_NEW)}, about{' '}
            {oneIn(P_NEW)}.
          </>,
          <>
            Your tallies are a <strong>language model</strong>: a way to give any sentence a probability. Tallying pairs
            makes it a <strong>bigram</strong> model, and the start and end are tokens, &lt;s&gt; and &lt;/s&gt;.
          </>,
        ]}
      >
        {(step) => <Cafe key={step} show={STEPS[step]} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        In words: a sentence’s probability is the chance of its first word after the start, times the chance of each
        next word given the one before it, times the chance of stopping after the last. Each chance is a count: how
        often the pair came, over how often its first word came.
      </p>
      <Clip
        src="n-gram-models/chain-to-bigram"
        label="The chance an order begins a large tea: P of a given start, times P of large given start a, times P of tea given start a large. The older words in the last factor are crossed out, leaving P of a given start, P of large given a, P of tea given large. Each becomes a count of the pair over a count of the word: 10 over 12, times 6 over 10, times 2 over 6, which is 1 over 6."
        caption="The first line is exact, whatever the language. The second keeps only the last word. The third fills each chance in by counting."
      />
      <p>
        Multiplying next-word chances costs nothing: the <strong>chain rule</strong> of probability splits any
        sentence’s probability exactly into one next-word chance per word, each given everything before it. The
        shortcut is the next line, which forgets all but the last word. That is the{' '}
        <Link to="/learnings/markov-property">Markov assumption</Link>, with the last word as the state. It is false for
        language, but the honest version can’t be counted: as the story showed, long starts match almost nothing.
        Counting how often each word followed its context, and dividing, is <strong>maximum likelihood</strong>: the
        chances that make the text you counted most likely.
      </p>
      <Numbers
        items={[
          { label: 'Heard', value: fraction(P_HEARD), note: HEARD },
          { label: 'Never heard', value: fraction(P_NEW), note: NEW },
          { label: 'Heard, short', value: fraction(P_SHORT), note: SHORT },
        ]}
      />
      <p>
        The short order someone did say comes out less likely than the one nobody said: after “coffee”, orders stopped
        only {STOP.count} time in {STOP.of}. A language model scores how a sentence moves from word to word, not
        whether it was heard. The end token is what lets it judge stopping at all; without it, it could never tell a
        whole order from one cut off halfway.
      </p>

      <h2>Why not look further back?</h2>
      <p>
        A model that looks back n − 1 words is an <strong>n-gram</strong> model: a unigram looks at nothing, which makes
        it a <Link to="/learnings/bag-of-words">bag of words</Link>; a bigram at one word; a trigram at two. Each word
        more of memory multiplies the table of chances by the size of the vocabulary. With {spelled(BIG_VOCABULARY)}{' '}
        words:
      </p>
      <Numbers
        items={[1, 2, 3].map((n) => ({
          label: ['Unigram', 'Bigram', 'Trigram'][n - 1],
          value: spelled(tableSize(BIG_VOCABULARY, n)),
          note: 'chances to count',
        }))}
      />
      <p>
        No text you could collect fills a trillion cells, so almost all of them stay at zero, and the model reads zero
        as “never”. Try it on the café’s orders.
      </p>

      <Figure
        caption={
          <>
            Each bar is one hop, its count over its context’s count; the sage number is their product. A unigram gives an
            order and the same words jumbled the same chance. The trigram has filled only {seenEntries(TRIGRAM)} of its{' '}
            {tableSize(TOKENS, 3).toLocaleString('en-US')} cells, gives the new order nothing, and of the orders it
            writes, {percent(REPEATS[2])} are ones it heard.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`You have the café’s ${ORDERS.length} orders and want the till to suggest the next word as a customer speaks. How far back should the model look?`}
        options={[
          { label: 'No words: unigram' },
          { label: 'One word: bigram', right: true },
          { label: 'Two words: trigram' },
          { label: 'The whole order' },
        ]}
        reveal={
          <>
            One word. A unigram makes the same guess after every word, “{UNIGRAM_GUESS}”, even straight after “with”. Two
            words already leave most contexts seen once or never: the trigram has never heard “tea with” go on to milk,
            and whole orders are worse still. With a million orders, looking two words back would start to pay.
          </>
        }
      />

      <h2>Using n-grams well</h2>
      <ul>
        <li>
          <strong>Fit n to your text.</strong> Small text, small n. Trigrams and longer only pay once there are millions
          of words to fill them.
        </li>
        <li>
          <strong>Mark starts and ends.</strong> &lt;s&gt; lets the first word be judged as a first word; &lt;/s&gt;
          lets the model judge when to stop, and lets a generator stop.
        </li>
        <li>
          <strong>Add logs instead of multiplying.</strong> A long sentence’s chance is a product of many small numbers,
          which runs below what a computer can hold; add their logarithms.
        </li>
        <li>
          <strong>Plan for what you never saw.</strong> One pair never counted makes the whole sentence impossible; that
          is what <Link to="/learnings/smoothing">smoothing</Link> is for. To compare models, score text they were not
          counted from, with <Link to="/learnings/perplexity">perplexity</Link>.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A text has three sentences: ${TINY.map((s) => `“${s}”`).join(', ')}. What probability does a bigram model counted from it give “${TINY_ASKED}”?`}
        options={[{ label: '1/2' }, { label: fraction(TINY_CHANCE), right: true }, { label: '2/9' }, { label: '1/6' }]}
        reveal={
          <>
            {fraction(TINY_CHANCE)}: 2 of 3 sentences start with “go”, so 2/3; half of the “go”s go on to “home”, so 1/2;
            and every “home” ends its sentence, so 2/2. Their product is {fraction(TINY_CHANCE)}. Leaving out the start
            hop gives 1/2: it forgets that “stay” starts sentences too.
          </>
        }
      />
    </Article>
  )
}
