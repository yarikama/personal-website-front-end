import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import {
  BEST,
  clippedObjective,
  EPSILON,
  LIMITS,
  meanTip,
  REWORKS,
  shares,
  story,
  STORY_USUAL,
  storyAverages,
  summarise,
  TIMES,
  WEEKENDS,
  WORKED,
  type Limit,
  type Summary,
} from './model'
import Setlist from './Setlist'
import Weekends from './Weekends'

// Worked out once: the story's thirty reworks, without and with the limit,
// and the many-weekend runs for each setting the lab offers
const LOOSE = story(null)
const HELD = story(EPSILON)
const summaries = new Map<string, Summary>()
function summaryOf(times: number, limit: Limit) {
  const key = `${times} ${limit}`
  let found = summaries.get(key)
  if (!found) {
    found = summarise(times, LIMITS[limit])
    summaries.set(key, found)
  }
  return found
}

const LIMIT_NAMES = Object.keys(LIMITS) as Limit[]
const pct = (share: number) => `${Math.round(100 * share)}%`
const dollars = (value: number) => `$${value.toFixed(2)}`

export default function Ppo() {
  const loose = shares(LOOSE.at(-1)!)
  const held = shares(HELD.at(-1)!)
  const averages = storyAverages()
  const onceRun = summaryOf(1, 'None')
  const looseRun = summaryOf(REWORKS, 'None')
  const heldRun = summaryOf(REWORKS, '±20%')

  const [times, setTimes] = useState<number>(REWORKS)
  const [limit, setLimit] = useState<Limit>('None')
  const [replays, setReplays] = useState(0)
  const summary = summaryOf(times, limit)

  return (
    <Article
      kicker="Reinforcement learning · Policy gradients"
      title="Stay close to the notes"
      promise="Fresh experience is slow to collect. What goes wrong when a policy keeps learning from the same batch, and how does PPO make it safe?"
      takeaway={
        <>
          Reuse a batch by weighting each move with how much likelier the new policy makes it, but once that ratio is
          past 1 ± ε in the direction the move pushes, let it push no further: the policy can take many steps on one
          batch and still stay <em>close</em> to the one that collected it.
        </>
      }
      sources={[
        {
          title: 'Proximal Policy Optimization Algorithms',
          by: 'John Schulman et al., 2017',
          part: 'The clipped surrogate objective, and several passes over each batch',
          url: 'https://arxiv.org/abs/1707.06347',
        },
        {
          title: 'Trust Region Policy Optimization',
          by: 'John Schulman et al., ICML, 2015',
          part: 'Bounding how far each update moves the policy',
          url: 'https://proceedings.mlr.press/v37/schulman15.html',
        },
        {
          title: 'Training language models to follow instructions with human feedback',
          by: 'Long Ouyang et al., NeurIPS, 2022',
          part: 'Fine-tuning a language model with PPO against a learned reward',
          url: 'https://arxiv.org/abs/2203.02155',
        },
        {
          title: 'Spinning Up in Deep RL',
          by: 'OpenAI, 2018',
          part: '“Proximal Policy Optimization”, on stopping the passes early when the policy drifts',
          url: 'https://spinningup.openai.com/en/latest/algorithms/ppo.html',
        },
        {
          title: 'COMP 442/552: Reinforcement Learning',
          by: 'Vaibhav Unhelkar, Rice University, Fall 2026',
          part: 'Lectures “DDPG (Reprise)”, on deep RL with policy gradients, and “Off-policy RL”',
        },
      ]}
    >
      <Predict
        question="You busk with four songs. Last weekend one song got a lucky $20 from a stranger. During the week you rework your setlist from last weekend’s notes, a small step each time, and you do it thirty times. What does your setlist look like by Friday?"
        options={[
          { label: 'A little better than before' },
          { label: 'Mostly the lucky song', right: true },
          { label: 'The same as after one rework' },
          { label: 'Back to even, the noise averaged out' },
        ]}
        reveal={
          <>
            Mostly the lucky song. Each rework is small, but every one reads the same notes, and they always say the
            same thing: that song did best. Thirty small steps the same way are one big step, taken on one weekend’s
            luck.
          </>
        }
      />

      <h2>One weekend, read thirty times</h2>

      <Steps
        readable
        say={[
          <>You busk on weekends with four songs, and your setlist says how often to play each: a quarter of the time each, to start.</>,
          <>
            You note every song you play and the tip it earns. This weekend your usual tip was {dollars(STORY_USUAL)}, and
            the cover averaged {dollars(averages[1])}, all thanks to one stranger’s $20.
          </>,
          <>On weekdays you rework the setlist from the notes: songs that beat your usual get played a little more, the rest a little less.</>,
          <>
            The next weekend is days away, so you rework again from the same notes, {REWORKS} times, and a song you now
            play more often than you did counts its notes for more.
          </>,
          <>
            The cover is now {pct(loose[1])} of your set, and even the waltz, whose every tip beat your usual, is down to{' '}
            {pct(loose[BEST])}: next weekend you will hardly play it, so you will hardly learn how good it is.
          </>,
          <>
            So you add a rule: once a song’s share is a fifth above or below where it was that weekend, its notes stop
            pushing it further that way. {REWORKS} reworks now end at {pct(held[1])} cover and {pct(held[BEST])} waltz.
          </>,
          <>
            The setlist is the policy π<sub>θ</sub>, the weekend’s shares are π<sub>old</sub>, the notes are the batch, a
            song’s now-over-then is the ratio, and the rule is <strong>clipping</strong> at 1 ± ε. Together: PPO,
            proximal policy optimization.
          </>,
        ]}
      >
        {(step) =>
          step === 0 ? (
            <Setlist key="even" show="even" setlists={LOOSE} />
          ) : step === 1 ? (
            <Setlist key="notes" show="notes" setlists={LOOSE} />
          ) : step === 2 ? (
            <Setlist key="one" show="one" setlists={LOOSE} />
          ) : step === 3 ? (
            <Setlist key="reworks" show="reworks" setlists={LOOSE} />
          ) : step === 4 ? (
            <Setlist key="end" show="end" setlists={LOOSE} />
          ) : step === 5 ? (
            <Setlist key="held" show="held" setlists={HELD} />
          ) : (
            <Setlist key="named" show="named" setlists={HELD} />
          )
        }
      </Steps>

      <p>
        A single rework is the <Link to="/learnings/reinforce">REINFORCE</Link> push with a baseline, nothing new. What
        goes wrong is the reuse. The notes describe the setlist you played, and every rework moves you further from it,
        while the notes keep speaking as if you hadn’t moved. Weighting each note by how much more often you now play
        its song, the trick from <Link to="/learnings/importance-sampling">learning from someone else’s trips</Link>,
        corrects the average, but it rests on a few plays, and the further you drift, the more those few count.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: for each move in the batch, the ratio r = its chance under the new policy ÷ its chance when it was
        made. A move that did better than usual pushes its chance up by r × how much better; one that did worse pushes
        down. PPO keeps that push, except when it would carry the ratio further past 1 ± ε: then it stops. With ε = {EPSILON}:
      </p>
      <Numbers
        words
        items={WORKED.map((w) => ({
          label: `${w.surprise > 0 ? '+' : '−'}$${Math.abs(w.surprise)}, played ×${w.ratio}`,
          value: (w.surprise > 0 && w.ratio > 1 + EPSILON) || (w.surprise < 0 && w.ratio < 1 - EPSILON) ? 'stops' : 'pushes',
          note: `counts ${clippedObjective(w.ratio, w.surprise).toFixed(1)}`,
        }))}
      />
      <p>
        The third is the asymmetry that matters: a move that did worse than usual, which the policy has nonetheless made
        likelier, keeps pulling it back however far it went. The clip only ever takes away the reason to drift.
      </p>
      <Clip
        src="ppo/ratio-to-clip"
        label="The policy gradient's objective, r times A, where r is pi theta of a over pi old of a and A is the advantage. The ratio is clipped to between 1 minus epsilon and 1 plus epsilon, and the objective takes the smaller of r times A and clipped r times A. With A equal to plus 2 and r equal to 1.3, the unclipped value is 2.6 and the clipped one 2.4, so the smaller, 2.4, is flat in r: no push."
        caption="Take the smaller of the weighted push and the same push with the ratio held inside 1 ± ε. Past the line, the smaller one stops changing with the policy, so it stops pushing."
      />
      <p>
        In practice the usual is not one number for the whole batch but a <Link to="/learnings/actor-critic">critic’s</Link>{' '}
        guess for each state, so each move’s “how much better” is its advantage. An earlier method, TRPO, kept the new
        policy close with a hard bound on how different the two policies may be, which takes a heavier solve at every
        update; PPO’s clip gets most of the same safety from plain gradient steps.
      </p>

      <h2>Many weekends</h2>
      <p>
        Now busk for {WEEKENDS} weekends, with tips that wobble and a stranger’s $20 one play in twenty. The waltz is the
        best song, worth {dollars(meanTip(BEST))} a play against {dollars(meanTip(0))} for the ballad. Choose how many
        times to rework each weekend’s notes, and whether to clip.
      </p>
      <Figure
        readable
        caption={
          <>
            Faint lines: single runs; sage: the average of 200. One rework a weekend is safe but slow: the waltz is at{' '}
            {pct(onceRun.waltz[WEEKENDS])} after {WEEKENDS} weekends. {REWORKS} reworks without the limit jump ahead, then{' '}
            {pct(looseRun.onOther)} of runs lock onto another song and never play the waltz again. With the limit, every
            run finds it.
          </>
        }
      >
        <Weekends key={`${times} ${limit} ${replays}`} summary={summary} />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Readout label="On the waltz" value={pct(summary.onWaltz)} accent />
          <Readout label="Stuck elsewhere" value={pct(summary.onOther)} />
          <Readout label="A play earns" value={dollars(summary.earns)} />
        </div>
        <Controls>
          <Choice label="Reworks a weekend" options={TIMES} value={times} onChange={setTimes} />
          <Choice label="Limit" options={LIMIT_NAMES} value={limit} onChange={setLimit} />
          <Button onClick={() => setReplays((n) => n + 1)}>Play again</Button>
        </Controls>
      </Figure>
      <p>
        The stranded runs are the real danger. A policy that stops making a move stops collecting notes about it, so
        nothing will ever tell it the move was good. Clipped, a run earns {dollars(heldRun.earns)} a play by the end,
        against {dollars(looseRun.earns)} unclipped and {dollars(onceRun.earns)} with one rework.
      </p>

      <Predict
        kicker="Quick check"
        question="With the limit at ±20%, the waltz was 10% of your set last weekend, and its notes are all good. Roughly how much of your set can its notes push it to before the next weekend?"
        options={[
          { label: '12%', right: true },
          { label: '20%' },
          { label: '30%' },
          { label: 'As much as they like' },
        ]}
        reveal={
          <>
            About 12%. The limit is on the ratio, a fifth of where the song was, not a fifth of the whole set: 10% × 1.2.
            A rare move grows by a share of itself each batch, so it takes several weekends to come to the fore. That is
            the price of never jumping on one weekend’s luck.
          </>
        }
      />

      <h2>Where it runs</h2>
      <p>
        PPO is the method that fine-tuned InstructGPT, a sibling of ChatGPT, against a model of people’s ratings. There, the
        state is the prompt plus the words written so far, an action is the next token, out of tens of thousands, and
        the reward is one score for the whole answer. Batches of answers are expensive to write and score, so reusing
        each one for several passes matters, and so does not drifting off the answers they describe. The same clip runs
        robots, with a <Link to="/learnings/gaussian-policies">bell curve</Link> for each motor as the policy.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Keep ε near 0.2.</strong> It did best of the settings the paper tried. Much smaller and each batch barely moves the policy; much
          larger and the clip stops protecting it.
        </li>
        <li>
          <strong>Make a few passes, then collect.</strong> Around three to ten passes over each batch, in shuffled
          mini-batches, then fresh experience. The clip makes extra passes safe, not free.
        </li>
        <li>
          <strong>Watch the drift, and stop early.</strong> Measure how far the new policy’s chances have moved from the
          old ones on the batch, and end the passes when it passes a threshold, as many implementations do.
        </li>
        <li>
          <strong>Give the usual a critic.</strong> Advantages from a learned value per state cut the noise in every push,
          and the same batch trains the critic.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="To save money, a team collects one batch of chatbot answers, scores them, and runs 200 passes over it without the clip. Its score on that batch keeps rising, but fresh answers now score worse than before training. Why?"
        options={[
          { label: 'The scores were wrong' },
          { label: 'It drifted far from the policy the batch describes', right: true },
          { label: 'Its steps were too small' },
          { label: 'The batch was too large' },
        ]}
        reveal={
          <>
            Every pass moved the policy further from the one that wrote those answers, while the weighted batch kept
            vouching for the move. Far from it, the batch’s numbers rest on a few lucky answers and no longer describe
            what the new policy will do. Clipping, or a few passes and then fresh answers, keeps it near enough to trust.
          </>
        }
      />
    </Article>
  )
}
