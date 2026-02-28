# Git Master Skill - Version Control for Nesting Tool

## Description
MUST USE for ANY git operations. Atomic commits, rebase/squash, history search (blame, bisect, log -S). STRONGLY RECOMMENDED: Use with task(category='quick', load_skills=['git-master'], ...) to save context.

## Triggers
- 'commit', 'rebase', 'squash', 'who wrote', 'when was X added', 'find the commit that'

## Git Workflow for Nesting Tool Project

### 1. Commit Conventions

#### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types
- `feat`: New feature (e.g., feat(nesting): add genetic algorithm)
- `fix`: Bug fix (e.g., fix(dxf): resolve arc parsing error)
- `refactor`: Code restructuring (e.g., refactor(services): split nesting logic)
- `docs`: Documentation (e.g., docs(readme): update API examples)
- `style`: Formatting only (e.g., style(components): fix indentation)
- `test`: Tests (e.g., test(nesting): add unit tests for geometry)
- `chore`: Maintenance (e.g., chore(deps): update three.js)

#### Scopes
- `nesting`: Nesting algorithms and logic
- `dxf`: DXF parsing and handling
- `gcode`: GCode generation
- `ui`: UI components
- `canvas`: Canvas/drawing components
- `api`: API client and backend integration
- `types`: TypeScript types
- `services`: Service layer

### 2. Atomic Commits

Each commit should:
- Do ONE thing only
- Be self-contained
- Pass all tests
- Have a clear message

```bash
# Good - single feature
git add src/services/nesting/geneticNesting.ts
git commit -m "feat(nesting): implement genetic algorithm for part placement

- Add genetic algorithm with configurable generations
- Implement fitness function based on material utilization
- Add crossover and mutation operations
- Include population size and mutation rate settings"

# Bad - mixed changes
git add .
git commit -m "updates"
```

### 3. Branch Strategy

```bash
# Main branches
main        # Production-ready code
develop     # Integration branch

# Feature branches
feature/nesting-algorithm-v2
feature/dxf-batch-import
feature/gcode-optimization

# Fix branches
fix/canvas-zoom-bug
fix/dxf-arc-parsing

# Release branches
release/v2.1.0
```

### 4. Common Operations

#### Starting New Feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/new-feature
# ... work ...
git add -p  # Review changes interactively
git commit -m "feat(scope): description"
git push -u origin feature/new-feature
```

#### Committing Changes
```bash
# Check status
git status

# Review changes
git diff

# Stage specific files
git add src/components/NestingTool.tsx
git add src/services/nesting/

# Stage interactively
git add -p

# Commit with detailed message
git commit -m "feat(nesting): add auto-fit for irregular parts

- Implement convex hull calculation
- Add rotation optimization (0-360° in 15° steps)
- Calculate minimal bounding rectangle
- Update UI with progress indicator"
```

#### Interactive Rebase
```bash
# Rebase last 5 commits
git rebase -i HEAD~5

# Common actions in rebase:
# p, pick = use commit
# r, reword = use commit, but edit message
# e, edit = use commit, but stop for amending
# s, squash = use commit, but meld into previous
# f, fixup = like squash, but discard message
# d, drop = remove commit
```

#### Squash Commits
```bash
# Squash last 3 commits into one
git rebase -i HEAD~3
# Change 'pick' to 'squash' for commits 2 and 3

# Alternative: soft reset and recommit
git reset --soft HEAD~3
git commit -m "feat(nesting): complete auto-fit feature

Implement automatic fitting for irregular parts with:
- Convex hull calculation using Graham scan
- Rotation optimization in 15° increments
- Minimal bounding rectangle computation
- Progress UI with cancel option"
```

### 5. History Search

#### Find When Code Was Added
```bash
# Search for specific text in history
git log -S "calculateNesting" --oneline

# Search with context
git log -S "calculateNesting" -p

# Search in specific file
git log -S "geneticAlgorithm" -- src/services/nesting/
```

#### Blame
```bash
# Who wrote each line
git blame src/services/nesting/geneticNesting.ts

# Blame specific lines
git blame -L 50,100 src/services/nesting/geneticNesting.ts

# Ignore whitespace
git blame -w src/components/NestingTool.tsx
```

#### Bisect for Finding Bugs
```bash
# Start bisect session
git bisect start

# Mark current as bad
git bisect bad

# Mark known good commit
git bisect good v1.2.0

# Git checks out middle commit - test it
# Mark as good or bad
git bisect good  # or bad

# Repeat until found
# End bisect
git bisect reset
```

### 6. Stashing

```bash
# Save current changes
git stash push -m "WIP: nesting algorithm improvements"

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Drop specific stash
git stash drop stash@{1}

# Clear all stashes
git stash clear
```

### 7. Undoing Changes

```bash
# Unstage files
git restore --staged src/file.ts

# Discard local changes
git restore src/file.ts

# Amend last commit
git commit --amend -m "feat(nesting): corrected message"

# Amend without changing message
git commit --amend --no-edit

# Reset to previous commit (keep changes)
git reset --soft HEAD~1

# Reset to previous commit (discard changes)
git reset --hard HEAD~1
```

### 8. Working with Remotes

```bash
# View remotes
git remote -v

# Fetch latest
git fetch origin

# Pull with rebase
git pull --rebase origin develop

# Push to remote
git push origin feature-branch

# Force push (use carefully!)
git push --force-with-lease origin feature-branch

# Delete remote branch
git push origin --delete feature-branch
```

### 9. Tagging Releases

```bash
# Create annotated tag
git tag -a v2.1.0 -m "Release version 2.1.0

- New genetic nesting algorithm
- DXF batch import support
- Improved canvas performance"

# Push tags
git push origin --tags

# Delete local tag
git tag -d v2.1.0
```

### 10. Best Practices

1. **Commit Early, Commit Often**: Small commits are easier to review and revert
2. **Write Good Messages**: Future you will thank present you
3. **Test Before Commit**: Ensure code works before committing
4. **Pull Before Push**: Always pull latest changes before pushing
5. **Use Branches**: Never commit directly to main/develop
6. **Review Changes**: Use `git diff` and `git add -p` to review
7. **Keep History Clean**: Use rebase for feature branches
8. **Tag Releases**: Mark important milestones with tags

### 11. Common Scenarios

#### Scenario: Forgot to Add File to Last Commit
```bash
git add forgotten-file.ts
git commit --amend --no-edit
```

#### Scenario: Committed to Wrong Branch
```bash
# Save commit
git reset HEAD~1 --soft

# Switch to correct branch
git checkout correct-branch

# Recommit
git commit -m "original message"
```

#### Scenario: Merge Conflict
```bash
# During rebase or merge
git status  # See conflicting files

# Edit files to resolve conflicts
# Mark as resolved
git add resolved-file.ts

# Continue rebase
git rebase --continue

# Or abort
git rebase --abort
```

#### Scenario: Track Large Files (DXF examples)
```bash
# If using Git LFS for large files
git lfs track "*.dxf"
git lfs track "*.nc"
git add .gitattributes
```
