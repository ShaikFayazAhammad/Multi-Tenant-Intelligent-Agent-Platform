# BFSI Multi‑Tenant Intelligent Agent Platform – Admin Portal

## Overview

A premium, glass‑morphic admin console for super‑admins to manage **organizations**, **projects**, **agents**, **prompt & guardrails**, **knowledge bases**, **API vaults**, and an interactive **playground**. The UI follows a dark‑mode aesthetic with smooth micro‑animations, vibrant gradients, and a responsive layout.

## Features

| Section | What it does |
|---|---|
| **Dashboard** | Real‑time KPIs, agent status breakdown, channel distribution, top intents, audit logs |
| **Organizations & Credentials** | Create tenant organizations, onboard users with roles (supervisor, lead) |
| **Projects & Agents** | One‑org → many‑projects → many‑agents hierarchy, live/paused/draft lifecycle toggles |
| **Prompt Config** | System prompt editor, two‑pass guardrails, PII masking toggle, LLM model & temperature settings |
| **Knowledge Base** | Web‑crawler URL ingestion, file upload with progress, vector‑store overview |
| **API Vault** | Register external tools, Fernet‑AES‑256 encrypted secrets, live endpoint tester |
| **Playground** | Simulated end‑to‑end agent flow with RAG passages, telemetry, escalation flags |

## Tech Stack

- **Frontend**: Vite + React (TSX) – vanilla CSS design system (`src/index.css`).
- **Backend**: FastAPI (already in the repository) exposing `/admin/*` routes.
- **Auth**: Simple JWT stored in `localStorage` (`adminApi.login`).
- **Vector Store**: ChromaDB (handled by the backend).
- **LLM**: OpenRouter models (configurable in Prompt Config).

## Getting Started

```bash
# Clone the repo (if not already done)
git clone https://github.com/your-org/Multi-Tenant-Intelligent-Agent-Platform.git
cd Multi-Tenant-Intelligent-Agent-Platform/frontend/admin-portal

# Install dependencies
npm install

# Run the dev server
npm run dev
```

The dev server will start at `http://localhost:3001` and proxy API calls to the FastAPI backend (`http://localhost:8000`).

## Directory Layout

```
src/
├─ components/
│   └─ layout/          # Sidebar & Header
├─ views/               # 7 screen components
│   ├─ DashboardView.tsx
│   ├─ OrganizationsView.tsx
│   ├─ AgentsView.tsx
│   ├─ PromptConfigView.tsx
│   ├─ KnowledgeBaseView.tsx
│   ├─ ApiVaultView.tsx
│   └─ PlaygroundView.tsx
├─ services/api.ts      # Typed Axios wrapper
├─ types/index.ts       # Shared type definitions
├─ App.tsx              # Layout orchestration & state management
├─ main.tsx             # React entry point
└─ index.css            # Global design system
```

## Usage Tips

- **Navigation** – Click items in the left sidebar to switch between screens.
- **Org/Project Selectors** – Use the header dropdowns to scope actions to a specific organization and project.
- **Live Updates** – After creating an org, project, or integration, the UI automatically refreshes the lists.
- **Playground** – Test agent behaviour without affecting production; you can view RAG passages and telemetry.
- **Toast Notifications** – Success, error, and info messages appear at the top‑right and disappear after 5 seconds.

## Customisation

- **Theme** – Adjust CSS variables in `src/index.css` (e.g., `--color-indigo`).
- **LLM Models** – Extend `LLM_MODELS` in `PromptConfigView.tsx` with new OpenRouter identifiers.
- **Domain Templates** – Add new templates via the backend `/admin/templates` endpoint; they appear in the Prompt Config view.

---

*Built with love for the BFSI sector – a seamless, premium admin experience.*
