
import { Entity, Vector2 } from '../../types';

const CELL_SIZE = 150; 
// Use a Map with number keys (Bitwise Hash) instead of strings to avoid GC pressure
const grid: Map<number, number[]> = new Map(); 

export const clearGrid = () => grid.clear();

// Cantor Pairing function or Bitwise Shift could work. 
// Since coordinates can be negative, we offset them.
// Assuming map size < 65535 units in each direction for bitwise safety.
const HASH_OFFSET = 32768; 

const getHash = (x: number, y: number): number => {
    // Shift coordinates to positive range
    const bx = (x + HASH_OFFSET) | 0;
    const by = (y + HASH_OFFSET) | 0;
    // Pack two 16-bit integers into one 32-bit integer
    // Limit: Map coordinates must fit within +/- ~3000 cells (approx 450,000 units)
    return (bx & 0xFFFF) | ((by & 0xFFFF) << 16);
};

export const addToGrid = (e: Entity, index: number) => {
    let halfW = e.radius;
    let halfH = e.radius;

    if (e.width && e.height) {
        halfW = e.width / 2;
        halfH = e.height / 2;
    }

    const minX = Math.floor((e.position.x - halfW) / CELL_SIZE);
    const maxX = Math.floor((e.position.x + halfW) / CELL_SIZE);
    const minY = Math.floor((e.position.y - halfH) / CELL_SIZE);
    const maxY = Math.floor((e.position.y + halfH) / CELL_SIZE);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const hash = getHash(x, y);
            let cell = grid.get(hash);
            if (!cell) {
                cell = [];
                grid.set(hash, cell);
            }
            cell.push(index);
        }
    }
};

export const getNearbyIndices = (e: Entity, prevPos?: Vector2): number[] => {
    const rad = e.radius;
    const x1 = prevPos ? Math.min(e.position.x, prevPos.x) : e.position.x;
    const x2 = prevPos ? Math.max(e.position.x, prevPos.x) : e.position.x;
    const y1 = prevPos ? Math.min(e.position.y, prevPos.y) : e.position.y;
    const y2 = prevPos ? Math.max(e.position.y, prevPos.y) : e.position.y;

    const minX = Math.floor((x1 - rad) / CELL_SIZE);
    const maxX = Math.floor((x2 + rad) / CELL_SIZE);
    const minY = Math.floor((y1 - rad) / CELL_SIZE);
    const maxY = Math.floor((y2 + rad) / CELL_SIZE);
    
    // Using a Set is good for uniqueness, but for extreme performance, 
    // iterating and checking simple duplication might be faster in some JS engines.
    // However, for this scale, Set is clean and effective enough.
    const indices = new Set<number>();
    
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const hash = getHash(x, y);
            const cell = grid.get(hash);
            if (cell) {
                const len = cell.length;
                for (let i = 0; i < len; i++) {
                    indices.add(cell[i]);
                }
            }
        }
    }
    return Array.from(indices);
};
