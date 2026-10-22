# Restores a backup made by backup-db.ps1. DESTRUCTIVE: drops existing objects.
# Usage:
#   $env:SUPABASE_DB_URL = "postgresql://postgres.<ref>:<pass>@<host>:5432/postgres?sslmode=require"
#   .\scripts\restore-db.ps1 -File .\backups\zaywear-20261022-120000.dump -Confirm
param(
    [Parameter(Mandatory = $true)][string]$File,
    [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
    [switch]$Confirm
)

$ErrorActionPreference = 'Stop'

if (-not $Confirm) {
    Write-Host 'This overwrites the target database. Re-run with -Confirm if that is what you want.' -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $File)) {
    Write-Error "Backup file not found: $File"
    exit 1
}

if (-not $DatabaseUrl) {
    Write-Error 'Set SUPABASE_DB_URL or pass -DatabaseUrl. Use the Supabase session pooler URL (port 5432).'
    exit 1
}

$pgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue).Source

if (-not $pgRestore -and (Test-Path 'C:\Users\acer\Desktop\ZayWear-stack\pgsql\bin\pg_restore.exe')) {
    $pgRestore = 'C:\Users\acer\Desktop\ZayWear-stack\pgsql\bin\pg_restore.exe'
}

if (-not $pgRestore) {
    Write-Error 'pg_restore not found. Add the PostgreSQL client bin folder to PATH.'
    exit 1
}

Write-Host "Restoring $File ..." -ForegroundColor Yellow
& $pgRestore --dbname=$DatabaseUrl --clean --if-exists --no-owner --no-acl $File

if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE"
}

Write-Host 'Restore finished. Run the smoke test before pointing traffic back at the API.'
