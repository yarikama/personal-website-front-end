import { describe, expect, it } from "vitest";
import { seeded } from "../../components/explain/random";
import {
  anaRange,
  CHECK_LAMBDA,
  CHECK_VALUES,
  CORRELATIONS,
  CREDIT,
  design,
  eigen,
  gram,
  kept,
  LAB_N,
  LAMBDAS,
  labOf,
  leastSquares,
  LUCK,
  moment,
  normal,
  one,
  PARTIES,
  PARTY_GRAM,
  ridge,
  ridgeLoss,
  signed,
  solve,
  spread,
  STORY_LAMBDA,
  STORY_YEARS,
  worked,
  year,
  type Vec2,
} from "./model";

// A random small problem: n rows of two features, and a target
function problem(random: () => number, n = 8) {
  const rows: Vec2[] = Array.from({ length: n }, () => [
    normal(random),
    normal(random),
  ]);
  const y = rows.map(([a, b]) => 2 * a - b + normal(random));
  return { rows, y };
}

// Least squares by brute force: plain gradient descent on the loss, a
// reference that shares no algebra with the 2×2 solve
function descend(rows: Vec2[], y: number[], lambda: number): Vec2 {
  const g = gram(rows);
  const step = 1 / (g.a + g.c + 2 * lambda);
  let w: Vec2 = [0, 0];
  for (let k = 0; k < 20000; k++) {
    const grad: Vec2 = [lambda * w[0], lambda * w[1]];
    rows.forEach(([x1, x2], i) => {
      const miss = w[0] * x1 + w[1] * x2 - y[i];
      grad[0] += miss * x1;
      grad[1] += miss * x2;
    });
    w = [w[0] - step * grad[0], w[1] - step * grad[1]];
  }
  return w;
}

describe("the 2×2 helpers", () => {
  it("solve a system worked by hand", () => {
    // [[4, 6], [6, 14]] w = [9, 18] has w = [0.9, 0.9]
    const [w1, w2] = solve({ a: 4, b: 6, c: 14 }, [9, 18]);
    expect(w1).toBeCloseTo(0.9);
    expect(w2).toBeCloseTo(0.9);
  });

  it("find the eigenvalues and eigenvectors of a matrix worked by hand", () => {
    const { values, vectors } = eigen({ a: 2, b: 1, c: 2 });
    expect(values[0]).toBeCloseTo(3);
    expect(values[1]).toBeCloseTo(1);
    expect(Math.abs(vectors[0][0])).toBeCloseTo(Math.SQRT1_2);
    expect(vectors[0][0] * vectors[0][1]).toBeGreaterThan(0);
    expect(vectors[1][0] * vectors[1][1]).toBeLessThan(0);
    expect(eigen({ a: 1, b: 0, c: 5 }).vectors[0]).toEqual([0, 1]);
  });

  it("satisfy M v = e v on random matrices", () => {
    const random = seeded(1);
    for (let k = 0; k < 200; k++) {
      const m = gram(problem(random, 5).rows);
      const { values, vectors } = eigen(m);
      for (const i of [0, 1]) {
        const [x, y] = vectors[i];
        expect(m.a * x + m.b * y).toBeCloseTo(values[i] * x, 8);
        expect(m.b * x + m.c * y).toBeCloseTo(values[i] * y, 8);
      }
    }
  });
});

