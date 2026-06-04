# ADGVC — Automated Documentation Generator with Version Control

**Author:** Beverly Tashinga Mugwadi  
**Supervisor:** Neza David Tuyishimire  
**Institution:** African Leadership University (ALU)  
**Programme:** BSc. Software Engineering  
**GitHub Repo:** https://github.com/beverlymugwadi/automated-documentation-version-control.git

---

## Description

ADGVC is a full-stack web application that solves a critical problem in software development: poor, incomplete, and outdated documentation. Developers submit free-text notes and JavaScript/TypeScript source code; the system automatically converts them into structured, version-tracked software documentation.

**Core features:**
- **Rule-based note processing** — keyword and pattern-matching converts unstructured developer notes into structured documentation sections (Overview, Setup, API, Notes)
- **AST-based code parsing** — `@babel/parser` extracts functions, classes, parameters, return types, and inline comments from JS/TS source files
- **Git-based version control** — every documentation save is linked to a Git commit hash, enabling version comparison and rollback
- **Multi-format export** — download generated documentation as PDF, Markdown, or DOCX
- **JWT authentication** — secure user sessions with register/login

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, CSS3, HTML5 |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AST Parsing | @babel/parser |
| Version Control | Git, simple-git |
| Authentication | JWT (jsonwebtoken, bcryptjs) |
| Export | pdfkit, markdown (native) |
| Testing | Jest, Postman |
| Hosting | Render / Railway |

---

## Project Structure

```
adgvc/
├── client/                   # React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Auth/
│       │   │   ├── Register.jsx
│       │   │   └── Login.jsx
│       │   ├── Dashboard/
│       │   │   └── Dashboard.jsx
│       │   ├── Editor/
│       │   │   ├── NoteEditor.jsx
│       │   │   └── CodeEditor.jsx
│       │   ├── Documentation/
│       │   │   ├── DocViewer.jsx
│       │   │   └── VersionHistory.jsx
│       │   └── Export/
│       │       └── ExportControls.jsx
│       ├── App.jsx
│       └── index.js
├── server/                   # Node.js/Express backend
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Documentation.js
│   │   └── DocVersion.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── documentation.js
│   │   └── export.js
│   ├── services/
│   │   ├── astParser.js
│   │   ├── ruleEngine.js
│   │   └── versionControl.js
│   └── index.js
├── .env
├── .gitignore
└── README.md
```

---

## Environment Setup

### Prerequisites

- Node.js v18+
- MongoDB (local) 
- Git

### 1. Clone the repository

```bash
git clone https://github.com/beverlymugwadi/automated-documentation-version-control.git
cd automated-documentation-version-control
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/adgvc
JWT_SECRET=your_jwt_secret_key_here
```

Start the server:

```bash
npm start
```

The backend runs on `http://localhost:5000`.

### 3. Set up the frontend

```bash
cd client
npm install
npm start
```

The frontend runs on `http://localhost:3000`.


```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/adgvc
```

---

## Database Schema

### User
```js
{ fullName, email, password (hashed), createdAt }
```

### Project
```js
{ projectName, description, userId (ref: User), createdAt }
```

### Documentation
```js
{ title, content, format, projectId (ref: Project), generatedAt }
```

### DocVersion
```js
{ versionNo, commitHash, content, docId (ref: Documentation), createdAt }
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/projects` | Get all projects for user |
| POST | `/api/projects` | Create a new project |
| POST | `/api/documentation/generate` | Generate documentation |
| GET | `/api/documentation/:id` | Get documentation by ID |
| GET | `/api/documentation/:id/versions` | Get version history |
| POST | `/api/export/:id` | Export documentation (PDF/MD) |

---

## Designs

Figma mockups: [View Figma Designs](https://www.figma.com/design/i98pDnxfdBc8dEdRXKrzb6)

Screenshots of app interfaces are included in the `/designs` folder of this repository.

---

## Deployment Plan

The application is deployed using free-tier cloud platforms:

- **Backend (Node.js/Express):** Atlas
- **Frontend (React):** 
- **Database:** MongoDB Atlas 
- **Environment variables** 

**Production URLs** 

---

## How to Run Tests

```bash
cd server
npm test
```

---

## Video Demo

[Watch Demo](https://YOUR-VIDEO-LINK) *(replace with your recorded demo link)*

---

## License

This project is submitted as part of the ALU BSc. Software Engineering Capstone.
