import { usePlay } from '../../components/explain/useLoop'
import { histogram, mean, TRUCKS, TRUE_SCORE, type Market } from './model'

const WIDTH = 530
const HEIGHT = 250
const LEFT = 44
// The trucks stand left of this; the truth is named right of it
const RIGHT = 440
const EDGE = WIDTH - 8
const TOP = 26
const BOTTOM = 210
const LOW = 4
const HIGH = 11

const y = (score: number) => BOTTOM - ((Math.min(HIGH, Math.max(LOW, score)) - LOW) / (HIGH - LOW)) * (BOTTOM - TOP)
const column = (truck: number) => LEFT + 24 + truck * ((RIGHT - LEFT - 24) / TRUCKS)

function Status({ children }: { children: string }) {
  return <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{children}</p>
}

function Axis({ named }: { named: boolean }) {
  return (
    <g>
      {[5, 7, 9, 11].map((score) => (
        <g key={score}>
          <line x1={LEFT} x2={EDGE} y1={y(score)} y2={y(score)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
          <text x={LEFT - 8} y={y(score) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
            {score}
          </text>
        </g>
      ))}
      <line x1={LEFT} x2={RIGHT} y1={y(TRUE_SCORE)} y2={y(TRUE_SCORE)} className="stroke-ink" strokeDasharray="5 4" />
      <text x={RIGHT + 10} y={y(TRUE_SCORE) + 4} className="fill-ink font-mono text-[11px] uppercase tracking-wider">
        {named ? 'truth' : 'truly 7'}
      </text>
    </g>
  )
}

// The story: eight food trucks, all truly a 7, one meal at each; the
// favourite, and what it scores when you go back; then a thousand markets,
// with one notebook and with two. Give it a `key` per step.
export default function Trucks({ step, story, one, two }: { step: number; story: Market; one: number[]; two: number[] }) {
  const played = usePlay(step === 1 ? TRUCKS : 1, step === 1 ? 350 : 1400)
  const { first, second, favourite } = story

  if (step >= 4 && step <= 5) {
    // A histogram of the favourite's score across the markets, on its side so
    // the scores line up with the trucks' axis
    const width = 0.25
    const bins = { one: histogram(one, LOW, HIGH, width), two: histogram(two, LOW, HIGH, width) }
    const tallest = Math.max(...bins.one, ...bins.two)
    const bar = (count: number) => (count / tallest) * (RIGHT - LEFT) * 0.5 * Math.min(1, played * 1.4)
    const shape = (counts: number[]) =>
      counts.map((count, i) => ({ y0: y(LOW + (i + 1) * width), height: y(LOW + i * width) - y(LOW + (i + 1) * width), length: bar(count) }))
    const means = { one: mean(one), two: mean(two) }
    return (
      <div>
        <Status>{step === 4 ? `${one.length.toLocaleString('en')} markets · the favourite’s score` : 'Picked in one notebook, scored in the other'}</Status>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-3 w-full max-w-[38rem]" role="img" aria-label={`Across ${one.length} markets, the favourite's score averages ${means.one.toFixed(1)} in the notebook that picked it${step === 5 ? `, and ${means.two.toFixed(1)} in the other notebook` : ''}; every truck is truly 7.`}>
          <Axis named={false} />
          {shape(bins.one).map((b, i) => (
            <rect key={`one${i}`} x={LEFT + 1} y={b.y0 + 0.5} width={b.length} height={b.height - 1} className="fill-ink" opacity={step === 5 ? 0.18 : 0.75} />
          ))}
          {step === 5 &&
            shape(bins.two).map((b, i) => <rect key={`two${i}`} x={LEFT + 1} y={b.y0 + 0.5} width={b.length} height={b.height - 1} className="fill-sage" opacity={0.85} />)}
          <line x1={LEFT} x2={EDGE} y1={y(means.one)} y2={y(means.one)} className="stroke-ink" strokeWidth={1.5} opacity={step === 5 ? 0.4 : 1} />
          <text x={EDGE} y={y(means.one) - 6} textAnchor="end" className="fill-ink font-mono text-[11px] uppercase tracking-widest" opacity={step === 5 ? 0.5 : 1}>
            one notebook: {means.one.toFixed(1)}
          </text>
          {step === 5 && (
            <text x={EDGE} y={y(means.two) + 26} textAnchor="end" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
              two notebooks: {means.two.toFixed(1)}
            </text>
          )}
        </svg>
      </div>
    )
  }

  const named = step === 6
  const shown = step === 0 ? 0 : step === 1 ? Math.floor(played + 0.5) : TRUCKS
  const back = step === 3 || named
  const status = [
    `${TRUCKS} food trucks · every one truly 7`,
    'One meal at each',
    `Your favourite: ${first[favourite].toFixed(1)}`,
    `Back again: ${second[favourite].toFixed(1)}`,
    '',
    '',
    'The favourite’s score is a max of noisy estimates',
  ][step]

  return (
    <div>
      <Status>{status}</Status>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-3 w-full max-w-[38rem]" role="img" aria-label={`Eight food trucks; each truly scores 7. ${status}.`}>
        <Axis named={named} />
        {first.map((score, truck) => {
          const x = column(truck)
          const fav = truck === favourite && step >= 2
          return (
            <g key={truck}>
              <rect x={x - 13} y={BOTTOM + 8} width={26} height={12} rx={2} className={fav ? 'fill-sage' : 'fill-zinc-400'} />
              <text x={x} y={BOTTOM + 34} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
                {named ? `a${truck + 1}` : truck + 1}
              </text>
              {truck < shown && (
                <>
                  <circle cx={x} cy={y(score)} r={fav ? 7 : 5} className={fav ? 'fill-sage' : 'fill-zinc-faded'} opacity={back && fav ? 0.45 : 1} />
                  {fav && (
                    <text x={x + 11} y={y(score) + 4} className="fill-sage font-mono text-[12px]">
                      {named ? 'max Q' : score.toFixed(1)}
                    </text>
                  )}
                </>
              )}
              {back && truck === favourite && (
                <>
                  <line x1={x} x2={x} y1={y(score) + 8} y2={y(second[truck]) - 8} className="stroke-sage" strokeDasharray="3 3" />
                  <circle cx={x} cy={y(second[truck])} r={7} className="fill-paper stroke-sage" strokeWidth={2.5} />
                  <text x={x + 11} y={y(second[truck]) + 18} className="fill-sage font-mono text-[12px]">
                    {named ? 'a second estimate' : second[truck].toFixed(1)}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
