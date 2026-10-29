import type { ReactNode } from 'react'

// A board with a line of labels above it: what the figure shows on the
// left, a number on the right. Every figure in a story has one, so the
// story doesn't jump as its steps change.
export default function Labelled({
  left,
  right,
  children,
}: {
  left: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <p className="flex min-h-[1.25rem] justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
        <span>{left}</span>
        <span>{right}</span>
      </p>
      <div className="mt-3">{children}</div>
    </div>
  )
}
