// The travel wall measures its prints in track units: --u in index.css is
// min(1vh, 1.3vw). On a landscape screen that is 1vh; on one narrower than
// 1.3 times its height (a phone held upright), 1.3vw. A print `units` wide
// is shown that wide in those units, so its `sizes` says the same, letting
// a phone pick the variant it needs instead of one sized for its height.
export const VW_PER_UNIT = 1.3

// On an upright phone at 3x or more, sizes claims two thirds of the width,
// so the browser picks a variant for 2x: a print about 200 px wide stays
// sharp at 400 px and loads in about a third of the bytes.
const PHONE_DENSITY_CAP = 2 / 3

const round = (n: number) => Math.round(n * 10) / 10

export function travelPhotoSizes(units: number): string {
  const upright = units * VW_PER_UNIT
  return [
    `(max-aspect-ratio: 13/10) and (min-resolution: 3dppx) ${round(upright * PHONE_DENSITY_CAP)}vw`,
    `(max-aspect-ratio: 13/10) ${round(upright)}vw`,
    `${round(units)}vh`,
  ].join(', ')
}
