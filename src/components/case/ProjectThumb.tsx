import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import ResponsiveImage from '../ui/ResponsiveImage'
import { EASE, useSeen } from './motion'

// A small drawing of each project's idea, for its card on the works list.
// Drawn in the site's colours, so it follows dark mode, and it draws itself
// in when it comes into view (again on hover). Each picture is the project's
// one-line hook made visible: what the story page then explains.

interface Go {
  go: boolean
  rm: boolean
}

const at = (g: Go, delay = 0, duration = 0.8) => (g.rm ? { duration: 0 } : { delay, duration, ease: EASE })

// A line that draws itself from one end
function Draw({
  g,
  d,
  delay = 0,
  duration = 0.8,
  className = 'stroke-ink',
  width = 1.5,
}: {
  g: Go
  d: string
  delay?: number
  duration?: number
  className?: string
  width?: number
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      className={className}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={g.go ? { pathLength: 1, opacity: 1 } : {}}
      transition={at(g, delay, duration)}
    />
  )
}

// Something that appears, growing a little from its centre
function Show({ g, delay = 0, from = 0.6, children }: { g: Go; delay?: number; from?: number; children: ReactNode }) {
  return (
    <motion.g
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      initial={{ opacity: 0, scale: from }}
      animate={g.go ? { opacity: 1, scale: 1 } : {}}
      transition={at(g, delay, 0.5)}
    >
      {children}
    </motion.g>
  )
}

const WARM_STROKE = 'stroke-[#b08d57]'
const WARM_FILL = 'fill-[#b08d57]'

// This site, its database and two models, on one laptop behind a tunnel
function Homelab({ g }: { g: Go }) {
  const blocks = [
    { x: 128, y: 42, tone: 'fill-sage' },
    { x: 168, y: 42, tone: 'fill-sage/50' },
    { x: 128, y: 68, tone: 'fill-ink/80' },
    { x: 168, y: 68, tone: 'fill-ink/80' },
  ]
  return (
    <>
      <Show g={g}>
        <circle cx={34} cy={75} r={16} fill="none" className="stroke-zinc-400" strokeWidth={1.5} />
        <path d="M18,75 H50 M34,59 C26,68 26,82 34,91 M34,59 C42,68 42,82 34,91" fill="none" className="stroke-zinc-400" strokeWidth={1} />
      </Show>
      <Draw g={g} d="M54,75 H116" className="stroke-zinc-400" delay={0.3} width={1.5} />
      <Draw g={g} d="M120,38 a4,4 0 0 1 4,-4 h84 a4,4 0 0 1 4,4 v58 h-92 Z M110,100 H222 L214,110 H118 Z" delay={0.2} duration={1} />
      {blocks.map((b, i) => (
        <Show key={i} g={g} delay={0.8 + i * 0.15}>
          <rect x={b.x} y={b.y} width={36} height={22} rx={3} className={b.tone} />
        </Show>
      ))}
      <motion.circle
        r={4}
        cy={75}
        className="fill-sage"
        initial={{ cx: 54, opacity: 0 }}
        animate={g.go ? { cx: [54, 116], opacity: [0, 1, 1, 0] } : {}}
        transition={g.rm ? { duration: 0 } : { delay: 1.5, duration: 1.1, ease: 'easeInOut' }}
      />
    </>
  )
}

// Three quarters of the image patches dropped; the ones on the subject kept
function Papit({ g }: { g: Go }) {
  const cells = []
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 10; c++) {
      const kept = c >= 4 && c <= 8 && r >= 1 && r <= 3
      cells.push({ r, c, kept })
    }
  return (
    <>
      {cells.map(({ r, c, kept }) => (
        <motion.rect
          key={`${r}-${c}`}
          x={30 + c * 18}
          y={20 + r * 18}
          width={16}
          height={16}
          rx={2}
          className={kept ? 'fill-sage' : 'fill-zinc-400'}
          initial={{ opacity: 0 }}
          animate={g.go ? { opacity: kept ? [0, 0.55, 1] : [0, 0.55, 0.14] } : {}}
          transition={g.rm ? { duration: 0 } : { delay: 0.1 + ((r * 3 + c * 7) % 11) * 0.06, duration: 1.6, times: [0, 0.35, 1] }}
        />
      ))}
      <Draw g={g} d="M99,35 H195 V91 H99 Z" className="stroke-ink" delay={1.4} duration={0.8} width={1.5} />
    </>
  )
}

