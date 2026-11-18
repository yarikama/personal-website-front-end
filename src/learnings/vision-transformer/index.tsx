import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Cutting, { type Show } from './Cutting'
import Data from './Data'
import {
  ACROSS,
  CARDS,
  DOOR,
  MODELS,
  NO_POSITIONS,
  patchCount,
  patchNumbers,
  PATCHES,
  POSITIONS,
  scoreCount,
  SETS,
  SIDE,
  SIDES,
  STRIPS,
  TILE,
  tokenCount,
  two,
  WORKED,
} from './model'
import Patches from './Patches'

const STEPS: Show[] = ['picture', 'cut', 'unroll', 'ask', 'place', 'blank', 'named']
const [B16, L16] = MODELS
const big = (n: number) => n.toLocaleString('en-US')
const door = CARDS[DOOR].map(two)

export default function VisionTransformer() {
  const [side, setSide] = useState<(typeof SIDES)[number]>(224)
  const [patch, setPatch] = useState<(typeof PATCHES)[number]>(16)

  return (
    <Article
      kicker="Vision and language · Images meet text"
      title="The Vision Transformer"
      promise="A Transformer reads a sentence as a line of word tokens. How do you hand it a photo instead, and why did it take hundreds of millions of photos before it beat a convolutional network?"
      takeaway={
        <>
          A Vision Transformer cuts a picture into <em>patches</em>, turns each into a token with one shared matrix, adds
          a place vector and a [class] token, and runs a plain Transformer encoder; it knows nothing about neighbouring
          pixels until data teaches it, so it needs far more images than a convolutional network.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Pretrained Transformers and Vision Transformers (lectures 12 and 13)',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Section 11.8, “Transformers for Vision”',
          url: 'https://d2l.ai/chapter_attention-mechanisms-and-transformers/vision-transformer.html',
        },
        {
          title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
          by: 'Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Dirk Weissenborn, Xiaohua Zhai, Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer, Georg Heigold, Sylvain Gelly, Jakob Uszkoreit and Neil Houlsby, ICLR, 2021',
          part: 'Section 3 (patches, the class token, inductive bias, fine-tuning at higher resolution), 4.3 (pre-training data), 4.5 (what the position embeddings learn), Table 5 and Appendix D.4',
          url: 'https://arxiv.org/abs/2010.11929',
        },
      ]}
    >
      <Predict
        question="The paper that brought Transformers to images is called “An Image is Worth 16x16 Words”. It cuts a 224 × 224 photo into squares 16 pixels on a side, and each square becomes one token. How many squares does the Transformer read?"
        options={[
          { label: '256, that is 16 × 16' },
          { label: `${patchCount(224, 16)}`, right: true },
          { label: `${big(patchNumbers(16))}` },
          { label: `${big(224 * 224)}, one per pixel` },
        ]}
        reveal={
          <>
            {patchCount(224, 16)}. The 16 × 16 is the size of each square, not how many there are: 224 / 16 = 14 squares
            fit across and 14 down, so 14 × 14 = {patchCount(224, 16)}. Each one holds 16 × 16 pixels in three colours,{' '}
            {patchNumbers(16)} numbers, which is where the {patchNumbers(16)} comes from.
          </>
        }
      />

      <h2>A picture, cut into words</h2>

      <Steps
        readable
        say={[
          <>
            Here is a small picture, {SIDE} squares by {SIDE}, each square a number from 0 to 1, drawn more solid the
            higher it is.
          </>,
          <>
            You cut it into {ACROSS} × {ACROSS} tiles, {TILE} squares on a side, and number them in reading order.
          </>,
          <>You unroll each tile into one row of its {TILE * TILE} numbers, top line first, the way you would read it.</>,
          <>
            Then you ask every row the same three questions, how much ink in all, in its top half, in its left half, and
            write the answers on a card: the door, tile {DOOR + 1}, gets {door.join(', ')}.
          </>,
          <>A card says nothing about where its tile was, so you add the tile’s number to it.</>,
          <>
            One more card goes on top, blank: it has no tile, and its job is to listen to the other {STRIPS.length} and
            then say what the picture is.
          </>,
          <>
            The rows are patches, the three questions a learned matrix, each card a token, its number a position
            embedding, and the blank card the [class] token; all ten go into a Transformer encoder.
          </>,
        ]}
      >
        {(step) => <Cutting key={step} show={STEPS[step]} />}
      </Steps>

      <p>
        That is the <strong>Vision Transformer</strong>, or ViT (Dosovitskiy and others, 2020). Once the cards are
        written, nothing in it is made for images: it is a stack of the{' '}
        <Link to="/learnings/transformer-block">Transformer blocks</Link> a text model uses, in which{' '}
        <Link to="/learnings/self-attention">self-attention</Link> lets every patch take what it needs from every other
        patch. A real ViT asks not three questions of each patch but hundreds, and learns them in training.
      </p>
      <p>
        The place numbers matter because attention alone can’t tell a house from its tiles shuffled. In ViT they are a
        learned table, one vector for each place; taking them away cost the paper’s model about{' '}
        {Math.round(POSITIONS - NO_POSITIONS)} points in a few-shot test ({NO_POSITIONS}% against {POSITIONS}%). The
        blank card comes from <Link to="/learnings/pretraining-objectives">BERT</Link>’s [CLS] token. Having no patch of
        its own, it ends up holding only what it gathered from the others, and a small classifier reads the label off
        it.
      </p>

      <h2>The one line of math</h2>
      <p>
        In words: the tokens are the patches across times the patches down, and each patch, unrolled, holds its side
        squared times three colours of numbers before one shared matrix turns it into a token.
      </p>
      <p className="text-center font-serif text-xl">N = (H / P) × (W / P), each patch P × P × 3 numbers</p>
      <Numbers
        items={WORKED.map(({ side: s, patch: p }) => ({
          label: `${s} px, ${p} px patches`,
          value: big(patchCount(s, p)),
          note: `${s / p} × ${s / p}`,
        }))}
      />
      <Clip
        src="vision-transformer/patch-tokens"
        label="A 224 by 224 picture in three colours. N equals 224 over 16, squared, equals 14 squared, equals 196 patches. Each patch is 16 times 16 times 3, 768 numbers, which one matrix E, the same for every patch, maps to D numbers. The encoder's input z zero is the class token, then x p 1 times E, x p 2 times E, and so on to x p 196 times E, plus the position embeddings: 196 plus 1 is 197 tokens of D numbers each."
        caption="The whole front end of ViT in one line: one extra token, the patches through one shared matrix, a place vector added to each. The 16 in ViT-B/16 is the patch side."
      />
      <p>
        Bigger pictures make more tokens, and attention scores every pair of them (the{' '}
        <Link to="/learnings/transformer-block">price</Link> every Transformer pays). At 224 pixels that is{' '}
        {big(scoreCount(224, 16))} scores per head; at 384 pixels, {big(scoreCount(384, 16))}, about{' '}
        {Math.round(scoreCount(384, 16) / scoreCount(224, 16))} times as many for a picture not even twice as wide.
      </p>

      <Figure
        caption={
          <>
            The grid is drawn over a faint house to stand for any square photo; sage marks one patch. Halve the patch and
            the tokens grow fourfold and the scores about sixteenfold; double the picture and the same happens. The
            patch size sets how many numbers go into the shared matrix, not how many times it is used.
          </>
        }
      >
        <Patches side={side} patch={patch} />
        <Controls>
          <Choice label="Picture side" options={SIDES} value={side} onChange={setSide} format={(s) => `${s} px`} />
          <Choice label="Patch side" options={PATCHES} value={patch} onChange={setPatch} format={(p) => `${p} px`} />
        </Controls>
      </Figure>

      <h2>What a convolution knew for free</h2>
      <p>
        A <Link to="/learnings/convolutional-networks">convolutional layer</Link> starts out with two beliefs about
        pictures built in: nearby pixels belong together, so each filter looks at a small window, and what matters in
        one spot matters everywhere, so the same filter slides over the whole image. ViT starts with neither. Its
        attention can join a patch in one corner to a patch in the other from the first layer, and its table of place
        vectors begins as random numbers, so even which patches are neighbours has to be learned from examples.
      </p>
      <p>
        It does learn it: after training, the place vectors of nearby patches come out alike, rows and columns
        visible, and some heads in the early layers keep to small neighbourhoods much as a convolution would. But
        learning it takes data. Trained on ImageNet’s 1.3 million images, ViT finished a few points behind convolutional
        networks of its size, and its larger version did worse than its smaller one.
      </p>

      <Figure
        caption={
          <>
            ImageNet accuracy after pre-training on sets of growing size, then fine-tuning. Ink: {B16.name}; sage, the
            one to watch: {L16.name}, with {L16.weights} weights. On {SETS[0].name} alone the larger model is behind,{' '}
            {L16.accuracy[0]}% against {B16.accuracy[0]}%; with {SETS[2].images} images it is ahead, {L16.accuracy[2]}%
            against {B16.accuracy[2]}%. Numbers from the paper’s Table 5.
          </>
        }
      >
        <Data />
      </Figure>

      <p>
        Pre-trained on {SETS[2].images} images from Google’s in-house JFT-300M set, the same models matched or beat the
        best convolutional networks. In the paper’s words, “large scale training trumps inductive bias”: an{' '}
        <strong>inductive bias</strong> is an assumption built into a model before it sees any data, and with enough
        data ViT can do without one.
      </p>

      <Predict
        kicker="Quick check"
        question="You have 20,000 labelled skin photos and no pre-trained model of any kind; everything must be trained from scratch. Which is the safer bet?"
        options={[
          { label: 'A ViT: attention sees the whole image from the first layer' },
          { label: 'A convolutional network: it starts out assuming nearby pixels go together', right: true },
          { label: 'A ViT with smaller patches, so it has more tokens to learn from' },
          { label: 'Either: with the same number of weights they learn the same things' },
        ]}
        reveal={
          <>
            The convolutional network. Its windows and shared filters are right about photos before it sees any, so
            20,000 examples go into learning skin, not into learning what a neighbour is. A ViT would have to discover
            locality from those same few images, and smaller patches only give it more tokens to relate, not more
            pictures.
          </>
        }
      />

      <h2>Using one</h2>
      <ul>
        <li>
          <strong>Start from a pre-trained ViT.</strong> Unless you have tens of millions of images, take one trained on
          a huge set and fine-tune it; the ViTs inside <Link to="/learnings/clip">CLIP</Link> learned from 400 million
          captioned pictures.
        </li>
        <li>
          <strong>Choose the patch for your budget.</strong> Halving it quadruples the tokens and multiplies the
          attention by about sixteen; 14 and 16 pixels are the usual sizes.
        </li>
        <li>
          <strong>Short of data, keep a convolution.</strong> Use a convolutional network, or the paper’s hybrid, which
          cuts a convolutional network’s feature map into patches instead of the raw pixels.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`A ViT-B/16 was pre-trained on 224 × 224 pictures. You fine-tune it on 384 × 384 pictures, patches still 16 pixels, so it now reads ${patchCount(
          384,
          16,
        )} patches instead of ${patchCount(224, 16)}. What has to change?`}
        options={[
          { label: 'The patch matrix, since the pictures are bigger' },
          { label: 'Nothing: a Transformer reads any number of tokens' },
          {
            label: `The place vectors: the table has ${patchCount(224, 16)} places and must be stretched to ${patchCount(
              384,
              16,
            )}`,
            right: true,
          },
          { label: 'The [class] token: it needs one copy for each new patch' },
        ]}
        reveal={
          <>
            The place vectors. Each patch is still 16 × 16 × 3 = {patchNumbers(16)} numbers, so the matrix fits as it
            is, and attention doesn’t care how many tokens come in. But the learned table has a vector for each of the{' '}
            {patchCount(224, 16)} places on a 14 × 14 grid and none for a 24 × 24 one, so the paper stretches the old
            grid of vectors over the new one, filling in between. One [class] token does at any size:{' '}
            {tokenCount(384, 16)} tokens in all.
          </>
        }
      />
    </Article>
  )
}
