
import { useRef, useEffect, useState, useCallback } from 'react';
import { GameContext } from '../engine/GameContext';
import { PlayerProfile, GameSettings, ChatMessage, EntityType, Entity, Particle, Shockwave } from '../types';
import { soundManager } from '../engine/SoundManager';
import { NetworkManager } from '../engine/NetworkManager';
import { createMap } from '../engine/MapGenerator';
import { spawnPlayer, spawnShape, spawnLoot, removeParticle, removeEntity, recycleEntity } from '../engine/Spawner';
import { updatePhysics } from '../engine/Physics';
import { Logger } from '../engine/Logger';
import { COLORS } from '../constants';
import { SHOP_ITEMS, Persistence } from '../engine/Persistence';

export const useGameCore = (
    context: GameContext,
    playerProfile: PlayerProfile,
    settings: GameSettings,
    activeWeaponId: string,
    onGameOver: () => void,
    onLevelUp?: (level: number) => void
) => {
    const animationFrameId = useRef<number>(0);
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());
    const currentFps = useRef(0);
    const lastFrameTime = useRef(0);
    
    const [engineState, setEngineState] = useState<'INITIALIZING' | 'READY' | 'ERROR'>('INITIALIZING');
    const [roomId, setRoomId] = useState<string>('');
    const [deathInfo, setDeathInfo] = useState<{ killer: string, score: number, level: number, currencyEarned?: number } | null>(null);
    const sessionStats = useRef({ kills: 0, startTime: 0, bossKills: 0 });
    
    // Extraction State
    const extractionRef = useRef<{ active: boolean; timer: number; max: number; startHealth: number; }>({ active: false, timer: 0, max: 180, startHealth: 0 });

    useEffect(() => {
        const initGameEngine = async () => {
            try {
                // Ensure audio doesn't crash us, but initialize gracefully
                // soundManager.initialize() is called on user click, not here.
                
                await new Promise(resolve => setTimeout(resolve, 500)); 
                let networkRole: 'OFFLINE' | 'HOST' | 'CLIENT' = 'OFFLINE';
                if (playerProfile.roomId) networkRole = 'CLIENT'; 
                else if (playerProfile.gameMode === 'Sandbox') networkRole = 'OFFLINE';
                if (playerProfile.isHost) networkRole = 'HOST';
    
                Logger.info(`Engine Initializing. Mode: ${networkRole}`);
    
                // --- SETUP LISTENERS ---
                context.network.current.onChatMessage = (msg: ChatMessage) => {
                    const exists = context.chatMessages.current.some(m => m.id === msg.id);
                    if (!exists) {
                        context.chatMessages.current.push(msg);
                        if (context.chatMessages.current.length > 50) context.chatMessages.current.shift();
                        if (msg.ownerId) {
                            const senderEntity = context.entities.current.find(e => e.ownerId === msg.ownerId);
                            if (senderEntity) { senderEntity.chatText = msg.text; senderEntity.chatTimer = 300; }
                        }
                    }
                };
    
                context.network.current.onPlayerDisconnect = (peerId: string) => {
                    Logger.net(`Player ${peerId} disconnected.`);
                    const entityIdx = context.entities.current.findIndex(e => e.ownerId === peerId);
                    if (entityIdx !== -1) {
                        const entity = context.entities.current[entityIdx];
                        if (entity.score && entity.score > 0) {
                            spawnLoot(context, entity.position, entity.score);
                        }
                        removeEntity(context, entityIdx);
                        
                        const msg: ChatMessage = {
                            id: `sys-${Date.now()}`, sender: 'SYSTEM', text: `${entity.name || 'Unknown'} disconnected.`, timestamp: Date.now(), system: true
                        };
                        context.chatMessages.current.push(msg);
                        context.network.current.broadcastChat(msg);
                    }
                };
    
                context.network.current.onHostDisconnect = () => {
                    Logger.net('Host disconnected! Connection lost.');
                    alert('Connection to Host lost.');
                    onGameOver();
                };
    
                // --- ROBUST NETWORK INIT WITH TIMEOUT FALLBACK ---
                let id = 'offline-fallback';
                try {
                    // Create a timeout promise that rejects after 5 seconds
                    const timeoutPromise = new Promise<string>((_, reject) => 
                        setTimeout(() => reject(new Error('Network Timeout')), 5000)
                    );
                    
                    // Race between network init and timeout
                    id = await Promise.race([
                        context.network.current.init(networkRole, playerProfile.roomId),
                        timeoutPromise
                    ]);
                    
                    Logger.net(`Network Initialized. ID: ${id}`);
                } catch (netErr) {
                    console.warn("Network init failed or timed out, falling back to OFFLINE mode.", netErr);
                    Logger.warn("Network unavailable. Starting in Offline Mode.");
                    // Force fallback
                    context.network.current.role = 'OFFLINE';
                    id = await context.network.current.init('OFFLINE');
                }
                
                if (context.network.current.role === 'HOST') setRoomId(id);
                else if (context.network.current.role === 'CLIENT') setRoomId(playerProfile.roomId || '');
    
                context.deadEntities.current = new Array(200).fill(null).map(() => ({} as Entity));
                context.deadParticles.current = new Array(400).fill(null).map(() => ({} as Particle));
    
                // --- GAME START LOGIC ---
                // Only spawn player if we are the Host or Offline (Client waits for snapshot)
                if (context.network.current.role !== 'CLIENT') {
                    Logger.game('Generating World...');
                    createMap(context, playerProfile.gameMode);
                    
                    const startLevel = playerProfile.savedRun ? playerProfile.savedRun.level : 1;
                    
                    // Force spawn regardless of map gen success
                    spawnPlayer(context, activeWeaponId, playerProfile.gameMode, playerProfile.nickname, startLevel, playerProfile.teamId);
                    
                    const player = context.entities.current.find(e => e.id === 'player');
                    if (player) {
                        player.ownerId = id;
                        if (playerProfile.gameMode !== '2-Teams') {
                            const skin = SHOP_ITEMS.find(s => s.id === playerProfile.skinId);
                            if (skin && skin.type === 'SKIN') player.color = skin.color || COLORS.player;
                        }
                        player.trailId = playerProfile.trailId;
                        player.flagId = playerProfile.flagId; 
                    } else {
                        Logger.error("CRITICAL: Player entity not found after spawn!");
                    }

                    sessionStats.current = { kills: 0, startTime: Date.now() / 1000, bossKills: 0 };
                    
                    const initSpawnCount = playerProfile.gameMode === 'Mega' ? 120 : 60;
                    for (let i = 0; i < initSpawnCount; i++) spawnShape(context);
                    
                    Logger.game('World Ready.');
                } else {
                    Logger.game('Waiting for Host Snapshot...');
                }
                
                if (context.chatMessages.current.length === 0) {
                    const sysMsg = { id: 'sys-init', sender: 'SYSTEM', text: 'Chat Online. Press [ENTER] to talk.', timestamp: Date.now(), system: true };
                    context.chatMessages.current.push(sysMsg);
                }
                
                setEngineState('READY');
            } catch (e: any) {
                console.error("Engine Init Failed", e);
                Logger.error(`Engine Init Failed: ${e.message}`);
                setEngineState('ERROR');
            }
        };

        initGameEngine();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            if (context.network.current) context.network.current.destroy();
        };
    }, []);

    const loop = useCallback(() => {
        // --- SAFETY NET: Try-Catch Block for the entire loop ---
        try {
            if (engineState !== 'READY') {
                animationFrameId.current = requestAnimationFrame(loop);
                return;
            }
        
            const now = performance.now();
            let fpsLimit = settings.advanced?.fpsCap || 0;
            if (settings.advanced?.batterySaver && context.isMobile.current) fpsLimit = 30; 
            
            if (fpsLimit > 0) {
                const elapsed = now - lastFrameTime.current;
                const interval = 1000 / fpsLimit;
                if (elapsed < interval) { animationFrameId.current = requestAnimationFrame(loop); return; }
                lastFrameTime.current = now - (elapsed % interval);
            } else { lastFrameTime.current = now; }
        
            frameCount.current++;
            if (now - lastTime.current >= 1000) {
                currentFps.current = frameCount.current;
                frameCount.current = 0;
                lastTime.current = now;
            }
            context.gameState.current.frames++; 
        
            // Extraction Logic
            if (extractionRef.current.active) {
                const player = context.entities.current.find(e => e.id === 'player');
                if (player) {
                    const isMoving = Math.abs(player.velocity.x) > 0.5 || Math.abs(player.velocity.y) > 0.5;
                    const isDamaged = player.health < extractionRef.current.startHealth;
                    const isShooting = context.mouse.current.down || context.keys.current.has('KeyE');
        
                    if (isMoving || isDamaged || isShooting) {
                        extractionRef.current.active = false;
                        soundManager.playUiClick(); 
                    } else {
                        extractionRef.current.timer--;
                        if (extractionRef.current.timer <= 0) {
                            extractionRef.current.active = false;
                            Persistence.saveRun({
                                level: context.gameState.current.level,
                                score: context.gameState.current.score,
                                weaponId: activeWeaponId,
                                stats: context.playerStats.current,
                                timestamp: Date.now(),
                                gameMode: playerProfile.gameMode
                            });
                            Logger.game("Extraction Successful.");
                            onGameOver();
                            return; 
                        }
                    }
                    if (extractionRef.current.active) extractionRef.current.startHealth = player.health;
                } else {
                    extractionRef.current.active = false;
                }
            }
        
            // Sound Engine Update (Safe)
            if (context.soundManager.current && context.soundManager.current.masterGain) {
               const sm = context.soundManager.current;
               const vol = settings.audio.master / 100;
               // Safe assignment check
               if (sm.masterGain && sm.masterGain.gain.value !== vol * 0.4) {
                   sm.masterGain.gain.value = vol * 0.4;
               }
            }
        
            const net = context.network.current;
        
            const handleDeath = (killerName: string) => {
                Persistence.clearSavedRun();
                extractionRef.current.active = false; 
        
                const finalScore = context.gameState.current.score;
                const timeAlive = (Date.now() / 1000) - sessionStats.current.startTime;
                
                let rewards = { currencyEarned: 0, expEarned: 0, completedMissions: 0 };
                if (playerProfile.gameMode !== 'Sandbox') {
                    rewards = Persistence.processMatchResult({
                        score: finalScore, kills: sessionStats.current.kills,
                        timeAlive: timeAlive, level: context.gameState.current.level,
                        bossKills: sessionStats.current.bossKills
                    });
                }
        
                Logger.game(`Player died. Score: ${finalScore}, Killer: ${killerName}`);
                
                const player = context.entities.current.find(e => e.id === 'player');
                if (player) spawnLoot(context, player.position, finalScore);
        
                setDeathInfo({ killer: killerName, score: finalScore, level: context.gameState.current.level, currencyEarned: rewards.currencyEarned });
                soundManager.playExplosion();
            };
        
            const onKill = (type: EntityType, isBoss: boolean = false) => {
                if (type === EntityType.PLAYER || type === EntityType.ENEMY) {
                    sessionStats.current.kills++;
                    if (isBoss) {
                        sessionStats.current.bossKills++; 
                        Logger.game('BOSS DOWN!');
                    }
                    
                    context.gameState.current.killStreak++;
                    context.gameState.current.streakTimer = 600; 
                    
                    const streak = context.gameState.current.killStreak;
                    if (streak >= 2) {
                        soundManager.playKillConfirm(); 
                        if (streak >= 5) soundManager.playExplosion(); 
                    }
                }
            };
        
            if (net.role === 'CLIENT') {
                net.sendInput({
                    keys: Array.from(context.keys.current),
                    mouse: { x: context.mouse.current.x + context.camera.current.x - window.innerWidth/2, y: context.mouse.current.y + context.camera.current.y - window.innerHeight/2, down: context.mouse.current.down, rightDown: context.mouse.current.rightDown },
                    angle: context.playerTargetRotation.current,
                    skillActive: context.keys.current.has('KeyF') || context.skillButton.current.active
                });
        
                const prediction = settings.network?.prediction !== false;
                const interpDelay = settings.network?.interpDelay || 100;
                net.applySnapshot(context, prediction, interpDelay);
        
                updatePhysics(context, activeWeaponId, onLevelUp, handleDeath, onKill);
        
            } else {
                // HOST or OFFLINE Logic
                if (net.role === 'HOST') {
                    net.connections.forEach(conn => {
                        const exists = context.entities.current.find(e => e.ownerId === conn.peer);
                        if (!exists) {
                            context.entities.current.push(recycleEntity(context, {
                                id: `player-${conn.peer}`, type: EntityType.PLAYER,
                                position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, radius: 24, rotation: 0,
                                health: 100, maxHealth: 100, color: COLORS.player, depth: 10,
                                name: `Operative ${conn.peer.substr(0,4)}`, weaponId: 'basic', teamId: 1, ownerId: conn.peer,
                                barrelRecoils: [0], score: 0, level: 1
                            }));
                        }
                    });
                }
        
                updatePhysics(context, activeWeaponId, onLevelUp, handleDeath, onKill);
                
                // Particle Cleanup
                for (let i = context.particles.current.length - 1; i >= 0; i--) { 
                    const p = context.particles.current[i]; 
                    if (p.type === 'muzzle_flash') p.life -= 0.15; 
                    else { 
                        p.life -= 0.02; 
                        if (p.type === 'text') p.velocity.y += 0.1;
                        else { p.velocity.x *= 0.94; p.velocity.y *= 0.94; }
                        if (p.type === 'debris') {
                            p.velocity.x *= 0.92; p.velocity.y *= 0.92; p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0);
                        }
                    } 
                    p.position.x += p.velocity.x; p.position.y += p.velocity.y;
                    if (p.life <= 0) removeParticle(context, i); 
                }
                
                for (let i = context.shockwaves.current.length - 1; i >= 0; i--) {
                    const wave = context.shockwaves.current[i];
                    wave.life -= 0.03;
                    wave.radius += (wave.maxRadius - wave.radius) * 0.1;
                    if (wave.life <= 0) context.shockwaves.current.splice(i, 1);
                }
        
                const hostPlayer = context.entities.current.find(e => e.id === 'player');
                if (hostPlayer) hostPlayer.score = context.gameState.current.score;
        
                if (net.role === 'HOST') net.broadcastSnapshot(context.entities.current, context.particles.current);
            }
        } catch (error) {
            console.error("Critical Loop Error caught:", error);
            // Optional: You could set engineState to 'ERROR' here if you want to stop the loop,
            // but for resilience, logging and continuing next frame is often better for minor glitches.
        }
    
        animationFrameId.current = requestAnimationFrame(loop);
    }, [activeWeaponId, onLevelUp, onGameOver, engineState, roomId, deathInfo, settings]);

    useEffect(() => { 
        animationFrameId.current = requestAnimationFrame(loop); 
        return () => cancelAnimationFrame(animationFrameId.current); 
    }, [loop]);

    return {
        engineState,
        roomId,
        deathInfo,
        setDeathInfo,
        sessionStats,
        extractionRef,
        currentFps
    };
};
