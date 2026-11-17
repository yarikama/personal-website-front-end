import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Arithmetic from './Arithmetic'
import Baskets from './Baskets'
import {
  BASKETS,
  BIAS,
  CHECK_PAIRS,
  CHECK_PROFILES,
  CHECK_WEIGHTS,
  CLIP_LOGS,
  COUNT_TABLES,
  ICE_STEAM,
  QUESTIONS,
  WATER_OVER_SOLID,
  WORKED_WEIGHTS,
  X_MAX,
  type CountTable,
} from './model'

const [MILK, WAX, FILTERS, BATTERIES] = BASKETS
const [WATER, SOLID, GAS, FASHION] = ICE_STEAM
const two = (x: number) => x.toFixed(2)
const signed = (x: number) => `${x < 0 ? '−' : ''}${Math.abs(x).toFixed(2)}`
const thousands = (x: number) => x.toLocaleString('en-US')

// What the story's figure shows at each step
const STORY = [
  { shown: 0, ratios: false, revealed: false },
  { shown: 1, ratios: false, revealed: false },
  { shown: 2, ratios: false, revealed: false },
  { shown: 3, ratios: false, revealed: false },
  { shown: 4, ratios: false, revealed: false },
  { shown: 4, ratios: true, revealed: false },
  { shown: 4, ratios: true, revealed: true },
]

const PARIS = CHECK_PROFILES.parisRome.map(Math.log)
const FRANCE = CHECK_PROFILES.franceItaly.map(Math.log)

