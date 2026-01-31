# ⚙️ Настройка Git

## 🔧 Нужно настроить имя и email

Выполни эти команды в PowerShell (замени на свои данные):

```powershell
git config --global user.name "Твоё Имя"
git config --global user.email "твой@email.com"
```

**Пример:**
```powershell
git config --global user.name "Ivan Petrov"
git config --global user.email "ivan@example.com"
```

---

## ✅ После настройки выполни:

```powershell
git commit -m "Initial commit: GiftBot Casino"
```

---

## 📝 Что дальше?

После коммита можешь загрузить на GitHub:

```powershell
git remote add origin https://github.com/ТВОЙ_ЛОГИН/GiftBot.git
git branch -M main
git push -u origin main
```

*(замени ТВОЙ_ЛОГИН на свой логин GitHub)*
