# 👥 Team Member Setup Guide - LifeLoop Repository

**Date:** February 27, 2026 | **Team Size:** 3 members

---

## 🚀 STEP 1: Clone the Repository (First Time Only)

Each team member should do this ONCE:

```bash
# Open terminal/PowerShell and navigate to where you want the project
cd C:\your\preferred\location

# Clone the repository (choose ONE option)

# Option A: Using HTTPS (password-less each time)
git clone https://github.com/hanuman2005/lifeloop.git
cd lifeloop

# Option B: Using SSH (requires SSH key setup)
git clone git@github.com:hanuman2005/lifeloop.git
cd lifeloop
```

**Expected output:**

```
Cloning into 'lifeloop'...
remote: Enumerating objects: 120, done.
Receiving objects: 100% (120/120), done.
```

---

## 📋 STEP 2: Install Dependencies

After cloning, install all required packages:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend (LifeLoop) dependencies
cd ../LifeLoop
npm install

# Now you're ready!
```

---

## 🔑 STEP 3: Set Up Environment Variables

### For Backend (`backend/.env`)

Copy the example and add your values:

```bash
cd backend
cp .env.example .env  # or copy manually on Windows
```

Then edit `backend/.env` with:

```
GEMINI_API_KEY=your_gemini_api_key  # Your personal API key
```

### For LifeLoop App (`LifeLoop/.env`)

Copy the example and add your values:

```bash
cd LifeLoop
cp .env.example .env  # or copy manually on Windows
```

Then edit `LifeLoop/.env` with:

```
EXPO_PUBLIC_API_URL=http://YOUR_IP:5000/api
EXPO_PUBLIC_SOCKET_URL=http://YOUR_IP:5000
# ... add other keys
```

---

## 📥 STEP 4: Get the Latest Changes from Main

Before starting any work, always pull the latest code:

```bash
# Make sure you're on main branch
git checkout main

# Pull latest changes
git pull origin main
```

---

## 🔀 STEP 5: Create Your Feature Branch

Create a branch for your work:

```bash
# Create and switch to your feature branch
git checkout -b feature/your-name-task-description

# Examples:
git checkout -b feature/john-gemini-vision
git checkout -b feature/sarah-reuse-testing
git checkout -b feature/mike-component-audit
```

**Branch naming rules:**

- `feature/task-name` - for new features
- `bugfix/bug-name` - for bug fixes
- `docs/doc-name` - for documentation

---

## 💻 STEP 6: Make Your Changes

Now work on your assigned task. Your assigned tasks:

### Member 1 (You - Main Maintainer)

Already handling:

- Gemini Vision integration ✅
- Code reviews
- Merging PRs

### Member 2

Assigned to:

1. Test Reuse Ideas Screen (`LifeLoop/src/screens/ReuseGuide.js`)
2. Test Upcycle Screen (`LifeLoop/src/screens/UpcycleScreen.js`)
3. Test Material Composition Display

### Member 3

Assigned to:

1. Component Audit (all components in `LifeLoop/src/components/`)
2. QR & Notifications testing
3. Create documentation

---

## 📝 STEP 7: Commit Your Changes

As you work, save your progress:

```bash
# Check what files you changed
git status

# Add your changes
git add .

# Or add specific files
git add LifeLoop/src/screens/ReuseGuide.js

# Commit with clear message
git commit -m "Test: Verified reuse ideas screen works with Gemini API

- Tested with 5 different waste categories
- API responses parsed correctly
- UI displays ideas in list format
- Error handling tested"
```

**Commit message format:**

```
[Type]: Description

[Type] can be:
- Test: Testing results
- Fix: Bug fixes
- Add: New features
- Update: Changes to existing code
- Docs: Documentation updates

Then add details below
```

---

## 🔄 STEP 8: Push Your Branch to GitHub

Upload your work:

```bash
# Push your feature branch
git push origin feature/your-branch-name

