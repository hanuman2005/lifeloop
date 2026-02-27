# 🚀 Quick Git Commands Cheatsheet

## First Time Setup (Clone)

```bash
git clone https://github.com/hanuman2005/lifeloop.git
cd lifeloop
npm install          # in backend/
npm install          # in LifeLoop/
```

## Before You Start Work

```bash
git checkout main
git pull origin main
```

## Create Your Feature Branch

```bash
git checkout -b feature/your-task-name
# Example: git checkout -b feature/sarah-reuse-testing
```

## While Working

```bash
# Check what changed
git status

# Save your changes
git add .
git commit -m "Describe what you did"

# Upload to GitHub
git push origin feature/your-task-name
```

## Create Pull Request

1. Go to GitHub.com
2. Click "Compare & Pull Request"
3. Add description
4. Click "Create Pull Request"
5. **Wait for main maintainer to review**

## After PR is Merged

```bash
git checkout main
git pull origin main
```

---

## Common Commands

| Task                 | Command                          |
| -------------------- | -------------------------------- |
| See current branch   | `git branch`                     |
| See all changes      | `git status`                     |
| See what you changed | `git diff`                       |
| Switch to main       | `git checkout main`              |
| Pull latest changes  | `git pull origin main`           |
| Upload your work     | `git push origin feature/name`   |
| Delete old branch    | `git branch -d feature/old-name` |
| View commit history  | `git log --oneline`              |
| Undo last commit     | `git revert HEAD`                |

---

## If Something Goes Wrong

### "Conflicts" - You and main edited same file

```bash
# Fix the conflict manually in VS Code
# Then:
git add .
git commit -m "Resolve conflicts"
git push origin feature/your-branch
```

### "Changes not saved" - Need to commit first

```bash
git add .
git commit -m "Your message"
git push origin feature/your-branch
```

### "Behind origin/main" - Need latest code

```bash
git pull origin main
```

---

## Complete Example Workflow

```bash
# 1. Clone (first time only)
git clone https://github.com/hanuman2005/lifeloop.git
cd lifeloop

# 2. Get latest code
git checkout main
git pull origin main

# 3. Create your branch
git checkout -b feature/john-reuse-testing

# 4. Make changes to files...
# (Edit ReuseGuide.js, test it, etc.)

# 5. Save your work
git add .
git commit -m "Test: Verified Reuse screen works with Gemini API"

# 6. Upload to GitHub
git push origin feature/john-reuse-testing

# 7. Go to GitHub.com → Click "Create Pull Request"

# 8. Wait for review... (main maintainer will merge)

# 9. After merged, sync main
git checkout main
git pull origin main
git branch -d feature/john-reuse-testing
```

---

**Need help?** Check **TEAM_SETUP.md** for detailed guide!
