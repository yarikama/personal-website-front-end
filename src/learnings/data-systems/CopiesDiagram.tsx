import { AnimatePresence, motion } from 'motion/react'
import { stale, type Copies, type Names } from './model'

const WIDTH = 640
const HEIGHT = 280
const BOX = { w: 170, h: 76 }
const PLACES = {
  database: { x: 40, y: 102 },
  cache: { x: 430, y: 24 },
  index: { x: 430, y: 180 },
}
const OWNER = { x: 300, y: 140 }

type Place = keyof typeof PLACES

function Box({ place, name, price, old }: { place: Place; name: string; price: number; old: boolean }) {
  const { x, y } = PLACES[place]
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <rect
        x={x}
        y={y}
        width={BOX.w}
        height={BOX.h}
        className={old ? 'fill-paper stroke-ink' : place === 'database' ? 'fill-sage/20 stroke-sage' : 'fill-paper stroke-zinc-400'}
        strokeWidth={old ? 2 : 1.5}
      />
      <text x={x + 12} y={y + 20} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {name}
      </text>
      <AnimatePresence mode="wait">
        <motion.text
          key={price}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          x={x + 12}
          y={y + 58}
          className="fill-ink font-serif text-[30px]"
        >
          ${price}
        </motion.text>
      </AnimatePresence>
      {old && (
        <text x={x + BOX.w - 12} y={y + 56} textAnchor="end" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
          Old price
        </text>
      )}
    </motion.g>
  )
}

// The price in each place it is kept, the ones out of step marked, and, with
// `owner`, who copies it from the record to the others
export default function CopiesDiagram({
  copies,
  names,
  shown = ['database', 'cache', 'index'],
  owner = false,
  updates = { cache: true, index: true },
}: {
  copies: Copies
  names: Names
  shown?: Place[]
  owner?: boolean
  // Which copies the owner updates: the line to a copy it forgets is left out
  updates?: { cache: boolean; index: boolean }
}) {
  const out = stale(copies)
  const from = { x: PLACES.database.x + BOX.w, y: PLACES.database.y + BOX.h / 2 }
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="One price kept in several places">
      {shown.includes('cache') && <line x1={from.x} y1={from.y} x2={PLACES.cache.x} y2={PLACES.cache.y + BOX.h / 2} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="4 4" />}
      {shown.includes('index') && <line x1={from.x} y1={from.y} x2={PLACES.index.x} y2={PLACES.index.y + BOX.h / 2} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="4 4" />}
      {owner && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {(['cache', 'index'] as const).filter((place) => updates[place]).map((place) => (
            <line
              key={place}
              x1={OWNER.x}
              y1={OWNER.y}
              x2={PLACES[place].x}
              y2={PLACES[place].y + BOX.h / 2}
              className="stroke-sage"
              strokeWidth={1.5}
            />
          ))}
          <line x1={from.x} y1={from.y} x2={OWNER.x} y2={OWNER.y} className="stroke-sage" strokeWidth={1.5} />
          <rect x={OWNER.x - 46} y={OWNER.y - 16} width={92} height={32} rx={16} className="fill-sage" />
          <text x={OWNER.x} y={OWNER.y + 4} textAnchor="middle" className="fill-paper font-mono text-[10px] uppercase tracking-widest">
            {names.owner}
          </text>
        </motion.g>
      )}
      {shown.map((place) => (
        <Box
          key={place}
          place={place}
          name={names[place]}
          price={copies[place]}
          old={place !== 'database' && out[place as 'cache' | 'index']}
        />
      ))}
    </svg>
  )
}
