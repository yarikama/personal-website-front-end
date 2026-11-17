import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Bank from './Bank'
import Lab from './Lab'
import {
  ABLATION,
  BANK_COSINE,
  BLANK_SHARE,
  CHECK_SENTENCE,
  CHECK_SPANS,
  CHECK_T5,
  CLIP_LOSS,
  CLIP_PROBS,
  GAMES,
  LAB_RATES,
  percent,
  play,
  RATE,
  SENTENCES,
  sentinel,
  SEQUENCE,
  SHARES,
  STORY,
  surprise,
  SWAP,
  text,
  TRADE,
  WRONG_SHARE,
  type GameName,
} from './model'
import Quiz, { type Scene } from './Quiz'

const SCENES: Scene[] = ['pile', 'card', 'open', 'blanks', 'swaps', 'spans', 'reveal']
const SENTENCE_NAMES = ['River', 'Money', 'Cat']
const two = (x: number) => x.toFixed(2)
const inTen = (share: number) => Math.round(share * 10)
const chosenWords = CHECK_SPANS.map(([a, b]) => CHECK_SENTENCE.slice(a, b + 1).join(' '))
// A wrong answer for the last check: one sentinel per word, as if each word were its own gap
const perWord = CHECK_SPANS.flatMap(([a, b]) => CHECK_SENTENCE.slice(a, b + 1))
const ONE_TAG_EACH = [...perWord.flatMap((w, i) => [sentinel(i), w]), sentinel(perWord.length)].join(' ')

