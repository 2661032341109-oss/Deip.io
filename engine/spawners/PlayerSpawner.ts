
import { EntityType } from '../../types';
import { GameContext } from '../GameContext';
import { COLORS, EVOLUTION_TREE } from '../../constants';
import { getStatMultiplier } from '../utils';
import { isPositionSafe } from '../physics/Collision';
import { recycleEntity, spawnParticle } from '../Spawner'; // Import from barrel to avoid circular with spawnParticle

export const spawnPlayer = (ctx: GameContext, weaponId: string, gameMode: string, nickname: string, startLevel: number = 1, teamChoice: number = 0) => {
    const actualWeaponId = gameMode === 'Sandbox' ? weaponId : 'basic';
    const weapon = EVOLUTION_TREE.find(w => w.id === actualWeaponId) || EVOLUTION_TREE[0];
    const isMega = gameMode === 'Mega';
    
    let spawnX = 0; let spawnY = 0; let teamId = 1; let color = COLORS.player;
    const isMegaRadius = isMega ? 28 : 24;

    let safe = false;
    let attempts = 0;
    const maxAttempts = 30; 

    while (!safe && attempts < maxAttempts) {
        safe = true; 

        if (gameMode === '2-Teams') {
            if (teamChoice === 1 || teamChoice === 2) {
                teamId = teamChoice;
            } else {
                if (attempts === 0) {
                    const isBlue = Math.random() > 0.5;
                    teamId = isBlue ? 1 : 2;
                }
            }
            
            color = teamId === 1 ? '#00f3ff' : '#ff0055';
            
            const baseDepth = 2500;
            const spreadY = 1800;
            
            spawnX = teamId === 1 ? (-baseDepth + (Math.random() * 500)) : (baseDepth - (Math.random() * 500)); 
            spawnY = (Math.random() - 0.5) * spreadY;

        } else {
            const mapSize = ctx.gameState.current.mapSize;
            spawnX = (Math.random() - 0.5) * (mapSize * 0.8);
            spawnY = (Math.random() - 0.5) * (mapSize * 0.8);
        }

        if (!isPositionSafe(ctx, spawnX, spawnY, isMegaRadius)) {
            safe = false;
        }

        attempts++;
    }

    if (!safe) console.warn("Could not find safe spawn for player, forcing spawn.");

    let currentExp = 0;
    let nextLevelExp = 50;
    
    for(let l=1; l<startLevel; l++) {
        currentExp += nextLevelExp;
        nextLevelExp *= 1.1; 
    }
    
    ctx.gameState.current.level = startLevel;
    ctx.gameState.current.exp = 0; 
    ctx.gameState.current.nextLevelExp = nextLevelExp;
    
    ctx.gameState.current.upgradesPoints = Math.max(0, startLevel - 1); 

    ctx.entities.current.push(recycleEntity(ctx, {
      id: 'player',
      type: EntityType.PLAYER,
      position: { x: spawnX, y: spawnY },
      velocity: { x: 0, y: 0 },
      radius: isMegaRadius,
      baseRadius: isMegaRadius, 
      rotation: 0,
      health: (100 * getStatMultiplier(ctx.playerStats.current, '2')) * (isMega ? 3 : 1), 
      maxHealth: (100 * getStatMultiplier(ctx.playerStats.current, '2')) * (isMega ? 3 : 1),
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
    
    if (isMega) spawnParticle(ctx, {x:0, y:0}, '#ff00aa', 'text', 'MEGA MODE ACTIVATED');
    
    if (startLevel > 1) {
        spawnParticle(ctx, {x: spawnX, y: spawnY}, '#00ff00', 'text', `LVL ${startLevel} START`);
        spawnParticle(ctx, {x: spawnX, y: spawnY}, '#ffff00', 'ring');
    }
};
