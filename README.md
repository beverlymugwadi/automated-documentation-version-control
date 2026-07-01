# ADGVC — Automated Documentation Generator with Version Control

ADGVC is a full-stack web application that helps software developers automatically generate structured documentation from unstructured notes or GitHub source code. It eliminates the need to write documentation manually by using a rule-based engine and an AST parser to extract and organise information from code. Every generated document is saved as a version, allowing developers to compare changes, roll back to previous versions, and collaborate with team members through role-based access control.

**Live App:** https://automated-documentation-generator-with-of94.onrender.com

> Note: The app is hosted on Render's free tier. It may take 30–60 seconds to load on first visit while the server wakes up.

**Demo Video:** [Watch the 5-minute demo here](#) ← replace with your Loom/YouTube link before submitting

---

## Features

- User registration and login with JWT authentication
- Create and manage projects
- Generate documentation from unstructured developer notes (rule-based engine)
- Generate documentation from GitHub repositories (AST parser — supports JavaScript and TypeScript)
- View, edit, and export documentation (PDF, Markdown, Word)
- Version history with the ability to compare two versions side by side
- Roll back to any previous version
- Invite contributors with role-based access (Owner, Editor, Viewer)
- Dark and light theme toggle
- GitHub OAuth integration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, TypeScript, CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB Atlas |
| Authentication | JWT, bcryptjs |
| Code Parsing | @babel/parser (AST) |
| GitHub Integration | GitHub REST API |
| Export | pdfkit, docx, Blob (Markdown) |
| Testing | Vitest |
| Deployment | Render (backend + frontend) |

---

## Installation and Setup

### Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier works)
- A [GitHub](https://github.com/) account and personal access token

---

### 1. Clone the Repository

```bash
git clone https://github.com/beverlymugwadi/ADGVC.git
cd ADGVC
```

---

### 2. Set Up the Backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server/` folder with the following content:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/adgvc
JWT_SECRET=replace-me-with-a-long-random-secret
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
GITHUB_SCOPE=user:email,read:user,public_repo
CLIENT_URL=http://localhost:5173
ENCRYPTION_KEY=
MOCK_MODE=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

> Tip: Set `MOCK_MODE=true` to run the server without a MongoDB connection (useful for quick local demos).

Start the backend server:

```bash
npm start
```

The backend will run on `http://localhost:4000`

---

### 3. Set Up the Frontend

Open a new terminal window:

```bash
cd client
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

---

### 4. Open the App

Visit `http://localhost:5173` in your browser. Register an account and start using the app.

---

### 5. Run the Tests

```bash
cd server
npm test
```

This runs all unit and integration tests using Vitest.

---

## How to Use

1. **Register** an account and log in
2. **Create a project** from the Dashboard
3. **Generate documentation** by either:
   - Pasting your developer notes into the text area, or
   - Connecting a GitHub repository and selecting a file to parse
4. **View your documentation** in the Doc Viewer
5. **Edit** sections as needed
6. **Export** as PDF, Markdown, or Word
7. **Compare versions** using Version History
8. **Roll back** to a previous version if needed
9. **Invite contributors** and assign them roles (Editor or Viewer)

---

## Supported Languages for AST Parsing

AST-based automatic code structure extraction supports:
- JavaScript (.js, .jsx)
- TypeScript (.ts, .tsx)

Other languages (Python, Java, C#, Go, Ruby) can be documented using the **notes input method**.

---

## Deployment Plan and Execution

The application is deployed as two separate services on Render's free tier:

| Service | Type | URL |
|---|---|---|
| Backend (Express API) | Render Web Service | `https://automated-documentation-generator-with-of94.onrender.com` |
| Frontend (React/Vite) | Render Static Site | Same domain (served via backend) |
| Database | MongoDB Atlas (free tier) | Cluster hosted on AWS |

### Deployment Steps

1. **Database:** Create a MongoDB Atlas free cluster. Whitelist `0.0.0.0/0` for Render's dynamic IPs. Copy the connection string into the `MONGODB_URI` environment variable on Render.
2. **Backend:** Connect the GitHub repo to a new Render Web Service. Set `Build Command` to `cd server && npm install && npm run build` and `Start Command` to `cd server && npm start`. Add all required environment variables in the Render dashboard.
3. **Frontend (option A — served by backend):** The Vite build output (`client/dist`) is served as static files by the Express server. Run `cd client && npm run build` before deploying.
4. **Frontend (option B — separate static site):** Connect the GitHub repo to a new Render Static Site. Set `Build Command` to `cd client && npm install && npm run build` and `Publish Directory` to `client/dist`.
5. **Verify:** Visit the live URL, register a test account, generate documentation from both notes and a GitHub file, export to PDF, and confirm version history works.

### Deployment Verification

The live deployment was verified by:
- Successfully registering and logging in
- Generating documentation from developer notes
- Connecting a GitHub repository and parsing a TypeScript file
- Exporting a document as PDF
- Creating two versions and performing a side-by-side diff

---

## Testing Results and Strategies

### Testing Framework

The backend uses **Vitest** for all automated tests. Tests are located in `server/tests/`.

### Test Run Summary

```
Test Files:  10 passed (10 total)
Tests:       83 passed (83 total)
Duration:    ~3.5 seconds
```

### Testing Strategy 1 — Unit Testing (Service Layer)

Each core service is tested in isolation with multiple input variations.

#### Note Engine (`noteEngine.test.ts` — 6 tests)

Tests the rule-based classifier that sorts developer notes into documentation sections (Overview, Installation, Usage, API, TODO).

| Test | Input | Expected Output |
|---|---|---|
| Section ordering | Mixed notes with Overview, Install, Usage, API, TODO | Sections appear in correct order |
| Installation keyword | "Run npm install and set up your .env file" | Routed to Installation section |
| API detection | "POST /api/users accepts a payload" | Routed to API section |
| TODO flagging | "FIXME: handle rate limiting" | Routed to TODO section |
| Code block preservation | Notes with fenced ` ```ts ``` ` block | Code block kept intact under Usage |
| Empty input | `""` | Returns empty sections, blockCount = 0 |

#### AST Parser (`astParser.test.ts` — 10 tests)

Tests the Babel-based parser that extracts functions, classes, interfaces, imports, and exports from JavaScript/TypeScript source files.

| Test | Input | What is verified |
|---|---|---|
| Documented function | `export function add(a: number, b: number = 0): number` | Name, return type, params, JSDoc, optional flag |
| Arrow functions | `export const greet = (name: string): string => ...` | Kind = `arrow`, import summaries |
| Destructured params | `function Error({ error, reset }: {...})` | Properties extracted from object param |
| React component | Component with `useState`, JSX, event handler | Hooks, JSX elements, event handlers, directives |
| Sparse files | `export const config = { a: 1 }` | Raw node text captured |
| Classes | `class Dog extends Animal` with methods & properties | SuperClass, methods, properties, async flag |
| Interfaces & types | `export interface LineItem`, `export type Id` | Members, optional markers, kind |
| Exports | Named and default exports | Names array, default flag |
| Syntax error | `const = = =;` | Throws `AstParseError` with line number |
| Batch error handling | One valid file + one broken file | Parsed = 1, errors = 1, does not abort |

#### File Role Classifier (`classifier.test.ts` — 8 tests)

Tests the logic that classifies a parsed file into a semantic role (React component, hook, API endpoint, Next.js page, utility, types-only module, etc.).

| Input File | Code Pattern | Expected Role |
|---|---|---|
| `app/error.tsx` | `'use client'` + `{error, reset}` props | `next-error-boundary` |
| `app/api/users/route.ts` | Exports `GET` and `POST` | `next-route-handler` |
| `handlers.ts` | Exports `DELETE` | `api-endpoint` |
| `Card.tsx` | Returns JSX | `react-component` |
| `useToggle.ts` | Exported `use*` function calling `useState` | `react-hook` |
| `app/page.tsx` | Default export returning `<main/>` | `next-page` |
| `math.ts` | `export function add(a, b)` | `util` |
| `types.ts` | `export interface User` | `types` |

#### Drift Three-State Detection (`driftThreeState.test.ts` — 6 tests)

Tests the logic that determines whether a connected GitHub file's documentation is current, has implementation-only changes, or has signature-breaking changes.

| Scenario | Commit SHA | Signature Hash | Expected State |
|---|---|---|---|
| No change at all | Same | Same | `current` |
| Refactor only (same signature) | Changed | Same | `implementation_changed` |
| New parameter added | Changed | Different | `signature_changed` |
| Exported function removed | Changed | Different | `signature_changed` |
| No stored hash (first run) | Changed | Missing | `implementation_changed` (conservative) |
| SHA unchanged despite content diff | Same | Would differ | `current` (SHA is the gate) |

#### Signature Hash (`signatureHash.test.ts` — 7 tests)

Verifies that the SHA fingerprint of a file's public API is stable across formatting changes but changes when the public API changes.

#### AST Comments (`astComments.test.ts` — 11 tests)

Verifies extraction of JSDoc comments, `@param` tags, `@returns` tags, and inline comments from TypeScript/JavaScript source.

#### CommonJS Exports (`commonjsExports.test.ts` — 21 tests)

Verifies that `module.exports = { ... }` and `exports.X = ...` patterns are correctly extracted alongside ES module exports.

#### Pipeline Improvements (`pipelineImprovements.test.ts` — 12 tests)

Tests three quality improvements to the documentation generator:
- **Fix 3 (env-var extraction):** Extracts all `process.env.VAR` reads from source files and surfaces them in a `## Configuration` section
- **Fix 3 (throw detection):** Detects `throw new Error(...)` statements per function and adds a `**Throws:**` line in the output
- **Fix 4 (no empty tables):** Renders `"Takes no parameters."` instead of an empty parameter table for zero-arg functions; omits the `Returns:` line for `void` functions
- **Fix 2 (title cross-check):** Confirms the rule-based output always uses the supplied title, while the LLM pass can override it using code-derived context

#### LLM Synthesis (`llmSynthesis.test.ts` — 1 test)

Verifies that the synthesis module is importable and exposes the expected interface, even without an OpenAI key configured (graceful degradation).

---

### Testing Strategy 2 — Integration Testing (`integration.test.ts`)

Tests the full document lifecycle end-to-end in a single test:

```
Generate → Save Version → Diff → Rollback → Export (PDF + DOCX)
```

Steps covered:
1. Create a project in the data store
2. Generate documentation with `compose()` from notes + a TypeScript file
3. Save version 1 and verify `versionNo = 1`, `commitHash` is set
4. Save version 2 with added content; verify `versionNo = 2`
5. Call `lineDiff()` on the two versions; verify `additions > 0`
6. Roll back to version 1 by saving it as version 3; verify document content reverts
7. Export to PDF; verify byte length > 800 and starts with `%PDF`
8. Export to DOCX; verify byte length > 800

This test is fully passing. An `InMemoryDataStore` was implemented in `src/lib/dataStore.ts` — a Map-based implementation of the `DataStore` interface that requires no database connection. The `vitest.config.ts` sets `MOCK_MODE=true` for all test runs, which causes `dataStore` to use the in-memory store automatically. The full pipeline (compose, saveDocVersion, lineDiff, exportPdf, exportDocx) runs end-to-end in ~1.7 seconds without any external dependencies.

---

### Testing Strategy 3 — Different Data Values

| Scenario | Input | Result |
|---|---|---|
| Empty notes | `""` | Returns empty sections gracefully |
| Mixed note types | Overview + Install + TODO + API in one input | Each line routed to correct section |
| Malformed TypeScript | `const = = =;` | `AstParseError` thrown with line number |
| Batch with one broken file | `[valid.ts, broken.ts]` | Valid file parsed, error recorded for broken file, no crash |
| Zero-parameter function | `export function init() {}` | "Takes no parameters." rendered |
| Function with internal `catch` | `authMiddleware` catching `verifyToken` errors | Throws not attributed to outer function |
| Real auth module (CommonJS) | Full `auth.js` with `register`, `login`, `verifyToken` | All functions extracted, env vars surfaced |

---

### Testing Strategy 4 — Performance and Environment

| Environment | Result |
|---|---|
| Local (Windows 11, Node.js v18, no DB) | All 83 tests pass in ~3.5 s (unit + integration, via `InMemoryDataStore`) |
| Local (Windows 11, Node.js v18, `MOCK_MODE=true`) | App runs, documentation generates, versions save |
| Render cloud (Ubuntu, Node.js v18) | App deployed and live at the Render URL |
| MongoDB Atlas (cloud DB) | CRUD operations confirmed via the live app |
| No OpenAI key configured | LLM synthesis disabled gracefully; rule-based output returned |

---

## Screenshots

### Welcome Page

![Welcome Page](screenshots-blackboxtesting/welcome_page.png)

### Sign In Page

![Sign In](screenshots-blackboxtesting/signin_page.png)

### Sign In with GitHub

![Sign In with GitHub](screenshots-blackboxtesting/signin-with-github.png)

### Incorrect Password / Email Error

![Incorrect Credentials](screenshots-blackboxtesting/incorrect-passw-email.png)

### Short Password — Registration Validation

![Short Password Registration Validation](screenshots-blackboxtesting/Short%20Password_Registration_Validation.png)

### Empty Fields Validation

![Empty Fields](screenshots-blackboxtesting/empty-fileds.png)

### Dashboard

![Dashboard](screenshots-blackboxtesting/dashboard.png)

### Project Created

![Project Created](screenshots-blackboxtesting/project-created.png)

### Add Contributor to Project

![Add Contributor](screenshots-blackboxtesting/addcontributor_to_project.png)

### Contributor Added

![Contributor Added](screenshots-blackboxtesting/contributor%20added.png)

### Document Generation

![Document Generation](screenshots-blackboxtesting/document-generation.png)

### Generated Documentation

![Generated Documentation](screenshots-blackboxtesting/generated-documantation.png)

### Documentation Before LLM Enhancement

![Documentation Before LLM](screenshots-blackboxtesting/documantation-beforellm.png)

### Edit Documentation

![Edit Documentation](screenshots-blackboxtesting/edit_documantation.png)

### Documentation and Version Diff

![Documentation and Diff](screenshots-blackboxtesting/documantation%20and%20diff%20versions.png)

### Comparing Versions

![Comparing Versions](screenshots-blackboxtesting/cmparing-versions.png)

### Rollback to Previous Version

![Rollback](screenshots-blackboxtesting/rollback.png)

### Repositories

![Repositories](screenshots-blackboxtesting/repositories.png)

### File in Repositories

![File in Repositories](screenshots-blackboxtesting/file-in-repositories.png)

### Committing to GitHub

![Committing to GitHub](screenshots-blackboxtesting/commiting-to-github.png)

### Exported PDF

![Exported PDF](screenshots-blackboxtesting/exported-pdf.png)

### Exported Word Document

![Exported Word Document](screenshots-blackboxtesting/exported_word-doc.png)

### Exported Markdown

![Exported Markdown](screenshots-blackboxtesting/exported-markdown.png)

### Markdown Preview

![Markdown Preview](screenshots-blackboxtesting/markdown_preview.png)

---

## Analysis of Results

### Objectives Met

The project proposal aimed to build a tool that automatically generates structured documentation from code and notes, stores each generation as a version, and allows comparison and rollback. All three core objectives were achieved:

| Objective | Status | Evidence |
|---|---|---|
| Generate documentation from developer notes | Achieved | `noteEngine.ts` classifies notes into sections; 6 unit tests pass |
| Generate documentation from source code via AST | Achieved | `astParser.ts` extracts functions, classes, interfaces; 10 unit tests pass |
| Version control for generated documents | Achieved | `versionService.ts` assigns version numbers and commit hashes; tested in integration test |
| Side-by-side diff between versions | Achieved | `lineDiff()` computes line-level additions/deletions; tested in integration test |
| Roll back to a previous version | Achieved | Rollback re-saves a prior version's content as a new version |
| Export documentation | Achieved | PDF (`pdfkit`) and DOCX (`docx`) exports both verified to produce valid binary output |
| Role-based access control | Achieved | Owner, Editor, Viewer roles implemented in `Project.ts` model and API middleware |
| GitHub OAuth | Achieved | `githubAuth.controller.ts` and `githubService.ts` handle OAuth flow and token encryption |

### Objectives Partially Met

| Objective | Status | Notes |
|---|---|---|
| LLM-enhanced documentation | Optional / disabled by default | `llmSynthesis.ts` exists and is tested; requires `OPENAI_API_KEY` to activate |

### Objectives Not Met

None of the core proposal objectives were left unimplemented.

### Test Coverage Analysis

- **83 of 83 tests pass** across 10 test files covering the rule-based engine, AST parser, file classifier, drift detection, signature hashing, CommonJS exports, comment extraction, pipeline output quality, the LLM synthesis interface, and the full document lifecycle integration test.
- All tests run without any external dependencies (no database, no network) thanks to the `InMemoryDataStore` activated by `MOCK_MODE=true` in `vitest.config.ts`.
- The note engine and AST parser together form the backbone of the documentation pipeline and are both fully covered by deterministic unit tests with multiple input variations.

---

## Discussion

### Importance of Milestones

**Milestone 1 — Rule-based Note Engine:** This was the first core feature and established the documentation pipeline architecture. Classifying developer notes by keyword patterns (HTTP verbs for API sections, `npm install` keywords for Installation sections, `TODO`/`FIXME` for the TODO section) proved highly effective for unstructured input. The ordered-section output gives developers a consistent documentation structure without any manual effort.

**Milestone 2 — AST Parser:** Integrating `@babel/parser` to extract function signatures, class hierarchies, TypeScript interfaces, JSDoc comments, env-var reads, and throw statements from source code was the most technically complex part of the project. The parser handles both ES modules and CommonJS, and correctly classifies file roles (React component, hook, API endpoint, Next.js page). This allows the tool to work with real-world codebases without any developer annotation.

**Milestone 3 — Version Control:** Treating every documentation generation as a commit (with an assigned version number and hash) mirrors how source code version control works. This was key to the project's value proposition: developers can safely regenerate documentation knowing they can always roll back.

**Milestone 4 — Diff and Rollback UI:** The side-by-side diff view makes it immediately visible what changed between two versions. This closes the loop on the version control system — without a readable diff, version history is just storage.

**Milestone 5 — Export and Collaboration:** PDF, Markdown, and Word export formats cover the main ways teams share documentation. Role-based access (Owner, Editor, Viewer) means the tool is suitable for team projects, not just solo use.

### Impact of Results

The project demonstrates that rule-based and AST-based approaches — without requiring an LLM — can produce useful, structured documentation from real source code. The 83-test suite gives confidence that the core pipeline is robust to edge cases (malformed syntax, empty input, missing parameters, CommonJS vs ESM). The deployment on Render's free tier shows the tool is accessible to developers without cloud infrastructure budgets.

The optional LLM synthesis layer (`OPENAI_API_KEY`) shows a clear upgrade path: when available, AI can improve the readability and accuracy of the generated text. When unavailable, the rule-based output is still functional.

---

## Recommendations

### For Developers Using This Tool

1. **Use the notes input for non-JS/TS languages.** The AST parser currently supports only JavaScript and TypeScript. For Python, Java, C#, or Go projects, paste structured developer notes into the notes field to get the same section-organised output.
2. **Enable `MOCK_MODE=true` for quick local demos.** You can run the full app without a MongoDB connection by setting this flag, which switches the data store to an in-memory implementation.
3. **Activate LLM synthesis for higher-quality output.** Add an `OPENAI_API_KEY` to the `.env` file to enable the AI rewriting stage. The rule-based output is a solid foundation; the LLM stage makes the prose more readable.

### Future Work

1. **Extend AST parsing to Python and Java.** The `@babel/parser` library is JS/TS-only. A language-agnostic parser (e.g., using Tree-sitter) would allow the tool to analyse any codebase.
2. **CI/CD integration.** Add a GitHub Action or webhook so documentation is automatically regenerated on each push to main. The webhook infrastructure (`webhooks.controller.ts`) is already in place.
3. **Inline comments and @mentions for team collaboration.** Currently, contributors can only edit document content. Adding threaded comments on specific sections would make the tool useful for documentation review workflows.
4. **Documentation drift alerts via email.** The drift detection system (`driftService.ts`) already identifies when connected GitHub files have changed. Sending email notifications to document owners when drift is detected would complete the feedback loop.
5. **Export to Confluence and Notion.** Many development teams use these platforms for internal documentation. Adding API-based export adapters would significantly increase adoption.
