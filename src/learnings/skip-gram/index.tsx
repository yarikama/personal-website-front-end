import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Board, { type Show } from './Board'
import Lab from './Lab'
import {
  CHECK_COUNTS,
  EPOCHS,
  idOf,
  mostAlike,
  NOISE_WORDS,
  noiseShares,
  oneVectorRun,
  PAIRS,
  PAPER_K,
  PAPER_VOCAB,
  pct,
  POWER,
  sampledCost,
  SENTENCES,
  STORY_NOISE_WORDS,
  STORY_RUN,
  STORY_WORD,
  thousands,
  treeCost,
  two,
  WORKED,
  WORKED_TOTAL,
  minus2,
} from './model'
import Noise from './Noise'
import Training from './Training'
import Window from './Window'

const BOARD: Record<number, Show> = { 1: 'arrows', 2: 'pull', 3: 'push', 5: 'named' }

// Worked out once: what the story's run ends up with, and the noise numbers
const LOOKALIKE = mostAlike(STORY_RUN.v, STORY_WORD)
const PLAIN = noiseShares(1)
const SHAPED = noiseShares(POWER)
const CHECK_PLAIN = noiseShares(1, CHECK_COUNTS)[0]
const CHECK_SHAPED = noiseShares(POWER, CHECK_COUNTS)[0]
const [REAL, ...NOT_REAL] = WORKED
const list = (words: string[]) => `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`

