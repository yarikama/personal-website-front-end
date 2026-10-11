// A project description is plain text typed in the admin. Lines that start
// with "- " (or "• ") render as a bulleted list, so one field can hold a
// summary and the points behind it; any other line is prose. Consecutive prose
// lines join into one paragraph, as the browser used to render them, and a
// blank line starts a new one. A description with no bullets therefore renders
// exactly as before: one paragraph.

export type DescriptionBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }

// The marker needs whitespace after it, so "-5% latency" stays prose.
const BULLET = /^[-•]\s+/

export function descriptionBlocks(description: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = []
  let prose: string[] = []
  let items: string[] = []

  const flushProse = () => {
    if (prose.length) blocks.push({ kind: 'paragraph', text: prose.join(' ') })
    prose = []
  }
  const flushItems = () => {
    if (items.length) blocks.push({ kind: 'list', items })
    items = []
  }

  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      flushProse()
      flushItems()
    } else if (BULLET.test(line)) {
      flushProse()
      items.push(line.replace(BULLET, ''))
    } else {
      flushItems()
      prose.push(line)
    }
  }
  flushProse()
  flushItems()
  return blocks
}
