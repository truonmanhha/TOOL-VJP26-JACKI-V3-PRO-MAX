import ezdxf
import json
import os

def analyze_cad(file_path):
    # If DWG, we might need a converter, but let's try to find a DXF first
    # or assume we can convert it. For now, let's look for DXF in the directory.
    dxf_file = "12lyaa.dxf" # Looking at your directory listing
    
    if not os.path.exists(dxf_file):
        print(f"Error: {dxf_file} not found for analysis.")
        return

    try:
        doc = ezdxf.readfile(dxf_file)
        msp = doc.modelspace()
        
        print(f"--- HARDCORE LOCAL ANALYSIS: {dxf_file} ---")
        
        # 1. Units
        units = doc.header.get('$INSUNITS', 0)
        unit_map = {0: 'None', 1: 'Inches', 4: 'Millimeters', 6: 'Meters'}
        print(f"Units ($INSUNITS): {units} ({unit_map.get(units, 'Unknown')})")
        
        # 2. Text Analysis
        texts = msp.query('TEXT MTEXT')
        print(f"Total Text Entities: {len(texts)}")
        if texts:
            sample = texts[0]
            print(f"Sample Text: '{sample.dxf.text}'")
            print(f"Sample Height: {sample.dxf.height}")
            print(f"Sample Layer: {sample.dxf.layer}")
            
            # Find Min/Max heights
            heights = [t.dxf.height for t in texts]
            print(f"Min Height: {min(heights)}")
            print(f"Max Height: {max(heights)}")

        # 3. Dimension Analysis
        dims = msp.query('DIMENSION')
        print(f"Total Dimension Entities: {len(dims)}")
        if dims:
            for i, dim in enumerate(dims[:3]):
                print(f"DIM #{i}: Block='{dim.dxf.get('block', 'None')}', Text='{dim.get_measurement()}'")

        # 4. Layer Colors
        print("\n--- Layer Table ---")
        for layer in doc.layers:
            print(f"Layer: {layer.dxf.name}, Color (ACI): {layer.dxf.color}")

    except Exception as e:
        print(f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    analyze_cad("MATBANG.dwg")
