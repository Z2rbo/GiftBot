# Скрипт настройки PowerShell для удобной работы

Write-Host "🔧 Настройка PowerShell..." -ForegroundColor Cyan

# Обновляем PATH для Git
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "✅ PATH обновлён" -ForegroundColor Green

# Проверяем Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git установлен: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git не найден. Установите Git: winget install Git.Git" -ForegroundColor Red
}

Write-Host "`n📋 РЕШЕНИЯ ДЛЯ КОПИРОВАНИЯ/ВСТАВКИ:" -ForegroundColor Yellow
Write-Host "1. Правый клик мыши → Copy/Paste" -ForegroundColor White
Write-Host "2. Ctrl+Shift+C для копирования" -ForegroundColor White
Write-Host "3. Ctrl+Shift+V для вставки" -ForegroundColor White
Write-Host "4. Или используй команды:" -ForegroundColor White
Write-Host "   'Текст' | Set-Clipboard  (копировать)" -ForegroundColor Gray
Write-Host "   Get-Clipboard            (вставить)" -ForegroundColor Gray

Write-Host "`n🌐 РЕШЕНИЯ ДЛЯ ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ:" -ForegroundColor Yellow
Write-Host "1. Windows + Пробел (работает везде)" -ForegroundColor White
Write-Host "2. Alt + Shift (стандартная комбинация)" -ForegroundColor White
Write-Host "3. Настрой в Windows Settings → Language → Advanced → Hot keys" -ForegroundColor White

Write-Host "`n💡 РЕКОМЕНДАЦИЯ:" -ForegroundColor Cyan
Write-Host "Установи Windows Terminal из Microsoft Store для лучшей работы!" -ForegroundColor White

Write-Host "`n✅ Готово! Теперь можешь использовать Git команды." -ForegroundColor Green
