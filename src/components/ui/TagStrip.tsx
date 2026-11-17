import { useEffect, useRef } from 'react'
import { kindOf } from '../../projects/tagKinds'
import { pickTag } from './pickTag'

/**
 * A project's tags as a row of coloured strips, one per tag at the tag's own
 * width, coloured by kind (see tagKinds.ts). At rest only the first tag is
 * open; as the pointer moves anywhere over the card (the `.group` around it),
 * the tag across from it opens (see pickTag), the others close in turn,
 * nearest first. Nothing changes width, so nothing moves out from under the
 * pointer. On a screen without hover every tag is open (index.css, .tag-strip).
 *
 * The strips are drawing; screen readers get the tags as one line of text.
 */
export default function TagStrip({ tags }: { tags: string[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const row = ref.current
    const card = row?.closest<HTMLElement>('.group')
    if (!row || !card) return
    const chips = Array.from(row.children) as HTMLElement[]
    let open = -2

    function show(a: number) {
      if (a === open) return
      const from = a >= 0 ? a : Math.max(open, 0)
      open = a
      const on = a < 0 ? 0 : a
      chips.forEach((chip, i) => {
        // The change spreads out from the tag picked: 40ms a step
        chip.style.setProperty('--delay', `${Math.abs(i - from) * 40}ms`)
        chip.classList.toggle('open', i === on)
      })
    }

    function move(e: PointerEvent) {
      show(pickTag(chips.map((chip) => chip.getBoundingClientRect()), e.clientX, e.clientY))
    }
    const leave = () => show(-1)

    show(-1)
    card.addEventListener('pointermove', move)
    card.addEventListener('pointerleave', leave)
    return () => {
      card.removeEventListener('pointermove', move)
      card.removeEventListener('pointerleave', leave)
    }
  }, [tags])

  if (!tags.length) return null
  return (
    <>
      <span className="sr-only">Tags: {tags.join(', ')}</span>
      <div ref={ref} aria-hidden="true" className="tag-strip">
        {tags.map((tag) => (
          <span key={tag} className="tag-strip-chip" data-kind={kindOf(tag)}>
            <span>{tag}</span>
          </span>
        ))}
      </div>
    </>
  )
}
