# ⚡ БЫСТРОЕ РЕШЕНИЕ ПРОБЛЕМ PowerShell

## 🔥 Прямо сейчас - используй это:

### Копирование/Вставка в PowerShell:

**Вариант 1: Правый клик мыши** ⭐ (самый простой)
- Выдели текст → Правый клик → Copy
- Правый клик в PowerShell → Paste

**Вариант 2: Команды PowerShell**
```powershell
# Скопировать текст
"Твой текст" | Set-Clipboard

# Вставить текст
Get-Clipboard
```

**Вариант 3: Настрой PowerShell**
1. Правый клик на заголовке окна PowerShell
2. Properties → Options
3. Поставь галочку "Use Ctrl+Shift+C/V for Copy/Paste"
4. Теперь используй Ctrl+Shift+C и Ctrl+Shift+V

---

### Переключение языков:

**Вариант 1: Windows + Пробел** ⭐ (работает всегда)
- Нажми `Windows + Пробел`
- Выбери язык

**Вариант 2: Alt + Shift**
- Нажми `Alt + Shift`
- Переключает язык

**Вариант 3: Настрой горячие клавиши**
1. Открой Settings (Win+I)
2. Time & Language → Language
3. Advanced keyboard settings
4. Input language hot keys
5. Настрой свою комбинацию

---

## 🚀 Лучшее решение: Windows Terminal

**Установка:**
1. Открой Microsoft Store
2. Найди "Windows Terminal"
3. Установи (бесплатно)

**Преимущества:**
- ✅ Ctrl+C и Ctrl+V работают нормально
- ✅ Переключение языков работает
- ✅ Красивый интерфейс
- ✅ Несколько вкладок

---

## 📝 Для работы с Git прямо сейчас:

Выполни в PowerShell:

```powershell
# Обновить PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Проверить Git
git --version
```

Или запусти готовый скрипт:

```powershell
.\setup_powershell.ps1
```

---

## ✅ Готово!

Теперь можешь:
- Копировать/вставлять через правый клик
- Переключать язык через Windows+Пробел
- Использовать Git команды
