
import React, { useState, useEffect } from 'react';
import { GameStats, WeaponSchema, SandboxOptions } from '../types';
import { UPGRADE_TEMPLATE, COLORS } from '../constants';
import { Skull, List, ChevronDown, ChevronUp, Terminal, Hexagon, Shield, LogOut, Loader2 } from 'lucide-react';
import { soundManager } from '../engine/SoundManager';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Persistence } from '../engine/Persistence'; 
import { TankPreview } from './TankPreview';

// Sub Components
import { SandboxMenu } from './hud/SandboxMenu';
import { SkillGauge } from './hud/SkillGauge';
import { StatsList } from './hud/StatsList';
import { Chat } from './hud/Chat';
import { Leaderboard } from './hud/Leaderboard';

interface HUDProps {
  stats: GameStats;
  onExit: () => void;
  availableUpgrades: WeaponSchema[];
  onSelectUpgrade: (id: string) => void;
  sandboxOptions: SandboxOptions;
  onSandboxUpdate: (opts: SandboxOptions) => void;
  activeWeaponId: string;
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  onUpgradeStat: (id: string) => void;
  onSendChat?: (text: string) => void;
}

export const HUD: React.FC<HUDProps> = ({ 
    stats, onExit, availableUpgrades, onSelectUpgrade, 
    sandboxOptions, onSandboxUpdate, activeWeaponId, minimapRef,
    onUpgradeStat, onSendChat
}) => {
  const { t } = useTranslation();
  const [showSandboxMenu, setShowSandboxMenu] = useState(false);
  const [showStatsMobile, setShowStatsMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings] = useState(Persistence.loadSettings()); 

  useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentStats = stats.stats || UPGRADE_TEMPLATE;
  const hasUpgrades = stats.upgradesAvailable > 0;
  const skill = stats.activeSkill;
  const isExtracting = stats.extractionProgress !== undefined;
  const stopProp = (e: any) => e.stopPropagation();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 flex flex-col">
      
      {/* --- BOSS BAR --- */}
      <AnimatePresence>
      {stats.activeBoss && stats.activeBoss.health > 0 && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[80%] max-w-2xl pointer-events-none">
              <div className="flex flex-col items-center">
                  <div className="text-red-500 font-black font-sans text-lg tracking-[0.2em] uppercase text-shadow-glow flex items-center gap-2 mb-1"><Skull className="w-5 h-5 animate-pulse" /> {stats.activeBoss.name}</div>
                  <div className="w-full h-4 bg-black/80 border border-red-500/50 rounded-sm relative overflow-hidden skew-x-12">
                      <motion.div className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 absolute top-0 left-0" initial={{ width: "100%" }} animate={{ width: `${(stats.activeBoss.health / stats.activeBoss.maxHealth) * 100}%` }} transition={{ type: "tween", ease: "linear", duration: 0.2 }} />
                  </div>
              </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* --- EVENT BANNER --- */}
      <AnimatePresence>
      {stats.worldEvent && stats.worldEvent.type !== 'NONE' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.2, opacity: 0 }} className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
              <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-lg border-y-2 border-yellow-500/50 flex flex-col items-center shadow-2xl">
                  <div className="text-[10px] text-yellow-400 font-mono tracking-[0.5em] animate-pulse">WORLD EVENT DETECTED</div>
                  <div className="text-2xl md:text-4xl font-black text-white font-sans italic tracking-tighter uppercase text-shadow-glow">{stats.worldEvent.label}</div>
                  <div className="w-full h-1 bg-gray-700 mt-1 rounded-full overflow-hidden"><motion.div className="h-full bg-yellow-500" initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 45, ease: "linear" }} /></div>
              </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* --- KILL STREAK --- */}
      <AnimatePresence>
      {stats.activeStreak && (
          <motion.div key={stats.activeStreak.count} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="flex flex-col items-center drop-shadow-2xl">
                  <div className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-red-500 font-sans tracking-tighter italic stroke-black" style={{ WebkitTextStroke: '2px black' }}>{stats.activeStreak.label}</div>
              </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* --- COMBAT WARNING --- */}
      <AnimatePresence>
          {stats.isCombatActive && !isExtracting && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-4 right-4 md:top-20 md:right-10 z-50 pointer-events-none">
                  <div className="bg-red-500/20 border border-red-500 text-red-100 px-3 py-1 rounded font-mono font-bold text-xs flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]"><Shield className="w-4 h-4" /> COMBAT ENGAGED</div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* --- TOP ROW --- */}
      <div className="flex justify-between items-start w-full p-2 md:p-4 mt-8 md:mt-0">
        <div className="flex flex-col gap-2 max-w-[50%] pointer-events-auto relative z-20">
           <div className="flex flex-col md:flex-row gap-1 md:items-center">
               <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-br-xl border-l-4 border-l-cyan-500 backdrop-blur-md bg-black/60 shadow-lg">
                 <div className="text-[8px] md:text-[10px] text-cyan-400 font-mono tracking-widest uppercase">{t('hud_score')}</div>
                 <div className="text-lg md:text-3xl font-black font-sans text-white tracking-tight leading-none">{stats.score.toLocaleString()}</div>
               </motion.div>
               <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel px-2 py-1 md:px-3 rounded-r-lg flex items-center gap-2 self-start bg-black/60 shadow-lg">
                 <div className="text-[9px] md:text-xs font-mono text-gray-400">{t('hud_lvl')} <span className="text-white font-bold text-sm md:text-lg">{stats.level}</span></div>
               </motion.div>
           </div>

           {settings.interface.showNetGraph && (
               <div className="text-[9px] font-mono text-gray-500 bg-black/40 px-2 py-1 rounded self-start mt-1 backdrop-blur-sm border border-white/5">FPS: <span className="text-green-400">{stats.fps}</span> | PING: <span className="text-yellow-400">24ms</span></div>
           )}

           <div className="flex flex-col gap-1 mt-2 origin-top-left pointer-events-auto" onTouchStart={stopProp} onMouseDown={stopProp}>
                {isMobile ? (
                    <div className="flex flex-col items-start gap-1">
                        <button onClick={() => setShowStatsMobile(!showStatsMobile)} className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold font-mono border backdrop-blur-md transition-all shadow-lg ${hasUpgrades ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 animate-pulse' : 'bg-black/60 border-white/10 text-gray-400'}`}>
                            {hasUpgrades ? <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping absolute -top-1 -right-1"></span> : null}
                            <List className="w-3 h-3" /><span>{t('hud_stats')} {hasUpgrades ? `(${stats.upgradesAvailable})` : ''}</span>{showStatsMobile ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <AnimatePresence>
                        {showStatsMobile && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-48 bg-black/80 p-2 rounded border border-white/10 backdrop-blur-md max-h-[40vh] overflow-y-auto custom-scrollbar">
                                {hasUpgrades && <div className="text-[9px] text-yellow-400 font-mono mb-1 text-center font-bold">{stats.upgradesAvailable} {t('hud_points_available')}</div>}
                                <StatsList stats={currentStats} isMobile={true} onUpgradeStat={onUpgradeStat} t={t} />
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className={`transition-all duration-300 w-48 ${hasUpgrades ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        {hasUpgrades && <div className="text-[10px] font-mono text-black bg-yellow-400 px-2 py-0.5 rounded font-bold self-start animate-pulse mb-1 inline-block">{stats.upgradesAvailable} {t('hud_points_available')}</div>}
                        <StatsList stats={currentStats} isMobile={false} onUpgradeStat={onUpgradeStat} t={t} />
                    </div>
                )}
           </div>
        </div>
        
        {/* LEADERBOARD & MINIMAP */}
        <Leaderboard entries={stats.leaderboard || []} killFeed={stats.killFeed || []} minimapRef={minimapRef} isMobile={isMobile} settings={settings} t={t} />
      </div>

      {/* ADMIN BUTTON (MOBILE & DESKTOP) */}
      {stats.isAdminMode && (
         <div className="absolute top-20 right-4 z-40 pointer-events-auto flex flex-col gap-2 items-end" onTouchStart={stopProp} onMouseDown={stopProp}>
             <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => { soundManager.playUiClick(); setShowSandboxMenu(true); }} 
                className="w-10 h-10 md:w-auto md:h-auto md:px-3 md:py-1 rounded-full md:rounded bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-400 hover:text-black flex items-center justify-center gap-2 font-mono text-[10px] font-bold shadow-lg backdrop-blur-md animate-pulse"
             >
                <Terminal className="w-5 h-5 md:w-3 md:h-3" /> 
                <span className="hidden md:inline">{t('hud_sandbox_ctrl')}</span>
             </motion.button>
         </div>
      )}

      {/* --- CHAT --- */}
      <Chat messages={stats.chatMessages || []} onSend={(t) => onSendChat && onSendChat(t)} isMobile={isMobile} settings={settings} />
      
      {/* --- EVOLUTION MENU --- */}
      <AnimatePresence>
      {!showSandboxMenu && availableUpgrades.length > 0 && (
        <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className={`pointer-events-auto z-50 flex shadow-2xl ${isMobile ? 'absolute top-32 left-1/2 transform -translate-x-1/2 flex-col gap-2 max-w-[95vw] bg-transparent' : 'absolute right-4 top-1/2 transform -translate-y-1/2 flex-col max-h-[70vh]'}`} onTouchStart={stopProp} onMouseDown={stopProp} style={{ touchAction: 'none' }}>
           <div className={`flex items-center gap-2 bg-black/90 p-2 rounded backdrop-blur-md border border-cyan-500/50 shadow-[0_0_15px_rgba(0,243,255,0.2)] ${isMobile ? 'self-center mb-1' : 'mb-2'}`}>
              <Hexagon className="w-4 h-4 text-cyan-400 animate-spin-slow" /><div className="text-white font-bold font-sans text-xs tracking-widest animate-pulse">{t('hud_evolution')} AVAILABLE</div>
           </div>
           <div className={`custom-scrollbar bg-black/60 p-2 rounded border border-white/10 ${isMobile ? 'flex flex-row gap-2 overflow-x-auto w-auto max-w-[90vw] items-start pb-4' : 'grid grid-cols-2 gap-2 overflow-y-auto pr-1 w-64 md:w-80 max-h-[60vh]'}`} style={{ touchAction: 'pan-x pan-y' }}>
              {availableUpgrades.map((upgrade) => (
                <motion.button key={upgrade.id} layout onClick={(e) => { e.preventDefault(); e.stopPropagation(); soundManager.playUiClick(); onSelectUpgrade(upgrade.id); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`group relative bg-black/80 border border-white/10 hover:border-cyan-400 hover:bg-cyan-900/40 text-center overflow-hidden shrink-0 flex flex-col items-center justify-between ${isMobile ? 'w-24 h-32 p-2 rounded-lg' : 'w-full h-32 p-2 rounded-lg'}`} style={{ touchAction: 'manipulation' }}>
                  <div className="flex-1 flex items-center justify-center w-full relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <TankPreview weapon={upgrade} size={80} color={COLORS.player} className="drop-shadow-[0_0_5px_rgba(0,243,255,0.3)] group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="w-full mt-2 border-t border-white/10 pt-1">
                     <div className="font-bold text-white group-hover:text-cyan-400 text-[10px] md:text-xs uppercase truncate">{t(`unit_${upgrade.id}_name`, { defaultValue: upgrade.name })}</div>
                     <div className="text-[8px] text-gray-500 font-mono">TIER {upgrade.tier}</div>
                  </div>
                </motion.button>
              ))}
           </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- SANDBOX --- */}
      {showSandboxMenu && stats.isAdminMode && (
          <SandboxMenu onClose={() => setShowSandboxMenu(false)} sandboxOptions={sandboxOptions} onUpdate={onSandboxUpdate} activeWeaponId={activeWeaponId} onSelectWeapon={onSelectUpgrade} />
      )}

      {/* --- BOTTOM ROW --- */}
      <div className="mt-auto w-full p-4 flex items-end justify-between pointer-events-none relative h-32 md:h-auto">
        <div className="pointer-events-auto hidden md:block">
             <button onClick={() => { onExit(); }} className={`px-4 py-2 rounded border text-xs font-mono transition-all backdrop-blur-md flex items-center gap-2 ${isExtracting ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse' : (stats.isCombatActive ? 'bg-red-500/20 border-red-500 text-red-200' : 'bg-green-500/10 hover:bg-green-500/30 text-green-400 border-green-500/20')}`}>
                {isExtracting ? <><Loader2 className="w-4 h-4 animate-spin" /> ABORT EXTRACTION</> : <><LogOut className="w-4 h-4" /> {stats.isCombatActive ? 'UNSAFE EXIT (PENALTY)' : 'SAFE EXTRACTION'}</>}
            </button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 md:w-96 flex flex-col items-center gap-2">
           <div className="w-full glass-panel p-1 rounded-full border border-white/10 bg-black/60 shadow-lg">
              <div className="h-1.5 md:h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                 <motion.div className="h-full bg-gradient-to-r from-green-500 to-emerald-300 w-full shadow-[0_0_8px_rgba(0,255,100,0.6)]" animate={{ width: "100%" }} transition={{ type: "spring", stiffness: 50 }} />
              </div>
           </div>
        </div>
        <div className="hidden md:flex flex-col items-center pointer-events-auto pb-2">{skill && <SkillGauge skill={skill} isMobile={false} />}</div>
      </div>

      {isMobile && skill && (<div className="absolute bottom-24 right-6 pointer-events-auto z-50" onTouchStart={stopProp}><SkillGauge skill={skill} isMobile={true} /></div>)}
      {isMobile && (<button onClick={() => { onExit(); }} className={`absolute top-2 right-1/2 translate-x-1/2 px-3 py-1 rounded text-[10px] font-bold border pointer-events-auto z-50 shadow-md ${isExtracting ? 'bg-cyan-900/80 text-cyan-300 border-cyan-500/50 animate-pulse' : (stats.isCombatActive ? 'bg-red-900/80 text-red-300 border-red-500/30' : 'bg-green-900/80 text-green-300 border-green-500/30')}`}>{isExtracting ? 'ABORT' : (stats.isCombatActive ? 'UNSAFE EXIT' : 'EXTRACT')}</button>)}
    </div>
  );
};
