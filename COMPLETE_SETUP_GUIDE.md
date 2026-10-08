# Complete Environment Setup Guide

This guide covers the **complete automated setup** of the EFS VMS application, including environment configuration, virtual environments, and dependency installation.

---

## 📋 Prerequisites

Before running the setup script, ensure you have:

### **Required Software**

| Software | Minimum Version | Check Command |
|----------|----------------|---------------|
| Python | 3.8+ | `python --version` or `python3 --version` |
| Node.js | 16+ | `node --version` |
| npm | 8+ | `npm --version` |
| Git | Any recent version | `git --version` |

### **Installation Links**

- **Python**: https://www.python.org/downloads/
- **Node.js** (includes npm): https://nodejs.org/
- **Git**: https://git-scm.com/downloads

---

## 🚀 Quick Start

### **Linux / macOS**

```bash
# Make script executable
chmod +x setup-environment.sh

# Run setup
./setup-environment.sh
```

### **Windows**

```powershell
# Run batch script
setup-environment.bat

# Or PowerShell (if available)
.\setup-environment.ps1
```

---

## 📝 What the Setup Script Does

### **Step 1: Environment Configuration**

1. Prompts you to select environment:
   - **Development** (localhost)
   - **Staging** (192.168.3.155)

2. Copies appropriate environment templates:
   - `frontend/env.[environment].template` → `frontend/.env.[environment]`
   - `backend/env.[environment].template` → `backend/.env`

### **Step 2: Prerequisite Checks**

Verifies that required software is installed:
- ✅ Python 3.8+
- ✅ Node.js 16+
- ✅ npm 8+

### **Step 3: Python Virtual Environments**

Creates isolated Python environments for each backend service:

```
backend/
├── efs_vms_chatbot/venv/    # Main chatbot backend
├── efs-rag-bot/venv/         # RAG (Retrieval-Augmented Generation) bot
└── Floor_map/venv/           # Floor navigation service
```

**Why virtual environments?**
- Isolates dependencies for each service
- Prevents version conflicts
- Easy to clean and recreate
- Industry best practice

### **Step 4: Python Dependencies**

For each backend service:
1. Activates virtual environment
2. Upgrades pip to latest version
3. Installs packages from `requirements.txt` or `requirements1.txt`

**Installed packages include:**
- FastAPI, Uvicorn (web framework)
- OpenAI SDK (AI integration)
- LangChain (LLM orchestration)
- Pydantic (data validation)
- And many more...

### **Step 5: Frontend Dependencies**

Installs Node.js packages for the React frontend:
1. Checks if `node_modules` exists
2. Prompts to reinstall if already present
3. Runs `npm install` to install all dependencies

**Installed packages include:**
- React, React DOM
- Vite (build tool)
- TypeScript
- Zustand (state management)
- react-oidc-context (authentication)
- And many more...

---

## 🎯 Step-by-Step Walkthrough

### **Example: Development Setup**

```bash
$ ./setup-environment.sh

🚀 EFS VMS Complete Environment Setup
==================================================

This script will:
  - Copy environment files
  - Create Python virtual environments
  - Install Python dependencies
  - Install Node.js dependencies

Select environment:
1) Development (localhost)
2) Staging (192.168.3.155)

Enter choice [1-2]: 1
✅ Setting up DEVELOPMENT environment...

Install dependencies? (Python venv + pip, npm) [Y/n]: Y

==================================================
📝 Step 1: Copying environment files...
==================================================

🎨 Frontend environment...
✅ Created frontend/.env.development

⚙️  Backend environment...
✅ Created backend/.env

==================================================
🔍 Step 2: Checking prerequisites...
==================================================
✅ Python 3.10.5 found
✅ Node.js v18.16.0 found
✅ npm 9.5.1 found

==================================================
🐍 Step 3: Setting up Python environments...
==================================================

🔧 Setting up: backend/efs_vms_chatbot
  📦 Creating virtual environment...
  ✅ Virtual environment created
  📥 Installing Python dependencies...
  ✅ Dependencies installed from requirements.txt

🔧 Setting up: backend/efs-rag-bot
  📦 Creating virtual environment...
  ✅ Virtual environment created
  📥 Installing Python dependencies...
  ✅ Dependencies installed from requirements.txt

🔧 Setting up: backend/Floor_map
  📦 Creating virtual environment...
  ✅ Virtual environment created
  📥 Installing Python dependencies...
  ✅ Dependencies installed from requirements.txt

==================================================
📦 Step 4: Setting up Frontend dependencies...
==================================================

🎨 Installing Node.js packages...
📥 Installing dependencies...
✅ Frontend dependencies installed

==================================================
✅ COMPLETE SETUP FINISHED!
==================================================

📊 Summary:
  ✅ Environment files configured for development
  ✅ Python virtual environments created:
     - backend/efs_vms_chatbot/venv
     - backend/efs-rag-bot/venv
     - backend/Floor_map/venv
  ✅ Python dependencies installed
  ✅ Node.js dependencies installed
```