# Example:
git push origin feature/john-gemini-vision
```

**First time pushing a new branch?** Git will suggest:

```bash
git push --set-upstream origin feature/your-branch-name
```

---

## 🔀 STEP 9: Create a Pull Request (PR) on GitHub

After pushing, create a PR:

1. Go to https://github.com/hanuman2005/lifeloop
2. You'll see a "Compare & Pull Request" button
3. Fill in:
   - **Title:** Brief description of your work
   - **Description:**

     ```
     ## What I tested/fixed
     - Item 1
     - Item 2

     ## How to test
     1. Step 1
     2. Step 2

     ## Screenshots/Results
     (if applicable)
     ```
4. Click "Create Pull Request"

**Example PR description:**

```
## Testing Reuse Ideas Screen

### What was tested
- Reuse ideas endpoint integration
- JSON parsing of multi-idea responses
- UI display of ideas in list format
- Error handling when API fails

### Results ✅
- All 5 waste categories tested successfully
- Ideas display with correct formatting
- Error message shows when API unavailable
- No console errors detected

### Files Changed
- LifeLoop/src/screens/ReuseGuide.js
- COMPONENTS_AUDIT.md (updated status)

Closes #N/A
```

---

## ✅ STEP 10: Wait for Code Review

The main maintainer (You) will:

1. Review your code
2. Leave comments if needed
3. Approve when ready
4. Merge to main

**What happens:**

```
Your PR → Main maintainer reviews → Approved → Merged to main
```

---

## 🔁 STEP 11: Sync with Main After Merge

After your PR is merged, sync your local repo:

```bash
# Switch to main
git checkout main

# Pull the merged changes
git pull origin main

# Delete your feature branch (optional)
git branch -d feature/your-branch-name
git push origin --delete feature/your-branch-name
```

---

## 🔄 DAILY WORKFLOW SUMMARY

**Start of day:**

```bash
git checkout main
git pull origin main
```

**While working:**

```bash
git add .
git commit -m "Your message"
```

**End of day/When ready to submit:**

```bash
git push origin feature/your-branch
# Then create PR on GitHub
```

**After PR merged:**

```bash
git checkout main
git pull origin main
git branch -d feature/your-branch
```

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### "fatal: Not a git repository"

```bash
# You need to be in the cloned folder
cd lifeloop
```

### "Your branch is behind origin/main"

```bash
# Pull latest changes
git pull origin main
```

### "Conflict in files"

```bash
# You and main maintainer edited same file
# Open the file and look for:
# <<<<<<< HEAD
# your changes
# =======
# main changes
# >>>>>>> main

# Edit to keep what you want, then:
git add .
git commit -m "Resolve merge conflicts"
git push origin feature/your-branch
```

### "Changes not showing up"

```bash
# Make sure you're on the right branch
git branch  # shows all branches, current one has *

# Switch if needed
git checkout feature/your-branch
```

---

## 🎯 YOUR ASSIGNED TASKS & STATUS

| Task                   | Member   | Branch Name                        | Status   |
| ---------------------- | -------- | ---------------------------------- | -------- |
| Gemini Vision Setup    | You      | `feature/main-gemini-vision`       | ✅ Done  |
| Reuse Screen Testing   | Member 2 | `feature/member2-reuse-testing`    | ⏳ To Do |
| Upcycle Screen Testing | Member 2 | `feature/member2-upcycle-testing`  | ⏳ To Do |
| Component Audit        | Member 3 | `feature/member3-component-audit`  | ⏳ To Do |
| QR & Notifications     | Member 3 | `feature/member3-qr-notifications` | ⏳ To Do |

---

## 📞 QUICK REFERENCE

```bash
# Clone (first time)
git clone https://github.com/hanuman2005/lifeloop.git

# Create feature branch
git checkout -b feature/task-name

# See your changes
git status

# Save your changes
git add .
git commit -m "Description"

# Upload to GitHub
git push origin feature/task-name

# Create PR on GitHub website, wait for review

# After merged, sync main
git checkout main
git pull origin main
```

---

## 🚀 Ready to Start?

1. **Clone the repo** (STEP 1-2)
2. **Set up .env files** (STEP 3)
3. **Pull latest code** (STEP 4)
4. **Create your branch** (STEP 5)
5. **Start working!** (STEP 6-7)
6. **Push & create PR** (STEP 8-9)
7. **Wait for review** (STEP 10)

---

**Questions?** Ask in PR comments or through your communication channel.

**Last Updated:** Feb 27, 2026
