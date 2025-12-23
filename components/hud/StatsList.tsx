
import React from 'react';
import { motion } from 'framer-motion';
import { PlayerStatsUpgrade } from '../../types';
import { Activity, Shield, Skull, Zap, ChevronLast, Crosshair, RefreshCw, Move } from 'lucide-react';
import { soundManager } from '../../engine/SoundManager';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;

const STAT_ICONS: Record<string, React.FC<any>> = {
  '1': Activity,     
  '2': Shield,       
  '3': Skull,        
  '4': Zap,          
  '5': ChevronLast,  
  '6': Crosshair,    
  '7': RefreshCw,    
  '8': Move          
};

interface StatsListProps {
    stats: PlayerStatsUpgrade[];
    isMobile: boolean;
    onUpgradeStat: (id: string) => void;
    t: (key: string, options?: any) => string;
}

export const StatsList: React.FC<StatsListProps> = React.memo(({ stats, isMobile, onUpgradeStat, t }) => {
    return (
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-1 md:flex md:flex-col md:gap-1'}`}>
        {stats.map((u, i) => {
            const Icon = STAT_ICONS[u.id];
            const isMaxed = u.level >= u.maxLevel;
            const statName = t(`stat_${u.id}`, { defaultValue: u.label });
            
            return (
            <MotionDiv 
                layout
                key={u.id} 
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                onClick={(e: any) => {
                    e.stopPropagation();
                    if (!isMaxed) {
                        soundManager.playUiClick();
                        onUpgradeStat(u.id);
                    }
                }}
                className={`
                    relative group overflow-hidden border transition-all cursor-pointer select-none
                    w-full h-8 rounded flex items-center px-2 bg-black/70 backdrop-blur-md pointer-events-auto
                    ${isMaxed ? 'border-green-500/30 opacity-50 cursor-default' : 'border-white/10 hover:border-cyan-400 hover:bg-white/10 active:border-cyan-200'}
                `}
                whileHover={{ scale: isMaxed ? 1 : 1.02 }}
                whileTap={{ scale: isMaxed ? 1 : 0.98 }}
            >
                <MotionDiv 
                    className="absolute inset-0 bg-cyan-500/20 origin-left" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(u.level / u.maxLevel) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100 }}
                />
                
                <div className="relative z-10 w-full flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${isMaxed ? 'text-green-400' : 'text-gray-400 group-hover:text-cyan-400'}`}>
                            {Icon ? <Icon size={12} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i+1}</span>}
                        </div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase truncate max-w-[80px] md:max-w-none">{statName}</span>
                    </div>
                    <span className="text-[9px] font-mono text-gray-500">[{u.level}/{u.maxLevel}]</span>
                </div>
            </MotionDiv>
            );
        })}
    </div>
  );
});
