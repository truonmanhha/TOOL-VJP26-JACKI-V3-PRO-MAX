
import numpy as np
import time
import sys
import os

# Giả lập backend nesting_api để test
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from nesting_api import point_in_polygon_vectorized, polygons_collide, Point, HAS_GPU
    import nesting_api
except ImportError:
    print("Không tìm thấy nesting_api.py")
    sys.exit(1)

def benchmark_geometry():
    print("="*50)
    print("BÀI TEST HIỆU NĂNG HÌNH HỌC (CUDA/VECTORIZED)")
    print(f"Trạng thái GPU (CUDA): {'SẴN SÀNG' if HAS_GPU else 'KHÔNG TÌM THẤY (Sử dụng CPU Vectorized)'}")
    print("="*50)

    # 1. Tạo 1 đa giác phức tạp (ví dụ 500 đỉnh)
    num_vertices = 500
    angles = np.linspace(0, 2*np.pi, num_vertices)
    poly = np.column_stack([np.cos(angles) * 100, np.sin(angles) * 100])
    
    # 2. Tạo 10,000 điểm ngẫu nhiên để kiểm tra xem có nằm trong đa giác không
    num_points = 10000
    points = np.random.uniform(-150, 150, (num_points, 2))

    print(f"Đang kiểm tra {num_points} điểm với đa giác {num_vertices} đỉnh...")
    
    # Cách cũ (Giả lập bằng vòng lặp Python)
    def point_in_polygon_old(point, polygon):
        x, y = point
        n = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y) and y <= max(p1y, p2y) and x <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                else:
                    xinters = p1x
                if p1x == p2x or x <= xinters:
                    inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    start_time = time.time()
    # Chỉ test 100 điểm với cách cũ vì nó quá chậm
    for i in range(100):
        point_in_polygon_old(points[i], poly)
    old_time_avg = (time.time() - start_time) / 100
    print(f"[-] Cách cũ (Vòng lặp): {old_time_avg*1000:.4f} ms / điểm")

    # Cách mới (Vectorized / GPU)
    # Chuyển sang array của CuPy nếu có GPU
    if HAS_GPU:
        import cupy as cp
        poly_gpu = cp.array(poly)
        points_gpu = cp.array(points)
        
        # Warm up
        point_in_polygon_vectorized(points_gpu, poly_gpu)
        
        start_time = time.time()
        results = point_in_polygon_vectorized(points_gpu, poly_gpu)
        new_time = time.time() - start_time
    else:
        # CPU Vectorized
        start_time = time.time()
        results = point_in_polygon_vectorized(points, poly)
        new_time = time.time() - start_time

    print(f"[+] Cách mới (Vectorized): {new_time*1000/num_points:.4f} ms / điểm")
    print(f"==> Tốc độ nhanh hơn khoảng: {int(old_time_avg / (new_time/num_points))} LẦN!")
    print("="*50)

if __name__ == "__main__":
    benchmark_geometry()
