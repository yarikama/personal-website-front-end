import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Desk, { type Scene } from './Desk'
import Lab from './Lab'
import {
  ANSWER,
  ANSWERS_ONLY,
  CAREFUL_SLIPS,
  CARELESS_SLIPS,
  EVERY_TOKEN,
  EXAMPLE_NAMES,
  EXAMPLES,
  FLAN,
  INSTRUCTGPT,
  LIMA,
  MODES,
  percent,
  QUESTION,
  score,
  TAGS,
  two,
  WORKED,
  type ExampleName,
  type Mode,
} from './model'

const SCENES: Scene[] = ['ramble', 'page', 'binder', 'practise', 'answer', 'careless', 'reveal']
const [LIKELY, UNLIKELY, END] = WORKED

export default function InstructionTuning() {
  const [example, setExample] = useState<ExampleName>('One question')
  const [mode, setMode] = useState<Mode>('Answers only')
  const scoring = score(EXAMPLES[example], mode)

  return (
    <Article
      kicker="Natural language processing · Post-training"
      title="Instruction tuning"
      promise="A pretrained language model has read much of the web, yet ask it a question and it may reply with more questions. What turns it into something that answers, and how much data does that take?"
      takeaway={
        <>
          Instruction tuning keeps training a pretrained model on instructions paired with good responses, scoring
          only the <em>response</em> tokens, so it learns where an answer goes and what one looks like; the knowledge
          was already there, which is why a small, careful set goes a long way.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Post-training I: instruction tuning (FLAN-T5, Super-NaturalInstructions) and supervised fine-tuning',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: '§11.9, “Large-Scale Pretraining with Transformers”: fine-tuning, and §11.9.5 on tuning with instructions',
          url: 'https://d2l.ai/chapter_attention-mechanisms-and-transformers/large-pretraining-transformers.html',
        },
        {
          title: 'Finetuned Language Models Are Zero-Shot Learners',
          by: 'Jason Wei, Maarten Bosma, Vincent Y. Zhao, Kelvin Guu, Adams Wei Yu, Brian Lester, Nan Du, Andrew M. Dai and Quoc V. Le, ICLR 2022',
          part: 'FLAN: a 137B model tuned on over 60 datasets phrased as instructions, tested on unseen tasks',
          url: 'https://arxiv.org/abs/2109.01652',
        },
        {
          title: 'Training language models to follow instructions with human feedback',
          by: 'Long Ouyang and 19 others, NeurIPS 2022',
          part: 'InstructGPT: supervised fine-tuning on demonstrations as the first step',
          url: 'https://arxiv.org/abs/2203.02155',
        },
        {
          title: 'LIMA: Less Is More for Alignment',
          by: 'Chunting Zhou and 14 others, NeurIPS 2023',
          part: '1,000 careful examples on a 65B LLaMa; the human study against GPT-4',
          url: 'https://arxiv.org/abs/2305.11206',
        },
      ]}
    >
      <Predict
        question={`A team took a ${LIMA.billions}-billion-parameter model that only continues text and tuned it into an assistant whose answers people rated as good as GPT-4’s, or better, ${LIMA.vsGpt4}% of the time. About how many worked examples did it learn from?`}
        options={[
          { label: 'About 1,000', right: true },
          { label: 'About 100,000' },
          { label: 'About 10 million' },
          { label: 'About a billion' },
        ]}
        reveal={
          <>
            About {LIMA.examples.toLocaleString('en-US')}, each picked or written with care (LIMA, Zhou and others,
            2023). The model already knew the facts from reading; the examples only had to show it what an answer
            looks like. A help desk shows how that can be.
          </>
        }
      />

      <h2>The new desk assistant</h2>

      <Steps
        say={[
          <>
            Your library’s new desk assistant has read every book in the building, and a visitor hands them a slip: “
            {QUESTION}”
          </>,
          <>
            In the books they read, a line like that sat on a quiz page with more lines like it, so they carried on the
            page.
          </>,
          <>
            You don’t send them back to read more; you hand them a binder of {CAREFUL_SLIPS} slips, each a question
            with a good answer under it.
          </>,
          <>
            They practise: cover the answer, write one, compare, and you mark only what they wrote under the line,
            since the question was never theirs to write.
          </>,
          <>
            The next morning the same slip comes back, and they answer it: they knew the rivers all along, and the
            binder showed them where an answer goes.
          </>,
          <>
            A binder of {CARELESS_SLIPS.toLocaleString('en-US')} careless slips would have done worse, because they copy
            the form of whatever they are shown.
          </>,
          <>
            The assistant is a pretrained language model, each slip is an instruction and its response, and marking
            under the line is scoring only the response’s tokens.
          </>,
        ]}
      >
        {(step) => <Desk key={step} scene={SCENES[step]} />}
      </Steps>

      <p>
        <Link to="/learnings/pretraining-objectives">Pretraining</Link> teaches one game: guess the next word of text
        from the web. A model that plays it well continues whatever it is given, and a question is often followed by
        another question. <strong>Instruction tuning</strong>, also called <strong>supervised fine-tuning</strong>{' '}
        (SFT), keeps training the same weights, with the same next-word loss, on pairs of an instruction and a good
        response. Unlike <Link to="/learnings/in-context-learning">in-context learning</Link>, the change stays in the
        weights. FLAN (Wei and others, 2021) tuned a {FLAN.billions}-billion-parameter model on over {FLAN.datasets}{' '}
        datasets rewritten as instructions, and it beat GPT-3 with no examples on {FLAN.wins} of {FLAN.of} tasks it
        had never been tuned on.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: the loss is how surprised the model is by each token of the response, given the instruction and the
        response so far, averaged over the response alone. Surprise is minus the log of the chance the model gave the
        token, so a sure token costs almost nothing and a long shot costs a lot.
      </p>
      <Clip
        src="instruction-tuning/sft-loss"
        label={`The pretraining loss, minus the sum over every position t of log P of x t given the tokens before it, becomes the instruction-tuning loss: minus one over the size of R, times the sum over the response positions R only. For three tokens of the answer: "${LIKELY.text}" at chance ${LIKELY.chance} costs ${two(LIKELY.cost)}, "${UNLIKELY.text}" at ${UNLIKELY.chance} costs ${two(UNLIKELY.cost)}, and the end tag at ${END.chance} costs ${two(END.cost)}. The whole answer averages ${two(ANSWERS_ONLY.loss)}.`}
        caption="One change from pretraining: the sum runs over the response’s positions, while every guess still reads the whole instruction."
      />
      <p>Three tokens of the answer “{ANSWER}”, with the chances a pretrained model might give them:</p>
      <Numbers
        items={WORKED.map((w) => ({
          label: w.text,
          value: two(w.cost),
          note: `chance ${w.chance}`,
        }))}
      />
      <p>
        The end tag costs the most: it is a new token the model never met in pretraining, and learning to write it is
        learning to stop. Over all ten tokens of the answer the loss is {two(ANSWERS_ONLY.loss)}.
      </p>

      <h2>Which tokens count</h2>
      <p>
        To train on a conversation, a <strong>chat template</strong> turns it into one string, with tags that mark who
        speaks: {TAGS.user} before the user’s words, {TAGS.assistant} before the reply, {TAGS.end} after it. The tags
        are tokens added to the model’s vocabulary (see{' '}
        <Link to="/learnings/subword-tokenization">subword tokenization</Link>). In use, the app writes everything up to{' '}
        {TAGS.assistant}, and the model writes from there until it writes {TAGS.end}.
      </p>
      <Figure
        caption={
          <>
            One chip per token, whole words here for easy reading. Sage chips count toward the loss, with each one’s
            surprise under it; dashed chips are read but not scored. The chances are made up to look like a pretrained
            model’s at the start of tuning, and these tags are invented: every model has its own.
          </>
        }
      >
        <Lab
          scoring={scoring}
          label={`${example}, scoring ${mode.toLowerCase()}: ${scoring.scored} of ${scoring.tokens.length} tokens count, loss ${two(scoring.loss)} a token, ${percent(scoring.promptShare)} of it from the prompt.`}
        />
        <Controls>
          <Choice label="Example" options={EXAMPLE_NAMES} value={example} onChange={setExample} />
          <Choice label="Score" options={MODES} value={mode} onChange={setMode} />
        </Controls>
      </Figure>
      <p>
        Score every token of the story’s slip and the loss rises from {two(ANSWERS_ONLY.loss)} to{' '}
        {two(EVERY_TOKEN.loss)} a token, with {percent(EVERY_TOKEN.promptShare)} of it from the prompt: a user’s words
        are hard to foresee. Most of the training would go into learning to write users’ questions, the very habit
        the assistant had on day one. So the usual recipe masks the prompt and scores the responses, each{' '}
        {TAGS.end} included, in every turn.
      </p>

      <Predict
        kicker="Quick check"
        question={`A bug in your training code masks each ${TAGS.end} along with the prompt. What does the tuned model do in use?`}
        options={[
          { label: 'Gives its answer, then keeps writing: it never practised stopping', right: true },
          { label: 'Stops early, before the answer is done' },
          { label: 'Nothing changes: the end tag is only formatting' },
          { label: 'Refuses to answer at all' },
        ]}
        reveal={
          <>
            It answers and runs on. The app stops reading when the model writes {TAGS.end}, and a model never scored on
            writing it has no reason to: its chance stays near zero, as in pretraining. So after the answer it keeps
            going until the length limit, sometimes writing the user’s next question itself.
          </>
        }
      />

      <h2>Why a small set goes a long way</h2>
      <p>
        The facts, the grammar and the reasoning came from pretraining; tuning mostly teaches the form of a reply.
        That is how LIMA’s {LIMA.examples.toLocaleString('en-US')} careful examples were enough, and why in
        InstructGPT (Ouyang and others, 2022) people preferred a {INSTRUCTGPT.small}-billion-parameter model, tuned
        first on written demonstrations and then on their preferences, to the {INSTRUCTGPT.big}-billion GPT-3. The same
        reason cuts the other way: the model copies the form it is shown, careless or not.
      </p>
      <ul>
        <li>
          <strong>Use one template throughout.</strong> Train and serve with the model’s own tags; another model’s
          tags are tokens it never learned to read.
        </li>
        <li>
          <strong>Score the answers, end tag included.</strong> The prompt is read, never scored.
        </li>
        <li>
          <strong>Pay for quality and variety, not volume.</strong> A thousand careful, varied examples can beat a
          scraped pile, and FLAN found that each added kind of task helped on the kinds it never saw.
        </li>
        <li>
          <strong>Keep it cheap.</strong> Training only a small add-on to the weights, with{' '}
          <Link to="/learnings/lora">LoRA</Link>, is usually enough.
        </li>
      </ul>
      <p>
        Imitating one good answer has a limit: often no single reply is best, and people find it easier to say which
        of two is better. Learning from those comparisons is the next step,{' '}
        <Link to="/learnings/dpo">preference learning</Link>.
      </p>

      <Predict
        kicker="Check yourself"
        question="Your base model read almost no medical text in pretraining. You tune it on 1,000 careful medical questions and answers written by doctors. What do you get?"
        options={[
          { label: 'A reliable medical assistant: the doctors wrote the answers' },
          { label: 'An assistant that sounds like a doctor but often gets the facts wrong', right: true },
          { label: 'A model that still only continues text' },
          { label: 'Nothing: tuning needs millions of examples' },
        ]}
        reveal={
          <>
            One that sounds right and often isn’t. A thousand examples can teach the shape of a good answer because a
            base model usually knows what to put in it; this one doesn’t. It learns the doctors’ tone and layout, and
            fills them with guesses. The knowledge has to come from pretraining, or from far more text than a thousand
            slips.
          </>
        }
      />
    </Article>
  )
}
