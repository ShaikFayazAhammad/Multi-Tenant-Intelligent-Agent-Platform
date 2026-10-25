# BFSI Multi-Tenant Intelligent Agent Platform (SaaS)

<p align="center">
  <strong>Production-Ready · Config-Driven · Multi-Tenant Isolated</strong>
</p>

A production-ready, multi-tenant SaaS platform engineered for **BFSI (Banking, Financial Services, and Insurance)** enterprises. It features strict tenant data isolation, config-driven agent orchestration via LangGraph, per-project RAG vector search (ChromaDB), OpenRouter multi-model LLM inference with automatic fallback, Fernet AES-256 encrypted API tool execution, automated two-pass guardrails (PII masking & disclaimers), real-time WebSocket streaming with token-chunked delivery, ElevenLabs text-to-speech, web crawler knowledge ingestion, an agent playground simulator, and dual role-tailored web interfaces.

<p align="center">
  <img src="docs/images/visual-workflow-builder.png" alt="BFSI Visual Workflow Builder Studio" width="100%" style="border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);" />
</p>
<p align="center">
  <em>Visual Workflow Builder Studio — Drag-and-drop orchestration canvas with slide-in configuration drawer</em>
</p>

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Visual Workflow Builder Studio](#-visual-workflow-builder-studio)
3. [Key Features](#-key-features)
4. [Architecture Diagram](#-architecture-diagram)
5. [Technology Stack](#-technology-stack)
6. [Project & Directory Structure](#-project--directory-structure)
7. [Prerequisites](#-prerequisites)
8. [Environment Variables & Configuration](#-environment-variables--configuration)
9. [Database Setup & Schema](#-database-setup--schema)
10. [Installation & Quick Start](#-installation--quick-start)
11. [Default Seed Credentials](#-default-seed-credentials)
12. [API Endpoints Reference](#-api-endpoints-reference)
13. [Database Schema Details](#-database-schema-details)
14. [Testing Instructions](#-testing-instructions)
15. [Build & Deployment](#-build--deployment)
16. [Troubleshooting & Common Issues](#-troubleshooting--common-issues)
17. [Important Notes & Assumptions](#-important-notes--assumptions)

---

## 🌟 Project Overview

The BFSI Multi-Tenant Intelligent Agent Platform empowers financial organizations — banks, credit unions, insurance brokers, and investment firms — to deploy domain-specific conversational AI agents. Built with a fully config-driven architecture, administrators can define system prompts, domain guardrails, document knowledge bases (file upload & web crawling), external API tool definitions, and LLM model preferences dynamically — all without re-deploying code.

### How It Works

```
User Query → Input Guardrail (PII mask, topic block)
           → RAG Vector Search (ChromaDB, per-project isolated)
           → Dynamic Tool Matching (encrypted API integrations)
           → OpenRouter LLM Call (multi-model fallback chain)
           → Output Guardrail (PII mask, disclaimers, escalation)
           → Response Delivery (HTTP/WebSocket stream + optional TTS)
```

---

## 🧩 Visual Workflow Builder Studio

The **Visual Workflow Builder** is an end-to-end administration studio integrated directly into the Super Admin Portal (`http://localhost:3001` → `🧩 Visual Builder`). Rather than jumping across disconnected management tables, administrators can design, wire, deploy, and verify the entire multi-tenant platform hierarchy visually on an interactive canvas.

<p align="center">
  <img src="docs/images/visual-workflow-builder.png" alt="BFSI Visual Workflow Builder Canvas and Inspector Drawer" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</p>

### Key Studio Capabilities:
- **Compact Visual Graph Nodes**: Blocks on the canvas display clean, compact cards with live status badges (`🟢 Live` / `⚪ Draft` / `🟡 Paused`), domain identifiers, and animated SVG bezier connection wires.
- **Slide-in Configuration Drawer**: Clicking any block or action button slides in a dedicated right-side inspector drawer on the same page, keeping the canvas visible while editing.
- **Auto-Populate Live Hierarchy**: Automatically synthesizes and renders the active tenant topology (Organization → Projects → Agents → Prompts → RAG → Playground) on load.
- **Organization & Credential Onboarding**: Create new organizations and onboard operator credentials (`super_admin`, `supervisor`, `lead`) with email and temporary passwords.
- **Live Agent Lifecycle Control**: Switch agents instantly between `⚪ Draft` (staging only), `🟢 Live` (serving live client traffic), and `🟡 Paused` (maintenance mode).
- **In-Canvas RAG Ingestion**: Upload `.pdf` and documents or trigger web crawling directly within the Knowledge Base drawer with real-time vector chunk counts.
- **In-Canvas Agent Playground**: Run interactive simulation turns directly within the studio to inspect answers, latency, token consumption, and cited RAG passages.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Visual Workflow Builder Studio** | Interactive drag-and-drop orchestration canvas with SVG bezier connection wires, compact cards, and slide-in right drawer for managing Organizations, Credentials, Projects, Agents (Draft / Live / Pause), Prompts & Guardrails, RAG (PDF upload & web crawling), API Vault, and Playground simulations. |
| **Multi-Tenant Data Isolation** | Every relational entity and vector collection is scoped by `org_id` and `project_id` via JWT claims and FastAPI dependency injection. |
| **Config-Driven Dynamic Orchestrator** | LangGraph agent graphs are constructed at runtime per session using project configs (system prompts, temperature, model, enabled tools, guardrails). |
| **OpenRouter Multi-Model LLM** | Uses OpenRouter's OpenAI-compatible API with automatic fallback chain: `meta-llama/llama-3.1-8b-instruct` → `google/gemini-2.5-flash`. |
| **Per-Project RAG Isolation** | ChromaDB vector collections partitioned per project (`proj_{project_id}`) with `all-MiniLM-L6-v2` embeddings. Prevents cross-tenant knowledge leaks. Async execution (`asyncio.to_thread`) prevents event loop blocking. |
| **Web Crawler Knowledge Ingestion** | Crawl any public webpage, extract clean text (BeautifulSoup), chunk, and auto-index into the project's isolated vector store. |
| **Multi-Format Knowledge Base Ingestion** | Upload `.pdf`, `.csv`, `.txt`, `.md`, or `.json` files. PDFs are cleanly extracted via `pypdf` with page markers, text normalization, and unprintable byte stripping. Includes stale chunk purging and one-click re-indexing. |
| **External API Integrations Vault** | Secure REST API tool connector with **Fernet AES-256 encryption** for secrets. Supports Bearer token & API key auth. Live test-call execution from Admin portal. |
| **Two-Pass Guardrail Engine** | **Pass 1 (Input):** PII masking (credit cards, SSNs, emails, phone numbers), blocked topic detection. **Pass 2 (Output):** Output PII sanitization, mandatory disclaimer injection, negative-sentiment escalation triggers. |
| **Agent Lifecycle Management** | Three-state lifecycle (`Live` / `Paused` / `Draft`). Only Live agents respond to client queries; Paused/Draft agents return a status notice. Playground bypasses lifecycle gates. |
| **Agent Playground Simulator** | Full-stack simulation endpoint for admins: runs input guardrails → RAG → tool triggers → LLM → output guardrails with complete observability (latency, tokens, model, passages, flags). |
| **Real-Time Token Streaming** | Real-time token streaming over WebSocket (`MESSAGE_STREAM` / `MESSAGE_COMPLETE`) and HTTP Server-Sent Events (`POST /api/client/chat/stream`). Zero artificial buffering or fake delays. |
| **ElevenLabs Text-to-Speech** | Voice input triggers TTS audio generation via ElevenLabs API, base64-encoded and streamed back over WebSocket (`AUDIO_STREAM`). |
| **Multi-Portal Experience** | **Flagship Landing Page** (Port `3002` / `http://localhost:3002`): modern dark/light mode home screen, interactive video demo showcases, and direct portal navigation. **Super Admin Portal** (Port `3001` / `http://localhost:3001`): tenant, user, project, template, integration, KB, and guardrail management. **Client Operations Portal** (Port `3000` / `http://localhost:3000`): role-scoped dashboards, real-time WebSocket chat, conversation history, and voice AI. |
| **Immutable Audit Logs** | Security audit trail capturing all administrative events, scoped by organization. |

---

## 🏗️ Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FRONTEND (React + Vite + TS)                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────────────────┐ │
│  │ Flagship Landing     │  │ Super Admin Portal   │  │ Client Operations Portal      │ │
│  │ (Port 3002)          │  │ (Port 3001)          │  │ (Port 3000)                   │ │
│  │ • Dark/Light Mode    │  │ • Org Management     │  │ • WebSocket Real-Time Chat    │ │
│  │ • 2 Video Demo Slots │  │ • User CRUD          │  │ • HTTP Chat Fallback          │ │
│  │ • Direct Portal CTAs │  │ • Project Config     │  │ • Conversation History        │ │
│  │ • Creator Profiles   │  │ • KB Upload/Crawl    │  │ • Analytics Dashboard         │ │
│  │ • GitHub Repo Link   │  │ • Integration Vault  │  │ • Voice Input (STT) + TTS     │ │
│  │ • BFSI SaaS Hero     │  │ • Agent Playground   │  │ • Role: Supervisor / Lead     │ │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────────────┬────────────────┘ │
└─────────────┼─────────────────────────┼─────────────────────────────┼──────────────────┘
              │ REST API + WebSocket           │
              ▼                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI · Port 8000)                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐                │
│  │ Auth Router   │  │ Admin Router  │  │Client Router│                │
│  │ /api/auth     │  │ /api/admin    │  │/api/client  │                │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘                │
│         │                 │                  │                        │
│  ┌──────▼─────────────────▼──────────────────▼──────┐                │
│  │          Dynamic Orchestrator (LangGraph)         │                │
│  │  Input Guardrails → RAG Query → Tool Exec → LLM  │                │
│  │              → Output Guardrails                  │                │
│  └───────┬──────────────┬────────────────┬──────────┘                │
│          │              │                │                            │
│  ┌───────▼─────┐ ┌──────▼──────┐ ┌──────▼────────┐                  │
│  │ ChromaDB    │ │ OpenRouter  │ │ ElevenLabs    │                  │
│  │ Vector Store│ │ LLM API    │ │ TTS API       │                  │
│  └─────────────┘ └─────────────┘ └───────────────┘                  │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────────┐                  │
│  │ MySQL 8.0 / SQLite  │  │ Web Crawler Service  │                  │
│  │ (SQLAlchemy 2.0)    │  │ (httpx + BS4)        │                  │
│  └─────────────────────┘  └──────────────────────┘                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Backend
| Component | Technology |
| :--- | :--- |
| **Runtime & Framework** | Python 3.10+ / FastAPI |
| **ORM & Database** | SQLAlchemy 2.0, PyMySQL, MySQL 8.0 (SQLite fallback for local dev) |
| **LLM Inference** | OpenRouter (OpenAI-compatible SDK) — Gemini 2.0 Flash, Gemini 2.5 Flash, LLaMA 3.1 8B |
| **Agent Orchestrator** | LangGraph / LangChain |
| **Vector Database (RAG)** | ChromaDB (persistent, per-project isolated collections) |
| **Embeddings** | `all-MiniLM-L6-v2` (local, zero-cost sentence-transformers) |
| **Security & Encryption** | Cryptography (Fernet AES-256), PyJWT (HS256), Passlib (Bcrypt) |
| **Web Crawling** | httpx (async HTTP) + BeautifulSoup4 (HTML parsing) |
| **Speech Synthesis** | ElevenLabs TTS API |
| **Migrations** | Alembic |

### Frontend
| Component | Technology |
| :--- | :--- |
| **Framework** | React 18 (TypeScript) |
| **Build System** | Vite |
| **UI Styling** | Tailwind CSS, Lucide React Icons |
| **HTTP Client** | Axios (with JWT interceptor) |
| **Real-Time Comms** | Native WebSocket Web API |
| **Voice Input** | Browser SpeechRecognition API |

---

## 📁 Project & Directory Structure

```
Multi-Tenant-Intelligent-Agent-Platform/
├── README.md                    # This documentation
├── db_schema.sql                # Complete MySQL DDL + seed data
├── schema.sql                   # Condensed schema reference
├── docker-compose.yml           # Multi-container orchestration
├── start.bat                    # Windows one-click launcher (all 3 services)
├── stop.bat                     # Windows service stopper
├── start.sh / stop.sh           # Linux equivalents
├── start-all-dev.bat/sh/ps1     # Dev launcher scripts
├── setup.bat / setup.sh         # Dependency installer
├── setup-environment.bat/sh     # Full environment setup
│
├── backend/
│   ├── main.py                  # FastAPI entrypoint, auto table creation & DB seeding
│   ├── requirements.txt         # Python dependencies
│   ├── alembic.ini              # DB migration config
│   ├── .env                     # Environment variables (keys, DB, LLM config)
│   ├── Dockerfile               # Backend container image
│   ├── app/
│   │   ├── api/
│   │   │   ├── router_auth.py       # Auth: login, signup, /me
│   │   │   ├── router_admin.py      # Super Admin: orgs, projects, config, integrations, KB, playground
│   │   │   ├── router_client.py     # Client: chat (HTTP), conversations, messages
│   │   │   ├── router_websocket.py  # WebSocket: real-time streaming chat + TTS
│   │   │   ├── router_analytics.py  # Analytics dashboard + audit logs
│   │   │   └── dependencies.py      # JWT tenant context & role guards
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings (env vars, keys, LLM config)
│   │   │   ├── database.py          # SQLAlchemy engine & session factory
│   │   │   ├── security.py          # JWT, bcrypt hashing, Fernet encrypt/decrypt
│   │   │   └── guardrails.py        # Two-pass guardrail engine (PII, topics, disclaimers)
│   │   ├── models/                   # SQLAlchemy ORM models (9 tables)
│   │   │   ├── organization.py, user.py, project.py, project_config.py
│   │   │   ├── knowledge_doc.py, api_integration.py
│   │   │   ├── conversation.py, message.py, audit_log.py
│   │   │   └── __init__.py          # Model registry
│   │   ├── orchestrator/
│   │   │   ├── dynamic_graph.py     # Config-driven LangGraph orchestrator (4-pass pipeline)
│   │   │   ├── dynamic_tools.py     # Runtime tool factory from DB integrations
│   │   │   └── rag_service.py       # Per-project ChromaDB RAG (index, query, chunk)
│   │   ├── schemas/                  # Pydantic request/response models
│   │   └── services/
│   │       ├── llm_service.py       # OpenRouter LLM client (multi-model fallback)
│   │       ├── crawler_service.py   # Web crawler → text extraction → vector indexing
│   │       └── tts_service.py       # ElevenLabs TTS audio generation
│   ├── scripts/
│   │   └── schema_and_seed.sql      # MySQL DDL & seed data
│   ├── tests/                        # End-to-end test suites (Deliverables 3-8)
│   ├── uploads/                      # KB file upload storage (per-project dirs)
│   ├── chroma_db/                    # ChromaDB persistent vector storage
│   └── migrations/                   # Alembic migration versions
│
└── frontend/
    ├── admin-portal/                 # Super Admin SPA (Vite + React + TS, Port 3001)
    │   ├── src/App.tsx               # Full admin dashboard (orgs, projects, config, KB, playground)
    │   └── vite.config.ts
    └── client-portal/                # Client Operations SPA (Vite + React + TS, Port 3000)
        ├── src/
        │   ├── App.tsx               # Chat UI, history, analytics, voice I/O
        │   └── services/api.ts       # Axios client with JWT interceptor
        └── vite.config.ts
```

---

## ⚙️ Prerequisites

| Requirement | Version |
| :--- | :--- |
| **Python** | 3.10 or higher |
| **Node.js** | 18.0 or higher (with `npm`) |
| **MySQL Server** | 8.0+ *(optional — SQLite fallback works for local dev/testing)* |

---

## 🔐 Environment Variables & Configuration

Backend settings are configured via `backend/.env` or `backend/app/core/config.py`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `mysql+pymysql://root:root@localhost:3306/bfsi_platform` | MySQL connection string |
| `JWT_SECRET` | `bfsi-super-secret-jwt-key-2026-change-in-prod` | JWT signing key (HS256) |
| `ENCRYPTION_KEY` | `uN_4V6kZqX7zP_Y0qL9rT3vW8xM1nB5vC8xD7yZ4wE2=` | Fernet AES-256 key for API secret vault |
| `OPENROUTER_API_KEY` | *(set in .env)* | OpenRouter API key for LLM inference |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter API base URL |
| `OPENROUTER_DEFAULT_MODEL` | `google/gemini-2.0-flash-001` | Primary LLM model |
| `OPENROUTER_FALLBACK_MODEL` | `meta-llama/llama-3.1-8b-instruct` | Fallback LLM model |
| `OPENAI_API_KEY` | `""` | Legacy OpenAI key (optional) |
| `ELEVENLABS_API_KEY` | `""` | ElevenLabs API key for TTS |
| `ELEVENLABS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` | Default ElevenLabs voice ID |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB persistent storage path |

---

## 🗄️ Database Setup & Schema

### Option A: Auto-Setup (Recommended)
When you run `python backend/main.py`, SQLAlchemy automatically creates all tables and seeds default data (org, users, project, config).

### Option B: MySQL Manual Import
```bash
# Ensure MySQL is running on localhost:3306
mysql -u root -p < db_schema.sql
```

### Option C: SQLite Fallback (Zero-Config)
If MySQL is unavailable, the platform falls back to SQLite (`backend/bfsi_platform_test.db`) for local development and testing.

---

## 🚀 Installation & Quick Start

### 1. Windows One-Click Launch
```powershell
# Install all dependencies
.\setup.bat

# Launch all 3 services (Backend + Admin Portal + Client Portal)
.\start.bat

# Stop all services
.\stop.bat
```

### 2. Linux / macOS
```bash
# Install dependencies
chmod +x setup.sh && ./setup.sh

# Launch all services
chmod +x start.sh && ./start.sh

# Stop all services
./stop.sh
```

### 3. Manual Startup

#### Backend API Server (Port 8000)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
> Backend online at `http://localhost:8000` · Swagger docs at `http://localhost:8000/docs`

#### Flagship Landing Page (Port 3002)
```bash
cd frontend/landing-page
npm install && npm run dev
```
> Landing Page online at `http://localhost:3002`

#### Super Admin Portal (Port 3001)
```bash
cd frontend/admin-portal
npm install && npm run dev
```
> Admin Portal online at `http://localhost:3001`

#### Client Operations Portal (Port 3000)
```bash
cd frontend/client-portal
npm install && npm run dev
```
> Client Portal online at `http://localhost:3000`

### 4. Docker Compose
```bash
docker-compose up --build
```

---

## 🌐 Service Ports & Access URLs

| Service / Portal | Port | URL | Access / Role |
| :--- | :---: | :--- | :--- |
| **Flagship Landing Page** | `3002` | [http://localhost:3002](http://localhost:3002) | Public Home Screen (Dark/Light Mode, Video Demos) |
| **Super Admin Portal** | `3001` | [http://localhost:3001](http://localhost:3001) | Organization, Tenant, Project & Tool Administration |
| **Client Operations Portal** | `3000` | [http://localhost:3000](http://localhost:3000) | Branch Leads & Supervisors (WebSocket Chat & Voice) |
| **Main Backend API** | `8000` | [http://localhost:8000](http://localhost:8000) | FastAPI REST & WebSocket Server |
| **Swagger Interactive Docs** | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI Interactive API Documentation |
| **Database Web UI (Datasette)** | `8005` | [http://localhost:8005](http://localhost:8005) | Visual SQLite / Relational Database Explorer |

---

## 🗄️ Database UI Inspection

### Web-Based Browser UI (Datasette)
```bash
cd backend
pip install datasette
datasette serve bfsi_platform_test.db --port 8005
```
> Browse tables at `http://localhost:8005`

### Desktop GUI Tools
- **Database File**: `backend/bfsi_platform_test.db`
- **Recommended**: [DB Browser for SQLite](https://sqlitebrowser.org/), TablePlus, or DBeaver

---

## 🔑 Default Seed Credentials

| Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Super Admin Portal** | `admin@bfsi.com` | `admin123` | `super_admin` |
| **Client Portal** | `lead@bfsi.com` | `lead123` | `lead` |
| **Client Portal** | `supervisor@bfsi.com` | `supervisor123` | `supervisor` |

---

## 📡 API Endpoints Reference

> **Interactive Docs** (when backend is running):
> - Swagger UI: `http://localhost:8000/docs`
> - ReDoc: `http://localhost:8000/redoc`
> - OpenAPI Schema: `http://localhost:8000/openapi.json`

---

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate and receive JWT token |
| `POST` | `/api/auth/signup` | Register new user under an organization |
| `GET` | `/api/auth/me` | Get current user profile from JWT |

<details>
<summary>Example: Login Request & Response</summary>

**Request:**
```json
POST /api/auth/login
{
  "email": "admin@bfsi.com",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "33333333-3333-3333-3333-333333333333",
    "email": "admin@bfsi.com",
    "full_name": "Platform Super Admin",
    "role": "super_admin",
    "org_id": null,
    "is_active": true
  }
}
```
</details>

---

### 2. Super Admin (`/api/admin`) — Requires `super_admin` Role

#### Organization Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/orgs` | List all registered organizations |
| `POST` | `/api/admin/orgs` | Onboard new tenant organization |
| `POST` | `/api/admin/orgs/{org_id}/users` | Create user under organization |

#### Domain Templates
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/templates` | Fetch BFSI domain templates (Banking, Finance, Insurance) |

#### Project Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/orgs/{org_id}/projects` | List projects under organization |
| `POST` | `/api/admin/orgs/{org_id}/projects` | Create project with domain template |
| `PATCH` | `/api/admin/projects/{project_id}/status` | Update agent lifecycle state (`Live`/`Paused`/`Draft`) |

#### Project Configuration
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/projects/{project_id}/config` | Get system prompt, guardrails, model settings |
| `PUT` | `/api/admin/projects/{project_id}/config` | Update project configuration |

#### API Integrations & cURL Import (Secret Vault)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/projects/{project_id}/integrations` | List registered API integrations |
| `POST` | `/api/admin/projects/{project_id}/integrations` | Register external API (secrets encrypted via Fernet) |
| `POST` | `/api/admin/parse-curl` | Parse raw cURL command into structured API tool spec |
| `GET` | `/api/admin/projects/{project_id}/tool-assignments` | Get tool enablement status per agent |
| `PUT` | `/api/admin/projects/{project_id}/tool-assignments` | Enable/disable specific tools for an agent |
| `POST` | `/api/admin/projects/{project_id}/install-mock-integrations` | One-click install of BFSI Mock suites |
| `POST` | `/api/admin/projects/{project_id}/install-hubspot-integration` | Register HubSpot CRM tools |
| `POST` | `/api/admin/integrations/{integration_id}/test-call` | Live test-call to external API |

#### HubSpot CRM Integration (`/api/admin/hubspot`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/hubspot/status?project_id={id}` | Check HubSpot connection state & sandbox/live mode |
| `POST` | `/api/admin/hubspot/connect` | Connect Private App Token / Demo Sandbox token |
| `POST` | `/api/admin/hubspot/disconnect?project_id={id}` | Disconnect and clear stored credentials |
| `GET` | `/api/admin/hubspot/oauth/config?project_id={id}` | Get direct 1-click browser OAuth popup configuration |
| `GET` | `/api/admin/hubspot/oauth/callback?code={code}&state={id}` | OAuth 2.0 exchange callback |
| `GET` | `/api/admin/hubspot/contacts?project_id={id}&q=` | Search HubSpot CRM contacts |
| `GET` | `/api/admin/hubspot/contacts/{id}?project_id={id}` | Get contact by ID |
| `POST` | `/api/admin/hubspot/contacts` | Create new contact |
| `POST` | `/api/admin/hubspot/tasks` | Create client follow-up task |

#### Mock BFSI APIs (`/api/mock`) — Public HTTPS Demo Suite
| Domain | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Banking** | `GET` | `/api/mock/banking/accounts/{id}` | Account holder details |
| **Banking** | `GET` | `/api/mock/banking/accounts/{id}/balance` | Real-time balance |
| **Banking** | `GET` | `/api/mock/banking/accounts/{id}/transactions`| Transaction history |
| **Banking** | `GET` | `/api/mock/banking/loans/{id}/status` | Loan status & outstanding balance |
| **Banking** | `GET` | `/api/mock/banking/loans/{id}/schedule` | 6-month EMI repayment schedule |
| **Banking** | `POST` | `/api/mock/banking/service-requests` | Card block, cheque book request |
| **Insurance** | `GET` | `/api/mock/insurance/policies/{id}` | Insurance policy coverage & premium |
| **Insurance** | `GET` | `/api/mock/insurance/policies/{id}/status` | Policy status & premium countdown |
| **Insurance** | `GET` | `/api/mock/insurance/claims/{id}/status` | Claim lifecycle tracking |
| **Insurance** | `POST` | `/api/mock/insurance/claims` | File new insurance claim |
| **Insurance** | `POST` | `/api/mock/insurance/renewals` | Policy renewal request |
| **Finance** | `GET` | `/api/mock/finance/emi` | Reducing balance EMI calculator |
| **Finance** | `GET` | `/api/mock/finance/loan-applications/{id}/status` | Application processing status |
| **Finance** | `GET` | `/api/mock/finance/repayments/{id}/history` | Historical payment records |

#### Knowledge Base (RAG)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/projects/{project_id}/kb` | List indexed knowledge documents |
| `POST` | `/api/admin/projects/{project_id}/kb/upload` | Upload & auto-index document file into Chroma |
| `POST` | `/api/admin/projects/{project_id}/kb/crawl` | Crawl webpage URL & index into vector store |

#### Agent Playground
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/admin/projects/{project_id}/playground-test` | Full agent simulation with rich tool telemetry & observability |

---

### 3. Client Operations (`/api/client`) — Requires Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/client/projects` | List accessible agents (role-scoped) |
| `POST` | `/api/client/chat` | Send message to LangGraph orchestrator (HTTP) |
| `GET` | `/api/client/conversations` | Retrieve conversation sessions |
| `GET` | `/api/client/conversations/{id}/messages` | Fetch turn-by-turn message transcript |

<details>
<summary>Example: Chat Request & Response</summary>

**Request:**
```json
POST /api/client/chat
{
  "project_id": "22222222-2222-2222-2222-222222222222",
  "session_id": "session-101",
  "message": "What is the status of my loan application #LN-9942?"
}
```

**Response (200 OK):**
```json
{
  "session_id": "session-101",
  "answer": "Your loan application #LN-9942 is currently approved and pending final disbursement. *Disclaimer: Not financial advice*",
  "intent": "banking_rag_faq",
  "should_escalate": false,
  "latency_ms": 1245.67
}
```
</details>

---

### 4. Analytics & Audit (`/api/analytics`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/dashboard` | Real-time operational metrics |
| `GET` | `/api/analytics/audit-logs` | Security audit trail (org-scoped) |

<details>
<summary>Example: Dashboard Response</summary>

```json
{
  "total_conversations": 142,
  "chat_vs_voice": { "chat": 88, "voice": 54 },
  "resolution_rate": 96.5,
  "escalated_conversations": 5,
  "top_intents": [
    { "intent": "banking_rag_faq", "count": 45 },
    { "intent": "loan_status_query", "count": 32 }
  ],
  "avg_response_time_ms": 1180.5,
  "failed_api_calls": 2,
  "feedback_score": 4.85
}
```
</details>

---

### 5. Real-Time WebSocket (`/ws`)

| Protocol | Endpoint | Description |
| :--- | :--- | :--- |
| `WS` | `/ws` or `/ws/{project_id}` | Full-duplex streaming chat |

**Message Protocol:**

| Direction | Type | Description |
| :--- | :--- | :--- |
| Client → Server | `PING` | Keepalive heartbeat |
| Server → Client | `PONG` | Heartbeat response |
| Client → Server | `USER_MESSAGE` | `{ type, payload, session_id, isVoiceInput }` |
| Server → Client | `MESSAGE_STREAM` | Token-chunked response text |
| Server → Client | `MESSAGE_COMPLETE` | Final metadata (intent, model, latency) |
| Server → Client | `AUDIO_STREAM` | Base64-encoded TTS audio (voice requests) |
| Server → Client | `ERROR` | Error notification |

---

## 📊 Database Schema Details

The platform uses **9 core relational tables**:

| # | Table | Description |
| :--- | :--- | :--- |
| 1 | `organizations` | Root multi-tenant entity with slug identifier |
| 2 | `users` | System users with role enforcement (`super_admin`, `supervisor`, `lead`) |
| 3 | `projects` | AI agent projects scoped to `org_id` with lifecycle state (`Live`/`Paused`/`Draft`) |
| 4 | `project_configs` | One-to-one extension storing system prompts, guardrails, agent settings, voice settings |
| 5 | `knowledge_docs` | RAG document index metadata (uploads & web crawls) |
| 6 | `api_integrations` | External API tools with Fernet-encrypted secret credentials |
| 7 | `conversations` | Chat and voice interaction sessions with status tracking |
| 8 | `messages` | Individual turn messages with token usage, latency, tool calls, and flag tracking |
| 9 | `audit_logs` | Immutable audit trails capturing administrative events |

---

## 🧪 Testing Instructions

Run the end-to-end deliverable test suites:

```powershell
python backend/tests/test_deliverable_3.py     # Core models & DB
python backend/tests/test_deliverable_4.py     # Admin API endpoints
python backend/tests/test_deliverable_5.py     # Orchestrator & guardrails
python backend/tests/test_deliverable_8.py     # Analytics & audit logs
```

**Expected output:**
```text
[SUCCESS] All Deliverable 3 tests passed successfully!
[SUCCESS] All Deliverable 4 Admin API tests passed successfully!
[SUCCESS] All Deliverable 5 Orchestrator & Guardrail tests passed successfully!
[SUCCESS] All Deliverable 8 Analytics & Audit Log tests passed successfully!
```

---

## 🐳 Build & Deployment

### Docker Compose (Full Stack)
```bash
docker-compose up --build
```

Services launched:
- `bfsi_mysql` — MySQL 8.0 (Port 3306)
- `bfsi_chroma` — ChromaDB (Port 8000)
- `bfsi_backend` — FastAPI Backend (Port 8000)
- `bfsi_admin_portal` — Admin Portal (Port 3001)
- `bfsi_client_portal` — Client Portal (Port 3000)

### Production Frontend Builds
```bash
# Super Admin Portal
cd frontend/admin-portal
npm run build

# Client Operations Portal
cd frontend/client-portal
npm run build
```

### EC2 / Cloud Staging
Refer to [EC2_STAGING_DEPLOYMENT.md](EC2_STAGING_DEPLOYMENT.md) for detailed cloud deployment instructions.

---

## ❓ Troubleshooting & Common Issues

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| `npm.ps1 cannot be loaded` | PowerShell execution policy blocks `.ps1` scripts | Use `cmd /c npm run dev` instead of `npm run dev` in PowerShell |
| `Can't connect to MySQL server` | MySQL offline or credentials mismatch | Ensure MySQL is running on port 3306, or use SQLite fallback (automatic) |
| `Port 8000/3000/3001 in use` | Another process on target port | Kill existing process or reconfigure port in `vite.config.ts` |
| `402 Payment Required` (OpenRouter) | Model cost exceeds credit budget | `max_tokens` is auto-capped at 1500; switch to free model via `OPENROUTER_DEFAULT_MODEL` |
| `Chroma collection not found` | No documents uploaded for project | Upload knowledge base docs or crawl a URL via Admin portal before querying |
| `ENCRYPTION_KEY mismatch` | Key changed after secrets were stored | Restore original key or re-register API integrations with new secrets |

---

## 📝 Important Notes & Assumptions

- **Tenant Isolation**: `org_id` and `project_id` are derived from the user's JWT token for all client-facing APIs. Direct cross-tenant access is blocked at the dependency injection layer.
- **Fernet Secret Encryption**: API integration secrets are stored encrypted. Changing `ENCRYPTION_KEY` invalidates previously encrypted secrets.
- **LLM Model Fallback**: If the primary OpenRouter model fails (rate limit, budget, downtime), the system automatically retries with fallback models in sequence before returning an error.
- **RAG Relevance Filtering**: Vector search results with Chroma L2 distance > 1.5 are discarded as irrelevant, ensuring only high-confidence passages are injected into the LLM context.
- **Agent Lifecycle**: Only agents in `Live` (or legacy `active`) state respond to client queries. The playground endpoint bypasses this restriction for admin testing.
- **Session History Window**: The orchestrator injects the last 4 conversation turns into the LLM context to maintain conversational coherence.
- **CORS**: The backend allows all origins (`*`) for development convenience. Restrict in production.

---

## 👥 Project Creators & System Architects

The **BFSI Multi-Tenant Intelligent Agent Platform** is co-created and engineered by:

| Creator | Role & Specialization | LinkedIn Profile |
| :--- | :--- | :--- |
| **Rakesh Rohan** | Co-Creator & System Architect<br><sub>Multi-tenant data isolation, AES-256 secret vault, real-time WebSockets & voice streaming</sub> | [linkedin.com/in/rakesh-rohan](https://www.linkedin.com/in/rakesh-rohan/) |
| **Shaik Fayaz Ahammad** | Co-Creator & AI Lead<br><sub>LangGraph dynamic orchestrator, ChromaDB RAG pipelines & multi-model LLM failover</sub> | [linkedin.com/in/shaikfayazahammad](https://www.linkedin.com/in/shaikfayazahammad/) |

- **GitHub Repository**: [ShaikFayazAhammad/Multi-Tenant-Intelligent-Agent-Platform](https://github.com/ShaikFayazAhammad/Multi-Tenant-Intelligent-Agent-Platform)

---

## 📚 Additional Documentation

| Document | Description |
| :--- | :--- |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Complete API docs (cURL Import, Mock BFSI Suite, HubSpot, DB Viewer) |
| [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md) | Step-by-step full setup walkthrough |
| [ENVIRONMENT_SETUP_GUIDE.md](ENVIRONMENT_SETUP_GUIDE.md) | Environment configuration reference |
| [WINDOWS_STARTUP_GUIDE.md](WINDOWS_STARTUP_GUIDE.md) | Windows-specific startup instructions |
| [VITE_CONFIG_GUIDE.md](VITE_CONFIG_GUIDE.md) | Frontend Vite configuration details |
| [WEBSOCKET_INTEGRATION_PLAN.md](WEBSOCKET_INTEGRATION_PLAN.md) | WebSocket protocol design document |
| [EC2_STAGING_DEPLOYMENT.md](EC2_STAGING_DEPLOYMENT.md) | AWS EC2 staging deployment guide |

---

<p align="center">
  <sub>Built for BFSI enterprises · Config-driven · Multi-tenant isolated · Production-ready</sub>
</p>

