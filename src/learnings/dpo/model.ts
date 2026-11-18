// Learning from "this one, not that one". A policy is a share for each of a
// few answers (dinners in the story, chatbot replies in the lab). People's
// picks between pairs of answers are the data.
//
// RLHF: fit a score per answer to the picks with the Bradley–Terry rule
// (chance a beats b = σ(score a − score b)), then find the policy that
// earns the most score while staying near the reference, which works out
// to the reference's shares times e^(score/β), rescaled.
//
// DPO: skip the scores. Read each answer's score off the policy itself,
// β × ln(its share now ÷ its share in the reference), and fit those to the
// picks with the same rule. It lands on the same policy.

import { seeded } from "../../components/explain/random";

// ---------------------------------------------------------------------------
// Basics

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function softmax(logits: number[]) {
  const top = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - top));
  const total = e.reduce((s, x) => s + x, 0);
  return e.map((x) => x / total);
}

// How far a policy has drifted from the reference: Σ π ln(π ÷ π_ref), in nats
export const drift = (policy: number[], reference: number[]) =>
  policy.reduce(
    (s, p, i) => (p > 0 ? s + p * Math.log(p / reference[i]) : s),
    0,
  );

// wins[i][j]: how many times answer i was picked over answer j
export type Wins = number[][];

export const pickCount = (wins: Wins) => wins.flat().reduce((s, n) => s + n, 0);

// ---------------------------------------------------------------------------
// The Bradley–Terry rule and its loss

// The chance answer a is picked over b, from their scores
export const preferChance = (scoreA: number, scoreB: number) =>
  sigmoid(scoreA - scoreB);

// The log loss of scores on the picks, per pick: −ln σ(winner − loser)
export function preferenceLoss(scores: number[], wins: Wins) {
  let total = 0;
  wins.forEach((row, i) =>
    row.forEach((n, j) => {
      if (n > 0) total += n * -Math.log(sigmoid(scores[i] - scores[j]));
    }),
  );
  return total / pickCount(wins);
}

// Its slope in each score, per pick
export function preferenceGradient(scores: number[], wins: Wins) {
  const g = scores.map(() => 0);
  wins.forEach((row, i) =>
    row.forEach((n, j) => {
      if (n === 0) return;
      // a pick of i over j pulls i up and j down by how surprised the rule was
      const surprise = n * sigmoid(scores[j] - scores[i]);
      g[i] -= surprise;
      g[j] += surprise;
    }),
  );
  const n = pickCount(wins);
  return g.map((x) => x / n);
}

// The judge: the scores that best explain the picks (most likely under
// Bradley–Terry), found by the minorize–maximize updates of Zermelo and
// Hunter. Scores are only fixed up to adding the same number to all, so
// they come back with mean zero.
export function fitScores(wins: Wins, rounds = 5000) {
  const k = wins.length;
  let strength = wins.map(() => 1);
  const won = wins.map((row) => row.reduce((s, n) => s + n, 0));
  for (let r = 0; r < rounds; r++) {
    const next = strength.map((p, i) => {
      let denominator = 0;
      for (let j = 0; j < k; j++) {
        const games = wins[i][j] + wins[j][i];
        if (j !== i && games > 0) denominator += games / (p + strength[j]);
      }
      return won[i] / denominator;
    });
    const scale = Math.exp(next.reduce((s, p) => s + Math.log(p), 0) / k);
    strength = next.map((p) => p / scale);
  }
  return strength.map((p) => Math.log(p));
}

// ---------------------------------------------------------------------------
// RLHF's answer: the most score for the least drift. The best policy for
// "score − β × drift" is the reference's shares times e^(score/β), rescaled.

export function leashed(reference: number[], scores: number[], beta: number) {
  return softmax(reference.map((p, i) => Math.log(p) + scores[i] / beta));
}

// The same objective, to check the closed form against: expected score
// minus β × drift
export const leashObjective = (
  policy: number[],
  reference: number[],
  scores: number[],
  beta: number,
) =>
  policy.reduce((s, p, i) => s + p * scores[i], 0) -
  beta * drift(policy, reference);

// ---------------------------------------------------------------------------
// DPO: the policy is softmax(logits); each answer's implicit score is
// β ln(π ÷ π_ref); the loss is the preference loss on those scores.

export const implicitScores = (
  policy: number[],
  reference: number[],
  beta: number,
) => policy.map((p, i) => beta * Math.log(p / reference[i]));

export const dpoLoss = (
  policy: number[],
  reference: number[],
  beta: number,
  wins: Wins,
) => preferenceLoss(implicitScores(policy, reference, beta), wins);

// DPO's loss for one pair, from how many times likelier the policy now
// makes the preferred answer and the other one than the reference did
export const pairLoss = (
  winnerRatio: number,
  loserRatio: number,
  beta: number,
) => -Math.log(sigmoid(beta * (Math.log(winnerRatio) - Math.log(loserRatio))));