// A tool's description pulls the agent toward a leak; steered back
function Poisoned({ g }: { g: Go }) {
  return (
    <>
      <Draw g={g} d="M26,34 h66 a6,6 0 0 1 6,6 v70 a6,6 0 0 1 -6,6 h-66 a6,6 0 0 1 -6,-6 v-70 a6,6 0 0 1 6,-6 Z" className="stroke-zinc-400" duration={0.9} />
      {[50, 62, 74].map((y, i) => (
        <Draw key={y} g={g} d={`M32,${y} H${i === 1 ? 70 : 84}`} className="stroke-zinc-400" delay={0.4 + i * 0.1} duration={0.4} width={2} />
      ))}
      <Draw g={g} d="M32,94 H86" className={WARM_STROKE} delay={0.8} duration={0.5} width={3} />
      <Draw g={g} d="M100,75 H152" className="stroke-zinc-400" delay={0.9} duration={0.4} />
      <Show g={g} delay={1}>
        <circle cx={168} cy={75} r={15} fill="none" className="stroke-ink" strokeWidth={1.5} />
        <circle cx={168} cy={75} r={5} className="fill-ink" />
      </Show>
      <motion.path
        d="M183,78 C202,82 212,100 220,124"
        fill="none"
        className={WARM_STROKE}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={g.go ? { pathLength: 1, opacity: 0.25 } : {}}
        transition={g.rm ? { duration: 0 } : { pathLength: { delay: 1.3, duration: 0.6, ease: EASE }, opacity: { delay: 2.4, duration: 0.5 } }}
      />
      <Draw g={g} d="M183,72 C202,68 212,50 220,28 M212,32 L220,28 L222,37" className="stroke-sage" delay={2.1} duration={0.7} width={2.5} />
    </>
  )
}

// Error as the factory grows: a sum blows up, a mean stays flat
function ShopScale({ g }: { g: Go }) {
  const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  const sum: [number, number][] = [[34, 110], [72, 106], [110, 92], [148, 70], [186, 46], [220, 24]]
  const mean: [number, number][] = [[34, 112], [72, 110], [110, 109], [148, 108], [186, 107], [220, 106]]
  return (
    <>
      <Show g={g} from={1}>
        <rect x={34} y={18} width={42} height={106} className="fill-sage/10" />
      </Show>
      <Draw g={g} d="M34,18 V124 H222" className="stroke-zinc-400" duration={0.6} width={1} />
      <Draw g={g} d={line(sum)} className={WARM_STROKE} delay={0.5} duration={1.2} width={2} />
      <Draw g={g} d={line(mean)} className="stroke-sage" delay={0.8} duration={1.2} width={3} />
      <Show g={g} delay={1.8}>
        <circle cx={220} cy={24} r={4} className={WARM_FILL} />
        <circle cx={220} cy={106} r={4.5} className="fill-sage" />
      </Show>
    </>
  )
}

// An agent choosing, per question, the graph, the vector store, or both
function HybridRag({ g }: { g: Go }) {
  const nodes: [number, number][] = [[162, 30], [196, 20], [216, 46], [184, 56]]
  return (
    <>
      <Show g={g}>
        <circle cx={58} cy={75} r={15} fill="none" className="stroke-ink" strokeWidth={1.5} />
        <circle cx={58} cy={75} r={5} className="fill-ink" />
      </Show>
      <Draw g={g} d="M162,30 L196,20 L216,46 L184,56 Z M162,30 L216,46" className="stroke-zinc-400" delay={0.2} width={1} />
      {nodes.map(([x, y], i) => (
        <Show key={i} g={g} delay={0.3 + i * 0.08}>
          <circle cx={x} cy={y} r={5} className="fill-ink/80" />
        </Show>
      ))}
      {[96, 106, 116].map((y, i) => (
        <Show key={y} g={g} delay={0.4 + i * 0.08}>
          <rect x={160} y={y} width={58} height={6} rx={3} className="fill-ink/70" />
        </Show>
      ))}
      <Draw g={g} d="M73,70 C108,60 128,38 154,33" className="stroke-zinc-300" delay={0.6} width={1.5} />
      <Draw g={g} d="M73,80 C108,90 128,104 152,106" className="stroke-zinc-300" delay={0.6} width={1.5} />
      <Draw g={g} d="M73,70 C108,60 128,38 154,33" className="stroke-sage" delay={1.3} width={2.5} />
      <Draw g={g} d="M73,80 C108,90 128,104 152,106" className="stroke-sage" delay={1.8} width={2.5} />
    </>
  )
}

