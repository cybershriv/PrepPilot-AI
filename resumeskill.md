# Codebase Audit for Resume Claims

## Audit scope and evidence rules

This audit counts code present in the workspace at the time of inspection. It excludes `node_modules`, lock files, `.next`, `dist`, `build`, coverage output, source maps, and generated files. The backend `.env` file was not read; only environment-variable names referenced by source code were inspected.

Counts describe code definitions and declarations, not production traffic, live database state, personal authorship, or deployed infrastructure. The repository root is not a Git repository, so author attribution and history statistics cannot be verified.

### Commands used

Commands were run from `D:\GenAI`. `rg` is ripgrep. File searches excluded dependency and generated directories.

```powershell
rg --files --hidden `
  -g '!**/node_modules/**' -g '!**/.next/**' -g '!**/dist/**' `
  -g '!**/build/**' -g '!**/coverage/**' -g '!**/.git/**' `
  -g '!**/*lock*' -g '!**/*.map' -g '!**/generated/**' `
  -g '!**/.env' -g '!**/.env.*'

rg -n 'router\.(get|post|put|patch|delete)\(' backend/src/routes
rg -n 'app\.use\("/api/' backend/src/app.js
rg -n 'createBrowserRouter|path\s*:' frontend/src
rg -n 'mongoose\.model|unique\s*:|ref\s*:|\.index\s*\(' backend/src/models
rg -n 'jsonwebtoken|bcrypt|cors\(|helmet|rateLimit|GoogleGenAI|Stripe|Supabase|Firebase|webhook' backend/src frontend/src

$files = rg --files -g '!**/node_modules/**' -g '!**/.next/**' `
  -g '!**/dist/**' -g '!**/build/**' -g '!**/coverage/**' `
  -g '!**/*lock*' -g '!**/*.map' -g '!**/generated/**'
$source = $files | Where-Object {
  $_ -match '\.(js|jsx|ts|tsx|css|scss|html|sql|py|sh|ya?ml)$'
}
$rows = foreach ($file in $source) {
  $parts = $file -split '[\\/]'
  $folder = if ($parts.Length -gt 1) { $parts[0] } else { '(root)' }
  $count = (Get-Content -LiteralPath $file | Measure-Object -Line).Lines
  [PSCustomObject]@{ Folder = $folder; Lines = $count }
}
$rows | Group-Object Folder | ForEach-Object {
  '{0}: {1}' -f $_.Name, (($_.Group | Measure-Object -Property Lines -Sum).Sum)
}

# Git history probes; each failed because D:\GenAI has no .git directory.
git rev-parse --show-toplevel
git log --oneline | Measure-Object -Line
git log --reverse -1 --format='%aI'
git log -1 --format='%aI'
git shortlog -sne --all
```

The broad search for `describe`, `it`, or `test` can match Zod's `.describe()` schema method. Test-file searches and inspection of the authored source tree found no project test files or test cases.

## 1. REST API endpoints

`backend/src/app.js` mounts the auth router at `/api/auth` (line 20) and the interview router at `/api/interview` (line 21). Endpoint paths below combine those mount prefixes with the route declarations.

| Method | Full path | Area | Route declaration |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Auth | `backend/src/routes/auth.routes.js:15` |
| `POST` | `/api/auth/login` | Auth | `backend/src/routes/auth.routes.js:23` |
| `GET` | `/api/auth/logout` | Auth | `backend/src/routes/auth.routes.js:31` |
| `GET` | `/api/auth/get-me` | Auth | `backend/src/routes/auth.routes.js:39` |
| `POST` | `/api/interview/` | Interview reports | `backend/src/routes/interview.routes.js:16` |
| `GET` | `/api/interview/report/:interviewId` | Interview reports | `backend/src/routes/interview.routes.js:23` |
| `GET` | `/api/interview/` | Interview reports | `backend/src/routes/interview.routes.js:31` |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Resume PDF | `backend/src/routes/interview.routes.js:39` |

### Endpoint totals

| Area | Count |
| --- | ---: |
| Auth | 4 |
| Interview reports and resume PDF | 4 |
| **Total custom REST endpoints** | **8** |

The two `app.use` statements are router mounts, not additional endpoints.

### Other frontend/backend calls

