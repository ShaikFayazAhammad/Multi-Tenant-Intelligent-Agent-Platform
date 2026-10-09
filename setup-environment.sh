#!/bin/bash
# Complete environment setup script with dependencies

set -e  # Exit on error

echo "🚀 EFS VMS Complete Environment Setup"
echo "=================================================="
echo ""
echo "This script will:"
echo "  - Copy environment files"
echo "  - Create Python virtual environments"
echo "  - Install Python dependencies"
echo "  - Install Node.js dependencies"
echo ""
if [ "$1" == "--auto" ]; then
    choice=1
    install_deps="Y"
else
    echo "Select environment:"
    echo "1) Development (localhost)"
    echo "2) Staging (192.168.3.155)"
    echo ""
    read -p "Enter choice [1-2]: " choice
fi

case $choice in
    1)
        ENV="development"
        echo "✅ Setting up DEVELOPMENT environment..."
        ;;
    2)
        ENV="staging"
        echo "✅ Setting up STAGING environment..."
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Ask for installation preferences
echo ""
if [ "$1" == "--auto" ]; then
    install_deps="Y"
else
    read -p "Install dependencies? (Python venv + pip, npm) [Y/n]: " install_deps
fi
install_deps=${install_deps:-Y}

echo ""
echo "=================================================="
echo "📝 Step 1: Copying environment files..."
echo "=================================================="

# Setup Frontend Environment
echo ""
echo "🎨 Frontend environment..."
cd frontend
if [ ! -f ".env.$ENV" ]; then
    cp "env.$ENV.template" ".env.$ENV"
    echo "✅ Created frontend/.env.$ENV"
else
    echo "ℹ️  frontend/.env.$ENV already exists"
fi
cd ..

# Setup Backend Environment
echo ""
echo "⚙️  Backend environment..."
cd backend
if [ ! -f ".env" ]; then
    cp "env.$ENV.template" ".env"
    echo "✅ Created backend/.env"
else
    echo "ℹ️  backend/.env already exists"
    if [ "$1" == "--auto" ]; then
        overwrite="N"
    else
        read -p "Overwrite backend/.env? [y/N]: " overwrite
    fi
    if [ "$overwrite" = "y" ] || [ "$overwrite" = "Y" ]; then
        cp "env.$ENV.template" ".env"
        echo "✅ Overwritten backend/.env"
    fi
fi
cd ..

if [ "$install_deps" = "n" ] || [ "$install_deps" = "N" ]; then
    echo ""
    echo "=================================================="
    echo "✅ Environment files setup complete!"
    echo "=================================================="
    echo ""
    echo "⚠️  Skipped dependency installation"
    echo "   Run this script again or install manually"
    exit 0
fi

# Check for Python
echo ""
echo "=================================================="
echo "🔍 Step 2: Checking prerequisites..."
echo "=================================================="

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi
echo "✅ Python $(python3 --version) found"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16 or higher."
    exit 1
fi
echo "✅ Node.js $(node --version) found"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm."
    exit 1
fi
echo "✅ npm $(npm --version) found"

# Setup Backend Virtual Environments and Dependencies
echo ""
echo "=================================================="
echo "🐍 Step 3: Setting up Python environments..."
echo "=================================================="

BACKEND_SERVICES=("app")

echo ""
echo "🔧 Setting up backend virtual environment..."
cd backend

if [ ! -d "venv" ]; then
    echo "  📦 Creating virtual environment..."
    python3 -m venv venv
    echo "  ✅ Virtual environment created"
else
    echo "  ℹ️  Virtual environment already exists"
fi

source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo "  ✅ Dependencies installed from requirements.txt"
fi
deactivate
cd ..

# Setup Frontend Dependencies
echo ""
echo "=================================================="
echo "📦 Step 4: Setting up Frontend dependencies..."
echo "=================================================="

echo ""
echo "🎨 Installing Node.js packages..."
cd frontend

if [ -d "node_modules" ]; then
    echo "ℹ️  node_modules already exists"
    if [ "$1" == "--auto" ]; then
        reinstall="N"
    else
        read -p "Reinstall node_modules? [y/N]: " reinstall
    fi
    if [ "$reinstall" = "y" ] || [ "$reinstall" = "Y" ]; then
        echo "🗑️  Removing old node_modules..."
        rm -rf node_modules package-lock.json
        echo "📥 Installing fresh dependencies..."
        npm install
        echo "✅ Frontend dependencies installed"
    else
        echo "⏭️  Skipping frontend installation"
    fi
else
    echo "📥 Installing dependencies..."
    npm install
    echo "✅ Frontend dependencies installed"
fi

cd ..

# Final Summary
echo ""
echo "=================================================="
echo "✅ COMPLETE SETUP FINISHED!"
echo "=================================================="
echo ""
echo "📊 Summary:"
echo "  ✅ Environment files configured for $ENV"
echo "  ✅ Python virtual environments created:"
for service in "${BACKEND_SERVICES[@]}"; do
    echo "     - backend/$service/venv"
done
echo "  ✅ Python dependencies installed"
echo "  ✅ Node.js dependencies installed"
echo ""
echo "=================================================="

if [ "$ENV" = "development" ]; then
    echo "🎯 Next Steps (Development):"
    echo ""
    echo "1. Update API keys in backend/.env if needed"
    echo "   - OPENAI_API_KEY"
    echo "   - ELEVENLABS_API_KEY"
    echo ""
    echo "2. Start all services:"
    echo "   ./start-all-dev.sh"
    echo ""
    echo "3. Access application:"
    echo "   http://localhost:3000"
    echo ""
    echo "4. Individual service ports:"
    echo "   - Frontend:     http://localhost:3000"
    echo "   - Main Backend: http://localhost:8000"
    echo "   - RAG Bot:      http://localhost:8002"
    echo "   - Floor Map:    http://localhost:8003"
    echo "   - Mock API:     http://localhost:5000"
elif [ "$ENV" = "staging" ]; then
    echo "🎯 Next Steps (Staging):"
    echo ""
    echo "1. Update API keys in backend/.env if needed"
    echo "   - OPENAI_API_KEY"
    echo "   - ELEVENLABS_API_KEY"
    echo ""
    echo "2. Update environment URLs in:"
    echo "   - frontend/.env.staging (VITE_OIDC_AUTHORITY, etc.)"
    echo "   - backend/.env (BASE_URL, etc.)"
    echo ""
    echo "3. Ensure firewall ports are open:"
    echo "   - 8144-8148"
    echo ""
    echo "4. Start all services:"
    echo "   ./start-all-staging.sh"
    echo ""
    echo "5. Access application:"
    echo "   http://192.168.3.155:8148"
    echo ""
    echo "6. Individual service ports:"
    echo "   - Frontend:     http://192.168.3.155:8148"
    echo "   - Main Backend: http://192.168.3.155:8147"
    echo "   - RAG Bot:      http://192.168.3.155:8145"
    echo "   - Floor Map:    http://192.168.3.155:8144"
    echo "   - Mock API:     http://192.168.3.155:8146"
fi

echo ""
echo "=================================================="
echo "📚 Documentation:"
echo "   - Environment Guide:  ENVIRONMENT_SETUP_GUIDE.md"
echo "   - Vite Config Guide:  VITE_CONFIG_GUIDE.md"
echo "=================================================="
echo ""

