from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware
import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create static directories if they don't exist
os.makedirs("static/floor", exist_ok=True)
os.makedirs("static/images", exist_ok=True)

# Lifespan event handler for startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 80)
    logger.info("🚀 EFS Floor Navigation API Starting Up")
    logger.info("=" * 80)
    logger.info("📋 Registered routes:")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = list(route.methods) if route.methods else ['N/A']
            logger.info(f"  {methods[0]} {route.path}")
    logger.info("=" * 80)
    
    yield  # Application runs
    
    # Shutdown (if needed)
    logger.info("🛑 EFS Floor Navigation API Shutting Down")

app = FastAPI(
    title="EFS Floor Navigation API",
    description="API for indoor navigation across multiple floors",
    version="1.0.0",
    lifespan=lifespan
)

# Request logging and path normalization middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Normalize path: handle double slashes
        path = request.url.path
        if "//" in path:
            normalized_path = "/".join(filter(None, path.split("/")))
            if not normalized_path.startswith("/"):
                normalized_path = "/" + normalized_path
            
            # Reconstruct URL with normalized path
            from starlette.datastructures import URL
            new_url = request.url.replace(path=normalized_path)
            logger.info(f"Normalizing double slashes: {request.url} -> {new_url}")
            # Internal redirect (rewriting request scope)
            request.scope["path"] = normalized_path
            request.scope["raw_path"] = normalized_path.encode()

        logger.info(f"Request: {request.method} {request.url}")
        response = await call_next(request)
        logger.info(f"Response: {response.status_code}")
        return response

app.add_middleware(RequestLoggingMiddleware)

# CORS middleware to allow web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Floor location mappings
FLOOR_LOCATIONS = {
    "first": {
        "locations": ["Transformation", "Innovation", "Diversity", "Lift", "Right Stair", 
                     "Printer2", "Printer1", "Service lift", "Women's Restroom", 
                     "Men's Restroom", "Left Stair"],
        "html_file": "all_floors.html",
        "floor_name": "First Floor"
    },
    "second": {
        "locations": ["Integrity", "Prudence", "Quality Assurance", "Resilence", "Lift",
                     "Right Stair", "Service lift", "Men's Restroom", "Women's Restroom",
                     "Printer1", "Printer2", "Printer3"],
        "floor_name": "Second Floor"
    },
    "third": {
        "locations": ["Excellence", "Governance", "Peoples", "Precision", "Passion", "Lean",
                     "Lift", "Right Stair", "Service lift", "Men's Restroom", "Women's Restroom",
                     "Printer1", "Printer2"],
        "floor_name": "Third Floor"
    },
    "ground": {
        "locations": ["Lift", "Ehsaas", "Happiness", "Wecan", "Progression", "Right Stair",
                     "Service lift", "Men's Restroom", "Women's Restroom", "Printer1",
                     "Men's Prayer Room", "Women's Prayer Room", "Auditorium"],
        "floor_name": "Ground Floor"
    }
}

# Request/Response models
class NavigationRequest(BaseModel):
    source: str
    destination: str

class NavigationResponse(BaseModel):
    source: str
    destination: str
    source_floor: str
    destination_floor: str
    floor_html_url: str
    message: str
    cross_floor: bool

class LocationInfo(BaseModel):
    floor: str
    floor_name: str
    locations: List[str]

class FloorInfo(BaseModel):
    floor_id: str
    floor_name: str
    location_count: int


def find_location_floor(location: str) -> Optional[str]:
    """Find which floor a location belongs to"""
    for floor_id, floor_data in FLOOR_LOCATIONS.items():
        if location in floor_data["locations"]:
            return floor_id
    return None


@app.get("/")
async def root():
    """Root endpoint with API information"""
    logger.info("Root endpoint called")
    return {
        "message": "EFS Floor Navigation API",
        "version": "1.0.0",
        "endpoints": {
            "navigate": "/api/navigate (POST)",
            "locations": "/api/locations (GET)",
            "floors": "/api/floors (GET)",
            "floor_map": "/floor/all_floors.html (GET)",
            "docs": "/docs"
        }
    }

@app.get("/test-floor-map")
async def test_floor_map():
    """Test endpoint to verify the route is working"""
    logger.info("Test endpoint called")
    return {"message": "Test endpoint working", "route": "/floor/all_floors.html"}


@app.post("/api/navigate", response_model=NavigationResponse)
async def navigate(request: NavigationRequest):
    """
    Get navigation route between source and destination
    
    Args:
        source: Starting location name
        destination: Ending location name
    
    Returns:
        Navigation information including floor HTML URL
    """
    source = request.source.strip()
    destination = request.destination.strip()
    
    # Find floors for source and destination
    source_floor = find_location_floor(source)
    destination_floor = find_location_floor(destination)
    
    if not source_floor:
        raise HTTPException(
            status_code=404,
            detail=f"Source location '{source}' not found. Use /api/locations to see available locations."
        )
    
    if not destination_floor:
        raise HTTPException(
            status_code=404,
            detail=f"Destination location '{destination}' not found. Use /api/locations to see available locations."
        )
    
    # Determine if cross-floor navigation
    cross_floor = source_floor != destination_floor
    
    # Construct absolute file path URL - just like the original process
    # The HTML file already handles all the navigation logic internally
    from urllib.parse import quote
    import os
    
    # Get absolute path to the HTML file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    html_file_path = os.path.join(current_dir, "Floor_map", "all_floors.html")
    
    # Convert to file:// URL format with query parameters
    # This matches your existing process - just wrapping it in a REST API
    floor_html_url = f"file:///{html_file_path.replace(os.sep, '/')}?start={quote(source)}&dest={quote(destination)}"
    
    message = "Navigation route generated successfully"
    if cross_floor:
        message += f" (Cross-floor navigation: {FLOOR_LOCATIONS[source_floor]['floor_name']} → {FLOOR_LOCATIONS[destination_floor]['floor_name']})"
    
    return NavigationResponse(
        source=source,
        destination=destination,
        source_floor=FLOOR_LOCATIONS[source_floor]['floor_name'],
        destination_floor=FLOOR_LOCATIONS[destination_floor]['floor_name'],
        floor_html_url=floor_html_url,
        message=message,
        cross_floor=cross_floor
    )


