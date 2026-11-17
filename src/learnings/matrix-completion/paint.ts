// How strongly to fill a cell for a rating from `low` to `high` (1 to 5
// unless a grid's own range shows it better): the higher, the deeper the sage
export const shade = (rating: number, low = 1, high = 5) => 0.1 + 0.8 * Math.max(0, Math.min(1, (rating - low) / (high - low)))

// A rating as the story writes it: whole and half stars plain, anything
// else to one decimal
export const starText = (x: number) => {
  const r = Math.round(x * 2) / 2
  if (Math.abs(x - r) < 0.005) return Number.isInteger(r) ? String(r) : r.toFixed(1)
  return x.toFixed(1)
}
