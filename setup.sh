#!/bin/bash
# Complete environment setup script for Ubuntu

set -e  # Exit on error

echo "🚀 EFS VMS Complete Environment Setup (Ubuntu)"
echo "=================================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please run: sudo apt install python3 python3-venv python3-pip"
    exit 1
fi
echo "✅ Python $(python3 --version) found"

# Check if python3-venv works
if ! python3 -c "import venv" &> /dev/null; then
    echo "❌ Python venv module not found. Please run: sudo apt install python3-venv"
    exit 1
fi
echo "✅ Python venv module verified"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi
echo "✅ Node.js $(node --version) found"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi
echo "✅ npm $(npm --version) found"

# Step 2: Set up environment files if they don't exist
echo ""
echo "=================================================="
echo "📝 Step 2: Copying environment files..."
echo "=================================================="

# Setup Backend env
if [ ! -f "backend/.env" ]; then
    cp "backend/env.staging.template" "backend/.env"
    echo "✅ Created backend/.env from staging template"
    echo "⚠️  Please update API keys (OPENAI_API_KEY, ELEVENLABS_API_KEY) in backend/.env"
else
    echo "ℹ️  backend/.env already exists. Skipping copy."
fi

# Setup Frontend env
if [ ! -f "frontend/.env.development" ]; then
    cp "frontend/env.development.template" "frontend/.env.development"
    echo "✅ Created frontend/.env.development"
else
    echo "ℹ️  frontend/.env.development already exists. Skipping copy."
fi

if [ ! -f "frontend/.env.staging" ]; then
    cp "frontend/env.staging.template" "frontend/.env.staging"
    echo "✅ Created frontend/.env.staging"
else
    echo "ℹ️  frontend/.env.staging already exists. Skipping copy."
fi

# Step 3: Set up Python virtual environments and dependencies
echo ""
echo "=================================================="
echo "🐍 Step 3: Setting up Python virtual environments..."
echo "=================================================="

BACKEND_SERVICES=("efs_vms_chatbot" "efs-rag-bot" "Floor_map")

for service in "${BACKEND_SERVICES[@]}"; do
    echo ""
    echo "⚙️ Setting up: backend/$service"
    cd "backend/$service"
    
    if [ ! -d "venv" ]; then
        echo "  📦 Creating virtual environment..."
        python3 -m venv venv
        echo "  ✅ Virtual environment created"
    else
        echo "  ℹ️  Virtual environment already exists"
    fi
    
    echo "  📥 Installing Python dependencies..."
    source venv/bin/activate
    pip install --upgrade pip > /dev/null 2>&1
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        echo "  ✅ Dependencies installed from requirements.txt"
    elif [ -f "requirements1.txt" ]; then
        pip install -r requirements1.txt
        echo "  ✅ Dependencies installed from requirements1.txt"
    else
        echo "  ⚠️  No requirements file found"
    fi
    
    deactivate
    cd "$SCRIPT_DIR"
done

# Step 4: Install Frontend Node packages
echo ""
echo "=================================================="
echo "📦 Step 4: Setting up Frontend dependencies..."
echo "=================================================="
cd frontend
echo "📥 Installing Node.js packages..."
npm install
cd "$SCRIPT_DIR"

echo ""
echo "=================================================="
echo "🎉 COMPLETE SETUP FINISHED SUCCESSFULLY!"
echo "=================================================="
echo "To start all services in the background, run:"
echo "  chmod +x start.sh"
echo "  ./start.sh"
echo "=================================================="
