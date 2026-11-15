import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import ResponsiveImage from './ResponsiveImage'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div
      className={`prose prose-zinc dark:prose-invert max-w-none
        prose-headings:font-serif prose-headings:font-light
        prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8
        prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6
        prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-5
        prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4
        prose-p:text-zinc-faded prose-p:leading-relaxed
        prose-a:text-sage prose-a:no-underline hover:prose-a:underline
        prose-code:font-mono prose-code:text-sm
        prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:p-0
        [&_pre]:overflow-x-auto
        [&_.hljs]:p-4 [&_.hljs]:bg-zinc-900 [&_.hljs]:rounded-md
        ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          img: ({ node, ...props }) => (
            <ResponsiveImage {...props} sizes="(max-width: 768px) 100vw, 768px" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
