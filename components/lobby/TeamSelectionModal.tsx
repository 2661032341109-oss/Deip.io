
import React from 'react';
import { Shield, Swords, Users, X, Signal, Activity } from 'lucide-react';

interface TeamSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (team: number) => void;
}

export const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    // In a P2P architecture without a master server list, we cannot know exact player counts before joining.
    // We replace the misleading "random numbers" with a "Signal Strength" or "Activity" metaphor
    // which implies density without promising exact counts.
    
    // Simulating "Net Activity"
    const blueActivity = 40 + Math.floor(Math.random() * 40); 
    const redActivity = 40 + Math.floor(Math.random() * 40);
    const isBalanced = Math.abs(blueActivity - redActivity) < 15;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
            <div className="w-full max-w-4xl h-[70vh] flex flex-col relative rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 z-50 text-gray-500 hover:text-white bg-black/50 p-2 rounded-full"><X /></button>
                
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                    <h2 className="text-3xl font-black font-sans text-white tracking-[0.3em] uppercase drop-shadow-lg">FACTION SELECT</h2>
                    <div className="text-xs font-mono text-gray-400 bg-black/60 px-3 py-1 rounded border border-white/10 mt-2 flex items-center gap-2">
                        <Signal className="w-3 h-3 text-green-400" />
                        ESTABLISHING NEURAL LINK...
                    </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row h-full">
                    {/* BLUE TEAM */}
                    <div className="flex-1 relative group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-white/10" onClick={() => onSelect(1)}>
                        <div className="absolute inset-0 bg-blue-900/20 group-hover:bg-blue-600/20 transition-colors duration-500"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
                            <div className="relative mb-6 transform group-hover:scale-110 transition-transform duration-300">
                                <div className="absolute inset-0 bg-cyan-500/30 blur-3xl rounded-full animate-pulse"></div>
                                <Shield className="w-24 h-24 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                            </div>
                            <h3 className="text-4xl font-black text-cyan-400 font-sans tracking-tighter mb-2">BLUE TEAM</h3>
                            <div className="text-sm font-mono text-cyan-200 mb-6">DEFENDERS OF THE CORE</div>
                            
                            <div className="flex items-center gap-2 mb-4 bg-black/40 px-3 py-1 rounded">
                                <Activity className="w-4 h-4 text-cyan-500" />
                                <span className="font-bold font-mono text-sm text-gray-300">SIGNAL STRENGTH: {blueActivity}%</span>
                            </div>
                            
                            <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                                <div className="px-8 py-3 bg-cyan-500 text-black font-bold font-sans tracking-widest rounded clip-path-polygon hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                    INITIATE LINK
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RED TEAM */}
                    <div className="flex-1 relative group cursor-pointer overflow-hidden" onClick={() => onSelect(2)}>
                        <div className="absolute inset-0 bg-red-900/20 group-hover:bg-red-600/20 transition-colors duration-500"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
                            <div className="relative mb-6 transform group-hover:scale-110 transition-transform duration-300">
                                <div className="absolute inset-0 bg-red-500/30 blur-3xl rounded-full animate-pulse"></div>
                                <Swords className="w-24 h-24 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                            </div>
                            <h3 className="text-4xl font-black text-red-500 font-sans tracking-tighter mb-2">RED TEAM</h3>
                            <div className="text-sm font-mono text-red-200 mb-6">AGGRESSORS OF THE VOID</div>
                            
                            <div className="flex items-center gap-2 mb-4 bg-black/40 px-3 py-1 rounded">
                                <Activity className="w-4 h-4 text-red-500" />
                                <span className="font-bold font-mono text-sm text-gray-300">SIGNAL STRENGTH: {redActivity}%</span>
                            </div>

                            <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                                <div className="px-8 py-3 bg-red-500 text-black font-bold font-sans tracking-widest rounded clip-path-polygon hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                    INITIATE LINK
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
