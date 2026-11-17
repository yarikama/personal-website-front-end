import { seeded } from "../../components/explain/random";

// Two features, so every matrix here is 2×2 and every solve is by hand.
export type Vec2 = [number, number];
// A symmetric 2×2 matrix [[a, b], [b, c]], like XᵀX
export interface Sym2 {
  a: number;
  b: number;
  c: number;
}

// XᵀX for rows of two features
export function gram(rows: Vec2[]): Sym2 {
  let a = 0;
  let b = 0;
  let c = 0;
  for (const [x1, x2] of rows) {
    a += x1 * x1;
    b += x1 * x2;
    c += x2 * x2;
  }
  return { a, b, c };
}

// Xᵀy
export function moment(rows: Vec2[], y: number[]): Vec2 {
  let r1 = 0;
  let r2 = 0;
  rows.forEach(([x1, x2], i) => {
    r1 += x1 * y[i];
    r2 += x2 * y[i];
  });
  return [r1, r2];
}

// The w with (m + λI) w = r, by the 2×2 inverse
export function solve(m: Sym2, r: Vec2, lambda = 0): Vec2 {
  const a = m.a + lambda;
  const c = m.c + lambda;
  const det = a * c - m.b * m.b;
  return [(c * r[0] - m.b * r[1]) / det, (a * r[1] - m.b * r[0]) / det];
}

// The eigenvalues of a symmetric 2×2 matrix, largest first, and their unit
// eigenvectors
export function eigen(m: Sym2): { values: Vec2; vectors: [Vec2, Vec2] } {
  const mid = (m.a + m.c) / 2;
  const half = Math.hypot((m.a - m.c) / 2, m.b);
  const values: Vec2 = [mid + half, mid - half];
  // (m − eI) v = 0 has v = (b, e − a); a diagonal m has the axes
  const unit = (e: number): Vec2 => {
    const length = Math.hypot(m.b, e - m.a);
    return [m.b / length, (e - m.a) / length];
  };
  const vectors: [Vec2, Vec2] =
    Math.abs(m.b) > 1e-12
      ? [unit(values[0]), unit(values[1])]
      : m.a >= m.c
        ? [
            [1, 0],
            [0, 1],
          ]
        : [
            [0, 1],
            [1, 0],
          ];
  return { values, vectors };
}

// Ridge regression: the weights that minimise ‖y − Xw‖² + λ‖w‖², which
// solve (XᵀX + λI) w = Xᵀy. At λ = 0 it is least squares.
export const ridge = (rows: Vec2[], y: number[], lambda: number) =>
  solve(gram(rows), moment(rows, y), lambda);
export const leastSquares = (rows: Vec2[], y: number[]) => ridge(rows, y, 0);

// The loss ridge minimises, for checking a solve against it
export function ridgeLoss(
  rows: Vec2[],
  y: number[],
  w: Vec2,
  lambda: number,
): number {
  let loss = lambda * (w[0] * w[0] + w[1] * w[1]);
  rows.forEach(([x1, x2], i) => {
    loss += (y[i] - w[0] * x1 - w[1] * x2) ** 2;
  });
  return loss;
}

// How much ridge keeps of least squares' answer along a direction whose
// eigenvalue of XᵀX is `value`: it adds λ below the line, e / (e + λ)
export const kept = (value: number, lambda: number) => value / (value + lambda);

// A standard normal draw (Box–Muller)
export function normal(random: () => number): number {
  const u = 1 - random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

// The standard deviation of some numbers
export function spread(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length,
  );
}

// ——— The story: a year of parties, and two friends who always come together

// Who came to each month's party: [Ana, Ben]. Together ten times; Ana alone
// in April, Ben alone in September.
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const ANA_ALONE = 3;
export const BEN_ALONE = 8;
export const PARTIES: Vec2[] = MONTHS.map((_, i) =>
  i === ANA_ALONE ? [1, 0] : i === BEN_ALONE ? [0, 1] : [1, 1],
);
// Each friend really adds this much fun, and a night's luck moves it this much
export const CREDIT = 3;
export const LUCK = 2;
// The story's rule: split the credit evenly unless the parties insist
export const STORY_LAMBDA = 4;
export const YEARS = 100;

export interface Year {
  fun: number[];
  // Least squares' split of the credit, and ridge's
  credit: Vec2;
  steady: Vec2;
}

export function year(random: () => number): Year {
  const fun = PARTIES.map(
    ([ana, ben]) => CREDIT * (ana + ben) + LUCK * normal(random),
  );
  return {
    fun,
    credit: ridge(PARTIES, fun, 0),
    steady: ridge(PARTIES, fun, STORY_LAMBDA),
  };
}

// Seeded, and chosen so that the first two years swing hard, opposite ways,
// as the story tells
export const STORY_SEED = 567;
export const STORY_YEARS: Year[] = (() => {
  const random = seeded(STORY_SEED);
  return Array.from({ length: YEARS }, () => year(random));
})();

