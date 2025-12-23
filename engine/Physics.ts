
import { GameContext } from './GameContext';
import { EntityType, Entity, Vector2 } from '../types';
import { EVOLUTION_TREE } from '../constants';
import { lerp, lerpAngle, distSq, dist, resolveColor } from './utils';
import { spawnParticle, removeEntity, spawnShape, spawnBoss, spawnExplosion } from './Spawner';
import { clearGrid, addToGrid, getNearbyIndices } from './physics/SpatialHash';
import { getAABBIntersectionT, getCircleIntersectionT } from './physics/Collision';
import { MovementSystem } from './systems/MovementSystem';
import { AISystem } from './systems/AISystem';

export const updatePhysics = (ctx: GameContext, activeWeaponId: string, onLevelUp?: (level: number) => void, onGameOver?: (killerName: string) => void, onKill?: (type: EntityType, isBoss?: boolean) => void) => {
    ctx.globalTick.current++;
    const settings = ctx.settings.current;
    
    // --- EVENT LOGIC ---
    if (ctx.network.current.role !== 'CLIENT') {
        const event = ctx.worldEvent.current;
        event.timeLeft--;
        if (event.timeLeft <= 0) {
            if (event.type !== 'NONE') {
                event.type = 'NONE';
                event.timer = 1800 + Math.random() * 1800; 
            } else {
                event.timer--;
                if (event.timer <= 0) {
                    const rand = Math.random();
                    if (rand < 0.4) event.type = 'GOLD_RUSH';
                    else if (rand < 0.7) event.type = 'LOW_GRAVITY';
                    else if (rand < 0.9) event.type = 'DARK_MATTER';
                    else event.type = 'BOSS_RAID';
                    
                    event.timeLeft = 2700; 
                    if (event.type === 'BOSS_RAID') spawnBoss(ctx, 0, 0); 
                }
            }
        }
    }
    
    const activeEvent = ctx.worldEvent.current.type;

    if (ctx.gameState.current.streakTimer > 0) {
        ctx.gameState.current.streakTimer--;
        if (ctx.gameState.current.streakTimer <= 0) {
            ctx.gameState.current.killStreak = 0; 
        }
    }

    // --- SPATIAL PARTITIONING REFRESH ---
    clearGrid();
    const entities = ctx.entities.current;
    for (let i = 0; i < entities.length; i++) {
        addToGrid(entities[i], i);
    }

    // --- SYSTEM UPDATES ---
    MovementSystem.update(ctx);
    AISystem.update(ctx);

    // --- ENTITY LOOP & COLLISION & LIFECYCLE ---
    // Note: We still iterate here for Collision, Drone Logic (which depends on specific target), and Status Effects cleanup
    // ideally these would also be systems, but we keep them here to prevent breaking complex interaction dependencies.
    
    for (let i = entities.length - 1; i >= 0; i--) {
      if (i >= entities.length) continue;
      const e = entities[i];
      if (!e) continue;

      if (e.barrelRecoils) { for(let b=0; b<e.barrelRecoils.length; b++) e.barrelRecoils[b] = Math.max(0, e.barrelRecoils[b] - 0.1); }
      if (e.type === EntityType.WALL) continue;
      
      const prevPos = { x: e.position.x, y: e.position.y };
      e.position.x += e.velocity.x; e.position.y += e.velocity.y;

      if (e.statusEffects && e.statusEffects.length > 0) {
          e.statusEffects = e.statusEffects.filter(s => s.duration > 0);
          e.statusEffects.forEach(s => {
              s.duration--;
              if (s.type === 'BURN' && ctx.globalTick.current % 20 === 0) {
                  e.health -= 5 * s.magnitude; spawnParticle(ctx, e.position, '#ff4400', 'smoke');
              } else if (s.type === 'CORROSION' && ctx.globalTick.current % 15 === 0) {
                  e.health -= 7 * s.magnitude; spawnParticle(ctx, e.position, '#00ff44', 'bubble');
              } else if (s.type === 'FREEZE') { e.velocity.x *= 0.8; e.velocity.y *= 0.8; }
              else if (s.type === 'SHOCK') { e.velocity.x *= 0.85; e.velocity.y *= 0.85; if (Math.random() > 0.7) { e.position.x += (Math.random()-0.5)*4; e.position.y += (Math.random()-0.5)*4; } }
          });
      }

      // --- NATURAL ORGANIC DRONE LOGIC ---
      if (e.type.startsWith('DRONE')) {
          const owner = entities.find(o => o.id === e.ownerId);
          if (owner) {
             let targetPos = { x: owner.position.x, y: owner.position.y };
             let mode = 'ORBIT';
             
             if (owner.type === EntityType.PLAYER) {
                 const weaponSkill = EVOLUTION_TREE.find(w => w.id === owner.weaponId)?.skill?.type;
                 const skillActive = owner.skillState?.active;
                 const isAttacking = ctx.mouse.current.down || ctx.keys.current.has('KeyE'); 
                 const isRepelling = ctx.mouse.current.rightDown || ctx.keys.current.has('ShiftLeft'); 
                 const worldMouseX = ctx.mouse.current.x - window.innerWidth/2 + ctx.camera.current.x;
                 const worldMouseY = ctx.mouse.current.y - window.innerHeight/2 + ctx.camera.current.y;

                 if (skillActive && weaponSkill === 'RECALL') { mode = 'ORBIT'; }
                 else if (skillActive && (weaponSkill === 'REPEL' || weaponSkill === 'MAGNET')) { mode = 'REPEL'; targetPos = { x: worldMouseX, y: worldMouseY }; }
                 else if (isRepelling) { mode = 'REPEL'; targetPos = { x: worldMouseX, y: worldMouseY }; }
                 else if (isAttacking) { mode = 'ATTACK'; targetPos = { x: worldMouseX, y: worldMouseY }; }
                 else { mode = 'ORBIT'; }
             } else if (owner.type === EntityType.ENEMY) {
                 const players = entities.filter(ent => ent.type === EntityType.PLAYER);
                 players.forEach(p => { if(distSq(e.position, p.position) < 250000) { targetPos = p.position; mode = 'ATTACK'; } });
             }

             const dx = targetPos.x - e.position.x; 
             const dy = targetPos.y - e.position.y; 
             const d = Math.sqrt(dx*dx + dy*dy);
             
             const accel = mode === 'ATTACK' ? 1.5 : 0.8;
             const friction = mode === 'ATTACK' ? 0.94 : 0.90;

             if (d > 0) {
                 if (mode === 'ATTACK') { e.velocity.x += (dx/d) * accel; e.velocity.y += (dy/d) * accel; e.rotation = lerpAngle(e.rotation, Math.atan2(dy, dx), 0.2); }
                 else if (mode === 'REPEL') { e.velocity.x -= (dx/d) * accel; e.velocity.y -= (dy/d) * accel; e.rotation = lerpAngle(e.rotation, Math.atan2(-dy, -dx), 0.1); }
                 else { 
                     const seed = Number(e.id.split('-')[1] || Math.random()) * 10;
                     const baseOrbitRad = 160;
                     const orbitRad = baseOrbitRad + Math.sin(ctx.globalTick.current * 0.02 + seed) * 30;
                     const distError = d - orbitRad;
                     const springStrength = 0.003; 
                     
                     e.velocity.x += (dx / d) * distError * springStrength * 5; e.velocity.y += (dy / d) * distError * springStrength * 5;
                     const spinSpeed = 0.5;
                     e.velocity.x += (dy / d) * spinSpeed; e.velocity.y += (-dx / d) * spinSpeed;
                     e.velocity.x += Math.cos(ctx.globalTick.current * 0.05 + seed) * 0.1; e.velocity.y += Math.sin(ctx.globalTick.current * 0.05 + seed) * 0.1;
                     const travelAngle = Math.atan2(e.velocity.y, e.velocity.x); e.rotation = lerpAngle(e.rotation, travelAngle, 0.1);
                 }
             }
             e.velocity.x *= friction; e.velocity.y *= friction;
          } else { e.health = 0; }
      }

      let shouldRemove = false;
      if (['BULLET','MISSILE','LASER_BOLT','WAVE'].includes(e.type)) {
         if (e.isFlame) e.maxHealth -= 2.0; else e.maxHealth--; 
         if (e.maxHealth <= 0) shouldRemove = true;
         if (e.type === EntityType.WAVE) e.radius += 1.5; else if (e.isFlame) { e.radius += 0.5; e.velocity.x *= 0.84; e.velocity.y *= 0.84; }
      } else if (e.type === EntityType.TRAP) {
         if(e.lifeTime) e.lifeTime--; e.rotation += 0.02; e.velocity.x *= 0.9; e.velocity.y *= 0.9; 
         if ((e.lifeTime||0) <= 0) shouldRemove = true;
      } else if (e.type.startsWith('FOOD')) { e.rotation += 0.01; e.velocity.x *= 0.95; e.velocity.y *= 0.95; }
      
      if (shouldRemove) { 
          const dmg = e.damage || 10;
          if (e.weaponId === 'cluster_launcher') spawnExplosion(ctx, e, 150, dmg, 8, false); 
          else if (e.weaponId === 'supernova') spawnExplosion(ctx, e, 400, dmg * 2, 24, true); 
          
          removeEntity(ctx, i); 
          continue; 
      }

      const isFastProjectile = ['BULLET','MISSILE','LASER_BOLT','TRAP'].includes(e.type);
      
      if (isFastProjectile) {
          const nearbyIndices = getNearbyIndices(e, prevPos);
          let bestT = 1.0;
          let bestHit: Entity | null = null;

          for (const j of nearbyIndices) {
              if (i === j) continue;
              const other = entities[j];
              if (!other) continue;
              
              let t: number | null = null;

              if (other.type === EntityType.WALL) {
                  t = getAABBIntersectionT(prevPos, e.position, other, e.radius);
              } else if (other.teamId !== e.teamId && (other.type === EntityType.PLAYER || other.type === EntityType.ENEMY || other.type === EntityType.DUMMY_TARGET || other.type.startsWith('FOOD'))) {
                  t = getCircleIntersectionT(prevPos, e.position, other, e.radius);
              }

              if (t !== null && t < bestT) {
                  bestT = t;
                  bestHit = other;
              }
          }

          if (bestHit) {
              e.position.x = lerp(prevPos.x, e.position.x, bestT);
              e.position.y = lerp(prevPos.y, e.position.y, bestT);

              if (bestHit.type === EntityType.WALL) {
                  e.health = 0; e.velocity.x = 0; e.velocity.y = 0; 
                  spawnParticle(ctx, e.position, '#aaa', 'smoke');
                  const dmg = e.damage || 10;
                  if (e.weaponId === 'cluster_launcher') spawnExplosion(ctx, e, 150, dmg, 8, false);
                  else if (e.weaponId === 'supernova') spawnExplosion(ctx, e, 400, dmg * 2, 24, true);
                  removeEntity(ctx, i); 
                  continue; 
              } else {
                  const other = bestHit;
                  let dmg = e.damage || 10;
                  
                  if (other.type === EntityType.PLAYER && other.skillState?.active) {
                      const skill = EVOLUTION_TREE.find(w => w.id === other.weaponId)?.skill?.type;
                      if (skill === 'SHIELD') dmg *= 0.2;
                      else if (skill === 'NANO_ARMOR') dmg *= 0.4;
                      else if (skill === 'BERSERK') dmg *= 1.5; 
                      else if (skill === 'MIRROR_PRISM') {
                          e.velocity.x *= -1; e.velocity.y *= -1; e.ownerId = other.id; e.teamId = other.teamId; e.color = other.color; e.lifeTime = (e.lifeTime || 50) + 30; 
                          spawnParticle(ctx, e.position, '#ffffff', 'ring');
                          continue; 
                      }
                  }

                  other.health -= dmg;
                  
                  if (other.type === EntityType.PLAYER || other.type === EntityType.ENEMY) { other.lastCombatTime = Date.now(); }
                  const attacker = entities.find(ent => ent.id === e.ownerId);
                  if (attacker && (other.type === EntityType.PLAYER || other.type === EntityType.ENEMY)) { attacker.lastCombatTime = Date.now(); }

                  if ((!e.isFlame && e.type !== EntityType.WAVE) || ctx.globalTick.current % 5 === 0) {
                      spawnParticle(ctx, other.position, '#fff', 'text', Math.round(dmg).toString());
                      spawnParticle(ctx, other.position, resolveColor(e.color, settings.accessibility.colorblindMode), 'spark');
                  }
                  if (e.type === EntityType.MISSILE) { spawnParticle(ctx, e.position, '#ff4400', 'fire'); }
                  
                  if (settings.controls.haptic && ctx.isMobile.current && e.ownerId === 'player' && navigator.vibrate) { navigator.vibrate(10); }

                  e.health -= 10; 
                  if (e.health <= 0) {
                      const explDmg = e.damage || 10;
                      if (e.weaponId === 'cluster_launcher') spawnExplosion(ctx, e, 150, explDmg, 8, false);
                      else if (e.weaponId === 'supernova') spawnExplosion(ctx, e, 400, explDmg * 2, 24, true);
                      removeEntity(ctx, i);
                  }

                  if (other.health <= 0) {
                      if (other.type === EntityType.DUMMY_TARGET) { other.health = other.maxHealth; }
                      else if (other.type !== EntityType.PLAYER) {
                          const otherIdx = entities.indexOf(other);
                          if (otherIdx !== -1) {
                              removeEntity(ctx, otherIdx);
                              if (e.ownerId === 'player' && onKill) onKill(other.type, other.name === 'GUARDIAN');
                              if (other.type.startsWith('FOOD')) spawnShape(ctx);
                              const owner = entities.find(ent => ent.id === e.ownerId);
                              if (owner && owner.id === 'player') {
                                  const xpMult = activeEvent === 'GOLD_RUSH' ? 3 : 1;
                                  const xp = (other.expValue || 0) * xpMult;
                                  ctx.gameState.current.score += xp; ctx.gameState.current.exp += xp;
                                  if (activeEvent === 'GOLD_RUSH') { spawnParticle(ctx, other.position, '#ffd700', 'text', `+${xp} XP (3x)`); }
                                  if (ctx.gameState.current.exp >= ctx.gameState.current.nextLevelExp) {
                                      ctx.gameState.current.level++; ctx.gameState.current.upgradesPoints++;
                                      ctx.gameState.current.exp -= ctx.gameState.current.nextLevelExp; ctx.gameState.current.nextLevelExp *= 1.2;
                                      if (onLevelUp) onLevelUp(ctx.gameState.current.level);
                                  }
                              }
                          }
                      } else if (other.id === 'player' && onGameOver) { 
                          let killerName = 'Unknown';
                          const owner = entities.find(ent => ent.id === e.ownerId);
                          if (owner) killerName = owner.name || 'Unknown Enemy';
                          removeEntity(ctx, entities.indexOf(other)); 
                          onGameOver(killerName); 
                      }
                  }
              }
          }
      } else {
          // DISCRETE COLLISION (Body vs Body / Body vs Wall)
          const nearbyIndices = getNearbyIndices(e);
          for (const j of nearbyIndices) {
             if (i === j) continue;
             const other = entities[j];
             if (!other) continue; 

             if (other.type === EntityType.WALL) {
                 // @ts-ignore
                 const halfW = (other.width || other.radius*2) / 2;
                 // @ts-ignore
                 const halfH = (other.height || other.radius*2) / 2;
                 const clampX = Math.max(other.position.x - halfW, Math.min(e.position.x, other.position.x + halfW));
                 const clampY = Math.max(other.position.y - halfH, Math.min(e.position.y, other.position.y + halfH));
                 const dx = e.position.x - clampX; const dy = e.position.y - clampY;
                 const dSq = dx*dx + dy*dy;
                 if (dSq < e.radius * e.radius && dSq > 0) {
                     if (['BULLET','MISSILE','LASER_BOLT','DRONE','DRONE_TRIANGLE','DRONE_SQUARE','TRAP'].includes(e.type)) {
                         e.health = 0; spawnParticle(ctx, e.position, '#aaa', 'smoke'); 
                         continue;
                     }
                     if (e.type !== EntityType.WAVE) {
                         const dst = Math.sqrt(dSq); const overlap = e.radius - dst;
                         if (dst > 0) { e.position.x += (dx / dst) * overlap; e.position.y += (dy / dst) * overlap; e.velocity.x *= 0.5; e.velocity.y *= 0.5; }
                     }
                 }
                 continue;
             }

             const bound = e.type === EntityType.WAVE ? e.radius + 100 : 100;
             if (Math.abs(e.position.x - other.position.x) > bound || Math.abs(e.position.y - other.position.y) > bound) continue;
             const rSum = e.radius + other.radius;
             const dSq = distSq(e.position, other.position);
             if (dSq < rSum * rSum) {
                const isBodyE = e.type.startsWith('PLAYER') || e.type.startsWith('ENEMY') || e.type.startsWith('FOOD') || e.type.startsWith('DRONE') || e.type === EntityType.DUMMY_TARGET;
                const isBodyOther = other.type.startsWith('PLAYER') || other.type.startsWith('ENEMY') || other.type.startsWith('FOOD') || other.type.startsWith('DRONE') || other.type === EntityType.DUMMY_TARGET;
                
                if (isBodyE && isBodyOther) {
                   if (e.type === EntityType.DRONE_SWARM && other.type === EntityType.DRONE_SWARM) continue;
                   
                   const dist = Math.sqrt(dSq);
                   const overlap = rSum - dist;
                   if (dist > 0 && overlap > 0) {
                       const nx = (e.position.x - other.position.x) / dist; const ny = (e.position.y - other.position.y) / dist;
                       const force = 0.05;
                       e.position.x += nx * overlap * force; e.position.y += ny * overlap * force;
                   }

                   const sameTeam = e.teamId === other.teamId && e.teamId !== 0;
                   if (!sameTeam && !e.isGodMode) {
                      let damageDealt = 0.5; if (e.type.startsWith('DRONE')) damageDealt = e.damage || 5;
                      let damageReceived = 0.5; if (other.type.startsWith('DRONE')) damageReceived = other.damage || 5;
                      
                      other.health -= damageDealt; e.health -= damageReceived; 
                      
                      const isCombatType = (ent: Entity) => ent.type === EntityType.PLAYER || ent.type === EntityType.ENEMY;
                      if (damageDealt > 0 && isCombatType(other)) other.lastCombatTime = Date.now();
                      if (damageReceived > 0 && isCombatType(e)) e.lastCombatTime = Date.now();

                      if (other.health <= 0) {
                          if (other.id === 'player' && onGameOver) {
                               const killerName = e.name || 'Unknown Unit';
                               removeEntity(ctx, entities.indexOf(other));
                               onGameOver(killerName);
                          } else {
                              const otherIdx = entities.indexOf(other);
                              if (otherIdx !== -1) {
                                 removeEntity(ctx, otherIdx);
                                 if (e.ownerId === 'player' && onKill) onKill(other.type, other.name === 'GUARDIAN');
                                 if (other.type.startsWith('FOOD')) spawnShape(ctx);
                                 if (e.ownerId && e.ownerId === 'player') {
                                     const xpMult = activeEvent === 'GOLD_RUSH' ? 3 : 1;
                                     const xp = (other.expValue || 0) * xpMult;
                                     ctx.gameState.current.score += xp; ctx.gameState.current.exp += xp;
                                     if (activeEvent === 'GOLD_RUSH') { spawnParticle(ctx, other.position, '#ffd700', 'text', `+${xp} XP (3x)`); }
                                     if (ctx.gameState.current.exp >= ctx.gameState.current.nextLevelExp) {
                                         ctx.gameState.current.level++; ctx.gameState.current.upgradesPoints++;
                                         ctx.gameState.current.exp -= ctx.gameState.current.nextLevelExp; ctx.gameState.current.nextLevelExp *= 1.2;
                                         if (onLevelUp) onLevelUp(ctx.gameState.current.level);
                                     }
                                 }
                              }
                          }
                      }
                   }
                }
             }
          }
      }
    }
};