- **Frontend Server Actions:** 0 found. This is a React/Vite client, not a Next.js app.
- **Direct Supabase/Firebase calls:** 0 found.
- **Frontend Axios call sites to this backend:** 8, in `frontend/src/features/auth/services/auth.api.js:11,27,40,52` and `frontend/src/features/interview/services/interview.api.js:21,32,42,52`. These call sites are not additional backend endpoints.
- **Webhooks:** 0 found.
- **Backend third-party API integrations:** Google Gemini through `@google/genai`, initialized in `backend/src/services/ai.service.js:7` and called at lines 47 and 101.
- `Puppeteer` is used locally for PDF rendering in `backend/src/services/ai.service.js:64`; it is not a third-party HTTP API integration.

## 2. Database

### Registered Mongoose models

| Model name | Evidence | Notes |
| --- | --- | --- |
| `User` | `backend/src/models/user.models.js:24` | User account fields include username, email, and password. |
| `blacklistToken` | `backend/src/models/blacklist.models.js:12` | Stores blacklisted JWT values. |
| `InterviewReport` | `backend/src/models/interviewReport.model.js:100` | Stores generated report content and a user reference. |
| **Registered models in source** | **3** | The actual collection count in a running database was not queried: **NOT FOUND**. |

`InterviewReport` also declares four embedded Mongoose schemas in the same model file: technical question (line 4), behavioral question (line 21), skill gap (line 38), and preparation plan (line 52). They are subdocument schemas, not separately registered Mongoose models.

### Relations, indexes, and migrations

| Item | Count | Evidence and qualification |
| --- | ---: | --- |
| Declared Mongoose reference fields | 1 | `InterviewReport.user` is an ObjectId with `ref: "users"` at `backend/src/models/interviewReport.model.js:86-90`. |
| Effective relation target | UNCLEAR | The reference string is `"users"` while the registered model name is `"User"` at `backend/src/models/user.models.js:24`. No `populate()` call was found. This is not a database-enforced foreign key. |
| Declared unique options | 2 | Username and email in `backend/src/models/user.models.js:7,13`. Both are expressed as arrays (`[true, message]`) rather than a boolean. The actual index state in MongoDB was not queried, so successful index creation is **UNCLEAR**. |
| Explicit `schema.index()` declarations | 0 found | Search of `backend/src/models` found no `.index()` calls. MongoDB's automatically created `_id` indexes are not counted as application-defined indexes. |
| Migration files | 0 found | No authored migration directories/files, Prisma schema, or SQL migrations were found after excluding dependencies and generated files. |

## 3. Frontend

### React Router routes

`frontend/src/app.routes.jsx` defines four routes:

| Path | Page/component | Evidence |
| --- | --- | --- |
| `/login` | `Login` | `frontend/src/app.routes.jsx:11`; component in `frontend/src/features/auth/pages/Login.jsx:6` |
| `/register` | `Register` | `frontend/src/app.routes.jsx:15`; component in `frontend/src/features/auth/pages/Register.jsx:6` |
| `/` | `Protected` wrapping `Home` | `frontend/src/app.routes.jsx:19`; `Home` in `frontend/src/features/interview/pages/Home.jsx:6` |
| `/interview/:interviewId` | `Protected` wrapping `Interview` | `frontend/src/app.routes.jsx:23`; `Interview` in `frontend/src/features/interview/pages/Interview.jsx:60` |
| **Total routes** | **4** | React Router client routes; no Next.js `app/` or `pages/` routes found. |

### Component counts

| Count | Definition used | Evidence |
| ---: | --- | --- |
| 10 | Named React component definitions found in authored frontend source: `App`, `AuthProvider`, `InterviewProvider`, `Protected`, `Login`, `Register`, `Home`, `Interview`, `QuestionCard`, and `RoadMapDay`. | `frontend/src/App.jsx:7`; `frontend/src/features/auth.context.jsx:7`; `frontend/src/features/interview/interview.context.jsx:5`; `frontend/src/features/auth/components/Protected.jsx:4`; auth page files at line 6; interview page at lines 15, 42, and 60; Home at line 6. |
| 3 | Component definitions with repeated use/rendering: `Protected` wraps two routes; `QuestionCard` renders technical and behavioral questions; `RoadMapDay` renders preparation-plan items. | `frontend/src/app.routes.jsx:19,23`; `frontend/src/features/interview/pages/Interview.jsx`. |
| 1 | Cross-file shared UI wrapper: `Protected`. The other two repeated-render helpers are local to `Interview.jsx`. | `frontend/src/features/auth/components/Protected.jsx:4`. |

“Reusable component” has no formal repository definition. The counts above state the counting rule rather than treating every component definition as a shared library component.

### Admin dashboard

| Item | Count | Evidence |
| --- | ---: | --- |
| Admin routes/modules/sidebar sections | 0 found | No admin route, admin role, or admin dashboard module found in `frontend/src` or `backend/src`. `Interview.jsx` has an interview-section navigation/sidebar, but it is not an admin dashboard. |

