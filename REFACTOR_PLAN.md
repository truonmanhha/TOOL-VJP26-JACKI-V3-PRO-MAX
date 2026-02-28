# 🔧 NESTING TOOL - COMPLETE REFACTOR PLAN

## STATUS: Phase 1 - Foundation Review

### ✅ CURRENT STATE (WORKING)
- [x] Canvas rendering system
- [x] screenToWorld / worldToScreen coordinate conversion
- [x] REC, LINE, CIRCLE, ARC, POLYGON commands
- [x] MOVE command (with SNAP)
- [x] OPTIONS panel (OP command)
- [x] Multi-sheet nesting
- [x] Grid system
- [x] Crosshair cursor

### 🔴 KNOWN ISSUES TO FIX

#### 1. **Coordinate System Issues**
- [ ] Verify all tools use screenToWorld correctly
- [ ] Check Radial Menu click coordinates
- [ ] Ensure consistent coordinate handling across all commands
- [ ] Fix any offset in drawing operations

#### 2. **Transformation Tools (ROTATE, SCALE, MIRROR)**
- [ ] Implement click-based interaction like MOVE
- [ ] Fix coordinate handling
- [ ] Add visual feedback (base point indicator)
- [ ] Ensure snap works with transforms

#### 3. **GCode Viewer**
- [ ] Fix Three.js JSX syntax errors (GCodeViewer.tsx)
- [ ] Consider replacing with simpler 2D rendering if not needed

#### 4. **UI/UX Improvements**
- [ ] Add snap point visual indicators
- [ ] Improve command feedback messages
- [ ] Better selection visual feedback
- [ ] Snap distance configuration

#### 5. **JOIN Mode**
- [ ] Make join points more visible
- [ ] Improve endpoint detection
- [ ] Add visual feedback for valid joins

#### 6. **Performance**
- [ ] Optimize snap detection (currently O(n))
- [ ] Cache bounding boxes
- [ ] Optimize rendering for large part lists

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1A: Coordinate System Validation (Current)
- Audit all coordinate conversions
- Test REC placement accuracy
- Verify MOVE snap placement
- Create unit test coordinates

### Phase 1B: Fix Transformation Tools
- Implement click-based ROTATE (not prompt-based)
- Implement click-based SCALE (not prompt-based)
- Implement click-based MIRROR (not prompt-based)
- Add visual feedback layer

### Phase 2: Visual Feedback System
- Snap point indicators
- Command status visualization
- Base point markers
- Dimension display

### Phase 3: Snap System Enhancement
- Visual snap indicators
- Configurable snap distance
- Snap type display (grid/endpoint/center)
- Performance optimization

### Phase 4: Advanced Features
- Constraint system (parallel, perpendicular, equal)
- Point filtering
- Smart selection
- Batch operations

### Phase 5: Polish
- Animation transitions
- Undo/Redo optimization
- Keyboard shortcuts
- Help system

---

## 📋 CURRENT COMMAND LIST

| Command | Status | Type | Issues |
|---------|--------|------|--------|
| LINE | ✅ Ready | Click-based | None |
| REC | ✅ Ready | Click-based | None |
| CIRCLE | ✅ Ready | Click-based | None |
| ARC | ✅ Ready | Click-based | None |
| POLYGON | ✅ Ready | Click-based | None |
| MOVE | ✅ Ready | Click-based | Needs testing |
| ROTATE | ⚠️ Partial | Prompt-based | Should be click-based |
| SCALE | ⚠️ Partial | Prompt-based | Should be click-based |
| MIRROR | ⚠️ Partial | Prompt-based | Should be click-based |
| COPY | ✅ Ready | Prompt-based | OK |
| ARRAY | ✅ Ready | Prompt-based | OK |
| OPTIONS | ✅ New | Panel | Just added |

---

## 🎯 SUCCESS CRITERIA

- [ ] All tools use correct coordinate system
- [ ] Visual feedback for all operations
- [ ] No coordinate offset issues
- [ ] Snap system fully functional
- [ ] All commands follow AutoCAD paradigm
- [ ] Performance: render 60 FPS with 1000+ parts
- [ ] No console errors

