# New Nest List Module - Documentation

## 📋 Tổng Quan (Overview)

Module **New Nest List** là một công cụ nesting (xếp hình tối ưu) mới được tích hợp vào hệ thống AX Tool. Module này cho phép người dùng:
- Chọn các chi tiết (parts) từ bản vẽ CAD
- Chọn tấm ván (sheets) để xếp
- Cấu hình các thông số nesting
- Chạy thuật toán tối ưu hóa
- Xem kết quả trực quan trên canvas

---

## 🏗️ Cấu Trúc Dự Án (Project Structure)

```
ax/
├── components/
│   └── nesting/
│       └── NewNestList/              # Module mới
│           ├── NewNestListModal.tsx   # Main modal component
│           ├── ToolsPanel.tsx         # Panel 1: Tools buttons
│           ├── PartListGrid.tsx       # Panel 2: Parts list
│           ├── MaterialListGrid.tsx   # Panel 3: Sheets list
│           ├── ActionsPanel.tsx       # Panel 4: Action buttons
│           ├── PartParametersDialog.tsx
│           ├── AdvancedSettingsDialog.tsx
│           ├── useCanvasSelection.ts  # Canvas selection hook
│           ├── types.ts               # TypeScript types
│           └── index.ts               # Exports
│
├── services/
│   └── nestingApiClient.ts           # API client for backend
│
└── backend/                          # Python backend
    ├── nesting_api.py                # FastAPI server
    └── requirements.txt              # Python dependencies
```

---

## 🚀 Cách Sử Dụng (Usage)

### 1. Import Module

```tsx
import { NewNestListModal, NestingPart, NestingSheet } from '@/components/nesting';
```

### 2. Sử Dụng Component

```tsx
function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        NEW NEST LIST
      </button>

      <NewNestListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectParts={() => {
          // Handle part selection from canvas
        }}
        onSelectSheet={() => {
          // Handle sheet selection from canvas
        }}
        onOpenSettings={() => {
          // Handle settings dialog
        }}
        lang="vi"
      />
    </>
  );
}
```

---

## 🔧 Workflow Chi Tiết (Detailed Workflow)

### A. Thêm Chi Tiết (Add Part From Drawing)

1. **Trigger:** Click nút "Thêm Chi Tiết Từ Bản Vẽ"
2. **Action:** Modal ẩn, chuyển sang chế độ Select Mode trên Canvas
3. **User Action:** 
   - Quét chọn (Window Select) hoặc click chọn các vector
   - Các đối tượng được chọn highlight màu xanh lá nét đứt
4. **Confirm:** Nhấn **Enter**
5. **Dialog:** Hiện popup "Part Parameters" để nhập:
   - Tên chi tiết
   - Số lượng (Max Possible hoặc Custom)
   - Ưu tiên (1-5)
   - Đối xứng (None/Horizontal/Vertical/Both)
   - Xoay (None/90°/180°/Any)
   - Chi tiết nhỏ (checkbox)
6. **Result:** Chi tiết được thêm vào Part List Grid

### B. Thêm Khổ Ván (Add Sheet From Drawing)

1. **Trigger:** Click nút "Thêm Khổ Ván Từ Bản Vẽ"
2. **Action:** Modal ẩn, chuyển sang chế độ Select Mode
3. **User Action:** Chọn vector biên dạng tấm ván
4. **Result:** Tấm ván được thêm vào Material List Grid

### C. Cài Đặt Nesting (Settings)

Click nút "Cài Đặt" để mở dialog với 3 tabs:

#### Tab 1: General
- **Algorithm:** Rectangular / True Shape / Vero
- **Object Type:** Toolpath / Geometry
- **Spacing:** Khoảng cách giữa các chi tiết (mm)
- **Margin:** Lề từ cạnh tấm ván (mm)

#### Tab 2: Strategy
- **Start Corner:** Góc bắt đầu xếp (Top-left/Bottom-left...)
- **Nesting Order:** Thứ tự ưu tiên (Best utilization/By size/By priority)
- **Offcut Direction:** Hướng phần thừa (Horizontal/Vertical/Auto)
- **Allow Rotation:** Cho phép xoay chi tiết

#### Tab 3: Extensions
- **Merge Parts:** Gộp các chi tiết giống nhau
- **Drill First:** Khoan lỗ trước khi cắt
- **Optimize Toolpath:** Tối ưu đường dao
- **Use Remnants:** Sử dụng phần thừa

### D. Chạy Nesting (Run Nesting)

1. **Condition:** Nút "Chạy Nesting" chỉ active khi có ít nhất 1 part và 1 sheet
2. **Process:**
   - Hiện overlay với progress bar
   - Gửi dữ liệu đến Python backend
   - Backend chạy thuật toán Vero-like
   - Nhận kết quả về
3. **Result:** 
   - Vẽ kết quả trực tiếp lên canvas
   - Hiển thị utilization (%)
   - Hiển thị số tấm đã sử dụng

