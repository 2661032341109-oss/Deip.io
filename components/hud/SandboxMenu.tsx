
import React, { useState } from 'react';
import { SandboxOptions, WeaponSchema } from '../../types';
import { EVOLUTION_TREE, COLORS } from '../../constants';
import { Terminal, X, User, Globe, Grid, Shield, Zap, FastForward, RefreshCw, Skull, Heart, Siren, Pizza, Trash2 } from 'lucide-react';
import { soundManager } from '../../engine/SoundManager';
import { TankPreview } from '../TankPreview';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SandboxMenuProps {
    onClose: () => void;
    sandboxOptions: SandboxOptions;
    onUpdate: (opts: SandboxOptions) => void;
    activeWeaponId: string;
    onSelectWeapon: (id: string) => void;
}

const ToggleSwitch = ({ label, active, onClick, color = 'cyan' }: { label: string, active: boolean, onClick: () => void, color?: string }) => {
    const activeColor = color === 'cyan' ? 'bg-cyan-500' : 'bg-yellow-500';
    const activeShadow = color === 'cyan' ? 'shadow-[0_0_10px_rgba(0,243,255,0.5)]' : 'shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    
    return (
        <div 
            onClick={() => { soundManager.playUiClick(); onClick(); }}
            className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all duration-200 group active:scale-98 ${active ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}
        >
            <span className={`text-xs md:text-sm font-mono font-bold tracking-wider ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
            <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${active ? 'bg-white/20' : 'bg-black/60 border border-white/10'}`}>
                <motion.div 
                    layout
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full ${active ? `${activeColor} ${activeShadow}` : 'bg-gray-500'}`}
                    animate={{ x: active ? 24 : 0 }}
                />
            </div>
        </div>
    );
};

const ActionButton = ({ label, icon: Icon, onClick, variant = 'normal' }: any) => {
    let style = "bg-white/5 border-white/10 text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/50";
    
    if (variant === 'danger') {
        style = "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-200 hover:border-red-500";
    } else if (variant === 'gold') {
        style = "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-200 hover:border-yellow-500";
    }

    return (
        <button 
            onClick={() => { soundManager.playUiClick(); onClick(); }}
            className={`w-full p-4 md:p-3 rounded border flex items-center justify-center gap-2 transition-all active:scale-95 text-xs font-mono font-bold tracking-wider group relative overflow-hidden ${style}`}
        >
            {variant === 'danger' && <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.2)_25%,rgba(0,0,0,0.2)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.2)_75%,rgba(0,0,0,0.2))] bg-[length:10px_10px] opacity-20 pointer-events-none"></div>}
            <Icon className="w-5 h-5 md:w-4 md:h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span>{label}</span>
        </button>
    );
};

export const SandboxMenu: React.FC<SandboxMenuProps> = ({ 
    onClose, 
    sandboxOptions, 
    onUpdate, 
    activeWeaponId, 
    onSelectWeapon 
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'OPERATOR' | 'WORLD' | 'ARMORY'>('OPERATOR');

    const toggleGodMode = () => onUpdate({...sandboxOptions, godMode: !sandboxOptions.godMode});
    const spawnBoss = () => onUpdate({...sandboxOptions, spawnBossSignal: sandboxOptions.spawnBossSignal + 1});
    const healPlayer = () => onUpdate({...sandboxOptions, healSignal: sandboxOptions.healSignal + 1});
    const resetLevel = () => onUpdate({...sandboxOptions, resetLevelSignal: sandboxOptions.resetLevelSignal + 1});
    const maxLevel = () => onUpdate({...sandboxOptions, maxLevelSignal: sandboxOptions.maxLevelSignal + 1});
    const maxStats = () => onUpdate({...sandboxOptions, maxStatsSignal: sandboxOptions.maxStatsSignal + 1});
    const suicide = () => onUpdate({...sandboxOptions, suicideSignal: sandboxOptions.suicideSignal + 1});
    const clearEnemies = () => onUpdate({...sandboxOptions, clearEnemiesSignal: sandboxOptions.clearEnemiesSignal + 1});
    const spawnFood = () => onUpdate({...sandboxOptions, spawnFoodSignal: sandboxOptions.spawnFoodSignal + 1});

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] pointer-events-auto flex items-center justify-center p-0 md:p-4 animate-in fade-in zoom-in duration-200" onTouchStart={(e) => e.stopPropagation()}>
            <div className="w-full h-full md:max-w-5xl md:h-[85vh] flex flex-col md:rounded-lg border-0 md:border border-cyan-500/30 overflow-hidden bg-[#0a0a10] shadow-[0_0_50px_rgba(0,243,255,0.1)] relative">
                
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
                
                {/* Header */}
                <div className="h-16 md:h-14 border-b border-cyan-500/20 bg-cyan-950/20 flex items-center justify-between px-6 shrink-0 relative z-10 pt-safe-top">
                    <div className="flex items-center gap-4">
                        <Terminal className="w-6 h-6 text-cyan-400" />
                        <div>
                            <h2 className="font-black font-sans tracking-[0.2em] text-lg text-white">ADMIN</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white hover:bg-white/10 p-3 md:p-2 rounded-full transition-colors bg-white/5 md:bg-transparent">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden relative z-10 flex-col md:flex-row">
                    {/* Navigation Tabs - Scrollable on mobile */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/40 flex flex-row md:flex-col shrink-0 overflow-x-auto custom-scrollbar">
                        <button 
                            onClick={() => setActiveTab('OPERATOR')}
                            className={`flex-1 min-w-[120px] p-4 md:px-6 md:py-5 flex items-center justify-center md:justify-start gap-3 transition-all border-b-4 md:border-b-0 md:border-l-4 ${activeTab === 'OPERATOR' ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                        >
                            <User className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                            <span className="font-mono font-bold tracking-widest text-xs md:text-sm">{t('sb_operator')}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('WORLD')}
                            className={`flex-1 min-w-[120px] p-4 md:px-6 md:py-5 flex items-center justify-center md:justify-start gap-3 transition-all border-b-4 md:border-b-0 md:border-l-4 ${activeTab === 'WORLD' ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                        >
                            <Globe className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                            <span className="font-mono font-bold tracking-widest text-xs md:text-sm">{t('sb_world')}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('ARMORY')}
                            className={`flex-1 min-w-[120px] p-4 md:px-6 md:py-5 flex items-center justify-center md:justify-start gap-3 transition-all border-b-4 md:border-b-0 md:border-l-4 ${activeTab === 'ARMORY' ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                        >
                            <Grid className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                            <span className="font-mono font-bold tracking-widest text-xs md:text-sm">{t('sb_armory')}</span>
                        </button>
                    </div>

                    <div className="flex-1 bg-gradient-to-br from-[#0a0a10] to-[#050508] p-4 md:p-8 overflow-y-auto custom-scrollbar pb-24 md:pb-8">
                        {activeTab === 'OPERATOR' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-cyan-500/70 font-mono text-xs font-bold mb-4 uppercase tracking-widest border-b border-cyan-500/20 pb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Systems Override
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ToggleSwitch label={t('sb_godmode')} active={sandboxOptions.godMode} onClick={toggleGodMode} color="yellow" />
                                        <ToggleSwitch label={t('sb_infinite_ammo')} active={sandboxOptions.infiniteAmmo} onClick={() => onUpdate({...sandboxOptions, infiniteAmmo: !sandboxOptions.infiniteAmmo})} color="cyan" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-cyan-500/70 font-mono text-xs font-bold mb-4 uppercase tracking-widest border-b border-cyan-500/20 pb-2 flex items-center gap-2">
                                        <Zap className="w-4 h-4" /> Performance Metrics
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <ActionButton label={t('sb_heal')} icon={Heart} onClick={healPlayer} variant="normal" />
                                        <ActionButton label={t('sb_max_stats')} icon={Zap} onClick={maxStats} variant="gold" />
                                        <ActionButton label="MAX LVL" icon={FastForward} onClick={maxLevel} variant="gold" />
                                        <ActionButton label={t('sb_reset_lvl')} icon={RefreshCw} onClick={resetLevel} variant="normal" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-red-500/70 font-mono text-xs font-bold mb-4 uppercase tracking-widest border-b border-red-500/20 pb-2 flex items-center gap-2">
                                        <Skull className="w-4 h-4" /> Dangerous Zone
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <ActionButton label={t('sb_suicide')} icon={Skull} onClick={suicide} variant="danger" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'WORLD' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-cyan-500/70 font-mono text-xs font-bold mb-4 uppercase tracking-widest border-b border-cyan-500/20 pb-2 flex items-center gap-2">
                                        <Globe className="w-4 h-4" /> Entity Management
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ActionButton label={t('sb_spawn_boss')} icon={Siren} onClick={spawnBoss} variant="danger" />
                                        <ActionButton label={t('sb_spawn_food')} icon={Pizza} onClick={spawnFood} variant="normal" />
                                        <ActionButton label={t('sb_nuke')} icon={Trash2} onClick={clearEnemies} variant="danger" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ARMORY' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
                                    <h3 className="text-cyan-500/70 font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Grid className="w-4 h-4" /> Unit Replicator
                                    </h3>
                                    <span className="text-[10px] text-gray-500 font-mono">{EVOLUTION_TREE.length} UNITS AVAILABLE</span>
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {EVOLUTION_TREE.map(u => {
                                        const displayName = t(`unit_${u.id}_name`, { defaultValue: u.name });
                                        return (
                                        <button 
                                            key={u.id}
                                            onClick={() => { soundManager.playUiClick(); onSelectWeapon(u.id); }}
                                            className={`
                                                group flex flex-col items-center bg-black/40 border border-white/5 rounded-lg p-2 transition-all duration-200 active:scale-95
                                                hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(0,243,255,0.1)]
                                                ${activeWeaponId === u.id ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_10px_rgba(0,243,255,0.2)]' : ''}
                                            `}
                                        >
                                            <div className="relative w-12 h-12 md:w-16 md:h-16 mb-2">
                                                <TankPreview weapon={u} size={64} color={activeWeaponId === u.id ? COLORS.player : '#666'} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="w-full text-center">
                                                <div className={`text-[9px] md:text-[10px] font-bold font-mono truncate uppercase ${activeWeaponId === u.id ? 'text-cyan-400' : 'text-gray-400 group-hover:text-white'}`}>{displayName}</div>
                                                <div className="text-[8px] text-gray-600 font-mono">T-{u.tier}</div>
                                            </div>
                                        </button>
                                    )})}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
