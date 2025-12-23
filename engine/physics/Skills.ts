
import { GameContext } from '../GameContext';
import { Entity, WeaponSchema, EntityType } from '../../types';
import { distSq, resolveColor } from '../utils';
import { spawnParticle } from '../Spawner';

export const applyActiveSkill = (ctx: GameContext, player: Entity, weapon: WeaponSchema) => {
    const type = weapon.skill?.type;
    if (!type) return;

    // Movement & Stat Buffs
    // (Handled directly in Movement Physics mainly, but complex logic goes here)
    
    if (type === 'MAGNET' || type === 'GRAVITY_WELL' || type === 'CHRONO_FIELD' || type === 'TIME_WARP') {
        const range = type === 'GRAVITY_WELL' ? 600 : (type === 'CHRONO_FIELD' || type === 'TIME_WARP' ? 500 : 500);
        const pullForce = type === 'GRAVITY_WELL' ? 2 : (type === 'MAGNET' ? 5 : 0);
        
        ctx.entities.current.forEach(e => {
            if (e.id === player.id) return;
            const validTarget = type === 'MAGNET' ? e.type.startsWith('FOOD') : (e.type === EntityType.ENEMY || e.type.startsWith('FOOD') || e.type.startsWith('BULLET'));
            
            if (validTarget && distSq(player.position, e.position) < range*range) {
                if (type === 'CHRONO_FIELD' || type === 'TIME_WARP') {
                    const slowFactor = type === 'TIME_WARP' ? 0.1 : 0.5; 
                    e.velocity.x *= slowFactor; e.velocity.y *= slowFactor;
                    if (ctx.globalTick.current % 10 === 0) spawnParticle(ctx, e.position, '#00ffff', 'glitch');
                } else {
                    const dx = player.position.x - e.position.x;
                    const dy = player.position.y - e.position.y;
                    const d = Math.sqrt(dx*dx + dy*dy);
                    e.position.x += (dx/d) * pullForce;
                    e.position.y += (dy/d) * pullForce;
                    if (type === 'GRAVITY_WELL' && e.type.startsWith('BULLET') && e.teamId !== player.teamId) {
                        e.health = 0; spawnParticle(ctx, e.position, '#a855f7', 'spark');
                    }
                }
            }
        });
    }

    if (type === 'ORBITAL_BEAM') {
        if (ctx.globalTick.current % 5 === 0) {
            const targetX = player.position.x + Math.cos(player.rotation) * 400;
            const targetY = player.position.y + Math.sin(player.rotation) * 400;
            ctx.entities.current.forEach(e => {
                if (e.teamId !== player.teamId && (e.type === EntityType.ENEMY || e.type === EntityType.PLAYER)) {
                    if (distSq(e.position, {x: targetX, y: targetY}) < 150*150) {
                        e.health -= weapon.stats.damage * 0.5;
                        spawnParticle(ctx, e.position, '#ff00ff', 'energy_arc');
                    }
                }
            });
        }
    }

    if (type === 'THUNDER_STORM' && ctx.globalTick.current % 10 === 0) {
        let nearest = null; let minD = 400 * 400;
        ctx.entities.current.forEach(e => {
            if (e.teamId !== player.teamId && (e.type === EntityType.ENEMY || e.type === EntityType.PLAYER)) {
                const d = distSq(player.position, e.position);
                if (d < minD) { minD = d; nearest = e; }
            }
        });
        if (nearest) {
            // @ts-ignore
            nearest.health -= weapon.stats.damage;
            spawnParticle(ctx, nearest.position, '#00ffff', 'spark');
            ctx.lightningBeams.current.push({ x1: player.position.x, y1: player.position.y, x2: nearest.position.x, y2: nearest.position.y, life: 5 });
        }
    }

    if (type === 'NANO_ARMOR') {
        if (player.health < player.maxHealth) player.health += player.maxHealth * 0.01;
    }
};

export const activateSkill = (ctx: GameContext, player: Entity, weapon: WeaponSchema) => {
    if (player.skillState!.cooldown > 0) return;
    
    player.skillState!.active = true;
    player.skillState!.duration = weapon.skill!.duration;
    player.skillState!.cooldown = weapon.skill!.cooldown;
    spawnParticle(ctx, player.position, '#fff', 'ring', undefined, 0);
    
    const type = weapon.skill!.type;
    const settings = ctx.settings.current;

    if (type === 'TELEPORT') {
        const dist = 300;
        player.position.x += Math.cos(player.rotation) * dist;
        player.position.y += Math.sin(player.rotation) * dist;
        spawnParticle(ctx, player.position, resolveColor('#00f3ff', settings.accessibility.colorblindMode), 'glitch');
    } else if (type === 'ROCKET_JUMP') {
        player.velocity.x -= Math.cos(player.rotation) * 40;
        player.velocity.y -= Math.sin(player.rotation) * 40;
    } else if (type === 'EMP') {
        const range = 400;
        ctx.entities.current.forEach(target => {
            if (target.id !== player.id && target.teamId !== player.teamId && distSq(player.position, target.position) < range*range) {
                if (target.type === EntityType.ENEMY || target.type === EntityType.PLAYER) {
                    target.velocity.x = 0; target.velocity.y = 0;
                    target.statusEffects.push({ type: 'SHOCK', duration: 120, magnitude: 1 });
                    spawnParticle(ctx, target.position, '#ffff00', 'spark');
                }
            }
        });
        spawnParticle(ctx, player.position, '#ffff00', 'ring', undefined, 0);
    } else if (type === 'PHANTOM_STEP') {
        spawnParticle(ctx, player.position, '#ffffff', 'smoke');
    } else if (type === 'TIME_WARP') {
        spawnParticle(ctx, player.position, '#00ff9d', 'shockwave');
    }
};
