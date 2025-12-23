
import React, { useState } from 'react';
import { Button } from './Button';
import { X, Monitor, Cpu, Settings as SettingsIcon, Globe, Network, Smartphone, Zap } from 'lucide-react';
import { GameSettings, Language, QualityPreset } from '../types';
import { useTranslation } from 'react-i18next';
import { soundManager } from '../engine/SoundManager';

// Tabs
import { TabGraphics } from './settings/TabGraphics';
import { TabControls } from './settings/TabControls';
import { TabGeneral } from './settings/TabGeneral';
import { TabNetwork } from './settings/TabNetwork'; // New
import { TabAdvanced } from './settings/TabAdvanced'; // New

interface SettingsProps {
  onBack: () => void;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
}

type TabID = 'GENERAL' | 'GRAPHICS' | 'CONTROLS' | 'NETWORK' | 'ADVANCED';

export const Settings: React.FC<SettingsProps> = ({ onBack, settings, onSettingsChange }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabID>('GENERAL');

  // Generic Update Handler
  const update = (section: keyof GameSettings | 'qualityPreset', key: string, value: any) => {
    soundManager.playUiClick();
    
    // Handle Preset Logic
    if (section === 'qualityPreset') {
        const preset = value as QualityPreset;
        const baseGraphics = { ...settings.graphics };
        
        if (preset === 'LOW') { baseGraphics.particles = 20; baseGraphics.resolution = 50; baseGraphics.bloom = false; baseGraphics.shadows = false; }
        else if (preset === 'MEDIUM') { baseGraphics.particles = 60; baseGraphics.resolution = 75; baseGraphics.bloom = true; baseGraphics.shadows = false; }
        else if (preset === 'HIGH') { baseGraphics.particles = 100; baseGraphics.resolution = 100; baseGraphics.bloom = true; baseGraphics.shadows = true; }
        else if (preset === 'ULTRA') { baseGraphics.particles = 150; baseGraphics.resolution = 125; baseGraphics.bloom = true; baseGraphics.shadows = true; }

        onSettingsChange({
            ...settings,
            qualityPreset: preset,
            graphics: baseGraphics
        });
        return;
    }

    // Normal Update
    if (key === '') {
        // Direct property update on root
        onSettingsChange({ ...settings, [section]: value });
    } else {
        // Nested property update
        onSettingsChange({
            ...settings,
            [section]: {
                // @ts-ignore
                ...(settings[section] as object),
                [key]: value
            }
        });
    }
  };

  const changeLanguage = (lang: Language) => {
      i18n.changeLanguage(lang);
      onSettingsChange({ ...settings, language: lang });
      soundManager.playUiClick();
  };

  const TABS = [
      { id: 'GENERAL', label: t('settings_general'), icon: Globe },
      { id: 'GRAPHICS', label: t('settings_graphics'), icon: Monitor },
      { id: 'CONTROLS', label: t('settings_controls'), icon: Smartphone }, // Changed icon to generic input
      { id: 'NETWORK', label: t('settings_network'), icon: Network },
      { id: 'ADVANCED', label: t('settings_advanced'), icon: Zap },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-200">
      <div className="w-full h-full md:max-w-5xl md:h-[85vh] bg-[#050508] md:border border-white/10 md:rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        
        {/* CRT Overlay Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-50 opacity-20"></div>

        {/* SIDEBAR / TOPBAR */}
        <div className="w-full md:w-64 bg-black/60 border-b md:border-b-0 md:border-r border-white/10 flex md:flex-col shrink-0 z-10 flex-col pt-safe-top">
            <div className="p-4 md:p-6 border-b border-white/10 bg-cyan-900/10 flex items-center justify-between md:justify-start gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded">
                        <SettingsIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="font-black font-sans text-white tracking-widest text-base md:text-lg">{t('settings_title')}</h2>
                        <div className="text-[9px] font-mono text-cyan-500/60 hidden md:block">SYS_CONFIG_V3.0</div>
                    </div>
                </div>
                <button onClick={onBack} className="md:hidden text-gray-400 p-2 hover:bg-white/10 rounded-full"><X /></button>
            </div>
            
            {/* TABS LIST */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-visible custom-scrollbar p-2 space-x-2 md:space-x-0 md:space-y-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as TabID); soundManager.playUiHover(); }}
                        className={`
                            whitespace-nowrap px-4 py-3 md:w-full flex items-center gap-2 md:gap-4 transition-all font-mono text-xs font-bold tracking-wider rounded
                            ${activeTab === tab.id 
                                ? 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.1)]' 
                                : 'border border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="hidden md:block p-4 border-t border-white/10 mt-auto">
                <Button variant="secondary" onClick={onBack} className="w-full text-sm py-3 justify-center">
                    <X className="w-4 h-4" /> {t('help_dismiss')}
                </Button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 bg-gradient-to-br from-[#0a0a10] to-[#0f0f15] relative z-0 flex flex-col min-h-0">
            <div className="p-4 md:p-8 flex-1 overflow-hidden flex flex-col">
                <div className="hidden md:flex items-center gap-2 mb-6 opacity-50">
                    <span className="text-xs font-mono text-gray-500">ROOT</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-xs font-mono text-cyan-400">{activeTab}</span>
                </div>

                <div className="flex-1 min-h-0">
                    {activeTab === 'GENERAL' && <TabGeneral settings={settings} update={update} changeLanguage={changeLanguage} />}
                    {activeTab === 'GRAPHICS' && <TabGraphics settings={settings} update={update} />}
                    {activeTab === 'CONTROLS' && <TabControls settings={settings} update={update} />}
                    {activeTab === 'NETWORK' && <TabNetwork settings={settings} update={update} />}
                    {activeTab === 'ADVANCED' && <TabAdvanced settings={settings} update={update} />}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
