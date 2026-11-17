import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Controls, Figure, Numbers, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Choir, { type Scene } from './Choir'
import Lab from './Lab'
import {
  BEST_CHOIR,
  BIG_CHOIR,
  bestSplit,
  CHECK_BEST,
  CHECK_BUDGET,
  CHECK_OPTIONS,
  CHECK_RULE_N,
  CHINCHILLA,
  CHINCHILLA_RATIO,
  count,
  cut,
  EVEN_GROWTH,
  FIT,
  flops,
  FRONTIER_RATIOS,
  GOPHER,
  GOPHER_BUDGET,
  GUESS,
  GUESS_BEST,
  guessLoss,
  HOFFMANN_A,
  hoursFor,
  KAPLAN,
  KAPLAN_DATA_GROWTH,
  KAPLAN_DOUBLING,
  KAPLAN_MODEL_GROWTH,
  LAB,
  MORE,
  practiceFlaw,
  PRACTICE_PER_DOUBLING,
  QUICK_DOUBLINGS,
  QUICK_OPTIONS,
  QUICK_RIGHT,
  QUICK_START,
  ratio,
  RULE_OF_THUMB,
  sci,
  SINGER_HOURS,
  SMALL_CHOIR,
  thinFlaw,
  THIN_PER_DOUBLING,
  three,
  totalFlaw,
  two,
  whole,
  WORKED_MODELS,
} from './model'

const SCENES: Scene[] = ['budget', 'big', 'lines', 'walk', 'valley', 'named']
const GOPHER_LOG_C = Math.log10(GOPHER_BUDGET)
const GOPHER_LOG_N = Math.log10(GOPHER.n)
const GOPHER_BEST = bestSplit(GOPHER_BUDGET)
const BUDGET_RATIO = Math.round(GOPHER_BUDGET / CHECK_BUDGET)
const FRONTIER_LOW = Math.round(Math.min(...FRONTIER_RATIOS))
const FRONTIER_HIGH = Math.round(Math.max(...FRONTIER_RATIOS))

