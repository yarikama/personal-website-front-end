import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  beachOverJoke,
  BEACH,
  CHECK_CHANCES,
  CHECK_P,
  checkKept,
  FRIENDS,
  GUESS,
  guessShare,
  JOKE_VOTES,
  percent,
  STORY_K,
  STORY_P,
  storyJokes,
  worked,
} from './model'
import Postcards, { type Show } from './Postcards'

const SHOWS: Show[] = ['votes', 'drawn', 'tail', 'five', 'fixed', 'nucleus', 'named']
const grouped = (n: number) => n.toLocaleString('en-US')
const slips = Math.round(STORY_P * FRIENDS)
const [checkTop, checkSecond] = CHECK_CHANCES
const checkHeld = CHECK_CHANCES.slice(0, checkKept).reduce((a, b) => a + b, 0)

export default function SamplingDecoding() {
  return (
    <Article
      kicker="Natural language processing · Translation and generation"
      title="Sampling the next word"
      promise="A language model gives every word some chance of coming next. When it writes, how should it pick, so the text is neither the same dull sentence every time nor nonsense?"
      takeaway={
        <>
          Draw each next word by its chance so the text stays varied, but <em>cut the tail</em> first: top-k keeps a
          fixed number of words, top-p the fewest that hold a share p, and temperature sharpens or flattens the chances
          before either.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Natural Language Generation: sampling-based decoding, top-k, top-p and temperature',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 7, “Transformers and Pretraining”, on decoding by sampling: top-k, top-p and temperature',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'The Curious Case of Neural Text Degeneration',
          by: 'Ari Holtzman, Jan Buys, Li Du, Maxwell Forbes and Yejin Choi, ICLR, 2020',
          part: 'Nucleus (top-p) sampling, why one fixed k fits no context, and why people’s text is not the likeliest text',
          url: 'https://arxiv.org/abs/1904.09751',
        },
        {
          title: 'Hierarchical Neural Story Generation',
          by: 'Angela Fan, Mike Lewis and Yann Dauphin, ACL, 2018',
          part: 'Top-k sampling from the 10 likeliest words, in place of beam search, for stories',
          url: 'https://aclanthology.org/P18-1082/',
        },
      ]}
    >
      <Predict
        question={`A language model is writing a story. A handful of sensible words could come next, and ${grouped(GUESS.nonsense)} words that make no sense there each get a chance of 1 in ${grouped(1 / GUESS.each)}. If it draws the next word by these chances, how often is that word nonsense?`}
        options={[
          { label: 'Almost never' },
          { label: 'About 1 time in 100' },
          { label: 'About 1 time in 4', right: true },
          { label: 'About 3 times in 4' },
        ]}
        reveal={
          <>
            About 1 in 4: {grouped(GUESS.nonsense)} × 1/{grouped(1 / GUESS.each)} = {guessShare}. Each nonsense word is
            nearly impossible, but there are so many that their chances add up. A postcard shows it.
          </>
        }
      />

      <h2>A hundred friends and a hat</h2>

      <Steps
        readable
        say={[
          <>
            You’re writing a postcard a word at a time, and for each blank you ask {FRIENDS} friends what comes next:
            after “{BEACH.before}”, 36 say beach and 18 say park.
          </>,
          <>
            Every answer goes on a slip in a hat and you draw one per card, so beach comes out about a third of the time;
            but of {FRIENDS} cards, {storyJokes} read like “We spent the day at the spoon.”
          </>,
          <>
            Only one friend said spoon and one said Tuesday, but {JOKE_VOTES} friends were joking, each with a different
            word, and together they hold a quarter of the slips.
          </>,
          <>
            So before you draw, you throw out every slip but the {STORY_K} most common words: the jokes are gone, and the
            cards still differ.
          </>,
          <>
            Five is the wrong number for other blanks: after “the stove is still” it lets in cold and wet, and after “my
            favourite colour is” it throws out seven good colours.
          </>,
          <>
            Instead, keep the most common words until they hold {slips} of the {FRIENDS} slips: 4 words at the beach, 1
            at the stove, 8 colours.
          </>,
          <>
            Your friends are a language model, the slips its probabilities for the next word, and a draw is{' '}
            <strong>sampling</strong>; keeping {STORY_K} words is <strong>top-k</strong>, and keeping {slips}% is{' '}
            <strong>top-p</strong>, or nucleus, sampling.
          </>,
        ]}
      >
        {(step) => <Postcards key={SHOWS[step]} show={SHOWS[step]} />}
      </Steps>

      <p>
        Why draw at all? Always taking the top word, or searching for the likeliest whole sentence with{' '}
        <Link to="/learnings/beam-search">beam search</Link>, suits a task whose input pins the answer down, like
        translation; on open-ended writing it gives the flat, looping text that page shows. Holtzman and colleagues
        found that people don’t write the likeliest text either: they keep picking words a model finds a little
        surprising. Drawing each word by its chance lets a model do the same.
      </p>
      <p>
        The danger is the tail, as the guess showed: a real vocabulary holds tens of thousands of words, and the wrong
        ones, each nearly impossible, are likely as a crowd. Top-k and top-p both cut the tail off, then scale up what is
        left so it adds to 1 again. Top-k fixes how many words survive; top-p fixes how much probability survives, so it
        keeps few words when the model is sure and many when it isn’t.
      </p>

      <h2>The one line of math: temperature</h2>
      <p>
        A model doesn’t hold slips. It gives every word a score, and a{' '}
        <Link to="/learnings/gradient-bandits">softmax</Link> turns the scores into chances. Temperature, τ, is one more
        dial: divide every score by τ before the softmax. In words, a word’s chance is e raised to its score over τ,
        divided by that same quantity summed over every word.
      </p>
      <Clip
        src="sampling-decoding/temperature-ratio"
        label={`The softmax with a temperature: p of w equals e to the s w over tau, divided by the sum over v of e to the s v over tau. For two words, beach and spoon, the sum is the same top and bottom and cancels, so p of beach over p of spoon is e to the gap in their scores over tau. With scores the logs of the slips, 36 for beach and 1 for spoon, that is 36 to the power 1 over tau: ${grouped(beachOverJoke(0.5))} times at tau 0.5, 36 times at 1, and 6 times at 2.`}
        caption="Compare any two words and the sum cancels: their odds are e to the gap in scores, over τ. Below 1 the gaps grow; above 1 they shrink."
      />
      <p>
        Say the model’s scores for the beach blank are the logs of the friends’ slips, so at τ = 1 it agrees with them.
        Then the {JOKE_VOTES} jokes together, and beach, get:
      </p>
      <Numbers
        items={worked.map((w) => ({
          label: `τ = ${w.temperature}`,
          value: percent(w.jokes),
          note: `jokes; beach ${percent(w.beach)}`,
        }))}
      />
      <p>
        Cool it toward 0 and the top word takes everything, which is greedy decoding; heat it up and every word ties. It
        never changes which word ranks first, only how far ahead it is, so it usually comes with a cut: reshape the
        chances with τ, cut the tail, and draw from what is left.
      </p>

      <h2>Turn the dials</h2>
      <p>
        Pick a blank, a cut and a temperature, and draw twelve words for the blank. The bars are the chances the draw
        uses after the cut has scaled them up.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage bars: sensible words the draw can pick; ink bars: words that make no sense there; faint bars: words the
            cut threw out. Top-p at 0.7 keeps 4 words at the beach and hot alone at the stove, where top-k at 5 keeps cold
            and wet. With top-p on, raise the temperature and watch the nucleus grow.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question="A team always takes the likeliest next word (greedy decoding). Its stories feel stiff, so it raises the temperature from 1 to 2. What happens to the stories?"
        options={[
          { label: 'They get livelier' },
          { label: 'They fill with nonsense' },
          { label: 'Nothing changes', right: true },
          { label: 'They repeat more' },
        ]}
        reveal={
          <>
            Nothing. Dividing every score by the same number keeps their order, so the likeliest word is still the
            likeliest and greedy picks it again. Temperature only matters when the word is drawn; to get variety, the
            team has to sample.
          </>
        }
      />

      <h2>Choosing the settings</h2>
      <ul>
        <li>
          <strong>Search when there is one right answer, sample when there are many.</strong> Translation and
          summaries suit greedy or beam search; stories, chat and brainstorming suit sampling.
        </li>
        <li>
          <strong>Start with top-p.</strong> The course quotes p = 0.7 and k = 50 as usual settings; Holtzman and
          colleagues sampled from p = 0.95, and Fan and colleagues wrote stories from the 10 likeliest words.
        </li>
        <li>
          <strong>Use temperature to trade surprise for safety.</strong> Below 1 the text is safer and plainer; above 1
          it takes more risks, and far above 1 even top-p’s nucleus widens into the nonsense: try 3 at the beach.
        </li>
        <li>
          <strong>Fix the seed to repeat a run.</strong> The same seed draws the same words, so two settings can be
          compared on the same luck.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A model’s next-word chances are ${CHECK_CHANCES.map(percent).join(', ')}. With top-p at ${CHECK_P}, how many words can it draw from?`}
        options={[{ label: '1' }, { label: '2' }, { label: '3', right: true }, { label: 'All 5' }]}
        reveal={
          <>
            {checkKept}. Top-p keeps the likeliest words until they hold at least {percent(CHECK_P)}: {percent(checkTop)}{' '}
            and {percent(checkSecond)} make only {percent(checkTop + checkSecond)}, so the {percent(CHECK_CHANCES[2])} word
            joins too, for {percent(checkHeld)}. Scaled up to add to 1, the top word is then drawn{' '}
            {percent(checkTop / checkHeld)} of the time.
          </>
        }
      />
    </Article>
  )
}
