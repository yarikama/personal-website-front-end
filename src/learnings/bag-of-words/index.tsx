import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Cards, { type Show } from './Cards'
import Lab from './Lab'
import {
  BAD_NOT_GOOD,
  CARDS,
  chanceOf,
  countsOf,
  GOOD_NOT_BAD,
  LEARNED,
  LEARNED_VERDICTS,
  LIST_VERDICTS,
  MOST_UNHAPPY,
  NOT_COLD,
  NOT_COLD_CHANCE,
  NOT_COLD_LIST,
  ORDER_CHANCE,
  PAIRS,
  PANG_LEARNED,
  PANG_LISTS,
  pct,
  sameRow,
  scoreOf,
  signed,
  tally,
  VOCABULARY,
  weightOf,
  WORKED,
} from './model'

const STEPS: Show[] = ['cards', 'vocab', 'counts', 'list', 'learned', 'order', 'named']

const quote = (text: string) => `“${text}”`
const scoreOfCard = (text: string) => scoreOf(LEARNED.weights, LEARNED.bias, countsOf(text))
const [DIFFERENT] = PAIRS.filter(([a, b]) => !sameRow(a, b))

export default function BagOfWords() {
  return (
    <Article
      kicker="Natural language processing · Words as numbers"
      title="Bag of words"
      promise="A computer can only do sums. How do you turn a review into numbers it can sort, and what gets lost on the way?"
      takeaway={
        <>
          A <em>bag of words</em> turns a text into how many times it uses each word of a fixed vocabulary: enough for a
          learned weight per word to sort most texts, but the order is gone, so “good, not bad” and “bad, not good” look
          the same.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Text Classification (1): the bag-of-words representation, a word-counting predictor and logistic regression',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 4, Logistic Regression and Text Classification: 4.1 and 4.3.1, Sentiment Classification',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Thumbs up? Sentiment Classification using Machine Learning Techniques',
          by: 'Bo Pang, Lillian Lee and Shivakumar Vaithyanathan, EMNLP 2002',
          part: 'Section 4, the hand-picked word lists, and Figure 3, classifiers learned from word counts',
          url: 'https://aclanthology.org/W02-1011/',
        },
      ]}
    >
      <Predict
        question={
          <>
            A sorter turns each café review into word counts before judging it. How does it judge{' '}
            {quote(GOOD_NOT_BAD.text)} and {quote(BAD_NOT_GOOD.text)}?
          </>
        }
        options={[
          { label: 'Happy and unhappy: it reads them right' },
          { label: 'Unhappy and happy: it gets both backwards' },
          { label: 'The same, however it was trained', right: true },
          { label: 'It refuses any review with “not” in it' },
        ]}
        reveal={
          <>
            The same. Each uses good, not and bad once, so as counts the two are identical, and a sorter that only sees
            counts has to give them one verdict and get one of them wrong. Here is how a review becomes counts, and why
            that is still worth doing.
          </>
        }
      />

      <h2>Sorting comment cards</h2>

      <Steps
        say={[
          <>You run a café, and ten customers have left comment cards, each marked happy or unhappy.</>,
          <>
            A sorter can only add and multiply, so first list every word that appears on any card: {VOCABULARY.length}{' '}
            words, one column each.
          </>,
          <>
            Each card becomes a row: how many times it uses each word. {quote(CARDS[2].text)} gets a 2 under good, and 0
            under most of the rest.
          </>,
          <>
            A quick sorter: +1 for each word on your happy list, −1 for your unhappy list. It gets{' '}
            {tally(LIST_VERDICTS, 'right')} right, {tally(LIST_VERDICTS, 'wrong')} wrong, and{' '}
            {tally(LIST_VERDICTS, 'tie')} come out at 0.
          </>,
          <>
            Better: let the cards set a weight for every word, nudged until the sorter agrees with the customers. All{' '}
            {tally(LEARNED_VERDICTS, 'right')} come out right, and “{MOST_UNHAPPY}” becomes the unhappiest word of all.
          </>,
          <>
            Two new cards, {quote(GOOD_NOT_BAD.text)} and {quote(BAD_NOT_GOOD.text)}, have the same counts, so the same
            row. Both get {pct(ORDER_CHANCE)}, and the happy one is called wrong.
          </>,
          <>
            Each card is a <strong>document</strong>, your list of words the <strong>vocabulary</strong>, each row its{' '}
            <strong>bag-of-words vector</strong>, and sorting them is <strong>text classification</strong>.
          </>,
        ]}
      >
        {(step) => <Cards key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        Pour a text’s words into a bag and shake it. The bag still holds what went in, and how much of each, but the
        order they came in, the punctuation and the ends of sentences are gone. Each row is as long as the
        vocabulary and mostly zeros. A real vocabulary runs to tens of thousands of words, and one review uses a few
        hundred of them at most.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a text’s score is a starting amount plus, for every word, its weight times how many times the text
        uses it. Above zero means happy. The word list is this line with weights of +1, −1 and 0 and nothing to start
        from. The sorter that learned its weights is <Link to="/learnings/logistic-regression">logistic regression</Link>{' '}
        on the counts: it fits every weight, and the start, to the labelled cards, and turns the score into a chance with
        the sigmoid. Here it was fitted with a small penalty on the size of the weights, as in{' '}
        <Link to="/learnings/ridge-regression">ridge regression</Link>, since ten cards are easy to split perfectly and
        the weights would otherwise grow without end.
      </p>
      <Clip
        src="bag-of-words/card-score"
        label="The card Good coffee, good cake becomes counts: good 2, coffee 1, cake 1, every other word 0. In words, the score is a start plus the sum of weight times count; in symbols, z equals b plus the sum of w times x. With the learned weights, z is 0.21 plus 1.03 times 2, plus minus 0.10 times 1, plus minus 0.06 times 1, which is 2.11. The sigmoid of 2.11 is 0.89, the chance the card is happy."
        caption="Only the words on the card add anything: every other count is 0. The order they came in never enters the sum."
      />
      <p>Three cards under the learned weights, with each one’s score and chance of happy:</p>
      <Numbers
        words
        items={WORKED.map((card) => {
          const chance = chanceOf(LEARNED, countsOf(card.text))
          const right = chance >= 0.5 === card.happy
          return {
            label: quote(card.text),
            value: pct(chance),
            note: `score ${signed(scoreOfCard(card.text), 2)} · ${right ? 'right' : 'wrong'}`,
          }
        })}
      />
      <p>
        {quote(CARDS[9].text)} is unhappy only because “not” costs {signed(weightOf('not'), 2)}: will, come and back each
        add {signed(weightOf('back'), 2)}, since the happy {quote(CARDS[3].text)} used them too. And “not” costs the same
        wherever it sits, which is the whole trouble with {quote(GOOD_NOT_BAD.text)}
      </p>

      <h2>Write your own card</h2>
      <p>
        The sorters only know the {VOCABULARY.length} words on the ten cards. Any other word has no column, so it drops
        out without a trace.
      </p>
      <Figure
        caption={
          <>
            Your card as a row of counts under the vocabulary. The sage bars are words the fit made happy, the ink bars
            unhappy ones; a word your card uses is drawn solid. Try the two orders of good and not, then a word the café
            never saw.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question={<>A happy customer writes {quote(NOT_COLD.text)} What do the two sorters say?</>}
        options={[
          { label: 'Word list unhappy, learned sorter happy' },
          { label: 'Both happy' },
          { label: 'Both unhappy', right: true },
          { label: 'Word list can’t tell, learned sorter unhappy' },
        ]}
        reveal={
          <>
            Both unhappy, and both wrong. The word list sees cold and rude: {signed(NOT_COLD_LIST, 0)}. The learned sorter
            only ever saw “not” on unhappy cards, so each one counts as more bad news, and it gives the card a{' '}
            {(NOT_COLD_CHANCE * 100).toFixed(1)}% chance of happy. Neither can see which word each “not” belongs to.
          </>
        }
      />

      <h2>What people do about it</h2>
      <ul>
        <li>
          <strong>Learn the weights; don’t write them.</strong> On movie reviews, where a coin toss gets 50%, two
          people’s hand-picked word lists sorted {pct(PANG_LISTS[0])} and {pct(PANG_LISTS[1])} correctly; classifiers
          that learned a weight for every word from the counts reached {pct(PANG_LEARNED[0])} to{' '}
          {pct(PANG_LEARNED[1])}.
        </li>
        <li>
          <strong>Keep a little order.</strong> Count pairs of neighbouring words as well as single ones, so “not good”
          gets a column of its own, or mark every word between a “not” and the next comma as negated.
        </li>
        <li>
          <strong>Decide what counts as a word.</strong> Lowercasing merges Good and good, but also Apple the phone maker
          with the apple you eat. Rare words, and words never seen before, usually share one “unknown” column instead of
          vanishing.
        </li>
        <li>
          <strong>Weigh words by what they tell you.</strong> “The” is in nearly every review and says little; TF-IDF,
          on the <Link to="/learnings/lsa">LSA</Link> page, scales each count down by how common its word is.
        </li>
      </ul>
      <p>
        One weight per word is as far as a straight-line sorter goes.{' '}
        <Link to="/learnings/neural-networks">Neural networks</Link> put layers on top of the counts and learn features
        of their own.
      </p>

      <Predict
        kicker="Check yourself"
        question="Which pair of reviews gets two different bag-of-words rows?"
        options={PAIRS.map(([a, b]) => ({ label: `${quote(a)} and ${quote(b)}`, right: !sameRow(a, b) }))}
        reveal={
          <>
            {quote(DIFFERENT[0])} and {quote(DIFFERENT[1])}: the good column holds 3 against 1. Every other pair uses the
            same words the same number of times, so its two rows match exactly, though the two reviews say opposite
            things. A row that only marks whether a word appears, 1 or 0, would match even for that pair.
          </>
        }
      />
    </Article>
  )
}
