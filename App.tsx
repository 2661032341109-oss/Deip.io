
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ViewState, PlayerProfile, GameStats, WeaponSchema, SandboxOptions, GameSettings } from './types';
import { Lobby } from './components/Lobby';
import { Settings } from './components/Settings';
import { Encyclopedia } from './components/Encyclopedia';
import { Shop } from './components/Shop'; 
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { EVOLUTION_TREE } from './constants';
import { Persistence } from './engine/Persistence'; 
import i18n from './i18n';

// HELPER: Centralized Logic for calculating available upgrades
const calculateAvailableUpgrades = (currentWeaponId: string, currentLevel: number): WeaponSchema[] => {
    const currentWeapon = EVOLUTION_TREE.find(w => w.id === currentWeaponId);
    if (!currentWeapon) return [];

    const currentTier = currentWeapon.tier;
    const uniqueTiers: number[] = Array.from(new Set(EVOLUTION_TREE.map((u: WeaponSchema) => u.tier)));
    const higherTiers: number[] = uniqueTiers
        .filter((t: number) => t > currentTier)
        .sort((a: number, b: number) => a - b);

    if (higherTiers.length === 0) return [];

    const nextTier: number = higherTiers[0];
    if (currentLevel >= nextTier) {
        return EVOLUTION_TREE.filter(u => u.tier === nextTier);
    }
    return [];
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LOBBY);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<GameCanvasHandle>(null);
  const [viewportHeight, setViewportHeight] = useState('100%'); // Default to 100%
  
  // Settings State (Persistent)
  const [settings, setSettings] = useState<GameSettings>(Persistence.loadSettings());

  // --- VISUAL VIEWPORT FIX ---
  // This forces the app to exact pixel height of the visible area, preventing jumps when bars toggle.
  useLayoutEffect(() => {
      const updateHeight = () => {
          if (window.visualViewport) {
              // Use precise float to avoid sub-pixel gaps
              setViewportHeight(`${window.visualViewport.height}px`);
              // Force scroll to top to prevent the "Lift" effect
              window.scrollTo(0, 0);
          } else {
              setViewportHeight(`${window.innerHeight}px`);
          }
      };

      if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', updateHeight);
          window.visualViewport.addEventListener('scroll', updateHeight);
      }
      window.addEventListener('resize', updateHeight);
      
      updateHeight(); // Init

      return () => {
          if (window.visualViewport) {
              window.visualViewport.removeEventListener('resize', updateHeight);
              window.visualViewport.removeEventListener('scroll', updateHeight);
          }
          window.removeEventListener('resize', updateHeight);
      };
  }, []);

  // Init: Sync Language
  useEffect(() => {
      if (settings.language && i18n.language !== settings.language) {
          i18n.changeLanguage(settings.language);
      }
  }, []); 

  // Save Settings whenever they change
  useEffect(() => {
      Persistence.saveSettings(settings);
  }, [settings]);

  // Game Session State
  const [gameStats, setGameStats] = useState<GameStats>({
    fps: 0,
    ping: 0,
    score: 0,
    level: 1,
    maxLevel: 100,
    entitiesCount: 0,
    isAdminMode: false,
    upgradesAvailable: 0,
    position: { x: 0, y: 0 },
    chatMessages: [], 
    chatVersion: 0
  });
  const [activeWeaponId, setActiveWeaponId] = useState<string>('basic');
  const [availableUpgrades, setAvailableUpgrades] = useState<WeaponSchema[]>([]);
  
  // Sandbox State
  const [sandboxOptions, setSandboxOptions] = useState<SandboxOptions>({
    godMode: false,
    infiniteAmmo: false,
    spawnBossSignal: 0,
    resetLevelSignal: 0,
    healSignal: 0,
    maxLevelSignal: 0,
    maxStatsSignal: 0,
    suicideSignal: 0,
    clearEnemiesSignal: 0,
    spawnFoodSignal: 0,
    statOverrideSignal: null
  });

  const handleStartGame = (profile: PlayerProfile) => {
    let startLevel = 1;
    let startScore = 0;
    let startWeaponId = 'basic'; 
    
    if (profile.savedRun) {
        startLevel = profile.savedRun.level;
        startScore = profile.savedRun.score;
        if (profile.gameMode === 'Sandbox' && profile.savedRun.weaponId) {
            startWeaponId = profile.savedRun.weaponId;
        }
        Persistence.clearSavedRun(); 
    } 

    setPlayerProfile(profile);
    setActiveWeaponId(startWeaponId);
    
    const currentAccount = Persistence.load();
    const isAdmin = currentAccount.role === 'ADMIN' || profile.gameMode === 'Sandbox';

    setGameStats(s => ({
        ...s, 
        score: startScore, 
        level: startLevel, 
        upgradesAvailable: Math.max(0, startLevel - 1), 
        isAdminMode: isAdmin, 
        chatMessages: [], 
        chatVersion: 0 
    }));
    
    const initialUpgrades = calculateAvailableUpgrades(startWeaponId, startLevel);
    setAvailableUpgrades(initialUpgrades);

    setSandboxOptions({
        godMode: false,
        infiniteAmmo: false,
        spawnBossSignal: 0,
        resetLevelSignal: 0,
        healSignal: 0,
        maxLevelSignal: 0,
        maxStatsSignal: 0,
        suicideSignal: 0,
        clearEnemiesSignal: 0,
        spawnFoodSignal: 0,
        statOverrideSignal: null
    });
    
    setView(ViewState.GAME);
  };

  const handleExitGame = () => {
    if (view === ViewState.GAME && gameCanvasRef.current) {
        gameCanvasRef.current.handleSafeExit();
    } else {
        setView(ViewState.LOBBY);
        setPlayerProfile(null);
    }
  };

  const onGameOverCallback = () => {
      setView(ViewState.LOBBY);
      setPlayerProfile(null);
  };

  const handleLevelUp = (level: number) => {
     const upgrades = calculateAvailableUpgrades(activeWeaponId, level);
     setAvailableUpgrades(upgrades);
  };

  const handleSelectUpgrade = (newWeaponId: string) => {
     setActiveWeaponId(newWeaponId);
     const nextUpgrades = calculateAvailableUpgrades(newWeaponId, gameStats.level);
     setAvailableUpgrades(nextUpgrades);
  };
  
  const handleStatUpgrade = (id: string) => {
    if (gameCanvasRef.current) {
      gameCanvasRef.current.upgradeStat(id);
    }
  };

  const handleSendChat = (text: string) => {
      if (gameCanvasRef.current) {
          gameCanvasRef.current.sendChat(text);
      }
  };

  const Background = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
       <div className="absolute inset-0 bg-[#050508]"></div>
       <div className="absolute inset-0 z-50 crt-overlay opacity-30 animate-scanline"></div>
       <div 
         className="absolute inset-0 opacity-10" 
         style={{
            backgroundImage: `linear-gradient(#1a1a25 1px, transparent 1px), linear-gradient(90deg, #1a1a25 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
         }}
       ></div>
       <div className="absolute inset-0 bg-radial-gradient from-transparent to-black opacity-80"></div>
    </div>
  );

  return (
    <div 
        className="relative w-full overflow-hidden font-sans text-gray-200 select-none bg-black"
        style={{ height: viewportHeight }} 
        data-font={settings.fontTheme || 'CORE'}
    >
      <Background />

      {view === ViewState.LOBBY && (
        <Lobby 
          onStart={handleStartGame} 
          onChangeView={setView} 
        />
      )}

      {view === ViewState.SETTINGS && (
        <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
           <Settings 
             onBack={() => setView(ViewState.LOBBY)} 
             settings={settings}
             onSettingsChange={setSettings}
           />
        </div>
      )}

      {view === ViewState.ENCYCLOPEDIA && (
        <div className="relative z-10 w-full h-full bg-black/80 backdrop-blur-sm">
           <Encyclopedia onBack={() => setView(ViewState.LOBBY)} />
        </div>
      )}
      
      {view === ViewState.SHOP && (
        <div className="relative z-10 w-full h-full bg-black/80 backdrop-blur-sm">
           <Shop onBack={() => setView(ViewState.LOBBY)} onPurchase={() => {}} />
        </div>
      )}

      {view === ViewState.GAME && playerProfile && (
        <div className="relative w-full h-full">
          <GameCanvas 
            ref={gameCanvasRef}
            playerProfile={playerProfile} 
            settings={settings}
            onUpdateStats={(newStats) => setGameStats(prev => ({ ...prev, ...newStats }))}
            onGameOver={onGameOverCallback} 
            onLevelUp={handleLevelUp}
            activeWeaponId={activeWeaponId}
            sandboxOptions={sandboxOptions}
            minimapRef={minimapRef}
            isAdmin={gameStats.isAdminMode} 
          />
          <HUD 
             stats={gameStats} 
             onExit={handleExitGame} 
             availableUpgrades={availableUpgrades}
             onSelectUpgrade={handleSelectUpgrade}
             onSandboxUpdate={setSandboxOptions}
             sandboxOptions={sandboxOptions}
             activeWeaponId={activeWeaponId}
             minimapRef={minimapRef}
             onUpgradeStat={handleStatUpgrade}
             onSendChat={handleSendChat}
          />
        </div>
      )}

    </div>
  );
};

export default App;
    