import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Echo from './Echo'
import Lab from './Lab'
import {
  beam,
  beamScores,
  CHECK,
  checkTotal,
  COST,
  everySentenceExponent,
  greedy,
  HIT_RATES,
  LIKELIEST_TEXT,
  PAPER,
  PERSON_TEXT,
  pct,
  perWord,
  sentence,
  STORY,
  STORY_BEAM,
  STORY_BEST,
  STORY_GREEDY,
  STORY_NODES,
  three,
  totalOf,
  TRAP,
  TRIALS,
  two,
  WORKED,
} from './model'
import Tree, { type Show } from './Tree'

// The story's figure at each step
const SHOWS: Show[] = [
  {},
  { greedy: true },
  { greedy: true, chances: 'found' },
  { greedy: true, chances: 'all', best: true },
  { width: 2, pace: 900 },
  { width: 2, chances: 'all', best: true, pace: 250 },
  { width: 2, chances: 'found', named: true, pace: 1 },
]

// The story's numbers, from the model
const tapped = greedy(STORY).steps.map((step) => step.kept[0])
const tappedChance = tapped.map((h, i) => (i === 0 ? h.chance : h.chance / tapped[i - 1].chance))
const dropped = STORY_BEAM.steps[1].candidates.slice(2)
const lastOf = (h: { words: string[] }) => h.words[h.words.length - 1]
const trap = { greedy: greedy(TRAP).result, two: beam(TRAP, 2).result, three: beam(TRAP, 3).result }
const loopRatio = totalOf(LIKELIEST_TEXT) / totalOf(PERSON_TEXT)
const [no, yes, yesImIn] = WORKED
// 0.6, 0.55: no trailing zero
const short = (p: number) => String(+p.toFixed(2))