export default function Glove() {
  const [question, setQuestion] = useState(0)
  const [table, setTable] = useState<CountTable>('As counted')

  return (
    <Article
      kicker="Natural language processing · Words as numbers"
      title="Meaning lives in the ratios"
      promise="Count which words turn up near which across a whole library of text. What in those counts says that ice is solid and steam is a gas?"
      takeaway={
        <>
          GloVe counts how often words meet across a whole corpus and fits vectors whose dot products give back the log
          counts, so a <em>ratio of co-occurrence probabilities</em> becomes a difference of vectors: that is why
          analogies work, and why the text’s biases come along with them.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Week 3, “Word Embeddings (2)”: GloVe and evaluating word embeddings',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 5, “Embeddings”: §5.5.3 “Other kinds of static embeddings”, §5.7 “Semantic properties of embeddings”, §5.8 “Bias and embeddings”, §5.9 “Evaluating vector models”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'GloVe: Global Vectors for Word Representation',
          by: 'Jeffrey Pennington, Richard Socher and Christopher D. Manning, EMNLP 2014',
          part: 'Table 1 (ice and steam), §3 (the model and its weighting), §4.1 (word analogies)',
          url: 'https://aclanthology.org/D14-1162/',
        },
        {
          title: 'Man is to Computer Programmer as Woman is to Homemaker? Debiasing Word Embeddings',
          by: 'Tolga Bolukbasi, Kai-Wei Chang, James Zou, Venkatesh Saligrama and Adam Kalai, 2016',
          part: '§1 and §4, gender stereotypes in word2vec and GloVe vectors',
          url: 'https://arxiv.org/abs/1607.06520',
        },
      ]}
    >
      <Predict
        question={`Across 6 billion words of text, water turns up near ice about ${Math.round(WATER_OVER_SOLID)} times as often as solid does. Which of the two does more to tell ice apart from steam?`}
        options={[
          { label: 'Water, by far' },
          { label: 'Solid', right: true },
          { label: 'Both about the same' },
          { label: 'Neither: counts can’t tell' },
        ]}
        reveal={
          <>
            Solid. Water is common near steam too ({WATER.second} per 1,000 neighbours, against {WATER.first.toFixed(1)}{' '}
            near ice), so it is only {WATER.ratio} times as likely beside ice: it says “this is about water”, not which
            form. Solid is rare everywhere, but about {Math.round(SOLID.ratio)} times as likely beside ice as beside
            steam.
          </>
        }
      />

      <h2>Two baskets</h2>

      <Steps
        say={[
          <>
            Your flatmates Mia and Leo pin their grocery receipts to the fridge, and you try to tell what each of them is
            like from those alone.
          </>,
          <>
            Milk is what they buy most: {MILK.first} of every 1,000 items Mia buys, and {MILK.second} of Leo’s.
          </>,
          <>
            Ski wax is rare: {WAX.first} in 1,000 for Mia, and just {WAX.second} for Leo.
          </>,
          <>
            Coffee filters run the other way: {FILTERS.first} for Mia, {FILTERS.second} for Leo.
          </>,
          <>Batteries are rare too, at {BATTERIES.first} in 1,000 for each of them.</>,
          <>
            Divide Mia’s share by Leo’s and the picture clears: ski wax ({WAX.ratio}) and coffee filters ({FILTERS.ratio})
            say who is who, while milk ({MILK.ratio}) and batteries ({BATTERIES.ratio}) say nothing.
          </>,
          <>
            That is how <strong>GloVe</strong> reads text: Mia and Leo are the words ice and steam, the receipts are 6
            billion words of text, and the items are the words found near them, with the same pattern of ratios.
          </>,
        ]}
      >
        {(step) => <Baskets {...STORY[step]} />}
      </Steps>

      <p>
        How often a word turns up near another is the wrong number to stare at: milk and water win that contest and say
        nothing. The <strong>ratio</strong> of two such shares carries the meaning. Far above 1 points to the first
        word, far below 1 to the second, and near 1 means the context word doesn’t care. (The ice and steam numbers are
        from the GloVe paper by Pennington, Socher and Manning, 2014: {SOLID.ratio} for solid, {GAS.ratio} for gas,{' '}
        {FASHION.ratio} for fashion.)
      </p>
      <p>
        So GloVe starts by filling in one big table, the <strong>word–word co-occurrence matrix</strong>: a row and a
        column for every word, and in cell x<sub>ij</sub> the number of times word j turned up within ten words of word
        i across the whole corpus, nearer words counting for more. <Link to="/learnings/lsa">LSA</Link> also counts, but by document, and factors its
        table with SVD. <Link to="/learnings/skip-gram">Skip-gram</Link> also uses small windows, but learns from them
        one at a time. GloVe counts every window once, then learns from the totals.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: give each word i a vector v<sub>i</sub> and each context word j a vector u<sub>j</sub>, and ask that
        their dot product be the log of how likely j is beside i. Then for any context word k, the log of a ratio turns
        into a difference of vectors:
      </p>
      <Clip
        src="glove/ratio-to-offset"
        label={`GloVe asks that u k dot v i be about log P of k given i. Subtracting the same for steam from ice gives u k dot, v ice minus v steam, about log of P of k given ice over P of k given steam. For solid that is log ${SOLID.ratio}, ${signed(CLIP_LOGS[0].log)}; for gas log ${GAS.ratio}, ${signed(CLIP_LOGS[1].log)}; for water log ${WATER.ratio}, ${signed(CLIP_LOGS[2].log)}.`}
        caption="The arrow from steam to ice leans toward solid, away from gas, and is nearly square to water: each ratio becomes how far the arrow points along one context vector."
      />
      <p>
        In practice the vectors are fitted to log counts, with one extra number per word, a bias, to soak up how common
        it is. Each pair’s miss is v<sub>i</sub> · u<sub>j</sub> + b<sub>i</sub> + c<sub>j</sub> − log x<sub>ij</sub>,
        and GloVe makes the sum of f(x<sub>ij</sub>) × miss² as small as it can, by{' '}
        <Link to="/learnings/gradient-descent">gradient descent</Link>. The weight f(x) = (x / {X_MAX})<sup>¾</sup>,
        capped at 1, does two jobs. Pairs that never met get weight 0 and drop out, so log 0 never comes up and only the
        non-empty cells are visited. And the commonest pairs, like “of the”, can’t drown out the rest:
      </p>
      <Numbers
        items={WORKED_WEIGHTS.map((w) => ({
          label: w.x === 1 ? 'Met once' : `Met ${w.x}${w.x >= X_MAX ? '+' : ''} times`,
          value: two(w.weight),
          note: w.weight === 1 ? 'the cap' : `(${w.x}/${X_MAX})^¾`,
        }))}
      />
      <p>Each word ends up with two vectors, v and u; the paper adds them to get the one it hands out.</p>

      <Predict
        kicker="Quick check"
        question={`With GloVe’s weights, the pair “of the” met ${thousands(CHECK_PAIRS.common)} times and “ice solid” met ${CHECK_PAIRS.rare} times. How much more does the first count in the fit?`}
        options={[
          { label: `${thousands(CHECK_PAIRS.common / CHECK_PAIRS.rare)} times as much` },
          { label: 'About twice as much', right: true },
          { label: 'Exactly as much' },
          { label: 'Less, as it is so common' },
        ]}
        reveal={
          <>
            About twice: f({CHECK_PAIRS.rare}) = ({CHECK_PAIRS.rare}/{X_MAX})<sup>¾</sup> ≈ {two(CHECK_WEIGHTS.rare)}, and
            f({thousands(CHECK_PAIRS.common)}) is capped at {CHECK_WEIGHTS.common}. Raw counts would give “of the”{' '}
            {thousands(CHECK_PAIRS.common / CHECK_PAIRS.rare)} times the say. The cap stops that, while the ¾ power still
            lets a well-attested pair count for more than a fluke seen once (f(1) ≈ {two(CHECK_WEIGHTS.once)}).
          </>
        }
      />

      <h2>Do the vectors mean anything?</h2>
      <p>
        You can grade word vectors by plugging them into a real task, such as a text classifier, and seeing whether it
        improves. Or you can test them directly. Similarity asks whether each word’s nearest neighbours by cosine match
        the pairs people rate as alike. Word intrusion asks whether people can spot the odd one out in a group the
        vectors put together. Analogies ask the most: a is to b the way c is to what? Go from c the way a went to b, so
        b − a + c, and take the nearest word that isn’t one of the three. On the paper’s 19,544 such questions, its best GloVe
        vectors got 75% right.
      </p>
      <p>
        Here are six words fitted with GloVe’s own loss to a made-up table of counts, in two dimensions so you can see
        them.
      </p>
      <Figure
        readable
        caption={
          <>
            The sage arrow runs from the first word to the second; the dashed copy starts at the third, and the ring is
            where it lands. Doctor and nurse sit apart along the same up–down line as man and woman only because of the
            sage-tinted counts. Even them out and the two words merge.
          </>
        }
      >
        <Arithmetic question={question} table={table} />
        <Controls>
          <Choice
            label="Question"
            options={QUESTIONS.map((_, i) => i)}
            value={question}
            onChange={setQuestion}
            format={(i) => `${QUESTIONS[i].a}:${QUESTIONS[i].b}`}
          />
          <Choice label="Counts" options={COUNT_TABLES} value={table} onChange={setTable} />
        </Controls>
      </Figure>
      <p>
        Nothing in the method knows about gender. The table only says that he turns up near doctor {BIAS.doctorLean}{' '}
        times as often as she does, and she near nurse {Math.round(1 / BIAS.nurseLean)} times as often as he. The
        arithmetic turns that lean into man : doctor :: woman : nurse, landing {two(BIAS.biasedMiss)} from nurse; evened
        out, it lands {two(BIAS.evenedMiss)} from the nearest word. Bolukbasi and colleagues found the same in real
        vectors trained on news: man : computer programmer :: woman : homemaker, and father : doctor :: mother :
        nurse.
      </p>

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Leave the question’s words out, and know that you did.</strong> b − a + c often lands nearest b
          itself, so solvers skip the three words asked about. That rule also forces a new word when the honest answer
          is b (doctor), which can make an analogy look stronger than the vectors are.
        </li>
        <li>
          <strong>Look for the leans before you ship.</strong> Measure how far words sit along a direction such as
          he − she before vectors help rank people, say for a job.
        </li>
        <li>
          <strong>One vector per spelling.</strong> GloVe gives “bank” a single vector for the river and the money.
          Vectors that change with the sentence around the word came later.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`In some text, P(k | Paris) ÷ P(k | Rome) is ${CHECK_PROFILES.parisRome.join(', ')} for k = ${CHECK_PROFILES.contexts.join(', ')}. P(k | France) ÷ P(k | Italy) is ${CHECK_PROFILES.franceItaly.join(', ')}. What will GloVe’s vectors do?`}
        options={[
          { label: 'Paris − Rome + Italy lands near France', right: true },
          { label: 'Paris − Rome + France lands near Italy' },
          { label: 'Paris − Rome is about zero: both are cities' },
          { label: 'Nothing: ratios don’t shape the vectors' },
        ]}
        reveal={
          <>
            Paris − Rome + Italy lands near France. The log ratios are {PARIS.map(signed).join(', ')} for Paris over
            Rome, and {FRANCE.map(signed).join(', ')} for France over Italy: nearly the same against every context word,
            so v<sub>Paris</sub> − v<sub>Rome</sub> ≈ v<sub>France</sub> − v<sub>Italy</sub>. Add v<sub>Italy</sub> to
            both sides. A city ratio near 1 only says the arrow is square to city.
          </>
        }
      />
    </Article>
  )
}
