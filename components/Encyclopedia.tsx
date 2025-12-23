
import React, { useState, useEffect, useRef } from 'react';
import { EVOLUTION_TREE, COLORS } from '../constants';
import { Button } from './Button';
import { ArrowLeft, Target, Shield, Zap, Crosshair, Filter, Layers, Hexagon, Radio, Disc, Wind, Flame, Zap as ZapIcon, Move, Aperture, Box, Siren, MousePointer2, ChevronDown, ChevronRight, Activity, Clock, FastForward, Maximize2, Hash, Eye, Droplet } from 'lucide-react';
import { WeaponSchema, SkillType } from '../types';
import { useTranslation } from 'react-i18next';
import { TankPreview, PreviewMode } from './TankPreview';

interface EncyclopediaProps {
  onBack: () => void;
}

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'Bullet': return Target;
        case 'Ram': return Hexagon;
        case 'Drone': return MousePointer2;
        case 'Swarm': return Aperture;
        case 'Trap': return Box;
        case 'Laser': return Zap;
        case 'Tesla': return ZapIcon;
        case 'Flamethrower': return Flame;
        case 'Sonic': return Siren;
        case 'Launcher': return Disc;
        case 'Shotgun': return Layers;
        case 'Minion': return UsersIcon;
        case 'Necro': return Box;
        default: return Target;
    }
};

const UsersIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);