describe("ridge regression", () => {
  it("is least squares at λ = 0", () => {
    const random = seeded(2);
    for (let k = 0; k < 200; k++) {
      const { rows, y } = problem(random);
      const ls = leastSquares(rows, y);
      const at0 = ridge(rows, y, 0);
      expect(at0[0]).toBe(ls[0]);
      expect(at0[1]).toBe(ls[1]);
    }
  });

  it("matches gradient descent on its loss, and nothing nearby does better", () => {
    const random = seeded(3);
    for (let k = 0; k < 40; k++) {
      const { rows, y } = problem(random);
      for (const lambda of [0, 0.5, 5]) {
        const w = ridge(rows, y, lambda);
        const reference = descend(rows, y, lambda);
        expect(w[0]).toBeCloseTo(reference[0], 5);
        expect(w[1]).toBeCloseTo(reference[1], 5);
        const best = ridgeLoss(rows, y, w, lambda);
        for (let j = 0; j < 10; j++) {
          const nudged: Vec2 = [
            w[0] + 0.01 * normal(random),
            w[1] + 0.01 * normal(random),
          ];
          expect(ridgeLoss(rows, y, nudged, lambda)).toBeGreaterThanOrEqual(
            best,
          );
        }
      }
    }
  });

  it("lifts every eigenvalue of XᵀX by λ", () => {
    const random = seeded(4);
    for (let k = 0; k < 100; k++) {
      const m = gram(problem(random).rows);
      const lambda = 10 * random();
      const lifted = eigen({ a: m.a + lambda, b: m.b, c: m.c + lambda }).values;
      const own = eigen(m).values;
      expect(lifted[0]).toBeCloseTo(own[0] + lambda, 8);
      expect(lifted[1]).toBeCloseTo(own[1] + lambda, 8);
    }
  });

  it("keeps e / (e + λ) of least squares along each eigenvector", () => {
    const random = seeded(5);
    for (let k = 0; k < 100; k++) {
      const { rows, y } = problem(random);
      const lambda = 5 * random();
      const { values, vectors } = eigen(gram(rows));
      const ls = leastSquares(rows, y);
      const w = ridge(rows, y, lambda);
      for (const i of [0, 1]) {
        const along = (v: Vec2) => v[0] * vectors[i][0] + v[1] * vectors[i][1];
        expect(along(w)).toBeCloseTo(kept(values[i], lambda) * along(ls), 8);
      }
    }
  });

  it("goes to zero as λ grows", () => {
    const { rows, y } = problem(seeded(6));
    const w = ridge(rows, y, 1e9);
    expect(Math.hypot(...w)).toBeLessThan(1e-6);
  });
});

describe("the parties", () => {
  it("have XᵀX = [[11, 10], [10, 11]], with eigenvalues 21 along “both” and 1 along “one alone”", () => {
    expect(PARTY_GRAM).toEqual({ a: 11, b: 10, c: 11 });
    const { values, vectors } = eigen(PARTY_GRAM);
    expect(values[0]).toBeCloseTo(21);
    expect(values[1]).toBeCloseTo(1);
    expect(vectors[0][0]).toBeCloseTo(vectors[0][1]);
    expect(vectors[1][0]).toBeCloseTo(-vectors[1][1]);
  });

  it("give least squares a gap between the two that is April’s fun minus September’s", () => {
    for (const y of STORY_YEARS.slice(0, 10)) {
      expect(y.credit[0] - y.credit[1]).toBeCloseTo(y.fun[3] - y.fun[8], 8);
    }
  });

  it("wobble along each direction by the noise over its eigenvalue, and ridge shrinks the weak one most", () => {
    // Var(w along v) = LUCK² / e for least squares, (e / (e + λ))² of that for ridge
    const random = seeded(8);
    const years = Array.from({ length: 6000 }, () => year(random));
    const gap = (w: Vec2) => (w[0] - w[1]) / Math.SQRT2;
    const total = (w: Vec2) => (w[0] + w[1]) / Math.SQRT2;
    const sd = (pick: (w: Vec2) => number, which: "credit" | "steady") =>
      spread(years.map((y) => pick(y[which])));
    expect(sd(gap, "credit")).toBeCloseTo(LUCK / Math.sqrt(1), 1);
    expect(sd(total, "credit")).toBeCloseTo(LUCK / Math.sqrt(21), 1);
    expect(sd(gap, "steady") / sd(gap, "credit")).toBeCloseTo(
      kept(1, STORY_LAMBDA),
      1,
    );
    expect(sd(total, "steady") / sd(total, "credit")).toBeCloseTo(
      kept(21, STORY_LAMBDA),
      1,
    );
  });

  it("swing hard, opposite ways, in the story’s first two years, while the total stays near 6", () => {
    const [first, second] = STORY_YEARS;
    expect(first.credit[0]).toBeGreaterThan(7);
    expect(first.credit[1]).toBeLessThan(-1);
    expect(second.credit[0]).toBeLessThan(-1);
    expect(second.credit[1]).toBeGreaterThan(6);
    for (const y of [first, second])
      expect(Math.abs(y.credit[0] + y.credit[1] - 2 * CREDIT)).toBeLessThan(
        0.6,
      );
  });

  it("average near the truth with least squares, and a little under it with ridge", () => {
    const mean = (k: 0 | 1, which: "credit" | "steady") =>
      STORY_YEARS.reduce((s, y) => s + y[which][k], 0) / STORY_YEARS.length;
    expect(Math.abs(mean(0, "credit") - CREDIT)).toBeLessThan(0.4);
    // The total keeps 21/25 of itself: 3 × 0.84 = 2.52 each
    expect(mean(0, "steady")).toBeCloseTo(CREDIT * kept(21, STORY_LAMBDA), 1);
    expect(mean(1, "steady")).toBeCloseTo(CREDIT * kept(21, STORY_LAMBDA), 1);
  });

  it("read as the page tells them", () => {
    const [first, second] = STORY_YEARS;
    expect([first, second].map((y) => y.credit.map(signed).join(" "))).toEqual([
      "+7.5 −1.4",
      "−1.1 +6.6",
    ]);
    expect([first, second].map((y) => y.steady.map(one).join(" "))).toEqual([
      "3.5 1.7",
      "1.5 3.1",
    ]);
    expect([
      one(first.fun[3]),
      one(first.fun[8]),
      one(second.fun[3]),
      one(second.fun[8]),
    ]).toEqual(["6.9", "−2.0", "−0.6", "7.0"]);
    expect(anaRange("credit").map(one)).toEqual(["−1.1", "8.5"]);
    expect(anaRange("steady").map(one)).toEqual(["1.4", "3.5"]);
    expect(
      worked().map(
        (w) =>
          `${w.lambda}: ${w.credit.map(signed).join(" ")} (${w.values.join(", ")})`,
      ),
    ).toEqual([
      "0: +7.5 −1.4 (21, 1)",
      "1: +5.1 +0.7 (22, 2)",
      "4: +3.5 +1.7 (25, 5)",
    ]);
    expect(kept(21, 4).toFixed(2)).toBe("0.84");
    expect(kept(1, 4)).toBe(0.2);
  });

  it("come together ten times and apart twice", () => {
    expect(PARTIES.filter(([a, b]) => a && b)).toHaveLength(10);
    expect(PARTIES.filter(([a, b]) => a + b === 1)).toHaveLength(2);
  });
});

