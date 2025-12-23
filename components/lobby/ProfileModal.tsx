
import React, { useState, useEffect } from 'react';
import { AccountData } from '../../types';
import { Persistence, getRankInfo } from '../../engine/Persistence';
import { soundManager } from '../../engine/SoundManager';
import { X, User, ShieldCheck, Crown, Edit3, Lock, Timer, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    onSaveName: (newName: string) => Promise<boolean>;
    account: AccountData;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentName, onSaveName, account }) => {
    const [name, setName] = useState(currentName);
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [msg, setMsg] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (isOpen) {
            const check = Persistence.canChangeNickname();
            setTimeLeft(check.timeLeft);
            setName(currentName);
        }
    }, [isOpen, currentName]);

    const formatTimeLeft = (ms: number) => {
        const d = Math.floor(ms / (24*60*60*1000));
        const h = Math.floor((ms % (24*60*60*1000)) / (60*60*1000));
        return `${d}d ${h}h`;
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setStatus('LOADING');
        soundManager.playUiClick();
        
        try {
            const result = await Persistence.updateNickname(name.trim());
            if (result.success) {
                setStatus('SUCCESS');
                setMsg('IDENTITY RE-ENCODED');
                if (onSaveName) await onSaveName(name.trim());
                setTimeout(() => { onClose(); setStatus('IDLE'); }, 1500);
            } else {
                setStatus('ERROR');
                setMsg(result.message);
                soundManager.playDamage();
            }
        } catch (e) {
            setStatus('ERROR');
            setMsg('UPLINK FAILURE');
        }
    };

    if (!isOpen) return null;

    const rankInfo = getRankInfo(account.rank);
    const isVerified = account.rank > 50 || account.role === 'ADMIN'; 

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
            <MotionDiv initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg rounded-xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col md:flex-row">
                
                {/* Visual Side */}
                <div className="w-full md:w-1/3 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 w-24 h-24 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/50 animate-pulse"></div>
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/20">
                             {account.equippedFlag !== 'NONE' ? (
                                 <img src={`https://flagcdn.com/w80/${account.equippedFlag.toLowerCase()}.png`} className="w-full h-full object-cover opacity-80" />
                             ) : <User className="w-10 h-10 text-gray-500" />}
                        </div>
                        {isVerified && (
                            <div className={`absolute -bottom-2 -right-2 ${account.role === 'ADMIN' ? 'bg-red-500' : 'bg-blue-500'} text-white p-1 rounded-full border border-black shadow-lg`} title="Verified Operative">
                                {account.role === 'ADMIN' ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            </div>
                        )}
                    </div>
                    <div className="text-xl font-black text-white tracking-widest font-sans">{name.toUpperCase()}</div>
                    <div className={`text-[10px] font-mono mb-4 ${account.role === 'ADMIN' ? 'text-red-500 font-bold animate-pulse' : 'text-cyan-500'}`}>
                        {account.role === 'ADMIN' ? 'SYSTEM ADMINISTRATOR' : (isVerified ? 'VERIFIED OPERATIVE' : 'ROOKIE PILOT')}
                    </div>
                    
                    <div className="w-full h-px bg-white/10 mb-4"></div>
                    <div className="grid grid-cols-2 gap-2 w-full text-center">
                        <div>
                            <div className="text-[9px] text-gray-500">RANK</div>
                            <div className="text-lg font-bold text-white">{account.rank}</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-gray-500">SCORE</div>
                            <div className="text-lg font-bold text-yellow-400">{(account.highScore/1000).toFixed(1)}k</div>
                        </div>
                    </div>
                </div>

                {/* Edit Side */}
                <div className="flex-1 p-6 md:p-8 flex flex-col relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    
                    <h2 className="text-lg font-bold text-white tracking-widest font-sans mb-1 flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-cyan-400" /> IDENTITY MATRIX
                    </h2>
                    <p className="text-[10px] text-gray-500 font-mono mb-6">Modifying your neural signature requires a system reboot and a strict cooldown period to maintain global integrity.</p>

                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="text-[10px] font-bold font-mono text-cyan-400 mb-2 block flex justify-between">
                                <span>CALLSIGN</span>
                                {timeLeft > 0 && <span className="text-red-400 flex items-center gap-1"><Lock className="w-3 h-3" /> LOCKED</span>}
                            </label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value.toUpperCase())}
                                    maxLength={15}
                                    disabled={timeLeft > 0 || status === 'LOADING'}
                                    className={`
                                        w-full bg-black/60 border rounded p-4 text-xl font-mono text-center tracking-[0.2em] outline-none transition-all
                                        ${timeLeft > 0 ? 'border-red-500/30 text-gray-600 cursor-not-allowed' : 'border-white/20 text-white focus:border-cyan-500 focus:bg-cyan-900/10'}
                                    `}
                                />
                            </div>
                            {timeLeft > 0 ? (
                                <div className="mt-2 p-2 bg-red-900/10 border border-red-500/20 rounded text-[10px] font-mono text-red-400 text-center flex items-center justify-center gap-2">
                                    <Timer className="w-3 h-3" /> 
                                    NEXT CHANGE AVAILABLE IN: <span className="font-bold text-white">{formatTimeLeft(timeLeft)}</span>
                                </div>
                            ) : (
                                <div className="mt-2 text-[10px] font-mono text-green-400 text-center flex items-center justify-center gap-1 opacity-50">
                                    <CheckCircle className="w-3 h-3" /> CHANGE AVAILABLE. WILL LOCK FOR 3 DAYS.
                                </div>
                            )}
                        </div>

                        <div className="mt-auto">
                            <AnimatePresence>
                                {msg && (
                                    <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 text-xs font-bold font-mono text-center py-2 rounded border ${status === 'SUCCESS' ? 'text-green-400 bg-green-900/20 border-green-500/30' : 'text-red-400 bg-red-900/20 border-red-500/30'}`}>
                                        {msg}
                                    </MotionDiv>
                                )}
                            </AnimatePresence>

                            <button 
                                onClick={handleSave}
                                disabled={timeLeft > 0 || status === 'LOADING' || name === currentName}
                                className={`
                                    w-full py-4 rounded font-bold font-sans tracking-widest text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden group
                                    ${timeLeft > 0 || name === currentName ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'}
                                `}
                            >
                                {status === 'LOADING' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CONFIRM IDENTITY REWRITE'}
                            </button>
                        </div>
                    </div>
                </div>
            </MotionDiv>
        </div>
    );
};
