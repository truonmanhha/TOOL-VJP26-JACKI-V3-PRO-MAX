import numpy as np
import ezdxf
from ezdxf import flatten
import io
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/api/dxf/parse-binary")
async def parse_dxf_clean(file: UploadFile = File(...)):
    """
    ENGINE PARSER SẠCH: Trích xuất chính xác dải điểm Arc/Spline.
    Loại bỏ lỗi biến Arc thành hình tròn.
    """
    try:
        content = await file.read()
        doc = ezdxf.read_string(content.decode('utf-8', errors='ignore'))
        msp = doc.modelspace()
        
        entities_data = []
        
        for entity in msp:
            etype = entity.dxftype()
            if etype not in ('LINE', 'LWPOLYLINE', 'POLYLINE', 'ARC', 'CIRCLE', 'SPLINE', 'ELLIPSE'):
                continue

            try:
                # 🚀 SỬ DỤNG THUẬT TOÁN FLATTEN TRỰC TIẾP (Chính xác hơn cho Arc)
                # distance=0.01mm đảm bảo mượt mà nhưng không quá nặng
                points = list(flatten(entity, distance=0.01))
                
                if len(points) < 2: continue
                
                # Chỉ lấy danh sách điểm đơn (X, Y, Z), không nhân đôi như lineSegments
                coords = []
                for p in points:
                    coords.extend([float(p.x), float(p.y), 0.0])
                
                # Xác định thực thể có cần đóng vòng tròn không
                is_closed = False
                if etype in ('CIRCLE', 'ELLIPSE'):
                    is_closed = True
                elif etype in ('LWPOLYLINE', 'POLYLINE'):
                    is_closed = entity.is_closed
                # Tuyệt đối không đóng vòng cho ARC
                
                # Chuyển sang Base64
                binary_data = np.array(coords, dtype=np.float32).tobytes()
                b64_data = base64.b64encode(binary_data).decode('utf-8')
                
                entities_data.append({
                    "id": str(entity.dxf.handle),
                    "type": etype,
                    "color": "#00ff00",
                    "geometry_b64": b64_data,
                    "is_closed": is_closed
                })
            except Exception as e:
                continue
                
        return {"entities": entities_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