export default function PretrainingObjectives() {
  const [game, setGame] = useState<GameName>('Masked words')
  const [sentence, setSentence] = useState(0)
  const [rate, setRate] = useState<(typeof LAB_RATES)[number]>(0.15)
  const [seed, setSeed] = useState(1)
  const played = play(game, SENTENCES[sentence], rate, seed)

  return (
    <Article
      kicker="Natural language processing · Transformers"
      title="Hide the answer, then guess it"
      promise="Pretraining teaches a Transformer from raw text, with no labels at all. What game does it play, and why can’t a model that reads in both directions play the usual one?"
      takeaway={
        <>
          Pretraining is a guessing game on raw text, and it only teaches if the answer is <em>hidden</em> from what the
          model can see: GPT hides the future, BERT blanks out words and fills them in from both sides, T5 blanks out
          phrases and writes them back.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Week 7, “Attention and Transformers (2)”: pretraining; Week 8, “Pre-trained Language Models (1) and (2)”: ELMo, BERT, GPT, T5',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 7, “Transformers and Pretraining”, §7.7; Chapter 9, “Masked Language Models”, §9.2 to §9.4',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
          by: 'Jacob Devlin, Ming-Wei Chang, Kenton Lee and Kristina Toutanova, NAACL 2019',
          part: '§3.1 (masked LM, why words would “see themselves”, the 80/10/10 rule), Appendix C.2 (Table 8)',
          url: 'https://arxiv.org/abs/1810.04805',
        },
        {
          title: 'Improving Language Understanding by Generative Pre-Training',
          by: 'Alec Radford, Karthik Narasimhan, Tim Salimans and Ilya Sutskever, OpenAI, 2018',
          part: '§3.1 and §3.2 (next-word pretraining, then fine-tuning with λ = 0.5), §4.1 (BooksCorpus, 12 layers)',
          url: 'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf',
        },
        {
          title: 'Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer',
          by: 'Colin Raffel, Noam Shazeer, Adam Roberts, Katherine Lee, Sharan Narang, Michael Matena, Yanqi Zhou, Wei Li and Peter J. Liu, JMLR 2020',
          part: '§2.4 (text to text), §3.1.4 and §3.3 (span corruption, sentinels, spans averaging three words)',
          url: 'https://arxiv.org/abs/1910.10683',
        },
        {
          title: 'Deep contextualized word representations',
          by: 'Matthew E. Peters, Mark Neumann, Mohit Iyyer, Matt Gardner, Christopher Clark, Kenton Lee and Luke Zettlemoyer, NAACL 2018',
          part: 'ELMo: two one-way LSTM language models, their states joined',
          url: 'https://arxiv.org/abs/1802.05365',
        },
      ]}
    >
      <Predict
        question="You train a model that sees the whole sentence, both sides of every word, to predict each next word. What happens?"
        options={[
          { label: 'It learns more than a left-to-right model: it has more to go on' },
          { label: 'It scores nearly perfectly and learns almost nothing', right: true },
          { label: 'It can’t be trained: the loss never goes down' },
          { label: 'It learns the same as a left-to-right model' },
        ]}
        reveal={
          <>
            It aces the game and learns nothing. The word it is asked for is already in what it reads, so it copies it.
            Here is a quiz that shows why.
          </>
        }
      />

      <h2>A quiz with no answer key</h2>

      <Steps
        say={[
          <>
            You’re making quizzes for a friend learning English, from a pile of books. Nobody wrote an answer key, but
            every sentence is its own.
          </>,
          <>
            Game one: cover the rest of the line with a card and ask for the next word. After “we sat on the” it could
            be sofa or grass; the clue is under the card.
          </>,
          <>
            So take the card away and ask again. Your friend reads each next word straight off the page, scores{' '}
            {STORY.length} out of {STORY.length}, and learns nothing.
          </>,
          <>
            Game two: blank out a few words, about one in {Math.round(1 / BLANK_SHARE)}, and ask only for those. Now
            “river” is in view, so the first blank must be bank.
          </>,
          <>
            Real books have no blanks, so sometimes you swap in a wrong word, like “{SWAP.word}”, or leave the word
            alone, and still ask. Any word might be a trap.
          </>,
          <>
            Game three: blank out whole phrases, each gap with its own tag, and have your friend write back what each
            tag hid.
          </>,
          <>
            Your friend is a Transformer and the pile is the web. The card game is GPT, the blanks are BERT, the tagged
            gaps are T5.
          </>,
        ]}
      >
        {(step) => <Quiz key={step} scene={SCENES[step]} />}
      </Steps>

      <p>
        Each game turns raw text into questions with known answers, so no one has to label anything. That is{' '}
        <strong>pretraining</strong>: play the game on billions of words, keep the network’s weights, then{' '}
        <strong>fine-tune</strong> them on a small labelled task. All three games keep one rule: the answer stays out
        of sight. The card is a decoder’s mask over the future, from{' '}
        <Link to="/learnings/self-attention">self-attention</Link>. Without it, as BERT’s authors put it, each word
        could “see itself”.
      </p>

      <h2>Why see both sides</h2>
      <p>
        <Link to="/learnings/glove">GloVe</Link> and <Link to="/learnings/skip-gram">skip-gram</Link> give each word
        one vector, so “bank” is the same by a river and on a high street. A pretrained Transformer gives each word a
        vector built from the sentence around it.
      </p>
      <Figure
        caption={
          <>
            Toy vectors in two dimensions. The ring is bank’s one fixed vector. The sage dot is bank inside “
            {SENTENCES[0].join(' ')}”, pulled toward river and boats; the ink dot is bank inside “
            {SENTENCES[1].join(' ')}”. Each is a mix of its sentence’s words, weighted toward those most like bank.
          </>
        }
      >
        <Bank />
      </Figure>
      <p>
        The two banks now point different ways: their cosine is {two(BANK_COSINE)}, where one fixed vector would give
        1. ELMo (Peters and others, 2018) got such vectors from two <Link to="/learnings/lstm">LSTM</Link> language
        models, one reading forward and one backward, joined at the end, so each half saw only one side. BERT wanted
        every layer to see both sides at once, and that rules out the card.
      </p>

      <h2>The one line of math</h2>
      <p>
        BERT’s loss is the usual <Link to="/learnings/neural-networks">cross-entropy</Link>, with two changes: it
        counts only the hidden words, and each guess is made from the whole sentence with its blanks. This is{' '}
        <strong>masked language modelling</strong>.
      </p>
      <Clip
        src="pretraining-objectives/masked-loss"
        label={`The next-word loss, L equals minus the sum over every position t of log P of x t given the words before it, becomes the masked loss: minus the sum over the hidden places M of log P of x i given the sentence with blanks. For the story's two blanks, with bank given ${CLIP_PROBS.bank} and boats ${CLIP_PROBS.boats}: ${two(surprise(CLIP_PROBS.bank))} plus ${two(surprise(CLIP_PROBS.boats))} is ${two(CLIP_LOSS)}.`}
        caption="Only the hidden places add to the loss: the other words are there to be read, not guessed."
      />
      <p>
        BERT hides {percent(RATE)} of the words. Hide fewer and each sequence yields few guesses, so training needs far
        more text; hide more and too few clues are left. For one {SEQUENCE}-word sequence, where next-word training
        gets {SEQUENCE} guesses:
      </p>
      <Numbers
        items={TRADE.map((t) => ({
          label: `Hide ${percent(t.rate)}`,
          value: t.guesses,
          note: `guesses, ${t.clues} clues`,
        }))}
      />
      <p>
        Of the words it picks, BERT blanks {inTen(SHARES.blank)} in 10 with <code>[MASK]</code>, swaps{' '}
        {inTen(SHARES.swap)} in 10 for a random word, and leaves {inTen(SHARES.kept)} in 10 alone. Wrong words are then
        only {percent(WRONG_SHARE, 1)} of the text, too rare to do harm.
      </p>

      <Predict
        kicker="Quick check"
        question="Why doesn’t BERT always replace a chosen word with [MASK]?"
        options={[
          { label: 'Fewer blanks make training faster' },
          {
            label: 'Fine-tuning text has no [MASK], so it must make sense of every real word, not just of blanks',
            right: true,
          },
          { label: 'Leaving the word in hides the answer better' },
          { label: 'So that 15% comes out exactly' },
        ]}
        reveal={
          <>
            Text at fine-tuning time never contains <code>[MASK]</code>, so a model that only ever guessed at blanks
            would have practised on input unlike what it meets. With swaps and untouched words, any word might be the
            one asked about. Leaving a word in shows the answer rather than hiding it, and the number of guesses is the
            same either way. The gain is modest: in BERT’s own test, always blanking scored {ABLATION.alwaysMask.mnli}{' '}
            against {ABLATION.mixed.mnli} once fine-tuned, but fell from {ABLATION.mixed.nerFeatures} to{' '}
            {ABLATION.alwaysMask.nerFeatures} when its vectors were used frozen.
          </>
        }
      />

      <h2>Three games side by side</h2>
      <p>
        <strong>GPT</strong> (Radford and others, 2018) plays the card game: a 12-layer decoder trained to predict
        each next word of BooksCorpus. To fine-tune it, a labelled example goes in, one new linear layer reads the
        vector at its last position, and the whole network trains on the labels, with the next-word loss kept on at
        half weight. <strong>T5</strong> (Raffel and others, 2020) uses an encoder–decoder: the encoder reads the text
        with its tagged gaps from both sides, and the decoder writes back only the missing words. T5 then makes every
        task text in, text out (“translate English to German: That is good.” gives “Das ist gut.”), so no task needs a
        new layer. Which shape suits which job is on <Link to="/learnings/transformer-block">the Transformer block</Link>
        .
      </p>
      <Figure
        caption={
          <>
            Sage tiles are what the model must guess: tinted for a blank, dashed for a swapped-in wrong word, outlined
            for a word left alone. Ink tiles are T5’s sentinels. Next word guesses every word, but each guess sees only
            its left; the hide rate changes only the other two games.
          </>
        }
      >
        <Lab
          game={played}
          label={`${game} on “${SENTENCES[sentence].join(' ')}”. The model reads: ${text(played.input)}. It must write: ${text(played.output)}.`}
        />
        <Controls>
          <Choice label="Game" options={GAMES} value={game} onChange={setGame} />
          <Choice
            label="Sentence"
            options={[0, 1, 2]}
            value={sentence}
            onChange={setSentence}
            format={(i) => SENTENCE_NAMES[i]}
          />
          <Choice label="Hide" options={LAB_RATES} value={rate} onChange={setRate} format={(r) => percent(r)} />
          <Button onClick={() => setSeed((s) => s + 1)}>Draw again</Button>
        </Controls>
      </Figure>

      <h2>Using a pretrained model</h2>
      <ul>
        <li>
          <strong>Keep its tokenizer.</strong> The model played its games on its own word pieces (see{' '}
          <Link to="/learnings/subword-tokenization">subword tokenization</Link>); another tokenizer’s numbers mean
          nothing to it.
        </li>
        <li>
          <strong>Don’t feed it GloVe vectors.</strong> Its first layer is its own table, and the layers above build
          the context. One fixed vector per word throws away what it learned to do.
        </li>
        <li>
          <strong>Start from the pretrained weights.</strong> Grammar, word senses and facts came from the game;
          fine-tuning only adapts them, which is why a few thousand labels can be enough.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`T5 is given “${CHECK_SENTENCE.join(' ')}” and drops “${chosenWords[0]}” and “${chosenWords[1]}”. What must its decoder write?`}
        options={[
          { label: text(CHECK_T5.output), right: true },
          { label: ONE_TAG_EACH },
          { label: CHECK_SENTENCE.join(' ') },
          { label: perWord.join(' ') },
        ]}
        reveal={
          <>
            {text(CHECK_T5.output)}. Its encoder reads “{text(CHECK_T5.input)}”: neighbouring dropped words share one
            sentinel, so “{chosenWords[0]}” is one gap, not two. The decoder writes each sentinel and what it hid, then
            one last sentinel to say it’s done. It never rewrites the words it could already see.
          </>
        }
      />
    </Article>
  )
}
