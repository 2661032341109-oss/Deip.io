
import { useRef, useEffect, useState, useCallback } from 'react';
import { GameContext } from '../engine/GameContext';
import { PlayerProfile, GameSettings, ChatMessage, EntityType, Entity, Particle } from '../types';
import { soundManager } from '../engine/SoundManager';
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
    
    // --- FIXED TIMESTEP (60Hz Physics) ---
    const accumulator = useRef(0);
    const FIXED_STEP = 1000 / 60; 
    const MAX_ACCUMULATOR = 250;
    
    const [engineState, setEngineState] = useState<'INITIALIZING' | 'READY' | 'ERROR' | 'DISCONNECTED'>('INITIALIZING');
    const [roomId, setRoomId] = useState<string>('');
    const [deathInfo, setDeathInfo] = useState<{ killer: string, score: number, level: number, currencyEarned?: number } | null>(null);
    const sessionStats = useRef({ kills: 0, startTime: 0, bossKills: 0 });
    const extractionRef = useRef<{ active: boolean; timer: number; max: number; startHealth: number; }>({ active: false, timer: 0, max: 180, startHealth: 0 });

    useEffect(() => {
        const initGameEngine = async () => {
            try {
                soundManager.initialize();
                await new Promise(resolve => setTimeout(resolve, 500)); 
                
                let networkRole: 'OFFLINE' | 'HOST' | 'CLIENT' = 'CLIENT';
                
                // Explicitly set offline if sandbox
                if (playerProfile.gameMode === 'Sandbox') networkRole = 'OFFLINE';
    
                Logger.info(`Engine Initializing. Target Role: ${networkRole}`);
    
                // Chat Listener
                context.network.current.onChatMessage = (msg: ChatMessage) => {
                    if (!context.chatMessages.current.some(m => m.id === msg.id)) {
                        context.chatMessages.current.push(msg);
                        if (context.chatMessages.current.length > 50) context.chatMessages.current.shift();
                        if (msg.ownerId) {
                            const sender = context.entities.current.find(e => e.ownerId === msg.ownerId);
                            if (sender) { sender.chatText = msg.text; sender.chatTimer = 300; }
                        }
                    }
                };
    
                // Disconnect Handler
                context.network.current.onHostDisconnect = () => {
                    Logger.net('Connection to Server Lost.');
                    setEngineState('DISCONNECTED');
                    setTimeout(() => onGameOver(), 3000); 
                };

                const setupOfflineMode = async () => {
                    Logger.info("Starting Offline Simulation...");
                    const id = await context.network.current.init('OFFLINE');
                    setRoomId('offline');
                    
                    // Clear existing if any
                    context.entities.current = [];
                    context.particles.current = [];

                    createMap(context, playerProfile.gameMode);
                    const startLevel = playerProfile.savedRun ? playerProfile.savedRun.level : 1;
                    spawnPlayer(context, activeWeaponId, playerProfile.gameMode, playerProfile.nickname, startLevel, playerProfile.teamId);
                    
                    // Setup Local Player properties
                    const player = context.entities.current.find(e => e.id === 'player');
                    if (player) {
                        player.ownerId = id;
                        if (playerProfile.gameMode !== '2-Teams') {
                            const skin = SHOP_ITEMS.find(s => s.id === playerProfile.skinId);
                            if (skin && skin.type === 'SKIN') player.color = skin.color || COLORS.player;
                        }
                        player.trailId = playerProfile.trailId;
                        player.flagId = playerProfile.flagId; 
                    }
                    
                    // Initial Spawns for Offline
                    const initSpawnCount = playerProfile.gameMode === 'Mega' ? 120 : 60;
                    for (let i = 0; i < initSpawnCount; i++) spawnShape(context);

                    if (context.chatMessages.current.length === 0) {
                        context.chatMessages.current.push({ id: 'sys-init', sender: 'SYSTEM', text: 'Offline Mode Active.', timestamp: Date.now(), system: true });
                    }
                    setEngineState('READY');
                };
    
                // Init Network with Retry Logic
                const initNetwork = async (retries = 3): Promise<string> => {
                    try {
                         // We wait longer (5s) for connection to establish before failing
                         const connectionPromise = context.network.current.init(networkRole, playerProfile.roomId);
                         const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection Timeout")), 5000));
                         return await Promise.race([connectionPromise, timeoutPromise]) as string;
                    } catch (e) {
                        if (retries > 0) {
                            Logger.warn(`Connection failed, retrying... (${retries} left)`);
                            await new Promise(r => setTimeout(r, 1000));
                            return initNetwork(retries - 1);
                        }
                        throw e;
                    }
                };

                let id: string = '';
                if (networkRole === 'OFFLINE') {
                     await setupOfflineMode();
                } else {
                    try {
                        id = await initNetwork();
                        Logger.net(`Network Ready. Session: ${id}`);
                        setRoomId(id);
                        if (context.chatMessages.current.length === 0) {
                            context.chatMessages.current.push({ id: 'sys-init', sender: 'SYSTEM', text: 'Connected to Global Server.', timestamp: Date.now(), system: true });
                        }
                        setEngineState('READY');
                    } catch (e) {
                        Logger.warn("Server connection failed. Activating Neural Fallback Protocol (Offline Mode).");
                        // Fallback to offline mode seamlessly
                        context.network.current.destroy(); // Clean up failed connection attempts
                        await setupOfflineMode();
                    }
                }
                
                sessionStats.current = { kills: 0, startTime: Date.now() / 1000, bossKills: 0 };
                lastTime.current = performance.now();
                
            } catch (e: any) {
                console.error("Critical Engine Failure", e);
                setEngineState('ERROR');
                setTimeout(() => onGameOver(), 4000);
            }
        };

        initGameEngine();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            if (context.network.current) context.network.current.destroy();
        };
    }, []);

    // --- MAIN LOOP ---
    const loop = useCallback(() => {
        if (engineState !== 'READY') {
            if (engineState === 'DISCONNECTED' || engineState === 'ERROR') return;
            animationFrameId.current = requestAnimationFrame(loop);
            return;
        }
    
        const now = performance.now();
        let frameTime = now - lastTime.current;
        lastTime.current = now;

        if (frameTime > MAX_ACCUMULATOR) frameTime = MAX_ACCUMULATOR;

        frameCount.current++;
        if (Math.floor(now / 1000) > Math.floor((now - frameTime) / 1000)) {
             currentFps.current = frameCount.current;
             frameCount.current = 0;
        }
    
        accumulator.current += frameTime;

        // --- PHYSICS STEPS ---
        while (accumulator.current >= FIXED_STEP) {
            context.gameState.current.frames++; 
            const net = context.network.current;

            // 1. Extraction Logic
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

            // 2. Logic Handler Helpers
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
                const player = context.entities.current.find(e => e.id === 'player');
                // Client-side visual only for death loot
                if (player) spawnLoot(context, player.position, finalScore);
                setDeathInfo({ killer: killerName, score: finalScore, level: context.gameState.current.level, currencyEarned: rewards.currencyEarned });
                soundManager.playExplosion();
            };
        
            const onKill = (type: EntityType, isBoss: boolean = false) => {
                if (type === EntityType.PLAYER || type === EntityType.ENEMY) {
                    sessionStats.current.kills++;
                    if (isBoss) sessionStats.current.bossKills++; 
                    context.gameState.current.killStreak++;
                    context.gameState.current.streakTimer = 600; 
                    const streak = context.gameState.current.killStreak;
                    if (streak >= 2) {
                        soundManager.playKillConfirm(); 
                        if (streak >= 5) soundManager.playExplosion(); 
                    }
                }
            };

            // 3. Network Fork
            if (net.role === 'CLIENT') {
                // ONLINE: Send Input -> Interpolate Snapshot -> Client Prediction
                net.sendInput({
                    keys: Array.from(context.keys.current),
                    mouse: { x: context.mouse.current.x + context.camera.current.x - window.innerWidth/2, y: context.mouse.current.y + context.camera.current.y - window.innerHeight/2, down: context.mouse.current.down, rightDown: context.mouse.current.rightDown },
                    angle: context.playerTargetRotation.current,
                    skillActive: context.keys.current.has('KeyF') || context.skillButton.current.active,
                    timestamp: Date.now()
                });
                
                // Apply server updates
                net.applySnapshot(context, settings.network?.prediction !== false, settings.network?.interpDelay || 100);
                
                // Run local physics for prediction (mostly just our own movement)
                updatePhysics(context, activeWeaponId, onLevelUp, handleDeath, onKill);

            } else {
                // OFFLINE: Full local simulation
                updatePhysics(context, activeWeaponId, onLevelUp, handleDeath, onKill);
                
                const hostPlayer = context.entities.current.find(e => e.id === 'player');
                if (hostPlayer) hostPlayer.score = context.gameState.current.score;
            }

            // Global Particle Update
            for (let i = context.particles.current.length - 1; i >= 0; i--) { 
                const p = context.particles.current[i]; 
                if (p.type === 'muzzle_flash') p.life -= 0.15; 
                else { 
                    p.life -= 0.02; 
                    if (p.type === 'text') p.velocity.y += 0.1;
                    else { p.velocity.x *= 0.94; p.velocity.y *= 0.94; }
                    if (p.type === 'debris') { p.velocity.x *= 0.92; p.velocity.y *= 0.92; p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0); }
                } 
                p.position.x += p.velocity.x; p.position.y += p.velocity.y;
                if (p.life <= 0) removeParticle(context, i); 
            }

            accumulator.current -= FIXED_STEP;
        }

        // Audio Logic
        if (context.soundManager.current) {
           const sm = context.soundManager.current;
           const vol = settings.audio.master / 100;
           if (sm.masterGain.gain.value !== vol * 0.4) sm.masterGain.gain.value = vol * 0.4;
        }
    
        animationFrameId.current = requestAnimationFrame(loop);
    }, [activeWeaponId, onLevelUp, onGameOver, engineState, roomId, deathInfo, settings]);

    useEffect(() => { 
        animationFrameId.current = requestAnimationFrame(loop); 
        return () => cancelAnimationFrame(animationFrameId.current); 
    }, [loop]);

    return { engineState, roomId, deathInfo, setDeathInfo, sessionStats, extractionRef, currentFps };
};
