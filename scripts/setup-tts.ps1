# Sets up the TTS service (docs/TTS_SERVICE_PLAN.md §3, steps 5-6) on the learner's own machine.
# Run in PowerShell from the chinese-app folder:   powershell -ExecutionPolicy Bypass -File scripts\setup-tts.ps1
# The Google key is typed into a hidden prompt and goes only to Supabase secrets - never into git or a chat.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$ref = "nxdjmkcnslhhbpvmrlju"

Write-Host "1/4  Dang nhap Supabase (trinh duyet se mo ra)..." -ForegroundColor Cyan
npx supabase login
if ($LASTEXITCODE -ne 0) { throw "supabase login that bai" }
npx supabase link --project-ref $ref
if ($LASTEXITCODE -ne 0) { throw "supabase link that bai" }

Write-Host "2/4  Dan khoa API Google Cloud Text-to-Speech (khong hien chu khi go):" -ForegroundColor Cyan
$secure = Read-Host -AsSecureString "Khoa Google"
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ($key.Length -lt 20) { throw "Khoa qua ngan - kiem tra lai" }

# Admin token for `pnpm tts:pregen`: reuse the one in .env.local, or create a random one.
$envFile = ".env.local"
$line = (Get-Content $envFile -ErrorAction SilentlyContinue) | Where-Object { $_ -like "TTS_ADMIN_TOKEN=*" } | Select-Object -First 1
if ($line) { $admin = $line.Substring("TTS_ADMIN_TOKEN=".Length) }
else {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $admin = -join ($bytes | ForEach-Object { $_.ToString("x2") })
  Add-Content -Path $envFile -Value "TTS_ADMIN_TOKEN=$admin" -Encoding utf8
}

Write-Host "3/4  Luu bi mat len Supabase..." -ForegroundColor Cyan
npx supabase secrets set "GOOGLE_TTS_KEY=$key" "TTS_ALLOWED_EMAILS=vienthao@learn-app.local" "TTS_ADMIN_TOKEN=$admin" "TTS_MONTHLY_CHAR_CAP=950000"
if ($LASTEXITCODE -ne 0) { throw "secrets set that bai" }
$key = $null

Write-Host "4/4  Deploy dich vu tts..." -ForegroundColor Cyan
npx supabase functions deploy tts --no-verify-jwt
if ($LASTEXITCODE -ne 0) { throw "deploy that bai" }

Write-Host "XONG. Mo trang /zh hoac /en -> muc 'Giong Google AI' -> chon giong -> Nghe thu." -ForegroundColor Green