export const Encyclopedia: React.FC<EncyclopediaProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [selectedUnit, setSelectedUnit] = useState<WeaponSchema>(EVOLUTION_TREE[0]);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [filterTier, setFilterTier] = useState<number | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  
  // NEW: View Mode State
  const [viewMode, setViewMode] = useState<PreviewMode>('TANK');

  const tiers = Array.from(new Set(EVOLUTION_TREE.map(u => u.tier))).sort((a,b) => a-b);
  const types = Array.from(new Set(EVOLUTION_TREE.map(u => u.type))).sort();

  const handleUnitSelect = (unit: WeaponSchema) => {
    setSelectedUnit(unit);
    setIsMobileDetailOpen(true);
    setViewMode('TANK'); // Reset view on switch
  };

  const filteredUnits = EVOLUTION_TREE.filter(u => {
      if (filterTier !== 'ALL' && u.tier !== filterTier) return false;
      if (filterType !== 'ALL' && u.type !== filterType) return false;
      return true;
  });

  const displayTiers = Array.from(new Set(filteredUnits.map(u => u.tier))).sort((a,b) => a-b);

  const unitName = t(`unit_${selectedUnit.id}_name`, { defaultValue: selectedUnit.name });
  const unitDesc = t(`unit_${selectedUnit.id}_desc`, { defaultValue: selectedUnit.description });
  const skillDesc = selectedUnit.skill ? t(`skill_${selectedUnit.skill.type}`, { defaultValue: "No tactical analysis available." }) : "";
  const ClassIcon = getTypeIcon(selectedUnit.type);

  return (
    <div className="fixed inset-0 z-50 w-full h-full p-0 md:p-12 flex flex-col md:flex-row gap-6 bg-black/90 md:bg-transparent">
      
      {/* List Panel */}
      <div className={`w-full md:w-1/3 glass-panel flex flex-col overflow-hidden h-full border-0 md:border md:rounded-lg transition-all duration-300 ${isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
         {/* Header */}
         <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-4 shrink-0 pt-safe-top">
            <Button onClick={onBack} variant="secondary" className="px-3 py-2 text-xs">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="font-sans font-bold text-white tracking-widest text-lg md:text-base">UNIT_DATABASE</h2>
              <div className="text-[10px] text-cyan-500 font-mono hidden md:block">{filteredUnits.length} UNITS INDEXED</div>
            </div>
         </div>

         {/* Filters */}
         <div className="p-2 border-b border-white/10 bg-black/20 flex flex-col gap-2 shrink-0">
             <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                 <button 
                    onClick={() => setFilterTier('ALL')}
                    className={`px-3 py-1 text-[10px] font-bold rounded font-mono border transition-all whitespace-nowrap ${filterTier === 'ALL' ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                 >
                    ALL TIERS
                 </button>
                 {tiers.map(t => (
                     <button 
                        key={t}
                        onClick={() => setFilterTier(t)}
                        className={`px-3 py-1 text-[10px] font-bold rounded font-mono border transition-all whitespace-nowrap ${filterTier === t ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                     >
                        TIER {t}
                     </button>
                 ))}
             </div>
             <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                 <button 
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1 text-[10px] font-bold rounded font-mono border transition-all whitespace-nowrap ${filterType === 'ALL' ? 'bg-pink-500 text-black border-pink-500' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                 >
                    ALL CLASSES
                 </button>
                 {types.map(t => (
                     <button 
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`px-3 py-1 text-[10px] font-bold rounded font-mono border transition-all whitespace-nowrap ${filterType === t ? 'bg-pink-500 text-black border-pink-500' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                     >
                        {t.toUpperCase()}
                     </button>
                 ))}
             </div>
         </div>

         {/* List */}
         <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar pb-safe-bottom">
            {displayTiers.map(tier => {
               const tierUnits = filteredUnits.filter(u => u.tier === tier);
               if (tierUnits.length === 0) return null;
               return (
               <div key={tier}>
                  <div className="px-2 py-2 text-xs font-mono text-cyan-500/70 border-b border-cyan-500/20 mb-2 font-bold bg-cyan-900/10 sticky top-0 backdrop-blur-sm z-10 flex justify-between">
                      <span>TIER {tier} CLASS</span>
                      <span className="text-white/30">{tierUnits.length} UNITS</span>
                  </div>
                  <div className="space-y-1">
                     {tierUnits.map(unit => {
                        const Icon = getTypeIcon(unit.type);
                        const displayName = t(`unit_${unit.id}_name`, { defaultValue: unit.name });
                        return (
                        <button
                           key={unit.id}
                           onClick={() => handleUnitSelect(unit)}
                           className={`w-full p-3 text-left border transition-all flex items-center justify-between rounded-sm group relative overflow-hidden ${selectedUnit.id === unit.id ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white/5 border-transparent hover:bg-white/10 active:bg-cyan-500/20'}`}
                        >
                           <div className="flex items-center gap-3 relative z-10">
                               <Icon className={`w-4 h-4 ${selectedUnit.id === unit.id ? 'text-cyan-400' : 'text-gray-500 group-hover:text-white'}`} />
                               <span className={`font-bold font-mono text-sm ${selectedUnit.id === unit.id ? 'text-cyan-400' : 'text-gray-300'}`}>{displayName}</span>
                           </div>
                           <ChevronRight className={`w-4 h-4 ${selectedUnit.id === unit.id ? 'text-cyan-400' : 'text-white/10 group-hover:text-white/30'}`} />
                        </button>
                     )})}
                  </div>
               </div>
            )})}
            {filteredUnits.length === 0 && (
                <div className="text-center p-8 text-gray-500 font-mono text-xs">NO UNITS FOUND MATCHING FILTERS</div>
            )}
         </div>
      </div>

      {/* Detail Panel */}
      <div className={`fixed inset-0 z-30 md:static md:z-auto flex-1 glass-panel p-0 md:p-8 overflow-hidden flex flex-col h-full bg-[#0a0a10] md:bg-rgba(10,10,15,0.65) border-0 md:border md:rounded-lg transition-transform duration-300 ${isMobileDetailOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
         
         <div className="md:hidden p-4 border-b border-white/10 bg-black/40 flex items-center gap-4 shrink-0 pt-safe-top">
            <Button onClick={() => setIsMobileDetailOpen(false)} variant="secondary" className="px-3 py-2 text-xs">
               <ArrowLeft className="w-4 h-4" /> BACK
            </Button>
            <h2 className="font-sans font-bold text-gray-400 tracking-widest text-sm truncate">{unitName.toUpperCase()}</h2>
         </div>

         <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

         <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-0 custom-scrollbar pb-safe-bottom">
            <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl md:text-6xl font-black text-white font-sans uppercase mb-2 tracking-tighter leading-none">{unitName}</h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                  <div className="flex items-center gap-2 bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded border border-cyan-500/30">
                      <ClassIcon className="w-4 h-4" />
                      <span className="text-xs font-mono font-bold tracking-wider">{selectedUnit.type.toUpperCase()} CLASS</span>
                  </div>
                  <span className="text-gray-500 font-mono text-xs px-2">ID: {selectedUnit.id.toUpperCase()}</span>
                </div>
              </div>
              <div className="text-4xl md:text-7xl font-black text-white/5 font-mono select-none self-end md:self-auto">T-{selectedUnit.tier}</div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="bg-black/40 border border-white/10 mb-8 rounded-lg flex flex-col relative overflow-hidden group shadow-inner">
               {/* PREVIEW TABS */}
               <div className="flex border-b border-white/10 bg-white/5">
                   <button 
                       onClick={() => setViewMode('TANK')}
                       className={`flex-1 py-3 text-[10px] font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-colors ${viewMode === 'TANK' ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-white'}`}
                   >
                       <Hexagon className="w-3 h-3" /> CHASSIS
                   </button>
                   <button 
                       onClick={() => setViewMode('PROJECTILE')}
                       className={`flex-1 py-3 text-[10px] font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-colors ${viewMode === 'PROJECTILE' ? 'bg-pink-500/20 text-pink-400 border-b-2 border-pink-500' : 'text-gray-500 hover:text-white'}`}
                   >
                       <Target className="w-3 h-3" /> PAYLOAD
                   </button>
                   {selectedUnit.skill && (
                       <button 
                           onClick={() => setViewMode('SKILL')}
                           className={`flex-1 py-3 text-[10px] font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-colors ${viewMode === 'SKILL' ? 'bg-yellow-500/20 text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-white'}`}
                       >
                           <Zap className="w-3 h-3" /> ABILITY
                       </button>
                   )}
                   {selectedUnit.effect && (
                       <button 
                           onClick={() => setViewMode('STATUS')}
                           className={`flex-1 py-3 text-[10px] font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-colors ${viewMode === 'STATUS' ? 'bg-green-500/20 text-green-400 border-b-2 border-green-500' : 'text-gray-500 hover:text-white'}`}
                       >
                           <Droplet className="w-3 h-3" /> EFFECT
                       </button>
                   )}
               </div>

               <div className="h-48 md:h-64 relative flex items-center justify-center bg-grid-pattern">
                   <TankPreview 
                        weapon={selectedUnit} 
                        size={250} 
                        mode={viewMode}
                        className="drop-shadow-2xl"
                   />
                   
                   <div className="absolute bottom-4 right-4 flex flex-col items-end text-[10px] font-mono text-cyan-500/50">
                       <span>MODE: {viewMode}</span>
                       <span>SIMULATION ACTIVE</span>
                   </div>
               </div>
            </div>

            {/* Description & Skill Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Description */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 font-mono mb-2 uppercase tracking-wider flex items-center gap-2">
                            <Activity className="w-4 h-4" /> System Description
                        </h3>
                        <p className="text-gray-300 font-mono text-sm md:text-base leading-relaxed border-l-2 border-cyan-500/50 pl-4 bg-white/5 p-4 rounded-r-lg">
                           {unitDesc}
                        </p>
                    </div>

                    {/* Skill Section */}
                    {selectedUnit.skill && (
                        <div>
                            <h3 className="text-sm font-bold text-yellow-500 font-mono mb-2 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Tactical Ability: <span className="text-white">{selectedUnit.skill.name}</span>
                            </h3>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                                <p className="text-gray-300 font-mono text-xs md:text-sm mb-3">
                                    {skillDesc}
                                </p>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-xs font-mono text-yellow-400/80">
                                        <Clock className="w-3 h-3" />
                                        <span>COOLDOWN: {(selectedUnit.skill.cooldown / 60).toFixed(1)}s</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-mono text-yellow-400/80">
                                        <FastForward className="w-3 h-3" />
                                        <span>DURATION: {(selectedUnit.skill.duration / 60).toFixed(1)}s</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Compact Stats */}
                <div className="lg:col-span-1 space-y-3">
                     <h3 className="text-sm font-bold text-gray-500 font-mono mb-2 uppercase tracking-wider flex items-center gap-2">
                        <Hash className="w-4 h-4" /> Specs
                     </h3>
                     <StatBox icon={Target} label="DAMAGE" value={selectedUnit.stats.damage} max={150} color="text-red-400" />
                     <StatBox icon={ZapIcon} label="FIRE RATE" value={(60/selectedUnit.stats.reload) * 10} max={100} color="text-yellow-400" />
                     <StatBox icon={Crosshair} label="ACCURACY" value={(1 - selectedUnit.stats.spread) * 100} max={100} color="text-green-400" />
                     <StatBox icon={Shield} label="RANGE" value={selectedUnit.stats.range} max={250} color="text-blue-400" />
                     <StatBox icon={FastForward} label="PROJ SPEED" value={selectedUnit.stats.speed} max={20} color="text-cyan-400" />
                     <StatBox icon={Maximize2} label="CALIBER" value={selectedUnit.stats.bulletSize} max={30} color="text-pink-400" />
                     <StatBox icon={Move} label="RECOIL" value={selectedUnit.stats.recoil} max={20} color="text-orange-400" />
                     <StatBox icon={Layers} label="BARRELS" value={selectedUnit.barrels.length} max={10} color="text-purple-400" />
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon: Icon, label, value, max, color }: any) => (
  <div className="bg-white/5 p-2 md:p-3 border border-white/5 hover:border-white/10 transition-all rounded flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 min-w-[80px]">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className="text-[10px] font-bold text-gray-400 tracking-wider truncate">{label}</span>
    </div>
    <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color.replace('text', 'bg')} opacity-80`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
    <div className="text-right font-mono text-[10px] text-white/50 w-8">{value.toFixed(0)}</div>
  </div>
);
