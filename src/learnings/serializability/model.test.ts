import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  AT_ONCE,
  AT_ONCE_APART,
  BANK,
  BANK_AND_AUDIT,
  BANK_INTERLEAVINGS,
  BANK_PASSING,
  BANK_START,
  CARD_START,
  CHECK,
  COOKS,
  COOKS_APART,
  canMove,
  conflicts,
  DEPOSITS,
  findCycle,
  GUESS_INTERLEAVED,
  GUESS_SERIAL,
  interleavings,
  isSchedule,
  matchingOrders,
  move,
  notation,
  parse,
  permutations,
  precedence,
  PRESETS,
  QUICK,
  randomSchedule,
  randomStart,
  read,
  run,
  sameAsSomeSerial,
  sameState,
  serial,
  TAKING_TURNS,
  topologicalOrder,
  total,
  verdict,
  write,
  WORKED,
  type Transaction,
} from './model'

const names = (order: number[] | null) => order?.map((t) => `T${t + 1}`).join(', ')

describe('the guess: two $50 deposits into $100', () => {
  it('ends at $150 when both read before either writes, $200 one at a time', () => {
    expect(GUESS_INTERLEAVED).toBe(150)
    expect(GUESS_SERIAL).toBe(200)
    expect(run(DEPOSITS, serial(DEPOSITS, [1, 0]), { A: 100 }).final.A).toBe(200)
  })

  it('has a cycle, so the graph test refuses it', () => {
    const v = verdict(DEPOSITS, parse('r1(A) r2(A) w1(A) w2(A)'))
    expect(v.cycle).not.toBeNull()
    expect(v.order).toBeNull()
  })
})

describe('the story’s cards', () => {
  it('reach 3 taking turns and 2 at once; apart, each card gets its teaspoon', () => {
    expect(run(COOKS, TAKING_TURNS, CARD_START).final.S).toBe(3)
    expect(run(COOKS, AT_ONCE, CARD_START).final.S).toBe(2)
    expect(run(COOKS_APART, AT_ONCE_APART, CARD_START).final).toEqual({ S: 2, P: 2 })
  })

  it('has every pair conflicting but the two reads', () => {
    const pairs = conflicts(COOKS, AT_ONCE).map((p) => `${p.first}-${p.second}`)
    expect(pairs).toEqual(['0-3', '1-2', '2-3'])
    expect(conflicts(COOKS_APART, AT_ONCE_APART)).toEqual([])
  })
})

describe('conflicts', () => {
  const txs: Transaction[] = [
    { name: 'T1', does: '', steps: [read('X'), write('X', () => 1), read('Y')] },
    { name: 'T2', does: '', steps: [read('X'), write('X', () => 2), write('Y', () => 3)] },
  ]
  it('need different transactions, one item and at least one write', () => {
    const ops = parse('r1(X) r2(X) w1(X) w2(X) r1(Y) w2(Y)')
    const found = conflicts(txs, ops).map((p) => notation(txs, [ops[p.first], ops[p.second]]))
    expect(found).toEqual(['r1(X) w2(X)', 'r2(X) w1(X)', 'w1(X) w2(X)', 'r1(Y) w2(Y)'])
  })
})

