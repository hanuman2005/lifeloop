# 🔀 How to Merge Team Changes & Handle Conflicts

**You as main maintainer - reviewing and merging team member code**

---

## 📋 Step 1: Team Member Submits Code via Pull Request

**What happens:**

1. Team member creates feature branch
2. Makes changes and commits
3. Pushes to their repo
4. Creates Pull Request on GitHub
5. **Waits for YOUR review**

**You'll see on GitHub:**

```
Pull Request: "Test: Reuse screen verification"
From: member2/feature/member2-reuse-testing
To: hanuman2005/main
Status: Open (waiting for review)
```

---

## 🔍 Step 2: Review the Code

### On GitHub.com:

1. Go to **Pull Requests** tab
2. Click on the PR
3. Review the changes:
   - Click **Files changed**
   - Read the code
   - Add comments if needed
   - Leave approvals/requests

### Things to Check:

- ✅ Code quality
- ✅ No breaking changes
- ✅ Tests included
- ✅ Documentation updated
- ✅ Follows team style

---

## ✅ Step 3A: No Conflicts - Simple Merge

### If GitHub shows "Can merge" (Green button):

```
✅ No conflicts detected
```

**Click "Merge Pull Request"** on GitHub.com

That's it! Code is merged. 🎉

---

## 🔴 Step 3B: Conflicts - Need Manual Fix

### If GitHub shows "Can't merge" (Red notification):

```
❌ This branch has conflicts that must be resolved
```

---

## 🛠️ How to Resolve Conflicts

You have 2 options:

### **OPTION 1: Resolve on GitHub (Easiest)**

If conflict is simple:

1. Click "Resolve conflicts" button on GitHub
2. Edit the conflicted file directly in browser
3. Choose which code to keep
4. Click "Mark as resolved"
5. Click "Commit merge"

---

### **OPTION 2: Resolve Locally (More Control)**

If conflict is complex:

```bash
# 1. Get their branch locally
git fetch origin
git checkout feature/member2-reuse-testing

# 2. Try to merge your main into their branch
git merge main

# You'll see something like:
# CONFLICT (content): Merge conflict in src/screens/ReuseGuide.js
# Automatic merge failed; fix conflicts and then commit the result.
```

---

## 📝 Understanding Conflict Markers

When you open the conflicted file, you'll see:

```javascript
// ReuseGuide.js

<<<<<<< HEAD
// Member 2's code (in their branch)
const reuseIdeas = data.ideas;
return <View>{reuseIdeas}</View>;
=======
// Your main repo code
const ideas = fetchIdeas();
return <List items={ideas} />;
>>>>>>> main
```

**Markers mean:**

- `<<<<<<< HEAD` = Their code
- `=======` = Divider
- `>>>>>>> main` = Your code

---

## 🔧 Fix the Conflict

**Choose which code to keep:**

### Option A: Keep THEIR code

```javascript
// DELETE this:
<<<<<<< HEAD
const reuseIdeas = data.ideas;
return <View>{reuseIdeas}</View>;
=======
const ideas = fetchIdeas();
return <List items={ideas} />;
>>>>>>> main

// KEEP this:
const reuseIdeas = data.ideas;
return <View>{reuseIdeas}</View>;
```

### Option B: Keep YOUR code

```javascript
// Keep your code, delete theirs
const ideas = fetchIdeas();
return <List items={ideas} />;
```

### Option C: Merge BOTH (Best if possible)

```javascript
// Combine the best of both
const reuseIdeas = data.ideas || [];
const allIdeas = [...reuseIdeas, ...fetchIdeas()];
return <List items={allIdeas} />;
```

---

## ✅ Commit the Fix

After you edit the file:

```bash
# 1. Mark as resolved
git add src/screens/ReuseGuide.js

# 2. Commit the merge
git commit -m "Merge: Resolve conflict in ReuseGuide.js

Kept member2's data.ideas approach with addition of fallback"

# 3. Push the fix back
git push origin feature/member2-reuse-testing
```

---

## 🔄 Then on GitHub

1. Conflict is now resolved
2. GitHub will show "Can merge" (Green button)
3. Click **"Merge Pull Request"**
4. Confirm merge

---

## 📊 Complete Workflow Example

