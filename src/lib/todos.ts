import type { Todo } from '../services/api/adminTodos'

/**
 * The past to-do that what is typed starts (ignoring case), if there is one
 * and it says more: completed as gray text after the caret.
 */
export function completion(typed: string, history: string[]): string | null {
  if (typed.trim().length < 2) return null
  const start = typed.toLowerCase()
  return history.find((text) => text.length > typed.length && text.toLowerCase().startsWith(start)) ?? null
}

export interface Arranged {
  // Left undone on earlier days: the owner's and the daily ones.
  carried: Todo[]
  // The morning plan's "today" first, then the owner's and the daily ones.
  today: Todo[]
  week: Todo[]
  later: Todo[]
}

/**
 * The day's list as the welcome page shows it. The morning plan's items go
 * by their bucket and never count as carried over, since each morning
 * redraws them; the others carry over in red as before.
 */
export function arrange(todos: Todo[], today: string): Arranged {
  const planned = todos.filter((todo) => todo.source === 'claude')
  const others = todos.filter((todo) => todo.source !== 'claude')
  const inBucket = (bucket: string) => planned.filter((todo) => (todo.bucket ?? 'today') === bucket)
  return {
    carried: others.filter((todo) => todo.day < today),
    today: [...inBucket('today'), ...others.filter((todo) => todo.day >= today)],
    week: inBucket('week'),
    later: inBucket('later'),
  }
}
