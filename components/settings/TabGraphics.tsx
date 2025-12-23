
import React from 'react';
import { GameSettings } from '../../types';
import { SettingsPreview } from './SettingsPreview';
import { Monitor, Eye, Zap, Grid, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TabProps {
    settings: GameSettings;
    update: (section: any, key: string, value: any) => void;
}

export const TabGraphics: React.FC<TabProps> = ({ settings, update }) => {
    const { t } = useTranslation();

    const Range = ({ prop, min, max, label }: any) => (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-xs font-mono text-gray-400">{label}</span>
                {/* @ts-ignore */}
                <span className="text-xs font-bold text-cyan-400">{settings.graphics[prop]}%</span>
            </div>
            <input 
                type="range" min={min} max={max} 
                /* @ts-ignore */
                value={settings.graphics[prop]} 
                onChange={(e) => update('graphics', prop, parseInt(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );

    const Toggle = ({ prop, label }: any) => (
        <div 
            /* @ts-ignore */
            onClick={() => update('graphics', prop, !settings.graphics[prop])}
            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded cursor-pointer transition-all"
        >
            <span className="text-xs font-bold text-gray-300">{label}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${
                /* @ts-ignore */
                settings.graphics[prop] ? 'bg-cyan-500' : 'bg-gray-600'
            }`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                    /* @ts-ignore */
                    settings.graphics[prop] ? 'left-4.5' : 'left-0.5'
                }`} style={{ left: settings.graphics[prop] ? 'calc(100% - 3.5px - 12px)' : '3.5px' }}></div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-full gap-6">
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                
                {/* PRESETS */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                    {['LOW', 'MEDIUM', 'HIGH', 'ULTRA'].map(p => (
                        <button
                            key={p}
                            onClick={() => update('qualityPreset', '', p)}
                            className={`py-2 rounded border text-[10px] font-bold transition-all ${settings.qualityPreset === p ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-white/5 border-white/10 text-gray-400'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                        <Monitor className="w-4 h-4" /> {t('settings_graphics')}
                    </h3>
                    <Range prop="resolution" min="50" max="150" label={t('settings_resolution')} />
                    <Range prop="particles" min="0" max="200" label={t('settings_particles')} />
                    <Range prop="gridVisibility" min="0" max="100" label={t('settings_grid_vis')} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Toggle prop="bloom" label={t('settings_bloom')} />
                    <Toggle prop="shadows" label={t('settings_shadows')} />
                    <Toggle prop="motionBlur" label={t('settings_motion_blur')} />
                    <Toggle prop="shake" label={t('settings_shake')} />
                    <Toggle prop="chromaticAberration" label={t('settings_chromatic')} />
                    <Toggle prop="damageNumbers" label={t('settings_dmg_nums')} />
                </div>
            </div>

            {/* LIVE PREVIEW PANEL */}
            <div className="w-full md:w-1/2 flex flex-col gap-4">
                <SettingsPreview settings={settings} />
                <div className="p-4 bg-white/5 border border-white/10 rounded text-xs font-mono text-gray-400">
                    <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold">
                        <Activity className="w-4 h-4" /> PERFORMANCE IMPACT
                    </div>
                    <div className="flex justify-between mb-1">
                        <span>GPU LOAD</span>
                        <span className={settings.graphics.bloom ? 'text-red-400' : 'text-green-400'}>{settings.graphics.bloom ? 'HIGH' : 'LOW'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>CPU LOAD</span>
                        <span className={settings.graphics.particles > 100 ? 'text-red-400' : 'text-green-400'}>{settings.graphics.particles > 100 ? 'HIGH' : 'LOW'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
