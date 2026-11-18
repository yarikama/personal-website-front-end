import { useState } from "react";
import { Link } from "react-router-dom";
import Article from "../../components/explain/Article";
import { Clip } from "../../components/explain/Clip";
import {
  Button,
  Choice,
  Controls,
  Figure,
  Numbers,
} from "../../components/explain/figure";
import { Predict } from "../../components/explain/Predict";
import { Steps } from "../../components/explain/Steps";
import Dinners, { type Show } from "./Dinners";
import Lab from "./Lab";
import {
  BETAS,
  BOTH_UP,
  CURRY,
  drift,
  HABITS,
  JUDGED,
  LAB_RUNS,
  pairLoss,
  PER_PAIR,
  pct,
  PICKS,
  pickCount,
  preferChance,
  REFERENCE,
  SALAD,
  SCORES,
  sigmoid,
  WORKED,
  WORKED_BETA,
  type Beta,
} from "./model";

const STEPS: Show[] = [
  "habits",
  "picks",
  "scores",
  "judge",
  "shortcut",
  "same",
  "named",
];

const loose = LAB_RUNS.get(BETAS[0])!;
const tight = LAB_RUNS.get(BETAS[BETAS.length - 1])!;
const labPicks = 6 * PER_PAIR;
const two = (x: number) => x.toFixed(2);

