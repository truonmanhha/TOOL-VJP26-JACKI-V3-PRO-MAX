# DEBUG TEST PROCEDURE - Part Preview Issue

## Status: FULL DEBUG TRACING ENABLED ✅

All critical code paths now have console logging to track CAD entity data flow from capture to render.

---

## 🎯 Test Workflow

### Step 1: Prepare Environment
1. Open application in browser
2. Open DevTools (`F12`)
3. Go to **Console** tab
4. Clear console (`Ctrl + L`)

### Step 2: Create Test Data
1. Click **"New Nest List"** button
2. Name it "Test List 1"
3. **Select the list** to make it active (important!)

### Step 3: Draw Geometry
1. Select **Circle** tool from toolbar
2. Click to set center point
3. Move mouse and click to set radius
4. You should see a circle drawn

### Step 4: Add Part
1. Click **"Add Part From Drawing"** button
2. Use **Window Selection**:
   - Click top-left corner (outside circle)
   - Drag to bottom-right (outside circle)
   - Release to select everything inside
3. Press `Enter` to confirm selection
4. Dialog should appear with:
   - Auto-filled dimensions
   - Preview panel (should show circle)
5. Click **"OK"** to add part

### Step 5: Verify Results
1. Check **Nest List sidebar** (left panel)
2. Under "Test List 1", you should see:
   - Part_1 item with thumbnail
3. **Expected**: Thumbnail shows CIRCLE shape
4. **Bug**: Thumbnail shows green SQUARE (fallback)

---

## 📊 Expected Console Output

```
🚀 Part Modal OPENED - Starting geometry capture...
  📦 cadEntities: 1
  ✅ selectedEntities: (1) ['abc-123-uuid']

🔍 Selected PART entities for preview: (1) [{…}]
📊 Entity structure samples:
  [0]: {type: 'circle', id: 'abc-123', points: Array(2), hasCenter: false, …}

📐 Calculated part dimensions: {width: 100, height: 100}

🎯 Adding Part with CAD entities: 1 entities
  Entity 0: circle

📦 NestingAXApp.handleAddPart() - Incoming partData:
  name: "Part_1"
  hasCadEntities: true
  cadEntitiesLength: 1
  cadEntitiesTypes: ['circle']

💾 DB.addPart() - Incoming part data:
  name: "Part_1"
  hasCadEntities: true
  cadEntitiesLength: 1
  cadEntitiesTypes: ['circle']

💾 DB.addPart() - New part before save:
  id: "xyz-789-uuid"
  hasCadEntities: true
  cadEntitiesLength: 1

💾 DB.addPart() - Retrieved after save:
  hasCadEntities: true
  cadEntitiesLength: 1

📦 NestingAXApp.handleAddPart() - newPart from db:
  id: "xyz-789-uuid"
  hasCadEntities: true
  cadEntitiesLength: 1

📖 DB.getParts() - Retrieved parts: 1
  Part 0 (Part_1): {hasCadEntities: true, cadEntitiesLength: 1, cadEntitiesTypes: ['circle']}

🔍 Part preview for: Part_1
  cadEntities: [{id: 'abc-123', type: 'circle', points: Array(2), properties: {…}}]
  cadEntities length: 1
  geometryData: {paths: Array(1)}

🔄 Converting CAD entities: 1
  Entity 0: circle {id: 'abc-123', type: 'circle', points: Array(2), …}
✅ Converted to paths: 1
```

---

## 🔍 Debugging Guide

### If Preview Shows Fallback Square

Check console logs to find where `cadEntities` becomes `null` or `undefined`:

#### Scenario A: Data Lost at Save
```
✅ Adding Part with CAD entities: 1 entities
❌ DB.addPart() - Incoming part data: hasCadEntities: false
```
**Problem**: Data not passed from Workspace to NestingAXApp  
**Fix**: Check `handleParamsOK()` and `onAddPart` callback

