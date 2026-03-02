import RBush from 'rbush';

export interface SpatialItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: string;
}

export class SpatialIndexService {
    private tree: RBush<SpatialItem>;

    constructor() {
        this.tree = new RBush();
    }

    clear() {
        this.tree.clear();
    }

    insert(item: SpatialItem) {
        this.tree.insert(item);
    }

    load(items: SpatialItem[]) {
        this.tree.load(items);
    }

    search(minX: number, minY: number, maxX: number, maxY: number): SpatialItem[] {
        return this.tree.search({ minX, minY, maxX, maxY });
    }

    getAll(): SpatialItem[] {
        return this.tree.all();
    }

    remove(item: SpatialItem) {
        this.tree.remove(item);
    }
}
