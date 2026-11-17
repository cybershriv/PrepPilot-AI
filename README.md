# PrepPilot AI

PrepPilot AI is an AI-powered interview preparation application. Users can register, sign in, submit a job description and either a PDF resume or a self-description, then receive a tailored interview report. Reports include a match score, technical and behavioral questions, skill gaps, and a preparation plan. A generated resume can also be downloaded as a PDF.

This repository contains a React/Vite frontend and a Node.js/Express backend. MongoDB stores users, token blacklist entries, and interview reports. The backend uses the Google GenAI SDK to generate report content.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Configuration](#configuration)
- [Installation and development](#installation-and-development)
- [Application workflow](#application-workflow)
- [HTTP API](#http-api)
- [Report data](#report-data)
- [Validation and limits](#validation-and-limits)
- [Scripts and checks](#scripts-and-checks)
- [Troubleshooting](#troubleshooting)
- [Security and deployment notes](#security-and-deployment-notes)

## Features

- Account registration, login, logout, and current-user lookup.
- JWT-based authentication stored in a cookie.
- Protected interview preparation pages.
- Resume upload as a PDF, with text extraction on the backend.
- Resume-free generation using a self-description.
- AI-generated match score, technical questions, behavioral questions, skill gaps, and preparation roadmap.
- Per-user interview report listing and report details.
- AI-generated resume PDF download.
- Client- and server-side validation for required inputs, PDF format, file size, extracted text, and AI output.

## Architecture

The application has two independently installed packages:

```text
PrepPilot AI/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── config/
│       ├── controller/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── services/
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── app.routes.jsx
│       └── features/
└── README.md
```

### Backend

- [backend/server.js](backend/server.js) loads environment variables, starts the Express server on port `3000`, and initiates the MongoDB connection.
- [backend/src/app.js](backend/src/app.js) configures JSON parsing, cookie parsing, CORS, and route mounting.
- [backend/src/routes/](backend/src/routes) declares authentication and interview endpoints.
- [backend/src/controller/](backend/src/controller) implements request handling and persistence.
- [backend/src/middleware/](backend/src/middleware) contains JWT authentication and PDF upload handling.
- [backend/src/models/](backend/src/models) defines the Mongoose user, blacklist, and report schemas.
- [backend/src/services/ai.service.js](backend/src/services/ai.service.js) calls Gemini, validates the expected report structure, and generates resume PDFs with Puppeteer.
- [backend/src/config/database.js](backend/src/config/database.js) connects Mongoose to MongoDB using `MONGO_URI`.

### Frontend

- [frontend/src/App.jsx](frontend/src/App.jsx) composes the authentication and interview providers with the router.
- [frontend/src/app.routes.jsx](frontend/src/app.routes.jsx) defines the login, registration, home, and report routes.
- [frontend/src/features/auth/](frontend/src/features/auth) contains authentication pages, hooks, and API calls. The auth context is currently located at [frontend/src/features/auth.context.jsx](frontend/src/features/auth.context.jsx).
- [frontend/src/features/interview/](frontend/src/features/interview) contains the interview form, report view, context, hooks, API calls, and styles.
- Axios clients in the auth and interview API modules call `http://localhost:3000` and send cookies with requests.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, React Router, Vite 8, Axios, Sass |
| Backend | Node.js, Express 5, CommonJS |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens, bcryptjs, cookie-parser |
| Resume processing | Multer in-memory uploads, pdf-parse |
| AI | `@google/genai`, Gemini `gemini-3-flash-preview`, Zod structured-output validation |
| PDF generation | Puppeteer |

## Requirements

- Node.js `22.12` or newer. This satisfies the installed Vite and Puppeteer runtime requirements.
- npm.
- A MongoDB instance, local or hosted.
- A Google Gemini API key with access to the configured model.
- A modern browser for the React application.

The backend and frontend have separate `package.json` files and separate dependency installations. There is no root-level npm workspace or combined development command.

## Configuration

Create `backend/.env` and set the following variables:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/genai_interview
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_GENAI_API_KEY=replace-with-your-google-genai-api-key
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string used by Mongoose. |
| `JWT_SECRET` | Yes | Secret used to sign and verify authentication tokens. |
| `GOOGLE_GENAI_API_KEY` | Yes | API key used by the Google GenAI SDK. |

The backend loads `.env` from the backend working directory through `dotenv` in `server.js`. Copy `backend/.env.example` to `backend/.env` and replace its placeholders with local values. Do not put real credentials in source code, screenshots, or commits.

The frontend API base URL is currently hard-coded as `http://localhost:3000` in:

- [frontend/src/features/auth/services/auth.api.js](frontend/src/features/auth/services/auth.api.js)
- [frontend/src/features/interview/services/interview.api.js](frontend/src/features/interview/services/interview.api.js)

The backend CORS configuration currently allows `http://localhost:5173` with credentials. If either development server is moved to another host or port, update the API base URLs and backend CORS origin together.

## Installation and development

### 1. Install backend dependencies

From the repository root:

```sh
cd backend
npm install
```

Create `backend/.env` as described above, and make sure MongoDB is reachable at `MONGO_URI`.

### 2. Start the backend

In the backend directory:

```sh
npm run dev
```

The backend uses Nodemon and listens on `http://localhost:3000`.

Expected startup messages include:

```text
Server is running on port 3000
Connect to DB
```

The server starts listening while the database connection is initiated. Confirm both messages and check the terminal for database errors; the “server is running” message by itself does not prove MongoDB connected successfully.

### 3. Install frontend dependencies

Open a second terminal from the repository root:

```sh
cd frontend
npm install
```

### 4. Start the frontend

In the frontend directory:

```sh
npm run dev
```

Vite serves the application at `http://localhost:5173` by default. Keep both development servers running while using the app.

### 5. Use the application

1. Open `http://localhost:5173`.
2. Register a new account or sign in.
3. Enter a job description.
4. Upload a text-based PDF resume of up to 3 MB, or enter a self-description. A resume is optional when a self-description is provided.
5. Generate the interview report.
6. Open technical questions, behavioral questions, and the preparation roadmap.
7. Download the generated resume PDF when needed.

## Application workflow

### Authentication

1. The frontend submits registration or login credentials to the backend.
2. The backend hashes registration passwords with bcrypt and issues a JWT after successful registration or login.
3. The JWT is sent in a cookie named `token`.
4. The frontend Axios clients use `withCredentials: true`; the backend CORS configuration permits credentials from the configured frontend origin.
5. On application startup, the auth hook requests `/api/auth/get-me` to restore the current user.
6. Protected routes redirect unauthenticated users to `/login`.
7. Logout blacklists the current token in MongoDB and clears the cookie.

JWTs are signed with `JWT_SECRET` and currently expire after one day.

### Interview report generation

1. The frontend submits `jobDescription`, `selfDescription`, and an optional `resume` file as `multipart/form-data`.
2. Multer stores the upload in memory and enforces a 3 MB limit.
3. The backend verifies that an uploaded file is a PDF and extracts its text with pdf-parse. Empty/unextractable PDF text is rejected with a client error.
4. If no resume is uploaded, a non-empty self-description is required.
5. The backend sends the extracted resume text, self-description, and job description to Gemini.
6. The model response is checked against the report schema before it is saved. Incomplete responses are rejected instead of being stored as reports with missing fields.
7. The report is saved in MongoDB and returned to the frontend.

The original PDF is held in memory during the request. The report stores extracted resume text rather than the uploaded PDF file itself.

### Resume PDF generation

The backend requests HTML resume content from Gemini, renders it with Puppeteer, and returns it as an `application/pdf` download.

## HTTP API

All API routes are mounted on `http://localhost:3000`. Authentication uses the `token` cookie unless a route is explicitly marked public.

### Authentication endpoints

| Method | Path | Access | Request | Success |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | JSON: `username`, `email`, `password` | `201`; creates the account, sets a token cookie, returns the user. |
| `POST` | `/api/auth/login` | Public | JSON: `email`, `password` | `200`; sets a token cookie and returns the user. |
| `GET` | `/api/auth/logout` | Public | Token cookie, if present | `200`; blacklists the token and clears the cookie. |
| `GET` | `/api/auth/get-me` | Authenticated | Token cookie | `200`; returns the current user. |

Example registration request:

The `curl` examples use Bash/Git Bash line continuations. In PowerShell, use `curl.exe` and either put each command on one line or replace the continuation characters with PowerShell backticks.

```sh
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"username":"sample-user","email":"user@example.com","password":"replace-this"}' \
  http://localhost:3000/api/auth/register
```

`cookies.txt` contains an authentication cookie; keep it private and do not commit it.

### Interview endpoints

| Method | Path | Access | Request | Success |
| --- | --- | --- | --- | --- |
| `POST` | `/api/interview/` | Authenticated | Multipart: `jobDescription`, optional `selfDescription`, optional `resume` PDF | `201`; returns the saved report. |
| `GET` | `/api/interview/` | Authenticated | No body | `200`; returns the current user’s report summaries. |
| `GET` | `/api/interview/report/:interviewId` | Authenticated | Report ID in the path | `200`; returns the matching report for the current user, or `404`. |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Authenticated | Report ID in the path | `200`; returns a PDF attachment. |

Example login followed by report generation:

```sh
curl -i -c cookies.txt -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"replace-this"}' \
  http://localhost:3000/api/auth/login

curl -i -b cookies.txt \
  -F 'jobDescription=Senior software engineer role requiring React and Node.js experience' \
  -F 'selfDescription=Five years of experience building web applications' \
  -F 'resume=@./resume.pdf;type=application/pdf' \
  http://localhost:3000/api/interview/
```

For self-description-only generation, omit the `resume` form field and provide a non-empty `selfDescription`. Requests must include a non-empty `jobDescription`.

Example report retrieval:

```sh
curl -i -b cookies.txt \
  http://localhost:3000/api/interview/report/REPORT_ID
```

### Common response codes

| Status | Meaning |
| --- | --- |
| `200` | Request completed successfully. |
| `201` | Account or interview report created successfully. |
| `400` | Invalid/missing input, invalid PDF, or unsupported upload. |
| `401` | Missing, invalid, expired, or blacklisted authentication token. |
| `404` | Requested report or route was not found. |
| `413` | Resume upload exceeded the 3 MB limit. |
| `502` | Gemini returned a report that did not satisfy the required report schema. |
| `500` | Unexpected backend, database, PDF parsing, or service error. |

## Report data

An interview report contains:

| Field | Description |
| --- | --- |
| `title` | AI-generated role title, or `Interview Plan` if the model omits it. |
| `jobDescription` | Submitted target job description. |
| `resume` | Text extracted from the uploaded PDF; empty when using self-description only. |
| `selfDescription` | Submitted candidate description. |
| `matchScore` | Numeric match score from 0 to 100. |
| `technicalQuestions` | Technical interview questions with intention and suggested answer. |
| `behavioralQuestions` | Behavioral questions with intention and suggested answer. |
| `skillGaps` | Skill gaps and severity (`low`, `medium`, or `high`). |
| `preparationPlan` | Day-by-day preparation focus and tasks. |
| `user` | Reference to the account that generated the report. |
| `createdAt`, `updatedAt` | Mongoose timestamps. |

The current report validator requires a score, at least one technical question, at least one behavioral question, and at least one preparation-plan day. `skillGaps` may be empty.

## Validation and limits

- Job description is required.
- A resume PDF or a non-empty self-description is required.
- Resume uploads must be valid PDFs and no larger than 3 MB.
- The PDF must contain extractable text. Scanned/image-only PDFs are not OCR-processed.
- DOCX is not supported.
- The AI response must match the structured report schema before it is persisted.
- Uploaded files are processed in memory; the backend does not persist the original PDF.
- The current frontend and backend API URLs, allowed CORS origin, and server port are configured in source rather than environment variables.

## Scripts and checks

### Frontend

Run these commands from `frontend/`:

```sh
npm run dev
npm run lint
npm run build
npm run preview
```

### Backend

Run this command from `backend/`:

```sh
npm run dev
```

The backend package currently has a placeholder `test` script that exits with “Error: no test specified”; no backend automated test suite is configured.

## Troubleshooting

### `401 Unauthorized` from `/api/auth/get-me`

This endpoint is protected. Register or sign in first. If it still returns `401` after login, confirm that the browser accepted the `token` cookie and sends it with requests. Check that the frontend origin matches the CORS origin in `backend/src/app.js`.

### `400` when generating a report

Check that the job description is populated and that either a PDF resume or self-description is provided. For uploads, select a valid PDF with extractable text and keep it at or below 3 MB. DOCX and scanned/image-only PDFs are not supported.

### `413` when uploading a resume

The backend upload limit is 3 MB. Use a smaller PDF.

### `502 AI returned an incomplete report`

The backend received a model response, but required report fields were missing or invalid. The response is intentionally rejected rather than saved as an empty report. Check the backend terminal for the invalid field paths, confirm `GOOGLE_GENAI_API_KEY` is valid and has access to the configured Gemini model, then retry with a complete job description and resume/self-description. The application uses `gemini-3-flash-preview` with API version `v1beta`.

### MongoDB connection errors

Confirm MongoDB is running or that the hosted database is reachable, and verify `MONGO_URI` in `backend/.env`. Check for the `Connect to DB` startup message; the HTTP listener can start even when the database connection fails.

### Sass deprecation warnings

The frontend styles currently use Sass color functions such as `lighten()` and `darken()`. Sass may print deprecation warnings for these functions. They are warnings and do not, by themselves, prevent Vite from serving the app.

### Port already in use

The backend listens on port `3000`; Vite uses port `5173` by default. Stop the process using the occupied port or update the backend API URL and CORS origin consistently before changing ports.

## Security and deployment notes

- Keep `.env`, API keys, JWT secrets, cookie jars, and user data out of source control.
- Use a strong, unique `JWT_SECRET` outside local development.
- The current configuration is intended for local development. Before deployment, configure production origins, HTTPS, secure and HTTP-only cookie attributes, CSRF protections, secret management, request logging, rate limits, and database access controls.
- Restrict access to generated reports and uploaded resume data. Reports contain personal information and extracted resume text.
- Review the authorization behavior for every report-related endpoint before exposing the service publicly.
- The backend currently listens on a fixed port and the frontend API base URL/CORS origin are hard-coded; make these configurable as part of a production deployment.
