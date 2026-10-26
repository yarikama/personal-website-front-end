import { DotGrid, DotKey, type Tone } from '../../components/explain/DotGrid'
import { useLoop } from '../../components/explain/useLoop'
import { faulty } from './model'

const FLEET = 100
// How many moments each loop of the grid steps through
const TICKS = 12

// One van on a road, with a flat or rolling on its spare
function Van({ flat, phase }: { flat: boolean; phase: number }) {
  const x = flat ? 180 : 40 + phase * 360
  return (
    <svg viewBox="0 0 560 200" className="w-full" role="img" aria-label={flat ? 'A van with a flat tire' : 'A van driving on its spare'}>
      <line x1={0} x2={560} y1={166} y2={166} className="stroke-zinc-400" />
      <rect x={x} y={92} width={110} height={56} className="fill-paper stroke-ink" strokeWidth={1.5} />
      <path d={`M${x + 110},104 h30 l20,20 v24 h-50 z`} className="fill-paper stroke-ink" strokeWidth={1.5} />
      <circle cx={x + 32} cy={152} r={13} className={flat ? 'fill-paper stroke-ink' : 'fill-sage'} strokeWidth={1.5} />
      {flat ? (
        <ellipse cx={x + 128} cy={159} rx={17} ry={7} className="fill-ink" />
      ) : (
        <circle cx={x + 128} cy={152} r={13} className="fill-sage" />
      )}
      <text x={280} y={40} textAnchor="middle" className={`font-mono text-[12px] uppercase tracking-widest ${flat ? 'fill-ink' : 'fill-sage'}`}>
        {flat ? 'Flat tire: a fault' : 'Spare fitted: delivered on time, no failure'}
      </text>
    </svg>
  )
}

// The fleet, as the story tells it: faults one at a time (routine), all at
// once from one cause (a failure), and then the same as servers
export default function Fleet({ step }: { step: number }) {
  const phase = useLoop(step >= 2 ? 6000 : 3000)
  if (step <= 1) return <Van flat={step === 0} phase={phase} />

  const tick = Math.floor(phase * TICKS)
  const together = step === 3 || step === 4
  const down = together && phase > 0.2
  const tones: Tone[] = Array.from({ length: FLEET }, (_, i) =>
    down || (!together && faulty(i, tick, 0.03)) ? 'bad' : 'fine'
  )
  const servers = step === 5
  const headline = together
    ? down
      ? step === 3
        ? 'Every tire split this morning: nothing arrives'
        : 'The wrong list in every van: nothing arrives right'
      : 'A cold morning…'
    : servers
      ? 'A disk dies somewhere most days. Pages that failed: 0'
      : 'A flat somewhere most days. Late deliveries: 0'

  return (
    <div>
      <p className={`font-serif text-2xl font-light ${down ? 'text-ink' : 'text-zinc-faded'}`}>{headline}</p>
      <div className="mt-4">
        <DotGrid tones={tones} label={headline} appear={false} />
      </div>
      <DotKey
        items={
          servers
            ? [
                ['fine', 'server up'],
                ['bad', 'disk died, a copy took over'],
              ]
            : together
              ? [
                  ['fine', 'van on the road'],
                  ['bad', 'van stopped'],
                ]
              : [
                  ['fine', 'van on the road'],
                  ['bad', 'flat, spare fitted'],
                ]
        }
      />
    </div>
  )
}
