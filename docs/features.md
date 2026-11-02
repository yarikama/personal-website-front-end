# Features

What [yarikama.com](https://www.yarikama.com) offers its visitors, and what its author gets behind the login.

**For visitors**

- **Ask about my work.** Visitors ask a question in any language. The answer streams in token by token, with numbered citations that link to the project card, note or resume behind each claim. Follow-ups work: the model sees the last two questions and answers of the conversation.
- **Select to ask.** Highlighting any passage on the site shows an "Ask AI" button that sends the passage along with the question.
- **Works.** Projects filtered by category, each with a one-line hook and a cover that animates as it scrolls in. Every project has its own page at `/works/<slug>`: a written case study where there is one (code in `src/projects/<slug>`, loaded on opening), otherwise the card set out as a page. Each card keeps a stable anchor (`/works#slug`) that citations link to.
- **Notes.** Markdown notes with GitHub-flavored tables, KaTeX math and syntax highlighting, filterable by tag.
- **Contact form**, plus links to email, LinkedIn, GitHub and the resume.
- **Talks.** Interactive slides at `/talks/<slug>`, for talks and lessons, in the site's type and colours, on a 16:9 canvas that scales to any screen. Arrow keys, Space or a clicker move through slides and their reveal steps; the URL keeps the position. `P` opens a presenter window at `/talks/<slug>/presenter` with notes, the next slide, an outline and a clock against each part's time budget; the two windows stay in step. Public talks are listed at `/talks` and in the header. Private ones open only from their link and are marked `noindex`, but their slides ship in the bundle like the rest of the site, so nothing secret goes in a talk. The old `/talk` link goes to the interview talk.
- **Learnings.** A full-screen 3D knowledge graph at `/learnings`, to turn, zoom and drag. Each node is a topic, a concept that gathers others, or a paper elsewhere; arrows run from what to learn first. Picking a topic flies to it and lights up its road: every prerequisite, in an order to learn them. Tags along the top light up every topic that has one, each in a soft glow; where those topics sit close, the glows run into one region. The chosen topic and tag are in the URL (`?node=`, `?tag=`). The graph comes from the API (`GET /learnings/graph`); each topic's page is code in `src/learnings/<slug>`, at `/learnings/<slug>`. Until a node is published, a sample graph stands in. three.js loads only on this page. Each learning page is an interactive explainer: the gist in a sentence, figures to play with (simulations in SVG, animated with Motion), then the arithmetic and what it changes; the `add-learning` skill says how to write one.
- Dark and light themes, with no flash of the wrong one on load.

**For the author** (`/admin`, behind a login)

- Editors for notes, projects and categories, with image upload by drag-and-drop or paste.
- The site's visitors from Vercel Web Analytics (pages, referrers, countries, devices), the questions visitors asked, and contact messages.
- A directory of every talk, public and private, with links to open each deck or its presenter view and to copy its link.
- **Inline autocomplete** in the note editor: gray suggested text from a second self-hosted model. Tab accepts all of it, ⌥→ accepts one word, and Esc dismisses it.
- Unsaved edits autosave to the browser, so a closed tab doesn't lose a draft.
