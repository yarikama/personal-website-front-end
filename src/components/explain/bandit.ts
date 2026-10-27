import { seeded } from './random'

// The bandit pages' testbed: a row of slot machines ("arms"), each paying
// its own mean plus noise. A learner picks one each step and sees only what
// that one paid. Run it on many machines at once to see what a method does
// on average, not what luck did once.

// A number from the bell curve, mean 0 and spread 1 (Box–Muller)
export function gauss(random: () => number): number {
  const u = 1 - random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

// The arm with the highest value; a tie goes to one of them at random
export function argmax(values: number[], random: () => number): number {
  let best = 0
  let ties = 1
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) {
      best = i
      ties = 1
    } else if (values[i] === values[best] && random() * ++ties < 1) best = i
  }
  return best
}

// How a learner picks and learns. Every field but `kind` has a default.
export type Method =
  // The best-looking arm, except a random one with chance `epsilon`.
  // `initial` is every arm's score before it is tried (optimism: set it
  // high); `step` is how far one reward moves a score: 'average' (1/n, the
  // plain average) or a constant α.
  | { kind: 'greedy'; epsilon?: number; initial?: number; step?: 'average' | number }
  // The arm whose score plus a bonus for being little tried is highest:
  // Q + c·√(ln t / N). An untried arm goes first.
  | { kind: 'ucb'; c?: number; step?: 'average' | number }
  // No scores: a preference per arm, turned into chances by softmax, and
  // nudged by how a reward compares with the average reward so far (the
  // baseline), or with 0 when `baseline` is false.
  | { kind: 'gradient'; alpha?: number; baseline?: boolean }

export interface Learner {
  // The arm to pull at step t (from 1)
  choose: (t: number) => number
  // What pulling `arm` paid
  learn: (arm: number, reward: number) => void
  // Its scores (greedy, UCB) or chances (gradient), for a figure to draw
  scores: () => number[]
}

// The chances softmax gives `preferences`: e^H(a) / Σ e^H(b)
export function softmax(preferences: number[]): number[] {
  const top = Math.max(...preferences)
  const raised = preferences.map((h) => Math.exp(h - top))
  const sum = raised.reduce((total, value) => total + value, 0)
  return raised.map((value) => value / sum)
}

export function learner(method: Method, arms: number, random: () => number): Learner {
  if (method.kind === 'gradient') {
    const alpha = method.alpha ?? 0.1
    const preferences = Array.from({ length: arms }, () => 0)
    let chances = softmax(preferences)
    let baseline = 0
    let count = 0
    return {
      choose: () => {
        let draw = random()
        for (let arm = 0; arm < arms; arm++) {
          draw -= chances[arm]
          if (draw < 0) return arm
        }
        return arms - 1
      },
      learn: (arm, reward) => {
        count += 1
        // The book's baseline includes this reward
        if (method.baseline ?? true) baseline += (reward - baseline) / count
        const surprise = reward - ((method.baseline ?? true) ? baseline : 0)
        for (let a = 0; a < arms; a++) preferences[a] += alpha * surprise * ((a === arm ? 1 : 0) - chances[a])
        chances = softmax(preferences)
      },
      scores: () => chances,
    }
  }

  const step = method.step ?? 'average'
  const scores = Array.from({ length: arms }, () => (method.kind === 'greedy' ? (method.initial ?? 0) : 0))
  const counts = Array.from({ length: arms }, () => 0)
  const choose =
    method.kind === 'greedy'
      ? () => (random() < (method.epsilon ?? 0) ? Math.floor(random() * arms) : argmax(scores, random))
      : (t: number) => {
          const untried = counts.indexOf(0)
          if (untried !== -1) return untried
          const c = method.c ?? 2
          return argmax(
            scores.map((score, a) => score + c * Math.sqrt(Math.log(t) / counts[a])),
            random
          )
        }
  return {
    choose,
    learn: (arm, reward) => {
      counts[arm] += 1
      scores[arm] += (reward - scores[arm]) * (step === 'average' ? 1 / counts[arm] : step)
    },
    scores: () => scores,
  }
}

export interface Testbed {
  // Machines to average over, steps on each, and arms per machine
  machines?: number
  steps?: number
  arms?: number
  // Where the arms' means are centred (the book shifts them to 4 to show the
  // baseline at work)
  centre?: number
  // A changing world: the means start equal and each wanders this far, as a
  // bell curve's spread, every step
  drift?: number
  seed?: number
}

export interface Run {
  // For each step, averaged over the machines: the reward, and the share
  // that pulled the best arm (the best at that step, if the world changes)
  reward: number[]
  best: number[]
}

// A method on many machines. The machines and the world's changes come
// from `seed`, the learner's luck from another, so methods compare like for
// like.
export function testbed(method: Method, options: Testbed = {}): Run {
  const { machines = 2000, steps = 1000, arms = 10, centre = 0, drift = 0, seed = 1 } = options
  const world = seeded(seed)
  const luck = seeded(seed + 1)
  const reward = Array.from({ length: steps }, () => 0)
  const best = Array.from({ length: steps }, () => 0)
  for (let m = 0; m < machines; m++) {
    const means = Array.from({ length: arms }, () => (drift > 0 ? centre : centre + gauss(world)))
    const agent = learner(method, arms, luck)
    for (let t = 0; t < steps; t++) {
      const arm = agent.choose(t + 1)
      const paid = means[arm] + gauss(world)
      agent.learn(arm, paid)
      reward[t] += paid
      let top = 0
      for (let a = 1; a < arms; a++) if (means[a] > means[top]) top = a
      if (means[arm] === means[top]) best[t] += 1
      if (drift > 0) for (let a = 0; a < arms; a++) means[a] += drift * gauss(world)
    }
  }
  return { reward: reward.map((sum) => sum / machines), best: best.map((sum) => sum / machines) }
}

// The mean of `values` from `from` to the end, or over all of them
export const meanOf = (values: number[], from = 0) =>
  values.slice(from).reduce((sum, value) => sum + value, 0) / (values.length - from)
