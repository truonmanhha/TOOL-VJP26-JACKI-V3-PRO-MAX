# ============================================================
# SETUP SCRIPT FOR NEW NEST LIST MODULE
# Run this script to verify installation
# ============================================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "New Nest List Module - Setup Checker" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend folder exists
Write-Host "Checking backend folder..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Write-Host "[OK] Backend folder found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend folder not found" -ForegroundColor Red
    exit 1
}

# Check if nesting_api.py exists
Write-Host "Checking nesting_api.py..." -ForegroundColor Yellow
if (Test-Path "backend\nesting_api.py") {
    Write-Host "[OK] nesting_api.py found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] nesting_api.py not found" -ForegroundColor Red
    exit 1
}

# Check if requirements.txt exists
Write-Host "Checking requirements.txt..." -ForegroundColor Yellow
if (Test-Path "backend\requirements.txt") {
    Write-Host "[OK] requirements.txt found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] requirements.txt not found" -ForegroundColor Red
    exit 1
}

# Check if NewNestList folder exists
Write-Host "Checking NewNestList module..." -ForegroundColor Yellow
if (Test-Path "components\nesting\NewNestList") {
    Write-Host "[OK] NewNestList module found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] NewNestList module not found" -ForegroundColor Red
    exit 1
}

# Count component files
$componentCount = (Get-ChildItem "components\nesting\NewNestList\*.tsx" -File).Count
Write-Host "Found $componentCount component files" -ForegroundColor Cyan

# Check if nestingApiClient.ts exists
Write-Host "Checking API client..." -ForegroundColor Yellow
if (Test-Path "services\nestingApiClient.ts") {
    Write-Host "[OK] nestingApiClient.ts found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] nestingApiClient.ts not found" -ForegroundColor Red
    exit 1
}

# Check if .env.example exists
Write-Host "Checking .env.example..." -ForegroundColor Yellow
if (Test-Path ".env.example") {
    Write-Host "[OK] .env.example found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] .env.example not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "All checks passed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Provide next steps
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install Python dependencies:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   pip install -r requirements.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start backend server:" -ForegroundColor White
Write-Host "   python nesting_api.py" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Copy .env.example to .env:" -ForegroundColor White
Write-Host "   copy .env.example .env" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Import module in your code:" -ForegroundColor White
Write-Host "   import { NewNestListModal } from './nesting';" -ForegroundColor Gray
Write-Host ""
Write-Host "For more details, see:" -ForegroundColor Yellow
Write-Host "- components\nesting\NewNestList\QUICKSTART.md" -ForegroundColor Cyan
Write-Host "- components\nesting\NewNestList\README.md" -ForegroundColor Cyan
Write-Host ""
