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
$env:DATABASE_URL = "postgresql://${User}:${enc}@${Host}/${DbName}?sslmode=require"
Write-Host "DATABASE_URL exported for this session (password hidden):"
node -e "console.log((process.env.DATABASE_URL || '').replace(/:(.*?)@/,'://****@'))"
