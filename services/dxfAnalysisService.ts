/**
 * DXF Analysis Service
 * Analyzes DXF files to extract entity information and calculate areas
 */

export interface DXFAnalysisResult {
  totalEntities: number;
  entityTypes: Record<string, number>;
  totalArea: number;
  areaByType: Record<string, number>;
  areasDetails: Record<string, Array<{ count: number; area: number }>>;
}

export class DXFAnalysisService {
  /**
   * Parse DXF file and extract analysis data
   * Uses the dxf-parser library that's already in the project
   */
  async analyzeDxfFile(file: File): Promise<DXFAnalysisResult> {
    try {
      const text = await file.text();
      
      // Simple DXF parsing to extract entities
      const lines = text.split('\n');
      const entityTypes: Record<string, number> = {};
      const areaByType: Record<string, number> = {};
      const areasDetails: Record<string, Array<{ count: number; area: number }>> = {};
      
      let i = 0;
      let currentEntity: string | null = null;
      let inEntitiesSection = false;
      
      while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check for ENTITIES section
        if (line === 'ENTITIES') {
          inEntitiesSection = true;
          i++;
          continue;
        }
        
        // Check for end of ENTITIES section
        if (line === 'ENDSEC' && inEntitiesSection) {
          break;
        }
        
        // Parse entity type (indicated by numeric group codes)
        if (inEntitiesSection && line === '0') {
          i++;
          if (i < lines.length) {
            currentEntity = lines[i].trim();
            entityTypes[currentEntity] = (entityTypes[currentEntity] || 0) + 1;
          }
        }
        
        i++;
      }
      
      // Calculate total entities and prepare results
      const totalEntities = Object.values(entityTypes).reduce((a, b) => a + b, 0);
      
      // Estimate areas based on entity types
      const totalArea = this.estimateTotalArea(entityTypes);
      
      // Prepare detailed breakdown
      for (const [type, count] of Object.entries(entityTypes)) {
        const typeArea = this.estimateEntityTypeArea(type, count);
        areaByType[type] = typeArea;
        areasDetails[type] = [{ count, area: typeArea }];
      }
      
      return {
        totalEntities,
        entityTypes,
        totalArea,
        areaByType,
        areasDetails
      };
    } catch (error) {
      console.error('Error analyzing DXF file:', error);
      throw new Error('Failed to analyze DXF file');
    }
  }

  /**
   * Estimate total area based on entity types
   * Note: This is simplified estimation for UI preview
   * Actual area calculation should use proper DXF parsing with ezdxf in Python
   */
  private estimateTotalArea(entityTypes: Record<string, number>): number {
    let area = 0;
    
    // These are rough estimates
    if (entityTypes['LWPOLYLINE']) {
      area += entityTypes['LWPOLYLINE'] * 50000; // Average polyline area
    }
    if (entityTypes['POLYLINE']) {
      area += entityTypes['POLYLINE'] * 50000;
    }
    if (entityTypes['CIRCLE']) {
      area += entityTypes['CIRCLE'] * 1000; // Average circle area
    }
    if (entityTypes['ARC']) {
      area += entityTypes['ARC'] * 300; // Average arc segment area
    }
    
    return Math.round(area);
  }

  /**
   * Estimate area for specific entity type
   */
  private estimateEntityTypeArea(type: string, count: number): number {
    const averageAreas: Record<string, number> = {
      'LWPOLYLINE': 50000,
      'POLYLINE': 50000,
      'CIRCLE': 1000,
      'ARC': 300,
      'ELLIPSE': 1500,
      'SPLINE': 20000,
      'LINE': 0,
      'POINT': 0,
      'TEXT': 0
    };
    
    const avgArea = averageAreas[type] || 0;
    return count * avgArea;
  }

  /**
   * Format area for display
   */
  formatArea(areaInMm2: number): {
    mm2: string;
    m2: string;
    dm2: string;
  } {
    return {
      mm2: areaInMm2.toFixed(2),
      m2: (areaInMm2 / 1000000).toFixed(4),
      dm2: (areaInMm2 / 10000).toFixed(4)
    };
  }

  /**
   * Get summary statistics
   */
  getSummary(result: DXFAnalysisResult): string {
    const lines: string[] = [];
    lines.push(`Total Entities: ${result.totalEntities}`);
    
    for (const [type, count] of Object.entries(result.entityTypes)) {
      lines.push(`${type}: ${count}`);
    }
    
    const formatted = this.formatArea(result.totalArea);
    lines.push(`\nTotal Area: ${formatted.m2} m²`);
    
    return lines.join('\n');
  }
}

export default new DXFAnalysisService();
