import { lerp, usePlay } from "../../components/explain/useLoop";
import {
  ANA_ALONE,
  BEN_ALONE,
  CREDIT,
  MONTHS,
  PARTIES,
  signed,
  STORY_LAMBDA,
  STORY_YEARS,
  YEARS,
  type Vec2,
} from "./model";

const WIDTH = 600;
const HEIGHT = 300;

// The year: a column per month, the night's fun as a bar, who came under it
const LABELS = 46;
const COLUMN = 20;
const STRIP = 56;
const BASE = 190;
const PER_POINT = 13;
const ANA_ROW = 236;
const BEN_ROW = 252;
const MONTH_ROW = 272;
const column = (i: number) => STRIP + COLUMN * i + COLUMN / 2;
const funY = (fun: number) =>
  BASE - PER_POINT * Math.max(-2.5, Math.min(10, fun));

// The split of the credit: Ana's along, Ben's up, from −3 to 9
const PLANE = { left: 356, top: 28, size: 228 };
const LOW = -3;
const HIGH = 9;
const UNIT = PLANE.size / (HIGH - LOW);
const clamp = (w: number) => Math.max(LOW, Math.min(HIGH, w));
const px = (w: number) => PLANE.left + (clamp(w) - LOW) * UNIT;
const py = (w: number) => PLANE.top + PLANE.size - (clamp(w) - LOW) * UNIT;
const SUM = 2 * CREDIT;
const easing = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export type Show =
  "year" | "apart" | "first" | "second" | "many" | "steady" | "named";

const SPANS: Record<Show, [number, number]> = {
  year: [MONTHS.length, 110],
  apart: [1, 700],
  first: [1, 700],
  second: [1, 1300],
  many: [YEARS, 28],
  steady: [1, 1600],
  named: [1, 1],
};

