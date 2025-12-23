
import React, { useState } from 'react';
import { Persistence } from '../../engine/Persistence';
import { soundManager } from '../../engine/SoundManager';
import { X, Mail, Fingerprint, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    nickname: string;
    onUpdateNickname: (name: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, nickname, onUpdateNickname }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPassword = password.length >= 6;
    const canSubmit = isValidEmail && isValidPassword && !isLoading;

    const handleDiscordLogin = () => { soundManager.playUiClick(); Persistence.loginDiscord(); };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setIsLoading(true);
        setError(null);
        soundManager.playUiClick();
        try {
            if (mode === 'LOGIN') {
                const { error } = await Persistence.loginEmail(email, password);
                if (error) throw error;
            } else {
                const finalNickname = nickname || `Operative-${Math.floor(Math.random()*1000)}`;
                if (!nickname) onUpdateNickname(finalNickname);
                const { error } = await Persistence.registerEmail(email, password, finalNickname);
                if (error) throw error;
            }
            onClose();
        } catch (err: any) {
            console.error("Auth Error", err);
            setError(err.message || "Authentication Failed");
            soundManager.playDamage();
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <MotionDiv initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="glass-panel w-full max-w-sm p-6 rounded-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,243,255,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-center mb-6"><h2 className="text-2xl font-black font-sans text-white tracking-widest mb-1">{mode === 'LOGIN' ? 'ACCESS UPLINK' : 'NEW IDENTITY'}</h2><div className="text-[10px] font-mono text-cyan-500/70">SECURE CONNECTION PROTOCOL</div></div>
                <div className="flex bg-black/40 rounded p-1 mb-6 border border-white/5"><button onClick={() => { setMode('LOGIN'); setError(null); }} className={`flex-1 py-2 text-xs font-bold font-mono rounded transition-all ${mode === 'LOGIN' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>LOGIN</button><button onClick={() => { setMode('REGISTER'); setError(null); }} className={`flex-1 py-2 text-xs font-bold font-mono rounded transition-all ${mode === 'REGISTER' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>REGISTER</button></div>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold font-mono text-gray-400 flex justify-between">EMAIL {email && (isValidEmail ? <span className="text-green-400">OK</span> : <span className="text-red-400">INVALID</span>)}</label><div className="relative"><Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="email" className="w-full bg-black/60 border border-white/10 rounded p-3 pl-10 text-sm text-white focus:border-cyan-500 outline-none transition-colors font-mono" placeholder="operative@corebound.io" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold font-mono text-gray-400 flex justify-between">PASSWORD {password && (isValidPassword ? <span className="text-green-400">OK</span> : <span className="text-red-400">MIN 6 CHARS</span>)}</label><div className="relative"><Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="password" className="w-full bg-black/60 border border-white/10 rounded p-3 pl-10 text-sm text-white focus:border-cyan-500 outline-none transition-colors font-mono" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>
                    {mode === 'REGISTER' && (<div className="p-2 bg-yellow-900/10 border border-yellow-500/20 rounded text-[9px] text-yellow-500/80 font-mono text-center">Note: Your current nickname <b>"{nickname || 'Unknown'}"</b> will be linked to this account.</div>)}
                    <AnimatePresence>{error && (<MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[10px] text-red-400 bg-red-900/20 p-2 rounded border border-red-500/30 font-mono text-center">{error}</MotionDiv>)}</AnimatePresence>
                    <button type="submit" disabled={!canSubmit} className={`w-full py-3 rounded font-bold font-sans tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${canSubmit ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'LOGIN' ? 'AUTHENTICATE' : 'CREATE ID')}</button>
                </form>
                <div className="flex items-center gap-2 my-4"><div className="h-px bg-white/10 flex-1"></div><span className="text-[10px] text-gray-500 font-mono">OR CONNECT VIA</span><div className="h-px bg-white/10 flex-1"></div></div>
                <button onClick={handleDiscordLogin} className="w-full py-3 bg-[#5865F2]/20 hover:bg-[#5865F2]/40 border border-[#5865F2]/50 text-[#5865F2] hover:text-white rounded font-bold font-sans text-xs tracking-widest transition-all flex items-center justify-center gap-2">DISCORD</button>
            </MotionDiv>
        </div>
    );
};
