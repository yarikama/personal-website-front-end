import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import { chancesAt, FISH, fishChance, forkAt, fresh, LEFT, RIGHT, worth } from '../reinforce/model'
import { actorCritic, curve, evenFeel, pushes, startFeel, story, walkAndLearn } from './model'

describe('the critic’s verdict', () => {
  it('is reward + V(next) − V(here) at each turn, with a stall worth 0', () => {
    const walk = walkAndLearn(fresh(), evenFeel(), seeded(1), 0.1, 0.2, { turns: [LEFT, RIGHT, RIGHT, RIGHT], score: 8 })
    const deltas = walk.steps.map((s) => s.delta)
    expect(deltas[0]).toBeCloseTo(3.75 - 4.5625, 12)
    expect(deltas[1]).toBeCloseTo(4.5 - 3.75, 12)
    expect(deltas[2]).toBeCloseTo(5.5 - 4.5, 12)
    expect(deltas[3]).toBeCloseTo(8 - 5.5, 12)
    expect(walk.stall).toBe(3)
  })

  it('weakens the first left at once and moves the critic a fifth of the way', () => {
    const walk = walkAndLearn(fresh(), evenFeel(), seeded(1), 0.1, 0.2, { turns: [LEFT, RIGHT, RIGHT, RIGHT], score: 8 })
    const afterFirst = walk.steps[0]
    expect(chancesAt(afterFirst.habits, 0)[LEFT]).toBeLessThan(0.5)
    expect(afterFirst.feel[0]).toBeCloseTo(4.5625 + 0.2 * (3.75 - 4.5625), 12)
    expect(afterFirst.feel[0].toFixed(1)).toBe('4.4')
    // Only the last turn hears about the lucky 8: the forks before it
    // moved by the critic's guesses alone
    expect(chancesAt(walk.habits, forkAt(3, 2))[RIGHT]).toBeGreaterThan(chancesAt(walk.habits, forkAt(2, 1))[RIGHT])
  })

  it('has nothing to correct when the critic is right and the walk goes as expected', () => {
    // A critic exactly right for even habits sees, on average, no surprise
    const feel = evenFeel()
    const random = seeded(3)
    let total = 0
    const n = 20000
    for (let i = 0; i < n; i++) total += walkAndLearn(fresh(), feel, random, 0, 0).steps[0].delta
    expect(total / n).toBeCloseTo(0, 1)
    expect(feel).toEqual(worth(fresh()).v)
  })
})

describe('the story', () => {
  const walks = story()

  it('ends at the fish stall about nine lunches in ten, and expects it from the top', () => {
    const end = walks.at(-1)!
    expect(fishChance(end.habits)).toBeGreaterThan(0.89)
    expect(fishChance(end.habits)).toBeLessThan(0.94)
    expect(walks.slice(-30).filter((walk) => walk.stall === FISH).length).toBe(28)
    expect(end.feel[0]).toBeGreaterThan(7)
  })
})

describe('the bandit version', () => {
  it('takes the luck out of the push', () => {
    const { raw, critic } = pushes(9, 5, 4.6)
    expect(raw).toBeCloseTo(4.4, 12)
    expect(critic).toBeCloseTo(0.4, 12)
  })
})

describe('many learners', () => {
  const reinforce = curve('REINFORCE', 200, 300, 0.2, 2)
  const knowing = curve('From earlier walks', 200, 300, 0.2, 2)
  const five = curve('At 5', 200, 300, 0.2, 2)
  const zero = curve('At 0', 200, 300, 0.2, 2)

  it('learn faster with a critic that starts about right than by REINFORCE', () => {
    expect(knowing[29]).toBeGreaterThan(reinforce[29] + 0.1)
    expect(knowing[299]).toBeGreaterThan(0.95)
  })

  it('are held back by a critic that starts at 5, and led astray by one that starts at 0', () => {
    expect(five[29]).toBeLessThan(reinforce[29] - 0.2)
    expect(five[299]).toBeGreaterThan(0.9)
    expect(zero[299]).toBeLessThan(0.25)
  })

  it('start from the critic the figure names', () => {
    expect(startFeel('At 5').every((v) => v === 5)).toBe(true)
    expect(startFeel('At 0').every((v) => v === 0)).toBe(true)
    expect(startFeel('From earlier walks')).toEqual(evenFeel())
  })

  it('with a critic at 0, dig into the forks they have walked', () => {
    // Lunches all rate above 0, so a fork's guess rises only once walked
    const walks = actorCritic(seeded(5), 40, { alpha: 0.2, beta: 0.2, feel: startFeel('At 0') })
    const feel = walks.at(-1)!.feel
    const visited = new Set(walks.flatMap((walk) => walk.steps.map((s) => s.fork)))
    feel.forEach((v, fork) => (visited.has(fork) ? expect(v).toBeGreaterThan(0) : expect(v).toBe(0)))
  })
})
