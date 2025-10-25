param(
  [Parameter(Mandatory=$true)][string]$User,
  [Parameter(Mandatory=$true)][string]$PasswordRaw,
  [Parameter(Mandatory=$true)][string]$Host,
  [Parameter(Mandatory=$true)][string]$DbName
)

if ($Host -match "-pooler") {
  Write-Error "Host must be the direct Neon endpoint (no -pooler)."
  exit 1
}

$enc = [System.Uri]::EscapeDataString($PasswordRaw)
$parts = $Host.Split('.', 2)
if ($parts.Length -ne 2) {
  Write-Error "Host must contain a region suffix (expected something like ep-xxxxx.ap-southeast-1.aws.neon.tech)."
  exit 1
}

$poolerHost = "{0}-pooler.{1}" -f $parts[0], $parts[1]

$env:DIRECT_URL = "postgresql://${User}:${enc}@${Host}/${DbName}?sslmode=require"
$env:DATABASE_URL = "postgresql://${User}:${enc}@${poolerHost}/${DbName}?sslmode=require"

Write-Host "DATABASE_URL exported for this session (password hidden):"
node -e "console.log((process.env.DATABASE_URL || '').replace(/:(.*?)@/,'://****@'))"
Write-Host "DIRECT_URL exported for this session (password hidden):"
node -e "console.log((process.env.DIRECT_URL || '').replace(/:(.*?)@/,'://****@'))"
