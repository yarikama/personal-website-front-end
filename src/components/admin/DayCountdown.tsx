import { useEffect, useState } from 'react'
import { untilMidnight } from '../../lib/time'

// How long until today ends, at local midnight, to the second.

export default function DayCountdown() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <span className="inline-flex items-baseline gap-2 font-mono text-sm text-zinc-faded" title="Until midnight">
      <time className="tabular-nums text-sage-ink" aria-live="off">
        {untilMidnight(now)}
      </time>
      left today
    </span>
  )
}
