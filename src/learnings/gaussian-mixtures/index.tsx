import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Button, Choice, Controls, Figure, Numbers, Readout } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  boundaries,
  CORNER,
  DATASETS,
  FIRST_START,
  guess,
  HALFWAY,
  LAB_ROUNDS,
  labRun,
  parcel,
  pointsOf,
  SD_FLOOR,
  STALL,
  STORY_FIT,
  STORY_ROUNDS,
  worked,
  type Dataset,
} from './model'
import Story, { type Scene } from './Story'

const SETS = Object.keys(DATASETS) as Dataset[]
const MODES = ['Soft (EM)', 'Hard (k-means)'] as const
type Mode = (typeof MODES)[number]

const one = (value: number) => value.toFixed(1)
const percent = (share: number) => `${Math.round(100 * share)}%`
const SCENES: Scene[] = ['arrive', 'bakeries', 'halfway', 'split', 'forget', 'rounds', 'named']

// The numbers the page tells, worked out once
const HALF = guess()
const WORKED = worked()
const [, COURIER] = parcel()
const STORY_END = STORY_FIT.at(-1)!
// The lab's two-bakery bin, soft and hard, from the start it opens on
const TWO = pointsOf('Two bakeries').length
const SOFT_END = labRun('Two bakeries', FIRST_START, false).at(-1)!
const HARD_END = labRun('Two bakeries', FIRST_START, true).at(-1)!
const HARD_LINE = boundaries(HARD_END.mixture.map((c) => c.mean))[0]
const sortedMeans = (m: { mean: number }[]) => m.map((c) => c.mean).sort((a, b) => a - b)
const [HARD_CORNER, HARD_STALL] = sortedMeans(HARD_END.mixture)
const [, SOFT_STALL] = sortedMeans(SOFT_END.mixture)

