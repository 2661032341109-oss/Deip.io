
import { EntityType } from '../../types';
import { GameContext } from '../GameContext';
import { COLORS, EVOLUTION_TREE } from '../../constants';
import { getStatMultiplier } from '../utils';
import { isPositionSafe } from '../physics/Collision';
import { recycleEntity, spawnParticle } from '../Spawner'; 

// Added specificOwnerId parameter
export const spawnPlayer = (ctx: GameContext, weaponId: string, gameMode: string, nickname: string, startLevel: number = 1, teamChoice: number = 0, specificOwnerId?: string) => {
    const actualWeaponId = gameMode === 'Sandbox' ? weaponId : 'basic';
    const weapon = EVOLUTION_TREE.find(w => w.id === actualWeaponId) || EVOLUTION_TREE[0];
    const isMega = gameMode === 'Mega';
    
    // Default to 'player' ONLY if specificOwnerId is missing (Singleplayer fallback)
    // In Multiplayer, specificOwnerId MUST be the PeerID
    const ownerId = specificOwnerId || 'player';
    
    // Unique Entity ID to prevent collision in snapshots
    const entityId = `ent-${ownerId}`;

    let spawnX = 0; let spawnY = 0; let teamId = 1; let color = COLORS.player;
    const isMegaRadius = isMega ? 28 : 24;

    let safe = false;
    let attempts = 0;
    const maxAttempts = 30; 

    // Team Logic
    if (gameMode === '2-Teams') {
        if (teamChoice === 1 || teamChoice === 2) {
            teamId = teamChoice;
        } else {
            // Auto-balance if 0
            const blues = ctx.entities.current.filter(e => e.type === EntityType.PLAYER && e.teamId === 1).length;
            const reds = ctx.entities.current.filter(e => e.type === EntityType.PLAYER && e.teamId === 2).length;
            teamId = blues > reds ? 2 : 1;
        }
        color = teamId === 1 ? '#00f3ff' : '#ff0055';
    } else {
        // FFA / Sandbox: Everyone is team 0 (Hostile) or their own team
        // To allow FFA damage, players need unique teams or teamId 0 with logic
        // Simplified: teamId = 0 means FFA
        teamId = 0;
        // Host is cyan, clients get random colors in FFA?
        if (ownerId !== ctx.network.current.myId && gameMode === 'FFA') {
            color = '#ff0055'; // Enemies look red to local (Visual only, ideally solved in Renderer)
        }
    }

    while (!safe && attempts < maxAttempts) {
        safe = true; 
        const mapSize = ctx.gameState.current.mapSize;
        
        if (gameMode === '2-Teams') {
            const baseDepth = 2500;
            const spreadY = 1800;
            spawnX = teamId === 1 ? (-baseDepth + (Math.random() * 500)) : (baseDepth - (Math.random() * 500)); 
            spawnY = (Math.random() - 0.5) * spreadY;
        } else {
            spawnX = (Math.random() - 0.5) * (mapSize * 0.8);
            spawnY = (Math.random() - 0.5) * (mapSize * 0.8);
        }

        if (!isPositionSafe(ctx, spawnX, spawnY, isMegaRadius)) {
            safe = false;
        }
        attempts++;
    }

    let currentExp = 0;
    let nextLevelExp = 50;
    for(let l=1; l<startLevel; l++) {
        currentExp += nextLevelExp;
        nextLevelExp *= 1.1; 
    }
    
    // Only update Local GameState if this is ME
    if (ownerId === ctx.network.current.myId) {
        ctx.gameState.current.level = startLevel;
        ctx.gameState.current.exp = 0; 
        ctx.gameState.current.nextLevelExp = nextLevelExp;
        ctx.gameState.current.upgradesPoints = Math.max(0, startLevel - 1); 
    }

    ctx.entities.current.push(recycleEntity(ctx, {
      id: entityId, // ID linked to PeerID
      ownerId: ownerId, // Ownership linked to PeerID
      type: EntityType.PLAYER,
      position: { x: spawnX, y: spawnY },
      velocity: { x: 0, y: 0 },
      radius: isMegaRadius,
      baseRadius: isMegaRadius, 
      rotation: 0,
      health: 100, 
      maxHealth: 100,
      color: color,
      depth: 10,
      name: nickname,
      weaponId: actualWeaponId,
      reloadTimer: 0,
      recoilForce: 0,
      barrelRecoils: new Array(weapon.barrels.length).fill(0),
      teamId: teamId,
      isGodMode: false,
      isSpike: weapon.bodyType === 'Spike',
      level: startLevel, 
      score: 0 
    }));
    
    if (isMega) spawnParticle(ctx, {x:0, y:0}, '#ff00aa', 'text', 'MEGA MODE');
    spawnParticle(ctx, {x: spawnX, y: spawnY}, '#00ff00', 'text', 'DEPLOYED');
};
