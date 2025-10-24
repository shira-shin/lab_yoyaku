param(
  [Parameter(Mandatory=$true)][string]$User,
  [Parameter(Mandatory=$true)][string]$PasswordRaw,
  [Parameter(Mandatory=$true)][string]$Host,      # Direct 接続 ( -pooler なし )
  [Parameter(Mandatory=$true)][string]$DbName
)
$enc = [uri]::EscapeDataString($PasswordRaw)
$env:DATABASE_URL = "postgresql://${User}:${enc}@${Host}/${DbName}?sslmode=require"
Write-Host "DATABASE_URL set (hidden password)."
node -e "console.log(process.env.DATABASE_URL.replace(/:(.*?)@/,'://****@'))"
