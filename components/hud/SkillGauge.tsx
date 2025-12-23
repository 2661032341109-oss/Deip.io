
import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;
const MotionCircle = motion.circle as any;

interface SkillGaugeProps {
    skill: {
        name: string;
        cooldown: number;
        maxCooldown: number;
        active: boolean;
    };
    isMobile: boolean;
}

export const SkillGauge: React.FC<SkillGaugeProps> = ({ skill, isMobile }) => {
    const radius = isMobile ? 26 : 32;
    const stroke = 4;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    
    const maxCd = skill.maxCooldown;
    const currentCd = skill.cooldown;
    const percentReady = Math.max(0, Math.min(100, ((maxCd - currentCd) / maxCd) * 100));
    
    const strokeDashoffset = circumference - (percentReady / 100) * circumference;
    const isReady = currentCd <= 0;
    const isActive = skill.active; 
    const timeLeft = (currentCd / 60).toFixed(1);

    return (
        <div className={`relative flex flex-col items-center group`}>
            <MotionDiv 
                className={`relative flex items-center justify-center`}
                animate={{ scale: isReady ? 1.05 : 1 }}
            >
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className={`transform -rotate-90 transition-all duration-300 ${isReady ? 'drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]' : ''}`}
                >
                    <circle
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={stroke}
                        fill="rgba(0,0,0,0.6)"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <MotionCircle
                        stroke={isActive ? '#ffd700' : (isReady ? '#00f3ff' : '#ef4444')}
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        animate={{ strokeDashoffset }}
                        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                    />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                    {isReady ? (
                        <Zap className={`text-cyan-400 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'} ${isActive ? 'text-yellow-400 animate-pulse' : ''}`} />
                    ) : (
                        <span className="font-mono font-bold text-white text-[10px] md:text-xs tabular-nums">{timeLeft}</span>
                    )}
                </div>

                {isReady && !isActive && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-cyan-500/30 pointer-events-none"></div>
                )}
            </MotionDiv>

            <div className="mt-1 flex flex-col items-center">
                <div className={`
                    text-[9px] font-bold font-mono px-2 rounded backdrop-blur-md border 
                    ${isActive 
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 animate-pulse' 
                        : (isReady ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-black/40 border-gray-700 text-gray-500')}
                `}>
                   {isActive ? 'ACTIVE' : (isMobile ? skill.name : `[F] ${skill.name}`)}
                </div>
            </div>
        </div>
    );
};
