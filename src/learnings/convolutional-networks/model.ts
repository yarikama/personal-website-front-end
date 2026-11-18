import { seeded } from '../../components/explain/random'

// Every number the page states comes from here; the figures only draw.

export type Grid = number[][]

// ---------------------------------------------------------------------------
// The layers, written out by hand

// Slide a k × k filter over a grid, without padding, and take the weighted
// sum at every spot (a cross-correlation, as nn.Conv2d computes it)
export function convolve(image: Grid, filter: Grid, bias = 0): Grid {
  const k = filter.length
  const rows = image.length - k + 1
  const cols = image[0].length - k + 1
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      let sum = bias
      for (let u = 0; u < k; u++) for (let v = 0; v < k; v++) sum += filter[u][v] * image[i + u][j + v]
      return sum
    }),
  )
}

// A filter that spans several channels: one k × k slice per channel in,
// summed into one map
export function convolveChannels(channels: Grid[], filter: Grid[], bias = 0): Grid {
  const maps = channels.map((channel, c) => convolve(channel, filter[c]))
  return maps[0].map((row, i) => row.map((_, j) => bias + maps.reduce((sum, map) => sum + map[i][j], 0)))
}

export const relu = (grid: Grid): Grid => grid.map((row) => row.map((v) => Math.max(0, v)))

// Keep the largest value in each size × size block, stepping by the size
export function maxPool(grid: Grid, size = 2): Grid {
  const rows = Math.floor(grid.length / size)
  const cols = Math.floor(grid[0].length / size)
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      let best = -Infinity
      for (let u = 0; u < size; u++) for (let v = 0; v < size; v++) best = Math.max(best, grid[i * size + u][j * size + v])
      return best
    }),
  )
}

export const maxOf = (grid: Grid) => Math.max(...grid.flat())

// Parse a picture drawn with # for ink and . for paper
export const drawn = (rows: string[]): Grid => rows.map((row) => [...row].map((c) => (c === '#' ? 1 : 0)))

// ---------------------------------------------------------------------------
// The story: a handwritten 7 on an 8 × 8 grid, three stamps, pooling, and a
// second layer that reads the three pooled maps at once

export const SIZE = 8

export const SEVEN = drawn([
  '........',
  '.######.',
  '......#.',
  '.....#..',
  '....#...',
  '...#....',
  '..#.....',
  '........',
])

export const ONE = drawn([
  '........',
  '...##...',
  '....#...',
  '....#...',
  '....#...',
  '....#...',
  '....#...',
  '........',
])

// Each stamp rewards ink along its line and punishes ink beside it, scaled
// so a clean three-square stroke scores exactly 1
const sixth = (rows: number[][]): Grid => rows.map((row) => row.map((v) => v / 6))

export const STAMPS: { name: string; filter: Grid }[] = [
  {
    name: 'Flat',
    filter: sixth([
      [-1, -1, -1],
      [2, 2, 2],
      [-1, -1, -1],
    ]),
  },
  {
    name: 'Upright',
    filter: sixth([
      [-1, 2, -1],
      [-1, 2, -1],
      [-1, 2, -1],
    ]),
  },
  {
    name: 'Slant',
    filter: sixth([
      [-1, -1, 2],
      [-1, 2, -1],
      [2, -1, -1],
    ]),
  },
]

export const K = 3
export const MAP = SIZE - K + 1 // 6
export const POOLED = MAP / 2 // 3

export const mapsOf = (image: Grid) => STAMPS.map(({ filter }) => relu(convolve(image, filter)))
export const pooledOf = (image: Grid) => mapsOf(image).map((map) => maxPool(map))

export const SEVEN_MAPS = mapsOf(SEVEN)
export const SEVEN_POOLED = pooledOf(SEVEN)
export const ONE_POOLED = pooledOf(ONE)

