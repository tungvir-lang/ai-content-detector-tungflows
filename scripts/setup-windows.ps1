#Requires -Version 5.1
<#
.SYNOPSIS
  Cài đặt và nối MCP server "ai-content-detector-vn" vào Antigravity IDE trên Windows.

.DESCRIPTION
  Script làm đủ các bước: kiểm tra Node/Git, tải mã nguồn, cài dependencies,
  ghi API key vào .env.local, ghép cấu hình vào mcp_config.json của Antigravity,
  rồi gọi thật ra Gemini để xác nhận chạy được.

  Chạy lại nhiều lần được — script tự cập nhật thay vì tạo trùng.
  Cấu hình MCP có sẵn của các server khác được giữ nguyên, chỉ ghép thêm vào.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -InstallDir D:\code\detector
#>

[CmdletBinding()]
param(
  # Nơi đặt mã nguồn. Mặc định là thư mục người dùng.
  [string]$InstallDir = (Join-Path $HOME 'ai-content-detector-tungflows'),

  # Bỏ qua bước gọi thật ra Gemini ở cuối.
  [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/tungvir-lang/ai-content-detector-tungflows.git'
$ServerName = 'ai-content-detector-vn'

# File này lưu dạng UTF-8 CÓ BOM — PowerShell 5.1 cần BOM mới đọc đúng tiếng Việt
# trong mã nguồn. Dòng dưới lo phần hiển thị ra console.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Write-Step { param([string]$Text) Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "  [OK] $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "  [!]  $Text" -ForegroundColor Yellow }

# Gọi chương trình ngoài (git, npm) và chỉ dựa vào mã thoát để biết thành/bại.
# Cần thiết vì npm và MCP server đều ghi log ra stderr; với ErrorActionPreference='Stop'
# PowerShell có thể coi stderr là lỗi nghiêm trọng và dừng script dù lệnh chạy đúng.
function Invoke-Native {
  param(
    [string]$File,
    [string[]]$Arguments,
    [string]$FailMessage,
    [switch]$PassThruExitCode
  )
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $File @Arguments
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
  if ($PassThruExitCode) { return $code }
  if ($code -ne 0) { throw $FailMessage }
}

function Test-Tool {
  param([string]$Name, [string]$InstallHint)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Không tìm thấy '$Name'. $InstallHint"
  }
  return $cmd
}

# Ghi file UTF-8 không BOM. Notepad và Set-Content mặc định thêm BOM,
# BOM làm hỏng dòng đầu của .env và dòng đầu của JSON.
function Write-TextNoBom {
  param([string]$Path, [string]$Content)
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

# ---------------------------------------------------------------- 1. Yêu cầu

Write-Step '1/5 Kiểm tra công cụ cần thiết'

Test-Tool -Name 'node' -InstallHint 'Cài Node.js LTS tại https://nodejs.org rồi mở lại PowerShell.' | Out-Null
Test-Tool -Name 'npm'  -InstallHint 'npm đi kèm Node.js. Cài lại Node.js tại https://nodejs.org' | Out-Null
Test-Tool -Name 'git'  -InstallHint 'Cài Git tại https://git-scm.com/download/win rồi mở lại PowerShell.' | Out-Null

$nodeVersion = (& node --version).Trim()
Write-Ok "Node $nodeVersion"

$nodeMajor = 0
if ($nodeVersion -match '^v(\d+)') { $nodeMajor = [int]$Matches[1] }
if ($nodeMajor -gt 0 -and $nodeMajor -lt 18) {
  throw "Node $nodeVersion quá cũ. Cần Node 18 trở lên."
}

# ------------------------------------------------------------- 2. Mã nguồn

Write-Step '2/5 Tải mã nguồn'

if (Test-Path (Join-Path $InstallDir '.git')) {
  Write-Host "  Đã có sẵn: $InstallDir"

  $branch = (& git -C $InstallDir rev-parse --abbrev-ref HEAD 2>$null)
  if ($branch) { $branch = $branch.Trim() }

  if ($branch -eq 'main') {
    Write-Host '  Đang cập nhật nhánh main...'
    Invoke-Native git @('-C', $InstallDir, 'pull', 'origin', 'main') 'git pull thất bại. Có thể do thay đổi cục bộ chưa commit.'
  } else {
    # Không tự chuyển nhánh: người dùng có thể đang cố tình thử một nhánh chưa merge.
    Write-Warn "Đang ở nhánh '$branch', không phải 'main'. Script giữ nguyên nhánh này và bỏ qua bước cập nhật."
    Write-Warn "Muốn dùng bản chính thức: chạy 'git checkout main' rồi chạy lại script."
  }
} elseif (Test-Path $InstallDir) {
  throw "Thư mục '$InstallDir' đã tồn tại nhưng không phải repo git. Xoá nó hoặc dùng -InstallDir để chọn chỗ khác."
} else {
  Write-Host "  Đang tải về: $InstallDir"
  Invoke-Native git @('clone', $RepoUrl, $InstallDir) 'git clone thất bại. Kiểm tra kết nối mạng.'
}

$InstallDir = (Resolve-Path $InstallDir).Path
Write-Ok $InstallDir

Write-Host '  Đang cài dependencies (mất 1-2 phút)...'
Push-Location $InstallDir
try {
  Invoke-Native npm @('install', '--no-fund', '--no-audit') 'npm install thất bại.'
} finally {
  Pop-Location
}
Write-Ok 'Dependencies đã cài xong'

# ---------------------------------------------------------------- 3. API key

Write-Step '3/5 API key Gemini'

$envPath = Join-Path $InstallDir '.env.local'
$existingKey = $null

if (Test-Path $envPath) {
  $line = Select-String -Path $envPath -Pattern '^GEMINI_API_KEY=(.+)$' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($line) { $existingKey = $line.Matches[0].Groups[1].Value.Trim(" `t`"'") }
}

if ($existingKey) {
  $masked = $existingKey.Substring(0, [Math]::Min(4, $existingKey.Length)) + '...' +
            $existingKey.Substring([Math]::Max(0, $existingKey.Length - 4))
  Write-Ok "Đã có key trong .env.local ($masked)"
  $answer = Read-Host '  Nhập key mới? (Enter = giữ key cũ, y = nhập mới)'
  if ($answer -ne 'y') { $apiKeyPlain = $existingKey }
}

if (-not $apiKeyPlain) {
  Write-Host '  Lấy key tại https://aistudio.google.com/apikey (key bắt đầu bằng "AIza").'
  Write-Host '  Key sẽ KHÔNG hiện lên màn hình khi gõ.'
  $secure = Read-Host '  Dán API key vào đây' -AsSecureString

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $apiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$apiKeyPlain = $apiKeyPlain.Trim(" `t`"'")
if ([string]::IsNullOrWhiteSpace($apiKeyPlain)) { throw 'Chưa nhập API key.' }

if ($apiKeyPlain.StartsWith('AQ.')) {
  Write-Warn 'Chuỗi bắt đầu bằng "AQ." là access token OAuth, KHÔNG phải API key.'
  Write-Warn 'Gemini sẽ từ chối với lỗi ACCESS_TOKEN_TYPE_UNSUPPORTED.'
  Write-Warn 'Lấy key "AIza..." tại https://aistudio.google.com/apikey'
} elseif (-not $apiKeyPlain.StartsWith('AIza')) {
  Write-Warn 'Key không bắt đầu bằng "AIza" — kiểm tra lại xem có copy nhầm không.'
}

Write-TextNoBom -Path $envPath -Content "GEMINI_API_KEY=$apiKeyPlain`n"
Write-Ok "Đã ghi $envPath (.gitignore đã loại file này khỏi git)"

# ------------------------------------------------------- 4. Cấu hình MCP

Write-Step '4/5 Ghép cấu hình vào Antigravity'

$configDir = Join-Path $HOME '.gemini\config'
$configPath = Join-Path $configDir 'mcp_config.json'

if (-not (Test-Path $configDir)) {
  New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$config = $null
if (Test-Path $configPath) {
  # Sao lưu trước khi đụng vào, phòng khi có server khác đang khai báo ở đây.
  $backupPath = "$configPath.bak-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
  Copy-Item $configPath $backupPath
  Write-Ok "Đã sao lưu cấu hình cũ: $backupPath"

  try {
    $raw = Get-Content $configPath -Raw
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
      $config = $raw | ConvertFrom-Json
    }
  } catch {
    Write-Warn 'Không đọc được mcp_config.json hiện tại (có thể chứa comment).'
    Write-Warn 'Script sẽ KHÔNG ghi đè. Hãy tự thêm khối sau vào mục "mcpServers":'
    Write-Host ''
    Write-Host "  `"$ServerName`": {"
    Write-Host '    "command": "npx",'
    Write-Host "    `"args`": [`"-y`", `"tsx`", `"$((Join-Path $InstallDir 'mcp\server.ts') -replace '\\', '\\')`"],"
    Write-Host "    `"cwd`": `"$($InstallDir -replace '\\', '\\')`""
    Write-Host '  }'
    Write-Host ''
    throw 'Dừng lại để không làm hỏng cấu hình sẵn có.'
  }
}

if (-not $config) { $config = New-Object PSObject }

if (-not $config.PSObject.Properties['mcpServers']) {
  $config | Add-Member -MemberType NoteProperty -Name 'mcpServers' -Value (New-Object PSObject)
}

$serverEntry = [PSCustomObject]@{
  command = 'npx'
  args    = @('-y', 'tsx', (Join-Path $InstallDir 'mcp\server.ts'))
  cwd     = $InstallDir
}

$otherServers = @($config.mcpServers.PSObject.Properties.Name | Where-Object { $_ -ne $ServerName })

if ($config.mcpServers.PSObject.Properties[$ServerName]) {
  $config.mcpServers.$ServerName = $serverEntry
} else {
  $config.mcpServers | Add-Member -MemberType NoteProperty -Name $ServerName -Value $serverEntry
}

Write-TextNoBom -Path $configPath -Content (($config | ConvertTo-Json -Depth 20) + "`n")
Write-Ok "Đã ghi $configPath"

if ($otherServers.Count -gt 0) {
  Write-Ok "Giữ nguyên $($otherServers.Count) server khác: $($otherServers -join ', ')"
}

# ------------------------------------------------------------- 5. Kiểm tra

Write-Step '5/5 Kiểm tra'

Push-Location $InstallDir
try {
  Write-Host '  Kiểm tra giao thức MCP...'
  Invoke-Native npm @('run', '--silent', 'mcp:smoke') 'mcp:smoke thất bại — MCP server không khởi động được.'

  if ($SkipVerify) {
    Write-Warn 'Bỏ qua bước gọi thật ra Gemini (-SkipVerify).'
  } else {
    Write-Host ''
    Write-Host '  Gọi thật ra Gemini để xác nhận key...'
    $verifyCode = Invoke-Native npm @('run', '--silent', 'mcp:verify') '' -PassThruExitCode
    if ($verifyCode -ne 0) {
      Write-Warn 'Key chưa dùng được. Xem hướng dẫn sửa ngay bên trên, rồi chạy lại script này.'
      exit 1  # khối finally bên dưới vẫn chạy và trả lại thư mục cũ
    }
  }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' Xong. Việc cuối cùng làm bằng tay:' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host '  1. Mở Antigravity IDE'
Write-Host '  2. Vào panel MCP Store (bên phải) -> Manage MCP Servers'
Write-Host '  3. Bấm Refresh'
Write-Host ''
Write-Host "  Server '$ServerName' sẽ hiện lên kèm 5 tool." -ForegroundColor Cyan
Write-Host ''
