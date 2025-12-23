
import { Vector2, Entity, EntityType } from '../../types';
import { GameContext } from '../GameContext';

export const getAABBIntersectionT = (p1: Vector2, p2: Vector2, wall: Entity, bulletRadius: number): number | null => {
    const wx = wall.position.x;
    const wy = wall.position.y;
    // @ts-ignore
    const wh = (wall.width || wall.radius * 2) / 2 + bulletRadius; 
    // @ts-ignore
    const hh = (wall.height || wall.radius * 2) / 2 + bulletRadius;

    const minX = wx - wh; const maxX = wx + wh;
    const minY = wy - hh; const maxY = wy + hh;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    let t0 = 0.0;
    let t1 = 1.0;

    const p = [-dx, dx, -dy, dy];
    const q = [p1.x - minX, maxX - p1.x, p1.y - minY, maxY - p1.y];

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return null; 
        } else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                if (t > t1) return null;
                if (t > t0) t0 = t;
            } else {
                if (t < t0) return null;
                if (t < t1) t1 = t;
            }
        }
    }

    return t0 <= t1 ? t0 : null;
};

export const getCircleIntersectionT = (p1: Vector2, p2: Vector2, circle: Entity, bulletRadius: number): number | null => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - circle.position.x;
    const fy = p1.y - circle.position.y;
    const r = circle.radius + bulletRadius; 

    const a = dx*dx + dy*dy;
    if (a === 0) return null;
    const b = 2 * (fx*dx + fy*dy);
    const c = (fx*fx + fy*fy) - r*r;

    let discriminant = b*b - 4*a*c;
    if (discriminant < 0) return null;

    discriminant = Math.sqrt(discriminant);
    const t = (-b - discriminant) / (2*a);

    if (t >= 0 && t <= 1) return t;
    return null;
};

// --- COLLISION HELPER FOR SPAWNING ---
export const isPositionSafe = (ctx: GameContext, x: number, y: number, radius: number): boolean => {
    // 1. Map Bounds Check (Keep slightly away from absolute edge)
    const mapSize = ctx.gameState.current.mapSize;
    const halfMap = mapSize / 2;
    const padding = 50; 
    
    if (x < -halfMap + radius + padding || x > halfMap - radius - padding || 
        y < -halfMap + radius + padding || y > halfMap - radius - padding) {
        return false;
    }

    // 2. Entity Collision Check
    for (const e of ctx.entities.current) {
        if (e.type === EntityType.WALL) {
            // Precise AABB vs Circle check for rectangular walls
            const w = e.width || e.radius * 2;
            const h = e.height || e.radius * 2;
            
            const wallLeft = e.position.x - w / 2;
            const wallRight = e.position.x + w / 2;
            const wallTop = e.position.y - h / 2;
            const wallBottom = e.position.y + h / 2;

            // Find closest point on rectangle to circle center
            const clampX = Math.max(wallLeft, Math.min(x, wallRight));
            const clampY = Math.max(wallTop, Math.min(y, wallBottom));

            const dx = x - clampX;
            const dy = y - clampY;
            const distSq = dx * dx + dy * dy;

            // Safe Buffer: Ensure we don't spawn exactly touching the wall
            const buffer = 20; 
            const minSafeDist = radius + buffer;

            if (distSq < minSafeDist * minSafeDist) return false;

        } else if (e.type === EntityType.ZONE || e.type === EntityType.PARTICLE) {
            // Zones (Bases) and Particles are non-solid for spawning purposes
            continue;
        } else {
            // Avoid spawning directly on top of other solid entities (Bosses, Players, big clusters)
            const otherR = e.radius || 20;
            const dist = otherR + radius + 10;
            const dSq = (x - e.position.x)**2 + (y - e.position.y)**2;
            if (dSq < dist * dist) {
                return false;
            }
        }
    }
    return true;
};