// The second layer's two stamps, each 3 × 3 over all three pooled maps (so
// one score each): "7" wants a flat bar along the top and a slant below it,
// and no upright stroke; "1" wants an upright stroke and nothing else.
export const SECOND: { name: string; filter: Grid[] }[] = [
  {
    name: '7',
    filter: [
      [
        [1, 1, 1],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [-1, -1, -1],
        [-1, -1, -1],
        [-1, -1, -1],
      ],
      [
        [0, 0, 0],
        [0, 1, 0],
        [1, 0, 0],
      ],
    ],
  },
  {
    name: '1',
    filter: [
      [
        [-1, -1, -1],
        [-1, -1, -1],
        [-1, -1, -1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [-1, -1, -1],
        [-1, -1, -1],
        [-1, -1, -1],
      ],
    ],
  },
]

// A pooled stack is exactly 3 × 3, the second stamps' size, so each gives one number
export const secondScores = (pooled: Grid[]) => SECOND.map(({ filter }) => convolveChannels(pooled, filter)[0][0])
export const SEVEN_SCORES = secondScores(SEVEN_POOLED)
export const ONE_SCORES = secondScores(ONE_POOLED)

// ---------------------------------------------------------------------------
// Counting weights

// A convolutional layer: one k × k window per channel in, for each filter,
// one filter per channel out, plus a bias each
export const convWeights = (out: number, inn: number, k: number, bias = false) => out * inn * k * k + (bias ? out : 0)

// A fully connected layer: a weight from every input number to every output
export const denseWeights = (inputs: number, outputs: number) => inputs * outputs

// The guess: a 100 × 100 photo to a 100 × 100 map
export const PHOTO = 100
export const PHOTO_DENSE = denseWeights(PHOTO * PHOTO, PHOTO * PHOTO) // 100 million
export const PHOTO_CONV = convWeights(1, 1, 3) // 9

// The story's two ways to make three 6 × 6 maps from the 8 × 8 digit
export const STORY_DENSE_ONE = denseWeights(SIZE * SIZE, MAP * MAP) // one map, wired
export const STORY_DENSE = denseWeights(SIZE * SIZE, STAMPS.length * MAP * MAP)
export const STORY_FIRST = convWeights(STAMPS.length, 1, K) // 27
export const STORY_SECOND = convWeights(SECOND.length, STAMPS.length, K) // 54

// AlexNet's first layer, as in the 2012 paper: 96 filters of 11 × 11 over the
// three colour channels of a 224 × 224 photo, stride 4, giving 55 × 55 maps
export const ALEX = { out: 96, inn: 3, k: 11, side: 224, map: 55 }
export const ALEX_FIRST = convWeights(ALEX.out, ALEX.inn, ALEX.k) // 34,848
export const ALEX_DENSE = denseWeights(ALEX.side * ALEX.side * ALEX.inn, ALEX.out * ALEX.map * ALEX.map)

// The quick check: 16 channels in, 32 out, 3 × 3
export const CHECK_LAYER = { inn: 16, out: 32, k: 3 }
export const CHECK_WEIGHTS = convWeights(CHECK_LAYER.out, CHECK_LAYER.inn, CHECK_LAYER.k) // 4,608
export const CHECK_WRONG = {
  noChannelsIn: convWeights(CHECK_LAYER.out, 1, CHECK_LAYER.k), // 288
  noWindow: CHECK_LAYER.out * CHECK_LAYER.inn, // 512
}

// ---------------------------------------------------------------------------
// Stacking small filters

// How many input squares across one output square sees, through a stack of
// layers with window k and step s (a convolution has s = 1; a 2 × 2 pool has
// k = s = 2)
export type Layer = { k: number; s: number }
export function reach(layers: Layer[]): number {
  let width = 1
  let jump = 1
  for (const { k, s } of layers) {
    width += (k - 1) * jump
    jump *= s
  }
  return width
}

// The same, by brute force in one dimension: follow output square 0 back
// through every layer and count the input squares it touches
export function reachByTracing(layers: Layer[]): number {
  let touched = new Set([0])
  for (const { k, s } of [...layers].reverse()) {
    const below = new Set<number>()
    for (const i of touched) for (let u = 0; u < k; u++) below.add(i * s + u)
    touched = below
  }
  return touched.size
}

export const conv3: Layer = { k: 3, s: 1 }
export const pool2: Layer = { k: 2, s: 2 }

export const STACK_CHANNELS = 64
export const DEPTHS = [1, 2, 3] as const
// n stacked 3 × 3 layers against one big filter that sees as far, with 64
// channels in and out
export const stack = (n: number) => {
  const side = reach(Array.from({ length: n }, () => conv3))
  return {
    side,
    small: n * convWeights(STACK_CHANNELS, STACK_CHANNELS, 3),
    big: convWeights(STACK_CHANNELS, STACK_CHANNELS, side),
  }
}

// Check yourself: 3 × 3, then a 2 × 2 max pool, then 3 × 3
export const CHECK_STACK = [conv3, pool2, conv3]
export const CHECK_REACH = reach(CHECK_STACK) // 8

// ---------------------------------------------------------------------------
// The lab: one 3 × 3 filter learns, from random, to tell 7s from 1s

// Small shapes, set down at different spots of the 8 × 8 grid
const SEVENS = [
  drawn(['#####', '....#', '...#.', '..#..', '.#...']),
  drawn(['####', '...#', '..#.', '..#.', '.#..']),
  drawn(['#####', '...#.', '..#..', '..#..', '.#...']),
]
const ONES = [
  drawn(['.#', '##', '.#', '.#', '.#', '.#']),
  drawn(['#', '#', '#', '#', '#', '#']),
  drawn(['##', '.#', '.#', '.#', '.#']),
]

export type Example = { image: Grid; seven: boolean }

function place(shape: Grid, top: number, left: number): Grid {
  const image = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0))
  shape.forEach((row, i) => row.forEach((v, j) => (image[top + i][left + j] = v)))
  return image
}

