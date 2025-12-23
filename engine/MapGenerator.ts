
import { GameContext } from './GameContext';
import { EntityType } from '../types';
import { MAP_CONFIGS } from '../constants';
import { recycleEntity } from './Spawner';

// Helper to create walls
const addWall = (ctx: GameContext, x: number, y: number, w: number, h: number, color: string) => {
    ctx.entities.current.push(recycleEntity(ctx, {
        id: `wall-${Math.random()}`,
        type: EntityType.WALL,
        position: { x, y },
        velocity: { x: 0, y: 0 },
        radius: Math.min(w, h) / 2, // Used for grid partitioning
        baseRadius: Math.min(w, h) / 2,
        rotation: 0,
        health: 99999, maxHealth: 99999,
        color: color,
        depth: 40,
        isSolid: true,
        width: w,
        height: h
    }));
};

export const createMap = (ctx: GameContext, mode: string) => {
    const config = MAP_CONFIGS[mode] || MAP_CONFIGS['FFA'];
    ctx.gameState.current.mapSize = config.size;
    const size = config.size;
    const thickness = 500; 
    const wallColor = config.wallColor;

    // Reset Entities that are map-specific (Walls, Zones, Dummies)
    // We filter carefully to not remove Players during a map regen if that ever happens
    // But typically map gen happens at start.
    
    if (mode === '2-Teams') {
        ctx.entities.current.push(recycleEntity(ctx, {
            id: 'zone-blue', type: EntityType.ZONE,
            position: { x: -size/4, y: 0 }, velocity: { x: 0, y: 0 }, radius: 0, rotation: 0,
            health: 999999, maxHealth: 999999, color: 'rgba(0, 100, 255, 0.08)', depth: -10,
            width: size/2, height: size
        }));
        ctx.entities.current.push(recycleEntity(ctx, {
            id: 'zone-red', type: EntityType.ZONE,
            position: { x: size/4, y: 0 }, velocity: { x: 0, y: 0 }, radius: 0, rotation: 0,
            health: 999999, maxHealth: 999999, color: 'rgba(255, 0, 85, 0.08)', depth: -10,
            width: size/2, height: size
        }));
    }

    const leftColor = mode === '2-Teams' ? '#0044aa' : wallColor; 
    const rightColor = mode === '2-Teams' ? '#aa0044' : wallColor; 
    
    addWall(ctx, 0, -size/2 - thickness/2, size + thickness*2, thickness, wallColor);
    addWall(ctx, 0, size/2 + thickness/2, size + thickness*2, thickness, wallColor);
    addWall(ctx, -size/2 - thickness/2, 0, thickness, size, leftColor);
    addWall(ctx, size/2 + thickness/2, 0, thickness, size, rightColor);

    if (mode === '2-Teams') {
        const bunkerOffset = 1800; const bunkerSize = 400; const bunkerThick = 80; const blueWall = '#4a4a55'; 
        addWall(ctx, -bunkerOffset, -500, bunkerThick, bunkerSize, blueWall);
        addWall(ctx, -bunkerOffset + bunkerSize/2, -500 - bunkerSize/2, bunkerSize, bunkerThick, blueWall);
        addWall(ctx, -bunkerOffset, 500, bunkerThick, bunkerSize, blueWall);
        addWall(ctx, -bunkerOffset + bunkerSize/2, 500 + bunkerSize/2, bunkerSize, bunkerThick, blueWall);
        addWall(ctx, bunkerOffset, -500, bunkerThick, bunkerSize, blueWall);
        addWall(ctx, bunkerOffset - bunkerSize/2, -500 - bunkerSize/2, bunkerSize, bunkerThick, blueWall);
        addWall(ctx, bunkerOffset, 500, bunkerThick, bunkerSize, blueWall);
        addWall(ctx, bunkerOffset - bunkerSize/2, 500 + bunkerSize/2, bunkerSize, bunkerThick, blueWall);
        addWall(ctx, 0, -800, 150, 400, blueWall);
        addWall(ctx, 0, 800, 150, 400, blueWall);
        addWall(ctx, 0, 0, 250, 250, blueWall);
    } else if (mode === 'FFA') {
        const cornerDist = 1200; const wallLen = 600; const wThick = 150; 
        addWall(ctx, -cornerDist, -cornerDist, wallLen, wThick, wallColor);
        addWall(ctx, -cornerDist, -cornerDist, wThick, wallLen, wallColor);
        addWall(ctx, cornerDist, -cornerDist, wallLen, wThick, wallColor);
        addWall(ctx, cornerDist, -cornerDist, wThick, wallLen, wallColor);
        addWall(ctx, -cornerDist, cornerDist, wallLen, wThick, wallColor);
        addWall(ctx, -cornerDist, cornerDist, wThick, wallLen, wallColor);
        addWall(ctx, cornerDist, cornerDist, wallLen, wThick, wallColor);
        addWall(ctx, cornerDist, cornerDist, wThick, wallLen, wallColor);
        addWall(ctx, 0, -600, 150, 400, wallColor);
        addWall(ctx, 0, 600, 150, 400, wallColor);
        addWall(ctx, -600, 0, 400, 150, wallColor);
        addWall(ctx, 600, 0, 400, 150, wallColor);
    } else if (mode === 'Boss Raid') {
        const pillarDist = 800; const pSize = 350; const pColor = '#330505'; 
        addWall(ctx, -pillarDist, -pillarDist, pSize, pSize, pColor);
        addWall(ctx, pillarDist, -pillarDist, pSize, pSize, pColor);
        addWall(ctx, -pillarDist, pillarDist, pSize, pSize, pColor);
        addWall(ctx, pillarDist, pillarDist, pSize, pSize, pColor);
    } else if (mode === 'Mega') {
        const nestRad = 2000;
        for(let i=0; i<20; i++) {
            const x = (Math.random() - 0.5) * 8000;
            const y = (Math.random() - 0.5) * 8000;
            if (x*x + y*y < 1000*1000) continue; 
            const w = Math.random() > 0.5 ? 400 : 100;
            const h = w === 400 ? 100 : 400;
            addWall(ctx, x, y, w, h, '#222');
        }
    } else if (mode === 'Sandbox') {
        addWall(ctx, 0, -800, 1500, 80, '#ddd');
        addWall(ctx, 0, 800, 1500, 80, '#ddd');
        addWall(ctx, -1000, 0, 80, 800, '#ddd');
        addWall(ctx, 1000, 0, 80, 800, '#ddd');
    }

    if (mode === 'Sandbox' || mode === 'Mega') {
        const dummyY = mode === 'Mega' ? -3500 : -300;
        for(let i=0; i<5; i++) {
            ctx.entities.current.push(recycleEntity(ctx, {
                id: `dummy-${i}`,
                type: EntityType.DUMMY_TARGET,
                position: { x: -200 + (i * 100), y: dummyY },
                velocity: { x: 0, y: 0 },
                radius: mode === 'Mega' ? 60 : 30,
                baseRadius: mode === 'Mega' ? 60 : 30,
                rotation: 0,
                health: 10000,
                maxHealth: 10000,
                color: '#ffffff',
                depth: 8,
                teamId: 2,
                name: 'DUMMY',
                expValue: 0
            }));
        }
    }
};
