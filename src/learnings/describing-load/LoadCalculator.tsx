import { motion } from 'motion/react'
import { Readout } from '../../components/explain/figure'
import { pullWork, pushWork, short } from './model'

interface LoadCalculatorProps {
  posts: number
  reads: number
  followers: number
  biggest: number
}

// What each way of building timelines costs a second at the given load,
// side by side, and what one post from the biggest account costs
export default function LoadCalculator({ posts, reads, followers, biggest }: LoadCalculatorProps) {
  const pull = pullWork(reads, followers)
  const push = pushWork(posts, followers)
  const most = Math.max(pull, push)
  const rows = [
    { name: 'Fetch on read', value: pull },
    { name: 'Deliver on post', value: push },
  ]
  const cheaper = push < pull ? 'Deliver on post' : 'Fetch on read'
  return (
    <div>
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="flex justify-between font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
              <span>{row.name}</span>
              <span className="text-ink tabular-nums">{short(row.value)} / s</span>
            </div>
            <div className="mt-2 h-4 bg-zinc-200 dark:bg-zinc-200/10">
              <motion.div
                className={`h-full ${row.name === cheaper ? 'bg-sage' : 'bg-ink'}`}
                animate={{ width: `${Math.max(0.5, (row.value / most) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Readout label="Cheaper here" value={cheaper} accent />
        <Readout label="One post from the biggest account" value={`${short(biggest)} writes`} />
      </div>
    </div>
  )
}
