import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  CONTEXT_TOKENS,
  EASY,
  KICKFLIP,
  NOTES,
  percent,
  PRIOR,
  RAMP,
  STAFF,
  STORY,
  TRIVIA,
  WEIGHT_COUNT,
  WHEELS,
  type Example,
} from './model'
import Shop, { type Scene } from './Shop'

const [ZERO, ONE, TWO] = STORY

const SCENES: Scene[] = [
  { title: 'Monday morning', taped: [], note: STAFF, lean: EASY, right: true },
  { title: 'What the temp knows', taped: [], note: RAMP, lean: ZERO, right: false, knows: true },
  { title: 'A new kind of note', taped: [], note: RAMP, lean: ZERO, right: false, reading: true },
  { title: 'One note taped up', taped: [KICKFLIP], note: RAMP, lean: ONE, right: false, reading: true },
  { title: 'Two notes taped up', taped: [KICKFLIP, WHEELS], note: RAMP, lean: TWO, right: true, reading: true },
  { title: 'Tuesday: a new temp', taped: [], note: RAMP, lean: ZERO, right: false, reading: true },
  { title: 'The same scene, renamed', taped: [KICKFLIP, WHEELS], note: RAMP, lean: TWO, right: true, revealed: true },
]

const NOTE_NAMES = ['Ramp', 'Board', 'Deck']

