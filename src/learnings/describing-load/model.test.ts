import { describe, expect, it } from 'vitest'
import { pullWork, pushWork, short, TWITTER_2012 } from './model'

const { postsPerSecond, readsPerSecond, followers, biggestAccount } = TWITTER_2012

describe('building timelines at Twitter’s 2012 load', () => {
  it('delivers 345k timeline writes a second on post', () => {
    expect(pushWork(postsPerSecond, followers)).toBe(345_000)
  })

  it('would look up 22.5M entries a second on read, 65 times more', () => {
    expect(pullWork(readsPerSecond, followers)).toBe(22_500_000)
    expect(pullWork(readsPerSecond, followers) / pushWork(postsPerSecond, followers)).toBeCloseTo(65.2, 1)
  })

  it('turns one post from the biggest account into 31 million deliveries', () => {
    expect(pushWork(1, biggestAccount)).toBe(31_000_000)
  })
})

describe('short numbers', () => {
  it('read like the story tells them', () => {
    expect(short(345_000)).toBe('345k')
    expect(short(22_500_000)).toBe('22.5M')
    expect(short(4_600)).toBe('4.6k')
    expect(short(800)).toBe('800')
  })
})
