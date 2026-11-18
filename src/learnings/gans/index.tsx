import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  CHECK_FAKES,
  CHECK_MOST,
  COINS,
  EARLY,
  earlyNonSaturating,
  earlyOriginal,
  factorOf,
  firstReachNew,
  FOOLED_AT,
  fooled,
  LAB_ROUNDS,
  labRun,
  NON_SATURATING,
  one,
  ONE_KIND,
  ONES,
  ORIGINAL,
  pct,
  roundsWithoutNew,
  SAMPLES,
  STORY,
  storyEnd,
  times,
  two,
  valueAtEven,
  valueOf,
  WORKED,
} from './model'
import Story, { type Show } from './Story'

const STEPS: Show[] = ['coins', 'cashier', 'nudge', 'turns', 'end', 'named']

// Worked out once from the runs the page tells
const FIRST_FOOLED = fooled(STORY[0])
const END_VALUE = valueOf(storyEnd.cashier, ONE_KIND, storyEnd.fakes)
const VARIED = labRun('Two kinds', NON_SATURATING, 'Varied')
const BUNCHED_FOR = roundsWithoutNew(VARIED)
const SPREAD_REACH = firstReachNew(VARIED)
const ALIKE_END = labRun('Two kinds', NON_SATURATING, 'All alike')[LAB_ROUNDS - 1]

