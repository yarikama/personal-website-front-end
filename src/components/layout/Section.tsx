import { ReactNode } from 'react'
import Container from './Container'

interface SectionProps {
  children: ReactNode
  id?: string
  className?: string
  narrow?: boolean
  reading?: boolean
  fullWidth?: boolean
}

export default function Section({
  children,
  id,
  className = '',
  narrow = false,
  reading = false,
  fullWidth = false,
}: SectionProps) {
  const sectionClass = `py-[var(--section-spacing)] ${className}`

  if (fullWidth) {
    return (
      <section id={id} className={sectionClass}>
        {children}
      </section>
    )
  }

  return (
    <section id={id} className={sectionClass}>
      <Container narrow={narrow} reading={reading}>{children}</Container>
    </section>
  )
}