// Gradient descent on the logits, starting from the reference. The slope
// in a logit is β × the preference slope in that answer's score (the
// normalizer cancels in every difference). The step is scaled by 1/β² so
// that every β trains at the same pace in the lab. Returns the policy
// after each step, the first entry the reference.
export const DPO_STEPS = 400;
export const DPO_RATE = 0.5;

export function trainDpo(
  reference: number[],
  beta: number,
  wins: Wins,
  steps = DPO_STEPS,
  rate = DPO_RATE,
) {
  let logits = reference.map((p) => Math.log(p));
  const out = [softmax(logits)];
  for (let s = 0; s < steps; s++) {
    const policy = softmax(logits);
    const slope = preferenceGradient(
      implicitScores(policy, reference, beta),
      wins,
    );
    logits = logits.map((l, i) => l - (rate / (beta * beta)) * beta * slope[i]);
    out.push(softmax(logits));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The story: four dinners, your habits, and a month of a flatmate's picks

export const DISHES = ["Pasta", "Soup", "Salad", "Curry"] as const;
export const HABITS = [0.4, 0.3, 0.2, 0.1];
export const CURRY = 3;
export const SALAD = 2;

// Each pair of dinners offered four times
// prettier-ignore
export const PICKS: Wins = [
  //  pasta soup salad curry   (row beat column)
  [0, 1, 3, 1],
  [3, 0, 3, 1],
  [1, 1, 0, 0],
  [3, 3, 4, 0],
]
export const STORY_BETA = 1;

// The judge's scores, shifted (all by the same amount, which changes no
// pick) so that the habits times e^score already add up to one: then the
// leashed policy is exactly habit × e^score, and DPO's implicit scores come
// out equal to these, not only equal in their gaps.
const centred = fitScores(PICKS);
const shift =
  -STORY_BETA *
  Math.log(
    HABITS.reduce((s, p, i) => s + p * Math.exp(centred[i] / STORY_BETA), 0),
  );
export const SCORES = centred.map((s) => s + shift);

export const JUDGED = leashed(HABITS, SCORES, STORY_BETA);
export const STORY_TRAINING = trainDpo(HABITS, STORY_BETA, PICKS);
export const SHORTCUT = STORY_TRAINING.at(-1)!;

// Each dish's record over its twelve matchups: wins first
export const records = (wins: Wins) =>
  wins.map((row, i) => ({
    won: row.reduce((s, n) => s + n, 0),
    lost: wins.reduce((s, r) => s + r[i], 0),
  }));

// ---------------------------------------------------------------------------
// The lab: one prompt, four replies, an instruction-tuned model's shares,
// and 300 people's picks drawn from hidden true scores

export const PROMPT = "How do I undo my last git commit?";
export const REPLIES = [
  "Explains, warns",
  "Just the command",
  "Delete and re-clone",
  "An essay on git",
] as const;
export const REFERENCE = [0.25, 0.35, 0.1, 0.3];
export const TRUE_SCORES = [1.5, 0.6, -1.6, -0.4];
export const PER_PAIR = 50;
export const LAB_SEED = 7;

export function drawPicks(
  trueScores: number[],
  perPair: number,
  seed: number,
): Wins {
  const random = seeded(seed);
  const k = trueScores.length;
  const wins: Wins = Array.from({ length: k }, () => Array<number>(k).fill(0));
  for (let i = 0; i < k; i++)
    for (let j = i + 1; j < k; j++)
      for (let n = 0; n < perPair; n++) {
        if (random() < preferChance(trueScores[i], trueScores[j])) wins[i][j]++;
        else wins[j][i]++;
      }
  return wins;
}

export const LAB_PICKS = drawPicks(TRUE_SCORES, PER_PAIR, LAB_SEED);
export const LAB_SCORES = fitScores(LAB_PICKS);
export const BETAS = [0.25, 0.5, 1, 2] as const;
export type Beta = (typeof BETAS)[number];

export interface LabRun {
  training: number[][];
  judged: number[];
  losses: number[];
}

function labRun(beta: number): LabRun {
  const training = trainDpo(REFERENCE, beta, LAB_PICKS);
  return {
    training,
    judged: leashed(REFERENCE, LAB_SCORES, beta),
    losses: training.map((p) => dpoLoss(p, REFERENCE, beta, LAB_PICKS)),
  };
}

// Worked out once, at module level, for each β the lab offers
export const LAB_RUNS = new Map<number, LabRun>(
  BETAS.map((b) => [b, labRun(b)]),
);

// ---------------------------------------------------------------------------
// The worked numbers: with β = 1, the preferred answer and the other made
// this many times likelier than the reference made them

export const WORKED_BETA = 1;
export const WORKED = [
  { name: "Unchanged", winner: 1, loser: 1 },
  { name: "Winner ×2, loser ×½", winner: 2, loser: 0.5 },
  { name: "Winner ×½, loser ×2", winner: 0.5, loser: 2 },
];

// The quick check: both answers made three times likelier
export const BOTH_UP = 3;

export const pct = (share: number) => `${Math.round(100 * share)}%`;
export const signed = (x: number, digits = 1) =>
  `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(digits)}`;

// How long a training run plays for, in ms a step: about three seconds
export const PACE = 3000 / DPO_STEPS;
