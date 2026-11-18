import { describe, expect, it } from "vitest";
import { seeded } from "../../components/explain/random";
import {
  BETAS,
  CURRY,
  drawPicks,
  drift,
  dpoLoss,
  fitScores,
  HABITS,
  implicitScores,
  JUDGED,
  LAB_PICKS,
  LAB_RUNS,
  leashed,
  leashObjective,
  pairLoss,
  PICKS,
  pickCount,
  preferChance,
  preferenceGradient,
  preferenceLoss,
  records,
  REFERENCE,
  SALAD,
  SCORES,
  SHORTCUT,
  sigmoid,
  softmax,
  STORY_BETA,
  TRUE_SCORES,
  trainDpo,
  type Wins,
} from "./model";

const random4 = (random: () => number) =>
  Array.from({ length: 4 }, () => 4 * random() - 2);

// A random policy over four answers, every share at least a little above 0
const randomPolicy = (random: () => number) => softmax(random4(random));

describe("the Bradley–Terry rule", () => {
  it("gives 50% for equal scores, and depends only on the gap", () => {
    expect(preferChance(0.7, 0.7)).toBe(0.5);
    expect(preferChance(Math.log(4), 0)).toBeCloseTo(0.8, 12);
    expect(preferChance(3, 3 - Math.log(4))).toBeCloseTo(0.8, 12);
    expect(preferChance(1, 2) + preferChance(2, 1)).toBeCloseTo(1, 12);
  });

  it("has the slope its loss says, checked against finite differences", () => {
    const random = seeded(3);
    for (let t = 0; t < 50; t++) {
      const scores = random4(random);
      const wins: Wins = Array.from({ length: 4 }, (_, i) =>
        Array.from({ length: 4 }, (_, j) =>
          i === j ? 0 : Math.floor(5 * random()),
        ),
      );
      if (pickCount(wins) === 0) continue;
      const g = preferenceGradient(scores, wins);
      for (let i = 0; i < 4; i++) {
        const h = 1e-6;
        const up = scores.map((s, k) => (k === i ? s + h : s));
        const down = scores.map((s, k) => (k === i ? s - h : s));
        expect(g[i]).toBeCloseTo(
          (preferenceLoss(up, wins) - preferenceLoss(down, wins)) / (2 * h),
          6,
        );
      }
    }
  });
});

describe("the judge", () => {
  it("fits scores whose slope is zero, and that beat any nudge", () => {
    const random = seeded(11);
    for (const wins of [PICKS, LAB_PICKS, drawPicks(random4(random), 20, 5)]) {
      const scores = fitScores(wins);
      for (const g of preferenceGradient(scores, wins))
        expect(Math.abs(g)).toBeLessThan(1e-9);
      const best = preferenceLoss(scores, wins);
      for (let t = 0; t < 200; t++) {
        const nudged = scores.map((s) => s + 0.3 * (random() - 0.5));
        expect(preferenceLoss(nudged, wins)).toBeGreaterThanOrEqual(
          best - 1e-12,
        );
      }
    }
  });

  it("recovers the true scores from many picks", () => {
    const wins = drawPicks(TRUE_SCORES, 4000, 2);
    const scores = fitScores(wins);
    const mean = TRUE_SCORES.reduce((s, x) => s + x, 0) / TRUE_SCORES.length;
    scores.forEach((s, i) => expect(s).toBeCloseTo(TRUE_SCORES[i] - mean, 1));
  });

  it("in the story: 24 picks, curry 10 and 2, salad 2 and 10, symmetric scores", () => {
    expect(pickCount(PICKS)).toBe(24);
    expect(records(PICKS)).toEqual([
      { won: 5, lost: 7 },
      { won: 7, lost: 5 },
      { won: 2, lost: 10 },
      { won: 10, lost: 2 },
    ]);
    const centred = fitScores(PICKS);
    expect(centred[CURRY]).toBeCloseTo(-centred[SALAD], 9);
    expect(centred[1]).toBeCloseTo(-centred[0], 9);
    expect(SCORES[CURRY] - SCORES[SALAD]).toBeCloseTo(2.63, 2);
    expect(Math.round(100 * preferChance(SCORES[CURRY], SCORES[SALAD]))).toBe(
      93,
    );
  });
});

