import type { ReactNode } from 'react'

// Labels are set in capitals with CSS, which turns a Greek letter into a
// different symbol: λ becomes Λ, β becomes Β (which reads as B), σ becomes Σ.
// keepCase wraps each run of Greek letters so it keeps the case it was written in.
const GREEK = /([Ͱ-Ͽἀ-῿]+)/

export function keepCase(text: string): ReactNode {
  const parts = text.split(GREEK)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 ? (
      <span key={i} className="normal-case">
        {part}
      </span>
    ) : (
      part
    ),
  )
}
