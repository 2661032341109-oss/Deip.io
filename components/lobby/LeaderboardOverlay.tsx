
import React from 'react';
import { LeaderboardEntry } from '../../types';
import { EVOLUTION_TREE, COLORS } from '../../constants';
import { SHOP_ITEMS } from '../../engine/Persistence';
import { TankPreview } from '../TankPreview';
import { Globe, X, Crown, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;

interface LeaderboardOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    entries: LeaderboardEntry[];
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({ isOpen, onClose, entries }) => {
    if (!isOpen) return null;

    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <div className="absolute inset-0 z-[90] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-cyan-950/10">
                <div className="flex items-center gap-4">
                    <Globe className="w-8 h-8 text-cyan-400" />
                    <div>
                        <h2 className="text-2xl font-black text-white font-sans tracking-[0.2em]">GLOBAL RANKINGS</h2>
                        <div className="text-xs font-mono text-cyan-500/60">LIVE NEURAL FEED • SEASON 1</div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Visual Side */}
                <div className="w-full md:w-5/12 bg-gradient-to-b from-[#0a0a15] to-black p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-white/10">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
                    <div className="flex items-end justify-center gap-4 mb-12 w-full h-64">
                        {/* 2nd */}
                        {top3[1] && (
                            <div className="flex flex-col items-center relative z-10 scale-90 opacity-80 hover:opacity-100 hover:scale-95 transition-all duration-300">
                                <div className="text-gray-400 font-black text-4xl mb-2 font-mono">2</div>
                                <div className="relative w-32 h-32 mb-4">
                                    <TankPreview weapon={EVOLUTION_TREE.find(w => w.name === top3[1].mainClass) || EVOLUTION_TREE[0]} size={120} color={SHOP_ITEMS.find(s=>s.id===top3[1].skinId)?.color || COLORS.player} />
                                </div>
                                <div className="bg-gray-800/80 px-4 py-2 rounded text-center border border-gray-500">
                                    <div className="text-white font-bold font-sans text-sm">{top3[1].name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">{(top3[1].score/1000).toFixed(0)}k</div>
                                </div>
                            </div>
                        )}
                        {/* 1st */}
                        {top3[0] && (
                            <div className="flex flex-col items-center relative z-20 scale-110 -mb-8 hover:scale-115 transition-all duration-300">
                                <Crown className="w-10 h-10 text-yellow-400 mb-2 animate-bounce" />
                                <div className="relative w-40 h-40 mb-4">
                                    <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse"></div>
                                    <TankPreview weapon={EVOLUTION_TREE.find(w => w.name === top3[0].mainClass) || EVOLUTION_TREE[0]} size={150} color={SHOP_ITEMS.find(s=>s.id===top3[0].skinId)?.color || COLORS.player} trailId="EMBER" />
                                </div>
                                <div className="bg-yellow-900/80 px-6 py-3 rounded text-center border border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                                    <div className="text-yellow-100 font-black font-sans text-lg">{top3[0].name}</div>
                                    <div className="text-xs text-yellow-400 font-mono font-bold">{(top3[0].score/1000000).toFixed(2)}M</div>
                                </div>
                            </div>
                        )}
                        {/* 3rd */}
                        {top3[2] && (
                            <div className="flex flex-col items-center relative z-10 scale-90 opacity-80 hover:opacity-100 hover:scale-95 transition-all duration-300">
                                <div className="text-orange-700 font-black text-4xl mb-2 font-mono">3</div>
                                <div className="relative w-32 h-32 mb-4">
                                    <TankPreview weapon={EVOLUTION_TREE.find(w => w.name === top3[2].mainClass) || EVOLUTION_TREE[0]} size={120} color={SHOP_ITEMS.find(s=>s.id===top3[2].skinId)?.color || COLORS.player} />
                                </div>
                                <div className="bg-orange-900/40 px-4 py-2 rounded text-center border border-orange-800">
                                    <div className="text-white font-bold font-sans text-sm">{top3[2].name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">{(top3[2].score/1000).toFixed(0)}k</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* THE LIST */}
                <div className="flex-1 bg-black/60 overflow-y-auto custom-scrollbar p-4 md:p-8">
                    <div className="grid grid-cols-1 gap-2">
                        {rest.map((entry, idx) => (
                            <MotionDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} key={entry.id} className={`flex items-center justify-between p-3 rounded border transition-all hover:scale-[1.01] ${entry.isSelf ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 text-center font-mono font-bold text-gray-500">#{entry.rank}</div>
                                    <div className="w-8 h-6 bg-black rounded overflow-hidden relative border border-white/20">
                                        {entry.flagId !== 'NONE' ? ( <img src={`https://flagcdn.com/w40/${entry.flagId?.toLowerCase()}.png`} className="w-full h-full object-cover" /> ) : <div className="w-full h-full bg-gray-800"></div>}
                                    </div>
                                    <div>
                                        <div className={`font-bold font-sans text-sm flex items-center gap-2 ${entry.isSelf ? 'text-cyan-400' : 'text-gray-200'}`}>{entry.name}{entry.verified && <ShieldCheck className="w-3 h-3 text-blue-400" />}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">LVL {entry.level} • {entry.mainClass || 'Unknown'}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-white text-sm">{entry.score.toLocaleString()}</div>
                                    <div className="text-[9px] text-gray-600">XP</div>
                                </div>
                            </MotionDiv>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
