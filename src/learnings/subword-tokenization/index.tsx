import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Button, Choice, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  ALL_MERGES,
  CHECK_WORDS,
  encode,
  holding,
  MERGES,
  NEW_WORD,
  ORDERS,
  STAGES,
  STORY_MERGES,
  storyMerges,
  TRY_WORDS,
  vocabularySize,
} from './model'
import Shop, { type Show } from './Shop'

const STEPS: Show[] = ['orders', 'pair', 'glue', 'again', 'ten', 'new', 'named']

const [AY, PL, , IN] = MERGES
const LETTERS = STAGES[0].presses
const TEN = STAGES[STORY_MERGES].presses
const pieces = (word: string, merges = storyMerges) => encode(word, merges).join(' · ')
const pairName = (m: { left: string; right: string }) => `${m.left} + ${m.right}`
const [SAT, MAT, MAP, CAP] = CHECK_WORDS.map((e) => e.count)

// What the lab's word box accepts: lowercase letters, a word's worth
const clean = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 16)

export default function SubwordTokenization() {
  const [k, setK] = useState(0)
  const [typed, setTyped] = useState<string>(NEW_WORD)

  return (
    <Article
      kicker="Natural language processing · Transformers"
      title="Subword tokenization"
      promise="A language model reads from a fixed list of tokens, and no list holds every word people will ever write. So how does it read a word it has never seen?"
      takeaway={
        <>
          Byte-pair encoding starts from letters and keeps gluing the most frequent neighbouring pair into a new token,
          so common words end up whole and a word it never saw splits into common <em>pieces</em> instead of becoming
          UNK.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Attention and Transformers (2): word structure, UNK, subword vocabularies, and the tokenizer each pretrained model comes with',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 2, “Words and Tokens”, section 2.4, “Subword Tokenization: Byte-Pair Encoding”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Neural Machine Translation of Rare Words with Subword Units',
          by: 'Rico Sennrich, Barry Haddow and Alexandra Birch, ACL, 2016',
          part: 'Section 3.2, byte pair encoding turned from compression into word segmentation',
          url: 'https://aclanthology.org/P16-1162/',
        },
      ]}
    >
      <Predict
        question="A tokenizer learned its pieces from a list of words with “play”, “playing” and “replay” in it, but never “replaying”. What does it do with “replaying”?"
        options={[
          { label: 'Marks it unknown, like any word it never saw' },
          { label: 'Splits it into pieces it knows: re · play · ing', right: true },
          { label: 'Spells it out letter by letter' },
          { label: 'Swaps in the nearest word it knows' },
        ]}
        reveal={
          <>
            It splits it into re, play and ing: three pieces it learned because they are common in the list. Nothing in
            the method knows English. It only counted which letters sit side by side, as a box of rubber stamps will
            show.
          </>
        }
      />

      <h2>Stamping bookmarks</h2>

      <Steps
        say={[
          <>
            You stamp words onto bookmarks, one rubber letter at a time: last month’s {ORDERS} orders took {LETTERS}{' '}
            presses.
          </>,
          <>
            The two stamps you press side by side most often are a then y: {AY.count} times, across the{' '}
            {holding(AY).length} words built on play, say and stay.
          </>,
          <>
            So you glue an a stamp to a y stamp, and one press now does the work of two: the same orders take{' '}
            {STAGES[1].presses} presses.
          </>,
          <>Count again and glue again, p to l and then pl to ay, and play is a single stamp.</>,
          <>
            After {STORY_MERGES} evenings you have {STORY_MERGES} new stamps and the month takes {TEN} presses, though
            not every stamp is a real piece of English: playe is there because played and player share it.
          </>,
          <>
            Then someone orders {NEW_WORD}, which nobody ever has; you try your stamps in the order you made them and
            print it in {encode(NEW_WORD, storyMerges).length} presses: {pieces(NEW_WORD)}.
          </>,
          <>
            Each stamp is a <strong>token</strong>, the box is the <strong>vocabulary</strong>, and gluing the most
            common pair is a <strong>merge</strong>: this is <strong>byte-pair encoding</strong>, and no word is ever
            unknown to it.
          </>,
        ]}
      >
        {(step) => <Shop key={step} show={STEPS[step]} />}
      </Steps>

      <h2>Why not whole words, or letters?</h2>
      <p>
        A stamp for every word is the classic word-level vocabulary: {ORDERS} presses for the month, but a stamp for
        every word anyone will ever order, and text never runs out of new ones. Names, typos and forms built from parts
        for tense, number or negation keep coming. A word-level model turns everything missing from its list into one
        stand-in token, UNK (see <Link to="/learnings/smoothing">smoothing</Link>), so “{NEW_WORD}”, a typo and a new
        name all look the same to it.
      </p>
      <p>
        Letters fix that: {vocabularySize(0)} stamps print anything. But the month takes {LETTERS} presses, about five
        a word, so <Link to="/learnings/self-attention">self-attention</Link> reads sequences five times as long, made
        of letters that mean almost nothing alone. Merges sit in between: {vocabularySize(STORY_MERGES)} stamps,{' '}
        {TEN} presses, and any word still prints.
      </p>

      <h2>The one line of math</h2>
      <p>
        All BPE ever computes is a count. In words: a pair’s count adds up, over every word it sits in, how many times
        that word was written. Then the pair with the biggest count is glued, everywhere at once, and a tie goes to the
        pair met first:
      </p>
      <p>count(a, b) = Σ over words of (times the word was written × times a sits just before b in it)</p>
      <Numbers
        items={[AY, PL, IN].map((m) => ({
          label: pairName(m),
          value: m.count,
          note: `over ${holding(m).length} words`,
        }))}
      />
      <p>
        Each merge saves exactly its count in presses, so the first takes the month from {LETTERS} to{' '}
        {STAGES[1].presses}. Each also adds one token to the vocabulary, so the number of merges is the one setting
        you choose: {vocabularySize(0)} letters and {STORY_MERGES} merges make {vocabularySize(STORY_MERGES)} tokens.
        To split a new word, start from its letters and replay the merges in the order they were learned. The idea
        began in 1994 as a way to compress files; Sennrich, Haddow and Birch made it a tokenizer in 2016.
      </p>

      <h2>Run the merges yourself</h2>
      <p>
        Step through all {ALL_MERGES} merges on the shop’s list. The pair in sage is the one glued next. Type any word,
        or pick one, to split it with the merges learned so far.
      </p>
      <Figure
        caption={
          <>
            The pair in sage has the biggest count and is glued next; a tie goes to the pair met first, reading the list
            from the top. At {STORY_MERGES} merges {NEW_WORD} is {pieces(NEW_WORD)}; after all {ALL_MERGES} every word
            in the list is one token and {NEW_WORD} is {pieces(NEW_WORD, MERGES)}. Zebra stays in letters: no merge fits
            it.
          </>
        }
      >
        <Lab k={k} typed={typed} />
        <Controls>
          <Slider label="Merges" value={k} min={0} max={ALL_MERGES} onChange={setK} />
          <div className="flex gap-2">
            <Button onClick={() => setK(Math.max(0, k - 1))} disabled={k === 0}>
              Back
            </Button>
            <Button onClick={() => setK(Math.min(ALL_MERGES, k + 1))} disabled={k === ALL_MERGES}>
              Next merge
            </Button>
          </div>
          <Choice label="Try" options={TRY_WORDS} value={typed} onChange={setTyped} />
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">Your word</span>
            <input
              value={typed}
              onChange={(event) => setTyped(clean(event.target.value))}
              placeholder="a to z only"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-40 rounded-xl border border-zinc-300 bg-transparent px-3 py-1.5 font-mono text-[0.875rem] text-ink dark:border-zinc-200/20"
            />
          </label>
        </Controls>
      </Figure>

      <p>
        Real tokenizers run the same loop over billions of words, for tens of thousands of merges. They start from the
        256 possible bytes rather than 26 letters, so any script, emoji included, can be spelled. They also mark where
        words start or end, so the pieces can be put back together: the 2016 paper adds an end-of-word mark, and GPT’s
        tokenizers keep a word’s leading space on its first piece. WordPiece, used by <Link to="/learnings/pretraining-objectives">BERT</Link>, is a close cousin that
        scores pairs a little differently.
      </p>

      <Predict
        kicker="Quick check"
        question="You learn twice as many merges from the same text. What do you trade?"
        options={[
          { label: 'Nothing: rare words split the same way' },
          { label: 'Shorter texts, but more tokens to learn, each seen less often', right: true },
          { label: 'Longer texts, since the pieces get longer' },
          { label: 'Shorter texts, but rare words become UNK' },
        ]}
        reveal={
          <>
            Every merge saves its count in tokens, so texts get shorter. But each also adds a token the model must
            learn, and the late merges glue rare pairs: in the lab the last saves only {MERGES[ALL_MERGES - 1].count}{' '}
            presses. Rare words still split into pieces; nothing becomes UNK.
          </>
        }
      />

      <h2>Using a tokenizer well</h2>
      <ul>
        <li>
          <strong>Treat the vocabulary size as a budget.</strong> Tens of thousands of tokens for one language, more for
          many: more merges mean shorter inputs, but more tokens to learn.
        </li>
        <li>
          <strong>Always use a model’s own tokenizer.</strong> Token 1,234 is a different piece in every model, so a
          model fed another tokenizer’s numbers reads nonsense.
        </li>
        <li>
          <strong>Mind which languages it learned from.</strong> A tokenizer trained mostly on English has few merges
          for other languages, so the same sentence in them takes more tokens.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A tokenizer learns from four words: sat written ${SAT} times, mat ${MAT}, map ${MAP} and cap ${CAP}. Which pair does it glue first?`}
        options={[{ label: 'a + t' }, { label: 'm + a', right: true }, { label: 'a + p' }, { label: 's + a' }]}
        reveal={
          <>
            m + a: {MAT} times in mat plus {MAP} in map is {MAT + MAP}. a + t also sits in two words, but {SAT} + {MAT}{' '}
            is only {SAT + MAT}, and a + p is {MAP} + {CAP} = {MAP + CAP}. What counts is each pair weighted by how often
            its word was written, not how many words it appears in.
          </>
        }
      />
    </Article>
  )
}
