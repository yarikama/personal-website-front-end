import { Readout } from "../../components/explain/figure";
import { usePlay } from "../../components/explain/useLoop";
import {
  drift,
  LAB_RUNS,
  PACE,
  pct,
  PROMPT,
  REFERENCE,
  REPLIES,
  type Beta,
} from "./model";
import Shares from "./Shares";

// The lab: DPO training an instruction-tuned model's four replies on 300
// picks, from the reference's shares (dashed) toward where RLHF's judge and
// leash would put them (sage ticks). Give it a `key` per setting so it
// trains again from the start.
export default function Lab({ beta }: { beta: Beta }) {
  const run = LAB_RUNS.get(beta)!;
  const steps = run.training.length - 1;
  const step = Math.floor(usePlay(steps, PACE));
  const shares = run.training[step];
  return (
    <div>
      <p className="mb-4 font-serif text-lg text-ink">“{PROMPT}”</p>
      <Shares
        labels={REPLIES}
        shares={shares}
        reference={REFERENCE}
        target={run.judged}
        scale={1}
        head="The model’s chance of each reply"
        foot="dashed: the reference · sage tick: RLHF’s answer"
        trained
        label={`With β = ${beta}, DPO moves the replies from ${REPLIES.map((r, i) => `${r} ${pct(REFERENCE[i])}`).join(", ")} to ${REPLIES.map(
          (r, i) => `${r} ${pct(run.judged[i])}`,
        ).join(", ")}, where RLHF would put them too.`}
      />
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Best" value={pct(shares[0])} accent />
        <Readout label="Drift" value={drift(shares, REFERENCE).toFixed(2)} />
        <Readout label="Loss" value={run.losses[step].toFixed(2)} />
      </div>
    </div>
  );
}
