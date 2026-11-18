import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Lab from './Lab'
import {
  CLASSES,
  CLIP_MAX_SCALE,
  CLIP_START_TAU,
  COLD,
  COLD_STEP,
  DUPLICATE_FLOOR,
  EVEN_LOSS,
  HOUSE,
  KEYWORDS,
  N,
  NEW_PICTURES,
  PAPER,
  pct,
  perfectChance,
  perfectLoss,
  STORY_AFTER,
  STORY_BEFORE,
  thousands,
  two,
  WORKED,
  WRONG_PER_QUIZ,
  zeroShot,
} from './model'
import Postcards, { type Show } from './Postcards'
import ZeroShot from './ZeroShot'

const STEPS: Show[] = ['cards', 'arrows', 'grid', 'diagonal', 'train', 'named']
const PICTURE_NAMES = NEW_PICTURES.map((p) => p.name)

export default function ClipPage() {
  const [pictureName, setPictureName] = useState(PICTURE_NAMES[0])
  const picture = NEW_PICTURES.find((p) => p.name === pictureName) ?? NEW_PICTURES[0]
  const shot = zeroShot(picture)

  return (
    <Article
      kicker="Vision and language · Images meet text"
      title="CLIP"
      promise="A model that has only ever seen pictures and the captions people wrote under them can sort photos into a thousand kinds of object without one labelled example. How does it learn that, and how do you ask it?"
      takeaway={
        <>
          CLIP scores every picture in a batch against every caption, and a <em>contrastive</em> loss, sharpened by a small
          temperature, makes each real pair win both its row and its column; after that, any class you can write as a
          caption is a classifier.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lectures 12 and 13: the CLIP model, its two encoders and its symmetric contrastive loss',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Section 11.9, “Large-Scale Pretraining with Transformers” (CLIP in 11.9.6)',
          url: 'https://d2l.ai/chapter_attention-mechanisms-and-transformers/large-pretraining-transformers.html',
        },
        {
          title: 'Learning Transferable Visual Models From Natural Language Supervision',
          by: 'Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, Gretchen Krueger and Ilya Sutskever, ICML 2021',
          part: 'Sections 2.3 (the contrastive objective, its pseudocode and its 4× gain), 2.5 (temperature and batch size), 3.1.3 (76.2% zero-shot on ImageNet) and 3.1.4 (prompt engineering and ensembling)',
          url: 'https://arxiv.org/abs/2103.00020',
        },
      ]}
    >
      <Predict
        question={`A model learns from ${PAPER.pairs / 1_000_000} million pictures off the web and the captions under them, and nothing else. Then it takes ImageNet’s test: name the object in a photo, out of ${thousands(PAPER.imagenetClasses)} kinds, never having seen one labelled example. How often is it right?`}
        options={[
          { label: 'About 0.1%, chance' },
          { label: 'About 12%' },
          { label: 'About 40%' },
          { label: 'About 76%', right: true },
        ]}
        reveal={
          <>
            {PAPER.zeroShot}%, as good as a ResNet-50 trained on all {thousands(PAPER.imagenetLabelled)} labelled ImageNet
            photos; the best result like it before was {PAPER.priorZeroShot}%. The model never learned the names of
            classes. It learned which caption goes with which picture, and you ask it with captions.
          </>
        }
      />

      <h2>Putting the postcards back together</h2>

      <Steps
        readable
        say={[
          <>
            A shoebox holds {N} postcards, each a picture with a caption on the back, but they’ve been torn in two and the
            slips shuffled.
          </>,
          <>
            To match them, you give every picture an arrow and every caption an arrow, so that a picture and its caption
            should point the same way.
          </>,
          <>
            You score each picture against each caption by how well their arrows agree, 1 for the same way and −1 for
            opposite: {N * N} scores in a grid.
          </>,
          <>
            Only the {N} squares on the diagonal are real pairs, and the other {N * N - N} are lessons too: right now the
            house’s own caption isn’t even its best match.
          </>,
          <>
            Read each row as a quiz (which caption is this picture’s?) and each column too, and turn the arrows bit by bit
            until every right answer wins: from {pct(STORY_BEFORE[HOUSE])} at best to at least{' '}
            {pct(Math.min(...STORY_AFTER))}.
          </>,
          <>
            The arrows are <strong>embeddings</strong> from an <strong>image encoder</strong> and a{' '}
            <strong>text encoder</strong>, the grid is the <strong>similarity matrix</strong>, the quizzes are the{' '}
            <strong>contrastive loss</strong>: with {PAPER.pairs / 1_000_000} million web postcards, this is{' '}
            <strong>CLIP</strong>.
          </>,
        ]}
      >
        {(step) => <Postcards key={STEPS[step]} show={STEPS[step]} />}
      </Steps>

      <p>
        Nobody labelled anything: the web wrote the captions. In CLIP the image encoder is a{' '}
        <Link to="/learnings/vision-transformer">vision transformer</Link> or a ResNet and the text encoder a Transformer,
        each followed by a matrix that brings its output to a shared length, then scaled to length 1, so a score is the
        cosine of the angle between two arrows. In the toy the arrows themselves are learned; in CLIP the encoders’ weights
        are, and the arrows follow.
      </p>
      <p>
        Why a quiz, rather than writing the caption? CLIP’s authors tried that first, and predicting the caption word by
        word learned three times slower than predicting just which words it contains; swapping that for the quiz made it{' '}
        {PAPER.contrastiveSpeedup} times faster again. Picking the right caption out of a batch is easier than spelling it.
        It’s a cousin of <Link to="/learnings/skip-gram">skip-gram’s negative sampling</Link>, except that the wrong
        answers aren’t drawn at random: they’re the other pairs already in the batch.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: divide every score by a temperature τ, turn each row into chances with a softmax, and charge −ln of the
        chance on the row’s own caption, the <Link to="/learnings/logistic-regression">cross-entropy</Link>. Do the same
        down each column, then average. With P the chances along the rows and Q down the columns, for N pairs:
      </p>
      <p className="text-center font-serif text-2xl">
        L = <sup>1</sup>⁄<sub>2N</sub> Σ<sub>k</sub> ( −ln P<sub>kk</sub> − ln Q<sub>kk</sub> )
      </p>
      <p>This symmetric loss is also called InfoNCE. At the start of the story, with τ = 1 to keep the numbers small:</p>
      <Clip
        src="clip/contrastive-loss"
        label={`The house picture's row of scores against the captions sky, house, oak and lake is ${WORKED.row.scores.map(two).join(', ')}. Raised to e to the score over tau, with tau 1, they are 0.77, 2.03, 0.40 and 2.27; the house caption's share of the sum is ${two(WORKED.row.chance)}, so the row loss is minus ln ${two(WORKED.row.chance)}, ${two(WORKED.row.loss)}. The caption's column gives ${two(WORKED.column.loss)} the same way. The loss is one over 2N times the sum over k of minus ln P k k minus ln Q k k: ${two(WORKED.total)} for all four pairs.`}
        caption="One row is one quiz: the right caption’s share of the row, and minus its log. Every row and every column take the quiz."
      />
      <Numbers
        items={[
          { label: 'House’s row', value: two(WORKED.row.loss), note: `${pct(WORKED.row.chance)} on its caption` },
          { label: '“our house”', value: two(WORKED.column.loss), note: `${pct(WORKED.column.chance)} on its picture` },
          { label: 'All four', value: two(WORKED.total), note: `even guess: ${two(EVEN_LOSS)}` },
        ]}
      />
      <p>
        The house row loses its quiz: {KEYWORDS[WORKED.rowWinner]} takes {pct(WORKED.rowWinnerChance)}. And the whole
        batch scores worse than guessing evenly, which would give each right answer 1 in {N} and a loss of ln {N}.
      </p>

      <Predict
        kicker="Quick check"
        question="Suppose the four pairs are placed perfectly: each picture’s arrow right on its own caption’s, the pairs a quarter turn apart. With τ = 1, what chance does a picture give its own caption?"
        options={[{ label: '100%' }, { label: '90%' }, { label: pct(perfectChance(1)), right: true }, { label: '25%' }]}
        reveal={
          <>
            {pct(perfectChance(1))}. A row’s scores are 1, 0, −1 and 0, and e / (e + 1 + 1/e + 1) ≈{' '}
            {two(perfectChance(1))}. Arrows only agree from −1 to 1, too narrow a range to make anyone sure, so the loss
            can’t go below {two(perfectLoss(1))}. Dividing by a small τ spreads the scores: at 0.3 the same arrows give{' '}
            {pct(perfectChance(0.3))}. CLIP learns τ along with everything else, starting at {CLIP_START_TAU} and capped
            so that 1/τ never passes {CLIP_MAX_SCALE}.
          </>
        }
      />
      <p>
        It is the same knob as the temperature in <Link to="/learnings/sampling-decoding">sampling words</Link>: below 1
        it sharpens the chances.
      </p>

      <h2>Train it yourself</h2>
      <Figure
        readable
        caption={
          <>
            Solid arrows are pictures, dashed are captions; in each little picture, solid ink is a full pixel. A cell holds
            how alike a picture and a caption are, more ink for more alike, and the sage squares are the real pairs. The
            numbers beside each row and under each column are that quiz’s loss. At τ = 1 the loss stalls at{' '}
            {two(perfectLoss(1))} with every pair lined up; at 0.07 it is {two(COLD.loss)} by step {COLD_STEP} with one
            pair still {Math.round(COLD.widest)}° apart, since a cold temperature only asks each right answer to be
            clearly the closest.
          </>
        }
      >
        <Lab />
      </Figure>

      <h2>Classes nobody trained</h2>
      <p>
        To sort a new picture, write one caption per class (“a photo of a house”, “a photo of a boat”), run each through
        the text encoder, and pick the prompt whose arrow is closest to the picture’s. Nothing is retrained, and the
        classes are just text. This is <strong>zero-shot classification</strong>, and with{' '}
        {thousands(PAPER.imagenetClasses)} prompts it is how CLIP got its {PAPER.zeroShot}% on ImageNet.
      </p>
      <Figure
        readable
        caption={
          <>
            The new picture’s solid arrow among the dashed arrows of four prompts. The toy places them by hand where
            trained encoders would put them: a new picture near the old one it looks like, a prompt near the caption it
            means. The bars are the chances, and the closest prompt, in sage, is the answer: {CLASSES[shot.pick]}, with{' '}
            {pct(shot.chances[shot.pick])}.
          </>
        }
      >
        <ZeroShot picture={picture} />
        <div className="mt-5">
          <Choice label="New picture" options={PICTURE_NAMES} value={pictureName} onChange={setPictureName} />
        </div>
      </Figure>

      <Predict
        kicker="Quick check"
        question="Your CLIP sorter knows sun, house, tree and boat. Now you need kites too. What do you have to do?"
        options={[
          { label: 'Retrain the image encoder on kites' },
          { label: 'Retrain the text encoder' },
          { label: 'Retrain both on new postcards' },
          { label: 'Add “a photo of a kite”', right: true },
        ]}
        reveal={
          <>
            Add the prompt. A class is only an arrow from the text encoder, so a new class is one more sentence to encode.
            It works as far as the web’s captions taught the encoders what kites look like; a class the web rarely writes
            about gets a poor arrow.
          </>
        }
      />

      <h2>Making it work</h2>
      <ul>
        <li>
          <strong>Write prompts like captions.</strong> People caption photos in sentences, so “a photo of a{' '}
          {'{label}'}.” beat the bare label by {PAPER.promptGain} points on ImageNet. A word alone can mean two things (a
          crane is a bird or a machine), and “a photo of a boxer, a type of pet” says which. Small changes in wording move
          the result, so the prompt is worth testing.
        </li>
        <li>
          <strong>Average many prompts.</strong> CLIP averages the arrows of {PAPER.ensemblePrompts} wordings per class
          (“a photo of a big …”, “a photo of a small …”), for {PAPER.ensembleGain} more points.
        </li>
        <li>
          <strong>Use a big batch.</strong> A quiz is only as hard as its wrong answers: CLIP’s batches hold{' '}
          {thousands(PAPER.batch)} pairs, so each picture’s quiz has {thousands(WRONG_PER_QUIZ)} wrong captions.
        </li>
      </ul>
      <p>
        CLIP’s image encoder outlives the quiz: it is the eye that{' '}
        <Link to="/learnings/vision-language-models">vision-language models</Link> plug into a language model.
      </p>

      <Predict
        kicker="Check yourself"
        question="A batch of web postcards happens to hold two different photos whose captions are word for word the same: “my dog”. What does the loss do with those two rows?"
        options={[
          { label: 'Nothing special: both can reach zero loss' },
          { label: 'Each can give its own caption at most 50%', right: true },
          { label: 'It skips the duplicates' },
          { label: 'It learns to tell the two dogs apart' },
        ]}
        reveal={
          <>
            At most 50%. The same text gets the same arrow, so in each photo’s row the two captions score alike and get
            the same chance. The right one can have at most half, a loss of at least ln 2 = {two(DUPLICATE_FLOOR)}, and
            the loss keeps pushing each photo away from a caption that fits it perfectly. In web data such clashes are
            rare next to the thousands of truly wrong answers in each quiz.
          </>
        }
      />
    </Article>
  )
}
