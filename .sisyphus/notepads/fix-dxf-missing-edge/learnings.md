# Fix DXF Missing Edge - Learnings

## Task 1: Fix Closed Polyline Handling (dòng 39-61)
**APPLIED**: Thay thế logic tách closed polyline thành từng LINE riêng lẻ.

### Root Cause
- Old logic: Tách closed polyline (LWPOLYLINE/POLYLINE) thành N đoạn LINE riêng biệt
- Problem: `joinPaths()` sau đó cố nối các LINE này lại, nhưng khi số đoạn nhiều, có thể bỏ sót closing segment
- Result: Mất cạnh cuối cùng của polygon

### Solution Implemented
```typescript
if (isClosed && points.length > 2) {
  const closedPoints = [...points];
  if (this.dist(closedPoints[0], closedPoints[closedPoints.length - 1]) > 0.0001) {
    closedPoints.push({ x: closedPoints[0].x, y: closedPoints[0].y });
  }
  // Push directly to results (không tách thành LINE)
  results.push({...});
} else {
  // Polyline mở: đưa vào rawPaths để xử lý join
  rawPaths.push({ points, originalType: entity.type });
}
```

**Key insight**: Closed polygon nên giữ nguyên toàn bộ (với closing edge explicit) thay vì tách rồi join lại.

---

## Task 2: Fix `isClosedPath()` Tolerance (dòng 116)
**APPLIED**: Thay `0.0001` hardcode bằng `tolerance` parameter.

### Before
```typescript
return this.dist(start, end) < 0.0001;  // ❌ hardcode
```

### After
```typescript
return this.dist(start, end) <= tolerance;  // ✅ respects parameter
```

**Impact**: 
- Consistency: Sử dụng tolerance parameter được truyền vào (default 0.5)
- Flexibility: Cho phép caller điều chỉnh threshold closed detection
- Bug fix: Không bỏ sót các path gần-closed với tolerance > 0.0001

---

## Type-Check Result
✅ `npx tsc --noEmit` PASSED for `services/dxfService.ts`
- File được sửa không có TypeScript errors
- Project-wide errors (GCodeViewer, NestingAX, etc.) không liên quan Task 1 & Task 2

---

## Files Changed
- ✅ `services/dxfService.ts` - 2 edits applied successfully
- ❌ NO other files modified

---

## Verification Checklist
- [x] Task 1: Closed polyline kept as-is, not split to LINE
- [x] Task 2: `isClosedPath()` uses `tolerance` parameter
- [x] Type-check clean for dxfService.ts
- [x] No unintended file changes
