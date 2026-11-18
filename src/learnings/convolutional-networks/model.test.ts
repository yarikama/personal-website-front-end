import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ALEX_DENSE,
  ALEX_FIRST,
  CHECK_REACH,
  CHECK_WEIGHTS,
  CHECK_WRONG,
  convolve,
  convolveChannels,
  convWeights,
  denseWeights,
  drawn,
  examples,
  firstAllRight,
  forward,
  gradient,
  LAB_COUNT,
  LAB_EXAMPLES,
  LAB_SEED,
  loss,
  maxOf,
  maxPool,
  ONE_POOLED,
  ONE_SCORES,
  PHOTO_CONV,
  PHOTO_DENSE,
  randomNet,
  reach,
  reachByTracing,
  relu,
  rightCount,
  runFrom,
  SEVEN,
  SEVEN_MAPS,
  SEVEN_POOLED,
  SEVEN_SCORES,
  SIZE,
  stack,
  STAMPS,
  STORY_DENSE,
  STORY_DENSE_ONE,
  STORY_FIRST,
  STORY_SECOND,
  type Grid,
  type Layer,
  type Net,
} from './model'

const between = (random: () => number, lo: number, hi: number) => lo + random() * (hi - lo)
const randomGrid = (random: () => number, rows: number, cols: number): Grid =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => between(random, -1, 1)))

describe('the layers by hand', () => {
  it('slides a filter without padding', () => {
    const image = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]
    expect(convolve(image, [[1, 0], [0, -1]])).toEqual([
      [-4, -4],
      [-4, -4],
    ])
    expect(convolve(image, [[0, 0, 0], [1, 0, 1], [0, 0, 0]])).toEqual([[10]])
  })

  it('pools the largest of each 2 × 2 block', () => {
    expect(
      maxPool([
        [1, 3, 0, 2],
        [4, 2, 1, 1],
        [0, 0, 5, 0],
        [7, 1, 0, 6],
      ]),
    ).toEqual([
      [4, 2],
      [7, 6],
    ])
  })

  it('sums a filter over every channel it reads', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 50; trial++) {
      const channels = Array.from({ length: 3 }, () => randomGrid(random, 5, 5))
      const filter = Array.from({ length: 3 }, () => randomGrid(random, 3, 3))
      const got = convolveChannels(channels, filter, 0.5)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          let sum = 0.5
          for (let c = 0; c < 3; c++)
            for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) sum += filter[c][u][v] * channels[c][i + u][j + v]
          expect(got[i][j]).toBeCloseTo(sum, 10)
        }
    }
  })
})

describe('the story', () => {
  it('scores a clean three-square stroke exactly 1 on its own stamp', () => {
    const flat = drawn(['...', '###', '...'])
    const upright = drawn(['.#.', '.#.', '.#.'])
    const slant = drawn(['..#', '.#.', '#..'])
    ;[flat, upright, slant].forEach((stroke, n) => expect(convolve(stroke, STAMPS[n].filter)[0][0]).toBeCloseTo(1, 10))
  })

  it('makes 6 × 6 maps and 3 × 3 pooled maps', () => {
    expect(SEVEN.length).toBe(SIZE)
    expect(SEVEN_MAPS.every((m) => m.length === 6 && m[0].length === 6)).toBe(true)
    expect(SEVEN_POOLED.every((m) => m.length === 3 && m[0].length === 3)).toBe(true)
  })

  it('finds the 7’s top bar with the flat stamp and its stroke with the slant', () => {
    expect(SEVEN_POOLED[0][0]).toEqual([1, 1, expect.closeTo(5 / 6, 10)])
    expect(maxOf(SEVEN_POOLED[2])).toBeCloseTo(1, 10)
    expect(maxOf(SEVEN_POOLED[1])).toBeLessThan(0.6)
    expect(maxOf(ONE_POOLED[1])).toBeCloseTo(1, 10)
  })

  it('the second layer calls the 7 a 7 and the 1 a 1', () => {
    expect(SEVEN_SCORES[0]).toBeCloseTo(19 / 6, 10)
    expect(SEVEN_SCORES[1]).toBeCloseTo(-7.5, 10)
    expect(ONE_SCORES[0]).toBeLessThan(0)
    expect(ONE_SCORES[1]).toBeGreaterThan(0)
  })

  it('keeps ReLU’s maps non-negative', () => {
    expect(SEVEN_MAPS.flat(2).every((v) => v >= 0)).toBe(true)
    expect(relu([[-1, 2]])).toEqual([[0, 2]])
  })
})

