
import React from 'react';
import { Button } from './Button';
import { Eye, RefreshCw, LogOut, Skull, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;

interface DeathScreenProps {
  killerName: string;
  score: number;
  level: number;
  onRespawn: () => void;
  onSpectate: () => void;
  onLobby: () => void;
  isSpectating: boolean;
  onSpectatePrev: () => void;
  onSpectateNext: () => void;
  spectateTargetName?: string;
}

export const DeathScreen: React.FC<DeathScreenProps> = ({
  killerName,
  score,
  level,
  onRespawn,
  onSpectate,
  onLobby,
  isSpectating,
  onSpectatePrev,
  onSpectateNext,
  spectateTargetName
}) => {
  const { t } = useTranslation();
  
  // Calculate Respawn Level (50% retention)
  const respawnLevel = Math.max(1, Math.floor(level / 2));

  if (isSpectating) {
    return (
      <div className="absolute inset-x-0 bottom-8 z-50 flex flex-col items-center pointer-events-none">
        <MotionDiv 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto flex items-center gap-4 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl"
        >
          <button onClick={onSpectatePrev} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-center px-4 min-w-[150px]">
            <div className="flex items-center gap-2 text-red-500 font-bold font-mono text-xs tracking-widest uppercase animate-pulse">
              <Eye className="w-3 h-3" /> {t('death_spectating')}
            </div>
            <div className="text-white font-black font-sans text-lg tracking-wider truncate max-w-[200px]">
              {spectateTargetName || 'UNKNOWN'}
            </div>
          </div>

          <button onClick={onSpectateNext} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </MotionDiv>

        <div className="mt-4 pointer-events-auto">
             <Button variant="danger" onClick={onRespawn} className="px-6 py-2 text-sm shadow-lg">
                <RefreshCw className="w-4 h-4 mr-2" /> {t('hud_respawn')} (LVL {respawnLevel})
             </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <MotionDiv 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="glass-panel p-8 md:p-12 rounded-lg border-red-500/30 shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col items-center max-w-md w-full relative overflow-hidden"
      >
        
        {/* Background Glitch Effect */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

        <div className="mb-6 relative">
             <Skull className="w-16 h-16 text-red-500 animate-pulse" />
             <div className="absolute inset-0 blur-xl bg-red-500/30 rounded-full animate-pulse"></div>
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-white font-sans tracking-tighter mb-2 text-shadow-lg">
          {t('death_title')}
        </h1>
        
        <div className="flex items-center gap-2 text-gray-400 font-mono text-sm mb-8">
           <span>{t('death_killer')}</span>
           <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{killerName}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-black/40 p-3 rounded border border-white/10 flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-mono uppercase">{t('death_final_score')}</span>
                <span className="text-2xl font-bold text-white font-sans">{score.toLocaleString()}</span>
            </div>
            <div className="bg-black/40 p-3 rounded border border-white/10 flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-mono uppercase">{t('death_level_reached')}</span>
                <span className="text-2xl font-bold text-yellow-400 font-sans">{level}</span>
            </div>
        </div>

        {/* SOFT RESET BONUS */}
        {respawnLevel > 1 && (
            <div className="w-full bg-green-900/20 border border-green-500/30 p-2 rounded mb-6 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-xs font-mono text-green-300">
                    LEGACY ACTIVE: RESPAWN AT <span className="font-bold text-white">LEVEL {respawnLevel}</span>
                </span>
            </div>
        )}

        <div className="flex flex-col gap-3 w-full">
           <Button variant="primary" onClick={onRespawn} className="w-full justify-center py-4 text-lg bg-red-600/20 border-red-500/50 hover:bg-red-500 hover:text-white relative overflow-hidden group">
              <span className="relative z-10 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform" /> 
                  {t('hud_play_again')}
              </span>
              <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/20 transition-colors"></div>
           </Button>
           
           <div className="grid grid-cols-2 gap-3">
               <button 
                  onClick={onSpectate}
                  className="flex items-center justify-center gap-2 p-3 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-xs font-bold transition-all"
               >
                  <Eye className="w-4 h-4" /> {t('hud_spectate')}
               </button>
               <button 
                  onClick={onLobby}
                  className="flex items-center justify-center gap-2 p-3 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-xs font-bold transition-all"
               >
                  <LogOut className="w-4 h-4" /> {t('hud_lobby')}
               </button>
           </div>
        </div>

      </MotionDiv>
    </div>
  );
};
