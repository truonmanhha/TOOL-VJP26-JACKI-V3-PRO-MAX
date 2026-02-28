# ✅ TESTING CHECKLIST

## 🎯 TEST PLAN FOR CRITICAL BUG FIXES

### Pre-Test Setup
- [ ] Browser: Chrome/Edge (latest version)
- [ ] Dev Server: Running on `http://localhost:5174/`
- [ ] Tab: NESTING AX active
- [ ] Console: Open (F12) to see logs

---

## 🔴 TEST SUITE 1: Radial Menu Suppression

### Test 1.1: Normal Radial Menu (Baseline)
**Expected:** Radial Menu works normally when NOT in selection mode

**Steps:**
1. Go to NESTING AX tab
2. Draw some objects (Line, Circle, etc.)
3. Right-Click on canvas (NOT in selection mode)

**Expected Result:**
- ✅ Radial Menu appears at click position
- ✅ Menu has inner/outer ring with icons
- ✅ Click outside → Menu closes

**Status:** [ ] PASS [ ] FAIL

---

### Test 1.2: Suppressed During Selection
**Expected:** Radial Menu does NOT appear during part selection

**Steps:**
1. Click "NEW NEST LIST" button
2. Click "Thêm Chi Tiết Từ Bản Vẽ"
3. Modal closes, selection mode activates
4. Right-Click on canvas

**Expected Result:**
- ❌ Radial Menu DOES NOT appear
- ✅ Modal reopens instead
- ✅ Console shows: "🚫 Radial Menu suppressed - Nesting selection mode active"

**Status:** [ ] PASS [ ] FAIL

---

### Test 1.3: Re-Enable After Exit
**Expected:** Radial Menu re-enabled after leaving selection mode

**Steps:**
1. (Continue from Test 1.2 - modal is open)
2. Close modal (X button or click outside)
3. Right-Click on canvas

**Expected Result:**
- ✅ Radial Menu appears again (normal behavior restored)

**Status:** [ ] PASS [ ] FAIL

---

## 🟢 TEST SUITE 2: Correct Add Part Flow

### Test 2.1: ENTER Key Opens Dialog
**Expected:** Pressing ENTER after selection opens Parameters Dialog

**Steps:**
1. Click "NEW NEST LIST"
2. Click "Thêm Chi Tiết Từ Bản Vẽ"
3. Click to select a Line object (should highlight blue)
4. Press **ENTER** key ⏎

**Expected Result:**
- ✅ Parameters Dialog appears (centered, backdrop blur)
- ✅ Shows preview: "Width × Height (Area)"
- ✅ Name input has autofocus
- ✅ Default name: "Part 1"
- ✅ Quantity default: Custom, value = 1

**Status:** [ ] PASS [ ] FAIL

---

### Test 2.2: Dialog Input & Validation
**Expected:** Dialog validates input and allows submission

**Steps:**
1. (Continue from Test 2.1 - dialog is open)
2. Clear the name input (delete all text)
3. Try to click "Xác Nhận" button

**Expected Result:**
- ✅ Button is DISABLED (gray, no gradient)
- ✅ Cannot submit empty name

4. Type a name: "Test Part A"
5. Change quantity to 3

**Expected Result:**
- ✅ Button becomes ENABLED (purple-pink gradient)
- ✅ Can now submit

**Status:** [ ] PASS [ ] FAIL

---

### Test 2.3: Part Added to List
**Expected:** Clicking OK adds part to internal state and logs

**Steps:**
1. (Continue from Test 2.2)
2. Click "Xác Nhận" button

**Expected Result:**
- ✅ Dialog closes immediately
- ✅ Console log: "✅ Added: Test Part A ([width]×[height]) × 3"
- ✅ Console log: "🎯 Select more + ENTER, or Right-Click to finish"
- ✅ Prompt bar updates: "🎯 Select more parts + ENTER, or Right-Click to finish"
- ✅ Selection cleared (no blue highlight)
- ✅ Still in selection mode (can add more)

**Status:** [ ] PASS [ ] FAIL

---

### Test 2.4: Multi-Part Addition (Loop)
**Expected:** Can add multiple parts in sequence

**Steps:**
1. (Continue from Test 2.3)
2. Select another object (different from first)
3. Press ENTER
4. Dialog appears, enter name "Test Part B", quantity 2
5. Click OK
6. Select third object
7. Press ENTER
8. Dialog appears, enter name "Test Part C", quantity 5
9. Click OK

**Expected Result:**
- ✅ Each ENTER opens dialog with correct dimensions
- ✅ Each OK closes dialog and logs success
- ✅ No errors in console
- ✅ Still in selection mode after each addition

**Status:** [ ] PASS [ ] FAIL

---

### Test 2.5: Finish & View List
**Expected:** Right-Click exits selection and shows parts in modal

**Steps:**
1. (Continue from Test 2.4 - 3 parts added)
2. Right-Click anywhere on canvas

**Expected Result:**
- ✅ Modal reopens (4-panel layout)
- ✅ Panel 2 (Part List Grid) shows 3 rows:
  - Row 1: Test Part A × 3
  - Row 2: Test Part B × 2
  - Row 3: Test Part C × 5
- ✅ Each row has edit/delete icons
- ✅ Left panel shows same list (Danh Sách Chi Tiết Cần Nest)

**Status:** [ ] PASS [ ] FAIL

---

## 🟡 TEST SUITE 3: Edge Cases & Cancel

