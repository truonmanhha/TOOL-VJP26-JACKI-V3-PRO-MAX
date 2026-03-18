const { LibreDwg } = require('@mlightcad/libredwg-web');
const fs = require('fs');

async function analyzeDwg() {
  try {
    const libredwg = await LibreDwg.create();
    const data = fs.readFileSync('MATBANG.dwg');
    const dwgPtr = libredwg.dwg_read_data(new Uint8Array(data), 0);
    
    if (!dwgPtr) {
      console.error('Failed to read DWG data');
      return;
    }

    const db = libredwg.convert(dwgPtr);
    
    console.log('--- DWG ANALYSIS: MATBANG.dwg ---');
    console.log('Total Entities:', db.entities?.length || 0);
    
    const dimEntities = (db.entities || []).filter(e => e.type === 'DIMENSION');
    const textEntities = (db.entities || []).filter(e => e.type === 'TEXT' || e.type === 'MTEXT');

    console.log(`\n--- DIMENSION Entities (${dimEntities.length}) ---`);
    if (dimEntities.length > 0) {
      console.log('Sample DIM properties (first 2):');
      dimEntities.slice(0, 2).forEach((e, i) => {
        console.log(`DIM #${i}:`, JSON.stringify(e, (key, value) => 
          typeof value === 'object' && value !== null && key === 'parent' ? '[Circular]' : value, 2));
      });
    }

    console.log(`\n--- TEXT/MTEXT Entities (${textEntities.length}) ---`);
    if (textEntities.length > 0) {
      console.log('Sample TEXT properties (first 2):');
      textEntities.slice(0, 2).forEach((e, i) => {
        console.log(`TEXT #${i}:`, JSON.stringify(e, (key, value) => 
          typeof value === 'object' && value !== null && key === 'parent' ? '[Circular]' : value, 2));
      });
    }

    // Check layer table
    if (db.layers) {
      console.log(`\n--- LAYERS (${Object.keys(db.layers).length}) ---`);
      Object.entries(db.layers).slice(0, 5).forEach(([name, data]) => {
        console.log(`Layer "${name}":`, JSON.stringify(data, null, 2));
      });
    }

    libredwg.dwg_free(dwgPtr);
  } catch (err) {
    console.error('Analysis failed:', err);
  }
}

analyzeDwg();
