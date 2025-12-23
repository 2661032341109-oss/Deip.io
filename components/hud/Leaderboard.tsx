
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry, KillFeedEntry, GameSettings } from '../../types';
import { Map as MapIcon, Target } from 'lucide-react';

interface LeaderboardProps {
    entries: LeaderboardEntry[];
    killFeed: KillFeedEntry[];
    minimapRef: React.RefObject<HTMLCanvasElement | null>;
    isMobile: boolean;
    settings: GameSettings;
    t: (key: string) => string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, killFeed, minimapRef, isMobile, settings, t }) => {
    return (
        <div className="flex flex-col items-end gap-2 pointer-events-auto max-w-[40%]">
            <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="glass-panel p-1 rounded border border-cyan-500/20 bg-black/80 relative shadow-lg overflow-hidden transition-all duration-300"
                style={{
                    width: isMobile ? 80 : (settings.interface.minimapScale / 100) * 140, 
                    height: isMobile ? 80 : (settings.interface.minimapScale / 100) * 140,
                }}
            >
                <canvas ref={minimapRef} className="w-full h-full object-contain block" width={140} height={140} />
                <MapIcon className="w-3 h-3 text-white/20 absolute bottom-1 right-1" />
            </motion.div>

            {/* KILL FEED */}
            {killFeed && killFeed.length > 0 && (
                <div className="flex flex-col items-end gap-1 mt-2">
                    <AnimatePresence>
                    {killFeed.slice(-3).map((kill) => (
                        <motion.div
                            key={kill.id}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-black/60 border border-white/5 px-2 py-1 rounded text-[9px] font-mono flex items-center gap-2 backdrop-blur-sm"
                        >
                            <span className="text-cyan-400 font-bold">{kill.killer}</span>
                            <Target className="w-3 h-3 text-gray-500" />
                            <span className="text-red-400">{kill.victim}</span>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </div>
            )}

            <motion.div 
                initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="w-32 md:w-56 glass-panel p-2 md:p-3 bg-black/60 rounded border border-white/5 shadow-lg mt-1"
            >
                <h3 className="text-[8px] md:text-[10px] font-bold text-gray-500 mb-1 md:mb-2 uppercase tracking-widest border-b border-white/5 pb-1">{t('hud_leaderboard')}</h3>
                <ol className="space-y-1 font-mono text-[9px] md:text-xs">
                {entries && entries.length > 0 ? (
                    entries.slice(0, isMobile ? 3 : 5).map((entry, index) => (
                        <motion.li 
                            layout
                            key={entry.id} 
                            className={`flex justify-between items-center px-1 rounded ${entry.isSelf ? 'text-cyan-400 font-bold bg-white/10' : 'text-white/70'}`}
                        >
                            <div className="flex items-center gap-1 md:gap-2 max-w-[70%]">
                                <span className="w-3 text-gray-500">{index + 1}.</span>
                                <span className="text-[8px] text-yellow-500 bg-white/5 px-1 rounded mr-1">L{entry.level}</span>
                                <span className="truncate">
                                    {settings.interface.streamerMode ? (entry.isSelf ? 'YOU' : `Player ${index+1}`) : entry.name || 'Unknown'}
                                </span>
                            </div>
                            <span>{entry.score >= 1000 ? (entry.score/1000).toFixed(1) + 'k' : entry.score}</span>
                        </motion.li>
                    ))
                ) : (
                    <li className="flex justify-between items-center text-cyan-400 font-bold px-1">
                        <div className="flex items-center gap-1"><span>1.</span><span>You</span></div> 
                        <span>0</span>
                    </li>
                )}
                </ol>
            </motion.div>
        </div>
    );
};
