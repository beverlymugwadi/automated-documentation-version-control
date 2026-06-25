# ADGVC — Automated Documentation Generator with Version Control

**Author:** Beverly Tashinga Mugwadi  
**Supervisor:** Neza David Tuyishimire  
**Institution:** African Leadership University (ALU)  
**Programme:** BSc. Software Engineering  
**GitHub Repo:** https://github.com/beverlymugwadi/automated-documentation-version-control.git

---

## Description

ADGVC is a full-stack web application that solves a critical problem in software development: documentation that drifts out of sync with code.

Developers submit free-text notes and JavaScript/TypeScript source files. The system extracts structured facts from the code (AST parsing, JSDoc comments, file-role classification), combines them with the developer's notes, and produces clean reference documentation — either via a deterministic rule-based engine or an LLM-enhanced rewrite.

Every save is a version-controlled commit. The system continuously monitors the original source files for changes and surfaces a **three-state drift indicator** so developers always know whether their docs are current.

---

## Architecture

```
client/                   React + TypeScript (Vite)
  src/
    pages/                Dashboard, Projects, DocWorkspace, Transform, Repos, Account
    components/           DriftBanner, CommitToGitHubModal, ExportMenu, GitHubConnectModal …
    lib/                  API clients (docs, drift, github, githubCommit, projects …)
    store/                Zustand stores (auth, toast, staged files)

server/                   Node.js + Express + TypeScript
  src/
    services/
      astParser.ts        Babel AST → functions/classes/interfaces + JSDoc + inline comments
      jsdocParser.ts      comment-parser wrapper → structured JSDoc tags
      signatureHash.ts    sha256 of exported signatures (drift fingerprint)
      classifier.ts       Lightweight file-role classifier (React component, hook, API …)
      noteEngine.ts       Keyword-based note → section classifier
      docComposer.ts      Rule-based Markdown assembler (uses all of the above)
      llmSynthesis.ts     OpenAI synthesis with JSDoc-aware prompt
      driftService.ts     Three-state drift detection + polling cache
      githubManifest.ts   Git Trees API — atomic multi-file commit (doc + manifest)
      githubService.ts    GitHub OAuth + repo/file APIs + single-file Contents API
      versionService.ts   simple-git local version history
    controllers/          Express route handlers
    models/               Mongoose schemas (User, Project, Documentation, DocVersion …)
    lib/                  dataStore, userStore, signatureHash, jsdocParser, jwt, crypto …
    routes/               Express router definitions
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB, Mongoose |
| AST Parsing | @babel/parser + @babel/traverse |
| JSDoc Parsing | comment-parser |
| Version Control | simple-git (local per-doc git repos in `.docrepos/`) |
| LLM Synthesis | OpenAI Chat Completions API (gpt-4o-mini by default) |
| Authentication | JWT (httpOnly cookie + Bearer token), bcryptjs |
| GitHub Integration | GitHub OAuth, Contents API, Git Trees API |
| Export | pdfkit (PDF), docx (Word), raw Markdown |
| Testing | Vitest |

---

## Documentation Generation Pipeline

The pipeline runs in two stages. Stage 1 (AST + rule engine) is always executed and produces deterministic output. Stage 2 (LLM synthesis) is optional and enhances the output with document-level intelligence when an OpenAI key is configured.

```
User input: notes (free text) + source files (JS/TS)
    │
    ├─ noteEngine.ts ──── keyword classifier → sections (Overview, API, Caveats …)
    │
    ├─ astParser.ts ───── Babel AST parse (attachComment: true)
    │     ├── functions   name, params (with types, optional, destructuring), returnType, async
    │     ├── classes     name, superClass, methods, properties
    │     ├── interfaces  members + types
    │     ├── exports     name, kind
    │     ├── imports     grouped by source
    │     ├── react       isReact, hooks, jsxElements, eventHandlers
    │     ├── directives  "use client" / "use server"
    │     ├── jsdoc       description, @param, @returns, @example, @deprecated
    │     ├── inlineComments  // comments inside function bodies
    │     ├── throws      throw expressions detected in each function body
    │     └── envVars     all process.env.X reads at file level
    │
    ├─ classifier.ts ──── file-role classification (Next.js page/layout/error,
    │                     React component/hook, API endpoint, util, types …)
    │
    ├─ docComposer.ts ─── rule-based Markdown (Stage 1 output):
    │     ├── title + notes sections
    │     ├── Configuration section (auto-generated from envVars)
    │     ├── API Reference: per-file → per-function
    │     │     ├── @param table (omitted with "Takes no parameters." when empty)
    │     │     ├── @returns (omitted for void/no-return functions)
    │     │     └── Throws line (when throw statements detected)
    │     └── metadata footer
    │
    └─ llmSynthesis.ts ── Two-pass OpenAI synthesis (Stage 2, runs in parallel):
          │
          ├─ PASS 1 — Document HEAD (whole-file view):
          │     Input:  declaration summary, imports, envVars, file comments, notes, source
          │     Prompt: HINT_TITLE (may be wrong) + full declaration list
          │     Output: # Derived Title (from code content, not external label)
          │             ## Overview (central design pattern, storage strategy, security)
          │             ## How It Fits Together (call chain: login→verify→middleware→role)
          │             ## Configuration (env var table with inferred purpose)
          │
          └─ PASS 2 — Per-unit reference (declaration view):
                Input:  FACT_SHEET (types), COMMENTS (intent), ROLE, SOURCE (behavior)
                Output: ### name · Purpose · Parameters · Returns · Throws · Behavior · Usage
                Note:   No title/overview — provided by Pass 1.
                        "Takes no parameters." for zero-param functions (no empty table).
                        Throws section appears only when throws are detected.
                        Usage shows a REALISTIC scenario (Express middleware in a route,
                        React hook in a component) rather than an isolated call stub.
