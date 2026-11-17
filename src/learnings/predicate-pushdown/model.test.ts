import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ANSWER,
  biggest,
  bruteForce,
  canonical,
  CHECK_CLAUSES,
  CHECK_ORDERS,
  CHECK_TABLES,
  clause,
  cmp,
  col,
  columnsOut,
  columnsUp,
  COLUMNS_QUERY,
  CUSTOMER,
  FRIENDS_LEFT,
  GIFTS_LEFT,
  GUESS_BYTES,
  GUESS_DAYS,
  GUESS_PRODUCT,
  HOUSTON_ORDERS,
  LAB,
  LAB_MIXED,
  LAB_NUMBERS,
  LAB_SPLIT_ANSWER,
  landing,
  landingWords,
  nodesOf,
  ORDERS,
  PRODUCT,
  PUSHED_BIGGEST,
  pushAll,
  pushed,
  run,
  sameBag,
  side,
  STORY,
  table,
  type Clause,
  type Op,
  type Plan,
  type Query,
  type Table,
} from './model'

const answer = (plan: Plan) => run(plan).out

describe('the guess', () => {
  it('pairs every row of the three tables: ten trillion rows', () => {
    expect(GUESS_PRODUCT).toBe(10_000_000_000_000)
  })

  it('would take most of a year to write at 100 MB/s', () => {
    expect(GUESS_BYTES).toBe(3e15)
    expect(Math.round(GUESS_DAYS)).toBe(347)
  })

  it('needs at most 10,000 rows in between with the filters first', () => {
    expect(HOUSTON_ORDERS).toBe(10_000)
    expect(ANSWER).toBe(200)
    expect(PUSHED_BIGGEST).toBe(10_000)
  })
})

describe('where a clause goes (rule 1c)', () => {
  it('goes onto the side that has every column it reads, and stays at the join otherwise', () => {
    const { left, right } = CHECK_TABLES
    expect(side(CHECK_CLAUSES.oneTableOr, left, right)).toBe('left')
    expect(side(CHECK_CLAUSES.oneTable, left, right)).toBe('right')
    expect(side(CHECK_CLAUSES.mixedOr, left, right)).toBe('join')
    expect(side(clause(cmp('o.cust', '=', col('c.id'))), left, right)).toBe('join')
  })

  it('lands each clause of the lab at its lowest node', () => {
    expect(LAB.where.map((c) => landingWords(LAB, c))).toEqual([
      'onto CUSTOMER',
      'into the join with ORDERS',
      'into the join with PRODUCT',
      'onto PRODUCT',
      'into the join with PRODUCT',
    ])
    expect(landing(LAB, LAB.where[LAB_MIXED])).toEqual({ at: 'join', index: 2 })
  })
})

describe('the story', () => {
  it('writes 48 cards the literal way and 12 the early way, and keeps the same 3', () => {
    expect(STORY.cards).toBe(48)
    expect(FRIENDS_LEFT).toBe(3)
    expect(GIFTS_LEFT).toBe(4)
    expect(STORY.earlyCards).toBe(12)
    expect(STORY.answerLate).toBe(3)
    expect(STORY.answerEarly).toBe(3)
    expect(STORY.same).toBe(true)
    expect(STORY.kept.flat().filter(Boolean)).toHaveLength(3)
  })

  it('keeps only cells whose friend and gift each passed their own rule', () => {
    STORY.kept.forEach((row, i) =>
      row.forEach((kept, j) => {
        if (kept) expect(STORY.friendOk[i] && STORY.giftOk[j]).toBe(true)
      }),
    )
  })
})

describe('the lab', () => {
  it('runs the canonical plan by hand-checkable numbers', () => {
    const ran = run(canonical(LAB))
    expect(LAB_NUMBERS.product).toBe(8 * 24 * 6)
    expect(LAB_NUMBERS.productColumns).toBe(11)
    // The products: C × O, then that × P
    const products = nodesOf(ran).filter((n) => n.plan.op === 'join')
    expect(products.map((n) => n.out.rows.length)).toEqual([1152, 192])
    expect(LAB_NUMBERS.canonicalBiggest).toBe(1152)
  })

  it('gives the six rows worked out by hand', () => {
    const rows = answer(canonical(LAB)).rows.map((r) => r.join(' / ')).sort()
    expect(rows).toEqual([
      'Ana / black tea',
      'Ana / espresso',
      'Ana / green tea',
      'Cai / green tea',
      'Cai / oolong',
      'Eli / green tea',
    ])
    expect(LAB_NUMBERS.answer).toBe(6)
  })

  it('needs at most 11 rows in between with everything pushed', () => {
    const ran = run(pushed(LAB, pushAll(LAB), true))
    // σ city: 3 customers; their orders: 11; σ kind: 4 products; the answer: 6
    const sizes = nodesOf(ran)
      .filter((n) => n.plan.op !== 'scan' && n.plan.op !== 'project')
      .map((n) => n.out.rows.length)
    expect(sizes.sort((a, b) => a - b)).toEqual([3, 4, 6, 11])
    expect(LAB_NUMBERS.pushedBiggest).toBe(11)
    expect(LAB_NUMBERS.pushedValues).toBeLessThan(LAB_NUMBERS.canonicalValues / 50)
  })

  it('turns a product into a join once its condition is pushed', () => {
    const plan = pushed(LAB, [false, true, false, false, false])
    const joins = nodesOf(run(plan)).filter((n) => n.plan.op === 'join')
    expect(joins.map((n) => (n.plan.op === 'join' ? n.plan.on.length : -1))).toEqual([0, 1])
    // C ⋈ O on o.cust = c.id: one row per order
    expect(joins[1].out.rows.length).toBe(ORDERS.rows.length)
  })

  it('keeps only the columns still needed above each node', () => {
    const plan = pushed(LAB, pushAll(LAB), true)
    const outs = nodesOf(run(plan)).map((n) => columnsOut(n.plan))
    expect(outs).toContainEqual(['c.id', 'c.name'])
    expect(outs).toContainEqual(['o.cust', 'o.prod', 'o.qty'])
    expect(outs).toContainEqual(['p.id', 'p.title', 'p.price'])
    expect(outs).toContainEqual(['c.name', 'o.prod', 'o.qty'])
  })

  it('loses rows if the OR across two tables is split onto them', () => {
    expect(LAB_SPLIT_ANSWER).toBeLessThan(LAB_NUMBERS.answer)
  })
})

