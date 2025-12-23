import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Entity, Particle, PlayerProfile, PlayerStatsUpgrade, SandboxOptions, LeaderboardEntry, GameSettings, ChatMessage, KillFeedEntry, WorldEventType, Shockwave } from '../types';
import { UPGRADE_TEMPLATE, EVOLUTION_TREE, COLORS } from '../constants';
import { GameContext } from '../engine/GameContext';
import { spawnParticle, spawnPlayer } from '../engine/Spawner';
import { drawScene, drawMinimap } from '../engine/Renderer';
import { soundManager } from '../engine/SoundManager';
import { NetworkManager } from '../engine/NetworkManager';
import { Persistence, SHOP_ITEMS } from '../engine/Persistence'; 
import { Logger } from '../engine/Logger'; 
import { Loader2, Hexagon } from 'lucide-react';
import { DeathScreen } from './DeathScreen';
import { useGameInput } from '../hooks/useGameInput'; 
import { useGameSignals } from '../hooks/useGameSignals'; 
import { useGameCore } from '../hooks/useGameCore';
import { DebugPanel } from './debug/DebugPanel'; 

interface GameCanvasProps {
  playerProfile: PlayerProfile;
  settings: GameSettings;
  onUpdateStats: (stats: any) => void;
  onGameOver: () => void; 
  onLevelUp?: (level: number) => void;
  activeWeaponId: string;
  sandboxOptions: SandboxOptions;
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  isAdmin: boolean; 
}

export interface GameCanvasHandle {
  upgradeStat: (id: string) => void;
  sendChat: (text: string) => void;
  handleSafeExit: () => void; 
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ 
  playerProfile, 
  settings,
  onUpdateStats, 
  onGameOver, 
  onLevelUp,
  activeWeaponId,
  sandboxOptions,
  minimapRef,
  isAdmin 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef<GameSettings>(settings);
  const hasProcessedSave = useRef(false);
  const killFeedRef = useRef<KillFeedEntry[]>([]);
  
  const [isSpectating, setIsSpectating] = useState(false);
  const [showDebug, setShowDebug] = useState(false); 
  const spectateTargetRef = useRef<string | null>(null); 
  const spectateIndexRef = useRef<number>(0); 

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // --- CORE CONTEXT INITIALIZATION ---
  const context: GameContext = {
      canvasRef,
      minimapRef,
      entities: useRef<Entity[]>([]),
      particles: useRef<Particle[]>([]),
      shockwaves: useRef<Shockwave[]>([]), 
      deadEntities: useRef<Entity[]>([]),
      deadParticles: useRef<Particle[]>([]),
      lightningBeams: useRef([]),
      camera: useRef({ x: 0, y: 0, zoom: 1, shake: 0 }),
      mouse: useRef({ x: 0, y: 0, down: false, rightDown: false }),
      keys: useRef<Set<string>>(new Set()),
      joystick: useRef({ active: false, id: null, origin: { x: 0, y: 0 }, curr: { x: 0, y: 0 }, vector: { x: 0, y: 0 } }),
      fireButton: useRef({ active: false, id: null }),
      skillButton: useRef({ active: false, id: null }), 
      gameState: useRef({ 
          score: 0, level: 1, exp: 0, nextLevelExp: 50, frames: 0, upgradesPoints: 0, mapSize: 4000, gameMode: playerProfile.gameMode,
          killStreak: 0, streakTimer: 0
      }), 
      worldEvent: useRef({ type: 'NONE' as WorldEventType, timeLeft: 0, timer: 3600 }), 
      playerStats: useRef<PlayerStatsUpgrade[]>(JSON.parse(JSON.stringify(UPGRADE_TEMPLATE))),
      playerTargetRotation: useRef(0),
      isAdminMode: useRef(isAdmin), 
      globalTick: useRef(0),
      isMobile: useRef(false),
      stars: useRef(Array.from({ length: 200 }, () => ({ 
          x: Math.random() * 4000, y: Math.random() * 4000, 
          size: Math.random() * 2 + 0.5, alpha: Math.random() * 0.5 + 0.3, layer: Math.random() * 2 + 0.1 
      }))),
      soundManager: useRef(soundManager), 
      network: useRef(new NetworkManager()),
      settings: settingsRef,
      chatMessages: useRef<ChatMessage[]>([])
  };

