
import React from 'react';
import { GameSettings } from '../../types';
import { Cpu, Zap, MousePointer2, BatteryCharging, Gauge } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TabProps {
    settings: GameSettings;
    update: (section: any, key: string, value: any) => void;
}

export const TabAdvanced: React.FC<TabProps> = ({ settings, update }) => {
    const { t } = useTranslation();

    const Toggle = ({ section, prop, label, icon: Icon, color = 'cyan' }: any) => {
        // @ts-ignore
        const value = settings[section]?.[prop] ?? false;

        return (
            <div 
                onClick={() => update(section, prop, !value)}
                className={`flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded cursor-pointer transition-all group`}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className={`w-4 h-4 text-gray-500 group-hover:text-${color}-400 transition-colors`} />}
                    <span className="text-xs font-bold text-gray-300">{label}</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${
                    value ? `bg-${color}-500` : 'bg-gray-600'
                }`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                        value ? 'left-4.5' : 'left-0.5'
                    }`}></div>
                </div>
            </div>
        );
    };

    const fpsCap = settings.advanced?.fpsCap ?? 0;
    const lowLatency = settings.advanced?.lowLatencyMode ?? false;
    const batterySaver = settings.advanced?.batterySaver ?? false;

    // Calculate simulated load score (0-100)
    let loadScore = 50;
    if (fpsCap === 0) loadScore += 40; // Unlimited frames
    else if (fpsCap >= 144) loadScore += 20;
    else if (fpsCap <= 60) loadScore -= 20;
    
    if (lowLatency) loadScore += 10;
    if (batterySaver) loadScore -= 30;
    
    // Clamp
    loadScore = Math.max(10, Math.min(100, loadScore));
    let barColor = 'bg-green-500';
    if (loadScore > 50) barColor = 'bg-yellow-500';
    if (loadScore > 80) barColor = 'bg-red-500';

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                
                <div className="flex items-center gap-3 text-red-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                    <Cpu className="w-4 h-4" /> {t('settings_advanced')}
                </div>

                {/* PERFORMANCE GAUGE */}
                <div className="bg-black/40 p-4 rounded border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400 font-mono font-bold">ESTIMATED SYSTEM LOAD</span>
                        <span className="text-xs font-bold text-white">{loadScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${barColor} transition-all duration-500`}
                            style={{ width: `${loadScore}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[8px] text-gray-600 font-mono mt-1">
                        <span>COOL</span>
                        <span>BALANCED</span>
                        <span>MELTING</span>
                    </div>
                </div>

                {/* LATENCY SECTION */}
                <div className="space-y-3">
                    <Toggle 
                        section="advanced" prop="lowLatencyMode" 
                        label={t('settings_reflex')} 
                        icon={Zap} 
                        color="green" 
                    />
                    <p className="text-[9px] text-gray-600 px-2">
                        *Reduces render queue to 1 frame. Increases GPU load but minimizes input lag.
                    </p>

                    <Toggle 
                        section="advanced" prop="rawInput" 
                        label={t('settings_raw_input')} 
                        icon={MousePointer2} 
                        color="yellow" 
                    />
                </div>

                {/* ENGINE LIMITS */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-mono text-gray-400 flex items-center gap-2">
                            <Gauge className="w-3 h-3" /> {t('settings_fps_cap')}
                        </label>
                        <span className="text-xs font-bold text-cyan-400">
                            {fpsCap === 0 ? 'UNLIMITED' : `${fpsCap} FPS`}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {[0, 60, 144, 240].map(cap => (
                            <button
                                key={cap}
                                onClick={() => update('advanced', 'fpsCap', cap)}
                                className={`flex-1 py-2 text-[10px] font-bold border rounded transition-all ${
                                    fpsCap === cap 
                                    ? 'bg-cyan-500 text-black border-cyan-500' 
                                    : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'
                                }`}
                            >
                                {cap === 0 ? 'MAX' : cap}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MOBILE OPTIMIZATION */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                    <Toggle 
                        section="advanced" prop="batterySaver" 
                        label={t('settings_battery')} 
                        icon={BatteryCharging} 
                        color="green" 
                    />
                </div>

            </div>
        </div>
    );
};