---

## 🔌 Backend Setup

### 1. Cài Đặt Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

### 2. Chạy Server

```powershell
python nesting_api.py
```

Hoặc:

```powershell
uvicorn nesting_api:app --reload --port 8000
```

### 3. Test API

```powershell
curl http://localhost:8000/
```

---

## 📡 API Endpoints

### Health Check
```
GET /
Response: { "service": "Nesting API", "version": "1.0.0", "status": "running" }
```

### Calculate Nesting
```
POST /api/nesting/calculate
Body: {
  "parts": [...],
  "sheets": [...],
  "settings": {...}
}
Response: {
  "job_id": "uuid",
  "placements": [...],
  "utilization": 85.5,
  "processing_time": 1.234,
  "sheets_used": 2
}
```

### Preview Nesting
```
POST /api/nesting/preview
Body: Same as /calculate
Response: Same as /calculate (faster, less optimal)
```

---

## 🎨 UI/UX Features

### Visual Feedback
- **Selection Mode:** Canvas cursor thành crosshair
- **Selected Objects:** Border màu xanh lá (#22c55e) nét đứt [5, 5]
- **Hover Effects:** Buttons có shadow và scale effect
- **Loading State:** Progress bar với animation gradient

### Responsive Grid
- **Part List Grid:** 
  - Columns: Drag | Name | Size | Qty | Priority | Symmetry | Rotation | Small Part | Actions
  - Editable inline
  - Drag & drop reorder (planned)

- **Material List Grid:**
  - Columns: Drag | Material Name | Size | Thickness | Qty | Actions
  - Editable inline

### Keyboard Shortcuts
- **Enter:** Confirm selection
- **Esc:** Cancel selection
- **Ctrl+Z:** Undo (planned)
- **Ctrl+Y:** Redo (planned)

---

## 🧪 Testing

### Frontend Test
```tsx
import { render, fireEvent } from '@testing-library/react';
import NewNestListModal from './NewNestListModal';

test('opens modal and adds part', () => {
  const { getByText } = render(<NewNestListModal isOpen={true} />);
  fireEvent.click(getByText('Thêm Chi Tiết'));
  // Assert...
});
```

### Backend Test
```python
from fastapi.testclient import TestClient
from nesting_api import app

client = TestClient(app)

def test_calculate_nesting():
    response = client.post("/api/nesting/calculate", json={
        "parts": [...],
        "sheets": [...],
        "settings": {...}
    })
    assert response.status_code == 200
```

---

## 🚧 Future Enhancements

1. **Advanced Algorithms:**
   - Full No-Fit Polygon (NFP) generation
   - Genetic Algorithm optimization
   - Simulated Annealing

2. **Features:**
   - Drag & drop parts on canvas
   - Manual adjustment of placements
   - Save/Load nesting projects
   - Export to DXF/SVG
   - Batch nesting multiple jobs

3. **Performance:**
   - Web Workers for heavy computation
   - Caching of NFP calculations
   - Progressive rendering for large datasets

4. **UI/UX:**
   - 3D preview mode
   - Real-time utilization updates
   - Undo/Redo history
   - Keyboard shortcuts

---

## 📝 Notes

- **LƯU Ý:** Module này được thêm vào mà KHÔNG XÓA bất kỳ code cũ nào
- **INTEGRATION:** Tích hợp với NestingTool.tsx hiện tại thông qua exports
- **BACKEND:** Python backend có thể chạy độc lập hoặc containerize với Docker
- **SCALING:** API có thể scale horizontal với load balancer

---

## 👨‍💻 Developer Guide

### Add New Algorithm

```python
# In nesting_api.py

def my_custom_algorithm(parts: List[Part], sheet: Sheet, settings: NestingSettings) -> List[Placement]:
    """Your custom nesting logic"""
    placements = []
    # ... implementation ...
    return placements

# Register in endpoint
if request.settings.algorithm == 'my-custom':
    placements = my_custom_algorithm(expanded_parts, sheet, request.settings)
```

### Add New Setting

```tsx
// In types.ts
export interface NestingSettings {
  // ... existing settings ...
  myNewSetting: boolean;
}

// In AdvancedSettingsDialog.tsx
// Add UI control for the new setting
```

---

## 🐛 Troubleshooting

### Backend không kết nối
- Check Python server đang chạy: `http://localhost:8000`
- Check CORS settings trong `nesting_api.py`
- Check firewall/antivirus

### Canvas selection không hoạt động
- Check Fabric.js đã được import
- Check canvasRef đã được pass đúng
- Check event listeners đã được register

### Nesting kết quả không tối ưu
- Thử algorithm khác (Vero > True Shape > Rectangular)
- Giảm spacing/margin
- Enable rotation
- Sắp xếp parts theo priority

---

## 📄 License

Internal Tool - VJP26 Project

---

## 📞 Support

Contact: Development Team
Version: 1.0.0
Last Updated: 2026-02-03