export default function InContextLearning() {
  const [chosen, setChosen] = useState<Example[]>([])
  const [noteAt, setNoteAt] = useState(0)
  const toggle = (example: Example) =>
    setChosen((now) => (now.includes(example) ? now.filter((e) => e !== example) : [...now, example]))

  return (
    <Article
      kicker="Natural language processing · Large language models"
      title="In-context learning"
      promise="Type a few solved examples into a language model’s prompt and it does a task it was never trained for. What inside it learned?"
      takeaway={
        <>
          In-context learning changes the model’s <em>input</em>, never its weights: the examples in the prompt shift
          which words a frozen model finds likely, and they leave with the prompt.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Week 12, “Prompting, In-context Learning”: zero-, one- and few-shot prompting, patterns and verbalizers',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 1, “Introduction”, §1.7 “Inference” (demonstrations, few-shot prompting, in-context learning)',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Language Models are Few-Shot Learners',
          by: 'Tom B. Brown and 30 others, NeurIPS 2020',
          part: '§2 (zero-, one- and few-shot, a 2,048-token window), §3.2 and Table 3.3 (TriviaQA)',
          url: 'https://arxiv.org/abs/2005.14165',
        },
        {
          title: 'Exploiting Cloze Questions for Few Shot Text Classification and Natural Language Inference',
          by: 'Timo Schick and Hinrich Schütze, EACL 2021',
          part: '§3 (patterns and verbalizers)',
          url: 'https://arxiv.org/abs/2001.07676',
        },
        {
          title: 'An Explanation of In-context Learning as Implicit Bayesian Inference',
          by: 'Sang Michael Xie, Aditi Raghunathan, Percy Liang and Tengyu Ma, ICLR 2022',
          part: 'Inferring from the prompt what kind of text it is: the idea behind the stand-in model',
          url: 'https://arxiv.org/abs/2111.02080',
        },
      ]}
    >
      <Predict
        question={`GPT-3 was never trained to answer trivia. Shown ${TRIVIA.fewShotK} solved trivia questions in its prompt, and no training at all, how did it do against the best system trained on the quiz itself?`}
        options={[
          { label: 'Far behind: about a third of its score' },
          { label: 'Somewhat behind: 50% to its 68%' },
          { label: `Ahead: ${Math.round(TRIVIA.fewShot)}% to its ${Math.round(TRIVIA.fineTuned)}%`, right: true },
          { label: 'It can’t: it only continues text' },
        ]}
        reveal={
          <>
            Ahead, {TRIVIA.fewShot}% to {TRIVIA.fineTuned.toFixed(1)}%, and that system could search Wikipedia while
            GPT-3 answered from memory. Its weights were the very ones it had before it saw a single question. A skate
            shop shows how that can be.
          </>
        }
      />

      <h2>The temp at the skate shop</h2>

      <Steps
        say={[
          <>
            You run a skate shop. Each morning a temp from an agency sorts customer notes into two trays: praise and
            complaints.
          </>,
          <>
            The temp reads English well. In everyday English, “sick” is bad news; only skaters use it to mean
            brilliant.
          </>,
          <>
            A note says “{RAMP.text}” The temp leans {percent(ZERO.great)} praise, and it goes in complaints. Wrong.
          </>,
          <>
            You don’t send the temp on a course. You tape one sorted note above the trays: “{KICKFLIP.text}” in
            praise. Now {percent(ONE.great)}: still complaints.
          </>,
          <>
            You tape a second: “{WHEELS.text}” in praise. Now {percent(TWO.great)}, and the ramp note goes in praise.
          </>,
          <>
            Tuesday’s temp, from the same agency, finds nothing taped up. The ramp note goes back to complaints, at{' '}
            {percent(ZERO.great)}.
          </>,
          <>
            The temp is a frozen language model, the taped notes are examples in its prompt, and each tray is a word
            it can say next. Its training never changed; only what it was reading.
          </>,
        ]}
      >
        {(step) => <Shop key={step} scene={SCENES[step]} />}
      </Steps>

      <p>
        The temp learned nothing that lasted. They always knew both meanings of “sick”; the notes showed which kind
        of English this shop speaks. That is <strong>in-context learning</strong>: a model picks up a task from
        examples placed in its input, its <em>context</em>, while every weight stays where{' '}
        <Link to="/learnings/pretraining-objectives">pretraining</Link> left it. A prompt with no examples is{' '}
        <strong>zero-shot</strong>, with one is <strong>one-shot</strong>, with a few is <strong>few-shot</strong>.
        For GPT-3 a few meant 10 to 100, as many as fit in its {CONTEXT_TOKENS.toLocaleString('en-US')}-token
        window.
      </p>

      <h2>The one line of math</h2>
      <p>
        A language model only continues text, so a label has to become words it could say next. A{' '}
        <strong>verbalizer</strong> turns each label into words (praise becomes “It was great!”), and a{' '}
        <strong>pattern</strong> turns each input into text (here, the note as written). Then, in words: put the
        solved examples in front of the new input, and pick the label whose words the model finds most likely next.
      </p>
      <Clip
        src="in-context-learning/icl-rule"
        label={`The label is the one whose word the model finds likeliest after the note: y hat equals the arg max over y of P theta of v of y, given f of x. Theta, the weights, stays fixed. The examples f of x 1, v of y 1, up to f of x k, v of y k, go in front of f of x. For the ramp note: with 0 examples, great ${ZERO.great.toFixed(2)} and terrible ${ZERO.terrible.toFixed(2)}, complaint; with 1, ${ONE.great.toFixed(2)} and ${ONE.terrible.toFixed(2)}, complaint; with 2, ${TWO.great.toFixed(2)} and ${TWO.terrible.toFixed(2)}, praise.`}
        caption="The weights θ are the same in every line. Only what the model is given, after the bar, grows."
      />
      <p>Zero-shot is the same line with no examples. For the ramp note, the chance of “great”:</p>
      <Numbers
        items={[ZERO, ONE, TWO].map((p, k) => ({
          label: `${k} ${k === 1 ? 'example' : 'examples'}`,
          value: percent(p.great),
          note: p.label,
        }))}
      />
      <p>
        Only the label words are compared. A real model also gives some chance to “a” or “so” after “It was”, and the
        rule never looks at them. So pick label words the model already uses that way: after a review, “It was great!”
        is text it has read countless times.
      </p>

      <h2>Open up the temp</h2>
      <p>
        The temp is a stand-in we wrote, small enough to check by hand: {WEIGHT_COUNT} numbers, not a trained model.
        It knows two kinds of English, everyday ({percent(PRIOR.everyday)} of what it read) and skater talk, and for
        each word how often each kind follows it with “great”. Reading a prompt, it weighs each kind by how well it
        explains the examples’ endings, then mixes their answers for the new note. A real model is a Transformer
        whose billions of weights nobody wrote, and it has no such table; Xie and others (2021) argue it behaves
        roughly like this, guessing from the prompt what kind of text it is in. What the two share is the point:
        nothing in them changes while they read.
      </p>
      <Figure
        caption={
          <>
            Add examples and watch the sage bar; the weights table never moves. Notes that both kinds of English agree
            on, the bearings and the staff, change nothing. Two slang examples also tip “filthy”, a word no example
            used. Here the order of the examples doesn’t matter; in a real model it can matter a lot (see{' '}
            <Link to="/learnings/calibrate-before-use">calibrate before use</Link>).
          </>
        }
      >
        <Lab chosen={chosen} onToggle={toggle} note={NOTES[noteAt]} />
        <Controls>
          <Choice
            label="Note to sort"
            options={[0, 1, 2]}
            value={noteAt}
            onChange={setNoteAt}
            format={(i) => NOTE_NAMES[i]}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="You want a frozen model to sort movie reviews as positive or negative, with three examples in the prompt. Which label words work best?"
        options={[
          { label: '“It was great!” and “It was terrible!”', right: true },
          { label: '“Label: 1” and “Label: 0”' },
          { label: '“Class A” and “Class B”' },
          { label: 'Any pair: the examples teach the meaning' },
        ]}
        reveal={
          <>
            “It was great!” and “It was terrible!”. The rule compares how likely the model finds each label’s words
            after a review, and a model has read countless reviews that end that way, so it starts with a lean in the
            right direction. After a review, “Label: 1” and “Class A” mean nothing in particular to it, so three
            examples would have to carry the whole task.
          </>
        }
      />

      <h2>Using it well</h2>
      <ul>
        <li>
          <strong>Write the prompt like text the model has read.</strong> A pattern and label words close to ordinary
          writing give it the most to work with. Small changes in wording or examples can swing the results; that is
          the subject of <Link to="/learnings/calibrate-before-use">calibrate before use</Link>.
        </li>
        <li>
          <strong>Send the examples every time.</strong> The model keeps nothing between prompts. A chat app seems to
          remember only because it sends the whole conversation again.
        </li>
        <li>
          <strong>Expect more from a bigger model.</strong> In GPT-3’s tests, larger models got more out of the same
          examples (<Link to="/learnings/scaling-laws">scaling laws</Link> show how their loss falls with size).
        </li>
        <li>
          <strong>Fine-tune when the examples outgrow the window.</strong> Thousands of labelled examples won’t fit in a
          prompt, and every call would pay to read them again.
        </li>
      </ul>
      <p>
        Examples can also show worked steps instead of bare answers: that is{' '}
        <Link to="/learnings/chain-of-thought">chain-of-thought prompting</Link>.
      </p>

      <Predict
        kicker="Check yourself"
        question="Sent only “big →”, a frozen model continues “big deal”. Sent “hot → cold, up → down, big →”, it answers “small”. An hour later you send “big →” alone again. What comes back?"
        options={[
          { label: '“small”: it learned opposites an hour ago' },
          { label: '“deal”: nothing from the last prompt was kept', right: true },
          { label: '“small”, but less sure: the examples are fading' },
          { label: 'Nothing: it now waits for examples' },
        ]}
        reveal={
          <>
            “deal”. The examples changed what the model read, not what it is: they left with that prompt, and the same
            weights reading “big →” alone give the same answer as before. Like Tuesday’s temp, it starts from what it
            learned in pretraining every time.
          </>
        }
      />
    </Article>
  )
}