@app.get("/api/locations", response_model=List[LocationInfo])
async def get_locations():
    """
    Get all available locations grouped by floor
    
    Returns:
        List of floors with their locations
    """
    result = []
    for floor_id, floor_data in FLOOR_LOCATIONS.items():
        result.append(LocationInfo(
            floor=floor_id,
            floor_name=floor_data['floor_name'],
            locations=sorted(floor_data['locations'])
        ))
    return result


@app.get("/api/floors", response_model=List[FloorInfo])
async def get_floors():
    """
    Get information about all available floors
    
    Returns:
        List of floor information
    """
    result = []
    for floor_id, floor_data in FLOOR_LOCATIONS.items():
        result.append(FloorInfo(
            floor_id=floor_id,
            floor_name=floor_data['floor_name'],
            location_count=len(floor_data['locations'])
        ))
    return result


@app.get("/api/search")
async def search_location(q: str):
    """
    Search for locations by partial name match
    
    Args:
        q: Search query string
    
    Returns:
        Matching locations with their floor information
    """
    query = q.lower().strip()
    results = []
    
    for floor_id, floor_data in FLOOR_LOCATIONS.items():
        for location in floor_data['locations']:
            if query in location.lower():
                results.append({
                    "location": location,
                    "floor": floor_data['floor_name'],
                    "floor_id": floor_id
                })
    
    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No locations found matching '{q}'"
        )
    
    return {"query": q, "results": results, "count": len(results)}


# IMPORTANT: Specific route for all_floors.html MUST come before any catch-all routes
# Direct route to serve the floor map HTML file with query parameters
@app.get("/floor/all_floors.html")
@app.get("/all_floors.html")  # Fallback for proxied requests (e.g. Nginx stripping /floor/)
async def serve_floor_map(start: Optional[str] = None, dest: Optional[str] = None):
    """
    Serve the floor map HTML file with optional start and destination parameters
    """
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    html_file_path = os.path.join(current_dir, "static", "floor", "all_floors.html")
    
    logger.info(f"🗺️ [serve_floor_map] Request received - start: {start}, dest: {dest}")
    logger.info(f"🗺️ [serve_floor_map] html_file_path: {html_file_path}")
    logger.info(f"🗺️ [serve_floor_map] File exists: {os.path.exists(html_file_path)}")
    
    if not os.path.exists(html_file_path):
        logger.error(f"❌ [serve_floor_map] ERROR: File not found at {html_file_path}")
        raise HTTPException(status_code=404, detail=f"Floor map file not found at {html_file_path}")
    
    logger.info(f"✅ [serve_floor_map] Serving file successfully")
    return FileResponse(
        html_file_path,
        media_type="text/html",
        headers={
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        }
    )

# Route to serve JS and other asset files from the floor directory  
# This catch-all route comes AFTER the specific all_floors.html route
@app.get("/floor/{filename:path}")
@app.get("/{filename:path}")  # Fallback for proxied assets
async def serve_floor_assets(filename: str):
    """
    Serve JS and other asset files from the floor directory (gif.js, etc.)
    """
    import os
    
    # If the catch-all route captured "floor/...", strip it so we don't duplicate it when joining paths
    if filename.startswith("floor/"):
        filename = filename[6:]
        
    logger.info(f"📁 [serve_floor_assets] Requested file: {filename}")
    
    # Don't handle all_floors.html here - it has its own route above
    if filename == "all_floors.html" or "all_floors.html?" in filename:
        logger.warning(f"⚠️ all_floors.html should be handled by dedicated route, not catch-all")
        # We can actually just call serve_floor_map here if we want to be super robust
        return await serve_floor_map()
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, "static", "floor", filename)
    
    # Security: prevent directory traversal
    if ".." in filename or filename.startswith("/"):
        logger.warning(f"🚫 Invalid file path attempted: {filename}")
        raise HTTPException(status_code=403, detail="Invalid file path")
    
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        logger.error(f"❌ File not found: {file_path}")
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    
    # Determine media type based on file extension
    media_type = "application/javascript" if filename.endswith(".js") else "text/plain"
    
    logger.info(f"✅ Serving file: {filename}")
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={
            "Access-Control-Allow-Origin": "*",
        }
    )

# Mount images directory
try:
    app.mount("/images", StaticFiles(directory="static/images"), name="images")
    logger.info("Mounted /images static files")
except Exception as e:
    logger.error(f"Error mounting /images: {e}")


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get port from environment variable with fallback
    # Development: 8003, Staging: 8144
    PORT = int(os.getenv("FLOOR_MAP_PORT", "8003"))
    
    print("="*80)
    print(f"🗺️  Starting Floor Map Server on port {PORT}")
    print(f"🌐 Floor Map URL: http://0.0.0.0:{PORT}")
    print(f"📍 Static files: /floor, /images")
    print("="*80 + "\n")
    
    # Note: reload=True only works when using 'uvicorn main:app --reload' from command line
    # When running as 'python main.py', we use reload=False
    uvicorn.run(app, host="0.0.0.0", port=PORT)