// Agents passing the problem round until it is solved
function MultiAgent({ g }: { g: Go }) {
  const agents: [number, number][] = [[120, 26], [168, 75], [120, 124], [72, 75]]
  return (
    <>
      <Draw g={g} d="M132,30 Q160,40 164,62 M164,88 Q160,110 132,120 M108,120 Q80,110 76,88 M76,62 Q80,40 108,30" className="stroke-sage" delay={0.5} duration={1.4} width={2} />
      {agents.map(([x, y], i) => (
        <Show key={i} g={g} delay={i * 0.12}>
          <circle cx={x} cy={y} r={11} className="fill-paper stroke-ink" strokeWidth={1.5} />
          <circle cx={x} cy={y} r={3.5} className="fill-ink" />
        </Show>
      ))}
      <Draw g={g} d="M108,76 L117,85 L134,64" className="stroke-sage" delay={1.9} duration={0.5} width={3} />
    </>
  )
}

// A B+ tree, a lookup finding its leaf
function Database({ g }: { g: Go }) {
  const mids = [40, 100, 160]
  const leaves = [16, 52, 88, 124, 160, 196]
  return (
    <>
      <Draw g={g} d={`${mids.map((x) => `M120,36 L${x + 20},58`).join(' ')} ${leaves.map((x, i) => `M${mids[Math.floor(i / 2)] + 20},74 L${x + 14},100`).join(' ')}`} className="stroke-zinc-400" delay={0.2} width={1} />
      <Show g={g}>
        <rect x={100} y={20} width={40} height={16} rx={3} className="fill-ink/80" />
      </Show>
      {mids.map((x, i) => (
        <Show key={x} g={g} delay={0.3 + i * 0.08}>
          <rect x={x} y={58} width={40} height={16} rx={3} className={x === 100 ? 'fill-ink/80' : 'fill-zinc-400'} />
        </Show>
      ))}
      {leaves.map((x, i) => (
        <Show key={x} g={g} delay={0.6 + i * 0.06}>
          <rect x={x} y={100} width={28} height={16} rx={3} className="fill-zinc-400" />
        </Show>
      ))}
      <Draw g={g} d="M44,108 H52 M80,108 H88 M116,108 H124 M152,108 H160 M188,108 H196" className="stroke-zinc-400" delay={1} width={1} />
      <Draw g={g} d="M120,36 L120,58 M120,74 L102,100" className="stroke-sage" delay={1.3} duration={0.7} width={2.5} />
      <Show g={g} delay={1.9}>
        <rect x={88} y={100} width={28} height={16} rx={3} className="fill-sage" />
      </Show>
      <Draw g={g} d="M16,134 H224" className="stroke-zinc-300" delay={0.9} width={3} />
    </>
  )
}

// A post with its threaded replies
function Social({ g }: { g: Go }) {
  const replies = [
    { x: 62, y: 70, w: 110 },
    { x: 78, y: 92, w: 90 },
    { x: 62, y: 114, w: 120 },
  ]
  return (
    <>
      <Draw g={g} d="M32,16 h176 a8,8 0 0 1 8,8 v102 a8,8 0 0 1 -8,8 h-176 a8,8 0 0 1 -8,-8 v-102 a8,8 0 0 1 8,-8 Z" className="stroke-zinc-400" duration={1} />
      <Show g={g} delay={0.3}>
        <circle cx={44} cy={36} r={9} className="fill-sage" />
      </Show>
      <Draw g={g} d="M60,32 H130" className="stroke-ink" delay={0.4} duration={0.4} width={3} />
      <Draw g={g} d="M60,44 H190" className="stroke-zinc-400" delay={0.5} duration={0.5} width={2} />
      <Draw g={g} d="M44,52 V114 M44,114 H54 M62,80 V92 H70" className="stroke-zinc-300" delay={0.8} width={1.5} />
      {replies.map((c, i) => (
        <Show key={i} g={g} delay={1 + i * 0.25}>
          <circle cx={c.x} cy={c.y} r={5.5} className={i === 1 ? 'fill-sage/60' : 'fill-ink/70'} />
          <rect x={c.x + 10} y={c.y - 2} width={c.w} height={4} rx={2} className="fill-zinc-400" />
        </Show>
      ))}
    </>
  )
}

