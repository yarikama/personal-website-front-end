import type { ReactNode } from 'react'
import { codeLines, tokens, type TokenKind } from './codeText'

const TONE: Record<TokenKind, string> = {
  keyword: 'text-ink font-medium',
  string: 'text-sage',
  comment: 'text-zinc-400 italic',
  number: 'text-sage',
  plain: 'text-ink/85',
}

// A read-only block of Python, numbered by line. `code` is a template
// literal: the blank lines around it and its shared indent are dropped.
// `highlight` lights the lines being run (from 1), so a figure or a story
// can follow along. A long line scrolls inside the block, never the page.
// With a `caption` it stands as a figure of its own; without one it sits
// inside another (a Figure, a Steps).
export function Code({
  code,
  highlight = [],
  caption,
  label = 'Python code',
}: {
  code: string
  highlight?: number[]
  caption?: ReactNode
  label?: string
}) {
  const lines = codeLines(code)
  const gutter = String(lines.length).length
  const block = (
    <div className="overflow-x-auto bg-paper border border-zinc-200 dark:border-zinc-200/20" role="region" aria-label={label} tabIndex={0}>
      <pre className="m-0 min-w-max py-3 font-mono text-[0.8rem] leading-[1.7] [font-variant-ligatures:none]">
        <code>
          {lines.map((line, i) => {
            const lit = highlight.includes(i + 1)
            return (
              <span
                key={i}
                aria-current={lit ? 'step' : undefined}
                className={`block border-l-2 pr-4 transition-colors ${lit ? 'border-sage bg-sage/15' : 'border-transparent'}`}
              >
                <span aria-hidden className={`inline-block select-none pl-3 pr-4 text-right tabular-nums ${lit ? 'text-sage' : 'text-zinc-400'}`} style={{ width: `${gutter + 3.5}ch` }}>
                  {i + 1}
                </span>
                {tokens(line).map((token, k) => (
                  <span key={k} className={TONE[token.kind]}>
                    {token.text}
                  </span>
                ))}
                {/* An empty line keeps its height */}
                {!line && ' '}
              </span>
            )
          })}
        </code>
      </pre>
    </div>
  )
  if (!caption) return block
  return (
    <figure className="not-prose my-12">
      {block}
      <figcaption className="pt-3 text-sm text-zinc-faded leading-relaxed">{caption}</figcaption>
    </figure>
  )
}
