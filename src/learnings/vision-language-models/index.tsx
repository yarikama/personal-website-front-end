import { useState } from 'react'
import { Link } from 'react-router-dom'
import Article from '../../components/explain/Article'
import { Clip } from '../../components/explain/Clip'
import { Choice, Controls, Figure, Numbers } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'
import Budget from './Budget'
import Desk, { type Show } from './Desk'
import {
  AS_THEY_ARE,
  BIG,
  BIG_TOKENS,
  cellSize,
  count,
  FIRST_PICTURE,
  FIXED_SIDE,
  FIXED_TOKENS,
  INPUTS,
  LLAVA,
  LLAVA_TOKENS,
  MODES,
  nativeTokens,
  NEW_PICTURE,
  oneIn,
  projectorWeights,
  QWEN,
  readAs,
  RULE_SIZE,
  SMALL,
  SMALL_TOKENS,
  TEXT_HEIGHT,
  textHeight,
  TRAINED,
  VIEWS,
  type Mode,
} from './model'

const STEPS: Show[] = ['look', 'map', 'raw', 'rule', 'train', 'read', 'named']
const INPUT_INDEXES = INPUTS.map((_, i) => i)
const RAW = readAs(AS_THEY_ARE, FIRST_PICTURE)
const READ = readAs(TRAINED, NEW_PICTURE)
const RECEIPT = INPUTS.findIndex((i) => i.name === 'Receipt')
const PAGE = INPUTS.findIndex((i) => i.name === 'Web page')
const LINE = INPUTS.findIndex((i) => i.name === 'One line of text')
const n = (x: number) => x.toLocaleString('en-US')
const share = (part: number, whole: number) => (part / whole === 0.75 ? 'three quarters' : `${Math.round((100 * part) / whole)}%`)