```
SCENARIO: Member 2 submits PR but there's a conflict

1. Member 2 creates PR
   → GitHub shows red "Can't merge"

2. You have 2 choices:

   A) Resolve on GitHub:
      - Click "Resolve conflicts"
      - Edit in browser
      - Click "Mark as resolved"

   B) Resolve locally:
      - git fetch origin
      - git checkout feature/member2-reuse-testing
      - git merge main
      - Open conflicted file
      - Edit to resolve
      - git add .
      - git commit -m "..."
      - git push

3. After resolution:
   → GitHub shows green "Can merge"

4. Click "Merge Pull Request"
   → Code is merged! ✅
```

---

## 🎓 Why Conflicts Happen

```
Timeline:
- Time 1: Member 2 creates branch from main
- Time 2: You make changes to ReuseGuide.js and merge to main
- Time 3: Member 2 also changes ReuseGuide.js in their branch
- Time 4: Member 2 submits PR

Result: Both changed same file → CONFLICT ❌

Solution: Merge main into their branch before merging PR
```

---

## 💡 Tips to AVOID Conflicts

### Tell Your Team:

1. **Sync before starting:**

   ```bash
   git pull upstream main  # or git pull origin main
   ```

2. **Make small commits:**
   - Don't change 20 files at once
   - 3-5 files per commit

3. **Communicate:**
   - "I'm working on ReuseGuide.js"
   - Avoid 2 people editing same file

4. **Keep branches updated:**
   ```bash
   git merge origin/main while working
   ```

---

## 🚨 Complex Conflicts - When to Ask for Help

**If you see:**

- 10+ conflicted files
- Conflicts in multiple lines in same file
- Unsure which code to keep

**Ask the team member:**

> "Your PR has conflicts. Can you resolve them on your branch?
> Merge main into your feature branch and push the fix."

```bash
# They do this:
git merge origin/main
# Fix conflicts locally
git push origin feature/their-task
```

---

## 📋 Quick Conflict Resolution Checklist

- [ ] GitHub shows "Can't merge" (red button)
- [ ] Choose: resolve on GitHub OR locally
- [ ] If locally:
  - [ ] Fetch/checkout their branch
  - [ ] Merge main
  - [ ] Open conflicted files
  - [ ] Choose code to keep (theirs/yours/combination)
  - [ ] Delete conflict markers `<<<< ==== >>>>`
  - [ ] Add and commit
  - [ ] Push
- [ ] GitHub now shows "Can merge" (green button)
- [ ] Click "Merge Pull Request"
- [ ] Verify merge on main

---

## 🎯 Common Conflicts & Quick Fixes

### Import/Export Conflicts

```javascript
// THEIR CODE:
import { reuseIdeas } from "@/api";

// YOUR CODE:
import { fetchIdeas } from "@/services";

// FIX: Keep both (you probably need both)
import { reuseIdeas } from "@/api";
import { fetchIdeas } from "@/services";
```

### State/Hook Conflicts

```javascript
// THEIR CODE:
const [ideas, setIdeas] = useState([]);

// YOUR CODE:
const [reuseIdeas, setReuseIdeas] = useState([]);

// FIX: Use both, different names
const [ideas, setIdeas] = useState([]);
const [reuseIdeas, setReuseIdeas] = useState([]);
```

### Function Logic Conflicts

```javascript
// THEIR CODE:
const handleAnalyze = () => {
  // Their implementation
};

// YOUR CODE:
const handleAnalyze = async () => {
  // Your implementation
};

// FIX: Discuss which is better, keep one or merge both
```

---

## 📞 Message for Your Team

> "If your PR shows conflicts:
>
> **Easiest way:** Merge main into your branch:
>
> ```
> git merge origin/main
> ```
>
> (Or git merge origin/hanuman if using set-url)
>
> Fix any conflicts locally, then push:
>
> ```
> git push origin feature/your-branch
> ```
>
> Then GitHub will show green 'Can merge' button!
>
> I'll merge when ready."

---

## ✅ Summary

| Step | Action                   |
| ---- | ------------------------ |
| 1    | Team submits PR          |
| 2    | You review code          |
| 3    | Conflicts? YES → Resolve |
| 4    | Click "Merge" on GitHub  |
| 5    | Code merged to main ✅   |

---

**You're ready to merge team code!** 🚀
