import { authFetch } from './adminLabNotes'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.yarikama.com/api/v1'

// What Claude's morning plan works from: the owner's long-term goals, and the
// notes Claude keeps on the owner between mornings. Markdown, each up to
// 4000 characters; empty when not written yet.
export interface Planner {
  goals: string
  goalsUpdatedAt: string | null
  notes: string
  notesUpdatedAt: string | null
}

export const PLANNER_MAX = 4000

export const adminPlannerService = {
  async get(): Promise<Planner> {
    const { data } = await authFetch<{ data: Planner }>(`${API_BASE_URL}/admin/planner`)
    return data
  },

  /** Changes what is given; the other is kept. */
  async set(change: { goals?: string; notes?: string }): Promise<Planner> {
    const { data } = await authFetch<{ data: Planner }>(`${API_BASE_URL}/admin/planner`, {
      method: 'PUT',
      body: JSON.stringify(change),
    })
    return data
  },
}
