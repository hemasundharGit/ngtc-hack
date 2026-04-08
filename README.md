# MediGenie

MediGenie is a full-stack healthcare assistant demo with a Next.js frontend and a FastAPI backend. It supports text chat, voice-note analysis, medical image upload, audio replies, persisted chat history, and Docker-based deployment.

## Features

- Text-based healthcare assistant chat
- Voice upload and transcription workflow
- Medical image upload with diagnosis-style response
- Audio reply generation from backend responses
- Persistent chat sessions with sidebar history
- Insights panel for diagnoses, images, and symptom trends
- Docker and Jenkins pipeline support
- Next.js standalone output for production builds

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Framer Motion, Zustand
- Backend: FastAPI, Python 3.12
- AI integrations: Groq text, vision, and Whisper-compatible transcription flow
- Deployment: Docker Compose, Jenkins
- Mobile wrapper: Capacitor config is present in the repo

## Project Structure

```text
MediGenie/
|-- app/                     # Next.js app router entrypoints
|-- components/medigenie/    # UI shell, sidebar, chat, insights, input
|-- lib/                     # API client, store, shared types, UI utils
|-- mcrd/                    # FastAPI backend and AI service integrations
|-- Dockerfile               # Frontend container
|-- docker-compose.yml       # Frontend + backend local deployment
|-- Jenkinsfile              # CI/CD pipeline
|-- capacitor.config.ts      # Capacitor config
```

## Prerequisites

- Node.js 20+
- npm
- Python 3.12+
- FFmpeg available for backend audio handling
- A Groq API key for backend AI features

## Environment Variables

### Frontend

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

There is also a sample file at [.env.local.example](/c:/Users/HP%20India/OneDrive/Desktop/MediGenie/.env.local.example).

### Backend

Create `mcrd/.env` with at least:

```env
GROQ_API_KEY=your_api_key_here
GROQ_TEXT_MODEL=llama-3.3-70b-versatile
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
WHISPER_MODEL=whisper-large-v3
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
LOG_LEVEL=INFO
```

## Local Development

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Start the frontend

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`.

### 3. Set up the backend

```bash
cd mcrd
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

macOS/Linux:

```bash
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will run on `http://127.0.0.1:8000`.

## Docker Usage

To run both services together:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

The compose file builds:

- frontend from [`Dockerfile`](/c:/Users/HP%20India/OneDrive/Desktop/MediGenie/Dockerfile)
- backend from [`mcrd/Dockerfile`](/c:/Users/HP%20India/OneDrive/Desktop/MediGenie/mcrd/Dockerfile)

## Available API Endpoints

- `GET /health` - backend health check and Groq configuration status
- `POST /chat` - text chat request
- `POST /voice` - audio upload and diagnosis response
- `POST /image` - image upload plus query for image analysis
- `GET /audio/{filename}` - generated audio reply files

## Quality Checks

Frontend:

```bash
npx tsc --noEmit
npm run lint
```

Backend:

```bash
python -m py_compile mcrd/main.py mcrd/api_services.py
```

## Jenkins Pipeline

The included [`Jenkinsfile`](/c:/Users/HP%20India/OneDrive/Desktop/MediGenie/Jenkinsfile) performs:

- frontend dependency install and TypeScript validation
- backend dependency install and Python compile validation
- Trivy filesystem scan
- OWASP Dependency Check
- Docker image build
- optional image push on `main`
- deployment with `docker compose`

## Notes

- The frontend uses `output: "standalone"` in Next.js for container-friendly production output.
- Chat history is persisted locally in the browser using Zustand persistence.
- Capacitor configuration exists, but `capacitor.config.ts` currently points `webDir` to `build`, so it may need adjustment if you package the current Next.js output for mobile.
- This project is structured as an educational/demo healthcare assistant and should not be treated as a substitute for medical diagnosis or emergency care.

## License

No license file is currently included in this repository.