describe('counting weights', () => {
  it('matches the numbers worked by hand', () => {
    expect(PHOTO_DENSE).toBe(100_000_000)
    expect(PHOTO_CONV).toBe(9)
    expect(STORY_DENSE_ONE).toBe(2304)
    expect(STORY_DENSE).toBe(6912)
    expect(STORY_FIRST).toBe(27)
    expect(STORY_SECOND).toBe(54)
    expect(ALEX_FIRST).toBe(34_848)
    expect(convWeights(96, 3, 11, true)).toBe(34_944)
    expect(Math.round(ALEX_DENSE / 1e9)).toBe(44)
    expect(CHECK_WEIGHTS).toBe(4608)
    expect(CHECK_WRONG).toEqual({ noChannelsIn: 288, noWindow: 512 })
  })

  // Write a convolution out as a full matrix from every input number to
  // every output number, each entry naming the weight it uses: the matrix is
  // the dense layer's size, and the distinct names are the convolution's count
  it('equals the distinct weights in the convolution written out as a full matrix', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 40; trial++) {
      const inn = 1 + Math.floor(random() * 3)
      const out = 1 + Math.floor(random() * 3)
      const k = 1 + Math.floor(random() * 3)
      const side = k + Math.floor(random() * 4)
      const map = side - k + 1
      const used = new Set<string>()
      let entries = 0
      for (let o = 0; o < out; o++)
        for (let i = 0; i < map; i++)
          for (let j = 0; j < map; j++)
            for (let c = 0; c < inn; c++)
              for (let y = 0; y < side; y++)
                for (let x = 0; x < side; x++) {
                  entries++
                  const u = y - i
                  const v = x - j
                  if (u >= 0 && u < k && v >= 0 && v < k) used.add(`${o},${c},${u},${v}`)
                }
      expect(entries).toBe(denseWeights(inn * side * side, out * map * map))
      expect(used.size).toBe(convWeights(out, inn, k))
    }
  })

  it('stacked 3 × 3s see as far as one bigger filter, with fewer weights', () => {
    expect(stack(1)).toEqual({ side: 3, small: 36_864, big: 36_864 })
    expect(stack(2)).toEqual({ side: 5, small: 73_728, big: 102_400 })
    expect(stack(3)).toEqual({ side: 7, small: 110_592, big: 200_704 })
  })
})

describe('reach', () => {
  it('a 3 × 3, a pool and a 3 × 3 see 8 squares across', () => {
    expect(CHECK_REACH).toBe(8)
  })

  it('matches tracing the squares back by brute force', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 300; trial++) {
      const layers: Layer[] = Array.from({ length: 1 + Math.floor(random() * 4) }, () => {
        const k = 1 + Math.floor(random() * 4)
        return { k, s: 1 + Math.floor(random() * Math.min(k, 2)) }
      })
      expect(reach(layers)).toBe(reachByTracing(layers))
    }
  })
})

describe('the lab', () => {
  it('has six 7s and six 1s, every one inside the grid', () => {
    expect(LAB_EXAMPLES).toHaveLength(LAB_COUNT)
    expect(LAB_EXAMPLES.filter((e) => e.seven)).toHaveLength(LAB_COUNT / 2)
    expect(LAB_EXAMPLES.every((e) => e.image.length === SIZE && e.image.every((r) => r.length === SIZE))).toBe(true)
    expect(examples(646)).toEqual(LAB_EXAMPLES)
  })

  it('has slopes that match finite differences', () => {
    const random = seeded(5)
    for (let trial = 0; trial < 20; trial++) {
      const net = randomNet(100 + trial)
      net.a = between(random, 0.5, 2)
      net.c = between(random, -1, 1)
      const g = gradient(net, LAB_EXAMPLES)
      const h = 1e-6
      // The loss's slope along one weight, nudged both ways by h
      const nudge = (shift: (n: Net, by: number) => void) => {
        const up = structuredClone(net)
        const down = structuredClone(net)
        shift(up, h)
        shift(down, -h)
        return (loss(up, LAB_EXAMPLES) - loss(down, LAB_EXAMPLES)) / (2 * h)
      }
      const u = Math.floor(random() * 3)
      const v = Math.floor(random() * 3)
      expect(nudge((n, by) => (n.filter[u][v] += by))).toBeCloseTo(g.filter[u][v], 5)
      expect(nudge((n, by) => (n.a += by))).toBeCloseTo(g.a, 5)
      expect(nudge((n, by) => (n.c += by))).toBeCloseTo(g.c, 5)
    }
  })

  it('learns from the page’s start to call all twelve right, with a flat-bar filter', () => {
    const run = runFrom(LAB_SEED)
    const end = run[run.length - 1]
    expect(rightCount(run[0], LAB_EXAMPLES)).toBeLessThan(LAB_COUNT)
    expect(rightCount(end, LAB_EXAMPLES)).toBe(LAB_COUNT)
    expect(firstAllRight(run)).toBeGreaterThan(0)
    // A flat bar fires it far more than an upright one
    const flat = forward(end, drawn(['........', '........', '........', '.######.', '........', '........', '........', '........']))
    const upright = forward(end, drawn(['........', '....#...', '....#...', '....#...', '....#...', '....#...', '....#...', '........']))
    expect(flat.top).toBeGreaterThan(2 * upright.top)
    expect(flat.p).toBeGreaterThan(0.5)
    expect(upright.p).toBeLessThan(0.5)
  })

  it('also stalls on some starts, as the caption says', () => {
    const ends = Array.from({ length: 10 }, (_, s) => runFrom(s + 1)).map((run) => rightCount(run[run.length - 1], LAB_EXAMPLES))
    expect(ends.filter((r) => r === LAB_COUNT).length).toBeGreaterThan(5)
    expect(ends.some((r) => r === LAB_COUNT - 1)).toBe(true)
  })
})