describe('the worked schedules', () => {
  it('read back as written', () => {
    for (const p of PRESETS) {
      expect(isSchedule(p.txs, p.ops), p.name).toBe(true)
      expect(parse(notation(p.txs, p.ops))).toEqual(p.ops)
    }
    expect(notation(QUICK.txs, QUICK.ops)).toBe('r1(A) r2(B) w1(B) w2(A)')
    expect(notation(CHECK.txs, CHECK.ops)).toBe('r3(C) w2(A) r1(A) w1(B) r3(B) w3(C)')
  })

  it('give the page’s graphs and verdicts', () => {
    const [one, inter, crossed] = WORKED.map((p) => verdict(p.txs, p.ops))
    expect(one.edges).toEqual([{ from: 0, to: 1, items: ['A', 'B'] }])
    expect(inter.edges).toEqual([{ from: 0, to: 1, items: ['A', 'B'] }])
    expect(inter.order).toEqual([0, 1])
    expect(crossed.edges).toEqual([
      { from: 0, to: 1, items: ['A'] },
      { from: 1, to: 0, items: ['B'] },
    ])
    expect(crossed.cycle).toEqual([0, 1, 0])
    expect(crossed.order).toBeNull()
    expect(crossed.looped).toHaveLength(2)
  })

  it('give the page’s balances: 55 and 165, or 55 and 160 crossed', () => {
    const finals = WORKED.map((p) => run(p.txs, p.ops, BANK_START).final)
    expect(finals[0]).toMatchObject({ A: 55, B: 165 })
    expect(finals[1]).toMatchObject({ A: 55, B: 165 })
    expect(finals[2]).toMatchObject({ A: 55, B: 160 })
    expect(total(finals[0])).toBe(220)
    expect(total(finals[2])).toBe(215)
    expect(run(BANK, serial(BANK, [1, 0]), BANK_START).final).toMatchObject({ A: 60, B: 160 })
    expect(matchingOrders(BANK, WORKED[2].ops, BANK_START)).toEqual([])
    expect(matchingOrders(BANK, WORKED[1].ops, BANK_START)).toEqual([[0, 1]])
  })

  it('put the audit between the transfer and the interest', () => {
    const audit = PRESETS[3]
    expect(names(verdict(audit.txs, audit.ops).order)).toBe('T1, T3, T2')
    expect(run(audit.txs, audit.ops, BANK_START).final).toEqual({ A: 55, B: 165, C: 200 })
  })

  it('count the interleavings of the transfer and the interest', () => {
    expect(BANK_INTERLEAVINGS).toBe(70)
    expect(BANK_PASSING).toBe(12)
  })
})

describe('the checks', () => {
  it('quick check: arrows both ways, a cycle', () => {
    const v = verdict(QUICK.txs, QUICK.ops)
    expect(v.edges.map((e) => [e.from, e.to])).toEqual([
      [0, 1],
      [1, 0],
    ])
    expect(v.order).toBeNull()
    expect(sameAsSomeSerial(QUICK.txs, QUICK.ops)).toBe(false)
  })

  it('check yourself: only T2, T1, T3', () => {
    const v = verdict(CHECK.txs, CHECK.ops)
    expect(v.edges.map((e) => [e.from, e.to])).toEqual([
      [0, 2],
      [1, 0],
    ])
    expect(names(v.order)).toBe('T2, T1, T3')
    const orders = permutations(3).filter((order) =>
      v.edges.every((e) => order.indexOf(e.from) < order.indexOf(e.to)),
    )
    expect(orders).toEqual([[1, 0, 2]])
    expect(sameAsSomeSerial(CHECK.txs, CHECK.ops)).toBe(true)
  })
})

describe('the graph algorithms', () => {
  it('list every order of n transactions', () => {
    expect(permutations(3)).toHaveLength(6)
    expect(new Set(permutations(4).map(String)).size).toBe(24)
  })

  it('find a cycle exactly when there is no topological order', () => {
    const random = seeded(3)
    for (let k = 0; k < 300; k++) {
      const n = 2 + Math.floor(random() * 4)
      const edges = []
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && random() < 0.3) edges.push({ from: i, to: j, items: [] })
      const order = topologicalOrder(n, edges)
      const cycle = findCycle(n, edges)
      expect(order === null).toBe(cycle !== null)
      if (order) for (const e of edges) expect(order.indexOf(e.from)).toBeLessThan(order.indexOf(e.to))
      if (cycle) {
        expect(cycle[0]).toBe(cycle[cycle.length - 1])
        for (let i = 0; i + 1 < cycle.length; i++)
          expect(edges.some((e) => e.from === cycle[i] && e.to === cycle[i + 1])).toBe(true)
      }
    }
  })
})

