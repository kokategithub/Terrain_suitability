# EcoTourism Suitability Predictor

A full-stack web app that predicts ecotourism suitability using Google Earth Engine satellite data and a trained machine-learning model. The frontend is built with React + TypeScript + Vite, and the backend runs on Node.js / Express.

---

## Quick Start

**Step 1 — Install dependencies**

```bash
npm install
```

**Step 2 — Set up environment variables**

```bash
cp .env.example .env
```

Then open `.env` and fill in your Google Earth Engine service account details (see the Getting Started section below for what each variable means).

**Step 3 — Start the backend**

```bash
npm run backend
```

**Step 4 — Start the frontend** (open a new terminal)

```bash
npm run dev
```

**Step 5 — Open the app**

Go to `http://localhost:5173` in your browser.

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **Python** 3.9+ (required by the prediction model)
- A **Google Earth Engine** service account with a JSON key file

### Step 1 — Clone and install dependencies

```bash
git clone <your-repo-url>
cd Website
npm install
```

### Step 2 — Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable | Description |
|---|---|
| `GEE_SERVICE_ACCOUNT` | Your GEE service account email |
| `GEE_KEY_FILE` | Path to your service account JSON key (e.g. `service-account.json`) |
| `PORT` | Backend port (default: `3001`) |
| `FRONTEND_ORIGIN` | Frontend origin for CORS (default: `http://localhost:5173`) |

Place your service account JSON key file at the path you set for `GEE_KEY_FILE` (project root by default). **Never commit this file to Git.**

### Step 3 — Start the backend

```bash
npm run backend
```

Or with auto-restart on file changes:

```bash
npm run backend:dev
```

The backend will start at `http://localhost:3001`. You can verify it is running at `http://localhost:3001/api/health`.

### Step 4 — Start the frontend (in a separate terminal)

```bash
npm run dev
```

The frontend will start at `http://localhost:5173` (or the next available port).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite frontend dev server |
| `npm run backend` | Start the Express backend server |
| `npm run backend:dev` | Start the backend with file-watching (auto-restart) |
| `npm run build` | Type-check and build the frontend for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

---

## Project Structure

```
Website/
  backend/
    config/         Suitability scoring config
    middleware/     Request validation
    model/          ML model files and inference script (Python)
    routes/         Express route handlers
    services/       GEE and prediction services
    server.js       Entry point
  src/
    components/     React UI components
    pages/          Page-level components
    services/       Frontend API service layer
    types/          TypeScript type definitions
  public/           Static assets
```

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet
- **Backend:** Node.js, Express, Google Earth Engine SDK
- **ML Model:** Python, PyTorch (Attention U-Net)