export default function GaussianMixtures() {
  const [dataset, setDataset] = useState<Dataset>('Two bakeries')
  const [mode, setMode] = useState<Mode>('Soft (EM)')
  const [start, setStart] = useState(FIRST_START)
  // Rounds played: from where the last click left off, to where it goes
  const [rounds, setRounds] = useState({ from: 0, to: 0, plays: 0 })
  const hard = mode === 'Hard (k-means)'
  const run = labRun(dataset, start, hard)
  const now = run[rounds.to]
  const n = pointsOf(dataset).length
  const lines = boundaries(now.mixture.map((c) => c.mean))

  const goTo = (to: number) => setRounds((r) => ({ from: r.to, to, plays: r.plays + 1 }))
  const restart = () => setRounds((r) => ({ from: 0, to: 0, plays: r.plays + 1 }))

  return (
    <Article
      kicker="Machine learning · Unsupervised learning"
      title="Which bell did it come from?"
      promise="k-means hands every point wholly to one cluster. What should a point between a tight cluster and a loose one get, and how do you fit clusters that can say so?"
      takeaway={
        <>
          A Gaussian mixture gives every point a share in every cluster, its weight times its bell’s height there over
          the total, the point’s <em>responsibilities</em>; EM refits the bells from those shares and splits again, and
          no round ever lowers the likelihood. k-means is the case where the bells are equal and so narrow that every
          share is all or nothing.
        </>
      }
      sources={[
        {
          title: 'COMP 642: Machine Learning',
          by: 'Vivek Boominathan, Rice University, Spring 2026',
          part: 'Week 8 lecture notes, “k-means clustering”: soft k-means, mixtures of Gaussians and the EM algorithm',
        },
        {
          title: 'The Elements of Statistical Learning',
          by: 'Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009',
          part: '§8.5 “The EM Algorithm”; §14.3.7 “Gaussian Mixtures as Soft K-means Clustering”; §7.7 on BIC',
          url: 'https://hastie.su.domains/ElemStatLearn/',
        },
        {
          title: 'Maximum Likelihood from Incomplete Data via the EM Algorithm',
          by: 'Arthur P. Dempster, Nan M. Laird and Donald B. Rubin, Journal of the Royal Statistical Society B, 1977',
          part: 'The EM algorithm, and why no round lowers the likelihood',
          url: 'https://doi.org/10.1111/j.2517-6161.1977.tb01600.x',
        },
      ]}
    >
      <Predict
        question={`Two bakeries fill one bread bin, half each. Corner’s croissants weigh ${CORNER.mean} g, give or take ${CORNER.sd}; the market stall’s weigh ${STALL.mean} g, give or take ${STALL.sd}. You pull out one of ${HALFWAY} g, exactly halfway. Who most likely made it?`}
        options={[
          { label: 'Even odds: it’s halfway' },
          { label: 'Corner, a little more likely' },
          { label: 'The stall, about 60%' },
          { label: 'The stall, almost surely', right: true },
        ]}
        reveal={
          <>
            The stall, at {(100 * HALF.stall).toFixed(3)}%. {HALFWAY} g is {HALF.cornerSpreads} of Corner’s spreads from
            its centre, a miss Corner almost never makes, and only {HALF.stallSpreads} of the stall’s, an ordinary
            croissant there. Grams are the wrong ruler: what counts is the distance in each bakery’s own spread.
          </>
        }
      />

      <h2>One bin, two bakeries</h2>

      <Steps
        readable
        say={[
          <>You buy croissants from two bakeries and tip them all into one bin, with no labels.</>,
          <>
            Corner is precise, {CORNER.mean} g give or take {CORNER.sd}, so its bell is tall and thin; the stall is
            loose, {STALL.mean} g give or take {STALL.sd}, so its bell is low and wide.
          </>,
          <>
            Over the {HALFWAY} g croissant, Corner’s bell has fallen to almost nothing while the stall’s still stands:
            that is why it is the stall’s.
          </>,
          <>Do the same for every croissant: share it between the bakeries in proportion to how high each bell stands over it.</>,
          <>Now say nobody told you the bakeries’ numbers: guess two bells, any two, and split every croissant by the guess.</>,
          <>
            Then refit each bell from its shares, its centre their weighted average and its spread their weighted
            spread, and split again: in {STORY_ROUNDS} rounds the bells find Corner and the stall.
          </>,
          <>
            This is a <strong>Gaussian mixture</strong> fitted by <strong>EM</strong>: each bell is a component with a
            mean μ, a spread σ and a weight π, the shares are <strong>responsibilities</strong>, splitting is the
            E-step, and refitting the M-step.
          </>,
        ]}
      >
        {(step) => <Story key={SCENES[step]} scene={SCENES[step]} />}
      </Steps>

      <p>
        Watch the readout as the rounds play: the log-likelihood, how probable the whole bin is under the bells, went
        from {one(STORY_FIT[0].logLikelihood)} to {one(STORY_END.logLikelihood)} and never fell. That holds for every
        round of EM on any data. The split makes a lower bound that touches the likelihood at the current bells, and
        the refit lifts that bound, which can only lift the likelihood with it. It climbs to a peak, though not always
        the highest one.
      </p>
      <p>
        <Link to="/learnings/k-means">k-means</Link> is this same loop with the softness taken out. Give every bell the
        same spread and weight, and a point’s shares depend only on its distances to the centres. Shrink that spread
        toward zero and the nearest centre’s bell towers over the rest: the shares snap to all or nothing, which is
        k-means’ assignment, and the refit becomes its mean update.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: a croissant’s share for one bakery is that bakery’s share of the bin times its bell’s height at the
        croissant’s weight, divided by the same thing added up over every bakery. In symbols, the responsibility of
        component k for a point x is r<sub>k</sub>(x) = π<sub>k</sub> N(x; μ<sub>k</sub>, σ<sub>k</sub>) / Σ<sub>j</sub>{' '}
        π<sub>j</sub> N(x; μ<sub>j</sub>, σ<sub>j</sub>). Three croissants:
      </p>
      <Numbers
        words
        items={WORKED.map((w, i) => ({
          label: i === 2 ? `${w.grams} g, Corner ¾ of bin` : `${w.grams} g, half each`,
          value: `Corner ${percent(w.corner)}`,
          note: `${w.cornerWeight} × ${w.heights[0].toFixed(4)} vs ${1 - w.cornerWeight} × ${w.heights[1].toFixed(4)}`,
        }))}
      />
      <p>
        {WORKED[1].grams} g is nearer Corner’s centre than the stall’s, but it is three of Corner’s spreads out, where
        Corner’s bell has dropped below the stall’s. Making Corner the bigger baker raises its claim to{' '}
        {percent(WORKED[2].corner)}, and still does not win it.
      </p>
      <Clip
        src="gaussian-mixtures/responsibility"
        label="A croissant's share for Corner, in words: Corner's share of the bin times how likely Corner makes this weight, over the same for every bakery. In symbols: r one of x equals pi one N one of x, over pi one N one plus pi two N two. At 66 grams: 0.5 times 0.0022, over 0.5 times 0.0022 plus 0.5 times 0.0108, which is 0.17."
        caption="Each bakery’s weight times its bell’s height, over the total: the same sum on the bottom for every bakery, so the shares add up to 1."
      />
      <p>
        The M-step is the refit from the story: each component’s weight becomes its total share of the points over n,
        its mean the share-weighted average, its spread the share-weighted spread around that mean.
      </p>

      <h2>Fit it yourself</h2>
      <p>
        A bigger bin: {TWO} croissants from the same two bakeries, or {pointsOf('Three bakeries').length} with a
        supermarket’s 100 g ones mixed in. Each start puts the bells on croissants picked at random. Step EM and watch
        the bells and the climb; then switch to hard assignments, k-means from the same start.
      </p>
      <Figure
        readable
        caption={
          <>
            Each croissant is split by its shares: sage, ink, and grey for the third bakery. Soft, the two-bakery bin
            ends with {SOFT_END.misplaced} of {TWO} croissants with the wrong bakery. Hard, k-means draws its line halfway
            between its centres, at {one(HARD_LINE)} g, and misplaces {HARD_END.misplaced}. With three bakeries, try New
            start: some starts settle on a lower peak.
          </>
        }
      >
        <Lab key={`${dataset} ${mode} ${start} ${rounds.plays}`} dataset={dataset} hard={hard} start={start} from={rounds.from} to={rounds.to} />
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
          <Readout label="Round" value={`${rounds.to} of ${LAB_ROUNDS}`} />
          {hard ? (
            <Readout label={lines.length > 1 ? 'Boundaries' : 'Boundary'} value={lines.map((b) => `${one(b)} g`).join(' · ')} />
          ) : (
            <Readout label="Log-likelihood" value={one(now.logLikelihood)} />
          )}
          <Readout label="Misplaced" value={`${now.misplaced} of ${n}`} accent />
        </div>
        <Controls>
          <Choice
            label="Bin"
            options={SETS}
            value={dataset}
            onChange={(d) => {
              setDataset(d)
              setStart(FIRST_START)
              restart()
            }}
          />
          <Choice
            label="Assignments"
            options={MODES}
            value={mode}
            onChange={(m) => {
              setMode(m)
              restart()
            }}
          />
        </Controls>
        <Controls>
          <Button onClick={() => goTo(Math.min(LAB_ROUNDS, rounds.to + 1))} disabled={rounds.to >= LAB_ROUNDS}>
            Next round
          </Button>
          <Button onClick={() => goTo(LAB_ROUNDS)} disabled={rounds.to >= LAB_ROUNDS}>
            Run to {LAB_ROUNDS}
          </Button>
          <Button
            onClick={() => {
              setStart((s) => s + 1)
              restart()
            }}
          >
            New start
          </Button>
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question={`In the two-bakery bin, run hard assignments to the end. Where does k-means put the stall’s centre, next to the ${one(SOFT_STALL)} g EM finds?`}
        options={[
          { label: 'In the same place' },
          { label: 'Pulled toward Corner' },
          { label: 'Pushed away from Corner', right: true },
          { label: 'Anywhere: it depends on the start' },
        ]}
        reveal={
          <>
            Further out, at {one(HARD_STALL)} g. k-means cuts at {one(HARD_LINE)} g, halfway between its centres and far
            past where Corner’s croissants stop, so every stall croissant lighter than that is handed to Corner. What is
            left of the stall averages heavier, and Corner’s centre is dragged up to {one(HARD_CORNER)}. With shares,
            the stall keeps its light croissants.
          </>
        }
      />

      <h2>Putting it to work</h2>
      <ul>
        <li>
          <strong>Start from several places.</strong> EM climbs to the nearest peak, and the three-bakery bin has lower
          ones to stop on. Run it from a few starts, or from a k-means answer, and keep the highest log-likelihood.
        </li>
        <li>
          <strong>Keep a bell from shrinking onto one point.</strong> A bell centred on a single point can narrow
          without end, and the likelihood grows without limit as it does. Put a floor under every spread (the lab’s is{' '}
          {SD_FLOOR} g), or restart a bell that collapses.
        </li>
        <li>
          <strong>Choose k with a score that charges for bells.</strong> More bells never fit worse, so the raw
          likelihood always asks for more; a criterion such as BIC takes off a cost for every parameter.
        </li>
        <li>
          <strong>Keep the shares, not only the winner.</strong> A point split 55 to 45 is saying it could be either;
          look again at the points that split close to even.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="Parcels on your street come from two couriers in equal numbers. One arrives at 10:00, give or take 5 minutes; the other around 11:00, give or take 30. A parcel turns up at 9:40, earlier than both. Which courier most likely brought it?"
        options={[
          { label: 'The 10:00 one, almost surely' },
          { label: 'Even odds' },
          { label: 'The 11:00 one, most likely', right: true },
          { label: 'Neither: it fits no bell' },
        ]}
        reveal={
          <>
            The 11:00 courier, at about {percent(COURIER)}. 9:40 is only 20 minutes early for the punctual one, but that
            is four of its spreads, where its bell has all but vanished; for the other it is 80 minutes early, yet under
            three of its spreads. Being near a centre counts for less than being within the spread.
          </>
        }
      />
    </Article>
  )
}
