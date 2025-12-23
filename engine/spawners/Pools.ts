
import { Entity, Particle } from '../../types';
import { GameContext } from '../GameContext';

export const recycleEntity = (ctx: GameContext, base: Partial<Entity>): Entity => {
    let e: Entity;
    if (ctx.deadEntities.current.length > 0) {
        e = ctx.deadEntities.current.pop()!;
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
        Object.assign(e, base);
    } else {
        e = base as Entity;
        if (!e.statusEffects) e.statusEffects = [];
    }
    return e;
};

export const recycleParticle = (ctx: GameContext, base: Partial<Particle>): Particle => {
    let p: Particle;
    if (ctx.deadParticles.current.length > 0) {
        p = ctx.deadParticles.current.pop()!;
        Object.assign(p, base);
    } else {
        p = base as Particle;
    }
    return p;
};

export const removeEntity = (ctx: GameContext, index: number) => {
    if (index < 0 || index >= ctx.entities.current.length) return;
    const e = ctx.entities.current[index];
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
