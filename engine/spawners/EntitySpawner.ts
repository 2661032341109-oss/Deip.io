
import { EntityType, Vector2 } from '../../types';
import { GameContext } from '../GameContext';
import { COLORS } from '../../constants';
import { isPositionSafe } from '../physics/Collision';
import { recycleEntity } from './Pools';

const GLOBAL_ENTITY_CAP = 200; 

export const spawnBoss = (ctx: GameContext, x: number, y: number) => {
    ctx.entities.current.push(recycleEntity(ctx, {
        id: Math.random().toString(),
        type: EntityType.ENEMY,
        position: { x, y },
        velocity: { x: 0, y: 0 },
        radius: 80,
        baseRadius: 80, 
        rotation: 0,
        health: 15000,
        maxHealth: 15000,
        color: '#ff0033',
        depth: 25,
        teamId: 2,
        name: 'GUARDIAN',
        weaponId: 'destroyer',
        expValue: 25000,
        aiState: { state: 'IDLE', acqRange: 1200 },
        level: 100 
    }));
};

export const spawnShape = (ctx: GameContext) => {
    if (ctx.entities.current.length >= GLOBAL_ENTITY_CAP) return;

    const rand = Math.random();
    let type = EntityType.FOOD_SQUARE;
    let radius = 18;
    let health = 10;
    let exp = 10;
    let color = COLORS.food.square;
    
    if (ctx.gameState.current.gameMode === 'Mega') {
        if (rand < 0.02) { type = EntityType.FOOD_ICOSAHEDRON; radius = 60; health = 15000; exp = 25000; color = COLORS.food.icosahedron; }
        else if (rand < 0.05) { type = EntityType.FOOD_TESSERACT; radius = 50; health = 7500; exp = 10000; color = COLORS.food.tesseract; }
        else if (rand < 0.15) { type = EntityType.FOOD_OCTAGON; radius = 45; health = 3000; exp = 5000; color = COLORS.food.octagon; }
        else if (rand < 0.3) { type = EntityType.FOOD_ALPHA_PENTAGON; radius = 55; health = 3000; exp = 3000; color = COLORS.food.alpha; }
        else { type = EntityType.FOOD_PENTAGON; radius = 35; health = 1000; exp = 1000; color = COLORS.food.pentagon; }
    } else {
        if (rand < 0.005) { type = EntityType.FOOD_GEM; radius = 15; health = 2000; exp = 2000; color = COLORS.food.gem; } 
        else if (rand < 0.02) { type = EntityType.FOOD_ALPHA_PENTAGON; radius = 55; health = 3000; exp = 3000; color = COLORS.food.alpha; }
        else if (rand < 0.1) { type = EntityType.FOOD_PENTAGON; radius = 35; health = 400; exp = 400; color = COLORS.food.pentagon; }
        else if (rand < 0.3) { type = EntityType.FOOD_TRIANGLE; radius = 22; health = 30; exp = 25; color = COLORS.food.triangle; }
        else { type = EntityType.FOOD_SQUARE; radius = 18; health = 10; exp = 10; color = COLORS.food.square; }
    }

    const mapSize = ctx.gameState.current.mapSize;
    let x = 0, y = 0;
    let safe = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!safe && attempts < maxAttempts) {
        x = (Math.random() - 0.5) * (mapSize * 0.9);
        y = (Math.random() - 0.5) * (mapSize * 0.9);
        
        if (isPositionSafe(ctx, x, y, radius)) {
            safe = true;
        }
        attempts++;
    }

    if (!safe && attempts >= maxAttempts) return;

    ctx.entities.current.push(recycleEntity(ctx, {
        id: `food-${Math.random()}`,
        type,
        position: { x, y },
        velocity: { x: (Math.random()-0.5)*0.5, y: (Math.random()-0.5)*0.5 },
        radius,
        baseRadius: radius,
        rotation: Math.random() * Math.PI * 2,
        health,
        maxHealth: health,
        color,
        depth: 1,
        expValue: exp,
        teamId: 0
    }));
};

export const spawnLoot = (ctx: GameContext, pos: Vector2, score: number) => {
    let remaining = Math.floor(score * 0.5); 
    if (remaining <= 0) return;

    const count = Math.min(20, Math.ceil(remaining / 100) + 3);
    
    for(let i=0; i<count; i++) {
        if (remaining <= 0) break;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 60;
        const vel = 2 + Math.random() * 4;
        
        let val = Math.ceil(remaining / (count - i));
        remaining -= val;
        
        let type = EntityType.FOOD_SQUARE;
        let radius = 12;
        let color = COLORS.food.square;
        
        if (val >= 1000) { type = EntityType.FOOD_PENTAGON; radius = 25; color = COLORS.food.pentagon; }
        else if (val >= 100) { type = EntityType.FOOD_TRIANGLE; radius = 18; color = COLORS.food.triangle; }
        
        ctx.entities.current.push(recycleEntity(ctx, {
            id: `loot-${Math.random()}`,
            type,
            position: { x: pos.x + Math.cos(angle)*dist, y: pos.y + Math.sin(angle)*dist },
            velocity: { x: Math.cos(angle)*vel, y: Math.sin(angle)*vel },
            radius,
            baseRadius: radius,
            rotation: Math.random() * Math.PI * 2,
            health: val, 
            maxHealth: val,
            color,
            depth: 2,
            expValue: val,
            teamId: 0
        }));
    }
};
