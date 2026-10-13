import { intro } from './intro'
import { work } from './work'
import { projects } from './projects'
import { closing } from './closing'
import type { SlideDef } from '../talk'

// The whole talk, in order. Reorder or cut here.
export const slides: SlideDef[] = [...intro, ...work, ...projects, ...closing]