// The parties' XᵀX: eigenvalues 21, along "both came", and 1, along "one
// came without the other"
export const PARTY_GRAM = gram(PARTIES);

// The worked λs, on the first year's parties
export const WORKED_LAMBDAS = [0, 1, STORY_LAMBDA] as const;
export const worked = () =>
  WORKED_LAMBDAS.map((lambda) => ({
    lambda,
    credit: ridge(PARTIES, STORY_YEARS[0].fun, lambda),
    values: eigen(PARTY_GRAM).values.map((value) => value + lambda) as Vec2,
  }));

// How far Ana's credit ranged over the hundred years, each way
export const anaRange = (pick: "credit" | "steady"): Vec2 => {
  const all = STORY_YEARS.map((y) => y[pick][0]);
  return [Math.min(...all), Math.max(...all)];
};

// ——— The lab: two standardised features with a set correlation

export const LAB_N = 30;
export const LAB_TRUE: Vec2 = [1, 1];
export const LAB_NOISE = 1;
export const RESAMPLES = 200;
export const CORRELATIONS = [0, 0.9, 0.99, 0.999] as const;
export const LAMBDAS = [0, 0.3, 3, 30] as const;

// n rows whose two features each have mean 0 and mean square 1, and whose
// correlation is exactly rho: XᵀX = n [[1, ρ], [ρ, 1]]. The same base for
// every rho, so the data change smoothly with it.
const BASE = (() => {
  const random = seeded(7);
  const draw = () => {
    const v = Array.from({ length: LAB_N }, () => normal(random));
    const mean = v.reduce((s, x) => s + x, 0) / LAB_N;
    return v.map((x) => x - mean);
  };
  const scale = (v: number[]) => {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0) / LAB_N);
    return v.map((x) => x / norm);
  };
  const u = scale(draw());
  const raw = draw();
  const along = raw.reduce((s, x, i) => s + x * u[i], 0) / LAB_N;
  const v = scale(raw.map((x, i) => x - along * u[i]));
  return { u, v };
})();

export function design(rho: number): Vec2[] {
  const across = Math.sqrt(1 - rho * rho);
  return BASE.u.map((u, i) => [u, rho * u + across * BASE.v[i]]);
}

// The same noise for every setting: resample r is NOISES[r]
const NOISES = (() => {
  const random = seeded(11);
  return Array.from({ length: RESAMPLES }, () =>
    Array.from({ length: LAB_N }, () => LAB_NOISE * normal(random)),
  );
})();

export interface Lab {
  weights: Vec2[];
  mean: Vec2;
  // The spread of w₁ over the resamples
  spreadW1: number;
  // Mean squared error on new points like the data, and on new points
  // where the two features no longer move together
  errorLike: number;
  errorApart: number;
  // The eigenvalues of XᵀX, and of XᵀX + λI
  values: Vec2;
}

export function lab(rho: number, lambda: number): Lab {
  const rows = design(rho);
  const clean = rows.map(([x1, x2]) => LAB_TRUE[0] * x1 + LAB_TRUE[1] * x2);
  const g = gram(rows);
  const weights = NOISES.map((noise) =>
    solve(
      g,
      moment(
        rows,
        clean.map((v, i) => v + noise[i]),
      ),
      lambda,
    ),
  );
  const mean: Vec2 = [0, 1].map(
    (k) => weights.reduce((s, w) => s + w[k], 0) / RESAMPLES,
  ) as Vec2;
  // A new point x with E[xxᵀ] = Σ misses by xᵀ(w − w*) plus fresh noise:
  // its mean square is the noise's plus dᵀΣd
  let like = 0;
  let apart = 0;
  for (const w of weights) {
    const d0 = w[0] - LAB_TRUE[0];
    const d1 = w[1] - LAB_TRUE[1];
    like += d0 * d0 + 2 * rho * d0 * d1 + d1 * d1;
    apart += d0 * d0 + d1 * d1;
  }
  return {
    weights,
    mean,
    spreadW1: spread(weights.map((w) => w[0])),
    errorLike: LAB_NOISE ** 2 + like / RESAMPLES,
    errorApart: LAB_NOISE ** 2 + apart / RESAMPLES,
    values: eigen(g).values,
  };
}

// Worked out once per setting, for the figure
const labs = new Map<string, Lab>();
export function labOf(rho: number, lambda: number): Lab {
  const key = `${rho} ${lambda}`;
  let found = labs.get(key);
  if (!found) {
    found = lab(rho, lambda);
    labs.set(key, found);
  }
  return found;
}

// The check yourself's case: eigenvalues 50 and 0.5, λ = 2
export const CHECK_VALUES: Vec2 = [50, 0.5];
export const CHECK_LAMBDA = 2;

// "+7.5", "−1.4", "0.0"
export function signed(value: number): string {
  const text = Math.abs(value).toFixed(1);
  return text === "0.0" ? text : `${value > 0 ? "+" : "−"}${text}`;
}
// "7.5", "−1.4"
export const one = (value: number) => signed(value).replace("+", "");
