// The Markov property on a playground swing. What you know about the swing
// at a moment is a state; it is Markov when knowing more of the past would
// not help you say what happens next. One photo (where the seat is) is not
// enough: forward or back? Two photos a moment apart (where, and which way,
// how fast) are as good as a video of the whole afternoon.

// The swing: an angle in degrees, swinging out to ±AMPLITUDE every PERIOD s
export const AMPLITUDE = 50
export const PERIOD = 4
// How far ahead to say where the seat will be, in seconds
export const AHEAD = 1
// The second photo is taken this long after the first
export const GAP = 0.15

export const angle = (t: number) => AMPLITUDE * Math.cos((2 * Math.PI * t) / PERIOD)

// What you know about the swing at time t
export type Knowing = 'one photo' | 'two photos' | 'the whole afternoon'
export const KNOWINGS: readonly Knowing[] = ['one photo', 'two photos', 'the whole afternoon']

// Where the seat could be AHEAD seconds after time t, given only what
// `knowing` keeps, with the share of moments like this one that go there.
// One photo shows where the seat is, and every swing passes each spot twice,
// once each way: two futures, which meet only at the very top. A second
// photo says which way it is going, and from then on there is one future;
// the rest of the afternoon adds nothing.
export function nextPlaces(knowing: Knowing, t: number): { angle: number; share: number }[] {
  const ahead = angle(t + AHEAD)
  if (knowing !== 'one photo') return [{ angle: ahead, share: 1 }]
  // The other moment the seat is here: the same spot, going the other way
  const mirror = angle(-t + AHEAD)
  return Math.abs(mirror - ahead) < 1
    ? [{ angle: ahead, share: 1 }]
    : [
        { angle: ahead, share: 0.5 },
        { angle: mirror, share: 0.5 },
      ]
}

// Which way the seat is going at time t: +1 forward, −1 back, as a second
// photo a moment earlier shows
export const way = (t: number) => (angle(t) - angle(t - GAP) >= 0 ? 1 : -1)

// The story's photo: the seat at the bottom, swinging forward
export const PHOTO = PERIOD * 0.75
