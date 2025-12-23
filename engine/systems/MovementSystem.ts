
import { GameContext } from '../GameContext';
import { Entity, EntityType } from '../../types';
import { EVOLUTION_TREE, GAMEPLAY_CONSTANTS } from '../../constants';
import { getStatMultiplier, lerpAngle, lerp } from '../utils';
import { fireWeapon, spawnParticle } from '../Spawner';
import { activateSkill, applyActiveSkill } from '../physics/Skills';

export const MovementSystem = {
    update: (ctx: GameContext) => {
        const players = ctx.entities.current.filter(e => e.type === EntityType.PLAYER);
        const settings = ctx.settings.current;
        const activeEvent = ctx.worldEvent.current.type;

        players.forEach(player => {
            // --- SIZE SCALING (MASS) ---
            let sizeScale = 1.0;
            if (player.baseRadius) {
                sizeScale = 1 + ((player.level || 1) * GAMEPLAY_CONSTANTS.SIZE_PER_LEVEL);
                player.radius = player.baseRadius * sizeScale;
            }

            let inputKeys = new Set<string>();
            let inputMouse = { x: 0, y: 0, down: false, rightDown: false };
            let inputJoystick = { x: 0, y: 0 }; 
            let wantsSkill = false;
            let targetRotation = player.rotation;

            // Input Gathering
            if (player.id === 'player') {
                inputKeys = ctx.keys.current;
                inputMouse = ctx.mouse.current;
                if (ctx.joystick.current.active) inputJoystick = ctx.joystick.current.vector;
                wantsSkill = inputKeys.has('KeyF') || ctx.skillButton.current.active;
                targetRotation = ctx.playerTargetRotation.current;
                
                const canvas = ctx.canvasRef.current;
                if (canvas && !ctx.isMobile.current) {
                   const halfW = window.innerWidth / 2;
                   const halfH = window.innerHeight / 2;
                   const cameraX = ctx.camera.current.x;
                   const cameraY = ctx.camera.current.y;
                   const worldMouseX = inputMouse.x + cameraX - halfW;
                   const worldMouseY = inputMouse.y + cameraY - halfH;
                   
                   targetRotation = Math.atan2(worldMouseY - player.position.y, worldMouseX - player.position.x);
                   ctx.playerTargetRotation.current = targetRotation; 

                } else if (ctx.isMobile.current && ctx.fireButton.current.active) {
                   const center = { x: canvas!.width/2, y: canvas!.height/2 };
                   targetRotation = Math.atan2(inputMouse.y - center.y, inputMouse.x - center.x);
                }
            } else if (player.ownerId) {
                const netInput = ctx.network.current.getClientInput(player.ownerId);
                if (netInput) {
                    inputKeys = new Set(netInput.keys);
                    inputMouse = netInput.mouse; 
                    targetRotation = netInput.angle;
                    wantsSkill = netInput.skillActive;
                    if (inputKeys.has('KeyW')) inputJoystick.y -= 1;
                    if (inputKeys.has('KeyS')) inputJoystick.y += 1;
                    if (inputKeys.has('KeyA')) inputJoystick.x -= 1;
                    if (inputKeys.has('KeyD')) inputJoystick.x += 1;
                }
            }

            const weaponId = player.weaponId || 'basic';
            const weapon = EVOLUTION_TREE.find(w => w.id === weaponId) || EVOLUTION_TREE[0];
            const speedMult = getStatMultiplier(ctx.playerStats.current, '8'); 
            
            // Base Stats
            let maxSpeed = 5 * speedMult; // Adjusted base speed for better feel

            // SPEED PENALTY (INERTIA)
            const massFactor = 1 + ((player.level || 1) * GAMEPLAY_CONSTANTS.SPEED_PENALTY_PER_LEVEL);
            maxSpeed /= massFactor;
          
            if (!player.skillState) {
                player.skillState = { active: false, cooldown: 0, duration: 0, maxCooldown: weapon.skill ? weapon.skill.cooldown : 0 };
            }

            // --- SKILL ACTIVATION ---
            if (wantsSkill && player.skillState.cooldown <= 0 && weapon.skill) {
                activateSkill(ctx, player, weapon);
            }

            // Skill Timer Logic
            if (player.skillState.duration > 0) {
                player.skillState.duration--;
                if (player.skillState.duration <= 0) player.skillState.active = false;
            }
            if (player.skillState.cooldown > 0) player.skillState.cooldown--;

            // --- SKILL EFFECTS (Passive/Active Loop) ---
            if (player.skillState.active && weapon.skill) {
                 applyActiveSkill(ctx, player, weapon);
                 
                 const type = weapon.skill.type;
                 if (type === 'DASH') maxSpeed *= 2.5;
                 else if (type === 'OVERCLOCK' || type === 'BARRAGE') player.reloadTimer = -1;
                 else if (type === 'FORTIFY') maxSpeed *= 0.1;
                 else if (type === 'PHANTOM_STEP') maxSpeed *= 1.5;
                 else if (type === 'BERSERK') {
                     maxSpeed *= 1.3;
                     if (ctx.globalTick.current % 30 === 0) player.health -= 1; 
                 }
            }

            // --- MOVEMENT PHYSICS (FIXED) ---
            // 1. Calculate Move Vector
            let moveX = 0;
            let moveY = 0;
            if (inputKeys.has('KeyW')) moveY -= 1; 
            if (inputKeys.has('KeyS')) moveY += 1;
            if (inputKeys.has('KeyA')) moveX -= 1;
            if (inputKeys.has('KeyD')) moveX += 1;
            
            moveX += inputJoystick.x; 
            moveY += inputJoystick.y;

            // 2. Normalize Vector (Prevent diagonal speed boost)
            const len = Math.sqrt(moveX*moveX + moveY*moveY);
            if (len > 1) {
                moveX /= len;
                moveY /= len;
            }

            // 3. Physics Constants
            let friction = 0.90; // Standard grip
            if (activeEvent === 'LOW_GRAVITY') friction = 0.98; 

            const acceleration = maxSpeed * (1 - friction);

            // 4. Apply Force
            player.velocity.x += moveX * acceleration;
            player.velocity.y += moveY * acceleration;

            // 5. Apply Friction
            player.velocity.x *= friction; 
            player.velocity.y *= friction;

            // 6. Stop completely if very slow (prevent float)
            if (Math.abs(player.velocity.x) < 0.01) player.velocity.x = 0;
            if (Math.abs(player.velocity.y) < 0.01) player.velocity.y = 0;

            // Regen
            if (player.health < player.maxHealth) {
                let regenRate = 0.05;
                if (player.isSpike) regenRate *= 1.2;
                player.health = Math.min(player.maxHealth, player.health + regenRate);
            }

            player.rotation = lerpAngle(player.rotation, targetRotation, 0.2); 

            if (player.reloadTimer && player.reloadTimer > 0) player.reloadTimer--;
            
            const isFiring = inputMouse.down || inputKeys.has('KeyE') || (player.skillState?.active && (weapon.skill?.type === 'BARRAGE' || weapon.skill?.type === 'OVERCLOCK' || weapon.skill?.type === 'BERSERK'));
            const isDroneClass = weapon.type === 'Drone' || weapon.type === 'Necro' || weapon.type === 'Minion' || weapon.type === 'Swarm';
            
            if (isFiring || (isDroneClass && ctx.globalTick.current % 10 === 0)) {
               if ((!player.reloadTimer || player.reloadTimer <= 0)) {
                  fireWeapon(ctx, player, weapon);
                  if (settings.controls.haptic && ctx.isMobile.current && navigator.vibrate) {
                      navigator.vibrate(5); 
                  }
               }
            }

            // --- AAA CAMERA LOGIC (Look Ahead) ---
            if (player.id === 'player') {
                let targetX = player.position.x;
                let targetY = player.position.y;
                
                // Camera Lead: Shift camera towards mouse/aim direction
                // This lets players "peek" further in the direction they are aiming/moving
                if (!ctx.isMobile.current) {
                    // Desktop: Lead towards mouse
                    const halfW = window.innerWidth / 2;
                    const halfH = window.innerHeight / 2;
                    // Calculate mouse offset from center of screen (clamped)
                    const lookX = Math.max(-halfW, Math.min(halfW, inputMouse.x - halfW));
                    const lookY = Math.max(-halfH, Math.min(halfH, inputMouse.y - halfH));
                    
                    targetX += lookX * 0.25; // 25% aim bias
                    targetY += lookY * 0.25;
                } else {
                    // Mobile: Lead towards joystick movement
                    targetX += inputJoystick.x * 150;
                    targetY += inputJoystick.y * 150;
                }

                // Calculate Zoom based on Mass/Speed
                let targetZoom = 1.0 / Math.sqrt(sizeScale); 
                const currentSpeedSq = player.velocity.x**2 + player.velocity.y**2;
                const currentSpeed = Math.sqrt(currentSpeedSq);
                
                // Dynamic FOV widening when moving fast
                const speedFactor = Math.min(currentSpeed / 20, 1.0); 
                targetZoom -= speedFactor * 0.15; 
                
                // Specific Weapon Zooms
                if (weapon.id.includes('sniper') || weapon.id.includes('ranger') || weapon.id.includes('predator')) {
                    targetZoom *= 0.8; 
                    if (player.skillState?.active && weapon.skill?.type === 'STEALTH') targetZoom *= 0.8;
                }
                
                targetZoom = Math.max(0.35, Math.min(1.2, targetZoom));

                // Smooth Interpolation
                ctx.camera.current.x = lerp(ctx.camera.current.x, targetX, 0.15); // Slightly faster catch-up for responsiveness
                ctx.camera.current.y = lerp(ctx.camera.current.y, targetY, 0.15);
                
                // Apply Screenshake
                ctx.camera.current.shake *= 0.9;
                if (ctx.camera.current.shake > 0.5) {
                    ctx.camera.current.x += (Math.random()-0.5) * ctx.camera.current.shake;
                    ctx.camera.current.y += (Math.random()-0.5) * ctx.camera.current.shake;
                }
                
                ctx.camera.current.zoom = lerp(ctx.camera.current.zoom, targetZoom, 0.05);
            }
        });

        // Map Clamping
        const mapSize = ctx.gameState.current.mapSize;
        const halfMap = mapSize / 2;
        const allEntities = ctx.entities.current;
        
        for (let i = 0; i < allEntities.length; i++) {
            const e = allEntities[i];
            if (!e || e.type === EntityType.WALL || e.type === EntityType.ZONE || e.type === EntityType.PARTICLE) continue;
            
            let clamped = false;
            if (e.position.x < -halfMap + e.radius) { e.position.x = -halfMap + e.radius; e.velocity.x = 0; clamped = true; }
            else if (e.position.x > halfMap - e.radius) { e.position.x = halfMap - e.radius; e.velocity.x = 0; clamped = true; }
            if (e.position.y < -halfMap + e.radius) { e.position.y = -halfMap + e.radius; e.velocity.y = 0; clamped = true; }
            else if (e.position.y > halfMap - e.radius) { e.position.y = halfMap - e.radius; e.velocity.y = 0; clamped = true; }

            if (clamped && ['BULLET','MISSILE','LASER_BOLT','TRAP','DRONE','DRONE_TRIANGLE','DRONE_SQUARE'].includes(e.type)) {
                e.health = 0;
                spawnParticle(ctx, e.position, '#aaa', 'smoke');
            }
        }
    }
};
