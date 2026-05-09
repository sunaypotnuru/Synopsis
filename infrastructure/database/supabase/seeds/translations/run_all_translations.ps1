Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Netra AI - Multi-Language Translation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$enFile = "frontend/src/locales/en.json"
if (-not (Test-Path $enFile)) {
    Write-Host "ERROR: English source file not found at $enFile" -ForegroundColor Red
    exit 1
}

Write-Host "Starting translations..." -ForegroundColor Yellow

$scripts = @(
    "database/seeds/translations/translate_hindi.py",
    "database/seeds/translations/translate_marathi.py",
    "database/seeds/translations/translate_telugu.py",
    "database/seeds/translations/translate_tamil.py",
    "database/seeds/translations/translate_kannada.py"
)

$successCount = 0

foreach ($script in $scripts) {
    $lang = ($script -split "_")[-1].Replace(".py", "")
    Write-Host "Translating to $($lang.ToUpper())..." -ForegroundColor Gray
    python $script
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SUCCESS: $($lang.ToUpper()) complete" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "✗ WARNING: $($lang.ToUpper()) failed" -ForegroundColor Yellow
    }
}

Write-Host "========================================"
Write-Host "Completed: $successCount / $($scripts.Count) translations"
