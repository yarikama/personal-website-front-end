// Two ways to build a home timeline, and what each costs a second, counted
// in timeline entries touched.

// Fetch on read: every time someone opens their timeline, look up each
// account they follow
export const pullWork = (readsPerSecond: number, following: number) => readsPerSecond * following

// Deliver on post: every new post is copied into each follower's timeline
export const pushWork = (postsPerSecond: number, followers: number) => postsPerSecond * followers

// Twitter's own numbers, November 2012 (Raffi Krikorian, "Timelines at
// Scale"). Every follow is one follower and one following, so on average a
// user follows as many accounts as follow them.
export const TWITTER_2012 = {
  postsPerSecond: 4_600,
  readsPerSecond: 300_000,
  followers: 75,
  biggestAccount: 31_000_000,
}

// "345k", "22.5M", "800"
export function short(n: number): string {
  if (n >= 1e6) return `${Number((n / 1e6).toFixed(1))}M`
  if (n >= 1e3) return `${Number((n / 1e3).toFixed(1))}k`
  return String(Math.round(n))
}
