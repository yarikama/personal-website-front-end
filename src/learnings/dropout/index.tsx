import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Kitchen, { type Show } from './Kitchen'
import Lab from './Lab'
import {
  CHECK_P,
  COOKS,
  FLIPPED,
  HIDDEN,
  KITCHEN_P,
  pct,
  resultOf,
  ROTA,
  ROTA_MEAN,
  ROTA_PLATES,
  scaleOf,
  testScaleOf,
  THINNED,
  thinnedOf,
  TRAIN_N,
  WORKED,
  WORKED_X,
  type LabP,
} from './model'
import Thinned from './Thinned'

const STEPS: Show[] = ['kitchen', 'habit', 'new', 'off', 'nights', 'shares', 'named']

const num = (value: number) => String(Number(value.toFixed(2)))
const listOf = (names: string[]) => `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

export default function Dropout() {
  const plain = resultOf(0)
  const half = resultOf(0.5)
  const thinned = thinnedOf()
  const off = COOKS.filter((_, i) => !ROTA[0][i])
  const twice = scaleOf(KITCHEN_P)
  const [p, setP] = useState<LabP>(0)

  return (
    <Article
      kicker="Vision and language · Learning to see"
      title="Dropout"
      promise="Switching off half of a network’s units at random while it learns sounds like sabotage. Why does it make the network better on data it has never seen?"
      takeaway={
        <>
          While training, dropout switches each unit off with chance p and scales the rest by 1/(1 − p), so no unit can
          lean on a partner and the network learns to act like the <em>average</em> of many thinned networks; at test
          time nothing is dropped.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 8, convolutional networks: the dropout layer, in training and at inference',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: '§5.6 Dropout',
          url: 'https://d2l.ai/chapter_multilayer-perceptrons/dropout.html',
        },
        {
          title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',
          by: 'Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever and Ruslan Salakhutdinov, JMLR 15, 2014',
          url: 'https://jmlr.org/papers/v15/srivastava14a.html',
        },
      ]}
    >
      <Predict
        question={`A small network learns to sort ${TRAIN_N} points into two kinds, and ${FLIPPED} of them carry the wrong label. Trained as usual, it gets all ${TRAIN_N} right, but only ${pct(plain.newRight)} of new points. You train it again, switching off a random half of its hidden units at every step. How does it do on new points?`}
        options={[
          { label: 'Worse: half its units are gone' },
          { label: 'About the same' },
          { label: 'A little better, about 80%' },
          { label: `Much better, about ${pct(half.newRight)}`, right: true },
        ]}
        reveal={
          <>
            Much better: {pct(half.newRight)}, though it now gets only {half.trainRight} of the {TRAIN_N} training
            points right. The {TRAIN_N - half.trainRight} it gives up all carry wrong labels. A kitchen shows why
            losing helpers can help.
          </>
        }
      />

      <h2>Six cooks</h2>

      <Steps
        readable
        say={[
          <>You run a kitchen: orders come in on the left, six cooks make them, and plates go out at the pass.</>,
          <>It’s the same short menu every night, so habits form: Eli always over-salts, and Fay always waters down whatever Eli sends.</>,
          <>Then a new dish comes in that Eli seasons just right, and Fay’s splash of water ruins it.</>,
          <>
            So on practice nights you toss a coin for each cook and send the losers home: tonight {listOf(off)} are
            off.
          </>,
          <>Nobody knows who will be in tonight, so nobody can lean on a partner, and each cook learns to make a whole dish alone.</>,
          <>
            Fewer cooks would mean fewer plates, so each cook who is in makes {twice} shares: {ROTA_PLATES[1]} plates one
            night, {ROTA_PLATES[2]} the next, {ROTA_MEAN} on average, as on a full night.
          </>,
          <>
            Orders are a network’s inputs, cooks its hidden units, and the pass its next layer: sending cooks home is{' '}
            <strong>dropout</strong> with p = ½, and on the big night everyone works, one share each.
          </>,
        ]}
      >
        {(step) => <Kitchen key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        Eli’s salt and Fay’s water only made sense together, and only on the dishes they practised. A network falls
        into the same trap: units that fix each other’s quirks on the training set, wrong labels included, a pattern
        no new example will share. This leaning is called co-adaptation, and it is one way a big network memorises
        instead of learning; why that costs you on new data is the subject of{' '}
        <Link to="/learnings/bias-variance">bias and variance</Link>. When any partner might be missing, a unit is only
        worth something if it is useful on its own.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: during training, each unit is kept with chance 1 − p, and what a kept unit passes on is multiplied
        by 1/(1 − p); a dropped unit passes on 0. On average a unit then passes on exactly its own output x:
      </p>
      <p className="text-center font-serif text-2xl text-ink">(1 − p) · x/(1 − p) + p · 0 = x</p>
      <p>
        So at test time you switch dropout off and change nothing else. This form is called inverted dropout, and it
        is what libraries do; p is the dropout rate. For a unit whose output is {WORKED_X}:
      </p>
      <Numbers
        items={WORKED.map((w) => ({
          label: `p = ${w.p}`,
          value: num(w.kept),
          note: `or 0 · ×${num(w.scale)} · mean ${w.mean}`,
        }))}
      />
      <p>
        The higher p, the rarer and the larger the kept value, and the noisier each training step; the average never
        moves.
      </p>
      <Clip
        src="dropout/keep-or-drop"
        label="Dropout for one unit with output x, written in words and then in symbols: keep with chance 1 minus p and pass on x over 1 minus p, or drop with chance p and pass on 0. The average is 1 minus p times x over 1 minus p, plus p times 0, which is x. With x equal to 3 and p equal to one half: one half times 6 plus one half times 0 equals 3."
        caption="The 1 − p that keeps a unit cancels the 1/(1 − p) that scales it, so the average is the unit’s own output, whatever p is."
      />

      <h2>Play with it</h2>
      <p>
        The network from the guess: two inputs (a point’s position), {HIDDEN} hidden units and one output saying which
        kind. Its {TRAIN_N} training points are drawn on the square, the {FLIPPED} with wrong labels ringed, and the
        dashed line is the true border between the kinds. Each setting trains it from the same start.
      </p>
      <Figure
        caption={
          <>
            Sage cells: where the network says “sage kind”, deeper where it is surer. Without dropout it carves pockets
            around all {plain.wrongFollowed} ringed points to get every training point right, and pays for them on new
            points. With p = 0.5 it lets {FLIPPED - half.wrongFollowed} of them go and follows the dashed line.
          </>
        }
      >
        <Lab p={p} onChange={setP} />
      </Figure>

      <h2>A crowd of thinned networks</h2>
      <p>
        Every training step draws a fresh coin for every unit, so each step trains a different thinned network, and
        all of them share one set of weights. With {HIDDEN} units there are 2<sup>{HIDDEN}</sup> of them. Each one alone is a weaker
        guesser, but averaging many models that err in different ways cancels much of their error. Running a hundred
        networks to classify each point would be slow; the whole network, with nothing dropped, gives almost the same
        answer in a single pass.
      </p>
      <Figure
        caption={
          <>
            The network trained with p = 0.5, seen {thinned.shown.length} times through a random mask (each keeping
            about half its units), then averaged over {THINNED} masks, then whole. One thinned network is right on{' '}
            {pct(thinned.oneRight)} of new points; the average and the whole network agree on {pct(thinned.agree)} of
            the square.
          </>
        }
      >
        <Thinned />
      </Figure>

      <Predict
        kicker="Quick check"
        question="You trained with dropout, then forgot to switch it off when testing (model.eval() in PyTorch). Your test score comes out lower than expected, and a little different every run. Why?"
        options={[
          { label: 'Each run tests one random thinned network', right: true },
          { label: 'Kept units get scaled twice' },
          { label: 'The weights keep changing as it tests' },
          { label: 'Dropout made the network weaker overall' },
        ]}
        reveal={
          <>
            Each forward pass still draws a fresh mask, so you are scoring a thinned network, a different one every
            run: {pct(thinned.oneRight)} here on average, against {pct(thinned.whole.right)} for the whole network.
            Nothing is scaled twice (the scaling switches off along with the dropping), and testing changes no weights.
          </>
        }
      />

      <h2>Using it</h2>
      <ul>
        <li>
          <strong>Put it where the weights are.</strong> In a{' '}
          <Link to="/learnings/convolutional-networks">convolutional network</Link> most weights sit in the fully
          connected layers at the end, so that is where AlexNet put dropout, with p = 0.5 before each of its two big
          ones.
        </li>
        <li>
          <strong>Start at 0.5 for hidden units, lower for inputs.</strong> The paper dropped about a fifth of the
          input units. A p near 1 leaves too few units in to learn even the real pattern.
        </li>
        <li>
          <strong>Switch it off to test.</strong> Training and testing behave differently, so set the mode before you
          evaluate: model.train() and model.eval() in PyTorch.
        </li>
        <li>
          <strong>Combine it with other cures.</strong> An L2 penalty on the weights (
          <Link to="/learnings/ridge-regression">ridge regression</Link> in a network’s clothes), more data, and data
          augmentation, which flips, crops and recolours training images so the network sees more variety than the
          dataset holds.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`An old library drops units with p = ${CHECK_P} during training but doesn’t scale the ones it keeps. At test time every unit is in. What should you do to each unit’s output at test time, so the next layer gets what it trained on?`}
        options={[
          { label: 'Nothing' },
          { label: `Multiply by ${testScaleOf(CHECK_P)}`, right: true },
          { label: `Multiply by ${scaleOf(CHECK_P).toFixed(2)}` },
          { label: `Multiply by ${CHECK_P}` },
        ]}
        reveal={
          <>
            Multiply by {testScaleOf(CHECK_P)}. In training a unit passed on x seven times in ten and 0 otherwise,{' '}
            {testScaleOf(CHECK_P)}x on average; with every unit in and nothing scaled, it would hand the next layer{' '}
            {scaleOf(CHECK_P).toFixed(2)} times what it learned to expect. Scaling at test time instead of in training
            is how the original paper did it; both keep the average the same.
          </>
        }
      />
    </Article>
  )
}
