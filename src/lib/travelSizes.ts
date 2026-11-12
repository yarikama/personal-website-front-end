// The travel wall measures its prints in track units: --u in index.css is
// min(1vh, 1.3vw). On a landscape screen that is 1vh; on one narrower than
// 1.3 times its height (a phone held upright), 1.3vw. A print `units` wide
// is shown that wide in those units, so its `sizes` says the same, letting
// a phone pick the variant it needs instead of one sized for its height.
export const VW_PER_UNIT = 1.3

const round = (n: number) => Math.round(n * 10) / 10

export function travelPhotoSizes(units: number): string {
  return `(max-aspect-ratio: 13/10) ${round(units * VW_PER_UNIT)}vw, ${round(units)}vh`
}
