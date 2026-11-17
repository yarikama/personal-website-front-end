import { useState } from "react";
import { Link } from "react-router-dom";
import Article from "../../components/explain/Article";
import { Clip } from "../../components/explain/Clip";
import {
  Choice,
  Controls,
  Figure,
  Numbers,
  Readout,
} from "../../components/explain/figure";
import { Predict } from "../../components/explain/Predict";
import { Steps } from "../../components/explain/Steps";
import Cloud from "./Cloud";
import {
  ANA_ALONE,
  anaRange,
  BEN_ALONE,
  CHECK_LAMBDA,
  CHECK_VALUES,
  CORRELATIONS,
  CREDIT,
  eigen,
  kept,
  LAB_N,
  LAB_NOISE,
  LAB_TRUE,
  LAMBDAS,
  labOf,
  one,
  PARTY_GRAM,
  RESAMPLES,
  signed,
  STORY_LAMBDA,
  STORY_YEARS,
  worked,
  YEARS,
} from "./model";
import Parties, { type Show } from "./Parties";

const STEPS: Show[] = [
  "year",
  "apart",
  "first",
  "second",
  "many",
  "steady",
  "named",
];

// Worked out once: the story's numbers, and the lab's at correlation 0.999
const [FIRST, SECOND] = STORY_YEARS;
const WORKED = worked();
const [STRONG, WEAK] = eigen(PARTY_GRAM).values;
const ANA = anaRange("credit");
const STEADY = anaRange("steady");
const STEADY_MEAN =
  STORY_YEARS.reduce((s, y) => s + y.steady[0] + y.steady[1], 0) / (2 * YEARS);
const gap = (w: readonly number[]) => w[0] - w[1];
const total = (w: readonly number[]) => w[0] + w[1];
const TWINS = labOf(0.999, 0);
const TWINS_HELD = labOf(0.999, 3);
const two = (value: number) => value.toFixed(2);

