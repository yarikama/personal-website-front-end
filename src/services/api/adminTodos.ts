import { authFetch } from './adminLabNotes'
import type { ApiResponse } from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.yarikama.com/api/v1'

// Who put it on the list: the owner, the items added every day, or Claude's
// morning plan.
export type TodoSource = 'owner' | 'daily' | 'claude'
// The morning plan's groups: due today, to move on this week, can wait.
export type TodoBucket = 'today' | 'week' | 'later'

export interface Todo {
  id: string
  text: string
  href: string | null
  day: string // YYYY-MM-DD: the day it was for
  dailyKey: string | null // set on the items added every day
  doneOn: string | null
  createdAt: string
  source: TodoSource
  bucket: TodoBucket | null // the morning plan's items only
  reason: string | null // why the morning plan put it there
}

/** A date as YYYY-MM-DD in the browser's own time zone: the owner's today. */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const adminTodosService = {
  /** The day's list: what carried over first, then the day's own. */
  async list(day: string): Promise<Todo[]> {
    const { data } = await authFetch<{ data: Todo[] }>(
      `${API_BASE_URL}/admin/todos?${new URLSearchParams({ day })}`,
    )
    return data
  },

  /** Past to-dos' text, most recent first: what a new one completes from. */
  async history(): Promise<string[]> {
    const { data } = await authFetch<{ data: string[] }>(`${API_BASE_URL}/admin/todos/history`)
    return data
  },

  async add(text: string, day: string): Promise<Todo> {
    const { data } = await authFetch<ApiResponse<Todo>>(`${API_BASE_URL}/admin/todos`, {
      method: 'POST',
      body: JSON.stringify({ text, day }),
    })
    return data
  },

  async tick(id: string, done: boolean, day: string): Promise<Todo> {
    const { data } = await authFetch<ApiResponse<Todo>>(`${API_BASE_URL}/admin/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done, day }),
    })
    return data
  },

  async remove(id: string): Promise<void> {
    await authFetch<void>(`${API_BASE_URL}/admin/todos/${id}`, { method: 'DELETE' })
  },
}