---

## ⚙️ Manual Configuration Required

After running the setup script, you must update some configuration values:

### **1. Backend API Keys**

Edit `backend/.env`:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Required: ElevenLabs API Key (for text-to-speech)
ELEVENLABS_API_KEY=your-actual-elevenlabs-api-key-here

# Optional: Other service API keys
PINECONE_API_KEY=your-pinecone-key-here
```

### **2. Staging/Production URLs** (if not using localhost)

Edit `frontend/.env.staging`:

```env
# Update these to match your server
VITE_OIDC_AUTHORITY=http://your-server-ip:8146
VITE_WS_URL=ws://your-server-ip:8147/ws
VITE_FLOOR_MAP_URL=http://your-server-ip:8144
```

Edit `backend/.env`:

```env
# Update base URL for mock API
MOCK_API_BASE_URL=http://your-server-ip:8146
```

---

## 🏃 Running the Application

### **Development Mode**

```bash
# Linux/macOS
./start-all-dev.sh

# Windows
start-all-dev.bat
# or
.\start-all-dev.ps1
```

**Access at:** http://localhost:3000

**Service Ports:**
- Frontend: 3000
- Main Backend: 8000
- RAG Bot: 8002
- Floor Map: 8003
- Mock API: 5000

### **Staging Mode**

```bash
# On Ubuntu server
./start-all-staging.sh
```

**Access at:** https://vms2.0.haloocom.in or http://192.168.3.155:8148

**Service Ports (192.168.3.155):**
- Frontend: 8148
- Main Backend: 8147
- RAG Bot: 8145
- Floor Map: 8144
- Mock API: 8146

---

## 🔧 Manual Dependency Installation

If you prefer to install dependencies manually or if the script fails:

### **Backend (Python)**

```bash
# For each backend service
cd backend/efs_vms_chatbot

# Create virtual environment
python3 -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate.bat

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Deactivate
deactivate
```

Repeat for:
- `backend/efs-rag-bot/`
- `backend/Floor_map/`

### **Frontend (Node.js)**

```bash
cd frontend
npm install
```

---

## 📁 Project Structure After Setup

```
efs_vms_2.0/
├── frontend/
│   ├── .env.development          # ✅ Created by script
│   ├── node_modules/             # ✅ Created by npm install
│   └── package.json
│
├── backend/
│   ├── .env                      # ✅ Created by script
│   │
│   ├── efs_vms_chatbot/
│   │   ├── venv/                 # ✅ Created by script
│   │   └── requirements.txt
│   │
│   ├── efs-rag-bot/
│   │   ├── venv/                 # ✅ Created by script
│   │   └── requirements.txt
│   │
│   └── Floor_map/
│       ├── venv/                 # ✅ Created by script
│       └── requirements.txt
│
└── setup-environment.sh          # Setup script
```

---

## 🐛 Troubleshooting

### **Issue: Python not found**

**Linux/macOS:**
```bash
# Check if python3 is available
which python3

# If not installed
# Ubuntu/Debian:
sudo apt install python3 python3-venv python3-pip

# macOS:
brew install python3
```

**Windows:**
- Download from https://www.python.org/downloads/
- Check "Add Python to PATH" during installation

### **Issue: Node.js not found**

**Linux/macOS:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or via package manager
# Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
- Download from https://nodejs.org/
- Install LTS version

### **Issue: Permission denied (Linux/macOS)**

```bash
# Make script executable
chmod +x setup-environment.sh

# If still issues, run with bash
bash setup-environment.sh
```

### **Issue: pip install fails**

```bash
# Upgrade pip first
pip install --upgrade pip