describe("RLHF’s answer on a leash", () => {
  it("is the best policy for score − β × drift, against random policies", () => {
    const random = seeded(21);
    for (let t = 0; t < 40; t++) {
      const reference = randomPolicy(random);
      const scores = random4(random);
      const beta = 0.2 + 2 * random();
      const best = leashed(reference, scores, beta);
      const value = leashObjective(best, reference, scores, beta);
      for (let k = 0; k < 100; k++) {
        expect(
          leashObjective(randomPolicy(random), reference, scores, beta),
        ).toBeLessThanOrEqual(value + 1e-12);
      }
    }
  });

  it("in the story is just habit × e^score: curry 33%, salad 5%", () => {
    JUDGED.forEach((p, i) =>
      expect(p).toBeCloseTo(HABITS[i] * Math.exp(SCORES[i]), 12),
    );
    expect(JUDGED.map((p) => Math.round(100 * p))).toEqual([26, 36, 5, 33]);
  });

  it("stays home with a long leash, and bets on the best with a short one", () => {
    expect(
      drift(leashed(REFERENCE, TRUE_SCORES, 1000), REFERENCE),
    ).toBeLessThan(1e-5);
    expect(leashed(REFERENCE, TRUE_SCORES, 0.01)[0]).toBeGreaterThan(0.999);
  });
});

describe("DPO", () => {
  it("scores an answer by β ln(π ÷ π_ref), zero at the reference", () => {
    expect(implicitScores(HABITS, HABITS, 1)).toEqual([0, 0, 0, 0]);
    expect(implicitScores([0.2], [0.1], 0.5)[0]).toBeCloseTo(
      0.5 * Math.log(2),
      12,
    );
    expect(dpoLoss(HABITS, HABITS, STORY_BETA, PICKS)).toBeCloseTo(
      Math.log(2),
      12,
    );
  });

  it("has the worked numbers: 0.69, 0.22 and 1.61", () => {
    expect(pairLoss(1, 1, 1)).toBeCloseTo(Math.log(2), 12);
    expect(pairLoss(2, 0.5, 1)).toBeCloseTo(-Math.log(0.8), 12);
    expect(pairLoss(0.5, 2, 1)).toBeCloseTo(-Math.log(0.2), 12);
    expect(pairLoss(3, 3, 1)).toBeCloseTo(Math.log(2), 12);
    expect(sigmoid(Math.log(4))).toBeCloseTo(0.8, 12);
  });

  it("lands on RLHF’s policy in the story, and its scores on the judge’s", () => {
    SHORTCUT.forEach((p, i) => expect(p).toBeCloseTo(JUDGED[i], 6));
    implicitScores(SHORTCUT, HABITS, STORY_BETA).forEach((s, i) =>
      expect(s).toBeCloseTo(SCORES[i], 5),
    );
  });

  it("lands on RLHF’s policy for every β the lab offers, with the same final loss", () => {
    const ends = BETAS.map((b) => {
      const run = LAB_RUNS.get(b)!;
      run.training
        .at(-1)!
        .forEach((p, i) => expect(p).toBeCloseTo(run.judged[i], 4));
      expect(run.losses[0]).toBeCloseTo(Math.log(2), 12);
      return run.losses.at(-1)!;
    });
    for (const end of ends) expect(end).toBeCloseTo(ends[0], 6);
    // A larger β drifts less
    const drifts = BETAS.map((b) => drift(LAB_RUNS.get(b)!.judged, REFERENCE));
    for (let k = 1; k < drifts.length; k++)
      expect(drifts[k]).toBeLessThan(drifts[k - 1]);
  });

  it("matches RLHF’s judge and leash on random picks and references", () => {
    const random = seeded(8);
    for (let t = 0; t < 20; t++) {
      const reference = randomPolicy(random);
      const wins = drawPicks(random4(random), 10, 100 + t);
      const beta = [0.5, 1, 2][t % 3];
      const dpo = trainDpo(reference, beta, wins, 3000, 1).at(-1)!;
      const rlhf = leashed(reference, fitScores(wins), beta);
      dpo.forEach((p, i) => expect(p).toBeCloseTo(rlhf[i], 4));
    }
  });

  it("never lets the loss rise while training", () => {
    for (const b of BETAS) {
      const { losses } = LAB_RUNS.get(b)!;
      for (let k = 1; k < losses.length; k++)
        expect(losses[k]).toBeLessThanOrEqual(losses[k - 1] + 1e-12);
    }
  });
});

describe("the lab", () => {
  it("has 300 picks, 50 a pair, the best reply winning most", () => {
    expect(pickCount(LAB_PICKS)).toBe(300);
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++)
        expect(LAB_PICKS[i][j] + LAB_PICKS[j][i]).toBe(50);
    const won = records(LAB_PICKS).map((r) => r.won);
    expect(Math.max(...won)).toBe(won[0]);
  });

  it("moves the best reply from 25% to 98% at β = 0.25 and 41% at β = 2", () => {
    expect(Math.round(100 * LAB_RUNS.get(0.25)!.judged[0])).toBe(98);
    expect(Math.round(100 * LAB_RUNS.get(2)!.judged[0])).toBe(41);
  });
});
