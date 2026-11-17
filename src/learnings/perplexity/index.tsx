import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Bets, { type Show } from './Bets'
import Lab from './Lab'
import {
  CHECK_PLAIN_AVERAGE,
  fraction,
  GUESS,
  grouped,
  LONG,
  LONG_ODDS,
  scoreOf,
  shown,
  SHORT_ODDS,
  STORY_PERPLEXITY,
  TRAINING,
  VOCABULARIES,
  VOCABULARY_SIZE,
  WORKED,
} from './model'

const SHOWS: Show[] = ['first', 'short', 'product', 'long', 'even', 'blind', 'named']

// The lab's numbers the prose tells
const blind = scoreOf('Blind', 'None', 0)
const bigramA = scoreOf('Bigram', 'None', 0)
const unigram = scoreOf('Unigram', 'Add-one', 0)
const bigram = scoreOf('Bigram', 'Add-one', 0)

export default function Perplexity() {
  const n = STORY_PERPLEXITY
  return (
    <Article
      kicker="Natural language processing · Predicting the next word"
      title="Perplexity"
      promise="A language model gives every test sentence a tiny probability, and it shrinks with each extra word. How do you turn that into one number that says which model predicts language better?"
      takeaway={
        <>
          Perplexity turns over the <em>per-word</em> chance a model gave text it never saw, so it reads as how many
          words the model was choosing between at each step: 1 is perfect, the size of the vocabulary is knowing
          nothing.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Language Modeling (2): evaluating sentences, and perplexity',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 3, “N-gram Language Models”, §3.3 on perplexity and §3.3.1 on the weighted branching factor',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Perplexity—a measure of the difficulty of speech recognition tasks',
          by: 'Frederick Jelinek, Robert L. Mercer, Lalit R. Bahl and James K. Baker, Journal of the Acoustical Society of America, 1977',
          part: 'Where the measure was introduced',
          url: 'https://doi.org/10.1121/1.2016299',
        },
      ]}
    >
      <Predict
        question={`Before each of the ${GUESS.words} words of a sentence, you spread bets on what comes next. All told, you gave the real sentence a 1-in-${GUESS.odds} chance. That’s as good as picking blindly, at every word, among how many words?`}
        options={[{ label: '256' }, { label: '64' }, { label: '16' }, { label: '4', right: true }]}
        reveal={
          <>
            4. A blind pick among 4 gives each word a chance of 1/4, and four of those multiply to 1/4 × 1/4 × 1/4 × 1/4
            = 1/256. Dividing 256 by 4 averages the wrong way: chances multiply, so the average that fits is the one
            that multiplies back to the total.
          </>
        }
      />

      <h2>Guessing the next word</h2>

      <Steps
        readable
        say={[
          <>
            Your friend reads a story aloud, says “The…” and stops; you spread 8 counters over the words you think come
            next, and the word is “dog”, which got 1.
          </>,
          <>
            Word by word, your share of the counters on the word that came is your chance: {fraction(1)} for dog,{' '}
            {fraction(1)} for chased, {fraction(4)} for the, {fraction(4)} for cat.
          </>,
          <>Over the sentence the chances multiply: you gave “The dog chased the cat” 1 chance in {SHORT_ODDS}.</>,
          <>
            A {LONG.length}-word sentence, guessed just as well, gets 1 in {grouped(LONG_ODDS)}: the total shrinks with
            every word, so it can’t compare a short text with a long one.
          </>,
          <>
            So ask for the one chance that, given at every word, multiplies to the same total: for both sentences it is
            1/{n}.
          </>,
          <>
            A chance of 1/{n} at every word is what a blind pick among {n} equally likely words gets you: the story kept
            you as torn as a {n}-way choice.
          </>,
          <>
            You were a language model, the story was text it never trained on, your counters were its chance for each
            next word, and that {n} is its <strong>perplexity</strong>.
          </>,
        ]}
      >
        {(step) => <Bets key={SHOWS[step]} show={SHOWS[step]} />}
      </Steps>

      <p>
        A <Link to="/learnings/n-gram-models">language model</Link> plays your game at every word: it spreads its
        probability over the vocabulary, and the share on the word that actually came is its chance. To compare two
        models, let both read the same text and see which one was less surprised.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: multiply the chances the model gave each word that came, take the root for the number of words to get
        the per-word chance, and turn it over. Lower is better.
      </p>
      <Clip
        src="perplexity/per-word-chance"
        label="One eighth times one eighth times one half times one half is one over 256. The fourth root of one over 256 is one quarter, and turned over that is 4. In symbols: perplexity equals the probability of the words w 1 to w T, to the power minus one over T, which equals e to the minus average, over the T words, of the log of each word's probability given the words before it."
        caption="The root makes the total a per-word chance; turning it over makes it a count of choices. The log form is what code computes: a product of thousands of small chances rounds to zero on a computer, while their logs add up fine."
      />
      <Numbers
        items={WORKED.map((w) => ({
          label: w.label,
          value: grouped(Math.round(w.perplexity)),
          note: w.note,
        }))}
      />
      <p>
        Those are the scale’s two ends and a middle. A model sure of every word, and right, scores 1: nothing left to
        guess. A model that knows nothing gives each of V words the chance 1/V and scores exactly V, however long the
        text. Real models land between, which is why perplexity is also called the{' '}
        <strong>effective branching factor</strong>: how many words the model was, in effect, choosing among at each
        step. And if one word gets a chance of 0, the product is 0 and perplexity is infinite, one reason models are{' '}
        <Link to="/learnings/smoothing">smoothed</Link>.
      </p>

      <h2>Score three models</h2>
      <p>
        Below, three models are counted from {TRAINING.length} short sentences: <em>Blind</em> gives each of the{' '}
        {VOCABULARY_SIZE} words the same chance (the end of a sentence counts as a word to predict); <em>Unigram</em>{' '}
        gives each word its share of all words; <em>Bigram</em> its share of the times something followed the word
        before. Each scores three sentences it never saw.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage bars: the chance given to each word that came; the dashed line, the per-word chance, 1 ÷ perplexity.
            Blind scores {shown(blind.sentence)} on every sentence. The bigram scores {shown(bigramA.sentence)} on A, but
            C has “bird chased”, a pair it never counted: one 0, and perplexity ∞ until add-one smoothing. Then all the
            held-out text scores {shown(bigram.heldOut)}, still under the unigram’s {shown(unigram.heldOut)}.
          </>
        }
      >
        <Lab />
      </Figure>
      <p>
        Watch the training column too: the counts-only bigram scores {shown(bigramA.training)} on sentences it learned
        from and ∞ on new ones. Graded on its own training text, a model is graded on answers it has memorised, so
        perplexity is always measured on held-out text.
      </p>

      <Predict
        kicker="Quick check"
        question={`Two teams report perplexity on the same news articles. Team A gets 120 with a ${grouped(VOCABULARIES[0])}-word vocabulary. Team B gets 80 after turning every word outside its ${grouped(VOCABULARIES[1])} most common into one “unknown” token. Whose model predicts the news better?`}
        options={[
          { label: 'Team A: it knows more words' },
          { label: 'Team B: lower is better' },
          { label: 'Can’t tell from these numbers', right: true },
          { label: 'They are equal' },
        ]}
        reveal={
          <>
            Can’t tell. Team B never has to say which rare word comes, only that one does, so each guess is easier. Even
            a blind model drops from {grouped(VOCABULARIES[0])} to {grouped(VOCABULARIES[1])} by shrinking the
            vocabulary alone. Two perplexities compare only on the same text, cut into the same words.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Score on held-out text.</strong> Keep test sentences out of training, or the score rewards memory.
        </li>
        <li>
          <strong>Hold the test fixed.</strong> Same text, same vocabulary, same tokens; otherwise the numbers measure
          different games.
        </li>
        <li>
          <strong>Never give a word zero chance.</strong> One impossible word makes the whole score infinite.
        </li>
        <li>
          <strong>Confirm on the real task.</strong> Lower perplexity usually means better speech recognition or
          translation, but not always, so check there too.
        </li>
      </ul>
      <p>
        The loss a neural language model trains on is the same average log-chance with its sign flipped, the{' '}
        <Link to="/learnings/logistic-regression">cross-entropy</Link>, so e to that loss is its perplexity on the
        training text: models like <Link to="/learnings/recurrent-networks">recurrent networks</Link> are trained to
        lower it directly.
      </p>

      <Predict
        kicker="Check yourself"
        question="A model reads a 3-word held-out sentence and gives the words that came chances of 1/2, 1/4 and 1/8. What is its perplexity?"
        options={[{ label: '64' }, { label: CHECK_PLAIN_AVERAGE.toFixed(2) }, { label: '4', right: true }, { label: '8' }]}
        reveal={
          <>
            4. The chances multiply to 1/64, and the per-word chance is the cube root: 1/4, since 1/4 × 1/4 × 1/4 = 1/64.
            Turned over, 4. Averaging 2, 4 and 8 the ordinary way gives {CHECK_PLAIN_AVERAGE.toFixed(2)}, but chances
            multiply, so the average has to be the one that multiplies back.
          </>
        }
      />
    </Article>
  )
}