// One server, clients around it, messages flowing in
function GameServer({ g }: { g: Go }) {
  const clients: [number, number][] = [[34, 30], [34, 120], [206, 30], [206, 120]]
  return (
    <>
      <Draw g={g} d={clients.map(([x, y]) => `M${x},${y} L120,75`).join(' ')} className="stroke-zinc-300" delay={0.3} width={1.5} />
      <Show g={g}>
        <rect x={98} y={53} width={44} height={44} rx={6} className="fill-ink/85" />
        <path d="M106,66 H134 M106,75 H134 M106,84 H134" className="stroke-paper" strokeWidth={2} />
      </Show>
      {clients.map(([x, y], i) => (
        <g key={i}>
          <Show g={g} delay={0.2 + i * 0.1}>
            <circle cx={x} cy={y} r={10} className="fill-paper stroke-ink" strokeWidth={1.5} />
          </Show>
          <motion.circle
            r={3.5}
            className="fill-sage"
            initial={{ cx: x, cy: y, opacity: 0 }}
            animate={g.go ? { cx: [x, 120], cy: [y, 75], opacity: [0, 1, 1, 0] } : {}}
            transition={g.rm ? { duration: 0 } : { delay: 0.9 + i * 0.25, duration: 0.9, ease: 'easeInOut' }}
          />
        </g>
      ))}
    </>
  )
}

// A skeleton of a few joints, mid-squat
function Skeleton({ g }: { g: Go }) {
  const joints: [number, number][] = [
    [120, 38], [104, 42], [136, 42], [96, 60], [144, 60], [108, 74], [132, 74],
    [110, 84], [130, 84], [90, 106], [150, 106], [100, 132], [140, 132],
  ]
  return (
    <>
      <Draw
        g={g}
        d="M104,42 H136 M104,42 L96,60 L108,74 M136,42 L144,60 L132,74 M120,38 L120,84 M110,84 H130 M110,84 L90,106 L100,132 M130,84 L150,106 L140,132"
        className="stroke-ink"
        duration={1.2}
        width={2}
      />
      <Show g={g} delay={0.3}>
        <circle cx={120} cy={24} r={9} fill="none" className="stroke-ink" strokeWidth={2} />
      </Show>
      {joints.map(([x, y], i) => (
        <Show key={i} g={g} delay={0.8 + i * 0.05}>
          <circle cx={x} cy={y} r={3.5} className="fill-sage" />
        </Show>
      ))}
      <Show g={g} delay={1.7}>
        <rect x={176} y={62} width={44} height={22} rx={11} className="fill-sage/15 stroke-sage" strokeWidth={1.5} />
        <path d="M188,73 L195,79 L208,67" fill="none" className="stroke-sage" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Show>
    </>
  )
}

// Care homes on a map, the nearby ones picked out
function CareMap({ g }: { g: Go }) {
  const homes: [number, number][] = [
    [30, 30], [58, 118], [74, 44], [96, 98], [104, 60], [138, 92], [132, 50], [150, 70], [112, 82],
    [170, 34], [186, 112], [206, 60], [214, 126], [44, 78], [160, 128], [92, 22], [196, 88], [24, 128], [222, 24],
  ]
  const near = ([x, y]: [number, number]) => Math.hypot(x - 122, y - 72) < 38
  return (
    <>
      <Draw g={g} d="M12,56 C70,62 150,50 228,64 M12,108 C80,100 160,116 228,98 M64,8 C70,60 58,100 66,142 M176,8 C170,60 182,100 172,142" className="stroke-zinc-300" duration={1.1} width={4} />
      {homes.map((p, i) => (
        <motion.circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={3.5}
          initial={{ opacity: 0 }}
          animate={g.go ? { opacity: near(p) ? 1 : 0.5 } : {}}
          transition={at(g, 0.4 + (i % 7) * 0.05, 0.4)}
          className={near(p) ? 'fill-sage' : 'fill-zinc-400'}
        />
      ))}
      <Draw g={g} d="M122,34 A38,38 0 1 1 121.9,34" className="stroke-sage" delay={1} duration={1} width={1.5} />
      <Show g={g} delay={0.8} from={0.2}>
        <path d="M122,74 C114,64 112,60 112,56 a10,10 0 0 1 20,0 C132,60 130,64 122,74 Z" className="fill-ink" />
        <circle cx={122} cy={56} r={3.5} className="fill-paper" />
      </Show>
    </>
  )
}

