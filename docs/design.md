# Design notes

How the harder parts work, and why they were built that way.

**Streaming answers.** The ask endpoint is a `POST`, which `EventSource` can't send. So [`services/api/ask.ts`](../src/services/api/ask.ts) reads the server-sent events from a `fetch` body stream: it decodes the bytes, buffers partial events, and handles events and multi-byte characters split across network chunks. The tests feed it the stream in deliberately awkward pieces.

**Model output is untrusted.** [`AnswerMarkdown`](../src/components/ui/AnswerMarkdown.tsx) renders answers as Markdown with raw HTML and images dropped and unsafe link protocols stripped. An answer can't make the browser load anything. Citation markers like `[P3]` become numbered links, but only for sources the API confirmed at the end of the stream. Markers the model invented are removed ([`lib/ask.ts`](../src/lib/ask.ts)).

**One conversation everywhere.** The home page section, the floating chat button and the select-to-ask button all share one conversation through [`AskProvider`](../src/components/ask/AskProvider.tsx), so a question asked in one shows up in the others.

**Autocomplete.** [`useAutocomplete`](../src/hooks/useAutocomplete.ts) waits for a 150 ms pause in typing before it asks. A newer keystroke aborts the request in flight. It does nothing while an input method is composing (Chinese, Japanese), and it splits words with `Intl.Segmenter`, so accepting one word also works in Chinese, which has no spaces. The suggestion is drawn by an aligned layer under the `<textarea>`, not by an editor library. Each suggestion's outcome (accepted, typed along, rejected or ignored) goes back to the API as training data.

**Performance.**
- The note page, the Markdown and KaTeX renderer, and every admin page are split into chunks loaded on demand, so the home page doesn't download them.
- The main bundle is about 100 kB gzipped.
- Uploaded images get WebP variants at 640 and 1600 px from a backend worker. [`ResponsiveImage`](../src/components/ui/ResponsiveImage.tsx) offers them through `srcset` and falls back to the original if a variant isn't ready yet.

**Accessibility.**
- `prefers-reduced-motion` turns off CSS animation, smooth scrolling and the JavaScript-driven motion.
- Every interactive element has a visible keyboard focus ring.
- Effects that only make sense with a mouse, like the cursor follower, are skipped on touch screens.

**Theme.** An inline script in [`index.html`](../index.html) sets the theme before the first paint: dark, unless the visitor chose light. The page never flashes the other theme.
