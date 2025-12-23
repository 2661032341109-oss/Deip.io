
import { GameContext } from '../GameContext';
import { NetSnapshot, Entity, Particle } from '../../types';
import { recycleEntity, recycleParticle, removeEntity } from '../Spawner';
import { lerp, lerpAngle, distSq } from '../utils';

// Buffer configuration
const BUFFER_SIZE = 20; 

export class SnapshotManager {
    private static snapshotBuffer: NetSnapshot[] = [];

    // Push a new server snapshot into the buffer
    static pushSnapshot(snapshot: NetSnapshot) {
        this.snapshotBuffer.push(snapshot);
        // Keep buffer size manageable and sorted
        this.snapshotBuffer.sort((a, b) => a.timestamp - b.timestamp);
        if (this.snapshotBuffer.length > BUFFER_SIZE) {
            this.snapshotBuffer.shift();
        }
    }

    // Main Automation Function: Calculates the game state for the current render time
    static applySnapshot(context: GameContext, myId: string, predictionEnabled: boolean, renderTime: number) {
        if (this.snapshotBuffer.length < 2) {
            if (this.snapshotBuffer.length === 1) {
                this.applyStateDirectly(context, this.snapshotBuffer[0], myId);
            }
            return;
        }

        // 1. Find the two snapshots surrounding the render time
        let fromSnapshot: NetSnapshot | null = null;
        let toSnapshot: NetSnapshot | null = null;

        for (let i = 0; i < this.snapshotBuffer.length - 1; i++) {
            if (this.snapshotBuffer[i].timestamp <= renderTime && this.snapshotBuffer[i+1].timestamp >= renderTime) {
                fromSnapshot = this.snapshotBuffer[i];
                toSnapshot = this.snapshotBuffer[i+1];
                break;
            }
        }

        // 2. Fallback: If we are desynced (too far behind or ahead), snap to closest
        if (!fromSnapshot || !toSnapshot) {
            // Usually means lag spike or packet loss, snap to latest to catch up
            this.applyStateDirectly(context, this.snapshotBuffer[this.snapshotBuffer.length - 1], myId);
            return;
        }

        // 3. Calculate Interpolation Factor (Alpha)
        const totalDuration = toSnapshot.timestamp - fromSnapshot.timestamp;
        const timeSinceFrom = renderTime - fromSnapshot.timestamp;
        const alpha = Math.max(0, Math.min(1, timeSinceFrom / totalDuration));

        // 4. Interpolate Entities (The "Magic" part)
        const matchedIds = new Set<string>();

        toSnapshot.entities.forEach(toEnt => {
            if (!toEnt.id) return;
            matchedIds.add(toEnt.id);

            const fromEnt = fromSnapshot!.entities.find(e => e.id === toEnt.id);
            let local = context.entities.current.find(e => e.id === toEnt.id);
            
            // Create if new
            if (!local) {
                local = recycleEntity(context, toEnt);
                if (toEnt.position) {
                    local.position.x = toEnt.position.x;
                    local.position.y = toEnt.position.y;
                }
                context.entities.current.push(local);
            }

            const isMyPlayer = local.ownerId === myId;

            // --- INTERPOLATION LOGIC ---
            if (!isMyPlayer || !predictionEnabled) {
                // For other players/enemies, smooth between A and B
                if (fromEnt && fromEnt.position && toEnt.position) {
                    local.position.x = lerp(fromEnt.position.x, toEnt.position.x, alpha);
                    local.position.y = lerp(fromEnt.position.y, toEnt.position.y, alpha);
                } else if (toEnt.position) {
                    local.position.x = toEnt.position.x;
                    local.position.y = toEnt.position.y;
                }

                if (fromEnt && fromEnt.rotation !== undefined && toEnt.rotation !== undefined) {
                    local.rotation = lerpAngle(fromEnt.rotation, toEnt.rotation, alpha);
                } else if (toEnt.rotation !== undefined) {
                    local.rotation = toEnt.rotation;
                }
            } else {
                // For local player (Reconciliation)
                // Only snap back if error is too large (Rubber banding prevention)
                if (toEnt.position && distSq(local.position, toEnt.position) > 200 * 200) { 
                     local.position.x = toEnt.position.x;
                     local.position.y = toEnt.position.y;
                }
                // Always sync critical stats
                if (toEnt.health !== undefined) local.health = toEnt.health;
            }

            // Sync discrete properties
            this.syncProperties(local, toEnt);
        });

        // 5. Garbage Collection (Remove entities not in snapshot)
        for (let i = context.entities.current.length - 1; i >= 0; i--) {
            const e = context.entities.current[i];
            // Only remove dynamic entities that should be synced
            // Walls/Zones might be static map data, check types if needed
            if (!matchedIds.has(e.id) && e.type !== 'WALL' && e.type !== 'ZONE') {
                removeEntity(context, i);
            }
        }

        // 6. Sync Particles (One-shot events usually, or state sync)
        if (toSnapshot.particles) {
             // Basic replacement for now, usually particles are fire-and-forget
             // But for persistent effects, we might sync them. 
             // Here we assume particles are largely visual feedback generated locally
             // unless explicit sync is needed.
        }
    }

    private static applyStateDirectly(context: GameContext, snapshot: NetSnapshot, myId: string) {
        const matchedIds = new Set<string>();
        snapshot.entities.forEach(sData => {
            if (!sData.id) return;
            matchedIds.add(sData.id);
            let local = context.entities.current.find(e => e.id === sData.id);
            if (local) {
                const isMyPlayer = local.ownerId === myId;
                if (!isMyPlayer && sData.position) {
                    local.position.x = lerp(local.position.x, sData.position.x, 0.3);
                    local.position.y = lerp(local.position.y, sData.position.y, 0.3);
                }
                this.syncProperties(local, sData);
            } else {
                context.entities.current.push(recycleEntity(context, sData));
            }
        });
        
        for (let i = context.entities.current.length - 1; i >= 0; i--) {
            if (!matchedIds.has(context.entities.current[i].id) && context.entities.current[i].type !== 'WALL') {
                removeEntity(context, i);
            }
        }
    }

    private static syncProperties(local: Entity, data: Partial<Entity>) {
        if (data.health !== undefined) local.health = data.health;
        if (data.maxHealth !== undefined) local.maxHealth = data.maxHealth;
        if (data.score !== undefined) local.score = data.score;
        if (data.level !== undefined) local.level = data.level;
        if (data.weaponId) local.weaponId = data.weaponId;
        if (data.barrelRecoils) local.barrelRecoils = data.barrelRecoils;
        if (data.statusEffects) local.statusEffects = data.statusEffects;
        if (data.chatText) local.chatText = data.chatText;
        if (data.chatTimer) local.chatTimer = data.chatTimer;
        if (data.teamId !== undefined) local.teamId = data.teamId;
        if (data.name) local.name = data.name;
    }
}
