from nesting_api import ProfessionalNester, Part, Sheet, Polygon, Point, NestingSettings
import sys

def test_common_line():
    nester = ProfessionalNester()
    
    # Define two identical rectangles
    p1 = Part(
        id='p1', 
        name='rect1', 
        polygon=[Point(x=0,y=0),Point(x=100,y=0),Point(x=100,y=50),Point(x=0,y=50)], 
        quantity=2
    )
    
    sheet = Sheet(
        id='s1', 
        name='sheet', 
        polygon=[Point(x=0,y=0),Point(x=500,y=0),Point(x=500,y=500),Point(x=0,y=500)], 
        thickness=1.5
    )
    
    settings = NestingSettings(algorithm='vero', spacing=10.0, margin=10.0)
    
    print(f"Testing Common Line Optimization...")
    result = nester.nest([p1], sheet, settings)
    
    placements = result['placements']
    print(f"Total placements: {len(placements)}")
    
    if len(placements) >= 2:
        p1_x = placements[0].x
        p1_y = placements[0].y
        p2_x = placements[1].x
        p2_y = placements[1].y
        
        # Check if they are snapped (gap should be 0, not spacing=10)
        # Assuming nester places them side-by-side: p2.x = p1.x + 100 + gap
        dist_x = abs(p2_x - p1_x)
        dist_y = abs(p2_y - p1_y)
        
        print(f"Distance X: {dist_x}, Distance Y: {dist_y}")
        
        if dist_x == 100.0 or dist_y == 50.0:
            print("SUCCESS: Parts are SNAPPED with 0 gap (Common Line)!")
        elif dist_x == 110.0 or dist_y == 60.0:
            print("FAILURE: Parts have default spacing gap (10.0). Optimization failed.")
        else:
            print(f"NOTE: Parts are at custom positions. dist_x={dist_x}, dist_y={dist_y}")
    
    if result['validation']['valid']:
        print("SUCCESS: Validation passed (no overlaps).")
    else:
        print("FAILURE: Validation failed!")

if __name__ == "__main__":
    test_common_line()
