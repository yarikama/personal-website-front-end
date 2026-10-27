// After a deploy, a tab opened before it still asks for the old build's
// chunks (a learning page, a lazy route), and they are gone; Vite reports
// that as `vite:preloadError`. Reloading fetches the new build. Once only:
// if a chunk is still missing right after a reload, something else is
// wrong, and the page shows its own error rather than reloading forever.

const KEY = 'reloaded-after-deploy'
// A second failure this soon after reloading is not a stale tab
const AGAIN_MS = 10_000

type Memory = Pick<Storage, 'getItem' | 'setItem'>

// Reloads unless it did so moments ago; says whether it did. Without a
// place to remember the last reload, it never does, so it can't loop.
export function reloadOnce(memory: Memory | null, now: number, reload: () => void): boolean {
  if (!memory) return false
  try {
    if (now - (Number(memory.getItem(KEY)) || 0) < AGAIN_MS) return false
    memory.setItem(KEY, String(now))
  } catch {
    return false
  }
  reload()
  return true
}

export function reloadAfterDeploy() {
  window.addEventListener('vite:preloadError', (event) => {
    let memory: Memory | null = null
    try {
      memory = window.sessionStorage
    } catch {
      // Storage blocked: leave the error to the page
    }
    // Handled: the reload replaces the page, so the import needn't fail
    if (reloadOnce(memory, Date.now(), () => window.location.reload())) event.preventDefault()
  })
}
