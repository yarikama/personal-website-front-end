import type { PhotoLayer } from '../ui/HeroPhoto'

// Split from one photo, far to near: sky and street, the bridge, the
// buildings on either side, the crowd (in black and white so Henry stands
// out), then Henry. vercel.json preloads these on the home page, so they
// start downloading with the HTML instead of after the script has run.
export const HERO_LAYERS: PhotoLayer[] = [
  { src: '/hero/sky.webp', depth: 3 },
  { src: '/hero/bridge.webp', depth: 7 },
  { src: '/hero/buildings.webp', depth: 12 },
  { src: '/hero/people.webp', depth: 17, grayscale: true },
  { src: '/hero/henry.webp', depth: 20 },
]
