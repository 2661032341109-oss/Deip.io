
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, PlayerProfile, AccountData, Mission, LeaderboardEntry, WeaponSchema } from '../types';
import { MODES, EVOLUTION_TREE, COLORS } from '../constants';
import { Persistence, getRankInfo, getLevelProgress, RANK_DEFINITIONS, SHOP_ITEMS } from '../engine/Persistence';
import { Settings, BookOpen, Activity, Users, ShieldCheck, Loader2, HelpCircle, X, Target, ShoppingBag, Star, Zap, Clock, Skull, CheckCircle, Crown, Medal, Lock, TrendingUp, Gift, PlayCircle, AlertTriangle, Database, Code, LogIn, LogOut, Mail, Fingerprint, RefreshCw, User, Globe, Edit3, Timer, Award, Flag, ChevronRight, Wifi, WifiOff, Swords, Shield } from 'lucide-react';
import { soundManager } from '../engine/SoundManager';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';
import { TankPreview } from './TankPreview'; 

// ... (MissionCard stays same)
const MissionCard: React.FC<{ mission: Mission, onClaim: (id: string) => void }> = ({ mission, onClaim }) => {
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
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden relative"><motion.div className={`h-full bg-cyan-500`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} /></div>
            )}
            <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] text-gray-500 font-mono">{Math.floor(mission.currentValue)} / {mission.targetValue}</span>
                {isClaimed ? ( <div className="flex items-center gap-1 text-[9px] text-green-400 font-bold bg-green-900/20 px-2 py-0.5 rounded"><CheckCircle className="w-3 h-3" /> CLAIMED</div> ) : isComplete ? ( <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onClaim(mission.id)} className="flex items-center gap-1 text-[9px] text-black font-bold bg-yellow-400 hover:bg-yellow-300 px-3 py-1 rounded animate-pulse shadow-lg">CLAIM REWARD</motion.button> ) : null}
            </div>
        </div>
    );
};

