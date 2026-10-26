import { Globe, Mail, Phone } from 'lucide-react'
import { Github, Linkedin } from '../../../components/ui/brandIcons'
import FlipText from '../../../components/ui/FlipText'
import { Badge, Contacts, Entries } from '../../../components/talk/primitives'
import { TalkOutline } from './outline'
import type { SlideDef } from '../../../components/talk/talk'

export const intro: SlideDef[] = [
  {
    id: 'title',
    title: 'Henry Hsu',
    section: 'intro',
    bare: true,
    notes: [
      "Hi, I'm Henry. Thanks for having me.",
      'Finishing an M.C.S. at Rice. Before that, Industrial Engineering at NYCU with a CS minor.',
      'Work: GenAI team lead at MaiAgent, where I joined as an intern, and a SWE internship at Google this summer.',
      'Industrial Engineering taught me to optimize whole workflows, not just algorithms. You will see it in both stories.',
      'If asked about the badges: Presidential Hackathon winner in 2024 (top 5 nationally, urban noise agent); Golden Peak Award 2025 for the MaiAgent platform; NYCU AI Workshop Outstanding Award (top 3 of 50, a multi-agent RAG tutoring system).',
      'About 20 minutes of slides, then the rest of the hour is yours. Please interrupt me any time.',
    ],
    render: () => (
      <div className="h-full flex flex-col justify-center">
        <h1 className="font-serif font-light tracking-tight leading-none text-[72px]">
          <FlipText front="Henry" back="恒睿" />{' '}
          <FlipText front="Hsu" back="許" className="italic" backClassName="not-italic" />
        </h1>
        {/* Honours, styled like the badges in the home page hero */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Badge accent>2024 Presidential Hackathon Winner</Badge>
          <Badge>Golden Peak Award 2025</Badge>
          <Badge>NYCU AI Workshop Outstanding Award</Badge>
          <Badge>Dean's List × 2</Badge>
        </div>
        <div className="mt-8 h-px bg-zinc-300 dark:bg-zinc-300/60" aria-hidden="true" />
        {/* Mirrors resume_latex: content/resume/education and the experience modules */}
        <div className="mt-12 grid grid-cols-2 gap-20">
          <Entries
            heading="Education"
            items={[
              {
                logo: '/rice-logo.png',
                title: 'M.C.S., Computer Science',
                place: 'Rice University · GPA 4.00 / 4.00',
                period: 'Aug 2025 - Dec 2026 (expected)',
              },
              {
                logo: '/NYCU-logo.png',
                title: 'B.S., Industrial Engineering + CS Minor',
                place: 'National Yang Ming Chiao Tung University · GPA 4.07 / 4.30',
                note: 'President, IEM Student Association: 4 teams, 37 people',
                period: 'Sep 2020 - Jun 2024',
              },
            ]}
          />
          <Entries
            heading="Working experience"
            items={[
              {
                logo: '/logos/google.svg',
                title: 'Software Engineering Intern',
                place: 'Google',
                period: 'Jun - Aug 2026',
              },
              {
                logo: '/logos/maiagent.svg',
                title: 'Generative AI Team Lead',
                place: 'MaiAgent, joined as an intern',
                note: 'Owned the GenAI roadmap at a 10-person startup',
                period: 'Sep 2024 - Aug 2025',
              },
            ]}
          />
        </div>
        {/* Contact details, as on the resume header */}
        <div className="mt-14">
          <Contacts
            items={[
              { icon: <Globe size={20} strokeWidth={1.5} aria-hidden="true" />, label: 'yarikama.com' },
              { icon: <Mail size={20} strokeWidth={1.5} aria-hidden="true" />, label: 'hsuhengjui@gmail.com' },
              { icon: <Phone size={20} strokeWidth={1.5} aria-hidden="true" />, label: '+1-510-996-6837' },
              { icon: <Linkedin size={20} strokeWidth={1.5} aria-hidden="true" />, label: 'linkedin.com/in/yarikama' },
              { icon: <Github size={20} strokeWidth={1.5} aria-hidden="true" />, label: 'github.com/yarikama' },
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    id: 'outline',
    title: 'Outline',
    section: 'intro',
    notes: [
      'Four parts: who I am, two stories from work, projects, and what I would bring.',
      'The projects get the most time.',
    ],
    render: () => <TalkOutline />,
  },
]
