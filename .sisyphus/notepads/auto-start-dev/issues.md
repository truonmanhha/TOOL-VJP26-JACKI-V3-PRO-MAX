
## Issue: WSL/Windows Path I/O Errors on npm install

**Date**: 2026-02-23  
**Status**: UNRESOLVED  

### Problem
- `npm install` fails with `ENOENT` error when trying to create `/mnt/d/.../node_modules/@esbuild/linux-x64`
- Root cause: Windows platform binaries (`.exe`, `.node` files) cached in `node_modules/@esbuild/.win32-x64-gkHGy7yr/`
- These files cause I/O errors on Linux/WSL when trying to remove or overwrite
- Path conflicts between Windows mount and Linux filesystem

### Attempted Solutions
1. ✗ `rm -rf node_modules/@esbuild` → Input/output error
2. ✗ `rm -rf node_modules package-lock.json` → Can't remove .exe/.node files
3. ✗ `npm install --legacy-peer-deps` → Same ENOENT error
4. ✗ `npm install --force` → Same error despite --force flag
5. ✗ `npm ci` → Requires package-lock.json which doesn't exist

### Workaround Status
- **package.json updated** ✓ (dev script now uses `npx concurrently`)
- **npm install blocked** ✗ (system-level I/O issue)
- **npm run dev might work** ? (depends on existing node_modules state)

### Recommendation
- Run `npm install` on Windows native console or PowerShell (not WSL)
- Or: Use Windows File Explorer to manually delete node_modules, then retry
- The `npx concurrently` update is ready; just needs npm to complete install