// ... (AuthModal same)
const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void; nickname: string; onUpdateNickname: (name: string) => void; }> = ({ isOpen, onClose, nickname, onUpdateNickname }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPassword = password.length >= 6;
    const canSubmit = isValidEmail && isValidPassword && !isLoading;
    const handleDiscordLogin = () => { soundManager.playUiClick(); Persistence.loginDiscord(); };
    const handleEmailSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!canSubmit) return; setIsLoading(true); setError(null); soundManager.playUiClick(); try { if (mode === 'LOGIN') { const { error } = await Persistence.loginEmail(email, password); if (error) throw error; } else { const finalNickname = nickname || `Operative-${Math.floor(Math.random()*1000)}`; if (!nickname) onUpdateNickname(finalNickname); const { error } = await Persistence.registerEmail(email, password, finalNickname); if (error) throw error; } onClose(); } catch (err: any) { console.error("Auth Error", err); setError(err.message || "Authentication Failed"); soundManager.playDamage(); } finally { setIsLoading(false); } };
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="glass-panel w-full max-w-sm p-6 rounded-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,243,255,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-center mb-6"><h2 className="text-2xl font-black font-sans text-white tracking-widest mb-1">{mode === 'LOGIN' ? 'ACCESS UPLINK' : 'NEW IDENTITY'}</h2><div className="text-[10px] font-mono text-cyan-500/70">SECURE CONNECTION PROTOCOL</div></div>
                <div className="flex bg-black/40 rounded p-1 mb-6 border border-white/5"><button onClick={() => { setMode('LOGIN'); setError(null); }} className={`flex-1 py-2 text-xs font-bold font-mono rounded transition-all ${mode === 'LOGIN' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>LOGIN</button><button onClick={() => { setMode('REGISTER'); setError(null); }} className={`flex-1 py-2 text-xs font-bold font-mono rounded transition-all ${mode === 'REGISTER' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>REGISTER</button></div>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold font-mono text-gray-400 flex justify-between">EMAIL {email && (isValidEmail ? <span className="text-green-400">OK</span> : <span className="text-red-400">INVALID</span>)}</label><div className="relative"><Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="email" className="w-full bg-black/60 border border-white/10 rounded p-3 pl-10 text-sm text-white focus:border-cyan-500 outline-none transition-colors font-mono" placeholder="operative@corebound.io" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold font-mono text-gray-400 flex justify-between">PASSWORD {password && (isValidPassword ? <span className="text-green-400">OK</span> : <span className="text-red-400">MIN 6 CHARS</span>)}</label><div className="relative"><Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="password" className="w-full bg-black/60 border border-white/10 rounded p-3 pl-10 text-sm text-white focus:border-cyan-500 outline-none transition-colors font-mono" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>
                    {mode === 'REGISTER' && (<div className="p-2 bg-yellow-900/10 border border-yellow-500/20 rounded text-[9px] text-yellow-500/80 font-mono text-center">Note: Your current nickname <b>"{nickname || 'Unknown'}"</b> will be linked to this account.</div>)}
                    <AnimatePresence>{error && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[10px] text-red-400 bg-red-900/20 p-2 rounded border border-red-500/30 font-mono text-center">{error}</motion.div>)}</AnimatePresence>
                    <button type="submit" disabled={!canSubmit} className={`w-full py-3 rounded font-bold font-sans tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${canSubmit ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'LOGIN' ? 'AUTHENTICATE' : 'CREATE ID')}</button>
                </form>
                <div className="flex items-center gap-2 my-4"><div className="h-px bg-white/10 flex-1"></div><span className="text-[10px] text-gray-500 font-mono">OR CONNECT VIA</span><div className="h-px bg-white/10 flex-1"></div></div>
                <button onClick={handleDiscordLogin} className="w-full py-3 bg-[#5865F2]/20 hover:bg-[#5865F2]/40 border border-[#5865F2]/50 text-[#5865F2] hover:text-white rounded font-bold font-sans text-xs tracking-widest transition-all flex items-center justify-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/></svg>DISCORD</button>
            </motion.div>
        </div>
    );
};

// ... (ProfileModal same)
const ProfileModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    currentName: string;
    onSaveName: (newName: string) => Promise<boolean>;
    account: AccountData;
}> = ({ isOpen, onClose, currentName, onSaveName, account }) => {
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel w-full max-w-lg rounded-xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col md:flex-row">
                
                {/* Visual Side */}
                <div className="w-full md:w-1/3 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 w-24 h-24 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/50 animate-pulse"></div>
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border border-white/20">
                             {/* Show Flag if equipped */}
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
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 text-xs font-bold font-mono text-center py-2 rounded border ${status === 'SUCCESS' ? 'text-green-400 bg-green-900/20 border-green-500/30' : 'text-red-400 bg-red-900/20 border-red-500/30'}`}>
                                        {msg}
                                    </motion.div>
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
            </motion.div>
        </div>
    );
};

// ... (LeaderboardOverlay same)
const LeaderboardOverlay: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    entries: LeaderboardEntry[];
}> = ({ isOpen, onClose, entries }) => {
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
                {/* Visual Side Same */}
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
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} key={entry.id} className={`flex items-center justify-between p-3 rounded border transition-all hover:scale-[1.01] ${entry.isSelf ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
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
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// NEW: Team Selection Modal
const TeamSelectionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSelect: (team: number) => void }> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    // Simulate balanced counts (In real app, this comes from server)
    const blueCount = Math.floor(Math.random() * 20) + 10;
    const redCount = Math.floor(Math.random() * 20) + 10;
    const total = blueCount + redCount;
    const balanced = Math.abs(blueCount - redCount) <= 2;
    const recommendBlue = redCount > blueCount + 2;
    const recommendRed = blueCount > redCount + 2;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
            <div className="w-full max-w-4xl h-[70vh] flex flex-col relative rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 z-50 text-gray-500 hover:text-white bg-black/50 p-2 rounded-full"><X /></button>
                
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                    <h2 className="text-3xl font-black font-sans text-white tracking-[0.3em] uppercase drop-shadow-lg">CHOOSE FACTION</h2>
                    <div className="text-xs font-mono text-gray-400 bg-black/60 px-3 py-1 rounded border border-white/10 mt-2">
                        BALANCED MATCHMAKING ACTIVE
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
                            
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-4 h-4 text-cyan-500" />
                                <span className="font-bold font-mono text-lg text-white">{blueCount} OPERATIVES</span>
                            </div>

                            {recommendBlue && (
                                <div className="px-3 py-1 bg-green-500/20 border border-green-500 text-green-400 text-xs font-bold rounded animate-pulse">
                                    RECOMMENDED (XP BOOST)
                                </div>
                            )}
                            
                            <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                                <div className="px-8 py-3 bg-cyan-500 text-black font-bold font-sans tracking-widest rounded clip-path-polygon hover:bg-cyan-400">
                                    JOIN BLUE
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
                            
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-4 h-4 text-red-500" />
                                <span className="font-bold font-mono text-lg text-white">{redCount} OPERATIVES</span>
                            </div>

                            {recommendRed && (
                                <div className="px-3 py-1 bg-green-500/20 border border-green-500 text-green-400 text-xs font-bold rounded animate-pulse">
                                    RECOMMENDED (XP BOOST)
                                </div>
                            )}

                            <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                                <div className="px-8 py-3 bg-red-500 text-black font-bold font-sans tracking-widest rounded clip-path-polygon hover:bg-red-400">
                                    JOIN RED
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface LobbyProps {
  onStart: (profile: PlayerProfile) => void;
  onChangeView: (view: ViewState) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStart, onChangeView }) => {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState('');
  const [onlineCount, setOnlineCount] = useState(1); 
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRankOverview, setShowRankOverview] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [showTeamSelect, setShowTeamSelect] = useState(false); // New
  
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'LOCAL' | 'GLOBAL'>('LOCAL');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  const [account, setAccount] = useState<AccountData>(Persistence.load());
  const [dailyBonus, setDailyBonus] = useState(0);
  const [user, setUser] = useState<any>(null); 
  
  const constraintsRef = useRef(null);

  // --- INIT LOGIC ---
  useEffect(() => {
      // 1. Auth & Local State
      Persistence.initAuth((u) => {
          setUser(u);
          const loaded = Persistence.load();
          setAccount(loaded);
          if (loaded.nickname) setNickname(loaded.nickname);
      });

      // 2. Daily Rewards
      const result = Persistence.checkDailyLogic();
      if (result.bonus > 0) { setDailyBonus(result.bonus); soundManager.playKillConfirm(); }
      
      // 3. Initial Nickname Load
      const loaded = Persistence.load();
      if (loaded.nickname) setNickname(loaded.nickname);
      else { const savedName = localStorage.getItem('COREBOUND_NICKNAME'); if (savedName) setNickname(savedName); }
      
      // 4. Global Leaderboard
      Persistence.fetchGlobalLeaderboard().then(data => { setGlobalLeaderboard(data); });

      // 5. REALTIME ONLINE COUNT (Supabase Presence)
      const unsubscribe = Persistence.initPresence((count) => {
          setOnlineCount(count);
      });

      return () => {
          if (unsubscribe) unsubscribe();
      };
  }, []);
  
  const getRoomId = (mode: string) => { const modeKey = mode.toLowerCase().replace(/ /g, '-'); return `cb-evo-global-${modeKey}`; };
  const handleClaimMission = (id: string) => { const updatedAccount = Persistence.claimMission(id); if (updatedAccount) { setAccount(updatedAccount); soundManager.playKillConfirm(); } };
  const handleAuthClick = () => { soundManager.playUiClick(); setShowAuthModal(true); };
  const handleProfileClick = () => { soundManager.playUiClick(); setShowProfileModal(true); };
  const handleLogout = () => { soundManager.playUiClick(); Persistence.logout(); };
  
  const updateNickname = async (name: string): Promise<boolean> => {
      setNickname(name);
      const current = Persistence.load();
      current.nickname = name;
      setAccount(Persistence.load()); 
      return true;
  };

  const handleModeSelect = (mode: string, resume: boolean = false) => {
    if (!nickname.trim()) { alert("Please enter a nickname first."); return; }
    if (!account.nickname) { 
        const data = Persistence.load(); data.nickname = nickname; Persistence.save(data); 
    }
    soundManager.initialize(); soundManager.playUiClick();

    if (mode === '2-Teams' && !resume) {
        setShowTeamSelect(true);
        return;
    }

    // Logic Magic: If we have a saved run, we carry over its Level/Score regardless of mode
    // unless explicitly resetting (which we don't support in simple UI yet, effectively "New Game+")
    const runToCarry = account.savedRun;

    onStart({ 
        nickname, 
        gameMode: mode, 
        roomId: getRoomId(mode), 
        isHost: false, 
        skinId: account.equippedSkin, 
        trailId: account.equippedTrail || 'NONE', 
        flagId: account.equippedFlag || 'NONE', 
        savedRun: resume ? (account.savedRun || undefined) : (runToCarry || undefined) 
    });
  };

  const handleTeamSelected = (teamId: number) => {
      setShowTeamSelect(false);
      const runToCarry = account.savedRun;
      onStart({ 
          nickname, 
          gameMode: '2-Teams', 
          roomId: getRoomId('2-Teams'), 
          isHost: false, 
          skinId: account.equippedSkin, 
          trailId: account.equippedTrail || 'NONE', 
          flagId: account.equippedFlag || 'NONE',
          teamId: teamId,
          savedRun: runToCarry || undefined
      });
  };

  const rankInfo = getRankInfo(account.rank);
  const progressData = getLevelProgress(account.totalExp, account.rank);
  const savedRun = account.savedRun;
  const savedWeapon = savedRun ? EVOLUTION_TREE.find(w => w.id === savedRun.weaponId) : null;
  const savedWeaponName = savedWeapon ? t(`unit_${savedWeapon.id}_name`, { defaultValue: savedWeapon.name }) : 'Unknown Unit';
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full p-4 lg:p-8 overflow-y-auto lg:overflow-hidden custom-scrollbar">
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} nickname={nickname} onUpdateNickname={updateNickname} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} currentName={nickname} onSaveName={updateNickname} account={account} />
      <LeaderboardOverlay isOpen={showGlobalLeaderboard} onClose={() => setShowGlobalLeaderboard(false)} entries={globalLeaderboard} />
      
      <TeamSelectionModal isOpen={showTeamSelect} onClose={() => setShowTeamSelect(false)} onSelect={handleTeamSelected} />

      <AnimatePresence>
      {dailyBonus > 0 && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 p-4 rounded-lg flex items-center gap-4 backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="p-3 bg-yellow-500 rounded-full shrink-0"><Star className="w-6 h-6 text-black" fill="black" /></motion.div>
                  <div className="flex-1"><div className="text-yellow-400 font-bold font-mono tracking-widest text-xs md:text-sm">{t('lobby_daily_reward')}</div><div className="text-white font-black text-xl md:text-2xl">+{dailyBonus} DUST</div></div>
                  <button onClick={() => setDailyBonus(0)} className="ml-2 text-gray-400 hover:text-white"><X /></button>
              </div>
          </motion.div>
      )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="mb-4 lg:mb-8 text-center relative group shrink-0">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white font-sans tracking-tighter drop-shadow-2xl">CORE<span className="text-cyan-400">BOUND</span></h1>
        <div className="text-cyan-400/80 font-mono text-[10px] md:text-xs lg:text-sm tracking-[0.5em] mt-1 lg:mt-2">EVOLUTION PROTOCOL v2.0 [DEEP NET]</div>
      </motion.div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[650px]">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 flex flex-col gap-4 h-auto lg:h-full order-1 lg:order-none">
            <div className="glass-panel p-4 lg:p-6 rounded-sm border-l-4 border-l-cyan-500 flex flex-col gap-4">
                <div className="flex justify-between items-center"><label className="text-xs font-mono text-cyan-500/70 block uppercase">Operative_Identity</label>
                {user ? (
                    <div className="flex items-center gap-2 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                        <Wifi className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 font-mono font-bold">ONLINE ({user.email ? 'EMAIL' : 'DISCORD'})</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-gray-800/50 px-2 py-1 rounded border border-white/10">
                        <WifiOff className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] text-gray-500 font-mono font-bold">GUEST MODE</span>
                    </div>
                )}
                </div>
                
                {account.role === 'ADMIN' && (
                    <div className="bg-red-500/20 border border-red-500/50 p-2 rounded flex items-center justify-center gap-2 animate-pulse">
                        <Crown className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-black text-red-400 font-sans tracking-widest">SYSTEM ADMINISTRATOR</span>
                    </div>
                )}

                <div className="relative group">
                    <input type="text" placeholder={t('lobby_enter_name')} className="w-full bg-black/40 border border-white/10 text-white p-3 lg:p-4 font-mono text-lg lg:text-xl focus:border-cyan-500 focus:outline-none transition-all placeholder-white/20 uppercase rounded pr-12 cursor-pointer group-hover:bg-white/5" value={nickname} readOnly onClick={handleProfileClick} />
                    <button onClick={handleProfileClick} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-cyan-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                </div>

                {user ? (
                    <button onClick={handleLogout} className="w-full py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500 text-red-400 hover:text-white rounded text-xs font-bold font-mono tracking-widest transition-all flex items-center justify-center gap-2 group">
                        <LogOut className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                        DISCONNECT UPLINK
                    </button>
                ) : (
                    <button onClick={handleAuthClick} className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-300 hover:text-white rounded text-xs font-bold font-mono tracking-widest transition-all flex items-center justify-center gap-2 group">
                        <LogIn className="w-3 h-3" />
                        LOGIN / REGISTER (SAVE PROGRESS)
                    </button>
                )}
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { soundManager.playUiClick(); setShowRankOverview(true); }} className="bg-black/40 border border-white/10 hover:border-cyan-500/50 p-4 rounded-lg relative overflow-hidden group cursor-pointer transition-colors">
                    <div className="absolute top-2 right-2 text-gray-600 group-hover:text-cyan-400 transition-colors flex items-center gap-1"><TrendingUp className="w-4 h-4" /><span className="text-[9px] font-mono">ROAD MAP</span></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 lg:w-12 lg:h-12 rounded flex items-center justify-center text-xl lg:text-2xl shadow-lg border border-white/10" style={{ backgroundColor: `${rankInfo.current.color}20`, borderColor: rankInfo.current.color }}>{rankInfo.current.icon}</div><div><div className="text-xs lg:text-sm font-bold font-mono tracking-wider" style={{ color: rankInfo.current.color }}>{rankInfo.current.tier}</div><div className="text-xl lg:text-2xl font-black text-white font-sans leading-none">RANK {account.rank}</div></div></div>
                        <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1"><span>LEVEL PROGRESS</span><span>{Math.floor(progressData.current).toLocaleString()} / {progressData.required.toLocaleString()} XP</span></div>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mb-1 relative"><motion.div className="h-full relative overflow-hidden" style={{ backgroundColor: rankInfo.current.color }} initial={{ width: 0 }} animate={{ width: `${progressData.percent}%` }} transition={{ duration: 1.5, ease: "circOut" }}></motion.div></div>
                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><div className="flex flex-col"><span className="text-[10px] text-gray-500 font-mono">COSMIC DUST</span><span className="text-lg lg:text-xl font-bold text-yellow-400 flex items-center gap-1"><Zap className="w-4 h-4 fill-yellow-400" /> {account.currency.toLocaleString()}</span></div><div className="flex flex-col text-right"><span className="text-[10px] text-gray-500 font-mono">{t('stats_score').toUpperCase()}</span><span className="text-base lg:text-lg font-bold text-white">{account.highScore.toLocaleString()}</span></div></div>
                    </div>
                </motion.div>
            </div>
            
            <div className="glass-panel p-0 rounded-sm flex-1 flex flex-col bg-black/60 min-h-[200px] overflow-hidden">
                <div className="flex border-b border-white/10">
                    <button onClick={() => setActiveLeaderboardTab('LOCAL')} className={`flex-1 py-3 text-xs font-bold font-mono transition-colors ${activeLeaderboardTab === 'LOCAL' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'}`}>MISSIONS</button>
                    <button onClick={() => { setActiveLeaderboardTab('GLOBAL'); setShowGlobalLeaderboard(true); }} className={`flex-1 py-3 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2 ${activeLeaderboardTab === 'GLOBAL' ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-500 hover:text-gray-300'}`}><Globe className="w-3 h-3" /> GLOBAL RANK</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <div className="space-y-2">{account.missions.length > 0 ? (account.missions.map(m => <MissionCard key={m.id} mission={m} onClaim={handleClaimMission} />)) : (<div className="text-center text-gray-500 text-xs py-4">{t('lobby_no_missions')}</div>)}</div>
                </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-8 flex flex-col gap-4 h-auto lg:h-full order-2 lg:order-none">
              
              {/* REALTIME TRAFFIC MONITOR */}
              <div className="glass-panel p-3 flex justify-between items-center bg-black/60 border border-green-500/20 shadow-[0_0_15px_rgba(0,255,100,0.05)]">
                  <div className="flex items-center gap-3">
                      <div className="relative">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full relative z-10 shadow-[0_0_10px_#0f0]"></div>
                      </div>
                      <div className="text-green-400 font-bold font-mono tracking-widest text-xs">
                          GLOBAL OPERATIVES ONLINE
                      </div>
                  </div>
                  <div className="text-xl font-black text-white font-mono flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-500" />
                      {onlineCount.toLocaleString()}
                  </div>
              </div>

              <div className="glass-panel p-4 md:p-6 lg:p-8 rounded-sm flex flex-col flex-1 border border-white/10 min-h-[350px]">
                  <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2 shrink-0"><h2 className="text-lg md:text-xl font-bold text-white font-sans tracking-widest flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" />{t('lobby_select_zone')}</h2><div className="text-[10px] md:text-xs font-mono text-gray-500 hidden sm:block">SELECT A ZONE TO DEPLOY</div></div>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                      {savedRun && (<motion.button variants={itemVariants} onClick={() => handleModeSelect(savedRun.gameMode, true)} className="group relative flex items-center justify-between p-3 md:p-4 bg-yellow-900/10 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500 transition-all text-left rounded shadow-[0_0_15px_rgba(234,179,8,0.1)] mb-2" onMouseEnter={() => soundManager.playUiHover()} whileHover={{ scale: 1.01, x: 5 }} whileTap={{ scale: 0.99 }}><div className="flex items-center gap-4"><div className="w-12 h-12 bg-yellow-500/20 rounded flex items-center justify-center border border-yellow-500/50 relative overflow-hidden"><PlayCircle className="w-6 h-6 text-yellow-400 relative z-10" /><div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div></div><div><div className="text-lg font-black text-yellow-400 font-sans tracking-wide uppercase flex items-center gap-2">RESUME: {savedWeaponName}<span className="text-[10px] bg-yellow-500 text-black px-1.5 rounded font-bold animate-pulse">SAVED</span></div><div className="text-[10px] font-mono text-gray-400 flex items-center gap-2"><span>LVL {savedRun.level}</span><span className="w-1 h-1 bg-gray-600 rounded-full"></span><span>SCORE: {savedRun.score.toLocaleString()}</span></div></div></div><div className="text-yellow-400 font-bold font-mono text-xs flex items-center gap-1">CONTINUE <PlayCircle className="w-3 h-3" /></div></motion.button>)}
                      {MODES.map((mode) => { const isSandbox = mode === 'Sandbox'; return (<motion.button variants={itemVariants} key={mode} onClick={() => handleModeSelect(mode)} className={`group relative flex items-center justify-between p-3 md:p-4 bg-white/5 border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-left rounded`} onMouseEnter={() => soundManager.playUiHover()} whileHover={{ scale: 1.01, x: 5 }} whileTap={{ scale: 0.99 }}><div className="flex items-center gap-3 md:gap-4"><div className={`w-10 h-10 md:w-12 md:h-12 bg-black/50 rounded flex items-center justify-center border group-hover:border-cyan-500/50 transition-colors shrink-0 border-white/10`}>{isSandbox ? <Code className="w-5 h-5 text-gray-500" /> : <span className={`font-mono font-bold text-base md:text-lg text-gray-500 group-hover:text-cyan-400`}>{mode.substring(0,2).toUpperCase()}</span>}</div><div><div className="text-base md:text-lg font-bold text-gray-200 group-hover:text-white font-sans uppercase flex items-center gap-2">{mode}{savedRun && !isSandbox && (<span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-1.5 rounded flex items-center gap-1"><Database className="w-2 h-2" /> STATS CARRIED OVER</span>)}{isSandbox ? (<span className="text-[9px] bg-gray-700 text-gray-300 px-1.5 rounded font-mono">UNRANKED</span>) : (<span className="text-[9px] bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 px-1.5 rounded font-mono flex items-center gap-1"><Database className="w-2 h-2" /> PERSISTENT</span>)}</div><div className="flex items-center gap-2 text-[10px] font-mono text-gray-500"><span className="text-gray-600">● REGION: GLOBAL</span></div></div></div><div className="flex items-center gap-2 md:gap-6"><div className={`px-4 py-2 md:px-6 md:py-2 font-bold font-mono text-[10px] md:text-xs rounded border transition-all bg-cyan-500/20 text-cyan-400 border-cyan-500/50 group-hover:bg-cyan-500 group-hover:text-black`}>{t('lobby_deploy')}</div></div></motion.button>)})}
                  </motion.div>
              </div>

              <div className="grid grid-cols-4 gap-2 md:gap-3 h-14 md:h-16 shrink-0">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); onChangeView(ViewState.SHOP); }} className="col-span-1 bg-yellow-900/20 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/50 text-yellow-400 rounded flex flex-col items-center justify-center transition-all group p-1"><ShoppingBag className="w-4 h-4 md:w-5 md:h-5 mb-1 group-hover:scale-110 transition-transform" /><span className="text-[9px] md:text-[10px] font-bold font-mono text-center leading-none">{t('shop_title')}</span></motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); onChangeView(ViewState.SETTINGS); }} className="flex flex-col items-center justify-center p-1 md:p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/50 transition-all group rounded"><Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-cyan-400 mb-1" /><span className="font-mono text-[9px] md:text-[10px] text-gray-500 group-hover:text-white text-center leading-none">{t('settings_title')}</span></motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); onChangeView(ViewState.ENCYCLOPEDIA); }} className="flex flex-col items-center justify-center p-1 md:p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/50 transition-all group rounded"><BookOpen className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-pink-400 mb-1" /><span className="font-mono text-[9px] md:text-[10px] text-gray-500 group-hover:text-white text-center leading-none">DATA</span></motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); setShowTutorial(true); }} className="flex flex-col items-center justify-center p-1 md:p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-yellow-500/50 transition-all group rounded"><HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-yellow-400 mb-1" /><span className="font-mono text-[9px] md:text-[10px] text-gray-500 group-hover:text-white text-center leading-none">HELP</span></motion.button>
              </div>
          </motion.div>
      </div>
      <div className="mt-4 md:mt-6 flex flex-wrap justify-center md:justify-start gap-4 text-[9px] md:text-[10px] font-mono text-gray-600 pb-4"><div className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SECURE CONNECTION</div><div>PROTOCOL: REALTIME-SYNC</div><div>REGION: GLOBAL</div></div>
      <AnimatePresence>{showTutorial && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-4xl p-6 md:p-8 rounded-lg max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-xl md:text-2xl font-black text-white">{t('help_title')}</h2><button onClick={() => setShowTutorial(false)}><X className="text-white" /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-300 font-mono text-sm"><div><h3 className="text-cyan-400 font-bold mb-2">{t('help_controls')}</h3><p className="whitespace-pre-line leading-relaxed">{t('help_controls_desc')}</p></div><div><h3 className="text-yellow-400 font-bold mb-2">{t('help_progression')}</h3><p className="whitespace-pre-line leading-relaxed">{t('help_progression_desc')}</p></div></div><Button variant="primary" onClick={() => setShowTutorial(false)} className="mt-8 w-full">{t('help_dismiss')}</Button></motion.div></motion.div>)}</AnimatePresence>
      <AnimatePresence>{showRankOverview && (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col p-0 md:p-4 overflow-hidden"><div className="flex justify-between items-center p-4 shrink-0 bg-black/40 border-b border-white/5 relative z-20"><div className="flex items-center gap-4"><div className="bg-cyan-500/20 p-2 rounded shadow-[0_0_15px_rgba(0,243,255,0.3)]"><TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" /></div><div><h2 className="text-lg md:text-2xl font-black text-white font-sans tracking-widest uppercase flex items-center gap-2">{t('rank_title')} <span className="text-cyan-500 text-[10px] md:text-sm align-middle hidden sm:inline">/// COMMANDER CLEARANCE</span></h2><div className="text-[10px] md:text-xs font-mono text-gray-500 flex items-center gap-2"><span>{t('rank_current')}: RANK {account.rank}</span><span className="w-1 h-1 bg-gray-500 rounded-full"></span><span className="text-yellow-400">{t('rank_next')}: {RANK_DEFINITIONS.find(r => r.minRank > account.rank)?.tier || 'MAX'}</span></div></div></div><button onClick={() => setShowRankOverview(false)} className="text-gray-500 hover:text-white p-2 bg-white/5 rounded-full hover:bg-red-500/20 transition-all"><X className="w-5 h-5 md:w-6 md:h-6" /></button></div><div className="flex-1 relative overflow-hidden bg-[#050508] cursor-grab active:cursor-grabbing select-none" ref={constraintsRef}><div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none"></div><motion.div drag="x" dragConstraints={{ left: -2000, right: 0 }} className="w-full h-full flex items-center pl-[10vw]"><div className="relative flex items-center gap-12 md:gap-24 py-20 min-w-max"><div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -z-10 rounded-full"></div><motion.div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,243,255,0.6)] -z-10" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (account.rank / 100) * 100)}%` }} transition={{ duration: 2, ease: "easeInOut" }}><div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_#fff] animate-pulse"></div></motion.div>{RANK_DEFINITIONS.map((def, idx) => { const isReached = account.rank >= def.minRank; const isCurrent = rankInfo.current.tier === def.tier; return (<motion.div key={def.tier} className="relative flex flex-col items-center group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}><div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 bg-[#050508] z-0 transition-colors duration-300 ${isReached ? 'border-cyan-500 shadow-[0_0_10px_#00f3ff]' : 'border-gray-800'}`}></div><motion.div whileHover={{ scale: 1.1, y: -5 }} className={`w-24 h-28 md:w-36 md:h-40 flex flex-col items-center justify-center transition-all duration-300 relative clip-path-polygon ${isReached ? 'bg-gradient-to-b from-gray-800 to-black border-none' : 'bg-black/40 grayscale opacity-40'} ${isCurrent ? 'ring-4 ring-cyan-500 shadow-[0_0_50px_rgba(0,243,255,0.3)] z-10 scale-110' : ''}`} style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", border: isReached ? undefined : '1px solid #333' }}>{isReached && <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent pointer-events-none"></div>}<div className={`text-3xl md:text-5xl mb-2 drop-shadow-md transition-transform group-hover:scale-110 ${isReached ? 'grayscale-0' : 'grayscale'}`}>{def.icon}</div><div className={`text-[9px] md:text-xs font-black font-sans tracking-widest uppercase ${isReached ? 'text-white' : 'text-gray-500'}`}>{def.tier}</div><div className={`text-[8px] md:text-[9px] font-mono mt-1 px-2 py-0.5 rounded ${isReached ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600'}`}>LVL {def.minRank}</div>{!isReached && (<div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"><Lock className="w-5 h-5 md:w-6 md:h-6 text-gray-500" /></div>)}</motion.div>{isCurrent && (<div className="absolute -bottom-8 flex flex-col items-center animate-bounce"><div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-cyan-400"></div><span className="text-[10px] font-bold text-cyan-400 tracking-widest bg-cyan-900/50 px-2 py-0.5 rounded mt-1 border border-cyan-500/30">YOU</span></div>)}{def.reward && (<motion.div initial={{ opacity: 0, y: 10 }} whileHover={{ opacity: 1, y: 0, scale: 1.05 }} className={`absolute -top-24 md:-top-32 left-1/2 -translate-x-1/2 p-2 md:p-3 rounded-lg border backdrop-blur-md w-40 md:w-48 flex flex-col items-center text-center transition-all duration-300 shadow-xl opacity-60 hover:opacity-100 hover:z-50 ${isReached ? 'bg-gray-900/90 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] opacity-100' : 'bg-black/80 border-white/10'}`}><div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-gray-900 border-r border-b ${isReached ? 'border-yellow-500/50' : 'border-white/10'}`}></div><div className="flex items-center gap-2 mb-2 w-full justify-center border-b border-white/5 pb-2">{def.reward.type === 'SKIN' ? <ShoppingBag className={`w-3 h-3 md:w-4 md:h-4 ${isReached ? 'text-pink-400' : 'text-gray-500'}`} /> : <Gift className={`w-3 h-3 md:w-4 md:h-4 ${isReached ? 'text-green-400' : 'text-gray-500'}`} />}<span className="text-[9px] font-bold text-gray-400 tracking-wider">{t('rank_reward')}</span></div><div className={`text-[10px] md:text-xs font-bold font-sans ${isReached ? 'text-white' : 'text-gray-500'}`}>{def.reward.label}</div>{isReached ? (<div className="mt-2 text-[8px] md:text-[9px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1 font-bold"><CheckCircle className="w-3 h-3" /> {t('rank_acquired')}</div>) : (<div className="mt-2 text-[8px] md:text-[9px] text-gray-500 font-mono">{t('rank_reach_lvl')} {def.minRank}</div>)}</motion.div>)}</motion.div>);}) }</div></motion.div></div></motion.div>)}</AnimatePresence>
    </div>
  );
};
