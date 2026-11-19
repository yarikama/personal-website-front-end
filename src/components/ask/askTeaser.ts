// The bubble beside the chat button that tells a first-time visitor they can
// ask about the owner. It shows once per browser: remembered as soon as it
// appears, so it never comes back after a reload or on a later visit.

export const TEASER_KEY = 'ask-teaser-seen'
// Long enough for the page to settle first, so it does not flash in with it
export const TEASER_DELAY_MS = 1500

// Two short questions from the chat's own suggestions, ones the model
// answers well
export const TEASER_QUESTIONS = ['What did Henry build at Google?', 'What is PAPIT?']

type Store = Pick<Storage, 'getItem' | 'setItem'>

function store(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function teaserSeen(storage: Store | null = store()): boolean {
  // Without storage (private mode, blocked) it is never shown: a bubble on
  // every page load would be worse than none.
  if (!storage) return true
  try {
    return storage.getItem(TEASER_KEY) === '1'
  } catch {
    return true
  }
}

export function markTeaserSeen(storage: Store | null = store()) {
  try {
    storage?.setItem(TEASER_KEY, '1')
  } catch {
    // Unavailable storage: teaserSeen already treats it as seen
  }
}
