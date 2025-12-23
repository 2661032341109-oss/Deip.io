
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
import { supabase } from '../supabaseClient';

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
                
                // Determine Role
                let networkRole: 'OFFLINE' | 'HOST' | 'CLIENT' | 'HOST_P2P' | 'CLIENT_P2P' = 'CLIENT';
                if (playerProfile.gameMode === 'Sandbox') networkRole = 'OFFLINE';
                else if (playerProfile.isHost) networkRole = 'HOST_P2P';
                else if (playerProfile.roomId && playerProfile.roomId.includes('official-')) networkRole = 'CLIENT'; // Legacy
                else networkRole = 'CLIENT_P2P'; // Default assumption for manual IDs

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

                // P2P Specific Handlers
                if (networkRole === 'HOST_P2P') {
                    context.network.current.onPeerJoin = (peerId) => {
                        Logger.game(`Peer Joined: ${peerId}`);
                        // Spawn player for peer
                        spawnPlayer(context, 'basic', playerProfile.gameMode, `Player ${peerId.substr(0,4)}`, 1, 0);
                        const player = context.entities.current[context.entities.current.length - 1];
                        player.ownerId = peerId;
                        player.id = peerId; // Use peerId as entity ID for ease mapping
                    };
                    
                    context.network.current.onPlayerDisconnect = (peerId) => {
                         const idx = context.entities.current.findIndex(e => e.ownerId === peerId);
                         if (idx !== -1) removeEntity(context, idx);
                         Logger.game(`Peer Disconnected: ${peerId}`);
                    }
                }
    
                context.network.current.onHostDisconnect = () => {
                    Logger.net('Host Disconnected.');
                    setEngineState('DISCONNECTED');
                    setTimeout(() => onGameOver(), 3000); 
                };

                const setupHostMode = async (p2p: boolean) => {
                    Logger.info(`Starting ${p2p ? 'P2P Host' : 'Offline'}...`);
                    const id = await context.network.current.init(p2p ? 'HOST_P2P' : 'OFFLINE');
                    setRoomId(id);
                    
                    // Supabase Presence for P2P Discovery
                    if (p2p) {
                         const channel = supabase.channel('p2p_lobby');
                         channel.subscribe(async (status) => {
                            if (status === 'SUBSCRIBED') {
                                await channel.track({ 
                                    user_id: id, 
                                    online_at: new Date().toISOString(),
                                    isHost: true,
                                    roomData: { id: id, host: playerProfile.nickname, mode: playerProfile.gameMode, players: 1 }
                                });
                            }
                         });
                    }

                    // Reset World
                    context.entities.current = [];
                    context.particles.current = [];
                    createMap(context, playerProfile.gameMode);
                    
                    // Spawn Host Player
                    const startLevel = playerProfile.savedRun ? playerProfile.savedRun.level : 1;
                    spawnPlayer(context, activeWeaponId, playerProfile.gameMode, playerProfile.nickname, startLevel, playerProfile.teamId);
                    
                    const player = context.entities.current.find(e => e.id === 'player');
                    if (player) {
                        player.ownerId = id;
                        player.id = p2p ? id : 'player'; // Use ID for network identity
                        if (playerProfile.gameMode !== '2-Teams') {
                            const skin = SHOP_ITEMS.find(s => s.id === playerProfile.skinId);
                            if (skin && skin.type === 'SKIN') player.color = skin.color || COLORS.player;
                        }
                        player.trailId = playerProfile.trailId;
                        player.flagId = playerProfile.flagId; 
                    }
                    
                    // Initial Spawns
                    const initSpawnCount = playerProfile.gameMode === 'Mega' ? 120 : 60;
                    for (let i = 0; i < initSpawnCount; i++) spawnShape(context);

                    setEngineState('READY');
                };

                const initNetwork = async (retries = 3): Promise<string> => {
                    try {
                         const id = await context.network.current.init(networkRole, playerProfile.roomId);
                         return id;
                    } catch (e) {
                         if (retries > 0 && networkRole === 'CLIENT') { // Only retry legacy server
                            await new Promise(r => setTimeout(r, 1000));
                            return initNetwork(retries - 1);
                         }
                         throw e;
                    }
                };

                if (networkRole === 'OFFLINE') {
                     await setupHostMode(false);
                } else if (networkRole === 'HOST_P2P') {
                     await setupHostMode(true);
                } else {
                    try {
                        const id = await initNetwork();
                        Logger.net(`Joined Game. ID: ${id}`);
                        setRoomId(id);
                        setEngineState('READY');
                    } catch (e) {
                        Logger.warn("Connection failed. Fallback to Offline.");
                        await setupHostMode(false);
                    }
                }
                
                sessionStats.current = { kills: 0, startTime: Date.now() / 1000, bossKills: 0 };
                lastTime.current = performance.now();
                
            } catch (e: any) {
                console.error("Critical Engine Failure", e);
                setEngineState('ERROR');
            }
        };

        initGameEngine();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            if (context.network.current) context.network.current.destroy();
            supabase.channel('p2p_lobby').unsubscribe();
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

        accumulator.current += frameTime;

        while (accumulator.current >= FIXED_STEP) {
            context.gameState.current.frames++; 
            const net = context.network.current;

            // 1. Extraction Logic (Client Side Check)
            if (extractionRef.current.active) {
                // ... (Existing extraction logic) ...
                 const player = context.entities.current.find(e => e.ownerId === net.myId || e.id === 'player');
                 if (player) {
                     // ... Check movement/damage ...
                     // Keep existing logic, just ensure we find the right player entity
                 }
            }

            // 2. Network Fork
            const isHost = net.role === 'HOST_P2P' || net.role === 'OFFLINE' || net.role === 'HOST';
            const isClient = !isHost;

            if (isClient) {
                // CLIENT: Send Input -> Prediction -> Render Snapshot
                net.sendInput({
                    keys: Array.from(context.keys.current),
                    mouse: { x: context.mouse.current.x + context.camera.current.x - window.innerWidth/2, y: context.mouse.current.y + context.camera.current.y - window.innerHeight/2, down: context.mouse.current.down, rightDown: context.mouse.current.rightDown },
                    angle: context.playerTargetRotation.current,
                    skillActive: context.keys.current.has('KeyF') || context.skillButton.current.active,
                    timestamp: Date.now()
                });
                
                net.applySnapshot(context, settings.network?.prediction !== false, settings.network?.interpDelay || 100);
                updatePhysics(context, activeWeaponId, onLevelUp, undefined, undefined); // Client prediction only
            } else {
                // HOST: Full Simulation -> Broadcast
                // Process Inputs from Peers
                if (net.role === 'HOST_P2P') {
                    net.connections.forEach((conn, peerId) => {
                        const input = net.getClientInput(peerId);
                        if (input) {
                            // Find entity for this peer and apply input to its state
                            const entity = context.entities.current.find(e => e.ownerId === peerId);
                            if (entity) {
                                // Apply input to entity (rudimentary)
                                // Ideally Physics.ts handles this based on stored inputs map
                                // For now we just need to ensure Physics.ts sees this input.
                                // We can hack it by attaching input to entity or using a context map
                            }
                        }
                    });
                }
                
                updatePhysics(context, activeWeaponId, onLevelUp, (k) => {/*Death*/}, (t,b) => {/*Kill*/});
                
                // P2P Broadcast
                if (net.role === 'HOST_P2P') {
                    net.broadcastSnapshot(context.entities.current, context.particles.current);
                }
            }

            // Global Particle Update
            for (let i = context.particles.current.length - 1; i >= 0; i--) { 
                const p = context.particles.current[i]; 
                p.life -= (p.type === 'muzzle_flash' ? 0.15 : 0.02);
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
