<#
.SYNOPSIS
  Reset the Docker Postgres database and re-apply MASTER_DATABASE_SCHEMA.sql.

.DESCRIPTION
  - Designed for the enhanced stack that includes the `netra-postgres-primary` container
    (see `infrastructure/docker-compose.2026.yml`).
  - Drops and recreates the target database, then applies the master schema.
  - Does NOT touch any non-Docker/local Postgres installations.

.PARAMETER DatabaseName
  Database name to recreate. Default: netra_ai_2026

.PARAMETER DbUser
  Postgres user inside the container. If omitted, uses $env:DB_USER, else falls back to 'postgres'.

.PARAMETER ContainerName
  Postgres container name. Default: netra-postgres-primary
#>

[CmdletBinding()]
param(
  [string]$DatabaseName = "netra_ai_2026",
  [string]$DbUser = $env:DB_USER,
  [string]$ContainerName = "netra-postgres-primary"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DbUser)) {
  $DbUser = "postgres"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$schemaPath = Join-Path $repoRoot "infrastructure\database\MASTER_DATABASE_SCHEMA.sql"

if (-not (Test-Path $schemaPath)) {
  throw "Schema file not found: $schemaPath"
}

Write-Host "Resetting Docker Postgres DB '$DatabaseName' in container '$ContainerName' using user '$DbUser'..."

# Copy schema into container (psql -f needs a container-local path)
$tmpSchema = "/tmp/MASTER_DATABASE_SCHEMA.sql"
docker cp "$schemaPath" "${ContainerName}:$tmpSchema" | Out-Null

# Terminate connections, drop+create database, apply schema.
$sql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DatabaseName'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS "$DatabaseName";
CREATE DATABASE "$DatabaseName";
"@

docker exec -i $ContainerName psql -v ON_ERROR_STOP=1 -U $DbUser -d postgres -c $sql | Out-Host
docker exec -i $ContainerName psql -v ON_ERROR_STOP=1 -U $DbUser -d $DatabaseName -f $tmpSchema | Out-Host

Write-Host "Done. Database '$DatabaseName' was recreated and MASTER_DATABASE_SCHEMA.sql was applied."

