
import { useRef, useEffect, useState, useCallback } from 'react';
import { GameContext } from '../engine/GameContext';
import { PlayerProfile, GameSettings, ChatMessage, EntityType, Entity, Particle } from '../types';
import { soundManager } from '../engine/SoundManager';
import { NetworkManager } from '../engine/NetworkManager';
import { createMap } from '../engine/MapGenerator';
import { spawnPlayer, spawnShape, spawnLoot, removeParticle, removeEntity, recycleEntity, spawnParticle } from '../engine/Spawner';
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
    const extractionRef = useRef({ active: false, timer: 0, max: 180, startHealth: 0 });

    const initGameEngine = async () => {
        try {
            Logger.info(`Uplink Initializing...`);
            let networkRole: 'OFFLINE' | 'HOST' | 'CLIENT' = playerProfile.gameMode === 'Sandbox' ? 'OFFLINE' : 'CLIENT';
            if (playerProfile.isHost) networkRole = 'HOST';

            context.network.current.onChatMessage = (msg: ChatMessage) => {
                if (context.chatMessages.current.some(m => m.id === msg.id)) return;
                context.chatMessages.current.push(msg);
                if (context.chatMessages.current.length > 30) context.chatMessages.current.shift();
            };

            context.network.current.onPlayerDisconnect = (peerId: string) => {
                const idx = context.entities.current.findIndex(e => e.ownerId === peerId);
                if (idx !== -1) {
                    const e = context.entities.current[idx];
                    spawnParticle(context, e.position, '#ff0055', 'smoke');
                    removeEntity(context, idx);
                }
            };

            const id = await context.network.current.init(networkRole, playerProfile.roomId);
            setRoomId(id);

            if (context.network.current.role !== 'CLIENT') {
                createMap(context, playerProfile.gameMode);
                const startLevel = playerProfile.savedRun ? playerProfile.savedRun.level : 1;
                spawnPlayer(context, activeWeaponId, playerProfile.gameMode, playerProfile.nickname, startLevel, playerProfile.teamId);
                
                const p = context.entities.current.find(e => e.id === 'player');
                if (p) {
                    p.ownerId = id;
                    const skin = SHOP_ITEMS.find(s => s.id === playerProfile.skinId);
                    if (skin && playerProfile.gameMode !== '2-Teams') p.color = skin.color || COLORS.player;
                    p.trailId = playerProfile.trailId; p.flagId = playerProfile.flagId;
                }
                for (let i = 0; i < 60; i++) spawnShape(context);
            }
            
            setEngineState('READY');
            Logger.game('Engine READY. Session active.');
        } catch (e: any) {
            setEngineState('ERROR');
        }
    };

    useEffect(() => {
        initGameEngine();
        return () => {
            cancelAnimationFrame(animationFrameId.current);
            context.network.current.destroy();
        };
    }, []);

    const loop = useCallback(() => {
        if (engineState !== 'READY') { animationFrameId.current = requestAnimationFrame(loop); return; }
        
        const now = performance.now();
        const net = context.network.current;

        // Logic Update
        if (net.role === 'CLIENT') {
            net.sendInput({
                keys: Array.from(context.keys.current),
                mouse: { x: context.mouse.current.x + context.camera.current.x - window.innerWidth/2, y: context.mouse.current.y + context.camera.current.y - window.innerHeight/2, down: context.mouse.current.down, rightDown: context.mouse.current.rightDown },
                angle: context.playerTargetRotation.current,
                skillActive: context.keys.current.has('KeyF')
            });
            net.applySnapshot(context, settings.network?.prediction, settings.network?.interpDelay);
        } else {
            // Host creates players for connected peers automatically (Roblox style)
            net.connections.forEach(conn => {
                if (!context.entities.current.some(e => e.ownerId === conn.peer)) {
                    const startX = (Math.random() - 0.5) * 1000;
                    const startY = (Math.random() - 0.5) * 1000;
                    const newRemote = recycleEntity(context, {
                        id: `remote-${conn.peer}`, type: EntityType.PLAYER, position: { x: startX, y: startY },
                        velocity: { x: 0, y: 0 }, radius: 24, rotation: 0, health: 100, maxHealth: 100,
                        color: COLORS.player, ownerId: conn.peer, name: `Pilot_${conn.peer.substr(0, 3)}`, depth: 10,
                        weaponId: 'basic', score: 0, level: 1
                    });
                    // @ts-ignore
                    newRemote.isDropIn = true; newRemote.dropInTimer = 60;
                    context.entities.current.push(newRemote);
                    context.network.current.broadcastChat({ id: `sys-${Date.now()}`, sender: 'SYSTEM', text: `${newRemote.name} entered the mesh.`, timestamp: Date.now(), system: true });
                }
            });
            updatePhysics(context, activeWeaponId, onLevelUp, (k) => {
                 Persistence.clearSavedRun();
                 setDeathInfo({ killer: k, score: context.gameState.current.score, level: context.gameState.current.level });
            }, (t) => {});
            net.broadcastSnapshot(context.entities.current, context.particles.current);
        }

        // Particle Cleanup
        for (let i = context.particles.current.length - 1; i >= 0; i--) {
            const p = context.particles.current[i];
            p.life -= 0.02;
            p.position.x += p.velocity.x; p.position.y += p.velocity.y;
            if (p.life <= 0) removeParticle(context, i);
        }

        animationFrameId.current = requestAnimationFrame(loop);
    }, [engineState, activeWeaponId, settings]);

    useEffect(() => { 
        animationFrameId.current = requestAnimationFrame(loop); 
        return () => cancelAnimationFrame(animationFrameId.current); 
    }, [loop]);

    return { engineState, roomId, deathInfo, setDeathInfo, sessionStats, extractionRef, currentFps };
};
