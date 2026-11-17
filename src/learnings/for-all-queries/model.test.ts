import { describe, expect, it } from 'vitest'
import {
  algebra,
  bruteForce,
  CLASS,
  CLASS_HUNT,
  counterexample,
  EMPTY_CLASS,
  GAPS,
  GUESS,
  holds,
  LAB,
  mistaken,
  named,
  OFF_LIST,
  ON_LIST,
  QUESTIONS,
  randomWorlds,
  sql,
  toggleGood,
  toggleLike,
  verdict,
  WORKED,
  type World,
} from './model'

describe('the guess', () => {
  it('is answered by Bo alone: Ana likes a bad café', () => {
    expect(bruteForce(GUESS, 'only')).toEqual(['Bo'])
  })

  it('is answered wrongly by the one-row-at-a-time query, which lets Ana in on her good café', () => {
    expect(mistaken(GUESS)).toEqual(['Ana', 'Bo'])
    expect(mistaken(GUESS)).not.toEqual(bruteForce(GUESS, 'only'))
  })
})

describe('the story', () => {
  it('finds Ana and Dee with no homework missing', () => {
    expect(ON_LIST).toEqual(['Ana', 'Dee'])
    expect(OFF_LIST).toEqual(['Ben', 'Cy'])
  })

  it('stops each hunt at the first gap: HW 2 for Ben, HW 1 for Cy', () => {
    expect(GAPS).toEqual([
      { person: 'Ben', item: 'HW 2' },
      { person: 'Cy', item: 'HW 1' },
    ])
    // Ana 3 boxes, Ben 2, Cy 1, Dee 3
    expect(CLASS_HUNT.length).toBe(9)
    expect(CLASS_HUNT.filter((look) => look.gap).map((look) => CLASS.people[look.person])).toEqual(['Ben', 'Cy'])
  })

  it('has Ben with more ticks than gaps, so ticks alone don’t say “every”', () => {
    expect(CLASS.likes[1].filter(Boolean).length).toBe(2)
    expect(holds(CLASS, 'some', 1)).toBe(true)
    expect(holds(CLASS, 'all', 1)).toBe(false)
  })
})

describe('the worked cases', () => {
  it('are Ana in with 0 of 3 missing, Ben out with 1, and Dan in with nothing set', () => {
    expect(WORKED).toEqual([
      { name: 'Ana', set: 3, missing: 0, in: true },
      { name: 'Ben', set: 3, missing: 1, in: false },
      { name: 'Dan', set: 0, missing: 0, in: true },
    ])
  })

  it('give Dan the list from every formulation, with no homework to miss', () => {
    for (const answer of [bruteForce, algebra, sql]) expect(answer(EMPTY_CLASS, 'all')).toEqual(['Dan'])
  })
})

describe('the lab as it opens', () => {
  it('gives all, only and some three different answers', () => {
    expect(bruteForce(LAB, 'all')).toEqual(['Ana', 'Bo'])
    expect(bruteForce(LAB, 'only')).toEqual(['Ana', 'Cy', 'Eve'])
    expect(bruteForce(LAB, 'some')).toEqual(['Ana', 'Bo', 'Cy'])
  })

  it('lets Eve, who likes nothing, pass “only” and fail “some”', () => {
    expect(verdict(LAB, 'only', 4)).toEqual({ in: true, cell: null, kind: null })
    expect(verdict(LAB, 'some', 4)).toEqual({ in: false, cell: null, kind: null })
  })

  it('marks Bo’s counterexample for “only” as Dove, and Cy’s for “all” as Fig', () => {
    expect(LAB.items[verdict(LAB, 'only', 1).cell!]).toBe('Dove')
    expect(LAB.items[verdict(LAB, 'all', 2).cell!]).toBe('Fig')
  })

  it('makes everyone like every good café once no café is good', () => {
    let none: World = LAB
    for (let y = 0; y < LAB.items.length; y++) if (LAB.good[y]) none = toggleGood(none, y)
    expect(bruteForce(none, 'all')).toEqual(LAB.people)
    expect(bruteForce(none, 'some')).toEqual([])
  })

  it('toggles one cell or one column and nothing else', () => {
    const changed = toggleLike(LAB, 4, 0)
    expect(changed.likes[4][0]).toBe(true)
    expect(changed.likes.flat().filter(Boolean).length).toBe(LAB.likes.flat().filter(Boolean).length + 1)
    expect(toggleGood(LAB, 1).good).toEqual([true, true, true, false, true])
    expect(LAB.likes[4][0]).toBe(false)
  })
})

describe('on random grids', () => {
  const worlds = randomWorlds(530, 600)

  it('includes empty sets and people who like nothing, the edge cases', () => {
    expect(worlds.some((w) => w.items.length === 0)).toBe(true)
    expect(worlds.some((w) => w.items.length > 0 && w.good.every((g) => !g))).toBe(true)
    expect(worlds.some((w) => w.items.length > 0 && w.likes.some((row) => row.every((c) => !c)))).toBe(true)
  })

  it('agrees three ways: brute force, everyone minus the counterexamples, and nested NOT EXISTS', () => {
    for (const world of worlds) {
      for (const question of QUESTIONS) {
        const truth = bruteForce(world, question)
        expect(algebra(world, question)).toEqual(truth)
        expect(sql(world, question)).toEqual(truth)
      }
    }
  })

  it('lets a person in on “all” or “only” exactly when there is no counterexample', () => {
    for (const world of worlds) {
      world.people.forEach((_, x) => {
        for (const question of ['all', 'only'] as const) {
          expect(holds(world, question, x)).toBe(counterexample(world, question, x) === null)
        }
      })
    }
  })

  it('finds that the mistaken query answers “some”, not “only”', () => {
    let differs = 0
    for (const world of worlds) {
      expect(mistaken(world)).toEqual(bruteForce(world, 'some'))
      if (mistaken(world).join() !== bruteForce(world, 'only').join()) differs++
    }
    expect(differs).toBeGreaterThan(worlds.length / 3)
  })
})

describe('naming a list', () => {
  it('reads as a sentence', () => {
    expect(named([])).toBe('no one')
    expect(named(['Ana'])).toBe('Ana')
    expect(named(['Ana', 'Dee'])).toBe('Ana and Dee')
    expect(named(['Ana', 'Cy', 'Eve'])).toBe('Ana, Cy and Eve')
  })
})