// The story's parties and how the credit is split, one step at a time.
// Give it a `key` per step, so each plays from the start.
export default function Parties({ show }: { show: Show }) {
  const [span, pace] = SPANS[show];
  const played = usePlay(span, pace);
  const t = Math.min(1, played / span);
  const named = show === "named";
  const [first, second] = STORY_YEARS;

  // The year on the strip, and its fun night by night
  const shownYear =
    show === "many"
      ? Math.min(YEARS - 1, Math.floor(played))
      : show === "second"
        ? 1
        : 0;
  const fun =
    show === "second"
      ? first.fun.map((f, i) => lerp(f, second.fun[i], easing(t)))
      : show === "steady" || named
        ? first.fun
        : STORY_YEARS[shownYear].fun;
  const risen = show === "year" ? played : MONTHS.length;
  const apartLit = show !== "year";

  // The credit dots on the plane
  const many = show === "many" || show === "steady" || named;
  const count =
    show === "many"
      ? Math.min(YEARS, Math.floor(played) + 1)
      : many
        ? YEARS
        : 0;
  const moved = show === "steady" ? easing(t) : named ? 1 : 0;
  const current: Vec2 | null =
    show === "first"
      ? first.credit
      : show === "second"
        ? [
            lerp(first.credit[0], second.credit[0], easing(t)),
            lerp(first.credit[1], second.credit[1], easing(t)),
          ]
        : null;

  const header =
    show === "year" || show === "apart"
      ? [
          "A year of parties",
          show === "year"
            ? "fun, month by month"
            : "two nights tell them apart",
        ]
      : show === "first"
        ? [
            "Year 1",
            `Ana ${signed(first.credit[0])} · Ben ${signed(first.credit[1])}`,
          ]
        : show === "second"
          ? [
              "Year 2",
              `Ana ${signed(second.credit[0])} · Ben ${signed(second.credit[1])}`,
            ]
          : show === "many"
            ? [
                `Year ${count} of ${YEARS}`,
                `Ana ${signed(STORY_YEARS[count - 1].credit[0])} · Ben ${signed(STORY_YEARS[count - 1].credit[1])}`,
              ]
            : named
              ? ["Ridge regression", `λ = ${STORY_LAMBDA}`]
              : ["Split evenly unless they insist", `${YEARS} years`];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{header[0]}</span>
        <span className="text-right tabular-nums text-ink">{header[1]}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={
          many
            ? `A year of twelve parties, and the credit for the fun split between Ana and Ben for each of ${YEARS} years: least squares' splits lie along a long line where the two add to about 6${show === "many" ? "" : `, and the steadier splits gather in a small blob near ${signed(STORY_YEARS[0].steady[0])} each`}`
            : "Twelve monthly parties with the fun of each night as a bar and who came under it; Ana and Ben came together ten times, Ana alone in April and Ben alone in September"
        }
      >
        {/* The year */}
        <g className="font-mono text-[11px]">
          <text
            x={LABELS}
            y={BASE - 70}
            textAnchor="end"
            className={named ? "fill-sage-ink" : "fill-zinc-faded"}
          >
            {named ? "y" : "fun"}
          </text>
          <text
            x={LABELS}
            y={ANA_ROW + 4}
            textAnchor="end"
            className={named ? "fill-sage-ink" : "fill-zinc-faded"}
          >
            {named ? "x₁" : "Ana"}
          </text>
          <text
            x={LABELS}
            y={BEN_ROW + 4}
            textAnchor="end"
            className={named ? "fill-sage-ink" : "fill-zinc-faded"}
          >
            {named ? "x₂" : "Ben"}
          </text>
        </g>
        <line
          x1={STRIP}
          x2={STRIP + COLUMN * MONTHS.length}
          y1={BASE}
          y2={BASE}
          className="stroke-zinc-300 dark:stroke-zinc-200/25"
        />
        {PARTIES.map(([ana, ben], i) => {
          const apart = i === ANA_ALONE || i === BEN_ALONE;
          const grown = Math.max(0, Math.min(1, risen - i));
          const top = lerp(BASE, funY(fun[i]), easing(grown));
          return (
            <g key={i}>
              <rect
                x={column(i) - 6}
                y={Math.min(top, BASE)}
                width={12}
                height={Math.abs(BASE - top)}
                rx={2}
                className={apart && apartLit ? "fill-sage" : "fill-zinc-400"}
              />
              <circle
                cx={column(i)}
                cy={ANA_ROW}
                r={5}
                className={
                  ana
                    ? "fill-ink"
                    : "fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
                }
              />
              <circle
                cx={column(i)}
                cy={BEN_ROW}
                r={5}
                className={
                  ben
                    ? "fill-ink"
                    : "fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
                }
              />
              <text
                x={column(i)}
                y={MONTH_ROW}
                textAnchor="middle"
                className={`font-mono text-[11px] ${apart && apartLit ? "fill-sage-ink" : "fill-zinc-faded"}`}
              >
                {MONTHS[i][0]}
              </text>
            </g>
          );
        })}

        {/* The plane of splits */}
        <line
          x1={px(0)}
          x2={px(0)}
          y1={py(HIGH)}
          y2={py(LOW)}
          className="stroke-zinc-300 dark:stroke-zinc-200/25"
        />
        <line
          x1={px(LOW)}
          x2={px(HIGH)}
          y1={py(0)}
          y2={py(0)}
          className="stroke-zinc-300 dark:stroke-zinc-200/25"
        />
        {[0, 3, 6].map((w) => (
          <g key={w} className="fill-zinc-faded font-mono text-[11px]">
            <text x={px(w)} y={py(LOW) + 16} textAnchor="middle">
              {w}
            </text>
            <text x={px(LOW) - 6} y={py(w) + 4} textAnchor="end">
              {w}
            </text>
          </g>
        ))}
        <text
          x={px((LOW + HIGH) / 2)}
          y={HEIGHT - 6}
          textAnchor="middle"
          className={`font-mono text-[11px] ${named ? "fill-sage-ink" : "fill-zinc-faded"}`}
        >
          {named ? "w₁, Ana’s weight" : "Ana’s credit"}
        </text>
        <text
          x={PLANE.left - 26}
          y={py((LOW + HIGH) / 2)}
          textAnchor="middle"
          transform={`rotate(-90 ${PLANE.left - 26} ${py((LOW + HIGH) / 2)})`}
          className={`font-mono text-[11px] ${named ? "fill-sage-ink" : "fill-zinc-faded"}`}
        >
          {named ? "w₂, Ben’s weight" : "Ben’s credit"}
        </text>

        {/* What the ten nights together pin down: the two add to about 6 */}
        {show !== "year" && (
          <g opacity={show === "apart" ? easing(t) : 1}>
            <line
              x1={px(SUM - HIGH)}
              y1={py(HIGH)}
              x2={px(HIGH)}
              y2={py(SUM - HIGH)}
              className="stroke-zinc-400"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <text
              x={px(0.5)}
              y={py(8.2)}
              className="fill-zinc-faded font-mono text-[11px]"
            >
              {named ? `w₁ + w₂ = ${SUM}` : `Ana + Ben = ${SUM}`}
            </text>
          </g>
        )}

        {/* Least squares' splits, then ridge's */}
        {many &&
          STORY_YEARS.slice(0, count).map((y, i) => {
            const at: Vec2 = [
              lerp(y.credit[0], y.steady[0], moved),
              lerp(y.credit[1], y.steady[1], moved),
            ];
            return (
              <g key={i}>
                {moved > 0 && (
                  <circle
                    cx={px(y.credit[0])}
                    cy={py(y.credit[1])}
                    r={2.5}
                    className="fill-ink"
                    opacity={0.25}
                  />
                )}
                <circle
                  cx={px(at[0])}
                  cy={py(at[1])}
                  r={show === "many" && i === count - 1 ? 5 : 3}
                  className={moved > 0 ? "fill-sage" : "fill-ink"}
                  opacity={
                    moved > 0
                      ? 0.8
                      : show === "many" && i === count - 1
                        ? 1
                        : 0.5
                  }
                />
              </g>
            );
          })}
        {show === "second" && (
          <circle
            cx={px(first.credit[0])}
            cy={py(first.credit[1])}
            r={5}
            className="fill-paper stroke-ink"
            strokeWidth={1.5}
          />
        )}
        {current && (
          <circle
            cx={px(current[0])}
            cy={py(current[1])}
            r={show === "first" ? 6 * Math.min(1, t * 1.5) : 6}
            className="fill-ink"
          />
        )}

        {/* Where the truth is: 3 each */}
        {(many || named) && (
          <g>
            <circle
              cx={px(CREDIT)}
              cy={py(CREDIT)}
              r={7}
              className="fill-none stroke-ink"
              strokeWidth={1.5}
            />
            <text
              x={px(CREDIT) + 11}
              y={py(CREDIT) - 9}
              className="fill-ink font-mono text-[11px]"
            >
              {named ? "w*" : "truth"}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
