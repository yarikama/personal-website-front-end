// One price kept in three places: the database (the record), a cache (a
// fast copy) and a search index (a copy arranged for searching)
export interface Copies {
  database: number
  cache: number
  index: number
}

export interface Wiring {
  // Whether the app updates the cache, and the index, when it writes
  updateCache: boolean
  updateIndex: boolean
  // Whether the app crashes right after writing to the database
  crash: boolean
}

// What each copy holds after the app writes `price`. The database is
// written first; the copies only if the app remembers them and is still
// running.
export function write(copies: Copies, price: number, wiring: Wiring): Copies {
  const after = !wiring.crash
  return {
    database: price,
    cache: wiring.updateCache && after ? price : copies.cache,
    index: wiring.updateIndex && after ? price : copies.index,
  }
}

// Which copies disagree with the database
export const stale = (copies: Copies) => ({
  cache: copies.cache !== copies.database,
  index: copies.index !== copies.database,
})

// What the places and whoever keeps them in step are called: in the
// restaurant of the story, and in an app
export interface Names {
  database: string
  cache: string
  index: string
  owner: string
}

export const RESTAURANT: Names = { database: 'Kitchen ledger', cache: 'Board by the door', index: 'Menus on the tables', owner: 'Owner' }
export const APP: Names = { database: 'Database', cache: 'Cache', index: 'Search index', owner: 'Your code' }
