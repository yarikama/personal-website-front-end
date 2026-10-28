---
name: add-learning
description: Write or change a learning page (an interactive explainer at /learnings/<slug>, one topic of the Learnings map). Use when turning a chapter, paper or topic into learning pages, building a figure or simulation for one, or changing the explainer building blocks.
user-invocable: true
disable-model-invocation: false
---

# Writing a learning page

A learning page explains **one idea** so that a reader gets most of it in a few
minutes: one sentence to take away, one or two figures to play with, short prose
around them. It is code, like a talk. The Learnings map (`/learnings`) shows its
node, and the backend keeps the node's card and links (see the end).

```
src/components/explain/   The building blocks every page shares: Article, figure.tsx, Clip.tsx, random.ts
src/learnings/index.ts    The registry: every page's slug and a lazy load()
src/learnings/<slug>/     One page: index.tsx, its figures, model.ts and model.test.ts
manim/scenes/<slug>.py    The page's ManimGL clips (slug with underscores), if it has any
manim/out/<slug>/         The rendered clips (not in git: they go to R2)
```

`src/learnings/tail-latency-amplification/` is a complete example to copy from.

## How a page teaches

The aim is the most learning for the least effort from the reader. Build every page
around the reader, in this order:

1. **The promise.** `promise` is the question the page answers ("Why do pages get slow
   when every server behind them is fast almost all the time?"). It says why to read on.
   Never give the answer here: the reader is about to guess it.
2. **Guess first.** A multiple-choice `Predict` before any explanation, on the number or
   outcome the page is about. Pick options so the intuitive answer is wrong (1% when the
   truth is 63%). A wrong guess is what makes the answer stick.
3. **A scene they have lived.** A `Steps` story set somewhere everyday (waiting for the last
   friend to arrive for dinner), told one sentence per step, with a figure that plays by
   itself at every step. No jargon yet. Script the first steps (fixed numbers that make
   the point); then scale up with a seeded simulation (100 dinners at once).
4. **The reveal.** The story's last step maps the scene onto the system, on the same figure:
   the dinner *is* the page, each friend *is* a server. Relabel; don't redraw.
5. **The one line of math**, in words first, with three worked numbers rather than a chart.
   Name the concept only now, after the reader has seen it ("this is called tail latency
   amplification").
6. **The real system**, as an optional figure to play with, for readers who want the
   mechanism in real units.
7. **A quick check** where the reader has to make a judgement, then **what to do about it**:
   two to four practices in bold lead-ins, in plain words.
8. **Check yourself**: a last `Predict` with a *new* situation (different numbers or
   setting), so the reader applies the idea instead of recalling the answer.
9. **Remember this**: `takeaway`, one sentence, shown at the end once it is earned.

Questions are always multiple choice: four options, one right, an explanation on reveal
that says *why*, not only what.

Keep the reader's effort low:

- One idea per page. If it needs sub-headings that could each stand alone, and something
  else would want to link to one of them, split it. If nothing would ever link to a page
  except its parent, fold it into the parent.
- Show, then tell. Every claim the reader should believe, they should first see happen.
- One sentence per story step, short words, second person ("You're having dinner").
- Plain words before terms: introduce a term only after the thing it names is on screen,
  and define it in the same sentence.
- Nothing to configure before the point lands: figures play themselves; sliders come after.
- Short. Most pages are 500 to 900 words of prose, and readable in five minutes.

## Sources and copyright

The site is public. Pages are **our own explanation**, not the book's:

- Write every sentence in your own words. Never paste or closely paraphrase a passage.
- Design figures from scratch. Don't redraw a book's figure; find a way to *show* the
  idea that the book's static figure could not.
- Facts and published numbers (Twitter's 2012 load figures, a paper's results) are fine,
  with the source in `sources`.
- A short quotation (a sentence) is fine when the exact words matter, marked and credited.
- Every page lists what it draws on in `sources`, with the chapter or section.
- The book or paper itself (a PDF, its extracted text) never goes into the repo or onto
  the site: read it from where the owner keeps it, and keep extracts in a scratch folder.
- Check the words against the source before the page goes out (`overlap.py`, under
  "Check it"): a run of eight or more words shared with the source is rewritten.

The site's audience reads English: pages are in English.

## Steps

### 1. Model first: `src/learnings/<slug>/model.ts`

Put the numbers and the simulation in plain functions: the formula, how to sample one
request, the thresholds. Test them in `model.test.ts`: the formula against values you
worked out by hand, and the sampler against the formula (sample a few thousand with
`seeded()` and compare). The figures then only draw.

Use `seeded(n)` from `components/explain/random.ts`, never `Math.random()`, so a figure
opens the same way every time and tests are stable.

### 2. Figures: `src/learnings/<slug>/<Name>.tsx`

- Inline SVG with a fixed `viewBox` and `className="w-full"`, so it scales to a phone.
  The page column is at most 56rem (896px), on its own and expanded on the map; on a
  wide screen with the node's card beside it, it narrows to about 720px.
- Colours only from the site's tokens, so both themes work: `fill-sage` / `stroke-sage`
  for the thing to watch, `fill-ink` for what goes wrong, `stroke-zinc-300` and
  `fill-zinc-400` for scaffolding, `fill-paper` for empty shapes. `dark:` variants only
  where a token is too strong on black (`dark:stroke-zinc-200/25`).
- Text in SVG: `font-mono text-[10px]` or `text-[11px] uppercase tracking-widest`.
- Animation: drive it with a clock (`useAnimationFrame` from `motion/react`) and derive
  every position from the time, rather than animating each element on its own. Give a
  story step's figure a `key`, so it plays again from the start when the step is shown.
  With `usePrefersReducedMotion()`, jump to the end state.
- Seeded runs a story tells numbers from: pick the seed so the run lands on what the
  arithmetic says (63 of 100 when the formula gives 63.4%), and write the numbers in the
  narration from the run, not by hand.
- Guard against state from before a setting changed: a figure renders once with the old
  data before an effect resets it.

### 2b. Clips: `manim/scenes/<slug>.py`

The owner's rule: **when a formula or a derivation would be clearer built up step by
step, animate it with ManimGL.** A formula appearing a term at a time, words turning
into symbols, a bracket opened and its terms gathered, numbers dropped into the symbols
they replace: that is what a clip is for. A still figure (SVG) stays the tool for
scenes and simulations.

- One clip per idea, 15 to 25 seconds, ending on a held frame that shows the whole
  result: that frame becomes the poster, which is all a reader with reduced motion sees.
- Extend `Clip` from `manim/style.py` and draw only with its colours (`INK`, `FADED`,
  `SAGE` for the thing to watch, `RULE` for scaffolding). Clips are dark in both of the
  site's themes (the owner's choice): one render each. `formula()` and `words()` set
  maths and words in Garamond, like the page.
- To move one term at a time, build with `split_formula(*pieces)` / `split_words(*pieces)`,
  which return the whole and its pieces in order. Index the pieces, never the Tex itself
  (that gives glyphs). Turn words into symbols with `FadeTransform`, not `Transform`.
- Large type: words at `font_size` 34 or more, formulas 52 or more. On a phone the clip
  is about 360 pixels wide.
- `manim/scenes/temporal_difference_learning.py` is the example to copy from.

Render, look at the frames, then upload: clips live on R2, not in git.

```bash
manim/render.sh <slug>              # every clip in the file, or name some after the slug
f=manim/out/<slug>/<clip>
ffmpeg -i $f.mp4 -vf "fps=8/$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f.mp4),scale=640:-1,tile=2x4" -frames:v 1 sheet.png
```

Then, once they look right:

```bash
manim/upload.sh <slug>              # to https://assets.yarikama.com/learnings/<slug>/
```

`render.sh` needs uv, ffmpeg and a TeX distribution with `ebgaramond` (MacTeX has it);
it runs ManimGL 1.7.2 through `uvx`, so there is nothing to install. `upload.sh` needs
`npx wrangler login` once. Uploading again replaces a clip, but the CDN may serve the old
one for up to a day. On the page:

```tsx
<Clip
  src="<slug>/<clip>"                       // assets.yarikama.com/learnings/<slug>/<clip>.mp4
  label="What it shows, in words, for a screen reader"
  caption="What to notice."
/>
```

It plays once when it scrolls into view, and has a Replay button.

### 3. The page: `src/learnings/<slug>/index.tsx`

```tsx
import Article from '../../components/explain/Article'
import { Choice, Controls, Figure, Slider } from '../../components/explain/figure'
import { Predict } from '../../components/explain/Predict'
import { Steps } from '../../components/explain/Steps'

export default function MyTopic() {
  return (
    <Article
      kicker="Data systems · Scalability"   // the domain and topic it sits under
      title="Tail latency amplification"
      promise="The question this page answers?"
      takeaway={<>One sentence to remember, the key word in <em>italics</em>.</>}
      sources={[{ title: 'Designing Data-Intensive Applications', by: 'Martin Kleppmann, 2017',
                  part: 'Chapter 1, “Percentiles in Practice”', url: 'https://dataintensive.net/' }]}
    >
      <Predict question="…" options={[{ label: 'About 1%' }, { label: 'About 63%', right: true }, …]} reveal={<>…</>} />
      <Steps say={[<>One sentence.</>, <>The next.</>]}>
        {(step) => <MyScene step={step} />}
      </Steps>
      <h2>…</h2>
      <p>…</p>
      <Figure caption="What to notice, in a sentence or two.">
        <MyFigure … />
        <Controls>
          <Slider label="Calls per page" value={n} min={1} max={100} onChange={setN} />
        </Controls>
      </Figure>
    </Article>
  )
}
```

Hold settings that several figures share in the page, and pass them down.

| Block | Use |
|---|---|
| `Article` | The page: kicker, title, the promise, the prose (styled like a note), the takeaway to remember, sources |
| `Predict` | A multiple-choice question and its explanation once answered. `kicker`: "Guess first", "Quick check", "Check yourself" |
| `Steps` | A story told one sentence at a time, Next / Back or the arrow keys; draws `children(step)` |
| `Figure` | A framed figure with a caption. Outside the prose styling |
| `Controls` | A row of controls under a drawing, wrapping on a phone |
| `Slider`, `Choice` | A number in a range; one of a few options |
| `Button` | An action: run, reset, send |
| `Readout` | A measured number with its label; `accent` for the one that matters |
| `Clip` | A ManimGL animation of a formula or derivation, dark in both themes |

### 3b. Checks grow its node

Reading a page cracks its node on the map, then cracks it further, then opens it into
a sun (`lib/progress.ts`). What counts as a reading is answering the page's **checks**,
so they need care:

- A check is a `Predict` whose `kicker` is anything but `"Guess first"`, which is also
  the default. The match is exact: "Guess First" would count as a check.
- Every page needs at least one check ("Quick check", "Check yourself"), or its node
  never cracks.
- Put checks at the top level of the `Article`, always rendered: never inside `Steps`
  or behind a condition. A check joins the reading when it mounts, so one that appears
  later lets the reading count before it is answered, and one that unmounts drops out.
- Exactly one option `right`. The first reading counts once every check is answered;
  later ones only with every check right, so a check should test a judgement the page
  taught, fairly, and its reveal say why.
- Keep the slug once the page is live: readers' progress is kept by slug in their
  browser, and a new slug starts them over.

When a second page needs something a page built for itself (a request simulator, a
histogram), move it into `components/explain/` then, not before.

### 4. Register it in `src/learnings/index.ts`

```ts
{ slug: 'tail-latency-amplification', load: () => import('./tail-latency-amplification') },
```

`load` must be a dynamic `import()`, so each page loads only when it is opened.

### 5. Its node on the map

The node is data in the backend, written through the writing MCP server (`yarikama-writing`):
`create_learning_node` with kind `learning` (its ref defaults to `/learnings/<slug>`), a one
to three sentence summary and tags, then `link_learning_nodes`:

- `part_of` its topic. The first `part_of` link is its home, where it sits on the map;
  to file it under another topic it is also part of, `set_learning_node_home`.
- `prerequisite` from what it builds on.
- `next` from the page read before it, in the reading order, and to the one after: the
  page's Next / Before and the card's follow it.

A topic or field that only gathers pages is a `concept` node, with no page. On the map
it grows with the pages inside it, as far as the least read of them; a page whose node
is on the map but not on the site yet ("coming soon") is left out. Give a topic its own
page and it grows with that page's reading instead.

Every node in a field carries the field's tag (`rl`, `ddia`): pages, topic and field
concepts, and external links alike, so that searching or picking the tag lights up the
whole field, its topics included. A page adds its topical tags after it (`decisions`,
`algorithms`); reuse the tags already on the map before making a new one. A new field
gets a short tag of its own, given to its field node first.

Publish it with `set_learning_node_published` **only once the page is live** on the site,
and only when the owner asks.

## Check it

```bash
npx tsc --noEmit -p . && npm run lint && npx vitest run && npm run build
```

Then `npm run dev` and open `/learnings/<slug>` in both themes, on a phone width too, and
expanded on the map at `/learnings?node=<slug>&read=1` on a wide screen (the card beside
it). Play with every control, including changing a setting while a simulation is running.
Answer every check and watch its node crack beside the page.

Then check the page's words against its source, the same PDF the page was written from,
with the chapter's pages:

```bash
python3 -I .claude/skills/add-learning/overlap.py <source.pdf> <slug> [<slug> ...] --pages 23-48
```

It prints every run of six or more words a page shares with the source, longest first,
and exits 1 if one is eight or more: that is a sentence taken or closely paraphrased, so
rewrite it in your own words and run it again. Shorter runs are usually common phrases
("a fraction of the way toward the"); read them, and leave them if they are. A page's
`sources` list is skipped, since it names titles and chapters on purpose. Needs
`pdftotext` (poppler) for a PDF.
