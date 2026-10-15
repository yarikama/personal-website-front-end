import { useStep } from '../../components/talk/talk'

// Figures for the talk, drawn as inline SVG at the canvas's own pixel scale, so
// text sizes here are the sizes on the slide. Colour follows the site: sage
// marks the point of the figure, greys are context. Every mark that carries
// identity also has a label, so nothing depends on colour alone.

// The strong grey: zinc-600 on paper, zinc-500 on the dark ground. It keeps
// sage and grey apart for every kind of colour vision (checked with the
// dataviz palette validator in both themes).
const GREY_FILL = 'fill-zinc-600 dark:fill-[#71717a]'
const GREY_STROKE = 'stroke-zinc-600 dark:stroke-[#71717a]'

const fade = 'transition-opacity duration-700 ease-elegant'

function Arrow({ x1, y1, x2, y2, className = 'stroke-zinc-400 fill-zinc-400' }: {
  x1: number
  y1: number
  x2: number
  y2: number
  className?: string
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const head = (side: number) =>
    `${x2 - 11 * Math.cos(angle) + side * 5 * Math.sin(angle)},${y2 - 11 * Math.sin(angle) - side * 5 * Math.cos(angle)}`
  return (
    <g className={className}>
      <line x1={x1} y1={y1} x2={x2 - 9 * Math.cos(angle)} y2={y2 - 9 * Math.sin(angle)} strokeWidth={1.5} />
      <polygon points={`${x2},${y2} ${head(1)} ${head(-1)}`} stroke="none" />
    </g>
  )
}

function Box({ x, y, w, h, label, accent = false }: {
  x: number
  y: number
  w: number
  h: number
  label: string
  accent?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        className={`fill-paper ${accent ? 'stroke-sage' : 'stroke-zinc-300'}`}
        strokeWidth={accent ? 2 : 1.5}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 6}
        textAnchor="middle"
        className={`font-sans text-[17px] ${accent ? 'fill-sage' : 'fill-ink'}`}
      >
        {label}
      </text>
    </g>
  )
}

function Caption({ x, y, children, anchor = 'start', className = 'fill-zinc-400' }: {
  x: number
  y: number
  children: string
  anchor?: 'start' | 'middle' | 'end'
  className?: string
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`font-mono text-[13px] tracking-[0.12em] ${className}`}>
      {children}
    </text>
  )
}