```

### Final document structure (LLM-enhanced output)

```
# Authentication & Authorization          ← derived from code, not "Exam Management"

## Overview
Handles user registration, login, and route protection. Backed by MongoDB
when available, with automatic fallback to a JSON file store …

## How It Fits Together
register stores hashed credentials → login verifies and issues a JWT →
verifyToken validates it → authMiddleware guards routes → requireRole narrows by role.

## Configuration
| Variable      | Purpose                                      |
|---|---|
| JWT_SECRET    | Secret key for signing/verifying JWTs        |
| AUTH_ENABLED  | Set to false to bypass auth in development   |
…

---

## API Reference
### `login`
**Purpose** — Authenticates a user and returns a signed JWT.
**Parameters** — | username | string | yes | … |
**Returns** — Signed JWT string valid for 1 hour.
**Throws** — May throw: `Error("User not found")`, `Error("Invalid password")`
**Usage** — …
```

---

## Comment Extraction (Feature 1)

The AST parser now captures all developer comments as structured data, not just a stripped description string.

**What is extracted per declaration:**

| Field | Content |
|---|---|
| `jsdoc.description` | The prose description from the JSDoc block |
| `jsdoc.params[]` | Each `@param` — name, type, description, optional flag |
| `jsdoc.returns` | `@returns` text and type |
| `jsdoc.examples[]` | `@example` blocks (reproduced verbatim in the doc) |
| `jsdoc.deprecated` | `@deprecated` message — surfaces as a ⚠️ warning |
| `inlineComments[]` | `//` and `/* */` comments inside the function body |

**Why it matters:** JSDoc is where developers document *intent* — the purpose, expected inputs, and caveats that the type signature alone cannot convey. By treating comments as authoritative ground truth in the LLM prompt, the AI output describes *what the code means*, not just *what it does*.

---

## Three-State Drift Detection (Feature 3)

ADGVC continuously monitors the source files bound to each document.  
**The system detects drift; the developer decides when to regenerate.**

