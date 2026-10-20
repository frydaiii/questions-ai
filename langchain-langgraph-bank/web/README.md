# Agent Theory Practice — web app

A static, single-page practice site built from the question bank in this repository. Pick a level,
answer a 30-question set, then get a report: your score, scores by domain, the concepts that need
work, and a review of every question with its explanation, theory card, and source links.

Everything runs in the browser. There is no server and no account; progress is kept in
`localStorage`.

## What it does

- **Sets.** 30 questions at the chosen level (easy, medium, or hard): 5 from each of the 6 domains,
  with a mix of formats (single choice, multiple response, ordering, matching). Recently seen
  questions are avoided where the pool allows. Only the 480 standalone questions are used;
  case-study questions are excluded because their stems depend on a shared scenario.
- **Taking a set.** Move freely between questions, flag questions for review, and confirm before
  submitting. No timer. A set in progress survives a reload (resume or discard from the home page).
  Keyboard shortcuts: <kbd>A</kbd>–<kbd>E</kbd> / <kbd>1</kbd>–<kbd>5</kbd> to choose,
  <kbd>←</kbd>/<kbd>→</kbd> to move, <kbd>F</kbd> to flag.
- **Scoring.** All-or-nothing for every format. Unanswered counts as incorrect.
- **Report.** Overall score; per-domain score flagged **needs improvement** below 70%; a ranked
  list of weak concepts (accuracy ascending, then misses), each linking to the theory cards behind
  the missed questions. Concepts seen in fewer than 2 questions are marked **low sample**.
- **Review.** Filter by all / incorrect / flagged, domain, and concept. Each question shows your
  answer against the correct one, why the answer is right, why your wrong picks are wrong, the rule
  of thumb, the theory cards (opened in a dialog with key points, common confusions, and
  references), and the source links.
- **History.** Score trend, recurring weak areas over the last 5 sets, and links back to every
  report. Capped at 50 attempts; can be cleared.

Thresholds live in `src/lib/analytics.ts` (`NEEDS_IMPROVEMENT_BELOW`, `LOW_SAMPLE_BELOW`) and set
size in `src/lib/generator.ts` (`SET_SIZE`, `PER_DOMAIN`).

## Requirements

- Node.js 24 and npm 11 (Node ≥ 24.15 avoids an engine warning from a jsdom dependency; tests
  still pass on 24.14)
- Python 3 with `pip install -r ../tools/requirements.txt` (only to regenerate the data bundle)

## Commands

Run these from the `web/` directory.

```bash
npm install          # install pinned dependencies
npm run data         # regenerate public/bank.json from ../data (runs the validator first)
npm run dev          # local dev server with hot reload
npm test             # unit, component, and accessibility tests (Vitest + Testing Library + axe-core)
npm run lint         # ESLint
npm run typecheck    # TypeScript project build, no emit
npm run build        # type-check and build to dist/
npm run preview      # serve the production build locally
```

`public/bank.json` is committed so the site builds without Python. Re-run `npm run data` after
editing questions or theory cards; the export refuses to write a bundle if the validator reports
errors. The bundle carries a content hash, and an in-progress set saved against an older bundle is
discarded rather than resumed against changed questions. Saved history is kept; questions that no
longer exist are left out of old reports with a notice.

A development-only page at `#/preview` renders one question of each format.

## Deploying

`npm run build` produces a fully static `dist/` folder. The app uses hash-based routing
(`#/results/…`) and `base: "./"` in `vite.config.ts`, so it works from any sub-path without
server rewrite rules.

- **GitHub Pages:** publish `dist/` (for example with the `actions/upload-pages-artifact` and
  `actions/deploy-pages` actions, running `npm ci && npm run build` in `web/`).
- **Netlify:** base directory `web`, build command `npm run build`, publish directory `web/dist`.
- **Any static host or local folder:** copy `dist/` as-is.

If you prefer clean URLs (`/results/…` instead of `#/results/…`), switch `HashRouter` to
`BrowserRouter` in `src/App.tsx`, set `base` to your deploy path, and add an SPA fallback rewrite
on the host.

## Important: answers are public

This is a practice tool, not a secure exam. The whole bank, including correct answers and
explanations, ships in `bank.json` and is readable by anyone using the browser's developer tools.
Don't use this build for graded or proctored assessment.

## Security and privacy notes

- No authentication and no backend: nothing to log in to and no user data leaves the browser.
- `localStorage` keys: `atp.session` (set in progress), `atp.history` (finished sets), `atp.theme`.
  Clearing site data removes them.
- Reference links open in a new tab with `rel="noopener noreferrer"`.

## Project layout

```
public/bank.json          Generated data bundle (tools/export_web.py)
src/types.ts              Types mirroring bank.json
src/lib/                  Pure logic: generator, grader, analytics, storage, session reducer, formatting
src/data/                 Bank loading (BankProvider, BankGate)
src/components/           Layout, Dialog, theory card, score visuals, question inputs, exam and review pieces
src/pages/                Home, Exam, Results, Review, History, 404, dev preview
src/styles/               Design tokens (light/dark) and app styles; tokens.test.ts checks WCAG contrast
src/test/                 Test setup, fixtures, render/seed helpers, axe helper, page-level a11y tests
```

## Accessibility

Keyboard-operable throughout (skip link, visible focus, focus moved to main content on navigation,
focus-trapped dialogs that restore focus on close). Ordering uses Move up / Move down buttons with
live announcements (drag-and-drop is optional); matching uses native selects. Status is never shown
by color alone. Motion respects `prefers-reduced-motion`. Every page is checked with axe-core in the
test suite, and color tokens are checked for WCAG AA contrast in both themes.