// Bar with rounded corners on its data end only, anchored to the baseline
function barPath(x: number, y: number, w: number, h: number, r = 4, horizontal = false) {
  if (horizontal) {
    return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`
  }
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

// Google, before and after: every case defined twice, then one definition
// read by everything. The after side appears at step `afterAt`.
export function TestArchitecture({ afterAt = 1 }: { afterAt?: number }) {
  const showAfter = useStep() >= afterAt
  const after = 756
  const infras = [
    { label: 'Tenancy', y: 124 },
    { label: 'Home connection', y: 190 },
    { label: 'Device setup', y: 256 },
  ]
  return (
    <svg
      viewBox="0 0 1376 330"
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Before: each case lived in a protobuf for e2e tests and again as hand-written Java for integration tests. After: one set of protobufs feeds e2e tests and three integration infrastructures, covering 402+ cases."
    >
      {/* Before */}
      <Caption x={0} y={14}>BEFORE</Caption>
      <Box x={0} y={40} w={230} h={60} label="Case protobufs" />
      <Arrow x1={230} y1={70} x2={390} y2={70} />
      <Caption x={310} y={60} anchor="middle">READ BY</Caption>
      <Box x={390} y={40} w={230} h={60} label="E2E tests" />

      <rect x={16} y={176} width={230} height={60} rx={10} className="fill-paper stroke-zinc-300" strokeWidth={1.5} />
      <rect x={8} y={184} width={230} height={60} rx={10} className="fill-paper stroke-zinc-300" strokeWidth={1.5} />
      <Box x={0} y={192} w={230} h={60} label="Java, per device" />
      <Arrow x1={246} y1={222} x2={390} y2={222} />
      <Caption x={318} y={212} anchor="middle">HARD-CODED</Caption>
      <Box x={390} y={192} w={230} h={60} label="Integration tests" />
      <text x={0} y={290} className="font-sans text-[16px] fill-sage">
        The same cases, written again
      </text>
      <Caption x={505} y={290} anchor="middle">AT MOST 15 CASES</Caption>

      <line x1={688} y1={0} x2={688} y2={330} className="stroke-zinc-200" strokeWidth={1} />

      {/* After */}
      <g className={fade} style={{ opacity: showAfter ? 1 : 0 }}>
        <Caption x={after} y={14}>AFTER</Caption>
        <Box x={after} y={160} w={210} h={60} label="Case protobufs" accent />
        <text x={after + 105} y={246} textAnchor="middle" className="font-sans text-[16px] fill-sage">
          One source of truth
        </text>

        <Box x={1026} y={30} w={210} h={52} label="E2E tests" />
        <Arrow x1={966} y1={190} x2={1026} y2={56} />
        <Caption x={1131} y={112} anchor="middle">3 INTEGRATION INFRAS</Caption>
        {infras.map((infra) => (
          <g key={infra.label}>
            <Box x={1026} y={infra.y} w={210} h={52} label={infra.label} />
            <Arrow x1={966} y1={190} x2={1026} y2={infra.y + 26} />
            <Arrow x1={1236} y1={infra.y + 26} x2={1280} y2={216} className="stroke-sage fill-sage" />
          </g>
        ))}

        <rect x={1280} y={180} width={96} height={72} rx={10} className="fill-paper stroke-sage" strokeWidth={2} />
        <text x={1328} y={214} textAnchor="middle" className="font-serif text-[30px] fill-sage lining-nums">
          402+
        </text>
        <Caption x={1328} y={236} anchor="middle" className="fill-sage">CASES</Caption>
      </g>
    </svg>
  )
}

// One square per case: the cases covered before in grey, the rest in sage
export function CaseGrid({ total, before }: { total: number; before: number }) {
  const cols = 34
  const size = 14
  const gap = 6
  const rows = Math.ceil(total / cols)
  return (
    <figure>
      <svg
        viewBox={`0 0 ${cols * (size + gap) - gap} ${rows * (size + gap) - gap}`}
        className="w-[674px] h-auto"
        role="img"
        aria-label={`${total} squares, one per test case. ${before} were covered before; the rest are new.`}
      >
        {Array.from({ length: total }, (_, i) => (
          <rect
            key={i}
            x={(i % cols) * (size + gap)}
            y={Math.floor(i / cols) * (size + gap)}
            width={size}
            height={size}
            rx={2}
            className={i < before ? GREY_FILL : 'fill-sage'}
          />
        ))}
      </svg>
      <figcaption className="mt-5 flex gap-8 font-mono text-[14px] text-zinc-faded uppercase tracking-widest">
        <span className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded-xs bg-zinc-600 dark:bg-[#71717a]" aria-hidden="true" />
          {before} covered before
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded-xs bg-sage" aria-hidden="true" />
          {total}+ covered now
        </span>
      </figcaption>
    </figure>
  )
}

// MaiAgent memory: re-summarizing everything costs 1 + 2 + ... + N; condensing
// each message once grows with N. A picture of the shapes, not measured data.
// The new line and the gap appear at step `newAt`.
export function MemoryCostCurve({ newAt = 1 }: { newAt?: number }) {
  const showNew = useStep() >= newAt
  const N = 20
  const x0 = 60
  const x1 = 620
  const y0 = 300
  const y1 = 40
  const maxWork = (N * (N + 1)) / 2
  const sx = (n: number) => x0 + (n / N) * (x1 - x0)
  const sy = (w: number) => y0 - (w / maxWork) * (y0 - y1)
  const turns = Array.from({ length: N + 1 }, (_, n) => n)
  const oldPoints = turns.map((n) => `${sx(n)},${sy((n * (n + 1)) / 2)}`)
  const newPoints = turns.map((n) => `${sx(n)},${sy(1.5 * n)}`)

  return (
    <svg
      viewBox="0 0 880 340"
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Illustration: summed LLM work over a conversation. Re-summarizing every message on every turn curves upward as 1 + 2 + ... + N; condensing each message once grows in a straight line, and the gap widens every turn."
    >
      <Caption x={x0} y={20}>LLM WORK, SUMMED</Caption>
      <line x1={x0} y1={y1} x2={x0} y2={y0} className="stroke-zinc-300" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x1} y2={y0} className="stroke-zinc-300" strokeWidth={1} />
      <Caption x={x1} y={y0 + 34} anchor="end">TURNS IN A CONVERSATION</Caption>
      <Caption x={x0} y={y0 + 34}>ILLUSTRATION, NOT MEASURED</Caption>

      <polyline points={oldPoints.join(' ')} fill="none" className={GREY_STROKE} strokeWidth={2.5} />
      {/* Each line is named at its end */}
      <text x={x1 + 16} y={y1 + 6} className={`font-sans text-[17px] ${GREY_FILL}`}>
        Re-summarize all
        <tspan x={x1 + 16} dy={22}>1 + 2 + ... + N</tspan>
      </text>

      <g className={fade} style={{ opacity: showNew ? 1 : 0 }}>
        <polygon points={[...oldPoints, ...newPoints.slice().reverse()].join(' ')} className="fill-sage" fillOpacity={0.1} />
        <polyline points={newPoints.join(' ')} fill="none" className="stroke-sage" strokeWidth={2.5} />
        <text x={x1 + 16} y={sy(1.5 * N) - 4} className="font-sans text-[17px] fill-sage">
          Condense each once
          <tspan x={x1 + 16} dy={22}>Grows with N</tspan>
        </text>
        <text x={600} y={235} textAnchor="end" className="font-sans text-[17px] fill-sage">
          The gap grows every turn
        </text>
      </g>
    </svg>
  )
}

// What the context window holds each turn: memory takes fixed shares, so it
// never crowds out the rest however long the conversation runs
export function ContextWindow() {
  const top = 36
  const segments = [
    { h: 200, label: 'EVERYTHING ELSE', detail: 'System prompt, tools, documents', tone: 'rest' as const },
    { h: 46, label: 'LONG TERM · 10%', detail: 'Recalled from a vector DB', opacity: 0.45 },
    { h: 46, label: 'MID TERM · FIXED', detail: 'A fixed-length summary', opacity: 0.7 },
    { h: 92, label: 'SHORT TERM · 20%', detail: 'The latest messages', opacity: 1 },
  ]
  const placed = segments.reduce<{ y: number; items: (typeof segments[number] & { y: number })[] }>(
    (acc, segment) => ({ y: acc.y + segment.h, items: [...acc.items, { ...segment, y: acc.y }] }),
    { y: top, items: [] }
  ).items

  return (
    <svg
      viewBox="0 0 420 420"
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="The context window each turn: short-term memory takes 20%, a fixed-length mid-term summary a small fixed slice, long-term recall 10%, and everything else keeps the rest."
    >
      <Caption x={0} y={16}>CONTEXT WINDOW, EACH TURN</Caption>
      {placed.map((segment) => (
        <g key={segment.label}>
          <rect
            x={0}
            y={segment.y}
            width={64}
            height={segment.h - 2}
            rx={3}
            className={segment.tone === 'rest' ? 'fill-zinc-200' : 'fill-sage'}
            fillOpacity={segment.tone === 'rest' ? 1 : segment.opacity}
          />
          <text
            x={80}
            y={segment.y + segment.h / 2 - 3}
            className={`font-mono text-[15px] tracking-[0.1em] ${segment.tone === 'rest' ? 'fill-zinc-400' : 'fill-sage'}`}
          >
            {segment.label}
          </text>
          <text x={80} y={segment.y + segment.h / 2 + 18} className="font-sans text-[17px] fill-zinc-faded">
            {segment.detail}
          </text>
        </g>
      ))}
    </svg>
  )
}

const POISONING = [
  { metric: 'PRIVACY LEAKAGE', hint: 'Lower is better', values: [52.3, 38.6, 37.8] },
  { metric: 'ATTACK SUCCESS', hint: 'Lower is better', values: [56, 62, 50] },
  { metric: 'TASK SUCCESS', hint: 'Higher is better', values: [42, 36, 42] },
]
const CONDITIONS = ['BASELINE', 'WRAPPER', 'STEERING']

const formatDelta = (delta: number) => {
  const rounded = Math.round(delta * 10) / 10
  if (rounded === 0) return 'no change'
  return `${rounded > 0 ? '+' : ''}${rounded}pp`
}

// Tool-schema poisoning: the three metrics side by side, baseline, prompt
// wrapper and steering. Steering appears at step `steeringAt`.
export function PoisoningBars({ steeringAt = 1 }: { steeringAt?: number }) {
  const showSteering = useStep() >= steeringAt
  const base = 290
  const scale = 3 // px per percentage point
  const barW = 92
  const barGap = 18
  const fills = ['fill-zinc-300', GREY_FILL, 'fill-sage']

  return (
    <svg
      viewBox="0 0 1376 320"
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Single-turn runs on Llama 3.1-8B, 100 attacks each. Privacy leakage: baseline 52.3%, wrapper 38.6%, steering 37.8%. Attack success: baseline 56%, wrapper 62%, steering 50%. Task success: baseline 42%, wrapper 36%, steering 42%."
    >
      {POISONING.map((panel, p) => {
        const px = p * 488
        return (
          <g key={panel.metric}>
            <Caption x={px} y={16}>{panel.metric}</Caption>
            <text x={px} y={40} className="font-sans text-[15px] fill-zinc-faded">
              {panel.hint}
            </text>
            <line x1={px} y1={base} x2={px + 3 * barW + 2 * barGap} y2={base} className="stroke-zinc-300" strokeWidth={1} />
            {panel.values.map((value, i) => {
              const x = px + i * (barW + barGap)
              const h = value * scale
              const delta = i > 0 ? formatDelta(value - panel.values[0]) : null
              return (
                <g key={CONDITIONS[i]} className={fade} style={{ opacity: i === 2 && !showSteering ? 0 : 1 }}>
                  <path d={barPath(x, base - h, barW, h)} className={fills[i]} />
                  {delta && (
                    <text
                      x={x + barW / 2}
                      y={base - h - 36}
                      textAnchor="middle"
                      className={`font-mono text-[13px] ${i === 2 ? 'fill-sage' : 'fill-zinc-faded'}`}
                    >
                      {delta}
                    </text>
                  )}
                  <text x={x + barW / 2} y={base - h - 12} textAnchor="middle" className="font-sans text-[20px] fill-ink">
                    {value}%
                  </text>
                  <Caption x={x + barW / 2} y={base + 24} anchor="middle" className={i === 2 ? 'fill-sage' : 'fill-zinc-400'}>
                    {CONDITIONS[i]}
                  </Caption>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// A tiny seeded generator, so the illustration is the same on every render
function seeded(seed: number) {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const CLUSTERS = [
  { x: 120, y: 105 },
  { x: 305, y: 80 },
  { x: 505, y: 120 },
  { x: 195, y: 255 },
  { x: 430, y: 265 },
]

// Points in each cluster, and two pivots per cluster near its centre
const SCATTER = (() => {
  const random = seeded(7)
  const gaussian = () => Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random())
  const points = CLUSTERS.flatMap((c) =>
    Array.from({ length: 16 }, () => ({ x: c.x + gaussian() * 26, y: c.y + gaussian() * 20 }))
  )
  const pivots = CLUSTERS.flatMap((c) => [
    { x: c.x - 15, y: c.y - 7 },
    { x: c.x + 16, y: c.y + 9 },
  ])
  return { points, pivots }
})()

// Pivot pairs joined into the small graph: within each cluster, then across
const EDGES: [number, number][] = [
  [0, 1], [2, 3], [4, 5], [6, 7], [8, 9],
  [1, 2], [3, 4], [1, 6], [7, 8], [5, 9],
]

// Agentic Hybrid RAG: clusters in the vector store, a few pivots per cluster,
// then a graph built from the pivots alone. Pivots light up at `pivotAt`,
// the graph appears at `graphAt`.
export function PivotScatter({ pivotAt = 1, graphAt = 2 }: { pivotAt?: number; graphAt?: number }) {
  const step = useStep()
  const lit = step >= pivotAt
  const graph = step >= graphAt
  return (
    <svg
      viewBox="0 0 620 360"
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Illustration: chunks in a vector store form five clusters. Two pivot chunks per cluster are kept, and the graph is built from those pivots alone, small but spanning every cluster."
    >
      {CLUSTERS.map((c) => (
        <ellipse
          key={`${c.x}-${c.y}`}
          cx={c.x}
          cy={c.y}
          rx={68}
          ry={52}
          fill="none"
          className="stroke-zinc-300"
          strokeDasharray="4 5"
          strokeWidth={1.25}
        />
      ))}
      <g className={fade} style={{ opacity: lit ? 0.45 : 1 }}>
        {SCATTER.points.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={4} className="fill-zinc-400" />
        ))}
      </g>
      <g className={fade} style={{ opacity: graph ? 1 : 0 }}>
        {EDGES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={SCATTER.pivots[a].x}
            y1={SCATTER.pivots[a].y}
            x2={SCATTER.pivots[b].x}
            y2={SCATTER.pivots[b].y}
            className="stroke-sage"
            strokeWidth={2}
            strokeOpacity={0.8}
          />
        ))}
      </g>
      {/* Pivots sit in the cloud as ordinary points until they light up */}
      {SCATTER.pivots.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={4} className="fill-zinc-400" />
      ))}
      <g className={fade} style={{ opacity: lit ? 1 : 0 }}>
        {SCATTER.pivots.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={7} className="fill-sage stroke-paper" strokeWidth={2} />
        ))}
      </g>
      <Caption x={620} y={352} anchor="end">ILLUSTRATION</Caption>
    </svg>
  )
}

const INDEX_ROWS = [
  { metric: 'INDEXING TOKENS', clustered: 65, label: '65%' },
  { metric: 'RAGAS SCORE', clustered: 97.44, label: '-2.56%' },
]

// Clustered sample against the whole corpus, each indexed to the whole corpus
export function IndexTradeoffBars() {
  const x0 = 156
  const width = 380
  return (
    <svg
      viewBox="0 0 620 250"
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Against indexing the whole corpus, the clustered sample used 65% of the indexing tokens, a 35% saving, for RAGAS scores 2.56% lower."
    >
      {INDEX_ROWS.map((row, r) => {
        const y = r * 130
        return (
          <g key={row.metric}>
            <Caption x={0} y={y + 14}>{row.metric}</Caption>
            {[
              { name: 'Whole corpus', value: 100, label: '100%', fill: GREY_FILL, text: 'fill-zinc-faded' },
              { name: 'Clustered sample', value: row.clustered, label: row.label, fill: 'fill-sage', text: 'fill-sage' },
            ].map((bar, i) => {
              const by = y + 28 + i * 40
              const w = (bar.value / 100) * width
              return (
                <g key={bar.name}>
                  <text x={0} y={by + 21} className="font-sans text-[16px] fill-zinc-faded">
                    {bar.name}
                  </text>
                  <path d={barPath(x0, by, w, 30, 4, true)} className={bar.fill} />
                  <text x={x0 + w + 10} y={by + 21} className={`font-sans text-[17px] ${bar.text}`}>
                    {bar.label}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// Google triage: past runs, one row per device and one column per run, show
// whether a failure is one device or the whole service. Failed runs are dark;
// the pattern the agent reads is outlined in sage.
export function FailurePatterns() {
  const rows = 6
  const cols = 12
  const cell = 22
  const gap = 6
  const pitch = cell + gap
  const gridW = cols * pitch - gap
  const gridH = rows * pitch - gap
  const panels = [
    {
      title: 'ONE DEVICE BROKE',
      verdict: 'Only this device drops: a device issue',
      failed: (r: number, c: number) => (r === 2 && c >= 8) || (r === 4 && c === 3),
      outline: { x: 8 * pitch - 5, y: 2 * pitch - 5, w: 4 * pitch - gap + 10, h: cell + 10 },
    },
    {
      title: 'THE SERVICE BROKE',
      verdict: 'Every device drops at once: a service issue',
      failed: (r: number, c: number) => c >= 10 || (r === 1 && c === 5),
      outline: { x: 10 * pitch - 5, y: -5, w: 2 * pitch - gap + 10, h: gridH + 10 },
    },
  ]
  const panelGap = 110
  return (
    <svg
      viewBox={`0 0 ${2 * gridW + panelGap} ${gridH + 100}`}
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Illustration of past runs, one row per device and one column per run. When one device breaks, only its row turns to failures. When the service breaks, every device fails in the same latest runs."
    >
      {panels.map((panel, p) => {
        const ox = p * (gridW + panelGap)
        return (
          <g key={panel.title} transform={`translate(${ox}, 0)`}>
            <text x={0} y={16} className="font-mono text-[16px] tracking-[0.12em] fill-zinc-400">
              {panel.title}
            </text>
            <g transform="translate(0, 30)">
              {Array.from({ length: rows * cols }, (_, i) => {
                const r = Math.floor(i / cols)
                const c = i % cols
                return (
                  <rect
                    key={i}
                    x={c * pitch}
                    y={r * pitch}
                    width={cell}
                    height={cell}
                    rx={3}
                    className={panel.failed(r, c) ? GREY_FILL : 'fill-zinc-200'}
                  />
                )
              })}
              <rect
                {...{ x: panel.outline.x, y: panel.outline.y, width: panel.outline.w, height: panel.outline.h }}
                rx={7}
                fill="none"
                className="stroke-sage"
                strokeWidth={2.5}
              />
            </g>
            <text x={0} y={gridH + 64} className="font-sans text-[21px] fill-sage">
              {panel.verdict}
            </text>
          </g>
        )
      })}
      <text x={0} y={gridH + 94} className="font-mono text-[15px] tracking-[0.12em] fill-zinc-400">
        ROWS ARE DEVICES, COLUMNS ARE RUNS FROM OLDEST TO LATEST. ILLUSTRATION.
      </text>
    </svg>
  )
}
