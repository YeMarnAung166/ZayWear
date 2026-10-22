# Backs up the Supabase database before a migration, seed, or import.
# Usage:
#   $env:SUPABASE_DB_URL = "postgresql://postgres.<ref>:<pass>@<host>:5432/postgres?sslmode=require"
#   .\scripts\backup-db.ps1
#   .\scripts\backup-db.ps1 -DatabaseUrl "..." -OutDir D:\zaywear-backups
param(
    [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
    [string]$OutDir = (Join-Path $PSScriptRoot '..\backups')
)

$ErrorActionPreference = 'Stop'

if (-not $DatabaseUrl) {
    Write-Error 'Set SUPABASE_DB_URL or pass -DatabaseUrl. Use the Supabase session pooler URL (port 5432).'
    exit 1
}

$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source

if (-not $pgDump -and (Test-Path 'C:\Users\acer\Desktop\ZayWear-stack\pgsql\bin\pg_dump.exe')) {
    $pgDump = 'C:\Users\acer\Desktop\ZayWear-stack\pgsql\bin\pg_dump.exe'
}

if (-not $pgDump) {
    Write-Error 'pg_dump not found. Add the PostgreSQL client bin folder to PATH (this machine: C:\Users\acer\Desktop\ZayWear-stack\pgsql\bin).'
    exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $OutDir "zaywear-$stamp.dump"

& $pgDump --dbname=$DatabaseUrl --format=custom --no-owner --no-acl --file=$file

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
}

$sizeKb = [Math]::Round((Get-Item $file).Length / 1KB)
Write-Host "Backup written: $file ($sizeKb KB)"
Write-Host 'Keep a copy off this machine before deploying.'
