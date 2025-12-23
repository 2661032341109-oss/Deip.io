
import React, { useState } from 'react';
import { GameSettings, Language } from '../../types';
import { Globe, Network, Accessibility, Eye, Volume2, Palette, Monitor, Save, Download, Upload, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Persistence } from '../../engine/Persistence';
import { soundManager } from '../../engine/SoundManager';

interface TabProps {
    settings: GameSettings;
    update: (section: any, key: string, value: any) => void;
    changeLanguage: (lang: Language) => void;
}

export const TabGeneral: React.FC<TabProps> = ({ settings, update, changeLanguage }) => {
    const { t } = useTranslation();
    const [importCode, setImportCode] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

    const handleExport = () => {
        const code = Persistence.exportSaveString();
        navigator.clipboard.writeText(code).then(() => {
            soundManager.playUiClick();
            setStatusMsg('SAVE COPIED TO CLIPBOARD!');
            setTimeout(() => setStatusMsg(''), 3000);
        });
    };

    const handleImport = () => {
        if (!importCode) return;
        if (confirm('WARNING: This will OVERWRITE your current data. Are you sure?')) {
            const success = Persistence.importSaveString(importCode);
            if (success) {
                soundManager.playKillConfirm();
                setStatusMsg('SUCCESS! RELOADING...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setStatusMsg('INVALID CODE');
                soundManager.playUiClick(); // Error sound technically needed
            }
        }
    };

    const Range = ({ section, prop, min, max, label }: any) => (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-xs font-mono text-gray-400">{label}</span>
                {/* @ts-ignore */}
                <span className="text-xs font-bold text-cyan-400">{settings[section][prop]}%</span>
            </div>
            <input 
                type="range" min={min} max={max} 
                /* @ts-ignore */
                value={settings[section][prop]} 
                onChange={(e) => update(section, prop, parseInt(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );

    const Toggle = ({ section, prop, label }: any) => (
        <div 
            /* @ts-ignore */
            onClick={() => update(section, prop, !settings[section][prop])}
            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded cursor-pointer transition-all"
        >
            <span className="text-xs font-bold text-gray-300">{label}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${
                /* @ts-ignore */
                settings[section][prop] ? 'bg-cyan-500' : 'bg-gray-600'
            }`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                    /* @ts-ignore */
                    settings[section][prop] ? 'left-4.5' : 'left-0.5'
                }`} style={{ left: settings[section][prop] ? 'calc(100% - 3.5px - 12px)' : '3.5px' }}></div>
            </div>
        </div>
    );

    // Color Palettes for Preview
    const getPalette = (mode: string) => {
        // Normal: Cyan (Player), Pink (Enemy), Green (Ally), Yellow (Gold)
        if (mode === 'PROTANOPIA') return ['#0055ff', '#a8a800', '#aaaaaa', '#ffd700']; 
        if (mode === 'DEUTERANOPIA') return ['#0055ff', '#d4a800', '#aaaaaa', '#ffe000'];
        if (mode === 'TRITANOPIA') return ['#00f3ff', '#ff0055', '#00ff9d', '#ffd700']; // Similar usually
        return ['#00f3ff', '#ff0055', '#00ff9d', '#ffd700']; // Normal
    };

    const currentPalette = getPalette(settings.accessibility.colorblindMode);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full overflow-y-auto custom-scrollbar p-2">
            
            {/* DATA MANAGEMENT (RENAMED FOR CLARITY) */}
            <div className="space-y-4 md:col-span-2">
                <h3 className="flex items-center gap-2 text-green-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                    <Save className="w-4 h-4" /> LOCAL SAVE DATA (MANUAL BACKUP)
                </h3>
                <div className="bg-green-900/10 border border-green-500/30 p-4 rounded flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                        <div className="text-xs font-bold text-green-400 mb-2 flex items-center gap-2"><Download className="w-3 h-3" /> EXPORT SAVE CODE</div>
                        <p className="text-[10px] text-gray-400 mb-2">For Guest/Offline users: Copy this code to transfer progress to another device or backup before clearing cache.</p>
                        <button 
                            onClick={handleExport}
                            className="w-full bg-green-500/20 hover:bg-green-500/40 text-green-300 border border-green-500/50 py-2 rounded text-xs font-bold font-mono transition-all"
                        >
                            COPY TO CLIPBOARD
                        </button>
                    </div>
                    <div className="hidden md:block w-px bg-white/10 self-stretch"></div>
                    <div className="flex-1 w-full">
                        <div className="text-xs font-bold text-yellow-400 mb-2 flex items-center gap-2"><Upload className="w-3 h-3" /> IMPORT SAVE CODE</div>
                        <input 
                            type="text" 
                            placeholder="Paste Save Code Here..." 
                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-[10px] text-white font-mono mb-2 focus:border-yellow-500 outline-none"
                            value={importCode}
                            onChange={(e) => setImportCode(e.target.value)}
                        />
                        <button 
                            onClick={handleImport}
                            className="w-full bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 border border-yellow-500/50 py-2 rounded text-xs font-bold font-mono transition-all"
                        >
                            RESTORE DATA
                        </button>
                    </div>
                </div>
                {statusMsg && (
                    <div className="text-center text-xs font-bold font-mono text-white animate-pulse bg-blue-500/20 py-1 rounded border border-blue-500/50">
                        {statusMsg}
                    </div>
                )}
            </div>

            {/* LANGUAGE */}
            <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                    <Globe className="w-4 h-4" /> {t('settings_lang')}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {['EN', 'TH', 'JP'].map(lang => (
                        <button
                            key={lang}
                            onClick={() => changeLanguage(lang as Language)}
                            className={`p-3 rounded border flex flex-col items-center justify-center transition-all ${settings.language === lang ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                        >
                            <span className="text-2xl mb-1">{lang === 'EN' ? '🇬🇧' : lang === 'TH' ? '🇹🇭' : '🇯🇵'}</span>
                            <span className="font-bold font-mono text-xs">{lang}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ACCESSIBILITY */}
            <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-yellow-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                    <Accessibility className="w-4 h-4" /> {t('settings_access')}
                </h3>
                
                {/* COLORBLIND PREVIEW */}
                <div className="bg-black/40 p-3 rounded border border-white/10 mb-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs text-gray-400 font-mono flex items-center gap-2"><Palette className="w-3 h-3" /> COLOR PALETTE</label>
                        <span className="text-[10px] text-yellow-400 font-bold">{settings.accessibility.colorblindMode}</span>
                    </div>
                    <div className="flex gap-2 h-8">
                        {currentPalette.map((col, i) => (
                            <div key={i} className="flex-1 rounded flex items-center justify-center text-[8px] font-bold text-black/60 shadow-inner" style={{ backgroundColor: col }}>
                                {i === 0 ? 'YOU' : i === 1 ? 'FOE' : i === 2 ? 'ALLY' : 'GOLD'}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {['NONE', 'PROTANOPIA', 'DEUTERANOPIA', 'TRITANOPIA'].map(mode => (
                        <button 
                            key={mode}
                            onClick={() => update('accessibility', 'colorblindMode', mode)}
                            className={`flex-1 px-2 py-2 text-[9px] border rounded font-bold transition-all ${settings.accessibility.colorblindMode === mode ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                        >
                            {mode.substring(0,4)}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-xs font-mono text-gray-400">{t('settings_ui_scale')}</span>
                        <span className="text-xs font-bold text-cyan-400">{settings.accessibility.uiScale}%</span>
                    </div>
                    <input 
                        type="range" min="80" max="120"
                        value={settings.accessibility.uiScale}
                        onChange={(e) => update('accessibility', 'uiScale', parseInt(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-center mt-2">
                        <button 
                            className="bg-cyan-500 text-black font-bold px-4 py-1 rounded transition-all"
                            style={{ transform: `scale(${settings.accessibility.uiScale / 100})` }}
                        >
                            TEST BUTTON
                        </button>
                    </div>
                </div>

                <Toggle section="accessibility" prop="screenFlash" label={t('settings_screen_flash')} />
            </div>

            {/* AUDIO */}
            <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-green-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                    <Volume2 className="w-4 h-4" /> {t('settings_audio')}
                </h3>
                <Range section="audio" prop="master" min="0" max="100" label={t('settings_master')} />
                <Range section="audio" prop="sfx" min="0" max="100" label={t('settings_sfx')} />
                <Range section="audio" prop="music" min="0" max="100" label={t('settings_music')} />
            </div>

            {/* NETWORK */}
            <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-pink-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                    <Network className="w-4 h-4" /> {t('settings_network')}
                </h3>
                <Toggle section="interface" prop="showNetGraph" label={t('settings_net_graph')} />
                <Toggle section="interface" prop="streamerMode" label={t('settings_streamer_mode')} />
            </div>

        </div>
    );
};
