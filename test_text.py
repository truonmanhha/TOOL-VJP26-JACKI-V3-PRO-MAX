import ezdxf

# Create a new DXF document.
doc = ezdxf.new('R2010')
msp = doc.modelspace()

# Add a line
msp.add_line((0, 0), (100, 0))
msp.add_line((100, 0), (100, 50))
msp.add_line((100, 50), (0, 50))
msp.add_line((0, 50), (0, 0))

# Add a simple TEXT entity (height=5, standard for this scale)
msp.add_text("HELLO WORLD (H=5)", dxfattribs={'height': 5}).set_pos((10, 10), align='LEFT')

# Add MTEXT entity
mtext = msp.add_mtext("This is MTEXT\nWith multiple lines", dxfattribs={'char_height': 7})
mtext.set_location(insert=(10, 30))

# Add another line to verify scale visually
msp.add_line((10, 8), (50, 8)) 

# Save the document.
doc.saveas('test_text_scale.dxf')
print("DXF created successfully")
