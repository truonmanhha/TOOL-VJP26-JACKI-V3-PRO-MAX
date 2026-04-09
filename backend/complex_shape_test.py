from nesting_api import ProfessionalNester, Part, Sheet, Point, NestingSettings
import sys

def test_complex_shape():
    nester = ProfessionalNester()
    
    # Define an L-shaped part
    # (0,0) -> (100,0) -> (100,50) -> (50,50) -> (50,100) -> (0,100) -> (0,0)
    l_shape = [
        Point(x=0,y=0), Point(x=100,y=0), Point(x=100,y=50), 
        Point(x=50,y=50), Point(x=50,y=100), Point(x=0,y=100)
    ]
    
    p1 = Part(
        id='p1', 
        name='L-Shape', 
        polygon=l_shape, 
        quantity=4,
        rotation_allowed=True
    )
    
    sheet = Sheet(
        id='s1', 
        name='sheet', 
        polygon=[Point(x=0,y=0),Point(x=500,y=0),Point(x=500,y=500),Point(x=0,y=500)], 
        thickness=1.5
    )
    
    settings = NestingSettings(algorithm='vero', spacing=5.0, margin=10.0, allow_rotation=True)
    
    print(f"Testing True-Shape Nesting with L-Shapes...")
    result = nester.nest([p1], sheet, settings)
    
    placements = result['placements']
    print(f"Total placements: {len(placements)}")
    print(f"Efficiency: {result['efficiency']}%")
    
    if result['validation']['valid']:
        print("SUCCESS: Validation passed (no overlaps).")
    else:
        print("FAILURE: Validation failed!")
        for overlap in result['validation'].get('overlaps', []):
            print(f"  - Overlap: {overlap['part1Id']} <-> {overlap['part2Id']}")

if __name__ == "__main__":
    test_complex_shape()