export default function SkipGram() {
  const [power, setPower] = useState(POWER)
  const oneVector = mostAlike(oneVectorRun().v, STORY_WORD)

  return (
    <Article
      kicker="Natural language processing · Words as numbers"
      title="Skip-gram"
      promise="Nobody tells a program what “cat” means. How can it learn from text alone that “cat” is like “dog”, and do it fast enough to read a billion words?"
      takeaway={
        <>
          Skip-gram gives every word two vectors and learns them by guessing neighbours: each real pair pulls a word’s
          vector toward its neighbour’s context vector, a few noise words drawn by count to the power ¾ push it away, and
          words that keep the same <em>company</em> end up pointing the same way.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Word Embeddings (2): the skip-gram model, its objective, and negative sampling',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 5, “Embeddings”, section 5.5, “Word2vec”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Distributed Representations of Words and Phrases and their Compositionality',
          by: 'Tomas Mikolov, Ilya Sutskever, Kai Chen, Greg Corrado and Jeffrey Dean, NIPS 2013',
          part: 'Section 2, the skip-gram objective; 2.2, negative sampling and the ¾-power noise distribution; 2.3, subsampling; 3, the 692K-word vocabulary',
          url: 'https://arxiv.org/abs/1310.4546',
        },
        {
          title: 'Efficient Estimation of Word Representations in Vector Space',
          by: 'Tomas Mikolov, Kai Chen, Greg Corrado and Jeffrey Dean, 2013',
          part: 'The continuous skip-gram model',
          url: 'https://arxiv.org/abs/1301.3781',
        },
      ]}
    >
      <Predict
        question={`A program learns about words by guessing which words sit near each one. It knows ${thousands(PAPER_VOCAB)} words. Each time it sees one real pair of neighbours, how many words does it need to score to learn from it?`}
        options={[
          { label: `All ${thousands(PAPER_VOCAB)}` },
          { label: `About ${treeCost(PAPER_VOCAB)}` },
          { label: String(sampledCost(PAPER_K)), right: true },
          { label: 'Just 1' },
        ]}
        reveal={
          <>
            {sampledCost(PAPER_K)}: the real neighbour, plus {PAPER_K} words drawn at random that it learns to say no to.
            Scoring all {thousands(PAPER_VOCAB)} is the textbook version, and far too slow; about {treeCost(PAPER_VOCAB)}{' '}
            is what another shortcut, a tree of yes-or-no turns, needs. Just the one isn’t enough: with nothing to say no
            to, calling every word a neighbour scores perfectly.
          </>
        }
      />

      <h2>Guessing the neighbours</h2>

      <Steps
        readable
        say={[
          <>
            You read {SENTENCES.length} short sentences and play a game with each word: hold it up, and guess the words
            up to two places either side of it.
          </>,
          <>
            Give every word two arrows: a filled one for when it’s the word you hold, and a hollow one for when it’s a
            word you guess.
          </>,
          <>
            Call a guess likely when the two arrows point the same way, so when you see cat beside drinks, you turn cat’s
            filled arrow and drinks’s hollow one toward each other.
          </>,
          <>
            Learning what isn’t a neighbour would mean turning away every other word, so you draw three at random (
            {list(STORY_NOISE_WORDS)}) and turn just their hollow arrows away from cat.
          </>,
          <>
            Do that for all {PAIRS.length} pairs, {EPOCHS} times over: cat’s filled arrow ends up most like {LOOKALIKE}’s,
            though cat and {LOOKALIKE} never share a sentence.
          </>,
          <>
            The filled arrow is a <strong>word vector</strong> v, the hollow one a <strong>context vector</strong> u, the
            chance σ(u · v). The game is <strong>skip-gram</strong>; drawing random words is{' '}
            <strong>negative sampling</strong>.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? <Window key={step} /> : step === 4 ? <Training key={step} /> : <Board key={step} show={BOARD[step]} />
        }
      </Steps>

      <p>
        Nothing told the program that cats and dogs are animals. They come out alike because they fill the same slots:
        both drink, sleep and nap, both after “the”. That is the distributional hypothesis, which{' '}
        <Link to="/learnings/lsa">LSA</Link> gets by counting words in whole documents; skip-gram gets it from a window
        of a few words, one guess at a time.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: score a pair by how far cat’s word vector runs along drinks’s context vector, their dot product u · v;
        turn the score into a chance of yes with the <Link to="/learnings/logistic-regression">sigmoid</Link> σ; then
        make yes likely for the real neighbour and unlikely for each of the k noise words. In logs, for one pair, the
        thing <Link to="/learnings/gradient-descent">gradient ascent</Link> climbs is
      </p>
      <p className="text-center font-serif text-2xl">
        log σ(u<sub>drinks</sub> · v<sub>cat</sub>) + Σ<sub>noise w</sub> log σ(−u<sub>w</sub> · v<sub>cat</sub>)
      </p>
      <p>
        The textbook skip-gram asks a bigger question: which of all the words is the neighbour? Its answer is a softmax
        over the whole vocabulary, and the bottom of that fraction needs a score for every word,{' '}
        {thousands(PAPER_VOCAB)} of them in the original paper, for every single pair.
      </p>
      <Clip
        src="skip-gram/negative-sampling"
        label={`The chance that drinks is the neighbour of cat is e to the power u drinks dot v cat, over a sum of e to the u w dot v cat for every word w in the vocabulary: ${thousands(PAPER_VOCAB)} terms for each pair. Negative sampling replaces it with log sigma of u drinks dot v cat, a yes for the real neighbour, plus a sum over k noise words of log sigma of minus u w dot v cat, a no for each. With k equal to ${PAPER_K}, that is ${sampledCost(PAPER_K)} terms.`}
        caption="The softmax’s bottom line sums over every word; negative sampling keeps one yes and k no’s."
      />
      <p>Three of the trained model’s answers, with cat as the word held:</p>
      <Numbers
        words
        items={WORKED.map((w) => ({
          label: `${w.word}, ${w.real ? 'real' : 'noise'}`,
          value: `${pct(w.chance)} yes`,
          note: `adds ln ${two(w.real ? w.chance : 1 - w.chance)} = ${minus2(w.adds)}`,
        }))}
      />
      <p>
        Together they add up to about {minus2(WORKED_TOTAL, 1)}, where 0 would be perfect. The real neighbour gets only{' '}
        {pct(REAL.chance)}: drinks is also drawn as a noise word for cat now and then, so the model settles between the
        two lessons. What counts is the gap: more than ten times what {list(NOT_REAL.map((w) => w.word))}, never seen
        near cat, get.
      </p>

      <h2>Why two arrows a word</h2>
      <p>
        Cat and drinks sit side by side, yet they aren’t alike: one is an animal, the other something it does. With one
        arrow a word doing both jobs, every pull between neighbours drags their arrows together, and in the same
        sentences cat ends up most like {oneVector}, its neighbour, not {LOOKALIKE}. With two, cat’s word vector lines up
        with drinks’s context vector, and so does {LOOKALIKE}’s word vector: cat and {LOOKALIKE} come out alike because
        they keep the same company, not because they meet. The word vectors are what you keep, the word embeddings a{' '}
        <Link to="/learnings/neural-networks">neural network</Link> starts from.
      </p>

      <Predict
        kicker="Quick check"
        question="Suppose each word had one arrow for both jobs, all about the same length. Which word would the model rate as cat’s likeliest neighbour?"
        options={[{ label: 'Dog' }, { label: 'Drinks' }, { label: 'The' }, { label: 'Cat itself', right: true }]}
        reveal={
          <>
            Cat itself. The score is how far one arrow runs along the other, and no arrow of the same length runs further
            along cat’s than cat’s own. Yet a word is almost never its own neighbour. A separate arrow for the guessing
            job takes the problem away.
          </>
        }
      />

      <h2>Which wrong words to draw</h2>
      <p>
        Noise words are drawn at random, but not evenly. Draw by plain counts and “the”, {pct(PLAIN[idOf('the')])} of
        the words in these sentences, takes that share of the draws: pushes go to a word the model already knows well, and rare words
        are hardly ever pushed. Draw evenly and “the” comes up no more than “naps”. Word2vec takes the middle way: it
        raises each count to the power ¾ and shares out the results, which shrinks big counts more than small ones.
      </p>
      <Numbers
        items={NOISE_WORDS.map((word) => ({
          label: `“${word}”`,
          value: pct(SHAPED[idOf(word)], 1),
          note: `was ${pct(PLAIN[idOf(word)], 1)}`,
        }))}
      />
      <Figure
        readable
        caption={
          <>
            Each outline is a word’s share of the text, with its count; the sage bar is its chance of being drawn as a
            noise word. At power 1 they match, at 0 every word gets 1 in 16. The paper found ¾ beat both ends on every
            task it tried.
          </>
        }
      >
        <Noise power={power} />
        <div className="mt-4">
          <Slider label="Power" value={power} min={0} max={1} step={0.05} onChange={setPower} format={(p) => p.toFixed(2)} />
        </div>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`Two words: one seen ${CHECK_COUNTS[0]} times, the other once. By plain counts the common one is drawn ${pct(CHECK_PLAIN, 1)} of the time. With the power ¾, about how often?`}
        options={[
          { label: pct(CHECK_PLAIN, 1) },
          { label: pct(CHECK_SHAPED), right: true },
          { label: pct(CHECK_PLAIN * POWER) },
          { label: '50%' },
        ]}
        reveal={
          <>
            About {pct(CHECK_SHAPED)}. {CHECK_COUNTS[0]}
            <sup>¾</sup> is 3³ = 27, and 1<sup>¾</sup> is still 1, so the draws split 27 to 1. The power doesn’t scale the
            share by ¾; it squeezes big counts, so the rare word’s chance about triples, from {pct(1 - CHECK_PLAIN, 1)} to{' '}
            {pct(1 - CHECK_SHAPED, 1)}.
          </>
        }
      />

      <h2>Train it yourself</h2>
      <p>Skip-gram on the twelve sentences with your settings: {EPOCHS} passes over the pairs, eight numbers an arrow.</p>
      <Figure
        readable
        caption={
          <>
            Each bar is how alike a word’s word vector is to the chosen word’s, by the angle between them (the cosine, as
            in LSA). The sage bar is its look-alike, the word that fills the same slots. With no noise words every arrow
            drifts the same way and everything looks alike; with one arrow a word, words come out like their neighbours.
          </>
        }
      >
        <Lab />
      </Figure>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Pick k by the size of the text.</strong> The paper found 5 to 20 noise words a pair useful for small
          corpora, and 2 to 5 enough for big ones.
        </li>
        <li>
          <strong>Thin out the commonest words.</strong> Word2vec also skips some occurrences of very common words like
          “the” before making pairs, which speeds training and helps the rare words.
        </li>
        <li>
          <strong>Choose the window.</strong> A wider window gives more pairs and usually better vectors, for more work.
        </li>
        <li>
          <strong>Keep the word vectors.</strong> The context vectors are usually thrown away, or added to the word
          vectors.
        </li>
      </ul>
      <p>
        How to tell good vectors from bad, and what else they pick up from the text, is on the{' '}
        <Link to="/learnings/glove">GloVe</Link> page.
      </p>

      <Predict
        kicker="Check yourself"
        question="In a pile of recipes, “pinch” comes two words before “salt” in nearly every line about salt. Salt and sugar never share a line, but fill the same spots: “a pinch of salt”, “a pinch of sugar”, “stir in the sugar”. Which word’s vector ends up most like salt’s?"
        options={[
          { label: '“Pinch”, its usual neighbour' },
          { label: '“Sugar”', right: true },
          { label: '“Of”, a common word near it' },
          { label: 'All about the same' },
        ]}
        reveal={
          <>
            Sugar. Salt and sugar are never neighbours, but they have the same neighbours, so both their word vectors turn
            toward the same context vectors: pinch’s, of’s, stir’s. Pinch being salt’s neighbour lines up salt’s word
            vector with pinch’s context vector, not with pinch’s word vector.
          </>
        }
      />
    </Article>
  )
}
