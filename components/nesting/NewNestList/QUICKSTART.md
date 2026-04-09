# 🚀 QUICKSTART - New Nest List Module

## Bắt Đầu Nhanh trong 5 Phút

### Bước 1: Khởi Động Backend (Python)

```powershell
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies (chỉ lần đầu)
pip install -r requirements.txt

# Chạy server
python nesting_api.py
```

✅ Server sẽ chạy tại: `http://localhost:8000`

---

### Bước 2: Cấu Hình Frontend

```powershell
# Tạo file .env từ template
copy .env.example .env

# File .env sẽ có:
# VITE_NESTING_API_URL=http://localhost:8000
```

---

### Bước 3: Sử Dụng Trong Code

#### A. Import vào Component

```tsx
// Trong NestingTool.tsx hoặc component khác
import { NewNestListModal } from './nesting';
```

#### B. Thêm State

```tsx
const [isNewNestListOpen, setIsNewNestListOpen] = useState(false);
```

#### C. Thêm Nút Vào Toolbar

```tsx
<button
  onClick={() => setIsNewNestListOpen(true)}
  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
>
  <FileBox className="w-5 h-5" />
  NEW NEST LIST
</button>
```

#### D. Thêm Modal

```tsx
<NewNestListModal
  isOpen={isNewNestListOpen}
  onClose={() => setIsNewNestListOpen(false)}
  lang="vi"
/>
```

---

### Bước 4: Test

1. **Click nút "NEW NEST LIST"** → Modal mở ra
2. **Click "Thêm Chi Tiết"** → Chế độ chọn vector
3. **Click "Cài Đặt"** → Dialog settings mở ra
4. **Thêm parts và sheets** → Grid hiển thị
5. **Click "Chạy Nesting"** → API được gọi

---

## 🎯 Kiểm Tra Nhanh

### Test Backend
```powershell
curl http://localhost:8000/
```

Kết quả mong đợi:
```json
{
  "service": "Nesting API",
  "version": "1.0.0",
  "status": "running"
}
```

### Test Frontend
```tsx
import { checkApiHealth } from '@/services/nestingApiClient';

const isHealthy = await checkApiHealth();
console.log('Backend status:', isHealthy);
```

---

## 📁 Files Đã Được Tạo

### Frontend
```
components/nesting/NewNestList/
├── NewNestListModal.tsx          ✅ Main component
├── ToolsPanel.tsx                ✅ Tools buttons
├── PartListGrid.tsx              ✅ Parts list
├── MaterialListGrid.tsx          ✅ Sheets list
├── ActionsPanel.tsx              ✅ Action buttons
├── PartParametersDialog.tsx      ✅ Part config dialog
├── AdvancedSettingsDialog.tsx    ✅ Settings dialog
├── useCanvasSelection.ts         ✅ Selection hook
├── types.ts                      ✅ TypeScript types
├── index.ts                      ✅ Exports
├── README.md                     ✅ Documentation
├── INTEGRATION_EXAMPLES.tsx      ✅ Examples
└── QUICKSTART.md                 ✅ This file
```

### Backend
```
backend/
├── nesting_api.py                ✅ FastAPI server
└── requirements.txt              ✅ Dependencies
```

### Services
```
services/
└── nestingApiClient.ts           ✅ API client
```

---

## 🔥 Các Tính Năng Chính

✅ **4-Panel Layout:** Tools | Parts | Sheets | Actions  
✅ **Canvas Selection:** Chọn vector từ drawing với highlight  
✅ **Part Parameters:** Cấu hình chi tiết (quantity, priority, rotation...)  
✅ **Advanced Settings:** 3 tabs (General, Strategy, Extensions)  
✅ **Python Backend:** FastAPI với thuật toán nesting  
✅ **Real-time Preview:** Progress bar khi tính toán  
✅ **Multi-language:** Hỗ trợ VI/EN/JP  

---

## 🎨 Screenshots & Demo

### Modal Layout
```
┌─────────────────────────────────────┐
│  🔧 Tools Panel                     │
├─────────────────────────────────────┤
│  📋 Part List Grid                  │
│  (Name | Size | Qty | Priority...) │
├─────────────────────────────────────┤
│  📄 Material List Grid              │
│  (Material | Size | Thickness...)  │
├─────────────────────────────────────┤
│  [Close]              [Run Nesting] │
└─────────────────────────────────────┘
```

---

## ⚠️ Lưu Ý Quan Trọng

1. **KHÔNG XÓA CODE CŨ:** Module này được thiết kế để thêm vào, không thay thế
2. **Backend phải chạy:** Frontend cần backend để tính toán nesting
3. **Port 8000:** Đảm bảo port 8000 không bị chiếm
4. **CORS:** Backend đã cấu hình CORS cho development

---

## 🐛 Troubleshooting

### Lỗi: "Cannot connect to backend"
```powershell
# Check backend đang chạy
curl http://localhost:8000/

# Nếu không, khởi động lại
cd backend
python nesting_api.py
```

### Lỗi: "Module not found"
```powershell
# Cài đặt lại dependencies
cd backend
pip install -r requirements.txt
```

### Modal không hiện
```tsx
// Check state
console.log('isOpen:', isNewNestListOpen);

// Check import
import { NewNestListModal } from './nesting';
```

---

## 📞 Support

Nếu gặp vấn đề, check:
1. ✅ Backend đang chạy?
2. ✅ Import đúng path?
3. ✅ State được set đúng?
4. ✅ .env file có đúng URL?

---

## 🎉 Hoàn Tất!

Bạn đã sẵn sàng sử dụng New Nest List Module!

**Next Steps:**
- Đọc `README.md` để hiểu chi tiết hơn
- Xem `INTEGRATION_EXAMPLES.tsx` để học cách tích hợp nâng cao
- Customize UI/settings theo nhu cầu dự án

**Happy Nesting! 🚀**