## 4. Authentication and security

| Control | Implemented behavior found in source | Evidence |
| --- | --- | --- |
| Authentication | JWT issued on registration/login, stored in a cookie named `token`; token expiry is one day. | `backend/src/controller/auth.controller.js:35-42,83-93` |
| Password hashing | `bcryptjs.hash(password, 10)` at registration and `bcrypt.compare` at login. | `backend/src/controller/auth.controller.js:27,75` |
| Token blacklist | Logout stores the token; `authUser` checks the blacklist before verifying the JWT. | `backend/src/controller/auth.controller.js:118`; `backend/src/middleware/auth.middleware.js:17-29` |
| Backend auth middleware | Reads `req.cookies.token`, checks blacklist, verifies JWT, and assigns `req.user`. | `backend/src/middleware/auth.middleware.js:7-32` |
| Protected interview routes | All four interview route declarations use `authMiddleware.authUser`. | `backend/src/routes/interview.routes.js:16,23,31,39` |
| Frontend route protection | `Protected` redirects unauthenticated users to `/login`. | `frontend/src/features/auth/components/Protected.jsx:4-15` |
| Role-based access | None found. User schema has no role field and no role/permission checks were found. | `backend/src/models/user.models.js:3-22`; searches of `backend/src` and `frontend/src`. |
| HTTP input validation | Manual checks for registration fields, job description, resume/self-description, PDF signature, and extracted PDF text. | `backend/src/controller/auth.controller.js:11-17`; `backend/src/controller/interview.controller.js:13-49` |
| AI response validation | Zod v3 schema validates score, questions, skill gaps, and plan before report persistence. | `backend/src/services/ai.service.js:2-35`; `backend/src/controller/interview.controller.js:54-59` |
| Mongoose validation | Required fields, number bounds, and enum values are declared in model schemas. | `backend/src/models/user.models.js`; `backend/src/models/interviewReport.model.js` |
| CORS | Allows `http://localhost:5173` with credentials. | `backend/src/app.js:9-13` |
| Rate limiting | None found in authored source or backend middleware. | Search of `backend/src` and `frontend/src`; no rate-limiting package is declared in `backend/package.json`. |
| Security headers / Helmet | No Helmet middleware or equivalent security-header middleware found. | `backend/src/app.js`; backend dependencies in `backend/package.json`. |
| Cookie security attributes | `res.cookie("token", token)` is called without explicit cookie options in registration/login. `HttpOnly`, `Secure`, and `SameSite` are not configured in those calls. | `backend/src/controller/auth.controller.js:43,94` |
| Webhook signature verification | No webhook endpoints or signature verification found. | Route and source searches. |

## 5. Integrations and infrastructure

| Category | Finding | Evidence |
| --- | --- | --- |
| AI API | Google Gemini model `gemini-3-flash-preview`, configured with API version `v1beta`, used for interview reports and resume HTML. | `backend/src/services/ai.service.js:1-9,47-54,101-108` |
| Database | MongoDB via Mongoose and `MONGO_URI`. | `backend/src/config/database.js:1-11` |
| File storage | No external object-storage service found. Multer uses memory storage with a 3 MB limit; extracted resume text is saved in MongoDB. | `backend/src/middleware/file.middleware.js:3-8`; `backend/src/controller/interview.controller.js` |
| PDF processing/generation | `pdf-parse` extracts uploaded PDF text; Puppeteer renders generated HTML as a PDF. | `backend/src/controller/interview.controller.js:1,31-43`; `backend/src/services/ai.service.js:64-77` |
| Payments | No payment gateway integration found. |
| Email/SMS | No email or SMS integration found. |
| Analytics | No analytics integration found. |
| Supabase/Firebase | No direct client or backend integration found. |
| Docker | No authored Dockerfile or Compose file found. |
| CI/CD | No authored `.github/workflows` or other CI configuration found. `.github` workflow files present under `node_modules` were excluded. |
| Deployment scripts | No authored deployment scripts found. |
| Environment variables | Backend calls `dotenv.config()` and reads `MONGO_URI`, `JWT_SECRET`, and `GOOGLE_GENAI_API_KEY`. No frontend `import.meta.env` references found. | `backend/server.js:1`; `backend/src/config/database.js:6`; `backend/src/controller/auth.controller.js:38,89`; `backend/src/services/ai.service.js:8` |

## 6. Testing

