
import { Entity, EntityType, WeaponSchema, StatusEffect } from '../../types';
import { GameContext } from '../GameContext';
import { COLORS, EVOLUTION_TREE, GAMEPLAY_CONSTANTS } from '../../constants';
import { getStatMultiplier, distSq } from '../utils';
import { recycleEntity, spawnParticle, removeEntity, spawnShellCasing, spawnShape, spawnExplosion } from '../Spawner'; 

const GLOBAL_ENTITY_CAP = 200;

export const fireWeapon = (ctx: GameContext, shooter: Entity, weapon: WeaponSchema) => {
    // 1. GLOBAL CAP CHECK
    if (ctx.entities.current.length >= GLOBAL_ENTITY_CAP) return;

    // 2. RELOAD LOGIC
    const stats = ctx.playerStats.current;
    const reloadMulti = 1 / getStatMultiplier(stats, '7');
    let reloadTime = weapon.stats.reload * reloadMulti;

    if (shooter.skillState?.active) {
         if (weapon.skill?.type === 'BARRAGE' || weapon.skill?.type === 'OVERCLOCK') {
             reloadTime *= 0.2; 
         } else if (weapon.skill?.type === 'BERSERK') {
             reloadTime *= 0.5; 
         }
    }
    shooter.reloadTimer = reloadTime;

    // 3. AUTHORITY CHECK
    // Client should NOT spawn physical entities (Bullets/Drones) to prevent duplication with Server Snapshot.
    // Client SHOULD spawn visuals (Muzzle Flash, Casing, Sound) for immediate feedback.
    const isAuthority = ctx.network.current.role === 'HOST' || ctx.network.current.role === 'OFFLINE';
    const isSelf = shooter.id === 'player' || shooter.ownerId === ctx.network.current.myId;

    // --- AUDIO & VISUALS (Run on both, but prioritize local for sound) ---
    const isFlamethrower = weapon.type === 'Flamethrower';
    const isTesla = weapon.type === 'Tesla';
    const shouldPlaySound = !isFlamethrower || (isFlamethrower && ctx.globalTick.current % 12 === 0);

    // Only play sound if it's me, or if it's an enemy nearby (to prevent audio spam)
    if (shouldPlaySound && ctx.soundManager.current) {
        if (isSelf || distSq(shooter.position, {x: ctx.camera.current.x, y: ctx.camera.current.y}) < 1000*1000) {
             ctx.soundManager.current.playShoot(weapon.type, weapon.id);
        }
    }

    const tankScale = shooter.radius / (shooter.baseRadius || 24); 
    const shooterLevel = shooter.level || 1;
    const bulletScaleFactor = 1 + (shooterLevel * GAMEPLAY_CONSTANTS.BULLET_SIZE_PER_LEVEL);

    // --- DRONE LOGIC (Authority Only) ---
    const isDroneClass = weapon.type === 'Drone' || weapon.type === 'Necro' || weapon.type === 'Minion' || weapon.type === 'Swarm';
    
    if (isDroneClass) {
        if (!isAuthority) return; // Clients don't spawn drones logic

        const maxDrones = weapon.stats.bulletCount || 8; 
        const droneTypes = [EntityType.DRONE_TRIANGLE, EntityType.DRONE_SQUARE, EntityType.DRONE_MINION, EntityType.DRONE_SWARM];

        let activeDroneCount = 0;
        for(let i = 0; i < ctx.entities.current.length; i++) {
            const e = ctx.entities.current[i];
            if (e.ownerId === shooter.id && e.health > 0 && droneTypes.includes(e.type)) {
                activeDroneCount++;
            }
        }

        if (activeDroneCount >= maxDrones) return;

        for (let i = 0; i < weapon.barrels.length; i++) {
            if (activeDroneCount >= maxDrones) break;
            const barrel = weapon.barrels[i];
            const recoilAngle = shooter.rotation + barrel.angle + (Math.random() - 0.5) * weapon.stats.spread;
            const netAngle = shooter.rotation + barrel.angle;
            const spawnPos = {
                x: shooter.position.x + Math.cos(netAngle) * barrel.length - Math.sin(netAngle) * barrel.offset,
                y: shooter.position.y + Math.sin(netAngle) * barrel.length + Math.cos(netAngle) * barrel.offset,
            };
            
            let projectileType = EntityType.DRONE_TRIANGLE;
            let bulletColor = COLORS.bullets.drone;
            let lifeTime = undefined;
            
            if (weapon.type === 'Necro') { projectileType = EntityType.DRONE_SQUARE; bulletColor = COLORS.bullets.necro; }
            else if (weapon.type === 'Minion') { projectileType = EntityType.DRONE_MINION; bulletColor = shooter.color; }
            else if (weapon.type === 'Swarm') { projectileType = EntityType.DRONE_SWARM; bulletColor = COLORS.bullets.swarm; lifeTime = weapon.stats.range * 3; }

            ctx.entities.current.push(recycleEntity(ctx, {
                id: Math.random().toString(),
                type: projectileType,
                position: { ...spawnPos },
                velocity: { x: Math.cos(recoilAngle) * 2, y: Math.sin(recoilAngle) * 2 },
                radius: weapon.stats.bulletSize,
                baseRadius: weapon.stats.bulletSize,
                rotation: recoilAngle,
                health: 30, maxHealth: 30,
                color: bulletColor,
                depth: 12,
                teamId: shooter.teamId,
                ownerId: shooter.id,
                damage: weapon.stats.damage * getStatMultiplier(stats, '6'),
                targetId: undefined, // Drones find their own targets in AI System
                orbitAngle: Math.random() * Math.PI * 2,
                lifeTime: lifeTime
            }));
            activeDroneCount++;
        }
        return;
    }

    // --- HITSCAN LOGIC (Tesla) ---
    if (isTesla) {
        // Visuals (Lightning) are handled here for immediate feedback, 
        // BUT damage is only applied by Authority
        const rangeSq = weapon.stats.range * weapon.stats.range;
        const coneHalfAngle = 0.5;
        let hitCount = 0;
        
        const muzzleLen = 50 * tankScale; 
        const muzzlePos = {
            x: shooter.position.x + Math.cos(shooter.rotation) * muzzleLen,
            y: shooter.position.y + Math.sin(shooter.rotation) * muzzleLen
        };

        for (let i = 0; i < ctx.entities.current.length; i++) {
            if (hitCount >= weapon.stats.bulletCount) break;
            const e = ctx.entities.current[i];
            if (e.id !== shooter.id && e.teamId !== shooter.teamId && !['BULLET','MISSILE','LASER_BOLT','WALL','WAVE','ZONE'].includes(e.type)) {
                if (distSq(shooter.position, e.position) < rangeSq) {
                    const dx = e.position.x - shooter.position.x;
                    const dy = e.position.y - shooter.position.y;
                    const angleToTarget = Math.atan2(dy, dx);
                    let angleDiff = angleToTarget - shooter.rotation;
                    angleDiff = (angleDiff + Math.PI * 3) % (Math.PI * 2) - Math.PI;

                    if (Math.abs(angleDiff) < coneHalfAngle) {
                        // VISUALS (Run for everyone)
                        ctx.lightningBeams.current.push({
                            x1: muzzlePos.x, y1: muzzlePos.y,
                            x2: e.position.x, y2: e.position.y,
                            life: 2 
                        });
                        spawnParticle(ctx, e.position, '#ffff00', 'spark');

                        // LOGIC (Authority Only)
                        if (isAuthority) {
                            e.health -= weapon.stats.damage * getStatMultiplier(stats, '6');
                            const effect: StatusEffect = { type: 'SHOCK', duration: 40, magnitude: 1 };
                            e.statusEffects = e.statusEffects.filter(s => s.type !== 'SHOCK'); e.statusEffects.push(effect);

                            if (e.health <= 0) {
                                spawnParticle(ctx, e.position, e.color, 'ring');
                                if (e.type !== EntityType.PLAYER) {
                                    if (shooter.id === 'player' && e.expValue) {
                                        ctx.gameState.current.score += e.expValue;
                                        ctx.gameState.current.exp += e.expValue;
                                        if (ctx.gameState.current.exp >= ctx.gameState.current.nextLevelExp) {
                                            ctx.gameState.current.level++; shooter.level = ctx.gameState.current.level; 
                                            ctx.gameState.current.upgradesPoints++; ctx.gameState.current.exp -= ctx.gameState.current.nextLevelExp; 
                                            ctx.gameState.current.nextLevelExp *= 1.1; 
                                        }
                                        spawnParticle(ctx, shooter.position, '#ffd700', 'text', `+${e.expValue} XP`);
                                    }
                                    removeEntity(ctx, i); i--; 
                                    if (e.type.startsWith('FOOD')) spawnShape(ctx);
                                }
                            }
                        }
                        hitCount++;
                    }
                }
            }
        }
        return;
    }

    // --- PROJECTILE SPAWNING ---
    weapon.barrels.forEach((barrel, index) => {
       setTimeout(() => {
          let currentSpread = weapon.stats.spread;
          if (shooter.skillState?.active && weapon.skill?.type === 'FOCUS') currentSpread *= 0.1;

          const recoilAngle = shooter.rotation + barrel.angle + (Math.random() - 0.5) * currentSpread;
          const scaledBarrelOffset = barrel.offset * tankScale;
          const scaledBarrelLength = barrel.length * tankScale;

          // Physics Recoil (Applied immediately for feel)
          shooter.velocity.x -= Math.cos(recoilAngle) * weapon.stats.recoil * 0.05;
          shooter.velocity.y -= Math.sin(recoilAngle) * weapon.stats.recoil * 0.05;
          
          if (!shooter.barrelRecoils) shooter.barrelRecoils = [];
          shooter.barrelRecoils[index] = 1.0; 

          const netAngle = shooter.rotation + barrel.angle;
          const spawnPos = {
            x: shooter.position.x + Math.cos(netAngle) * scaledBarrelLength - Math.sin(netAngle) * scaledBarrelOffset,
            y: shooter.position.y + Math.sin(netAngle) * scaledBarrelLength + Math.cos(netAngle) * scaledBarrelOffset,
          };

          // 1. VISUALS (Run on Client & Host)
          const isFlame = weapon.type === 'Flamethrower';
          const isSonic = weapon.type === 'Sonic';
          if (!isFlame && !isSonic && weapon.type !== 'Laser') {
              spawnParticle(ctx, spawnPos, '#fff', 'muzzle_flash', undefined, recoilAngle);
              const casingPos = { 
                  x: shooter.position.x + Math.cos(shooter.rotation) * (scaledBarrelOffset - 5), 
                  y: shooter.position.y + Math.sin(shooter.rotation) * (scaledBarrelOffset - 5) 
              };
              spawnShellCasing(ctx, casingPos, shooter.rotation);
              ctx.camera.current.shake += weapon.stats.recoil * 0.3;
          }

          // 2. ENTITY SPAWN (Host Only)
          if (isAuthority) {
              const dmgMulti = getStatMultiplier(stats, '6');
              const speedMulti = getStatMultiplier(stats, '4');
              const lifeMulti = getStatMultiplier(stats, '5');
              
              let projectileType = EntityType.BULLET;
              let bulletColor = shooter.teamId === 1 ? COLORS.bullets.player : COLORS.bullets.enemy;

              if (weapon.type === 'Trap') { projectileType = EntityType.TRAP; bulletColor = COLORS.bullets.trap; }
              else if (weapon.type === 'Launcher') { projectileType = EntityType.MISSILE; bulletColor = COLORS.bullets.missile; }
              else if (weapon.type === 'Laser') { projectileType = EntityType.LASER_BOLT; bulletColor = COLORS.bullets.photon; }
              else if (isSonic) { projectileType = EntityType.WAVE; bulletColor = COLORS.bullets.wave; }
              else if (isFlame) { bulletColor = weapon.effect === 'FREEZE' ? '#ccffff' : '#ffddaa'; }
              else if (weapon.effect === 'CORROSION') bulletColor = COLORS.bullets.poison;
              
              if (weapon.id === 'cluster_launcher') bulletColor = '#f97316'; 
              if (weapon.id === 'supernova') bulletColor = '#d946ef'; 

              const barrelRadius = barrel.width / 2;
              const sizeModifier = (weapon.stats.bulletSize / 10); 
              let realRadius = barrelRadius * sizeModifier * bulletScaleFactor; 
              
              if (realRadius < 4) realRadius = 4;
              if (isFlame) realRadius *= 0.6;

              const count = (weapon.type === 'Shotgun' || weapon.type === 'Swarm') ? weapon.stats.bulletCount : 1;
              
              for(let i=0; i<count; i++) {
                 const pelletAngle = (weapon.type === 'Shotgun') ? recoilAngle + (Math.random() - 0.5) * weapon.stats.spread : recoilAngle;
                 ctx.entities.current.push(recycleEntity(ctx, {
                    id: `${shooter.id}-b-${Date.now()}-${i}-${Math.random()}`, // Unique ID
                    type: projectileType,
                    position: { ...spawnPos },
                    velocity: { 
                      x: Math.cos(pelletAngle) * weapon.stats.speed * speedMulti + shooter.velocity.x * 0.2, 
                      y: Math.sin(pelletAngle) * weapon.stats.speed * speedMulti + shooter.velocity.y * 0.2
                    },
                    radius: realRadius, 
                    baseRadius: realRadius,
                    rotation: pelletAngle,
                    health: weapon.type === 'Trap' ? weapon.stats.damage * 2 : 1, 
                    maxHealth: weapon.stats.range * lifeMulti,
                    color: bulletColor,
                    depth: isFlame ? 20 : (isSonic ? 5 : 5), 
                    teamId: shooter.teamId,
                    ownerId: shooter.id,
                    damage: weapon.stats.damage * dmgMulti,
                    // @ts-ignore
                    isFlame, effectType: weapon.effect, lifeTime: weapon.stats.range * 3,
                    trailColor: bulletColor,
                    hitIds: isSonic ? [] : undefined,
                    weaponId: weapon.id 
                 }));
              }
          }

       }, barrel.delay * (1000/60));
    });
};
