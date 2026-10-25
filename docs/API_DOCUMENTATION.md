# BFSI Platform — Complete API Documentation

This document covers all REST and WebSocket API endpoints across the platform, including the **Mock BFSI Suite** (Banking, Insurance, Finance), **API Vault & cURL Import**, **HubSpot CRM Integration**, **Agent Runtime Tool Executions**, and the **Database Web Inspector**.

---

## 🧭 Interactive API Explorers & Database Viewer

| Service | Port | Local URL | Description |
|---|---|---|---|
| **Swagger UI** | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI 3.0 explorer with live request execution |
| **ReDoc** | `8000` | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean 3-panel API technical reference |
| **OpenAPI JSON Schema** | `8000` | [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json) | Raw OpenAPI schema for postman / swagger imports |
| **Database Web UI (Datasette)** | `8005` | [http://localhost:8005](http://localhost:8005) | Visual database table explorer (`api_integrations`, `projects`, etc.) |

---

## 🗄️ Database Web Explorer (`http://localhost:8005`)

The platform includes **Datasette** on port `8005` to view, filter, and inspect database tables without needing SQLite or MySQL command line tools:

- **Main Database**: [http://localhost:8005/bfsi_platform_test](http://localhost:8005/bfsi_platform_test)
- **API Integrations Table**: [http://localhost:8005/bfsi_platform_test/api_integrations](http://localhost:8005/bfsi_platform_test/api_integrations)
  - Inspect registered endpoints, encrypted secret hashes, and `is_enabled` flags per agent.
- **Projects Table**: [http://localhost:8005/bfsi_platform_test/projects](http://localhost:8005/bfsi_platform_test/projects)
- **Organizations Table**: [http://localhost:8005/bfsi_platform_test/organizations](http://localhost:8005/bfsi_platform_test/organizations)
- **Conversations & Messages**: [http://localhost:8005/bfsi_platform_test/conversations](http://localhost:8005/bfsi_platform_test/conversations)

To run or restart Datasette manually:
```bash
cd backend
./venv/bin/datasette serve bfsi_platform_test.db --port 8005 --host 0.0.0.0
```

---

## 🔐 1. Authentication (`/api/auth`)

### Login (Generate JWT Token)
- **Method**: `POST /api/auth/login`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "email": "admin@bfsi.com",
  "password": "admin123"
}
```
- **Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer",
  "user": {
    "id": "33333333-3333-3333-3333-333333333333",
    "email": "admin@bfsi.com",
    "full_name": "Platform Super Admin",
    "role": "super_admin",
    "org_id": null
  }
}
```

---

## 🛠️ 2. API Vault, Tools & cURL Import (`/api/admin`)

*All admin endpoints require `Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>`.*

### Import & Parse cURL Command
Automatically parses raw cURL command lines (extracting method, URL, headers, query params, JSON body, and auth type).
- **Method**: `POST /api/admin/parse-curl`
- **Request Body**:
```json
{
  "curl_command": "curl -X POST https://api.bank.com/v1/cards/block -H \"Authorization: Bearer my_secret_token\" -H \"Content-Type: application/json\" -d '{\"card_number\": \"4111222233334444\", \"reason\": \"lost\"}'"
}
```
- **Response (200 OK)**:
```json
{
  "method": "POST",
  "url": "https://api.bank.com/v1/cards/block",
  "base_url": "https://api.bank.com",
  "path": "/v1/cards/block",
  "headers": [
    { "key": "Content-Type", "value": "application/json" }
  ],
  "auth_type": "bearer",
  "auth_value_present": true,
  "query_params": {},
  "body_json": {
    "card_number": "4111222233334444",
    "reason": "lost"
  },
  "body_raw": "{\"card_number\": \"4111222233334444\", \"reason\": \"lost\"}",
  "content_type": "application/json",
  "suggested_name": "Bank Post API",
  "suggested_endpoint_name": "post_v1"
}
```

### Save / Register API Integration
- **Method**: `POST /api/admin/projects/{project_id}/integrations`
- **Request Body**:
```json
{
  "name": "Core Banking Card Service",
  "base_url": "https://api.bank.com",
  "auth_type": "bearer",
  "secret": "my_secret_token",
  "endpoints": [
    {
      "name": "block_card",
      "method": "POST",
      "path": "/v1/cards/block",
      "description": "Block lost/stolen debit or credit card"
    }
  ]
}
```

### Get Agent Tool Assignments
- **Method**: `GET /api/admin/projects/{project_id}/tool-assignments`
- **Response (200 OK)**:
```json
{
  "updated": 0,
  "assignments": [
    {
      "integration_id": "214b0244-15ee-4bcd-b1d0-1ecce837a714",
      "name": "[MOCK] Banking APIs",
      "is_enabled": true
    }
  ]
}
```

### Update Agent Tool Assignments (Enable / Disable)
- **Method**: `PUT /api/admin/projects/{project_id}/tool-assignments`
- **Request Body**:
```json
{
  "assignments": [
    {
      "integration_id": "214b0244-15ee-4bcd-b1d0-1ecce837a714",
      "is_enabled": true
    }
  ]
}
```

### One-Click Install BFSI Mock Suite
Provisions Banking, Insurance, and Finance mock integrations pointing to public HTTPS (`https://httpbin.org/anything/mock`) or internal endpoints.
- **Method**: `POST /api/admin/projects/{project_id}/install-mock-integrations?base_url=https://httpbin.org/anything/mock`
- **Response (200 OK)**:
```json
{
  "status": "success",
  "installed": [
    "[MOCK] Banking APIs",
    "[MOCK] Insurance APIs",
    "[MOCK] Finance APIs"
  ],
  "integration_ids": [
    "c8a1496b-59c4-42b4-82a1-fa431f77d48c",
    "b82e21b0-96f3-4a16-95ff-f29e160a22ff",
    "d0e14c33-e7a9-4b2a-89f5-ff7c4b01e712"
  ],
  "message": "Installed 3 mock BFSI integration suites with 14 total tool endpoints."
}
```

---

## 🏦 3. Mock BFSI APIs (`/api/mock`)

Public, deterministic endpoints designed for sandbox demos and AI agent simulations. No authentication headers required.

### A. Banking (`/api/mock/banking`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/mock/banking/accounts/{account_id}` | Full account holder details (branch, IFSC, type) |
| `GET` | `/api/mock/banking/accounts/{account_id}/balance` | Real-time available & current balance |
| `GET` | `/api/mock/banking/accounts/{account_id}/transactions` | Recent transactions list (`limit`, `from_date`, `to_date`) |
| `GET` | `/api/mock/banking/loans/{loan_id}/status` | Loan outstanding balance, tenure, and next due date |
| `GET` | `/api/mock/banking/loans/{loan_id}/schedule` | 6-month EMI repayment schedule breakdown |
| `POST` | `/api/mock/banking/service-requests` | Create service request (card block, cheque book) |

#### Sample: Get Balance (`GET /api/mock/banking/accounts/ACC100234/balance`)
```json
{
  "_mock": true,
  "_label": "MOCK BANKING API — Synthetic Data",
  "data": {
    "account_id": "ACC100234",
    "account_number": "HDFC69482103",
    "account_type": "Savings",
    "holder_name": "Arjun Sharma",
    "branch": "Mumbai Main",
    "ifsc_code": "HDFC004921",
    "status": "Active",
    "available_balance": 184500.5,
    "current_balance": 189500.5,
    "minimum_balance": 1000.0,
    "currency": "INR",
    "last_updated": "2026-10-25T11:30:00Z"
  }
}
```

---

### B. Insurance (`/api/mock/insurance`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/mock/insurance/policies/{policy_id}` | Policy details, sum assured, premium amount |
| `GET` | `/api/mock/insurance/policies/{policy_id}/status` | Active status & days remaining to premium due |
| `GET` | `/api/mock/insurance/claims/{claim_id}/status` | Claim lifecycle status (Approved, Assessment, Settled) |
| `POST` | `/api/mock/insurance/claims` | Register new insurance claim |
| `POST` | `/api/mock/insurance/renewals` | Initiate policy renewal request |

#### Sample: Policy Status (`GET /api/mock/insurance/policies/POL99212/status`)
```json
{
  "_mock": true,
  "_label": "MOCK INSURANCE API — Synthetic Data",
  "policy_id": "POL99212",
  "policy_number": "POL48192031",
  "status": "Active",
  "premium_due": "2026-11-20",
  "premium_amount": 14500.0,
  "coverage_active": true,
  "days_to_premium_due": 26
}
```

---

### C. Finance (`/api/mock/finance`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/mock/finance/emi` | Calculate EMI (`principal`, `rate`, `tenure`) |
| `GET` | `/api/mock/finance/loan-applications/{app_id}/status` | Loan application status (Under Review, Approved) |
| `GET` | `/api/mock/finance/repayments/{loan_id}/history` | Historical repayments records (UPI, NACH, Net Banking) |

#### Sample: EMI Calculator (`GET /api/mock/finance/emi?principal=500000&rate=9.5&tenure=36`)
```json
{
  "_mock": true,
  "_label": "MOCK FINANCE API — EMI Calculator",
  "inputs": {
    "principal": 500000.0,
    "annual_rate_percent": 9.5,
    "tenure_months": 36
  },
  "emi_amount": 16016.14,
  "total_amount_payable": 576581.04,
  "total_interest": 76581.04,
  "interest_percentage": 15.32
}
```

---

## 🟠 4. HubSpot CRM Integration (`/api/admin/hubspot`)

### Check HubSpot Connection Status
- **Method**: `GET /api/admin/hubspot/status?project_id={project_id}`
- **Response (200 OK)**:
```json
{
  "status": "connected",
  "message": "HubSpot Private App Token is stored (encrypted).",
  "project_id": "22222222-2222-2222-2222-222222222222"
}
```

### Connect HubSpot Account
Accepts a real HubSpot Private App Token (`pat-na1-...`) or `pat-demo-hubspot-sandbox` for instant sandbox test mode.
- **Method**: `POST /api/admin/hubspot/connect`
- **Request Body**:
```json
{
  "project_id": "22222222-2222-2222-2222-222222222222",
  "private_app_token": "pat-demo-hubspot-sandbox"
}
```
- **Response (200 OK)**:
```json
{
  "status": "success",
  "message": "HubSpot connected successfully.",
  "integration_id": "58f4a132-0943-41bb-92fa-39c4d9b1e9c2"
}
```

### Search Contacts
- **Method**: `GET /api/admin/hubspot/contacts?project_id={id}&q=John`
- **Response (200 OK)**:
```json
{
  "total": 1,
  "results": [
    {
      "id": "101",
      "properties": {
        "firstname": "John",
        "lastname": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1-555-0199",
        "company": "Acme Capital"
      }
    }
  ]
}
```

---

## 🎮 5. Playground Simulator (`/api/admin/projects/{id}/playground-test`)

Simulates the entire intelligent agent pipeline (Input Guardrails → RAG Retrieval → LLM Tool Execution → Post-Check Guardrails).
- **Method**: `POST /api/admin/projects/{project_id}/playground-test`
- **Request Body**:
```json
{
  "query": "What is the available balance for account ACC100234?"
}
```
- **Response (200 OK)**:
```json
{
  "answer": "Your available balance for account ACC100234 is ₹1,84,500.50 with an active Savings account at our Mumbai Main branch. *Disclaimer: Not financial advice*",
  "intent": "mock_banking_apis_get_account_balance",
  "rag_passages": [],
  "tool_calls": [
    {
      "tool": "mock_banking_apis_get_account_balance",
      "endpoint": "GET /accounts/ACC100234/balance",
      "status": "success",
      "status_code": 200,
      "latency_ms": 28.4,
      "result": {
        "account_id": "ACC100234",
        "available_balance": 184500.5,
        "currency": "INR",
        "holder_name": "Arjun Sharma"
      }
    }
  ],
  "latency_ms": 1420.5,
  "tokens_used": 184,
  "model_used": "meta-llama/llama-3.1-8b-instruct"
}
```
