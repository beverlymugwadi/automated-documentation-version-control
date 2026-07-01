# ADGVC — Automated Documentation Generator with Version Control

> A web application that automatically generates structured technical documentation from developer notes and source code, with full version control, drift detection, and multi-format export.

**BSc Software Engineering Capstone · African Leadership University · Beverly Tashinga Mugwadi**

[![Live App](https://img.shields.io/badge/Live%20App-Render-brightgreen)](https://automated-documentation-generator-with-of94.onrender.com)
[![Tests](https://img.shields.io/badge/Tests-83%2F83%20passing-brightgreen)](#testing-results)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MongoDB-blue)](#tech-stack)

---

## Live Demo & Video

| | |
|---|---|
| **Live App** | https://automated-documentation-generator-with-of94.onrender.com |
| **Demo Video** | [▶ Watch the technical walkthrough](#) ← **ADD YOUR LOOM/YOUTUBE LINK HERE BEFORE SUBMITTING** |

> The app runs on Render's free tier — allow 30–60 seconds on first load.

---

## Project Overview

ADGVC addresses a persistent problem in software development: documentation is neglected, becomes outdated, and quickly falls out of sync with the code it describes. The system automates documentation generation through three complementary approaches:

1. **Rule-based engine** — classifies and structures free-text developer notes into documentation sections using weighted keyword and regex matching.
2. **AST parser** — parses JavaScript/TypeScript source files via `@babel/parser` to extract function signatures, classes, interfaces, JSDoc, Express API surfaces, and React patterns.
3. **LLM synthesis** (optional) — sends the structured AST and rule output to GPT-4o-mini to produce human-readable prose documentation.

Every generation is saved as a real Git commit in a per-document repository. Versions can be compared side-by-side, rolled back, and exported as PDF, Word, or Markdown. A drift detector alerts developers when linked GitHub source files change.

---

## Features

| Feature | Description |
|---|---|
| **Register / Login** | Email + password with JWT, or GitHub OAuth |
| **Projects** | Create and manage multiple documentation projects |
| **Note-based generation** | Paste developer notes → structured documentation via rule engine |
| **Code-based generation** | Connect GitHub repo, pick a file → documentation via AST parser |
| **LLM enhancement** | Optional GPT-4o-mini pass for improved readability |
| **Version history** | Every save creates a Git commit; full history is browsable |
| **Version diff** | Side-by-side LCS diff between any two versions |
| **Rollback** | Restore any previous version (preserves audit trail) |
| **Export** | PDF, Word (.docx), Markdown |
| **Drift detection** | Three-state alert when linked source files change on GitHub |
| **Collaborators** | Invite team members with Owner / Editor / Viewer roles |
| **Email notifications** | Automatic email when a collaborator is added |
| **Dark / light theme** | Full theme support |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, Vite, TypeScript | User interface |
| State management | Zustand | Auth and theme stores |
| Backend | Node.js 18, Express, TypeScript | REST API and business logic |
| Database | MongoDB Atlas + Mongoose | Documents, versions, projects, users |
| Auth | JWT, bcryptjs, GitHub OAuth | Session security |
| Code Parsing | @babel/parser, @babel/traverse | AST-based code analysis |
| Export | pdfkit, docx, Blob (native) | PDF, Word, Markdown output |
| Versioning | simple-git | Per-document Git repositories on disk |
| Email | Nodemailer (SMTP) | Collaborator notifications |
| Testing | Vitest | Unit and integration tests |
| Deployment | Render (backend + frontend), MongoDB Atlas | Cloud hosting |

---

## Project Structure

```
automated-documentation-version-control/
├── client/                          # React frontend (Vite + TypeScript)
│   └── src/
│       ├── components/              # UI components (DiffView, ExportMenu, CommitGraph, …)
│       ├── pages/                   # Route pages (Dashboard, DocWorkspace, Projects, …)
│       ├── lib/                     # API client, hooks, store helpers
│       └── routes/store/            # Zustand auth, theme, toast, staged stores
│
├── server/                          # Express backend (Node.js + TypeScript)
│   └── src/
│       ├── controllers/             # HTTP handlers (auth, docs, generate, export, github, …)
│       ├── services/
│       │   ├── astParser.ts         # @babel/parser AST traversal — core algorithm
│       │   ├── noteEngine.ts        # Rule-based note classifier — core algorithm
│       │   ├── classifier.ts        # File role detector (React, API, util, …)
│       │   ├── docComposer.ts       # Combines note + AST output into Markdown
│       │   ├── driftService.ts      # Three-state drift detector against GitHub
│       │   ├── versionService.ts    # Git-backed versioning (simple-git)
│       │   ├── llmSynthesis.ts      # Optional two-pass GPT-4o-mini enhancement
│       │   └── exporters/           # PDF (pdfkit), DOCX (docx), Markdown
│       ├── models/                  # Mongoose schemas (User, Project, Documentation, DocVersion, …)
│       ├── routes/                  # Express routers
│       ├── middleware/              # requireAuth (JWT), validate, errorHandler
│       └── lib/
│           ├── diff.ts              # Custom LCS line diff algorithm
│           ├── signatureHash.ts     # SHA-256 API signature hashing
│           └── dataStore.ts         # In-memory store (MOCK_MODE) + MongoDB adapter
│
├── server/tests/                    # Vitest test suite (83 tests, 10 files)
└── screenshots-blackboxtesting/     # Black-box testing evidence (24 screenshots)
```

---

## Installation & Setup

### Prerequisites

- Node.js v18 or higher
- npm v8 or higher
- MongoDB Atlas account (free tier is sufficient)
- GitHub account (for OAuth and repo browsing features)
- OpenAI API key (optional — only required for LLM synthesis)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/beverlymugwadi/automated-documentation-version-control.git
cd automated-documentation-version-control.git
```

### Step 2 — Backend Setup

```bash
cd server
npm install
```

Create the environment file `server/.env` (copy from the example):

```bash
cp .env.example .env
```

Then fill in the values:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/adgvc
JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
GITHUB_CLIENT_ID=your-github-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
CLIENT_URL=http://localhost:5173
ENCRYPTION_KEY=32-character-hex-string-for-token-encryption
MOCK_MODE=false
OPENAI_API_KEY=sk-...  # optional — leave blank to disable LLM synthesis
```

> **Quick demo mode:** Set `MOCK_MODE=true` to run the full app without a MongoDB connection. All data is stored in memory.

Start the backend:

```bash
npm start
```

The API will be available at `http://localhost:4000`.

### Step 3 — Frontend Setup

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Step 4 — Run Tests

```bash
cd server
npm test
```

All 83 tests should pass in approximately 3.5 seconds with no external dependencies required.

---

## How to Use

1. **Register** — create an account with email/password, or click **Sign in with GitHub**
2. **Create a project** — give it a name and description
3. **Generate documentation** — two options:
   - **From notes:** paste free-text developer notes into the input area and click Generate
   - **From code:** connect a GitHub repository, browse to a file, and click Generate from File
4. **Review and edit** — the generated Markdown is editable in the workspace
5. **Save and version** — every save creates a new version entry
6. **Compare versions** — open Version History and select any two versions to view a side-by-side diff
7. **Roll back** — click Rollback on any version to restore it (the rollback itself is saved as a new version)
8. **Export** — use the Export menu to download PDF, Word, or Markdown
9. **Add collaborators** — open the Members panel and invite team members by email

---

## Algorithms & Custom Logic

| Algorithm | File | Description |
|---|---|---|
| Rule-based note classifier | `noteEngine.ts` | Scores each input line against 7 rules using keyword + regex matches (weighted 1.0–1.4). Single-pass O(n). |
| AST code parser | `astParser.ts` | `@babel/parser` builds an AST; custom `@babel/traverse` visitor extracts functions, classes, interfaces, JSDoc, Express surfaces, React patterns, env vars, throws. |
| File role classifier | `classifier.ts` | Detects whether a parsed file is a React component, hook, API route, Next.js page/layout, utility, or type module — using AST patterns. |
| LCS line diff | `diff.ts` | Custom Longest Common Subsequence implementation. Produces typed `add / del / context` hunks consumed by the diff UI. |
| SHA-256 signature hash | `signatureHash.ts` | Serialises exported function signatures, sorts, joins, and hashes with SHA-256. Stable across formatting; changes only when the API contract changes. |
| Three-state drift detector | `driftService.ts` | Compares blob SHAs; re-parses and re-hashes on change; classifies as `current` / `implementation_changed` / `signature_changed`. |
| Git-backed versioning | `versionService.ts` | Every save is a real `git commit` in a per-document on-disk repo. Rollback re-saves old content as a new commit — audit trail is never rewritten. |
| Two-pass LLM synthesis | `llmSynthesis.ts` | Pass 1 generates document-level Overview/Configuration; Pass 2 generates per-function reference. Runs in parallel. Degrades silently without an API key. |

---

## Proposal Scope Alignment

### All Proposal Objectives Met

| Proposal Objective | Status | Module |
|---|---|---|
| Documentation from developer notes (rule-based) | Implemented | `noteEngine.ts` |
| Documentation from source code (AST) | Implemented | `astParser.ts` |
| Version control for generated documents | Implemented | `versionService.ts` |
| Compare versions (diff) | Implemented | `diff.ts` |
| Roll back to previous version | Implemented | `versionService.ts` |
| Detect code divergence from documentation | Implemented | `driftService.ts` |

### Delivered Beyond the Proposal

| Feature | Justification |
|---|---|
| LLM synthesis (GPT-4o-mini) | Improves output quality; built on top of the rule-based/AST pipeline; fully optional |
| Collaborators with RBAC | Documentation is a team activity; single-user tools have limited real-world adoption |
| Email notifications | Alerts collaborators automatically when added to a project |
| Export (PDF, Word, Markdown) | Documentation must be shareable outside the web tool |
| GitHub OAuth | Reduces sign-up friction for developer users |
| CommonJS export detection | Real-world JS projects use `module.exports`, not only ES modules |
| SHA-256 API signature hashing | Prevents false "stale" alerts on formatting-only code commits |

---

## Testing Results

**83 / 83 tests pass — 10 test files — ~3.5 s — no database or network required**

### Unit Tests

| Test File | What is Tested | Tests |
|---|---|---|
| `noteEngine.test.ts` | Rule-based classifier section detection | 6 |
| `astParser.test.ts` | AST function, class, and interface extraction | 10 |
| `astComments.test.ts` | JSDoc comment parsing and extraction | 11 |
| `classifier.test.ts` | File role detection (React, hook, API, util, types) | 8 |
| `driftThreeState.test.ts` | Three-state drift classification logic | 6 |
| `signatureHash.test.ts` | SHA hash stability and change detection | 7 |
| `commonjsExports.test.ts` | CommonJS `module.exports` and `exports.*` patterns | 21 |
| `pipelineImprovements.test.ts` | Env-var detection, throw extraction, edge cases | 12 |
| `llmSynthesis.test.ts` | LLM module graceful degradation without API key | 1 |

### Integration Test

`integration.test.ts` — end-to-end lifecycle against `InMemoryDataStore` (no external services):

**Generate docs → Save version → Compute diff → Rollback → Export PDF + Export DOCX**

### Black-Box Testing (Manual Browser)

| Area | Scenarios Tested |
|---|---|
| Auth | Sign in, GitHub OAuth, wrong password, empty fields, short password |
| Projects | Create project, add collaborator, confirm member list |
| Docs | Generate from notes, generate from GitHub file, view output, edit inline |
| Versions | Compare versions (diff view), rollback to v1, confirm version numbers |
| Export | PDF, Word, Markdown — all verified with screenshots |
| GitHub | Browse repos, browse files, commit documentation to GitHub |

### Varied Data Values

| Input | Expected Result | Outcome |
|---|---|---|
| Empty notes | Graceful empty state | Pass |
| Short password | "Use at least 8 characters" error | Pass |
| Wrong credentials | "Incorrect email or password" | Pass |
| Mixed note types | Each line classified correctly | Pass |
| Malformed TypeScript | `AstParseError` with line number | Pass |
| CommonJS file (`auth.js`) | All exports extracted | Pass |
| No OpenAI key | Rule-based output returned without error | Pass |

### Performance Across Environments

| Environment | Outcome |
|---|---|
| Local — Windows 11, Node 18 | 83 tests pass in ~3.5 s |
| Local — `MOCK_MODE=true` | Full app runs without MongoDB |
| Cloud — Render (Ubuntu, Node 18) | Deployed and live |
| Cloud DB — MongoDB Atlas | Full CRUD confirmed |
| No OpenAI key | LLM skipped gracefully |

---

## Deployment

The system is deployed on Render's free tier.

| Service | Details |
|---|---|
| Backend | Render Web Service — Express + static frontend served from `/dist` |
| Database | MongoDB Atlas (AWS, free tier) |
| Build command | `cd server && npm install && npm run build` |
| Start command | `cd server && npm start` |

**Environment variables** are configured in the Render dashboard (same keys as `server/.env.example`).

---

## Functionality, Scope Alignment & Algorithms (Report Section)

### Core Functionalities Implemented

The ADGVC system was delivered as a fully functional, deployed web application. All six objectives defined in the approved proposal were implemented and are operational in the live system.

| Proposal Objective | Status | Module |
|---|---|---|
| Documentation generation from developer notes (rule-based) | Implemented | `noteEngine.ts` |
| Documentation generation from source code (AST) | Implemented | `astParser.ts` |
| Version control for generated documentation | Implemented | `versionService.ts` |
| Version comparison (diff view) | Implemented | `diff.ts` |
| Rollback to a previous version | Implemented | `versionService.ts` |
| Detect divergence between code and documentation | Implemented | `driftService.ts` |

Three capabilities were added beyond the approved proposal: LLM synthesis via GPT-4o-mini to improve output readability; team collaboration with role-based access control (Owner, Editor, Viewer); and multi-format export (PDF, Word, Markdown). Each extends the core system without deviating from the original research goal.

### Scope Alignment

The implemented system aligns precisely with the scope boundaries stated in the proposal. The system processes JavaScript and TypeScript source code only, as specified. The React.js frontend, Node.js/Express backend, and MongoDB database match the approved technology stack exactly. The `@babel/parser` library is used for AST-based code analysis as proposed. Git version tracking is implemented through the `simple-git` library, producing real Git commits on disk for each documentation save. PDF and Markdown export are supported, with Word (.docx) added as a practical extension.

### Algorithms and Custom Logic

Seven distinct algorithms underpin the system. Each is custom-built or custom-configured rather than delegated to a third-party library.

#### 1. Rule-Based Note Classifier — `noteEngine.ts`

Developer notes entered as free text are processed in a single pass. The engine defines seven rules covering sections: Overview, Installation, Usage, Configuration, API, Notes & Caveats, and TODO. Each rule carries a keyword list and a set of compiled regular expressions. Every input line is scored against all rules: a keyword match adds the rule's weight (1.0–1.4); a pattern match adds 1.5× the weight. The highest-scoring rule wins; unscored lines default to Overview. Code fences are detected and routed directly to the Usage section. This produces a structured set of labelled sections from unstructured text in **O(n)** time.

#### 2. AST Code Parser — `astParser.ts`

Source code is parsed using `@babel/parser` with the `typescript`, `jsx`, `classProperties`, `decorators-legacy`, and `optionalChaining` plugins enabled. A `@babel/traverse` visitor extracts:

- Function declarations, arrow functions, and class methods
- TypeScript interfaces and type aliases
- ES module exports and CommonJS `exports.*` / `module.exports.*` patterns
- Import groups, JSDoc comments parsed into `{ description, params, returns, route, access, deprecated }`, and inline comments
- Throw statements and environment variable references (`process.env.*`)
- Express handler API surfaces (body fields, path params, query params, response shapes)
- React hooks and JSX elements

Parse errors surface with file name and line number rather than crashing, allowing partial results to be used.

#### 3. File Role Classifier — `classifier.ts`

Parsed files are classified into one of seven roles: `next-error-boundary`, `next-page`, `next-layout`, `next-route-handler`, `api-endpoint`, `react-component`, `react-hook`, `util`, or `types`. Classification inspects file name patterns, HTTP method exports, `use client`/`use server` directives, JSX element presence, and React hook naming conventions. The role label appears in each file's documentation header.

#### 4. LCS Line Diff — `diff.ts`

Version comparison uses a custom **Longest Common Subsequence** implementation. Given two content strings, the algorithm splits each into lines, builds an LCS matrix, and backtraces to produce a typed array of `{ type: 'add' | 'del' | 'context', text }` hunks consumed directly by the `DiffView` React component.

#### 5. SHA-256 API Signature Hash — `signatureHash.ts`

To distinguish meaningful code changes from formatting-only edits, the system computes a deterministic SHA-256 hash of all exported function signatures. Each exported function contributes a normalised string of the form `fn:name(param:type,...):returnType`. These strings are sorted and joined before hashing. A formatting change produces no hash change; a renamed parameter, added parameter, or changed return type does. This hash is stored with each source binding and drives the drift detector.

#### 6. Three-State Drift Detector — `driftService.ts`

When a documentation record is bound to a GitHub source file, the system compares the stored blob SHA against the current GitHub blob SHA. Three outcomes are possible:

| State | Condition |
|---|---|
| `current` | Blob SHA unchanged |
| `implementation_changed` | SHA changed, signature hash unchanged — internal logic altered, API surface the same |
| `signature_changed` | SHA changed and signature hash differs — exported names/types changed, documentation is likely wrong |

For `signature_changed`, the system diffs old and new signature entries to identify the specific added, removed, or renamed exports, which are surfaced to the developer in the UI banner.

#### 7. Git-Backed Version Control — `versionService.ts`

Every documentation save creates a real Git commit in a per-document repository on disk under `.docrepos/<docId>/`. The `simple-git` library initialises the repo on first save, writes content to `document.md`, stages it, and commits it. The commit hash is stored in MongoDB alongside the version record. Rollback re-saves old content as a new version, preserving a complete audit trail without rewriting history.

#### 8. Two-Pass LLM Synthesis — `llmSynthesis.ts` (optional)

When an OpenAI API key is configured, structured AST and rule-based output is sent to GPT-4o-mini in two parallel passes:

- **Pass 1 (HEAD):** generates the document-level Overview, How It Fits Together, and Configuration sections from a declaration summary and developer notes.
- **Pass 2 (UNITS):** generates per-function reference sections (purpose, parameters, responses, returns, throws, side effects, usage example) from per-function fact sheets and source excerpts.

The two outputs are merged into a single Markdown document. Without an API key the rule-based and AST output is returned unchanged; the system degrades silently.

### Testing Coverage

| Test File | What is tested | Tests |
|---|---|---|
| `noteEngine.test.ts` | Rule-based classifier sections | 6 |
| `astParser.test.ts` | AST function/class/interface extraction | 10 |
| `astComments.test.ts` | JSDoc comment extraction | 11 |
| `classifier.test.ts` | File role detection | 8 |
| `driftThreeState.test.ts` | Three-state drift classifier | 6 |
| `signatureHash.test.ts` | SHA hash stability and change detection | 7 |
| `commonjsExports.test.ts` | CommonJS export patterns | 21 |
| `pipelineImprovements.test.ts` | Env-var, throw detection, edge cases | 12 |
| `llmSynthesis.test.ts` | LLM module graceful degradation | 1 |
| `integration.test.ts` | Generate → Save → Diff → Rollback → Export | 1 |

**83 / 83 tests pass — ~3.5 s — no database or network required.**

---

## Analysis of Results

All six proposal objectives were fully implemented. Three additional capabilities were added beyond the proposal — LLM synthesis, team collaboration with RBAC, and documentation drift detection — each adding measurable value without diverging from the original goal of automating documentation.

**83 of 83 tests pass** across unit, integration, and functional test categories. Tests run without any external dependencies using `InMemoryDataStore`. The AST parser and rule-based engine — the two core algorithms — are each covered by multiple deterministic tests with varied inputs.

The live deployment on Render confirms the system works end-to-end: documentation generates from both notes and real GitHub source files, versions are saved, exports produce valid files, and collaborators can be invited.

---