### States

| State | Badge colour | Meaning |
|---|---|---|
| `current` | — (no badge) | commitSha and signature hash both match |
| `implementation_changed` | Amber | File changed but exported API surface is the same |
| `signature_changed` | Red | Exported function names, params, or return types changed — doc likely wrong |

### How it works

At **generation time**, for each bound source file the system stores:
- `commitSha` — the blob SHA from GitHub
- `signatureHash` — a sha256 of all exported signatures (name + params + return type), sorted so order changes don't produce false positives

At **drift check time** (on document load, every 60 s while the doc is open, and on manual "Check for updates"):
1. Fetch the current blob SHA from GitHub (cheap HEAD check).
2. If SHA unchanged → `current` — done.
3. If SHA changed → fetch the new file, re-parse the AST, recompute `signatureHash`.
4. If hash unchanged → `implementation_changed` (body changed, API the same).
5. If hash changed → `signature_changed`. Fetch the *old* file at the stored `commitSha`, diff the signature lists, and report *which specific exports* changed (added / removed / signature changed).

### Polling vs webhooks

Drift is detected by **polling** (suitable for a localhost demo):
- Poll on document load.
- Poll every 60 s while the document workspace is open.
- Manual "Check for updates" button with a quiet loading state.

A stubbed `POST /api/webhooks/github` endpoint exists in `webhooks.controller.ts`. In a production deployment with a public server URL, registering this URL as a GitHub webhook would eliminate polling and deliver instant push-event notifications. The stub returns `501 Not Implemented` with an explanatory message.

### Regeneration

`POST /api/docs/:docId/regenerate`:
- Re-pulls the current source from GitHub.
- Re-runs the full pipeline (AST + notes + rule-based + LLM).
- Creates a **new DocVersion** (never overwrites — history is always preserved).
- Updates `commitSha` and `signatureHash` on the source bindings.
- Clears the drift cache for this document.

---

## docs/ Folder + Manifest (Feature 4)

Committing a document to GitHub writes into a structured `docs/` folder and updates a machine-readable manifest — all in a single atomic commit.

### Repository layout

```
your-repo/
  docs/
    .adgvc/
      manifest.json          ← array of ManifestEntry (one per generated doc)
    components/
      Error.md               ← generated doc, path mirrors source file
    services/
      PaymentService.md
```

### Manifest entry schema

```jsonc
{
  "docPath": "docs/components/Error.md",
  "sources": [
    {
      "repoFullName": "owner/repo",
      "path": "app/components/error.tsx",
      "branch": "main",
      "commitSha": "abc123…",
      "signatureHash": "sha256…"
    }
  ],
  "generatedAt": "2026-06-25T12:00:00.000Z",
  "generator": "ADGVC",
  "authorLogin": "beverlymugwadi",
  "version": 3
}
```

### How the commit works

ADGVC uses the **GitHub Git Trees API** (not the Contents API) to write both the `.md` file and `manifest.json` atomically in one commit:

1. `GET /git/ref/heads/{branch}` → current HEAD SHA.
2. `GET /git/commits/{sha}` → base tree SHA.
3. `POST /git/trees` with two blob entries (doc + manifest).
4. `POST /git/commits` with the new tree SHA.
5. `PATCH /git/refs/heads/{branch}` → advance the branch.

This ensures the docs and manifest are always consistent — no partial-write state.

### Path mirroring

The doc path is auto-derived from the source file's path, stripping Next.js app-router segments:

| Source path | Doc path |
|---|---|
| `app/(routes)/components/Button.tsx` | `docs/components/Button.md` |
| `src/services/payment.ts` | `docs/services/payment.md` |
| `pages/api/users.ts` | `docs/api/users.md` |

The path is editable in the Commit modal before committing.

### OAuth write scope

