import { useEffect, useState } from 'react'
import { learningsService } from '../services/api'
import { demoGraph } from '../learnings/demo'
import type { LearningGraph } from '../types'

interface UseLearningGraphState {
  graph: LearningGraph | null
  // True while the real graph has nothing published (or cannot be reached),
  // and the sample stands in for it
  isDemo: boolean
  isLoading: boolean
}

export function useLearningGraph() {
  const [state, setState] = useState<UseLearningGraphState>({ graph: null, isDemo: false, isLoading: true })

  useEffect(() => {
    let live = true
    learningsService
      .getGraph()
      .then(({ data }) => data)
      .catch(() => null)
      .then((graph) => {
        if (!live) return
        const empty = !graph || graph.nodes.length === 0
        setState({ graph: empty ? demoGraph : graph, isDemo: empty, isLoading: false })
      })
    return () => {
      live = false
    }
  }, [])

  return state
}
