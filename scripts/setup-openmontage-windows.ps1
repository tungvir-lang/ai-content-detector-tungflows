#Requires -Version 5.1
<#
.SYNOPSIS
  Cài OpenMontage thành xưởng làm video trên Windows, kèm giọng đọc tiếng Việt.

.DESCRIPTION
  OpenMontage (https://github.com/calesthio/OpenMontage) là hệ thống làm video do agent AI
  điều khiển: anh mô tả video bằng lời, agent lo nghiên cứu, viết kịch bản, lồng tiếng,
  dựng hình rồi xuất ra file MP4.

  Script làm đủ các bước:
    1. Kiểm tra Git, Node.js, Python, FFmpeg; thiếu thì đề nghị cài bằng winget.
    2. Tải (hoặc cập nhật) mã nguồn OpenMontage.
    3. Tạo môi trường Python riêng (.venv), cài thư viện và Piper TTS.
    4. Cài bộ dựng hình Remotion, nạp sẵn HyperFrames.
    5. Tạo .env, dùng lại API key Gemini của ai-content-detector nếu có,
       bật chế độ UTF-8 cho Python, tải giọng đọc tiếng Việt.
    6. Cho OpenMontage đọc thử một câu tiếng Việt để chắc chắn mọi thứ chạy.

  Chạy lại nhiều lần được — script cập nhật thay vì cài trùng.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\setup-openmontage-windows.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\setup-openmontage-windows.ps1 -InstallDir D:\video\OpenMontage -RunDemo
#>

[CmdletBinding()]
param(
  # Nơi đặt xưởng video. Mặc định là thư mục người dùng.
  [string]$InstallDir = (Join-Path $HOME 'OpenMontage'),

  # Repo ai-content-detector, để dùng lại GEMINI_API_KEY trong .env.local của nó.
  # Mặc định là repo chứa chính script này.
  [string]$DetectorDir = '',

  # Dựng thử một video demo ở cuối. Lần đầu tải thêm trình duyệt ẩn khoảng 100 MB.
  [switch]$RunDemo
)

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/calesthio/OpenMontage.git'

if (-not $DetectorDir) {
  $DetectorDir = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { Join-Path $HOME 'ai-content-detector-tungflows' }
}

# Giọng đọc tiếng Việt tốt nhất của Piper, tải từ Hugging Face.
$ViVoice = 'vi_VN-vais1000-medium'
# Giọng dự phòng khi mạng chặn Hugging Face: bản cũ đặt trên GitHub, nghe kém hơn.
$ViVoiceFallback = 'vi-vivos-x-low'
$ViVoiceFallbackUrl = 'https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-vi-vivos-x-low.tar.gz'

# File này lưu dạng UTF-8 CÓ BOM — PowerShell 5.1 cần BOM mới đọc đúng tiếng Việt
# trong mã nguồn. Dòng dưới lo phần hiển thị ra console.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Write-Step { param([string]$Text) Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "  [OK] $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "  [!]  $Text" -ForegroundColor Yellow }

# Gọi chương trình ngoài và chỉ dựa vào mã thoát để biết thành/bại — pip, npm và winget
# đều ghi log ra stderr. Mã thoát nằm ở $script:LastNativeExitCode, không trả qua giá trị
# trả về của hàm (xem giải thích trong setup-windows.ps1).
$script:LastNativeExitCode = 0

function Invoke-Native {
  param(
    [string]$File,
    [string[]]$Arguments,
    [string]$FailMessage,
    # Không ném lỗi khi thất bại; người gọi tự xử lý qua $script:LastNativeExitCode.
    [switch]$AllowFailure
  )
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $File @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
    $script:LastNativeExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
  if (-not $AllowFailure -and $script:LastNativeExitCode -ne 0) { throw $FailMessage }
}

# Ghi file UTF-8 không BOM. BOM làm hỏng dòng đầu của .env.
function Write-TextNoBom {
  param([string]$Path, [string]$Content)
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

# Hỏi có/không. Enter giữ lựa chọn mặc định.
function Read-YesNo {
  param([string]$Question, [bool]$Default = $true)
  $hint = if ($Default) { '(Enter = có, n = không)' } else { '(y = có, Enter = không)' }
  $answer = "$(Read-Host "  $Question $hint")".Trim().ToLower()
  if (-not $answer) { return $Default }
  return ($answer -in @('y', 'yes', 'c', 'co', 'có'))
}

function Hide-Key {
  param([string]$Key)
  return $Key.Substring(0, [Math]::Min(4, $Key.Length)) + '...' +
         $Key.Substring([Math]::Max(0, $Key.Length - 4))
}

# Đọc giá trị NAME=... trong nội dung một file .env. Trả về chuỗi rỗng nếu không có.
function Get-EnvValue {
  param([string]$Text, [string]$Name)
  $match = [regex]::Match($Text, "(?m)^$Name=([^\r\n]*)")
  if ($match.Success) { return $match.Groups[1].Value.Trim(" `t`"'") }
  return ''
}

# winget ghi PATH mới vào registry nhưng cửa sổ PowerShell đang mở không tự nhận.
function Update-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = (@($machine, $user) | Where-Object { $_ }) -join ';'
}

# Tìm Python 3.10 trở lên. Phải chạy thử chứ không chỉ Get-Command: Windows cài sẵn
# một python.exe giả trong WindowsApps, gọi vào chỉ mở Microsoft Store rồi thoát mã 9009.
#
# Đoạn mã Python không dùng dấu nháy kép: PowerShell 5.1 nuốt mất nháy kép nằm trong
# tham số truyền cho chương trình ngoài.
function Find-Python {
  $candidates = @(
    @{ File = 'py';      Prefix = @('-3') },
    @{ File = 'python';  Prefix = @() },
    @{ File = 'python3'; Prefix = @() }
  )
  # Bản winget vừa cài có thể chưa nằm trên PATH, nên dò thêm thư mục cài mặc định.
  $candidates += @(Get-ChildItem -Path @(
      (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python3*\python.exe'),
      (Join-Path $env:ProgramFiles 'Python3*\python.exe')
    ) -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    ForEach-Object { @{ File = $_.FullName; Prefix = @() } })

  foreach ($candidate in $candidates) {
    $exe = $candidate.File
    if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { continue }

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $probe = @($candidate.Prefix) + @('-c', 'import sys; print(sys.version_info[0], sys.version_info[1])')
      $output = "$(& $exe @probe 2>$null)"
      $code = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previous
    }

    if ($code -eq 0 -and $output -match '(\d+)\s+(\d+)') {
      $major = [int]$Matches[1]
      $minor = [int]$Matches[2]
      if ($major -eq 3 -and $minor -ge 10) {
        return [PSCustomObject]@{ File = $candidate.File; Prefix = $candidate.Prefix; Version = "$major.$minor" }
      }
    }
  }
  return $null
}

function Get-MissingTools {
  $missing = @()
  if (-not (Get-Command git -ErrorAction SilentlyContinue))    { $missing += 'git' }
  if (-not (Get-Command node -ErrorAction SilentlyContinue))   { $missing += 'node' }
  if (-not (Find-Python))                                      { $missing += 'python' }
  if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { $missing += 'ffmpeg' }
  return $missing
}

# ---------------------------------------------------------------- 1. Yêu cầu

Write-Step '1/6 Kiểm tra công cụ cần thiết'

$wingetIds = @{
  git    = 'Git.Git'
  node   = 'OpenJS.NodeJS.LTS'
  python = 'Python.Python.3.12'
  ffmpeg = 'Gyan.FFmpeg'
}

$missing = @(Get-MissingTools)
if ($missing.Count -gt 0) {
  Write-Warn "Còn thiếu: $($missing -join ', ')"

  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host '  Máy không có winget để cài tự động. Cài tay rồi mở lại PowerShell:'
    Write-Host '    Git      https://git-scm.com/download/win'
    Write-Host '    Node.js  https://nodejs.org (bản LTS)'
    Write-Host '    Python   https://www.python.org/downloads/ (tick "Add python.exe to PATH")'
    Write-Host '    FFmpeg   https://www.gyan.dev/ffmpeg/builds/'
    throw 'Thiếu công cụ cần thiết.'
  }

  if (-not (Read-YesNo 'Cài các công cụ còn thiếu bằng winget?')) {
    throw 'Dừng lại. Cài các công cụ trên rồi chạy lại script.'
  }

  foreach ($tool in $missing) {
    Write-Host "  Đang cài $tool ($($wingetIds[$tool]))..."
    Invoke-Native winget @('install', '--id', $wingetIds[$tool], '-e', '--source', 'winget',
      '--accept-source-agreements', '--accept-package-agreements') '' -AllowFailure
  }

  Update-SessionPath
  $missing = @(Get-MissingTools)
  if ($missing.Count -gt 0) {
    throw "Vẫn chưa thấy: $($missing -join ', '). Mở cửa sổ PowerShell mới rồi chạy lại script."
  }
}

$nodeVersion = (& node --version).Trim()
$nodeMajor = 0
if ($nodeVersion -match '^v(\d+)') { $nodeMajor = [int]$Matches[1] }
if ($nodeMajor -gt 0 -and $nodeMajor -lt 18) {
  throw "Node $nodeVersion quá cũ. Cần Node 18 trở lên: winget upgrade OpenJS.NodeJS.LTS"
}
Write-Ok "Node $nodeVersion"

$python = Find-Python
Write-Ok "Python $($python.Version)"
Write-Ok 'Git và FFmpeg có sẵn'

# ------------------------------------------------------------- 2. Mã nguồn

Write-Step '2/6 Tải mã nguồn OpenMontage'

if (Test-Path (Join-Path $InstallDir '.git')) {
  Write-Host "  Đã có sẵn: $InstallDir"

  $branch = (& git -C $InstallDir rev-parse --abbrev-ref HEAD 2>$null)
  if ($branch) { $branch = $branch.Trim() }

  if ($branch -eq 'main') {
    Write-Host '  Đang cập nhật bản mới nhất...'
    Invoke-Native git @('-C', $InstallDir, 'pull', '--ff-only', 'origin', 'main') 'git pull thất bại. Có thể do anh đã sửa file trong OpenMontage.'
  } else {
    Write-Warn "Đang ở nhánh '$branch', không phải 'main'. Giữ nguyên và bỏ qua bước cập nhật."
  }
} elseif (Test-Path $InstallDir) {
  throw "Thư mục '$InstallDir' đã tồn tại nhưng không phải repo git. Xoá nó hoặc dùng -InstallDir để chọn chỗ khác."
} else {
  Write-Host "  Đang tải về: $InstallDir"
  Invoke-Native git @('clone', $RepoUrl, $InstallDir) 'git clone thất bại. Kiểm tra kết nối mạng.'
}

$InstallDir = (Resolve-Path $InstallDir).Path
$revision = (& git -C $InstallDir log -1 '--format=%h, %cd' '--date=short')
Write-Ok "$InstallDir (bản $revision)"

# ------------------------------------------------------------ 3. Python

Write-Step '3/6 Môi trường Python'

$venvDir = Join-Path $InstallDir '.venv'
$venvPython = Join-Path $venvDir 'Scripts\python.exe'

if (-not (Test-Path $venvPython)) {
  Write-Host '  Đang tạo .venv...'
  Invoke-Native $python.File (@($python.Prefix) + @('-m', 'venv', $venvDir)) 'Không tạo được .venv.'
}

Push-Location $InstallDir
try {
  Write-Host '  Đang cài thư viện Python (mất 2-5 phút)...'
  Invoke-Native $venvPython @('-m', 'pip', 'install', '--disable-pip-version-check', '-r', 'requirements.txt') 'Cài thư viện Python thất bại.'

  Write-Host '  Đang cài Piper TTS (lồng tiếng offline, miễn phí)...'
  Invoke-Native $venvPython @('-m', 'pip', 'install', '--disable-pip-version-check', 'piper-tts') '' -AllowFailure
  $piperInstalled = ($script:LastNativeExitCode -eq 0)
} finally {
  Pop-Location
}

Write-Ok 'Thư viện Python đã cài xong'
if (-not $piperInstalled) {
  Write-Warn 'Chưa cài được Piper. Xưởng vẫn chạy, nhưng lồng tiếng phải dùng dịch vụ đám mây (cần key).'
}

# ------------------------------------------------------- 4. Bộ dựng hình

Write-Step '4/6 Bộ dựng hình (Remotion, HyperFrames)'

Push-Location (Join-Path $InstallDir 'remotion-composer')
try {
  Write-Host '  Đang cài Remotion (mất 1-2 phút)...'
  Invoke-Native npm @('install', '--no-fund', '--no-audit') '' -AllowFailure
  if ($script:LastNativeExitCode -ne 0) {
    # README của OpenMontage: npm trên Windows đôi khi lỗi ERR_INVALID_ARG_TYPE, chạy qua npx thì qua.
    Write-Warn 'npm install lỗi, thử lại qua npx...'
    Invoke-Native npx @('--yes', 'npm', 'install', '--no-fund', '--no-audit') 'Cài Remotion thất bại.'
  }
} finally {
  Pop-Location
}
Write-Ok 'Remotion đã cài xong'

if ($nodeMajor -ge 22) {
  Write-Host '  Đang nạp sẵn HyperFrames...'
  Invoke-Native npx @('--yes', 'hyperframes', '--version') '' -AllowFailure
  if ($script:LastNativeExitCode -eq 0) {
    Write-Ok 'HyperFrames đã sẵn sàng'
  } else {
    Write-Warn 'Chưa nạp được HyperFrames — lần dựng đầu tiên sẽ tự tải.'
  }
} else {
  Write-Warn "HyperFrames cần Node 22 trở lên, máy đang có $nodeVersion. Remotion vẫn dùng bình thường."
  Write-Warn 'Muốn có thêm HyperFrames: winget upgrade OpenJS.NodeJS.LTS rồi chạy lại script.'
}

# ------------------------------------------------ 5. Cấu hình, giọng đọc

Write-Step '5/6 Cấu hình và giọng đọc tiếng Việt'

$envPath = Join-Path $InstallDir '.env'
if (-not (Test-Path $envPath)) {
  Copy-Item (Join-Path $InstallDir '.env.example') $envPath
  Write-Ok 'Đã tạo .env từ .env.example'
}

# .env.example có chữ Trung Quốc và dấu gạch dài. Get-Content của PowerShell 5.1 đọc
# theo bảng mã ANSI và sẽ làm hỏng chúng, nên đọc thẳng bằng UTF-8.
$envText = [System.IO.File]::ReadAllText($envPath, [System.Text.Encoding]::UTF8)

$currentKey = Get-EnvValue $envText 'GOOGLE_API_KEY'
if (-not $currentKey) { $currentKey = Get-EnvValue $envText 'GEMINI_API_KEY' }

if ($currentKey) {
  Write-Ok "Đã có key Gemini trong .env ($(Hide-Key $currentKey))"
} else {
  $newKey = ''

  $detectorEnv = Join-Path $DetectorDir '.env.local'
  if (Test-Path $detectorEnv) {
    $detectorKey = Get-EnvValue ([System.IO.File]::ReadAllText($detectorEnv, [System.Text.Encoding]::UTF8)) 'GEMINI_API_KEY'
    if ($detectorKey) {
      Write-Host "  Tìm thấy key Gemini của ai-content-detector ($(Hide-Key $detectorKey))."
      if (Read-YesNo 'Dùng chung key này cho xưởng video?') { $newKey = $detectorKey }
    }
  }

  if (-not $newKey) {
    Write-Host '  Key Gemini mở thêm giọng đọc Gemini (tự nhiên hơn Piper), ảnh Imagen và video Veo.'
    Write-Host '  Không bắt buộc: bỏ trống thì xưởng vẫn chạy bằng công cụ miễn phí.'
    Write-Host '  Lấy key tại https://aistudio.google.com/apikey (key bắt đầu bằng "AIza").'
    $secure = Read-Host '  Dán API key (Enter để bỏ qua; key không hiện lên khi gõ)' -AsSecureString

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      $newKey = "$([Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr))".Trim(" `t`"'")
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }

  if ($newKey) {
    if ($newKey.StartsWith('AQ.')) {
      Write-Warn 'Chuỗi bắt đầu bằng "AQ." là access token OAuth, KHÔNG phải API key — Gemini sẽ từ chối.'
    } elseif (-not $newKey.StartsWith('AIza')) {
      Write-Warn 'Key không bắt đầu bằng "AIza" — kiểm tra lại xem có copy nhầm không.'
    }

    $line = "GOOGLE_API_KEY=$newKey"
    if ([regex]::IsMatch($envText, '(?m)^GOOGLE_API_KEY=')) {
      # Nhân đôi "$" vì trong chuỗi thay thế của regex, "$" là ký tự đặc biệt.
      $envText = [regex]::Replace($envText, '(?m)^GOOGLE_API_KEY=[^\r\n]*', $line.Replace('$', '$$'))
    } else {
      $envText = $envText.TrimEnd() + "`n$line`n"
    }
    Write-TextNoBom -Path $envPath -Content $envText
    Write-Ok "Đã ghi key vào $envPath (.gitignore của OpenMontage đã loại file này khỏi git)"
    Write-Warn 'Tài khoản Google có bật thanh toán thì Veo, Imagen sẽ tính phí. Agent báo chi phí dự kiến và hỏi trước khi gọi.'
  } else {
    Write-Warn 'Chưa có key Gemini — xưởng lồng tiếng bằng Piper. Thêm sau: sửa dòng GOOGLE_API_KEY trong .env'
  }
}

# Python trên Windows mặc định đọc/ghi văn bản theo bảng mã ANSI. Cả cp1252 (Windows tiếng
# Anh) lẫn cp1258 (Windows tiếng Việt) đều không mã hoá được chữ dựng sẵn như "ứ", "ở":
# công cụ piper_tts của OpenMontage sẽ báo UnicodeEncodeError ngay khi chuyển kịch bản
# có dấu sang Piper. Bật chế độ UTF-8 của Python là cách sửa gọn nhất.
$env:PYTHONUTF8 = '1'
if ([Environment]::GetEnvironmentVariable('PYTHONUTF8', 'User') -eq '1') {
  Write-Ok 'Python đã bật chế độ UTF-8 (PYTHONUTF8=1)'
} else {
  Write-Host '  Python trên Windows cần bật chế độ UTF-8 (PYTHONUTF8=1) mới đọc được kịch bản tiếng Việt.'
  if (Read-YesNo 'Bật PYTHONUTF8=1 cho tài khoản Windows này?') {
    [Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', 'User')
    Write-Ok 'Đã bật PYTHONUTF8=1 — có hiệu lực ở các cửa sổ và ứng dụng mở sau này'
  } else {
    Write-Warn 'Bỏ qua. Lồng tiếng tiếng Việt bằng Piper sẽ lỗi UnicodeEncodeError trên đa số máy.'
  }
}

# Piper tìm giọng đọc trong thư mục hiện hành, nên đặt file giọng ngay ở gốc OpenMontage —
# nơi agent chạy lệnh. .gitignore của OpenMontage đã loại *.onnx khỏi git.
$voiceModel = $null
if (-not $piperInstalled) {
  Write-Warn 'Bỏ qua giọng đọc offline vì Piper chưa cài được.'
} elseif (Test-Path (Join-Path $InstallDir "$ViVoice.onnx")) {
  $voiceModel = $ViVoice
  Write-Ok "Đã có giọng $ViVoice"
} else {
  Write-Host "  Đang tải giọng $ViVoice (khoảng 60 MB)..."
  Invoke-Native $venvPython @('-m', 'piper.download_voices', $ViVoice, '--download-dir', $InstallDir) '' -AllowFailure

  if ($script:LastNativeExitCode -eq 0 -and (Test-Path (Join-Path $InstallDir "$ViVoice.onnx"))) {
    $voiceModel = $ViVoice
    Write-Ok "Đã tải giọng $ViVoice"
  } elseif (Test-Path (Join-Path $InstallDir "$ViVoiceFallback.onnx")) {
    $voiceModel = $ViVoiceFallback
    Write-Warn "Không tải được $ViVoice, dùng giọng dự phòng $ViVoiceFallback đã có sẵn."
  } else {
    Write-Warn 'Không tải được từ Hugging Face, chuyển sang giọng dự phòng trên GitHub (nghe kém hơn)...'
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ('openmontage-voice-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    try {
      $archive = Join-Path $tempDir 'voice.tar.gz'
      # curl.exe và tar.exe có sẵn từ Windows 10 1803. Gọi "curl.exe" vì "curl" trong
      # PowerShell 5.1 là alias của Invoke-WebRequest.
      Invoke-Native 'curl.exe' @('-fsSL', '-o', $archive, $ViVoiceFallbackUrl) '' -AllowFailure
      if ($script:LastNativeExitCode -eq 0) {
        Invoke-Native 'tar.exe' @('-xzf', $archive, '-C', $tempDir) '' -AllowFailure
      }
      $onnx = Join-Path $tempDir "$ViVoiceFallback.onnx"
      if ($script:LastNativeExitCode -eq 0 -and (Test-Path $onnx)) {
        Move-Item $onnx $InstallDir -Force
        Move-Item "$onnx.json" $InstallDir -Force
        $voiceModel = $ViVoiceFallback
        Write-Ok "Đã tải giọng dự phòng $ViVoiceFallback"
      } else {
        Write-Warn 'Không tải được giọng tiếng Việt. Chạy lại script khi mạng ổn định.'
      }
    } finally {
      Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

# ------------------------------------------------------------- 6. Kiểm tra

Write-Step '6/6 Kiểm tra'

# piper_tts tìm lệnh "piper" trên PATH, nên đưa .venv\Scripts vào PATH như khi kích hoạt .venv.
$env:Path = (Join-Path $venvDir 'Scripts') + ';' + $env:Path

# projects/ đã nằm trong .gitignore của OpenMontage.
$checkDir = Join-Path $InstallDir 'projects\_setup-check'
New-Item -ItemType Directory -Path $checkDir -Force | Out-Null

$checkScript = Join-Path $checkDir 'check.py'
Write-TextNoBom -Path $checkScript -Content @'
import sys

sys.path.insert(0, sys.argv[1])

from tools.tool_registry import registry

registry.discover()
tools = registry.support_envelope()
available = [name for name, info in tools.items() if info["status"] == "available"]
print(f"  Công cụ sẵn sàng: {len(available)}/{len(tools)}")

if len(sys.argv) > 3:
    from tools.audio.piper_tts import PiperTTS

    result = PiperTTS().execute({
        "text": "Xin chào. Xưởng làm video đã sẵn sàng.",
        "model": sys.argv[2],
        "output_path": sys.argv[3],
    })
    if not result.success:
        print(f"  Lồng tiếng thử thất bại: {result.error}")
        sys.exit(1)
    print(f"  Đã lồng tiếng thử: {sys.argv[3]}")
'@

$sampleWav = Join-Path $checkDir 'xin-chao.wav'
$checkArgs = @($checkScript, $InstallDir)
if ($voiceModel) { $checkArgs += @($voiceModel, $sampleWav) }

Push-Location $InstallDir
try {
  Invoke-Native $venvPython $checkArgs '' -AllowFailure
  if ($script:LastNativeExitCode -ne 0) {
    Write-Warn 'Kiểm tra chưa đạt. Xem thông báo lỗi ngay bên trên, sửa xong thì chạy lại script.'
  } elseif ($voiceModel) {
    Write-Ok "Mở $sampleWav để nghe thử giọng đọc"
  }

  if ($RunDemo) {
    Write-Host ''
    Write-Host '  Đang dựng video demo (mất 1-3 phút)...'
    Invoke-Native $venvPython @('render_demo.py', 'world-in-numbers') '' -AllowFailure
    $demoPath = Join-Path $InstallDir 'projects\demos\renders\world-in-numbers.mp4'
    if ($script:LastNativeExitCode -eq 0 -and (Test-Path $demoPath)) {
      Write-Ok "Video demo: $demoPath"
    } else {
      Write-Warn 'Dựng demo thất bại. Xem lỗi bên trên.'
    }
  }
} finally {
  Pop-Location
}

$voiceHint = if ($voiceModel) { $voiceModel } else { $ViVoice }

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' Xưởng video đã sẵn sàng. Cách dùng:' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host '  1. Đóng và mở lại Antigravity (hoặc Claude Code) để nhận cấu hình mới.'
Write-Host "  2. File -> Open Folder -> $InstallDir"
Write-Host '  3. Dán câu mở đầu dưới đây vào khung chat, rồi mô tả video anh cần:'
Write-Host ''
Write-Host '     Đọc AGENT_GUIDE.md trước khi làm. Trao đổi với tôi bằng tiếng Việt.' -ForegroundColor Cyan
Write-Host '     Mỗi terminal mới, chạy trước: $env:Path = "$PWD\.venv\Scripts;$env:Path"' -ForegroundColor Cyan
Write-Host "     Lồng tiếng tiếng Việt bằng piper_tts, model $voiceHint," -ForegroundColor Cyan
Write-Host '     hoặc Gemini TTS nếu .env có key. Chữ trên hình và phụ đề bằng tiếng Việt có dấu.' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Hướng dẫn đầy đủ và prompt mẫu: docs/OPENMONTAGE.md trong repo ai-content-detector-tungflows.'
Write-Host ''
