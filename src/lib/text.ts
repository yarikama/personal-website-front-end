// Joins the last few words of a line of text with non-breaking spaces, so a
// wrapped line never ends on one or two stranded words. Skipped when the
// joined words would be too long to fit a narrow column.
export function tieEnd(text: string, words = 3, maxChars = 26): string {
  const parts = text.split(' ')
  if (parts.length <= words) return text
  const tail = parts.slice(-words).join(' ')
  if (tail.length > maxChars) return words > 2 ? tieEnd(text, words - 1, maxChars) : text
  return [...parts.slice(0, -words), tail].join(' ')
}
