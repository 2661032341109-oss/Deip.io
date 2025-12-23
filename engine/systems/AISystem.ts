
import { GameContext } from '../GameContext';
import { EntityType } from '../../types';
import { EVOLUTION_TREE } from '../../constants';
import { lerpAngle, distSq } from '../utils';
import { getNearbyIndices } from '../physics/SpatialHash';
import { fireWeapon } from '../Spawner';

export const AISystem = {
    update: (ctx: GameContext) => {
        const entities = ctx.entities.current;
        const players = entities.filter(e => e.type === EntityType.PLAYER);

        // We iterate backwards only if we were removing, but here we just update state
        // Using standard loop is fine as we don't mutate the array length here
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            if (e.type !== EntityType.ENEMY) continue;

            let nearestPlayer = null;
            let minDst = Infinity;
            
            players.forEach(p => {
                const d = distSq(e.position, p.position);
                if (d < minDst) { minDst = d; nearestPlayer = p; }
            });

            if (nearestPlayer) {
                if (!e.aiState) e.aiState = { state: 'CHASE', acqRange: 800 };
                let detectionRange = e.aiState.acqRange;
                if (nearestPlayer.skillState?.active) {
                    const skill = EVOLUTION_TREE.find(w => w.id === nearestPlayer.weaponId)?.skill?.type;
                    if (skill === 'STEALTH' || skill === 'PHANTOM_STEP') detectionRange *= 0.2; 
                }
                const dToPlayer = Math.sqrt(minDst);
                if (dToPlayer < detectionRange) e.aiState.state = 'CHASE'; else e.aiState.state = 'IDLE';

                const steer = { x: 0, y: 0 };
                if (e.aiState.state === 'CHASE') {
                    const desiredX = nearestPlayer.position.x - e.position.x;
                    const desiredY = nearestPlayer.position.y - e.position.y;
                    steer.x += (desiredX / dToPlayer) * 0.5; steer.y += (desiredY / dToPlayer) * 0.5;
                    const targetRot = Math.atan2(desiredY, desiredX);
                    e.rotation = lerpAngle(e.rotation, targetRot, 0.1);
                    
                    if (dToPlayer < 500 && (!e.reloadTimer || e.reloadTimer <= 0)) {
                        const weapon = EVOLUTION_TREE.find(w => w.id === e.weaponId) || EVOLUTION_TREE[0];
                        fireWeapon(ctx, e, weapon);
                    }
                }
                
                // Avoidance
                const nearby = getNearbyIndices(e);
                for (const idx of nearby) {
                    if (idx === i) continue;
                    const other = entities[idx];
                    if (!other) continue;
                    if (other.type === EntityType.ENEMY || other.type === EntityType.WALL) {
                        const dSq = distSq(e.position, other.position);
                        const minDist = e.radius + other.radius + 20;
                        if (dSq < minDist * minDist && dSq > 0) {
                            const d = Math.sqrt(dSq);
                            const pushX = e.position.x - other.position.x;
                            const pushY = e.position.y - other.position.y;
                            steer.x += (pushX / d) * 2.0; steer.y += (pushY / d) * 2.0;
                        }
                    }
                }
                e.velocity.x += steer.x * 0.2; e.velocity.y += steer.y * 0.2;
                e.velocity.x *= 0.95; e.velocity.y *= 0.95;
                if (e.name === 'GUARDIAN') e.rotation += 0.005;
            }
        }
    }
};
