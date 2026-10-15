import { Briefcase, FlaskConical, Handshake, User } from 'lucide-react'
import type { TalkContent } from '../../components/talk/talk'
import { intro } from './slides/intro'
import { work } from './slides/work'
import { projects } from './slides/projects'
import { closing } from './slides/closing'

const talk: TalkContent = {
  // Twenty minutes in all
  sections: [
    { id: 'intro', label: 'Who I am', minutes: 2, icon: User },
    { id: 'work', label: 'Two stories from work', minutes: 7, icon: Briefcase },
    { id: 'projects', label: 'Projects', minutes: 9, icon: FlaskConical },
    { id: 'close', label: "What I'd bring", minutes: 2, icon: Handshake },
  ],
  // The whole talk, in order. Reorder or cut here.
  slides: [...intro, ...work, ...projects, ...closing],
}

export default talk
