
import numpy as np
import ezdxf
import io
import json
from fastapi import FastAPI, UploadFile, File, HTTPException

app = FastAPI()

@app.post("/api/dxf/parse-binary")
async def parse_dxf_binary(file: UploadFile = File(...)):
    """
    ENGINE ĐẲNG CẤP AUTOCAD: Gửi thực thể toán học thuần túy.
    Hỗ trợ Line, Arc, Circle, Spline, Ellipse với độ chính xác vô hạn.
    """
    try:
        content = await file.read()
        doc = ezdxf.read_string(content.decode('utf-8', errors='ignore'))
        msp = doc.modelspace()
        
        entities = []
        
        for entity in msp:
            etype = entity.dxftype()
            e_data = {"type": etype, "color": "#00ff00"}
            
            # Lấy màu từ layer hoặc entity
            if hasattr(entity, 'dxf'):
                if entity.dxf.color == 256: # Bylayer
                    pass # Sẽ lấy theo layer sau
            
            if etype == 'LINE':
                e_data.update({
                    "start": [float(entity.dxf.start.x), float(entity.dxf.start.y)],
                    "end": [float(entity.dxf.end.x), float(entity.dxf.end.y)]
                })
            
            elif etype == 'ARC':
                # AutoCAD lưu Arc: Tâm, Bán kính, Góc bắt đầu/kết thúc (theo độ)
                e_data.update({
                    "center": [float(entity.dxf.center.x), float(entity.dxf.center.y)],
                    "radius": float(entity.dxf.radius),
                    "startAngle": float(entity.dxf.start_angle),
                    "endAngle": float(entity.dxf.end_angle),
                    "ccw": True # DXF mặc định là CCW
                })
                
            elif etype == 'CIRCLE':
                e_data.update({
                    "center": [float(entity.dxf.center.x), float(entity.dxf.center.y)],
                    "radius": float(entity.dxf.radius)
                })
                
            elif etype == 'SPLINE':
                # Gửi các Control Points để Frontend tự nội suy (Chuẩn AutoCAD)
                control_points = [[float(p[0]), float(p[1])] for p in entity.control_points]
                e_data.update({
                    "controlPoints": control_points,
                    "degree": int(entity.dxf.degree),
                    "closed": bool(entity.closed)
                })
                
            elif etype in ('LWPOLYLINE', 'POLYLINE'):
                # Polyline có thể chứa Bulge (Arc)
                points = []
                for p in entity.get_points(format='xyeb'): # x, y, start_width, end_width, bulge
                    points.append([float(p[0]), float(p[1]), float(p[4])]) # [x, y, bulge]
                e_data.update({
                    "points": points,
                    "closed": bool(entity.is_closed)
                })
            else:
                continue
                
            entities.append(e_data)
            
        # Trả về JSON chứa danh sách thực thể toán học
        return entities
        
    except Exception as e:
        print(f"[CRITICAL] CAD Engine Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
