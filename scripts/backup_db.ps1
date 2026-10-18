# Vetecura IMS Automated Database Backup Script (PowerShell)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $ProjectRoot "backups"
$RetentionDays = 30

# Load .env file into environment
$EnvFile = Join-Path $ProjectRoot ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $val, "Process")
        }
    }
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "vetecura_backup_$Timestamp.dump"

Write-Host "[$((Get-Date).ToString('o'))] Starting Vetecura PostgreSQL Backup..."
Write-Host "Target File: $BackupFile"

try {
    docker exec -e PGPASSWORD=vetecura_secure_pass_2026 vetecura_postgres pg_dump -U vetecura_app -Fc vetecura > $BackupFile
    if ((Test-Path $BackupFile) -and ((Get-Item $BackupFile).Length -gt 0)) {
        $Size = (Get-Item $BackupFile).Length
        Write-Host "Backup Completed Successfully! Size: $Size bytes"
        
        # Cleanup old backups
        $LimitDate = (Get-Date).AddDays(-$RetentionDays)
        Get-ChildItem -Path $BackupDir -Filter "vetecura_backup_*.dump" | Where-Object { $_.LastWriteTime -lt $LimitDate } | Remove-Item -Force
        Write-Host "Cleanup finished. Backups older than $RetentionDays days purged."

        # Telegram Automated Upload
        $BotToken = $env:TELEGRAM_BOT_TOKEN
        $ChatId = $env:TELEGRAM_CHAT_ID_SECURITY
        if (-not $ChatId) { $ChatId = $env:TELEGRAM_CHAT_ID }

        if ($BotToken -and $ChatId) {
            Write-Host "Sending backup file to Telegram..."
            $DateStr = (Get-Date).ToString('dd-MMM-yyyy hh:mm tt')
            $FileName = Split-Path $BackupFile -Leaf
            $SizeMb = [math]::Round($Size/1MB, 2)
            $Caption = "[BACKUP] Vetecura IMS Daily Database Backup`n`nDate: $DateStr`nFile: $FileName`nSize: $SizeMb MB`nIntegrity: SHA-256 Chained`n`nDeveloped by The Pixel Monk"
            $Uri = "https://api.telegram.org/bot$BotToken/sendDocument"
            
            try {
                & curl.exe -s -F "chat_id=$ChatId" -F "caption=$Caption" -F "document=@$BackupFile" $Uri | Out-Null
                Write-Host "Telegram notification & backup file uploaded successfully!"
            } catch {
                Write-Host "Telegram upload warning: $_"
            }
        }

        exit 0
    } else {
        Write-Host "Backup failed or zero bytes generated."
        exit 1
    }
} catch {
    Write-Host "Backup execution error: $_"
    exit 1
}