export default function Dpo() {
  const [beta, setBeta] = useState<Beta>(1);
  const [replays, setReplays] = useState(0);

  return (
    <Article
      kicker="Natural language processing · Post-training"
      title="The model is its own judge"
      promise="Teaching a chatbot from people’s “this answer, not that one” usually takes a judge model and a reinforcement learning loop. How does DPO get the same chatbot from one plain loss?"
      takeaway={
        <>
          DPO scores each answer by how much likelier the model makes it than
          its frozen <em>reference</em> did, β ln(π ÷ π<sub>ref</sub>), and fits
          those scores to people’s picks with the logistic loss: it reaches the
          model RLHF’s judge and leash would, with no judge and no RL loop.
        </>
      }
      sources={[
        {
          title: "COMP 646: Deep Learning for Vision and Language",
          by: "Vicente Ordóñez-Román, Rice University, Spring 2026",
          part: "Lectures 17 and 18, post-training: learning from human preferences, RLHF and DPO",
        },
        {
          title:
            "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
          by: "Rafael Rafailov, Archit Sharma, Eric Mitchell, Stefano Ermon, Christopher D. Manning and Chelsea Finn, 2023",
          part: "The closed-form policy under a KL leash, the DPO loss, and β = 0.1 by default (Appendix B)",
          url: "https://arxiv.org/abs/2305.18290",
        },
        {
          title:
            "Training language models to follow instructions with human feedback",
          by: "Long Ouyang et al., NeurIPS, 2022",
          part: "InstructGPT: a reward model trained on people’s rankings, then PPO with a penalty for drifting from the fine-tuned model",
          url: "https://arxiv.org/abs/2203.02155",
        },
      ]}
    >
      <Predict
        question="RLHF keeps four models in memory as it trains: the chatbot, a judge that scores its answers, a critic for the reinforcement learning, and a frozen copy of the chatbot. DPO learns from the same picks with no judge and no reinforcement learning. How many models does it still need?"
        options={[
          { label: "One" },
          { label: "Two", right: true },
          { label: "Three" },
          { label: "Four" },
        ]}
        reveal={
          <>
            Two: the chatbot and the frozen copy of where it started. With no
            judge, the only way left to score an answer is to compare the
            chatbot’s chance of writing it with the copy’s. The copy is what
            turns the model’s own probabilities into a score.
          </>
        }
      />

      <h2>Dinner for a picky flatmate</h2>

      <Steps
        readable
        say={[
          <>
            You cook dinner for a flatmate, and out of habit you make pasta{" "}
            {pct(HABITS[0])} of nights, soup {pct(HABITS[1])}, salad{" "}
            {pct(HABITS[2])} and curry {pct(HABITS[3])}.
          </>,
          <>
            Asked to rate a dinner out of ten they shrug, but offered two they
            always pick one, so over a month you collect {pickCount(PICKS)}{" "}
            picks.
          </>,
          <>
            A judge turns the picks into a score for each dinner, set so that a
            gap in scores says how often one beats the other: curry,{" "}
            {(SCORES[CURRY] - SCORES[SALAD]).toFixed(1)} above salad, should win{" "}
            {pct(preferChance(SCORES[CURRY], SCORES[SALAD]))} of the time.
          </>,
          <>
            Then you cook more of what scores high, but on a leash, staying near
            your habits, since {pickCount(PICKS)} picks are thin evidence: curry
            rises to {pct(JUDGED[CURRY])} and salad falls to{" "}
            {pct(JUDGED[SALAD])}.
          </>,
          <>
            Or skip the judge: train your shares on the picks directly, and read
            each dinner’s score off how much more often you now cook it than
            your habit did.
          </>,
          <>
            Once those scores explain the picks as well as the judge’s did, they
            are the judge’s scores, and your shares land exactly where the leash
            put them.
          </>,
          <>
            The dinners are a chatbot’s answers, your habits the{" "}
            <strong>reference model</strong> π<sub>ref</sub>, the judge a{" "}
            <strong>reward model</strong>; judge and leash are{" "}
            <strong>RLHF</strong>, and the shortcut is <strong>DPO</strong>,
            direct preference optimization.
          </>,
        ]}
      >
        {(step) => <Dinners key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        Comparing is easier than scoring: people disagree about what a 7 means
        but mostly agree on which of two answers is better. The judge’s rule,
        that the chance of a win is the sigmoid of the score gap, is the{" "}
        <strong>Bradley–Terry model</strong>, and fitting it is{" "}
        <Link to="/learnings/logistic-regression">logistic regression</Link> on
        the gaps. Only gaps count, so adding 1 to every score changes nothing.
      </p>
      <p>
        In InstructGPT the judge was a language model with a score on top,
        trained on people’s rankings of answers. The leash was a charge, at
        every token, for drifting from the model that{" "}
        <Link to="/learnings/instruction-tuning">instruction tuning</Link>{" "}
        produced, while <Link to="/learnings/ppo">PPO</Link> had the chatbot
        write fresh answers and pushed it toward the ones the judge liked. Off
        the leash, the chatbot finds answers the judge overrates, the trap of{" "}
        <Link to="/learnings/designing-rewards">
          paying for the wrong thing
        </Link>
        .
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: score each answer by β times the log of how much likelier the
        model now makes it than the reference did. Then charge each pick the
        logistic loss on the preferred answer’s score minus the other’s:
      </p>
      <p className="text-center">
        loss = −ln σ( β ln (π(win) ÷ π<sub>ref</sub>(win)) − β ln (π(lose) ÷ π
        <sub>ref</sub>(lose)) )
      </p>
      <p>With β = {WORKED_BETA}, for one pair:</p>
      <Numbers
        words
        items={WORKED.map((w) => ({
          label: w.name,
          value: two(pairLoss(w.winner, w.loser, WORKED_BETA)),
          note: `σ = ${pct(sigmoid(WORKED_BETA * Math.log(w.winner / w.loser)))}`,
        }))}
      />
      <p>
        The loss falls as the model leans toward what people picked, measured
        from where it started, and only then. Why this is RLHF in disguise: the
        policy that earns the most score on a leash of strength β is the
        reference’s chances times e<sup>score ÷ β</sup>, rescaled. Read
        backwards, any policy implies a score for every answer, and the
        rescaling adds the same amount to each, which no gap can see.
      </p>
      <Clip
        src="dpo/leash-to-loss"
        label="The best policy on a leash: pi star of y equals pi ref of y times e to the r of y over beta, divided by Z. Read backwards as a score: r of y equals beta ln of pi star over pi ref, plus beta ln Z. The Bradley–Terry chance that the winner beats the loser is sigma of r of win minus r of lose; the beta ln Z terms cancel, leaving sigma of beta ln pi of win over pi ref of win minus beta ln pi of lose over pi ref of lose. Its negative log is the DPO loss."
        caption="Solve RLHF’s best policy for the score, and drop that score into the preference rule: the normalizer Z cancels in the gap, and what is left is a loss on the policy alone."
      />

      <Predict
        kicker="Quick check"
        question={`After some training, the model makes the preferred answer in a pair ${BOTH_UP} times as likely as the reference did, and the other answer ${BOTH_UP} times as likely too. What is DPO’s loss on this pair?`}
        options={[
          { label: "Lower than before training" },
          {
            label: `The same as before, ${two(pairLoss(BOTH_UP, BOTH_UP, 1))}`,
            right: true,
          },
          { label: "Higher than before training" },
          { label: "Zero" },
        ]}
        reveal={
          <>
            Both scores are β ln {BOTH_UP}, so the gap is zero and the loss is
            ln 2 = {two(pairLoss(1, 1, 1))}, as it was at the start. DPO pays
            for leaning toward the winner relative to the reference; making both
            answers likelier says nothing about which one people preferred.
          </>
        }
      />

      <h2>Train one yourself</h2>
      <p>
        An instruction-tuned model has four replies to one question, and{" "}
        {labPicks} people each picked between two of them, {PER_PAIR} per pair.
        DPO trains on the picks; the sage ticks mark where a judge fitted to the
        same picks, and a leash, would put the model. Choose β, how tight the
        leash is.
      </p>
      <Figure
        readable
        caption={
          <>
            Sage bars: DPO’s chances as it trains; dashed: the reference. At
            every β the bars end on RLHF’s ticks. At β = {BETAS[0]} the best
            reply ends at {pct(loose.judged[0])}, a drift of{" "}
            {two(drift(loose.judged, REFERENCE))}; at β ={" "}
            {BETAS[BETAS.length - 1]}, at {pct(tight.judged[0])}, a drift of{" "}
            {two(drift(tight.judged, REFERENCE))}. The loss ends at{" "}
            {two(loose.losses.at(-1)!)} for every β: the picks are explained
            equally well, and only the drift differs.
          </>
        }
      >
        <Lab key={`${beta} ${replays}`} beta={beta} />
        <Controls>
          <Choice label="β" options={BETAS} value={beta} onChange={setBeta} />
          <Button onClick={() => setReplays((n) => n + 1)}>Train again</Button>
        </Controls>
      </Figure>
      <p>
        A larger β turns the same change in chance into a larger score gap, so
        the picks are explained by a smaller move. In a real model an answer’s
        log-probability is a sum over all its tokens and moves by far more than
        here, which is why β is small in practice.
      </p>

      <h2>DPO or RLHF?</h2>
      <p>
        DPO is one supervised loss on a fixed set of pairs: no judge to train,
        no answers to sample while training, two models in memory, and the
        steadiness of ordinary fine-tuning. RLHF costs more, but it scores fresh
        answers as the model changes, and its judge can score answers nobody
        ranked. Where a program can check an answer outright, as in maths or
        code, the judge can be replaced by the checker:{" "}
        <Link to="/learnings/rlvr">RLVR</Link>.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>
            Start from the instruction-tuned model, and freeze a copy.
          </strong>{" "}
          The copy is π<sub>ref</sub>; every score is measured from it.
        </li>
        <li>
          <strong>Keep β near 0.1.</strong> It is the DPO paper’s default, with
          0.5 for summaries. Smaller lets the model drift; larger holds it near
          the reference.
        </li>
        <li>
          <strong>Collect pairs from your own model.</strong> DPO learns only
          from the pairs it is given, and pairs of answers the model would never
          write teach it little about the ones it does.
        </li>
        <li>
          <strong>Watch each answer’s chance, not just the gap.</strong> The
          loss sees only the gap, so the preferred answer can grow less likely
          as long as the other falls faster.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question="A team trains with DPO at β = 0.05. The model now wins people’s picks, but its answers have grown odd, far from the instruction-tuned model it started as. Which change should keep it closer?"
        options={[
          { label: "Raise β to 0.5", right: true },
          { label: "Lower β to 0.01" },
          { label: "Drop the reference model" },
          { label: "Train longer on the same pairs" },
        ]}
        reveal={
          <>
            Raise β. A larger β makes each step away from the reference count
            for more score, so the picks are explained by a smaller move.
            Lowering it loosens the leash further; without the reference there
            is no score at all; and more passes over the same pairs only widen
            the gap.
          </>
        }
      />
    </Article>
  );
}
