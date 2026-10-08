# 🚨 IMPORTANT: Setup Instructions

## Problem Found
The `static/floor` directory is **EMPTY**. The HTML files need to be copied from `Floor_map\` subdirectory.

## Quick Fix - Run This Command

**In your CMD terminal at `C:\Users\rakes\Downloads\Floor_map\`:**

```cmd
copy_files.bat
```

OR manually run these commands:

```cmd
copy /Y Floor_map\all_floors.html static\floor\
xcopy /E /Y /I Floor_map\images\* static\images\
copy /Y Floor_map\script\* static\floor\
```

## Then Start the Server

```cmd
python main.py
```

## Verify Files Are Copied

Check that this file exists:
```
C:\Users\rakes\Downloads\Floor_map\static\floor\all_floors.html
```

## Test the API

```cmd
curl -X POST "http://localhost:8000/api/navigate" ^
  -H "Content-Type: application/json" ^
  -d "{\"source\": \"Transformation\", \"destination\": \"Innovation\"}"
```

## Expected Response

```json
{
  "source": "Transformation",
  "destination": "Innovation",
  "source_floor": "First Floor",
  "destination_floor": "First Floor",
  "floor_html_url": "file:///C:/Users/rakes/Downloads/Floor_map/static/floor/all_floors.html?source=Transformation&destination=Innovation",
  "message": "Navigation route generated successfully",
  "cross_floor": false
}
```

## If You Get Error

If API returns error "HTML file not found", it means files weren't copied. Run `copy_files.bat` again.

## Files That Should Exist

After running copy_files.bat, verify these exist:
- ✅ `static\floor\all_floors.html`
- ✅ `static\floor\gif.js`
- ✅ `static\floor\gif.worker.js`
- ✅ `static\images\first_floor.jpg`
- ✅ `static\images\second_floor.jpg`
- ✅ `static\images\third_floor.jpg`
- ✅ `static\images\ground_floor.jpg`