export default function Gans() {
  return (
    <Article
      kicker="Vision and language · Generating images"
      title="Generative adversarial networks"
      promise="Nobody can write down a loss for “looks like a real photo”. So how does a network learn to make new images, and why does that training so often stall, or end up making the same few things?"
      takeaway={
        <>
          A GAN trains a generator against a discriminator, a classifier learning to tell fakes from real data. The
          generator learns only from the discriminator’s slope, so it pushes up log D, whose pull stays strong while it
          is losing; and since each fake is judged alone, nothing guards against <em>mode collapse</em>.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 15, Generative AI for images: why a pixel loss blurs, generator and discriminator, the training algorithm, DCGAN and conditional GANs',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Section 20.1, Generative Adversarial Networks',
          url: 'https://d2l.ai/chapter_generative-adversarial-networks/gan.html',
        },
        {
          title: 'Generative Adversarial Nets',
          by: 'Ian Goodfellow, Jean Pouget-Abadie, Mehdi Mirza, Bing Xu, David Warde-Farley, Sherjil Ozair, Aaron Courville and Yoshua Bengio, NeurIPS 2014',
          part: 'The minimax game, training in turns, the best discriminator, and maximizing log D(G(z)) instead',
          url: 'https://papers.nips.cc/paper/5423-generative-adversarial-nets',
        },
        {
          title: 'NIPS 2016 Tutorial: Generative Adversarial Networks',
          by: 'Ian Goodfellow, 2016',
          part: 'Mode collapse, and why it comes from the game',
          url: 'https://arxiv.org/abs/1701.00160',
        },
      ]}
    >
      <Predict
        question="A forger and a cashier train against each other: the cashier learns to tell fake coins from real ones, the forger learns to fool it. If the forger ends up perfect, what chance of being real does the cashier give each coin?"
        options={[{ label: '0%' }, { label: '50%', right: true }, { label: '100%' }, { label: 'Depends on the coin' }]}
        reveal={
          <>
            One half. Once the fakes are spread exactly like the real coins, a coin of any weight is as likely to be one
            as the other, so the cashier’s best answer is a shrug. Saying 100% would be wrong about every fake, which is
            half the coins it sees.
          </>
        }
      />

      <h2>A forger and a cashier</h2>

      <Steps
        readable
        say={[
          <>
            Real coins weigh about 8 grams (the sage dots). You’re a forger, and your first batch of {COINS} weighs
            about 2.5 (the rings).
          </>,
          <>
            A cashier weighs coins of both kinds and learns a curve: the chance that a coin of each weight is real. Yours
            get {pct(FIRST_FOOLED)} on average.
          </>,
          <>You never get to see a real coin. All you have is the curve, so you nudge each coin toward where it climbs.</>,
          <>Then the cashier learns again from your new coins, and its curve moves after them. You take turns.</>,
          <>
            By round {FOOLED_AT} your coins weigh what real ones do, and where they sit the curve is at one half: the
            cashier can only guess.
          </>,
          <>
            The forger is a <strong>generator</strong> G, turning random noise z into a sample; the cashier is a{' '}
            <strong>discriminator</strong> D, a classifier. With images, each coin is a picture. This game is a{' '}
            <strong>generative adversarial network</strong>, a GAN.
          </>,
        ]}
      >
        {(step) => <Story key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        Why not a plainer loss? Ask a network for “a bus” and grade it pixel by pixel against real buses, and it learns
        their average, a blur. The discriminator is a loss that is learned: it asks only whether a picture looks real,
        and it gets stricter as the generator improves. The generator is never handed a picture to copy; all it learns
        arrives through the discriminator’s slope. For images it is a stack of up-sampling convolutions (the transposed
        ones from <Link to="/learnings/semantic-segmentation">semantic segmentation</Link>) that grows a noise vector
        into a picture. On the line, each fake is G(z) for its own z, and the forger can move each one where it likes,
        as a flexible enough generator could.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: score the cashier by the log of the chance it gave real coins of being real, plus the log of the
        chance it gave fakes of being fake. That is the{' '}
        <Link to="/learnings/logistic-regression">cross-entropy</Link> of a real-or-fake classifier, turned upside down.
        The discriminator climbs it. The generator, which can only change the second part, pushes it down.
      </p>
      <Clip
        src="gans/game-value"
        label="In words, the average log of the chance real coins are called real, plus the average log of the chance fakes are called fake, becomes V equals the expectation over x of log D of x plus the expectation over z of log of 1 minus D of G of z. The discriminator pushes V up; the generator only moves the second part and pushes it down: min over G, max over D, of V. At the end D is one half on every coin, so V is log one half plus log one half, minus log 4, about minus 1.39."
        caption="One score, two players: the discriminator wants it high, the generator low. When neither can do better, the discriminator says one half everywhere."
      />
      <p>
        The story’s run ends with V at {two(END_VALUE)}, next to the {two(valueAtEven)} of a cashier that can only
        guess.
      </p>

      <h2>When the cashier wins</h2>
      <p>
        Early on the cashier wins easily, and that is a problem. Pushing down log(1 − D) moves a fake in proportion to D
        itself, so a coin the cashier calls 1% real barely moves: the generator learns least when it is worst. The
        original paper’s fix is to have the generator push up log D instead. The aim is the same, but the pull is 1 − D,
        strongest when the fake is worst. It is called the <strong>non-saturating</strong> loss.
      </p>
      <Clip
        src="gans/saturation"
        label="With D the sigmoid of the score s, the slope of log of 1 minus D in s is minus D; the slope of minus log D is minus 1 minus D. For a fake the discriminator catches, D is 0.1, so the original gives minus 0.1 and the non-saturating loss minus 0.9: nine times the push."
        caption="Both losses push a fake along the discriminator’s slope; they differ only in the factor in front."
      />
      <Numbers
        items={WORKED.map((d) => ({
          label: `D says ${pct(d)}`,
          value: times(factorOf(NON_SATURATING, d) / factorOf(ORIGINAL, d)),
          note: `${two(factorOf(ORIGINAL, d))} vs ${two(factorOf(NON_SATURATING, d))}`,
        }))}
      />
      <p>
        At one half the two losses agree. A fake caught at 10% gets nine times the pull from −log D; one caught at 1%,
        99 times. Play the game with each, and watch the arrows.
      </p>

      <Figure
        readable
        caption={
          <>
            Sage dots are real coins; each ring is one fake in a lane of its own, with an arrow for its next nudge (drawn
            2.5 times as long). The ink curve is the cashier’s chance real (a logistic regression on the weight’s first four powers, so it can rise and fall), the dashed line one half. With log(1 − D),{' '}
            {EARLY} rounds move the fakes {one(earlyOriginal())} g; with −log D, {one(earlyNonSaturating())} g.
          </>
        }
      >
        <Lab />
      </Figure>

      <Predict
        kicker="Quick check"
        question="Under the original loss, log(1 − D), four fakes sit on the same slope of the cashier’s score. It gives them these chances of being real. Which one moves furthest?"
        options={CHECK_FAKES.map((f) => ({ label: pct(f.chance), right: f === CHECK_MOST }))}
        reveal={
          <>
            The one at {pct(CHECK_MOST.chance)}. The original loss moves a fake in proportion to D:{' '}
            {CHECK_FAKES.map((f) => two(factorOf(ORIGINAL, f.chance))).join(', ')}. It polishes coins that already pass
            and leaves the worst where they are; −log D turns that round (
            {CHECK_FAKES.map((f) => two(factorOf(NON_SATURATING, f.chance))).join(', ')}).
          </>
        }
      />

      <h2>Mode collapse</h2>
      <p>
        In the game above, pick two kinds of real coin, old ones near 4 g and new ones near 9 g. Even from a varied
        batch, the fakes reach the old kind first and bunch up there: for {BUNCHED_FOR} rounds not one weighs like the
        new kind, and only by round {SPREAD_REACH} have a quarter of them peeled off. Start them all alike and they
        never leave. The cashier gives them only {pct(fooled(ALIKE_END))}, but coins of one weight all get the same
        nudge, and at the bottom of the curve’s dip there is no slope to follow. No fake ever weighs 9 g.
      </p>
      <p>
        This is <strong>mode collapse</strong>: the generator makes only some of the kinds of thing in the data. The
        discriminator judges each sample on its own, so nothing in the generator’s loss asks for variety, and a
        generator that sends many noise values to one picture gets one nudge for all of them. In big GANs the bunch
        often hops instead, from one kind to the next as the discriminator catches up, never covering them all at once.
      </p>

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Push up log D.</strong> The non-saturating loss keeps the generator learning while it is losing, which
          is how every run starts.
        </li>
        <li>
          <strong>Keep the two in step.</strong> A discriminator far ahead leaves the generator no slope; a generator
          trained long against a stale one piles onto whatever it likes best. Alternate, a step or a few of D for each
          of G.
        </li>
        <li>
          <strong>Judge by the samples.</strong> The two losses tug against each other instead of falling, so no number says
          when to stop. Look at what comes out, and count how many kinds.
        </li>
        <li>
          <strong>Say what to make.</strong> A conditional GAN feeds a class or a sentence to both networks: the label
          picks what to draw, the noise which version of it.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A GAN trained on handwritten digits 0 to 9 draws crisp digits its discriminator often takes for real. Of ${SAMPLES.toLocaleString('en-US')} samples, ${ONES} are 1s. Which explains it?`}
        options={[
          { label: 'The generator’s gradient vanished' },
          { label: 'Each sample is judged on its own', right: true },
          { label: 'The discriminator can’t see digits' },
          { label: 'The noise z has too few numbers' },
        ]}
        reveal={
          <>
            Mode collapse. The discriminator scores one image at a time, and a crisp 1 passes as well as a crisp 8, so
            nothing rewards the generator for drawing the other nine digits. A vanished gradient would leave the digits
            poor, not crisp; a discriminator blind to digits couldn’t have taught crisp ones; and even a short z has
            endless values to spread over.
          </>
        }
      />
    </Article>
  )
}