export default function ScalingLaws() {
  const [logC, setLogC] = useState(GOPHER_LOG_C)
  const [logN, setLogN] = useState(GOPHER_LOG_N)

  return (
    <Article
      kicker="Natural language processing · Large language models"
      title="Scaling laws"
      promise="You can afford to train one big language model. Should the compute go into a bigger model or into more text, and can you know before you pay?"
      takeaway={
        <>
          A language model’s loss falls as a <em>power law</em> in its parameters and in its training tokens, so a
          fixed budget of compute, C ≈ 6ND, is best spent growing both together: about {RULE_OF_THUMB} tokens per
          parameter.
        </>
      }
      sources={[
        {
          title: 'COMP 584: Natural Language Processing',
          by: 'Hanjie Chen, Rice University, Spring 2026',
          part: 'Large Language Models (1): what scaling means, the power laws of loss, and compute-optimal model size',
        },
        {
          title: 'Speech and Language Processing',
          by: 'Daniel Jurafsky and James H. Martin, 3rd edition draft',
          part: 'Chapter 1, “Introduction”, §1.1 on what a large language model is, and scaling laws',
          url: 'https://web.stanford.edu/~jurafsky/slp3/',
        },
        {
          title: 'Scaling Laws for Neural Language Models',
          by: 'Jared Kaplan, Sam McCandlish, Tom Henighan and others, 2020',
          part: 'Section 1.2, the power laws in parameters, data and compute; Section 2.1, C ≈ 6N per token; Section 6, allocating compute',
          url: 'https://arxiv.org/abs/2001.08361',
        },
        {
          title: 'Training Compute-Optimal Large Language Models',
          by: 'Jordan Hoffmann, Sebastian Borgeaud, Arthur Mensch and others, 2022',
          part: 'Sections 2 and 3, the three fits and Tables 1 to 3; Section 4, Chinchilla against Gopher',
          url: 'https://arxiv.org/abs/2203.15556',
        },
        {
          title: 'Chinchilla Scaling: A replication attempt',
          by: 'Tamay Besiroglu, Ege Erdil, Matthew Barnett and Josh You, 2024',
          part: 'Equation 3, the refitted law the figures draw',
          url: 'https://arxiv.org/abs/2404.10102',
        },
      ]}
    >
      <Predict
        question={`DeepMind trained Gopher, ${count(GOPHER.n)} parameters, on ${count(GOPHER.d)} tokens of text. With exactly the same compute, which model would end with the lowest loss?`}
        options={GUESS.map((s) => ({ label: s.label, right: s === GUESS_BEST }))}
        reveal={
          <>
            The 70-billion-parameter one. By a law fitted to DeepMind’s own training runs, the four end at{' '}
            {GUESS.map((s) => three(guessLoss(s))).join(', ')}, in that order. DeepMind built it:
            Chinchilla, {count(CHINCHILLA.n)} parameters on {count(CHINCHILLA.d)} tokens for about Gopher’s compute,
            beat Gopher on nearly every test. Smaller helps only up to a point: the 7-billion model is worse again.
          </>
        }
      />

      <h2>A choir on a budget</h2>

      <Steps
        readable
        say={[
          <>
            You’re hiring a choir for one concert, with money for {whole(SINGER_HOURS)} singer-hours: every singer is
            paid for every hour the choir rehearses.
          </>,
          <>
            Hire {BIG_CHOIR} singers for {whole(hoursFor(BIG_CHOIR))} hours each and the sound is full, but they barely
            know the piece: the wrong-note flaw, {three(practiceFlaw(BIG_CHOIR))}, dwarfs the thin-sound one,{' '}
            {three(thinFlaw(BIG_CHOIR))}.
          </>,
          <>
            Each flaw shrinks by a fixed share whenever you double what feeds it: {cut(THIN_PER_DOUBLING)} for twice
            the singers, {cut(PRACTICE_PER_DOUBLING)} for twice the hours. On these axes, where equal steps are equal
            multiples, both are straight lines.
          </>,
          <>
            But the budget is fixed, so every singer you add takes hours from the rest. Walk down to {SMALL_CHOIR}{' '}
            singers rehearsing {whole(hoursFor(SMALL_CHOIR))} hours: the wrong notes fade, the thin sound swells, and
            the total is {three(totalFlaw(SMALL_CHOIR))}.
          </>,
          <>
            Add the two and the total sags into a valley. Its bottom, {Math.round(BEST_CHOIR)} singers for{' '}
            {whole(hoursFor(BEST_CHOIR))} hours, is where the flaws come out about equal, {three(thinFlaw(BEST_CHOIR))}{' '}
            and {three(practiceFlaw(BEST_CHOIR))}, for a total of {three(totalFlaw(BEST_CHOIR))}.
          </>,
          <>
            The choir is a language model: a singer is a billion <strong>parameters</strong>, an hour a billion
            training <strong>tokens</strong>, and singer-hours are <strong>compute</strong>. {BIG_CHOIR} by{' '}
            {whole(hoursFor(BIG_CHOIR))} is Gopher; the valley’s bottom is about where DeepMind put Chinchilla.
          </>,
        ]}
      >
        {(step) => <Choir key={step} scene={SCENES[step]} />}
      </Steps>

      <p>
        The flaws are pieces of the model’s loss, its average surprise at each next token, measured in nats; e raised to
        the loss is the model’s <Link to="/learnings/perplexity">perplexity</Link>. No model gets under a floor of {two(FIT.E)}, the
        surprise left in text itself, so the story counted only what sits above it.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: the loss is a floor, plus a shortfall that shrinks as a power of the parameter count N, plus one that
        shrinks as a power of the token count D. Each token costs about six operations per parameter to train on, so the
        budget is C ≈ 6ND:
      </p>
      <p>
        L(N, D) = E + A ÷ N<sup>α</sup> + B ÷ D<sup>β</sup>, &nbsp; with C ≈ 6ND.
      </p>
      <p>
        The fitted powers are close, α ≈ {FIT.alpha.toFixed(2)} and β ≈ {FIT.beta.toFixed(2)}, so the cheapest way down
        keeps the two shortfalls about the same size, and N and D grow together: {MORE} times the compute buys{' '}
        {EVEN_GROWTH} times each. That is the <strong>compute-optimal</strong> rule, about {RULE_OF_THUMB} tokens per
        parameter.
      </p>
      <Clip
        src="scaling-laws/training-cost"
        label="Training on one token, each parameter costs a multiply and an add on the way forward, 2 operations, and about twice that on the way back, 4 more: 6 per parameter per token. Over N parameters and D tokens, the compute C is about 6 N D. For Chinchilla, 6 times 70 billion times 1.4 trillion is about 5.9 times 10 to the 23 operations."
        caption="Two operations per parameter forward, about four back: six per parameter for every token, so C ≈ 6ND."
      />
      <Numbers
        words
        items={WORKED_MODELS.map((m) => ({
          label: `${m.name}: ${count(m.n)} × ${count(m.d)}`,
          value: sci(flops(m.n, m.d)),
          note: `${ratio(m.d / m.n)} tokens per parameter`,
        }))}
      />
      <p>
        Gopher and Chinchilla cost about the same; Chinchilla spent its share on text, {CHINCHILLA_RATIO} tokens for
        every parameter, where the others stopped near one or two.
      </p>

      <h2>Where the straight lines came from</h2>
      <p>
        Kaplan and colleagues at OpenAI found them first, in 2020: loss falls as a <strong>power law</strong> in
        parameters, in data and in compute, with exponents of {KAPLAN.alphaN.toFixed(3)},{' '}
        {KAPLAN.alphaD.toFixed(3)} and {KAPLAN.alphaC.toFixed(3)}. Each doubling of parameters multiplied the loss by{' '}
        {two(KAPLAN_DOUBLING)}. A power law is a straight line on log–log axes, so you can fit it to a handful of cheap
        small runs with <Link to="/learnings/least-squares">least squares</Link> on the logs, and read off a model a
        thousand times larger before anyone pays for it.
      </p>
      <p>
        Their split was different: for {MORE} times the compute, make the model {Math.round(KAPLAN_MODEL_GROWTH)} times
        bigger (N ∝ C<sup>{KAPLAN.pN}</sup>) and the data only {KAPLAN_DATA_GROWTH.toFixed(1)} times. GPT-3 followed it.
        In 2022 Hoffmann and colleagues at DeepMind fitted the question three ways and got N ∝ C to the{' '}
        {HOFFMANN_A.map((a) => a.toFixed(2)).join(', ')}: about half each. Kaplan had read short runs off the middle of
        schedules set for 130 billion tokens, which overstated their loss and, by DeepMind’s account, tilted the advice
        toward size.
      </p>

      <h2>Spend a budget</h2>
      <p>
        Pick a budget and a model size; the tokens are whatever the budget leaves. The loss comes from the law above, as
        Besiroglu and colleagues refitted it to DeepMind’s runs in 2024: the constants the Chinchilla paper printed came
        from a fit that stopped early.
      </p>
      <Figure
        readable
        caption={
          <>
            Each faint curve is one budget’s valley, labelled at its bottom; the sage one is yours. The filled sage dot
            is your split, the hollow dot the best one, and the dashed line joins every budget’s best, at {FRONTIER_LOW}{' '}
            to {FRONTIER_HIGH} tokens per parameter all the way along. Squares mark Gopher and Chinchilla. Start at
            Gopher’s budget and press Best split: {count(GOPHER_BEST.n)} parameters, {Math.round(GOPHER_BEST.perParam)}{' '}
            tokens each.
          </>
        }
      >
        <Lab logC={logC} logN={logN} />
        <Controls>
          <Slider
            label="FLOPs"
            value={logC}
            min={LAB.minLogC}
            max={LAB.maxLogC}
            step={0.1}
            onChange={setLogC}
            format={(v) => sci(10 ** v)}
          />
          <Slider
            label="Parameters"
            value={logN}
            min={LAB.minLogN}
            max={LAB.maxLogN}
            step={0.05}
            onChange={setLogN}
            format={(v) => count(10 ** v)}
          />
          <Button onClick={() => setLogN(Math.log10(bestSplit(10 ** logC).n))}>Best split</Button>
          <Button
            onClick={() => {
              setLogC(GOPHER_LOG_C)
              setLogN(GOPHER_LOG_N)
            }}
          >
            Gopher
          </Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`In Kaplan’s fit, each doubling of parameters multiplies the loss by ${two(KAPLAN_DOUBLING)} while nothing else holds the model back. A 1-billion-parameter model reaches a loss of ${two(QUICK_START)}. What should an 8-billion-parameter one reach?`}
        options={QUICK_OPTIONS.map((o) => ({ label: two(o.value), right: o.right }))}
        reveal={
          <>
            {two(QUICK_RIGHT)}. Eight times is {QUICK_DOUBLINGS} doublings, so {two(QUICK_START)} ×{' '}
            {two(KAPLAN_DOUBLING)} × {two(KAPLAN_DOUBLING)} × {two(KAPLAN_DOUBLING)}. A power law takes the same share
            off for each doubling, not the same amount, and nothing like the eightfold cut a division would give. Each
            further 5% costs twice the parameters of the last.
          </>
        }
      />

      <h2>Using it</h2>
      <ul>
        <li>
          <strong>Fit small, then extrapolate.</strong> Train a ladder of small models, fit the lines, and predict the
          big run’s loss before you pay for it.
        </li>
        <li>
          <strong>Count compute as 6ND.</strong> It puts any two plans on one scale: a model twice the size on half the
          text costs the same.
        </li>
        <li>
          <strong>Grow parameters and tokens together.</strong> About {RULE_OF_THUMB} tokens per parameter when compute
          is what limits you.
        </li>
        <li>
          <strong>Train smaller for longer if it will be used a lot.</strong> Every token it writes costs about 2N
          operations, so past {RULE_OF_THUMB} tokens per parameter a smaller model costs more to train and less every
          time it answers.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`You have ${sci(CHECK_BUDGET)} FLOPs, about ${BUDGET_RATIO} times less than Gopher’s. Which model should you train?`}
        options={CHECK_OPTIONS.map((o) => ({
          label: `${count(o.n)} parameters on ${count(o.d)} tokens`,
          right: o === CHECK_BEST,
        }))}
        reveal={
          <>
            {count(CHECK_BEST.n)} parameters on {count(CHECK_BEST.d)} tokens. At {RULE_OF_THUMB} tokens per parameter,
            6 × N × {RULE_OF_THUMB}N = {sci(CHECK_BUDGET)} gives N ≈ {count(CHECK_RULE_N)}. The fitted law agrees: the
            four end at {CHECK_OPTIONS.map((o) => three(o.loss)).join(', ')}. Too small starves the model of capacity;
            too big starves it of text.
          </>
        }
      />
    </Article>
  )
}
