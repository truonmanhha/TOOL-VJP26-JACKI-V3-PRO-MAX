# Auto-Start Dev Setup - Learnings

## Completed
1. ✓ Updated package.json with new scripts:
   - `dev`: Main script using concurrently to run all 3 services in parallel
   - `dev:vite`: Vite dev server (port 5173)
   - `dev:server`: Express backend (port 3000)
   - `dev:python`: Python FastAPI (port 8000)
   - `dev:install-python`: Helper to install Python dependencies

2. ✓ Added `concurrently` (^8.0.0) to devDependencies

## Technical Details
- Concurrently options used:
  - `--kill-others-on-exit`: Ensures all services stop when one fails
  - `--names "vite,server,python"`: Names for each process
  - `--prefix "[{name}]"`: Colored prefix for each process output
  - `--prefix-colors "blue,yellow,magenta"`: Color scheme

- Python command uses `python3 -m uvicorn` with:
  - `--app-dir backend`: Points to backend directory where nesting_api.py lives
  - `--reload`: Hot-reload on file changes
  - `--port 8000`: Standard port for Python API
  - `--log-level info`: Logging detail

## Script Syntax Verified
All scripts validated in package.json with proper escaping and formatting.

## Next Steps (if npm install works)
- Run `npm install` to fetch concurrently and other deps
- Run `npm run dev` to start all 3 services simultaneously

## Task: Update package.json dev script to use npx concurrently

**Date**: 2026-02-23  
**Status**: PARTIAL SUCCESS  

### Completed
✓ Updated `package.json` line 7:
  - Changed: `"dev": "concurrently ..."`
  - To: `"dev": "npx concurrently ..."`
  - This ensures `concurrently` is resolved from npm cache at runtime

### Blockers
✗ `npm install` blocked by WSL/Windows mount I/O errors
  - Windows platform binaries cached in node_modules causing conflicts
  - Cannot be removed from WSL; requires Windows-native file operations

### Key Learning
- WSL mount at `/mnt/d/` has legacy Windows binaries cached
- npm can't overwrite cross-platform builds in that location
- Solution: Use Windows PowerShell/CMD for npm operations on that path, not WSL

### Next Steps
1. Open Windows PowerShell
2. Navigate to project root
3. Run: `rmdir /s /q node_modules` then `npm install`
4. Or: Use GitHub Actions to build (doesn't have WSL issues)

## Windows Python Compatibility (2026-02-23)
- Changed `python3` → `python` in package.json scripts (lines 10, 11)
- Windows users typically have `python` in PATH, not `python3`
- Scripts affected:
  - `dev:python`: Python FastAPI uvicorn startup
  - `dev:install-python`: Python pip dependency installer
- Allows `npm run dev` to work on Windows without "'python3' is not recognized" error
