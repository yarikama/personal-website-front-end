import { createContext, useContext, useEffect, useId } from 'react'
import { readProgress, recordReading, stageOf } from '../../lib/progress'

export interface Checks {
  register: (id: string) => () => void
  answer: (id: string, right: boolean) => void
}

export const ChecksContext = createContext<Checks | null>(null)

// The checks of one reading of `slug`: once all of them are answered the
// reading counts. The first time, answering is enough; after that, every
// answer has to be right. Once a visit.
export function checksOf(slug: string): Checks {
  const answers = new Map<string, boolean | null>()
  const reading = { counted: false }
  return {
    register: (id) => {
      answers.set(id, null)
      return () => answers.delete(id)
    },
    answer: (id, right) => {
      answers.set(id, right)
      const all = [...answers.values()]
      if (reading.counted || all.some((answer) => answer === null)) return
      const first = stageOf(readProgress()[slug], Date.now()) === 0
      if (!first && !all.every(Boolean)) return
      reading.counted = true
      recordReading(slug)
    },
  }
}

// For a check on a page: tells the reading it is there, and how it was
// answered. Outside a reading, it does nothing.
export function useCheck(isCheck: boolean) {
  const checks = useContext(ChecksContext)
  const id = useId()
  useEffect(() => {
    if (isCheck && checks) return checks.register(id)
  }, [checks, id, isCheck])
  return (right: boolean) => {
    if (isCheck) checks?.answer(id, right)
  }
}