describe("the lab", () => {
  it("has features with the correlation it is set to", () => {
    for (const rho of CORRELATIONS) {
      const rows = design(rho);
      const g = gram(rows);
      expect(g.a / LAB_N).toBeCloseTo(1, 10);
      expect(g.c / LAB_N).toBeCloseTo(1, 10);
      expect(g.b / LAB_N).toBeCloseTo(rho, 10);
      expect(
        moment(
          rows,
          rows.map(() => 1),
        )[0],
      ).toBeCloseTo(0, 10);
      // Eigenvalues n(1 + ρ) and n(1 − ρ)
      const { values } = eigen(g);
      expect(values[0]).toBeCloseTo(LAB_N * (1 + rho), 8);
      expect(values[1]).toBeCloseTo(LAB_N * (1 - rho), 8);
    }
  });

  it("spreads the weights more as the features move together, and less as λ grows", () => {
    for (let i = 1; i < CORRELATIONS.length; i++) {
      expect(labOf(CORRELATIONS[i], 0).spreadW1).toBeGreaterThan(
        labOf(CORRELATIONS[i - 1], 0).spreadW1,
      );
    }
    for (const rho of CORRELATIONS) {
      for (let i = 1; i < LAMBDAS.length; i++) {
        expect(labOf(rho, LAMBDAS[i]).spreadW1).toBeLessThan(
          labOf(rho, LAMBDAS[i - 1]).spreadW1,
        );
      }
    }
  });

  it("predicts new points like its data about as well at any correlation, but not points where the features part", () => {
    const steady = labOf(0, 0);
    const twins = labOf(0.999, 0);
    expect(twins.errorLike).toBeLessThan(1.15);
    expect(Math.abs(twins.errorLike - steady.errorLike)).toBeLessThan(0.1);
    expect(twins.errorApart).toBeGreaterThan(20);
    expect(labOf(0.999, 3).errorApart).toBeLessThan(1.1);
    // A big λ pays in bias: worse on points like the data
    expect(labOf(0.999, 30).errorLike).toBeGreaterThan(1.3);
  });

  it("reads as the page tells it", () => {
    const twins = labOf(0.999, 0);
    expect([
      twins.spreadW1.toFixed(1),
      twins.errorLike.toFixed(2),
      twins.errorApart.toFixed(0),
    ]).toEqual(["4.2", "1.07", "36"]);
    expect(labOf(0.999, 3).spreadW1.toFixed(2)).toBe("0.10");
  });
});

describe("the check", () => {
  it("keeps a fifth along the weak direction and nearly all along the strong one", () => {
    expect(kept(CHECK_VALUES[1], CHECK_LAMBDA)).toBeCloseTo(0.2);
    expect(kept(CHECK_VALUES[0], CHECK_LAMBDA)).toBeCloseTo(0.96, 2);
  });
});
