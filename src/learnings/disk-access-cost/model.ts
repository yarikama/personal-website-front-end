// The cost of reading from a spinning disk: a fixed price to get the head to
// the data, then a small price per byte. Sizes are decimal (a KB is 1,000
// bytes), so the arithmetic on the page stays round.
export const KB = 1_000
export const MB = 1_000_000
export const GB = 1_000_000_000

export interface Disk {
  // Moving the arm to the right track
  seekMs: number
  // How fast the platters spin, in turns a minute
  rpm: number
  // How fast bytes stream once the head is in place
  bytesPerSecond: number
}

// The disk the course uses: 10,000 RPM, a 3 ms seek, 100 MB/s
export const DISK: Disk = { seekMs: 3, rpm: 10_000, bytesPerSecond: 100 * MB }

// On average the page is half a turn away when the head arrives
export const rotationMs = (rpm: number) => (0.5 * 60_000) / rpm

// Getting there: the seek, then the wait for the page to come round
export const positionMs = (disk: Disk = DISK) => disk.seekMs + rotationMs(disk.rpm)

// Reading: the bytes passing under the head
export const transferMs = (bytes: number, disk: Disk = DISK) => (bytes / disk.bytesPerSecond) * 1000

// One page read on its own: get there, then read it
export const oneReadMs = (pageBytes: number, disk: Disk = DISK) => positionMs(disk) + transferMs(pageBytes, disk)

// `pages` pages scattered over the disk: every one pays to get there
export const scatteredMs = (pages: number, pageBytes: number, disk: Disk = DISK) => pages * oneReadMs(pageBytes, disk)

// The same pages side by side in one run: get there once, then stream
export const inOneRunMs = (pages: number, pageBytes: number, disk: Disk = DISK) =>
  positionMs(disk) + transferMs(pages * pageBytes, disk)

// A read's time split into getting there and reading
export interface Split {
  gettingThere: number
  reading: number
}

export function scatteredSplit(pages: number, pageBytes: number, disk: Disk = DISK): Split {
  return { gettingThere: pages * positionMs(disk), reading: transferMs(pages * pageBytes, disk) }
}

export function inOneRunSplit(pages: number, pageBytes: number, disk: Disk = DISK): Split {
  return { gettingThere: positionMs(disk), reading: transferMs(pages * pageBytes, disk) }
}

// How many pages of `pageBytes` hold `bytes` of data
export const pagesFor = (bytes: number, pageBytes: number) => Math.ceil(bytes / pageBytes)

// The guess: 1,000 pages of 4 KB, scattered or in one run
export const GUESS = { pages: 1_000, pageBytes: 4 * KB }

// The quick check: 80 MB read as scattered pages, 8 KB or 64 KB each
export const pageSizeSpeedup = (bytes: number, small: number, large: number) =>
  scatteredMs(pagesFor(bytes, small), small) / scatteredMs(pagesFor(bytes, large), large)

// The last check: saving 10,000 changes of 100 bytes each. In place, each
// rewrites the 4 KB page its record sits on, somewhere on the disk; appended,
// they all go to the end of one log file, one after another
export const CHANGES = { count: 10_000, bytes: 100, pageBytes: 4 * KB }
export const inPlaceMs = () => scatteredMs(CHANGES.count, CHANGES.pageBytes)
export const appendMs = () => inOneRunMs(CHANGES.count, CHANGES.bytes)

// The library the story tells is the same model, read in minutes: a trip
// into the stacks is the 6 ms to get there, taking one book off the shelf
// the 0.04 ms to read a 4 KB page
export const TRIP_MINUTES = positionMs()
export const BOOK_MINUTES = transferMs(4 * KB)

// A book's place in the stacks: which shelf, and how far along it
export interface Slot {
  shelf: number
  at: number
}

// Two books the clerk can take one after the other without a new trip
export const nextTo = (a: Slot, b: Slot) => a.shelf === b.shelf && Math.abs(a.at - b.at) === 1

// The clerk fetching `books` in order: when the clerk sets off for each,
// gets there, and has it in hand, in minutes from the start. A book next to
// the last one costs no trip.
export interface Visit {
  book: Slot
  trip: boolean
  leave: number
  arrive: number
  done: number
}

export function fetchBooks(books: Slot[]): Visit[] {
  let now = 0
  let last: Slot | null = null
  return books.map((book) => {
    const trip = last === null || !nextTo(last, book)
    const leave = now
    const arrive = trip ? leave + TRIP_MINUTES : leave
    const done = arrive + BOOK_MINUTES
    now = done
    last = book
    return { book, trip, leave, arrive, done }
  })
}

export const trips = (visits: Visit[]) => visits.filter((visit) => visit.trip).length

// "0.04 ms", "46 ms", "6.0 s", "10 min"
export function formatMs(ms: number): string {
  if (ms < 1) return `${Number(ms.toFixed(2))} ms`
  if (ms < 1000) return `${Math.round(ms)} ms`
  const s = ms / 1000
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`
  return `${Math.round(s / 60)} min`
}

// "2 s", "6 min 24 s", "100 h 40 min", for the library's clock
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`
  if (minutes < 60) {
    const whole = Math.floor(minutes)
    const seconds = Math.round((minutes - whole) * 60)
    return seconds ? `${whole} min ${seconds} s` : `${whole} min`
  }
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes - hours * 60)
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

// "4 KB", "1 MB", "1 GB"
export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${bytes / GB} GB`
  if (bytes >= MB) return `${bytes / MB} MB`
  return `${bytes / KB} KB`
}

// "131×"
export const times = (ratio: number) => `${Math.round(ratio)}×`
