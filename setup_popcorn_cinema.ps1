# ============================================================
# 🎬 POPCORN CINEMA - Setup Script (PowerShell)
# Run: .\setup_popcorn_cinema.ps1
# ============================================================

$base = "D:\Bai Tap\popcorn-cinema"

Write-Host "🎬 Creating Popcorn Cinema project structure..." -ForegroundColor Cyan

# ── ROOT ──────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $base | Out-Null

# ── BACKEND ───────────────────────────────────────────────
$backend = "$base\backend"
$dirs = @(
  "$backend\src\config",
  "$backend\src\controllers",
  "$backend\src\middleware",
  "$backend\src\models",
  "$backend\src\routes",
  "$backend\src\socket",
  "$backend\src\utils"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

# ── FRONTEND ──────────────────────────────────────────────
$frontend = "$base\frontend"
$fdirs = @(
  "$frontend\src\api",
  "$frontend\src\assets",
  "$frontend\src\components\3d",
  "$frontend\src\components\admin",
  "$frontend\src\components\booking",
  "$frontend\src\components\layout",
  "$frontend\src\components\movie",
  "$frontend\src\components\ui",
  "$frontend\src\hooks",
  "$frontend\src\pages\admin",
  "$frontend\src\pages\staff",
  "$frontend\src\store",
  "$frontend\src\types",
  "$frontend\src\utils"
)
foreach ($d in $fdirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

Write-Host "✅ Directories created at $base" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd $backend"
Write-Host "     npm install"
Write-Host "     cp .env.example .env"
Write-Host "     npm run seed"
Write-Host "     npm run dev"
Write-Host ""
Write-Host "  2. cd $frontend"
Write-Host "     npm install"
Write-Host "     cp .env.example .env"
Write-Host "     npm run dev"
Write-Host ""
Write-Host "  3. Mở trình duyệt:"
Write-Host "     Frontend: http://localhost:5173"
Write-Host "     Backend:  http://localhost:5000"