// A schedule as a Gantt chart: jobs placed on machines, the finish line marked
function Gantt({ g }: { g: Go }) {
  const tones = ['fill-sage', 'fill-sage/45', 'fill-ink/70', WARM_FILL]
  const rows: [number, number, number][][] = [
    [[24, 44, 0], [72, 30, 1], [130, 52, 2]],
    [[24, 30, 2], [58, 56, 3], [118, 40, 0]],
    [[40, 48, 1], [92, 36, 0], [150, 46, 3]],
    [[24, 22, 3], [66, 54, 2], [124, 48, 1]],
  ]
  return (
    <>
      <Draw g={g} d="M22,18 V132" className="stroke-zinc-400" duration={0.4} width={1} />
      {rows.map((row, r) =>
        row.map(([x, w, t], k) => (
          <motion.rect
            key={`${r}-${k}`}
            x={x}
            y={22 + r * 28}
            width={w - 3}
            height={20}
            rx={3}
            className={tones[t]}
            style={{ transformBox: 'fill-box', transformOrigin: 'left' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={g.go ? { scaleX: 1, opacity: 1 } : {}}
            transition={at(g, 0.2 + k * 0.3 + r * 0.08, 0.5)}
          />
        )),
      )}
      <Draw g={g} d="M200,14 V136" className="stroke-sage" delay={1.5} duration={0.5} width={2} />
    </>
  )
}

// Two Tetris boards side by side, a piece falling into each
function Tetris({ g }: { g: Go }) {
  const S = 9
  const stack = (x0: number, holes: number[]) =>
    [0, 1, 2].flatMap((r) =>
      Array.from({ length: 7 }, (_, c) => c)
        .filter((c) => !(r === 2 && holes.includes(c)))
        .map((c) => ({ x: x0 + 2 + c * S, y: 136 - (r + 1) * S })),
    )
  const board = (x0: number, holes: number[], piece: [number, number][], tone: string, delay: number) => (
    <g>
      <Draw g={g} d={`M${x0},14 V138 H${x0 + 67} V14`} className="stroke-zinc-400" duration={0.6} width={1.5} />
      {stack(x0, holes).map((b, i) => (
        <Show key={i} g={g} delay={0.3 + i * 0.015} from={1}>
          <rect x={b.x} y={b.y} width={S - 1} height={S - 1} className="fill-zinc-400" />
        </Show>
      ))}
      <motion.g initial={{ y: -80, opacity: 0 }} animate={g.go ? { y: 0, opacity: 1 } : {}} transition={g.rm ? { duration: 0 } : { delay, duration: 1, ease: 'easeIn' }}>
        {piece.map(([c, r], i) => (
          <rect key={i} x={x0 + 2 + c * S} y={136 - (r + 1) * S} width={S - 1} height={S - 1} className={tone} />
        ))}
      </motion.g>
    </g>
  )
  return (
    <>
      {board(44, [4, 5], [[4, 2], [5, 2], [4, 3], [5, 3]], 'fill-sage', 0.8)}
      {board(130, [2], [[2, 2], [2, 3], [2, 4], [2, 5]], WARM_FILL, 1.1)}
    </>
  )
}

const ART: Record<string, (props: { g: Go }) => ReactNode> = {
  'homelab-self-hosted-llm-platform': Homelab,
  'prompt-aware-image-token-pruning': Papit,
  'defending-llm-agents-against-tool-schema-poisoning': Poisoned,
  'cross-size-generalization-gnn-job-shop-scheduling': ShopScale,
  'agentic-hybrid-graph-vector-rag-system': HybridRag,
  'multi-agent-ai-system-with-rag': MultiAgent,
  'relational-database-engine-from-scratch': Database,
  'ricebook-full-stack-social-network': Social,
  'chat-bar-real-time-multiplayer-game-server': GameServer,
  'ai-fitness-motion-classification-with-mediapipe': Skeleton,
  'elderly-care-map-platform': CareMap,
  'bayesian-optimization-genetic-algorithm-job-shop-scheduling': Gantt,
  'ai-game-agents-tetris-arena': Tetris,
}

// The project's drawing, or its cover image when it has no drawing, or
// nothing at all
export default function ProjectThumb({ slug, cover, className = '' }: { slug?: string; cover?: string | null; className?: string }) {
  const { ref, seen, reducedMotion } = useSeen<HTMLDivElement>(0.5)
  // Hovering draws it again
  const [round, setRound] = useState(0)
  const Art = slug ? ART[slug] : undefined
  if (!Art && !cover) return null
  return (
    <div
      ref={ref}
      onMouseEnter={() => !reducedMotion && setRound((r) => r + 1)}
      className={`overflow-hidden rounded-2xl border border-zinc-200 bg-paper-dark dark:border-zinc-200 ${className}`}
    >
      {Art ? (
        <svg viewBox="0 0 240 150" className="block h-full w-full" aria-hidden="true">
          <g key={round}>
            <Art g={{ go: seen, rm: reducedMotion }} />
          </g>
        </svg>
      ) : (
        <ResponsiveImage src={cover!} alt="" sizes="320px" className="h-full w-full object-cover" />
      )}
    </div>
  )
}
