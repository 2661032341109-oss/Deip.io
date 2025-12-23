
import { Entity, Vector2 } from '../../types';

const CELL_SIZE = 150; 
const grid: Map<string, number[]> = new Map(); 

export const clearGrid = () => grid.clear();

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
            const key = `${x},${y}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key)!.push(index);
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
    
    const indices = new Set<number>();
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const cell = grid.get(`${x},${y}`);
            if (cell) {
                for (let i = 0; i < cell.length; i++) indices.add(cell[i]);
            }
        }
    }
    return Array.from(indices);
};
