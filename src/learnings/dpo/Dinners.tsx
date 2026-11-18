import { lerp, usePlay } from "../../components/explain/useLoop";
import {
  CURRY,
  DISHES,
  HABITS,
  implicitScores,
  JUDGED,
  PACE,
  pct,
  PICKS,
  pickCount,
  preferChance,
  records,
  SALAD,
  SCORES,
  STORY_BETA,
  STORY_TRAINING,
} from "./model";
import Shares from "./Shares";

export type Show =
  "habits" | "picks" | "scores" | "judge" | "shortcut" | "same" | "named";

const RECORDS = records(PICKS);
const GAP = SCORES[CURRY] - SCORES[SALAD];
const list = (shares: number[]) =>
  DISHES.map((d, i) => `${d} ${pct(shares[i])}`).join(", ");

// The story: your habits, a flatmate's picks, a judge's scores and the
// shares they lead to on a leash; then the shortcut, training the shares
// on the picks directly, which lands in the same place. Give it a `key`
// per step so each plays from the start.
export default function Dinners({ show }: { show: Show }) {
  const moving =
    show === "judge" ? 1 : show === "shortcut" ? STORY_TRAINING.length - 1 : 0;
  const played = usePlay(moving, show === "judge" ? 1400 : PACE);

  if (show === "habits")
    return (
      <Shares
        labels={DISHES}
        shares={HABITS}
        scale={0.5}
        head="How often you cook it"
        label={`Your habits: ${list(HABITS)}.`}
      />
    );

  if (show === "picks")
    return (
      <Shares
        labels={DISHES}
        records={RECORDS}
        scale={0.5}
        head="Each dinner’s twelve matchups"
        foot={`${pickCount(PICKS)} picks · filled: picked, hollow: passed over`}
        label={`${pickCount(PICKS)} picks. ${DISHES.map((d, i) => `${d} picked ${RECORDS[i].won} times, passed over ${RECORDS[i].lost}`).join("; ")}.`}
      />
    );

  if (show === "scores")
    return (
      <Shares
        labels={DISHES}
        records={RECORDS}
        scores={SCORES}
        scale={0.5}
        head="Each dinner’s twelve matchups"
        scoreHead="Score"
        foot={`curry − salad = ${GAP.toFixed(1)}: curry wins ${pct(preferChance(SCORES[CURRY], SCORES[SALAD]))}`}
        label={`The judge’s scores: ${DISHES.map((d, i) => `${d} ${SCORES[i].toFixed(1)}`).join(", ")}.`}
      />
    );

  if (show === "judge") {
    const shares = HABITS.map((h, i) => lerp(h, JUDGED[i], played));
    return (
      <Shares
        labels={DISHES}
        shares={shares}
        reference={HABITS}
        scores={SCORES}
        scale={0.5}
        head="How often you cook it"
        scoreHead="Score"
        foot="dashed: your habits"
        trained
        label={`Cooking more of what scores high, near your habits: ${list(JUDGED)}.`}
      />
    );
  }

  // The shortcut: the shares trained on the picks, and the score each one's
  // change from your habits implies
  const shares =
    show === "shortcut"
      ? STORY_TRAINING[Math.floor(played)]
      : STORY_TRAINING.at(-1)!;
  const implied = implicitScores(shares, HABITS, STORY_BETA);
  const named = show === "named";
  return (
    <Shares
      labels={named ? DISHES.map((d, i) => `${d}: answer ${i + 1}`) : DISHES}
      shares={shares}
      reference={HABITS}
      target={show === "shortcut" ? undefined : JUDGED}
      scores={implied}
      scale={0.5}
      head={named ? "The model’s chances" : "How often you cook it"}
      scoreHead={named ? "Reward" : "Yours"}
      foot={
        named
          ? "dashed: π_ref, the reference · sage tick: RLHF"
          : show === "same"
            ? "sage tick: where the judge led"
            : "dashed: your habits"
      }
      trained
      label={`Trained on the picks directly: ${list(shares)}. Each dinner’s score, read off its change from your habits: ${DISHES.map((d, i) => `${d} ${implied[i].toFixed(1)}`).join(", ")}.`}
    />
  );
}