# If SSL errors on Windows
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

# If specific package fails, try installing individually
pip install fastapi
pip install uvicorn
# etc.
```

### **Issue: npm install fails**

```bash
# Clear npm cache
npm cache clean --force

# Delete and retry
rm -rf node_modules package-lock.json
npm install

# Use different registry if blocked
npm install --registry=https://registry.npmmirror.com
```

### **Issue: Virtual environment activation fails (Windows)**

```powershell
# If PowerShell execution policy blocks activation
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then retry activation
venv\Scripts\Activate.ps1
```

---

## ✅ Verification Checklist

After setup completes, verify:

- [ ] All environment files created:
  - `frontend/.env.development` (or `.env.staging`)
  - `backend/.env`

- [ ] All virtual environments created:
  - `backend/efs_vms_chatbot/venv/`
  - `backend/efs-rag-bot/venv/`
  - `backend/Floor_map/venv/`

- [ ] Frontend dependencies installed:
  - `frontend/node_modules/` exists
  - Contains React, Vite, TypeScript, etc.

- [ ] API keys configured in `backend/.env`:
  - `OPENAI_API_KEY` set
  - `ELEVENLABS_API_KEY` set

- [ ] Can activate virtual environments:
  ```bash
  # Linux/macOS
  source backend/efs_vms_chatbot/venv/bin/activate
  python --version  # Should show Python 3.8+
  
  # Windows
  backend\efs_vms_chatbot\venv\Scripts\activate.bat
  python --version
  ```

---

## 🔄 Re-running Setup

It's safe to re-run the setup script:

- **Environment files**: Prompts before overwriting
- **Virtual environments**: Skips if already exists
- **Dependencies**: Reinstalls (useful for updates)
- **node_modules**: Prompts before reinstalling

```bash
# Force clean reinstall
./setup-environment.sh
# When prompted, choose to overwrite/reinstall
```

---

## 📚 Related Documentation

- **Environment Configuration**: `ENVIRONMENT_SETUP_GUIDE.md`
- **Vite Configuration**: `VITE_CONFIG_GUIDE.md`
- **Windows Startup**: `WINDOWS_STARTUP_GUIDE.md`
- **Deployment**: `SUBDIRECTORY_DEPLOYMENT_FIX.md`

---

## 🎓 Understanding the Setup

### **Why Virtual Environments?**

Virtual environments isolate Python dependencies:

```
System Python (3.10)
├── Global packages (affects everything)
│
└── Virtual Environments
    ├── efs_vms_chatbot/venv (FastAPI 0.104.1)
    ├── efs-rag-bot/venv (LangChain 0.0.339)
    └── Floor_map/venv (FastAPI 0.95.0)
```

**Benefits:**
- No version conflicts
- Clean project structure
- Easy dependency management
- Portable across systems

### **Why Environment Files?**

Environment files store configuration without hardcoding:

```env
# Development
OPENAI_API_KEY=sk-dev-key-123
API_URL=http://localhost:8000

# Production
OPENAI_API_KEY=sk-prod-key-789
API_URL=https://production.com
```

**Benefits:**
- Secure (not committed to git)
- Environment-specific values
- Easy to change
- Standard practice

---

## 💡 Tips

1. **First time setup**: Allow 5-10 minutes for all dependencies to install
2. **API Keys**: Get OpenAI key from https://platform.openai.com/api-keys
3. **Port conflicts**: If ports are in use, update `.env` files before starting services
4. **Updates**: Re-run setup script when `requirements.txt` or `package.json` changes
5. **Clean slate**: Delete `venv/` folders and `node_modules/` to start fresh

---

## 🆘 Getting Help

If setup fails:

1. **Check prerequisites**: Ensure Python, Node.js, npm are installed
2. **Read error messages**: Usually indicate what's missing
3. **Check logs**: Look for specific package installation errors
4. **Try manual installation**: Follow manual steps in this guide
5. **Check documentation**: See related guides listed above

---

## Summary

The complete setup script automates:
- ✅ Environment file configuration
- ✅ Python virtual environment creation
- ✅ Python dependency installation (pip)
- ✅ Node.js dependency installation (npm)

**Result**: Fully configured development/staging environment ready to run!

Just update your API keys in `backend/.env` and run the startup script.