// Random transactions of a few reads and writes over three items, with
// writes that depend on what was read, so lost or misordered work shows
function randomTransactions(random: () => number): Transaction[] {
  const items = ['A', 'B', 'C']
  const n = 2 + Math.floor(random() * 2)
  return Array.from({ length: n }, (_, t) => {
    const length = 1 + Math.floor(random() * 4)
    const steps = Array.from({ length }, () => {
      const item = items[Math.floor(random() * items.length)]
      if (random() < 0.5) return read(item)
      const a = 2 + Math.floor(random() * 3)
      const b = 1 + Math.floor(random() * 9)
      return write(item, (seen) => a * Object.values(seen).reduce((s, v) => s + v, 0) + b + t)
    })
    return { name: `T${t + 1}`, does: '', steps }
  })
}

describe('the graph test against the brute-force referee', () => {
  it('no cycle: the topological order has the same effect, on random schedules and starts', () => {
    const random = seeded(11)
    let acyclic = 0
    for (let k = 0; k < 400; k++) {
      const txs = randomTransactions(random)
      const ops = randomSchedule(txs, random)
      expect(isSchedule(txs, ops)).toBe(true)
      const order = topologicalOrder(txs.length, precedence(txs, ops))
      if (!order) continue
      acyclic++
      for (let s = 0; s < 5; s++) {
        const start = randomStart(['A', 'B', 'C'], random)
        expect(sameState(run(txs, ops, start).final, run(txs, serial(txs, order), start).final)).toBe(true)
      }
      expect(sameAsSomeSerial(txs, ops)).toBe(true)
    }
    expect(acyclic).toBeGreaterThan(100)
  })

  it('the bank’s 70 interleavings: every one that passes matches its order, every crossed one matches none', () => {
    for (const ops of interleavings(BANK)) {
      const v = verdict(BANK, ops)
      const matches = matchingOrders(BANK, ops, BANK_START)
      if (v.order) expect(matches).toContainEqual(v.order)
      else expect(matches).toEqual([])
      expect(sameAsSomeSerial(BANK, ops)).toBe(v.order !== null)
    }
  })

  it('random interleavings with the audit agree with the referee', () => {
    const random = seeded(5)
    for (let k = 0; k < 200; k++) {
      const ops = randomSchedule(BANK_AND_AUDIT, random)
      const v = verdict(BANK_AND_AUDIT, ops)
      if (v.order) expect(sameAsSomeSerial(BANK_AND_AUDIT, ops)).toBe(true)
    }
  })
})

describe('moving a step', () => {
  it('only trades places with another transaction’s step', () => {
    const ops = WORKED[1].ops
    expect(canMove(ops, 0, -1)).toBe(false)
    expect(canMove(ops, 0, 1)).toBe(false)
    expect(canMove(ops, 1, 1)).toBe(true)
    const moved = move(ops, 1, 1)
    expect(isSchedule(BANK, moved)).toBe(true)
    expect(notation(BANK, moved)).toBe('r1(A) r2(A) w1(A) w2(A) r1(B) w1(B) r2(B) w2(B)')
  })

  it('keeps any sequence of moves a schedule', () => {
    const random = seeded(2)
    let ops = PRESETS[3].ops
    for (let k = 0; k < 500; k++) {
      const at = Math.floor(random() * ops.length)
      ops = move(ops, at, random() < 0.5 ? -1 : 1)
      expect(isSchedule(BANK_AND_AUDIT, ops)).toBe(true)
    }
  })

  it('draws every interleaving about equally often', () => {
    const random = seeded(9)
    const counts = new Map<string, number>()
    for (let k = 0; k < 7000; k++) {
      const key = notation(BANK, randomSchedule(BANK, random))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(70)
    for (const c of counts.values()) expect(Math.abs(c - 100)).toBeLessThan(45)
  })
})