describe('check yourself', () => {
  it('sends cust, qty and price of ORDERS up into the join', () => {
    expect(columnsUp(COLUMNS_QUERY, CHECK_ORDERS)).toEqual(['o.cust', 'o.qty', 'o.price'])
  })
})

// Seeded random queries over random tables: every way of pushing gives the
// answer that trying every combination gives
function randomQuery(random: () => number): Query {
  const int = (n: number) => Math.floor(random() * n)
  const tables: Table[] = Array.from({ length: 2 + int(3) }, (_, t) => {
    const columns = Array.from({ length: 1 + int(3) }, (_, c) => `a${c}`)
    const rows = Array.from({ length: int(6) }, () => columns.map(() => int(4)))
    return table(`t${t}`, `t${t}`, columns, rows)
  })
  const all = tables.flatMap((t) => t.columns)
  const pick = () => all[int(all.length)]
  const ops: Op[] = ['=', '≠', '<', '>']
  const where: Clause[] = Array.from({ length: 1 + int(5) }, () =>
    Array.from({ length: 1 + int(3) }, () => cmp(pick(), ops[int(4)], random() < 0.5 ? col(pick()) : int(4))),
  )
  const select = [...new Set(Array.from({ length: 1 + int(3) }, pick))]
  return { select, from: tables, where }
}

describe('pushdown never changes the answer', () => {
  it('on the hand-made queries', () => {
    for (const q of [LAB, { ...LAB, from: [CUSTOMER, ORDERS, PRODUCT] }]) {
      const truth = bruteForce(q)
      expect(sameBag(answer(canonical(q)), truth)).toBe(true)
      for (let mask = 0; mask < 1 << q.where.length; mask++) {
        const push = q.where.map((_, i) => ((mask >> i) & 1) === 1)
        expect(sameBag(answer(pushed(q, push)), truth)).toBe(true)
        expect(sameBag(answer(pushed(q, push, true)), truth)).toBe(true)
      }
    }
  })

  it('on 400 seeded random queries, every clause pushed or not, columns dropped or not', () => {
    const random = seeded(530)
    let nonEmpty = 0
    for (let n = 0; n < 400; n++) {
      const q = randomQuery(random)
      const truth = bruteForce(q)
      if (truth.rows.length) nonEmpty++
      expect(sameBag(answer(canonical(q)), truth)).toBe(true)
      const push = q.where.map(() => random() < 0.5)
      expect(sameBag(answer(pushed(q, push, random() < 0.5)), truth)).toBe(true)
      const all = run(pushed(q, pushAll(q), true))
      expect(sameBag(all.out, truth)).toBe(true)
      // And, when no table is empty, nothing in between is bigger than the
      // canonical plan's product of everything
      if (q.from.every((t) => t.rows.length > 0)) expect(biggest(all)).toBeLessThanOrEqual(biggest(run(canonical(q))))
    }
    // The randomized tables do produce answers, so the check means something
    expect(nonEmpty).toBeGreaterThan(100)
  })

  it('while splitting an OR across tables does change it on some random query', () => {
    const random = seeded(7)
    let broke = 0
    for (let n = 0; n < 300; n++) {
      const q = randomQuery(random)
      const mixed = q.where.findIndex((c) => new Set(c.map((x) => x.left.split('.')[0])).size > 1)
      if (mixed < 0) continue
      const split = { ...q, where: [...q.where.slice(0, mixed), ...q.where[mixed].map((x) => clause(x)), ...q.where.slice(mixed + 1)] }
      if (!sameBag(bruteForce(split), bruteForce(q))) broke++
    }
    expect(broke).toBeGreaterThan(10)
  })
})

describe('the executor', () => {
  it('refuses a clause that reads a column its input does not have', () => {
    const bad: Plan = { op: 'select', where: [clause(cmp('p.kind', '=', 'tea'))], input: { op: 'scan', table: CUSTOMER } }
    expect(() => run(bad)).toThrow()
  })

  it('knows a product row has every column of both sides', () => {
    const product: Plan = { op: 'join', on: [], left: { op: 'scan', table: CUSTOMER }, right: { op: 'scan', table: PRODUCT } }
    expect(columnsOut(product)).toHaveLength(7)
    expect(run(product).out.rows).toHaveLength(48)
  })
})