export default function BeamSearch() {
  return (
    <Article
      kicker="Natural language processing · Translation and generation"
      title="Beam search"
      promise="A model hands you a chance for every possible next word. How do you turn that into a whole sentence that is likely as a whole, without scoring every sentence there is?"
      takeaway={
        <>
          <em>Beam search</em> keeps the k likeliest partial sentences instead of betting everything on one word at a
          time, and compares finished ones per word. It suits tasks with one right answer; in open-ended writing the
          likeliest text is dull and repeats itself.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Natural Language Generation: decoding, greedy decoding, beam search and length normalisation, and search for open-ended tasks',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 13, “Machine Translation”, §13.4 “Decoding in MT: Beam Search”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'The Curious Case of Neural Text Degeneration',
          by: 'Ari Holtzman, Jan Buys, Li Du, Maxwell Forbes and Yejin Choi, ICLR 2020',
          part: '§2.2 on open-ended and directed generation, §4.3 “Natural Language Does Not Maximize Probability”, Figure 4 and Table 1',
          url: 'https://arxiv.org/abs/1904.09751',
        },
        {
          title: 'The HARPY Speech Recognition System',
          by: 'Bruce T. Lowerre, PhD thesis, Carnegie Mellon University, 1976',
          part: 'Where beam search comes from, as Jurafsky and Martin credit it',
        },
      ]}
    >
      <Predict
        question="Your phone suggests a reply one word at a time, and you always tap its top suggestion. Do you end up with the reply your phone thinks likeliest?"
        options={[
          { label: 'Yes, always' },
          { label: 'Yes, if each word you tap has over half the chance' },
          { label: 'Not always: a weaker first word can lead to a likelier reply', right: true },
          { label: 'Only for replies under five words' },
        ]}
        reveal={
          <>
            Not always. In the story below, every word you tap has over half the chance, and the reply still loses to
            one that starts with the word you passed over.
          </>
        }
      />

      <h2>Tapping the top suggestion</h2>

      <Steps
        readable
        say={[
          <>
            Your friend texts “{STORY.context}” and your phone suggests a reply a word at a time. Here is every reply it
            could suggest, with its chance for each next word.
          </>,
          <>
            You tap the top suggestion each time: “{tapped[0].words[0]}” at {short(tappedChance[0])}, “
            {lastOf(tapped[1])}” at {short(tappedChance[1])}, “{lastOf(tapped[2])}” at {short(tappedChance[2])}.
          </>,
          <>
            The whole reply’s chance is its words’ chances multiplied:{' '}
            {tappedChance.map(short).join(' × ')} = {three(STORY_GREEDY.chance)}.
          </>,
          <>
            Multiply out every reply. “{sentence(STORY_BEST)}” comes to {three(STORY_BEST.chance)}, the likeliest of
            all, and it starts with the word you passed over.
          </>,
          <>
            A tap can’t be taken back. So write two drafts at once: add a word to each, score every result, and keep
            only the two likeliest.
          </>,
          <>
            {dropped.map((h) => `“${h.words.join(' ')}” (${two(h.chance)})`).join(' and ')} are dropped after two words.
            The two drafts left end in “{sentence(STORY_BEAM.result)}”, scoring {STORY_BEAM.scored} partial replies of
            the {STORY_NODES} there are.
          </>,
          <>
            Your phone is a <strong>decoder</strong>; each draft is a <strong>hypothesis</strong>. Tapping the top word
            is <strong>greedy decoding</strong>, and keeping the k likeliest drafts is <strong>beam search</strong>,
            here with <strong>beam width</strong> k = 2.
          </>,
        ]}
      >
        {(step) => (
          <div>
            <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">“{STORY.context}”</p>
            <div className="mt-3">
              <Tree key={step} tree={STORY} show={SHOWS[step]} />
            </div>
          </div>
        )}
      </Steps>

      <p>
        Tapping the top word is a <Link to="/learnings/greedy-choice">greedy choice</Link>: the best-looking move now,
        never revisited. It lost here because “I” was likely but left the phone unsure what came next, while “Yes” led
        to “I’m” at 0.9. A strong first word can open onto a weak sentence, and only looking further ahead shows it.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a sentence’s chance is each word’s chance, given the words before it, multiplied together. Beam search
        keeps the k partial sentences with the largest product at every step, so it scores k × V extensions a step,
        where V is the vocabulary. With {COST.vocabulary.toLocaleString('en-US')} words and {COST.length}-word sentences,
        there are about 10<sup>{everySentenceExponent}</sup> sentences; a beam of {COST.width} scores{' '}
        {(beamScores / 1e6).toLocaleString('en-US')} million.
      </p>
      <p>
        Every factor is at most 1, so each extra word can only shrink the product. A sentence that stops early pays
        fewer times. The fix, <strong>length normalisation</strong>, compares finished sentences by their average log
        chance per word: the same per-word average <Link to="/learnings/perplexity">perplexity</Link> is built on.
      </p>
      <Clip
        src="beam-search/per-word"
        label="The chance of a sentence, P of y, is the product over t from 1 to T of p of y t given the words before it. Each factor is at most 1, so every word shrinks it. Taking the log turns the product into a sum of log chances. Dividing by the length T gives the score: the average log chance per word. For two finished replies, No then the end mark has product 0.36 and score minus 0.51; Yes I'm in then the end mark has product 0.33 and score minus 0.28. The product prefers the short reply; the score prefers the long one."
        caption="Multiply, take the log, divide by the length. The short reply wins the product; the long one wins per word."
      />
      <p>Three finished replies to the same text, with the end mark counted as a word, scored per word:</p>
      <Numbers
        words
        items={WORKED.map((h) => ({
          label: sentence(h),
          value: two(perWord(h)),
          note: `a word · total ${two(h.chance)}`,
        }))}
      />
      <p>
        Multiplied, “{sentence(no)}” wins, {two(no.chance)} to {two(yesImIn.chance)}. Per word, “{sentence(yesImIn)}”
        wins, {two(perWord(yesImIn))} to {two(perWord(no))}: its words were surer, there were just more of them. A bare
        “{sentence(yes)}” loses either way.
      </p>

      <h2>Search it yourself</h2>
      <p>
        The Trap is what the decoder of an <Link to="/learnings/seq2seq">encoder–decoder</Link> might offer for the
        French idiom “{TRAP.context}”, it’s raining ropes, meaning it’s pouring.
        Greedy writes the literal “{sentence(trap.greedy)}”, a beam of 2 finds “{sentence(trap.two)}”, and only a beam
        of 3 finds “{sentence(trap.three)}”: its first two words ranked third, so a beam of 2 dropped it. Beam search is
        still a guess, only a better-informed one.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage lines are the drafts kept in the beam; dashed ones were scored and dropped. The shaded number is the
            best sentence, found by scoring every one. Try Lengths at width 1, then 2: the wider beam also finds the
            short “No”, and compared by total it takes it. Then compare per word.
          </>
        }
      >
        <Lab />
      </Figure>
      <p>
        Greedy found the likeliest reply on {pct(HIT_RATES[1])} of {TRIALS.trees.toLocaleString('en-US')} random
        trees, and a beam of 2 on {pct(HIT_RATES[2])}. Often right is why greedy is still used; never sure is why
        beams are.
      </p>

      <Predict
        kicker="Quick check"
        question="Beam search ends with four finished replies. The end mark counts as a word. Compared per word, which one does it return?"
        options={CHECK.map((c, i) => ({ label: `${c.words} words, ${c.each} each`, right: i === 2 }))}
        reveal={
          <>
            The four words at 0.7. When every word has the same chance, the per-word score is just that chance, so 0.7
            beats 0.65, 0.6 and 0.5. Multiplied, the totals are {CHECK.map((c) => two(checkTotal(c))).join(', ')}, and
            the short two-word reply would have won.
          </>
        }
      />

      <h2>When the likeliest text is the wrong text</h2>
      <p>
        A translation has close to one right answer, so the model piles its chance onto a few words at each step, and
        the likeliest sentence is usually the right one. A story has thousands of good next sentences, so each gets a
        sliver. Except one: saying again what was just said, which the model finds likelier every time it happens.
      </p>
      <Figure
        caption={
          <>
            A toy model where each step writes a whole sentence, with made-up chances. The ink bars always take the
            likeliest next sentence; the sage bars belong to four sentences a person might write. To the model the loop
            is about {Math.round(loopRatio / 1e6)} million times likelier.
          </>
        }
      >
        <Echo />
      </Figure>
      <p>
        Holtzman and colleagues measured it in GPT-2 Large, 5,000 continuations a decoder. {pct(PAPER.beamRepeats)} of
        those written by a beam of {PAPER.beamWidth} ended stuck repeating a phrase, and {pct(PAPER.greedyRepeats)} of greedy
        ones, against {(PAPER.humanRepeats * 100).toFixed(2)}% of text people wrote. People don’t write the most
        probable text; they say what the reader didn’t see coming. So open-ended writing{' '}
        <Link to="/learnings/sampling-decoding">samples</Link> the next word instead of searching for the likeliest.
      </p>

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Keep the beam small.</strong> Translation systems typically use 5 to 10. Wider costs more, and finds
          more short sentences that end early.
        </li>
        <li>
          <strong>Normalise for length.</strong> Compare finished hypotheses by average log chance per word, not by
          their product.
        </li>
        <li>
          <strong>Set finished ones aside.</strong> Hypotheses write their end mark at different steps; keep each as it
          ends, and stop at a length limit or once enough have finished.
        </li>
        <li>
          <strong>Search only where one answer is right.</strong> Translation and summaries, yes; stories and chat,
          sample instead.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A support chatbot decoded with a beam of 8 keeps ending replies with the same sentence, three or four times over. Which change helps most?"
        options={[
          { label: 'Widen the beam to 32' },
          { label: 'Switch to greedy decoding' },
          { label: 'Score finished replies per word' },
          { label: 'Sample each word in proportion to its chance', right: true },
        ]}
        reveal={
          <>
            Sampling. The loop is not a search mistake: the model itself rates it likeliest, so a wider beam finds it
            more surely, and greedy decoding is only a beam of 1 with the same goal. Scoring per word fixes a bias
            toward short replies, not repetition. Drawing each word by chance lets the reply leave the loop.
          </>
        }
      />
    </Article>
  )
}