  // --- HOOKS: Logic Injection ---
  const { engineState, roomId, deathInfo, setDeathInfo, sessionStats, extractionRef, currentFps } = useGameCore(context, playerProfile, settings, activeWeaponId, onGameOver, onLevelUp);
  useGameInput(context); 
  useGameSignals(context, sandboxOptions, engineState, deathInfo); 

  const upgradeStat = (id: string) => {
    const stat = context.playerStats.current.find(s => s.id === id);
    if (stat && stat.level < stat.maxLevel && context.gameState.current.upgradesPoints > 0) {
      stat.level++;
      context.gameState.current.upgradesPoints--;
      const player = context.entities.current.find(e => e.id === 'player');
      if (player) spawnParticle(context, player.position, '#00ff9d', 'text', `+${stat.label}`);
      soundManager.playUiClick();
    }
  };

  const sendChat = (text: string) => {
      if (text === '/debug') { setShowDebug(prev => !prev); return; }
      if (!text.trim()) return;
      const myId = context.network.current.myId;
      const msg: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sender: playerProfile.nickname || 'Operative',
          text: text.substring(0, 60), 
          timestamp: Date.now(),
          ownerId: myId
      };
      context.chatMessages.current.push(msg);
      if (context.chatMessages.current.length > 50) context.chatMessages.current.shift();
      const player = context.entities.current.find(e => e.id === 'player');
      if (player) { player.chatText = msg.text; player.chatTimer = 300; if (!player.ownerId || player.ownerId !== myId) player.ownerId = myId; }
      if (context.network.current.role !== 'OFFLINE') context.network.current.sendChat(msg);
  };

  const handleSafeExit = () => {
      if (extractionRef.current.active) {
          extractionRef.current.active = false;
          const player = context.entities.current.find(e => e.id === 'player');
          if (player) spawnParticle(context, player.position, '#ff0000', 'text', 'ABORTED');
          return;
      }

      const player = context.entities.current.find(e => e.id === 'player');
      if (!player) { onGameOver(); return; }

      if (playerProfile.gameMode === 'Sandbox') {
          spawnParticle(context, player.position, '#aaaaaa', 'text', 'SIMULATION ENDED');
          Logger.info("Sandbox session ended. No progress saved.");
          onGameOver();
          return;
      }

      const lastCombat = player.lastCombatTime || 0;
      const timeSinceCombat = Date.now() - lastCombat;
      const SAFE_THRESHOLD = 10000; 

      if (timeSinceCombat < SAFE_THRESHOLD) {
          const timeLeft = ((SAFE_THRESHOLD - timeSinceCombat) / 1000).toFixed(1);
          spawnParticle(context, player.position, '#ff0000', 'text', `COMBAT ACTIVE! ${timeLeft}s`);
          return; 
      }

      extractionRef.current = {
          active: true,
          timer: 180, // 3 seconds
          max: 180,
          startHealth: player.health
      };
      spawnParticle(context, player.position, '#00f3ff', 'ring');
      Logger.game("Initializing Safe Extraction...");
  };

  useImperativeHandle(ref, () => ({ upgradeStat, sendChat, handleSafeExit }));

  // Restore Save Data (One-time check on Ready)
  useEffect(() => {
     if (engineState !== 'READY') return;
     const player = context.entities.current.find(e => e.id === 'player'); 
     let localPlayer = player;
     if (context.network.current.role === 'CLIENT') {
         localPlayer = context.entities.current.find(e => e.ownerId === context.network.current.myId);
     }
     
     if (playerProfile.savedRun && localPlayer && !hasProcessedSave.current) {
         Logger.info("Restoring Operative Data...");
         
         const runData = playerProfile.savedRun;
         localPlayer.level = runData.level;
         localPlayer.score = runData.score;
         context.gameState.current.level = runData.level;
         context.gameState.current.score = runData.score;
         context.gameState.current.upgradesPoints = Math.max(0, runData.level - 1); 
         context.playerStats.current = JSON.parse(JSON.stringify(UPGRADE_TEMPLATE));
         
         let nextExp = 50;
         for(let i=1; i<runData.level; i++) nextExp *= 1.1; 
         context.gameState.current.nextLevelExp = nextExp;

         spawnParticle(context, localPlayer.position, '#00ff00', 'text', `RANK ${runData.level} RESTORED`);
         Persistence.clearSavedRun(); 
         hasProcessedSave.current = true;
     }

     if (localPlayer) {
         localPlayer.weaponId = activeWeaponId;
         const weapon = EVOLUTION_TREE.find(w => w.id === activeWeaponId);
         if (weapon) {
             localPlayer.barrelRecoils = new Array(weapon.barrels.length).fill(0);
             localPlayer.isSpike = weapon.bodyType === 'Spike';
             localPlayer.skillState = { 
                 active: false, 
                 cooldown: 0, 
                 duration: 0, 
                 maxCooldown: weapon.skill ? weapon.skill.cooldown : 0 
             };
             spawnParticle(context, localPlayer.position, '#00f3ff', 'text', 'SYSTEM ONLINE');
             spawnParticle(context, localPlayer.position, '#fff', 'ring', undefined, 0);
         }
     }
  }, [activeWeaponId, engineState]);

  // UI Loop (Decoupled from Physics Loop)
  useEffect(() => {
      const uiInterval = setInterval(() => {
        if (engineState !== 'READY') return;
        const net = context.network.current;
        let myPlayer;
        if (net.role === 'CLIENT') myPlayer = context.entities.current.find(e => e.ownerId === net.myId);
        else myPlayer = context.entities.current.find(e => e.id === 'player');
        
        const leaderboard: LeaderboardEntry[] = context.entities.current
            .filter(e => e.type === 'PLAYER')
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 5)
            .map(e => ({
                id: e.id, name: e.name || 'Unknown', score: e.score || 0, level: e.level || 1, 
                isSelf: net.role === 'HOST' ? e.id === 'player' : e.ownerId === net.myId
            }));

        const activeBossEntity = context.entities.current.find(e => e.type === 'ENEMY' && e.name === 'GUARDIAN');
        const activeBoss = activeBossEntity ? { name: activeBossEntity.name || 'GUARDIAN', health: activeBossEntity.health, maxHealth: activeBossEntity.maxHealth, color: activeBossEntity.color } : undefined;

        const isCombat = myPlayer && (Date.now() - (myPlayer.lastCombatTime || 0) < 10000);

        let streakLabel = '';
        if (context.gameState.current.streakTimer > 0 && context.gameState.current.killStreak >= 2) {
             const s = context.gameState.current.killStreak;
             if (s === 2) streakLabel = 'DOUBLE KILL';
             else if (s === 3) streakLabel = 'TRIPLE KILL';
             else if (s === 4) streakLabel = 'QUADRA KILL';
             else if (s === 5) streakLabel = 'RAMPAGE';
             else if (s >= 10) streakLabel = 'GODLIKE';
             else streakLabel = `${s} KILL STREAK`;
        }

        const extractProgress = extractionRef.current.active 
            ? ((extractionRef.current.max - extractionRef.current.timer) / extractionRef.current.max) * 100 
            : undefined;

        onUpdateStats({ 
            fps: currentFps.current, score: context.gameState.current.score, level: context.gameState.current.level, 
            entitiesCount: context.entities.current.length, upgradesAvailable: context.gameState.current.upgradesPoints, 
            isAdminMode: context.isAdminMode.current, position: myPlayer?.position || { x: 0, y: 0 },
            stats: context.playerStats.current.map(s => ({...s})),
            activeSkill: myPlayer && myPlayer.skillState ? {
                name: EVOLUTION_TREE.find(w => w.id === myPlayer.weaponId)?.skill?.name || 'Unknown',
                cooldown: myPlayer.skillState.cooldown, maxCooldown: myPlayer.skillState.maxCooldown, active: myPlayer.skillState.active
            } : undefined,
            roomId: roomId, leaderboard: leaderboard, chatMessages: [...context.chatMessages.current], chatVersion: context.chatMessages.current.length,
            activeBoss, killFeed: [...killFeedRef.current],
            worldEvent: {
                type: context.worldEvent.current.type,
                timeLeft: context.worldEvent.current.timeLeft,
                label: context.worldEvent.current.type.replace('_', ' ')
            },
            activeStreak: streakLabel ? {
                count: context.gameState.current.killStreak,
                label: streakLabel,
                timer: context.gameState.current.streakTimer
            } : undefined,
            isCombatActive: isCombat,
            extractionProgress: extractProgress
        });
      }, 100);

      return () => clearInterval(uiInterval);
  }, [engineState, roomId]);

  // Spectator Cam
  useEffect(() => {
    if (deathInfo) {
        let target: Entity | undefined;
        if (spectateTargetRef.current) target = context.entities.current.find(e => e.id === spectateTargetRef.current);
        if (!target) {
            target = context.entities.current.find(e => e.name === deathInfo.killer && e.type !== 'WALL');
            if (!target) {
                const players = context.entities.current.filter(e => e.type === 'PLAYER' || e.type === 'ENEMY');
                if (players.length > 0) {
                     if (spectateIndexRef.current >= players.length) spectateIndexRef.current = 0;
                     target = players[spectateIndexRef.current];
                }
            }
            if (target) spectateTargetRef.current = target.id;
        }
        if (target) {
            context.camera.current.x = target.position.x + (Math.random()-0.5)*context.camera.current.shake;
            context.camera.current.y = target.position.y + (Math.random()-0.5)*context.camera.current.shake;
            context.camera.current.zoom = 0.8; context.camera.current.shake *= 0.9;
        }
    }
  }, [deathInfo]); // Runs on render/state updates mostly

  // Rendering Loop (Independent of Logic Loop for high refresh)
  useEffect(() => {
      let rafId = 0;
      const render = () => {
          if (engineState === 'READY') {
              drawScene(context);
              if (extractionRef.current.active) {
                  // Draw extraction circle overlay directly here for max smoothness
                  const ctx = canvasRef.current?.getContext('2d');
                  if (ctx) {
                      const player = context.entities.current.find(e => e.id === 'player');
                      if (player) {
                          const px = player.position.x - context.camera.current.x + (window.innerWidth/2);
                          const py = player.position.y - context.camera.current.y + (window.innerHeight/2);
                          const progress = (extractionRef.current.max - extractionRef.current.timer) / extractionRef.current.max;
                          
                          ctx.save(); ctx.beginPath(); ctx.arc(px, py, player.radius + 20, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * progress));
                          ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 4; ctx.stroke();
                          ctx.font = 'bold 12px "JetBrains Mono"'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
                          ctx.fillText(`UPLINK ${(progress * 100).toFixed(0)}%`, px, py - player.radius - 20);
                          ctx.font = 'bold 10px "JetBrains Mono"'; ctx.fillStyle = '#ff0000'; ctx.fillText('DO NOT MOVE', px, py + player.radius + 30);
                          ctx.restore();
                      }
                  }
              }
              drawMinimap(context);
          }
          rafId = requestAnimationFrame(render);
      };
      render();
      return () => cancelAnimationFrame(rafId);
  }, [engineState]);

  const handleRespawn = () => {
     // Respawn Logic Logic
     const previousLevel = deathInfo?.level || 1;
     const startLevel = Math.max(1, Math.floor(previousLevel / 2));

     setDeathInfo(null); setIsSpectating(false); spectateTargetRef.current = null;
     extractionRef.current.active = false;
     
     context.gameState.current.score = 0; 
     context.gameState.current.killStreak = 0; 
     context.gameState.current.exp = 0;
     
     let nextExp = 50;
     for(let i=1; i<startLevel; i++) nextExp *= 1.1; 
     context.gameState.current.nextLevelExp = nextExp;
     
     context.playerStats.current = JSON.parse(JSON.stringify(UPGRADE_TEMPLATE));
     
     sessionStats.current = { kills: 0, startTime: Date.now()/1000, bossKills: 0 };
     
     spawnPlayer(context, 'basic', playerProfile.gameMode, playerProfile.nickname, startLevel, playerProfile.teamId);
     
     const player = context.entities.current.find(e => e.id === 'player');
     if (player) {
        if (playerProfile.gameMode !== '2-Teams') {
            const skin = SHOP_ITEMS.find(s => s.id === playerProfile.skinId);
            if (skin && skin.type === 'SKIN') player.color = skin.color || COLORS.player;
        }
        player.trailId = playerProfile.trailId;
        player.flagId = playerProfile.flagId;
     }
     
     Logger.game(`Player Respawned at Level ${startLevel}`);
  };

  const handleSpectatePrev = () => {
      const players = context.entities.current.filter(e => e.type === 'PLAYER' || e.type === 'ENEMY');
      if (players.length === 0) return;
      spectateIndexRef.current = (spectateIndexRef.current - 1 + players.length) % players.length;
      spectateTargetRef.current = players[spectateIndexRef.current].id;
      soundManager.playUiHover();
  };

  const handleSpectateNext = () => {
      const players = context.entities.current.filter(e => e.type === 'PLAYER' || e.type === 'ENEMY');
      if (players.length === 0) return;
      spectateIndexRef.current = (spectateIndexRef.current + 1) % players.length;
      spectateTargetRef.current = players[spectateIndexRef.current].id;
      soundManager.playUiHover();
  };

  const currentSpectateName = spectateTargetRef.current ? context.entities.current.find(e => e.id === spectateTargetRef.current)?.name : 'Unknown';

  return (
    <div className={`w-full h-full relative bg-black ${settings.interface.crosshairType !== 'OFF' ? 'cursor-none' : 'cursor-crosshair'}`}>
        <canvas 
            ref={canvasRef} 
            className={`block w-full h-full transition-opacity duration-1000 ${engineState === 'READY' ? 'opacity-100' : 'opacity-0'}`} 
            style={{ touchAction: 'none' }} 
        />
        {showDebug && <DebugPanel gameContext={context} onClose={() => setShowDebug(false)} />}
        {deathInfo && (
            <DeathScreen 
                killerName={deathInfo.killer} score={deathInfo.score} level={deathInfo.level}
                onRespawn={handleRespawn} onLobby={() => { setDeathInfo(null); onGameOver(); }}
                onSpectate={() => setIsSpectating(true)} isSpectating={isSpectating}
                onSpectatePrev={handleSpectatePrev} onSpectateNext={handleSpectateNext}
                spectateTargetName={currentSpectateName}
            />
        )}
        {deathInfo && !isSpectating && deathInfo.currencyEarned !== undefined && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in duration-500 pointer-events-none">
                <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-lg flex flex-col items-center gap-1 backdrop-blur-md shadow-[0_0_50px_rgba(234,179,8,0.5)]">
                    <div className="text-yellow-400 font-bold font-mono text-sm tracking-widest">
                        {deathInfo.currencyEarned > 0 ? 'MISSION REWARD' : 'SIMULATION COMPLETE'}
                    </div>
                    {deathInfo.currencyEarned > 0 ? (
                        <div className="text-white font-black text-4xl text-shadow-lg flex items-center gap-2">
                            +{deathInfo.currencyEarned} <span className="text-yellow-400 text-lg">DUST</span>
                        </div>
                    ) : (
                        <div className="text-gray-400 font-bold text-lg">NO DATA RECORDED</div>
                    )}
                </div>
            </div>
        )}
        {engineState === 'INITIALIZING' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
                <div className="relative">
                    <Hexagon className="w-16 h-16 text-cyan-500 animate-spin-slow stroke-1" />
                    <Loader2 className="w-8 h-8 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="mt-4 font-mono text-cyan-400 text-sm tracking-[0.3em] animate-pulse">ESTABLISHING UPLINK</div>
                <div className="mt-2 text-[10px] text-gray-500 font-mono">Connecting to Global Mesh: {roomId || '...'}</div>
            </div>
        )}
    </div>
  );
});