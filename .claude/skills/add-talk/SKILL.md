---
name: add-talk
description: Add or change a talk or lesson (interactive slides at /talks/<slug>). Use when creating a new talk, deck, presentation or lesson, changing a talk's slides, sections, visibility or metadata, or building an interactive slide component.
user-invocable: true
disable-model-invocation: false
---

# Adding a talk

Talks are written in code. There is no backend for them: the registry in
`src/talks/index.ts` is the only list, and `/talks` (public list), the header
link and `/admin/talks` (admin directory) all read it.

```
src/components/talk/   The engine, shared by every talk: Deck, Stage, PresenterView,
                       useDeck, primitives (slide building blocks), talk.ts (types)
src/talks/index.ts     The registry: every talk's metadata and a lazy load()
src/talks/<slug>/      One talk: index.ts (sections + slides), slides/, and its own figures
src/talks/talks.test.ts  Checks the registry; covers new talks with no changes
```

`src/talks/interview/` is a complete example to copy from.

## Steps

### 1. Create `src/talks/<slug>/index.ts`

The slug is lowercase words joined by hyphens (`intro-to-rl`). It becomes the URL.

```ts
import { BookOpen, FlaskConical, MessagesSquare } from 'lucide-react'
import type { TalkContent } from '../../components/talk/talk'
import { basics } from './slides/basics'
import { lab } from './slides/lab'

const talk: TalkContent = {
  // Thirty minutes in all
  sections: [
    { id: 'basics', label: 'The basics', minutes: 10, icon: BookOpen },
    { id: 'lab', label: 'Try it', minutes: 15, icon: FlaskConical },
    { id: 'qa', label: 'Questions', minutes: 5, icon: MessagesSquare },
  ],
  // The whole talk, in order
  slides: [...basics, ...lab],
}

export default talk
```

- `minutes` is the time budget. The presenter view's clock compares against it, and outline slides show it.
- `icon` is optional and only shows on `<Outline>` slides.

### 2. Write the slides in `src/talks/<slug>/slides/*.tsx`

Each file exports a `SlideDef[]`:

```tsx
import { Lead, Reveal, SlideLayout } from '../../../components/talk/primitives'
import type { SlideDef } from '../../../components/talk/talk'

export const basics: SlideDef[] = [
  {
    id: 'what-is-a-policy',      // unique within the talk
    title: 'What is a policy',   // shown in the presenter outline
    section: 'basics',           // must be one of the talk's section ids
    steps: 2,                    // number of <Reveal at={n}> steps; omit for none
    notes: ['Speaker notes, one line each; only the presenter window shows them.'],
    render: () => (
      <SlideLayout eyebrow="Basics" headline={<>A policy maps a state to an <em>action</em>.</>}>
        <Lead>Everything else in RL is about finding a good one.</Lead>
        <Reveal at={1}>…shown on the first step</Reveal>
        <Reveal at={2}>…shown on the second</Reveal>
      </SlideLayout>
    ),
  },
]
```

- `bare: true` drops the footer and progress line. Use it on title and closing slides.
- `steps` must equal the highest `at` used on the slide. Otherwise the arrow keys skip a reveal, or stop on a step where nothing changes.
- Slides render on a fixed 1600×900 canvas that is scaled to fit the screen. Size everything in px for that canvas (`text-[26px]`), not responsive classes.

### 3. Register it in `src/talks/index.ts`

Add an entry to `talks`, newest first:

```ts
{
  slug: 'intro-to-rl',
  title: 'Reinforcement learning, from scratch',
  kind: 'lesson',            // 'talk' (given to an audience) or 'lesson' (teaches step by step)
  visibility: 'public',      // 'public' or 'private'
  date: '2026-11-03',        // ISO date it was or will be given
  venue: 'Rice COMP 584',    // optional
  summary: 'One sentence for the lists.',
  load: () => import('./intro-to-rl'),
},
```

`load` has to be a dynamic `import()`. A static import would pull the talk's slides into the main bundle.

## Public or private

| | public | private |
|---|---|---|
| Listed on `/talks` and in the header | yes | no |
| Search engines | indexed | `noindex` |
| Opens from its link | yes | yes |
| Listed in `/admin/talks` | yes | yes |

**Private is unlisted, not secret.** Every talk's slides ship in the static bundle on Vercel, so anyone who digs through the JS can read them. Never put anything in a talk that must stay secret. If a talk ever has to be truly secret, its content has to come from the backend behind a token. That is not built yet; raise it with the user instead of working around it.

The header's Talks link appears only once at least one talk is public.

## Building blocks (`src/components/talk/primitives.tsx`)

| Component | Use |
|---|---|
| `SlideLayout` | Eyebrow + headline + body. The usual slide. `kind` adds a why / breakdown / tradeoff / result icon |
| `Eyebrow`, `Headline`, `Lead` | Type styles, when not using `SlideLayout`. `<em>` in a headline is italic |
| `Reveal at={n}` | Hidden until step n. Keeps its space, so nothing jumps |
| `Stat` | A big number with a label |
| `Flow` | A process as items left to right, joined by arrows. `reveal` shows item i at step i + 1; `hot` items light up at step `hotAt` |
| `Decision` | A question and its options side by side, each with gains and costs, the `chosen` one marked |
| `Ask` | A dashed "To fill in" placeholder for something only Henry can answer. Every one must be replaced before the talk is given |
| `Outline` | The talk's sections from context, `active` highlighted. Pass `headline`, and `after` for what follows (e.g. "Your questions") |
| `Badge`, `Entries`, `Credit`, `Contacts` | Honours, CV-style entries, team credit, contact row |

Inside any slide component, `useStep()` returns how many steps are showing and `useTalk()` returns the current talk (its sections and slides).

## Interactive slides

Slides are React, so an interactive slide is just a component in `render`:

- Put a component used by one talk in that talk's folder (as `src/talks/interview/PlatformMap.tsx` is). Put one shared by several talks in `src/components/talk/interactive/`.
- Use `useStep()` to drive the component from the clicker. Use local state for things the audience clicks.
- Local state resets whenever the slide is left and re-entered: each slide is keyed by its index. It is also not mirrored to the presenter window, which only syncs the slide and step.
- The deck ignores keys typed into inputs, textareas and selects. Space and Enter on a focused button press the button, not the deck. Interactive controls therefore don't fight the clicker.
- Draw figures as inline SVG in the site's colours (see `src/talks/interview/figures.tsx`), using tokens like `text-sage`, `text-ink`, `text-zinc-400`, so they work in both themes.

## Check it

```bash
npx tsc --noEmit -p . && npm run lint && npx vitest run && npm run build
```

`src/talks/talks.test.ts` loads every registered talk. It checks for unique slugs, valid dates, and unique slide ids, and that every slide's `section` exists in its talk. Then run `npm run dev` and open:

- `/talks/<slug>`: step through it with → / Space. `F` toggles full screen, `T` the theme.
- `P` opens `/talks/<slug>/presenter`. Check the notes, the clock against the plan, and the outline.
- `/talks`: the talk should be listed only if it is public.
- `/admin/talks` (needs a sign-in): it should be listed with the right slide count and minutes.
