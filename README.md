# BFSI Multi-Tenant Intelligent Agent Platform (SaaS)

A production-ready, multi-tenant SaaS platform engineered specifically for **BFSI (Banking, Financial Services, and Insurance)** enterprises. The platform features strict tenant data isolation, config-driven agent orchestration via LangGraph, isolated per-project RAG vector search, Fernet AES-256 encrypted external API tool execution, automated two-pass guardrails (PII masking & disclaimers), real-time WebSocket communication, ElevenLabs text-to-speech, and dual role-tailored web interfaces.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [Project & Directory Structure](#-project--directory-structure)
5. [Prerequisites](#-prerequisites)
6. [Environment Variables & Configuration](#-environment-variables--configuration)
7. [Database Setup & Schema](#-database-setup--schema)
8. [Installation & Local Execution](#-installation--local-execution)
9. [API Endpoints Reference](#-api-endpoints-reference)
10. [Database Schema Details](#-database-schema-details)
11. [Testing Instructions](#-testing-instructions)
12. [Build & Deployment Instructions](#-build--deployment-instructions)
13. [Troubleshooting & Common Issues](#-troubleshooting--common-issues)
14. [Important Notes & Assumptions](#-important-notes--assumptions)

---

## 🌟 Project Overview

The BFSI Multi-Tenant Intelligent Agent Platform empowers financial organizations (Banks, Credit Unions, Insurance Brokers, Investment Firms) to deploy domain-specific conversational AI agents. Built with a config-driven architecture, administrators can define system prompts, domain guardrails, document knowledge bases, and external API tool definitions dynamically without re-deploying code.

---

## ✨ Key Features

- **Multi-Tenant Data Isolation**: Every relational entity and vector database collection is strictly scoped by `org_id` and `project_id` via FastAPI dependency injection and JWT token claims.
- **Config-Driven Dynamic Orchestrator**: LangGraph agent graphs are dynamically constructed at runtime per session using project configurations (system prompts, temperature, model selection, enabled tools, guardrails).
- **External API Integrations Vault**: Secure REST API tool connector storing integration secrets with **Fernet AES-256 encryption**. Features live test-call execution capability directly from the Super Admin portal.
- **Per-Project RAG Isolation**: Vector database collections (ChromaDB) are dynamically partitioned per project (`project_{project_id}`) to prevent cross-tenant knowledge leaks.
- **Two-Pass Guardrail Engine**:
  - **Pass 1 (Input Pre-check)**: Masks PII (Credit Cards, SSNs, Emails, Phone Numbers) and blocks prohibited topics (e.g., crypto gambling).
  - **Pass 2 (Output Post-check)**: Sanitizes assistant outputs, appends mandatory financial disclaimers, and triggers escalation workflows on negative sentiment or compliance failures.
- **Dual Role-Tailored Frontend Portals**:
  - **Super Admin Portal (`http://localhost:3001`)**: Global tenant, user, project, domain template, integration, and guardrail management.
  - **Client Operations Portal (`http://localhost:3000`)**: Role-scoped (Supervisor & Lead) dashboards, conversation history, real-time WebSocket chat, and ElevenLabs TTS audio playback.
- **MySQL Engine Support**: Supports MySQL 8.0 / MariaDB with PyMySQL driver and automatic schema creation and seeding.

---

## 💻 Technology Stack

### Backend
- **Framework**: Python 3.10+ / FastAPI
- **ORM & Database**: SQLAlchemy 2.0, PyMySQL, MySQL 8.0 (with SQLite fallback for local test suites)
- **Agent Orchestrator**: LangGraph / LangChain
- **Vector Database (RAG)**: ChromaDB
- **Security & Encryption**: Cryptography (Fernet AES-256), PyJWT, Passlib (Bcrypt)
- **Speech Synthesis**: ElevenLabs TTS API Integration

### Frontend
- **Framework**: React 18 (TypeScript)
- **Build System**: Vite
- **UI Styling**: Tailwind CSS, Lucide React Icons
- **HTTP & WebSocket**: Axios, Native WebSocket Web API

---

## 📁 Project & Directory Structure

```
Multi-Tenant-Intelligent-Agent-Platform/
├── db_schema.sql                # Complete MySQL DDL schema and seed data SQL script
├── README.md                    # System documentation
├── docker-compose.yml           # Multi-container orchestration (Backend, Admin, Client)
├── backend/
│   ├── main.py                  # FastAPI entrypoint & DB seed executor
│   ├── alembic.ini              # Alembic database migration config
│   ├── requirements.txt         # Python dependencies
│   ├── app/
│   │   ├── api/                 # REST Routers (auth, admin, client, analytics, websocket)
│   │   ├── core/                # Core config, DB session, security vault, guardrails
│   │   ├── models/              # SQLAlchemy ORM models (Org, User, Project, Config, etc.)
│   │   ├── orchestrator/        # LangGraph dynamic agent builder, tool factory, RAG engine
│   │   ├── schemas/             # Pydantic data validation models
│   │   └── services/            # Analytics aggregator & ElevenLabs TTS service
│   ├── scripts/
│   │   └── schema_and_seed.sql  # MySQL DDL & Seed script copy
│   └── tests/                   # End-to-end deliverable test suite
└── frontend/
    ├── admin-portal/            # Super Admin SPA (Vite + React + TS, Port 3001)
    └── client-portal/           # Client Operations SPA (Vite + React + TS, Port 3000)
```

---

## ⚙️ Prerequisites

Before installing and running the project, ensure you have the following installed:
- **Python**: v3.10 or higher
- **Node.js**: v18.0 or higher (with `npm`)
- **MySQL Server**: v8.0 or higher (Optional if using default SQLite fallback for quick testing)

---

## 🔐 Environment Variables & Configuration

Backend settings can be configured via environment variables or inside `backend/app/core/config.py`:

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `mysql+pymysql://root:root@localhost:3306/bfsi_platform` | MySQL database connection string |
| `SECRET_KEY` | `super-secret-jwt-signing-key-bfsi-2026` | Key used for signing JWT access tokens |
| `ENCRYPTION_KEY` | `8cW7bN9YxZ2vP1qR0sT3uV5wX7yZ9aB1cD3eF5gH7iJ=` | Fernet AES-256 key for secret vault |
| `ELEVENLABS_API_KEY` | `""` | ElevenLabs API key for TTS audio rendering |
| `OPENAI_API_KEY` | `""` | OpenAI API key for LLM responses |

---

## 🗄️ Database Setup & Schema

1. Ensure MySQL Server is running on `localhost:3306`.
2. Import the `db_schema.sql` script to create the database and seed records:
   ```bash
   mysql -u root -p < db_schema.sql
   ```
3. Alternatively, when you run `python backend/main.py`, SQLAlchemy will automatically check for tables and create them if missing.

---

## 🚀 Quick Startup & Local Execution

### 1. Automated One-Command Setup & Launch
```bash
# 1. Install dependencies across backend & frontend portals
./setup-environment.sh

# 2. Launch FastAPI Backend (Port 8000), Admin Portal (Port 3000), and Client Portal (Port 3001)
./start-all-dev.sh
```

### 2. Manual Startup

#### Backend API Server (Port 8000)
```bash
cd backend
source venv/bin/activate
python main.py
```
*Backend will be online at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).*

#### Super Admin Portal (Port 3000)
```bash
cd frontend/admin-portal
npm run dev -- --port 3000
```
*Super Admin Portal will be online at `http://localhost:3000`.*

#### Client Operations Portal (Port 3001)
```bash
cd frontend/client-portal
npm run dev -- --port 3001
```
*Client Operations Portal will be online at `http://localhost:3001`.*

---

## 🗄️ Database UI Inspection

### Web-Based Browser UI (Datasette)
Launch an instant web interface at `http://localhost:8005` to browse tables (`orgs`, `users`, `projects`, `conversations`, `api_integrations`), filter rows, and run SQL queries:
```bash
cd backend
./venv/bin/pip install datasette
./venv/bin/datasette bfsi_platform_test.db --port 8005
```

### Desktop GUI Applications
Open the persistent SQLite database file:
- **Database File Location**: `backend/bfsi_platform_test.db`
- **Recommended Tools**: **DB Browser for SQLite** (`brew install --cask db-browser-for-sqlite`), **TablePlus**, or **DBeaver**.


---

## 🔑 Default Seed Credentials

| Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Super Admin Portal** | `admin@bfsi.com` | `admin123` | `super_admin` |
| **Client Operations Portal** | `lead@bfsi.com` | `lead123` | `lead` |
| **Client Operations Portal** | `supervisor@bfsi.com` | `supervisor123` | `supervisor` |

---

## 📡 Comprehensive API Documentation

Interactive OpenAPI / Swagger documentation is automatically generated and accessible when the backend server is running:
- **Interactive Swagger UI**: `http://localhost:8000/docs`
- **ReDoc UI**: `http://localhost:8000/redoc`
- **OpenAPI Schema Spec**: `http://localhost:8000/openapi.json`

---

### 1. Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/login`
Authenticates user credentials and returns a signed JWT access token.
- **Request Body**:
  ```json
  {
    "email": "admin@bfsi.com",
    "password": "admin123"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
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

#### `POST /api/auth/signup`
Registers a new user under an active organization.
- **Request Body**:
  ```json
  {
    "email": "advisor@bank.com",
    "password": "SecurePassword123!",
    "full_name": "Jane Advisor",
    "org_id": "11111111-1111-1111-1111-111111111111",
    "role": "lead"
  }
  ```

#### `GET /api/auth/me`
Retrieves the profile of the currently authenticated user based on `Authorization: Bearer <token>`.

---

### 2. Super Admin Endpoints (`/api/admin`)
*Requires `Authorization: Bearer <token>` with `super_admin` role.*

- `GET /api/admin/organizations` - List all registered organizations.
- `POST /api/admin/organizations` - Onboard a new tenant organization.
- `GET /api/admin/templates` - Fetch domain system prompts and guardrails (**banking**, **finance**, **insurance**).
- `GET /api/admin/projects` - List all projects under active organization.
- `POST /api/admin/projects` - Create a project initialized with a domain template.
- `GET /api/admin/projects/{project_id}/config` - Fetch current project prompt, model parameters, and guardrail settings.
- `PUT /api/admin/projects/{project_id}/config` - Update project configuration.
- `POST /api/admin/projects/{project_id}/integrations` - Register an external REST API integration (secrets stored with Fernet encryption).
- `POST /api/admin/integrations/{integration_id}/test-call` - Trigger live test call to external integration.

---

### 3. Client Operations & Messaging Endpoints (`/api/client`)
*Requires `Authorization: Bearer <token>`.*

- `GET /api/client/conversations` - Retrieve conversation sessions for active project.
- `GET /api/client/conversations/{session_id}/transcript` - Fetch turn-by-turn message transcript.
- `POST /api/client/chat` - Send a message to the dynamic LangGraph agent.
  - **Request Body**:
    ```json
    {
      "project_id": "22222222-2222-2222-2222-222222222222",
      "session_id": "session-101",
      "message": "What is the status of my loan application #LN-9942?"
    }
    ```
  - **Response (`200 OK`)**:
    ```json
    {
      "session_id": "session-101",
      "response": "Your loan application #LN-9942 is currently approved and pending final disbursement. [Disclaimer: Financial information provided for informational purposes.]",
      "intent": "loan_status_query",
      "escalation_required": false,
      "pii_masked": true
    }
    ```

---

### 4. Operational Analytics & Audit Logs (`/api/analytics`)

- `GET /api/analytics/dashboard` - Fetch aggregate metrics:
  ```json
  {
    "total_sessions": 142,
    "active_agents": 3,
    "avg_satisfaction_score": 4.8,
    "channel_breakdown": { "chat": 88, "voice": 54 },
    "escalation_rate": 0.04
  }
  ```
- `GET /api/analytics/audit-logs` - Retrieve security audit trail log entries.

---

### 5. Real-Time Streaming WebSocket (`/ws`)

- `WS /ws/chat/{session_id}?token=<jwt_token>` - Full-duplex WebSocket stream for real-time assistant responses and token streaming.


---

## 📊 Database Schema Details

The platform consists of **9 core relational tables**:

1. `organizations`: Root multi-tenant entity.
2. `users`: System users with role enforcement (`super_admin`, `supervisor`, `lead`).
3. `projects`: AI Agent projects scoped to `org_id`.
4. `project_configs`: One-to-one extension of `projects` storing prompts, guardrails, model parameters, and TTS settings.
5. `knowledge_docs`: RAG document index metadata.
6. `api_integrations`: Dynamic external API tools with Fernet-encrypted secret credentials.
7. `conversations`: Chat and Voice interaction sessions.
8. `messages`: Individual turn messages with token and latency tracking.
9. `audit_logs`: Immutable audit trails capturing user and system administrative events.

---

## 🧪 Testing Instructions

Run the full end-to-end deliverable test suite:

```powershell
python backend/tests/test_deliverable_3.py
python backend/tests/test_deliverable_4.py
python backend/tests/test_deliverable_5.py
python backend/tests/test_deliverable_8.py
```

Expected output upon completion:
```text
[SUCCESS] All Deliverable 3 tests passed successfully!
[SUCCESS] All Deliverable 4 Admin API tests passed successfully!
[SUCCESS] All Deliverable 5 Orchestrator & Guardrail tests passed successfully!
[SUCCESS] All Deliverable 8 Analytics & Audit Log tests passed successfully!
```

---

## 🐳 Build & Deployment Instructions

### Running via Docker Compose
To run all backend and frontend services in isolated Docker containers:
```bash
docker-compose up --build
```

### Production Build for Frontends
To compile production static assets for frontends:
```bash
# Super Admin Portal
cd frontend/admin-portal
cmd /c npm run build

# Client Operations Portal
cd frontend/client-portal
cmd /c npm run build
```

---

## ❓ Troubleshooting & Common Issues

1. **PowerShell Script Execution Error (`npm.ps1 cannot be loaded`)**:
   - *Cause*: Windows PowerShell script execution policy disables running `.ps1` wrapper scripts.
   - *Fix*: Use `cmd /c npm run dev` instead of raw `npm run dev` in PowerShell.

2. **Database Connection Error (`Can't connect to MySQL server`)**:
   - *Cause*: Local MySQL service is offline or credentials differ from `DATABASE_URL`.
   - *Fix*: Ensure MySQL is running on port 3306 or update `DATABASE_URL` in `backend/app/core/config.py`. If MySQL is unavailable, SQLite fallback will automatically take over for testing.

3. **Port 8000 / 3000 / 3001 Already in Use**:
   - *Fix*: Stop pre-existing process listening on target port or configure `port` setting in `vite.config.ts`.

---

## 📝 Important Notes & Assumptions

- **Tenant Isolation**: `org_id` and `project_id` must be provided or derived from the user's JWT token for all client and operational APIs.
- ** Fernet Secret Encryption**: API integration secret keys are stored encrypted. If `ENCRYPTION_KEY` is modified, previously stored encrypted secrets cannot be decrypted.
