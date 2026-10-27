import { describe, expect, it } from 'vitest'
import { learner, softmax } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'
import {
  commute,
  lateBest,
  machine,
  MACHINE_SEED,
  nudge,
  preferencesOf,
  RIVER,
  SCRIPT,
  settledOnRiver,
  shifted,
  story,
  STORY_ALPHA,
} from './model'

describe('softmax, as the clip works it', () => {
  it('turns preferences 1, 2, 0 into 0.24, 0.67, 0.09', () => {
    const raised = [1, 2, 0].map(Math.exp)
    expect(raised.map((v) => +v.toFixed(2))).toEqual([2.72, 7.39, 1])
    expect(raised.reduce((a, b) => a + b)).toBeCloseTo(11.11, 2)
    expect(softmax([1, 2, 0]).map((c) => +c.toFixed(2))).toEqual([0.24, 0.67, 0.09])
  })

  it('gives the same chances after adding 3 to every preference, each e^H about 20 times bigger', () => {
    const raised = [4, 5, 3].map(Math.exp)
    expect(raised.map((v) => +v.toFixed(1))).toEqual([54.6, 148.4, 20.1])
    expect(raised.reduce((a, b) => a + b)).toBeCloseTo(223.1, 1)
    expect(Math.exp(3)).toBeCloseTo(20, 0)
    softmax([4, 5, 3]).forEach((c, i) => expect(c).toBeCloseTo(softmax([1, 2, 0])[i], 12))
  })

  it('gives preferences back from chances, centred on 0', () => {
    const back = preferencesOf(softmax([1, 2, 0]))
    ;[0, 1, -1].forEach((h, i) => expect(back[i]).toBeCloseTo(h, 10))
  })
})

describe('the update, as the clip works it', () => {
  it('raises the chosen one by 1 and lowers the other two by 0.5', () => {
    const next = nudge([0, 0, 0], 0, 3, 0.5)
    ;[1, -0.5, -0.5].forEach((h, i) => expect(next[i]).toBeCloseTo(h, 10))
  })

  it('keeps the total of the preferences', () => {
    const next = nudge([0.3, -1, 0.7], 2, -2.5, 0.4)
    expect(next.reduce((a, b) => a + b)).toBeCloseTo(0, 10)
  })

  it('moves a rare choice nine times as far as a common one, as the quick check says', () => {
    // Chances 0.1 and 0.9 for two options
    const preferences = [0, Math.log(9)]
    const rare = nudge(preferences, 0, 3, 0.1)[0] - preferences[0]
    const common = nudge(preferences, 1, 3, 0.1)[1] - preferences[1]
    expect(rare / common).toBeCloseTo(9, 8)
  })

  it('is what the shared learner does', () => {
    let preferences = [0, 0, 0]
    let usual = 0
    const run = commute(seeded(1), SCRIPT.length, true, SCRIPT)
    SCRIPT.forEach(({ route, early }, day) => {
      usual += (early - usual) / (day + 1)
      preferences = nudge(preferences, route, early - usual, STORY_ALPHA)
      run.mornings[day].habits.forEach((h, i) => expect(h).toBeCloseTo(preferences[i], 10))
    })
  })

  it('learns the same from rewards all shifted by 100, with the baseline', () => {
    const plain = learner({ kind: 'gradient', alpha: 0.2 }, 4, seeded(1))
    const shiftedUp = learner({ kind: 'gradient', alpha: 0.2 }, 4, seeded(1))
    const random = seeded(2)
    for (let t = 1; t <= 200; t++) {
      const arm = plain.choose(t)
      expect(shiftedUp.choose(t)).toBe(arm)
      const reward = random() < 0.2 + 0.15 * arm ? 1 : 0
      plain.learn(arm, reward)
      shiftedUp.learn(arm, reward + 100)
    }
    plain.scores().forEach((c, i) => expect(shiftedUp.scores()[i]).toBeCloseTo(c, 8))
  })
})

describe('the story', () => {
  const { you, neighbour } = story()

  it('learns nothing on Monday, when the trip is the usual', () => {
    expect(you.mornings[0].surprise).toBe(0)
    you.mornings[0].chances.forEach((c) => expect(c).toBeCloseTo(1 / 3, 10))
  })

  it('weakens the back streets on Tuesday and strengthens the river road on Wednesday', () => {
    const [, tuesday, wednesday] = you.mornings
    expect(tuesday.usual).toBe(9)
    expect(tuesday.surprise).toBe(-2)
    expect(tuesday.habits[2]).toBeLessThan(0)
    expect(tuesday.habits[0]).toBeGreaterThan(0)
    expect(wednesday.surprise).toBeCloseTo(16 - 34 / 3, 10)
    expect(wednesday.chances[RIVER]).toBe(Math.max(...wednesday.chances))
  })

  it('ends with you on the river road and your neighbour on the highway', () => {
    const you60 = you.mornings.at(-1)!
    const them60 = neighbour.mornings.at(-1)!
    expect(Math.round(you60.chances[RIVER] * 100)).toBe(95)
    expect(you60.usual.toFixed(0)).toBe('14')
    expect(them60.chances[0]).toBeGreaterThan(0.95)
    expect(them60.usual.toFixed(0)).toBe('11')
    // He has the same first three mornings, but counts every minute as a win
    expect(neighbour.mornings.slice(0, 3).map((m) => m.early)).toEqual(SCRIPT.map((s) => s.early))
    expect(neighbour.mornings[0].surprise).toBe(11)
  })

  it('is typical: nearly everyone with a usual finds the river road, and about 3 in 10 without one do not', () => {
    expect(settledOnRiver(true, 1000, 5)).toBeGreaterThan(0.99)
    const without = settledOnRiver(false, 1000, 5)
    expect(1 - without).toBeGreaterThan(0.25)
    expect(1 - without).toBeLessThan(0.35)
  })
})

describe('the testbed centred on 4', () => {
  it('is on the best arm about half the time without a baseline, as the guess says, and far more with one', () => {
    const without = lateBest(shifted(0.1, false))
    const withBaseline = lateBest(shifted(0.1, true))
    expect(without).toBeGreaterThan(0.4)
    expect(without).toBeLessThan(0.55)
    expect(withBaseline).toBeGreaterThan(0.8)
    expect(lateBest(shifted(0.4, true))).toBeGreaterThan(lateBest(shifted(0.4, false)) + 0.3)
  })

  it('shows the one machine finding its best arm with the baseline and missing it without', () => {
    for (const alpha of [0.1, 0.4]) {
      const found = machine(MACHINE_SEED, alpha, true)
      const missed = machine(MACHINE_SEED, alpha, false)
      expect(found.chances.at(-1)![found.best]).toBeGreaterThan(0.9)
      expect(missed.chances.at(-1)![missed.best]).toBeLessThan(0.1)
    }
  })
})
