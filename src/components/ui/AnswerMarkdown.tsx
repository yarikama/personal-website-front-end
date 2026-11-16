import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { Turn } from '../../hooks'
import { CITATION_PENDING as PENDING, withCitations } from '../../lib/ask'

/**
 * An answer from the ask chat, rendered as Markdown. The text comes from a
 * model and is untrusted: raw HTML is dropped (skipHtml), unsafe link
 * protocols are stripped (react-markdown's default), and images are
 * dropped, so an answer cannot make the visitor's browser load anything.
 * Loaded lazily by the Ask section, with KaTeX for the math in answers
 * about the notes.
 */
/**
 * `anchor`: the id prefix of this answer's source list items, so the numbered
 * citations jump to them.
 */
export default function AnswerMarkdown({ turn, anchor }: { turn: Turn; anchor: string }) {
  const text = withCitations(turn, anchor) + (turn.status === 'streaming' ? ' ▍' : '')
  return (
    <div
      className="prose prose-zinc dark:prose-invert max-w-none text-[17px] leading-relaxed
        prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
        prose-headings:font-serif prose-headings:font-normal prose-headings:text-lg prose-headings:mt-4 prose-headings:mb-2
        prose-strong:font-semibold prose-a:text-sage-ink prose-a:no-underline hover:prose-a:underline
        prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-table:text-sm prose-th:font-sans prose-th:font-medium [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
    >
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: () => null,
          a: ({ href = '', children }) => {
            if (href === PENDING) {
              return <sup className="font-mono text-[0.6em] text-zinc-faded ml-0.5">·</sup>
            }
            if (href.startsWith(`#${anchor}-`)) {
              return (
                <sup className="ml-0.5 not-prose">
                  <a href={href} className="font-mono text-[0.6em] text-sage-ink hover:underline">
                    [{children}]
                  </a>
                </sup>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
