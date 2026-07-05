# 🚗 EdgeAI — Vehicle Health & Predictive Maintenance

> Real-time edge AI platform for vehicle health monitoring, anomaly detection using Welford's Online Algorithm, and predictive maintenance powered by Google Gemini.

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?logo=google&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

---

## What It Does

EdgeAI simulates an **on-vehicle edge computing system** that monitors sensor telemetry in real-time, detects anomalies using statistical methods, and provides AI-powered diagnostics — all without relying on cloud round-trips for critical decisions.

### Key Features

- **🔴 Live Sensor Dashboard** — 6 sensors streaming at 300ms intervals via SSE (Engine Temp, Vibration, Oil Pressure, Battery Voltage, Coolant Flow, Exhaust Temp)
- **📊 Welford's Online Algorithm** — Incremental mean/variance computation for memory-efficient anomaly detection on edge hardware
- **⚡ Z-Score Anomaly Detection** — Real-time statistical outlier detection with configurable warning/critical thresholds
- **🔗 Pearson Correlation Engine** — Detects cross-sensor correlations (e.g., coolant drop → engine temp rise) to identify cascading failures
- **🤖 Gemini AI Diagnostics** — Streaming AI-powered root cause analysis with full vehicle context, chat history, and actionable recommendations
- **🔧 Predictive Maintenance Planner** — AI-generated prioritized service schedules with RUL (Remaining Useful Life) tracking for 8 components
- **🚛 Fleet Management** — Multi-vehicle overview sorted by risk, with per-vehicle drill-down
- **💥 Failure Scenario Injection** — Trigger realistic failure patterns (cooling leak, brake degradation, oil starvation, etc.) to demo anomaly detection
- **⏱️ Edge vs Cloud Latency Race** — Visual comparison showing why edge inference matters for safety-critical decisions

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Dashboard)               │
│   SSE Stream ←── /api/sensors/stream                │
│   Gemini Chat ←── /api/ai/diagnose                  │
├─────────────────────────────────────────────────────┤
│                  Next.js Server (Edge Node)          │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Simulation     │  │ Welford's    │  │ Pearson  │ │
│  │ Engine         │→ │ Stats Engine │→ │ Corr.    │ │
│  │ (6 sensors)    │  │ + Z-Score    │  │ Detector │ │
│  └───────────────┘  └──────────────┘  └──────────┘ │
│          ↓                    ↓                      │
│  ┌───────────────┐  ┌──────────────┐                │
│  │ RUL Tracker    │  │ Anomaly Log  │                │
│  │ (8 components) │  │ + Alerts     │                │
│  └───────────────┘  └──────────────┘                │
│          ↓                    ↓                      │
│  ┌──────────────────────────────────┐               │
│  │     Google Gemini (Diagnostics)   │               │
│  └──────────────────────────────────┘               │
├─────────────────────────────────────────────────────┤
│  PostgreSQL (Optional — anomaly history, snapshots)  │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Recharts, Lucide Icons |
| Styling | Tailwind CSS 4, DM Sans + JetBrains Mono |
| Backend | Next.js API Routes, SSE (Server-Sent Events) |
| AI | Google Gemini 2.5 Flash (streaming) |
| Database | PostgreSQL + Prisma ORM (optional for demo) |
| Auth | NextAuth.js (JWT sessions) |
| Algorithms | Welford's Online Algorithm, Z-Score Detection, Pearson Correlation |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/abhinav-atul/edge-ai-vehicle-health.git
cd edge-ai-vehicle-health

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

```
Email:    admin@edgeai.com
Password: admin123
```

### Optional: Database (PostgreSQL)

The app works fully without a database. To enable anomaly history persistence:

```bash
# Start a local Postgres container
docker run -d --name edgeai-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=edgeai \
  -p 5433:5432 postgres:16

# Run migrations
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

### Optional: AI Diagnostics (Gemini)

Add your Google Gemini API key to `.env`:

```
GEMINI_API_KEY=your-api-key-here
```

The app shows a graceful error message if the key is not configured.

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── ai/              # Gemini streaming diagnostics
│   │   ├── anomaly/          # Anomaly injection & logging
│   │   ├── auth/             # NextAuth authentication
│   │   ├── fleet/            # Fleet status endpoint
│   │   ├── health/           # Health score & history
│   │   ├── maintenance/      # Maintenance plan generation
│   │   └── sensors/stream/   # SSE sensor telemetry stream
│   ├── dashboard/            # Live telemetry monitor
│   ├── diagnostics/          # AI diagnostic chat
│   ├── fleet/                # Fleet overview
│   ├── history/              # Anomaly history
│   ├── login/                # Authentication
│   └── maintenance/          # Predictive maintenance
├── components/               # Reusable UI components
├── lib/
│   ├── engine.ts             # Simulation engine + Welford's + Z-Score
│   ├── fleet.ts              # Multi-vehicle fleet manager
│   ├── gemini.ts             # Gemini AI integration
│   └── prisma.ts             # Database client
└── prisma/                   # Schema & migrations
```

---

## Algorithms

### Welford's Online Algorithm
Computes running mean and variance in a single pass with O(1) memory — ideal for resource-constrained edge devices that can't store full sensor history.

### Z-Score Anomaly Detection
Uses the Welford-computed statistics to flag readings that deviate significantly from the running mean. Configurable thresholds: **Warning** at Z > 2.5, **Critical** at Z > 3.75.

### Pearson Correlation Detection
Monitors cross-sensor relationships in sliding windows to detect cascading failures (e.g., coolant flow drop correlating with engine temperature rise).

---

## Note

This is a **hackathon prototype**. Sensor data is simulated using a mathematical engine with Gaussian noise and configurable failure scenarios. In production, the simulation engine would be replaced with real OBD-II / CAN bus telemetry from vehicle hardware, while the anomaly detection algorithms (Welford's, Z-Score, Pearson) would operate on real data without changes.

---

## Team

Built for hackathon demonstration.