export const LAB_COUNT = 12

// Six 7s and six 1s, each shape at a random spot
export function examples(seed: number): Example[] {
  const random = seeded(seed)
  const pick = (n: number) => Math.floor(random() * n)
  return Array.from({ length: LAB_COUNT }, (_, n) => {
    const seven = n % 2 === 0
    const shapes = seven ? SEVENS : ONES
    const shape = shapes[Math.floor(n / 2) % shapes.length]
    const top = 1 + pick(SIZE - 1 - shape.length)
    const left = 1 + pick(SIZE - 1 - shape[0].length)
    return { image: place(shape, top, left), seven }
  })
}

export const LAB_EXAMPLES = examples(646)

// The little network: the filter's map, ReLU, the largest value anywhere
// (so it finds its pattern wherever it sits), and logistic regression on that
export type Net = { filter: Grid; bias: number; a: number; c: number }

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

export function randomNet(seed: number): Net {
  const random = seeded(seed)
  return {
    filter: Array.from({ length: K }, () => Array.from({ length: K }, () => random() - 0.5)),
    bias: 0,
    a: 1,
    c: 0,
  }
}

// The forward pass, keeping where the largest value was
export function forward(net: Net, image: Grid) {
  const map = convolve(image, net.filter, net.bias)
  let at: [number, number] = [0, 0]
  map.forEach((row, i) => row.forEach((v, j) => v > map[at[0]][at[1]] && (at = [i, j])))
  const top = Math.max(0, map[at[0]][at[1]])
  const p = sigmoid(net.a * top + net.c)
  return { map, at, top, p }
}

export const loss = (net: Net, data: Example[]) =>
  data.reduce((sum, { image, seven }) => {
    const { p } = forward(net, image)
    return sum - Math.log(Math.max(1e-12, seven ? p : 1 - p))
  }, 0) / data.length

export const rightCount = (net: Net, data: Example[]) =>
  data.filter(({ image, seven }) => forward(net, image).p > 0.5 === seven).length

// The slopes of the mean cross-entropy, by the chain rule. The max passes
// blame only to the spot that won; the shared filter collects it from there.
export function gradient(net: Net, data: Example[]): Net {
  const g: Net = { filter: net.filter.map((row) => row.map(() => 0)), bias: 0, a: 0, c: 0 }
  for (const { image, seven } of data) {
    const { at, top, map, p } = forward(net, image)
    const blame = (p - (seven ? 1 : 0)) / data.length
    g.a += blame * top
    g.c += blame
    if (map[at[0]][at[1]] <= 0) continue
    const back = blame * net.a
    g.bias += back
    for (let u = 0; u < K; u++) for (let v = 0; v < K; v++) g.filter[u][v] += back * image[at[0] + u][at[1] + v]
  }
  return g
}

export const RATE = 1
export function step(net: Net, data: Example[], rate = RATE): Net {
  const g = gradient(net, data)
  return {
    filter: net.filter.map((row, u) => row.map((w, v) => w - rate * g.filter[u][v])),
    bias: net.bias - rate * g.bias,
    a: net.a - rate * g.a,
    c: net.c - rate * g.c,
  }
}

export const LAB_STEPS = 300

export function train(net: Net, data: Example[], steps = LAB_STEPS): Net[] {
  const path = [net]
  for (let n = 0; n < steps; n++) path.push(step(path[path.length - 1], data))
  return path
}

export const LAB_SEED = 1

// Each start's training run, worked out once and kept
const runs = new Map<number, Net[]>()
export function runFrom(seed: number): Net[] {
  let run = runs.get(seed)
  if (!run) {
    run = train(randomNet(seed), LAB_EXAMPLES)
    runs.set(seed, run)
  }
  return run
}

// The first step at which every example is right, or -1
export const firstAllRight = (run: Net[]) => run.findIndex((net) => rightCount(net, LAB_EXAMPLES) === LAB_COUNT)
