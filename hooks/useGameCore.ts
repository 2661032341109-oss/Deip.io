
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
    const extractionRef = useRef<{ active: boolean; timer: number; max: number; startHealth: number; }>({ active: false, timer: 0, max: 180, startHealth: 0 });

    // Initialize Engine
    useEffect(() => {
        const initGameEngine = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 500)); 
                
                let networkRole: 'OFFLINE' | 'HOST' | 'CLIENT' = 'OFFLINE';
                if (playerProfile.roomId) networkRole = 'CLIENT'; 
                else if (playerProfile.gameMode === 'Sandbox') networkRole = 'OFFLINE';
                if (playerProfile.isHost) networkRole = 'HOST';
    
                Logger.info(`Engine Initializing. Mode: ${networkRole}`);
    
                // --- SETUP LISTENERS ---
                context.network.current.onChatMessage = (msg: ChatMessage) => {
                    context.chatMessages.current.push(msg);
                    if (context.chatMessages.current.length > 50) context.chatMessages.current.shift();
                    if (msg.ownerId) {
                        const sender = context.entities.current.find(e => e.ownerId === msg.ownerId);
                        if (sender) { sender.chatText = msg.text; sender.chatTimer = 300; }
                    }
                };
    
                context.network.current.onPlayerDisconnect = (peerId: string) => {
                    Logger.net(`Player ${peerId} disconnected.`);
                    const entityIdx = context.entities.current.findIndex(e => e.ownerId === peerId);
                    if (entityIdx !== -1) {
                        removeEntity(context, entityIdx);
                    }
                };
    
                context.network.current.onGameJoined = (myId: string) => {
                    // Client Side: We successfully joined.
                    // DO NOT SPAWN PLAYER HERE. Host will spawn us and send via Snapshot.
                    Logger.net(`Joined room. My ID is ${myId}`);
                };

                // --- NETWORK INIT ---
                let id = 'offline-fallback';
                try {
                    id = await context.network.current.init(networkRole, playerProfile.roomId);
                    Logger.net(`Network Ready. ID: ${id}`);
                } catch (e) {
                    console.warn("Network Error, falling back offline", e);
                    context.network.current.role = 'OFFLINE';
                    id = await context.network.current.init('OFFLINE');
                }
                
                if (context.network.current.role === 'HOST') setRoomId(id);
                else setRoomId(playerProfile.roomId || '');
    
                context.deadEntities.current = new Array(200).fill(null).map(() => ({} as Entity));
                context.deadParticles.current = new Array(400).fill(null).map(() => ({} as Particle));
    
                // --- HOST / OFFLINE SETUP ---
                if (context.network.current.role !== 'CLIENT') {
                    Logger.game('HOST: Generating World...');
                    createMap(context, playerProfile.gameMode);
                    
                    // Spawn HOST Player
                    // Use the Host's PeerID as the ownerId
                    spawnPlayer(context, activeWeaponId, playerProfile.gameMode, playerProfile.nickname, 1, playerProfile.teamId, id);
                    
                    const initSpawnCount = playerProfile.gameMode === 'Mega' ? 120 : 60;
                    for (let i = 0; i < initSpawnCount; i++) spawnShape(context);
                } else {
                    Logger.game('CLIENT: Waiting for snapshot...');
                }
                
                sessionStats.current = { kills: 0, startTime: Date.now() / 1000, bossKills: 0 };
                setEngineState('READY');

            } catch (e: any) {
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
        try {
            if (engineState !== 'READY') {
                animationFrameId.current = requestAnimationFrame(loop);
                return;
            }
        
            // --- TIME STEP ---
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
            const net = context.network.current;

            // --- CLIENT LOGIC ---
            if (net.role === 'CLIENT') {
                // 1. Send Input to Host
                net.sendInput({
                    keys: Array.from(context.keys.current),
                    mouse: { 
                        x: context.mouse.current.x + context.camera.current.x - window.innerWidth/2, 
                        y: context.mouse.current.y + context.camera.current.y - window.innerHeight/2, 
                        down: context.mouse.current.down, 
                        rightDown: context.mouse.current.rightDown 
                    },
                    angle: context.playerTargetRotation.current,
                    skillActive: context.keys.current.has('KeyF') || context.skillButton.current.active
                });
        
                // 2. Apply Snapshot (Updates everyone else, and potentially me)
                const prediction = settings.network?.prediction !== false;
                net.applySnapshot(context, prediction, 100);
                
                // 3. Client-Side Physics (ONLY for My Player Prediction & Particles)
                // We do NOT run full physics here to avoid "Possession/Sync Fighting"
                const myPlayer = context.entities.current.find(e => e.ownerId === net.myId);
                if (myPlayer && prediction) {
                    // Run a limited physics step just for local player movement to feel responsive
                    // Actual collision logic happens on server
                    // MovementSystem.update(context); // This runs for ALL players, which is bad on client
                    
                    // Specialized Client Movement (Simplified)
                    // We rely on snapshot lerping for now to guarantee sync, unless we refactor MovementSystem
                    // For "Possession" fix, disabling local physics prediction on others is key.
                    // The Physics.ts `updatePhysics` actually iterates everyone.
                    // Let's CALL updatePhysics but pass a flag? 
                    // No, cleaner is: Client calls updatePhysics, but Physics.ts knows to only touch 'ME'
                    
                    updatePhysics(context, activeWeaponId, onLevelUp, undefined, undefined); 
                } else {
                    // Update particles/visuals only
                    updatePhysics(context, activeWeaponId, onLevelUp, undefined, undefined);
                }
        
            } 
            // --- HOST / OFFLINE LOGIC ---
            else {
                // 1. Process New Connections (Spawn players)
                if (net.role === 'HOST') {
                    net.connections.forEach(conn => {
                        // Check if this peer has a player entity
                        const existingPlayer = context.entities.current.find(e => e.ownerId === conn.peer);
                        if (!existingPlayer) {
                            Logger.game(`Spawning Player for Client: ${conn.peer}`);
                            // SPAWN WITH SPECIFIC ID
                            spawnPlayer(context, 'basic', playerProfile.gameMode, `Operative ${conn.peer.substr(0,4)}`, 1, 2, conn.peer);
                        }
                    });
                }
        
                // 2. Run FULL Physics (Authoritative)
                // This updates positions based on the inputs mapped in NetworkManager
                updatePhysics(context, activeWeaponId, onLevelUp, (killer) => {
                    // Handle Death (Host side)
                    // For now, simpler death logic
                }, (type, isBoss) => {
                    // Handle Kill
                });
        
                // 3. Broadcast State
                if (net.role === 'HOST') {
                    net.broadcastSnapshot(context.entities.current, context.particles.current);
                }
            }
            
            // --- AUDIO VOLUME SYNC ---
            if (context.soundManager.current && context.soundManager.current.masterGain) {
               const sm = context.soundManager.current;
               const vol = settings.audio.master / 100;
               if (sm.masterGain.gain.value !== vol * 0.4) sm.masterGain.gain.value = vol * 0.4;
            }

        } catch (error) {
            console.error("Game Loop Error:", error);
        }
    
        animationFrameId.current = requestAnimationFrame(loop);
    }, [activeWeaponId, onLevelUp, engineState, roomId]);

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