export default function RidgeRegression() {
  const [rho, setRho] = useState<(typeof CORRELATIONS)[number]>(0.99);
  const [lambda, setLambda] = useState<(typeof LAMBDAS)[number]>(0);
  const shown = labOf(rho, lambda);

  return (
    <Article
      kicker="Machine learning · Fitting a model"
      title="Ridge regression"
      promise="What happens to a model’s weights when two of its features nearly copy each other, and what can you do about it?"
      takeaway={
        <>
          When features move together, the data pin down what they do together
          but hardly how to split it, so least squares’ weights swing on the
          noise. Ridge adds λ to every eigenvalue of XᵀX, which steadies the
          weak directions most, at the price of a little <em>bias</em>.
        </>
      }
      sources={[
        {
          title: "COMP 642: Machine Learning",
          by: "Vivek Boominathan, Rice University, Spring 2026",
          part: "Week 2 lecture notes, Regression: when co-linear features are bad, and ridge regression",
        },
        {
          title: "The Elements of Statistical Learning",
          by: "Trevor Hastie, Robert Tibshirani and Jerome Friedman, 2nd edition, 2009",
          part: "Section 3.4.1, Ridge Regression",
          url: "https://hastie.su.domains/ElemStatLearn/",
        },
      ]}
    >
      <Predict
        question="You predict people’s weight from their height, recorded twice: in centimetres, and in inches rounded to the nearest inch. You fit least squares on 50 people, then again on 50 others from the same town. How do the two height weights change?"
        options={[
          { label: "Hardly at all" },
          { label: "Both shrink a little" },
          { label: "A lot, opposite ways", right: true },
          { label: "Both double" },
        ]}
        reveal={
          <>
            They swing, often by more than their own size, one up and the other
            down, while the total effect of height barely moves. The two columns
            say the same thing, so the data can pin down their sum but not how
            to split it, and the split goes wherever the noise pushes it.
          </>
        }
      />

      <h2>Two friends, one credit</h2>

      <Steps
        readable
        say={[
          <>
            You throw a party every month, and Ana and Ben come together every
            time but two: Ana alone in April, Ben alone in September.
          </>,
          <>
            You score each night’s fun and ask what each friend adds: the ten
            nights together say the two add about {2 * CREDIT}, but only April
            and September can tell them apart.
          </>,
          <>
            This April happened to be a great night ({one(FIRST.fun[ANA_ALONE])}
            ) and September a dull one ({one(FIRST.fun[BEN_ALONE])}), so the
            best fit gives Ana {signed(FIRST.credit[0])} and Ben{" "}
            {signed(FIRST.credit[1])}: Ben makes parties worse?
          </>,
          <>
            Next year brings the same friends and the same fun, with different
            luck on those two nights: Ana {signed(SECOND.credit[0])}, Ben{" "}
            {signed(SECOND.credit[1])}, still about {2 * CREDIT} together.
          </>,
          <>
            Over {YEARS} years the split slides along that line, Ana anywhere
            from {one(ANA[0])} to {one(ANA[1])}, while the total hardly moves.
          </>,
          <>
            So you charge for every big credit, which says “split it evenly
            unless the nights insist”: the splits pull into a small blob, Ana
            between {one(STEADY[0])} and {one(STEADY[1])}, both a little under
            the true {CREDIT}.
          </>,
          <>
            The friends are features, the credits are weights, each year is
            fresh noise, and the charge is <strong>ridge regression</strong>:
            least squares plus λ times the squared weights, here λ ={" "}
            {STORY_LAMBDA}.
          </>,
        ]}
      >
        {(step) => <Parties key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        <Link to="/learnings/least-squares">Least squares</Link> did nothing
        wrong: each year it found the split that fits best. But the data hold
        ten nights of evidence about the total and two about the difference, so
        the difference soaks up whatever luck those two nights had. Predict a
        night when both come and every split gives about {2 * CREDIT}. Ask about
        a night when only Ben comes, though, and the answer runs from{" "}
        {one(FIRST.credit[1])} to {one(SECOND.credit[1])}.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: choose the weights that make the squared error <em>plus</em> λ
        times the sum of the squared weights as small as possible. Setting the
        slope of that to zero gives least squares’ equation with λ added down
        the diagonal:
      </p>
      <p className="text-center font-serif text-2xl text-ink">
        (XᵀX + λI) w = Xᵀy
      </p>
      <p>
        Why that helps: XᵀX has an eigenvalue for each direction the weights can
        move in, and it measures how much the data say about that direction. For
        the parties, “both came” has {STRONG} and “one came alone” has {WEAK}.
        The fitted weights wobble along each direction with a variance of noise²
        divided by its eigenvalue, so the gap between Ana and Ben has{" "}
        {STRONG / WEAK} times the variance of their total. Adding λI lifts every
        eigenvalue by λ, and along each direction ridge keeps e ÷ (e + λ) of
        least squares’ answer: nearly all of it where the data say a lot, little
        where they say little. On the first year’s parties:
      </p>
      <Numbers
        words
        items={WORKED.map((w) => ({
          label: `λ = ${w.lambda}`,
          value: `${signed(w.credit[0])} · ${signed(w.credit[1])}`,
          note: `eigenvalues ${w.values.join(", ")}`,
        }))}
      />
      <p>
        The gap of {one(gap(WORKED[0].credit))} between them lies along the weak
        direction: λ = 1 keeps half of it, {one(gap(WORKED[1].credit))}, and λ ={" "}
        {STORY_LAMBDA} a fifth, {one(gap(WORKED[2].credit))}. The total,{" "}
        {one(total(WORKED[0].credit))}, keeps {STRONG}/{STRONG + 1} and then{" "}
        {STRONG}/{STRONG + STORY_LAMBDA} of itself. Of all splits with the same
        total, the even one has the smallest sum of squares, which is why the
        charge pulls the two together.
      </p>
      <Clip
        src="ridge-regression/lift-eigenvalues"
        label={`Ridge's loss, the squared error plus lambda times the squared weights. Its slope set to zero gives X transpose X plus lambda I, times w, equals X transpose y. The parties' X transpose X has eigenvalues ${STRONG}, both came, and ${WEAK}, one came alone, drawn as bars. Each is lifted by lambda equal to ${STORY_LAMBDA}, to ${STRONG + STORY_LAMBDA} and ${WEAK + STORY_LAMBDA}, so ridge keeps ${STRONG} over ${STRONG + STORY_LAMBDA}, 0.84, of least squares along the first and 1 over 5, 0.2, along the second.`}
        caption={`The same λ = ${STORY_LAMBDA} is a sliver on the strong direction and four times the weak one, so it steadies the weak one and barely touches the other.`}
      />
      <p>
        It goes by other names too: Tikhonov regularization, and weight decay
        when training neural networks. Its price is bias: the {YEARS} steady
        splits average {one(STEADY_MEAN)} each, not {CREDIT}, because the charge
        trims the total too. Whether that trade pays is the{" "}
        <Link to="/learnings/bias-variance">bias–variance</Link> question; here
        a small bias buys a fifth of the wobble.
      </p>

      <h2>Play with it</h2>
      <p>
        Two features, standardised to the same scale, with true weights{" "}
        {LAB_TRUE[0]} and {LAB_TRUE[1]}, {LAB_N} points and noise of {LAB_NOISE}
        . Set how closely the features move together, and λ. Each dot is a fit
        to the same points with fresh noise, {RESAMPLES} times over.
      </p>
      <Figure
        readable
        caption={
          <>
            Each sage dot is one fit; the ring is the truth. At correlation
            0.999 without ridge, w₁ spreads by {one(TWINS.spreadW1)} along the
            dashed line, yet the error on new points like the data is{" "}
            {two(TWINS.errorLike)}, barely above the noise’s 1. On points where
            the two features part ways it is {Math.round(TWINS.errorApart)}. λ =
            3 shrinks the spread to {two(TWINS_HELD.spreadW1)}; λ = 30
            overshoots, and the cloud settles off the ring.
          </>
        }
      >
        <Cloud lab={shown} lambda={lambda} />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Readout label="Spread of w₁" value={two(shown.spreadW1)} accent />
          <Readout label="Error, like the data" value={two(shown.errorLike)} />
          <Readout
            label="Error, features apart"
            value={two(shown.errorApart)}
          />
          <Readout
            label="Weakest e + λ"
            value={Number((shown.values[1] + lambda).toPrecision(2))}
          />
        </div>
        <Controls>
          <Choice
            label="Correlation"
            options={CORRELATIONS}
            value={rho}
            onChange={setRho}
          />
          <Choice
            label="λ"
            options={LAMBDAS}
            value={lambda}
            onChange={setLambda}
          />
        </Controls>
      </Figure>

      <Predict
        kicker="Quick check"
        question="A model was fit without ridge on two features with correlation 0.999. Its error on new points like its training data is close to the noise. Where will it go badly wrong?"
        options={[
          { label: "Points like its data" },
          { label: "Points where the two disagree", right: true },
          { label: "Points where both are large" },
          { label: "Nowhere: its error is fine" },
        ]}
        reveal={
          <>
            Where the features disagree. Points like the data, or with both
            features large, only ask about the total, which the data pin down. A
            point where the two part ways asks about the split, the direction
            the data barely saw: in the lab its error is{" "}
            {Math.round(TWINS.errorApart)} against {two(TWINS.errorLike)}.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Standardise the features first.</strong> The charge treats
          every weight alike, so a feature measured in millimetres, with a tiny
          weight, would barely be charged, and one in kilometres heavily.
          Rescale each to mean 0 and spread 1, and leave the intercept out of
          the charge.
        </li>
        <li>
          <strong>Choose λ on held-out data.</strong> The best λ depends on the
          noise and on how weak the weak directions are, and you know neither.
          Try values a factor of ten apart and keep the one with the lowest
          validation error.
        </li>
        <li>
          <strong>Merge the twins if you read the weights.</strong> Ridge
          steadies the split but can’t tell you which twin truly matters. If the
          weights themselves are the answer you want, average the near-copies
          into one feature, or drop one.
        </li>
        <li>
          <strong>Watch for the warning signs.</strong> Weights that flip sign
          between refits, or a smallest eigenvalue of XᵀX far below the largest,
          mean the data can’t pin them down.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Another model’s XᵀX has eigenvalues ${CHECK_VALUES[0]} and ${CHECK_VALUES[1]}. You add ridge with λ = ${CHECK_LAMBDA}. What happens to the wobble of its weights along each direction?`}
        options={[
          { label: "Both shrink about 5×" },
          { label: "Weak one shrinks 5×, strong one barely", right: true },
          { label: "Strong one shrinks 5×, weak one barely" },
          { label: "Neither: 2 is small next to 50" },
        ]}
        reveal={
          <>
            Along each direction ridge keeps e ÷ (e + λ) of least squares’
            answer, wobble included: {CHECK_VALUES[1]} ÷{" "}
            {CHECK_VALUES[1] + CHECK_LAMBDA} ={" "}
            {kept(CHECK_VALUES[1], CHECK_LAMBDA).toFixed(1)} along the weak one,
            a fifth, and {CHECK_VALUES[0]} ÷ {CHECK_VALUES[0] + CHECK_LAMBDA} ≈{" "}
            {kept(CHECK_VALUES[0], CHECK_LAMBDA).toFixed(2)} along the strong
            one. What matters is λ beside each eigenvalue on its own, and beside
            0.5, 2 is large.
          </>
        }
      />
    </Article>
  );
}
