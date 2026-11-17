import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import Meeting, { type Show } from './Meeting'
import {
  ASKER,
  clarity,
  FRIENDS,
  HANDOFFS,
  MASKED_BIT_DOG,
  MASKED_FIRST,
  NEAR,
  PLACED_BIT,
  PLAIN_BIT,
  pct,
  SELF_WEIGHT,
  SENTENCES,
  TABLE,
  WORKED,
  type Sentence,
} from './model'

const STEPS: Show[] = ['row', 'faded', 'room', 'ask', 'listen', 'blend', 'named']
const SENTENCE_NAMES = Object.keys(SENTENCES) as Sentence[]
const ON_OFF = ['Off', 'On'] as const
type OnOff = (typeof ON_OFF)[number]
const ASKING = [0, 1, 2, 3, 4]

const listen = (name: string) => pct(TABLE[ASKER][FRIENDS.findIndex((f) => f.name === name)])
const two = (x: number) => Number(x.toFixed(2))

export default function SelfAttention() {
  const [sentence, setSentence] = useState<Sentence>('dog bit man')
  const [positions, setPositions] = useState<OnOff>('Off')
  const [mask, setMask] = useState<OnOff>('Off')
  const [asking, setAsking] = useState(2)
  const words = SENTENCES[sentence]
  const [dog, man, the] = WORKED

  return (
    <Article
      kicker="Natural language processing · Transformers"
      title="Self-attention"
      promise="A recurrent network reads one word at a time. How can every word take what it needs from the whole sentence at once, and what is lost when it does?"
      takeaway={
        <>
          In self-attention every word scores every word’s key with its own query and takes in a blend of their values,
          all in one step; it is blind to order until each word carries a <em>position</em> vector, and a decoder masks
          the words it has not reached yet.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Attention and Transformers (1): issues with recurrent models, self-attention, and its barriers',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 7, “Transformers and Pretraining”, sections 7.1, “Attention”, and 7.4, “The input: embeddings for token and position”',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Attention Is All You Need',
          by: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser and Illia Polosukhin, NIPS, 2017',
          part: 'Sections 3.2 (attention, and the decoder’s mask), 3.5 (positional encoding, sinusoidal against learned) and 4 (path length and sequential steps against recurrent layers)',
          url: 'https://arxiv.org/abs/1706.03762',
        },
        {
          title: 'Self-Attention with Relative Position Representations',
          by: 'Peter Shaw, Jakob Uszkoreit and Ashish Vaswani, NAACL, 2018',
          part: 'Encoding the distance between two words instead of where each one sits',
          url: 'https://arxiv.org/abs/1803.02155',
        },
      ]}
    >
      <Predict
        question="A model gives each word a new vector by blending the vectors of every word in its sentence, taking more from the words that fit what it is looking for. In “the dog bit the man”, the new vector for “bit” should say who did the biting. Now feed it “the man bit the dog”. What happens to the new vector for “bit”?"
        options={[
          { label: 'It now says the man did it' },
          { label: 'It changes a little' },
          { label: 'It stays exactly the same', right: true },
          { label: 'It can’t be worked out without reading left to right' },
        ]}
        reveal={
          <>
            It stays exactly the same. A blend over the whole sentence sees which words are there, not where they stand,
            so “bit” takes in dog and man in equal parts either way. Here is how the blend works, and then how to give it
            a sense of order.
          </>
        }
      />

      <h2>A sheet down the row, or one table</h2>

      <Steps
        say={[
          <>Five friends plan a trip by passing one sheet down a row: each copies what is on it, adds a line, and hands it on.</>,
          <>
            {FRIENDS[HANDOFFS].name}, at the end, can’t start until all {HANDOFFS} handoffs are done, and Ana’s line,
            half as clear after every copy, is down to 1/{Math.round(1 / clarity(HANDOFFS))}.
          </>,
          <>So they sit round one table instead, where everyone hears everyone in a single round and nobody waits.</>,
          <>
            Each friend wears a tag for what they know ({FRIENDS.map((f) => f.tag).join(', ')}), and Dee asks the
            table: “{FRIENDS[ASKER].question}”
          </>,
          <>
            She listens to everyone, but most to the tags that fit her question: Ana and Ben {listen('Ana')} each, Cy{' '}
            {listen('Cy')}, and {listen('Eli')} each to Eli and herself.
          </>,
          <>
            Her new notes blend what each friend says in those amounts, and every other friend does the same at the same
            moment, each with a question of their own.
          </>,
          <>
            The friends are the words of a sentence: a question is a <strong>query</strong>, a tag a{' '}
            <strong>key</strong>, what a friend says a <strong>value</strong>, and the round is one layer of
            self-attention.
          </>,
        ]}
      >
        {(step) => <Meeting key={STEPS[step]} show={STEPS[step]} />}
      </Steps>

      <p>
        The row is a <Link to="/learnings/recurrent-networks">recurrent network</Link>. Each word waits for the word
        before it, so 1,000 words take 1,000 steps in turn however many processors you have, and what an early word
        wrote fades with every step; <Link to="/learnings/lstm">gates</Link> slow the fading but not the waiting. The table is <strong>self-attention</strong>, the heart of the Transformer
        (2017). Any word reaches any other in one step, and all the words do it at once.
      </p>
      <p>
        The scoring and blending are the <Link to="/learnings/attention">attention</Link> a translating decoder uses to
        look back over its source sentence. What changes is who asks whom: there the decoder asked and the source
        answered; here a sentence asks itself, so every word both asks and answers.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: each word turns its vector x into three, with three learned matrices. Its query q = Qx says what it is
        looking for, its key k = Kx what it can be found by, and its value v = Vx what it hands over once found. Word i
        scores word j by the dot product of i’s query and j’s key; then, as in attention, a softmax turns the scores into
        weights, and i’s new vector is the weighted sum of the values:
      </p>
      <p className="text-center font-serif text-xl">
        o<sub>i</sub> = Σ<sub>j</sub> softmax<sub>j</sub>(q<sub>i</sub> · k<sub>j</sub>) v<sub>j</sub>
      </p>
      <p>
        Take a toy “the dog bit the man”, where a word’s vector says whether it is a noun or a verb and which word it is.
        Q is set so that a verb’s query asks for nouns, and K so that a noun’s key says it is one. For “bit”:
      </p>
      <Numbers
        items={[
          { label: 'bit · dog', value: dog.score, note: `${pct(dog.weight)} of its weight` },
          { label: 'bit · man', value: man.score, note: `${pct(man.weight)} of its weight` },
          { label: 'bit · the', value: the.score, note: `${pct(the.weight)}, as does bit itself` },
        ]}
      />
      <p>
        Dog and man tie, so the new vector for “bit” is {pct(PLAIN_BIT[1])} dog and {pct(PLAIN_BIT[2])} man: the guess at
        the top. Nothing in the three steps knows which word came first.
      </p>
      <Clip
        src="self-attention/query-key-value"
        label="A word's vector x becomes a query, Q times x, a key, K times x, and a value, V times x. The score of word i for word j is q i dot k j; a softmax over j turns the scores into weights alpha i j, and the output o i is the sum over j of alpha i j times v j. For bit: its query dotted with dog's key is 2, with man's key 2, with the's key 0, giving weights 0.42, 0.42 and 0.06, so bit's output is 0.42 of dog's value plus 0.42 of man's plus a little of the rest."
        caption="One word, three vectors: the query asks, the keys answer, the values are what gets passed on. For “bit”, dog and man score the same, so they pass on the same amount."
      />
      <p>
        Why three vectors and not one? The query and the key differ so that a word can look for something it is not, a
        verb for a noun. The key and the value differ so that what a word is found by need not be what it passes on.
      </p>

      <Predict
        kicker="Quick check"
        question="Suppose a model skipped the three matrices and used each word’s own vector as its query, key and value. In the toy “the dog bit the man”, where would “bit” put most of its weight?"
        options={[
          { label: 'On dog, the noun before it' },
          { label: 'On itself', right: true },
          { label: 'Equally on dog and man' },
          { label: 'Equally on all five words' },
        ]}
        reveal={
          <>
            On itself, about {pct(SELF_WEIGHT)}. A vector always fits itself, and “bit” shares nothing with the other
            words, so its own score is the only one above zero. Separate query and key matrices are what let a verb ask
            for a noun instead of for more of itself.
          </>
        }
      />

      <h2>Who bit whom: positions</h2>
      <p>
        Like a <Link to="/learnings/bag-of-words">bag of words</Link>, the three steps never look at order. The fix is to
        add to each word’s vector a second vector for its place in the sentence, x̃<sub>i</sub> = x<sub>i</sub> +
        p<sub>i</sub>. The same word in two places is then two different inputs, and a query can look for a key by where
        it sits.
      </p>
      <p>
        In the toy, the place vector is a point that turns an eighth of a circle per word, and Q turns it back one step,
        so each query fits best the key one place before it. For “bit”, dog’s score rises from {dog.score} to{' '}
        {two(PLACED_BIT.dog.score)} and man’s falls to {two(PLACED_BIT.man.score)}, so dog takes{' '}
        {pct(PLACED_BIT.dog.weight)} of the weight and man {pct(PLACED_BIT.man.weight)}. Swap the nouns and it flips.
      </p>

      <Figure
        readable
        caption={
          <>
            Each row is one word asking; each cell is how much of its attention goes to the word in that column, more
            solid for more. Sage: the word you pick, with its new vector on the right, how much of each word it took in,
            and whether that vector changes when dog and man swap places. With positions off, the swap moves rows and
            columns about but leaves every word’s new vector as it was. Turn positions on and “bit” leans on the noun before it, by {NEAR} points of score.
          </>
        }
      >
        <Lab sentence={sentence} settings={{ positions: positions === 'On', mask: mask === 'On' }} asking={asking} />
        <Controls>
          <Choice label="Sentence" options={SENTENCE_NAMES} value={sentence} onChange={setSentence} />
          <Choice label="Positions" options={ON_OFF} value={positions} onChange={setPositions} />
          <Choice label="Mask" options={ON_OFF} value={mask} onChange={setMask} />
          <Choice
            label="Word asking"
            options={ASKING}
            value={asking}
            onChange={setAsking}
            format={(i) => `${i + 1} ${words[i]}`}
          />
        </Controls>
      </Figure>

      <p>
        The original Transformer built its place vectors from sine waves of many speeds; learned ones, trained along
        with everything else, did almost exactly as well (25.7 against 25.8 <Link to="/learnings/bleu">BLEU</Link> on
        its development set), and most models since learn them. A learned table has nothing for a place beyond any it
        saw in training, so some designs score the distance between two words instead.
      </p>

      <h2>Don’t read ahead: the mask</h2>
      <p>
        A model that writes text predicts each word from the words before it, as the decoder in{' '}
        <Link to="/learnings/seq2seq">seq2seq</Link> does. In training the whole sentence goes in at once, so word 3
        could simply look at word 4, the very word it should predict. So before the softmax, every score for a later word
        is set to −∞, and since e<sup>−∞</sup> = 0 its weight is exactly zero. Turn the mask on above: the cells past the
        diagonal empty, the first word puts {pct(MASKED_FIRST)} on itself, and “bit” still finds dog, now with{' '}
        {pct(MASKED_BIT_DOG)}.
      </p>
      <p>
        Every word is still worked out in the same single pass; the mask only hides. Writing new text still goes one word
        at a time, because the next word doesn’t exist until it is chosen.
      </p>

      <h2>What a layer still needs</h2>
      <ul>
        <li>
          <strong>Something besides averaging.</strong> Attention only mixes values; a small network applied to each
          word afterwards adds a nonlinear step, and the two, stacked, make a{' '}
          <Link to="/learnings/transformer-block">Transformer block</Link>.
        </li>
        <li>
          <strong>Several questions at once.</strong> One set of Q, K and V finds one kind of link; real models run
          several side by side, in <Link to="/learnings/multi-head-attention">multi-head attention</Link>.
        </li>
        <li>
          <strong>A budget for length.</strong> n words make n × n scores, which{' '}
          <Link to="/learnings/transformer-block">grows fast</Link> for long documents.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="You build a model that labels every word of a finished sentence as noun or verb, and it is given the whole sentence from the start. Should its self-attention mask the words that come later?"
        options={[
          { label: 'Yes: every self-attention layer needs the mask' },
          { label: 'Yes: without the mask the words can’t be worked out in parallel' },
          { label: 'No: nothing ahead is being predicted, so each word may see the words after it', right: true },
          { label: 'Only for the words near the end' },
        ]}
        reveal={
          <>
            No. The mask exists so a model can’t peek at the word it is being trained to predict next. A tagger predicts
            each word’s label, and the word after is a fair clue: “bit” right after “dog” says “dog” is a noun. Models
            that read a whole text, like <Link to="/learnings/pretraining-objectives">BERT</Link>, leave the mask off. And
            attention is parallel either way; the mask only lets a model that writes train in parallel too.
          </>
        }
      />
    </Article>
  )
}
