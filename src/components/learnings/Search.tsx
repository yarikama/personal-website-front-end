import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Hash, Search as SearchIcon, X } from 'lucide-react'
import { areaColours, homes, places, search } from '../../lib/learningGraph'
import { useIsDark } from '../../lib/theme'
import type { LearningGraph } from '../../types'

type Option = { kind: 'tag'; tag: string; count: number } | { kind: 'node'; slug: string; title: string; where: string | null; colour: string }

// One box to find a page or a tag by. Focused, it offers every tag; typed
// into, the tags and pages that match. A chosen tag stays in the box, a
// chosen page is flown to. `/` focuses it from anywhere on the map.
export default function Search({
  graph,
  tag,
  onTag,
  onSelect,
  className = '',
}: {
  graph: LearningGraph
  tag: string | null
  onTag: (tag: string | null) => void
  onSelect: (slug: string) => void
  className?: string
}) {
  const dark = useIsDark()
  const [typed, setTyped] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useId()

  const options = useMemo((): Option[] => {
    const found = search(graph, typed)
    const titles = new Map(graph.nodes.map((node) => [node.slug, node.title]))
    const at = places(graph)
    const home = homes(graph)
    const colours = areaColours(graph, dark)
    return [
      // A few tags while a page is being looked for; all of them before
      ...(typed.trim() ? found.tags.slice(0, 4) : found.tags).map(({ tag, count }): Option => ({ kind: 'tag', tag, count })),
      ...found.nodes.slice(0, 8).map((node): Option => {
        const area = at.get(node.slug)?.area
        const up = home.get(node.slug)
        return {
          kind: 'node',
          slug: node.slug,
          title: node.title,
          where: up ? (titles.get(up) ?? null) : null,
          colour: (area && colours.get(area)) || 'var(--color-zinc-400)',
        }
      }),
    ]
  }, [graph, typed, dark])

  // `/` to search, as on many sites, unless typing somewhere already
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== '/' || target.closest('input, textarea, [contenteditable="true"]')) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', focus)
    return () => window.removeEventListener('keydown', focus)
  }, [])

  const choose = (option: Option) => {
    if (option.kind === 'tag') onTag(option.tag === tag ? null : option.tag)
    else onSelect(option.slug)
    setTyped('')
    setOpen(false)
    input.current?.blur()
  }

  const keys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((at) => (options.length ? (at + step + options.length) % options.length : 0))
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault()
      choose(options[active])
    } else if (event.key === 'Escape') {
      setTyped('')
      setOpen(false)
      input.current?.blur()
    } else if (event.key === 'Backspace' && !typed && tag) {
      onTag(null)
    }
  }

  const shown = open && options.length > 0
  const optionId = (i: number) => `${list}-${i}`
  const firstNode = options.findIndex((option) => option.kind === 'node')

  return (
    <div className={`pointer-events-auto relative ${className}`}>
      <div className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-200/20 bg-paper/85 backdrop-blur-md px-3 py-2 transition-colors duration-300 focus-within:border-sage">
        <SearchIcon size={14} className="shrink-0 text-zinc-faded" aria-hidden />
        {tag && (
          <button
            onClick={() => onTag(null)}
            className="inline-flex shrink-0 items-center gap-1 bg-sage/15 px-1.5 py-0.5 font-mono text-[0.75rem] uppercase tracking-widest text-sage hover:bg-sage/25 transition-colors"
            aria-label={`Stop showing the tag ${tag}`}
          >
            {tag}
            <X size={12} />
          </button>
        )}
        <input
          ref={input}
          role="combobox"
          aria-expanded={shown}
          aria-controls={list}
          aria-autocomplete="list"
          aria-activedescendant={shown ? optionId(active) : undefined}
          aria-label="Search pages and tags"
          placeholder={tag ? '' : 'Search'}
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => {
            setActive(0)
            setOpen(true)
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={keys}
          // The box's border shows the focus, over the site's own outline
          style={{ outline: 'none' }}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-zinc-400"
        />
      </div>
      {shown && (
        <ul
          id={list}
          role="listbox"
          aria-label="Pages and tags"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain border border-zinc-200 dark:border-zinc-200/20 bg-paper/95 backdrop-blur-md py-1 animate-slide-enter"
        >
          {options.map((option, i) => (
            <li
              key={option.kind === 'tag' ? `#${option.tag}` : option.slug}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // Keep the focus in the box, which would close the list
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 ${i === active ? 'bg-zinc-200/60 dark:bg-zinc-200/10' : ''} ${
                i === firstNode && i > 0 ? 'mt-1 border-t border-zinc-200 pt-2.5 dark:border-zinc-200/20' : ''
              }`}
            >
              {option.kind === 'tag' ? (
                <>
                  <Hash size={12} className="shrink-0 text-zinc-400" aria-hidden />
                  <span className={`font-mono text-[0.8rem] uppercase tracking-widest ${option.tag === tag ? 'text-sage' : 'text-ink'}`}>
                    {option.tag}
                  </span>
                  <span className="ml-auto font-mono text-[0.75rem] text-zinc-400">{option.count}</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: option.colour }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{option.title}</span>
                  {option.where && <span className="shrink-0 max-w-[45%] truncate text-xs text-zinc-400">{option.where}</span>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
