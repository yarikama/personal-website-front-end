import type { FigureMount, Tour } from '../../lib/hairline'

/** A Hairline figure drawn for this site: how to mount it, and the lap it walks on its own. */
export type FigureDef = {
  name: string
  // What the figure shows, for screen readers
  label: string
  // The figure's own number at its default strength (a stagger in ms, a radius…)
  value: number
  // Three to six viewBox points the unseen pointer visits, ending with null to return to rest
  tour: Tour
  mount: FigureMount
}
