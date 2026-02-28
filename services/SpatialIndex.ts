
/**
 * QUAD TREE SPATIAL INDEXING
 * Hệ thống mục lục không gian để xử lý Hit-testing hàng vạn đối tượng trong O(log N)
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialEntry {
  id: string;
  bounds: BoundingBox;
}

export class QuadTree {
  private entries: SpatialEntry[] = [];
  private nodes: QuadTree[] = [];
  private readonly MAX_ENTRIES = 10;
  private readonly MAX_LEVELS = 5;

  constructor(
    private level: number,
    private bounds: BoundingBox
  ) {}

  public clear() {
    this.entries = [];
    this.nodes = [];
  }

  private split() {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const { x, y } = this.bounds;

    this.nodes[0] = new QuadTree(this.level + 1, { x: x + subWidth, y, width: subWidth, height: subHeight });
    this.nodes[1] = new QuadTree(this.level + 1, { x, y, width: subWidth, height: subHeight });
    this.nodes[2] = new QuadTree(this.level + 1, { x, y: y + subHeight, width: subWidth, height: subHeight });
    this.nodes[3] = new QuadTree(this.level + 1, { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight });
  }

  private getIndex(pRect: BoundingBox): number {
    let index = -1;
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    const topQuadrant = pRect.y < horizontalMidpoint && pRect.y + pRect.height < horizontalMidpoint;
    const bottomQuadrant = pRect.y > horizontalMidpoint;

    if (pRect.x < verticalMidpoint && pRect.x + pRect.width < verticalMidpoint) {
      if (topQuadrant) index = 1;
      else if (bottomQuadrant) index = 2;
    } else if (pRect.x > verticalMidpoint) {
      if (topQuadrant) index = 0;
      else if (bottomQuadrant) index = 3;
    }

    return index;
  }

  public insert(entry: SpatialEntry) {
    if (this.nodes.length > 0) {
      const index = this.getIndex(entry.bounds);
      if (index !== -1) {
        this.nodes[index].insert(entry);
        return;
      }
    }

    this.entries.push(entry);

    if (this.entries.length > this.MAX_ENTRIES && this.level < this.MAX_LEVELS) {
      if (this.nodes.length === 0) this.split();

      let i = 0;
      while (i < this.entries.length) {
        const index = this.getIndex(this.entries[i].bounds);
        if (index !== -1) {
          this.nodes[index].insert(this.entries.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  public retrieve(pRect: BoundingBox): SpatialEntry[] {
    const index = this.getIndex(pRect);
    let returnEntries = this.entries;

    if (this.nodes.length > 0) {
      if (index !== -1) {
        returnEntries = returnEntries.concat(this.nodes[index].retrieve(pRect));
      } else {
        // Nếu đối tượng nằm giữa ranh giới, kiểm tra tất cả các node con
        for (let i = 0; i < this.nodes.length; i++) {
          returnEntries = returnEntries.concat(this.nodes[i].retrieve(pRect));
        }
      }
    }

    return returnEntries;
  }
}
