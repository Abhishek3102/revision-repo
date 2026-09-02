# Revision Hub — Change Log & Walkthrough

> **Live repo:** [`Abhishek3102/revision-repo`](https://github.com/Abhishek3102/revision-repo)
> **Live build:** `https://revision-repo.vercel.app` (React SPA)
> **Backend:** `https://revision-repo.onrender.com/api` (Express + MongoDB)
>
> This file is auto-maintained: every change I make today is **appended** below.
> Preexisting entries are never deleted or overwritten.

---

## Change Log

### 2026-09-02 — Session 1: UI polish (earlier)
- Search/filter documents in the sidebar.
- Reading progress bar + word count / estimated read-time in the document viewer.
- One-click export of notes & highlights to a Markdown file.

### 2026-09-02 — Session 2: Web + AI feature set (this batch)
- Added manual light/dark **theme toggle** (persisted).
- Added **Ctrl+K command palette** for full-text search across all documents.
- Added **in-page Find** (Ctrl+F) with match count + prev/next navigation.
- Added **Recently Viewed** documents list in the sidebar.
- Added **onboarding** walkthrough for first-time visitors.
- Added **rename / delete documents** (with a friendly edit modal).
- Added **drag-and-drop + multiple file upload**.
- Added **tags on sticky notes** with filter chips in the Dashboard.
- Added **AI features** (backed by OpenAI-compatible endpoint): explain/simplify selection,
  summarize document, generate flashcards/quiz, ask questions about a document, and auto-tag notes.
- Backend: new routes for document update/delete and AI endpoints; notes now store tags.

---

## Walkthrough (how to run & use)

> Detailed walkthrough is appended at the end of this file as features were completed.

### 2026-09-02 — Session 2 (detailed file-by-file)
- `revision-guide/src/App.tsx` — theme state, Ctrl+K palette wiring, onboarding trigger,
  recently-viewed tracking, multi-file/drag-drop upload, rename & delete handlers,
  note tag updates (PUT), AI explain modal, AI panel wiring, upload toast.
- `revision-guide/src/components/Sidebar.tsx` — search stays; added theme toggle, search
  palette button, recently-viewed list, rename/delete buttons per doc, "Ask AI" shortcut,
  drag-and-drop highlight zone, multi-file picker.
- `revision-guide/src/components/DocumentViewer.tsx` — added in-page Find bar (Ctrl+F),
  match highlight + prev/next + count, "AI" and "Find" header buttons, and an "Explain"
  button in the text-selection toolbar.
- `revision-guide/src/components/NotesSidebar.tsx` — newly lists tags on note cards,
  tag filter chips, AI auto-tag button (wand), tags included in Markdown export.
- `revision-guide/src/components/CommandPalette.tsx` — NEW: full-text search across all
  docs with result snippets, keyboard navigation, Ctrl+K / Ctrl+Enter.
- `revision-guide/src/components/OnboardingModal.tsx` — NEW: first-visit guided walkthrough.
- `revision-guide/src/components/AIPanel.tsx` — NEW: Summarize / Flashcards / Ask modal.
- `revision-guide/src/index.css` — styling for all of the above; explicit dark/light themes.
- `revision-backend/server.js` — NEW routes: `PUT /api/documents/:id` (rename),
  `DELETE /api/documents/:id`, `PUT /api/notes/:id` (tags), and AI endpoints
  `POST /api/ai/explain|summarize|quiz|ask|tag`. Notes now persist a `tags` array.

---

## Walkthrough (how to run & use)

### 1. Run locally
```bash
# Backend (from repo root)
cd revision-backend
npm install
# ensure revision-guide/.env.local has MONGODB_URI + (optional) OPENAI_API_KEY
npm start            # serves on http://localhost:5000/api

# Frontend (in a second terminal)
cd revision-guide
npm install
npm run dev          # http://localhost:5173
```
The frontend already points to your live backend at `https://revision-repo.onrender.com/api`,
so the deployed app talks to the deployed server automatically.

### 2. Enabling AI
Add your OpenAI-compatible key to `revision-guide/.env.local` and redeploy the server:
```
OPENAI_API_KEY=sk-...
# optional: OPENAI_MODEL=gpt-4o-mini
```
Without a key, the AI buttons show a friendly "not configured" notice instead of crashing.
The backend accepts any OpenAI-compatible `POST /v1/chat/completions` provider.

### 3. What's new & how to use it
- **Theme** — sun/moon button in the sidebar header toggles light/dark (remembered).
- **Search everywhere** — press `Ctrl/Cmd + K` to open the command palette; type to search
  all document titles **and** body text, use ↑/↓ + Enter (or click) to jump to a doc.
- **Find in page** — press `Ctrl/Cmd + F` (or the Find button) to highlight every match,
  see `n/N`, and step between matches with Enter / Shift+Enter or the arrow buttons.
- **Recently viewed** — the last 5 documents you opened appear at the top of the sidebar.
- **Rename / delete** — hover a document in the sidebar to reveal ✏️ / 🗑️ actions.
  Deleting also removes that doc's notes & highlights.
- **Upload** — the button now accepts multiple files; you can also drag & drop `.txt`/`.md`
  files onto the sidebar. (PDF parsing needs a library — see notes below.)
- **Tags** — in the Dashboard, the wand icon on any note auto-tags it with AI, and the chips
  above the list filter notes by tag. Tags are included in Markdown export.
- **AI Study Tools** — the `AI` button above the document opens Summarize, Flashcards, and
  Ask; select text and press `Explain` in the toolbar to get a plain-English explanation.

### 4. Deploying
Push to `master`; Vercel auto-builds `revision-guide` and Render deploys `revision-backend`.
Remember to redeploy the backend after adding `OPENAI_API_KEY` (env var) or new routes.

### 5. Known limitations (next steps)
- PDF upload is accepted in the roadmap but not yet parsed for preview; add `pdfjs-dist`
  and an `/api/ai/extract` step (or client-side `pdf.js`) to render PDFs.
- AI relies on an external provider + key; add rate-limiting and per-user auth before sharing.
- Bundle is ~1.1 MB; code-split the AI panel (React `lazy`) if bundle size matters.

<!-- WALKTHROUGH-END -->