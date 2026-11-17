import { usePlay } from '../../components/explain/useLoop'
import Bin, { Header } from './Bin'
import { BAKERIES, between, HALFWAY, responsibilities, STORY_FIT, STORY_N, STORY_POINTS, STORY_ROUNDS, STORY_START, type Mixture } from './model'

const XS = STORY_POINTS.map((p) => p.x)
const sharesUnder = (mixture: Mixture) => XS.map((v) => responsibilities(v, mixture))
const TRUE_SHARES = sharesUnder(BAKERIES)
const START_SHARES = sharesUnder(STORY_START)
const END = STORY_FIT.at(-1)!

const one = (value: number) => value.toFixed(1)
const bakeryTags = (m: Mixture) => [`Corner ${one(m[0].mean)} ± ${one(m[0].sd)}`, `stall ${one(m[1].mean)} ± ${one(m[1].sd)}`]
const guessTags = (m: Mixture) => [`guess A ${one(m[0].mean)} ± ${one(m[0].sd)}`, `guess B ${one(m[1].mean)} ± ${one(m[1].sd)}`]
// Shares near all or nothing keep their decimals, so 99.997% does not read as 100%
const percent = (share: number) => (share > 0.999 || share < 0.001 ? `${(100 * share).toFixed(3)}%` : `${Math.round(100 * share)}%`)

export type Scene = 'arrive' | 'bakeries' | 'halfway' | 'split' | 'forget' | 'rounds' | 'named'

// The story's bin, one scene per step. Give it a `key` per step so each
// scene plays from its start.
export default function Story({ scene }: { scene: Scene }) {
  const span = scene === 'arrive' ? STORY_N : scene === 'rounds' ? STORY_ROUNDS : 1
  const played = usePlay(span, scene === 'arrive' ? 40 : scene === 'rounds' ? 650 : 1200)

  if (scene === 'arrive') {
    return (
      <div>
        <Header title="One bin" note={`${Math.ceil(played)} croissants`} />
        <Bin xs={XS} shown={played} label={`${STORY_N} croissants dropping into a bin, stacked by weight from about 55 to 98 grams, none of them labelled`} />
      </div>
    )
  }

  if (scene === 'bakeries' || scene === 'halfway' || scene === 'split') {
    const grow = scene === 'bakeries' ? played : 1
    const shown = BAKERIES.map((c) => ({ ...c, weight: c.weight * grow }))
    const halfway = responsibilities(HALFWAY, BAKERIES)
    return (
      <div>
        <Header
          title={scene === 'split' ? 'Every croissant, split' : 'The two bakeries'}
          note={scene === 'halfway' ? `${HALFWAY} g: stall ${percent(halfway[1])}` : scene === 'split' ? 'sage Corner · ink stall' : undefined}
        />
        <Bin
          xs={XS}
          mixture={shown}
          tags={bakeryTags(BAKERIES)}
          shares={scene === 'split' ? TRUE_SHARES : null}
          shading={played}
          marker={scene === 'halfway' ? HALFWAY : null}
          label={
            scene === 'halfway'
              ? `A croissant of ${HALFWAY} grams, halfway between the bakeries. Corner's tall narrow bell is at almost nothing there; the stall's low wide bell is well above it.`
              : `The croissants with two bells over them: Corner's tall and narrow at 60 grams, the stall's low and wide at 80${scene === 'split' ? ', and each croissant shaded by how likely each bakery made it' : ''}`
          }
        />
      </div>
    )
  }

  if (scene === 'forget') {
    return (
      <div>
        <Header title="A first guess" note={`log-likelihood ${one(STORY_FIT[0].logLikelihood)}`} />
        <Bin
          xs={XS}
          mixture={STORY_START}
          tags={guessTags(STORY_START)}
          shares={START_SHARES}
          shading={played}
          label="Two guessed bells, both wide and near the middle, and every croissant split between them by the guess"
        />
      </div>
    )
  }

  // Round by round, then the same end, named
  const at = scene === 'named' ? STORY_ROUNDS : played
  const round = Math.min(Math.floor(at), STORY_ROUNDS - 1)
  const mixture = scene === 'named' ? END.mixture : between(STORY_FIT[round].mixture, STORY_FIT[round + 1].mixture, at - round)
  const done = Math.min(STORY_ROUNDS, Math.floor(at))
  const named = scene === 'named'
  return (
    <div>
      <Header
        title={named ? 'E-step and M-step' : `Round ${done}`}
        note={`log-likelihood ${one(STORY_FIT[done].logLikelihood)}`}
      />
      <Bin
        xs={XS}
        mixture={mixture}
        tags={named ? mixture.map((c, k) => `μ${k + 1} ${one(c.mean)} σ${k + 1} ${one(c.sd)} π${k + 1} ${c.weight.toFixed(2)}`) : guessTags(mixture)}
        shares={sharesUnder(mixture)}
        label={`After ${done} rounds: one bell at ${one(mixture[0].mean)} grams, ${one(mixture[0].sd)} wide, the other at ${one(mixture[1].mean)}, ${one(mixture[1].sd)} wide, and the croissants split between them`}
      />
    </div>
  )
}
