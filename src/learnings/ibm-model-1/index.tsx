import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Channel from './Channel'
import Lab from './Lab'
import {
  alignments,
  GUESS,
  GUESS_M,
  GUESS_N,
  linkShare,
  MENU,
  MENU_TABLES,
  oneIn,
  percent,
  SCORED,
  spelled,
  STORY_ROUNDS,
  TRAINED,
  WORKED,
} from './model'
import Story, { type Show } from './Story'

const STEPS: Show[] = ['menu', 'even', 'together', 'rounds', 'settled', 'named']

// What the story tells: "le" after one round, "vert" at the end
const LE_FIRST = percent(linkShare(MENU_TABLES[1], MENU[0], 'le', 'the'))
const VERT_LAST = percent(linkShare(TRAINED, MENU[3], 'vert', 'green'))
const GUESS_COUNT = alignments(GUESS_N, GUESS_M)
const [RIGHT, SHUFFLED, LONELY, SHORTEST] = SCORED

// "2.8 × 10^26" with the power raised
function Big({ value }: { value: number }) {
  const [front, power] = spelled(value).split('^')
  return power ? (
    <>
      {front}
      <sup>{power}</sup>
    </>
  ) : (
    <>{front}</>
  )
}

export default function IbmModel1() {
  return (
    <Article
      kicker="Natural language processing · Translation and generation"
      title="IBM Model 1"
      promise="A program sees thousands of sentences beside their translations, but nobody marks which word goes with which. How does it learn that “thé” means “tea”?"
      takeaway={
        <>
          IBM Model 1 treats which English word wrote each French word as a hidden choice, every choice equally likely,
          and <em>sums it out</em>; rounds of EM then pull tight the links between words that keep turning up together.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Machine Translation, Sequence-to-Sequence Models: the translation problem, the two components, and IBM Model 1',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 13, “Machine Translation”, Historical Notes: the noisy channel and the IBM models',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'The Mathematics of Statistical Machine Translation: Parameter Estimation',
          by: 'Peter F. Brown, Stephen A. Della Pietra, Vincent J. Della Pietra and Robert L. Mercer, Computational Linguistics 19(2), 1993',
          part: 'Section 4.1, “Model 1”: equally likely connections, the sum over alignments as a product, and training with EM',
          url: 'https://aclanthology.org/J93-2003/',
        },
      ]}
    >
      <Predict
        question={
          <>
            A menu line reads “{GUESS.french}”, and beside it “{GUESS.english}”. Say each French word was written from one
            English word, or from none. In how many ways could the words be linked?
          </>
        }
        options={[{ label: '4' }, { label: '24' }, { label: String(GUESS_COUNT), right: true }, { label: 'About 4,000' }]}
        reveal={
          <>
            {GUESS_COUNT}. Each of the {GUESS_M} French words picks where it came from on its own, out of {GUESS_N + 1}{' '}
            places: the {GUESS_N} English words or none. Two may pick the same word and links may cross, so it is{' '}
            {GUESS_N + 1} × {GUESS_N + 1} × {GUESS_N + 1} × {GUESS_N + 1}. And nothing on the menu says which one is
            right.
          </>
        }
      />

      <h2>A menu with no dictionary</h2>

      <Steps
        readable
        say={[
          <>You’re in a Paris café, and the menu gives every line in French with the English beside it, but you have no dictionary.</>,
          <>
            In “le thé” beside “the tea”, either French word could come from either English word, or from nothing, so
            every link starts out as likely as the others.
          </>,
          <>
            But look for “tea”: both lines that have it also have “thé”, and only one has “le”. A word that keeps turning
            up with “tea” is probably its partner.
          </>,
          <>
            So you tally each link by how likely it looks, weigh every link again by those tallies, and go round again.
            After one round, “le” already leans {LE_FIRST} on “the”.
          </>,
          <>
            After {STORY_ROUNDS} rounds each French word leans on one English word: “vert” {VERT_LAST} on “green”, though
            French puts it after the tea and English before.
          </>,
          <>
            Each link is an <strong>alignment</strong>, a French word pointing at the English word that wrote it; the
            tallied shares are <strong>translation probabilities</strong> t(f | e); and the whole recipe is{' '}
            <strong>IBM Model 1</strong>.
          </>,
        ]}
      >
        {(step) => <Story key={step} show={STEPS[step]} />}
      </Steps>

      <h2>The one line of math</h2>
      <p>
        The model is a story about how an English sentence e of n words writes a French sentence f of m words. Each
        French word picks a place to come from, any of the n English words or “none” (the <strong>NULL</strong> word),
        each with the same chance, 1/(n + 1). That is the bold simplification: all alignments are equally likely. Then
        the English word at that place writes the French word with chance t(f | e).
      </p>
      <p>
        Nobody sees the alignment, so to score a pair you add up every alignment it could have had. In words: for each
        French word, average the chance that each place writes it; then multiply the averages. Written out, P(f | e) =
        ∏<sub>j</sub> 1/(n + 1) · Σ<sub>i</sub> t(f<sub>j</sub> | e<sub>i</sub>).
      </p>
      <Clip
        src="ibm-model-1/sum-to-product"
        label="Every way “the tea” could have written “le thé”: with a sub i the chance English place i writes le and b sub i the chance it writes thé, place 0 being none, the nine alignments give nine products a i times b k, each one ninth likely. Each row gathers into a i times the sum of the b's, and the rows into the sum of the a's times the sum of the b's. The ninth splits into a third for each, so P is the average chance for le times the average for thé. In general, P of f given e is the product over French words of one over n plus one times the sum over English places of t of f j given e i."
        caption="Each French word picks its place on its own, so the sum of products over every alignment folds into a product of sums: one average per French word."
      />
      <p>Adding up alignments one by one soon becomes hopeless; the folded form stays small:</p>
      <Numbers
        words
        items={WORKED.map((w) => ({
          label: `${w.words} words a side`,
          value: <Big value={w.alignments} />,
          note: `alignments, or ${w.terms} t’s to add`,
        }))}
      />
      <p>
        Where do the t’s come from? If you could see the links you would count: how often “tea” wrote “thé”, over how
        often “tea” wrote anything. You can’t, so you count each link by the share the current t’s give it, divide,
        and repeat, as in the story. That loop is expectation maximization, the same one that fits a{' '}
        <Link to="/learnings/gaussian-mixtures">Gaussian mixture</Link>. For Model 1 it climbs to the same answer from
        any start without zeros, so the start can be every t equal.
      </p>

      <h2>Watch it learn</h2>
      <Figure
        readable
        caption={
          <>
            Thicker links are likelier; a sage one is likelier than not. Drop “a coffee” and “a” and “green” only ever
            share one line, so every round treats them alike and “un” stays split between them. “None” sits in every
            line, so it keeps a small share of the common words.
          </>
        }
      >
        <Lab />
      </Figure>

      <h2>From word links to a translation</h2>
      <p>
        Model 1 runs from English to French, yet you want to read French. Turn the question round: which English
        sentence most likely came out as this French? By Bayes’ rule, the best English e makes P(f | e) × P(e) largest.
        The first factor is the translation model; the second is a language model of English alone, such as an{' '}
        <Link to="/learnings/n-gram-models">n-gram model</Link>, counted from plain English text, of which there is far
        more than of translations. P(f) is the same for every candidate, so it drops out. Picture the English passing
        through a noisy line that garbles it into French: this is the <strong>noisy channel</strong> model, and
        translating is decoding the message.
      </p>
      <Figure
        caption={
          <>
            Score by the translation model and “{RIGHT.english}” ties with “{SHUFFLED.english}”, both{' '}
            {oneIn(RIGHT.translation)}. Score by the language model and the short “{SHORTEST.english}” wins, though
            nothing in it writes “vert”. Their product picks “{RIGHT.english}”; “{LONELY.english}” loses because “a” never
            wrote “le”.
          </>
        }
      >
        <Channel />
      </Figure>
      <p>
        Each half does one job. The translation model checks that every French word is accounted for; the language
        model checks that the English reads like English. Finding the best sentence among all English sentences, not
        four, is a search problem of its own, which <Link to="/learnings/beam-search">beam search</Link> handles.
      </p>

      <Predict
        kicker="Quick check"
        question="The translation model gives “the green tea” and “the tea green” exactly the same score for “le thé vert”. Why?"
        options={[
          { label: 'EM has not run for enough rounds' },
          { label: 'Every alignment is equally likely, so word order never enters', right: true },
          { label: 'The none word absorbs the difference' },
          { label: '“green” and “tea” have the same t’s' },
        ]}
        reveal={
          <>
            Each French word may come from any English place with the same chance, so reordering the English only
            reorders the terms inside each average, never the total. More rounds would not change that, and the t’s of
            “green” and “tea” are far apart. Order is left to the language model, which has never seen “tea green”.
          </>
        }
      />

      <h2>What came after</h2>
      <ul>
        <li>
          <strong>Add what Model 1 ignores, one thing at a time.</strong> IBM Models 2 to 5 add where in the sentence a
          word tends to land and how many French words one English word writes. Each is trained starting from the t’s of
          the one before, beginning with Model 1’s.
        </li>
        <li>
          <strong>Keep a none word.</strong> Some words have nothing to translate from, like an article one language
          needs and the other leaves out; without “none” they would be forced onto a real word.
        </li>
        <li>
          <strong>Feed it more lines, not more rounds.</strong> Rounds only sharpen what the lines already tell apart. A
          line where two words appear apart is what separates them.
        </li>
        <li>
          <strong>Look for alignments inside neural translation.</strong> An{' '}
          <Link to="/learnings/seq2seq">encoder–decoder</Link> network writes the translation directly, and its{' '}
          <Link to="/learnings/attention">attention</Link> weights work as a soft alignment, worked out afresh for every
          word.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A new menu has two lines: “le chat noir” beside “the black cat”, and “le chien” beside “the dog”. However many rounds of EM you run, what can Model 1 never work out?"
        options={[
          { label: 'Whether “chien” came from “dog”' },
          { label: 'Whether “chat” came from “cat” or from “black”', right: true },
          { label: 'Whether “le” came from “the” or from “dog”' },
          { label: 'Nothing: enough rounds settle every word' },
        ]}
        reveal={
          <>
            “Cat” and “black” only ever appear in the same line, so every round gives them the same tallies, and “chat”
            and “noir” stay split half and half between them. Order can’t help, since Model 1 ignores it. “Dog” is
            settled: “le” is already explained by “the”, which is in both lines, so “chien” goes to “dog”.
          </>
        }
      />
    </Article>
  )
}
