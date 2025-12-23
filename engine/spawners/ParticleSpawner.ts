
import { Particle, Entity, EntityType, Vector2 } from '../../types';
import { GameContext } from '../GameContext';
import { dist } from '../utils';
import { recycleParticle, recycleEntity } from './Pools';

const MAX_PARTICLES_MOBILE = 40;
const MAX_PARTICLES_DESKTOP = 100;

export const spawnParticle = (ctx: GameContext, pos: Vector2, color: string, type: Particle['type'], text?: string, angle: number = 0) => {
    const limit = ctx.settings.current.graphics.particles;
    if (limit === 0) return;
    const baseLimit = ctx.isMobile.current ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;
    const maxParticles = Math.floor(baseLimit * (limit / 100));
    if (ctx.particles.current.length > maxParticles) return;

    const isMuzzle = type === 'muzzle_flash';
    ctx.particles.current.push(recycleParticle(ctx, {
        id: Math.random().toString(),
        position: { ...pos },
        velocity: { 
            x: isMuzzle ? 0 : (Math.random() - 0.5) * 4, 
            y: isMuzzle ? 0 : (type === 'text' ? -3.0 : (Math.random() - 0.5) * 4) 
        },
        life: 1.0,
        maxLife: 1.0,
        size: type === 'text' ? 16 : isMuzzle ? 25 : Math.random() * 5 + 3,
        color,
        type,
        text,
        rotation: angle,
        rotationSpeed: (Math.random() - 0.5) * 0.2
    }));
};

export const spawnShellCasing = (ctx: GameContext, pos: Vector2, angle: number) => {
    if (ctx.isMobile.current) return;
    if (ctx.settings.current.graphics.particles < 50) return;
    const ejectAngle = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const speed = 3 + Math.random() * 2;
    ctx.particles.current.push(recycleParticle(ctx, {
        id: Math.random().toString(),
        position: { ...pos },
        velocity: { x: Math.cos(ejectAngle) * speed, y: Math.sin(ejectAngle) * speed },
        life: 1.0, maxLife: 1.0, size: 4, color: '#eab308', type: 'casing', rotation: Math.random() * Math.PI, rotationSpeed: (Math.random() - 0.5) * 0.5
    }));
};

export const spawnExplosion = (
    ctx: GameContext, 
    source: Entity, 
    radius: number, 
    damage: number, 
    shrapnelCount: number = 0,
    isPlasma: boolean = false
) => {
    const pos = source.position;
    
    // 1. Audio
    if (ctx.soundManager.current) {
        ctx.soundManager.current.playExplosion();
    }

    // 2. Camera Shake
    const distToCam = dist(pos, {x: ctx.camera.current.x, y: ctx.camera.current.y});
    const maxShakeDist = 1200;
    if (distToCam < maxShakeDist) {
        const strength = 1 - (distToCam / maxShakeDist);
        ctx.camera.current.shake = Math.min(ctx.camera.current.shake + (radius / 8) * (strength * strength), 30);
    }

    // 3. VISUALS: Snappy Single Burst (Reduced lingering)
    ctx.particles.current.push(recycleParticle(ctx, {
        id: Math.random().toString(),
        position: { ...pos },
        velocity: { x: 0, y: 0 },
        life: 1.0, maxLife: 1.0,
        size: radius, 
        color: isPlasma ? '#d946ef' : '#ffaa00',
        type: 'explosion_core',
        rotation: Math.random() * Math.PI,
    }));

    // Minimal Debris (Keep it clean)
    const debrisCount = ctx.isMobile.current ? 2 : 4;
    for(let i=0; i<debrisCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 5) + 2;
        ctx.particles.current.push(recycleParticle(ctx, {
            id: Math.random().toString(),
            position: { ...pos },
            velocity: { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed },
            life: 0.6 + Math.random() * 0.4, // Shorter life
            maxLife: 1.0,
            size: Math.random() * 3 + 2,
            color: isPlasma ? '#e879f9' : '#4b5563',
            type: 'debris', 
            rotation: Math.random() * Math.PI,
            rotationSpeed: (Math.random() - 0.5) * 0.3
        }));
    }

    // 4. Area Damage
    ctx.entities.current.forEach(e => {
        if (e.id === source.id) return;
        if (e.teamId === source.teamId && e.type !== EntityType.DUMMY_TARGET) return; 
        
        if (Math.abs(e.position.x - pos.x) > radius || Math.abs(e.position.y - pos.y) > radius) return;

        const d = dist(pos, e.position);
        if (d < radius) {
            const falloff = 1 - (d / radius); 
            const actualDmg = damage * falloff;
            e.health -= actualDmg;
            const force = (damage / 15) * falloff;
            const angle = Math.atan2(e.position.y - pos.y, e.position.x - pos.x);
            e.velocity.x += Math.cos(angle) * force;
            e.velocity.y += Math.sin(angle) * force;

            if (ctx.globalTick.current % 5 === 0 && actualDmg > 1) {
               spawnParticle(ctx, e.position, '#fff', 'text', Math.round(actualDmg).toString());
            }
        }
    });

    // 5. SHRAPNEL (The Fix: Prevent Recursion)
    // "2 times is enough" -> Main Explosion (1) -> Shrapnel hits (2) -> STOP.
    if (shrapnelCount > 0) {
        // Cap count strictly to prevent lag
        const safeShrapnelCount = Math.min(shrapnelCount, 6);
        
        for(let i=0; i<safeShrapnelCount; i++) {
            const baseAngle = (Math.PI * 2 * i) / safeShrapnelCount;
            const variance = (Math.random() - 0.5) * 0.5;
            const finalAngle = baseAngle + variance;
            const speed = (Math.random() * 5) + 8;
            
            ctx.entities.current.push(recycleEntity(ctx, {
                id: `shrapnel-${Math.random()}`,
                type: isPlasma ? EntityType.LASER_BOLT : EntityType.BULLET,
                position: { x: pos.x, y: pos.y },
                velocity: { x: Math.cos(finalAngle) * speed, y: Math.sin(finalAngle) * speed },
                radius: isPlasma ? 5 : 4,
                baseRadius: isPlasma ? 5 : 4,
                rotation: finalAngle,
                health: 1, 
                maxHealth: 15, // Reduced lifetime for snappy feel
                color: isPlasma ? '#d946ef' : '#f97316',
                depth: 5,
                teamId: source.teamId,
                ownerId: source.ownerId,
                damage: damage * 0.3, 
                // CRITICAL FIX: Set weaponId to 'fragment' so Physics.ts doesn't trigger another spawnExplosion
                weaponId: 'fragment', 
                // @ts-ignore
                isFlame: isPlasma 
            }));
        }
    }
};

export const spawnClusterShrapnel = (ctx: GameContext, parent: Entity, count: number, damage: number, speed: number, radius: number, lifeTime: number, isPlasma: boolean = false) => {
    spawnExplosion(ctx, parent, radius * 6, damage, Math.min(count, 6), isPlasma);
};