#### Scenario B: Data Lost at Storage
```
✅ DB.addPart() - New part before save: hasCadEntities: true
❌ DB.addPart() - Retrieved after save: hasCadEntities: false
```
**Problem**: localStorage JSON serialization issue  
**Fix**: Check if entity structure is JSON-safe

#### Scenario C: Data Lost at Retrieval
```
✅ DB.addPart() succeeded
❌ DB.getParts() - Part 0: hasCadEntities: false
```
**Problem**: Data not loading from localStorage  
**Fix**: Check `getParts()` filter logic

#### Scenario D: Data Exists but Not Rendered
```
✅ Part preview for: Part_1 - cadEntities: [{…}]
❌ geometryData: null
```
**Problem**: Converter function failed  
**Fix**: Check `cadEntitiesToGeometry()` logic

#### Scenario E: No Capture
```
❌ Selected PART entities for preview: (0) []
```
**Problem**: Selection not captured  
**Fix**: Check if entities were drawn and selected properly

---

## 🛠️ Quick Fixes

### Clear Old Data
If you're testing with old Parts (created before cadEntities support):

1. Open DevTools Console
2. Run: `localStorage.clear()`
3. Refresh page (`F5`)
4. Repeat test workflow

### Force Debug Mode
If logs don't appear:

1. Check Console is not filtered (show "All levels")
2. Check no error suppression
3. Try hard refresh (`Ctrl + Shift + R`)

---

## ✅ Success Criteria

**Test passes when:**
1. Console shows all expected logs with `hasCadEntities: true`
2. Sidebar thumbnail displays **circular shape** (not green square)
3. Preview panel in dialog shows circular shape

**Test fails when:**
1. Any log shows `hasCadEntities: false` or `cadEntities: undefined`
2. Sidebar thumbnail shows green square fallback
3. Console shows error or warning messages

---

## 📝 Report Template

When reporting results, copy this and fill in:

```
BROWSER: [Chrome/Firefox/Edge] version [X]
TEST DATE: [Date/Time]

STEPS COMPLETED:
- [ ] Drew circle
- [ ] Added Part
- [ ] Checked console logs
- [ ] Checked sidebar thumbnail

RESULT:
- Thumbnail shows: [Circle / Square / Other]
- Console logs: [Paste key logs here]
- Screenshot: [If possible]

SPECIFIC ISSUE:
[Describe what you see vs what's expected]
```

---

## 🎓 Technical Details

### Data Flow Chain
```
Drawing Tool
  ↓ (creates entity)
cadEntities[] state
  ↓ (on selection)
selectedPartGeometry state
  ↓ (in useEffect)
Part form preview + dimensions
  ↓ (handleParamsOK)
newPart.cadEntities
  ↓ (onAddPart callback)
handleAddPart(partData)
  ↓ (db.addPart)
localStorage JSON
  ↓ (setCurrentParts)
React state update
  ↓ (Sidebar prop)
parts={currentParts}
  ↓ (cadEntitiesToGeometry)
geometryData {paths: [...]}
  ↓ (VectorPreview)
Canvas rendering ✨
```

### Entity Format
```typescript
{
  id: string;           // UUID
  type: 'circle';       // Entity type
  points: [             // 2 points
    {x: number, y: number},  // Center
    {x: number, y: number}   // Perimeter point
  ];
  properties: {
    radius: number;     // Calculated radius
  }
}
```

### Converter Logic
```typescript
// Extract center and radius
const center = entity.points[0];           // First point
const radius = entity.properties.radius;   // From properties

// Generate 32-segment polyline
for (let i = 0; i <= 32; i++) {
  const angle = (i / 32) * Math.PI * 2;
  points.push({
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  });
}
```

---

## 📞 Support

If issue persists after following this guide:
1. Copy full console output
2. Take screenshot of sidebar thumbnail
3. Note any error messages
4. Report to developer with filled template

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-14  
**Author**: GitHub Copilot Debugging Assistant
