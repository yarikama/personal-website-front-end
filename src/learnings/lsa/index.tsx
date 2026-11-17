import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import { CAR_NEAREST, COLA_SQUEEZED, IDF_WORKED, PAIRS, SENTENCES, VOCAB, WEIGHTINGS, WORKED, type Weighting } from './model'
import Receipts, { type Show } from './Receipts'

const two = (value: number) => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2)
const pct = (share: number) => `${Math.round(100 * share)}%`

// What the story's figure shows at each step
const STEPS: Show[] = ['pile', 'apart', 'zero', 'company', 'squeeze', 'close', 'named']

const PAIR_LABELS = PAIRS.map(([a, b]) => `${a} · ${b}`)
const [IDF_THE, IDF_CAR, IDF_ENGINE] = IDF_WORKED

export default function Lsa() {
  const [k, setK] = useState(2)
  const [weighting, setWeighting] = useState<Weighting>('Counts')
  const [pairLabel, setPairLabel] = useState(PAIR_LABELS[0])
  const pair = PAIRS[PAIR_LABELS.indexOf(pairLabel)]

  return (
    <Article
      kicker="Natural language processing · Words as numbers"
      title="The company a word keeps"
      promise="Two words never appear in the same sentence. Can counting where words appear still tell you they mean the same thing?"
      takeaway={
        <>
          Count words across documents, weight the counts by TF-IDF, and keep only the strongest few layers of the
          table’s SVD: words that keep the same company end up pointing the same way even if they never meet. That is{' '}
          <em>latent semantic analysis</em>.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Word Embeddings (1): the distributional hypothesis, latent semantic analysis, TF-IDF',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 5, “Embeddings”, §5.3–5.4 and the historical notes on LSA; Chapter 11, §11.1.2 “Term weighting: tf-idf and BM25”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Indexing by Latent Semantic Analysis',
          by: 'Scott Deerwester, Susan T. Dumais, George W. Furnas, Thomas K. Landauer and Richard Harshman, Journal of the American Society for Information Science 41(6), 1990',
          part: 'The method: a truncated SVD of the term–document matrix',
          url: 'https://doi.org/10.1002/(SICI)1097-4571(199009)41:6<391::AID-ASI1>3.0.CO;2-9',
        },
      ]}
    >
      <Predict
        question="In a dozen short sentences, “car” and “automobile” never share one, so their rows of counts have a similarity of 0. Squeeze every word down to just two numbers, and what is their similarity then?"
        options={[
          { label: 'Still 0: they never met' },
          { label: 'About 0.3' },
          { label: 'About 0.98', right: true },
          { label: 'Below 0: they avoid each other' },
        ]}
        reveal={
          <>
            About 0.98. The two words never meet, but both turn up beside “drive”, “road” and “fuel”. Two numbers
            cannot hold every detail of where a word appears, only its broad pattern, and the two words share that
            pattern almost exactly.
          </>
        }
      />

      <h2>Receipts in a corner shop</h2>

      <Steps
        readable
        say={[
          <>You run a corner shop and keep a dozen receipts: each column is one basket, each row one thing you sell.</>,
          <>Red cola and blue cola never turn up on the same receipt, because every shopper sticks to one.</>,
          <>Line their rows up receipt by receipt and they have nothing in common: a score of 0.</>,
          <>Yet both ride along with chips and popcorn, and rarely with bread, milk or eggs.</>,
          <>Now squeeze each row of twelve numbers into two, chosen to keep as much of the whole pile as possible.</>,
          <>The two colas point almost the same way from the origin: a score of {two(COLA_SQUEEZED)}.</>,
          <>
            That is <strong>latent semantic analysis</strong>: a receipt is a document, an item a word, the pile the
            word–document matrix, and the squeeze a truncated SVD.
          </>,
        ]}
      >
        {(step) => <Receipts key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        The idea underneath is the <strong>distributional hypothesis</strong>: words that turn up in similar contexts
        tend to mean similar things. Read “she poured a little ___ into her tea” and you already know the missing
        word is something to drink. LSA takes the crudest context there is, the whole document.
      </p>

      <h2>Counting, and comparing rows</h2>
      <p>
        Count each word in each document and you have the <strong>word–document matrix</strong>: a row per word, a
        column per document. A column is that document’s <Link to="/learnings/bag-of-words">bag of words</Link>; a
        row is a word’s record of where it went. To compare two rows, take the <strong>cosine</strong> of the angle
        between them: multiply them entry by entry, add up, and divide by both lengths. Dividing by the lengths means
        a common word and a rare one with the same pattern still score 1.
      </p>
      <p>
        Raw rows have a flaw. If two words share no document, every product is zero, and so is the cosine. Real text
        makes this the rule: a document uses a few hundred of 50,000 words, so almost every cell is zero. Rows like
        that are called <strong>sparse</strong>, and they call most pairs of words unrelated for no better reason than
        that the two never met.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: write the table as a sum of layers, each a pattern over words times a pattern over documents times
        a strength; keep the k strongest layers and drop the rest. In symbols, C ≈ U<sub>k</sub>Σ<sub>k</sub>V
        <sub>k</sub>ᵀ, the <strong>truncated singular value decomposition</strong>, and the strengths on Σ’s diagonal
        are the <strong>singular values</strong>. A word’s k numbers are its row of counts measured along the k
        strongest document patterns, the same directions of most spread that <Link to="/learnings/pca">PCA</Link>{' '}
        finds, only without centring first. No other k layers rebuild the table more closely. Here is car against
        automobile in the lab’s sentences as k changes:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `k = ${w.k}`,
          value: two(w.value),
          note: `keeps ${pct(w.kept)}`,
        }))}
      />
      <p>
        With one number per word, the number can only say how much a word is used, so every pair points the same way
        and scores 1. Keep all {SENTENCES.length} and you have the raw rows back, turned but not changed, zeros and
        all. In between, the faint layers that kept car and automobile apart are gone, and what is left is the
        company they share.
      </p>
      <Clip
        src="lsa/word-vectors"
        label="The table C is approximately U k times Sigma k times V k transpose. Multiply both sides on the right by V k. V k transpose times V k is the identity, so it drops out, leaving W equals C times V k, which is approximately U k times Sigma k. Row i of W is word i's k numbers: its row of counts measured along k document patterns. Car's row of counts, 1, 1, 1 and then zeros, times V 2 gives 0.92 and minus 0.51."
        caption="Why a word’s vector is just its row of counts times V_k: the document patterns are at right angles, so V_kᵀV_k is the identity and drops out."
      />

      <h2>Try it on twelve sentences</h2>
      <p>
        {VOCAB.length} words counted in {SENTENCES.length} sentences; small words are skipped, except “the”. Choose a
        pair, then keep more or fewer layers.
      </p>
      <Figure
        caption={
          <>
            The two words in sage are outlined in the table and drawn from the origin on the map; their cosine is the
            angle between those lines. The map shows only the first two of the k numbers, and with k = 1 every word
            falls onto one line. With counts, “the” runs off the map to the right: it takes over the first layer.
          </>
        }
      >
        <Lab weighting={weighting} k={k} pair={pair} />
        <Controls>
          <Slider label="Layers kept, k" value={k} min={1} max={SENTENCES.length} onChange={setK} />
          <Choice label="Weighting" options={WEIGHTINGS} value={weighting} onChange={setWeighting} />
          <Choice label="Pair" options={PAIR_LABELS} value={pairLabel} onChange={setPairLabel} />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="In the lab, with counts, set k to 1. What happens to car · cake, two words from different topics?"
        options={[
          { label: 'It drops to 0' },
          { label: 'It stays where it was' },
          { label: 'It rises to 1, like every pair', right: true },
          { label: 'It turns negative' },
        ]}
        reveal={
          <>
            It rises to 1. One layer gives each word a single number, and in a table with no negative counts those
            numbers all share a sign, so every word points the same way. Too few layers merge everything; too many
            bring the zeros back.
          </>
        }
      />

      <h2>Words everybody uses</h2>
      <p>
        By raw counts, car’s closest word is not automobile but “{CAR_NEAREST.word}”, at {two(CAR_NEAREST.value)}:
        “the” is in every sentence, so it overlaps with everything. The fix is to weight each count by how rare its
        word is across documents, the <strong>inverse document frequency</strong>, idf = ln(N ÷ df), where N is the
        number of documents and df how many contain the word. “{IDF_THE.word}” is in all {IDF_THE.df}, so its idf is
        ln 1 = {IDF_THE.value.toFixed(0)}; “{IDF_CAR.word}” is in {IDF_CAR.df}, ln 4 = {IDF_CAR.value.toFixed(2)};
        “{IDF_ENGINE.word}” in {IDF_ENGINE.df}, ln 6 = {IDF_ENGINE.value.toFixed(2)}. Each count times its idf is{' '}
        <strong>TF-IDF</strong> (term frequency times inverse document frequency). Switch the lab to it: the row for
        “the” goes blank, and the first layer goes to the words that carry meaning.
      </p>

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Weight, then factor.</strong> Run the SVD on TF-IDF weights, not raw counts, or the strongest layers
          are spent on words like “the”.
        </li>
        <li>
          <strong>Choose k from the singular values.</strong> Keep the layers before the bars flatten out. Real
          corpora keep a few hundred dimensions out of tens of thousands of documents.
        </li>
        <li>
          <strong>Compare with the cosine.</strong> A word’s vector grows with how often it is used; the direction is
          what carries its company.
        </li>
        <li>
          <strong>A document is a wide context.</strong> Two words at opposite ends of a long article count as
          company, and a word with two senses gets one vector for both. The{' '}
          <Link to="/learnings/skip-gram">skip-gram</Link> model looks only at the few words around each word instead.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="In 50,000 furniture reviews, “sofa” and “couch” never appear in the same review, so their rows have a cosine of 0. Which change can make it positive?"
        options={[
          { label: 'Weight the counts by TF-IDF' },
          { label: 'Divide each row by its length' },
          { label: 'Keep 300 layers of the SVD', right: true },
          { label: 'Count every word twice' },
        ]}
        reveal={
          <>
            The SVD. TF-IDF, dividing by the length and doubling all multiply the entries, and a zero times anything
            is still zero, so the two rows still share nothing. Only squeezing the rows into a few shared directions
            lets the words they both appear beside, like “cushions” and “living room”, pull them together.
          </>
        }
      />
    </Article>
  )
}
