
import { Entity, Particle, EntityType } from '../../types';
import { GameContext } from '../GameContext';

export const recycleEntity = (ctx: GameContext, base: Partial<Entity>): Entity => {
    let e: Entity;
    
    // Default structure to ensure no undefined crashes
    const defaults = {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 10,
        rotation: 0,
        health: 100,
        maxHealth: 100,
        color: '#ffffff',
        type: EntityType.DUMMY_TARGET,
        id: `temp-${Math.random()}`,
        statusEffects: [],
        depth: 10,
        teamId: 0
    };

    if (ctx.deadEntities.current.length > 0) {
        e = ctx.deadEntities.current.pop()!;
        
        // Reset dirty properties
        e.statusEffects = [];
        e.barrelRecoils = undefined;
        e.ownerId = undefined;
        e.targetId = undefined;
        e.hitIds = undefined;
        e.lifeTime = undefined;
        e.aiState = undefined;
        e.width = undefined;
        e.height = undefined;
        e.baseRadius = undefined;
        e.chatText = undefined;
        e.chatTimer = undefined;
        
        // Apply new values over existing object
        Object.assign(e, defaults, base);
        
        // Safety check for nested objects
        if (!e.position) e.position = { x: 0, y: 0 };
        if (!e.velocity) e.velocity = { x: 0, y: 0 };
        
    } else {
        // Create fresh with defaults merged
        e = { ...defaults, ...base } as Entity;
    }
    
    return e;
};

export const recycleParticle = (ctx: GameContext, base: Partial<Particle>): Particle => {
    let p: Particle;
    const defaults = {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        life: 1.0,
        maxLife: 1.0,
        size: 5,
        color: '#fff',
        type: 'smoke',
        id: `p-${Math.random()}`
    };

    if (ctx.deadParticles.current.length > 0) {
        p = ctx.deadParticles.current.pop()!;
        Object.assign(p, defaults, base);
        if (!p.position) p.position = { x: 0, y: 0 };
        if (!p.velocity) p.velocity = { x: 0, y: 0 };
    } else {
        p = { ...defaults, ...base } as Particle;
    }
    return p;
};

export const removeEntity = (ctx: GameContext, index: number) => {
    if (index < 0 || index >= ctx.entities.current.length) return;
    const e = ctx.entities.current[index];
    // Fast remove (Swap with last) to prevent array splice performance hit
    const last = ctx.entities.current[ctx.entities.current.length - 1];
    ctx.entities.current[index] = last;
    ctx.entities.current.pop();
    ctx.deadEntities.current.push(e);
};

export const removeParticle = (ctx: GameContext, index: number) => {
    if (index < 0 || index >= ctx.particles.current.length) return;
    const p = ctx.particles.current[index];
    const last = ctx.particles.current[ctx.particles.current.length - 1];
    ctx.particles.current[index] = last;
    ctx.particles.current.pop();
    ctx.deadParticles.current.push(p);
};