### Test 3.1: Cancel Dialog (ESC Key)
**Expected:** ESC closes dialog without adding part

**Steps:**
1. Start selection, select object, press ENTER
2. Dialog appears
3. Press ESC key

**Expected Result:**
- ✅ Dialog closes
- ✅ NO part added
- ✅ Console NO "Added" log
- ✅ Still in selection mode

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.2: Cancel Dialog (Hủy Button)
**Expected:** Clicking "Hủy" closes without adding

**Steps:**
1. Start selection, select object, press ENTER
2. Dialog appears
3. Enter some data
4. Click "Hủy" button

**Expected Result:**
- ✅ Dialog closes
- ✅ NO part added (data discarded)
- ✅ Still in selection mode

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.3: No Selection + ENTER
**Expected:** ENTER does nothing if no objects selected

**Steps:**
1. Start selection mode
2. Do NOT click any objects (selectedIds is empty)
3. Press ENTER

**Expected Result:**
- ❌ Dialog DOES NOT appear
- ✅ Nothing happens (or warning message)

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.4: Max Possible Mode
**Expected:** Max mode sets quantity to 999

**Steps:**
1. Select object, press ENTER
2. Dialog appears
3. Select "Max Possible" radio button

**Expected Result:**
- ✅ Custom quantity input becomes DISABLED (grayed out)
- ✅ Value irrelevant (will be 999)

4. Click OK

**Expected Result:**
- ✅ Part added with quantity = 999
- ✅ Console log shows "× 999"

**Status:** [ ] PASS [ ] FAIL

---

## 🟣 TEST SUITE 4: UI/UX Consistency

### Test 4.1: Prompt Messages Clear
**Expected:** Prompts guide user correctly

**Check Prompts:**
- [ ] Start selection: "🎯 Select parts → Press ENTER to set params → Right-Click when done"
- [ ] Dialog open: "📝 Enter part parameters in dialog..."
- [ ] After adding: "🎯 Select more parts + ENTER, or Right-Click to finish"

**Status:** [ ] PASS [ ] FAIL

---

### Test 4.2: Visual Feedback
**Expected:** Clear visual states for all interactions

**Check:**
- [ ] Selected objects: Blue highlight (#3b82f6)
- [ ] Dialog backdrop: Blur effect visible
- [ ] Button states: Disabled = gray, Enabled = gradient
- [ ] Autofocus: Name input has cursor on open

**Status:** [ ] PASS [ ] FAIL

---

### Test 4.3: Keyboard Shortcuts
**Expected:** All documented shortcuts work

**Test:**
- [ ] ENTER in selection mode → Opens dialog
- [ ] ENTER in dialog (with valid data) → Confirms
- [ ] ESC in dialog → Cancels
- [ ] Right-Click in selection → Finishes

**Status:** [ ] PASS [ ] FAIL

---

## 🔍 REGRESSION TESTS

### Test R.1: Existing Features Unaffected
**Expected:** Normal CAD tools still work

**Steps:**
1. Draw Line (without nesting)
2. Draw Circle
3. Use MOVE command
4. Use COPY command

**Expected Result:**
- ✅ All commands work as before
- ✅ No errors in console
- ✅ Radial Menu works normally (when NOT in selection)

**Status:** [ ] PASS [ ] FAIL

---

### Test R.2: Other Nesting Features
**Expected:** Sheet selection still works

**Steps:**
1. Click "NEW NEST LIST"
2. Click "Thêm Tấm Từ Bản Vẽ" (Add Sheet)
3. Select rectangle
4. Right-Click

**Expected Result:**
- ✅ Sheet added to list
- ✅ Modal reopens with sheet in Panel 3
- ✅ NO Radial Menu during sheet selection

**Status:** [ ] PASS [ ] FAIL

---

## 📊 TEST RESULTS SUMMARY

| Test Suite | Tests | Passed | Failed | Status |
|------------|-------|--------|--------|--------|
| 1. Radial Menu | 3 | [ ] | [ ] | [ ] |
| 2. Add Part Flow | 5 | [ ] | [ ] | [ ] |
| 3. Edge Cases | 4 | [ ] | [ ] | [ ] |
| 4. UI/UX | 3 | [ ] | [ ] | [ ] |
| 5. Regression | 2 | [ ] | [ ] | [ ] |
| **TOTAL** | **17** | **__** | **__** | **__** |

---

## 🐛 BUG REPORTING TEMPLATE

If any test fails, fill this out:

```
Test ID: [e.g., Test 2.1]
Test Name: [e.g., ENTER Key Opens Dialog]
Status: FAILED

Steps to Reproduce:
1. [First step]
2. [Second step]
3. ...

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happened]

Console Errors:
[Copy any error messages from console]

Screenshots:
[Attach if possible]

Environment:
- Browser: [Chrome/Edge/Firefox + version]
- OS: [Windows/Mac/Linux]
- Dev Server: [Running/Not Running]
```

---

## ✅ FINAL CHECKLIST

Before closing testing:
- [ ] All 17 tests completed
- [ ] No critical failures
- [ ] Console shows no errors
- [ ] Documentation matches behavior
- [ ] User can successfully add parts using ENTER key
- [ ] Radial Menu correctly suppressed during selection

---

**Testing Version:** 1.0  
**Date:** Feb 3, 2026  
**Tester:** [Your Name]  
**Status:** [ ] INCOMPLETE [ ] IN PROGRESS [ ] COMPLETED
