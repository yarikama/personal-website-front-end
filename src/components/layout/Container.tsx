import { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
  narrow?: boolean
  // A learning page: between the two, so its figures have room and its
  // lines don't run too long
  reading?: boolean
}

export default function Container({ children, className = '', narrow = false, reading = false }: ContainerProps) {
  return (
    <div
      className={`
        mx-auto px-6 md:px-8 lg:px-12
        ${narrow ? 'max-w-3xl' : reading ? 'max-w-4xl' : 'max-w-6xl'}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
