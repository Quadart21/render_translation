# Публикация релиза на GitHub

Репозиторий: **https://github.com/Quadart21/render_translation**

## Первый push (если репозиторий пустой)

```bash
git init
git add .
git commit -m "chore: release v1.0.0 — Telegram chat mock renderer"
git branch -M main
git remote add origin https://github.com/Quadart21/render_translation.git
git push -u origin main
```

## Создать релиз v1.0.0 на GitHub

1. **Через веб-интерфейс:**  
   [github.com/Quadart21/render_translation/releases/new](https://github.com/Quadart21/render_translation/releases/new)  
   - Tag: `v1.0.0`  
   - Title: `v1.0.0`  
   - Описание: скопируйте раздел **1.0.0** из [CHANGELOG.md](./CHANGELOG.md) или кратко: «фиксированный экран, единое стекло шапки, иконки, смягчённое размытие».

2. **Через GitHub CLI** (если установлен `gh`):

   ```bash
   gh release create v1.0.0 --title "v1.0.0" --notes-file CHANGELOG.md
   ```

Опционально приложите архив исходников (GitHub умеет **Source code** автоматически при создании тега).
