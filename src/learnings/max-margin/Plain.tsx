import { usePlay } from '../../components/explain/useLoop'
import { HEIGHT, LEFT, RIGHT, X, Y } from './mapScale'
import { Across, MapFrame, Mark, Ring, Road, Street } from './MapParts'
import { FAR, HOUSES, KERB_HOUSES, KNOCKED, metres, ROAD_C, ROADS, norm, supportVectors, type Line } from './model'

export type Show = 'villages' | 'roads' | 'A' | 'B' | 'C' | 'knock' | 'named' | 'guess'

const half = (line: Line) => 1 / norm(line)
const widthText = (h: number) => metres(2 * h)

// The houses a road's street stops at
const touching = (line: Line) => supportVectors(line, HOUSES)

const LEGEND_Y = HEIGHT + 14

// B and C meet the top edge close together, so B is named at the bottom
const END = { A: 'top', B: 'bottom', C: 'top' } as const

// The two villages on the plain and the roads between them, one scene of
// the story at a time. Each scene plays once from the start.
export default function Plain({ show }: { show: Show }) {
  const played = usePlay(show === 'knock' ? KNOCKED.length + 1 : 1, show === 'knock' ? 600 : 1300)
  const t = Math.min(1, played)
  const eased = 1 - (1 - t) ** 3

  const letter = show === 'A' || show === 'B' || show === 'C' ? show : null
  const road = letter ? ROADS.find((r) => r.name === letter)!.line : null
  const gone = (i: number) => show === 'knock' && KNOCKED.indexOf(i) >= 0 && played >= KNOCKED.indexOf(i) + 1

  const houses = HOUSES.map((p, i) => {
    const appear = show === 'villages' ? Math.max(0, Math.min(1, played * HOUSES.length * 1.4 - i * 1.2)) : 1
    const fade = gone(i) ? 0.12 : 1
    return <Mark key={i} p={p} opacity={appear * fade} size={appear > 0 ? 1 : 0} />
  })

  const label =
    show === 'villages'
      ? 'Two villages on a plain: six sage houses to the east and five ink houses to the west.'
      : show === 'roads'
        ? 'Three straight roads, A, B and C, each keeping every house on its own side.'
        : road
          ? `Road ${show} widened evenly until its edges touch a house: ${widthText(half(road))} wide.`
          : show === 'knock'
            ? 'Every house not on road C’s edges is knocked down in turn; the road stays where it is.'
            : show === 'named'
              ? 'Road C labelled: the centre line is w·x + b = 0, its edges w·x + b = ±1, the street 2/‖w‖ = 20 m wide, and the three ringed houses are the support vectors.'
              : 'The two villages and the widest road between them, with the house in the far north-east corner ringed.'

  return (
    <MapFrame label={label} extra={show === 'named' ? 30 : 0}>
      {show === 'roads' && ROADS.map((r) => <Road key={r.name} line={r.line} name={r.name} end={END[r.name]} />)}
      {road && (
        <>
          {ROADS.filter((r) => r.line !== road).map((r) => (
            <Road key={r.name} line={r.line} name={r.name} end={END[r.name]} faint />
          ))}
          <Street line={road} open={eased} />
          <Road line={road} name={letter!} end={END[letter!]} />
          <Across line={road} half={half(road) * eased} text={t >= 1 ? widthText(half(road)) : undefined} />
        </>
      )}
      {(show === 'knock' || show === 'named') && <Street line={ROAD_C} />}
      {show === 'named' && <Across line={ROAD_C} half={half(ROAD_C)} text="2/‖w‖ = 20 m" />}
      {show === 'guess' && <Street line={ROAD_C} open={0} />}
      {houses}
      {road && t >= 1 && touching(road).map((i) => <Ring key={i} p={HOUSES[i]} />)}
      {(show === 'knock' || show === 'named') && KERB_HOUSES.map((i) => <Ring key={i} p={HOUSES[i]} />)}
      {show === 'guess' && (
        <>
          <Ring p={HOUSES[FAR]} />
          <text x={X(HOUSES[FAR].x) - 18} y={Y(HOUSES[FAR].y) + 4} textAnchor="end" className="fill-ink font-mono text-[12px]">
            delete this one?
          </text>
        </>
      )}
      {show === 'named' && (
        <g className="font-mono text-[12px]">
          <line x1={LEFT + 4} x2={LEFT + 28} y1={LEGEND_Y} y2={LEGEND_Y} className="stroke-sage" strokeWidth={3} />
          <text x={LEFT + 34} y={LEGEND_Y + 4} className="fill-ink">
            w·x + b = 0
          </text>
          <line x1={LEFT + 150} x2={LEFT + 174} y1={LEGEND_Y} y2={LEGEND_Y} className="stroke-zinc-400 dark:stroke-zinc-200/50" strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={LEFT + 180} y={LEGEND_Y + 4} className="fill-ink">
            w·x + b = ±1
          </text>
          <circle cx={RIGHT - 150} cy={LEGEND_Y} r={8} className="fill-none stroke-ink" strokeWidth={1.5} />
          <text x={RIGHT - 136} y={LEGEND_Y + 4} className="fill-ink">
            support vectors
          </text>
        </g>
      )}
    </MapFrame>
  )
}
