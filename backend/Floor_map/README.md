# EFS Floor Navigation API - Quick Start

## Setup and Run (Windows)

### Option 1: Quick Start (Recommended)
Just run the batch file:
```cmd
setup_and_run.bat
```

### Option 2: Manual Setup
```cmd
# Create directories
mkdir static\floor
mkdir static\images

# Copy files
copy Floor_map\all_floors.html static\floor\
xcopy Floor_map\images\* static\images\ /E /Y
copy Floor_map\script\* static\floor\

# Run the server
python main.py
```

### Option 3: Using uvicorn directly
```cmd
# First, make sure uvicorn is in your PATH
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Access the API

Once running, visit:
- **API Documentation**: http://localhost:8000/docs
- **API Base**: http://localhost:8000

## API Endpoints

### POST /api/navigate
Get navigation route between two locations.

**Example:**
```bash
curl -X POST "http://localhost:8000/api/navigate" ^
  -H "Content-Type: application/json" ^
  -d "{\"source\": \"Transformation\", \"destination\": \"Innovation\"}"
```

### GET /api/locations
List all available locations grouped by floor.

### GET /api/search?q=query
Search for locations.

**Example:**
```bash
curl "http://localhost:8000/api/search?q=printer"
```

## Troubleshooting

**Error: Directory 'static/floor' does not exist**
- Run `setup_and_run.bat` or manually create the directories and copy files

**Error: 'uvicorn' is not recognized**
- Use `python main.py` instead, or
- Use `python -m uvicorn main:app --reload`

**Port already in use**
- Change the port in main.py (line 230) from 8000 to another port