| Measure | Count | Evidence |
| --- | ---: | --- |
| Authored test files | 0 found | Project-file search excluded `node_modules` and generated directories; no authored `*.test.*`, `*.spec.*`, or test directory was found. |
| Authored `it()` / `test()` cases | 0 found | No authored test files/cases found. |
| Backend test script | 1 placeholder, 0 tests | `backend/package.json` defines `"test": "echo \"Error: no test specified\" && exit 1"`. |
| Frontend test script | 0 | `frontend/package.json` defines `dev`, `build`, `lint`, and `preview`; no test script. |

Third-party dependency test files under `node_modules` were excluded and are not project tests.

## 7. Repository statistics

### Source line counts

The command counted physical lines in authored-looking source extensions (`.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss`, `.html`, `.sql`, `.py`, `.sh`, `.yaml`, `.yml`) after excluding dependencies, generated files, maps, and lock files.

| Top-level folder | Physical source lines | Confidence | Qualification |
| --- | ---: | --- | --- |
| `backend/` | 587 | Medium | Includes backend source and `server.js`; physical lines include blank lines and comments. |
| `frontend/` | 1,600 | Medium | Includes source, Vite config, and `index.html`; physical lines include blank lines and comments. Some files may be scaffold/template code. |
| **Total counted source files** | **2,187** | Medium | Repository source line count, not verified lines personally authored by the user. |

**Personal-authorship LOC: UNCLEAR.** The workspace contains Vite starter files and no usable Git history or authorship metadata, so the exact amount written by the user cannot be established.

### Git history

| Statistic | Result | Reason |
| --- | --- | --- |
| Total commits | NOT FOUND | `git log` failed with “not a git repository.” |
| First commit date | NOT FOUND | No `.git` repository is present at `D:\GenAI`. |
| Last commit date | NOT FOUND | No `.git` repository is present at `D:\GenAI`. |
| Contributors | NOT FOUND | `git shortlog` cannot enumerate authors without repository history. |

The piped `git log --oneline | Measure-Object -Line` produced zero pipeline output because `git log` failed; that is **not** evidence of zero commits.

## 8. Resume-safe summary

The following table contains counted claims and their evidence. “High” means the count is directly visible in source; it does not establish personal authorship or production use.

| Claim | Number | Evidence | Confidence |
| --- | ---: | --- | --- |
| Custom Express REST endpoints | 8 | `backend/src/routes/auth.routes.js:15,23,31,39`; `backend/src/routes/interview.routes.js:16,23,31,39`; mounts in `backend/src/app.js:20-21` | High |
| React Router routes | 4 | `frontend/src/app.routes.jsx:11,15,19,23` | High |
| React component definitions | 10 | Definitions in `frontend/src/App.jsx`, `frontend/src/features/auth.context.jsx`, `frontend/src/features/interview/interview.context.jsx`, auth pages/components, and interview pages | High |
| Repeated-use component definitions | 3, using the explicit rule above | `Protected`, `QuestionCard`, `RoadMapDay` | Medium |
| Registered Mongoose models | 3 | `user.models.js:24`, `blacklist.models.js:12`, `interviewReport.model.js:100` | High |
| Embedded report schemas | 4 | `interviewReport.model.js:4,21,38,52` | High |
| Declared Mongoose reference fields | 1 | `interviewReport.model.js:86-90`; target/model-name mismatch makes effective relation unclear | Medium |
| Unique index options declared | 2 | `user.models.js:7,13`; live database indexes not queried | Medium |
| Authored migrations | 0 found | Filtered project file inventory | High |
| Authored test files/cases | 0 found | Filtered project file inventory and package scripts | High |
| Admin dashboard routes/modules | 0 found | Authored frontend/backend route and module searches | High |
| Physical source lines in backend/frontend | 587 / 1,600 | Filtered source-line command above | Medium |
| Commits / dates / contributors | NOT FOUND | Git commands failed because workspace root is not a repository | High for unavailability |

### Resume bullet suggestions

These suggestions use only high-confidence source facts. They describe implementation visible in the workspace; use them only if you personally authored or can substantiate that work.

- Implemented **8 Express 5 REST endpoints** for authentication and interview-report workflows.
- Built a **4-route React Router application** for account access, report generation, and report viewing.
- Defined **3 Mongoose models** and **4 embedded report schemas** for users, token blacklisting, and interview preparation data.
- Implemented **1-day JWT authentication** with bcrypt password hashing and a MongoDB token blacklist.
- Added PDF resume text extraction with Multer and pdf-parse, enforcing a **3 MB upload limit**.
- Integrated Gemini structured-output generation with Zod validation for **5 required report data categories**.
