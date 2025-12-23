
import React from 'react';
import { Mission } from '../../types';
import { Target, Clock, Skull, Activity, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

interface MissionCardProps {
    mission: Mission;
    onClaim: (id: string) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({ mission, onClaim }) => {
    const { t } = useTranslation();
    const progress = Math.min(100, (mission.currentValue / mission.targetValue) * 100);
    const isComplete = progress >= 100;
    const isClaimed = mission.isClaimed;

    let Icon = Target;
    if (mission.type === 'PLAYTIME') Icon = Clock;
    if (mission.type === 'KILL' || mission.type === 'BOSS_KILL') Icon = Skull;
    if (mission.type === 'LEVEL') Icon = Activity;

    const description = t(`mission_${mission.type}`, { target: mission.targetValue.toLocaleString(), defaultValue: mission.description });

    return (
        <div className={`relative p-3 rounded bg-black/40 border transition-all ${isComplete && !isClaimed ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : (isClaimed ? 'border-green-500/30 opacity-70' : 'border-white/10')} group`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isClaimed ? 'text-green-400' : (isComplete ? 'text-yellow-400 animate-pulse' : 'text-cyan-400')}`} />
                    <div className="text-[10px] font-mono text-gray-300 max-w-[150px] leading-tight">{description}</div>
                </div>
                {!isClaimed && <div className="text-yellow-400 font-bold font-mono text-xs">+{mission.reward}</div>}
            </div>
            {!isComplete && (
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                    <MotionDiv className={`h-full bg-cyan-500`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                </div>
            )}
            <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] text-gray-500 font-mono">{Math.floor(mission.currentValue)} / {mission.targetValue}</span>
                {isClaimed ? (
                    <div className="flex items-center gap-1 text-[9px] text-green-400 font-bold bg-green-900/20 px-2 py-0.5 rounded">
                        <CheckCircle className="w-3 h-3" /> CLAIMED
                    </div>
                ) : isComplete ? (
                    <MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onClaim(mission.id)} className="flex items-center gap-1 text-[9px] text-black font-bold bg-yellow-400 hover:bg-yellow-300 px-3 py-1 rounded animate-pulse shadow-lg">
                        CLAIM REWARD
                    </MotionButton>
                ) : null}
            </div>
        </div>
    );
};