export default function VisionLanguageModels() {
  const [input, setInput] = useState(RECEIPT)
  const [mode, setMode] = useState<Mode>('Fixed')
  const receipt = VIEWS.Fixed[RECEIPT]

  return (
    <Article
      kicker="Vision and language · Images meet text"
      title="Vision-language models"
      promise="A language model reads nothing but tokens. How do you show it a picture, how much of it has to learn, and why did the first such models miss the small print?"
      takeaway={
        <>
          A vision-language model turns each patch of a picture into a <em>visual token</em>, a vector that a small
          trained projector places among the language model’s word embeddings, so the language model reads the picture
          as if it were words; how many tokens a picture gets sets how much of its detail survives.
        </>
      }
      sources={[
        {
          title: 'COMP 646: Deep Learning for Vision and Language',
          by: 'Vicente Ordóñez-Román, Rice University, Spring 2026',
          part: 'Lecture 13: LLaVA-style vision-language models, the fixed-visual-token bottleneck, and dynamic resolution in Qwen2-VL',
        },
        {
          title: 'Dive into Deep Learning',
          by: 'Aston Zhang, Zachary C. Lipton, Mu Li and Alexander J. Smola',
          part: 'Sections 11.8, “Transformers for Vision” (the patch count), and 11.9, “Large-Scale Pretraining with Transformers” (images and text as one sequence of tokens)',
          url: 'https://d2l.ai/chapter_attention-mechanisms-and-transformers/large-pretraining-transformers.html',
        },
        {
          title: 'Visual Instruction Tuning',
          by: 'Haotian Liu, Chunyuan Li, Qingyang Wu and Yong Jae Lee, NeurIPS, 2023',
          part: 'Section 4: the architecture (a projection W from CLIP ViT-L/14 features into Vicuna’s word embeddings) and the two training stages',
          url: 'https://arxiv.org/abs/2304.08485',
        },
        {
          title: 'Improved Baselines with Visual Instruction Tuning',
          by: 'Haotian Liu, Chunyuan Li, Yuheng Li and Yong Jae Lee, CVPR, 2024',
          part: 'LLaVA-1.5: an MLP projector and a 336-pixel CLIP encoder',
          url: 'https://arxiv.org/abs/2310.03744',
        },
        {
          title: 'Qwen2-VL: Enhancing Vision-Language Model’s Perception of the World at Any Resolution',
          by: 'Peng Wang, Shuai Bai, Sinan Tan, Shijie Wang and others, 2024',
          part: 'Section 2.1, “Naive Dynamic Resolution”: pictures at their own size, and 2 × 2 tokens merged into one',
          url: 'https://arxiv.org/abs/2409.12191',
        },
      ]}
    >
      <Predict
        question="LLaVA joins a vision model that already knows pictures (about 300 million weights) to a language model that already knows words (13 billion). In its first stage of training, as it learns to caption pictures, how many of those weights change?"
        options={[
          { label: 'All 13.3 billion' },
          { label: 'The language model’s 13 billion' },
          { label: 'The vision model’s 300 million' },
          { label: 'About 5 million, in one layer between them', right: true },
        ]}
        reveal={
          <>
            About {count(projectorWeights)}, roughly one weight in {n(oneIn)}. Both big models stay frozen. Only a single
            layer between them learns, and its whole job is to turn what the vision model says about each patch into
            something the language model can read like a word. Here is why that is enough.
          </>
        }
      />

      <h2>Two friends and a rule</h2>

      <Steps
        readable
        say={[
          <>Mia looks at a picture one square at a time and writes two numbers for each: how much ink, and how stripy.</>,
          <>
            Leo writes well but reads only words, and he keeps each word as a spot on a map in his head, with stripes
            beside zebra and dots beside spots.
          </>,
          <>
            Put Mia’s numbers on Leo’s map as they are and they mean nothing to him: her four squares read as{' '}
            {RAW.join(', ')}.
          </>,
          <>
            You retrain neither of them; you add one small rule between them, {RULE_SIZE} numbers that stretch, turn and
            slide her numbers across his map.
          </>,
          <>
            You tune the {RULE_SIZE} numbers on squares whose words you know, and her squares drift across the map until
            each one reads as its own word.
          </>,
          <>
            Now Leo reads a new picture’s squares as if they were words ({READ.join(', ')}), then your question, and
            answers about a picture he has never seen.
          </>,
          <>
            Mia is the <strong>vision encoder</strong>, Leo the <strong>language model</strong>, the rule the{' '}
            <strong>projector</strong>, and each converted square a <strong>visual token</strong>: this is LLaVA.
          </>,
        ]}
      >
        {(step) => <Desk key={STEPS[step]} show={STEPS[step]} />}
      </Steps>

      <p>
        LLaVA (Liu and others, 2023) is built just this way. Its Mia is the image half of{' '}
        <Link to="/learnings/clip">CLIP</Link>, a <Link to="/learnings/vision-transformer">vision Transformer</Link>{' '}
        that cuts a {LLAVA.side} × {LLAVA.side} picture into {LLAVA.patch}-pixel patches and hands back{' '}
        {LLAVA_TOKENS} vectors of {n(LLAVA.feature)} numbers, one per patch. Its Leo is Vicuna, a 13-billion-weight
        language model whose word embeddings are {n(LLAVA.width)} numbers long. The projector is one matrix W that
        turns each patch’s {n(LLAVA.feature)} numbers into {n(LLAVA.width)}.
      </p>
      <p>
        Text reaches a language model as <Link to="/learnings/subword-tokenization">subword tokens</Link>, each looked
        up in a table of embeddings. Visual tokens skip the table and arrive as vectors already. The model reads the{' '}
        {LLAVA_TOKENS} of them, then the question, and writes its answer a token at a time, the next-token game it was{' '}
        <Link to="/learnings/pretraining-objectives">pretrained</Link> on. Nothing inside it was built for pictures.
      </p>

      <h2>Two stages of training</h2>
      <p>
        Stage 1 is the story’s tuning. LLaVA takes {n(LLAVA.captions)} pictures with captions and asks the frozen
        language model to write each caption after the picture’s visual tokens. The loss is the usual next-token loss,
        but only W moves, so W learns to speak in a way the language model already understands. Stage 2 unfreezes the
        language model too and trains it with W on {n(LLAVA.instructions)} conversations about pictures, which GPT-4
        wrote from captions and object boxes, so the model answers requests instead of only captioning; that is
        <Link to="/learnings/instruction-tuning">instruction tuning</Link> with a picture in the prompt. The vision encoder never changes.
      </p>

      <Predict
        kicker="Quick check"
        question="A team swaps LLaVA’s vision encoder for a newer one that hands back 1,152 numbers per patch instead of 1,024. The language model stays the same. What must be trained again before the model can see?"
        options={[
          { label: 'The language model, from scratch' },
          { label: 'The projector, starting with stage 1', right: true },
          { label: 'Nothing: a vector is a vector' },
          { label: 'The tokenizer, to add picture words' },
        ]}
        reveal={
          <>
            The projector. It is a phrasebook between one encoder’s numbers and one language model’s word map; a new
            encoder means numbers with different meanings (and here a different count, so the old W doesn’t even fit).
            Stage 1 aligns a fresh W cheaply, and the language model keeps everything it knows about words. The
            tokenizer stays as it is: visual tokens never pass through it.
          </>
        }
      />

      <h2>The one line of math</h2>
      <p>
        How many tokens does a picture become? In words: count the squares down the picture, count them across, and
        multiply. With H and W the picture’s height and width in pixels and p the side of one square:
      </p>
      <p className="text-center font-serif text-xl">N = (H ÷ p) × (W ÷ p)</p>
      <Numbers
        items={[
          { label: `LLaVA, ${LLAVA.side} px`, value: LLAVA_TOKENS, note: `p = ${LLAVA.patch}: 16 × 16` },
          { label: `LLaVA-1.5, ${FIXED_SIDE} px`, value: FIXED_TOKENS, note: `p = ${LLAVA.patch}: 24 × 24` },
          { label: 'Qwen2-VL, 700 × 1260', value: n(nativeTokens(700, 1260)), note: 'p = 28: 25 × 45' },
        ]}
      />
      <p>
        LLaVA-1.5 moved to a CLIP encoder that takes {FIXED_SIDE}-pixel pictures and a two-layer projector, and it pads
        every picture to a square and shrinks it to {FIXED_SIDE} × {FIXED_SIDE} first. So N is {FIXED_TOKENS} whatever
        you send: an icon, a photo, or a receipt as long as your arm. Shrunk that far, the receipt’s {TEXT_HEIGHT}-pixel
        print is {textHeight(RECEIPT, 'Fixed').toFixed(1)} pixels tall, too small for any letter; each token stands for{' '}
        {cellSize(receipt.grid)} pixels of it, and {share(receipt.padding, receipt.tokens)} of the tokens fall on
        padding.
      </p>

      <Figure
        readable
        caption={
          <>
            Fed in: the picture as the model takes it, padding hatched, with the token squares where they are big
            enough to draw. Close look: the part inside the sage square, more solid where there is more ink. Encoder
            gets: the same part after resizing, with each token’s square in sage. Fixed gives every picture{' '}
            {FIXED_TOKENS} tokens, even the one line of text, {n(VIEWS.Fixed[LINE].padding)} of them on padding, and
            blurs the receipt and the web page. Native keeps them sharp, at one token per 28 × 28 pixels.
          </>
        }
      >
        <Budget input={input} mode={mode} />
        <Controls>
          <Choice label="Picture" options={INPUT_INDEXES} value={input} onChange={setInput} format={(i) => INPUTS[i].name} />
          <Choice
            label="Tokens"
            options={MODES}
            value={mode}
            onChange={setMode}
            format={(m) => (m === 'Fixed' ? 'Fixed (LLaVA-1.5)' : 'Native (Qwen2-VL)')}
          />
        </Controls>
      </Figure>

      <h2>Let the picture keep its size</h2>
      <p>
        Qwen2-VL (Wang and others, 2024) lets N follow the picture. It resizes only to keep the pixel count between{' '}
        {n(QWEN.minPixels)} (56 × 56) and about 12.8 million (3,584 × 3,584), keeping the shape and rounding each side to
        a multiple of 28. It cuts {QWEN.patch}-pixel patches, then a small network merges each 2 × 2 block of neighbours
        into one token, so p is 28. A line of text gets {VIEWS.Native[LINE].tokens} tokens and a long web page{' '}
        {n(VIEWS.Native[PAGE].tokens)}.
      </p>
      <Clip
        src="vision-language-models/token-count"
        label="Tokens equal squares down times squares across: N equals H over p times W over p. LLaVA-1.5, for any picture: 336 over 14 times 336 over 14, which is 24 times 24, 576. Qwen2-VL merges 2 by 2 squares of 14, so p is 28: a photo, 700 over 28 times 1260 over 28, which is 25 times 45, 1125; a line of text, 28 over 28 times 224 over 28, which is 1 times 8, 8."
        caption="The same count, two ways of choosing H, W and p: fixed, every picture is 576; native, the count follows the picture."
      />

      <h2>Using a vision-language model well</h2>
      <ul>
        <li>
          <strong>Give it the pixels the question needs.</strong> Small print needs tokens on it. With a fixed model,
          crop to the part you are asking about; with a native one, check that its pixel limit isn’t shrinking your
          page.
        </li>
        <li>
          <strong>Spend visual tokens like words.</strong> {n(VIEWS.Native[PAGE].tokens)} tokens of web page fill the
          context like a long document, and attention weighs each token against all the rest. Shrink pictures whose
          detail doesn’t matter.
        </li>
        <li>
          <strong>It is still a language model.</strong> Clear questions and{' '}
          <Link to="/learnings/in-context-learning">examples in the prompt</Link> help it as they help any other.
        </li>
      </ul>

      <Predict
        kicker="Check yourself"
        question={`Qwen2-VL is given a ${SMALL} × ${SMALL} icon and a ${BIG} × ${BIG} photo, ten times as wide and ten times as tall. How many times as many visual tokens does the photo get?`}
        options={[
          { label: 'The same number' },
          { label: 'About 2 times' },
          { label: '10 times' },
          { label: '100 times', right: true },
        ]}
        reveal={
          <>
            100 times: {SMALL_TOKENS} tokens against {BIG_TOKENS}. The count follows the area, rows times columns, so ten
            times each way is a hundred times the squares. And since attention compares every pair of tokens, the work
            grows about ten thousand times, which is why Qwen2-VL merges neighbours and caps the pixels.
          </>
        }
      />
    </Article>
  )
}