Committing to GitHub requires the `repo` or `public_repo` OAuth scope. If the token lacks write access, the app returns a clear error with a "Reconnect GitHub" button that re-initiates OAuth. Raw API errors are never shown to the user.

### Branch protection

If the target branch has a protection rule requiring pull requests, the app catches the 409 response, displays an inline error, and suggests a branch name (e.g. `docs/update`). The user can change the branch in the modal and retry — the commit then targets the new branch, ready for a PR.

---

## UI distinction: Save version vs Commit to GitHub

| Action | Where stored | Requires GitHub | Recoverable? |
|---|---|---|---|
| **Save version** | Local `.docrepos/<docId>/` git repo + MongoDB | No | Yes — full rollback |
| **Commit to GitHub** | Your repo's `docs/` folder + `manifest.json` | Yes (write scope) | Via git history |

---

## Environment Setup

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Git

### 1. Clone

```bash
git clone https://github.com/beverlymugwadi/automated-documentation-version-control.git
cd automated-documentation-version-control
```

### 2. Server

```bash
cd server
npm install
```

Create `server/.env` (see `server/.env.example` for all variables):

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/adgvc
JWT_SECRET=<long random string>
GITHUB_CLIENT_ID=<your OAuth app client ID>
GITHUB_CLIENT_SECRET=<your OAuth app client secret>
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
GITHUB_SCOPE=user:email,read:user,public_repo
CLIENT_URL=http://localhost:5173
ENCRYPTION_KEY=<32-byte hex key>
OPENAI_API_KEY=<optional — enables AI-enhanced docs>
OPENAI_MODEL=gpt-4o-mini
```

```bash
npm run dev
```

### 3. Client

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:4000`

---

## Running Tests

```bash
cd server
npm test
```

Test suites:

| File | What it covers |
|---|---|
| `tests/astComments.test.ts` | JSDoc extraction (description, @param, @returns, @example, @deprecated, inline comments) |
| `tests/signatureHash.test.ts` | Hash stability — same signatures → same hash; changed param/return/name → different hash; order-independent |
| `tests/driftThreeState.test.ts` | Three-state decision logic (current / implementation_changed / signature_changed) |
| `tests/pipelineImprovements.test.ts` | Fix 2 (title cross-check), Fix 3 (env-var extraction, throw detection), Fix 4 (no empty param tables, void-return omission) |
| `tests/astParser.test.ts` | Core AST extraction (functions, classes, interfaces, imports, React facts) |
| `tests/classifier.test.ts` | File-role classification |
| `tests/noteEngine.test.ts` | Note keyword classifier |
| `tests/llmSynthesis.test.ts` | LLM synthesis (mocked — verifies call structure) |

---

## API Reference (key endpoints)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with email + password |
| POST | `/api/auth/login` | Log in |
| DELETE | `/api/auth/me` | Delete account (cascades all data) |
| GET | `/api/auth/github` | Start GitHub OAuth |
| DELETE | `/api/auth/github` | Disconnect GitHub |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/generate` | Generate documentation |
| GET | `/api/docs` | List docs (includes `driftState` per doc) |
| GET | `/api/docs/:id` | Get doc detail |
| GET | `/api/docs/:id/drift` | Three-state drift check |
| POST | `/api/docs/:id/regenerate` | Re-pull source + re-generate |
| POST | `/api/docs/:id/commit-to-github` | Atomic commit to `docs/` + manifest |
| GET | `/api/docs/:id/export?format=pdf\|docx\|md` | Export |
| GET | `/api/github/repos` | List authenticated user's repos |

---

## Designs

Figma: https://www.figma.com/design/i98pDnxfdBc8dEdRXKrzb6/ADGVC-UI-Designs

---

## Deployment

| Component | Platform |
|---|---|
| Backend (Node/Express) | Render |
| Frontend (React/Vite) | Vercel |
| Database | MongoDB Atlas |

---

## License

Submitted as part of the ALU BSc. Software Engineering Capstone.
