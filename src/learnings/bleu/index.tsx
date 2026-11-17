import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import Marking from './Marking'
import {
  CHECK_BEST,
  CHECK_OUTPUTS,
  CHECK_REFERENCE,
  CHECK_SCORES,
  GUESS_KEY,
  GUESS_OPTIONS,
  KEY,
  LAB_PRESETS,
  labScore,
  MARKED,
  naiveShare,
  pct,
  ratio,
  SKIP,
  SKIP_AFTER,
  SKIP_BP,
  two,
  WORKED,
} from './model'

// The numbers the prose tells, worked out once
const guessAll = GUESS_OPTIONS.every((o) => {
  const s = naiveShare(o, GUESS_KEY)
  return s.matched === s.total
})
const first = MARKED[0]
const repeated = MARKED[2]
const scrambled = MARKED[3]
const short = MARKED[5]
const [synonymText, wrongText] = [LAB_PRESETS[0].text, LAB_PRESETS[1].text]
const synonym = labScore(synonymText, 1).bleu
const synonymTwo = labScore(synonymText, 2).bleu
const wrong = labScore(wrongText, 1).bleu
const [paraphrase, tooShort, reordered, wrongPlace] = CHECK_SCORES.map((s) => two(s.bleu))

export default function Bleu() {
  return (
    <Article
      kicker="Natural language processing · Translation and generation"
      title="BLEU"
      promise="A sentence can be translated well in many ways, and nobody can read millions of translations by hand. How can a program score a translation against one a person wrote, and what does that score miss?"
      takeaway={
        <>
          BLEU scores a translation by the share of its one- to four-word runs that a person’s translation also has,
          each run used up once, averaged by multiplying and charged for being short: it rewards the reference’s{' '}
          <em>wording</em>, not its meaning.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Natural Language Generation: evaluating generated text, BLEU, ROUGE and the limits of n-gram overlap; and (Extremely) Low-resource NLP, on reading BLEU numbers',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 13, “Machine Translation”, §13.6 “MT Evaluation”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Bleu: a Method for Automatic Evaluation of Machine Translation',
          by: 'Kishore Papineni, Salim Roukos, Todd Ward and Wei-Jing Zhu, ACL 2002',
          part: '§2: modified n-gram precision, the geometric mean, and the brevity penalty over a whole test set',
          url: 'https://aclanthology.org/P02-1040/',
        },
        {
          title: 'A Call for Clarity in Reporting BLEU Scores',
          by: 'Matt Post, WMT 2018',
          part: 'Why scores computed with different tokenisation don’t compare, and sacreBLEU',
          url: 'https://aclanthology.org/W18-6319/',
        },
      ]}
    >
      <Predict
        question={`A program grades a translation by the share of its words that also appear in a person’s translation, “${GUESS_KEY}”. Which of these outputs gets a perfect 100%?`}
        options={[
          { label: `“${GUESS_OPTIONS[0]}”` },
          { label: '“the” six times' },
          { label: `“${GUESS_OPTIONS[2]}”` },
          { label: 'All three', right: guessAll },
        ]}
        reveal={
          <>
            All three. Every word in each is somewhere in the person’s sentence, so a plain share can’t see an answer
            that is far too short, a word used too often, or words in the wrong order. BLEU is that share with one fix
            for each.
          </>
        }
      />

      <h2>Marking a stack of quizzes</h2>

      <Steps
        readable
        say={[
          <>
            You’re marking 300 translation quizzes against the key “{KEY}”, so you highlight each word the key also
            has: “{first.answer.join(' ')}” gets {first.words.matched} of {first.words.total}.
          </>,
          <>Then a student writes “the” six times: every word is in the key, so all 6 count.</>,
          <>
            So each key word can be used up only once: the key has two “the”s, so only {ratio(repeated.words)} of the
            answer counts.
          </>,
          <>
            “{scrambled.answer.join(' ')}” uses every key word once, so you mark pairs of neighbours too: none of its{' '}
            {scrambled.pairs.total} pairs sit side by side in the key.
          </>,
          <>Then someone writes only “the dog slept”: every word and pair matches, a perfect score for half a sentence.</>,
          <>
            So an answer shorter than the key pays a charge that grows fast: {short.answer.length} words of{' '}
            {short.key.length} keep only {pct(short.bp)} of their score.
          </>,
          <>
            The key is the <strong>reference</strong> translation, the answer a machine’s <strong>candidate</strong>,
            the shares <strong>n-gram precisions</strong>, the used-up rule <strong>clipping</strong>, the charge the{' '}
            <strong>brevity penalty</strong>: together, <strong>BLEU</strong>.
          </>,
        ]}
      >
        {(step) => <Marking key={step} step={step} />}
      </Steps>

      <p>
        A translation system, such as a <Link to="/learnings/seq2seq">sequence-to-sequence</Link> model, writes
        thousands of candidates every time it is changed, far too many for people to judge. BLEU, the bilingual
        evaluation understudy, stands in for those judges: it needs only a reference written once by a person, and it
        runs in milliseconds.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: for runs of 1, 2, 3 and 4 words (<Link to="/learnings/n-gram-models">n-grams</Link>), take the share
        of the candidate’s runs that the reference has, each reference run used up once. Average the four shares the
        multiplying way, the fourth root of their product, the same average{' '}
        <Link to="/learnings/perplexity">perplexity</Link> takes. Then multiply by the brevity penalty: 1 for a
        candidate longer than the reference, and e<sup>1 − r/c</sup> for one with c words to the reference’s r.
      </p>
      <Clip
        src="bleu/score"
        label="For the candidate a dog slept on the rug against the reference the dog slept on the rug, the four clipped shares are five sixths for words, four fifths for pairs, three quarters for runs of three and two thirds for runs of four. Their product is one third, and its fourth root is 0.76. The candidate has 6 words, like the reference, so the brevity penalty is 1 and BLEU is 0.76. In symbols: BLEU equals BP times the fourth root of p 1 p 2 p 3 p 4, which is BP times e to the sum over n of a quarter log p n; BP is 1 if c is greater than r, and e to the 1 minus r over c otherwise."
        caption="Four shares, multiplied and rooted, then charged for length. The log form is how code computes it, and the paper’s choice of weights: each n-gram length counts a quarter."
      />
      <Numbers
        words
        items={WORKED.map(({ answer, score }) => ({
          label: `“${answer}”`,
          value: two(score.bleu),
          note: `${score.shares.map(ratio).join(' · ')} · BP ${two(score.bp)}`,
        }))}
      />
      <p>
        The second candidate drops a word and still beats the first: being exact and a little short costs it only a
        factor of {two(WORKED[1].score.bp)}. The third uses every word of the reference once and scores 0: it shares no
        4-gram, and one zero makes the whole product zero. Single words can’t see order; longer runs can.
      </p>
      <p>
        Why not also ask how much of the reference the candidate covers? Systems are often scored against several
        references, and a good translation picks one wording, not all of them at once. The brevity penalty does the one
        job that coverage would, catching candidates that say too little.
      </p>

      <h2>Score a translation</h2>
      <p>Two people translated the same sentence. Pick a candidate or type your own, and add the second reference.</p>
      <Figure
        caption={
          <>
            Sage chips are n-grams a reference has, each used up once; faded ones are not. With one reference, the
            right word “final” scores {two(synonym)}, not far above the wrong “bus” at {two(wrong)}. Add the second
            reference, which says “final”, and it climbs to {two(synonymTwo)}: a run is credited as often as the
            reference that uses it most, and the length is compared with the closest reference.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={`The reference is “${CHECK_REFERENCE}”. Which candidate does BLEU score highest?`}
        options={CHECK_OUTPUTS.map((o, i) => ({ label: `“${o}”`, right: i === CHECK_BEST }))}
        reveal={
          <>
            The one that puts the keys in the wrong place, at {wrongPlace}. Swapping one word keeps 7 of 8 words and
            most longer runs. Moving the phrase breaks the runs across the seam ({reordered}); the short one pays the
            brevity penalty ({tooShort}); and the paraphrase, which says the right thing, loses most of its 3- and
            4-grams ({paraphrase}).
          </>
        }
      />

      <h2>Where counting words fails</h2>
      <p>
        BLEU sees only the surface: which words, in which order. It can’t tell that “left” and “forgot” say about the
        same thing here, or that a chair is not a table, so a synonym can cost as much as a mistake. Between two
        versions of one system that differ in small ways, that matters little. For open-ended text, a story or a reply
        in a chat, a good answer can share almost no words with the one reference, and the score says little.
      </p>
      <p>
        ROUGE, the usual score for summaries, counts the same matches but divides by the reference’s n-grams: how much
        of the reference was recovered, recall instead of precision, with the same blind spot. Newer scores compare
        words by meaning, using a trained model’s word vectors or a large language model as the judge.
      </p>

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Score a whole test set.</strong> Add up matches and n-grams over every sentence, then divide, as the
          paper does. One sentence’s score jumps with a single missing 4-gram, often straight to 0.
        </li>
        <li>
          <strong>Use more than one reference.</strong> Each extra human translation credits another right wording, as
          the second reference did for “final”.
        </li>
        <li>
          <strong>Compute it the same way.</strong> Capitals, punctuation and how words are split all move the score.
          A standard tool such as sacreBLEU fixes those choices; only numbers computed alike compare.
        </li>
        <li>
          <strong>Check what it can’t see.</strong> Read samples or ask people before trusting a big jump, and make
          sure the test sentences weren’t in the training data: a system that recites memorised answers scores high
          without translating anything.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A translator learns to skip every word it is unsure of. Its outputs, once as long as the references, are now ${pct(
          SKIP.lengthRatio
        )} as long, and its averaged share rises from ${two(SKIP.before)} to ${two(SKIP.after)}. What happens to BLEU?`}
        options={[
          { label: `Up, to ${two(SKIP.after)}` },
          { label: 'Up, to about 0.43' },
          { label: `Unchanged at ${two(SKIP.before)}` },
          { label: `Down, to about ${two(SKIP_AFTER)}`, right: SKIP_AFTER < SKIP.before },
        ]}
        reveal={
          <>
            Down. With c/r = {SKIP.lengthRatio}, the brevity penalty is e<sup>1 − 1/{SKIP.lengthRatio}</sup> ={' '}
            {two(SKIP_BP)}, and {two(SKIP.after)} × {two(SKIP_BP)} ≈ {two(SKIP_AFTER)}, below the {two(SKIP.before)} it
            had. Saying less is the easy way to raise a precision, so the charge for it is steep.
          </>
        }
      />
    </Article>
  )
}
