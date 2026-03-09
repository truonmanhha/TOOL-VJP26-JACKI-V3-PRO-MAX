## [2026-03-09] T18 Fix: Decoupling realtime UI from offline video export

Trong luồng export video `handleVideoExport` của `components/GCodeViewer.tsx`, callback `applyFrameState` được gọi liên tục bởi hàm `renderVideoOffline` để cập nhật trạng thái của scene/bufferGeometry nhằm chụp lại frame. 

Tuy nhiên, hàm `applyFrameState` trước đây gọi:
```javascript
setDisplayPos(currentPos.clone());
setCurrentIndex(idx);
```

Việc này ép React re-render toàn bộ component `GCodeViewer` (với các giao diện UI nặng) *trên mỗi frame video* được chụp. Hậu quả:
1. Export queue bị nghẽn (browser freeze/lag)
2. Tốc độ render offline bị chững lại, "lù đù" như xem realtime (vì phải đợi React commit DOM).

**Cách khắc phục:**
Chỉ comment/xóa bỏ việc update UI (React state). Các logic update trạng thái Three.js object (`toolHead`, `ghostGeo`) thì giữ nguyên vì chúng bypass qua React (mutating ref trực tiếp).

```javascript
interpolatedPosRef.current.copy(currentPos);
// KHÔNG set state UI ở đây để tránh re-render liên tục gây nghẽn tốc độ export
// setDisplayPos(currentPos.clone());
// setCurrentIndex(idx);
```
Sau fix này, việc kết xuất video WebM qua `requestVideoFrameCallback` chạy 100% ngầm, đạt "tốc độ tối đa".
